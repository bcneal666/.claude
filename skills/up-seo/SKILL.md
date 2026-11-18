---
name: up-seo
description: Run ai-seo → seo-audit → programmatic-seo on the current project, one shared context, user picks what to fix after each stage. Optional site URL or @path scope.
argument-hint: "[url] [@path ...]"
---

SEO pass over current project (cwd): AI visibility → technical/on-page audit → programmatic opportunities. Stay in main conversation; do not fork.

Arguments: `$ARGUMENTS`

**Pick** = AskUserQuestion, multiSelect, ≤4 options per question, "All" option.

## Steps

1. **Gather context once** (sub-skills must not re-ask).
   - Token starting `http` = site URL; `@path` tokens = scope (strip `@`); path missing → list it and stop.
   - Read project `CLAUDE.md`, `.agents/product-marketing.md` / `.claude/product-marketing.md` if present.
   - Detect framework, i18n/locales, rendering mode, sitemap/robots/`llms.txt` sources, and site URL (config, `metadataBase`, sitemap, package homepage) when none given. Still unknown → ask once.
   - Print short context block: URL, framework, locales, scope. Pass it to every stage.

2. **Stage 1 — `ai-seo`.** Call Skill `ai-seo` with `args` = context block + task: "Audit this project for AI-search visibility now (llms.txt, answerable structure, citability, crawler access); output prioritized findings with concrete file-level fixes. Do not ask for context already given."
   - Pick findings; apply selected fixes in scope. None → continue.

3. **Stage 2 — `seo-audit`.** Call Skill `seo-audit` with `args` = context block + task: "Audit technical and on-page SEO now (crawlability, indexation, metadata, canonical/hreflang, structured data, performance); run live-URL checks when a URL is available; output prioritized findings with fixes." Same pick-and-apply flow. Skip items already fixed in stage 1.

4. **Stage 3 — `programmatic-seo`.** Call Skill `programmatic-seo` with `args` = context block + task: "Evaluate which playbooks fit this project's real data and propose a plan: pattern, URL structure, template, unique value per page, quality safeguards. Plan only; do not generate pages."
   - Present plan; user picks via AskUserQuestion. Implement only the template/route scaffolding selected, with a small pilot set, never mass pages.

5. **Summarize.** Context; findings per stage (applied / skipped / needs user); changes (`file:line`); what needs live verification (indexing, rankings, AI citations cannot be confirmed locally).

## Rules

- No `git commit`, `git push`, deploy.
- Follow AdSense policy from project CLAUDE.md (if present): no thin, duplicated or auto-spun pages; no ad-placement changes violating policy.
- Never apply for a new AdSense account or add ad networks.
- Edit only files in scope.
