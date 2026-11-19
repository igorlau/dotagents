# The flow

The flow takes an idea to a reviewed change in small steps, and stops for you
where a decision is yours. In Claude Code, `dot-factory` runs the steps for
you. Each step is also one skill, so you can run the steps yourself, or run
one step alone.

## Run the flow with dot-factory

`dot-factory` works only in Claude Code. Commit or stash your changes first,
because a run starts from a clean tree. Then give it the problem:

```text
/dotagents:dot-factory Export the invoices as CSV, and do not write a row twice when a retry starts.
```

The run keeps its files in `.tmp/factory/SLUG/`, and the spec in
`.tmp/roadmaps/SLUG/`. `SLUG` is the problem in 2 to 5 words, joined by
hyphens. Git must ignore `.tmp`, or the run stops before it starts.

### Tracks

The intake picks a track and shows it. To correct the track, reply with one
word. The following table gives the tracks:

| Track | When | What the run does |
| ----- | ---- | ----------------- |
| `spike` | You ask a question, such as "can we do X". | It builds a prototype in a time box, writes the answer to `spike.md`, and stashes the prototype. It has no spec and no review. You can promote the spike to a `feature` run. |
| `bug` | A behavior is wrong. | It writes a failing test first, with `dot-debug`, then a spec of one task. |
| `small` | The change is about 300 changed lines or fewer. | It writes a spec of one task. |
| `feature` | Any other change. | It asks you about the open decisions, then writes a spec with phases. |

### Where the run stops

A run stops for you at 2 points:

1. The spec approval. The spec comes from
   [`dot-roadmap`](../../skills/dot-roadmap/SKILL.md), with the requirements,
   the phases, the tasks, and their test cases.
1. The final report. All changes are staged, and `report.md` lists each task,
   the findings, and the accepted risks. The run never commits.

A run also stops for an escalation: a question that the rules of the run
cannot answer. The agent shows the question, the reason, and the action that
it takes without other instructions. Reply with an instruction, with
`accept`, or with `stop`.

### The review

After the last task, one `dot-reviewer` agent reviews the whole change. To
get a review earlier, ask for it during the build. The run then reviews the
change after the current task, and continues the build.

The agent fixes every finding, at every severity, and asks for a second
review of the lines that the fix changed. A script decides when the loop
stops, with these rules:

- The loop ends when no finding is open.
- The run escalates when a finding that a fix closed comes back.
- The run escalates when a finding of the same class comes back in the same
  file, on a line that the fix changed. A finding about the style of the docs
  is the exception.
- The run escalates when the number of open findings does not go down.
- The run escalates after 3 fix rounds.

At an escalation, reply `accept` to keep the open findings as accepted risks.
Any other reply is the instruction for one more fix round.

To continue a run in a new session, start `dot-factory` again. It finds the
open run, and asks whether to resume it.

## Run the steps yourself

Without `dot-factory`, and in Copilot, run these steps, in this order:

1. [`dot-grilling`](../../skills/dot-grilling/SKILL.md) asks
   questions in rounds until the plan is clear.
1. [`dot-plan`](../../skills/dot-plan/SKILL.md) lists the
   requirements, shows the entity schemas, then writes the plan as small,
   verifiable steps.
1. [`dot-roadmap`](../../skills/dot-roadmap/SKILL.md) splits the plan
   into phases and task files. Each task lists its test cases.
1. Run these three steps for each task. `dot-implement` starts `dot-testing`
   itself, unless an agent prompt limits it.
    1. [`dot-implement`](../../skills/dot-implement/SKILL.md) writes
       the production code, and lists the tests that must change.
    1. [`dot-testing`](../../skills/dot-testing/SKILL.md) writes the
       test cases of the task as tests.
    1. [`dot-code-review`](../../skills/dot-code-review/SKILL.md)
       reviews the change.
1. [`dot-commit`](../../skills/dot-commit/SKILL.md) commits the task
   in small commits. Then you tick the task in the roadmap.

[Build a task](04-build.md) shows the steps of one task.

### Approval points

When you run the steps yourself, the agent stops and waits for you at these
points:

| After | You approve |
| ----- | ----------- |
| The requirements of `dot-plan` | The user needs, functional requirements, business rules, and non-negotiables |
| The entity schemas of `dot-plan` | The data model, before the steps |
| The plan | The steps |
| The roadmap | The phases, the tasks, and the test cases |
| The review of `dot-code-review` | The findings to fix, or the change as it is |
| Each commit group of `dot-commit` | The files and the message |

`dot-implement` and `dot-testing` report their checks, so read the results
before you start the next step. They never commit and never tick the roadmap.
You run `dot-commit` when you accept the change.

Next: [Plan the change](03-plan.md).
