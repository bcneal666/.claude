---
type: llm
focus: trace
weight: 1
---

Each test uses its own recorder (for example a fresh vi.fn()) or resets the shared state, so no test's expectation depends on what an earlier test recorded.
