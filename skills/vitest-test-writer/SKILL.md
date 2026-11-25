---
name: vitest-test-writer
description: Write, review, fix or test-drive Vitest unit tests for JavaScript/TypeScript code. Use this skill whenever the user asks to add tests, improve coverage, write tests first (TDD / red-green), fix failing or flaky Vitest tests, review AI-generated tests, or migrate Jest tests to Vitest — even if they only say "write tests for this" in a project that has vitest in package.json or a vitest/vite config.
---

# Vitest Test Writer

Based on the official Vitest guide "Writing Tests with AI" plus TDD discipline (vertical slices, independent expected values). The core idea: generated tests are only as good as the context you gather and the review you do afterwards. A vague approach produces shallow happy-path tests that assert nothing meaningful.

## Pick the mode

- **Retrofit mode** — code already exists, user wants tests for it. Follow steps 1 → 2 → 4 → 5 → 6.
- **TDD mode** — user wants a new feature or bug fix built test-first, or says "TDD", "red-green", "test first". Follow steps 1 → 3 → 5 → 6.

If unclear, retrofit when the target code already exists; TDD when it doesn't.

## 1. Gather context before writing anything

Tests written without context use the wrong conventions, wrong environment, and mocks of code the model never saw. So read, in this order:

1. **The source under test** — the real file, including imports and types. Never test from a description.
2. **Vitest config** (`vitest.config.*`, `vite.config.*`, or `test` field in `vitest.workspace`). Note `globals`, `environment`, `setupFiles`, `restoreMocks`, `include`. These decide whether you import `describe/test/expect`, whether DOM APIs exist, and whether mocks auto-reset.
3. **1–2 existing test files** close to the target. Copy their conventions: `test` vs `it`, `describe` layout, `test.extend` fixtures vs `beforeEach`, file naming and location. An existing file is a better style spec than any description.
4. **Dependencies that will need mocking** — at least their type signatures.
5. **Project rules** — `AGENTS.md`, `CLAUDE.md`, `GLOSSARY.md`, contributing docs. Use the project's domain words in test names.

If the project has no tests yet, default to: one `describe` per exported function/class, `test`, colocated `*.test.ts`.

## 2. Retrofit: write the tests

Read `references/vitest-patterns.md` for API details and Jest→Vitest mapping when needed.

**Choose seams.** Test through public interfaces (exported functions, class public methods, HTTP handlers) — the points where behavior is observable. Do not test private helpers or internal call order; those tests break on correct refactors.

**Cover these scenarios** where they apply, because AI-written tests reliably skip them:
- happy path
- validation and error paths (thrown errors, rejected promises, error return values)
- empty input: `''`, `[]`, `{}`
- `null` / `undefined`
- boundaries: 0, negative, max, off-by-one
- async failure: network error, timeout, rejected dependency

**Expected values must come from an independent source** — a hand-worked example, the spec, a known-good literal. Never recompute the expected value the same way the code does (`expect(add(a, b)).toBe(a + b)`); such a test is tautological and cannot fail. See `references/good-vs-bad-tests.md`.

**Mock only I/O boundaries**: network, database, filesystem, time (`vi.useFakeTimers`), randomness. Do not mock the module under test or pure helpers it uses. AI tools over-mock by default; resist it.

## 3. TDD: red → green in vertical slices

1. **Agree on seams first.** List the public interface and the seams you intend to test, each with one line on what it catches and what it misses. Confirm with the user before writing tests, because a wrong seam wastes every cycle after it.
2. **One slice per cycle**: write *one* failing test at one seam → run it and see it fail for the right reason (red) → write the minimal code to pass (green) → run again.
3. **Do not write all tests first.** Bulk-written tests verify imagined behavior instead of real behavior. Do not add speculative features or tests for future requirements.
4. **Refactor after green**, as a separate step, with tests staying green. Tests that break during a behavior-preserving refactor were coupled to implementation — fix the test, not the refactor.

The same coverage list and independent-expected-value rule from step 2 apply to each slice.

## 4. Vitest-specific rules

- Vitest APIs only: `vi.fn`, `vi.mock`, `vi.spyOn`, `vi.useFakeTimers`. Never `jest.*` — models trained on Jest drift into it.
- Imports: if `globals: true`, don't import test globals; otherwise `import { describe, test, expect, vi } from 'vitest'`.
- Module mocks: prefer `vi.mock(import('./mod.js'))` over `vi.mock('./mod.js')` — type-safe and survives file renames.
- Async: `async`/`await`, `await expect(p).resolves...` / `.rejects...`. Forgetting `await` on `.rejects` makes the test pass vacuously.
- Many inputs → `test.for` / `test.each`, not copy-pasted tests.
- Error messages → `toThrowErrorMatchingInlineSnapshot()` or an explicit message/regex.
- Mock leakage → rely on `restoreMocks: true` in config, or `afterEach(() => vi.restoreAllMocks())`.
- Names: short, behavior-focused (`formats USD prices`, `throws for negative amounts`), not sentences describing implementation.

## 5. Run and verify

Always run, never in watch mode (an agent waiting on watch mode never exits):

```bash
npx vitest run path/to/file.test.ts
```

Then run the static checker bundled with this skill to catch common AI mistakes:

```bash
python3 <skill-dir>/scripts/check_tests.py path/to/file.test.ts [--config vitest.config.ts]
```

It flags `jest.*` usage, string-path `vi.mock`, tests whose only assertion is `toBeDefined`/`not.toThrow`, un-awaited `.rejects/.resolves`, tautological `toBe(a + b)` patterns, and missing `restoreMocks`. Fix what it reports unless the finding is a deliberate exception.

Fix import errors, wrong APIs and nonexistent references until green. **If a test fails because the source has a real bug, report the bug to the user instead of weakening the assertion** — making the test pass by loosening it destroys the test's value.

## 6. Self-review, then report

Before finishing, reread each test and reject it if:
- it only asserts existence (`toBeDefined`, `toBeTruthy`) or "doesn't throw"
- it asserts on mocks instead of outputs or observable effects
- it would fail after a correct refactor of internals
- its expected value is computed by the same logic as the code

Report to the user briefly: files added/changed, scenarios covered, gaps left on purpose, bugs found, and config suggestions (e.g. add `restoreMocks: true`).
