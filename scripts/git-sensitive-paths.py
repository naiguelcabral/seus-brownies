#!/usr/bin/env python3
"""Reject sensitive Git paths without opening their contents (NUL-safe)."""

from __future__ import annotations

import subprocess
import sys
from pathlib import PurePosixPath


def sensitive(path: str) -> bool:
    # Only this reviewed root template is exempt; *.env.*.example stays blocked.
    if path == ".env.example":
        return False
    parts = PurePosixPath(path).parts
    name = parts[-1].lower()
    return (
        any(
            part.lower() in {".codex", ".codex-local", ".neon", ".wrangler", ".ssh"}
            for part in parts
        )
        or name.startswith((".env", ".dev.vars"))
        or name
        in {".npmrc", ".netrc", "credentials", "credentials.json", "id_rsa", "id_ed25519"}
        or name.endswith((".pem", ".key", ".p12", ".pfx"))
    )


def git_paths(mode: str) -> list[str]:
    if mode == "head":
        args = ["ls-tree", "-rz", "--name-only", "HEAD"]
    elif mode == "staged":
        args = ["diff", "--cached", "--name-only", "--diff-filter=ACMRT", "-z"]
    elif mode == "preflight":
        args = ["ls-files", "--cached", "--others", "--exclude-standard", "-z"]
    else:
        raise ValueError("modo de validação inválido")
    output = subprocess.check_output(["git", *args])
    return output.decode("utf-8", "surrogateescape").split("\0")


def main() -> int:
    mode = sys.argv[1] if len(sys.argv) > 1 else "preflight"
    if any(sensitive(path) for path in git_paths(mode) if path):
        # A filename can itself be private; never echo the rejected path.
        print("ERRO: caminho sensível detectado; operação Git bloqueada.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
