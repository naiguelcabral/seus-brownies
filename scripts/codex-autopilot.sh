#!/usr/bin/env bash

# Controlador deliberadamente conservador: um pacote pronto por ciclo.
set -euo pipefail

ROOT_DIR="${CODEX_AUTOPILOT_ROOT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$ROOT_DIR"

readonly EXIT_BLOCKED=20 EXIT_VALIDATION=21 EXIT_LIMIT=22 EXIT_HUMAN=23 EXIT_PREFLIGHT=24
MODE=""; MAX_CYCLES=1; CYCLE_TIMEOUT=900

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
STATE_DIR="${CODEX_AUTOPILOT_STATE_DIR:-$ROOT_DIR/.codex-local/autonomy}"
LOCK_DIR="$STATE_DIR/autopilot.lock"; STOP_FILE="$ROOT_DIR/.codex/STOP_AUTONOMY"

preflight() {
  [[ "$(git branch --show-current)" != "main" ]] || { echo "Gate: execução na main"; return "$EXIT_HUMAN"; }
  [[ -z "$(git status --porcelain)" ]] || { echo "Preflight: árvore Git não está limpa"; return "$EXIT_PREFLIGHT"; }
  [[ -f "$QUEUE" && -f "$HANDOFF" && -f "$LOG" ]] || { echo "Preflight: documentos de autonomia ausentes"; return "$EXIT_PREFLIGHT"; }
  [[ ! -e "$STOP_FILE" ]] || { echo "Preflight: sentinela STOP_AUTONOMY encontrada"; return "$EXIT_PREFLIGHT"; }
  has_sensitive_env_tracked && { echo "Gate: arquivo .env sensível rastreado"; return "$EXIT_HUMAN"; }
  command -v codex >/dev/null 2>&1 || { echo "Preflight: Codex CLI indisponível"; return "$EXIT_PREFLIGHT"; }
}

has_sensitive_env_tracked() {
  git ls-files | grep -E '(^|/)\.env($|\.)' | grep -Ev '(^|/)\.env\.example$' | grep -q .
}

has_sensitive_env_untracked() {
  git ls-files --others --exclude-standard | grep -E '(^|/)\.env($|\.)' | grep -Ev '(^|/)\.env\.example$' | grep -q .
}

next_package() { awk -F '|' '/^\| A[0-9]+ / { gsub(/^[[:space:]]+|[[:space:]]+$/, "", $4); if ($4 == "ready") { gsub(/^[[:space:]]+|[[:space:]]+$/, "", $2); print $2; exit } }' "$QUEUE"; }
result_code() {
  case "$1" in done) return 0;; blocked) return "$EXIT_BLOCKED";; validation-failed) return "$EXIT_VALIDATION";; limit) return "$EXIT_LIMIT";; needs-human) return "$EXIT_HUMAN";; *) return "$EXIT_BLOCKED";; esac
}
append_log() { printf '| %s | %s | %s | %s | ver JSONL local | %s |\n' "$(date -u +%F)" "$1" "$2" "$3" "$4" >> "$LOG"; }
checkpoint_done() {
  has_sensitive_env_untracked && { echo "Gate: .env não rastreado criado durante o ciclo"; return "$EXIT_HUMAN"; }
  git diff --check || return "$EXIT_VALIDATION"
  git add --all
  git commit -m "chore(autonomy): complete $PACKAGE"
}

preflight
mkdir -p "$STATE_DIR"
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
  PACKAGE="$(next_package)"
  [[ -n "$PACKAGE" ]] || { echo "Nenhum pacote exatamente ready"; exit "$EXIT_BLOCKED"; }
  echo "Pacote selecionado: $PACKAGE"
  if [[ "$MODE" == "--dry-run" ]]; then exit 0; fi
  RAW="$STATE_DIR/$(date -u +%Y%m%dT%H%M%SZ)-${PACKAGE}.jsonl"
  PROMPT="Leia AGENTS.md e os documentos canônicos. Execute exatamente o pacote $PACKAGE da AUTONOMY-QUEUE.md conforme AUTONOMY-RUNBOOK.md. Não ultrapasse gates, não leia .env, não faça rede/escrita externa, não use DESLIGARTUDO. Congele escopo no handoff, valide e revise o diff. Não crie commit: o controlador cria o único checkpoint local após resultado done. Termine com AUTONOMY_RESULT: done|blocked|validation-failed|needs-human|limit."
  set +e
  if command -v timeout >/dev/null 2>&1; then timeout "$CYCLE_TIMEOUT" codex exec --ephemeral --approve-for-me --json "$PROMPT" | tee "$RAW"; else codex exec --ephemeral --approve-for-me --json "$PROMPT" | tee "$RAW"; fi
  AGENT_EXIT=${PIPESTATUS[0]}
  set -e
  [[ "$AGENT_EXIT" -eq 0 ]] || { append_log "$cycle" "$PACKAGE" "validation-failed" "Codex CLI saiu com $AGENT_EXIT"; exit "$EXIT_VALIDATION"; }
  RESULT="$(grep -Eo 'AUTONOMY_RESULT: (done|blocked|validation-failed|needs-human|limit)' "$RAW" | tail -1 | sed 's/AUTONOMY_RESULT: //')"
  [[ -n "$RESULT" ]] || RESULT="blocked"
  append_log "$cycle" "$PACKAGE" "$RESULT" "resultado do agente"
  if [[ "$RESULT" == "done" ]]; then checkpoint_done || exit $?; fi
  result_code "$RESULT" || exit $?
done
