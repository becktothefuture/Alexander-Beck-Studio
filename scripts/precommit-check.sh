#!/usr/bin/env bash
set -euo pipefail

echo "== Pre-commit checklist =="
echo "Lightweight inspection only; run npm run check:site for the full local gate."
echo

echo "1) Git status"
git status --short
echo

echo "2) Staged repository artifact hygiene"
node scripts/check-repository-artifacts.mjs check-staged
echo

echo "3) Unstaged changes in react-app/app/src"
git diff -- react-app/app/src
echo

echo "4) Staged changes in react-app/app/src"
git diff --staged -- react-app/app/src
echo

echo "5) Last 5 commits"
git log --oneline -5
echo

echo "6) Malformed tokenized string guardrail"
npm run check:malformed-tokens:staged
echo

echo "7) Production HTML entry validation"
npm run validate:html-entries

echo
echo "8) Flat circle material guardrail"
npm run check:flat-circle-materials
