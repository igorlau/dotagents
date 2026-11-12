---
name: dot-code-review
description: Review a diff for correctness bugs and maintainability problems. Use when the user asks to review code, a commit, a branch, or a pull request, or before you commit a non-trivial change.
---

# Code review

Review the change in two passes, and give one report. The correctness pass finds the defects that make the change behave wrongly in production. The maintainability pass finds the structure that makes the next change harder.

Review against the repository's standards. Code that follows a repository convention is not a finding, even when general practice differs. Code that breaks one is a finding.

## 1. Pick the target

Use the target the user named. Otherwise pick the first one that applies:

1. A pull request number or URL: `gh pr diff <number>`.
2. Staged and unstaged changes: `git diff HEAD`.
3. The current branch against its base: `git diff $(git merge-base HEAD origin/main)`. Use the repository's default branch name.

State the target in one line before you start.

## 2. Read for context

For each changed hunk, read the whole function, its callers, and the tests that cover it. Read the description of the pull request, the linked issue, or the roadmap task if there is one, so you can check the change against its intent and its scope.

## 3. Pass 1: correctness

Each correctness finding is a **failure scenario**: concrete inputs or state that lead to a wrong result, a crash, or data loss. Use a neutral tone in this pass.

Check every hunk against each of these classes:

- Logic: inverted conditions, off-by-one errors, wrong operator, wrong variable, unreachable branches.
- Edge cases: empty, null, zero, negative, very large, Unicode, duplicate, and concurrent inputs.
- Errors: swallowed exceptions, no cleanup, partial writes, retries that are not idempotent.
- Contracts: changed signatures, return shapes, defaults, or API responses that current callers depend on.
- Data: migrations that lose or lock data, no transaction, inconsistent writes.
- Security: injection, no authorization check, secrets in code or logs, unsafe deserialization, path traversal.
- Concurrency: races, deadlocks, shared mutable state, assumptions about order.
- Tests: changed behavior without a test that fails when the change is wrong.

Prove each candidate: trace the code path with the input that fails, or write and run a test that fails. Drop a candidate that has no concrete scenario, or report it as a question. In this pass, report style problems only when they hide a bug or break a documented convention.

## 4. Pass 2: maintainability

Read [`references/maintainability.md`](references/maintainability.md), and apply every rule in it to the diff.

Done when you checked the diff against each rule in the reference.

## 5. Report

Give one report for both passes, from most to least severe. Give a correctness finding its **Scenario**, and a maintainability finding its **Cost**:

```markdown
### <high | medium | low> <one-line summary>
`path/to/file.ts:42` (<correctness | maintainability>)
**Scenario:** <inputs or state>, then <wrong result>
**Cost:** <what a reader or the next change pays>
**Fix:** <smallest change that removes the problem>
```

End the report with this section. Write one line for each class of finding in the report. Prefer a tool that the repository already runs:

```markdown
## Make it impossible

- <finding class>: <the type, lint rule, or check that prevents it, or "none">
```

If you find nothing, say that the review found no defects, and list what you checked. Change code only when the user asks for fixes.
