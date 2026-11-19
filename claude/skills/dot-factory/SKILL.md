---
name: dot-factory
description: Take a problem from one description to a staged change, through intake, research, one spec approval, and a build in which the Gate script checks each task.
disable-model-invocation: true
argument-hint: "The problem to solve"
---

# Factory

A **run** takes a problem from one description to a staged change. The user stops the run twice: to approve the spec, and to read the final report. A run also stops for an **escalation**: a question that the rules of the run cannot answer.

**Single session:** do every step of the run yourself, in this session, with the skills that the step names. The one subagent of a run is `dotagents:dot-reviewer`, which the review step starts. Start no other subagent.

Start every reply with the **phase line**: `**Phase:** <phase> | **Track:** <track>`. The phases are `Start`, `Intake`, `Spike`, `Research`, `Grill`, `Spec`, `Build`, `Review`, `Report`, and `Done`. Before the intake picks a track, write `none` for the track.

## Run files

- `<skill dir>`: the base directory of this skill. Run its scripts from the repository root, as `node <skill dir>/scripts/<script>.mjs`.
- `<run dir>`: `.tmp/factory/<slug>/`. It holds `state.md`, `research.md` or `spike.md`, the Gate logs, the review files, and `report.md`. The `<slug>` is the problem in 2 to 5 lowercase words, joined by hyphens.
- `<spec dir>`: `.tmp/roadmaps/<slug>/`, the roadmap that `dot-roadmap` writes.

`state.md` holds the run between sessions. The checkboxes of `<spec dir>/README.md` hold the build progress. Keep `state.md` in this form, and update **Phase** when the phase changes:

```markdown
# <slug>: state

**Track:** <track>
**Phase:** <phase>
**Base tree:** <hash>
**Last review tree:** none
**Request:** <the description of the user>

## Intake

- **Problem:** <one line>
- **User need:** <one line>
- **Risk:** <one line>

## Requirements

<UN, FR, BR, and NN, each with an ID, after the grill>

## Decisions

<one line each, after the grill>

## Escalations

<each question, its reason, and the answer of the user>

## Build log

<one line for each Gate run and each review>
```

## 1. Start

1. Run `git check-ignore -q .tmp/`. When Git does not ignore `.tmp`, stop and tell the user. Do not edit `.gitignore`.
2. Look for a `.tmp/factory/*/state.md` with a **Phase** other than `Done`. When one exists, ask the user whether to resume it. To resume, read its `state.md`, and continue at its phase. In the `Build` phase, continue with the first unticked task. A resumed run skips the rest of this step.
3. For a new run, ask for the problem when the user gave no description.
4. Run `git status --porcelain`. When it prints anything, stop, and ask the user to commit or stash the changes first. A run starts from a clean tree.
5. Pick the `<slug>`, and record `git rev-parse HEAD^{tree}` as the **Base tree**.

Done when you have a description and a clean tree, or a run to resume.

## 2. Intake

State the problem, the user need, and the risk, in one line each. Pick the **track**:

- `spike`: the user asks a question, such as "can we do X", and wants an answer, not a change.
- `bug`: a behavior is wrong, and the user can describe the symptom.
- `small`: one change of about 300 changed lines or fewer.
- `feature`: any other change.

Show the intake and the track. The user can correct the track with one word. Then write `state.md`.

When the track is `spike`, read [`references/spike.md`](references/spike.md), and follow it in place of the steps that follow.

Done when `state.md` exists with the track that the user accepted.

## 3. Research

Write `<run dir>/research.md`, about 60 lines at most, with these sections:

- `## Facts`: what the code, the docs, and the configuration show. Give each fact a source, as `file:line` or a URL. Do not paste code.
- `## Constraints from the repository`: the agent instructions, `CONTRIBUTING.md`, the style guides, the linter and formatter configuration, and the check and test commands.
- `## Unknowns`: what you could not find, and each open decision.

Done when each fact has a source.

## 4. Grill

On the `feature` track, use the `dot-grilling` skill with `research.md`. On the `bug` and `small` tracks, use it only when `research.md` lists an open decision.

Then write the requirements (`UN`, `FR`, `BR`, and `NN`, each with an ID) and the decisions to `state.md`.

Done when `state.md` has the requirements and no decision is open.

## 5. Spec

Use the `dot-roadmap` skill with `state.md` as the plan, and write the roadmap to `<spec dir>`. On the `bug` and `small` tracks, the roadmap has one task, `1.1`. The review step of `dot-roadmap` is the **spec approval**: wait until the user approves the breakdown.

Done when `<spec dir>/README.md` exists and the user approved it.

## 6. Build

Build each unticked task of `<spec dir>/README.md`, one at a time, in roadmap order:

1. On the `bug` track, write the failing test first, with the feedback loop of the `dot-debug` skill. The test must go red on the bug.
2. Use the `dot-implement` skill with the task file, then the `dot-testing` skill with its handoff. Skip their suggestions of a review and a commit.
3. Run the **Gate**: `node <skill dir>/scripts/gate.mjs --task <id> --roadmap <spec dir> --log <run dir>/gate-<id>-<n>.log`, where `<n>` is the attempt number, from 1. It prints one line:
   - Exit 0, `gate pass`: the Gate ticked the task. Add `<id>: gate pass, tree <hash>` to the build log.
   - Exit 1, `gate fail`: read the log, fix the cause, and run the Gate again. After the third failure of one task, escalate.
   - Exit 2: the command is wrong. Fix the command. This exit is not a failure of the task.

When the user asks for a review, run the review step after the current task, then continue the build.

Done when every task is ticked.

## 7. Review

After the last task, or when the user asks for a review, read [`references/review.md`](references/review.md) and follow it.

Done when the review is closed.

## 8. Report

1. Write `<run dir>/report.md` with the template in [`references/report.md`](references/report.md).
2. Run `git add -A`.
3. Show the **Tasks** table, the open findings, and the path of `report.md`. This is the final report.
4. Suggest the `dot-commit` skill, and set **Phase** to `Done`. Never commit.

## Escalation

Show the user these 3 lines, and wait for the answer:

- **Question:** <what the user must decide>
- **Reason:** <the Gate line, or the `reason` of the review script>
- **Intended action:** <what you do with no other instruction>

Record the escalation and the answer in `state.md`. For a Gate escalation, the answer is the instruction for one more fix attempt. For a review escalation, follow the review step. The answer `stop` ends the run: set **Phase** to `Done`, and leave the changes in the tree.
