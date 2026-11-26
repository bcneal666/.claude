# International and local checks

This file is for AUDIT: list findings with file path and fix, and edit nothing, because the user picks what to fix after Stage 2.

Part 1 runs when the context block lists more than one locale; Part 2 when customers visit a location or the business serves a defined area. A skipped part gets one report line saying why. A finding already in `technical-onpage.md` is listed once, there.

Priority: **high** = a locale or location can drop out of the index, or customers get wrong facts; **medium** = a weak or conflicting signal; **low** = polish. Files show declarations, not Google's behavior: status codes, indexing and rich results need live verification.

## Part 1. International

### 1.0 Locate the sources

- Grep `hreflang|hrefLang|canonical|alternates|languages:|xhtml:link|x-default|localePrefix|defaultLocale|locales:|prefixDefaultLocale|strategy:|content-language|<html`.
- Look in: Next.js `generateMetadata`, `app/[locale]/layout.*`, `app/sitemap.*`, `middleware.*`, `i18n/routing.*`; Nuxt `i18n` (`strategy`, `baseUrl`, locale `language`, `iso` before v9), `useLocaleHead`; Astro `i18n.routing`, `@astrojs/sitemap` `i18n`; `_headers`, `vercel.json`, `netlify.toml`.
- next-intl middleware sends hreflang plus `x-default` in a `link` header by default (`alternateLinks`); head alternates must match it, or set `alternateLinks: false`.

### 1.1 hreflang

Head `<link rel="alternate" hreflang=… href=…>`, HTTP `Link` header and sitemap `<xhtml:link>` are equivalent; Google drops a pair whose URLs disagree across them, so generate all from one mapping. Above ~10 locales prefer the sitemap. Every page carries the full set, itself included, plus `x-default`. Non-HTML files (PDF) use the `Link` header.

- Set omits the page's own locale (the most common error) → build it from the full locale list. (high)
- A lists B, B lacks A → generate every set from one mapping. Report the broken pairs; valid pairs still work. (high)
- Invalid code (`en-UK`, `en_US`, `jp`, `cn`, `kr`, `dk`, `US` alone, `es-419`) → `language[-script][-region]`, ISO 639-1 + ISO 3166-1 alpha-2: `en-GB`, `ja`, `zh-Hans`, `zh-TW`, `ko`, `da`, `sv`, `es-MX`. A `/jp/` slug can stay; map slug to code. (high)
- One code twice in a set with different URLs → one URL per code. (high)
- Target built by swapping the prefix (`/de/pricing`) while slugs are localized (`/de/preise`) → look up the translated slug. (high)
- Alternate for a locale that lacks the page, or pointing at that locale's home instead → emit only locales that have it. (high)
- Target redirects, is `noindex` or blocked in `robots.txt` → the final indexable URL. (high)
- No `x-default` while `/` redirects by language or a picker page exists → add it to every set, pointing at `/` or the default-locale page. Absence alone doesn't invalidate a set. (medium)
- Tags rendered client-side only → server HTML or the sitemap. (medium)

### 1.2 Canonical per locale

- Translations self-canonical (`/de/preise` → itself). A canonical from `/de/…` to `/en/…` folds German into English, and Google ignores hreflang on a canonicalized page. (high)
- `alternates.canonical` in a layout or CMS default is inherited by every page that doesn't override it, so all pages canonical to `/` or `/en` → set it per page. (high)
- Same-language twins (`en-US`, `en-GB`, identical text) may share one preferred canonical inside the cluster; Google may fold them anyway → differentiate (currency, prices, contact) or consolidate. (medium)
- Paginated locale pages self-canonical, not to page 1. (medium)
- Canonical, hreflang and sitemap use absolute URLs from one base (`metadataBase`, `baseUrl`, `site`) and agree on protocol, host, case and trailing slash. (medium)

Next.js (`metadataBase` in the root layout): `alternates: { canonical: path[locale], languages: { ...path, "x-default": path.en } }` with `path = { en: "/en/pricing", de: "/de/preise" }`.

### 1.3 Locale URL structure

Subdirectories, subdomains and ccTLDs all work; the choice itself is not a finding, since migrating URLs costs more than it returns.

- One URL serves several languages: `?lang=de`, cookie-only switching, next-intl `localePrefix: 'never'` (which also disables its alternate links), Nuxt `strategy: 'no_prefix'` → a prefixed URL per language. (high)
- Redirects or rewrites keyed on `accept-language`, `x-vercel-ip-country`, `cf-ipcountry`, `request.geo`, `localeDetection`. Googlebot crawls from US IPs without `Accept-Language`, so it sees one locale → fixed URLs; redirect only `/` (as `x-default`) or show a language banner. (high) on deep URLs, (medium) for `/` only
- Mixed patterns (folders and subdomains) or case drift (`/en-us/` and `/en-US/` both resolve) → one pattern, 301 the rest. (medium)
- Non-ASCII slugs (`/de/größe`) are fine, but hreflang, canonical, sitemap and links must spell each one identically: percent-encoded UTF-8 (`/de/gr%C3%B6%C3%9Fe`), NFC-normalized (macOS filenames can be NFD). (medium)
- Unprefixed default locale (`as-needed`, `prefix_except_default`, Astro `prefixDefaultLocale: false`) is fine when that URL is in the hreflang set and `/en/x` redirects to `/x`. New setups: `always` plus `/` as `x-default`. (low)

### 1.4 `<html lang>` and per-locale metadata

- `<html lang="en">` hardcoded in a layout shared by all locales → `lang={locale}` in `app/[locale]/layout` (Astro `Astro.currentLocale`) with the hreflang code (`pt-BR`, not slug `br`). Google uses visible text; Bing and screen readers read `lang`. (medium)
- Bing weighs hreflang weakly → `<meta http-equiv="content-language" content="de">` when Bing traffic matters. (low)
- Title or description untranslated (English literal in a shared layout, keys falling back) → translate per locale; wrong-language snippets lose clicks. (medium)
- `og:locale` missing or `de-DE` → `de_DE`, plus `og:locale:alternate` per other locale. (low)

### 1.5 Language switcher

Grep `LocaleSwitcher|LanguageSelect|setLocale|router.push|<select`.

- `<button onClick>` or `<select onChange>` without `<a href>` gives crawlers no path between locales → `<a href="/de/preise" hreflang="de" lang="de">Deutsch</a>` per locale. (medium)
- Links go to the locale home, not the equivalent page → reuse the hreflang mapping. (medium)

### 1.6 Untranslated and thin locale pages

Locale pages with untranslated main content count as duplicates, and Google's helpfulness signal is site-wide, so many thin ones drag down strong pages. Machine translation isn't spam in itself; scaled low-value translation can be.

- Signals: only nav and footer translated; keys missing and filled by `fallbackLocale`/`fallbackLng`; identical body files across locale folders (`diff -rq content/en content/de`); `generateStaticParams`/`getStaticPaths` emitting every locale for content that exists in one.
- Fix: translate, or stop generating that locale's route and drop it from hreflang and sitemap. Noindex and cross-language canonicals contradict hreflang, so they are not fixes. (high) at volume, (medium) for a few pages

### 1.7 Locale sitemap

Each locale URL gets its own `<url>` carrying the same `xhtml:link` alternates (every locale plus `x-default`).

- Missing `xmlns:xhtml`; a locale URL without its own `<url>`; a set missing its `<loc>`. Next.js `app/sitemap.ts`: `alternates.languages` omits the `<loc>` URL's own locale unless listed. (high)
- Per-locale files (`sitemap-de.xml`) must all cross-reference → split by content type. (low)
- Only `<loc>` counts toward 50,000 URLs, but alternates hit the 50MB cap first: at ~20 locales keep 2,000–5,000 URLs per file. (medium) when over

## Part 2. Local

### 2.0 Business model first

Storefront, service area (staff travel), hybrid or multi-location: read it from the product-marketing file or the code (visible address and hours, `areaServed`, location routes). Still unknown → run every file-against-file check, and mark only model-dependent calls (address publication, branches vs `areaServed`, city pages) "needs user". Online-only → skip Part 2.

Grep `tel:|LocalBusiness|Organization|openingHours|PostalAddress|areaServed|GeoCoordinates|google.com/maps|locations|service-area`; read the footer, contact page, `lib/business.*` and the CMS location model.

### 2.1 Name, address, phone (NAP)

- Facts hardcoded in several places and disagreeing (footer `…0100`, JSON-LD `…0199`). Compare meaning, not punctuation: `St` vs `Street` is fine → one module or CMS record feeding footer, contact page and JSON-LD. (high)
- `tel:` not international → `tel:+15125550100`. (low)
- Keyword-stuffed name (`Acme Plumbing | Best Plumber Austin`) → the real name. (medium)
- Service-area or home business publishing an address customers don't visit (page or JSON-LD) → remove it; a private address never fills a field. (high)

### 2.2 LocalBusiness / Organization JSON-LD

Markup may be injected by JS or a plugin, so a grep miss doesn't prove absence; check rendered HTML. Brand: one `Organization` on the home page (`@id` `https://example.com/#org`, `name`, `url`, `logo`, `sameAs`). Each real location: one block on its own page with an own `@id`, most specific subtype, `telephone`, `PostalAddress`, `geo`, `openingHoursSpecification`, `areaServed`, and `parentOrganization` pointing at the brand `@id`.

- Hours, phone or address differ from the visible page → render both from the 2.1 source. (high)
- Service towns marked up as branches with invented addresses → one business with `areaServed`. (high)
- Same block on every page, several locations in one block, or a shared `@id` → one block per location page, own `@id`. (medium)
- Hours missing → `openingHoursSpecification`. 24h: `00:00`–`23:59`; past midnight: one spec `18:00`–`03:00`; holiday closure: `00:00`–`00:00` with `validFrom`/`validThrough`. (medium)
- Generic `LocalBusiness` where a subtype fits → most specific (`Dentist`, `Restaurant`); an array for several. (low)
- `geo` under 5 decimals, or on a service-area town → ≥5 decimals, physical locations only. (low)
- Service-area business with no public address → leave it out; Google's local rich result requires `address`, so report that as unmet rather than invent one. (low)

### 2.3 Location and service-area pages

- Location page without its own facts: address, local phone, hours, services there, booking or call link, parking and access, map. (medium)
- No `/locations` index in nav or footer, or service pages not linking the locations offering them; a page reachable only via sitemap is orphaned. (medium)
- City pages where only the name changes (`generateStaticParams`/`getStaticPaths` over records with just `name`/`slug`, body interpolating `{city}`) are doorway pages → one service-area page, or real per-city data (work done there, coverage limits, call-out fees); scaling belongs to Stage 3. (high)
- Service-area page implying an office ("visit our Round Rock office") → say it is a service area: coverage, call-out policy, how to book. (high)

### 2.4 Map embed

Grep `<iframe` with `google.com/maps`, `maps.googleapis.com`, Mapbox or Leaflet.

- Address only inside the map, which isn't page text → render it as text too. (medium)
- Eager iframe or JS map → `loading="lazy"`, or a static image linking out. (medium)
- No directions link → `<a href="https://www.google.com/maps/dir/?api=1&destination=100+Congress+Ave+Austin">Directions</a>`. (low)

### 2.5 Review markup

Grep `aggregateRating|ratingValue|reviewCount|"review"` and review widgets.

- `aggregateRating` or `review` on the business's own LocalBusiness or Organization earns no stars: Google excludes self-serving reviews. A rating copied from the Business Profile (hardcoded `"ratingValue": 4.9`) isn't visible content either → remove it; testimonials stay as plain text. (medium)

Off-site, cannot be done from the project: Business Profile work, citations, review requests and replies, Search Console submission, rank tracking. Mention one only as "needs user" when a finding depends on it.

## Output

One finding per line, by section, highest priority first: `file path` — issue — fix — priority. Example:

`app/[locale]/layout.tsx:12` — `<html lang="en">` on every locale — `lang={locale}` with the hreflang code — medium

Tag each "verified" (live check), "needs live verification" or "needs user". List sections that held up, one line each, so the fix step knows what not to touch.
