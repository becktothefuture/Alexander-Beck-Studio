#!/usr/bin/env bash
set -euo pipefail

github_cli_bin="${ABS_GITHUB_CLI_BIN:-}"

if [[ -n "$github_cli_bin" && ! -x "$github_cli_bin" ]]; then
  echo "ABS_GITHUB_CLI_BIN is not executable: $github_cli_bin" >&2
  exit 127
fi

if [[ -z "$github_cli_bin" ]]; then
  github_cli_bin="$(command -v gh 2>/dev/null || true)"
fi

if [[ -z "$github_cli_bin" ]]; then
  for candidate in \
    /opt/homebrew/bin/gh \
    /usr/local/bin/gh \
    /home/linuxbrew/.linuxbrew/bin/gh
  do
    if [[ -x "$candidate" ]]; then
      github_cli_bin="$candidate"
      break
    fi
  done
fi

if [[ -z "$github_cli_bin" ]]; then
  cat >&2 <<'EOF'
GitHub CLI was not found.

Git commit and push do not require GitHub CLI; use git directly for those tasks.
Install gh only when GitHub API or workflow inspection is needed, then rerun this helper.
EOF
  exit 127
fi

exec "$github_cli_bin" "$@"
