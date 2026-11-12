# The flow

The flow takes an idea to commits in small steps, and stops for your
approval between the steps. Each step is one skill, so you can also run a
step alone.

## Steps

The flow has these steps, in this order:

1. [`dot-grill-me`](../../plugin/skills/dot-grill-me/SKILL.md) asks
   questions in rounds until the plan is clear.
1. [`dot-plan`](../../plugin/skills/dot-plan/SKILL.md) shows the entity
   schemas, then the plan as small, verifiable steps.
1. [`dot-roadmap`](../../plugin/skills/dot-roadmap/SKILL.md) splits the plan
   into phases and task files. Each task lists its test cases.
1. For each task, [`dot-flow`](../../plugin/skills/dot-flow/SKILL.md) runs
   four steps:
    1. [`dot-testing`](../../plugin/skills/dot-testing/SKILL.md) in stub mode
       writes each test case as a pending test.
    1. [`dot-implement`](../../plugin/skills/dot-implement/SKILL.md) writes
       the production code, and lists the tests that must change.
    1. `dot-testing` in fill mode writes the tests.
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
| Each step of `dot-flow` | The step result, with "go" |
| Each commit group of `dot-commit` | The files and the message |

To change a step result, say what to change instead of "go". `dot-flow` runs
the same step again in a new agent.

## Where the flow stops

`dot-flow` stops, and keeps the files as they are, in these cases:

- A step reports a blocker.
- The review reports a `high` finding.

`dot-flow` never commits, and never ticks the roadmap. You run `dot-commit`
when you accept the change.

Next: [Plan the change](03-plan.md).
