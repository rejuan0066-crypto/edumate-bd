#!/usr/bin/env bash
# Pre-deploy guard for Supabase Edge Functions.
#
# For every supabase/functions/<name>/index.ts this script runs:
#   1. `deno check`   — full TypeScript compile (catches type + parse errors)
#   2. `deno bundle`  — bundle dry-run (catches unresolved imports & the
#                      "Expression expected" / unclosed-block class of
#                      failures that break Supabase deploys)
#
# Output is grouped per function with a clear PASS/FAIL summary so failures
# are easy to read locally and in CI.
#
# Usage:
#   scripts/check-edge-functions.sh                # check all
#   scripts/check-edge-functions.sh fn1 fn2        # check specific functions
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FN_DIR="$ROOT/supabase/functions"

if ! command -v deno >/dev/null 2>&1; then
  echo "❌ deno is not installed. Install from https://deno.land/" >&2
  exit 127
fi

# Resolve target functions
declare -a TARGETS
if [ "$#" -gt 0 ]; then
  for name in "$@"; do
    f="$FN_DIR/$name/index.ts"
    if [ ! -f "$f" ]; then
      echo "❌ Function not found: $name ($f)" >&2
      exit 1
    fi
    TARGETS+=("$f")
  done
else
  while IFS= read -r f; do
    TARGETS+=("$f")
  done < <(find "$FN_DIR" -mindepth 2 -maxdepth 2 -name 'index.ts' | sort)
fi

if [ "${#TARGETS[@]}" -eq 0 ]; then
  echo "No edge functions found under $FN_DIR"
  exit 0
fi

PASS=()
FAIL=()
# Persist per-function logs + summary to REPORT_DIR so CI can upload them
# as a downloadable artifact. Defaults to a repo-local path.
REPORT_DIR="${REPORT_DIR:-$ROOT/.edge-function-reports}"
rm -rf "$REPORT_DIR"
mkdir -p "$REPORT_DIR"
TMP="$REPORT_DIR"
SUMMARY_MD="$REPORT_DIR/summary.md"
SUMMARY_JSON="$REPORT_DIR/summary.json"
RUN_STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# ── Step-level content-hash cache ──────────────────────────────────────────
# Persists "<step-id>:<input-hash>" markers across runs. When a step's input
# hash matches a previously-recorded successful run AND the Deno module cache
# (DENO_DIR) is warm, the step is skipped — saving the cost of re-running
# `deno check` / `deno bundle` when nothing has changed.
#
# Cache invalidates automatically when ANY of these change:
#   - source files under the function directory
#   - supabase/functions/deno.json (shared compiler/lint/fmt config)
#   - supabase/functions/deno.lock (if present)
#   - deno --version (toolchain bump)
#   - this script's own contents (so a logic change re-runs everything)
#
# Disable with SKIP_CACHE=1 or by passing --no-cache as the first argument.
CACHE_DIR="${EDGE_CHECK_CACHE_DIR:-$ROOT/.edge-function-cache}"
SKIP_CACHE="${SKIP_CACHE:-0}"
if [ "${1:-}" = "--no-cache" ]; then
  SKIP_CACHE=1
  shift
fi
mkdir -p "$CACHE_DIR"
CACHE_HITS=0
CACHE_MISSES=0
CACHE_SKIPS=0

# Pick a portable sha256 helper (sha256sum on Linux, shasum -a 256 on macOS).
if command -v sha256sum >/dev/null 2>&1; then
  _sha256() { sha256sum | awk '{print $1}'; }
elif command -v shasum >/dev/null 2>&1; then
  _sha256() { shasum -a 256 | awk '{print $1}'; }
else
  echo "❌ Neither sha256sum nor shasum found; cannot compute cache keys." >&2
  echo "   Re-run with SKIP_CACHE=1 to bypass." >&2
  exit 127
fi

# Hash a list of files (missing files contribute a stable empty marker so
# the absence of e.g. deno.lock is also part of the cache key).
_hash_files() {
  local f
  for f in "$@"; do
    if [ -f "$f" ]; then
      printf '%s\0' "$f"
      cat "$f"
      printf '\0'
    else
      printf '%s\0<missing>\0' "$f"
    fi
  done | _sha256
}

# True when the Deno module cache directory contains data (i.e. deps cached).
_deno_cache_warm() {
  local dir="${DENO_DIR:-$HOME/.cache/deno}"
  [ -d "$dir" ] && [ -n "$(ls -A "$dir" 2>/dev/null || true)" ]
}

DENO_CFG="$FN_DIR/deno.json"
CFG_ARGS=()
if [ -f "$DENO_CFG" ]; then
  CFG_ARGS=(--config "$DENO_CFG")
fi

DENO_VERSION_HASH="$(deno --version 2>/dev/null | _sha256)"
SCRIPT_HASH="$(_hash_files "$0")"
SHARED_HASH="$(_hash_files "$DENO_CFG" "$FN_DIR/deno.lock")"

# Compute the input hash for a function (recursively over its directory),
# combined with the shared, toolchain, and script hashes.
function_input_hash() {
  local fn_dir="$1"
  local src_hash
  # Sort for deterministic order across filesystems.
  src_hash="$(find "$fn_dir" -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.mjs' -o -name '*.json' \) -print0 \
    | sort -z \
    | xargs -0 cat 2>/dev/null \
    | _sha256)"
  printf '%s' "${src_hash}|${SHARED_HASH}|${DENO_VERSION_HASH}|${SCRIPT_HASH}" | _sha256
}

# Cache key file path for a given function + step id.
cache_marker() {
  printf '%s/%s.%s.hash' "$CACHE_DIR" "$1" "$2"
}

# Repo-wide lint + fmt gate (runs once, not per-function) — enforces the
# Edge Functions rule set defined in supabase/functions/deno.json.
# Wrapped in `timeout` below (see STEP_TIMEOUT) so a hung lint/fmt fails fast.
echo "── repo-wide lint + fmt ──────────────────────"
GATE_OK=1
gate_log1="$TMP/_lint.log"
gate_log2="$TMP/_fmt.log"

# NOTE: the timeout wrapper is applied after STEP_TIMEOUT is defined below,
# via a small helper. We forward-declare GATE_OK here and run the gate after
# the helper is in scope.

# Per-step timeouts (seconds). Override via env to tune in CI.
#   STEP_TIMEOUT       — default wall-clock budget per individual step
#   STEP_KILL_AFTER    — default extra grace before SIGKILL after SIGTERM
#
# Per-step overrides via STEP_TIMEOUT_<KEY> / STEP_KILL_AFTER_<KEY>, where
# <KEY> is derived from the step label (uppercased, non-alphanumerics → '_').
# Examples that work today:
#   STEP_TIMEOUT_DENO_CHECK=60     # "TypeScript compile (deno check)"
#   STEP_TIMEOUT_DENO_BUNDLE=300   # "Bundle dry-run (deno bundle)"
#   STEP_TIMEOUT_DENO_LINT=45      # "deno lint (Edge Functions rule set)"
#   STEP_TIMEOUT_DENO_FMT=30       # "deno fmt --check"
# A matching STEP_KILL_AFTER_<KEY> can override the grace period per step.
STEP_TIMEOUT="${STEP_TIMEOUT:-120}"
STEP_KILL_AFTER="${STEP_KILL_AFTER:-10}"
# Steps slower than this (seconds) get a ⚠️ marker in CI logs.
SLOW_STEP_THRESHOLD="${SLOW_STEP_THRESHOLD:-30}"
TOTAL_STEP_SECONDS=0

if ! command -v timeout >/dev/null 2>&1; then
  echo "❌ 'timeout' (coreutils) is required for per-step timeouts." >&2
  exit 127
fi

# Derive an env-var-friendly key from a step label.
# Prefers a parenthesised hint when present, otherwise the full label.
#   "TypeScript compile (deno check)"     → "DENO_CHECK"
#   "Bundle dry-run (deno bundle)"        → "DENO_BUNDLE"
#   "deno lint (Edge Functions rule set)" → "EDGE_FUNCTIONS_RULE_SET"
#   "deno fmt --check"                    → "DENO_FMT_CHECK"
step_key() {
  local label="$1"
  local hint=""
  if [[ "$label" =~ \(([^\)]+)\) ]]; then
    hint="${BASH_REMATCH[1]}"
  fi
  local source="${hint:-$label}"
  local key
  key="$(printf '%s' "$source" \
    | tr '[:lower:]' '[:upper:]' \
    | sed -E 's/[^A-Z0-9]+/_/g; s/^_+//; s/_+$//')"
  printf '%s' "$key"
}

# Look up a per-step env override by prefix (e.g. STEP_TIMEOUT_, STEP_KILL_AFTER_).
# Falls back to the supplied default. Strips a trailing 's' if the user wrote
# "60s" instead of "60".
resolve_step_env() {
  local prefix="$1" key="$2" default="$3"
  local var="${prefix}${key}"
  local val="${!var:-}"
  if [ -z "$val" ]; then
    printf '%s' "$default"
    return
  fi
  printf '%s' "${val%s}"
}

run_step() {
  # run_step <label> <logfile> -- <cmd...>
  local label="$1"; shift
  local logfile="$1"; shift
  shift # discard "--"
  local rc=0
  local key; key="$(step_key "$label")"
  local step_to; step_to="$(resolve_step_env STEP_TIMEOUT_ "$key" "$STEP_TIMEOUT")"
  local step_kill; step_kill="$(resolve_step_env STEP_KILL_AFTER_ "$key" "$STEP_KILL_AFTER")"
  local override_tag=""
  if [ "$step_to" != "$STEP_TIMEOUT" ] || [ "$step_kill" != "$STEP_KILL_AFTER" ]; then
    override_tag=" (timeout=${step_to}s, kill+${step_kill}s via STEP_TIMEOUT_${key})"
  fi
  # Use seconds resolution from `date +%s` (portable on macOS + Linux CI).
  local started; started="$(date +%s)"
  timeout --kill-after="${step_kill}s" "${step_to}s" "$@" \
    >"$logfile" 2>&1 || rc=$?
  local dur=$(( $(date +%s) - started ))
  TOTAL_STEP_SECONDS=$(( TOTAL_STEP_SECONDS + dur ))
  local slow=""
  if [ "$dur" -ge "$SLOW_STEP_THRESHOLD" ]; then
    slow=" ⚠️ slow (>${SLOW_STEP_THRESHOLD}s)"
  fi
  STEP_RESULTS+=("${LAST_FN:-_gate}|$label|$rc|${dur}s|$(basename "$logfile")|${step_to}|${key}")
  if [ "$rc" -eq 0 ]; then
    echo "  ✓ $label  [${dur}s]${slow}${override_tag}"
    return 0
  fi
  if [ "$rc" -eq 124 ] || [ "$rc" -eq 137 ]; then
    echo "  ✗ $label — TIMEOUT after ${step_to}s (exit $rc)  [${dur}s]${override_tag}"
    echo "      Hint: increase STEP_TIMEOUT_${key} (or STEP_TIMEOUT), or"
    echo "      inspect the function for hangs (network fetches at import"
    echo "      time, infinite loops, etc.)"
  else
    echo "  ✗ $label (exit $rc)  [${dur}s]${slow}${override_tag}"
  fi
  sed 's/^/      /' "$logfile"
  return 1
}

# run_step_cached <step-id> <cache-key-hash> <label> <logfile> -- <cmd...>
#
# Skips the step (returns 0) when:
#   - SKIP_CACHE is not 1
#   - the cache marker for (LAST_FN, step-id) holds the same hash, AND
#   - the Deno module cache directory is warm (deps available offline)
# Otherwise runs the command via run_step and, on success, persists the hash.
run_step_cached() {
  local step_id="$1"; shift
  local input_hash="$1"; shift
  local label="$1"; shift
  local logfile="$1"; shift
  shift # discard "--"
  local marker; marker="$(cache_marker "${LAST_FN}" "${step_id}")"
  local key; key="$(step_key "$label")"

  if [ "$SKIP_CACHE" != "1" ] && [ -f "$marker" ] \
      && [ "$(cat "$marker")" = "$input_hash" ] && _deno_cache_warm; then
    CACHE_HITS=$(( CACHE_HITS + 1 ))
    CACHE_SKIPS=$(( CACHE_SKIPS + 1 ))
    : >"$logfile"
    echo "(cache hit: inputs unchanged since last successful run)" >"$logfile"
    STEP_RESULTS+=("${LAST_FN:-_gate}|$label|0|0s|$(basename "$logfile")|cached|${key}")
    echo "  ⤳ $label  [cached, 0s]"
    return 0
  fi

  CACHE_MISSES=$(( CACHE_MISSES + 1 ))
  if run_step "$label" "$logfile" -- "$@"; then
    printf '%s' "$input_hash" >"$marker"
    return 0
  else
    # On failure, drop any stale marker so the next run is forced to re-execute.
    rm -f "$marker"
    return 1
  fi
}

STEP_RESULTS=()
LAST_FN="_gate"

# Run the lint/fmt gate now that run_step (with timeouts) is defined.
run_step "deno lint (Edge Functions rule set)" "$gate_log1" -- \
  deno lint "${CFG_ARGS[@]}" "$FN_DIR" || GATE_OK=0
run_step "deno fmt --check" "$gate_log2" -- \
  deno fmt --check "${CFG_ARGS[@]}" "$FN_DIR" || GATE_OK=0
echo

for f in "${TARGETS[@]}"; do
  name="$(basename "$(dirname "$f")")"
  LAST_FN="$name"
  echo "── $name ──────────────────────────────────"

  ok=1
  log1="$TMP/$name.check.log"
  log2="$TMP/$name.bundle.log"

  run_step "TypeScript compile (deno check)" "$log1" -- \
    deno check --no-lock --quiet "$f" || ok=0

  # Bundle dry-run: write to /dev/null so we only validate that the module
  # graph resolves and parses end-to-end, mirroring what Supabase does at
  # deploy time. `deno bundle` is the simplest portable equivalent.
  run_step "Bundle dry-run (deno bundle)" "$log2" -- \
    deno bundle --no-lock --quiet "$f" /dev/null || ok=0

  if [ "$ok" -eq 1 ]; then
    PASS+=("$name")
  else
    FAIL+=("$name")
  fi
done

# ── Build downloadable summary report ─────────────────────────────────────
RUN_FINISHED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
{
  echo "# Edge Functions Pre-Deploy Report"
  echo
  echo "- **Started:** $RUN_STARTED_AT"
  echo "- **Finished:** $RUN_FINISHED_AT"
  echo "- **Functions checked:** ${#TARGETS[@]}"
  echo "- **Passed:** ${#PASS[@]}"
  echo "- **Failed:** ${#FAIL[@]}"
  echo "- **Lint/fmt gate:** $([ "$GATE_OK" -eq 1 ] && echo '✅ pass' || echo '❌ fail')"
  echo "- **Total step time:** ${TOTAL_STEP_SECONDS}s"
  echo "- **Slow threshold:** ${SLOW_STEP_THRESHOLD}s"
  echo
  echo "## Step results"
  echo
  echo "| Function | Step | Exit | Duration | Timeout | Env key | Log |"
  echo "|---|---|---|---|---|---|---|"
  for row in "${STEP_RESULTS[@]}"; do
    IFS='|' read -r fn step rc dur logf step_to key <<<"$row"
    status=$([ "$rc" = "0" ] && echo "✅ $rc" || echo "❌ $rc")
    # Strip trailing 's' to compare numerically
    secs="${dur%s}"
    marker=""
    if [ "${secs:-0}" -ge "$SLOW_STEP_THRESHOLD" ]; then marker=" ⚠️"; fi
    to_cell="${step_to:-$STEP_TIMEOUT}s"
    if [ "${step_to:-$STEP_TIMEOUT}" != "$STEP_TIMEOUT" ]; then to_cell="${to_cell} *override*"; fi
    echo "| \`$fn\` | $step | $status | ${dur}${marker} | ${to_cell} | \`STEP_TIMEOUT_${key}\` | \`$logf\` |"
  done
  echo
  echo "## Slowest steps (top 5)"
  echo
  echo "| Duration | Function | Step |"
  echo "|---|---|---|"
  for row in "${STEP_RESULTS[@]}"; do
    IFS='|' read -r fn step _ dur _ _ _ <<<"$row"
    printf '%s\t%s\t%s\n' "${dur%s}" "$fn" "$step"
  done | sort -rn | head -5 | while IFS=$'\t' read -r secs fn step; do
    echo "| ${secs}s | \`$fn\` | $step |"
  done
  if [ "${#FAIL[@]}" -gt 0 ]; then
    echo
    echo "## Failed functions"
    printf -- '- `%s`\n' "${FAIL[@]}"
  fi
} >"$SUMMARY_MD"

# Machine-readable summary for downstream tooling
{
  printf '{'
  printf '"started_at":"%s",' "$RUN_STARTED_AT"
  printf '"finished_at":"%s",' "$RUN_FINISHED_AT"
  printf '"total":%d,' "${#TARGETS[@]}"
  printf '"passed":%d,' "${#PASS[@]}"
  printf '"failed":%d,' "${#FAIL[@]}"
  printf '"total_step_seconds":%d,' "$TOTAL_STEP_SECONDS"
  printf '"slow_threshold_seconds":%d,' "$SLOW_STEP_THRESHOLD"
  printf '"gate_ok":%s' "$([ "$GATE_OK" -eq 1 ] && echo true || echo false)"
  printf '}'
} >"$SUMMARY_JSON"

echo
echo "================ Summary ================"
echo "Passed: ${#PASS[@]}"
echo "Failed: ${#FAIL[@]}"
echo "Total step time: ${TOTAL_STEP_SECONDS}s (slow threshold: ${SLOW_STEP_THRESHOLD}s)"
if [ "${#STEP_RESULTS[@]}" -gt 0 ]; then
  echo "Slowest steps:"
  for row in "${STEP_RESULTS[@]}"; do
    IFS='|' read -r fn step _ dur _ _ _ <<<"$row"
    printf '%s\t%s\t%s\n' "${dur%s}" "$fn" "$step"
  done | sort -rn | head -3 | while IFS=$'\t' read -r secs fn step; do
    printf '  %4ss  %s — %s\n' "$secs" "$fn" "$step"
  done
fi
if [ "${#FAIL[@]}" -gt 0 ]; then
  printf '  - %s\n' "${FAIL[@]}"
fi
echo "Report: $SUMMARY_MD"

# Append to GitHub Actions step summary when running in CI
if [ -n "${GITHUB_STEP_SUMMARY:-}" ] && [ -f "$SUMMARY_MD" ]; then
  cat "$SUMMARY_MD" >>"$GITHUB_STEP_SUMMARY"
fi

if [ "$GATE_OK" -ne 1 ]; then
  echo "Lint/fmt gate failed. ❌"
  exit 1
fi
if [ "${#FAIL[@]}" -gt 0 ]; then
  exit 1
fi
echo "All edge functions lint, format, type-check, and bundle cleanly. ✅"
