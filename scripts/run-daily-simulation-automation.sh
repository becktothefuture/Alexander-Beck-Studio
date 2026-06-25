#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROMPT_PATH="${REPO_ROOT}/docs/prompts/daily-simulation-builder.md"
CODEX_BIN="${CODEX_BIN:-/Applications/Codex.app/Contents/Resources/codex}"
LOG_DIR="${REPO_ROOT}/output/automation/daily-simulation"
STAMP="$(date +"%Y-%m-%dT%H-%M-%S")"
LOG_PATH="${LOG_DIR}/${STAMP}.log"

cd "${REPO_ROOT}"

if [[ ! -f "${PROMPT_PATH}" ]]; then
  echo "Missing prompt: ${PROMPT_PATH}" >&2
  exit 1
fi

if [[ ! -x "${CODEX_BIN}" ]]; then
  echo "Codex binary not found or not executable: ${CODEX_BIN}" >&2
  exit 1
fi

if [[ "${ABS_DAILY_SIM_ALLOW_DIRTY:-0}" != "1" ]] && [[ -n "$(git status --short)" ]]; then
  echo "Refusing to run daily simulation automation on a dirty worktree." >&2
  echo "Set ABS_DAILY_SIM_ALLOW_DIRTY=1 to override intentionally." >&2
  exit 1
fi

mkdir -p "${LOG_DIR}"

"${CODEX_BIN}" exec "$(cat "${PROMPT_PATH}")" 2>&1 | tee "${LOG_PATH}"
