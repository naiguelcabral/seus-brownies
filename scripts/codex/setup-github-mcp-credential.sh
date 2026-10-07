#!/usr/bin/env bash

# Gerencia somente a entrada GitHub MCP do GNOME Keyring / Secret Service.
set -euo pipefail

usage() {
  echo "Uso: $0 [--check|--remove]" >&2
  exit 2
}

if [[ $# -gt 1 ]]; then
  usage
fi

if ! command -v secret-tool >/dev/null 2>&1; then
  echo "secret-tool não está disponível." >&2
  exit 1
fi

case "${1:-}" in
  --check)
    if secret-tool lookup \
      service seus-brownies-codex \
      account github-mcp \
      key github-pat 2>/dev/null \
      | python3 -c 'import sys; sys.exit(0 if sys.stdin.buffer.read().strip() else 1)' \
      >/dev/null 2>&1; then
      echo "GitHub PAT disponível no keyring"
      exit 0
    fi
    echo "GitHub PAT não disponível no keyring" >&2
    exit 1
    ;;
  --remove)
    secret-tool clear \
      service seus-brownies-codex \
      account github-mcp \
      key github-pat >/dev/null
    echo "Entrada GitHub MCP removida do keyring"
    exit 0
    ;;
  '')
    ;;
  *)
    usage
    ;;
esac

if [[ -v GITHUB_PAT_TOKEN ]]; then
  credential="$GITHUB_PAT_TOKEN"
elif [[ -t 0 ]]; then
  read -rsp 'GitHub PAT para o MCP: ' credential
  echo >&2
else
  echo "Informe GITHUB_PAT_TOKEN ou use um terminal interativo." >&2
  exit 1
fi

if [[ -z "$credential" ]]; then
  unset credential GITHUB_PAT_TOKEN
  echo "Credencial vazia; nenhuma alteração feita." >&2
  exit 1
fi

if printf '%s' "$credential" | secret-tool store \
  --label='Seus Brownies Codex GitHub MCP' \
  service seus-brownies-codex \
  account github-mcp \
  key github-pat >/dev/null 2>&1; then
  unset credential GITHUB_PAT_TOKEN
  echo "GitHub PAT salvo no keyring"
else
  unset credential GITHUB_PAT_TOKEN
  echo "Falha ao salvar o GitHub PAT no keyring." >&2
  exit 1
fi
