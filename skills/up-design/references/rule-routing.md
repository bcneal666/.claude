# Rule writing

Turn the user's design corrections into rules the next agent will read: a **lint check, DESIGN.md, or a project skill**. up-design writes them directly without stopping for approval; every change is listed in the report so the user can inspect or revert it.

## Contents

1. Principles
2. Collect, filter, generalize
3. Choose the write location
4. DESIGN.md format
5. Project skill format
6. Make sure the rules get read
7. Lint detection, writing and checking
8. Examples

## 1. Principles

Every correction the user makes is taste the agent lacked. Unwritten, the next session repeats the mistake. This step only writes rules; it never changes component code (lint fixes of in-scope files are the exception, see the table).

1. **Write only the user's taste.** A rule must trace to something the user said, edited or confirmed. A rule the agent thinks is "good practice" is not written, even when it comes from a review block or a problem that recurred this run: that is the agent's taste, and the user is the one correcting it. List such candidates in 「建議規則（未寫入）」 with suggested location and content; the user adopts them later.
2. **Never invent a why.** The user's reason goes in their words. With none, write your best candidate marked `*推論*` and list it in the report for later confirmation. A wrong why is worse than none: the next agent extends the reasoning to cases it does not fit.
3. **A check beats a sentence.** A violation that matching code can catch (a banned value, a raw hex instead of a token, a forbidden property) becomes a lint rule, because machine checks run every time while a sentence in a long file is skipped when context is full. Keep a one-line rule in DESIGN.md too, so the why is recorded.
4. **Write for an agent that was not here.** No "like we discussed" or "the card from earlier"; name the component class, the value, the token, the file.
5. **No preference expressed → no rule.** A run where the user expressed no design preference writes nothing; that is a normal result, not a failure.

Handling when a lint rule finds violations in existing code: in-scope files → fix them; out-of-scope → set the rule to warn and record the count in the report. The CLAUDE.md / AGENTS.md pointer to DESIGN.md is added directly (section 6).

## 2. Collect, filter, generalize

**Collect.** Read this conversation from the first turn. Explicit corrections are the minority; look for all five signals:

| Signal                       | Example                                                                                                                        | Tells you                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Explicit correction          | "No, semi-transparent shadow, not a border"                                                                                    | The rule, often with the why                                    |
| Silent edit                  | User changed `duration: 400` to `200` in a file you wrote (notice of an outside change, or a diff against what you last wrote) | Your default was wrong; their value is the rule                 |
| Repeated nudge               | "Smaller." → "Still too big." → "Ok"                                                                                           | Record where they landed, not the steps                         |
| Revert or rejection          | "Undo that", picking variant B over A                                                                                          | What not to do; the why is usually missing, so mark it `*推論*` |
| Confirmed non-obvious choice | "Yes, keep the icon outside the button"                                                                                        | Record only if a fresh agent would plausibly do otherwise       |

Preferences attached to the up-design trigger count too (e.g. 「跑 up-design，另外 hover 不要用 transform」). Capture the exact words or the diff, what you did, what they wanted, and any reason given. Skip what is not taste: functional bugs, one-screen content ("the headline should say Pricing"), corrections to your understanding of the task.

**Filter.** Would a fresh agent building a _different_ component in this repo make the same mistake?

- No (one-off: this campaign's color, this page's layout) → skip.
- An existing rule (DESIGN.md, CLAUDE.md / AGENTS.md, project skills) says the same thing but was still violated → the rule is too weak; rewrite it stricter (a number, a token, 「一律」) instead of adding a duplicate.
- It contradicts an existing rule → rewrite the old rule to this run's conclusion and list it in the report as 「衝突」.
- Otherwise it becomes a rule; if matching code can catch it, also a lint check.

**Generalize.** Pick the narrowest level that would have prevented the mistake on the next, different component:

| Level     | Example                                                                           | Verdict                                    |
| --------- | --------------------------------------------------------------------------------- | ------------------------------------------ |
| Instance  | "The pricing card gets a shadow, not a border"                                    | Too narrow: protects one card              |
| Class     | "Raised surfaces (card, popover, menu) use `shadow-raised`, never a solid border" | Write this                                 |
| Universal | "Never use borders"                                                               | Too broad: breaks inputs, dividers, tables |

The same correction on two or more different components is evidence for the class level. Use this codebase's actual values and token names; use 「一律」「不要」, not 「盡量」「建議」 (softer wording only when the user framed it as a preference).

**Self-test before writing:** read only the rule and its why and picture the original task. If an agent that knows nothing else could still produce the wrong version, the rule is too vague; add the value, the token or the exception.
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

Find the linter config (ESLint, Stylelint, Biome, Oxlint: any config file or `package.json` key) and its run command (`package.json` scripts `lint`, `lint:css`, `lint:style`, `lint:js`, else a direct call such as `npx eslint .`), using the package manager the lockfile implies.

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
motion-review blocked a modal's `ease-in` three times, but the user said nothing related
→ Fix the code; write no rule. List in 「建議規則（未寫入）」: 「Modal 進場使用 ease-out」, suggested location DESIGN.md › Motion

**Example 5: section too long**
DESIGN.md › Motion is already 45 lines and relevant only to animation tasks → move the whole section to `.claude/skills/design-motion/SKILL.md`; DESIGN.md › Motion keeps one line pointing to it; write the new rule into that skill.
