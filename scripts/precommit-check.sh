#!/usr/bin/env bash
set -euo pipefail

echo "== Pre-commit checklist =="
echo

echo "1) Git status"
git status --short
echo

echo "2) Unstaged changes in react-app/app/src"
git diff -- react-app/app/src
echo

echo "3) Staged changes in react-app/app/src"
git diff --staged -- react-app/app/src
echo

echo "4) Last 5 commits"
git log --oneline -5
echo

echo "5) Staged generated/build artifacts"
STAGED_GENERATED="$(git diff --name-only --staged -- 'react-app/app/dist/**' 'output/**' 'tmp/**' '.playwright-cli/**' || true)"
if [ -n "$STAGED_GENERATED" ]; then
  echo "Warning: generated artifacts are staged:"
  echo "$STAGED_GENERATED"
else
  echo "None"
fi
