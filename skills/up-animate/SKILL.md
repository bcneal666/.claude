---
name: up-animate
description: Run emil-design-eng (rules) → remove-animations → find-animation-opportunities → animate → improve-animations → animation-performance → review-animations on the current project's UI (with --m, add mobile-native before review). Optional @path scope.
argument-hint: "[--m] [@path ...]"
---

Animation pass over the current project's UI (cwd): load rules → remove → find → pick → build → improve (audit + apply) → performance → (mobile) → review. Stay in main conversation; do not fork.

Arguments: `$ARGUMENTS`

## Steps

1. **Parse arguments.** Split `$ARGUMENTS` on whitespace. Extract `--m` as a flag (mobile mode). Remaining tokens are scope paths; strip leading `@`.
   - Path missing → list it and stop.

2. **Resolve scope** (project = cwd; root via `git rev-parse --show-toplevel`, else cwd).
   - Paths given → use them (folders expand to UI files).
   - None → auto-detect UI dirs that exist: `app/`, `src/app/`, `pages/`, `src/pages/`, `components/`, `src/components/` (incl. `ui/`), `src/routes/`, `src/lib/components/`, else `src/**` (Vite/Astro/Svelte/Vue). Exclude API/server routes (`**/api/**`, `**/server/**`), `node_modules`, build output.
   - Keep UI files only: `*.tsx *.jsx *.vue *.svelte *.astro *.css *.scss *.html`.
   - Nothing detected → ask user for a path and stop. Otherwise print final file list.
   - Read repo-root `DESIGN.md` if present (rules recorded by `/learn-taste`), especially its Motion and Interaction sections. Its durations, easings and "no animation here" rules override the defaults of the sub-skills in steps 4–9; pass them in each sub-skill's `args`.

3. **Load motion rules.** Call Skill `emil-design-eng` with `args` = scope + file list + task: "Use as reference for the motion pass that follows; do not build or edit anything now." Never call with empty args. Use its principles when judging proposals and findings in steps 4–10. An emil-design-eng default that contradicts a `DESIGN.md` rule loses: follow `DESIGN.md` and list the conflict in the summary.

4. **Remove unneeded motion.** Subtract before adding, so later steps never tune an animation that should not exist.
   1. Call Skill `remove-animations` with `args` = scope + file list + task: "Audit these files and output Part 1 (removed/reduced), Part 2 (kept) and Part 3 now. Do NOT edit any file yet; list proposed deletions/reductions only." Never call with empty args (returns only its greeting).
   2. AskUserQuestion (multiSelect, ≤4 options per question, "All" option), one option per proposed removal/reduction with `file:line` and reason. None selected → skip.
   3. Apply the selected removals and their cleanup yourself, subtract-only, in-scope files only.
   - Keep the skill's "kept but badly built" items; pass them to step 7.
   - Nothing to remove → note it and continue.

5. **Find opportunities.** Call Skill `find-animation-opportunities` with `args` = scope + file list + task: "Scan these files and output proposals with exact values now." Never call with empty args (returns only its greeting). Read-only.
   - No proposals survive → note "no new animation needed", skip to step 7 (existing motion may still need improving).

6. **Pick + implement new motion.**
   - AskUserQuestion (multiSelect), one option per proposal with location and values (property, easing, duration). Max 4 options per question; batch beyond that. Include an "All" option. Nothing selected → skip.
   - Call Skill `animate` with `args` = selected proposals (file, trigger, property, easing, duration) + task "Implement now." Follow project CLAUDE.md and existing design tokens (no hardcoded colors if the project uses tokens), respect `prefers-reduced-motion`, touch/responsive behavior.

7. **Improve existing motion (audit + apply).** `improve-animations` is read-only: it only writes plans (to `plans/` or `animation-plans/`), never source. So this step has two parts; the skill alone changes nothing.
   1. Call Skill `improve-animations` with `args` = scope + file list + the "kept but badly built" items from step 4 + task: "Audit existing animation/motion in these files only, including motion just added; output prioritized findings and implementation plans now."
   2. **Apply the plans yourself** (main conversation, no `improve-animations execute`). AskUserQuestion (multiSelect, ≤4 options per question, "All" option) listing each finding with `file:line`, change and priority. Implement each selected plan exactly as specified, editing only in-scope files. None selected → leave plans on disk, say so in summary.
   - Plans are never edited or deleted by this step; mark applied ones in the summary.

8. **Performance.** Call Skill `animation-performance` with `args` = scope + file list (include motion added or changed in steps 4–7) + task: "Audit for frame-budget issues (non-composite properties, will-change misuse, main-thread work, React per-frame state) and apply the fixes now." Fix real issues directly; ask the user first only when a fix changes the visual result. Nothing found → note it.

9. **Mobile (only with `--m`).** Call Skill `mobile-native` with `args` = scope + file list + task: "Audit these files against your checklist now and apply the fixes." Items needing real hardware → list in summary, never claim verified. Without `--m` → skip this step entirely.

10. **Review.** `review-animations` sets `disable-model-invocation`, so Skill cannot load it. Read `${CLAUDE_SKILL_DIR}/../review-animations/SKILL.md` (fallback `~/.claude/skills/review-animations/SKILL.md`; plus `STANDARDS.md` when a finding needs exact values) and review the in-scope part of `git diff` against its bar. Skip its Initial Response greeting.
   - Real issue → fix, then re-review. Max 3 rounds.
   - Unverifiable / likely false positive → list it and ask user.
   - Same finding survives two rounds → stop and escalate.

11. **Summarize.** Scope, `--m` on/off, emil-design-eng vs `DESIGN.md` conflicts (if any), removals applied/kept, proposals taken/skipped, improve plans applied/left, performance fixes, mobile fixes (if `--m`), changes (`file:line`), review rounds, findings deliberately skipped and why. Add one line suggesting `/learn-taste` only if this run showed correction signals (user edited a file this run changed, asked to undo/redo, deselected a proposal and gave a reason, or a finding was escalated after surviving two rounds); otherwise omit it.

## Rules

- Project `CLAUDE.md`, `DESIGN.md` and design tokens outrank this skill and its sub-skills.
- No `git commit` or `git push`.
- No animation libraries. If `animate` decides CSS is insufficient → ask user first.
- Edit only files in scope (plus plan files written by `improve-animations`).
- `remove-animations` only subtracts; never add or retune motion in step 4.
