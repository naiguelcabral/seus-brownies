#!/usr/bin/env bash

# Controlador deliberadamente conservador: um pacote pronto por ciclo.
set -euo pipefail
umask 077

ROOT_DIR="${CODEX_AUTOPILOT_ROOT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$ROOT_DIR"

readonly EXIT_BLOCKED=20 EXIT_VALIDATION=21 EXIT_LIMIT=22 EXIT_HUMAN=23 EXIT_PREFLIGHT=24
MODE=""; MAX_CYCLES=1; CYCLE_TIMEOUT=900
ATTEMPTED=""; DEFERRED_EXIT=0; COMPLETED=0

usage() { echo "Uso: $0 --dry-run|--once|--loop [--max-cycles N] [--cycle-timeout SEGUNDOS]"; }
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run|--once|--loop) [[ -z "$MODE" ]] || { usage; exit 2; }; MODE="$1" ;;
    --max-cycles) MAX_CYCLES="${2:-}"; shift ;;
    --cycle-timeout) CYCLE_TIMEOUT="${2:-}"; shift ;;
    *) usage; exit 2 ;;
  esac
  shift
done
[[ -n "$MODE" && "$MAX_CYCLES" =~ ^[1-9][0-9]*$ && "$CYCLE_TIMEOUT" =~ ^[1-9][0-9]*$ ]] || { usage; exit 2; }
[[ "$MODE" == "--loop" || "$MAX_CYCLES" == 1 ]] || { echo "--max-cycles > 1 exige --loop"; exit 2; }

QUEUE="docs/governance/AUTONOMY-QUEUE.md"; HANDOFF="docs/governance/AUTONOMY-HANDOFF.md"; LOG="docs/governance/AUTONOMY-LOG.md"
DEFAULT_STATE_DIR="$ROOT_DIR/.codex-local/autonomy"
STATE_DIR="${CODEX_AUTOPILOT_STATE_DIR:-$DEFAULT_STATE_DIR}"
LOCK_DIR="$STATE_DIR/autopilot.lock"; STOP_FILE="$STATE_DIR/STOP_AUTONOMY"
SENSITIVE_PATH_GUARD="$ROOT_DIR/scripts/git-sensitive-paths.py"
MEMORY_SCRIPT="$ROOT_DIR/scripts/codex/conversation_memory.py"

preflight() {
  [[ "$(git branch --show-current)" != "main" ]] || { echo "Gate: execução na main"; return "$EXIT_HUMAN"; }
  [[ -z "$(git status --porcelain)" ]] || { echo "Preflight: árvore Git não está limpa"; return "$EXIT_PREFLIGHT"; }
  [[ -f "$QUEUE" && -f "$HANDOFF" && -f "$LOG" ]] || { echo "Preflight: documentos de autonomia ausentes"; return "$EXIT_PREFLIGHT"; }
  [[ -f "$SENSITIVE_PATH_GUARD" ]] || { echo "Preflight: guard de caminhos sensíveis ausente"; return "$EXIT_PREFLIGHT"; }
  [[ -f "$MEMORY_SCRIPT" ]] || { echo "Preflight: primitivas de memória local ausentes"; return "$EXIT_PREFLIGHT"; }
  [[ ! -e "$STOP_FILE" ]] || { echo "Preflight: sentinela STOP_AUTONOMY encontrada"; return "$EXIT_PREFLIGHT"; }
  python3 "$SENSITIVE_PATH_GUARD" head || return "$EXIT_HUMAN"
  python3 "$SENSITIVE_PATH_GUARD" preflight || return "$EXIT_HUMAN"
  python3 "$SENSITIVE_PATH_GUARD" staged || return "$EXIT_HUMAN"
  python3 "$MEMORY_SCRIPT" prepare >/dev/null || return "$EXIT_PREFLIGHT"
  if [[ "$MODE" != "--dry-run" ]]; then
    command -v codex >/dev/null 2>&1 || { echo "Preflight: Codex CLI indisponível"; return "$EXIT_PREFLIGHT"; }
  fi
}

next_package() { awk -F '|' -v attempted="$ATTEMPTED" '/^\| A[0-9]+ / { gsub(/^[[:space:]]+|[[:space:]]+$/, "", $5); gsub(/^[[:space:]]+|[[:space:]]+$/, "", $2); if ($5 == "ready" && index(" " attempted " ", " " $2 " ") == 0) { gsub(/^[[:space:]]+|[[:space:]]+$/, "", $4); print $2 "|" $4; exit } }' "$QUEUE"; }
validation_contract() {
  case "$1" in
    documental) printf '%s' 'Execute Prettier direcionado, git diff --check e verificações documentais previstas. Execute npm test e lint somente se o contrato do pacote os exigir. Não execute build nem check global.' ;;
    codigo) printf '%s' 'Execute testes direcionados, npm test e lint conforme o contrato. Build só é permitido por mecanismo previamente comprovado como isolado de arquivos secretos; caso seja obrigatório e não exista esse mecanismo, termine validation-blocked.' ;;
    codigo-build-obrigatorio) printf '%s' 'Build obrigatório sem mecanismo isolado comprovado: o controlador bloqueará este pacote antes de chamar o agente.' ;;
    auditoria-leitura) printf '%s' 'Execute somente comandos de inspeção previstos no contrato. Não altere estado externo, não escreva em banco ou HML e não execute build.' ;;
    *) return 1 ;;
  esac
}
result_code() {
  case "$1" in done) return 0;; blocked) return "$EXIT_BLOCKED";; validation-failed|validation-blocked) return "$EXIT_VALIDATION";; limit) return "$EXIT_LIMIT";; needs-human) return "$EXIT_HUMAN";; *) return "$EXIT_BLOCKED";; esac
}
append_log() { printf '| %s | %s | %s | %s | ver JSONL local | %s |\n' "$(date -u +%F)" "$1" "$2" "$3" "$4" >> "$LOG"; }
checkpoint_done() {
  python3 "$SENSITIVE_PATH_GUARD" preflight || return "$EXIT_HUMAN"
  python3 "$SENSITIVE_PATH_GUARD" staged || return "$EXIT_HUMAN"
  git diff --check || return "$EXIT_VALIDATION"
  git add --all
  python3 "$SENSITIVE_PATH_GUARD" staged || return "$EXIT_HUMAN"
  git commit -m "chore(autonomy): complete $PACKAGE"
}

continue_after_gate() {
  [[ "$MODE" == "--loop" && "$CLEAN_BEFORE_LOG" == yes ]] || return 1
  case "$RESULT" in blocked|needs-human|validation-blocked) ;; *) return 1 ;; esac
  python3 "$SENSITIVE_PATH_GUARD" preflight || exit "$EXIT_HUMAN"
  python3 "$SENSITIVE_PATH_GUARD" staged || exit "$EXIT_HUMAN"
  git diff --check || exit "$EXIT_VALIDATION"
  # Only the controller's sanitized evidence is committed after a clean gate.
  git add -- "$LOG"
  python3 "$SENSITIVE_PATH_GUARD" staged || exit "$EXIT_HUMAN"
  git commit -m "chore(autonomy): record $RESULT for $PACKAGE" --only -- "$LOG" || exit "$EXIT_VALIDATION"
  if result_code "$RESULT"; then gate_exit=0; else gate_exit=$?; fi
  if [[ "$gate_exit" -gt "$DEFERRED_EXIT" ]]; then DEFERRED_EXIT="$gate_exit"; fi
  echo "Gate registrado para $PACKAGE; buscando outro pacote exatamente ready"
}

preflight
if [[ "$STATE_DIR" == "$DEFAULT_STATE_DIR" ]]; then
  [[ -d "$STATE_DIR" && ! -L "$STATE_DIR" ]] || { echo "Preflight: diretório local de autonomia inválido"; exit "$EXIT_PREFLIGHT"; }
else
  [[ "$STATE_DIR" == "$ROOT_DIR/"* && ! -L "$STATE_DIR" ]] || { echo "Preflight: override de estado inválido"; exit "$EXIT_PREFLIGHT"; }
  mkdir -p "$STATE_DIR"
fi
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  if [[ -d "$LOCK_DIR" ]]; then
    echo "Preflight: controlador já está em execução"
  else
    echo "Preflight: não foi possível criar a trava do controlador"
  fi
  exit "$EXIT_PREFLIGHT"
fi
trap 'rmdir "$LOCK_DIR"' EXIT

for ((cycle=1; cycle<=MAX_CYCLES; cycle++)); do
  preflight
  [[ ! -e "$STOP_FILE" ]] || { echo "Preflight: sentinela STOP_AUTONOMY encontrada"; exit "$EXIT_PREFLIGHT"; }
  PACKAGE_INFO="$(next_package)"
  if [[ -z "$PACKAGE_INFO" ]]; then
    echo "Nenhum pacote exatamente ready ainda não tentado"
    if [[ "$DEFERRED_EXIT" -ne 0 ]]; then exit "$DEFERRED_EXIT"; fi
    if [[ "$COMPLETED" -gt 0 ]]; then exit 0; fi
    exit "$EXIT_BLOCKED"
  fi
  IFS='|' read -r PACKAGE PACKAGE_TYPE <<< "$PACKAGE_INFO"
  ATTEMPTED="$ATTEMPTED $PACKAGE"
  VALIDATION_CONTRACT="$(validation_contract "$PACKAGE_TYPE")" || { echo "Preflight: tipo de pacote inválido: $PACKAGE_TYPE"; exit "$EXIT_PREFLIGHT"; }
  echo "Pacote selecionado: $PACKAGE ($PACKAGE_TYPE)"
  if [[ "$MODE" == "--dry-run" ]]; then exit 0; fi
  if [[ "$PACKAGE_TYPE" == "codigo-build-obrigatorio" ]]; then
    CLEAN_BEFORE_LOG=yes
    RESULT=validation-blocked
    append_log "$cycle" "$PACKAGE" "validation-blocked" "build obrigatório sem mecanismo isolado comprovado"
    echo "Validação bloqueada: build obrigatório sem mecanismo isolado comprovado"
    if continue_after_gate; then continue; fi
    exit "$EXIT_VALIDATION"
  fi
  RAW="$STATE_DIR/$(date -u +%Y%m%dT%H%M%SZ)-${PACKAGE}.jsonl"
  FINAL="${RAW%.jsonl}.final.txt"
  PROMPT="Leia AGENTS.md e os documentos canônicos. Execute exatamente o pacote $PACKAGE ($PACKAGE_TYPE) da AUTONOMY-QUEUE.md conforme AUTONOMY-RUNBOOK.md. Contrato de validação: $VALIDATION_CONTRACT Não ultrapasse gates, não acesse arquivos secretos, não faça rede/escrita externa, não use DESLIGARTUDO. Congele escopo no handoff, valide e revise o diff. Não crie commit: o controlador cria o único checkpoint local após resultado done. Termine com AUTONOMY_RESULT: done|blocked|validation-failed|validation-blocked|needs-human|limit."
  set +e
  if command -v timeout >/dev/null 2>&1; then timeout "$CYCLE_TIMEOUT" codex exec --ephemeral --approve-for-me --json --output-last-message "$FINAL" "$PROMPT" | tee "$RAW"; else codex exec --ephemeral --approve-for-me --json --output-last-message "$FINAL" "$PROMPT" | tee "$RAW"; fi
  AGENT_EXIT=${PIPESTATUS[0]}
  set -e
  [[ "$AGENT_EXIT" -eq 0 ]] || { append_log "$cycle" "$PACKAGE" "validation-failed" "Codex CLI saiu com $AGENT_EXIT"; exit "$EXIT_VALIDATION"; }
  RESULT=""
  if [[ -f "$FINAL" && ! -L "$FINAL" ]]; then
    RESULT="$(tail -n 1 "$FINAL" | sed -nE 's/^AUTONOMY_RESULT: (done|blocked|validation-failed|validation-blocked|needs-human|limit)$/\1/p')"
  fi
  [[ -n "$RESULT" ]] || RESULT="blocked"
  CLEAN_BEFORE_LOG=no
  if [[ -z "$(git status --porcelain)" ]]; then CLEAN_BEFORE_LOG=yes; fi
  append_log "$cycle" "$PACKAGE" "$RESULT" "resultado do agente"
  if [[ "$RESULT" == "done" ]]; then
    checkpoint_done || exit $?
    COMPLETED=$((COMPLETED + 1))
  elif continue_after_gate; then
    continue
  fi
  result_code "$RESULT" || exit $?
done
exit "$DEFERRED_EXIT"
