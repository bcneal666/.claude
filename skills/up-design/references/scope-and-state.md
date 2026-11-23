# Scope decision and state files

## Scope decision (`scripts/scope.mjs`; `start_run.mjs` shares the same logic)

### Mode

| Mode  | Condition                                                                                                                                                                                  |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| full  | `--full` / `full` given; no `up-design/last-run.json`; more than 30 days since `last_full_at`; project is not a git repo; the hash in `last-run.json` no longer exists (e.g. after rebase) |
| quick | None of the above                                                                                                                                                                          |

Full runs periodically because quick sees only changed files and misses cross-component problems (e.g. inconsistent overall animation style); a full check every 30 days fills the gap.

### File source

- **quick**: `git diff --name-only <last-run hash>` (committed and uncommitted changes) + `git ls-files --others --exclude-standard` (untracked files)
- **full (git)**: `git ls-files` + untracked files
- **full (non-git)**: recursive walk, excluding `node_modules`, `dist`, `build`, `.next`, `.nuxt`, `.svelte-kit`, `.output`, `coverage`, `.git`, `up-design`, etc.

Deleted files are not listed.

### UI file extensions

`.tsx` `.jsx` `.ts` `.js` `.mjs` `.vue` `.svelte` `.astro` `.html` `.css` `.scss` `.sass` `.less` `.styl` `.mdx`

`.ts` / `.js` are included because animation config, hooks and design tokens often live there. They may be backend or config files; skip them when clearly unrelated to UI instead of handling each.

### Other detection

- `mobile`: mirrors the `--m` / `m` argument; the script never guesses
- `uses_sonner`: `package.json` dependencies / devDependencies / peerDependencies include `sonner`, or any in-scope file imports `sonner`. shadcn/ui also has a Base UI Toast variant, so only actual dependence on `sonner` counts, not whether shadcn is used

### Output format

```json
{
  "project_root": "/path/to/project",
  "is_git": true,
  "head": "a1b2c3d...",
  "mode": "quick",
  "reason": "距上次執行有 5 個變更檔案",
  "mobile": false,
  "uses_sonner": true,
  "last_run": { "...": "last-run.json 的內容，沒有則為 null" },
  "file_count": 5,
  "files": ["src/components/Card.tsx", "..."]
}
```

## State directory `./up-design/`

```
up-design/
├── last-run.json
├── perf-baseline.md
└── reports/
    └── YYYY-MM-DD-HHMM.md
```

The whole directory stays under version control. `scripts/start_run.mjs` checks `.gitignore`:

- Rule is exactly `up-design`, `up-design/`, `/up-design` or `/up-design/` → delete that line
- Ignored by a broader rule (e.g. `*.json`, `*.md`) → append `!/up-design/` and `!/up-design/**` to the end of `.gitignore`, then check again
- Still ignored (e.g. a parent directory is wholly ignored) → print a warning; the agent fixes it by hand and records it in the report

### `last-run.json`

```json
{
  "head": "a1b2c3d4e5f6...",
  "run_at": "2026-11-23T01:30:00+08:00",
  "mode": "quick",
  "last_full_at": "2026-11-01T22:10:00+08:00"
}
```

| Field          | Meaning                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------ |
| `head`         | HEAD hash when the run finished; `null` for non-git repos                                        |
| `run_at`       | Completion time of this run (Asia/Taipei)                                                        |
| `mode`         | This run's mode                                                                                  |
| `last_full_at` | Completion time of the latest full run; equals `run_at` when this run is full, else carried over |

Written by `scripts/finish_run.mjs`; never edit by hand.

### `perf-baseline.md`

Format in `assets/perf-baseline-template.md`. Updated only when verification shows no overall regression, so the baseline only gets better.

### `reports/`

One per run, named by start time (Asia/Taipei). Created by `scripts/start_run.mjs` from `assets/report-template.md`. Old reports are kept as history; never delete.
