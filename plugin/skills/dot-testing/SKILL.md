---
name: dot-testing
description: Write and change tests with a makeSut factory per suite. Use when adding, fixing, or restructuring tests, unit or integration.
---

# Testing

Write tests that build the **system under test** (`sut`) in one factory, share it across the suite, and stay isolated by resetting the test doubles between tests.

## Repository conventions first

Before you start, read what the repository defines: agent instructions (`AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.github/instructions/`, `.cursor/rules/`), project skills, `CONTRIBUTING.md`, style guides, linter and formatter configuration, and the patterns in the surrounding code. They take precedence over this skill: where they differ, follow the repository, and point out the difference instead of changing the repository's standard. When the repository already sets up tests another way, such as pytest fixtures or its own setup helper, use that and leave out `makeSut`.

## The makeSut factory

Use `makeSut` when the subject needs setup: construction, configuration, dependencies, or a resource such as a database or a server. Call a subject without setup directly in its own `describe`: pure functions, utilities, and constants. The test is "does it need setup?", not "is it a utility?"; a utility that takes an injected clock gets a `makeSut`.

- Name it in the language's casing (`makeSut`, `make_sut`), and always call the tested object `sut`.
- Give it no parameters. It returns an object with `sut`, every test double by name, and `cleanup` when a resource needs releasing: `{ sut, repositoryStub, cleanup }`. When setup fails partway, it releases what it already opened before rethrowing.
- Build each test double in its own factory (`makeRepositoryStub()`) whose methods return the happy path, so a test spells out only what differs.
- Place `makeSut` and the double factories in the test file, after the imports. Move them to a shared helper once a second test file needs them.

## Suite lifecycle

1. Call `makeSut` once per top-level `describe`, in the hook that runs before all tests, and call `cleanup` in the hook that runs after all of them.
2. In a test, change a dependency's behavior by spying on or stubbing the double that `makeSut` returned, for that test only.
3. Restore every spy and stub in the hook that runs after each test, so the next test sees the happy-path doubles again.

When the `sut` itself keeps mutable state between calls (an in-memory cache, a counter, a queue), resetting the doubles leaves that state behind. Give that `describe` its own `makeSut` call before each test and `cleanup` after each test, and name that `describe` after the state, such as `describe("with a warm cache")`. Tests that run concurrently share the doubles the same way, so in a concurrent suite each test calls `makeSut` itself, calls `cleanup` when it ends, and drops the shared restore hook: a global restore undoes the spies of tests still running, and each test's doubles die with it.

## Test principles

- Arrange, act, assert: one block each, in that order.
- Test one behavior per test, and name the test after that behavior ("returns null when the user is missing").
- Assert on outputs and on calls that cross the `sut`'s boundary, so the test fails when the behavior breaks and passes when only the internals change.
- Put a test in the test file of the module whose behavior it asserts: the tests for `concepts.ts` go in `concepts.test.ts`. Create that file if it does not exist. Do not add the test to another module's test file because that file already runs the code.
- In a unit test, stub the collaborators from other units through the doubles that `makeSut` returns. Do not spy on the `sut`, and assert only the behavior of the `sut`. Test a helper method of the same class through the outputs of the public method that calls it, and do not repeat the cases of the helper there.
- Prefer stubs and fakes that return data to mocks that assert the call sequence.

## References

Read each reference that applies to the tests:

- [`references/typescript.md`](references/typescript.md): read when the tests use TypeScript with Vitest, Jest, or `node:test`.
- [`references/http.md`](references/http.md): read when you write controller, integration, or end-to-end tests.
- [`references/modes.md`](references/modes.md): read when you work a roadmap task, before `dot-implement` (stub mode) or after it (fill mode).

Done when every test you wrote or changed passes with the repository's test command, and you've shown the output.
