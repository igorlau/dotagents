# Build a task

Build each roadmap task in three steps: production code, tests, then review.
The test names come from the task, so the tests check the behavior that you
approved, not the code that the agent wrote.

## Run the steps

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

## Run a step in an agent

In Claude Code, the plugin has two agents that run one step each in a clean
context: `dotagents:dot-implementer` for the production code, and
`dotagents:dot-tester` for the tests. Each agent preloads one skill and
receives the always-on rules. No agent can start another agent. Copilot does
not start the dotagents agents, so run the steps in the main session.

Ask Claude Code to run the agent. Give
`dot-implementer` the **Task** field, the path of the task file. Give
`dot-tester` the **Task** field and the **Handoff** field, the handoff of
`dot-implementer`.

After an agent replies, run the type checker, the linter, and the tests
yourself. The reply is not proof.

Next: [Review and commit](05-review-and-commit.md).
