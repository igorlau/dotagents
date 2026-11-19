# Build a task

Build each roadmap task in three steps: production code, tests, then a check
of the result.
The test names come from the task, so the tests check the behavior that you
approved, not the code that the agent wrote.

## Build with dot-factory

In Claude Code, `dot-factory` builds each task of the approved spec, one at a
time, in roadmap order. For each task, the main session does these steps:

1. It writes the production code with
   [`dot-implement`](../../skills/dot-implement/SKILL.md).
1. It writes the tests with
   [`dot-testing`](../../skills/dot-testing/SKILL.md).
1. It runs the Gate script. The Gate runs the `check` script and the tests
   of the repository, writes their output to a log file, and prints one
   result line. When both pass, the Gate ticks the task in the roadmap.

When the Gate fails, the agent reads the log, fixes the cause, and runs the
Gate again. After the third failure of one task, the run asks you what to do.
See [The flow](02-the-flow.md#run-the-flow-with-dot-factory).

## Build by hand

Commit or put aside your other changes first, because the review reads every
uncommitted change. Run each step yourself, in one conversation:

1. Start [`dot-implement`](../../skills/dot-implement/SKILL.md) for
   the task. It writes the production code. It runs the type checker, the
   linter, and the tests, and fixes each regression. It lists the expected
   failures: tests of behavior that the task changes on purpose.
1. `dot-implement` then starts
   [`dot-testing`](../../skills/dot-testing/SKILL.md) with that list.
   `dot-testing` writes each test case of the task as a test, and changes
   the expected failures to the new behavior. The
   [reference for tests after `dot-implement`](../../skills/dot-testing/references/after-implement.md)
   gives the details.
1. Start [`dot-code-review`](../../skills/dot-code-review/SKILL.md).
   Fix the findings that you accept, then review again.

In Claude Code, you can also run the Gate script of `dot-factory` by hand. To
check task 1.2 and tick it on a pass, run the following command at the
repository root:

```bash
node PLUGIN_DIR/claude/skills/dot-factory/scripts/gate.mjs --task 1.2 --roadmap .tmp/roadmaps/SLUG --log .tmp/gate-1.2.log
```

Replace the following placeholders:

- `PLUGIN_DIR`: the directory of the dotagents plugin, or your clone of the
  dotagents repository.
- `SLUG`: the directory of the roadmap.

The command exits with 0 on a pass, 1 on a failure, and 2 on a usage error.

## Run a step in an agent

In Claude Code, the plugin has 3 agents. Two of them run one step each in a
clean context: `dotagents:dot-implementer` for the production code, and
`dotagents:dot-tester` for the tests. The third, `dotagents:dot-reviewer`,
reviews a range of two trees and writes the findings as JSON. Each agent
preloads one skill, receives the always-on rules, and has a fixed model,
effort, and tool list. No agent can start another agent. `dot-factory`
starts only `dot-reviewer`. Copilot does not start the dotagents agents, so
run the steps in the main session.

Ask Claude Code to run the agent. Give
`dot-implementer` the **Task** field, the path of the task file. Give
`dot-tester` the **Task** field and the **Handoff** field, the handoff of
`dot-implementer`.

After an agent replies, run the type checker, the linter, and the tests
yourself. The reply is not proof.

Next: [Review and commit](05-review-and-commit.md).
