---
tags: [skill-creator]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

我想用 TDD 做一個 slugify(title: string) 函式放在 src/slugify.ts：轉小寫、空白和底線變成 -、去掉非英數字元、連續 - 合併、頭尾不要有 -。用 vitest，紅綠循環一步一步來。

Input files: package.json, vitest.config.ts
