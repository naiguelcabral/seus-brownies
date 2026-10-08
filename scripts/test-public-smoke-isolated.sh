#!/usr/bin/env bash
set -euo pipefail
umask 077

repository_root=$(git rev-parse --show-toplevel)
if [[ -n "$(git -C "$repository_root" status --porcelain)" ]]; then
  echo 'Smoke isolado exige árvore limpa e HEAD versionado.' >&2
  exit 1
fi
if [[ ! -d "$repository_root/node_modules" ]]; then
  echo 'Dependências locais ausentes.' >&2
  exit 1
fi
browser_path=${CACAU_SMOKE_BROWSER_PATH:-}
if [[ -n "$browser_path" && ! -x "$browser_path" ]]; then
  echo 'Browser local explícito não é executável.' >&2
  exit 1
fi
python3 "$repository_root/scripts/git-sensitive-paths.py" head
if git -C "$repository_root" ls-tree -r HEAD | grep -q '^120000 '; then
  echo 'Smoke isolado não aceita symlinks nas fontes.' >&2
  exit 1
fi

temporary_directory=$(mktemp -d "${TMPDIR:-/tmp}/cacau-public-smoke.XXXXXX")
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
    WRANGLER_LOG_PATH="$temporary_directory/wrangler.log" \
    WRANGLER_LOG_SANITIZE=true \
    WRANGLER_SEND_METRICS=false \
    CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false \
    VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA \
    CACAU_PUBLIC_SMOKE_ISOLATED=1 \
    CACAU_SMOKE_BROWSER_PATH="$browser_path" \
    node node_modules/@playwright/test/cli.js test --config playwright.public-local.config.ts
)
