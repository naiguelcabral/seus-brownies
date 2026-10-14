#!/usr/bin/env bash

# Inicia o Codex com o PAT do GitHub obtido somente do GNOME Keyring.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CHECK_ONLY=false

# Nenhum subprocesso do preflight deve herdar uma variável anterior.
unset GITHUB_PAT_TOKEN

if [[ "${1:-}" == "--check" && $# -eq 1 ]]; then
  CHECK_ONLY=true
elif [[ "${1:-}" == "--check" ]]; then
  echo "Uso: $0 [--check] [argumentos do Codex]" >&2
  exit 2
fi

if ! command -v secret-tool >/dev/null 2>&1; then
  echo "secret-tool não está disponível." >&2
  exit 1
fi

if ! command -v codex >/dev/null 2>&1; then
  echo "Codex CLI não está disponível." >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 não está disponível para validar a configuração MCP." >&2
  exit 1
fi

if ! codex mcp get github --json 2>/dev/null \
  | python3 -c '
import json
import sys
try:
    config = json.load(sys.stdin)
    transport = config.get("transport", {})
    valid = (config.get("name") == "github"
             and config.get("enabled") is True
             and transport.get("type") == "streamable_http"
             and transport.get("bearer_token_env_var") == "GITHUB_PAT_TOKEN")
except (ValueError, AttributeError):
    valid = False
sys.exit(0 if valid else 1)
'; then
  echo "GitHub MCP ausente ou bearer_token_env_var incorreto." >&2
  exit 1
fi

if [[ "$CHECK_ONLY" == true ]]; then
  if ! "$ROOT_DIR/scripts/codex/setup-github-mcp-credential.sh" --check >/dev/null 2>&1; then
    echo "GitHub keyring ........... HOST CHECK REQUIRED"
    echo "GitHub MCP config ........ OK"
    echo "GITHUB_PAT_TOKEN source .. KEYRING"
    echo "Codex CLI ................ OK"
    echo "KEYRING_RUNTIME_CHECK_REQUIRES_HOST=YES"
    exit 1
  fi
  echo "GitHub keyring ........... OK"
  echo "GitHub MCP config ........ OK"
  echo "GITHUB_PAT_TOKEN source .. KEYRING"
  echo "Codex CLI ................ OK"
  echo "GITHUB_PERSISTENCE_READY=YES"
  exit 0
fi

if ! GITHUB_PAT_TOKEN="$(secret-tool lookup \
  service seus-brownies-codex \
  account github-mcp \
  key github-pat 2>/dev/null)"; then
  unset GITHUB_PAT_TOKEN
  echo "Não foi possível acessar a credencial GitHub no keyring." >&2
  exit 1
fi

if [[ -z "$GITHUB_PAT_TOKEN" ]]; then
  unset GITHUB_PAT_TOKEN
  echo "Credencial GitHub ausente ou vazia no keyring." >&2
  exit 1
fi

export GITHUB_PAT_TOKEN
cd "$ROOT_DIR"
exec codex "$@"
