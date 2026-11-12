---
name: dot-comments
description: Review the comments in a diff and delete every one that no exception protects. Use when the user asks to clean up, audit, or remove comments, or when a review finds comments that explain code.
---

# Comments

Delete every comment in scope that the code comments rule does not protect, and turn each surprise that a comment explained into code that needs no comment.

## Scope

Use the files or the diff that the user names. Otherwise, use the current diff against the base branch (default `main`), including uncommitted changes. Judge the comments that the diff adds or changes, and the lint and type-checker suppressions that it adds.

## 1. Flag

Read the code around each comment, then give the comment one flag:

- **Keep**: an exception from the code comments rule applies. Name the exception. Keep a gotcha only after you confirm it in the dependency's code or docs, on a path that still runs.
- **Delete**: narration, restated code, change history, commented-out code, banners, or a justification that names no exception.
- **Reshape**: the comment explains a surprise in this repository's code. Name the symbol and the rename, extraction, or type change that makes the surprise go away.
- **Encode**: the comment states a constraint, such as "do not remove" or "keep in sync with X". Name the cheapest type, runtime check, test, or lint rule that enforces it.

Treat `IMPORTANT`, "do not remove", and long justifications as claims to check, not as reasons to keep. If you are not sure that an exception applies, flag **Delete**.

A suppression (`eslint-disable`, `@ts-ignore`, `@ts-expect-error`, and similar) is a **Keep** only when its rule is style-only or wrong for this line. When the rule protects correctness or safety, flag it **Reshape** and name the code that trips the rule.

Done when every comment and suppression in scope has a flag, and every **Keep** names its exception.

## 2. Report

List the flags by file, one line each: `file:line`, the flag, and the reason or the proposed change. Wait for the user to accept or reject them.

## 3. Apply

Apply each accepted flag:

- **Delete**: remove the comment.
- **Reshape**: make the smallest change in scope that removes the surprise, then remove the comment. If the fix reaches outside the scope, remove the comment and report the fix as open.
- **Encode**: add the type, check, test, or lint rule, then remove the comment.

Run the repository's type checker, linter, and tests. Done when they pass and every accepted flag is applied or reported as open.
