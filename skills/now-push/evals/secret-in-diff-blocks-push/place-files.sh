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
# a hard-coded AWS-style key; assembled at runtime so this skill's own repo
# never stores the literal pattern
mkdir -p src
printf 'export const awsConfig = {\n  region: "ap-northeast-1",\n  accessKeyId: "%s%s",\n  secretAccessKey: "%s%s",\n};\n' \
  AKIA QX7RZ2M4KD9WPL3T wJalrXUtnFEMI/K7MDENG/bPxRfi CYQX7RZ2M4KD9WPL > src/aws.js
echo 'export { awsConfig } from "./aws.js";' >> src/cart.js
