---
name: dot-commit
description: Commit changes as small, logical commits, with the user reviewing each one. Use when the user asks to commit, write a commit message, or split work into commits.
---

# Commit

Each commit is **atomic**: one purpose, complete enough to build and pass tests, and small enough to review and revert on its own.

## Repository conventions first

Before you start, read what the repository defines: agent instructions (`AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.github/instructions/`, `.cursor/rules/`), project skills, `CONTRIBUTING.md`, style guides, linter and formatter configuration, and the patterns in the surrounding code. They take precedence over this skill: where they differ, follow the repository, and point out the difference instead of changing the repository's standard. Follow the repository's commit convention when it defines one, in `CONTRIBUTING.md`, a commitlint or similar configuration, or a consistent history.

## Review mode

Review is the default: the user approves the plan, and then each commit before you create it. When the user asks you to commit without review, for example "commit without asking", skip both approval stops for that request, and still show the summary in step 4.

## 1. Inspect

Run `git status` and `git diff HEAD` to see every change, including untracked files. Note any changes that the user already staged, and ask whether they belong together. Run `git log -n 15 --oneline` to learn the convention and scopes that the repository uses.

## 2. Propose the plan

Group the changes into commits by purpose: a refactor, a behavior change, a dependency update, and a formatting pass are separate commits. Keep a test in the same commit as the behavior it covers. Order the commits so that each one builds on the previous ones.

Check each file for secrets, credentials, local configuration, build output, and large binaries. Leave those out of the plan and tell the user.

Show the whole plan before you stage anything:

```markdown
1. `<message summary>`
   - path/to/file.ts
   - path/to/file.test.ts
2. `<message summary>`
   - path/to/other.ts (only the hunks for <purpose>)

Left out: <files and reasons, or none>
```

Wait for the user's answer. When they ask to merge, split, reorder, or move files between commits, update the plan and show it again. Done when the user approves the plan.

## 3. Commit each group

For each commit in the plan, in order:

1. Stage only its changes with `git add -- <paths>`. When one file holds changes for two commits, write the hunks for this commit to a patch file and run `git apply --cached <patch>`.
2. Show `git diff --staged --stat` and the full commit message.
3. Wait for the user's answer:
   - **Approve**: run `git commit`, and move to the next group.
   - **Change**: adjust the staged files or the message, and show them again.
   - **Skip**: run `git restore --staged -- <paths>`, and move to the next group.

Let pre-commit hooks run. When a hook fails, fix the cause, stage the fix, and show the commit again for approval. Amend an earlier commit only when the user asks.

## 4. Summarize

Show `git log --oneline` for the commits you created, and list the changes that remain uncommitted. Push only when the user asks.

Done when every group in the plan is committed or skipped, and the user has seen the summary.

## Message format

Use the repository's commit convention. When it defines none, use the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) format, and reuse the scopes you found in the log:

```text
<type>(<optional scope>): <summary in the imperative mood>

<body: why the change is needed and what it affects, wrapped at 72 characters>

<footer: BREAKING CHANGE: ..., Refs: #123>
```

- **type**: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `build`, `ci`, or `chore`.
- **summary**: 50 characters or fewer when possible, 72 at most, without a final period.
- **body**: explain the reason and the effects. The diff already shows the lines that changed.
- **breaking change**: add `!` after the type or scope, as in `feat(api)!:`, and describe the change in a `BREAKING CHANGE:` footer.
- **authorship**: the commit belongs to the user alone. Leave out `Co-Authored-By` trailers and AI attribution such as "Generated with" lines, even when tool defaults add them. Keep the trailers that the repository requires, such as `Signed-off-by`.
