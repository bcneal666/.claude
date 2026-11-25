---
name: now-push
description: Run git add + commit + push automatically with a fixed-format English commit message, pushing every unpushed local commit on the current branch together; --lng sets the language, --pr opens a PR, --merge opens a PR, waits for required checks, squash merges, deletes the branch and returns to the default branch; also checks and updates the GitHub repo description
argument-hint: "[--lng <zh|ja|...>] [--pr] [--merge]"
disable-model-invocation: true
---

Commit and push current repo (cwd) in one pass, no confirmation. User typed this on purpose, so act; guards below stop the run whenever acting would be unsafe.

## Arguments (parse from `$ARGUMENTS`, any order)

- `--lng <code>` or `--lng=<code>`: language for commit subject/body, repo description, PR title/body. Accept BCP-47 code (`zh`, `ja`, `de`, case-insensitive) or natural-language name (`繁中`, `日文`, `Japanese`)
  - absent → **English**
  - unrecognized or missing value → one-line notice, **fall back to English**, continue; do not abort
  - `zh` → Traditional Chinese (`zh-cn`/`簡中` → Simplified)
- `--pr`: open PR after push; absent → **no branch, no PR**
- `--merge`: implies `--pr`; after PR, wait for required checks to pass, squash merge into default branch, delete branch (local + remote), switch back to default branch and sync; absent → PR stays open
- other unknown tokens → one-line notice, ignore; do not abort
- Regardless of language: `type`, `scope`, `Co-Authored-By` trailer, branch name **always English**

## Files

`<skill-dir>` = this SKILL.md's directory. Read each reference at the step that names it.

| File                             | Read at                                    | Purpose                                                          |
| -------------------------------- | ------------------------------------------ | ---------------------------------------------------------------- |
| `references/commit-format.md`    | Step 4, and step 9 for PR titles           | Fixed commit format: structure, type table, field rules, samples |
| `references/pr-merge.md`         | Steps 5, 9, 10, only with `--pr`/`--merge` | Branching, PR creation, waiting for checks, squash merge         |
| `references/repo-description.md` | Step 11                                    | When and how to update the GitHub repo description               |

Execute in order immediately, no confirmation:

## Flow

1. `git status` + collect **unpushed commits** on current branch (probe commands exempt from the stop rule below):
   - Operation in progress → stop before anything else: `git rev-parse -q --verify MERGE_HEAD`, `CHERRY_PICK_HEAD`, `REVERT_HEAD` (each prints a ref when that operation is in progress, else exits 1), `git diff --name-only --diff-filter=U` (unmerged paths), and `git status` text "rebase in progress" / "You are in the middle of an am session". Any hit → report the operation and unmerged paths, tell user to finish or abort it first, make no commit and no push. Step 6 `git add -A` would mark conflict-marker files as resolved and push them
   - upstream = `git for-each-ref --format='%(upstream:short)' "$(git symbolic-ref -q HEAD)"` (exits 0; empty output = no upstream)
   - has upstream → unpushed = `git log --oneline <upstream>..HEAD`
   - no upstream → unpushed = `git log --oneline HEAD --not --remotes`
   - clean tree **and** no unpushed commits → report 「無變更可推送」 and stop
   - clean tree but unpushed commits exist → skip working-tree diff, commit message generation, `git add`, `git commit` (steps 2 working diff, 4, 6, 7); go to step 5 (existing commits are pushed as-is)
2. `git diff` + `git diff --staged`; read full changes. Also list untracked files (`git ls-files --others --exclude-standard`) and read them—step 6 `git add -A` commits them, `git diff` does not show them. Unpushed commits exist → also read `git diff <base>..HEAD` (base = upstream, else `origin/<default branch>`) for the secret check and PR content
3. `git log -5 --oneline` for recent commit style. Also read the repo's commit rules when present: commitlint config (`commitlint.config.*`, `.commitlintrc*`, `commitlint` key in `package.json`) and `CONTRIBUTING.md`. Their allowed types, scopes or header length override the matching field of the fixed format, because a commit-msg hook would reject the commit and stop the run; everything else stays fixed format
4. Generate commit message in the **fixed format** (`references/commit-format.md`) (before branching; branch name needs it)
5. **`--pr`/`--merge`**: create the feature branch per `references/pr-merge.md` § Step 5
6. `git add -A`
7. `git commit -m "<header>" -m "<body>" -m "Co-Authored-By: <當前模型全名> <noreply@anthropic.com>"` (exactly three `-m`; trailer per footer)
8. `git push` (always whole current branch, never a single sha or refspec); current branch has no upstream → `git push -u origin HEAD`. Report pushed commits (short sha + header; mark the one created this run)
9. **`--pr`/`--merge`**: open or reuse the PR per `references/pr-merge.md` § Step 9; report PR URL
10. **`--merge` only** (existing PR also merged): wait for required checks, squash merge, clean up and report per `references/pr-merge.md` § Step 10
11. Repo description check (`references/repo-description.md`)

Steps 1–10 (except the step 1 probes, the step 5 `--is-ancestor` guard, the step 9 `gh pr view` probe (exit 1 = no PR) and the step 10.1 "no checks reported" retry, whose non-zero exit just selects a branch): any non-zero exit → stop immediately, report full stderr, **do not attempt repair**. A failing commit hook counts: report it and stop, never retry with `--no-verify`. Step 10 merge blocked after checks passed (review / conflict / other policy) → report stderr + PR URL, stay on feature branch, no retry, no `--admin`/`--auto`. Step 11 failure (not GitHub, `gh` not logged in, no permission) → notice only, **not an overall failure**—commit/push already done.

## Prohibited

- No emoji in commit message or repo description (PR body trailer `🤖 Generated with …` required, exempt)
- English subject: no past tense or third-person singular (`added`/`adds` → always `add`)
- No filenames in subject (put in body or express via scope)
- No force push
- `--merge`: no `--admin` to bypass branch protection
- Existing unpushed commits: push as-is; never amend, squash, reword or rewrite to fixed format
- Diff (working tree **or** any unpushed commit) contains secret, API key, password or similar sensitive data → **stop immediately and warn user**; do not commit, do not push
- No `--no-verify`, no `--amend` (on any commit, including this run's), no `git reset --hard`, no `git rebase`, no `git config` commands: hooks and history belong to the repo, and this run only adds one commit on top
- No commit-message file (`-F`): keep the three `-m` form
