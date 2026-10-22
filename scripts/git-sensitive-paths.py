#!/usr/bin/env python3
"""Reject sensitive Git paths without opening their contents (NUL-safe).

The reviewed `.env.example` template is the only file whose contents are read,
to make sure it still holds placeholders instead of real credentials.
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path, PurePosixPath

ENV_EXAMPLE = ".env.example"
# Neon password/API key shapes; never legitimate in any versioned file.
NEON_TOKEN = r"npg_[A-Za-z0-9]{8,}|napi_[A-Za-z0-9]{20,}"
# Neon passwords/API keys, and any URL password that is not an uppercase placeholder.
REAL_CREDENTIAL = re.compile(
    r"\bnpg_[A-Za-z0-9]{6,}|\bnapi_[A-Za-z0-9]{20,}"
    r"|[a-z][a-z0-9+.-]*://[^\s:/@]+:(?![A-Z_-]+@)[^\s@]+@"
)


def sensitive(path: str) -> bool:
    # Only this reviewed root template is exempt; *.env.*.example stays blocked.
    if path == ".env.example":
        return False
    parts = PurePosixPath(path).parts
    name = parts[-1].lower()
    return (
        any(
            part.lower() in {".codex", ".codex-local", ".neon", ".wrangler", ".ssh", "backups-local"}
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


def env_example_text(mode: str) -> str:
    if mode == "preflight":
        path = Path(ENV_EXAMPLE)
        return path.read_text("utf-8", "surrogateescape") if path.is_file() else ""
    spec = f"HEAD:{ENV_EXAMPLE}" if mode == "head" else f":{ENV_EXAMPLE}"
    result = subprocess.run(["git", "show", spec], capture_output=True)
    return result.stdout.decode("utf-8", "surrogateescape") if result.returncode == 0 else ""


def has_neon_token(mode: str) -> bool:
    options, revisions = {
        "head": ([], ["HEAD"]),
        "staged": (["--cached"], []),
        "preflight": (["--untracked"], []),
    }[mode]
    result = subprocess.run(
        ["git", "grep", "-qIE", *options, "-e", NEON_TOKEN, *revisions],
        capture_output=True,
    )
    # 0 = match, 1 = no match; anything else is a grep failure and must block.
    if result.returncode not in (0, 1):
        raise SystemExit("ERRO: não foi possível verificar credenciais Neon.")
    return result.returncode == 0


def main() -> int:
    mode = sys.argv[1] if len(sys.argv) > 1 else "preflight"
    paths = [path for path in git_paths(mode) if path]
    if any(sensitive(path) for path in paths):
        # A filename can itself be private; never echo the rejected path.
        print("ERRO: caminho sensível detectado; operação Git bloqueada.", file=sys.stderr)
        return 1
    if ENV_EXAMPLE in paths and REAL_CREDENTIAL.search(env_example_text(mode)):
        # Never echo the matched value.
        print("ERRO: .env.example contém credencial real; use apenas placeholders.", file=sys.stderr)
        return 1
    if has_neon_token(mode):
        print("ERRO: credencial Neon detectada em arquivo versionado; operação Git bloqueada.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
