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

Concrete curves and durations: `motion-audit.md` §C (diagnosis), `motion-build.md` A5 (implementation), `motion-review.md` 3.2–3.3 (verification). Principles:

- Easing: entering or exiting → ease-out; moving or morphing on screen → ease-in-out; hover and color → ease; constant motion (marquee, progress) → linear; unsure → ease-out. `ease-in` on UI starts slow exactly when the user is watching, so it feels slower than ease-out at the same duration.
- Keep UI motion under 300ms except modals, drawers, sheets and toasts; shorter motion (and a faster spinner) makes the app feel faster at identical load time.
- Make exit faster than enter (e.g. 250ms in, 200ms out): the user has already decided to leave.
- Be slow where the user decides, fast where the system responds: hold-to-confirm fills over 2s `linear`, release snaps back in 200ms ease-out (behavior: see ux-rules §7).

## 3. Component polish

Press scale, entrance from `scale(0.95)`, trigger `transform-origin`, tooltip groups, `transition: all`, blur-masked crossfade, percentage offsets, `clip-path` reveals and stagger: see `motion-build.md` A4, B and D1–D9.

## 4. Interruptibility

See `motion-build.md` A6 and `motion-review.md` 3.5.

## 5. Physical feel: springs and gestures

Use physical-feel motion only where the user's hand drives it (drag, swipe, sheet, fling, momentum carousel) or one element must feel alive; elsewhere use critically damped springs or ease-out.

**Restraint rule:** bounce only after a gesture that carried momentum. Overshoot on a flicked card feels right; on a menu that just opened it feels wrong, and a UI where everything overshoots feels toy-like and slow. Remove bounce with no fling before it.

**Scope:** up-design adds no dependency and hand-writes no gesture (ux-rules §7). Apply these values only when the project already ships a spring or gesture library, or to judge gesture code already in scope; a fix needing a library goes to 未解決. Gesture mechanics: `motion-build.md` C.

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

See `motion-audit.md` §A and `motion-review.md` 3.7.

## 8. Reduced motion and comfort

- Reduced motion: see ux-rules §12 and §7. Gentler, not none.
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

Verify changed motion at 2–5× slower playback or frame by frame. Touch gestures need a real device; without one, mark 未驗證.
