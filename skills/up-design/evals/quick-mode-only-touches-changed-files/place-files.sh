#!/usr/bin/env bash
set -eu
cp -R "$(dirname "$0")/files/." .
git init -q
git config user.email eval@example.com
git config user.name eval
git add -A
git commit -qm "init"
mkdir -p up-design/reports
NOW=$(TZ=Asia/Taipei date +%Y-%m-%dT%H:%M:%S+08:00)
cat > up-design/last-run.json <<JSON
{
  "head": "$(git rev-parse HEAD)",
  "run_at": "$NOW",
  "mode": "full",
  "last_full_at": "$NOW"
}
JSON
git add -A
git commit -qm "up-design state"
git tag before-run
# The only UI change since the last run: Button gets a loading state.
cat > src/components/Button.tsx <<'TSX'
import "../styles/button.css";

export function Button({ label, loading, onClick }: { label: string; loading?: boolean; onClick: () => void }) {
  return (
    <button className="btn" onClick={onClick} disabled={loading}>
      {loading ? "Loading..." : label}
    </button>
  );
}
TSX
