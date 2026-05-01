#!/usr/bin/env bash
# Pre-deploy guard: validate that every Supabase Edge Function has the env
# vars it needs.
#
# Two layers:
#   1. Static scan — grep every function for `Deno.env.get("FOO")` and warn
#      if FOO is not declared in supabase/functions/env.manifest.json. This
#      catches "added a new secret to the code but forgot to document it".
#   2. Runtime check — for every var listed as `required` in the manifest
#      (per function or in the `always` block), confirm it is set in the
#      current shell environment. Fails the build if any required var is
#      missing, printing the example placeholder so the operator knows the
#      shape of the value to provide.
#
# Usage:
#   scripts/check-edge-function-env.sh             # all functions
#   scripts/check-edge-function-env.sh fn1 fn2     # subset
#   STRICT=1 scripts/check-edge-function-env.sh    # also fail on undeclared
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FN_DIR="$ROOT/supabase/functions"
MANIFEST="$FN_DIR/env.manifest.json"
STRICT="${STRICT:-0}"

if ! command -v jq >/dev/null 2>&1; then
  echo "❌ jq is required (apt-get install -y jq)." >&2
  exit 127
fi
if [ ! -f "$MANIFEST" ]; then
  echo "❌ Manifest not found: $MANIFEST" >&2
  exit 1
fi

# Resolve target functions
declare -a TARGETS
if [ "$#" -gt 0 ]; then
  TARGETS=("$@")
else
  while IFS= read -r d; do
    TARGETS+=("$(basename "$d")")
  done < <(find "$FN_DIR" -mindepth 2 -maxdepth 2 -name 'index.ts' -exec dirname {} \; | sort)
fi

# Vars Supabase always injects
mapfile -t ALWAYS_REQUIRED < <(jq -r '.always.required[]?' "$MANIFEST")

MISSING_REQUIRED=()
UNDECLARED=()
PASS=()
FAIL=()

# 1) Always-required vars
echo "── Platform-injected vars ──────────────"
for v in "${ALWAYS_REQUIRED[@]}"; do
  if [ -z "${!v:-}" ]; then
    ex="$(jq -r --arg k "$v" '.always.examples[$k] // "<unset>"' "$MANIFEST")"
    echo "  ✗ $v   (example: $ex)"
    MISSING_REQUIRED+=("$v (always)")
  else
    echo "  ✓ $v"
  fi
done
echo

# 2) Per-function checks
for fn in "${TARGETS[@]}"; do
  src="$FN_DIR/$fn/index.ts"
  if [ ! -f "$src" ]; then
    echo "── $fn ── ❌ index.ts not found"
    FAIL+=("$fn")
    continue
  fi
  echo "── $fn ──────────────────────────────"

  # Vars referenced in source
  # Vars referenced in source. The sed pulls the quoted name from
  # `Deno.env.get("FOO")` / `Deno.env.get('FOO')`, leaving the var name only.
  mapfile -t USED < <(
    grep -oE 'Deno\.env\.get\(\s*["'\''][A-Z][A-Z0-9_]*["'\'']' "$src" \
      | sed -E 's/.*["'\'']([A-Z][A-Z0-9_]*)["'\''].*/\1/' \
      | sort -u
  )

  # Declared in manifest
  mapfile -t DECLARED < <(
    jq -r --arg fn "$fn" '
      ((.functions[$fn].required // []) + (.functions[$fn].optional // []) + .always.required) | .[]
    ' "$MANIFEST" | sort -u
  )

  # Required by manifest for this function
  mapfile -t REQUIRED < <(jq -r --arg fn "$fn" '.functions[$fn].required[]? // empty' "$MANIFEST")

  fn_ok=1

  # 2a) Required vars must be set in env
  for v in "${REQUIRED[@]}"; do
    if [ -z "${!v:-}" ]; then
      ex="$(jq -r --arg fn "$fn" --arg k "$v" '.functions[$fn].examples[$k] // "<unset>"' "$MANIFEST")"
      echo "  ✗ required env missing: $v   (example: $ex)"
      MISSING_REQUIRED+=("$v ($fn)")
      fn_ok=0
    else
      echo "  ✓ $v set"
    fi
  done

  # 2b) Vars used in code but not declared in the manifest
  for v in "${USED[@]}"; do
    [[ " ${DECLARED[*]:-} " == *" $v "* ]] && continue
    echo "  ⚠ used in code but not in manifest: $v"
    UNDECLARED+=("$fn:$v")
    [ "$STRICT" = "1" ] && fn_ok=0
  done

  if [ "$fn_ok" -eq 1 ]; then PASS+=("$fn"); else FAIL+=("$fn"); fi
done

echo
echo "================ Summary ================"
echo "Functions OK:       ${#PASS[@]}"
echo "Functions failing:  ${#FAIL[@]}"
echo "Missing required:   ${#MISSING_REQUIRED[@]}"
echo "Undeclared (warn):  ${#UNDECLARED[@]}"

if [ "${#MISSING_REQUIRED[@]}" -gt 0 ]; then
  echo
  echo "Missing required env vars:"
  printf '  - %s\n' "${MISSING_REQUIRED[@]}"
fi
if [ "${#UNDECLARED[@]}" -gt 0 ]; then
  echo
  echo "Add these to supabase/functions/env.manifest.json:"
  printf '  - %s\n' "${UNDECLARED[@]}"
fi

if [ "${#FAIL[@]}" -gt 0 ] || [ "${#MISSING_REQUIRED[@]}" -gt 0 ]; then
  exit 1
fi
echo
echo "All edge function environments validated. ✅"
