---
type: llm
focus: trace
weight: 1
---

The fixed test file uses vi.useFakeTimers() and moves time with vi.advanceTimersByTime / vi.advanceTimersByTimeAsync (or runAllTimers) instead of waiting on real setTimeout promises.
