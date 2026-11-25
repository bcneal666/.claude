#!/usr/bin/env bash
set -eu
cp -R "$(dirname "$0")/files/." .
git init -q -b main
git config user.email eval@example.com
git config user.name eval
git add -A
git commit -qm "init"
# uncommitted change: POST /api/sum that answers malformed or non-numeric input with 500 or string concat
node -e '
const fs = require("fs");
const src = fs.readFileSync("server.js", "utf8");
const route = `  if (req.url === "/api/sum" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const { a, b } = JSON.parse(body);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ sum: a + b }));
      } catch (err) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: String(err) }));
      }
    });
    return;
  }
`;
fs.writeFileSync("server.js", src.replace("  res.writeHead(404", route + "  res.writeHead(404"));
'
