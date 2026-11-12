---
name: dot-flow
description: Take one roadmap task through test stubs, implementation, test fill, and review, with your approval after each step.
disable-model-invocation: true
---

# Flow

Take one task from a `dot-roadmap` roadmap through four steps: test stubs, implementation, test fill, and review. Each step runs in a fresh agent with one skill, and the user approves its result before the next step starts. You coordinate the steps. The agents write the tests, the code, and the review.

## Repository conventions first

Before you start, read what the repository defines: agent instructions (`AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.github/instructions/`, `.cursor/rules/`), project skills, `CONTRIBUTING.md`, style guides, linter and formatter configuration, and the patterns in the nearby code. They take precedence over this skill: where they differ, follow the repository, and point out the difference. Do not change the repository's standard.

## 1. Pin the task

The input is a roadmap task file or a roadmap directory. With a directory, pick the lowest-id unticked task whose blockers are all ticked in its `README.md`. If the task has an unticked blocker, stop and name it.

Run `git status --short`. The review step reads every uncommitted change, so when the working tree has other changes, ask the user to commit them first or to include them in the review.

Done when you can name the task file and its goal.

## 2. Pick the runner

Use the agents of the dotagents plugin when the `Agent` tool can start them: `dotagents:dot-tester`, `dotagents:dot-implementer`, and `dotagents:dot-reviewer`. Otherwise, such as in Codex or Copilot, read [`references/inline.md`](references/inline.md), and run each step inline with the same approvals.

## 3. Run the steps

Run the steps in this order. For each step, start a new agent of the named type, not a fork, so that each step starts with a fresh context:

| Step | Agent | Prompt fields |
| ---- | ----- | ------------- |
| 1. Stub | `dotagents:dot-tester` | Task, Mode `stub` |
| 2. Implement | `dotagents:dot-implementer` | Task, Handoff: the reply of step 1 |
| 3. Fill | `dotagents:dot-tester` | Task, Mode `fill`, Handoff: the reply of step 2 |
| 4. Review | `dotagents:dot-reviewer` | Task, Handoff: the replies of steps 1 to 3 |

Write the prompt as labeled fields, and leave out a field that the step does not take:

```markdown
**Task:** <path of the task file>
**Mode:** <stub | fill>
**Handoff:**
<the replies of the earlier steps, unchanged>
```

Copy the replies unchanged, because the agents read their fields. Keep the main context small: do not read the changed files or the full test output yourself. The replies carry what the user needs.

## 4. Approve each step

After each step, show the user this summary, then wait:

```markdown
**Step <n> of 4: <step name>**
<the Summary line of the reply>
<the Checks or Tests line of the reply>
**Blockers:** <the Blockers line of the reply>
```

For the review step, show the **Highest severity** line and one line for each finding: its severity, summary, and `file:line`.

Start the next step only when the user says "go" or approves in other words. When the user asks for a change, run the same step again in a new agent, and add the request to the prompt.

Stop the flow, and keep the files as they are, in these cases:

- A reply has blockers. Show them, and ask the user how to continue.
- The review reports a `high` finding. The presumed blockers of the maintainability pass are `high`. Show each `high` finding with its **Fix** line. When the user fixes the findings and asks for a new review, run step 4 again.

Done when the user approved the review step, or the flow stopped.

## 5. Finish

List the files that the steps changed, from the **Files** lines of the replies. The user decides about the `medium` and `low` findings. Suggest the `dot-commit` skill.

Do not commit, and do not tick the roadmap checkbox: `dot-commit` ticks it when the commits finish the task.
