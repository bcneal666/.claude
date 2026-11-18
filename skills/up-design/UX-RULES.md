# UX rules

Cross-project interaction and layout rules: desktop/mobile presentation, touch and gestures, data display, loading feedback. Visuals (color, type size, radius) live in project `DESIGN.md` and `CRITERIA.md`.

Every `/up-design` run checks this file section by section; verdict per section: `pass` / `gap` / `N/A` / `unverified`.

Desktop Dialog / mobile Drawer: each project wraps its own. Switch `Dialog`/`Drawer` with the project's width media-query hook, extract content into a shared component, behavior per this file. Project has no Drawer component → ask user before adding one; do not hand-write gestures, do not add a bottom-sheet package for this. Component names follow the project's existing ones (`Combobox`, `Sidebar`, `Spinner`, `Kbd` etc. are generic; use project equivalent when it exists).

## 1. Breakpoints and decision principles

- Breakpoints follow Tailwind: mobile `< md` (768px), tablet `md`–`lg`, desktop `≥ lg` (1024px). Mobile-first: write mobile styles first, add up with `md:`, `lg:`.
- Width decides layout (Dialog vs Drawer, table vs cards); pointer capability decides interaction. Detect touch with `(hover)`/`(pointer)` media queries or `pointer-coarse:`; never `navigator.userAgent`, never infer from width (iPad has touch and mouse). Width hook only for layout switching, never for hover or click behavior.
- Acceptance widths 375/768/1024/1440 + real device. Emulators miss sticky hover, tap delay, safe area, soft keyboard; checked only at desktop width = not done.
- 320px page must not scroll horizontally (WCAG 1.4.10 reflow); blocks that scroll internally (tables, code) excepted. 320 is a reflow check only, not an acceptance width.

## 2. Overlays and pickers: mobile always bottom Drawer

Mobile keeps no floating dropdown, menu, Popover.

| Component | Desktop `≥ md` | Mobile `< md` |
| --- | --- | --- |
| Short dialog (confirm, ≤ 3 fields) | centered `Dialog` | bottom `Drawer`, swipe down to close; primary button pinned at bottom with safe area padding |
| Confirm box (only for irreversible actions: delete, discard unsaved changes) | `AlertDialog` | bottom `Drawer`; confirm on top, cancel below, both full width |
| Long form (new record, many fields; judgment and routing in next subsection) | centered `Dialog` | full-screen page: route change, back button left in title bar, submit button sticky at bottom; form body extracted into a shared component used by both |
| Form dropdown `Select` | floating list | `Drawer` + 48px option rows, closes on pick, current option checked; groups, icons, descriptions allowed |
| List filter | dropdown pills | search box + "篩選" button (shows selected count) → panel lists each condition and "清除篩選"; tap a condition to stack a second-level option Drawer |
| Date | `Popover` + `Calendar` | `Drawer` |
| Multi-select dropdown (tags, assignees: "checklist shown on open") | `Combobox` multi-select (chips) | `Drawer` + 48px check rows, search box on top (required when options > 10), fixed bottom "確認" button (shows selected count); does not close on check |
| Action menu `DropdownMenu`, avatar menu | dropdown (submenus allowed) | `Drawer`; submenus (theme, language) become segmented buttons that switch directly |
| Help ⓘ, emoji and other small-panel `Popover` | `Popover` | `Drawer`; already inside a Drawer → expand in place |
| Notification panel | `Popover` | full-height `Drawer` sliding right-to-left (`swipeDirection="right"`, swipe right to close) |
| Sidebar | fixed 260px | left drawer (sidebar component handles it) |

### Short dialog or long form

**All** conditions true = short dialog (mobile `Drawer`); any false = long form (mobile new page); unsure → treat as long form:
- ≤ 3 fields, all short controls: single-line input, dropdown, date.
- No `Textarea`, file upload, add/delete dynamic rows, multi-step flow.
- On mobile (375×667) with soft keyboard open the content still fits, no scrolling inside `Drawer`.

### Long form routing and behavior

- Has own route (e.g. `/cases/new`, `/people/[id]/edit`): desktop and mobile can both open the URL directly, refresh, share; page checks permission server-side, unauthorized → redirect to list.
- Entry splits by width at click time: `≥ md` opens dialog (no route change), `< md` `router.push` to the page. Width check uses project's width hook or media query, not UA. Entry is a real link to the page (`<a href="/cases/new">`); `≥ md` intercepts plain click to open dialog, ⌘/middle-click still opens page version (see "10. Navigation, links and shortcuts").
- Desktop opening URL directly: render page version (same page frame), no auto dialog, no redirect.
- Form body written once, shared component, `variant="dialog" | "page"` switches frame; no separate field and validation sets per layout.
- Page-version frame: back button left in title bar (coarse pointer ≥ 44px), submit button sticky at bottom (safe area padded).
- Back: arrived from within the site → `router.back()`; opened by URL directly (no previous page) → `replace` to list. Submit success → `replace` to list (else back returns to an empty form).
- Unsaved changes: back button first shows "放棄變更" confirm box; refresh and tab close blocked with `beforeunload`. Browser back gesture and sidebar links cannot be intercepted — known limit, do not force.

### Other overlay rules

- Confirm boxes only for irreversible actions (delete, discard unsaved changes). Reversible actions (disable, archive, remove from) execute directly with a toast carrying an "復原" button; overusing confirms trains users to press confirm by reflex.
- Options > 10 auto-searchable: desktop uses `Combobox` (search box on top), mobile `Drawer` search box on top; match option text and group names.
- No stacked Drawers: no Drawer opened from a dialog or Drawer. Exceptions: pickers inside the "篩選" panel, and `Select`, date, multi-select dropdown inside a dialog, stacked as second level. Contexts like "pick a person" in a dialog: list "search box + list" directly inside the Drawer.
- Checkbox and Radio shown directly on the page stay inline (not overlays, not moved into Drawer). Radio > 6–7 options → `Select` (Drawer on mobile).
- "Shown on open" multi-choice lists always use multi-select dropdown: Checkbox groups with > 5–6 options are not laid out on the page, use `Combobox` multi-select; mobile is also Drawer; differs from single-select in not auto-closing on check, closed by bottom "確認" button. Single-select Drawer keeps "closes on pick".
- `HoverCard`, `Tooltip` for supplementary info only (invisible on touch); essential info needs a click-accessible alternative.
- Native `<select>` is the simple fallback when not adopting Drawer, not first choice.
- Full-screen image preview, video and similar "content itself" are the exception: full screen at every size, neither dialog nor Drawer.

## 3. Narrow layouts

| Layout | Desktop | Tablet | Mobile |
| --- | --- | --- | --- |
| Content panel | 16px margin all sides, 20px padding | same as desktop | full bleed, radius 0, 16px padding |
| List/table | table + filter bar | table (horizontal scroll, first column fixed) | card list (title + status tag + two lines secondary info); filters go into "篩選" panel |
| Three-column detail | list \| content \| properties | list \| content; properties open bottom Drawer | single column drill-in (list → detail, route change, back top-left); properties open bottom Drawer |
| Toast | bottom-left | bottom-left | bottom-center, 16px left/right, clear of safe area |
| Login/sign-up | two-column card | same as desktop | single column, illustration hidden |

## 4. Data display

- **Truncation must not hide data**: each field decides wrap, truncate or line limit, and guarantees the truncated value is fully reachable (`title`, tooltip, or detail page).
  - Wrap: text used to identify items (names, detail page titles); two lines usually enough.
  - End truncation: secondary info meaningful from the start (job title, description, last-message preview).
  - Middle truncation: values that differ at the end (filenames, same-domain emails, paths); end truncation would make them look identical.
  - Multi-line preview in cards uses `line-clamp` for uniform card height.
  - Numbers, amounts, dates and any value users compare are not truncated; give enough space.
- Numbers with thousands separators via `Intl.NumberFormat` by locale, no hand-written separators. Relative time ("3 天前") beyond ~1 week switches to absolute date; use `Intl.RelativeTimeFormat` / `Intl.DateTimeFormat`.
- Empty states: 0 records and no search results both get explicit, separate empty states. Pagination and "共 N 筆" must not break at exactly one page vs one record more. ≥ 1,000 records → paginate or virtual scroll.

## 5. Touch and input

- Coarse pointer (`pointer-coarse:`): interactive targets ≥ 44px; visual may stay 40px, enlarge hit area with padding or `pointer-coarse:`. Mobile option rows 48px.
- Feedback on press (`:active`), not on release. Disable browser tap flash globally (`-webkit-tap-highlight-color: transparent`); components or project provide the pressed state.
- Control text (buttons, tabs) `user-select: none` to avoid long-press text selection; body text and data must stay selectable, do not disable page-wide.
- Hover-only actions (row •••, hover-revealed buttons) stay visible on touch devices or get another entry. Hover styles only for hover-capable devices (`@media (hover: hover)`) to avoid stuck hover after touch.
- Keyboard by content: verification code `inputmode="numeric"`, amount `inputmode="decimal"`, email `type="email"`, phone `type="tel"`; account and verification code add `autocapitalize="none"`, `autocorrect="off"`; `enterkeyhint` (`send`, `search`, `done`) marks the Enter key action.
- Never disable zoom: no `user-scalable=no`, `maximum-scale=1`.
- Input font size: 16px on coarse pointer, else iOS zooms the page on focus. Component has `md:text-sm` → also add `md:pointer-coarse:text-base` (iPad portrait ≥ 768px otherwise zooms).
- **Enter to submit** (chat inputs only):
  - `(hover: hover) and (pointer: fine)` (PC): Enter submits, Shift+Enter newline.
  - Phone, iPad (including physical keyboard): Enter newline.
  - ⌘/Ctrl+Enter always submits.
  - No submit during IME composition (`event.isComposing` or `keyCode === 229`; CJK candidate selection with Enter would submit by mistake).
  - Multi-line fields in ordinary forms do not enable Enter-to-submit.
- During composition, live search, autocomplete, character count also pause (`onChange` fires while composing; query sent mid-bopomofo): check `isComposing` (or `compositionstart`/`compositionend`), handle after composition ends.
- Live search: debounce ~300ms; new query cancels old request with `AbortController`, show only the latest query's results; clear button when there is content.

## 6. Form behavior

Field appearance and error components: see `DESIGN.md`; here behavior only.

- Error timing: show on blur or submit, not per keystroke on first input; once a field showed an error, switch it to live validation, clear immediately when fixed.
- Submit failure: move focus to first error field and scroll it into view; keep entered content; map server errors to fields when possible, top of form only when unmappable.
- Do not replace error explanation with a disabled submit button (user cannot tell why): keep button clickable, point out the problem on press. Exception: chat input with empty content may disable the submit button.
- `autocomplete` standard values: `email`, `username`, `current-password`, `new-password`, `one-time-code`, `tel`, `name`. Only where "user fills own data" (login, sign-up, personal settings); support agent entering a customer's data uses `autocomplete="off"`, else it autofills the agent's own email.
- Password and verification code fields do not block paste or password managers (WCAG 3.3.8); same flow does not ask again for already-entered data (3.3.7).
- Liberal accept, strict store: trim whitespace; full-width digits to half-width; phone, tax ID allow spaces and `-`, normalize before storing.
- Disabled needs a reason: actions without permission are hidden; disable only when temporarily unavailable, and explain the reason in text beside it (tooltip invisible on touch).
- Error messages say what happened and what to do ("Email 格式不正確，請檢查是否漏了 @"), not just "格式錯誤" or an error code.
- File upload: state accepted formats and size limit first, validate client-side after file selection; show progress, cancellable; failure retryable. Chat input supports paste and drag-drop.

## 7. Gestures

- Drag and swipe-to-close use the project's existing `Drawer` component (must already handle finger-following drag, swipe close, backdrop fading with progress), no hand-written gestures; ask user before adding a gesture package.
- Leave the way you came: bottom Drawer down, right-side notification right, toast in its entry direction.
- While finger holds, follow 1:1, no easing, no delay; mid-close can be grabbed back, do not wait for animation to finish.
- Draggable area sets `touch-action`, handing only the drag direction to the gesture to avoid fighting page scroll; pressing buttons and inputs inside Drawer does not start a drag.
- Every drag or swipe needs a tap alternative (WCAG 2.5.7): Drawer has close button and "取消", drag sort has "上移／下移", swipe-revealed row actions have a menu entry. Gesture accelerates, never the only entry.
- Press-and-hold confirm (hold to delete): progress advances at constant speed, honestly showing remaining time; released before full → snaps back quickly.
- Reduced motion (`prefers-reduced-motion`): keep finger-following drag (user's own action); drop fling inertia and bounce, after release use only a short fade-out, no displacement.

## 8. Viewport height, safe area and scrolling

- App frame, bottom-fixed UI use `h-dvh`; first screen `min-h-svh`. Not `h-screen`/`100vh` (mobile URL bar makes height overflow).
- Set `viewport-fit=cover`; fixed top bars, bottom bars, edge-hugging elements pad `env(safe-area-inset-*)`, also left/right in mobile landscape.
- Soft keyboard must not cover inputs and bottom-fixed buttons: scroll focused field into view; bottom-fixed bar moves up with keyboard (`viewport` meta `interactive-widget=resizes-content`, or `visualViewport`). Verify on real device only.
- Scrollbar gutter: `<html>` sets `scrollbar-gutter: stable` so layout does not jump as content grows/shrinks; no extra padding/margin offsetting the scrollbar, no `100vw` layout. Blocks scrolled by an inner `overflow-auto` container whose content height changes add their own `scrollbar-gutter: stable` (html's setting does not apply).
- Scroll areas inside Drawer, dialog, chat panel add `overscroll-behavior: contain` so scrolling past the end does not pass to the page behind.
- Sticky top or bottom bars: scroll container gets `scroll-padding-top`/`scroll-padding-bottom`, anchor targets `scroll-margin-top`, so focused or jumped-to elements are not hidden by fixed bars (WCAG 2.4.11).

## 9. Loading, feedback and error states

Every click gets an immediate reaction.

- User choices take effect immediately: tabs, filters do not wait for server; when data returns the server wins; on failure, revert.
- Content areas use skeleton, not full-page spinner. Skeleton layout matches real content (tables keep real header, mobile uses card skeleton) to avoid layout jump on arrival.
- Switch to skeleton only after loading exceeds 200ms, keeping old content meanwhile (no CSS `delay-*`: old content already unmounted shows blank); once skeleton appears, keep it ≥ 400ms.
- Surroundings stay usable: toolbar, search box not unmounted; controls that trigger more requests (pagination buttons) disabled while loading, preventing rapid clicks.
- Button submit: block duplicate submission immediately on press (disable or ignore further clicks); only after 300ms show `Spinner` at button's left and switch text to progressive form ("送出中"); once shown, keep ≥ 400ms (a spinner flashing within 300ms looks like a fault). No full-page overlay.
- First-load small block fails → show error and retry, do not let skeleton spin forever. URL not actually changing → no navigation, no loading state.
- Optimistic update (e.g. chat send): clear the input immediately and show semi-transparent "傳送中"; on failure fade out, put text and attachments back into the input and show error toast.

**Toast and action feedback**

- Toast is not the only channel: important results are also visible on the page (list update, status change).
- Error toasts do not auto-dismiss, or stay longer than success; toasts with "復原" stay long enough, pause timer on hover or focus (WCAG 2.2.1). Durations follow component default, not hardcoded.
- Copy button: click swaps icon to check mark and text to "已複製", reverts after ~2 seconds.

**Errors and exceptions**

- Error pages by case, each explaining the cause and giving an exit, not just a code:
  - 401 session expired: keep half-filled content, return to original page after re-login.
  - 403 no permission: say whom to ask for access, with exit to list.
  - 404: exit to list or search.
  - 500: "我們這邊出問題", offer retry.
  - Offline: show offline banner, auto-retry on reconnect; content submitted offline is not lost.
- Several people on the same data (common in support): when others update it show a banner, never overwrite what the user is viewing or editing; live-arriving list items are not inserted where the user is looking, show an "N 筆新資料" button instead, load on click.
- Unread count > 99 shows `99+`. Browser notification permission requested only after a user-initiated action, not on page load.

**Performance floor**

- Core Web Vitals at p75: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1.
- Images and video get `width`/`height` or `aspect-ratio` (avoid CLS); images below the fold add `loading="lazy"`, hero image above the fold does not.

## 10. Navigation, links and shortcuts

- List filters, search, page number live in URL params; refresh and shared links restore them.
- List → detail back button: previous in-site page is that list → `history.back()` (preserves scroll position, filters, page); otherwise open the list URL last seen in this tab and scroll back. Do not use a plain `<a href>` as back button.
- Navigate with real `<a>` (framework `Link`, or `Button render={<a />}`), not `onClick` + `router.push`, so ⌘/Ctrl-click, middle-click, right-click "open in new tab" work. Clickable table rows and cards also need real links (title is `<a>`, CSS stretches hit area over the whole row).
- External links: `target="_blank"`, `rel="noopener noreferrer"`, external-link icon (`aria-hidden`) and "（另開新分頁）" `sr-only` text; internal links do not open new tabs.
- Shortcuts: do not override browser and system shortcuts (⌘R, ⌘W, ⌘F); show ⌘ or Ctrl by platform (use `Kbd`); single-key shortcuts do not fire while an input or editable area has focus; every shortcut action also has an ordinary click entry.

## 11. Copy

- Buttons "verb + object" ("建立工單", "儲存變更"), never "確定", "是", "OK". Destructive confirm button states the action ("刪除工單"); confirm box title states target and consequence ("刪除工單 #1024？刪除後無法復原"). Exception: multi-select Drawer's bottom "確認（N）" confirms the selection, may stay.
- One term per concept site-wide ("工單" not mixed with "案件", "客服人員" not mixed with "客服專員"); unsure → look up project's existing wording.
- Half-width space between CJK, Latin and digits ("共 12 筆 Email"); Chinese sentences use full-width punctuation, English and digit abbreviations use half-width.
- Date-time defaults `Asia/Taipei`, 24-hour clock; relative time shows full absolute time in `title`; same year omits year, shows it only across years.

## 12. Motion

- No enter/exit animation for high-frequency actions: operations repeated dozens of times a day or more (command palette, shortcut-triggered actions, list rows, tab-switched content) switch directly. Animation only for low-frequency moments that need to convey spatial relation (opening dialog, Drawer, changing page level).
- Page transitions are enter-only: desktop fades in; mobile slides in from right going to next level, from left on back, same-level fades only. Deliberate exception: direction tells user whether they enter the next level or go back.
- User prefers reduced motion → fade only; gestures: see "7. Gestures".

## 13. Accessibility

- Interactive elements use `button`/`a`, not clickable `div`. Icon-only buttons have `aria-label`; decorative icons `aria-hidden`.
- Every field has a label; errors linked with `aria-invalid` + `aria-describedby`; required not conveyed by color alone.
- `Dialog`/`Drawer` have a title (may be `sr-only`), close on Esc, focus trap, focus returns to trigger on close.
- Focus management: after page change focus moves to `h1` or `main`; after deleting a list item focus moves to next item (none → list heading); Esc closes only the topmost overlay; do not remove the `focus-visible` outline (show for keyboard, not for mouse click).
- State not by color alone (also text or icon); text contrast ≥ 4.5:1 in both light and dark mode.
- Text enlargement: at 200% browser zoom or system large font, text must not be clipped by fixed height; containers wrapping multi-line text do not use fixed height.
- Skeleton container `role="status"` + `aria-busy="true"` + `sr-only` loading text, skeleton body `aria-hidden`; toast, unread count and other dynamic updates use appropriate `aria-live` level.
- Table headers use `th scope`, sortable columns add `aria-sort`; `<html lang>` per locale.
