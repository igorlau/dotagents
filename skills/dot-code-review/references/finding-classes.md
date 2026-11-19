# Finding classes

Give each finding exactly one class from this list, and one severity. Pick the class of the root cause, not of the symptom.

| Class | Meaning |
| ----- | ------- |
| `requirement-gap` | A requirement or an acceptance criterion of the spec has no code or no test that meets it. |
| `nn-breach` | The change breaks a non-negotiable (`NN`) of the spec. |
| `logic` | Wrong condition, operator, variable, or order, so the result is wrong. |
| `edge-case` | Empty, null, zero, very large, duplicate, or Unicode input gives a wrong result. |
| `error-handling` | An error is swallowed, a cleanup is missing, or a write can stop part of the way through. |
| `concurrency` | A race, a deadlock, or an assumption about the order of events. |
| `type-safety` | A cast, `any`, or a loose type hides the real contract. |
| `api-contract` | A changed signature, return shape, default, or response breaks a caller. |
| `performance` | Needless work, sequential work that can run in parallel, or a cost that grows with the input. |
| `security` | A vulnerability: injection, a missing authorization check, a secret in code or logs, or path traversal. |
| `test-gap` | Changed behavior has no test that fails when the change is wrong. |
| `duplication` | Copied logic, or a new helper next to an existing one that does the same job. |
| `naming` | A name that does not say what the code does. |
| `complexity` | Extra branches, layers, wrappers, or state that a simpler structure removes. |
| `dead-code` | Code that nothing calls, or code that is commented out. |
| `comment` | A comment that the `dot-comments` skill flags. |
| `docs-accuracy` | Docs that state a wrong fact, a wrong command, or a broken example. |
| `docs-style` | Docs with correct facts that break the writing rules or the style guide. |
| `accessibility` | UI that a keyboard, a screen reader, or a user with low vision cannot use. |
| `ux` | UI behavior that breaks a UX rule, such as a missing loading or error state. |
| `visual` | A visual defect in the rendered UI: layout, spacing, overflow, or contrast. |

## Severity

- `high`: a wrong result, a crash, data loss, or a vulnerability in production. Also every `requirement-gap`, every `nn-breach`, and every presumed blocker of the maintainability pass.
- `medium`: a defect with a narrow scenario, or a smell of the maintainability pass.
- `low`: a cost for the reader only, such as `naming`, `comment`, and `docs-style`.
