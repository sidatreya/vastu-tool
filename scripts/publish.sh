#!/usr/bin/env bash
# Build and publish dist/ to the gh-pages branch of sidatreya/vastu-tool (auth via the logged-in gh CLI).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
REPO="sidatreya/vastu-tool"; PAGES="$ROOT/.pages"
GITC=(-c credential.helper= -c "credential.helper=!gh auth git-credential")
npx vite build --logLevel error
rm -rf "$PAGES" && mkdir -p "$PAGES" && cp -a dist/. "$PAGES/" && touch "$PAGES/.nojekyll"
cd "$PAGES" && git init -q -b gh-pages && git config user.name sidatreya && git config user.email "65660574+sidatreya@users.noreply.github.com"
git add -A && git commit -q -m "site: build $(date -u +%Y-%m-%dT%H:%MZ)"
git "${GITC[@]}" push -q -f "https://github.com/$REPO.git" gh-pages
echo "published $(git rev-parse --short HEAD)"
