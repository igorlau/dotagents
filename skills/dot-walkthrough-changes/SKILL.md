---
name: dot-walkthrough-changes
description: Walk through the uncommitted changes of the working tree, or the changes between two trees, as an ordered stack of dependency layers, with an optional review and an HTML page. Use when the user or an agent asks to walk through or group the current changes before a commit. Do not use it for a review that needs no layers: use `dot-code-review`.
---

# Changes walkthrough

Walk through the changes of the working tree as a **stack**: layers of files in dependency order. This skill follows [`dot-walkthrough-branch`](../dot-walkthrough-branch/SKILL.md). It differs in the target, the optional review, and the output path.

## 1. Pick the target

- **Working tree** (default): the working tree against `HEAD`. The diff is `git diff HEAD`, and each untracked file that `git status --porcelain` lists is a new file. Git ignores the files that `.gitignore` names, so they stay out.
- **Tree range**: `<old-tree> <new-tree>`, when the caller gives the two tree ids. The diff is `git diff <old-tree> <new-tree>`.
- **Output path**: a file path from the caller, for the layers JSON.
- **Layers only**: when the caller says "layers only", skip step 3.
- **Page**: when the arguments include `page`, run step 5 after the report, without the offer.

Read each changed file from the working tree, or with `git show <tree>:<path>` for a tree range. For a deleted file, read it from `HEAD` or from the old tree.

State the target in one line: `working tree vs HEAD (<short sha>)`, or `<old-tree> .. <new-tree>`.

Done when you have the list of changed files. When there are none, stop and tell the user.

## 2. Group the layers

Group the changed files into layers with the rules of [`layers.md`](../dot-walkthrough-branch/references/layers.md).

Done when each changed hunk is in exactly one layer, and no layer depends on a layer below it.

## 3. Review

Skip this step when the caller said "layers only". Each layer then has an empty `findings` array.

Otherwise, follow step 3 of [`dot-walkthrough-branch`](../dot-walkthrough-branch/SKILL.md#3-review) on the diff of step 1.

Done when each layer has its findings, is clean, or was skipped.

## 4. Report

Run this step only when the caller gave no output path. Fill the template of step 4 of [`dot-walkthrough-branch`](../dot-walkthrough-branch/SKILL.md#4-report), with the target line of step 1 in place of the branch line. When step 3 ran, add the "Make it impossible" section. Then offer the page of step 5.

With an output path, skip the report. Go to step 5.

Done when the report has every layer of step 2, and every finding of step 3 when it ran.

## 5. Page

1. Run `git check-ignore -q .tmp/` at the repository root. When it exits with a non-zero code, stop, and tell the caller that Git does not ignore `.tmp`, so the page could reach a commit.
2. Write the layers to the output path of the caller, or to `.tmp/walkthrough/working-tree.json`. Sort the keys. Leave out `base` and `head`. For a tree range, add `oldTree` and `newTree` as full tree ids.

   ```json
   {
     "layers": []
   }
   ```

   `layers` has the layer objects of the layers JSON in [`layers.md`](../dot-walkthrough-branch/references/layers.md).

3. Run the script of `dot-walkthrough-branch` from the repository root: `node <skills directory>/dot-walkthrough-branch/scripts/page.mjs <layers file>`. The page title is `working tree`, or the tree range.
4. When the script exits with a non-zero code, fix the field that its message names, and run it again.

Done when the caller has the path of the page. With an output path, return the page path as the last line of the answer.
