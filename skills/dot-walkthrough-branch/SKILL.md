---
name: dot-walkthrough-branch
description: Review the commits of a branch as an ordered stack of dependency layers, and report each layer with its findings.
disable-model-invocation: true
---

# Branch walkthrough

Review the committed changes of a branch as a **stack**: layers of files in dependency order. A reader understands layer 1 on its own, and each later layer from the layers above it. The `dot-code-review` skill gives the review. This skill gives the layers and the report.

## 1. Pick the target

- **Head**: the branch that the user named, or the current branch.
- **Base**: the branch that the user named, or the default branch from `git symbolic-ref --short refs/remotes/origin/HEAD`, such as `origin/main`. Use a local branch only when the user names it. When the repository has no `origin/HEAD`, ask the user for the base.
- **Merge base**: `git merge-base <base> <head>`. Compare head with the merge base, never with the tip of base, so commits that base got after the fork stay out.
- **Diff**: `git diff <merge-base> <head>`, with `--numstat` for the line counts. It has the committed changes only.
- **Page**: when the arguments include `page`, run step 5 after the report, without the offer.

Read each file with `git show <head>:<path>`, and keep the current checkout. For a file that head deletes, read it with `git show <merge-base>:<path>`.

State the target in one line: `<head> vs <base> (merge base <short sha>)`.

Done when you have the merge base and the list of changed files.

## 2. Group the layers

Group the changed files of step 1 into layers with the rules of [`references/layers.md`](references/layers.md). Then continue to step 3. The user can ask for new layers after the report.

Done when each changed hunk is in exactly one layer, and no layer depends on a layer below it.

## 3. Review

Use the `dot-code-review` skill on the diff of step 1, with its passes and its finding format. Run one review, in layer order: layer 1 first, then each next layer. Give each finding the layer of its hunk.

Done when each layer has its findings, or is clean.

## 4. Report

Fill this template. The overview stack comes first, with layer 1 at the top. Each row shows the layer number, the name, the file count, the findings by severity or `clean`, and the layers that it needs. Then each layer gets a section, in layer order. One "Make it impossible" section, in the `dot-code-review` format, ends the report.

````markdown
```text
<head> vs <base> (merge base <short sha>)

┌──────────────────────────────────────────────────────────┐
│ 1  Contracts      2 files   high 1                       │
├──────────────────────────────────────────────────────────┤
│ 2  Core logic     3 files   medium 1   needs 1           │
├──────────────────────────────────────────────────────────┤
│ 3  Callers        1 file    clean      needs 1, 2        │
└──────────────────────────────────────────────────────────┘
```

## Layer 1: <name>
Purpose: <one line>
Depends on: <nothing | layers 1, 2>

| File | + | - |
| ---- | - | - |
| path/to/file.ts | 12 | 4 |

<each finding of the layer in the dot-code-review format, or "No findings.">

## Make it impossible

<one line for each class of finding in all layers>
````

For a split file, count only the lines of the hunks in that layer.

End the report with a one-line offer of the HTML page of step 5. When the user accepts, run step 5.

Done when the report has every layer of step 2 and every finding of step 3.

## 5. Page

Write a self-contained HTML page of the stack, with the diff of each file and its findings.

1. Run `git check-ignore -q .tmp` at the repository root. When it exits with a non-zero code, stop, and tell the user that Git does not ignore `.tmp`, so the page could reach a commit.
2. Write the layers of step 2 and the findings of step 3 to `.tmp/walkthrough/<branch-slug>.json`. `<branch-slug>` is head with each character other than a letter, a digit, `.`, `_`, or `-` replaced by `-`, such as `feat-flow-fix-loop`. Sort the keys.

   ```json
   {
     "base": "main",
     "head": "feat/my-change",
     "layers": []
   }
   ```

   `layers` has the layer objects of the layers JSON in [`references/layers.md`](references/layers.md).

3. Run the script of this skill directory from the repository root: `node <skill directory>/scripts/page.mjs .tmp/walkthrough/<branch-slug>.json`. It runs `git merge-base` and `git diff` itself, and prints the path of the page.
4. When the script exits with a non-zero code, fix the field that its message names, and run it again.

Done when the user has the path of the page.
