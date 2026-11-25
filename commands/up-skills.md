---
description: Batch-update skills (<type> is global|project, default global); update each lockfile entry by name via the skills CLI, reinstall unmanaged skills after inferring their upstream, and report plugin / synced / CLI built-in version status
argument-hint: "[<type>]"
disable-model-invocation: true
---

## Scope argument `<type>` (positional `$1`, optional)

- `$1` empty or `global` → target `~/.claude/skills/` (exclude `synced/` subdirectory)
- `$1` is `project` → target `./.claude/skills/`; missing → report 「找不到 `./.claude/skills/`」 then **stop**; do not create directory
- Other value (unrecognized) → one-line notice, **fall back to `global`**, continue; do not abort

## Flow

### 1. Preflight

- In git repo → run `git status --short`; tree dirty → one-line notice 「diff 會混雜既有未提交變更」, **do not abort**
- Confirm `node -v` runs (`npx skills` prerequisite); unavailable → report and stop
- `project` mode assumes **cwd is the project root** (parent of `.claude/`); never `cd` away—`npx skills` reads/writes the project lockfile relative to cwd only; leaving cwd fails silently, not with an error

### 2. Inventory target directory

List skill subdirectory names under target path (`global` excludes `synced/`; both exclude hidden files and non-directory entries).

### 3. Read source data

- `global` → read `skills{}` of `~/.agents/.skill-lock.json` (fields: `source`, `sourceUrl`, `skillPath`, `skillFolderHash`, `updatedAt`)
- `project` → read `skills{}` of **`<project root>/skills-lock.json`** (note: at project root, **not** under `.claude/skills/`; filename has **no dot prefix**) (fields: `source`, `sourceType`, `skillPath`, `computedHash`; no timestamp); missing → treat as empty list (no error); every skill in target directory goes straight to step 4 B/C inference
- Read ignore list (`global` → `~/.claude/skills/.up-skills-ignore`; `project` → `<project>/.claude/skills/.up-skills-ignore`): per line strip `#`-leading comments and trailing `# ...` comments, trim, drop empty lines → name set; file missing = empty set; do not auto-create

### 4. Classify

Tag each skill D/A/B/C per table, **priority D > A > B > C**—name in both ignore list and lockfile → always D:

| Class              | Criterion                                                                                   | Action                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| D self-made/frozen | name listed in `.up-skills-ignore`                                                          | skip entirely: no lockfile comparison, no upstream scan, no commands                                                                            |
| A managed          | name exists in both target directory and lockfile                                           | step 5: `npx skills update`                                                                                                                     |
| B inferable        | not in lockfile, but SKILL.md/README contains `npx skills add …` command or GitHub repo URL | step 6: after confirmation `npx skills add` (reinstall makes CLI write lockfile automatically → next time class A; no hand-built mapping table) |
| C no upstream      | no upstream clue found, or installed via external binary                                    | step 7: report only, run no command                                                                                                             |

`project` mode, lockfile `sourceType` is `node_modules`/`local` → not A, not B/C inference—local source, no upstream to update, legitimate state; tag 「本地來源·不適用」.

`project` mode with no `skills-lock.json` (or record exists but name not found in target directory): scan every SKILL.md/README in target directory, infer source by B rules; source not inferable → tag C; do not guess, do not fabricate repo URL.

### 5. Update class A

Run git drift check first, then build command arguments:

- In git repo → per class-A skill whose entry is a real directory run `git status --porcelain skills/<name>/` (`global`, cwd `~/.claude`) or `git status --porcelain .claude/skills/<name>/` (`project`, cwd project root); any output (uncommitted changes) → tag skill 「本地有未提交改動·已跳過」, exclude from argument list, advise commit first or add to `.up-skills-ignore` for permanent exclusion
- Entry is a legacy symlink into `~/.agents/skills/` (installed before `--copy`) → skip drift check, goes into argument list: content lives outside git, nothing local to protect; git shows only link type change (`D`/`T`, common with `core.symlinks=false`), never real edit. `update` may swap a real directory for such a symlink (git then shows every file deleted plus an untracked link) → after the update, for each class-A skill that was a real directory and is now a symlink, run `rm <link> && cp -rL <target> <link>` so git-synced devices keep working
- Not in git repo → skip check, one-line notice 「無 git 保護，更新將直接覆蓋」, all class A go into argument list

Names classified A, passing drift check, and **actually present in target directory** → list one by one as command arguments:

```
npx skills update <name1> <name2> ... -g -y    # global
npx skills update <name1> <name2> ... -p -y    # project
```

⚠️ `project` mode **must write `-p` explicitly**, not merely "omit `-g`"—with skill names given and neither flag, CLI treats it as updating both global and project (`"both"`), not project alone.

⚠️ **Never omit arguments and run bare** `npx skills update -g` (no arguments = update every lockfile entry; re-installs removed skills into the directory).

Single skill update fails (non-zero exit) → record failure and stderr summary, **continue with the rest**; do not abort overall flow. stdout containing 「legacy」/「無法就地更新」 or similar (common in `project` mode for old records missing `skillPath`) → excerpt into notes column, count as 「失敗」 or 「已略過」; not a command error itself.

`project` mode note: CLI reinstalls such records without `-a`, so agent distribution may change (other agent directories added or removed); known CLI behavior, not controllable by this command; add a remark in report.

### 6. Update class B

Show full command to run one by one; execute only after confirmation:

```
npx skills add <owner/repo> -s <skill> -g -y -a claude-code --copy
```

Always add `--copy`: real directory, not symlink into `~/.agents/skills/`—symlinks hold machine-specific absolute paths, break on devices synced via git. Looping over several skills → `npx … < /dev/null`; `npx` eats loop stdin, later iterations never run.

`project` mode omits `-g`; always add `-a claude-code` to avoid writing directories for other agents (amp, cursor, codex, etc.) listed in lockfile `lastSelectedAgents`. User declines → tag 「已略過」.

### 7. Update class C

List name and 「無法自動更新」 only; run no command.

### 8. Plugin layer

1. `claude plugin marketplace update` (all marketplaces at once)
2. `claude plugin list --json`; keep only entries with `enabled` true and `scope` `user`, excluding marketplaces `builtin` and `skills-dir` (built-in and skills-dir plugins are not updatable here; project-scope, synced, managed entries excluded by `scope`). `list` shows installed versions only, no newer-version indicator
3. Per kept plugin (e.g. `watch@claude-video`) run:
   ```
   claude plugin update <plugin>@<marketplace> -y --json -s user
   ```
   Read `updateOutcome` in the JSON (`up_to_date` or updated)
4. Report 「更新後需重啟 session 才會生效」

### 9. Read-only report layer (no writes, no updates)

**`global` mode only**—`skills/synced/` is a Claude Code account-level concept; `project` has no counterpart; skip this step in `project` mode.

- Read `~/.claude/skills/synced/*/manifest.json`; report each skill's `source`, `updatedAt` and overall `lastUpdated` (platform cloud-managed, cannot update locally)
- Run `claude --version`; report current CLI version; suggest `claude update` for CLI built-in skills (do not run automatically)

### 10. Wrap-up

```
git diff --stat
git status --short
```

**No** `git commit`, **no** `git push`; final line hints `/now-push` to commit.

## Report format

One table, columns: `skill | 類別 | 來源 | 結果 | 備註` (result values 「已更新／已是最新／失敗／已略過／自製·已跳過／本地有未提交改動·已跳過／本地來源·不適用」); class D and drift-skipped items also go in the table; never omit them.

After table add:

- Plugin update result (incl. restart needed)
- Synced skills status (read-only)
- CLI version and whether `claude update` is advised
- `git diff --stat` summary

## Prohibited

- No `npx skills add … --all` or `-s '*'`
- Never touch `skills/synced/` (platform-managed, gitignored)
- Never auto-run `claude update` (replaces CLI itself)—recommend only
- No `git commit`, no `git push`
- Never auto-add/remove `.up-skills-ignore` content—user maintains manually
- Never add `--help` to `npx skills update`/`check`/`upgrade` to explore usage—none intercepts `--help`; they run the update directly; consult only this file or top-level `npx skills --help` for syntax
