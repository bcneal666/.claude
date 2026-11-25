# Modern Web Guidance (platform features)

Consult before writing HTML / CSS / client JS that uses a platform feature: dialog / popover, container query, dark mode, forms, scrollbar, images and LCP, accessibility, view transition, scroll-driven animation, `@starting-style`, `content-visibility`, CWV. Training data holds obsolete patterns; the guides are current. Pure backend, tooling config, copy edits: skip.

Runner: `npx -y modern-web-guidance@latest …` (`pnpx modern-web-guidance@latest …` when pnpm is available, no `-y`; Windows `npx.cmd`). Needs network. Hangs offline → retry with `npx --offline …`.

## 1. Search

One query per feature, 2–5 English words, `<verb> + <UI/platform object>`. No framework, library or project nouns. Split compound tasks. Translate intent into the implied primitive (`"confirm dialog"`, not `"confirm destructive action"`; `"date picker input"`, not `"pick a date"`).

```sh
npx -y modern-web-guidance@latest search "light dismiss dialog"
```

Returns `[{ "id", "description" }]`. Judge by `description`. Weak or empty → rephrase once with the concrete component noun (`dialog`, `popover`, `table`, `form`), then `list` as last resort. Still nothing → implement normally, note it in the report.

## 2. Retrieve

```sh
npx -y modern-web-guidance@latest retrieve "<id>,<id>"
```

Take the matching use-case guides plus any discipline guide that applies (`html`, `css`, `js`, `forms`, `accessibility`, `color`, `performance`, `security`). Output > 9.5 KB is saved to a temp file → read it in full with the Read tool.

## 3. Apply and verify

- Guides are vanilla HTML/CSS/JS; adapt to the framework without dropping the modern feature:
  - Types: spread or cast new HTML attributes (`{...({ popover: 'hint', commandfor: id } as any)}`) rather than removing them.
  - SSR: guard `window` / `HTMLElement`; load polyfills via bare `import('<pkg>')` in client effects, never copy from `node_modules`.
  - DOM: call `showModal()` etc. via refs; per-instance IDs and `anchor-name`s (`useId()`); keep `:root` and `@starting-style` top-level.
- Browser support: Baseline widely available → no fallback needed. Anything newer → apply the guide's fallback, unless the project (CLAUDE.md / AGENTS.md / DESIGN.md) states a support policy; then use the guide's "Baseline since" data against it.
- Before moving on, check the change against the guide: fallbacks present, no unrequested features added.

## 4. Report

Append a `### Modern Web Guidance` section at the end of the up-design report:

- Each applied guide: `- **\`<id>\`**: <non-obvious API, override or fallback used and the pitfall it prevents> ("<short verbatim quote of that rule>")`. Only guides that shaped this run's changes; never guess ids or quotes from memory (re-run `retrieve` after compaction).
- Searched but nothing applied → one sentence naming the topics checked and why none applied.
