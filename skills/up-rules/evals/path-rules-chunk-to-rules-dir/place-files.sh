#!/usr/bin/env bash
set -eu
cp -R "$(dirname "$0")/files/." .
if grep -q '"devDependencies"' package.json 2>/dev/null; then
  npm install --no-audit --no-fund --silent
fi
git init -q -b main
git config user.email eval@example.com
git config user.name eval
git add -A
git commit -qm "init"
