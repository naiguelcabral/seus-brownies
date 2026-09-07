#!/usr/bin/env python3

"""Registra conversas locais do Codex e prepara contexto para retomada."""

from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

LOCAL_DIR_NAME = ".codex-local"
MAX_MEMORY_CHARS = 60_000

SENSITIVE_ASSIGNMENT = re.compile(
    r"(?i)(\b(?:authorization|cookie|database_url|api[_-]?key|secret|senha|password|token)\b\s*[:=]\s*)([^\s,;]+)"
)
KNOWN_TOKEN = re.compile(
    r"(?i)\b(?:sk-[a-z0-9_-]{16,}|gh[pousr]_[a-z0-9]{20,}|bearer\s+[a-z0-9._~+/-]{16,})\b"
)
URL_CREDENTIAL = re.compile(r"(?i)(https?://[^\s:/]+:)([^@\s]+)(@)")


def redact(text: str) -> str:
    text = SENSITIVE_ASSIGNMENT.sub(r"\1[REDACTED]", text)
    text = KNOWN_TOKEN.sub("[REDACTED]", text)
    return URL_CREDENTIAL.sub(r"\1[REDACTED]\3", text)


def readable(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list):
        return "\n\n".join(filter(None, (readable(item) for item in value)))
    if isinstance(value, dict):
        for key in ("text", "content", "message", "prompt"):
            if key in value:
                candidate = readable(value[key])
                if candidate:
                    return candidate
        return json.dumps(value, ensure_ascii=False, indent=2)
    return str(value).strip()


def find_root(start: str | Path | None = None) -> Path:
    candidates = []
    if start:
        candidates.append(Path(start).resolve())
    candidates.append(Path(__file__).resolve().parent)

    for initial in candidates:
        for current in (initial, *initial.parents):
            if (current / ".git").exists() and (current / "AGENTS.md").exists():
                return current
    raise RuntimeError("raiz Git do projeto não encontrada")


def safe_id(value: Any) -> str:
    return re.sub(r"[^a-zA-Z0-9_-]", "-", str(value or "sem-id"))[:80]


def now_label() -> str:
    return datetime.now().astimezone().strftime("%d/%m/%Y %H:%M:%S %Z")


def local_paths(root: Path) -> tuple[Path, Path, Path]:
    local_dir = root / LOCAL_DIR_NAME
    conversations = local_dir / "conversations"
    memory = local_dir / "MEMORY.md"
    conversations.mkdir(parents=True, exist_ok=True)
    try:
        local_dir.chmod(0o700)
    except OSError:
        pass
    return local_dir, conversations, memory


def refresh_memory(transcript: Path, memory: Path) -> None:
    content = transcript.read_text(encoding="utf-8")
    tail = content[-MAX_MEMORY_CHARS:]
    header = (
        "# Memória operacional local do Codex\n\n"
        "> Contexto auxiliar e não canônico. Confirme o estado real no Git, em "
        "`AGENTS.md` e em `docs/governance/` antes de agir.\n\n"
        f"- Fonte: `{transcript.name}`\n"
        f"- Atualizada: `{now_label()}`\n\n"
        "---\n\n"
    )
    memory.write_text(header + tail, encoding="utf-8")
    try:
        memory.chmod(0o600)
    except OSError:
        pass


def notify(raw_event: str) -> int:
    event = json.loads(raw_event)
    if event.get("type") != "agent-turn-complete":
        return 0

    root = find_root(event.get("cwd"))
    local_dir, conversations, memory = local_paths(root)
    thread_id = safe_id(event.get("thread-id") or event.get("thread_id"))
    transcript = conversations / f"{thread_id}.md"
    user_text = redact(readable(event.get("input-messages") or event.get("input_messages")))
    assistant_text = redact(
        readable(event.get("last-assistant-message") or event.get("last_assistant_message"))
    )

    if not user_text and not assistant_text:
        return 0

    if not transcript.exists():
        transcript.write_text(
            "# Conversa local do Codex\n\n"
            f"- Sessão: `{thread_id}`\n"
            f"- Projeto: `{root}`\n"
            f"- Iniciada: `{now_label()}`\n\n---\n\n",
            encoding="utf-8",
        )

    with transcript.open("a", encoding="utf-8") as destination:
        if user_text:
            destination.write(f"## Usuário — {now_label()}\n\n{user_text}\n\n")
        if assistant_text:
            destination.write(f"## Codex — {now_label()}\n\n{assistant_text}\n\n")
        destination.write("---\n\n")

    try:
        transcript.chmod(0o600)
    except OSError:
        pass

    (local_dir / "active-thread").write_text(thread_id + "\n", encoding="utf-8")
    refresh_memory(transcript, memory)
    return 0


def active_transcript(root: Path) -> Path | None:
    local_dir, conversations, _ = local_paths(root)
    marker = local_dir / "active-thread"
    if marker.exists():
        candidate = conversations / f"{safe_id(marker.read_text(encoding='utf-8').strip())}.md"
        if candidate.exists():
            return candidate
    transcripts = sorted(conversations.glob("*.md"), key=lambda item: item.stat().st_mtime)
    return transcripts[-1] if transcripts else None


def prepare() -> int:
    root = find_root(Path.cwd())
    _, _, memory = local_paths(root)
    transcript = active_transcript(root)
    if transcript:
        refresh_memory(transcript, memory)
        print(f"✓ Memória local preparada: {memory.relative_to(root)}")
    else:
        print("ℹ Nenhuma conversa local anterior foi encontrada; início sem memória auxiliar.")
    return 0


def finalize() -> int:
    root = find_root(Path.cwd())
    _, _, memory = local_paths(root)
    transcript = active_transcript(root)
    if not transcript:
        print("ℹ Nenhuma conversa local do Codex para finalizar.")
        return 0
    with transcript.open("a", encoding="utf-8") as destination:
        destination.write(f"## Encerramento local — {now_label()}\n\nSessão preparada para retomada.\n\n---\n\n")
    refresh_memory(transcript, memory)
    print(f"✓ Conversa e memória locais atualizadas em {LOCAL_DIR_NAME}/")
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
