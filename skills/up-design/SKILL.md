---
name: up-design
description: Screenshot-driven visual design review loop on the current project's UI — typography, whitespace, hierarchy, color, responsive, originality — scored against CRITERIA.md, user picks fixes, max 3 rounds. Motion delegated to /up-animate. Optional @path or URL scope.
argument-hint: "[@path ... | URL]"
disable-model-invocation: true
---

Visual design pass over the current project's UI (cwd): baseline screenshots → score → pick → patch → re-screenshot, max 3 rounds. Stay in main conversation; do not fork.

Arguments: `$ARGUMENTS`

Bar: award-tier craft (Awwwards / Webby / FWA). Concrete checkpoints live in `${CLAUDE_SKILL_DIR}/CRITERIA.md` (fallback `~/.claude/skills/up-design/CRITERIA.md`); read it first. Judge against it, not against vague "award feel".

## Steps

1. **Parse arguments.** Tokens starting with `http` → target URL. Others → scope paths, strip leading `@`. Path missing → list it and stop.

2. **Resolve scope** (project = cwd).
   - Paths given → use them (folders expand to UI files).
   - None → auto-detect UI dirs: `app/`, `src/app/`, `pages/`, `src/pages/`, `components/`, `src/components/`, `src/routes/`, else `src/**`. Exclude `**/api/**`, `**/server/**`, `node_modules`, build output.
   - UI files only: `*.tsx *.jsx *.vue *.svelte *.astro *.css *.scss *.html`. Nothing detected → ask for a path and stop.
   - Read project `CLAUDE.md` and design tokens (CSS vars / tailwind config). These are constraints, never overridden.

3. **Baseline screenshots.** Use skill `agent-browser`. No URL given → detect dev command/port (`package.json` scripts), start it in background, open it. Capture 375 / 768 / 1440 px widths, full page, saved to scratchpad. Cannot run → say so, fall back to code-only review and mark every finding "unverified visually".

4. **Load design rules.** Call Skill `frontend-design:frontend-design` and `emil-design-eng` with `args` = scope + task: "Use as reference for the review; do not build anything now." Never call with empty args.

5. **Score.** For the 6 static dimensions in CRITERIA.md (typography, whitespace, visual hierarchy, color, responsive, originality) list concrete gaps: `file:line` or screenshot region, what is wrong, proposed fix with exact values, impact (high/med/low). No gap → write "no gap" with one-line evidence. Never invent gaps to fill a quota.
   - Motion and micro-interaction are out of scope here → note "run `/up-animate`" in summary.

6. **Pick.** AskUserQuestion (multiSelect, ≤4 options per question, "All" option), one option per gap. None selected → stop and summarize.

7. **Patch.** Implement selected fixes, in-scope files only, using existing tokens (no hardcoded colors if project uses tokens). Ad placements: follow AdSense policy; never move or restyle ad units in a way that mimics content or encourages clicks.

8. **Re-review loop.** Re-screenshot same widths, re-score changed dimensions only.
   - New or remaining high/med gap → back to step 6 (counts as next round).
   - Max 3 rounds. Same gap survives two rounds → stop, escalate to user.
   - Only low gaps or none → stop.

9. **Summarize.** Scope, rounds run, gaps fixed (`file:line`), gaps skipped and why, unverified items, reminder to run `/up-animate` for motion.

## Rules

- No `git commit` or `git push`.
- Edit only files in scope.
- Project rules, design tokens and AdSense policy outrank this skill.
- Do not touch animation/transition code; delegate to `/up-animate`.
- "Looks better" without screenshot evidence is not a verified fix.
