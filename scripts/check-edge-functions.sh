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
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

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
  timeout --kill-after="${STEP_KILL_AFTER}s" "${STEP_TIMEOUT}s" "$@" \
    >"$logfile" 2>&1 || rc=$?
  if [ "$rc" -eq 0 ]; then
    echo "  ✓ $label"
    return 0
  fi
  # `timeout` exits 124 on SIGTERM expiry, 137 when it had to SIGKILL.
  if [ "$rc" -eq 124 ] || [ "$rc" -eq 137 ]; then
    echo "  ✗ $label — TIMEOUT after ${STEP_TIMEOUT}s (exit $rc)"
    echo "      Hint: increase STEP_TIMEOUT, or inspect the function for"
    echo "      hangs (network fetches at import time, infinite loops, etc.)"
  else
    echo "  ✗ $label (exit $rc)"
  fi
  sed 's/^/      /' "$logfile"
  return 1
}

# Run the lint/fmt gate now that run_step (with timeouts) is defined.
run_step "deno lint (Edge Functions rule set)" "$gate_log1" -- \
  deno lint "${CFG_ARGS[@]}" "$FN_DIR" || GATE_OK=0
run_step "deno fmt --check" "$gate_log2" -- \
  deno fmt --check "${CFG_ARGS[@]}" "$FN_DIR" || GATE_OK=0
echo

for f in "${TARGETS[@]}"; do
  name="$(basename "$(dirname "$f")")"
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

echo
echo "================ Summary ================"
echo "Passed: ${#PASS[@]}"
echo "Failed: ${#FAIL[@]}"
if [ "${#FAIL[@]}" -gt 0 ]; then
  printf '  - %s\n' "${FAIL[@]}"
fi
if [ "$GATE_OK" -ne 1 ]; then
  echo "Lint/fmt gate failed. ❌"
  exit 1
fi
if [ "${#FAIL[@]}" -gt 0 ]; then
  exit 1
fi
echo "All edge functions lint, format, type-check, and bundle cleanly. ✅"
