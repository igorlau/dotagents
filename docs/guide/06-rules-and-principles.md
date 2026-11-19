# Rules and principles

The always-on rules load into every conversation, and apply to every task.
The principles live inside the skills, and apply only when their skill runs.

## Always-on rules

The CLI joins the files in `rules/` into one rules document for each
coding agent. The following table lists the rules:

| Rule | What it makes the agent do |
| ---- | -------------------------- |
| [`core.md`](../../rules/core.md) | Follow the conventions of the repository first, verify before it reports work as done, and confirm destructive actions. |
| [`ponytail.md`](../../rules/ponytail.md) | Make the smallest complete change, and reuse code before it writes new code. |
| [`comments.md`](../../rules/comments.md) | Delete code comments by default, and keep only the named exceptions. |
| [`code-style.md`](../../rules/code-style.md) | Use early returns, and sort keys in JSON files. |
| [`writing.md`](../../rules/writing.md) | Write short, plain sentences, based on ASD-STE100, in all text: chat, commits, pull requests, and docs. |

The rules cost tokens on every turn, so they have a character budget. The
conventions of the repository come first. Where a repository differs from a
rule, the agent follows the repository and tells you.

## Principles in the skills

The skills include principles from `pstack` in `cursor/plugins`. Each one
lives in the skill where it applies:

| Principle | Skill |
| --------- | ----- |
| Test the behavior, not the implementation | [`dot-testing`](../../skills/dot-testing/SKILL.md) |
| Validate data at the trust boundary | [`dot-implement` TypeScript reference](../../skills/dot-implement/references/typescript.md) |
| Let the types carry the rules | [`dot-implement` TypeScript reference](../../skills/dot-implement/references/typescript.md) |
| Fix the root cause, and test the premise after two failed fixes | [`dot-debug`](../../skills/dot-debug/SKILL.md) |
| Keep the reader load low | [`dot-code-review` maintainability pass](../../skills/dot-code-review/references/maintainability.md) |
| Model the domain | [`dot-plan` entity schemas](../../skills/dot-plan/references/entity-schemas.md) and the maintainability pass |
| Remove before you add | [`dot-plan`](../../skills/dot-plan/SKILL.md), [`dot-roadmap`](../../skills/dot-roadmap/SKILL.md), and the maintainability pass |
| Put a lesson into the structure | [`dot-correct`](../../skills/dot-correct/SKILL.md) |

Next: [Make it yours](07-make-it-yours.md).
