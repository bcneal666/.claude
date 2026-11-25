---
type: llm
focus: trace
weight: 1
---

After the run, server.js answers malformed JSON and non-numeric a/b on /api/sum with status 400, and a body like {"a":1,"b":2} still returns sum 3.
