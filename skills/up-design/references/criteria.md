# Static design criteria

During diagnosis, score item by item with evidence (screenshot region or `file:line`). Every gap needs a fix with real numbers. When the project's own rules conflict with a criterion, the project rule wins; list the conflict in the report.

Two handling classes:

- **Auto-fix**: objective, measurable; fix directly (merged into the report's 「穩定性」).
- **Report-only**: taste or redesign; not changed automatically; listed in the report's 「設計建議（未套用）」.

## Typography

Auto-fix:

- At most 2 font families; ≤3 weights; no faux bold / italic.
- Body 16–20px, line-height 1.5–1.7, line length 45–75ch; headings line-height 1.0–1.25.
- `font-display: swap`; tabular numbers for aligned digits.
- CJK: dedicated CJK fallback, line-height ≥1.7, no mixed punctuation widths.
- Each type-scale step ≥1.25×; headings scale fluidly with `clamp()`.

Report-only: whether the display / body pairing is intentional, not default system fonts.

## Whitespace

Auto-fix:

- Spacing sits on one 4/8px scale; section padding consistent; gutter / margin consistent.
- No crowded edges.

Report-only: whether section padding is generous enough (e.g. desktop 96–160px), whether whitespace looks deliberate or unfinished.

## Visual hierarchy

Report-only (all taste):

- One focal point per viewport; reading order matches importance.
- ≤3 emphasis levels; primary CTA recognizable at a glance, secondary clearly weaker.
- Nothing competes with the main visual.

## Color

Auto-fix:

- Colors come from tokens, no hard-coded values; if dark mode is supported, it is re-tuned, not inverted.

Report-only: ratio of 1 primary, 1 accent, neutrals (accent ≈10%); avoid default template palettes (white background with purple gradient).

## Responsive (375 / 768 / 1024 / 1440, plus 320 reflow)

Auto-fix:

- No horizontal scroll at any width (320px included); no clipped or overlapping content.
- Images crop per breakpoint; line length stays in range; fixed elements do not eat the viewport.

Report-only: whether the layout is rearranged by design or merely shrunk.

## Originality

Report-only:

- At least one distinctive idea a template cannot produce (layout, type treatment, illustration, interaction concept).
- Consistent visual language; not the common hero + three cards + footer layout.
- Originality must not cost readability, accessibility or AdSense policy.
