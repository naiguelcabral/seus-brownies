#!/usr/bin/env bash

# Abre um Bash filho registrado localmente. Execute-o de forma explícita para
# não capturar/recursar sobre o shell que iniciou LIGARTUDO.
set -euo pipefail
umask 077

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_DIR="$ROOT_DIR/.codex-local/terminal/sessions"

if [[ "${CODEX_TERMINAL_CAPTURE_ACTIVE:-}" == "1" ]]; then
  echo "Uma captura de terminal já está ativa neste shell."
  exit 1
fi

if ! command -v script >/dev/null 2>&1; then
  echo "O comando 'script' não está disponível neste sistema."
  exit 1
fi

mkdir -p "$LOG_DIR"
chmod 700 "$ROOT_DIR/.codex-local" 2>/dev/null || true
LOG_FILE="$LOG_DIR/$(date +%Y-%m-%d_%H%M%S)-terminal.log"

echo "Registrando apenas nesta sessão filha em: .codex-local/terminal/sessions/$(basename "$LOG_FILE")"
echo "Use 'exit' para encerrar a captura. Não digite segredos neste terminal."
exec env CODEX_TERMINAL_CAPTURE_ACTIVE=1 script -q -f "$LOG_FILE" bash -i
