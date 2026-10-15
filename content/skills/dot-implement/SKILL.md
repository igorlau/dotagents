---
name: dot-implement
description: Implement a feature, fix, refactor, or roadmap task to the repository's and the language's standards. Use when the user asks to build or change code, or to work a task from a dot-roadmap roadmap.
---

# Implement

Turn a request, an approved plan, or a roadmap task into a working change that ends **green**: every check the work names passes, and you've shown the output.

## Repository conventions first

Before you start, read what the repository defines: agent instructions (`AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.github/instructions/`, `.cursor/rules/`), project skills, `CONTRIBUTING.md`, style guides, linter and formatter configuration, and the patterns in the surrounding code. They take precedence over this skill: where they differ, follow the repository, and point out the difference instead of changing the repository's standard. Write code that fits those conventions.

## 1. Pin the work

Identify the source of the work:

- **Roadmap task**: a task file from `dot-roadmap`, or a roadmap directory. With only a directory, pick the lowest-id task whose blockers are all ticked in its `README.md`. If a named task has an unticked blocker, stop and name it. Read the task file and the roadmap's decisions in full. The task's "Out of scope" is a hard boundary.
- **Approved plan**: the plan in this conversation, from `dot-plan` or the user.
- **Request**: anything else.

Done when you can state the goal, the scope boundary, and the check that proves the work is done.

## 2. Plan when needed

A roadmap task or an approved plan is already the plan. For a request that touches more than one file, use the `dot-plan` skill and wait for the user's approval before you change any file. A single-file change goes straight to step 3.

## 3. Build

For each language the change touches, read its reference if one exists:

- [`references/typescript.md`](references/typescript.md): TypeScript and TSX.

When you write or change tests, use the `dot-testing` skill.

Work through the plan one step at a time, and run each step's check before you start the next one.

Done when every requirement of the task, plan, or request has code that meets it.

## 4. Verify

Run the task's "Verify" section, the plan's final check, or the repository's tests, type checker, and linter, and show the output. Check every acceptance criterion one by one. Reread your diff against the code comments rule, and fix what it flags.

When verification fails, or the task or plan turns out wrong (a fact contradicts it, or meeting it needs work outside its scope), stop. Report the failing check or the conflicting fact and propose a change to the task or plan. Keep the task file, the roadmap's decisions, and the plan as they are until the user agrees, and keep the change inside its scope.

For a roadmap task, tick its checkbox in the roadmap's `README.md` once everything passes.

Done when the work is green.

## 5. Hand off

End with the verification output and anything you skipped or couldn't check. Suggest the `dot-code-review` skill for the diff, then the `dot-commit` skill. Leave the commit to the user.
