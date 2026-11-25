#!/usr/bin/env bash
set -eu
cp -R "$(dirname "$0")/files/." .
git init -q -b main
git config user.email eval@example.com
git config user.name eval
git add -A
git commit -qm "init"
# uncommitted docs-only change
cat >> README.md <<'MD'

## Usage

Open the URL the server prints after `npm run dev`.
MD
