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
# uncommitted work: a modified tracked file and a new untracked file
cat >> src/cart.js <<'JS'

export function applyDiscount(total, percent) {
  if (percent < 0 || percent > 100) throw new RangeError("percent must be 0-100");
  return Math.round(total * (100 - percent)) / 100;
}
JS
mkdir -p test
cat > test/cart.test.js <<'JS'
import { applyDiscount } from "../src/cart.js";

console.assert(applyDiscount(200, 10) === 180);
JS
