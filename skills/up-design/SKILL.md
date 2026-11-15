---
name: up-design
description: Full UI polish pass on the current project — Phase A static visual review (typography, whitespace, hierarchy, color, responsive, originality; screenshot loop scored against CRITERIA.md, shadscan for shadcn projects), Phase B motion (remove, find, animate, improve, performance), Phase C review and final screenshots. Optional --only design|motion, --m for mobile, @path or URL scope.
argument-hint: "[--only design|motion] [--m] [@path ... | URL]"
disable-model-invocation: true
---

UI pass over the current project (cwd): shared setup → Phase A static design → Phase B motion → Phase C verify. Static first, so motion is built on the final layout. Stay in main conversation; do not fork.

Arguments: `$ARGUMENTS`

Bar: award-tier craft (Awwwards / Webby / FWA). Concrete static checkpoints live in `${CLAUDE_SKILL_DIR}/CRITERIA.md` (fallback `~/.claude/skills/up-design/CRITERIA.md`); read it first. Judge against it, not against vague "award feel".

Flow by flag:

| Flags | Runs |
|---|---|
| (none) | setup, A, B, C |
| `--only design` | setup, A (steps 6–11), summary |
| `--only motion` | setup, step 6 baseline only, B, C |
| `--m` | adds `mobile-native`: step 10 if A runs, else step 15 |

## Setup (once)

1. **Parse arguments.** Split `$ARGUMENTS` on whitespace. `--only design|motion` → phase filter (default both). `--m` → mobile flag. Tokens starting with `http` → target URL. Others → scope paths, strip leading `@`. Path missing → list it and stop. Invalid `--only` value → say so and stop.

2. **Resolve scope** (project = cwd; root via `git rev-parse --show-toplevel`, else cwd).
   - Paths given → use them (folders expand to UI files).
   - None → auto-detect UI dirs that exist: `app/`, `src/app/`, `pages/`, `src/pages/`, `components/`, `src/components/` (incl. `ui/`), `src/routes/`, `src/lib/components/`, else `src/**`. Exclude `**/api/**`, `**/server/**`, `node_modules`, build output.
   - UI files only: `*.tsx *.jsx *.vue *.svelte *.astro *.css *.scss *.html`. Nothing detected → ask for a path and stop. Otherwise print the final file list.

3. **Read constraints.** Project `CLAUDE.md`, repo-root `DESIGN.md` (if present; rules recorded by `/learn-taste`, including its Motion and Interaction sections) and design tokens (CSS vars / tailwind config). These are constraints, never overridden; pass the relevant rules in every sub-skill's `args`.

4. **Load rules.** Call Skill `emil-design-eng` once, `args` = scope + file list + task: "Use as reference for the whole pass (static review and motion); do not build or edit anything now." If Phase A runs, also call `frontend-design:frontend-design` the same way. Never call with empty args. A default from either skill that contradicts a `DESIGN.md` rule loses: follow `DESIGN.md`, list the conflict in the summary.

5. **Screenshot protocol** (used by steps 6, 11, 17; identical every time so comparisons are fair). Skill `agent-browser`. No URL given → detect dev command/port (`package.json` scripts), start it in background, open it. Capture 375 / 768 / 1440 px widths, full page, with `prefers-reduced-motion: reduce` emulated (or wait until animations settle) so entrance/scroll-reveal motion is not caught mid-flight. Save to scratchpad. Cannot run → say so, fall back to code-only review and mark every finding "unverified visually".

## Phase A — Static design (skipped by `--only motion`, except step 6)

6. **Baseline.** Capture per step 5. This is the reference for steps 11 and 17.

7. **shadcn audit (conditional).** Only if project root has `components.json` AND `package.json` dependencies include `react`; otherwise note "not a shadcn project, shadscan skipped" and continue.
   - From the project root (do not `cd`): `npx -y @shadscan/cli --json`, output saved to scratchpad. Read-only.
   - Parse the JSON whatever the exit code. Command itself fails (offline, unsupported layout) → note the reason, continue; never abort.
   - Never use `--apply`, `setup`, or `mcp`.

8. **Score.** For the 6 static dimensions in CRITERIA.md (typography, whitespace, visual hierarchy, color, responsive, originality) list concrete gaps: `file:line` or screenshot region, what is wrong, proposed fix with exact values, impact (high/med/low). No gap → "no gap" with one-line evidence. Never invent gaps to fill a quota.
   - A CRITERIA.md checkpoint or skill default that contradicts a `DESIGN.md` rule is not a gap: list the conflict in the summary.
   - If step 7 ran, add a 7th group "shadcn audit": each item with rule id, `file:line`, fix; severity critical/high → high, medium → med, low → low. List an issue once if a static dimension already covers it.
   - **Motion findings are queued, not patched here.** Missing motion (e.g. shadscan interaction/states items) → queue for step 12 as extra proposals. Badly built existing motion → queue for step 13. Keep `file:line` for each.

9. **Pick + patch.** AskUserQuestion (multiSelect, ≤4 options per question, "All" option), one option per static gap. None selected → skip. Implement selected fixes, in-scope files only, using existing tokens (no hardcoded colors if the project uses tokens). Ad placements: follow AdSense policy; never move or restyle ad units in a way that mimics content or encourages clicks. Do not touch animation/transition code.

10. **Mobile (only `--m`).** Call Skill `mobile-native` with `args` = scope + file list + task: "Audit these files against your checklist now and apply the fixes." Mostly layout CSS (100vh, safe-area, input zoom, tap, overscroll), so it runs here and step 11's 375px shots verify it. Items needing real hardware → list in summary, never claim verified.

11. **Re-review loop.** Re-screenshot per step 5, re-score changed dimensions only. If shadscan items were patched, rerun the step 7 command and compare score and remaining items.
    - New or remaining high/med gap → back to step 9 (next round).
    - Max 3 rounds. Same gap survives two rounds → stop, escalate to user.
    - Only low gaps or none → stop.

## Phase B — Motion (skipped by `--only design`)

12. **Remove, then add.** Subtract before adding so later steps never tune motion that should not exist.
    1. Call Skill `remove-animations` with `args` = scope + file list + task: "Audit these files and output Part 1 (removed/reduced), Part 2 (kept) and Part 3 now. Do NOT edit any file yet; list proposed deletions/reductions only." AskUserQuestion (multiSelect, ≤4 per question, "All"), one option per removal with `file:line` and reason. Apply selected ones yourself, subtract-only. Keep the skill's "kept but badly built" items for step 13. Nothing to remove → note it.
    2. Call Skill `find-animation-opportunities` with `args` = scope + file list + queued missing-motion items from step 8 + task: "Scan these files and output proposals with exact values now." Read-only. No proposals survive → note "no new animation needed", go to step 13.
    3. AskUserQuestion (multiSelect, ≤4 per question, "All"), one option per proposal with location and values (property, easing, duration). Then call Skill `animate` with `args` = selected proposals (file, trigger, property, easing, duration) + task "Implement now." Respect project CLAUDE.md, tokens, `prefers-reduced-motion`, touch/responsive behavior.

13. **Improve existing motion (audit + apply).** `improve-animations` is read-only: it only writes plans (to `plans/` or `animation-plans/`), never source.
    1. Call Skill `improve-animations` with `args` = scope + file list + "kept but badly built" items from step 12 + queued badly-built items from step 8 + task: "Audit existing animation/motion in these files only, including motion just added; output prioritized findings and implementation plans now."
    2. Apply the plans yourself (no `improve-animations execute`). AskUserQuestion (multiSelect, ≤4 per question, "All") listing each finding with `file:line`, change and priority. Implement each selected plan exactly as specified, in-scope files only. None selected → leave plans on disk, say so in summary. Plans are never edited or deleted; mark applied ones in the summary.

14. **Performance.** Call Skill `animation-performance` with `args` = scope + file list (include motion added or changed in steps 12–13) + task: "Audit for frame-budget issues (non-composite properties, will-change misuse, main-thread work, React per-frame state) and apply the fixes now." Fix real issues directly; ask first only when a fix changes the visual result. Nothing found → note it.

15. **Mobile when Phase A is skipped (only `--m` with `--only motion`).** Same call as step 10. Step 17 is its only visual check.

## Phase C — Verify (only if Phase B ran)

16. **Review.** `review-animations` sets `disable-model-invocation`, so Skill cannot load it. Read `${CLAUDE_SKILL_DIR}/../review-animations/SKILL.md` (fallback `~/.claude/skills/review-animations/SKILL.md`; plus `STANDARDS.md` when a finding needs exact values). Review only the files/hunks changed in Phase B and step 15 (Phase A static patches are not reviewed here). Skip its Initial Response greeting.
    - Real issue → fix, then re-review. Max 3 rounds.
    - Unverifiable / likely false positive → list it and ask user.
    - Same finding survives two rounds → stop and escalate.

17. **Final screenshots.** Capture per step 5 and compare with the step 6 baseline (or the last step 11 shots) for layout regressions caused by Phase B or step 15. Regression → fix once, re-shoot; still present → escalate to user, no further loop. If shadscan items were patched in Phase B, rerun the step 7 command and compare. No screenshot capability → mark "unverified visually".

## Summary

18. **Summarize.** Scope, flags (`--only`, `--m`), static rounds run, static gaps fixed (`file:line`), gaps skipped and why, shadscan score before → after (or why skipped), `DESIGN.md` conflicts, removals applied/kept, proposals taken/skipped, improve plans applied/left, performance fixes, mobile fixes and hardware-only items, review rounds, final-screenshot result, unverified items, findings deliberately skipped and why.
    - With `--only design`: list every queued motion item from step 8 (`file:line`) and suggest `/up-design --only motion`.
    - With `--only motion`: note static design was not reviewed; suggest `/up-design --only design`.
    - Add one line suggesting `/learn-taste` only if this run showed correction signals (user edited a file this run changed, asked to undo/redo, deselected a proposal and gave a reason, or a gap/finding was escalated after surviving two rounds); otherwise omit it.

## Rules

- Project `CLAUDE.md`, `DESIGN.md`, design tokens and AdSense policy outrank this skill and its sub-skills.
- No `git commit` or `git push`.
- Edit only files in scope (plus plan files written by `improve-animations`).
- Phase A never touches animation/transition code; step 12.1 only subtracts, never adds or retunes motion.
- No animation libraries. If `animate` decides CSS is insufficient → ask user first.
- shadscan only via `npx -y @shadscan/cli`; no `--apply`, no installing its hook, skill or MCP.
- Never call a sub-skill with empty `args`.
- "Looks better" without screenshot evidence is not a verified fix.
