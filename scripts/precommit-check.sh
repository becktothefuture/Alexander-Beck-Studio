#!/usr/bin/env bash
set -euo pipefail

echo "== Pre-commit checklist =="
echo

echo "1) Git status"
git status --short
echo

echo "2) node_modules hygiene"
NODE_MODULES_UNSTAGED="$(git diff --name-only | rg '^node_modules/' || true)"
NODE_MODULES_STAGED="$(git diff --name-only --staged | rg '^node_modules/' || true)"
if [ -n "$NODE_MODULES_UNSTAGED" ] || [ -n "$NODE_MODULES_STAGED" ]; then
  echo "FAIL: node_modules hygiene violated."
  if [ -n "$NODE_MODULES_UNSTAGED" ]; then
    echo "Unstaged changes under node_modules/:"
    echo "$NODE_MODULES_UNSTAGED"
  fi
  if [ -n "$NODE_MODULES_STAGED" ]; then
    echo "Staged changes under node_modules/:"
    echo "$NODE_MODULES_STAGED"
  fi
  exit 1
fi
echo "PASS"
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

echo "6) Staged generated/build artifacts"
STAGED_GENERATED="$(git diff --name-only --staged -- 'react-app/app/dist/**' 'output/**' 'tmp/**' '.playwright-cli/**' || true)"
if [ -n "$STAGED_GENERATED" ]; then
  echo "Warning: generated artifacts are staged:"
  echo "$STAGED_GENERATED"
else
  echo "None"
fi
echo

echo "7) Malformed tokenized string guardrail"
npm run check:malformed-tokens:staged
echo

echo "8) HTML fragment validation"
npm run validate:html-fragments
