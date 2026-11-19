# The dotagents guide

dotagents gives Claude Code and Copilot one flow: plan the change, split it
into tasks, build each task in three steps, then review and commit. In Claude
Code, `dot-factory` runs the flow for you. This guide teaches the flow in
order. Each page also stands alone.

1. [Install dotagents](01-install.md). The plugin and the CLI, for each
   coding agent.
1. [The flow](02-the-flow.md). `dot-factory` with its tracks, its stops, and
   its review, and the same steps by hand.
1. [Plan the change](03-plan.md). `dot-grilling`, `dot-plan` with
   requirements and entity schemas, and `dot-roadmap`.
1. [Build a task](04-build.md). The build of `dot-factory`, the build by hand
   with `dot-implement`, `dot-testing`, and the Gate script, and the agents
   that run a step.
1. [Review and commit](05-review-and-commit.md). The review of
   `dot-factory`, `dot-code-review`,
   `dot-walkthrough-branch`, the other reviews (`dot-walkthrough-changes`,
   `dot-security-audit`, `dot-security-changes`, `dot-ux-review`, and
   `dot-ui-review`), `dot-comments`, and `dot-commit`.
1. [Rules and principles](06-rules-and-principles.md). The always-on rules,
   and the principles inside the skills.
1. [Make it yours](07-make-it-yours.md). `dot-correct`, the `check` hook,
   your own skills, and vendored skills.

## If you remember one thing

Approve the spec before the code, and read the change before you commit it.
The skills stop and wait for you at each approval point. A wrong entity
schema or a wrong test name costs one message to fix at the approval point,
and costs a rewrite after the code builds on it.

To start in Claude Code, give `dot-factory` the problem:

```text
/dotagents:dot-factory Export the invoices as CSV, and do not write a row twice when a retry starts.
```

In Copilot, give the idea to `dot-grilling`, and ask for questions:

```text
/dot-grilling Export the invoices as CSV, and do not write a row twice when a retry starts.
```

Next: [Install dotagents](01-install.md).
