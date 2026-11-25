---
name: vitest-test-writer
description: Write, review, fix, test-drive (TDD red-green), de-flake or migrate-from-Jest Vitest unit tests for JavaScript/TypeScript code.
argument-hint: "[file, task or test description]"
disable-model-invocation: true
---

# Vitest Test Writer

Based on Vitest guide "Writing Tests with AI" (vitest.dev/guide/learn/writing-tests-with-ai) plus TDD discipline (vertical slices, independent expected values). Generated tests are only as good as context gathered and review done after; vague approach → shallow happy-path tests asserting nothing.

## Pick the mode

- **Retrofit**: code exists, user wants tests. Steps 1 → 2 → 5 → 6 → 7.
- **TDD**: new feature or bug fix built test-first ("TDD", "red-green", "test first"). Steps 1 → 3 → 5 → 6 → 7.
- **Existing tests**: fix failing or flaky tests, review tests, migrate from Jest. Steps 1 → 4 → 5 → 6 → 7.

Unclear: existing test files are the subject → existing tests; target code exists → retrofit; else TDD.

## 1. Gather context before writing anything

Without context, tests use wrong conventions, wrong environment, mocks of unseen code. Read in order:

1. **Source under test**: real file incl. imports and types. Never test from a description.
2. **Vitest version**: installed `node_modules/vitest/package.json`, else `vitest` range in `package.json`. Not `npx vitest --version` before dependencies are installed: it fetches latest release instead. Mock reset, fake timers and some APIs differ between majors 3, 4, 5 (step 5); wrong-version rules give tests that pass vacuously or fail for wrong reason.
3. **Vitest config** (`vitest.config.*`, else `vite.config.*`; per-package settings may sit under `test.projects`; only Vitest 3 still reads separate `vitest.workspace.*`). Note `globals`, `environment`, `setupFiles`, `restoreMocks` / `clearMocks` / `mockReset`, `include`: they decide whether to import `describe/test/expect`, whether DOM APIs exist, whether mocks reset between tests.
4. **1–2 existing test files** near target. Copy conventions: `test` vs `it`, `describe` layout, `test.extend` fixtures vs `beforeEach`, file naming and location. Existing file beats any style description.
5. **Dependencies needing mocks**: at least type signatures.
6. **Project rules**: `AGENTS.md`, `CLAUDE.md`, `GLOSSARY.md`, contributing docs. Use project domain words in test names.

No tests yet → default: one `describe` per exported function/class, `test`, colocated `*.test.ts`.

## 2. Retrofit: write the tests

API details for mocks, async, timers, parameterized tests: `references/vitest-patterns.md`.

**Seams.** Test through public interfaces (exported functions, public class methods, HTTP handlers), where behavior is observable. Not private helpers or internal call order: those tests break on correct refactors.

**Cover where applicable** (AI-written tests reliably skip these):

- happy path
- validation and error paths (thrown errors, rejected promises, error return values)
- empty input: `''`, `[]`, `{}`
- `null` / `undefined`
- boundaries: 0, negative, max, off-by-one
- async failure: network error, timeout, rejected dependency

**Expected values from an independent source**: hand-worked example, spec, known-good literal. Never recompute expected value the way code does (`expect(add(a, b)).toBe(a + b)`): tautological, cannot fail. See `references/good-vs-bad-tests.md`.

**Mock only I/O boundaries**: network, database, filesystem, time (`vi.useFakeTimers`), randomness. Not the module under test or pure helpers it uses. AI tools over-mock by default; resist.

## 3. TDD: red → green in vertical slices

1. **Agree on seams first.** List public interface and seams to test, each with one line on what it catches and misses. User already spelled out behaviors → state list and go on; otherwise confirm before writing tests, because a wrong seam wastes every later cycle.
2. **One slice per cycle**: write _one_ failing test at one seam → run, see it fail for the right reason (red) → minimal code to pass (green) → run again.
3. **Not all tests first.** Bulk-written tests verify imagined behavior, not real. No speculative features or tests for future requirements.
4. **Refactor after green**, separate step, tests stay green. Tests breaking on behavior-preserving refactor were coupled to implementation: fix the test, not the refactor.

Step 2 coverage list and independent-expected-value rule apply to each slice.

## 4. Existing tests: fix, de-flake, review, migrate

- **Failing**: run file, read actual failure, decide whether test or source is wrong. Wrong test (stale expectation, wrong API, bad mock) → fix. Real source bug → report, never hide.
- **Flaky**: reproduce before fixing; a fix never seen failing is a guess. Run shuffled (`vitest run <file> --sequence.shuffle`; `--sequence.seed=<n>` replays a failing order), repeated (`--repeats=<n>` on Vitest 5; earlier majors: loop the file), each test alone (`-t "<name>"`). Fake-timer and mock patterns: `references/vitest-patterns.md`. Usual causes:
  - real time: `setTimeout` waits, `Date`, `performance.now()` → `vi.useFakeTimers()` and advance time
  - state shared between tests: module-level variables, singletons, mocks and spies not reset, env vars (`vi.stubEnv` + `vi.unstubAllEnvs()`)
  - un-awaited promises, real `Math.random()`, real network

  Fix the cause. Retry, `repeats`, longer timeouts or waits only hide it: never the fix.

- **Review**: run checker (step 6) and self-review list (step 7), report each problem with `file:line` and concrete fix. Report-only: change files only when user also asked for fixes.
- **Jest migration**: mapping in `references/vitest-patterns.md`. `require` → ESM imports, `jest.*` → `vi.*`, `jest.mock('./m')` → top-level `vi.mock(import('./m.js'))`. Fix weak assertions found along the way; tell user which changed.

## 5. Vitest-specific rules

- Vitest APIs only: `vi.fn`, `vi.mock`, `vi.spyOn`, `vi.useFakeTimers`. Never `jest.*`: Jest-trained models drift into it.
- Imports: `globals: true` → don't import test globals; else `import { describe, test, expect, vi } from 'vitest'`.
- Module mocks: prefer `vi.mock(import('./mod.js'))` over `vi.mock('./mod.js')` (Vitest 2.1+): types `importOriginal` and factory, survives renames. `vi.mock` and `vi.hoisted` at file top level; Vitest 5 throws when nested.
- Mocks called with `new` (Vitest 4+): `function` or `class` implementation, not arrow.
- Async: `async`/`await`, `await expect(p).resolves...` / `.rejects...`. Missing `await` on `.rejects` passes vacuously before Vitest 5, fails in 5.
- Test options in the middle: `test(name, { timeout: 10_000 }, fn)`. Third-argument options object removed in Vitest 4.
- Many inputs → `test.for` / `test.each`, not copy-pasted tests.
- Error messages → `toThrowErrorMatchingInlineSnapshot()` or explicit message/regex.
- Mock leakage between tests depends on major:

  | Major | `restoreMocks: true` does                                             | Also needed                                                        |
  | ----- | --------------------------------------------------------------------- | ------------------------------------------------------------------ |
  | 3     | restores spies, clears call history, resets `vi.fn()` implementations | nothing                                                            |
  | 4     | restores `vi.spyOn` spies only                                        | `clearMocks: true`, or `vi.fn()` call counts leak into later tests |
  | 5     | restores `vi.spyOn` spies only                                        | nothing (`clearMocks` defaults to `true`)                          |

  `restoreMocks: true` + `clearMocks: true` safe on every version. Config not changeable → `afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks() })` in the file.

- Names: short, behavior-focused (`formats USD prices`, `throws for negative amounts`), not sentences describing implementation.

## 6. Run and verify

Always run, never watch mode (agent waiting on watch never exits). Project package manager (`pnpm exec`, `yarn`, `bunx`, else `npx`):

```bash
npx vitest run path/to/file.test.ts
```

Vitest 4.1+ run by an AI agent uses a minimal reporter hiding console output of passing tests; add `--reporter=default` to see logs.

Then, from directory holding the Vitest config (package root in a monorepo), run bundled static checker for common AI mistakes:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/check-tests.mjs" path/to/file.test.ts
```

Finds Vitest config and version itself (`--config <path>` overrides). Flags `jest.*`, `.only`, un-awaited `.rejects/.resolves` (also across lines), string-path `vi.mock`, tests whose only assertions are existence, no-throw or mock calls, tautological expected values, real-time waits, unpinned `Date`/`Math.random`, missing test-global imports, mock-reset settings that leak for installed major. Fix what it reports unless deliberate exception (review mode: report instead).

Fix import errors, wrong APIs, nonexistent references until green. **Test fails on a real source bug → report bug to user, never weaken the assertion**: loosening a test to pass destroys its value.

## 7. Self-review, then report

Before finishing, reread each test; reject it if:

- only asserts existence (`toBeDefined`, `toBeTruthy`) or "doesn't throw"
- asserts on mocks instead of outputs or observable effects
- would fail after a correct refactor of internals
- expected value computed by same logic as code
- depends on another test having run first

Report briefly: files added/changed, scenarios covered, gaps left on purpose, bugs found, root causes (flaky tests), config suggestions (e.g. mock-reset setting for their major).
