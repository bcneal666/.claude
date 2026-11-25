---
name: up-seo
description: Run one SEO pass on the current project in three stages (AI-search visibility, technical and on-page audit, programmatic opportunities) with one shared context; the user picks what to fix after each stage. Use when the user says up-seo, run an SEO pass, or asks to audit SEO or AI visibility. Optional site URL or @path scope.
argument-hint: "[url] [@path ...]"
---

SEO pass over current project (cwd): AI visibility → technical/on-page audit → programmatic opportunities. Stay in the main conversation; do not fork, because the user's picks in one stage shape the next.

Arguments: `$ARGUMENTS`

**Pick** = AskUserQuestion, multiSelect, ≤4 options per question, with an "All" option. Findings beyond four go in further questions, highest priority first.

## Files

`<skill-dir>` = directory of this SKILL.md. Everything the run needs ships here; read each file at the stage that names it. The references are written for auditing: they list findings with fixes and do not edit files, because the user picks first.

| File                                | Read at                                                 | Purpose                                                          |
| ----------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------- |
| `references/ai-visibility.md`       | Stage 1                                                 | llms.txt, AI-crawler access, citable structure, structured data  |
| `references/technical-onpage.md`    | Stage 2                                                 | Crawlability, indexation, metadata, structured data, performance |
| `references/international-local.md` | Stage 2, only with multiple locales or a local business | hreflang, locale URLs, LocalBusiness markup                      |
| `references/programmatic.md`        | Stage 3                                                 | Playbook fit, go/no-go, quality safeguards, pilot plan           |

## Steps

1. **Gather context once** so no stage re-asks.
   - Token starting `http` = site URL; `@path` tokens = scope (strip `@`); path missing → list it and stop.
   - Read project `CLAUDE.md`, `.agents/product-marketing.md` / `.claude/product-marketing.md` if present.
   - Detect framework, i18n/locales, rendering mode, sitemap/robots/`llms.txt` sources, and site URL (config, `metadataBase`, sitemap, package homepage) when none given. Still unknown → ask once.
   - Print a short context block: URL, framework, locales, scope. Carry it through every stage.

2. **Stage 1 — AI visibility.** Read `references/ai-visibility.md` and audit the in-scope files against it; output prioritized findings with concrete file-level fixes.
   - Pick findings; apply the selected fixes in scope. None picked → continue.

3. **Stage 2 — technical and on-page.** Read `references/technical-onpage.md`, plus `references/international-local.md` when the context block shows multiple locales or a local business. Audit crawlability, indexation, metadata, canonical/hreflang, structured data and performance; run the live-URL checks when a URL is available; output prioritized findings with fixes. Same pick-and-apply flow. Skip items already fixed in stage 1.

4. **Stage 3 — programmatic.** Read `references/programmatic.md`. Evaluate which playbooks fit this project's real data and propose a plan: pattern, URL structure, template, unique value per page, quality safeguards. Plan only; do not generate pages.
   - Present the plan; the user picks via AskUserQuestion. Implement only the template/route scaffolding selected, with a small pilot set, never mass pages. The answer "programmatic does not fit here" is a valid plan.

5. **Summarize.** Context; findings per stage (applied / skipped / needs user); changes (`file:line`); what needs live verification (indexing, rankings and AI citations cannot be confirmed locally).

## Rules

These keep a one-shot pass inspectable and safe for the user's site.

- No `git commit`, `git push` or deploy: the user inspects the working tree and ships it themselves.
- Follow AdSense policy from the project CLAUDE.md (if present): no thin, duplicated or auto-spun pages, and no ad-placement changes that violate the policy, since a policy strike costs more than any SEO gain.
- Do not apply for a new AdSense account or add ad networks.
- Edit only files in scope; out-of-scope problems go in the summary.
