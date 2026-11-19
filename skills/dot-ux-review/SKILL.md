---
name: dot-ux-review
description: Review UI code for UX, accessibility, and interface rules by reading the code, against the Vercel web interface guidelines. Use when the user or an agent asks for a UX review of the current changes, or of a path, before a commit. Do not use it for a correctness review of the code: use `dot-code-review`.
---

# UX review

Review UI code against the rules in [`web-interface-guidelines.md`](references/web-interface-guidelines.md). This skill reads code only. It starts no app and no browser. For a visual review in a browser, use `dot-ui-review`.

## 1. Pick the target

- **Working tree** (default): the working tree against `HEAD`. The diff is `git diff HEAD`, and each untracked file that `git status --porcelain` lists is a new file. Git ignores the files that `.gitignore` names, so they stay out.
- **Tree range**: `<old-tree> <new-tree>`, when the caller gives one. The diff is `git diff <old-tree> <new-tree>`.
- **Path**: a file or a directory that the user names. Review the whole file.

Keep only the files that end in `.tsx`, `.jsx`, `.vue`, `.svelte`, `.html`, or `.css`. Read each one from the working tree, or with `git show <tree>:<path>` for a tree range. Skip a deleted file.

State the target in one line: `working tree vs HEAD (<short sha>)`, `<old-tree> .. <new-tree>`, or the path.

Done when you have the list of UI files. When there are none, stop and tell the user: `UX review: no UI files changed`.

## 2. Read the rules

Read [`web-interface-guidelines.md`](references/web-interface-guidelines.md). Use its "Rules" and "Anti-patterns" sections. Ignore its frontmatter, its `$ARGUMENTS` line, and its "Output Format" section: step 4 sets the format.

## 3. Check each file

For each UI file, read the whole file, not only the changed hunks. Check it against every section of the rules. A rule that does not apply to the file is not a finding, such as a form rule in a file with no form.

- With a diff target, report a finding only on a line that the diff adds or changes, or on a line whose result the change alters.
- Report a rule break that you can point to in the code. Do not guess at runtime behavior that the code does not show.
- When the repository has its own design system or component library, a component of it can meet a rule for you. Read the component before you report the rule as broken.
- Where the repository's own convention differs from a rule, follow the repository, and say so in one line at the end of the report. The rules use Title Case for headings and buttons, for example. A repository can use sentence case.

Done when you checked each UI file against each section of the rules.

## 4. Report

Give the findings in the `dot-code-review` format, from most to least severe. Use `high` for an accessibility barrier or an anti-pattern from the rules, `medium` for another rule break that users meet, and `low` for polish:

```markdown
### <high | medium | low> <one-line summary>
`path/to/file.tsx:42` (ux)
**Cost:** <what the user or the next change pays>
**Fix:** <smallest change that removes the problem>
```

Name the rule in the summary, such as "icon button has no `aria-label`". Group repeated breaks of one rule in one finding with the list of lines.

When you find nothing, say that the review found no UX problems, and list the files that you checked. Change code only when the user asks for fixes.
