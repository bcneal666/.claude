For IMPLEMENTATION in up-design step 3.3, after diagnosis is complete and the fix list is written; do not use it to diagnose or hunt for new motion.
Build or retune only the animation items on the fix list; project rules, then ux-rules §7 and §12, win on any conflict.

# Motion build

Contents: Ground rules · A. Decision order · B. Choreography · C. Gestures · D. Recipes

## Ground rules

- No new dependency: CSS, WAAPI, plain pointer events, or a motion library already in `package.json`. Anything needing more (animation library, gesture or bottom-sheet package, new component) → 「未解決」 with a suggested approach; a half-working hand-roll is worse than an honest gap.
- Use the project's easing and duration tokens; none fits → write the A5 literal in place, no parallel token set.
- Springs only for drag or fling release. Click-opened or closed elements get a curve and no bounce: no force was applied, so overshoot reads as a glitch.
- Reduced motion and hover gating ship with the animation.
- `@starting-style`, view transitions, scroll-driven animation → query modern-web-guidance first (`references/modern-web-guidance.md`).

## A. Decision order

A1 and A2 gate everything; zero lines of code is a valid result.

**A1. Should it animate?** By frequency:

- 100+/day or keyboard-initiated (shortcuts, command palette): no animation.
- Tens/day (hover, list navigation): near-imperceptible press/hover feedback only; tab content and list rows switch without enter/exit (ux-rules §12).
- Occasional (dialog, drawer, toast): standard animation.
- Rare or first-time (onboarding, success): delight allowed.

Fails the gate → make the change instant and note why in the report.

**A2. Purpose.** Name one: feedback, spatial consistency, state indication, preventing a jarring change, explanation (marketing/onboarding), delight (rare tier only). None fits → don't build it. Data the user reads or acts on doesn't move for style.

**A3. Tool, cheapest first.** Stop at the first that fits.

1. CSS transition: hover, press, color, class or attribute toggle.
2. `@starting-style`: entry on mount without JS state.
3. CSS `@keyframes` on `transform`/`opacity`: predetermined motion that must stay smooth on a busy page (compositor-run; rAF loops drop frames).
4. WAAPI `element.animate()`: programmatic control at CSS cost.
5. Springs, FLIP layout animation, exits of unmounting nodes, gesture-driven values: the already-installed library; none → the CSS/WAAPI paths below, else 「未解決」.

Exit without a library: style the closed state the primitive exposes (`data-closed`, `data-ending-style`, `data-state="closed"`), or keep the node mounted with a `leaving` flag until the animation's `finished`. Neither possible → 「未解決」.

**A4. Properties.**

- `transform` and `opacity` skip layout and paint; `clip-path` is also allowed; `height` only for accordions, kept short. Name each property; no `transition: all`.
- No `scale(0)`; nothing real appears from nothing. Start at `scale(0.95–0.97)` + `opacity: 0`.
- Anchored popover, menu, tooltip: `transform-origin` at the trigger via the primitive's variable (Base UI `--transform-origin`, Radix `--radix-<component>-content-transform-origin`). Modals stay centered.
- `translateY(100%)` moves by the element's own height; prefer it to hard-coded px.
- Set `transform` on the moving element itself; a CSS variable on the parent restyles every descendant.

**A5. Curve and duration.** Literals for when the project has no token:

- Enter/exit, the default: `cubic-bezier(0.23, 1, 0.32, 1)`
- Moving or morphing on screen: `cubic-bezier(0.77, 0, 0.175, 1)`
- Edge-attached sheet (iOS drawer): `cubic-bezier(0.32, 0.72, 0, 1)`
- Floating drawer: `cubic-bezier(0.165, 0.84, 0.44, 1)`
- Hover or color: `ease`. Constant motion, progress, hold fill: `linear`.

No `ease-in` on UI: it delays the moment the user is watching. Built-in `ease-out` is too weak for deliberate motion. Other curves come from easing.dev or easings.co, not by hand.

| Element         | Duration  | Curve      |
| --------------- | --------- | ---------- |
| Press           | 100–160ms | ease-out   |
| Tooltip         | 125–200ms | ease-out   |
| Dropdown        | 150–250ms | ease-out   |
| Modal           | 200–500ms | ease-out   |
| Edge sheet      | 500ms     | iOS drawer |
| Floating drawer | ~200ms    | floating   |
| Toast           | ~400ms    | `ease`     |
| Marketing       | longer    | ease-out   |

UI stays under 300ms; modals, drawers and toasts are the exceptions.

Spring (installed library only): `{ type: "spring", duration: 0.5, bounce: 0.2 }`. Bounce 0.1–0.3 after a drag, 0 otherwise; smaller elements need more bounce to read the same. A spring that feels off usually needs more damping.

**A6. Interruption.**

- Anything re-fired rapidly (toast, toggle) uses transitions: they retarget from the current value, while keyframes restart from zero. Nothing a gesture can touch uses keyframes.
- WAAPI: `old.commitStyles(); old.cancel();` before starting a new animation so it starts from the on-screen value.

**A7. Exit.**

- Overlays and in-container views leave the way they came (ux-rules §7); page transitions are enter-only (ux-rules §12).
- Exits are shorter, simpler and simultaneous; no reverse stagger, since the user already decided to leave.
- Asymmetric where the user decides: hold fill 2s linear, release 200ms ease-out.

**A8. Reduced motion and hover gating.** Reduced motion = fade only (ux-rules §12), same timing: transitions keep only `opacity`; keyframe entrances swap `animation-name` to an opacity-only `fade`.

```css
@media (prefers-reduced-motion: reduce) {
  .panel {
    transition-property: opacity;
  }
}
@media (hover: hover) and (pointer: fine) {
  .card:hover {
    transform: translateY(-2px);
  } /* touch fires false hovers */
}
```

## B. Choreography

For two or more elements moving on one event. Cut moving parts and run the rest in parallel; sequence only when order means something (reading order, cause and effect, one thing arriving first).

**Cast each moving element.** Lead (the one thing to notice): moves first, travels furthest. Support (subtitle, CTAs, rest of a list): follows with smaller motion. Decoration (pills, badges, dividers): fade only, or nothing. Static: everything else, including containers whose content animates. Two leads = a hierarchy problem motion can't fix → 「設計建議（未套用）」.

**What stays still.**

- One entrance per container: if the panel slides in, its content is already there. Parent entrance plus child stagger makes the user wait through both.
- No stagger on high-frequency or keyboard UI (dropdown items, menu rows, command palette, tab content, list rows): it delights once and slows every later use.

**Relationship per pair.**

- Together (default): same object or moment, or order means nothing. Same start, same timing family.
- Overlap: order means something and both visible at once is fine → stagger.
- Sequence: overlap would look broken (one element passes through another; two rich views in a container changing width and height). Start the second ~100ms before the first ends so it reads as one gesture; hold end states with `forwards`/`both`.
- Carry: can't control a child's motion → animate its parent and let it ride along.

**Stagger numbers.**

- Product UI: 30–80ms gaps, whole group ≤ ~300ms. Long lists stagger the first ~5; the rest share the 5th delay.
- Marketing or first-run: 100–150ms steps on 0.5–0.6s entrances.
- Equal gaps read as a metronome. Shrink the gaps (product: 0, 50, 90, 120ms) and vary distance by role: lead ~12px, support 6–8px, decoration fade only.
- Order by importance, not DOM; title and first paragraph can share step 0. Direction follows reading order, or radiates from the interaction point.
- Everything is clickable as soon as it is visible.

**Timing family and sync.**

- One component's sub-animations share one duration and easing family, set once in a custom property; a drawer opening in 500ms and resizing in 200ms reads as two objects. Inner content may use a lighter curve of the same family.
- Hook support motion to a moment of the lead (start, impact, settle), not a guessed delay. Accents land in the lead's last ~20%, most important first, others ~40ms behind.
- Sync to the cause: a pulse fires on the click, not on the hover before it. A repeat action skips the buildup.

**View swap in a container.**

- Crossfade: the old view leaves while the new one enters. Pin the old view absolute at its spot and fade it out while the new one fades in from `scale(0.96)` (D6).
- Height changes too: scale the fade by distance, `min(max(Δheight / 500, 0.15), 0.27)` seconds, so a tiny jump doesn't flicker.
- Two rich states changing both dimensions → sequence: the old view finishes leaving first.
- Few states → hardcode values per transition rather than a formula.
- Small container or similar views → crossfade with an 8px shift and light blur, not a full slide.
- Wizard steps: Next moves content left, Back moves it right.

**Element leaving, siblings close the gap.** Take it out of flow the moment it is removed so siblings slide in while it fades; otherwise the gap closes after the exit and the pause feels slow (D6).

**Interruption.** A re-trigger mid-sequence (hover out halfway, Next twice fast) stops in-flight animations first; never stack them. Chain only after everything settles: `await Promise.allSettled(el.getAnimations({ subtree: true }).map((a) => a.finished))`. Rapid switching must not leave two views mounted; keep keys stable and unique.

**Idle loops.** First run ~2.5s after load, repeat every ~6s, pause during interaction, resume only after the reset finishes.

**Reduced motion** collapses choreography: no delays, no movement, opacity only, all at once. A step-by-step explanation jumps between its frames.

## C. Gestures

Policy is ux-rules §7. In scope: tuning an existing Drawer/sheet (e.g. Vaul) or gesture code the project already has; CSS-only gestures (hold-to-confirm, press, `touch-action`, `overscroll-behavior: contain`); drag props of an installed motion library. New drag or swipe-to-close, snap-point sheets, momentum flings, drag-to-reorder and swipe cards go to 「未解決」 with a suggested component or package: they need momentum, velocity-aware dismissal, focus trap and Escape done right.

**Track (pointer down): the element is the finger.**

- 1:1 with `transition: none` while dragging; any easing or spring makes it trail the finger.
- Write `transform` on the element in `pointermove`. No framework state per move (re-renders drop frames), no inherited variable on a parent (it made Vaul lag past ~20 items).
- `setPointerCapture` on start; ignore extra pointers while dragging so a finger switch doesn't jump. Keep the grab offset; snapping the element's center to the pointer breaks direct manipulation.
- Commit to a direction only after ~10px of movement, so taps and scrolls aren't misread as drags.
- `touch-action` hands JS only the drag axis: vertical drag `pan-x`, free drag `none`. Controls inside a draggable sheet don't start drags (Vaul: `data-vaul-no-drag`).
- Linked values come from drag progress in the same handler (`overlay.style.opacity = 1 - y / height`); separate animations drift apart once interrupted.
- Past an edge, resistance rises instead of a wall: `rubberband = (over, dim, c = 0.55) => (over * dim * c) / (dim + c * Math.abs(over))` (Motion: `dragElastic={0.2}`).

**Release (pointer up): physics finishes.**

- Velocity from the last few `pointermove` samples (position + timestamp), not the current point.
- Dismiss on distance or velocity: past 40–50% of travel, or a flick, i.e. average `|distance| / elapsed > 0.11` px/ms (Sonner) or `info.velocity > 500` px/s (Motion). Distance-only makes flicks feel ignored.
- Snap points: pick the one nearest the projected rest, not the release point. Projected rest = `current + (v / 1000) * d / (1 - d)`, `v` in px/s, `d = 0.998`.
- No library: settle with a transition from the current position, edge sheet 500ms on the iOS drawer curve (its steep start keeps 500ms snappy), floating drawer ~200ms; overlay opacity on the same duration and curve.
- Installed library: spring seeded with the release velocity, bounce 0.1–0.3. Motion `dragMomentum={false}` when it should stop where the finger stops or `onDragEnd` hands off to its own spring.
- Below threshold, snap back fast (~200ms ease-out); a slow return feels like the UI arguing.
- On direction reversal, carry velocity through the retarget; cutting to a new animation hits a velocity "brick wall".

**Catch mid-flight.** On `pointerdown`, read the live position (`new DOMMatrix(getComputedStyle(el).transform).m42` for y), set `transition: none`, write it inline and track from there.

## D. Recipes

`var(--ease-*)` = the project token or the A5 literal. State selectors (`[data-starting-style]`, `[data-ending-style]`, `[data-closed]`) stand for whatever the project's primitive exposes. Each ships with the A8 branch.

**D1. Press.** `:active` is a real press on touch, so no hover gate.
`transform: scale(0.97)` on `:active`, `transition: transform 160ms var(--ease-out)`.

**D2. Popover, dropdown, tooltip, modal.**
`transform-origin: var(--transform-origin)`; `opacity` and `transform` transition 200ms `var(--ease-out)`; starting/ending state (`[data-starting-style]`, `[data-ending-style]`) is `opacity: 0` + `scale(0.95)`.
Tooltip: 125ms and `scale(0.97)`; once one is open, neighbours open with no delay and `transition-duration: 0ms`. Modal: 250ms, `scale(0.96)`, `transform-origin: center`, backdrop opacity on the same 250ms so both read as one surface.

**D3. Drawer without drag.** Floating drawer: 200ms on the floating curve, overlay included. Reduced motion: closed = `opacity: 0`, no offset.
Edge sheet: `transform` 500ms `var(--ease-drawer)`, closed state `translateY(100%)` (`[data-closed]`).

**D4. Toast** (no toast library only; Sonner projects tune Sonner). `ease` at 400ms suits a toast better than the UI budget. No `@starting-style` → a `data-mounted` flag set after mount. Stacked toast reflow: tune opacity against height on a recording.

```css
.toast {
  transition:
    opacity 400ms ease,
    transform 400ms ease;
}
@starting-style {
  .toast {
    opacity: 0;
    transform: translateY(100%);
  }
}
```

**D5. Accordion.** `overflow: hidden` + `transition: height 200ms, opacity 200ms` on the ease-out curve, to a measured height (JS, or the primitive's, e.g. `--radix-accordion-content-height`), never `auto`. It costs layout every frame, so keep it short.

**D6. Leave while siblings close the gap** (also the view swap), WAAPI FLIP. In a framework, keep the item mounted with a `leaving` flag, call this, and drop it from state in `onDone`. Reduced motion: skip the sibling FLIP, fade only.

```js
function leave(el, onDone) {
  const sibs = [...el.parentElement.children].filter((n) => n !== el); // parent: position: relative
  const first = sibs.map((n) => n.getBoundingClientRect());
  el.style.cssText += `position:absolute;top:${el.offsetTop}px;left:${el.offsetLeft}px;width:${el.offsetWidth}px`;
  const opts = { duration: 200, easing: "cubic-bezier(0.23, 1, 0.32, 1)" };
  sibs.forEach((n, i) => {
    const r = n.getBoundingClientRect();
    const t = `translate(${first[i].left - r.left}px, ${first[i].top - r.top}px)`;
    n.animate({ transform: [t, "none"] }, opts);
  });
  const out = { ...opts, fill: "forwards" }; // stays hidden until onDone re-renders
  el.animate({ opacity: [1, 0], scale: [1, 0.95] }, out).finished.then(onDone);
}
```

**D7. Stagger** (one-shot entrance, never a high-frequency list). Set `--delay` inline per item with shrinking gaps (B). `both` keeps delayed items hidden instead of flashing their final state.
Per item `animation: enter 0.3s var(--ease-out) both`, `animation-delay: var(--delay, 0ms)` set inline; `@keyframes enter` from `opacity: 0; transform: translateY(8px)`.

**D8. Hold to confirm.** `linear` because the fill is progress. Commit in JS when the fill's `transitionend` fires while still pressed.

```css
.hold .fill {
  clip-path: inset(0 100% 0 0);
  transition: clip-path 200ms var(--ease-out);
}
.hold:active .fill {
  clip-path: inset(0);
  transition: clip-path 2s linear;
}
.hold:active {
  transform: scale(0.97);
}
```

**D9. Smaller ones.**

- Tab indicator in sync: duplicate the tab list styled as active and clip it to the active tab, `clip-path: inset(0 var(--r) 0 var(--l))` with `transition: clip-path 250ms` ease-in-out (`--l`/`--r` inline on the copy); text and background change as one.
- Scroll reveal (marketing only): `clip-path: inset(0 0 100% 0)` → `inset(0)` over 600ms ease-in-out, `data-visible` set once by an `IntersectionObserver`; don't replay on every scroll.
- Draw, then check (sequence): `pathLength="100"`, `stroke-dasharray: 100; stroke-dashoffset: 100` on both paths, animated to `0` with `forwards` on `cubic-bezier(0.645, 0.045, 0.355, 1)`: box 0.6s, tick 0.4s delayed 0.5s.
- Crossfade that won't settle: `filter: blur(2px); opacity: 0.7` mid-swap on 200ms `ease` blends two objects into one; blur under 20px (costly in Safari).

**Only if already installed.**

- Motion: `AnimatePresence mode="popLayout"` + `layout` for leave-with-gap and view swaps; `mode="wait"` for two rich states resizing both ways; a missing `key` is why an exit doesn't play. Direction-aware steps pass `custom={direction}` on both `AnimatePresence` and the child. Non-uniform stagger: `delayChildren: stagger(0.06, { ease: "easeOut" })` (older: `staggerChildren`). Drag: `drag="y"`, `dragConstraints`, `dragElastic={0.2}`, `onDragEnd` reading `info.offset` and `info.velocity`; linked values via `useMotionValue` + `useTransform`.
- Vaul: floating drawer override to 200ms (D3); `data-vaul-no-drag` on interactive children.
