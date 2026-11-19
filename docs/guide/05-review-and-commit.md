# Review and commit

Review every change before you commit it. A `dot-factory` run reviews its
change for you. For any other change, start the review yourself.

## Read the review of dot-factory

After the last task, `dot-factory` starts one `dotagents:dot-reviewer` agent
for the whole change. To get a review earlier, ask for it during the build.
A script picks the lenses from the changed files:

- Requirements and code: always. The code lens uses `dot-code-review` and
  `dot-comments`.
- Security: when a changed file is not Markdown. It uses
  `dot-security-changes`.
- UX: when a changed file is UI code, such as `*.tsx` or `*.css`. It uses
  `dot-ux-review`.
- Docs: when a changed file is Markdown. It uses `dot-docs-writing`.

The UI review with `dot-ui-review` runs in the main session. It needs a `dev`
or `start` script in the repository and a browser tool in the session.
Otherwise, the report says why it skipped.

Above about 1,500 changed lines, the reviewer splits the diff into layers,
and the report links an HTML page of the layers.

The agent fixes every finding, and the review loop runs until no finding is
open, or until it escalates. See
[The flow](02-the-flow.md#the-review). At the end, the agent stages all
changes and writes `report.md` in the run directory. Read the report and the
staged diff, then commit with `dot-commit`.

## Review the diff with dot-code-review

Start [`dot-code-review`](../../skills/dot-code-review/SKILL.md) with
a target, such as the uncommitted changes, a branch, or a pull request:

```text
/dotagents:dot-code-review the uncommitted changes
```

The review has two passes. The correctness pass finds bugs. The
maintainability pass finds code that is harder to read or change than it
must be, and its tone is direct. Each finding gives its severity, its
`file:line`, and the smallest fix.

The [report](../../skills/dot-code-review/SKILL.md#5-report) ends
with a "Make it impossible" section: a lint rule or a type that would prevent
each class of finding. To add one, use `dot-correct`. See [Make it yours](07-make-it-yours.md).

Ask the agent to fix the findings that you accept, then review again.

## Review a branch as a stack with dot-walkthrough-branch

Start [`dot-walkthrough-branch`](../../skills/dot-walkthrough-branch/SKILL.md)
with a head branch and a base branch, or with no arguments for the current
branch against the default branch:

```text
/dotagents:dot-walkthrough-branch feat/my-change against main
```

Use it for a large branch. It groups the committed changes into layers by
dependency, and reports the review of each layer in the order that you must
read them.

After the report, the agent offers an HTML page of the stack, with the diff
of each file and its findings. To get the page without the offer, add `page`:

```text
/dotagents:dot-walkthrough-branch page
```

The agent writes the page to `.tmp/walkthrough/` in the repository, and
prints its path. The page makes no network requests. Git must ignore `.tmp`,
or the agent stops before it writes the page.

## Other reviews

Each of these skills reviews one kind of problem:

- [`dot-walkthrough-changes`](../../skills/dot-walkthrough-changes/SKILL.md):
  walk through the uncommitted changes as a stack of layers.
- [`dot-security-audit`](../../skills/dot-security-audit/SKILL.md): audit a
  whole codebase, a branch, or a path for security problems.
- [`dot-security-changes`](../../skills/dot-security-changes/SKILL.md): check
  the uncommitted changes for security problems.
- [`dot-ux-review`](../../skills/dot-ux-review/SKILL.md): review UI code for
  UX and accessibility rules by reading the code.
- [`dot-ui-review`](../../skills/dot-ui-review/SKILL.md): review UI changes in
  a browser, against a live preview.

## Delete comments with dot-comments

The always-on comments rule deletes comments by default. To check the
comments in a diff, start
[`dot-comments`](../../skills/dot-comments/SKILL.md):

```text
/dotagents:dot-comments
```

The agent flags each comment that no exception protects, reports the list,
and deletes the comments after you agree.

## Commit with dot-commit

Start [`dot-commit`](../../skills/dot-commit/SKILL.md):

```text
/dotagents:dot-commit
```

The agent splits the changes into small, logical commits, and shows each
group and its message before it commits. It uses the commit convention of
the repository, or Conventional Commits.

After a `dot-factory` run, the Gate already ticked each task. When you build
a task by hand, tick the task in the roadmap `README.md` after the commits:
change `- [ ]` to `- [x]`. The next `dot-implement` run with the roadmap
directory then picks the next task.

Next: [Rules and principles](06-rules-and-principles.md).
