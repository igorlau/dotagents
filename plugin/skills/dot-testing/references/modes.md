# Modes

Mode details for the [`dot-testing`](../SKILL.md) skill. A roadmap task runs `dot-testing` twice: in stub mode before `dot-implement`, and in fill mode after it. Use red-green TDD, where a test fails before the code exists, only when the user asks for it.

## Stub mode

Run stub mode before the code exists.

1. Read the "Test cases" section of the roadmap task.
2. Write each case as a pending test (`it.todo`, `test.todo`, or the equivalent of the runner) in the test file of the module that the case covers. Use the order and the names that the cases give.
3. Write no other test code: no `makeSut`, no doubles, and no assertions.

Done when each case is a pending test, and the test command reports them as pending.

## Fill mode

Run fill mode after `dot-implement`. Read the "Test cases" section of the roadmap task, the diff of the task, and the handoff of `dot-implement`. The handoff has these fields:

```markdown
**Expected failures:**
- `<test file>`: <test name>: <the new behavior that the test must assert>

**Behaviors that need tests:**
- `<module>`: <a behavior that the change adds or changes, and that no test case covers>
```

1. Turn each pending test of the task into a real test, by the rules in `SKILL.md`.
2. Change each test in "Expected failures" so that it asserts the new behavior.
3. Add a test for each item in "Behaviors that need tests", in the test file of its module.
4. When a test fails because the production code is wrong, stop and report the failure. Do not change the production code.

Done when no pending test of the task remains, and the test command of the repository passes, with its output shown.
