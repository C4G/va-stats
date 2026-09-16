#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

mapfile -t javascript_files < <(
  find "$repo_root" \
    -path "$repo_root/node_modules" -prune -o \
    -path "$repo_root/.git" -prune -o \
    -path "$repo_root/.next" -prune -o \
    -type f \( -name '*.js' -o -name '*.jsx' \) \
    ! -path "$repo_root/next.config.js" \
    ! -path "$repo_root/postcss.config.js" \
    ! -path "$repo_root/public/sw.js" \
    ! -path "$repo_root/public/workbox-*.js" \
    -print | sort
)

if ((${#javascript_files[@]} > 0)); then
  printf 'Authored JavaScript/JSX files remain:\n'
  printf '  %s\n' "${javascript_files[@]}"
  exit 1
fi

duplicates=()
while IFS= read -r typescript_file; do
  module_base="${typescript_file%.*}"
  if [[ -e "${module_base}.js" || -e "${module_base}.jsx" ]]; then
    duplicates+=("$module_base")
  fi
done < <(
  find "$repo_root" \
    -path "$repo_root/node_modules" -prune -o \
    -path "$repo_root/.git" -prune -o \
    -path "$repo_root/.next" -prune -o \
    -type f \( -name '*.ts' -o -name '*.tsx' \) -print | sort
)

if ((${#duplicates[@]} > 0)); then
  printf 'Duplicate TypeScript and JavaScript module paths remain:\n'
  printf '  %s\n' "${duplicates[@]}"
  exit 1
fi

if rg -n --glob '*.ts' --glob '*.tsx' "from ['\"][^'\"]+\.(js|jsx)['\"]|import\(['\"][^'\"]+\.(js|jsx)['\"]\)" "$repo_root"; then
  printf 'Authored TypeScript imports still reference JavaScript extensions.\n'
  exit 1
fi

printf 'No authored JavaScript/JSX files, duplicate module paths, or JavaScript extension imports found.\n'
