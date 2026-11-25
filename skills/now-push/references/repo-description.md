# Repo Description Maintenance (step 11)

- Precondition: `gh repo view --json description,url` succeeds; else one-line notice 「略過 description 檢查：<原因>」
- Update needed if any holds:
  - description empty
  - language ≠ target language (`--lng`, default English)
  - content clearly mismatches actual repo purpose (judge from README.md first paragraph, this diff, top-level `git ls-files`; counts only when this change shifts project positioning or adds a major feature)
- No update needed → report 「description 已同步，未改動」; do not change for change's sake
- Update needed → generate new description: one sentence, ≤350 chars, no emoji, no trailing period in English, state what the project is/does; `gh repo edit --description "<new>"`; report old → new
