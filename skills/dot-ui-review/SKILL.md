---
name: dot-ui-review
description: Review UI changes visually in a browser, against a live preview of the app, for interaction, responsive layout, visual polish, accessibility, and robustness. Use when the user or an agent asks for a UI or design review of front-end changes. Do not use it for a correctness review of the code: use `dot-code-review`. The review skips when the app cannot start or no browser tool exists.
---

# UI review

Review the UI changes in a running app, in a browser, as a user sees them. Assess the live experience first, and read the code second. For a review that reads code only, use `dot-ux-review`.

Report findings as problems and their effect on the user. Assume that the author meant well. Change no code.

## 1. Check the preconditions

The review needs both of these:

- **An app command.** Use the command that the caller gives. Otherwise use the `dev` script, then the `start` script, in `package.json` or in the build file of the project.
- **A browser tool.** Use the browser tool of the session: Playwright MCP or Claude in Chrome. Load its tools if they are deferred.

When one is missing, stop. Make no change and start nothing. Report this line with the reasons, and nothing else:

```text
UI review: skipped. <reason>
```

Use one of these reasons. Step 2 uses the last two:

- `no app command: the caller gave none, and the project has no dev or start script`
- `no browser tool: the session has neither Playwright MCP nor Claude in Chrome`
- `the app did not start: <the command and its last error line>`
- `no UI changes: the target has no file that renders a UI`

Done when you have the app command and a browser tool, or you reported the skip line.

## 2. Prepare

1. Pick the target: the working tree against `HEAD` (`git diff HEAD`, plus the untracked files that `git status --porcelain` lists), or the tree range `<old-tree> <new-tree>` that the caller gives. Read the description of the work, the pull request, or the roadmap task if there is one, for the motivation and the test notes.
2. Read the diff. List the components, the routes, and the states that it changes. If the files render no UI, report the skip line with the reason `no UI changes`.
3. Start the app command in the background. Do not install dependencies. Read its output for the local URL, and wait until the URL answers. If the app does not answer within 60 seconds, stop it, and report the skip line with the reason `the app did not start`.
4. Open the URL in the browser. Set the desktop viewport to 1440 by 900.
5. Run `git check-ignore -q .tmp`. When Git ignores `.tmp`, save each screenshot in `.tmp/ui-review/`. Otherwise take no screenshot to disk, and report each visual finding without a path.

Use only the local app. Use dummy data in each form, and do not open a link to a deployed or shared service.

## 3. Review in phases

Run the phases in order. In each phase, visit the pages and the states that the diff changes. Take a screenshot as evidence of each visual finding. Skip a phase check that the change does not touch.

1. **Interaction and user flow.** Run the main flow of the change, following the test notes. Test the hover, active, focus, and disabled states. Check that a destructive action asks for confirmation. Judge how fast the interface answers.
2. **Responsiveness.** Test the desktop viewport (1440 px), the tablet viewport (768 px), and the mobile viewport (375 px). Capture a screenshot of each. Check that the layout adapts, that touch targets are large enough, and that nothing scrolls sideways or overlaps.
3. **Visual polish.** Check the alignment and the spacing, the typography hierarchy and the legibility, the colors and the image quality, and whether the visual hierarchy guides the eye.
4. **Accessibility (WCAG 2.1 AA).** Tab through the whole change and check the order. Check a visible focus state on each interactive element, Enter and Space activation, semantic HTML, form labels, image alt text, and a contrast ratio of 4.5:1 or more for text.
5. **Robustness.** Submit invalid input to each form. Test long text and large content for overflow. Check the loading, empty, and error states, and other edge cases.
6. **Code health.** Read the changed code. Check that it reuses existing components, uses the design tokens of the project and not magic numbers, and follows the patterns of the project.
7. **Content and console.** Check the grammar and the clarity of each text. Read the browser console for errors and warnings.

Done when each phase has run, or you wrote down why it did not apply.

## 4. Clean up

Stop the app process that you started. Close the browser tabs that you opened.

## 5. Report

Start with one or two sentences on what works well and on the overall quality. Then give the findings in the `dot-code-review` format, from most to least severe:

```markdown
### <high | medium | low> <one-line summary>
`path/to/Component.tsx:42` (ui)
**Cost:** <what the user pays, and the viewport or state where it shows>
**Screenshot:** `.tmp/ui-review/<name>.png`
**Fix:** <smallest change that removes the problem>
```

- Use `file:line` of the component that renders the problem. When you cannot find the component, use the route.
- Use `high` for a failure that blocks the flow or an accessibility barrier, `medium` for a significant problem to fix before merge, and `low` for polish.
- Describe the problem and its effect. Name a fix only when it is small and clear.
- Omit the **Screenshot** line when the finding has no screenshot.

When you find nothing, say that the review found no UI problems, and list the viewports and the states that you checked.
