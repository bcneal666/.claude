# AI-search visibility checks

This file is for AUDIT: list each finding with its file path, issue and fix, and edit nothing, because the user picks which findings to fix first.
Read it once, in Stage 1. It covers only what decides whether an AI engine can reach, read and cite a page; Stage 2 owns sitemaps, canonicals, metadata and schema syntax in general, so a finding listed here is not repeated there.

Work from the step 1 context block. Audit templates, not pages: one finding on `app/blog/[slug]/page.tsx` covers every post. Priority pages: home, about, pricing, product, docs index and top docs, comparisons, top posts. A section that does not apply gets one report line saying why.

## 1. Crawler access

An engine cites only what its crawler could fetch. Blocking each purpose costs something different:

- **Search discovery**: `OAI-SearchBot`, `PerplexityBot`, `Claude-SearchBot`, `meta-webindexer`, `Bingbot`, `Googlebot`. Blocking costs citations in ChatGPT search, Perplexity, Claude, Meta AI, Copilot, AI Overviews.
- **User-triggered fetch**: `ChatGPT-User`, `Claude-User`, `Perplexity-User`, `meta-externalfetcher`. They may ignore robots.txt, but a server block still stops them.
- **Training**: `GPTBot`, `ClaudeBot`, `meta-externalagent`; and `Google-Extended` for Gemini training and grounding (no effect on Google Search). Blocking them does not block citations.
- **Link preview**: `facebookexternalhit`; blocked, shared links lose title and image.

Names as of late 2026; vendor crawler docs are authoritative.

- **Search bots blocked** (high). Check the robots source (static file or a generator such as `app/robots.ts`). Finding: `User-agent: *` with `Disallow: /` in production (often a staging rule that shipped), or a discovery token inside a `Disallow: /` group. Fix: the default below.
- **Named group drops wildcard rules** (medium). `User-agent: GPTBot` replaces the `*` group for that bot, so private-path `Disallow` lines stop applying to it. Fix: repeat them in each named group, or remove groups nobody decided on.
- **Allowlist instead of wildcard** (medium). `*` disallowed, a few named bots allowed: this shuts out agent search APIs with their own crawlers (Exa, Tavily, Brave, Parallel). Fix: allow on `*`, deny by exception.
- **Server blocks AI agents** (high). Grep `GPTBot|ClaudeBot|PerplexityBot|isbot|user-agent|userAgent` in `middleware.*`, server entry, `_worker.js`, `nginx*.conf`, `.htaccess` (`RewriteCond %{HTTP_USER_AGENT}`). Finding: a 403, redirect or challenge for those agents, which overrides any robots.txt. Fix: exempt discovery and user-triggered agents; rate-limit with `429` + `Retry-After`, not a challenge page.
- **Training stance undecided** (low, needs user). Allowing or blocking training tokens is the owner's choice, not a defect. Report the current state; the Pick decides.
- **`facebookexternalhit` blocked** (low). Fix: leave it on the wildcard.

Default (`/api/` and `/admin/` are placeholders; keep the project's own private paths):

```text
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/

# Optional training opt-out; this group replaces * for these bots.
User-agent: GPTBot
User-agent: ClaudeBot
User-agent: meta-externalagent
User-agent: Google-Extended
Disallow: /

Sitemap: https://example.com/sitemap.xml
```

Next.js `app/robots.ts`: `rules: [{ userAgent: '*', allow: '/', disallow: [...] }, { userAgent: ['GPTBot', 'ClaudeBot', 'meta-externalagent', 'Google-Extended'], disallow: '/' }]`, plus `sitemap`.

With a URL, check read-only: `curl -s -o /dev/null -w "%{http_code}" -A "OAI-SearchBot" <url>`, then `Claude-User` on `/pricing` and, for stores, `/checkout`. CDN/WAF bot settings live outside the repo; tag them needs user.

## 2. Content in the initial HTML

Most agents never run JavaScript, so text that appears only after hydration does not exist for them.

- **Main content client-rendered** (high). Grep page-level `'use client'` holding body copy, `useEffect` + `fetch` filling prose, `dynamic(..., { ssr: false })`, Astro `client:only`, Nuxt `ssr: false`, SvelteKit `export const ssr = false`, a Vite/CRA `index.html` with only `<div id="root"></div>`. Finding: definition, pricing, docs text or FAQ answers missing from server HTML. Fix: render or prerender the route; keep interactivity in a child client component. With a URL, `curl -s <url> | grep -c '<key sentence>'` confirms.
- **Facts in media or widgets** (high for pricing, else medium). Plans in an image, calculator or "contact sales" form; the annual price only in toggle state; reviews and logos injected by a widget or baked into images. Fix: facts as HTML text; fact-bearing images get an `alt` stating the fact.
- **Content fetched on click** (medium). Tabs or accordions that load on interaction hide their text; `<details>` or all panels in the DOM are fine.
- **Soft 404s** (medium). A SPA catch-all (`vercel.json` `/(.*)` → `/index.html`, Netlify `/* /index.html 200`) answers 200 for dead URLs. Fix: a 404 route with a 404 status.
- **Priority page noindexed** (high). Detection and fix: technical-onpage.md §1 (noindex / X-Robots-Tag); list it here only when the page is one meant to be cited.
- **Gated authority content** (medium). The best guide or PDF sits behind a login or email form. Fix: a public HTML version; gate a bonus asset instead.

AgentReady IDs for tags: AR-FIND-01 robots.txt and bot protection let agents in, AR-READ-01 answer in initial HTML, AR-READ-02 real status codes.

## 3. llms.txt and discovery files

Google ignores llms.txt; ChatGPT, Claude, Perplexity and coding agents read it when they find it, so weight priority by the engines the user cares about.

- **Missing llms.txt** (medium). Check `public/llms.txt`, `static/llms.txt` or a route (`app/llms.txt/route.ts`, `src/pages/llms.txt.ts`). It lives at `/llms.txt`; a subpath file such as `/docs/llms.txt` covers only URLs below it.
- **Malformed** (medium). No H1, headings inside the summary, relative or dead links, a pitch instead of a summary. Fix to this order (only the H1 is required; `## Optional` holds links an agent may skip):

```markdown
# Example

> Example is a [category] that [does X] for [audience]. [Pricing model or licence.]

Key facts for reading the rest: supported stacks, plan names.

## Docs

- [Quickstart](https://example.com/docs/quickstart): install and first request
- [API reference](https://example.com/docs/api): endpoints, auth, rate limits

## Product

- [Pricing](https://example.com/pricing): plans, limits, overage

## Optional

- [Blog](https://example.com/blog): background reading
```

- **Nothing links to it** (medium). Agents reach llms.txt, `openapi.json` and `.well-known/*` through links far more than by guessing. Fix: a footer link plus `<link rel="describedby" href="/llms.txt">` in the head (llmstxt.org's relation).
- **Hand-kept list drifts** (low). With MDX, a CMS or a docs framework, generate llms.txt at build from the same source.
- **No `llms-full.txt`** (low). All docs or site content in one file, one request; generate it beside llms.txt.
- **Sitemap misleads** (medium). `lastModified: new Date()` on every entry in `app/sitemap.ts` or a build timestamp fakes freshness and teaches engines to ignore `lastmod`. Fix: real edit dates; list pricing, docs and about; absolute `Sitemap:` line in robots.txt.
- **Emerging files** (low; skip unless asked). `/.well-known/ai-catalog.json` with `<link rel="ai-catalog" href="/.well-known/ai-catalog.json">` once there are several agent surfaces; OKF at `/okf/`; WebMCP. No engine is known to use them yet.

## 4. Structured data for citation

Schema hands engines the entity, author and dates without guessing; expect no fixed lift. Grep `application/ld+json`, `@context`, `schema-dts`, `JsonLd`, `next-seo`. Fields per page type:

- Home, about: `Organization` (+ `WebSite`) with `name`, `url`, `logo`, `description`, `sameAs`.
- Article, guide, docs: `Article`, `BlogPosting` or `TechArticle` with `headline`, `author` (`Person`: `name`, `url`), `datePublished`, `dateModified`, `publisher`.
- Visible Q&A: `FAQPage`. Numbered how-to: `HowTo` with `step[]`. Comparison: `ItemList`.
- Product, pricing: `Product` or `SoftwareApplication` + `Offer` (`price`, `priceCurrency`, `availability`, per variant when prices differ). Stores: `MerchantReturnPolicy`, `OfferShippingDetails`.
- `Review`, `AggregateRating`: only for ratings the page shows.

Google limits FAQ rich results to government and health sites; keep `FAQPage` for engines that parse it, not for a Google lift.

- **Missing entity or article markup** (medium). No `Organization` on home, or article templates without `author` and `dateModified`.
- **Facts only in schema** (high). A price, limit or date exists only in JSON-LD or a hydration payload; agents read visible text and Markdown converters drop `<script>`. Fix: show it as text too.
- **Client-injected JSON-LD** (medium). Added in `useEffect` or by `react-helmet` without SSR. Fix: emit it in server HTML.
- **Markup without matching content** (medium). `FAQPage` with no visible Q&A, ratings with no shown reviews. Fix: remove it or add the content; mismatches break Google's structured-data policies.

Use one `@graph` per page with `@id` references between entities (`Article.publisher` → `Organization`); in React render it via `dangerouslySetInnerHTML` with `JSON.stringify(data).replace(/</g, '\\u003c')`.

## 5. Answerable content structure

Engines lift passages, not pages, so each key answer has to stand alone. Read the priority pages' source (JSX, MDX, Markdown, CMS fixtures).

- **No plain definition** (high on home and product, else medium). The hero is a slogan and no server-rendered paragraph says what the product is. Fix: first paragraph "[Product] is a [category] that [does X] for [audience]." plus one or two specific sentences.
- **Headings that answer nothing** (medium). H2s like "Overview", "Features", "Why us"; zero or several H1s. Fix: one H1; H2/H3 as the question or task a user would type ("How much does Example cost?") where it matches a real query, not on every heading.
- **Answer buried** (medium). Background first, or the block leans on "as mentioned above". Fix: answer in the first 40–60 words under the heading (a heuristic), self-contained, one idea per paragraph.
- **Wrong container** (medium). Comparisons in prose or div grids → `<table>` with a "Best for" row; steps → `<ol>`; trade-offs → pros and cons lists.
- **No FAQ** (low). Pricing or product pages without one. Fix: natural questions ("Does Example work with…") with 50–100-word answers that open with the answer, in HTML.
- **Vague or unsourced claims** (medium). "Blazing fast", "trusted by thousands", stats without source or year. Fix: specific numbers with source and date; with no real figure in the project, tag needs user.
- **Untagged code blocks** (low, docs). Agents copy code verbatim. Fix: a language on every fence, examples current.
- **Keyword stuffing** (medium). It lowered visibility in the GEO study. Fix: say it once, naturally.

## 6. Author, date and fact signals

- **No byline or author page** (medium; skip for product-only sites). Article template lacks a visible author linking to `/authors/<slug>` with bio and credentials.
- **Undated or falsely dated** (medium). No visible "Last updated", or a date from `new Date()` at build. Fix: date from frontmatter or git, shown as `<time datetime="2026-11-20">` and matched in `dateModified`.
- **Contradicting facts** (high). Grep prices (`\$[0-9]`), plan names, limits, versions and rate limits across pricing page, docs, README, `package.json` `description`, llms.txt and JSON-LD. Two values for one fact make agents guess or pick a vendor whose docs agree. Fix: one owning page per fact; others repeat it exactly or link it.
- **Entity description drifts** (low). `<title>`, meta and `og:description`, `Organization.description` and the llms.txt summary describe the product differently. Fix: one category-and-audience phrase everywhere; `<html lang>` set.

## 7. Duplicates that split citations

Only copies that make engines cite the wrong version; host, slash and parameter canonicals are Stage 2.

- **Stale copies live** (medium). Old pricing pages, old docs versions (`/v1/`) or retired product pages stay indexable with outdated facts. Fix: 301 to the current page, or canonical to latest plus a version banner.
- **Markdown mirrors duplicate** (medium). Separate `.md` URLs compete with the HTML. Fix: serve Markdown at the same URL for `Accept: text/markdown` with `Vary: Accept`, or send `Link: <https://example.com/page>; rel="canonical"` on each `.md` response.
- **Cross-posts without canonical** (low). Medium, dev.to or LinkedIn copies. Fix: publish on the site first; post a summary that links back elsewhere.

## 8. Agent-readable alternates and actions

- **No Markdown alternate** (low). Agents often request Markdown, though it did not change task success in the one controlled test, so the HTML comes first. Fix: `<link rel="alternate" type="text/markdown" href="/page.md">` or `Link: </page.md>; rel="alternate"; type="text/markdown", </llms.txt>; rel="describedby"`; MDX docs can emit a `.md` per page at build.
- **No `/pricing.md`** (low). Plain file with each plan's monthly and annual price, limits and inclusions, linked from the pricing page, only when the visible page states the same numbers.
- **Unlabelled controls** (medium on signup, demo, contact, checkout). `div onClick` actions, inputs without `<label>`, `name` or `autocomplete`, no `<main>`/`<nav>`/`<article>`. Fix: native `<button>`, labelled `<form>` fields, a text confirmation.
- **Hidden agent surfaces** (medium, API products). `openapi.json`, an MCP server or a CLI exists but nothing links it. Fix: link from home, docs index and llms.txt.

## Fix guardrails

- Use only facts the project states; a missing stat, quote, credential or price is tagged needs user, never invented.
- Propose no AI-only pages and no content chopped into fragments: Google treats AI-targeted variants as scaled content abuse, and the AdSense rule in SKILL.md forbids thin duplicates. Keep Markdown mirrors and `llms-full.txt` out of the index.
- llms.txt and docs describe how to use the product. A line telling agents to prefer it is prompt injection, and agent platforms discount it.

## Report

One line per finding, sorted high → medium → low: `priority — file:line (or route/template) — issue — fix`, then tags: `verified` or `inferred`, `needs user`, an AR ID. Example:

`high — public/robots.txt:2 — User-agent: * + Disallow: / blocks OAI-SearchBot, PerplexityBot, Claude-SearchBot — allow on *, keep existing private paths; training opt-out only if the user chooses — verified, AR-FIND-01`

**High** stops an engine reaching or reading a priority page, or feeds it contradicting facts. **Medium** weakens citation of a readable page. **Low** is an emerging or bonus signal. After the findings, list what passed (so the fix step leaves it alone), skipped sections with the reason, and what stays unconfirmed: CDN/WAF bot rules and index presence in Google, Bing and Brave. Live citation checks cannot be confirmed locally.
