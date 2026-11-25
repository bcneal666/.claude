---
tags: [skill-creator, vitest-test-writer]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

/vitest-test-writer src/debounce.test.ts 在 CI 上偶爾會紅，本機跑又幾乎都是綠的，幫我修好

Input files: package.json, vitest.config.ts, src/debounce.ts, src/debounce.test.ts
