# Motion review

This file is for VERIFICATION (step 4.1) of the animation this run added or changed, not for diagnosis or building motion.
Each changed animation gets pass, blocked or note; blocked goes back to step 3.

A transition that runs but feels sluggish, lands from the wrong origin, fires too often or drops frames is a regression.

## 1. Scope

- Review only step 3's edits. List the files from this run's 「移除」「效能」「動畫」 entries, read `git diff -U0 -- <those files>`, keep the hunks you wrote. A bare `git diff HEAD` or a diff against the last-run head pulls in the user's own work.
- Untracked new files are not in the diff: read them whole.
- Motion hunks touch: CSS `transition*`, `animation*`, `@keyframes`, `@starting-style`, `transform*`, `clip-path`, `filter: blur`, state-driven `opacity`, `prefers-reduced-motion`, `(hover: hover)`; Tailwind `transition-*`, `duration-*`, `ease-*`, `delay-*`, `animate-*`, `motion-safe:`/`motion-reduce:`; Motion `initial`/`animate`/`exit`/`transition`, `AnimatePresence`, `layout`/`layoutId`, `useSpring`; WAAPI `element.animate()`.
- Read surrounding code for context (trigger, frequency); give verdicts only on changed lines. Untouched animation in the same file was handled at diagnosis.
- Pure deletions pass unless they leave half an animation (enter without exit, orphan `@keyframes`, reduced-motion block for motion that no longer exists); then the remainder counts as changed.
- Nothing in scope → write 「本輪無動畫變更，略過」 and skip 4.1.
- Judge code only: frame timing is 4.2, layout regressions 4.3.

## 2. Precedence

Project rules (lint, DESIGN.md, tokens, CLAUDE.md) > ux-rules > this file. A changed value that follows a written project rule or token passes; cite it and list the conflict in the report. Only a written rule moves a threshold; "feels fine", a reason you supply yourself, or exhausted retries never do.

## 3. Checklist

### 3.1 Purpose and frequency

- Purpose must be one of: spatial consistency, state indication, feedback, explanation, preventing a jarring change. "Looks cool" on something seen often → blocked; fix: delete.
- Frequency and page transitions: see ux-rules §12. Beyond it: keyboard-initiated or 100+/day actions get no animation (repetition makes them feel slow); hover seen dozens of times a day stays minimal; rare or first-time moments (onboarding, celebration) may add delight.

### 3.2 Easing

Project easing tokens first. Otherwise:

- Enter / exit (default): `cubic-bezier(0.23, 1, 0.32, 1)`
- Move / morph on screen: `cubic-bezier(0.77, 0, 0.175, 1)`
- Drawer / sheet: `cubic-bezier(0.32, 0.72, 0, 1)`
- Hover, color: `ease`. Constant motion (marquee, progress): `linear`. Sonner-style toast: `400ms ease`.

Blocked:

- `ease-in` on any UI: it delays the moment the user watches; ease-out at 200ms feels faster than ease-in at 200ms.
- Bare keyword `ease-out` / `ease-in-out` on a deliberate enter, exit or move: built-in curves are too weak (project token exempt).
- Spring bounce > 0.3. Reference spring: `{ type: "spring", duration: 0.5, bounce: 0.2 }`; bounce 0.1–0.3 belongs to drag-to-dismiss or playful UI, so bounce on crisp UI (dashboards, forms) → note.

### 3.3 Duration

Press feedback 100–160ms · tooltip, small popover 125–200ms · dropdown, select 150–250ms · modal, drawer, sheet 200–500ms · toast ≤ 400ms · marketing / explanatory may be longer.

- Above its upper bound → blocked (shorter is fine). Any other UI over 300ms without a written reason → blocked; a 180ms dropdown feels more responsive than a 400ms one.
- Stagger: 30–80ms between items, non-uniform (e.g. 0 / 50 / 90ms), one entrance per container, never blocks interaction. A group entrance added this run whose items all animate at once, or a stagger outside these bounds → blocked. Where ux-rules §12 forbids the entrance (list rows, tab-switched content), the fix is deleting it.

### 3.4 Origin and physicality

- `scale(0)` → blocked; nothing appears from nothing. Start at `scale(0.9–0.97)` + `opacity: 0` (default 0.95).
- Pure-fade entrance with no initial transform → blocked, except the reduced-motion variant, backdrops/scrims, and fade-only page transitions per ux-rules §12.
- Popover, dropdown, tooltip at `transform-origin: center` → blocked; scale from the trigger: `var(--transform-origin)` (Base UI), `var(--radix-<component>-content-transform-origin)` (Radix/shadcn). Modals stay centered.
- Press feedback: `:active { transform: scale(0.97) }` (0.95–0.98), `transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1)`.
- Exit direction: see ux-rules §7.

### 3.5 Interruptibility

- Rapid triggers (toasts, toggles, items added repeatedly) use `transition` or a spring, which retarget from the current state. `@keyframes` there → blocked: they restart from zero.
- Entry without JS: `@starting-style`.
- Drag, swipe, sheets, gesture code: see ux-rules §7.

### 3.6 Asymmetric timing

Deliberate phase (press, hold, destructive confirm) slow, system response snaps: hold `clip-path 2s linear`, release `200ms cubic-bezier(0.23, 1, 0.32, 1)`. Symmetric press/release or hold timing → blocked. Hold-to-confirm behavior: see ux-rules §7.

### 3.7 Performance (code level)

- Animate `transform` and `opacity`; `clip-path` and a measured-height accordion are the exceptions. `width`/`height`/`margin`/`padding`/`top`/`left` → blocked (layout + paint + composite every frame); fix with `transform` (`translateY(100%)` moves by the element's own height).
- `transition: all` → blocked; name the properties.
- Motion `x`/`y`/`scale` on `motion` < 14.2 while the page is busy → blocked; fix with the full string, `animate={{ transform: "translateX(100px)" }}`.
- `layout`/`layoutId` runs on the main thread in every version: while the page is busy → blocked, otherwise note.
- Parent CSS variable driving child transforms (`setProperty('--swipe-amount', …)`) → blocked: it recalculates every child. Set `element.style.transform` directly.
- `filter: blur` ≥ 20px → blocked: expensive, worst in Safari.
- Predetermined motion in JS/rAF instead of CSS → note: it stutters under load.

### 3.8 Accessibility

- Movement needs a `prefers-reduced-motion: reduce` variant (`motion-reduce:`, `useReducedMotion()`) that keeps opacity/color and drops transforms (fade only, ux-rules §12). Missing → blocked. Removing a transition that aids comprehension → note: reduced means gentler, not zero.
- Hover motion sits inside `@media (hover: hover) and (pointer: fine)`; ungated → blocked, since touch fires hover on tap.

### 3.9 Cohesion

- Motion matches the component and product personality: playful may bounce, a dashboard stays crisp. Mismatch → note; clashing with a project token or rule → blocked.
- Crossfade showing two overlapping states → note: add `filter: blur(2px)` during the transition.
- Unsure of feel → note suggesting a 2–5× slow-down in the DevTools Animations panel. Gesture feel needs a real device → 「未驗證（需實機）」, never pass.

## 4. Severity

- **blocked**: every item marked blocked above. Moving any of them to note lowers the standard.
- **note**: only items without a threshold (cohesion, blur masking, spring preference, debugging advice). Notes go in the report and never loop back.
- Unsure? If the rule has a number and the changed value is outside it, it is blocked.

## 5. Fixes

- Take values from section 3 or project tokens; never approximate.
- Prefer, in order: delete → reduce (shorter, smaller, fewer properties) → fix easing → fix origin → make interruptible → move to transform/opacity → asymmetric timing → polish → reduced-motion, hover gating, cohesion. Deleting this run's own addition is a valid fix.
- A fix needing a library, new dependency or new component is not a retry: list it in 「未解決」 at once.

## 6. Output

One row per changed animation that passes; one row per violated rule otherwise.

| file:line       | Changed value                         | Verdict | Rule                      | Fix                                                          |
| --------------- | ------------------------------------- | ------- | ------------------------- | ------------------------------------------------------------ |
| `Menu.tsx:58`   | `transition: transform 300ms ease-in` | blocked | 3.2 ease-in; 3.3 dropdown | `transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1)` |
| `Toast.css:12`  | `animation: slideIn 400ms`            | blocked | 3.5 keyframes on toast    | `transition: transform 400ms ease` + `@starting-style`       |
| `Dialog.tsx:31` | `zoom-in-95 duration-200`             | pass    | 3.3 modal; 3.4 centered   | —                                                            |

- A blocked verdict quotes the literal changed token from the diff (CSS value, utility class, Motion prop) and gives the exact replacement. For an omission (e.g. no reduced-motion guard), quote the added declaration that lacks it. "Easing feels off" gives step 3 nothing to change and the retry nothing to check. No changed value to name → the problem predates this run: out of scope (section 1).
- Rule names the checklist item, "ux-rules §7/§12 …", or the project rule that decided it.

## 7. Retry loop

- Blocked → step 3 applies the fix as written; re-review those rows plus any motion the fix added. At most 2 retry rounds in total; motion a fix introduces shares its item's count.
- Still blocked → 「未解決」 with file:line, current value, rule, fix, and why it didn't land. Block reasons may go to 「建議規則（未寫入）」, never into rules (step 5).
- Not a pass: downgrading to note, widening a threshold, inventing a reason for > 300ms, dropping the row. An honest 「未解決」 beats a fake pass; the user reads the report to decide what to commit.
