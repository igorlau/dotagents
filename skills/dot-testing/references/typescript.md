# TypeScript reference

TypeScript details for the [`dot-testing`](../SKILL.md) skill. Use the runner the repository already has.

## Hooks by runner

| Step | Vitest and Jest | `node:test` |
| ---- | --------------- | ----------- |
| Build the suite | `beforeAll` | `before` |
| Release it | `afterAll` | `after` |
| Restore the doubles | `afterEach(() => vi.restoreAllMocks())` or `jest.restoreAllMocks()` | `afterEach(() => mock.restoreAll())` |

Write the doubles as plain objects with happy-path methods, not `jest.fn(impl)` or `vi.fn(impl)`: in Jest 29 and earlier, a restore or a reset of the mocks erases `impl`, which the next tests still need. Override a method per test with `vi.spyOn`, `jest.spyOn`, or `mock.method`, and a restore puts back the happy path.

## Example

```ts
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { type UserRepository, UserService } from "../src/user-service.ts";

function makeRepositoryStub(): UserRepository {
  return {
    async findById(id) {
      return { id, name: "Ada" };
    },
  };
}

function makeSut() {
  const repositoryStub = makeRepositoryStub();
  const sut = new UserService(repositoryStub);
  return { sut, repositoryStub };
}

describe("UserService", () => {
  let suite: ReturnType<typeof makeSut>;

  beforeAll(() => {
    suite = makeSut();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the user's display name", async () => {
    const { sut } = suite;

    const name = await sut.displayName("1");

    expect(name).toBe("Ada");
  });

  it("returns null when the user does not exist", async () => {
    const { sut, repositoryStub } = suite;
    vi.spyOn(repositoryStub, "findById").mockResolvedValueOnce(null);

    const name = await sut.displayName("1");

    expect(name).toBeNull();
  });
});
```

For a resource, return `cleanup` from `makeSut` and call it in `afterAll(() => suite?.cleanup())`: `suite` is unset when `makeSut` throws.
