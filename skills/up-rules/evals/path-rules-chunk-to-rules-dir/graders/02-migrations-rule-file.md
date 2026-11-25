---
type: llm
focus: trace
weight: 1
---

A file under .claude/rules/ has frontmatter with only `paths`, a double-quoted glob covering db/migrations, and contains both migration rules (reversible with a down section; never edit a merged migration) with the production reason.
