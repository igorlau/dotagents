---
name: dot-correct
description: Turn a mistake that agents repeat into architecture, a type, a lint rule, or a test that prevents it.
disable-model-invocation: true
---

# Correct

Change the repository so that the next agent cannot make the same mistake again. Assume every contributor is an agent that sees only the files it opened, copies the nearest example, and takes the shortest path that compiles. A change that looks right from one file must be right for the whole repository.

## Repository conventions first

Before you start, read what the repository defines: agent instructions (`AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.github/instructions/`, `.cursor/rules/`), project skills, `CONTRIBUTING.md`, style guides, linter and formatter configuration, and the patterns in the nearby code. They take precedence over this skill: where they differ, follow the repository, and point out the difference. Do not change the repository's standard. Use the type checker, linter, and test framework that the repository already has.

## 1. Name the mistake class

Use the mistake that the user names. Otherwise, read the recent commits, reverts, review comments, agent instruction files, and comments that explain workarounds, and group the mistakes into classes. A class counts when it occurred two times.

Done when each class has two examples as evidence: commits, lines, or corrections from the user.

## 2. Pick the highest level

Try each level in this order, and take the first one that prevents the class:

1. Architecture: make the mistake impossible. Give each piece of state one owner and each task one supported way. Hide internals so that the wrong import fails. Replace lists that people keep in sync by hand with one source of truth. Delete the old ways and the dead code that an agent would copy.
2. Types: make the bad state impossible to write.
3. Lint rule or CI check: when the bad code still compiles, add a check whose error names the file, type, or function to use instead. If the pattern is already common, fail only when a change adds more of it.
4. Test: test the behavior. Fix or delete a test that passes when its behavior breaks, or that fails when only the internals change.
5. Docs or agent rules: use this level only for a judgment call that no check can enforce. Nothing fails when an agent skips a doc, so add an example of the mistake.

When a structural fix works, use only the structural fix. Do not also add an instruction.

Ask the user before you add a dependency or change the lint configuration.

## 3. Fix and prove

Fix one class at a time, in the repository where the mistake occurred. Prove that each new check fails on a real past mistake: apply the mistake, run the check, show the error, then remove the mistake. Run the same command that CI runs. Put each exception on the line that needs it, with a reason and the user's approval.

Run the repository's type checker, linter, and tests. Done when each new check failed on a past mistake and all checks pass.

## 4. Report

For each class, report the evidence, the level that you picked, why a higher level did not work, and the output that proves the check. Suggest the `dot-commit` skill, with one commit for each class.
