# The dotagents guide

dotagents gives Claude Code, Codex, and Copilot one workflow: plan the change,
split it into tasks, build each task in three verified steps, then decide on the review and
commit. This guide teaches the workflow in order. Each page also stands alone.

1. [Install dotagents](01-install.md). The plugin and the CLI, for each
   coding agent.
1. [The flow](02-the-flow.md). The steps from an idea to a commit, and where
   you approve.
1. [Plan the change](03-plan.md). `dot-grilling`, `dot-plan` with entity
   schemas, and `dot-roadmap`.
1. [Build a task](04-build.md). Production code, tests, and review,
   by hand or with `dot-flow`.
1. [Review and commit](05-review-and-commit.md). `dot-code-review`,
   `dot-comments`, and `dot-commit`.
1. [Rules and principles](06-rules-and-principles.md). The always-on rules,
   and the principles inside the skills.
1. [Make it yours](07-make-it-yours.md). `dot-correct`, the `check` hook,
   your own skills, and vendored skills.

## If you remember one thing

Approve the plan before the code, and decide on the review after it. The
skills stop and wait for you at each approval point. Between them, the agent
runs the checks itself. A wrong entity
schema or a wrong test name costs one message to fix at the approval point,
and costs a rewrite after the code builds on it.

To start, give the agent an idea and ask for questions:

```text
/dotagents:dot-grilling Export the invoices as CSV, and do not write a row twice when a retry starts.
```

Next: [Install dotagents](01-install.md).
