# Review

This is the review step of [`dot-factory`](../SKILL.md). The review script makes every loop decision. Act only on its output.

`<review dir>` is `<run dir>/review-<k>/`, where `<k>` counts the reviews of the run, from 1. It holds `ledger.json`, `review-<round>.json`, `apply-<round>.json`, `layers.json`, and the Gate logs of the fix rounds. Round 0 is the first review. Round `<r>` reviews the fix of fix round `<r>`.

## 1. Pick the range

- `<old>`: the **Last review tree** of `state.md`. When it is `none`, the **Base tree**.
- `<new>`: the `tree` of the last Gate line. For a review that the user asks for while files changed after that line, hash the tree with a temporary index: `GIT_INDEX_FILE=<review dir>/index git add -A && GIT_INDEX_FILE=<review dir>/index git write-tree`, then delete `<review dir>/index`.

When `<old>` and `<new>` are the same, tell the user that nothing changed since the last review, and go back to the build.

Run `node <skill dir>/scripts/review-loop.mjs scope <old> <new>`. It prints `files`, `lines`, `changedLines`, `lenses`, and `ui`.

Done when you have the range and its scope.

## 2. Review

Start one `dotagents:dot-reviewer` subagent with this prompt:

```text
Range: <old> <new>
Spec: <spec dir>
Lenses: <the lenses of scope, comma-separated>
Output: <review dir>/review-<round>.json
```

From round 1, add 2 fields:

```text
Changed lines: <the changedLines of scope, as JSON>
History: <JSON list>
```

**History** is the `findings` of `apply-<round - 1>.json` and the `history` that this command prints for the range of this round:

```text
node <skill dir>/scripts/review-loop.mjs history --ledger <review dir>/ledger.json --old <old> --new <new>
```

Give one entry for each `id`, each as `{"id", "file", "line", "class", "summary", "fix"}`. The `findings` are what the fix addressed, and the `history` holds the earlier findings on the lines that the fix changed.

Run the **UI review** when all 3 conditions are true: `ui` is `true`, `package.json` has a `dev` or a `start` script, and this session has a browser tool. Use the `dot-ui-review` skill in this session, and add each finding to the `findings` of `review-<round>.json`, with `lens` set to `ui`. When a condition is false, add `UI review: skipped: <the false condition>` to the build log.

Done when `review-<round>.json` exists.

## 3. Apply the rules

Run this command, and add `--old <old> --new <new>` from round 1:

```text
node <skill dir>/scripts/review-loop.mjs apply --ledger <review dir>/ledger.json --review <review dir>/review-<round>.json --round <round> > <review dir>/apply-<round>.json
```

Read `action` and `reason` from `apply-<round>.json`. Add `review <k> round <round>: <action>, <reason>` to the build log. Then act on `action`:

- `fix`: fix every finding of `findings` in this session. Run the Gate with `--task fix-<round + 1>` and `--log <review dir>/gate-fix-<round + 1>-<n>.log`, with the attempt rules of the build step. Then `<old>` becomes the `<new>` of this round, and `<new>` becomes the tree of the Gate line. Run `scope` on the new range, and go to step 2 with the next round.
- `escalate`: escalate. Give the `reason` and each open finding as `<id> <file>:<line> <class>: <summary>`. The intended action is one more fix round. For the answer `accept`, run `node <skill dir>/scripts/review-loop.mjs accept --ledger <review dir>/ledger.json`, and go to step 4. For any other answer, do the `fix` action with the answer as the instruction.
- `done`: go to step 4.

Done when the action is `done`, or the user answered `accept`.

## 4. Close the review

1. Set the **Last review tree** of `state.md` to the `<new>` of the last round.
2. When `<review dir>/layers.json` exists, run `node <skill dir>/../../../skills/dot-walkthrough-branch/scripts/page.mjs <review dir>/layers.json`. It prints the path of the layers page. Add the path to the build log.
3. After a review that the user asked for during the build, continue the build with the next unticked task. After the last task, go to the report step.
