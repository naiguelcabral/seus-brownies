#!/usr/bin/env python3

"""Registra conversas locais e prepara contexto sanitizado para retomada."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

ROOT_DIR = Path(__file__).resolve().parents[2]
LOCAL_CODEX_DIR = ROOT_DIR / ".codex-local"
MAX_MEMORY_CHARS = 60_000

SENSITIVE_ASSIGNMENT = re.compile(
    r"(?i)(\b(?:authorization|cookie|database_url|api[_-]?key|secret|senha|password|token|cloudflare[_-]?token|neon(?:[_-]?(?:url|credential|token))?)\b\s*[:=]\s*)([^\s,;]+)"
)
KNOWN_TOKEN = re.compile(r"(?i)\b(?:sk-[a-z0-9_-]{16,}|gh[pousr]_[a-z0-9]{20,}|cf[a-z0-9_-]{20,}|bearer\s+[a-z0-9._~+/-]{16,})\b")
URL_CREDENTIAL = re.compile(r"(?i)(https?://[^\s:/]+:)([^@\s]+)(@)")
PRIVATE_KEY = re.compile(r"(?is)-----BEGIN [A-Z ]*PRIVATE KEY-----.*?-----END [A-Z ]*PRIVATE KEY-----")


def redact(text: str) -> str:
    text = SENSITIVE_ASSIGNMENT.sub(r"\1[REDACTED]", text)
    text = KNOWN_TOKEN.sub("[REDACTED]", text)
    text = URL_CREDENTIAL.sub(r"\1[REDACTED]\3", text)
    return PRIVATE_KEY.sub("[REDACTED PRIVATE KEY]", text)


def readable(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list):
        return "\n\n".join(filter(None, (readable(item) for item in value)))
    if isinstance(value, dict):
        for key in ("text", "content", "message", "prompt"):
            candidate = readable(value.get(key))
            if candidate:
                return candidate
        return json.dumps(value, ensure_ascii=False, indent=2)
    return str(value).strip()


def find_root(start: str | Path | None = None) -> Path:
    candidates = [Path(start).resolve()] if start else []
    candidates.append(ROOT_DIR)
    for initial in candidates:
        for current in (initial, *initial.parents):
            if (current / ".git").exists() and (current / "AGENTS.md").exists():
                return current
    raise RuntimeError("raiz Git do projeto não encontrada")


def safe_id(value: Any) -> str:
    return re.sub(r"[^a-zA-Z0-9_-]", "-", str(value or "sem-id"))[:80]


def now_label() -> str:
    return datetime.now().astimezone().strftime("%d/%m/%Y %H:%M:%S %Z")


def local_paths(root: Path) -> dict[str, Path]:
    base = LOCAL_CODEX_DIR if root.resolve() == ROOT_DIR.resolve() else root / ".codex-local"
    paths = {
        "base": base, "context": base / "context", "sessions": base / "context" / "sessions",
        "conversations": base / "conversations", "history": base / "history", "state": base / "state",
        "terminal_raw": base / "terminal" / "raw", "terminal_sessions": base / "terminal" / "sessions",
        "backups": base / "backups",
    }
    for directory in paths.values():
        directory.mkdir(parents=True, exist_ok=True)
    try:
        base.chmod(0o700)
    except OSError:
        pass
    return paths


def git_output(root: Path, *args: str) -> str:
    try:
        result = subprocess.run(["git", *args], cwd=root, capture_output=True, text=True, check=False)
    except OSError:
        return ""
    return redact(result.stdout.strip())


def active_transcript(paths: dict[str, Path]) -> Path | None:
    marker = paths["state"] / "active-thread"
    if marker.exists():
        candidate = paths["conversations"] / f"{safe_id(marker.read_text(encoding='utf-8').strip())}.md"
        if candidate.exists():
            return candidate
    transcripts = sorted(paths["conversations"].glob("*.md"), key=lambda item: item.stat().st_mtime)
    return transcripts[-1] if transcripts else None


def refresh_context(root: Path, paths: dict[str, Path], transcript: Path) -> None:
    context = paths["context"] / "CURRENT-CONTEXT.md"
    content = redact(transcript.read_text(encoding="utf-8"))[-MAX_MEMORY_CHARS:]
    context.write_text(
        "# Contexto atual\n\n"
        f"## Data\n\n{now_label()}\n\n## Branch\n\n{git_output(root, 'branch', '--show-current') or 'Não disponível'}\n\n"
        f"## Último commit\n\n{git_output(root, 'log', '-1', '--format=%h %s') or 'Não disponível'}\n\n"
        f"## Estado atual\n\n{git_output(root, 'status', '--short') or 'Sem alterações pendentes.'}\n\n"
        "## Concluído nesta sessão\n\nNão consolidado automaticamente. Consulte a conversa de origem.\n\n"
        "## Arquivos relevantes\n\nNão consolidado automaticamente.\n\n## Testes executados\n\nNão consolidado automaticamente.\n\n"
        "## Pendências\n\nNão consolidado automaticamente.\n\n"
        "## Próxima ação recomendada\n\nLeia a conversa de origem e confirme o estado no Git.\n\n"
        f"## Sessão de origem\n\n`{transcript.relative_to(paths['base'])}`\n\n---\n\n## Trecho sanitizado da conversa\n\n{content}\n",
        encoding="utf-8",
    )
    context.chmod(0o600)
    index = paths["context"] / "CONTEXT-INDEX.md"
    if not index.exists():
        index.write_text("# Índice de contextos locais\n\n", encoding="utf-8")
    with index.open("a", encoding="utf-8") as destination:
        destination.write(f"- {now_label()} — `{transcript.relative_to(paths['base'])}`\n")
    index.chmod(0o600)


def capture_state(root: Path, paths: dict[str, Path]) -> Path:
    stamp = datetime.now().astimezone().strftime("%Y-%m-%d_%H%M%S")
    snapshot = paths["history"] / f"{stamp}-git-state.md"
    snapshot.write_text(
        "# Estado local de encerramento\n\n"
        f"## Data\n\n{now_label()}\n\n## Branch\n\n{git_output(root, 'branch', '--show-current')}\n\n"
        f"## Último commit\n\n{git_output(root, 'log', '-1', '--format=%h %s')}\n\n"
        f"## Commits recentes\n\n{git_output(root, 'log', '-5', '--oneline')}\n\n"
        f"## Git status\n\n{git_output(root, 'status', '--short') or 'Sem alterações pendentes.'}\n\n"
        f"## Alterações pendentes (estatística)\n\n{git_output(root, 'diff', '--stat')}\n",
        encoding="utf-8",
    )
    snapshot.chmod(0o600)
    return snapshot


def notify(raw_event: str) -> int:
    event = json.loads(raw_event)
    if event.get("type") != "agent-turn-complete":
        return 0
    root = find_root(event.get("cwd"))
    paths = local_paths(root)
    thread_id = safe_id(event.get("thread-id") or event.get("thread_id"))
    transcript = paths["conversations"] / f"{thread_id}.md"
    user_text = redact(readable(event.get("input-messages") or event.get("input_messages")))
    assistant_text = redact(readable(event.get("last-assistant-message") or event.get("last_assistant_message")))
    if not user_text and not assistant_text:
        return 0
    if not transcript.exists():
        transcript.write_text(f"# Conversa local do Codex\n\n- Sessão: `{thread_id}`\n- Projeto: `{root}`\n- Iniciada: `{now_label()}`\n\n---\n\n", encoding="utf-8")
    with transcript.open("a", encoding="utf-8") as destination:
        if user_text:
            destination.write(f"## Usuário — {now_label()}\n\n{user_text}\n\n")
        if assistant_text:
            destination.write(f"## Codex — {now_label()}\n\n{assistant_text}\n\n")
        destination.write("---\n\n")
    transcript.chmod(0o600)
    (paths["state"] / "active-thread").write_text(thread_id + "\n", encoding="utf-8")
    refresh_context(root, paths, transcript)
    return 0


def prepare() -> int:
    root = find_root(Path.cwd())
    paths = local_paths(root)
    transcript = active_transcript(paths)
    if transcript:
        refresh_context(root, paths, transcript)
        print(f"✓ Contexto local preparado: {(paths['context'] / 'CURRENT-CONTEXT.md').relative_to(root)}")
    else:
        print("ℹ Nenhuma conversa local anterior foi encontrada; início sem contexto auxiliar.")
    return 0


def finalize() -> int:
    root = find_root(Path.cwd())
    paths = local_paths(root)
    snapshot = capture_state(root, paths)
    transcript = active_transcript(paths)
    if transcript:
        with transcript.open("a", encoding="utf-8") as destination:
            destination.write(f"## Encerramento local — {now_label()}\n\nSessão preparada para retomada.\n\n---\n\n")
        refresh_context(root, paths, transcript)
    print(f"✓ Estado local salvo em {snapshot.relative_to(root)}")
    return 0


def main() -> int:
    try:
        mode = sys.argv[1] if len(sys.argv) > 1 else "prepare"
        if mode == "notify":
            if len(sys.argv) < 3:
                raise ValueError("evento JSON do Codex não recebido")
            return notify(sys.argv[2])
        if mode == "prepare":
            return prepare()
        if mode == "finalize":
            return finalize()
        raise ValueError(f"modo desconhecido: {mode}")
    except (OSError, RuntimeError, ValueError, json.JSONDecodeError) as error:
        print(f"Aviso: memória local do Codex não foi atualizada: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
