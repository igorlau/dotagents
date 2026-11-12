# Review and commit

Review every change before you commit it. `dot-flow` runs the review for a
roadmap task. For other changes, start the review yourself.

## Review the diff with dot-code-review

Start [`dot-code-review`](../../plugin/skills/dot-code-review/SKILL.md) with
a target, such as the uncommitted changes, a branch, or a pull request:

```text
/dotagents:dot-code-review the uncommitted changes
```

The review has two passes. The correctness pass finds bugs. The
maintainability pass finds code that is harder to read or change than it
must be, and its tone is direct. Each finding gives its severity, its
`file:line`, and the smallest fix.

The [report](../../plugin/skills/dot-code-review/SKILL.md#5-report) ends
with a "Make it impossible" section: a lint rule or a type that would prevent
each class of finding. To add one, use `dot-correct`. See [Make it yours](07-make-it-yours.md).

Ask the agent to fix the findings that you accept, then review again.

## Delete comments with dot-comments

The always-on comments rule deletes comments by default. To check the
comments in a diff, start
[`dot-comments`](../../plugin/skills/dot-comments/SKILL.md):

```text
/dotagents:dot-comments
```

The agent flags each comment that no exception protects, reports the list,
and deletes the comments after you agree.

## Commit with dot-commit

Start [`dot-commit`](../../plugin/skills/dot-commit/SKILL.md):

```text
/dotagents:dot-commit
```

The agent splits the changes into small, logical commits, and shows each
group and its message before it commits. It uses the commit convention of
the repository, or Conventional Commits.

When the commits finish a roadmap task, `dot-commit` ticks the task in the
roadmap `README.md`. The next `dot-flow` run then picks the next task.

Next: [Rules and principles](06-rules-and-principles.md).
