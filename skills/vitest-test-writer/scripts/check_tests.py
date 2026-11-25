#!/usr/bin/env python3
"""Static checker for common AI mistakes in Vitest test files.

Usage:
    python3 check_tests.py <test-file> [<test-file> ...] [--config vitest.config.ts]

Exit code 1 if any ERROR is found, 0 otherwise (WARNs don't fail).
Heuristic, regex-based: treat findings as prompts to look, not verdicts.
"""
import argparse
import re
import sys
from pathlib import Path

TEST_START = re.compile(r"^\s*(?:test|it)(?:\.\w+)*\s*(?:\(|\.for\(|\.each\()", re.M)


def split_tests(src: str):
    """Yield (line_no, body) for each test block, roughly up to the next test start."""
    starts = [m.start() for m in TEST_START.finditer(src)]
    for i, s in enumerate(starts):
        end = starts[i + 1] if i + 1 < len(starts) else len(src)
        yield src.count("\n", 0, s) + 1, src[s:end]


def check_file(path: Path):
    findings = []
    src = path.read_text(encoding="utf-8")
    lines = src.splitlines()

    def add(level, line, msg):
        findings.append((level, line, msg))

    for i, line in enumerate(lines, 1):
        if re.search(r"\bjest\.\w+", line):
            add("ERROR", i, "jest.* API used; use vi.* in Vitest")
        if re.search(r"\bvi\.mock\(\s*['\"]", line):
            add("WARN", i, "vi.mock with string path; prefer vi.mock(import('./mod.js'))")
        if re.search(r"\.(rejects|resolves)\b", line) and re.match(r"\s*expect\(", line):
            add("ERROR", i, ".rejects/.resolves without await; the assertion is vacuous")
        m = re.search(r"expect\(\s*(\w+)\(\s*(\w+)\s*,\s*(\w+)\s*\)\s*\)\s*\.to(?:Be|Equal)\(\s*\2\s*[-+*/]\s*\3", line)
        if m:
            add("WARN", i, "expected value recomputes the inputs (tautological); use an independent literal")
        if re.search(r"\.only\(", line):
            add("ERROR", i, ".only left in test file")

    for line_no, body in split_tests(src):
        expects = re.findall(r"expect(?:\.\w+)?\(", body)
        if not expects:
            if "expectTypeOf" not in body and ".todo" not in body.split("(")[0]:
                add("WARN", line_no, "test has no expect() assertion")
            continue
        weak = re.findall(r"\.(toBeDefined|toBeTruthy|not\.toThrow|not\.toBeNull|not\.toBeUndefined)\(\)", body)
        strong = len(expects) - len(weak)
        if weak and strong <= 0:
            add("WARN", line_no, "test only has existence/no-throw assertions; assert actual values")
        mock_asserts = re.findall(r"\.toHaveBeenCalled(?:Times|With)?\(", body)
        if mock_asserts and len(mock_asserts) == len(expects):
            add("WARN", line_no, "test only asserts on mocks; also assert on output/observable behavior")

    return findings


def check_config(path: Path):
    src = path.read_text(encoding="utf-8")
    out = []
    if not re.search(r"restoreMocks\s*:\s*true", src):
        out.append(("WARN", 0, "restoreMocks: true not set; mocks/spies may leak between tests"))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="+", type=Path)
    ap.add_argument("--config", type=Path)
    args = ap.parse_args()

    errors = 0
    for f in args.files:
        for level, line, msg in check_file(f):
            print(f"{level} {f}:{line}: {msg}")
            errors += level == "ERROR"
    if args.config:
        for level, _, msg in check_config(args.config):
            print(f"{level} {args.config}: {msg}")
    if not errors:
        print("OK: no blocking issues")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
