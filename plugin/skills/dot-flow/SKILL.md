---
name: dot-flow
description: Take one roadmap task through implementation, tests, and review, and stop for your decision after the review.
disable-model-invocation: true
---

# Flow

Take one task from a `dot-roadmap` roadmap through three steps: implementation, tests, and review. Each step runs in a fresh agent with one skill. You coordinate the steps, and you verify each reply with the commands that it names. The agents write the code, the tests, and the review. The user decides after the review.

## 1. Pin the task

The input is a roadmap task file or a roadmap directory. With a directory, pick the lowest-id unticked task whose blockers are all ticked in its `README.md`. If the task has an unticked blocker, stop and name it.

Run `git status --short`. The review step reads every uncommitted change, so when the working tree has other changes, ask the user to commit them first or to include them in the review.

Done when you can name the task file and its goal.

## 2. Pick the runner

Use the agents of the dotagents plugin when the `Agent` tool can start them: `dotagents:dot-implementer`, `dotagents:dot-tester`, and `dotagents:dot-reviewer`. Otherwise, such as in Codex or Copilot, read [`references/inline.md`](references/inline.md), and run each step inline with the same verification and stops.

## 3. Run and verify the steps

Run the steps in this order. For each step, start a new agent of the named type, not a fork, so that each step starts with a fresh context:

| Step | Agent | Prompt fields |
| ---- | ----- | ------------- |
| 1. Implement | `dotagents:dot-implementer` | Task |
| 2. Test | `dotagents:dot-tester` | Task, Handoff: the reply of step 1 |
| 3. Review | `dotagents:dot-reviewer` | Task, Handoff: the replies of steps 1 and 2 |

Write the prompt as labeled fields, and leave out a field that the step does not take:

```markdown
**Task:** <path of the task file>
**Handoff:**
<the replies of the earlier steps, unchanged>
```

Copy the replies unchanged, because the agents read their fields.

A reply is a claim, not a result. After steps 1 and 2, run each command that the reply names in its **Checks** or **Tests** line, and read only the result line and the names of the tests that fail. Keep the main context small: do not read the changed files. The step is **verified** when all of these are true:

- The type checker and the linter pass.
- After step 1, each test that fails is in "Expected failures".
- After step 2, the test command passes.
- The reply has no blockers.

After a verified step, show the user one line, such as "Step 1 of 3: verified, `npm run check` passes", and start the next step. Do not wait.

Stop the flow, keep the files as they are, and ask the user how to continue in these cases:

- A reply has blockers. Show them.
- A step is not verified. Show the command, your result line, and the line of the reply.
- The `check` hook reports a failure to you. An agent left it, so the step is not verified. Show the output, and do not edit the code yourself.

Done when the review reply arrived, or the flow stopped.

## 4. Decide after the review

Show the user the **Highest severity** line and one line for each finding: its severity, summary, and `file:line`. Show each `high` finding with its **Fix** line. The presumed blockers of the maintainability pass are `high`. Then wait for the user to pick one:

- **Fix**: the user names the findings to fix. Run step 1 again in a new agent, with the findings as a **Findings** field, then run steps 2 and 3 again.
- **Accept**: the user accepts the findings that remain.

Done when the user accepts.

## 5. Finish

List the files that the steps changed, from the **Files** lines of the replies. Suggest the `dot-commit` skill, and name the task file, so that `dot-commit` can tick its checkbox.

Do not commit, and do not tick the roadmap checkbox: `dot-commit` ticks it when the commits finish the task.
