---
name: commit
description: Commit changes as small, logical commits with clear messages. Use when the user asks to commit, write a commit message, or split work into commits.
---

# Commit

Each commit is **atomic**: one purpose, complete enough to build and pass tests, and small enough to review and revert on its own.

## 1. Inspect

Run `git status` and `git diff HEAD` to see every change. Run `git log -n 15 --oneline` to learn the repository's message convention.

## 2. Group

Split the changes into commits by purpose: a refactor, a behavior change, a dependency update, and a formatting pass are separate commits. Keep a test in the same commit as the behavior it covers.

Before staging, check each file for secrets, credentials, local configuration, build output, and large binaries. Leave those out and tell the user.

## 3. Stage precisely

Stage by path with `git add <path>`, or by hunk with `git add -p` when one file holds changes for two commits. Run `git diff --staged` to confirm that the staged changes match the commit's purpose.

## 4. Write the message

Follow the convention you found in the log. When the repository has none, use Conventional Commits:

```text
<type>(<optional scope>): <summary in the imperative mood>

<body: why the change is needed and what it affects, wrapped at 72 characters>

<footer: BREAKING CHANGE: ..., Refs: #123>
```

- **type**: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `build`, `ci`, or `chore`.
- **summary**: 50 characters or fewer when possible, 72 at most, without a final period.
- **body**: explain the reason and the effects. The diff already shows the lines that changed.

## 5. Commit and confirm

Let pre-commit hooks run. When a hook fails, fix the cause, stage the fix, and create the commit again. Amend an earlier commit only when the user asks.

Done when `git status` shows only the changes that the user chose to leave out, and `git log` shows one commit per purpose. Push only when the user asks.
