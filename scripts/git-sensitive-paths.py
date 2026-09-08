#!/usr/bin/env python3
"""Reject sensitive Git paths without opening their contents (NUL-safe)."""

import subprocess
import sys
from pathlib import PurePosixPath


def sensitive(path: str) -> bool:
    # Only this reviewed, sanitized example is an exception, not every *.example.
    if path == ".env.example":
        return False
    parts = PurePosixPath(path).parts
    name = parts[-1].lower()
    return (
        any(part.lower() in {".codex", ".codex-local", ".neon", ".wrangler", ".ssh"} for part in parts)
        or name.startswith((".env", ".dev.vars"))
        or name in {".npmrc", ".netrc", "credentials", "credentials.json", "id_rsa", "id_ed25519"}
        or name.endswith((".pem", ".key", ".p12", ".pfx"))
    )


def main() -> int:
    mode = sys.argv[1] if len(sys.argv) > 1 else "preflight"
    if mode == "head":
        args = ["ls-tree", "-rz", "--name-only", "HEAD"]
    elif mode == "staged":
        args = ["diff", "--cached", "--name-only", "--diff-filter=ACMRT", "-z"]
    elif mode == "preflight":
        args = ["ls-files", "--cached", "--others", "--exclude-standard", "-z"]
    else:
        raise ValueError("invalid validation mode")
    paths = subprocess.check_output(["git", *args]).decode("utf-8", "surrogateescape").split("\0")
    if any(sensitive(path) for path in paths if path):
        # Do not log even the filename: it can itself contain private data.
        print("ERRO: caminho sensível detectado; operação Git/build bloqueada.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
