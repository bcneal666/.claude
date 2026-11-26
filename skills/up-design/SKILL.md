---
name: up-design
description: "Run one UI diagnosis-and-polish pass on the current front-end project: find layout, mobile, performance and animation problems and write them into a report, fix them directly, then record the user's rules in lint, DESIGN.md or a project skill."
argument-hint: "[--full] [--m]"
disable-model-invocation: true
---

# up-design

One repeatable UI pass on the current project: diagnose → write report → fix directly → verify → distill rules. User triggers it manually at irregular times; every run builds on the previous run's state, so work incrementally and accumulate perf baseline and rules.

Order rationale: tuning animation on an unstable layout is wasted work, so **fix what is broken first**; redundant animation disturbs audit and perf measurement, so **then remove excess**; only then **add motion that is truly needed**. Rule distillation goes last so the next agent knows the project's preferences from the start and does not repeat mistakes.

## Files

`<skill-dir>` = directory of this SKILL.md. Everything the run needs ships in this skill; read each file at the step that names it.

| File                                | Read at                               | Purpose                                                              |
| ----------------------------------- | ------------------------------------- | -------------------------------------------------------------------- |
| `references/design-judgment.md`     | step 1.4                              | Judgment baseline for the whole run                                  |
| `references/ux-rules.md`            | step 1.6                              | 13-section UX checklist (diagnostic baseline)                        |
| `references/criteria.md`            | step 1.6                              | Static design criteria                                               |
| `references/stress-mobile.md`       | step 2.5–2.7                          | Worst-case data, mobile fixes (`--m`), Sonner checks                 |
| `references/motion-audit.md`        | step 2.8–2.11, 4.2                    | Performance, removal, audit of existing motion, missing motion       |
| `references/motion-build.md`        | step 3.3                              | Implementing animation                                               |
| `references/motion-review.md`       | step 4.1                              | Reviewing this run's animation                                       |
| `references/rule-routing.md`        | step 5                                | Turning the user's corrections into lint / DESIGN.md / project skill |
| `references/modern-web-guidance.md` | step 3, before platform-feature fixes | Search and retrieve current platform guides, report format           |
| `assets/*-template.md`              | as named                              | Report, perf baseline, DESIGN.md, project skill skeletons            |

Scripts use only Node.js 18+ built-ins; run on Windows and Linux from any directory inside the project. `scripts/scope.mjs` previews scope without creating files (`start_run.mjs` already includes its logic).

## Arguments

Any order, space-separated, e.g. `/up-design m`, `/up-design --full --m`. Pass them to the scripts as given; the scripts accept these forms.

| Argument | Meaning                                                                                                                        | Alias  |
| -------- | ------------------------------------------------------------------------------------------------------------------------------ | ------ |
| `--full` | Force whole-project check, no incremental                                                                                      | `full` |
| `--m`    | Project has mobile needs: apply the mobile section of `stress-mobile.md`, consider touch and small screens in every other step | `m`    |

Natural-language equivalents count as arguments: 「全面檢查」 = `--full`, 「要顧手機版」 = `--m`. Without `--m`/`m`, assume no mobile need; do not guess: a wrong guess wastes work on a desktop project or silently misses mobile problems.

## Flow

### 1. Prepare

1. Run inside the project (script finds the git root; non-git → current directory), passing the user's arguments:

   ```bash
   node <skill-dir>/scripts/start_run.mjs [--full|full] [--m|m]
   ```

   It creates `./up-design/` (first run or directory missing), ensures the directory is not ignored by `.gitignore`, decides this run's mode and scope, and creates this run's report from the template. Output JSON: `project_root`, `is_git`, `head`, `mode`, `reason`, `mobile`, `uses_sonner`, `last_run`, `file_count`, `files`, `created_state_dir`, `gitignore` (`status`, `actions`, `warnings`), `report_path`. Do all later work under `project_root`. Files `.ts` / `.js` clearly unrelated to UI: skip.

2. `gitignore.status` is `still_ignored` → fix `.gitignore` by hand per `warnings` and record it in the report.
3. Tell the user in one sentence the mode, reason and file count, then start without waiting for confirmation: manual trigger already means consent.
4. Read `references/design-judgment.md` as the judgment baseline for the whole run.
5. Read existing project rules: lint config, `DESIGN.md`, `.claude/skills/design-*/`, `CLAUDE.md` / `AGENTS.md`, `.claude/rules/*.md`, design tokens (CSS variables, tailwind config). Follow them all run; on conflict with the references' defaults, project rules win because they are the user's explicit preference for this project.
6. Read `references/ux-rules.md` and `references/criteria.md`. They are diagnostic baselines, not project rules (see Boundaries). Priority: project rules > ux-rules > modern-web-guidance > criteria and the other references; list conflicts in the report.

**Screen verification** (step 2 baseline, step 4 final; same method so they compare): use the `agent-browser` CLI; run `agent-browser skills get core` once first for its current usage. Detect dev command and port (`package.json` scripts), start in background, open. Capture full-page at 375 / 768 / 1024 / 1440px with `prefers-reduced-motion: reduce` emulated (or wait for animation to stop) to avoid mid-animation shots. Also check 320px has no horizontal scroll (screenshot only on failure). At 375px open each overlay type the project has (Select, DropdownMenu, Dialog/AlertDialog, date, Popover, filter, notification, sidebar) and capture one each. Save screenshots to the scratchpad. Cannot start or overlay won't open → fall back to code only and mark affected items 「未驗證（無畫面）」. A "looks better" without screenshots is not a verified fix.

**modern-web-guidance**: fixes writing HTML / CSS / client JS that uses a platform feature → first look up guides per `references/modern-web-guidance.md` (scope, skip cases, report section live there); carry key points into step 3 animation work.

`file_count` is 0 → skip steps 2–4, go to step 5 rules check, then wrap up.

### 2. Diagnose

Find problems only; edit no file. Survey everything before acting so fix order is sensible and nothing is edited just before proving deletable. References named below are diagnosis-only: they list findings and fixes, never apply them.

1. Screen baseline: capture per "Screen verification", the baseline for step 4.
2. **UX rules check**: per the 13 sections of `references/ux-rules.md`, check **in-scope files only**; one verdict per section:
   - `pass` — one line of evidence
   - `gap` — `file:line` or screenshot region, violated rule, fix with numbers, impact high/medium/low
   - `N/A` — no such situation, or out of scope
   - `未驗證` — needs real device or live traffic (soft-keyboard occlusion, sticky hover, tap delay, CWV p75); never claim pass

   Method: grep/read code (`100vh` / `h-screen`, `user-scalable=no`, Enter-submit without `isComposing` guard, `onClick` + `router.push` instead of `<a>`, clickable `div`, icon buttons without `aria-label`, missing `inputmode` / `autocomplete`, floating Select / Menu / Popover without a mobile Drawer branch, confirm dialog on an undoable action, 「確定」「OK」 button text, `target="_blank"` without `rel`, actions shown only on hover, missing `viewport-fit=cover` / safe-area) plus the screen-verification screenshots. Out-of-scope problems go in the report only.
   - §7 (gestures) and §12 (motion) gaps merge into animation fixes; the rest into 「穩定性」. Items overlapping the mobile section of `stress-mobile.md` are listed once.
   - **Structural fixes** (new route, Dialog/Drawer wrapper, new component, new dependency) are not applied; list in 「未解決」 with a suggested approach.

3. **Static design**: score per `references/criteria.md`. "Auto-fix" items merge into 「穩定性」; "report-only" items (originality, visual hierarchy, color ratio, layout) go in the report's 「設計建議（未套用）」. A criterion conflicting with a project rule is not a gap; list it as a conflict in the report.
4. **shadcn audit** (conditional): run only if the project root has `components.json` and `package.json` dependencies include `react`; otherwise note 「非 shadcn 專案，略過」. Run `npx -y @shadscan/cli --json` in the project root (do not `cd`), save output to the scratchpad, parse JSON regardless of exit code; command failure (offline, unsupported structure) → record reason and continue. Categories: foundation, interaction, states, accessibility, forms, production-polish. Do not use `--apply`, `setup`, `mcp`, and do not install its hook, skill or MCP: this step is read-only. Each item = one gap with rule id and `file:line`; critical/high → high priority, medium → medium, low → low; list duplicates of other diagnoses once; animation items merge into animation fixes.
5. **Worst-case data** (`stress-mobile.md` §1): overflow, truncation, empty states, extreme data. Skip when no data-rendering component is in scope.
6. **Mobile** (`stress-mobile.md` §2): only when `mobile` is true.
7. **Sonner** (`stress-mobile.md` §3): only when `uses_sonner` is true. shadcn/ui's toast component wraps Sonner, so shadcn projects usually qualify.
8. **Performance** (`motion-audit.md` §A): measure and compare with `up-design/perf-baseline.md`.
9. **Removal proposals** (`motion-audit.md` §B): list animations to remove; proposals only. "Kept but poorly done" items go to the next step. Skip when no animation is in scope.
10. **Audit of existing motion** (`motion-audit.md` §C; skip when no animation is in scope): input = the "kept but poorly done" items, the animation gaps queued so far, and ux-rules §7 and §12.
11. **Missing motion** (`motion-audit.md` §D): full mode only, because finding missing motion needs the whole app. Input = queued "missing motion" items (incl. shadscan interaction / states) and ux-rules §7 and §12.
12. Fill the diagnosis results into the report sections 「UX 規則」「診斷」「設計建議（未套用）」, sorted by priority into the fix list.

### 3. Fix and optimize

Run right after the diagnosis sections are written; do not ask the user: they want a one-shot flow, and the report is a record for later inspection, not an approval request.

1. Execute in list order: stability (UX rule gaps, static-design auto-fix items, non-animation shadscan items) → remove animations → performance → adjust and add animations. Edit in-scope files only; use the project's existing tokens (project uses tokens → no hard-coded colors). Fixes involving platform features first consult "modern-web-guidance".
2. Stability fixes do not touch animation or transition code; removal only subtracts and does not add or retune motion, so each phase stays inspectable on its own. Items needing an animation library, new dependency, new route or new component are not done; list in 「未解決」. Follow AdSense policy for ad slots: do not move or disguise ad blocks as content or bait clicks.
3. Implement animation per `references/motion-build.md`. Use springs and physical-feel motion only where truly needed, so the whole UI does not overbounce. Toast fixes follow `stress-mobile.md` §3. When CSS is insufficient and a library would be needed, do not install; list in 「未解決」.
4. Many independent list items → may delegate to sub-agents in parallel.

### 4. Verify

1. Review this run's animation per `references/motion-review.md` (skip when this run added or changed no animation): only animation added or changed this run, against ux-rules §7 and §12. Blocked → back to step 3, max 2 retries; still failing → list as unresolved. Do not lower the standard to pass: an honest 「未解決」 in the report beats a fake pass.
2. Re-measure performance per `motion-audit.md` §A. Regression → list in report; no overall regression → update `up-design/perf-baseline.md` per `assets/perf-baseline-template.md` (first write creates it from the template), so the next run's baseline only improves.
3. Screen acceptance: recapture per "Screen verification", compare with the step 2 baseline for layout regressions from this run. Regression → fix once and recapture; still regressing → unresolved, no further loop. shadscan items fixed → rerun the same command and compare score and remaining items. No screenshot capability → mark 「未驗證（無畫面）」.
4. Project has lint or typecheck command → run each once. Fix errors caused by this run; pre-existing errors are not handled, only recorded in the report.

### 5. Distill rules

Every run may expose preferences the project has not written down. Write them as rules so the next run and everyday agents obey automatically.

1. Follow `references/rule-routing.md` to collect, filter, generalize and choose the location. Write directly without stopping for approval: the user wants a one-shot flow, and every rule change is listed in the report for later inspection and revert.
2. Rule sources are the user only: this run's corrections, edits, confirmed choices, and preferences attached to the trigger. Reasons `motion-review` blocked and recurring problems are the agent's judgment; do not write them, list only in 「建議規則（未寫入）」. A run where the user expressed no preference writing no rule is normal.
3. Location: anything violations of which can be caught by matching code → **lint**, plus a one-line record of why in **DESIGN.md**; everything else → matching **DESIGN.md** section; section too long and relevant only to some tasks → move to a **project skill**. Lint first because machine checks run every time and do not depend on an agent remembering.
4. Only when this run wrote to DESIGN.md: ensure `CLAUDE.md` or `AGENTS.md` points to it (see `references/rule-routing.md` section 6); add the pointer if missing, or no agent reads these rules. No rule written → create no DESIGN.md, CLAUDE.md or AGENTS.md.
5. Rules must be concrete and executable. "Animation should feel natural" changes nothing for the next agent; "modal enter uses ease-out, duration ≤200ms" does.

### 6. Wrap up

1. Complete the remaining report sections.
2. Run:

   ```bash
   node <skill-dir>/scripts/finish_run.mjs --mode <quick|full>
   ```

   It writes the current HEAD hash and time to `up-design/last-run.json`.

3. Reply to the user: report path, fix count, unresolved items, which rules were added or fixed and where.

## Boundaries

Each boundary exists so the user can inspect and trust what a one-shot run did.

- **No git write operations** (commit, branch, stash, merge, push): the user inspects the working tree and commits themselves; the report lists changed files per phase to make split commits easy.
- **Edit in-scope files only.** Exceptions are files this skill maintains: lint config, `DESIGN.md`, `.claude/skills/design-*/`, `CLAUDE.md` / `AGENTS.md` (only the one pointer line to DESIGN.md), `.gitignore`, `./up-design/`. Out-of-scope problems go in the report only — in quick mode, touching files the user did not expect makes this run's changes hard to inspect.
- **Keep `./up-design/` under version control** so rules and baselines are shared across machines and members; do not add it to `.gitignore`. `last-run.json` is written only by `finish_run.mjs`, not by hand, because a hand edit breaks the quick/full decision; old reports are history, do not delete.
- **No new dependencies**: no animation library, lint tool, bottom-sheet or gesture package; shadscan runs read-only via `npx -y @shadscan/cli`. Items needing these go in 「未解決」.
- **ux-rules and criteria are diagnostic baselines, not user preferences**: do not write them to DESIGN.md or lint; only preferences the user expressed go through step 5.
- **Screen verification is not a precondition for passing**: no dev server or screenshot capability → fall back to code only and mark 「未驗證（無畫面）」; do not claim verified.
- Time always Asia/Taipei (UTC+8).
