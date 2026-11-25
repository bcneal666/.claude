#!/usr/bin/env bash
set -eu
cp -R "$(dirname "$0")/files/." .
git init -q
git config user.email eval@example.com
git config user.name eval
git add -A
git commit -qm "init"
