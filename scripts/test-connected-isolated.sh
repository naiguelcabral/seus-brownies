#!/usr/bin/env bash
set -euo pipefail
umask 077

repository_root=$(git rev-parse --show-toplevel)
[[ -z "$(git -C "$repository_root" status --porcelain)" ]] || { echo 'Connected QA requires a clean, versioned HEAD.' >&2; exit 1; }
[[ -d "$repository_root/node_modules" ]] || exit 1
browser_path=${CACAU_SMOKE_BROWSER_PATH:-}
[[ -z "$browser_path" || -x "$browser_path" ]] || exit 1
python3 "$repository_root/scripts/git-sensitive-paths.py" head
if git -C "$repository_root" ls-tree -r HEAD | grep -q '^120000 '; then
  echo 'Connected QA rejects versioned symlinks.' >&2
  exit 1
fi
temporary_directory=$(mktemp -d "${TMPDIR:-/tmp}/cacau-connected.XXXXXX")
cleanup() { rm -rf "$temporary_directory"; }
trap cleanup EXIT
git -C "$repository_root" archive --format=tar HEAD | tar -x -C "$temporary_directory"
ln -s "$repository_root/node_modules" "$temporary_directory/node_modules"
mkdir -p "$temporary_directory/home" "$temporary_directory/config"
(
  cd "$temporary_directory"
  env -i PATH="$PATH" HOME="$temporary_directory/home" XDG_CONFIG_HOME="$temporary_directory/config" \
    TMPDIR="${TMPDIR:-/tmp}" PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-}" \
    CACAU_SMOKE_BROWSER_PATH="$browser_path" CACAU_CONNECTED_QA=local-postgres17 \
    node --throw-deprecation --import tsx scripts/test-connected-disposable.ts --ack-disposable-postgres17
)
