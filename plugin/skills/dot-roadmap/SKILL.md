---
name: dot-roadmap
description: Turn a grilled plan into a roadmap of phases, each split into self-contained tasks.
argument-hint: "Path to the plan, if it is not in this conversation"
disable-model-invocation: true
---

# Roadmap

A roadmap splits a plan into **phases**, and each phase into **tasks**. A phase ends on a **milestone**: an observable state where the system works and could ship. A task is **self-contained**: a fresh agent session can build it from its file alone, and a reviewer can judge its diff in one session.

## 1. Load the plan

Work from the plan in this conversation, usually the shared understanding a `dot-grilling` session reached. If the user passed a path or URL, read it in full.

Synthesize the plan. Do not interview the user. If the plan still has unsettled decisions, list them and suggest `dot-grilling` before you go on. Done when you can state the **destination** (what is true when the whole roadmap is done) and every decision the plan made.

## 2. Gather facts

Read the code, tests, and configuration the plan touches. Note the modules each part of the plan reaches, the tests that already cover them, and any **prefactor**: a refactor that makes the later work easy. Done when you can name the files or modules each part of the plan changes.

## 3. Cut phases

Group the work into phases, ordered so that:

- The first phase is a **tracer bullet**: the thinnest path through the whole system that proves the approach, so the riskiest unknown fails first.
- Removals (dead code, redundant checks, stubs) come before the work that builds on them.
- Prefactors come before the behavior that needs them.
- Each later phase builds on a milestone that already works.

Done when every phase has a milestone you can observe (a command's output, a test that passes, a behavior in the UI), and the last milestone matches the destination.

## 4. Split phases into tasks

Split each phase into tasks. Each task:

- Is a **vertical slice**: a narrow but complete path through every layer it needs, verifiable on its own.
- Keeps a refactor separate from a behavior change.
- Fits one fresh agent session and one reviewable diff, roughly a few hundred changed lines.
- Lists its **test cases**: the test names, each with the test file where it belongs, in the order and with the names that the `dot-testing` skill gives. For controller, integration, and end-to-end tests, use `references/http.md` of `dot-testing`. `dot-testing` writes them after `dot-implement`. Write "none" when the task changes no tested behavior.
- Declares its **blockers**: the tasks that must be done first, by id (`2.3` is phase 2, task 3). A task without blockers can start now.

When one mechanical change breaks many call sites at once, read [`references/wide-refactor.md`](references/wide-refactor.md).

Done when every requirement and decision from the plan belongs to exactly one task or to the roadmap's out-of-scope list, and every task has acceptance criteria that can fail.

## 5. Review with the user

Show the breakdown compactly: each phase with its milestone, then its tasks as `id: title (blocked by: …): goal`. Ask:

- Is the granularity right, or should some tasks merge or split?
- Does each blocker genuinely gate its task?
- Does the roadmap leave out a part of the plan, or put a part in the wrong phase?

Iterate until the user approves. Write no files before approval.

## 6. Write the roadmap

Write to `.tmp/roadmaps/<roadmap-slug>/` at the repository root. First run `git check-ignore -q .tmp`: if Git does not ignore `.tmp`, stop and tell the user. Do not edit `.gitignore`.

```
.tmp/roadmaps/<roadmap-slug>/
├── README.md
├── 01-<phase-slug>/
│   ├── 01-<task-slug>.md
│   └── 02-<task-slug>.md
└── 02-<phase-slug>/
    └── 01-<task-slug>.md
```

`README.md` is the index and the single source of truth for decisions; task files link to it and do not restate them. Put the entity schemas that the user approved in `dot-plan` in the decisions:

```markdown
# <Roadmap title>

**Destination:** <what is true when the roadmap is done>

## Decisions

- <decision from the plan, one line each, with the reason when it is not obvious>
- <approved entity schema, as a code block, when the plan has one>

## Out of scope

- <work the plan ruled out>

## Phases

### 1. <Phase title>

**Milestone:** <observable state>

- [ ] [1.1 <Task title>](01-<phase-slug>/01-<task-slug>.md) (blocked by: none)
- [ ] [1.2 <Task title>](01-<phase-slug>/02-<task-slug>.md) (blocked by: 1.1)
```

Each task file:

```markdown
# <id>: <Task title>

**Roadmap:** [<Roadmap title>](../README.md)
**Goal:** <one sentence: the behavior this task makes work>
**Blocked by:** <ids, or "none">

## Requirements

- <what the change must do, specific enough to build without the conversation>
- <files or modules it touches, when known>

## Out of scope

- <nearby work that belongs to another task, with its id>

## Acceptance criteria

- [ ] <checkable condition>

## Test cases

- `<test file>`: <test name>, or none

## Verify

<the command or observation that proves the acceptance criteria>
```

Done when every task file exists, `README.md` links each one, and each task reads complete without this conversation. At the end, tell the user the roadmap's path and the tasks they can start now.
