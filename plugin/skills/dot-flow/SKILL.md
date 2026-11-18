---
name: dot-flow
description: Take one roadmap task through implementation, tests, and review, fix the high and medium findings in automatic rounds, and stop for your decision.
disable-model-invocation: true
---

# Flow

Take one task from a `dot-roadmap` roadmap through three steps: implementation, tests, and review. Each step runs in a fresh agent with one skill. You coordinate the steps, and you verify each reply with the commands that it names. The agents write the code, the tests, and the review. The user decides at a stop.

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
| 3. Review | `dotagents:dot-reviewer` | Task, Handoff: the replies of steps 1 and 2, Since and Earlier findings: only on a fix run |

Write the prompt as labeled fields, and leave out a field that the step does not take:

```markdown
**Task:** <path of the task file>
**Handoff:**
<the replies of the earlier steps, unchanged>
**Findings:**
<the findings to fix, unchanged>
**Since:** <old-tree> <new-tree>
**Earlier findings:**
<the findings that the round sent to fix and the light-fixed findings, unchanged>
```

Copy the replies and the findings unchanged, because the agents read their fields. Add no other fields or instructions, such as a list of files to review.

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

## 4. Decide after each review

When the first review reply of the task arrives, write the old tree, as the "Snapshots" section of [`references/fix-round.md`](references/fix-round.md#snapshots) gives it.

A **fix round** runs step 1 again in a new agent, with the findings to fix as a **Findings** field, then takes the light path or runs steps 2 and 3 again. Before the first fix round, read [`references/fix-round.md`](references/fix-round.md), for the snapshots, the light path, the review fields, and the findings to carry.

After each review, check the stop rules. When no stop rule is true, run an **automatic round**: a fix round of every `high` and `medium` finding, with no question to the user. Show one line, such as "Round 2: automatic fix of 1 `medium` finding". The task has a limit of 2 automatic rounds. Rounds that the user picks do not count, and do not reset the count. The automatic rounds also follow a review after a round that the user picked.

### Stop rules

Stop the loop and ask the user when any of these is true:

1. The highest severity is `low`, or no findings remain.
2. 2 automatic rounds have run.
3. A finding that the round sent to fix has the status `open` or `regressed`.
4. After a fix round, the count did not go down since the review before. The count is the `high` and `medium` findings that remain after the review, carried findings included.
5. A stop of step 3 fires.

At the stop, show the round history, with one row for each round:

```markdown
| Round | Kind | Review | Fixed | Open | Regressed | New | Highest |
| ----- | ---- | ------ | ----- | ---- | --------- | --- | ------- |
| 1     | first | full  | -     | -    | -         | 4   | medium  |
| 2     | auto | delta  | 2     | 0    | 0         | 0   | low     |
```

Kind is `first`, `auto`, `user`, or `light`. A `light` round has `none` in the Review column. Highest is the highest severity of the findings that remain after the round.

Then show the **Highest severity** line and one line for each finding: its severity, summary, and `file:line`, and its status when it has one. Show each `high` finding with its **Fix** line. The presumed blockers of the maintainability pass are `high`. Then wait for the user to pick one:

- **Fix**: the user names the findings to fix. Run a fix round with them.
- **Accept**: the user accepts the findings that remain.

Done when the user accepts.

## 5. Finish

List the files that the steps changed, from the **Files** lines of the replies. Suggest the `dot-commit` skill, and name the task file, so that `dot-commit` can tick its checkbox.

Do not commit, and do not tick the roadmap checkbox: `dot-commit` ticks it when the commits finish the task.
