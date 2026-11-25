Judgment baseline for the whole up-design run: how to diagnose and fix static design, interaction polish and motion taste.
Read once at the start of the run; project rules and ux-rules outrank it.

It adds only what `ux-rules.md` and `criteria.md` lack; where they cover a point it says `see ux-rules §N`. Project tokens (easing, duration, radius, fonts) replace every default value here, being the user's explicit choice. Items tagged or listed under **[report-only]** are taste or redesign: list them in 設計建議（未套用） with a concrete alternative; don't edit code. Everything else is fix-eligible within up-design's boundaries (in-scope files, no new dependency or component).

## 1. Should it animate

Decide in order; stop at the first "no".

1. **Frequency.** High-frequency and keyboard-triggered actions: see ux-rules §12. Surfaces used tens of times a day (hover, list navigation): remove motion or cut it to a color/opacity change, because repetition turns any delay into friction. Keep delight for rare or first-time moments (onboarding, finishing setup).
2. **Purpose.** Keep motion only for spatial consistency (enter and exit along one path), state indication (a morph shows what changed), explanation, feedback (a press confirms input), or preventing a jarring jump. "Looks nice" on a frequent surface is a removal candidate.
3. **Easing**, then **duration** (section 2).

Match motion to the product (work tool: crisp and fast; playful consumer app: softer) and keep one mood app-wide; mixed styles read as unfinished.

## 2. Easing and duration

- Easing: entering or exiting → ease-out; moving or morphing on screen → ease-in-out; hover and color → ease; constant motion (marquee, progress) → linear; unsure → ease-out.
- Replace `ease-in` on UI: it starts slow exactly when the user is watching, so 300ms ease-in feels slower than 300ms ease-out.
- Prefer the project's easing tokens. Without them, use these instead of the weak built-in keywords: ease-out `cubic-bezier(0.23, 1, 0.32, 1)`, ease-in-out `cubic-bezier(0.77, 0, 0.175, 1)`, drawer/sheet `cubic-bezier(0.32, 0.72, 0, 1)`.
- Durations: press feedback 100–160ms; tooltip, small popover 125–200ms; dropdown, select 150–250ms; modal, drawer, sheet 200–500ms; toast ~400ms `ease` (the toast library's default wins); explanatory motion may run longer.
- Keep UI motion under 300ms except modals, drawers, sheets and toasts; shorter motion (and a faster spinner) makes the app feel faster at identical load time.
- Make exit faster than enter (e.g. 250ms in, 200ms out): the user has already decided to leave.
- Be slow where the user decides, fast where the system responds: hold-to-confirm fills over 2s `linear`, release snaps back in 200ms ease-out (behavior: see ux-rules §7).

## 3. Component polish (when X, do Y)

- **Pressable element** (timing and hover gating: see ux-rules §5): `transform: scale(0.97)` on `:active` (range 0.95–0.98), transform transition 100–160ms ease-out. Scale shrinks label and icon too, which is intended.
- **Entrance from nothing**: replace `scale(0)` with `scale(0.95)` (not below 0.9) plus `opacity: 0`; real objects don't grow from a point.
- **Popover, dropdown, menu, tooltip**: set `transform-origin` to the trigger via the positioning library's variable (e.g. `--radix-popover-content-transform-origin`, `--transform-origin`); `center` breaks the trigger–content link. Modals keep `center`; they have no anchor.
- **Tooltip groups**: keep the delay before the first one (prevents accidental opens), then open neighbors instantly with a 0ms transition so a toolbar feels fast. Motion: 125ms ease-out from `scale(0.97)` + `opacity: 0`.
- **`transition: all`**: list exact properties; `all` animates layout properties by accident.
- **Crossfade showing two overlapping objects**: once easing and duration tuning fail, add `filter: blur(2px)` during the swap so the eye sees one object. Keep blur ≤ 20px; heavy blur is expensive, especially in Safari.
- **Off-screen positions**: use percentages (`translateY(100%)`), not pixels, so the element hides by its own size whatever its content.
- **Reveal, fill progress, active-tab color swap**: animate `clip-path: inset(...)` rather than separate color or size transitions; it stays in sync without layout.
- **Stagger**: only for one orchestrated, low-frequency group entrance (page first load, dialog content): 30–80ms between items, non-uniform, never blocking input. Remove it from frequent lists (ux-rules §12); every-section reveals: section 9.

## 4. Interruptibility

Motion that restarts from zero when interrupted reads as a glitch, so pick the mechanism by what can interrupt it:

- One-shot, predetermined, not re-triggered mid-way (loader, first-load sequence) → CSS keyframes or WAAPI.
- State toggled by clicks, possibly rapidly (toast stack, accordion, toggle, dropdown) → CSS transition, which retargets from the current value; keyframes restart from zero.
- Driven by finger or pointer (drag, swipe, sheet, fling) → spring from the current on-screen value.
- On interrupt, start from the live on-screen value, not the logical target, or the element jumps. Input stays live during transitions (ux-rules §7).

## 5. Physical feel: springs and gestures

Use physical-feel motion only where the user's hand drives it (drag, swipe, sheet, fling, momentum carousel) or one element must feel alive; elsewhere use critically damped springs or ease-out.

**Restraint rule:** bounce only after a gesture that carried momentum. Overshoot on a flicked card feels right; on a menu that just opened it feels wrong, and a UI where everything overshoots feels toy-like and slow. Remove bounce with no fling before it.

**Scope:** up-design adds no dependency and hand-writes no gesture (ux-rules §7). Apply these values only when the project already ships a spring or gesture library, or to judge gesture code already in scope; a fix needing a library goes to 未解決.

| Interaction                     | Damping ratio      | Response (s) |
| ------------------------------- | ------------------ | ------------ |
| Default UI                      | 1.0 (no overshoot) | 0.3–0.4      |
| Move / reposition               | 1.0                | 0.4          |
| Rotation                        | 0.8                | 0.4          |
| Drawer / sheet released by drag | 0.8                | 0.3          |
| Settle after a flick            | ~0.8               | 0.3–0.4      |

- Response is not duration; settle time emerges from the parameters. In bounce/duration APIs default to `bounce: 0, duration: 0.4`; `bounce` 0.1–0.3 only after momentum or on a deliberately playful component. A physics `damping` coefficient is not the damping ratio; don't mix their numbers.
- Smooth decorative pointer tracking (cursor tilt, parallax) through a spring (e.g. stiffness 100, damping 10); raw 1:1 mapping feels mechanical. Functional data displays get no such motion.
- Run 2D motion as separate X and Y springs; one spring on the distance desyncs when axis velocities differ.

Gesture code checks (beyond ux-rules §7):

- Keep the grab offset; snapping the element's center to the pointer breaks direct manipulation.
- `setPointerCapture` on pointerdown so the drag survives leaving the element; ignore extra touch points once dragging, or a finger switch makes it jump.
- Require ~10px of movement before committing to a direction, then track 1:1, so taps and scrolls aren't misread as drags. Keep a short position/time history for release velocity.
- Dismiss on velocity as well as distance: `|distance| / elapsed_ms > 0.11` dismisses a short flick.
- Hand release velocity to the settling spring so drag and animation have no seam (relative-velocity APIs: `velocity / (target − current)`).
- Snap to the point nearest the projected landing, not the release point: `projected = current + (v_px_per_s / 1000) * d / (1 − d)`, `d ≈ 0.998` (0.99 snappier).
- Past a boundary, rubber-band instead of stopping hard (reads as frozen): `offset = (over * dim * 0.55) / (dim + 0.55 * |over|)`.
- On direction reversal, carry velocity through the retarget; cutting to a new animation hits a velocity "brick wall".

## 6. Materials and depth

Judge existing translucent surfaces; turning opaque chrome translucent is a redesign **[report-only]**.

- Don't stack a light translucent surface on another; legibility collapses. Solidify one layer.
- Text over blur: no flat mid-gray; raise contrast, slightly heavier weight, small letter-spacing bump (floor: ux-rules §13). Put color on a solid layer.
- Bigger surfaces read thicker (stronger blur, deeper shadow) than chips; shadow heavier over busy content, lighter over plain.
- Modal task → dim scrim, background pushed back. Non-blocking parallel panel → translucency or offset, no scrim, so flow isn't broken.
- Glass surfaces enter by animating blur and scale together, not opacity alone, so they read as material arriving (mind blur cost).
- Honor `prefers-reduced-transparency: reduce` (opaque background, no blur) and `prefers-contrast: more` (near-solid background, defined border); translucency is where these users lose legibility first.
- Sticky header over scrolling content: a short fade or blur mask beats a 1px divider **[report-only]**.

## 7. Motion performance

- Animate `transform` and `opacity`; `width`, `height`, `padding`, `margin`, `top/left` trigger layout and paint every frame.
- For per-frame updates (drag), write `transform` on the moving element, not a CSS variable on its container; an inherited variable restyles every child.
- Predetermined motion → CSS or WAAPI; JS only for dynamic, interruptible motion. Compositor CSS stays smooth while the main thread loads a route or data; rAF-driven animation drops frames.
- Motion (ex-Framer Motion) below v14.2 runs `x`/`y`/`scale` shorthands on the main thread; use a full `transform` string (upgrading → 未解決). Layout animations, `onUpdate`, drag inertia and per-frame motion values are main-thread in every version.

## 8. Reduced motion and comfort

- Reduced motion: see ux-rules §12 and §7. Gentler, not none: keep opacity and color changes that aid comprehension; drop displacement, scale and overshoot.
- Avoid full-viewport moving backgrounds and slow loops near 0.2 Hz (one cycle per ~5s); both cause vestibular discomfort. Ease theme switches instead of jumping brightness.

## 9. Static design: intent over template

Measurable checks live in `criteria.md`; this section judges intent. A trait the project's DESIGN.md or tokens deliberately choose is not a gap.

Fix-eligible:

- Inconsistent section spacing often comes from conflicting selector specificity (a section class and an element class both setting padding/margin). Fix the source; another override compounds it.
- Serif body text gets slightly more line-height than sans, within criteria.md ranges.
- Results reuse the action's verb (button "Publish" → toast "Published") so the vocabulary teaches the flow (ux-rules §11). Empty states point to the next action; errors say what happened and how to fix it, without apology (ux-rules §4, §6).

**[report-only]**, each with a concrete alternative (element, value, location), never "make it more distinctive":

- Template tells (defaults, not choices): cream ~#F4F1EA + high-contrast serif + terracotta ~#D97757; near-black + one acid-green or vermilion accent; broadsheet hairlines, zero radius, dense columns; SaaS-card kit (identical rounded cards, one radius for every level, the same `rgba(0,0,0,.1)` shadow, gradient washes); template chrome (tracked all-caps eyebrow over each heading, `A · B · C` meta, `WORD — fragment` labels, #0B0B0B/#111 as black, monospace data labels, `→` appended to links and buttons).
- One word in a headline accented by italic, bold or color; all-caps labels; label lines above content that add no information.
- Numbered markers (01 / 02 / 03) or other structural devices on content that isn't a sequence; borders, dividers, eyebrows and numbers should encode information, not decorate.
- Hero defaulting to big number + small label + stats + gradient accent; suggest opening with the subject's most characteristic thing (real content, live demo, image).
- Fade-and-slide-up on every section and hover transitions on every card read as generated; suggest one orchestrated moment per page. Remove in the removal phase only what fails section 1's frequency or purpose test.
- Typefaces defaulted rather than chosen for the subject; two families should be clearly distinct; display type as an active design element.
- Boldness spread everywhere: suggest one memorable element with everything around it quiet, and removing one decorative element per view.
- Labels named after system internals instead of what users manage ("webhook config" vs "notifications").

## 10. Checklist

- `transition: all` → exact properties
- `scale(0)` entrance → `scale(0.95)` + `opacity: 0`
- `ease-in` on UI → ease-out or the custom curve
- Popover/menu `transform-origin: center` → trigger origin (modals exempt)
- UI motion > 300ms (not modal/drawer/sheet/toast) → 150–250ms
- Enter and exit equally long → exit faster
- Keyframes on re-triggerable state → CSS transition
- Bounce with no preceding fling → `bounce: 0` / damping 1.0
- Gesture animation from the target value → live value, hand off velocity
- Size/position properties animated → `transform` / `opacity`
- Stagger on a frequent list → remove
- Translucent on translucent → solidify one layer

Verify changed motion at 2–5× slower playback or frame by frame: origin, easing start/stop, two-object overlap in crossfades, properties in sync. Touch gestures need a real device; without one, mark 未驗證.
