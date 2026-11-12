# Inline mode

Inline steps for the [`dot-flow`](../SKILL.md) skill, for an agent that cannot start the dotagents agents, such as Codex or Copilot. The steps, the approvals, and the stop cases of `SKILL.md` stay the same. You run each step yourself, in this conversation, instead of in an agent.

## Steps

1. Stub: use the `dot-testing` skill in stub mode for the task.
2. Implement: use the `dot-implement` skill for the task, with the reply of step 1.
3. Fill: use the `dot-testing` skill in fill mode for the task, with the reply of step 2.
4. Review: use the `dot-code-review` skill for the task. The target is `git diff HEAD`, plus the untracked files that `git status --short` lists. Report the findings, and keep the code as it is. Delete each test that you write to prove a finding.

Do only the work of the current step, even when the next step looks small. The steps share one context, so read only what the current step needs.

## Replies

End each step with its reply, then show the summary of `SKILL.md` step 4. Keep each summary to 3 sentences or fewer.

Steps 1 and 3:

```markdown
**Summary:** <what you did>
**Tests:** <the test command and its result line>
**Files:** <the test files that you changed>
**Blockers:** <what stops the next step, or "none">
```

Step 2, with the handoff fields from step 5 of `dot-implement`:

```markdown
**Summary:** <what you did>
**Checks:** <the type checker, linter, and test commands, with their result lines>
**Files:** <the production files that you changed>
**Blockers:** <what stops the next step, or "none">

**Expected failures:**
- `<test file>`: <test name>: <the new behavior that the test must assert>

**Behaviors that need tests:**
- `<module>`: <a behavior that the change adds or changes, and that no test case covers>
```

Step 4: start with the line `**Highest severity:** <high | medium | low | none>`, then give the report of `dot-code-review`.
