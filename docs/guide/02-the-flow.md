# The flow

The flow takes an idea to commits in small steps, and stops for you where a
decision is yours. Each step is one skill, so you can also run a
step alone.

## Steps

The flow has these steps, in this order:

1. [`dot-grilling`](../../plugin/skills/dot-grilling/SKILL.md) asks
   questions in rounds until the plan is clear.
1. [`dot-plan`](../../plugin/skills/dot-plan/SKILL.md) shows the entity
   schemas, then the plan as small, verifiable steps.
1. [`dot-roadmap`](../../plugin/skills/dot-roadmap/SKILL.md) splits the plan
   into phases and task files. Each task lists its test cases.
1. For each task, [`dot-flow`](../../plugin/skills/dot-flow/SKILL.md) runs
   three steps:
    1. [`dot-implement`](../../plugin/skills/dot-implement/SKILL.md) writes
       the production code, and lists the tests that must change.
    1. [`dot-testing`](../../plugin/skills/dot-testing/SKILL.md) writes the
       test cases of the task as tests.
    1. [`dot-code-review`](../../plugin/skills/dot-code-review/SKILL.md)
       reviews the change.
1. [`dot-commit`](../../plugin/skills/dot-commit/SKILL.md) commits the task
   in small commits, and ticks the task in the roadmap.

The [README](../../README.md#the-flow) shows the steps as a sequence
diagram. [Build a task](04-build.md) shows one task in `dot-flow`.

## Approval points

The agent stops and waits for you at these points:

| After | You approve |
| ----- | ----------- |
| The entity schemas of `dot-plan` | The data model, before the steps |
| The plan | The steps |
| The roadmap | The phases, the tasks, and the test cases |
| The review of `dot-flow` | The findings to fix, or the change as it is |
| Each commit group of `dot-commit` | The files and the message |

`dot-flow` does not stop after the code or the tests. A reply of an agent is
a claim, so `dot-flow` runs the type checker, the linter, and the tests
again itself, and continues only when the results agree with the reply.

To fix findings, name them. `dot-flow` runs the three steps again with those
findings.

## Where the flow stops

`dot-flow` stops, and keeps the files as they are, in these cases:

- A step reports a blocker.
- A check that `dot-flow` runs gives a result that differs from the reply.

`dot-flow` never commits, and never ticks the roadmap. You run `dot-commit`
when you accept the change.

Next: [Plan the change](03-plan.md).
