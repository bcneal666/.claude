#!/usr/bin/env bash
set -eu
cp -R "$(dirname "$0")/files/." .
git init -q -b main
git config user.email eval@example.com
git config user.name eval
git add -A
git commit -qm "init"
# local bare remote inside .git so it is never tracked; no GitHub involved
git init -q --bare .git/eval-origin.git
git remote add origin "$PWD/.git/eval-origin.git"
git push -q -u origin main
# two local commits that do not follow the fixed format; working tree stays clean
echo "" >> README.md && echo "Work in progress." >> README.md
git commit -qam "wip stuff"
echo "Run \`node src/cart.js\` to try it." >> README.md
git commit -qam "Update README."
