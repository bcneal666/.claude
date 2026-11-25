# Programmatic SEO: fit, plan, pilot

This file is for EVALUATION and PLANNING in Stage 3; read it once. Decide whether template-plus-data pages fit the project's real data, propose a plan, and create no pages.
Pages built before fit is proven become thin pages at scale, which risks demotion and AdSense policy action.
After the user picks, only route/template scaffolding and a small pilot set are built (§7).

Reuse step 1's context (URL, framework, locales, rendering mode); don't re-ask. When project CLAUDE.md carries AdSense policy (no thin, duplicated or auto-spun pages), every gate below is a hard gate.

## 1. Fit test

Programmatic fits only when all three hold. Answer from the repo, not from what the niche usually has.

1. **Real data per page.** Find the source: DB schema or migrations, JSON/CSV/YAML in the repo, CMS collections, an API the app already calls. Count rows, fields per row, and how many fields differ between two rows. A list of names (cities, tools, terms) with nothing else per row is not data.
2. **A repeating search pattern with demand.** Name the pattern (`[service] in [city]`, `[x] vs [y]`) and its variable. Stage 3 has no keyword tool: label demand **verified** when evidence exists (Search Console queries, analytics landing pages, site-search logs, the user's word), else **assumed**. Never invent volumes.
3. **Value a template alone can't give.** Each page answers its query with something specific to its row: numbers, listings, computed comparisons, a working tool. Test: hide the variable name; if two pages then read the same, they are thin.

Data defensibility, strongest first: proprietary > product-derived (users' activity) > user-generated > licensed > public. Public-only data means anyone can publish the same pages; it fits only when the project adds computation or analysis on top.

## 2. When the answer is "don't do programmatic here"

The verdict is NO-GO when any of these holds. Say so plainly with the reason, then recommend an alternative.

- **No per-row data.** The unique part would be LLM-written prose with no source rows behind it. That is auto-spun content however good the prompt.
- **Variable swap only.** Pages differ by name, title and a sentence.
- **Too few pages.** Only a handful of candidates (single digits) → hand-write them; a template adds risk without saving work. A dozen or more rows that each carry distinct data (see the content gate) can still justify a small hub-and-detail directory: judge by row quality, not by a page-count threshold.
- **No repeating pattern.** Queries for the variable don't share a shape, or the user confirms nobody searches for it.
- **Stale data.** Rows can't be refreshed; outdated pages are wrong and thin.
- **Cannibalization.** The pages would target queries existing hand-written pages already cover.
- **No server HTML.** Client-only SPA with no SSR or prerender: crawlers don't get the content in the initial HTML. Fixing rendering comes first.

Alternatives: hand-written pages for the few strongest variables; one hub page with a filterable table of all rows; enriching existing pages with the data.

## 3. Playbook catalog

| Playbook     | Query                     | URL                      | Data per page                                | Main risk                        |
| ------------ | ------------------------- | ------------------------ | -------------------------------------------- | -------------------------------- |
| Templates    | `[type] template`         | `/templates/[type]/`     | Usable templates, several variations         | Preview-only pages               |
| Curation     | `best [category]`         | `/best/[category]/`      | Criteria, real testing, update date          | Rankings with no testing         |
| Conversions  | `[x] to [y]`              | `/convert/[x]-to-[y]/`   | Accurate rates or formulas, working tool     | Wrong numbers; per-amount clones |
| Comparisons  | `[x] vs [y]`              | `/compare/[x]-vs-[y]/`   | Real feature and price data, verdict per use | One-sided; `a-vs-b` + `b-vs-a`   |
| Examples     | `[type] examples`         | `/examples/[type]/`      | Real examples with analysis                  | Scraped gallery, no commentary   |
| Locations    | `[service] in [city]`     | `/[service]/[city]/`     | Local listings, prices, rules                | City-name swap (doorway page)    |
| Personas     | `[product] for [role]`    | `/for/[persona]/`        | Segment features, use cases, testimonials    | Audience noun swapped            |
| Integrations | `[a] [b] integration`     | `/integrations/[b]/`     | Working integration, setup steps             | Integrations that don't exist    |
| Glossary     | `what is [term]`          | `/glossary/[term]/`      | Definition, examples, related terms          | Dictionary-depth or generated    |
| Translations | any query, other language | `/[lang]/[page]/`        | Human-reviewed localization, hreflang        | Machine translation = auto-spun  |
| Directory    | `[category] tools`        | `/directory/[category]/` | Details per listing, filters, updates        | Name-only listings               |
| Profiles     | `[entity] [attribute]`    | `/companies/[name]/`     | Sourced facts plus own aggregation           | Wikipedia rehash                 |

**Match assets.** Proprietary data → Directory, Profiles, Curation. Product with integrations → Integrations. Design or creative product → Templates, Examples. Multi-segment audience → Personas. Local presence → Locations. Tool or utility → Conversions. Content or expertise → Glossary, Curation. International audience → Translations. Competitor landscape → Comparisons.

**Layer** playbooks (`best coworking spaces in san diego` = Curation + Locations) only when each layer brings its own data; a layer without data multiplies thin pages.

**URLs.** Subfolder on the main domain: it inherits the site's internal links, while a subdomain needs its own (Google ranks neither higher). Slugs: lowercase, hyphenated, from a stable ID or normalized name.

## 4. Go/no-go checklist

Run per candidate playbook; mark each line pass, fail or unknown.

- [ ] Data source located; rows and per-row fields counted (§1.1)
- [ ] Two random rows pass the hide-the-name test (§1.3)
- [ ] Unique content comes from data or the user, not generated prose (§2)
- [ ] Repeating pattern named; demand labeled verified or assumed (§1.2)
- [ ] Enough rows pass the §5 content gate to justify a template (§2)
- [ ] Refresh path exists (rebuild, revalidate, sync)
- [ ] Server-rendered or prerendered HTML
- [ ] No overlap with existing pages' target queries
- [ ] Per-page noindex, canonical and sitemap membership controllable in code

Any fail → NO-GO for that candidate. Each unknown → say what would resolve it. Assumed demand doesn't block a pilot but is listed as the first risk.

## 5. Quality safeguards

Build these into the template; they ship with the pilot, not after.

- **Content gate in code.** One function (e.g. `isPublishable(row)`) with explicit rules: required fields present, no placeholder values, at least N data-driven sections non-empty and differing between rows (house heuristic: three). Under AdSense policy a failing row is not rendered (404): the policy bans thin pages, not only indexed ones, and a noindexed page still serves ads. Without that policy, `noindex, follow` plus sitemap exclusion is acceptable.
- **Noindex for weak variants.** `noindex, follow` for distinct pages useful to visitors but without search demand (a tiny category); keep them out of the sitemap.
- **Canonical.** Absolute self-referencing canonical on every page. One URL per entity: normalize case, trailing slash and synonyms (`nyc` vs `new-york-city`) and 301 the rest; comparisons use one order (alphabetical) and 301 the reverse; sort, filter and tracking params canonicalize to the clean URL; `?page=N` stays self-canonical.
- **Metadata.** Unique title, description and H1 built from data fields, not only the variable. Structured data only for what the page visibly shows.
- **Hub and spokes.** A hub per page type lists every published spoke; each spoke links to its hub, has breadcrumbs (BreadcrumbList), and links a few related spokes picked by data (same category, nearby). Every spoke is reachable from site navigation through plain `<a href>`; no orphans.
- **Pagination.** A long hub paginates with plain links (`/compare/page/2/`), each page self-canonical. Don't canonical page 2 to page 1 or hide spokes behind link-less infinite scroll.
- **Sitemaps.** One sitemap per page type under a sitemap index, max 50,000 URLs and 50 MB uncompressed per file. List only published, indexable, canonical URLs; `lastmod` from the row's real update time, not build time.
- **Crawl budget.** Matters at thousands of URLs. Mint URLs only for variable combinations with demand, not every filter mix; deleted rows return 404 or 410, never an empty 200 page (soft 404); keep server response fast.

## 6. Plan output

```
Verdict: GO | NO-GO (one-line reason)
Data inventory: source (file or table), rows, fields per row, refresh path

Candidate 1: <playbook>
- Pattern and demand: `[x] vs [y]`; verified (source) | assumed
- URL: hub `/compare/`, spoke `/compare/[a]-vs-[b]/`
- Pages: N candidate rows → M pass the content gate
- Template: sections, each fixed | data | conditional
- Unique value per page: what this row shows that siblings don't
- Content gate: the isPublishable rules
- Safeguards: canonical rule, noindex rule, sitemap file, hub and related links
- Pilot: 20–50 slugs and why these
- Files: route, loader, gate, hub, sitemap
- Risks

Rejected: <playbook>: reason (one line each)
Needs live verification: indexing, impressions, ranking of the pilot
```

NO-GO (no candidate passes §4) → give the reason and the §2 alternative; no pick. GO → Pick over at most three ranked candidates, so they and "All" fit one question.

## 7. After the pick: scaffolding and pilot

Build the route, template, data loader, content gate, hub and sitemap entry. Render only pilot slugs; every other slug 404s until the pilot proves out. Write no generated prose into data: a section without source data is left out (conditional), not filled.

**One source of truth.** A single `getPublishedPages()` applies the gate and the pilot list; route params, sitemap, hub and related links all read it, so the sitemap never lists a page that 404s or is noindexed. API names below are examples; check the installed version's docs.

**Next.js App Router.** `app/<type>/[slug]/page.tsx`: `generateStaticParams` returns pilot slugs; `export const dynamicParams = false` so unlisted slugs 404; `notFound()` on gate failure. `generateMetadata` sets title, description, `alternates.canonical`, and `robots` for noindex variants. `app/sitemap.ts`, split with `generateSitemaps` when large; `revalidate` for freshness. Pages Router: `getStaticPaths` with `fallback: false`.

**Astro.** `src/pages/<type>/[slug].astro` with `getStaticPaths()` returning pilot entries; data in a content collection with a schema so a missing field fails the build. `@astrojs/sitemap` `filter` drops unpublished and noindex URLs. In SSR mode, return 404 for slugs outside the list.

**Other frameworks.** Same mechanism: prerender or server-render an explicit slug list, 404 the rest, build the sitemap from that list (SvelteKit `entries`, Nuxt prerender routes, a Remix loader throwing 404).

**CMS-backed** (WordPress, headless CMS). A collection or post type plus fields; per-item noindex and canonical via fields or the SEO plugin; check the plan's item limit against next year's page count.

**Client-only SPA.** NO-GO until SSR or prerender exists; propose that as the first step instead.

**Pilot size.** A small subset of the strongest pages (most complete rows, clearest demand): a few for a small dataset, a few dozen for a large one, never the whole set. Scale only after the pilot is live and Search Console shows pages indexed and earning impressions. Many "Crawled – currently not indexed" means the template is thin: fix it before adding rows. List these checks under live verification in the summary.
