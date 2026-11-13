---
name: up-design
description: Screenshot-driven visual design review loop on the current project's UI — typography, whitespace, hierarchy, color, responsive, originality — scored against CRITERIA.md, user picks fixes, max 3 rounds. shadcn projects also get a shadscan source audit. Motion delegated to /up-animate. Optional @path or URL scope.
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
   - Read project `CLAUDE.md`, repo-root `DESIGN.md` (if present; rules recorded by `/learn-taste`) and design tokens (CSS vars / tailwind config). These are constraints, never overridden.

3. **Baseline screenshots.** Use skill `agent-browser`. No URL given → detect dev command/port (`package.json` scripts), start it in background, open it. Capture 375 / 768 / 1440 px widths, full page, saved to scratchpad. Cannot run → say so, fall back to code-only review and mark every finding "unverified visually".

4. **shadcn audit (conditional).** Run only if project root has `components.json` AND `package.json` dependencies include `react`; otherwise note "not a shadcn project, shadscan skipped" and continue.
   - From the project root (do not `cd`): `npx -y @shadscan/cli --json`, output saved to scratchpad. Read-only.
   - Parse the JSON whatever the exit code (a low score may exit non-zero). Command itself fails (offline, unsupported layout) → note the reason, continue; never abort.
   - Never use `--apply`, `setup`, or `mcp` (they launch other agents or write hooks).

5. **Load design rules.** Call Skill `frontend-design:frontend-design` and `emil-design-eng` with `args` = scope + task: "Use as reference for the review; do not build anything now." Never call with empty args.

6. **Score.** For the 6 static dimensions in CRITERIA.md (typography, whitespace, visual hierarchy, color, responsive, originality) list concrete gaps: `file:line` or screenshot region, what is wrong, proposed fix with exact values, impact (high/med/low). No gap → write "no gap" with one-line evidence. Never invent gaps to fill a quota.
   - A CRITERIA.md checkpoint, or a frontend-design / emil-design-eng default, that contradicts a `DESIGN.md` rule is not a gap: do not propose a fix, list the conflict in the summary.
   - If step 4 ran, add a 7th group "shadcn audit": each work item with rule id, `file:line`, fix; severity critical/high → high, medium → med, low → low. List an issue once if a static dimension already covers it (e.g. horizontal overflow).
   - Motion and micro-interaction are out of scope here → note "run `/up-animate`" in summary.

7. **Pick.** AskUserQuestion (multiSelect, ≤4 options per question, "All" option), one option per gap. None selected → stop and summarize.

8. **Patch.** Implement selected fixes, in-scope files only, using existing tokens (no hardcoded colors if project uses tokens). Ad placements: follow AdSense policy; never move or restyle ad units in a way that mimics content or encourages clicks.

9. **Re-review loop.** Re-screenshot same widths, re-score changed dimensions only. If shadscan items were patched, rerun the step 4 command and compare score and remaining items.
   - New or remaining high/med gap → back to step 7 (counts as next round).
   - Max 3 rounds. Same gap survives two rounds → stop, escalate to user.
   - Only low gaps or none → stop.

10. **Summarize.** Scope, rounds run, gaps fixed (`file:line`), gaps skipped and why, unverified items, shadscan score before → after (or why skipped), reminder to run `/up-animate` for motion, `DESIGN.md` conflicts found. Add one line suggesting `/learn-taste` only if this run showed correction signals (user edited a file this run patched, asked to undo/redo, deselected a proposal and gave a reason, or a gap was escalated after surviving two rounds); otherwise omit it.

## Rules

- No `git commit` or `git push`.
- Edit only files in scope.
- Project rules, `DESIGN.md`, design tokens and AdSense policy outrank this skill.
- Do not touch animation/transition code; delegate to `/up-animate`.
- shadscan only via `npx -y @shadscan/cli`; no `--apply`, no installing its hook, skill or MCP.
- "Looks better" without screenshot evidence is not a verified fix.
