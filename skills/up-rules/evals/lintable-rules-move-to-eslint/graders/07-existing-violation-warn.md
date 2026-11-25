---
type: llm
focus: trace
weight: 1
---

A new file that imports lodash fails lint with an error, while src/legacy/report.js (which already imports lodash) only gets a warning, and the final report mentions the existing violation.
