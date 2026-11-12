---
name: dot-implement
description: Implement a feature, fix, refactor, or roadmap task to the repository's and the language's standards. Use when the user asks to build or change code, or to work a task from a dot-roadmap roadmap.
---

# Implement

Turn a request, an approved plan, or a roadmap task into a production code change that ends **green**: the type checker and the linter pass, no current test fails by accident, and you have shown the output. Write no tests: a separate test step writes them.

## Repository conventions first

Before you start, read what the repository defines: agent instructions (`AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.github/instructions/`, `.cursor/rules/`), project skills, `CONTRIBUTING.md`, style guides, linter and formatter configuration, and the patterns in the nearby code. They take precedence over this skill: where they differ, follow the repository, and point out the difference. Do not change the repository's standard. Write code that fits those conventions.

## 1. Pin the work

Identify the source of the work:

- **Roadmap task**: a task file from `dot-roadmap`, or a roadmap directory. With only a directory, pick the lowest-id unticked task whose blockers are all ticked in its `README.md`. If a named task has an unticked blocker, stop and name it. Read the task file and the roadmap's decisions in full. The task's "Out of scope" is a hard boundary.
- **Approved plan**: the plan in this conversation, from `dot-plan` or the user.
- **Request**: anything else.

Done when you can state the goal, the scope boundary, and the check that proves the work is done.

## 2. Plan when needed

A roadmap task or an approved plan is already the plan. For a request that touches more than one file, use the `dot-plan` skill and wait for the user's approval before you change any file. A single-file change goes straight to step 3.

## 3. Build

For each language the change touches, read its reference if one exists:

- [`references/typescript.md`](references/typescript.md): TypeScript and TSX.

Work through the plan one step at a time, and run each step's check before you start the next one.

Done when every requirement of the task, plan, or request has code that meets it.

## 4. Verify

Run the type checker and the linter. They are hard checks: fix each error that they report. Then run the current tests, the task's "Verify" section, or the plan's final check, and show the output. Classify each failed test:

- **Expected**: the test asserts behavior that the task changes on purpose. Keep it for the handoff, and continue.
- **Unexpected**: a regression. Fix the production code.

Check every acceptance criterion one by one. When only an expected failure or a test that does not exist yet blocks a criterion, leave the criterion open for the test step, and list it in the handoff.

When a hard check or an unexpected failure stays red, or the task or plan turns out wrong (a fact contradicts it, or it needs work outside its scope), stop. Report the check that failed or the fact that conflicts, and propose a change to the task or plan. Keep the task file, the roadmap's decisions, and the plan as they are until the user agrees, and keep the change inside its scope.

Do not tick the roadmap checkbox. The `dot-commit` skill ticks it after the review step.

Done when the hard checks pass and no unexpected failure remains.

## 5. Hand off

End with the verification output, anything that you skipped or could not check, and these fields for the fill mode of the `dot-testing` skill:

```markdown
**Expected failures:**
- `<test file>`: <test name>: <the new behavior that the test must assert>

**Behaviors that need tests:**
- `<module>`: <a behavior that the change adds or changes, and that no test case covers>
```

Write "none" under a field that has no items. Suggest `dot-testing` in fill mode, then the `dot-code-review` skill, then the `dot-commit` skill. Leave the commit to the user.
