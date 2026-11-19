# Tests after dot-implement

Details for the [`dot-testing`](../SKILL.md) skill when it runs after `dot-implement`, with or without a roadmap task. `dot-implement` writes no tests. Use red-green TDD, where a test fails before the code exists, only when the user asks for it.

Read the handoff of `dot-implement`, with its "Expected failures" and "Behaviors that need tests" fields, and the diff of the change. When the change is a roadmap task, read its "Test cases" section.

1. Write each test case of the task that is not a test yet, in the test file that the case names. Use the order and the names that the cases give.
2. Change each test in "Expected failures" so that it asserts the new behavior.
3. Add a test for each item in "Behaviors that need tests", in the test file of its module.
4. Take each assertion from the task or the request, not from the code. When a test fails because the production code is wrong, stop and report the failure. Keep the production code as it is.

Done when each test case of the task is a test, and the test command of the repository passes, with its output shown.

## Reply

End with this reply:

```markdown
**Summary:** <what you did, in 3 sentences or fewer>
**Tests:** <the test command and its result line>
**Files:** <the test files that you changed>
**Blockers:** <what stops the review, or "none">
```
