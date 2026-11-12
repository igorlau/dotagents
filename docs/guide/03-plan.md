# Plan the change

Plan before the code. A question costs one message now, and a wrong guess
costs a rewrite later.

## Make the idea clear with dot-grilling

Start [`dot-grilling`](../../plugin/skills/dot-grilling/SKILL.md) with the
idea, in your own words. Give the goal and how you will know that it works:

```text
/dotagents:dot-grilling Export the invoices as CSV. A retry must not write a row twice.
```

The agent asks its questions in rounds. Each round has every question that
your earlier answers make possible, and a recommended answer for each. The
agent finds the facts in the code itself, and asks you only for decisions.
Stop when the answers no longer change the plan.

## Plan the steps with dot-plan

Start [`dot-plan`](../../plugin/skills/dot-plan/SKILL.md) in the same
conversation:

```text
/dotagents:dot-plan
```

When the change adds or changes a domain entity, the agent first shows a
schema for it: the full schema for a new entity, and a diff for a
changed one. The schema has the form that the repository uses, such as a
TypeScript type or SQL DDL, or JSON Schema when the repository has none. Approve the schemas before the steps. The schemas stay in the
plan and the roadmap, not in committed files.

The plan puts removal steps first, such as dead code or checks that the
change makes unnecessary. Approve the plan, or ask for changes.

## Split the plan with dot-roadmap

For a plan with more than a few steps, start
[`dot-roadmap`](../../plugin/skills/dot-roadmap/SKILL.md):

```text
/dotagents:dot-roadmap
```

The agent splits the plan into phases, and each phase into task files. Each
task has its requirements, its out-of-scope items, its acceptance criteria,
its test cases, and the command that verifies it. The roadmap `README.md`
records the decisions and has a checkbox for each task.

Approve the roadmap. The test cases decide the behavior of each task before
the code exists, and `dot-testing` writes them as given, so read them with
care.

Next: [Build a task](04-build.md).
