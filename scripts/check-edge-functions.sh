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

DENO_CFG="$FN_DIR/deno.json"
CFG_ARGS=()
if [ -f "$DENO_CFG" ]; then
  CFG_ARGS=(--config "$DENO_CFG")
fi

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
#   STEP_TIMEOUT       — wall-clock budget per individual step
#   STEP_KILL_AFTER    — extra grace before SIGKILL after SIGTERM
STEP_TIMEOUT="${STEP_TIMEOUT:-120}"
STEP_KILL_AFTER="${STEP_KILL_AFTER:-10}"
# Steps slower than this (seconds) get a ⚠️ marker in CI logs.
SLOW_STEP_THRESHOLD="${SLOW_STEP_THRESHOLD:-30}"
TOTAL_STEP_SECONDS=0

if ! command -v timeout >/dev/null 2>&1; then
  echo "❌ 'timeout' (coreutils) is required for per-step timeouts." >&2
  exit 127
fi

run_step() {
  # run_step <label> <logfile> -- <cmd...>
  local label="$1"; shift
  local logfile="$1"; shift
  shift # discard "--"
  local rc=0
  # Use seconds resolution from `date +%s` (portable on macOS + Linux CI).
  local started; started="$(date +%s)"
  timeout --kill-after="${STEP_KILL_AFTER}s" "${STEP_TIMEOUT}s" "$@" \
    >"$logfile" 2>&1 || rc=$?
  local dur=$(( $(date +%s) - started ))
  TOTAL_STEP_SECONDS=$(( TOTAL_STEP_SECONDS + dur ))
  local slow=""
  if [ "$dur" -ge "$SLOW_STEP_THRESHOLD" ]; then
    slow=" ⚠️ slow (>${SLOW_STEP_THRESHOLD}s)"
  fi
  STEP_RESULTS+=("${LAST_FN:-_gate}|$label|$rc|${dur}s|$(basename "$logfile")")
  if [ "$rc" -eq 0 ]; then
    echo "  ✓ $label  [${dur}s]${slow}"
    return 0
  fi
  if [ "$rc" -eq 124 ] || [ "$rc" -eq 137 ]; then
    echo "  ✗ $label — TIMEOUT after ${STEP_TIMEOUT}s (exit $rc)  [${dur}s]"
    echo "      Hint: increase STEP_TIMEOUT, or inspect the function for"
    echo "      hangs (network fetches at import time, infinite loops, etc.)"
  else
    echo "  ✗ $label (exit $rc)  [${dur}s]${slow}"
  fi
  sed 's/^/      /' "$logfile"
  return 1
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
  echo
  echo "## Step results"
  echo
  echo "| Function | Step | Exit | Duration | Log |"
  echo "|---|---|---|---|---|"
  for row in "${STEP_RESULTS[@]}"; do
    IFS='|' read -r fn step rc dur logf <<<"$row"
    status=$([ "$rc" = "0" ] && echo "✅ $rc" || echo "❌ $rc")
    echo "| \`$fn\` | $step | $status | $dur | \`$logf\` |"
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
  printf '"gate_ok":%s' "$([ "$GATE_OK" -eq 1 ] && echo true || echo false)"
  printf '}'
} >"$SUMMARY_JSON"

echo
echo "================ Summary ================"
echo "Passed: ${#PASS[@]}"
echo "Failed: ${#FAIL[@]}"
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
