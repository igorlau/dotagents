---
name: dot-plan
description: Plan a change as small, verifiable steps before writing code. Use when the user asks for a plan, or before a feature, refactor, or migration that touches more than one file.
---

# Plan

A plan turns a request into a sequence of **vertical slices**: each slice is a small change that leaves the system working and ends on a check you can run.

## Repository conventions first

Before you start, read what the repository defines: agent instructions (`AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.github/instructions/`, `.cursor/rules/`), project skills, `CONTRIBUTING.md`, style guides, linter and formatter configuration, and the patterns in the surrounding code. They take precedence over this skill: where they differ, follow the repository, and point out the difference instead of changing the repository's standard. Plan changes that fit those conventions.

## 1. Pin the goal

Restate the goal in one or two sentences, and name the **done criterion**: the observable result that tells the user the work is finished (a passing test, a command's output, a behavior in the UI).

Done when the goal and the done criterion fit in three sentences and contain no "and also".

## 2. Gather facts

Read the code, tests, configuration, and docs that the change touches. Trace each entry point to the code it reaches. Note the conventions you must follow and the tests that already cover the area.

Facts are your job: look them up instead of asking. Done when you can name every file you expect to change and why.

## 3. Surface decisions

List the choices that the facts don't settle: behavior in edge cases, trade-offs, naming that users see, anything hard to reverse. Give your recommendation for each one.

If the list is long or the decisions depend on each other, use the `dot-grilling` skill to resolve them with the user. Done when every decision has an answer or is marked as an open question in the plan.

## 4. Slice the work

Write the steps. For each step, include:

- **Change**: what you modify, by file or module.
- **Check**: the command or observation that proves the step works.

Order the steps so that the riskiest unknown comes first, as a **tracer bullet**: the thinnest path through the whole system that proves the approach. Keep refactors in their own steps, separate from behavior changes.

Done when every step has a check that can fail, and the last check matches the done criterion.

## 5. Present and wait

Show the plan in this shape:

```markdown
**Goal:** <one sentence>
**Done when:** <done criterion>

1. <change> → check: <command or observation>
2. ...

**Open questions:** <none, or the list>
**Risks:** <what could make the plan wrong>
```

Wait for the user's approval before you change any file. When the plan changes during the work, update it and say what changed.
