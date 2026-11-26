# Compression (steps 6 and 7)

How to rewrite compression targets.

## Terse style rules

Compression targets only; README never follows them (`readme.md`).

- Drop: articles, filler (just/really/basically), pleasantries, vague hedging, decorative openers and closers
- Keep: negations and qualifiers (not/never/no/only/except, 不/勿/僅/除非), numbers and units—dropping flips meaning
- Allow: fragment sentences, short synonyms (fix, not implement a solution for)
- One term per thing; pronoun only with an obvious referent
- Terse phrasing not shorter than plain → use plain
- Forbid: invented abbreviations (cfg, impl, fn: same tokens, harder read), decorative tables, emoji
- Standard technical abbreviations allowed: DB / API / HTTP
- Pattern: `[thing] [action] [reason]. [next step].`

## Language

Prose after rewrite always in `--lng` language (default English); source language differs → translate, semantics equivalent. Terse style spirit (drop filler, pleasantries, redundancy; keep negations/qualifiers and numbers) applies to any target language. Always **keep original**, never translate:

- Proper nouns and project codenames (e.g. `COSS`, hostnames, service names)
- Paths, commands, environment variables, filenames
- Rules **about language** themselves (e.g. 「以繁中回應」)—rule prose follows `--lng`, but target language named inside quotes must not change
- Everything in "verbatim" list below
- User-facing output strings quoted in Chinese (e.g. 「CLAUDE.md 事實已同步，未改動」)—report language stays Traditional Chinese

## Verbatim (byte-for-byte)

- All content inside code blocks and fenced blocks
- Exact command strings (e.g. `git commit -m ...`)
- Format templates (e.g. commit message structure, trailer like `Co-Authored-By: ...`)
- Disambiguating good/bad examples (✅ 正確 / ❌ 錯誤)
- `@path` import syntax (e.g. `@CLAUDE.local.md`)—functional syntax, rewrite breaks it
- Frontmatter key names and values (`description:`, `name:`, `paths:`, etc.)
- Command file frontmatter block verbatim (`argument-hint`, `allowed-tools`, `model`, `disable-model-invocation`) except `description` (translate-only per "Language-only targets")
- Command argument placeholders `$ARGUMENTS`, `$1`–`$9`
- Command `!`-prefixed bash execution syntax—functional syntax, rewrite breaks it
- Skill `SKILL.md` frontmatter verbatim (`name`, `argument-hint`, `disable-model-invocation`, `allowed-tools`, `model`, …) except `description` (translate-only like command `description`)
- Skill placeholders `$ARGUMENTS`, `${CLAUDE_SKILL_DIR}`
- Skill anchors: step numbers, headings other text or files refer to (e.g. "Modern web guidance"), filenames skill files reference each other by—renaming breaks cross-references
- Quoted example strings (e.g. UI copy「確定」「建立工單」, sub-skill `args` task prompts in quotes)—they are content or prompts, not prose
- Tokens other files or scripts match exactly: verdict values (`pass` / `gap` / `N/A` / `未驗證`), report section names, `{{PLACEHOLDER}}` template tokens—translating or rewording breaks matching

Compress only **prose around** these blocks; blocks themselves untouched.

## Do not compress

These override every terse style rule above. Keep the original sentence (do not split, rephrase or turn into a fragment) for:

- Multi-step flows where **order matters** (dropping connectives makes order easy to misread)
- Conditional/exception branches (if / unless / 除非 / 僅當)
- Destructive or irreversible operation warnings
- Compression creates technical ambiguity

Test: **if compressed text has a second reasonable reading, do not compress.**

## Checks (step 7, after the item-by-item comparison in SKILL.md)

Readback check: order/conditions not misread after fragmenting; technical terms, code, error strings, `@path` imports untouched verbatim; no invented abbreviations.

Language check: target-file prose all in `--lng` language (excl. verbatim blocks and proper nouns); translation changed no negation, qualifier, number, conditional branch; target language inside quotes of language rules untouched. up-design artifacts excluded from language check (never translated); headings, tables, `last-run.json` unchanged (`git diff`). Language-only targets: agents prose + `description`, hook comments, command `description` all in `--lng`; `git diff hooks/` shows only comment lines changed, `node --check` passes; frontmatter keys other than `description` untouched.
