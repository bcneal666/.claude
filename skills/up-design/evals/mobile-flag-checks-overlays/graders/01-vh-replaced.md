---
type: llm
focus: trace
weight: 1
---

src/styles/page.css no longer uses a bare `100vh` for the hero height; it uses `dvh` or `svh` (optionally with a `vh` fallback declared before it).
