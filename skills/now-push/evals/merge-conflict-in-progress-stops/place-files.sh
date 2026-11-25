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
# leave an unfinished merge with a conflict in src/cart.js
git switch -q -c feature
sed -i.bak 's/item.price \* item.qty/item.price * (item.qty ?? 1)/' src/cart.js && rm src/cart.js.bak
git commit -qam "default qty to 1"
git switch -q main
sed -i.bak 's/item.price \* item.qty/Number(item.price) * item.qty/' src/cart.js && rm src/cart.js.bak
git commit -qam "coerce price to number"
git merge -q feature >/dev/null 2>&1 || true
