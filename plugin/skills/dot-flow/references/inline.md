# Inline mode

Inline steps for the [`dot-flow`](../SKILL.md) skill, for an agent that cannot start the dotagents agents, such as Codex or Copilot. The verification, the stops, and the decision after the review stay as `SKILL.md` gives them. You run each step yourself, in this conversation, instead of in an agent.

1. Implement: use the `dot-implement` skill for the task, and end the step with its handoff. Write no tests in this step.
2. Test: use the `dot-testing` skill with its `references/after-implement.md` and the handoff of step 1, and end the step with the reply that the reference gives.
3. Review: use the `dot-code-review` skill for the task. The target is `git diff HEAD`, plus the untracked files that `git status --short` lists. Start the report with the line `**Highest severity:** <high | medium | low | none>`. Report the findings, and keep the code as it is. Delete each test that you write to prove a finding.

Do only the work of the current step, even when the next step looks small. After steps 1 and 2, run the commands of the reply again before you start the next step: the verification of `SKILL.md` applies to your own replies too. The steps share one context, so read only what the current step needs.
