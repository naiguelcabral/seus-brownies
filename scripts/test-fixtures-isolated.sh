#!/usr/bin/env bash
set -euo pipefail
umask 077

repository_root=$(git rev-parse --show-toplevel)
if [[ -n "$(git -C "$repository_root" status --porcelain)" ]]; then
  echo 'Ensaios isolados exigem árvore limpa e HEAD versionado.' >&2
  exit 1
fi
[[ -d "$repository_root/node_modules" ]] || { echo 'Execute npm ci antes.' >&2; exit 1; }
browser_path=${CACAU_SMOKE_BROWSER_PATH:-}
if [[ -n "$browser_path" && ! -x "$browser_path" ]]; then
  echo 'Browser explícito não é executável.' >&2
  exit 1
fi
python3 "$repository_root/scripts/git-sensitive-paths.py" head
if git -C "$repository_root" ls-tree -r HEAD | grep -q '^120000 '; then
  echo 'Ensaios isolados não aceitam symlinks nas fontes.' >&2
  exit 1
fi
temporary_directory=$(mktemp -d "${TMPDIR:-/tmp}/cacau-fixtures.XXXXXX")
cleanup() { rm -rf "$temporary_directory"; }
trap cleanup EXIT
git -C "$repository_root" archive --format=tar HEAD | tar -x -C "$temporary_directory"
ln -s "$repository_root/node_modules" "$temporary_directory/node_modules"
mkdir -p "$temporary_directory/home" "$temporary_directory/config"
(
  cd "$temporary_directory"
  env -i \
    PATH="$PATH" \
    HOME="$temporary_directory/home" \
    XDG_CONFIG_HOME="$temporary_directory/config" \
    TMPDIR="${TMPDIR:-/tmp}" \
    PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-}" \
    CACAU_SMOKE_BROWSER_PATH="$browser_path" \
    CACAU_FIXTURE_E2E_ISOLATED=1 \
    node node_modules/@playwright/test/cli.js test --config playwright.isolated-fixtures.config.ts
)
