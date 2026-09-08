#!/usr/bin/env bash

set -euo pipefail

repository_root=$(git rev-parse --show-toplevel)
branch=$(git -C "$repository_root" branch --show-current)

if [[ -z "$branch" || "$branch" == "main" ]]; then
  echo 'Build HML exige uma branch de trabalho; main é bloqueada.' >&2
  exit 1
fi

if [[ -n "$(git -C "$repository_root" status --porcelain)" ]]; then
  echo 'Build HML exige árvore limpa para usar exatamente o HEAD versionado.' >&2
  exit 1
fi

if [[ ! -d "$repository_root/node_modules" ]]; then
  echo 'Dependências locais ausentes; execute npm ci antes.' >&2
  exit 1
fi

if [[ ! "${VITE_TURNSTILE_SITE_KEY:-}" =~ ^[a-zA-Z0-9_-]+$ ]]; then
  echo 'Build HML exige VITE_TURNSTILE_SITE_KEY pública explícita e não vazia.' >&2
  exit 1
fi

# Valida nomes antes de archive: nunca copie arquivos secretos rastreados.
python3 "$repository_root/scripts/git-sensitive-paths.py" head
if git -C "$repository_root" ls-tree -r HEAD | grep -q '^120000 '; then
  echo 'Build isolado não aceita symlinks versionados nas fontes.' >&2
  exit 1
fi

temporary_directory=$(mktemp -d "${TMPDIR:-/tmp}/cacau-v1-hml-build.XXXXXX")
cleanup() {
  rm -rf "$temporary_directory"
}
trap cleanup EXIT

git -C "$repository_root" archive --format=tar HEAD | tar -x -C "$temporary_directory"
ln -s "$repository_root/node_modules" "$temporary_directory/node_modules"
mkdir -p "$temporary_directory/home" "$temporary_directory/config"

run_isolated() {
  env -i \
    PATH="$PATH" \
    HOME="$temporary_directory/home" \
    XDG_CONFIG_HOME="$temporary_directory/config" \
    TMPDIR="${TMPDIR:-/tmp}" \
    WRANGLER_LOG_PATH="$temporary_directory/wrangler.log" \
    WRANGLER_LOG_SANITIZE=true \
    CLOUDFLARE_ENV=hml \
    CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false \
    VITE_TURNSTILE_SITE_KEY="${VITE_TURNSTILE_SITE_KEY}" \
    WRANGLER_SEND_METRICS=false \
    "$@"
}

(
  cd "$temporary_directory"
  run_isolated npm run build

  if [[ "${HML_DEPLOY:-0}" == '1' ]]; then
    # Publicação continua sendo operação separada e explicitamente autorizada.
    # Só ela usa o perfil de autenticação do operador; o build nunca o recebe.
    run_isolated env HOME="$HOME" XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}" npx wrangler deploy --env hml
  fi
)
