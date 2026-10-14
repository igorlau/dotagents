---
name: dot-code-review
description: Review a diff for correctness bugs. Use when the user asks to review code, a commit, a branch, or a pull request, or before committing a non-trivial change.
---

# Code review

Find the defects that would make this change behave wrongly in production. Each finding is a **failure scenario**: concrete inputs or state that lead to a wrong result, a crash, or data loss.

## Repository conventions first

Before you start, read what the repository defines: agent instructions (`AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.github/instructions/`, `.cursor/rules/`), project skills, `CONTRIBUTING.md`, style guides, linter and formatter configuration, and the patterns in the surrounding code. They take precedence over this skill: where they differ, follow the repository, and point out the difference instead of changing the repository's standard. Review against those standards. Code that follows a repository convention isn't a finding, even when general practice differs; code that breaks one is.

## 1. Pick the target

Use the target the user named. Otherwise pick the first one that applies:

1. A pull request number or URL: `gh pr diff <number>`.
2. Staged and unstaged changes: `git diff HEAD`.
3. The current branch against its base: `git diff $(git merge-base HEAD origin/main)`. Use the repository's default branch name.

State the target in one line before you start.

## 2. Read for context

For each changed hunk, read the whole function, its callers, and the tests that cover it. Read the description of the pull request or linked issue if there is one, so you can check the change against its intent.

## 3. Hunt

Check every hunk against each of these classes:

- **Logic**: inverted conditions, off-by-one errors, wrong operator, wrong variable, unreachable branches.
- **Edge cases**: empty, null, zero, negative, very large, Unicode, duplicate, and concurrent inputs.
- **Errors**: swallowed exceptions, missing cleanup, partial writes, retries that aren't idempotent.
- **Contracts**: changed signatures, return shapes, defaults, or API responses that existing callers depend on.
- **Data**: migrations that lose or lock data, missing transactions, inconsistent writes.
- **Security**: injection, missing authorization checks, secrets in code or logs, unsafe deserialization, path traversal.
- **Concurrency**: races, deadlocks, shared mutable state, ordering assumptions.
- **Tests**: changed behavior without a test that would fail if the change were wrong.

## 4. Verify each finding

For each candidate, prove it: trace the code path with the failing input, or write and run a test that fails. Drop candidates you can't support with a concrete scenario, or report them as questions.

Report style issues only when they hide a bug or break a documented project convention.

## 5. Report

List findings from most to least severe:

```markdown
### <severity: high | medium | low> <one-line summary>
`path/to/file.ts:42`
**Scenario:** <inputs or state> → <wrong result>
**Fix:** <smallest change that removes the defect>
```

If you find nothing, say that the review found no defects, and list what you checked. Change code only when the user asks for fixes.
