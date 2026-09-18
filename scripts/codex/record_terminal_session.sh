#!/usr/bin/env bash

# Abre um Bash filho registrado localmente. Execute-o de forma explícita para
# não capturar/recursar sobre o shell que iniciou LIGARTUDO.
set -euo pipefail
umask 077

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_DIR="$ROOT_DIR/.codex-local/terminal/sessions"
MEMORY_SCRIPT="$ROOT_DIR/scripts/codex/conversation_memory.py"

if [[ "${CODEX_TERMINAL_CAPTURE_ACTIVE:-}" == "1" ]]; then
  echo "Uma captura de terminal já está ativa neste shell."
  exit 1
fi

if ! command -v script >/dev/null 2>&1; then
  echo "O comando 'script' não está disponível neste sistema."
  exit 1
fi

if ! python3 "$MEMORY_SCRIPT" prepare >/dev/null; then
  echo "A infraestrutura local endurecida não pôde ser validada."
  exit 1
fi

if [[ ! -d "$LOG_DIR" || -L "$LOG_DIR" ]]; then
  echo "O diretório local de captura é inválido."
  exit 1
fi

LOG_FILE="$(mktemp "$LOG_DIR/$(date +%Y-%m-%d_%H%M%S)-terminal.XXXXXX.log")"
chmod 600 "$LOG_FILE"

echo "Registrando apenas nesta sessão filha em: .codex-local/terminal/sessions/$(basename "$LOG_FILE")"
echo "O log é bruto, não confiável e nunca é carregado automaticamente como instrução."
echo "Use 'exit' para encerrar a captura. Não digite segredos neste terminal."
exec env CODEX_TERMINAL_CAPTURE_ACTIVE=1 script -q -f "$LOG_FILE" bash -i
