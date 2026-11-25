# Stress, mobile and toast checks

This file is for DIAGNOSIS: list each finding with `file:line` and its fix, and edit nothing.
Fixing while still diagnosing breaks the fix order up-design relies on (stability → removal → performance → motion).
The fix is applied later, in step 3.

Serves Diagnose steps 2.5–2.7. A skipped section gets one line in the report saying why. A finding that repeats a step 2.2 ux-rules gap is listed once, under that section.

## 1. Worst-case data stress (step 2.5)

Skip when no in-scope component renders data (lists, tables, cards, profiles, counts, badges).

Demo data is picked to make the design look good: names that fit, counts without separators, every optional field filled. Use values a real user could produce or the real schema limit; `aaaa…` × 5,000 gets dismissed as "never happens". Don't stop at long text: the breaks that ship are the short name, the missing avatar, "1 members", the empty list.

1. **Map the surface.** Per component, list every rendered value with source, type, limit and whether it is optional. Include header counts, relative times, badge text, labels from data, tooltips, avatars and the list length.
2. **Find limits** in Zod/Yup/Valibot schemas, migrations, API types, `maxLength`. No limit, or a frontend limit shorter than the backend column (longer values arrive by import or API) → Fragile.
3. **Try each case below that applies**, mixed across rows as real data is. Reference values: `bartholomew.fitzgerald@northwind-industries-holdings.example.com`, `Aleksandra Wiśniewska-Kowalczyk`, `Christopher Alexander Montgomery III`, `Benachrichtigungseinstellungen`, `Invitation expired 12 days ago`.
4. **Check at** the real container width (a sidebar list is not a full-page list), 320px, the widest layout and 200% zoom, plus dark mode and `dir="rtl"` if supported. Use step 2.1 screenshots where they show the case, else reason from markup and CSS; mark each finding verified or inferred. Adding fixtures or mocks to try a case is an edit, so don't.

`§N` in this table means ux-rules §N.

| Case                                  | What breaks                             | Fix                                             |
| ------------------------------------- | --------------------------------------- | ----------------------------------------------- |
| Long name, title or role              | Overflows instead of wrapping           | `min-width: 0` on text; grid `minmax(0, 1fr)`   |
| Long text beside avatar or •••        | Avatar squished; action pushed off      | `flex-shrink: 0` on avatar, icon, action        |
| Name wraps to three lines             | Centered avatar looks adrift            | `align-items: flex-start`                       |
| Email, URL, filename (no spaces)      | Runs past the edge, shoves siblings     | `overflow-wrap: anywhere`, not `break-all`      |
| Values differing at the end           | End truncation makes them identical     | Middle truncation (§4)                          |
| Long status badge; every enum value   | Badge wraps or squeezes the name        | `white-space: nowrap; flex-shrink: 0`           |
| Translated label (~30% longer)        | Fixed-width button or tab overflows     | Content width + `min-width`; no fixed `width`   |
| 12 tags; one very long tag            | Tag wall; tag wider than container      | A few, then `+8`; cap width, add `title`        |
| `… Montgomery III`, `de la Cruz`      | Initials `CI`, `Md`                     | First + last word, skip Jr/Sr/II/III            |
| `dana`; leading or repeated spaces    | Lowercase or empty-word initials        | Trim, split on whitespace runs, uppercase       |
| `🦊 Fox`, `👩🏽‍💻 Priya`, `王秀英`        | `charAt(0)` → `�`; split emoji; 1 word  | Graphemes via `Intl.Segmenter`; fallback icon   |
| `Đặng Thị Ngọc Hân`, Thai             | Diacritics clipped                      | Looser `line-height`, no `overflow: hidden`     |
| Arabic or Hebrew name                 | Punctuation, icons on the wrong side    | `dir="auto"` on user text                       |
| `Jo`, `J`, `a@b.test`                 | Empty-looking column; tiny link         | Hit area on the row, not the text               |
| Missing name or field; blank title    | Orphan `—`, blank or zero-height row    | Fall back (name → email); omit or reserve line  |
| `<script>`, `&amp;`, `**bold**`       | Raw markup or double escaping           | Escape once; no `dangerouslySetInnerHTML`       |
| Newline in one-line field; 2k chars   | Row doubles or drops text; card grows   | Decide per field; `line-clamp-2` + full view    |
| `0`, `1`                              | "0 members", ÷ 0; "1 members"           | Zero state, safe division, `Intl.PluralRules`   |
| `1284`, `12345678.9` money, `de-DE`   | Missing or hardcoded separators         | `Intl.NumberFormat` (§4); never truncate        |
| `1000000` in a count badge            | Badge width blows out                   | Compact `1M`; unread `99+` (§9)                 |
| `-42.5`, `0.1 + 0.2`, `null`, `NaN`   | Sign/color logic; `0.30000000000000004` | Test negatives; always format; guard null       |
| `142%`, `-3%`                         | Bar or meter past its bounds            | Clamp bar to 0–100%, show real number           |
| Live `99 → 100`                       | Width jumps, columns jitter             | `font-variant-numeric: tabular-nums`            |
| 0, 1, page size, page size + 1 items  | No empty state; lone card; empty page 2 | §4; view the grid with one card                 |
| 1,000+ rows, unpaginated              | Scroll stutter, slow render             | Paginate or virtualize; new dep → 「未解決」    |
| One item 10× others; same names       | Row stretches; items indistinguishable  | Clamp content; show a second field              |
| Now, 12 days ago, future date         | "0 seconds ago"; "-3 days ago"          | `Intl.RelativeTimeFormat`, "just now" (§4)      |
| `1970-01-01`, `-08:00`, `1,284 hours` | Epoch as a date; wrong day; no roll-up  | Treat 0 as missing; project TZ (§11); roll up   |
| Avatar 404s; no avatar                | Broken-image icon; odd fallback size    | `onError` → initials at real avatar size        |
| 4000×200 image; slow image; dark logo | Distorted; layout shift; logo invisible | `object-fit: cover`, `aspect-ratio`; logo plate |
| API error; partial data               | Raw `TypeError`; misaligned rows        | Error with retry (§9); same row structure       |
| No permission; current user in list   | Layout shifts; self-actions offered     | Same layout; "You" label, hide self-actions     |

Wrap, truncate or clamp per field: ux-rules §4.

**Report.** **Broken** (unreadable, action unreachable, wrong data) = high, **Ugly** (readable, visibly wrong) = medium, **Fragile** (no limit, no fallback) = low. Each finding: field, value, effect, fix, `file:line`, verified or inferred. Where more than one answer is right (wrap or truncate, paginate or virtualize), pick one and give the reason in a line, since up-design does not stop to ask. List the cases that held up as pass evidence, so step 3 knows what not to touch.

## 2. Mobile (step 2.6, only when `mobile` is true)

ux-rules §1, §5, §7 and §8 already cover target size, keyboards, `dvh`/`svh`, safe-area padding and inner `overscroll-behavior: contain`; record those gaps there. Below: the grep per symptom, plus only what ux-rules lacks. Apply a fix only where its reason holds: `user-select: none` is right on a button and a defect on body text.

- **Sticky hover after tap.** Grep `:hover` outside `@media (hover`, and a Tailwind v3 config without `future.hoverOnlyWhenSupported` (v4 `hover:` is already gated). Gate with `@media (hover: hover) and (pointer: fine)`; `pointer: fine` also excludes touchscreens that claim hover with a coarse pointer (some Android).
- **Tap flash.** No hit for `tap-highlight` → `html { -webkit-tap-highlight-color: transparent; }`; each tappable then needs its own `:active`.
- **Wrong height.** Grep `100vh`, `h-screen`, `min-h-screen` (ux-rules §8). Also `100dvh` on a marketing hero → `100svh`: `dvh` resizes as the URL bar collapses and shifts layout mid-scroll.
- **Input zoom.** Grep `maximum-scale`, `user-scalable`, and form fields at `text-xs`/`text-sm` or under 16px (ux-rules §5). iOS does not zoom back out on blur; fix the font size, not the zoom.
- **300ms tap delay.** No hit for `touch-action`/`touch-manipulation` → `touch-action: manipulation` on `button, a, [role="button"]`, so `click` fires without waiting for a double-tap.
- **Feedback on release.** Pressed state set in `onClick` or a `click` listener → `:active`, or `pointerdown` in JS; `click` fires when the finger lifts.
- **Pull-to-refresh hijack.** App-like UI (own scroll containers, draggable drawer, canvas) with no root `overscroll` → `html, body { overscroll-behavior: none; }`; leave it off a scrolling document where pull-to-refresh is welcome. Grep `touchmove` with `preventDefault` or `passive: false`: it blocks scrolling and makes the listener non-passive, costing frames; use `overscroll-behavior` instead.
- **Notch and home indicator.** Grep `safe-area-inset` against `viewport-fit=cover`: without the meta tag every `env()` inset is `0px`. Check `fixed bottom-0`, `sticky bottom-0`, fixed headers, tab bars, toasts and sheets. Inside `calc` add a fallback: `calc(1rem + env(safe-area-inset-bottom, 0px))`.
- **Long-press selects control text.** Grep `select-none`/`user-select`; on `body` it is a gap. Hand-written CSS also needs `-webkit-user-select: none` for Safari; links and images used as controls get `-webkit-touch-callout: none`.
- **Carousel drags the page.** A horizontal JS gesture without `touch-action`, or `touch-action: none` on content users scroll past. The value names what the browser keeps: horizontal carousel `pan-y`, vertical sheet handle `pan-x`, `none` only on a surface that owns every axis. A native-scroll carousel uses `scroll-snap-type: x mandatory` + `scroll-snap-align: start` and needs no `touch-action`.
- **Status bar color.** Grep `theme-color`/`themeColor`. Absent or one value → one `<meta name="theme-color" media="(prefers-color-scheme: …)">` per scheme plus `<meta name="color-scheme" content="light dark">`, matching the header's top color, not the brand. Next.js: `viewport` export `themeColor: [{ media, color }]`. Class-based theme toggle → update the tag in JS. PWA → manifest `theme_color`/`background_color`.
- **Landscape text inflation.** No hit for `text-size-adjust` → `html { -webkit-text-size-adjust: 100%; }`.

Code shows whether a declaration exists, not whether it works. Sticky hover, tap flash, URL bar vs `vh`, input zoom, tap delay, overscroll, safe areas and the soft keyboard don't reproduce in emulation: mark their behavior 「未驗證」, never pass. Report hand-off: dev server on `0.0.0.0` opened by LAN IP, Safari Web Inspector or `chrome://inspect`, keyboard open.

## 3. Sonner (step 2.7, only when `uses_sonner` is true)

shadcn/ui's toast wraps Sonner, so Toaster props may sit in that wrapper. Grep `<Toaster`, `from 'sonner'`, `toast(`, `toast.`.

- **Mounts.** Exactly one `<Toaster />`, near the root (Next.js `layout.tsx`; fine in server components). None → toasts never show; per-page or conditional → lost on unmount; layout and page both → every toast twice. A second Toaster needs its own `id` and calls that pass `toasterId`; untargeted toasts render only in the Toaster without an `id`.
- **Position.** Default `bottom-right`; compare with ux-rules §3 (bottom-left on desktop and tablet, bottom-center on mobile, 16px sides clear of the safe area) and record any mismatch. `mobileOffset` (<600px, default 16px) takes numbers, CSS strings or per-side objects. Swipe direction follows `position` (`swipeDirections` overrides), keeping ux-rules §7's exit direction.
- **Behind a modal or clipped.** Toaster inside a dialog or portal, under an ancestor with `transform`, `filter` or `overflow`, or out-z-indexed by an overlay → move it to the document root.
- **Client only.** `toast()` in a server action or server component does nothing; return the result and toast on the client. `toast()` in `useEffect` fires twice under StrictMode in dev; call it from the handler or pass a stable `id`.
- **`toast.promise`.** The first argument must be a promise (or a function returning one) that settles, or loading never ends; give `loading`, `success` and `error` (error text per ux-rules §6). A hand-managed `toast.loading` must end with `toast.success` or `toast.error` on the same `id`, or the spinner stays or a second toast appears.
- **Dark mode.** `theme` defaults to `'light'` and ignores the OS → `theme="system"`, or `<Toaster theme={resolvedTheme} />` from `next-themes`.
- **Tailwind classes ignored.** Sonner's injected styles win, so classes in `className`/`toastOptions.classNames` need `!important` (`!text-red-900`). More than a few → headless `toast.custom()` behind a project `toast()` wrapper; that is a new component, so 「未解決」.
- **Fully unstyled.** Stylesheet lost (Astro, view transitions) → `import 'sonner/dist/styles.css'` in a layout. Inside Shadow DOM → copy the style tag containing `[data-sonner-toaster]` into the shadow root.
- **Durations.** Check against ux-rules §9: no hardcoded values, error and undo toasts last longer, the result also shows on the page. `duration: Infinity` needs `closeButton` or an action.
- **Close callbacks.** `onDismiss` fires on close button, swipe and `toast.dismiss()`; `onAutoClose` on timeout. An undo commit or cleanup in only one of them misses the other path.
- **Minor.** `containerAriaLabel` defaults to English `'Notifications'`; set it in the UI language. Gray success and error is the default; `richColors` only if the design wants color.
