---
name: up-design
description: "Run one UI diagnosis-and-polish pass on the current front-end project: find layout, mobile, performance and animation problems and write them into a report, fix them directly, then record the user's rules in lint, DESIGN.md or a project skill. Use when the user says up-design, run a UI pass, polish the interface, or check animation or front-end experience."
argument-hint: "[--full] [--m]"
---

# up-design

One repeatable UI pass on the current project: diagnose → write report → fix directly → verify → distill rules. User triggers it manually at irregular times; every run builds on the previous run's state, so work incrementally and accumulate perf baseline and rules.

Order rationale: tuning animation on an unstable layout is wasted work, so **fix what is broken first**; redundant animation disturbs audit and perf measurement, so **then remove excess**; only then **add motion that is truly needed**. Rule distillation goes last so the next agent knows the project's preferences from the start and does not repeat mistakes.

## File guide

| File                               | Read when                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------ |
| `references/skill-map.md`          | Step 1: confirm installed emilkowalski skill names and purposes                      |
| `references/ux-rules.md`           | Step 2: 13-section baseline for the UX rules check                                   |
| `references/criteria.md`           | Step 2: static design criteria (auto-fix / report-only) and shadscan                 |
| `references/scope-and-state.md`    | Need quick/full decision logic or state file formats                                 |
| `references/rule-routing.md`       | Step 5: rule collection, target location, format, lint                               |
| `assets/report-template.md`        | Step 2: create this run's report                                                     |
| `assets/perf-baseline-template.md` | First write of `perf-baseline.md`                                                    |
| `assets/design-md-template.md`     | Creating DESIGN.md or one of its sections                                            |
| `assets/project-skill-template.md` | DESIGN.md section too long, moving it to a project skill                             |
| `scripts/start_run.mjs`            | Step 1, mandatory                                                                    |
| `scripts/finish_run.mjs`           | Step 6, mandatory                                                                    |
| `scripts/find_skill.mjs`           | Step 1: locate SKILL.md of skills that cannot be invoked directly                    |
| `scripts/scope.mjs`                | Preview scope without creating any file (`start_run.mjs` already includes its logic) |

Scripts use only Node.js 18+ built-ins, run on Windows and Linux, and can run from any directory inside the project. `<skill-dir>` = directory of this SKILL.md.

## Prerequisite

This skill chains emilkowalski/skills; install first:

```bash
npx skills@latest add emilkowalski/skills
```

A skill not installed → skip its step and note it in the report. Never simulate its behavior: simulated judgment differs from the original's standard and distorts the report.

## Arguments

Any order, space-separated, e.g. `/up-design m`, `/up-design --full --m`. Pass them to the scripts as given; the scripts accept these forms.

| Argument | Meaning                                                                                             | Alias  |
| -------- | --------------------------------------------------------------------------------------------------- | ------ |
| `--full` | Force whole-project check, no incremental                                                           | `full` |
| `--m`    | Project has mobile needs: run `mobile-native`, consider touch and small screens in every other step | `m`    |

Natural-language equivalents count as arguments: 「全面檢查」 = `--full`, 「要顧手機版」 = `--m`. Without `--m`/`m`, assume no mobile need; never guess — a wrong guess does wasted work on a desktop project or silently misses mobile problems.

## Flow

### 1. Prepare

1. Run inside the project (script finds the git root; non-git → current directory), passing the user's arguments:

   ```bash
   node <skill-dir>/scripts/start_run.mjs [--full|full] [--m|m]
   ```

   It creates `./up-design/` (first run or directory missing), ensures the directory is not ignored by `.gitignore`, decides this run's mode and scope, and creates this run's report from the template. Output JSON: `mode`, `reason`, `files`, `mobile`, `uses_sonner`, `report_path`, `gitignore`. Do all later work under `project_root`.

2. `gitignore.status` is `still_ignored` → fix `.gitignore` by hand per `warnings` and record it in the report.
3. Tell the user in one sentence the mode, reason and file count, then start without waiting for confirmation: manual trigger already means consent.
4. Read `references/skill-map.md` to confirm installed skill names. `review-animations` and `learn-taste` set `disable-model-invocation: true`, so the Skill tool cannot call them. Run:

   ```bash
   node <skill-dir>/scripts/find_skill.mjs review-animations learn-taste
   ```

   When needed later, read the returned SKILL.md and follow it (`review-animations`: also read `STANDARDS.md` in the same directory). Their opening "Initial Response" is for manual invocation; ignore it. `null` = not installed → skip per Prerequisite.

5. Load `emil-design-eng` as the judgment baseline for the whole run; `args` = scope, file list, and task "Use as reference for the whole run; do not create or modify anything now". Diagnosis also covers static design, so load `frontend-design:frontend-design` the same way (not installed → skip).
6. Read existing project rules: lint config, `DESIGN.md`, `.claude/skills/design-*/`, `CLAUDE.md` / `AGENTS.md`, `.claude/rules/*.md`, design tokens (CSS variables, tailwind config). Obey them all run; on conflict with emilkowalski skill defaults, project rules win — they are the user's explicit preference for this project.
7. Read `references/ux-rules.md` and `references/criteria.md`. Like `emil-design-eng` they are diagnostic baselines, **not project rules; never write them into DESIGN.md**. Priority: project rules > ux-rules > modern-web-guidance > criteria and sub-skill defaults; list conflicts in the report.

**Sub-skill call convention**: `args` always = scope + file list + relevant project rules + explicit task; never empty. Diagnosis-phase task strings must say "Audit only. Do NOT edit any file; output findings now." — `mobile-native`, `animation-performance` and `remove-animations` edit files by default, which would break "diagnosis does not edit". `improve-animations` only writes a plan and never edits source; the main flow implements the plan.

**Screen verification** (step 2 baseline, step 4 final; same method so they compare): use `agent-browser`. Detect dev command and port (`package.json` scripts), start in background, open. Capture full-page at 375 / 768 / 1024 / 1440px with `prefers-reduced-motion: reduce` emulated (or wait for animation to stop) to avoid mid-animation shots. Also check 320px has no horizontal scroll (screenshot only on failure). At 375px open each overlay type the project has (Select, DropdownMenu, Dialog/AlertDialog, date, Popover, filter, notification, sidebar) and capture one each. Save screenshots to the scratchpad. Cannot start or overlay won't open → fall back to code only and mark affected items 「未驗證（無畫面）」. A "looks better" without screenshots is not a verified fix.

**modern-web-guidance**: when a fix writes HTML / CSS / client JS involving platform features (dialog / popover, container query, dark mode, forms, scrollbar, images and LCP, accessibility, view transition, scroll-driven animation, `content-visibility`, CWV), first call Skill `modern-web-guidance`; `args` = feature + file list + task "Search and retrieve guides for this feature now; do not edit any file." Query once per feature, query terms 2–5 words with no framework or project nouns; implement per the returned guidance and carry key points into `args` of sub-skills like `animate`. No relevant guidance → implement normally and note it. Pure backend, tooling config, copy edits: skip. If used, append its `### Modern Web Guidance` section at the end of the report.

`file_count` is 0 → skip steps 2–4, go to step 5 rules check, then wrap up.

### 2. Diagnose

Find problems only; edit no file. Look at everything before acting so the fix order is sensible and nothing gets edited right before turning out to be deletable.

1. Screen baseline: capture per "Screen verification", the baseline for step 4.
2. **UX rules check**: per the 13 sections of `references/ux-rules.md`, check **in-scope files only**; one verdict per section:
   - `pass` — one line of evidence
   - `gap` — `file:line` or screenshot region, violated rule, fix with numbers, impact high/medium/low
   - `N/A` — no such situation, or out of scope
   - `未驗證` — needs real device or live traffic (soft-keyboard occlusion, sticky hover, tap delay, CWV p75); never claim pass

   Method: grep/read code (`100vh` / `h-screen`, `user-scalable=no`, Enter-submit without `isComposing` guard, `onClick` + `router.push` instead of `<a>`, clickable `div`, icon buttons without `aria-label`, missing `inputmode` / `autocomplete`, floating Select / Menu / Popover without a mobile Drawer branch, confirm dialog on an undoable action, 「確定」「OK」 button text, `target="_blank"` without `rel`, actions shown only on hover, missing `viewport-fit=cover` / safe-area) plus the screen-verification screenshots. Out-of-scope problems go in the report only.
   - §7 (gestures) and §12 (motion) gaps merge into animation fixes; the rest into 「穩定性」. Items overlapping `mobile-native` are listed once.
   - **Structural fixes** (new route, Dialog/Drawer wrapper, new component, new dependency) are not applied; list in 「未解決」 with a suggested approach.

3. **Static design**: score per `references/criteria.md`. "Auto-fix" items merge into 「穩定性」; "report-only" items (originality, visual hierarchy, color ratio, layout) go in the report's 「設計建議（未套用）」. A criterion conflicting with a project rule is not a gap; list it as a conflict in the report.
4. **shadcn audit** (conditional): run only if the project root has `components.json` and `package.json` dependencies include `react`; otherwise note 「非 shadcn 專案，略過」. Run `npx -y @shadscan/cli --json` in the project root (do not `cd`), save output to the scratchpad, parse JSON regardless of exit code; command failure (offline, unsupported structure) → record reason and continue. Never use `--apply`, `setup`, `mcp`; never install its hook, skill or MCP. critical/high → high priority, medium → medium, low → low; list duplicates of other diagnoses once; animation items merge into animation fixes.
5. `break-ui`: overflow, truncation, empty states, extreme data.
6. `mobile-native`: only when `mobile` is true (diagnosis-version task string; do not fix directly).
7. `ask-sonner`: only when `uses_sonner` is true; check toast config and usage (`<Toaster />` position, duplicate mounts, `toast.promise` state handling). shadcn/ui's toast component wraps Sonner, so shadcn projects usually qualify.
8. `animation-performance`: measure and compare with `up-design/perf-baseline.md`.
9. `remove-animations`: list animations to remove (proposals only, no edits). "Kept but poorly done" items go to `improve-animations`.
10. `improve-animations`: audit existing animation. `args` = "kept but poorly done" items, the animation gaps queued so far, and ux-rules §7 and §12 content.
11. `find-animation-opportunities`: full mode only — finding missing motion needs the whole app. `args` = queued "missing motion" items (incl. shadscan interaction / states) and ux-rules §7 and §12 content: no enter/exit animation on high-frequency actions; gestures track the finger 1:1 and exit where they entered; keep tap alternatives; `prefers-reduced-motion` → fade only.
12. Fill the diagnosis results into the report sections 「UX 規則」「診斷」「設計建議（未套用）」, sorted by priority into the fix list.

### 3. Fix and optimize

Run right after the diagnosis sections are written; do not ask the user. They want a one-shot flow; the report is a record for later inspection, not a request for approval.

1. Execute in list order: stability (UX rule gaps, static-design auto-fix items, non-animation shadscan items) → remove animations → performance → adjust and add animations. Edit in-scope files only; use the project's existing tokens (project uses tokens → no hard-coded colors). Fixes involving platform features first consult "modern-web-guidance".
2. Stability fixes do not touch animation or transition code; removal only subtracts, never adds or retunes motion. Items needing an animation library, new dependency, new route or new component are never done; list in 「未解決」. Follow AdSense policy for ad slots: do not move or disguise ad blocks as content or bait clicks.
3. Implement animation with `animate`, `choreograph`, `gestures`, `apple-design` as needed. Use `apple-design` only where physical-feel motion is truly needed, so the whole UI does not overbounce. Toast fixes use `ask-sonner`. When `animate` judges CSS insufficient and a library is needed, do not install; list in 「未解決」.
4. Many independent list items → may delegate to sub-agents in parallel.

### 4. Verify

1. `review-animations` (read the file and follow it, see step 1): review only animation added or changed this run, against ux-rules §7 and §12. Blocked → back to step 3, max 2 retries; still failing → list as unresolved. Never lower the standard to pass: an honest 「未解決」 in the report beats a fake pass.
2. Run `animation-performance` again. Regression → list in report; no overall regression → update `up-design/perf-baseline.md` per `assets/perf-baseline-template.md`, so the next run's baseline only improves.
3. Screen acceptance: recapture per "Screen verification", compare with the step 2 baseline for layout regressions from this run. Regression → fix once and recapture; still regressing → unresolved, no further loop. shadscan items fixed → rerun the same command and compare score and remaining items. No screenshot capability → mark 「未驗證（無畫面）」.
4. Project has lint or typecheck command → run each once. Fix errors caused by this run; pre-existing errors are not handled, only recorded in the report.

### 5. Distill rules

Every run may expose preferences the project has not written down. Write them as rules so the next run and everyday agents obey automatically.

1. Read `learn-taste`'s SKILL.md (see step 1) and follow its Phase 1–4 to collect, filter, generalize rules and pick locations, but **do not stop for approval**; write directly. Differences from learn-taste are in `references/rule-routing.md` section 1; that file wins. Reason: the user wants a one-shot flow; every rule change is listed in the report for later inspection and revert.
2. Rule sources are the user only: this run's corrections, edits, confirmed choices, and preferences attached to the trigger. Reasons `review-animations` blocked and recurring problems are the agent's judgment; do not write them, list only in 「建議規則（未寫入）」. A run where the user expressed no preference writing no rule is normal.
3. Location: anything violations of which can be caught by matching code → **lint**, plus a one-line record of why in **DESIGN.md**; everything else → matching **DESIGN.md** section; section too long and relevant only to some tasks → move to a **project skill**. Lint first because machine checks run every time and do not depend on an agent remembering.
4. Ensure `CLAUDE.md` or `AGENTS.md` points to DESIGN.md; add the pointer if missing, or no agent reads these rules.
5. Rules must be concrete and executable. "Animation should feel natural" changes nothing for the next agent; "modal enter uses ease-out, duration ≤200ms" does.

### 6. Wrap up

1. Complete the remaining report sections.
2. Run:

   ```bash
   node <skill-dir>/scripts/finish_run.mjs --mode <quick|full>
   ```

   It writes the current HEAD hash and time to `up-design/last-run.json`.

3. Reply to the user: report path, fix count, unresolved items, which rules were added or fixed and where. `modern-web-guidance` used → append its `### Modern Web Guidance` section at the end of the report (one line per adopted guide, or one sentence on what was checked and why nothing applied).

## Boundaries

- **No git write operations**: no commit, branch, stash, merge, push. The user inspects the working tree and commits themselves; the report lists changed files per phase to make split commits easy.
- **Edit in-scope files only.** Exceptions are files this skill maintains: lint config, `DESIGN.md`, `.claude/skills/design-*/`, `CLAUDE.md` / `AGENTS.md` (only the one pointer line to DESIGN.md), `.gitignore`, `./up-design/`. Out-of-scope problems go in the report only — in quick mode, touching files the user did not expect makes this run's changes hard to inspect.
- **`./up-design/` stays under version control** so rules and baselines are shared across machines and members. Never add it to `.gitignore`.
- **No new dependencies**: no animation library, lint tool, bottom-sheet or gesture package; shadscan runs read-only via `npx -y @shadscan/cli`. Items needing these go in 「未解決」.
- **ux-rules and criteria are diagnostic baselines, not user preferences**: never write them to DESIGN.md or lint; only preferences the user expressed go through step 5.
- **Screen verification is not a precondition for passing**: no dev server or screenshot capability → fall back to code only and mark 「未驗證（無畫面）」; never claim verified.
- Time always Asia/Taipei (UTC+8).
