# Fix round

Read this file in the [`dot-flow`](../SKILL.md) skill when the user picks Fix. Read its "Snapshots" section earlier, when the first review of the task ends. The file gives the snapshots, the light path, the choice between a full review and a delta review, and the fields of step 3 on a fix run. Both runners use it.

## Snapshots

A snapshot is a Git tree of the working tree, with the untracked files and without the ignored files. Write it with a temporary index, so that the working tree and the index stay as they are. Run these commands at the repository root:

```bash
tmp="$(mktemp)"
cp "$(git rev-parse --git-path index)" "$tmp"
GIT_INDEX_FILE="$tmp" git add -A && GIT_INDEX_FILE="$tmp" git write-tree
rm -f "$tmp"
```

`git write-tree` prints the hash of the tree. When the commands print no hash, stop the flow and show the error to the user. Each fix round uses 2 trees:

- **Old tree**: the state that the last review read. Before the first fix round, write it when the first review reply arrives, before you show the review to the user. On a later fix round, it is the new tree of the round before.
- **New tree**: write it after step 2 of the fix round is verified, before step 3 starts.

Compare the 2 trees, not a tree and the working tree. `git diff <tree>` misses the new untracked files, and shows the files that were untracked at the snapshot as deleted.

Compare the paths from the repository root, as `git diff --name-only` prints them. Before a comparison, remove the repository root from each absolute path in a finding or on a **Files** line.

## Light path

The light path applies when the user picks Fix and every finding to fix is `low`. A light-fixed finding is a finding that the light path fixed since the last review. On this path, the reply of step 1 ends with the line `**Behavior change:** <yes | no>`. After step 1, write a tree as the "Snapshots" section gives it, and check these 3 conditions:

- The **Behavior change** line says `no`.
- `git diff --name-only <old-tree> <tree>` lists only files that the findings to fix or the light-fixed findings name.
- The checks of the reply and the full test command pass, with no failed test.

When all 3 are true, skip steps 2 and 3. Show each fixed finding as "fixed, not reviewed", then show the other findings and the Fix or Accept choice again. Keep the old tree, so that the next review also reads the light fix. Add the light-fixed findings to the **Earlier findings** of the next review, so that it grades them.

When a condition is false, run steps 2 and 3 as a normal fix round.

## Full or delta

Run `git diff --name-only <old-tree> <new-tree>`, and read only the file names, never the changed files. Remove from the list the files on the **Files** line of the step 2 reply of the round. The delta diff still has these test changes, so a delta review reviews them.

- When the list that remains has a file that no earlier finding names, run a full review: leave out **Since**.
- Otherwise, run a delta review: give step 3 the **Since** field.

## Fields of step 3

On a fix run, add these fields after **Handoff**:

```markdown
**Since:** <old-tree> <new-tree>
**Earlier findings:**
<the findings that the round sent to fix and the light-fixed findings, unchanged>
```

- **Since**: only on a delta review. The reviewer runs `git diff <old-tree> <new-tree>`, and reviews only that diff. It still checks the diff against every `NN` and each `BR` that the task names. A delta review does not find an old defect that an earlier review missed. This trade-off is accepted.
- **Earlier findings**: on each fix run, full or delta. The reviewer does not report an earlier finding again as a new finding. It gives each earlier finding one status, and reports the statuses before the new findings:
  - `fixed`: the problem is gone.
  - `open`: the problem is still there.
  - `regressed`: the fix made the problem worse, or moved it to other code.

A full review keeps the rule "report every finding at every severity".

**Earlier findings** lists only the findings that the round sent to fix and the light-fixed findings. Keep each earlier finding that the review grades `open` or `regressed` as the last review that reported it gave it, with its `file:line` and **Fix** line. Show it again at the next decision with its status. This applies after a full review and after a delta review.

After a delta review, also keep each finding of the last review that is not in **Earlier findings** unchanged, and show it again at the next decision. No reviewer grades it again. After a full review, the report replaces the other findings, so keep none of them. The highest severity that you show also covers the carried findings.
