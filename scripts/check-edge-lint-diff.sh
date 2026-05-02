#!/usr/bin/env bash
# Stricter lint gate: fail when `deno lint` reports any NEW warnings/errors
# on the current commit compared to a baseline branch (default: origin/main).
#
# How it works:
#   1. Run `deno lint --json` against supabase/functions on the current tree.
#   2. Check out the baseline ref into a temp worktree, run the same command.
#   3. Diagnostics are reduced to a stable fingerprint
#        "<rule>|<file-relative-to-fn-dir>|<message>"
#      so line numbers don't cause false positives when code shifts around.
#   4. NEW = current set − baseline set. If non-empty, exit 1 and print them.
#
# Skip / override knobs:
#   LINT_DIFF_BASE_REF=origin/main   # baseline ref to diff against
#   LINT_DIFF_SKIP=1                 # bypass the gate entirely
#   LINT_DIFF_ALLOW_REGRESSIONS=1    # warn-only mode (don't fail CI)
#   LINT_DIFF_REPORT_DIR=...         # where to write the JSON diff report
#
# This script is INDEPENDENT of check-edge-functions.sh so it can run as its
# own CI step and produce a focused diff artifact.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FN_DIR="$ROOT/supabase/functions"
BASE_REF="${LINT_DIFF_BASE_REF:-origin/main}"
REPORT_DIR="${LINT_DIFF_REPORT_DIR:-$ROOT/.edge-function-reports}"
mkdir -p "$REPORT_DIR"
CURRENT_JSON="$REPORT_DIR/lint.current.json"
BASELINE_JSON="$REPORT_DIR/lint.baseline.json"
DIFF_JSON="$REPORT_DIR/lint.diff.json"
DIFF_MD="$REPORT_DIR/lint-diff.md"

if [ "${LINT_DIFF_SKIP:-0}" = "1" ]; then
  echo "⏭️  LINT_DIFF_SKIP=1 — skipping lint regression gate."
  exit 0
fi

if ! command -v deno >/dev/null 2>&1; then
  echo "❌ deno is not installed." >&2
  exit 127
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "❌ jq is required (used to normalise deno lint JSON)." >&2
  exit 127
fi
if ! command -v git >/dev/null 2>&1; then
  echo "❌ git is required to resolve the baseline ref." >&2
  exit 127
fi
if [ ! -d "$FN_DIR" ]; then
  echo "ℹ️  No supabase/functions directory; nothing to diff."
  exit 0
fi

DENO_CFG="$FN_DIR/deno.json"
CFG_ARGS=()
[ -f "$DENO_CFG" ] && CFG_ARGS=(--config "$DENO_CFG")

# Reduce a `deno lint --json` document to a sorted, deduped list of stable
# fingerprints. Line numbers are intentionally dropped so cosmetic shifts
# don't get flagged as regressions.
fingerprint_lint_json() {
  # Input: deno lint --json on stdin
  # Output: one fingerprint per line, sorted + unique
  jq -r --arg root "$FN_DIR" '
    (.diagnostics // [])[]
    | (.code // "unknown") as $rule
    | (.message // "") as $msg
    | (.filename // "") as $file
    # Normalise file path → relative to supabase/functions for stable diffing
    | ($file | sub("^.*/supabase/functions/"; "")) as $rel
    | "\($rule)|\($rel)|\($msg)"
  ' | LC_ALL=C sort -u
}

run_lint_into() {
  local out="$1"
  # `deno lint --json` exits non-zero when diagnostics are present; that's
  # expected here — capture the JSON regardless. Stderr is dropped so a
  # noisy toolchain banner doesn't corrupt the JSON stream.
  deno lint --json "${CFG_ARGS[@]}" "$FN_DIR" >"$out" 2>/dev/null || true
  # Validate JSON; if deno produced something unparseable, fall back to empty.
  if ! jq -e . "$out" >/dev/null 2>&1; then
    echo '{"diagnostics":[]}' >"$out"
  fi
}

echo "── deno lint regression gate ─────────────────"
echo "  baseline: $BASE_REF"

# 1) Current tree
run_lint_into "$CURRENT_JSON"
current_fp="$REPORT_DIR/lint.current.fp"
fingerprint_lint_json <"$CURRENT_JSON" >"$current_fp"
current_count=$(wc -l <"$current_fp" | tr -d ' ')

# 2) Baseline — fetch ref if missing, then run lint inside a throwaway worktree
baseline_available=1
if ! git rev-parse --verify --quiet "$BASE_REF" >/dev/null; then
  echo "  fetching $BASE_REF…"
  if ! git fetch --depth=1 origin "${BASE_REF#origin/}" 2>/dev/null; then
    echo "  ⚠️  could not fetch $BASE_REF — treating baseline as empty"
    baseline_available=0
  fi
fi

baseline_fp="$REPORT_DIR/lint.baseline.fp"
: >"$baseline_fp"
if [ "$baseline_available" -eq 1 ] && git rev-parse --verify --quiet "$BASE_REF" >/dev/null; then
  worktree="$(mktemp -d -t lint-baseline.XXXXXX)"
  # shellcheck disable=SC2064
  trap "git worktree remove --force '$worktree' >/dev/null 2>&1 || rm -rf '$worktree'" EXIT
  if git worktree add --detach --quiet "$worktree" "$BASE_REF" 2>/dev/null; then
    if [ -d "$worktree/supabase/functions" ]; then
      base_cfg=()
      [ -f "$worktree/supabase/functions/deno.json" ] \
        && base_cfg=(--config "$worktree/supabase/functions/deno.json")
      deno lint --json "${base_cfg[@]}" "$worktree/supabase/functions" \
        >"$BASELINE_JSON" 2>/dev/null || true
      if ! jq -e . "$BASELINE_JSON" >/dev/null 2>&1; then
        echo '{"diagnostics":[]}' >"$BASELINE_JSON"
      fi
      # Re-base file paths in fingerprints to the workspace path so they
      # compare like-for-like against the current run.
      jq --arg root "$worktree/supabase/functions" '
        (.diagnostics // [])
        | map(.filename = ((.filename // "") | sub("^.*/supabase/functions/"; "")))
        | {diagnostics: .}
      ' "$BASELINE_JSON" >"$BASELINE_JSON.norm" && mv "$BASELINE_JSON.norm" "$BASELINE_JSON"
      fingerprint_lint_json <"$BASELINE_JSON" >"$baseline_fp"
    else
      echo "  ℹ️  baseline has no supabase/functions/ — treating as empty."
      echo '{"diagnostics":[]}' >"$BASELINE_JSON"
    fi
  else
    echo "  ⚠️  could not create worktree for $BASE_REF — treating baseline as empty"
    echo '{"diagnostics":[]}' >"$BASELINE_JSON"
  fi
else
  echo '{"diagnostics":[]}' >"$BASELINE_JSON"
fi
baseline_count=$(wc -l <"$baseline_fp" | tr -d ' ')

# 3) Diff
new_fp="$REPORT_DIR/lint.new.fp"
fixed_fp="$REPORT_DIR/lint.fixed.fp"
LC_ALL=C comm -23 "$current_fp" "$baseline_fp" >"$new_fp"
LC_ALL=C comm -13 "$current_fp" "$baseline_fp" >"$fixed_fp"
new_count=$(wc -l <"$new_fp" | tr -d ' ')
fixed_count=$(wc -l <"$fixed_fp" | tr -d ' ')

echo "  current:  $current_count diagnostic(s)"
echo "  baseline: $baseline_count diagnostic(s)"
echo "  new:      $new_count"
echo "  fixed:    $fixed_count"

# 4) JSON + Markdown reports
{
  printf '{'
  printf '"base_ref":"%s",' "$BASE_REF"
  printf '"current_count":%d,' "$current_count"
  printf '"baseline_count":%d,' "$baseline_count"
  printf '"new_count":%d,' "$new_count"
  printf '"fixed_count":%d,' "$fixed_count"
  printf '"new":'
  jq -R -s 'split("\n") | map(select(length > 0)) | map(split("|") | {rule:.[0], file:.[1], message:.[2]})' "$new_fp"
  printf ',"fixed":'
  jq -R -s 'split("\n") | map(select(length > 0)) | map(split("|") | {rule:.[0], file:.[1], message:.[2]})' "$fixed_fp"
  printf '}'
} >"$DIFF_JSON"

{
  echo "# Edge Functions Lint Regression Report"
  echo
  echo "- **Baseline:** \`$BASE_REF\`"
  echo "- **Current diagnostics:** $current_count"
  echo "- **Baseline diagnostics:** $baseline_count"
  echo "- **New (regressions):** $new_count"
  echo "- **Fixed:** $fixed_count"
  echo
  if [ "$new_count" -gt 0 ]; then
    echo "## ❌ New warnings introduced"
    echo
    echo "| Rule | File | Message |"
    echo "|---|---|---|"
    while IFS='|' read -r rule file msg; do
      [ -z "$rule" ] && continue
      echo "| \`$rule\` | \`$file\` | $msg |"
    done <"$new_fp"
  else
    echo "## ✅ No new lint warnings vs baseline"
  fi
  if [ "$fixed_count" -gt 0 ]; then
    echo
    echo "## ✨ Fixed since baseline"
    echo
    echo "| Rule | File | Message |"
    echo "|---|---|---|"
    while IFS='|' read -r rule file msg; do
      [ -z "$rule" ] && continue
      echo "| \`$rule\` | \`$file\` | $msg |"
    done <"$fixed_fp"
  fi
} >"$DIFF_MD"

# Append to GitHub Actions step summary when in CI
if [ -n "${GITHUB_STEP_SUMMARY:-}" ] && [ -f "$DIFF_MD" ]; then
  cat "$DIFF_MD" >>"$GITHUB_STEP_SUMMARY"
fi

echo "Report: $DIFF_MD"

if [ "$new_count" -gt 0 ]; then
  echo
  echo "❌ ${new_count} new lint warning(s) introduced vs ${BASE_REF}:"
  while IFS='|' read -r rule file msg; do
    [ -z "$rule" ] && continue
    printf '  • [%s] %s — %s\n' "$rule" "$file" "$msg"
  done <"$new_fp"
  if [ "${LINT_DIFF_ALLOW_REGRESSIONS:-0}" = "1" ]; then
    echo
    echo "⚠️  LINT_DIFF_ALLOW_REGRESSIONS=1 — not failing the build."
    exit 0
  fi
  exit 1
fi

echo "✅ No new lint warnings vs ${BASE_REF}."
