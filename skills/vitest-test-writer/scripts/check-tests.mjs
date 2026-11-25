#!/usr/bin/env node
// Static checker for common AI mistakes in Vitest test files.
//
// Usage: node check-tests.mjs <test-file> [<test-file> ...] [--config <vitest config>]
// Without --config it looks for vitest.config.* then vite.config.* in the current directory.
// Exit 1 if any ERROR is found, 0 otherwise (WARNs don't fail).
// Heuristic: treat findings as prompts to look, not verdicts.
import { existsSync, readFileSync } from "node:fs";

const CONFIG_NAMES = ["vitest", "vite"].flatMap((base) =>
  ["ts", "mts", "cts", "js", "mjs", "cjs"].map(
    (ext) => `${base}.config.${ext}`,
  ),
);
const WEAK =
  /\.(?:not\.toThrow|toBeDefined|toBeTruthy|toBeFalsy|not\.toBeNull|not\.toBeUndefined)\(\s*\)/g;
const MOCK_MATCHER =
  /\.(?:toHaveBeen\w*Called\w*|toBeCalled\w*|toHaveReturned\w*)\(/g;
const EXPECT = /\bexpect(?:\.soft)?\(/g;

// Index just past the bracket that closes the one at `open`, skipping strings, comments and regex literals.
function closeOf(src, open) {
  const pairs = { "(": ")", "[": "]", "{": "}" };
  const stack = [];
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === "'" || c === '"' || c === "`") {
      for (i++; i < src.length && src[i] !== c; i++) if (src[i] === "\\") i++;
    } else if (c === "/" && src[i + 1] === "/") {
      i = src.indexOf("\n", i);
      if (i < 0) return -1;
    } else if (c === "/" && src[i + 1] === "*") {
      i = src.indexOf("*/", i + 2) + 1;
      if (i <= 0) return -1;
    } else if (
      c === "/" &&
      /[(,=:[!&|?{};]/.test(src.slice(0, i).trimEnd().slice(-1))
    ) {
      for (i++; i < src.length && src[i] !== "/" && src[i] !== "\n"; i++)
        if (src[i] === "\\") i++;
    } else if (pairs[c]) stack.push(pairs[c]);
    else if (c === ")" || c === "]" || c === "}") {
      if (stack.pop() !== c) return -1;
      if (!stack.length) return i + 1;
    }
  }
  return -1;
}

const lineOf = (src, idx) => src.slice(0, idx).split("\n").length;

// Each test()/it() call: its line and the text of its arguments (name, options, callback).
function* tests(src) {
  const start = /^[ \t]*(?:test|it)\b((?:\.\w+)*)/gm;
  for (let m; (m = start.exec(src));) {
    let i = m.index + m[0].length;
    if (/\.(?:for|each|skipIf|runIf)$/.test(m[1])) {
      // test.for([...])(...), test.each`table`(...), test.skipIf(cond)(...): skip the first group
      while (/\s/.test(src[i])) i++;
      if (src[i] === "`") i = src.indexOf("`", i + 1) + 1;
      else if (src[i] === "(") i = closeOf(src, i);
      if (i <= 0) continue;
    }
    while (/\s/.test(src[i])) i++;
    if (src[i] !== "(") continue;
    const end = closeOf(src, i);
    yield {
      line: lineOf(src, m.index),
      chain: m[1],
      body: src.slice(i, end < 0 ? undefined : end),
    };
  }
}

// expect(...) statements whose chain uses .rejects/.resolves but whose result is not awaited or returned.
function* unawaitedAsync(src) {
  for (const m of src.matchAll(EXPECT)) {
    const lineStart = src.lastIndexOf("\n", m.index) + 1;
    if (/^\s*(?:\/\/|\*|\/\*)/.test(src.slice(lineStart, m.index))) continue; // commented out
    const before = src.slice(0, m.index).replace(/\s+$/, "");
    // awaited, returned, or part of a larger expression such as Promise.all([...])
    if (/(?:\bawait|\breturn|=>|\bvoid|[[,(?:=&|])$/.test(before)) continue;
    let i = closeOf(src, m.index + m[0].length - 1);
    if (i < 0) continue;
    const chain = [];
    for (;;) {
      const next = /^\s*\.\s*(\w+)/.exec(src.slice(i));
      if (!next) break;
      chain.push(next[1]);
      i += next[0].length;
      const rest = /^\s*\(/.exec(src.slice(i));
      if (rest) i = closeOf(src, i + rest[0].length - 1);
      if (i < 0) break;
    }
    if (chain.includes("rejects") || chain.includes("resolves"))
      yield lineOf(src, m.index);
  }
}

function checkFile(path, config) {
  const out = [];
  const add = (level, line, msg) => out.push({ level, line, msg });
  const src = readFileSync(path, "utf8");

  src.split("\n").forEach((text, n) => {
    const line = n + 1;
    if (/^\s*(?:\/\/|\*|\/\*)/.test(text)) return;
    if (/\bjest\.\w+|['"]@jest\/globals['"]/.test(text))
      add("ERROR", line, "jest API used; use vi.* from vitest");
    if (/\bvi\.mock\(\s*['"`]/.test(text))
      add(
        "WARN",
        line,
        "vi.mock with a string path; prefer vi.mock(import('./mod.js')) for types and renames",
      );
    if (/\b(?:test|it|describe)(?:\.\w+)*\.only\b/.test(text))
      add("ERROR", line, ".only left in test file");
    const taut =
      /expect\(\s*\w+\(([^()]*)\)\s*\)\s*\.to(?:Be|Equal|StrictEqual)\(([^()]*[-+*/%][^()]*)\)/.exec(
        text,
      );
    if (taut) {
      const args = new Set(taut[1].match(/[A-Za-z_$][\w$]*/g) ?? []);
      const used = taut[2].match(/[A-Za-z_$][\w$]*/g) ?? [];
      if (args.size && used.length && used.every((id) => args.has(id)))
        add(
          "WARN",
          line,
          "expected value recomputes the inputs (tautological); use an independent literal",
        );
    }
    if (
      /new Promise\(\s*\(?\s*\w*\s*\)?\s*=>\s*setTimeout\(|\bawait\s+(?:sleep|delay|wait)\(\s*\d/.test(
        text,
      )
    )
      add(
        "WARN",
        line,
        "real-time wait: slow and flaky; use vi.useFakeTimers() + vi.advanceTimersByTimeAsync()",
      );
  });

  for (const line of unawaitedAsync(src))
    add(
      "ERROR",
      line,
      ".rejects/.resolves not awaited or returned; the assertion is vacuous",
    );

  const controlsClock = /vi\.(?:useFakeTimers|setSystemTime)\(/.test(src);
  const clock = /\bDate\.now\(\)|\bnew Date\(\s*\)/.exec(src);
  if (clock && !controlsClock)
    add(
      "WARN",
      lineOf(src, clock.index),
      "reads the real clock; pin it with vi.useFakeTimers() + vi.setSystemTime()",
    );
  const random = /\bMath\.random\(\)/.exec(src);
  if (random && !/vi\.spyOn\(\s*Math\s*,\s*['"]random['"]/.test(src))
    add(
      "WARN",
      lineOf(src, random.index),
      "real Math.random(); stub it with vi.spyOn(Math, 'random') for repeatable tests",
    );

  if (
    config &&
    !/\bglobals\s*:\s*true/.test(config) &&
    /^[ \t]*(?:describe|test|it)\(/m.test(src)
  ) {
    const imported =
      // any module counts: test.extend fixtures export their own `test`
      /import\s*\{[^}]*\b(?:test|it|describe)\b[^}]*\}\s*from\s*['"]/.test(
        src,
      );
    if (!imported)
      add(
        "WARN",
        1,
        "config has no globals: true but test globals are not imported from 'vitest'",
      );
  }

  for (const t of tests(src)) {
    if (/\.(?:todo|skip)\b/.test(t.chain)) continue;
    const expects = [...t.body.matchAll(EXPECT)].length;
    if (!expects) {
      if (!/\b(?:expectTypeOf|assertType)\b/.test(t.body))
        add("WARN", t.line, "test has no expect() assertion");
      continue;
    }
    const weak = [...t.body.matchAll(WEAK)].length;
    const mocks = [...t.body.matchAll(MOCK_MATCHER)].length;
    if (expects - weak - mocks > 0) continue;
    const what = !mocks
      ? "existence/no-throw assertions"
      : !weak
        ? "mock-call assertions"
        : "existence and mock-call assertions";
    add(
      "WARN",
      t.line,
      `test only has ${what}; assert actual output or observable behavior`,
    );
  }
  return out.sort((a, b) => a.line - b.line);
}

// Installed Vitest major (node_modules first, then the package.json range); undefined when unknown.
function vitestMajor() {
  for (const [file, pick] of [
    ["node_modules/vitest/package.json", (p) => p.version],
    [
      "package.json",
      (p) => ({ ...p.dependencies, ...p.devDependencies }).vitest,
    ],
  ]) {
    try {
      const m = /\d+/.exec(pick(JSON.parse(readFileSync(file, "utf8"))) ?? "");
      if (m) return Number(m[0]);
    } catch {}
  }
}

// Mock-reset defaults differ by major (verified on 3.2, 4.1 and 5.1):
// v3 restoreMocks also clears vi.fn() history; v4 restoreMocks only restores spies; v5 clears history by default.
function checkConfig(text, major) {
  const out = [];
  const on = (key) => new RegExp(`\\b${key}\\s*:\\s*true`).test(text);
  const clears = on("clearMocks") || on("mockReset");
  if (!on("restoreMocks"))
    out.push(
      "restoreMocks: true not set; vi.spyOn spies keep their fake implementation in later tests",
    );
  const optedOut = /\bclearMocks\s*:\s*false/.test(text); // v5 default turned off again
  if (
    !clears &&
    (optedOut ||
      major === undefined ||
      major === 4 ||
      (major < 4 && !on("restoreMocks")))
  )
    out.push(
      `clearMocks: true not set; vi.fn() call history carries over between tests${
        major === 4 ? " (in Vitest 4 restoreMocks only restores spies)" : ""
      }`,
    );
  return out;
}

const argv = process.argv.slice(2);
const ci = argv.indexOf("--config");
let configPath =
  ci >= 0 ? argv.splice(ci, 2)[1] : CONFIG_NAMES.find((f) => existsSync(f));
if (!argv.length) {
  console.error(
    "usage: node check-tests.mjs <test-file> [...] [--config <vitest config>]",
  );
  process.exit(2);
}
const config =
  configPath && existsSync(configPath)
    ? readFileSync(configPath, "utf8")
    : undefined;
if (configPath && !config) console.log(`WARN ${configPath}: config not found`);
if (!configPath)
  console.log(
    "WARN no vitest/vite config found here; pass --config to check mock-reset settings",
  );

let errors = 0;
for (const file of argv) {
  for (const f of checkFile(file, config)) {
    console.log(`${f.level} ${file}:${f.line}: ${f.msg}`);
    if (f.level === "ERROR") errors++;
  }
}
if (config)
  for (const msg of checkConfig(config, vitestMajor()))
    console.log(`WARN ${configPath}: ${msg}`);
if (!errors) console.log("OK: no blocking issues");
process.exit(errors ? 1 : 0);
