#!/usr/bin/env bash
# Pre-commit secret scan: blocks commits containing API keys / passwords.
# Runs Gitleaks on staged changes only (fast). Uses .gitleaks.toml config.
set -euo pipefail

run_gitleaks() {
  if command -v gitleaks >/dev/null 2>&1; then
    gitleaks protect --staged --config .gitleaks.toml --verbose
  elif command -v docker >/dev/null 2>&1; then
    docker run --rm -v "$PWD:/repo" -w /repo zricethezav/gitleaks:latest \
      protect --staged --config .gitleaks.toml --verbose
  else
    cat >&2 <<'EOF'
❌ Gitleaks পাওয়া যায়নি — secret scan চালানো সম্ভব হলো না।

ইনস্টল করুন (যেকোনো একটি):
  • Windows:  winget install gitleaks  অথবা  scoop install gitleaks
  • macOS:    brew install gitleaks
  • Linux:    https://github.com/gitleaks/gitleaks/releases
  • অথবা Docker ইনস্টল থাকলে স্বয়ংক্রিয়ভাবে Docker দিয়ে চলবে।

ইনস্টল করে আবার commit করুন। জরুরি প্রয়োজনে (নিরাপদ বলে নিশ্চিত হলে):
  git commit --no-verify
EOF
    exit 1
  fi
}

if run_gitleaks; then
  echo "✅ Secret scan passed — কোনো API key / password পাওয়া যায়নি।"
else
  cat >&2 <<'EOF'

❌ Commit আটকে দেওয়া হয়েছে: staged ফাইলে API key / password মনে হচ্ছে।

করণীয়:
  1. ওই ফাইল থেকে সিক্রেট সরিয়ে Lovable Cloud-এর Secrets-এ রাখুন।
  2. পাবলিক/পাবলিশেবল কী হলে .gitleaks.toml-এর allowlist-এ যোগ করুন।
  3. ভুল ধরা পড়লে (false positive) ফাইলে # gitleaks:allow কমেন্ট দিন।
EOF
  exit 1
fi
