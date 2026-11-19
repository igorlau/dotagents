# Report

This is the report template of [`dot-factory`](../SKILL.md). Write it to `<run dir>/report.md`. Take the facts from `state.md`, the Gate lines of the build log, and the `ledger.json` file of each `<review dir>`.

```markdown
# <slug>: report

**Track:** <track>
**Spec:** <spec dir>/README.md
**Range:** <Base tree> to <Last review tree>
**UI review:** <ran, or "skipped: <reason>">
**Layers page:** <path, or none>

## Tasks

| Task | Diff | Findings | Accepted risks |
| ---- | ---- | -------- | -------------- |
| <id> <title> | <files, insertions, deletions> | <count fixed> fixed | <ids, or none> |

## Open findings

- <id> `<file>:<line>` <class>, <severity>: <summary>

## Modules

<a Mermaid flowchart of the changed modules and their dependencies>
```

Fill the template with these rules:

- **Tasks**: one row for each `gate pass` line, the fix rounds included, in build log order. The diff is `git diff --shortstat <tree before> <tree>`, where `<tree before>` is the tree of the Gate line before, or the **Base tree** for the first row.
- **Findings** and **Accepted risks**: give each ledger entry to the last row whose diff changed its `file` (`git diff --name-only`). An accepted risk is an entry with the status `accepted`.
- **Open findings**: each entry with the status `accepted`. Write "none" when no entry has it.
- **Modules**: add this section only when the changed files span more than 3 top-level directories. Otherwise, leave it out.
