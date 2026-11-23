# Rule writing

Write locations follow `learn-taste`: **lint, DESIGN.md, project skill**. Difference: up-design is automatic and does not stop for user approval (section 1).

## Contents

1. Differences from learn-taste
2. Collect, filter, generalize
3. Choose the write location
4. DESIGN.md format
5. Project skill format
6. Make sure the rules get read
7. Lint detection, writing and checking
8. Examples

## 1. Differences from learn-taste

`learn-taste` sets `disable-model-invocation: true`; the agent cannot call it. Locate its SKILL.md with `scripts/find_skill.mjs learn-taste`, read it, **follow its Phase 1–4**, but where the table below differs, up-design wins:

| Item                                       | learn-taste                                              | up-design                                                                                                                                            |
| ------------------------------------------ | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| When to write                              | Proposes, stops; writes only after user says `write all` | Writes directly; result listed in report section 「規則變更」                                                                                        |
| Rule source                                | Only preferences the user expressed                      | Same. Problems the agent finds itself (`review-animations` block reasons, recurring problems) are not written; listed only in 「建議規則（未寫入）」 |
| Unknown why                                | Mark _inferred_, ask user                                | Mark `*推論*`, write directly, list in report for later user confirmation                                                                            |
| Lint finds violations in existing code     | Report count and ask                                     | In-scope: fix; out-of-scope: set rule to warn, record in report                                                                                      |
| CLAUDE.md / AGENTS.md pointer to DESIGN.md | Proposes adding                                          | Adds directly (section 6)                                                                                                                            |

**Write only the user's taste.** Every written rule must trace to something the user said, changed or confirmed. A rule the agent thinks is "good practice" is not written even when it comes from a review block or a problem recurring this run: that is the agent's taste, and the user is correcting the agent's taste. Put such candidates in 「建議規則（未寫入）」 with suggested location and content; the user adopts them later, or says so on the next trigger.

A run where the user expressed no design preference writes no rule; that is a normal result, not a failure.

## 2. Collect, filter, generalize

Per learn-taste Phase 1–3:

- **Collect**: explicit corrections, files the user edited themselves, repeated tweaks, reverts or rejections, non-obvious choices the user confirmed. Preferences attached to the up-design trigger count too (e.g. 「跑 up-design，另外 hover 不要用 transform」).
- **Filter**: would a new agent make the same mistake on a different component? No → skip. Existing rule already covers it but was still violated → the rule is too weak; rewrite it stricter, do not add a duplicate. Contradicts an existing rule → rewrite the old rule to this run's conclusion and list it in the report as 「衝突」.
- **Generalize**: write at the category level. E.g. "raised surfaces (card, popover, menu) use `shadow-raised`, not a solid border" — not tied to one component, not "never use borders".
- Use this codebase's actual values and token names; use 「一律」「不要」, not 「盡量」「建議」.

## 3. Choose the write location

```
能用比對程式碼的方式抓出違規？（禁用的值、該用 token 卻寫死、禁用的屬性）
├── 是 → lint 規則（見第 7 節），另在 DESIGN.md 對應段落寫一行規則記錄 why
└── 否
    ├── DESIGN.md 該段落超過約 40 行，而且只和部分任務有關？
    │   （例：動態規則和做設定表單無關）
    │   └── 是 → 把整個段落搬到 project skill（見第 5 節），DESIGN.md 留一行指向它
    └── 預設 → 寫入 repo 根目錄的 DESIGN.md 對應段落
```

DESIGN.md sections are fixed: **Surfaces · Color · Typography · Spacing & layout · Motion · Interaction · Copy**. DESIGN.md or the section missing → create it; skeleton in `assets/design-md-template.md`.

## 4. DESIGN.md format

Each rule: the rule in bold, a `Why:` line, a comment with date and source.

```md
## Motion

- **Modal 進場使用 ease-out，時長 200ms 以內。**
  Why: modal 是使用者主動觸發的，慢的進場會讓操作感覺遲鈍。
  <!-- 2026-11-23：「modal 開太慢了」 -->
```

- Why given by the user → use their words; otherwise write the most plausible guess and start it with `*推論*`
- The comment records date and the user's exact words (or the edit made), so a later conflict shows which rule is newer and what the user actually said

## 5. Project skill format

Path: `.claude/skills/design-<section>/SKILL.md`, e.g. `.claude/skills/design-motion/SKILL.md`. Skeleton in `assets/project-skill-template.md`.

- description states when to read it (e.g. 「在這個專案建立或修改動畫、transition、gesture 時讀取」) so the agent loads it only for relevant tasks
- Move the section verbatim, keeping every rule's Why and comment
- DESIGN.md keeps one line in the old section: `動態規則見 .claude/skills/design-motion/SKILL.md`

## 6. Make sure the rules get read

A DESIGN.md no agent reads is the same as unwritten. After writing DESIGN.md, check whether the project's `CLAUDE.md` or `AGENTS.md` (both, if both exist) points to it. If not, append this line to the end of the file:

```md
Before building or changing UI, read DESIGN.md.
```

Neither file exists → create `CLAUDE.md` containing only this line. This is the only case where up-design edits CLAUDE.md / AGENTS.md.

## 7. Lint detection, writing and checking

**Never install new lint tools or plugins.** That changes project dependencies, beyond this skill's duty. No matching lint tool in the project → write DESIGN.md only, and attach the suggested lint config in the report's 「規則變更」.

### Detection

| Tool      | Config file                                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------------------------ |
| ESLint    | `eslint.config.{js,mjs,cjs,ts,mts,cts}`, `.eslintrc{,.js,.cjs,.json,.yml,.yaml}`, `eslintConfig` in `package.json` |
| Stylelint | `stylelint.config.{js,mjs,cjs}`, `.stylelintrc{,.js,.cjs,.json,.yml,.yaml}`, `stylelint` in `package.json`         |
| Biome     | `biome.json`, `biome.jsonc`                                                                                        |
| Oxlint    | `.oxlintrc.json`                                                                                                   |

Find the run command in order: `package.json` scripts (`lint`, `lint:css`, `lint:style`, `lint:js`) → direct call (`npx eslint .`, `npx stylelint "**/*.{css,scss}"`, `npx biome lint .`). Package manager from lockfile: `pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `bun.lockb` / `bun.lock` → bun, else npm.

### Check after writing

| Result                                             | Action                                                                                           |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Config invalid (parse failure, unknown rule)       | Revert; keep only the DESIGN.md rule; attach suggested config in the report                      |
| In-scope code errors                               | Fix the code                                                                                     |
| Out-of-scope old code errors                       | Set the rule to warn; record in 「未解決」 with violation count                                  |
| Lint cannot run (dependencies missing, no command) | Do not write lint; write DESIGN.md only; attach suggested config in the report marked 「未驗證」 |

Cannot run → do not write, because the config cannot be confirmed valid and a wrong lint config can fail CI outright. Out-of-scope errors drop to warn so one new rule does not fail the whole project's lint. When editing an existing config, keep its original format and comment style.

### Common built-in rules

Unsure of a rule name or option format → confirm with the tool itself (`npx stylelint --print-config <file>`, `npx biome explain <rule>`) or the official docs; never write from memory.

| Tool      | Rule                                         | Good for                                                                                   |
| --------- | -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Stylelint | `declaration-property-value-disallowed-list` | Ban `transition: all`, ban specific easing                                                 |
| Stylelint | `property-disallowed-list`                   | Ban certain properties                                                                     |
| Stylelint | `declaration-property-unit-allowed-list`     | Restrict duration units                                                                    |
| Stylelint | `declaration-property-value-allowed-list`    | Allow only specific values or CSS variables                                                |
| ESLint    | `no-restricted-imports`                      | Unify libraries (e.g. ban `framer-motion`, use `motion/react`)                             |
| ESLint    | `no-restricted-syntax`                       | Ban specific patterns via AST selector                                                     |
| Biome     | `noRestrictedImports`                        | Library restriction; its rule group changes between versions, confirm with `biome explain` |

Tailwind projects put many styles in className, which CSS lint cannot see. Such rules (e.g. ban `transition-all`) usually go only in DESIGN.md; consider an ESLint Tailwind plugin only if the project already has a usable one.

## 8. Examples

**Example 1: mechanically checkable, lint runs**
User says: 「不要再用 transition: all 了」
→ Write Stylelint config (merge with existing `rules`):

```json
{
  "rules": {
    "declaration-property-value-disallowed-list": {
      "transition": ["/\\ball\\b/"]
    }
  }
}
```

→ Add one line under DESIGN.md › Motion:

```md
- **不要使用 `transition: all`，列出實際要動的屬性。**（由 Stylelint 檢查）
  Why: `all` 會連帶動到不該動的屬性，也容易觸發 layout。
  <!-- 2026-11-23：「不要再用 transition: all 了」 -->
```

**Example 2: mechanically checkable, lint cannot run**
Same rule, project has no dependencies installed → write only DESIGN.md › Motion; attach example 1's Stylelint config in the report marked 「未驗證」.

**Example 3: not mechanically checkable**
User says: 「hover 不要用 transform，手機點完會卡住」
→ DESIGN.md › Interaction:

```md
- **hover 狀態不使用 transform（位移、縮放）。**
  Why: 觸控裝置沒有 hover，點擊後 transform 會殘留在畫面上。
  <!-- 2026-11-23：「hover 不要用 transform，手機點完會卡住」 -->
```

→ CLAUDE.md has no pointer to DESIGN.md → add `Before building or changing UI, read DESIGN.md.`

**Example 4: problem the agent found itself**
review-animations blocked a modal's `ease-in` three times, but the user said nothing related
→ Fix the code; write no rule. List in 「建議規則（未寫入）」: 「Modal 進場使用 ease-out」, suggested location DESIGN.md › Motion

**Example 5: section too long**
DESIGN.md › Motion is already 45 lines and relevant only to animation tasks → move the whole section to `.claude/skills/design-motion/SKILL.md`; DESIGN.md › Motion keeps one line pointing to it; write the new rule into that skill.
