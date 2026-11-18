---
name: up-design
description: Full UI polish pass on the current project — a mandatory UX rules check on every run (UX-RULES.md, 13 sections: mobile overlays as bottom Drawer, touch, forms, loading, gestures, a11y), Phase A static visual review (typography, whitespace, hierarchy, color, responsive, originality; screenshot loop scored against CRITERIA.md, shadscan for shadcn projects), Phase B motion (remove, find, animate, improve, performance), Phase C review and final screenshots. Platform-feature fixes consult modern-web-guidance first. Optional --only design|motion, --m for mobile, @path or URL scope.
argument-hint: "[--only design|motion] [--m] [@path ... | URL]"
disable-model-invocation: true
---

UI pass over current project (cwd): setup → Phase A static design → Phase B motion → Phase C verify. Static first, so motion builds on final layout. Stay in main conversation; do not fork.

Arguments: `$ARGUMENTS`

Bar: award-tier craft (Awwwards / Webby / FWA). Judge against `${CLAUDE_SKILL_DIR}/CRITERIA.md` (static checkpoints; fallback `~/.claude/skills/up-design/CRITERIA.md`), not vague "award feel". Read it first.

UX rules: `${CLAUDE_SKILL_DIR}/UX-RULES.md` (fallback `~/.claude/skills/up-design/UX-RULES.md`). Read it too. Every run checks it ("UX rules check"), whatever the flags.

Conventions used below:
- **Pick** = AskUserQuestion, multiSelect, ≤4 options per question, "All" option, one option per item.
- Never invent gaps to fill a quota. No gap → "no gap" + one-line evidence.

Flow by flag:

| Flags | Runs |
|---|---|
| (none) | setup, step 6 baseline, UX check, rest of A, B, C |
| `--only design` | setup, A (step 6, UX check, steps 7–11), summary |
| `--only motion` | setup, step 6 baseline, UX check, B, C |
| `--m` | adds `mobile-native`: step 10 if A runs, else step 15 |

## Setup (once)

1. **Parse arguments.** Split `$ARGUMENTS` on whitespace. `--only design|motion` → phase filter (default both). `--m` → mobile flag. Token starting `http` → target URL. Others → scope paths, strip leading `@`. Path missing → list it and stop. Invalid `--only` value → say so and stop.

2. **Resolve scope** (project = cwd; root via `git rev-parse --show-toplevel`, else cwd).
   - Paths given → use them (folders expand to UI files).
   - None → auto-detect existing UI dirs: `app/`, `src/app/`, `pages/`, `src/pages/`, `components/`, `src/components/` (incl. `ui/`), `src/routes/`, `src/lib/components/`, else `src/**`. Exclude `**/api/**`, `**/server/**`, `node_modules`, build output.
   - UI files only: `*.tsx *.jsx *.vue *.svelte *.astro *.css *.scss *.html`. Nothing detected → ask for a path and stop. Otherwise print final file list.

3. **Read constraints.** Project `CLAUDE.md`, repo-root `DESIGN.md` (if present; rules recorded by `/learn-taste`, incl. its Motion and Interaction sections), design tokens (CSS vars / tailwind config). Constraints, never overridden; pass relevant rules in every sub-skill's `args`. Also read `UX-RULES.md`; it ranks below these (see Rules).

4. **Load rules.** Call Skill `emil-design-eng` once, `args` = scope + file list + task: "Use as reference for the whole pass (static review and motion); do not build or edit anything now." Phase A runs → also call `frontend-design:frontend-design` the same way. A default from either skill contradicting a `DESIGN.md` rule loses: follow `DESIGN.md`, list conflict in summary.
   - `modern-web-guidance` is a query tool, not a rule set: do not load here. Call it per feature right before code-writing steps 9, 12.3, 13.2, 14 (see "Modern web guidance").

5. **Screenshot protocol** (used by steps 6, 11, 17 and UX check; identical every time so comparisons are fair). Skill `agent-browser`. No URL given → detect dev command/port (`package.json` scripts), start in background, open it. Capture 375 / 768 / 1024 / 1440 px, full page, with `prefers-reduced-motion: reduce` emulated (or wait until animations settle) so entrance/scroll-reveal motion is not caught mid-flight. Also check 320 px has no horizontal scroll (reflow; screenshot only on failure). Save to scratchpad.
   - **Overlay shots** (375 px): open one representative of each overlay type the project has (Select, multi-select, DropdownMenu/avatar menu, Dialog/AlertDialog, date picker, Popover, list filter, notifications, sidebar), capture each.
   - Cannot run, or overlay cannot be triggered → say so, fall back to code-only review, mark every affected finding "unverified visually".

## Modern web guidance (used by steps 9, 12.3, 13.2, 14)

Before writing HTML/CSS/client JS for a fix touching a platform feature (dialog/popover, container queries, dark mode, forms, scrollbars, images/LCP, a11y, view transitions, scroll-driven animations, reveals, `content-visibility`, CWV), call Skill `modern-web-guidance` with `args` = feature + file list + task: "Search and retrieve guides for this feature now; do not edit any file." Then implement per retrieved guide. One focused query per feature (2–5 words, no framework or app nouns). No relevant guide → implement as usual, note it. Pass key points to sub-skills (`animate`) in their `args`. Skip for backend, tooling, copy-only changes.

## Phase A — Static design (skipped by `--only motion`, except step 6 and UX rules check)

6. **Baseline.** Capture per step 5. Reference for steps 11 and 17.

### UX rules check (every run, right after step 6)

Mandatory on every flag path. Never skipped; never "no gap" without evidence.

a. **Verdict per section.** For each of 13 sections of `UX-RULES.md`, one verdict: `pass` (one-line evidence), `gap` (`file:line` or screenshot region, rule violated, fix with exact values, impact high/med/low), `N/A` (project has no such situation; say why), `unverified` (needs real hardware or production traffic).

b. **How to check**, three tiers:
   - **Code grep/read**: `100vh`/`h-screen`; `user-scalable=no`/`maximum-scale`; Enter-to-send without `isComposing`; `onClick` + `router.push` instead of real `<a>`; clickable `div`; icon-only buttons without `aria-label`; missing `inputmode`/`autocomplete`/`enterkeyhint`; floating Select/DropdownMenu/Popover with no `< md` Drawer branch; confirm dialogs on reversible actions; "確定"/"OK" button labels; `target="_blank"` without `rel`; hover-only actions; missing `viewport-fit=cover`/safe-area padding; skeleton/spinner timing.
   - **Browser**: step 5 overlay shots and 320 px reflow; click through where needed (single-select closes on pick, multi-select stays open until "確認", confirm above cancel, 48px rows).
   - **Hardware or production only**: soft keyboard overlap, sticky hover, click delay, Core Web Vitals p75 → always `unverified`, never claimed passed.

c. **Routing.**
   - §7 (gestures) and §12 (motion) gaps are motion: queue for steps 12–13 with `file:line`, pass rule text in those sub-skills' `args`. Phase A never edits animation code.
   - Other gaps fixed here. Phase A runs → add to step 9 as own "UX rules" group; step 11 re-checks changed sections. `--only motion` → Pick here and patch before step 12.
   - Overlap with `--m` / `mobile-native` (§5, §8): list each issue once.

d. **Structural fixes.** Anything adding a route (long form → page), Dialog/Drawer wrapper, new component or dependency is structural: label option "structural", name files it creates, never apply unless selected. New dependencies: always ask first.

7. **shadcn audit (conditional).** Only if project root has `components.json` AND `package.json` dependencies include `react`; otherwise note "not a shadcn project, shadscan skipped", continue.
   - From project root (do not `cd`): `npx -y @shadscan/cli --json`, output saved to scratchpad. Read-only.
   - Parse JSON whatever the exit code. Command itself fails (offline, unsupported layout) → note reason, continue; never abort.
   - Never use `--apply`, `setup`, `mcp`.

8. **Score.** For 6 static dimensions in CRITERIA.md (typography, whitespace, visual hierarchy, color, responsive, originality) list concrete gaps: `file:line` or screenshot region, what is wrong, fix with exact values, impact (high/med/low).
   - CRITERIA.md checkpoint or skill default contradicting a `DESIGN.md` rule is not a gap: list conflict in summary.
   - Step 7 ran → add 7th group "shadcn audit": each item with rule id, `file:line`, fix; severity critical/high → high, medium → med, low → low. Issue already covered by a static dimension → list once.
   - UX rule gaps belong to "UX rules check"; do not re-score, only dedupe.
   - **Motion findings are queued, not patched here.** Missing motion (e.g. shadscan interaction/states items) → queue for step 12 as extra proposals. Badly built existing motion → queue for step 13. Keep `file:line` for each.

9. **Pick + patch.** Pick one option per static gap, plus separate group for UX-check gaps (structural ones labeled per UX check d). None selected → skip. Run "Modern web guidance" for fixes touching a platform feature. Implement selected fixes, in-scope files only, using existing tokens (no hardcoded colors if project uses tokens). Ad placements: follow AdSense policy; never move or restyle ad units to mimic content or encourage clicks. Do not touch animation/transition code.

10. **Mobile (only `--m`).** Call Skill `mobile-native` with `args` = scope + file list + task: "Audit these files against your checklist now and apply the fixes." Mostly layout CSS (100vh, safe-area, input zoom, tap, overscroll), so runs here; step 11's 375px shots verify it. Items already raised by UX check (§5, §8) listed once. Items needing real hardware → list in summary, never claim verified.

11. **Re-review loop.** Re-screenshot per step 5; re-score changed dimensions and re-check changed UX sections (incl. overlay shots) only. shadscan items patched → rerun step 7 command, compare score and remaining items.
    - New or remaining high/med gap → back to step 9 (next round).
    - Max 3 rounds. Same gap survives two rounds → stop, escalate to user.
    - Only low gaps or none → stop.

## Phase B — Motion (skipped by `--only design`)

12. **Remove, then add.** Subtract before adding so later steps never tune motion that should not exist.
    1. Call Skill `remove-animations` with `args` = scope + file list + task: "Audit these files and output Part 1 (removed/reduced), Part 2 (kept) and Part 3 now. Do NOT edit any file yet; list proposed deletions/reductions only." Pick one option per removal with `file:line` and reason. Apply selected yourself, subtract-only. Keep skill's "kept but badly built" items for step 13. Nothing to remove → note it.
    2. Call Skill `find-animation-opportunities` with `args` = scope + file list + queued missing-motion items from step 8 and UX check + UX-RULES §7 and §12 text (high-frequency actions do not animate; Drawer gestures follow finger 1:1, exit the way they entered, keep a tap alternative) + task: "Scan these files and output proposals with exact values now." Read-only. No proposals survive → note "no new animation needed", go to step 13.
    3. Pick one option per proposal with location and values (property, easing, duration). Run "Modern web guidance" for proposals using view transitions, scroll-driven animation, reveals or `prefers-reduced-motion`. Then call Skill `animate` with `args` = selected proposals (file, trigger, property, easing, duration) + retrieved guide key points + task "Implement now." Respect project CLAUDE.md, tokens, `prefers-reduced-motion`, touch/responsive behavior.

13. **Improve existing motion (audit + apply).** `improve-animations` is read-only: writes plans (to `plans/` or `animation-plans/`), never source.
    1. Call Skill `improve-animations` with `args` = scope + file list + "kept but badly built" items from step 12 + queued badly-built items from step 8 and UX check + UX-RULES §7 and §12 text + task: "Audit existing animation/motion in these files only, including motion just added; output prioritized findings and implementation plans now."
    2. Apply plans yourself (no `improve-animations execute`). Pick one option per finding with `file:line`, change, priority. Run "Modern web guidance" when a plan touches a platform feature. Implement each selected plan exactly as specified, in-scope files only; retrieved guide only fills gaps, never overrides plan values. None selected → leave plans on disk, say so in summary. Plans never edited or deleted; mark applied ones in summary.

14. **Performance.** Call Skill `animation-performance` with `args` = scope + file list (incl. motion added or changed in steps 12–13) + task: "Audit for frame-budget issues (non-composite properties, will-change misuse, main-thread work, React per-frame state) and apply the fixes now." CWV (LCP/INP/CLS) or `content-visibility` fixes → run "Modern web guidance" first. Fix real issues directly; ask first only when a fix changes visual result. Nothing found → note it.

15. **Mobile when Phase A is skipped (only `--m` with `--only motion`).** Same call as step 10. Step 17 is its only visual check.

## Phase C — Verify (only if Phase B ran)

16. **Review.** `review-animations` sets `disable-model-invocation`, so Skill cannot load it. Read `${CLAUDE_SKILL_DIR}/../review-animations/SKILL.md` (fallback `~/.claude/skills/review-animations/SKILL.md`; plus `STANDARDS.md` when a finding needs exact values). Review only files/hunks changed in Phase B and step 15 (Phase A static patches not reviewed here), also against UX-RULES §7 and §12. Skip its Initial Response greeting.
    - Real issue → fix, then re-review. Max 3 rounds.
    - Unverifiable / likely false positive → list it, ask user.
    - Same finding survives two rounds → stop, escalate.

17. **Final screenshots.** Capture per step 5; compare with step 6 baseline (or last step 11 shots) for layout regressions from Phase B or step 15. Regression → fix once, re-shoot; still present → escalate to user, no further loop. shadscan items patched in Phase B → rerun step 7 command, compare. No screenshot capability → mark "unverified visually".

## Summary

18. **Summarize.** Lead with "UX rules" table: one row per `UX-RULES.md` section (§1–§13), verdict `pass` / `gap fixed` / `gap skipped` / `queued for Phase B` / `N/A` / `unverified`, one-line reason or `file:line`; list structural fixes taken or left. Then: scope, flags (`--only`, `--m`), static rounds run, static gaps fixed (`file:line`), gaps skipped and why, shadscan score before → after (or why skipped), `DESIGN.md` conflicts, removals applied/kept, proposals taken/skipped, improve plans applied/left, performance fixes, mobile fixes and hardware-only items, review rounds, final-screenshot result, unverified items, findings deliberately skipped and why.
    - `modern-web-guidance` consulted → end with its `### Modern Web Guidance` section per its Step 4 (one bullet per applied guide `<id>`, or one sentence on what was checked and why none applied).
    - `--only design`: list every queued motion item from step 8 (`file:line`), suggest `/up-design --only motion`.
    - `--only motion`: note static design not reviewed; suggest `/up-design --only design`.
    - Add one line suggesting `/learn-taste` only if run showed correction signals (user edited a file this run changed, asked to undo/redo, deselected a proposal and gave a reason, or a gap/finding escalated after surviving two rounds); otherwise omit.

## Rules

- Precedence: project `CLAUDE.md`, `DESIGN.md`, design tokens, AdSense policy outrank this skill and sub-skills. Then `UX-RULES.md`, then `modern-web-guidance` guides, then CRITERIA.md and sub-skill defaults. List conflicts in summary.
- UX rules check runs on every invocation, every flag path; run without per-section UX table in summary is incomplete.
- No `git commit` or `git push`.
- Edit only files in scope (plus plan files written by `improve-animations`). Exception: structural UX fix (new route, wrapper component) the user explicitly selected may create files outside scope list.
- Phase A never touches animation/transition code; step 12.1 only subtracts, never adds or retunes motion.
- No animation libraries. `animate` decides CSS is insufficient → ask user first.
- shadscan only via `npx -y @shadscan/cli`; no `--apply`, no installing its hook, skill or MCP.
- Never call a sub-skill with empty `args`.
- "Looks better" without screenshot evidence is not a verified fix.
