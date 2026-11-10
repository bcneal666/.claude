# up-design criteria

Score each dimension by evidence (screenshot region or `file:line`). A gap needs a concrete fix with values.

## Typography
- Max 2 families; display vs body contrast is deliberate, not default system stack.
- Modular scale with ≥1.25 step between levels; heading sizes use `clamp()` for fluid scaling.
- Body 16–20px, line-height 1.5–1.7, measure 45–75ch; headings line-height 1.0–1.25, tight tracking on large display.
- Weights limited (≤3); no faux bold/italic; `font-display: swap`; numerals tabular where aligned.
- Chinese/CJK: dedicated CJK font fallback, line-height ≥1.7, no mixed-width punctuation glitches.

## Whitespace
- Spacing on one scale (4/8px base); section padding generous and consistent (e.g. 96–160px desktop).
- Related items closer than unrelated (proximity); no crowded edges; consistent gutters/margins.
- Dense areas have a reason; empty areas feel intentional, not unfinished.

## Visual hierarchy
- One clear focal point per viewport; reading order matches importance.
- ≤3 emphasis levels per screen; primary CTA unmistakable, secondary visibly lower.
- Size, weight, color, position do distinct jobs; nothing competes with the hero element.

## Color
- Palette: 1 dominant, 1 accent, neutrals; accent used sparingly (~10%).
- Text contrast ≥4.5:1 (≥3:1 large text); check on every surface, incl. hover/disabled.
- Colors come from tokens; dark mode (if supported) re-tuned, not inverted.
- Avoid default-template palettes (generic purple gradient on white).

## Responsive (375 / 768 / 1440)
- No horizontal scroll; no clipped or overlapping content at any width.
- Layout reflows by design (not just shrinks); touch targets ≥44px; tap spacing ≥8px.
- Images sized/cropped per breakpoint; line length stays in range; fixed elements don't eat viewport.

## Originality
- At least one memorable, ownable idea (layout, type treatment, illustration, interaction concept) that a template wouldn't produce.
- Visual language consistent end to end; distinct from the stock hero + 3 cards + footer pattern.
- Originality never trades off legibility, accessibility or AdSense policy.

## Out of scope (delegate)
- Motion, micro-interaction → `/up-animate`.
