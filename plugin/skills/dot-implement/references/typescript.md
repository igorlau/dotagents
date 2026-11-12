# TypeScript reference

TypeScript rules for the [`dot-implement`](../SKILL.md) skill, based on the Google TypeScript style guide and on pstack's `typescript-best-practices`. They cover correctness, type safety, and API shape; leave formatting to the repository's formatter.

The repository's conventions and its compiler and linter configuration come first, then the always-on rules, then this reference. In a file that already breaks a rule, match the file for small changes instead of rewriting it, and keep style fixes out of a behavior change.

## Types

- Use `unknown` for values of unknown type, and narrow it with `typeof`, `instanceof`, `in`, or a type guard before use. Reach for `any` only where no type can express the value, such as a test mock, and keep it inside a typed test factory so `any` stays out of the tests.
- Validate data that crosses a trust boundary at the boundary: `JSON.parse` output, request bodies, environment variables, and file contents. Parse it into a typed value once, and trust the type inside the system without a second check.
- Use the schema library of the repository for that parse, and infer the type from the schema, such as `z.infer`. When the repository has no schema library, write a parse function. Do not add a schema library.
- In production code, use a type assertion (`as`) only after a validation that proves the type. Prefer a runtime check to a non-null assertion (`!`). When an assertion is safe for a reason that the code does not show, move it into a type guard that checks the claim, or a helper whose name states that reason.
- Write assertions with `as`, never `<T>value`.
- Brand the primitives that mean different things, such as IDs and domain values: `type UserId = string & { readonly __brand: "UserId" }`. Create a branded value only in a parse function or a type guard that checks it.
- Model variants as a union with a `kind` field, not as one object with optional fields and booleans, so that the type cannot hold an illegal state.
- Type a list that must have an item as a non-empty tuple, `[T, ...T[]]`, when a plain `T[]` would force a `!` or a check at each use.
- Annotate object literals with their type (`const foo: Foo = {...}`) or check them with `satisfies`, instead of asserting them with `as Foo`. An annotation catches misspelled and stale fields where the literal is declared.
- Fix compiler errors at their cause. Leave out `@ts-ignore`, `@ts-expect-error`, and `@ts-nocheck`; in a test that must pass an unchecked value, cast it once inside a typed test factory whose name states the invalid value, such as `makeUserWithoutEmail`.
- Leave out annotations the compiler infers trivially, such as `const x = 5`. Annotate when inference would produce `unknown` or a wider type than intended, or when a complex return type is hard to read.
- Use interfaces for object types, and type aliases for unions, tuples, functions, and other non-object types.
- Sort the properties of interfaces and object types alphabetically.
- Declare a structural implementation's type where you create it (`const horse: Animal = {...}`), so a mismatch fails there instead of at a distant call site.
- Keep `| null` and `| undefined` out of type aliases. Add them where a value can actually be absent, and handle absence close to where it arises.
- Use optional fields and parameters (`name?: string`) instead of `name: string | undefined`.
- Use the lowercase primitive types: `string`, `number`, `boolean`, `object`. Use `unknown`, `object`, or `Record<string, T>` instead of `{}`.
- Write `T[]` and `readonly T[]` for simple element types, and `Array<T>` for complex ones.
- Use `Map` and `Set` for dictionaries with keys known only at runtime, and `Record<K, V>` for a fixed set of keys.
- Derive a type with `Pick`, `Omit`, or `ReturnType` when it mirrors a source of truth, such as a schema type or the return value of a function. Do not write custom mapped or conditional types.
- Avoid generics that appear only in the return type. When an existing API has one, specify the type argument explicitly.
- Treat an indexed read from an array or a record as possibly `undefined`, and check it before use, even when `noUncheckedIndexedAccess` is off.

## Modules

- Use ES module syntax: `import` and `export`. Leave out `namespace`, `/// <reference>`, and `import x = require(...)`; use separate files to group code.
- Use named exports. Use a default import only for external code that requires it.
- Export only what other modules use. Use plain module-level functions and constants instead of classes that hold only static members.
- Keep exports immutable: never `export let`. Expose a mutable value through a getter function.
- Use `import type` for symbols used only as types, and `export type` to re-export types.
- Import project files with relative paths.

## Variables and data

- Declare with `const` by default and `let` when you reassign. Never use `var`. Declare one variable per statement, before its first use.
- Create arrays and objects with literals, not the `Array` or `Object` constructors.
- Spread only matching values: iterables into arrays, plain objects into objects. Never spread `null`, `undefined`, or primitives.
- Iterate arrays with `for...of`. Iterate objects with `Object.keys`, `Object.values`, or `Object.entries`; a `for...in` loop also visits inherited properties.
- Keep parameter destructuring to one level of shorthand properties, with defaults on the left side.
- Pass one options object when a function has 3 or more parameters, or 2 parameters of the same type. Otherwise use positional parameters, in order of relevance.
- Sort the properties of an options object parameter alphabetically, in its type and its destructuring.
- Parse numbers with `Number()` and check the result for `NaN`. Use `parseInt` only for a radix other than 10, after checking the digits. Never coerce with unary `+`.
- Coerce with `String()`, `Boolean()`, or a template literal, never with the wrapper constructors (`new String()`).
- Compare enum values explicitly, never by truthiness: the first member is `0`, which is falsy.
- Use `===` and `!==`. The one exception is `== null`, which matches both `null` and `undefined`.

## Functions and classes

- Use function declarations for named functions, and arrow functions for callbacks and nested functions. Leave out function expressions.
- Pass an arrow function that forwards its arguments (`items.map((item) => parse(item))`) rather than a named function (`items.map(parse)`): the callee might pass extra arguments that the named function accepts with a different meaning.
- Give an arrow function a block body when its return value is unused.
- Use `this` only in constructors, methods, and arrow functions inside them. Never use it in a static context.
- Use rest parameters and spread instead of `arguments` and `Function.prototype.apply`.
- Keep default parameter values free of side effects.
- Mark properties that are never reassigned after the constructor `readonly`. Use parameter properties instead of copying constructor arguments by hand.
- Initialize every class property in its declaration or the constructor, including optional ones as `undefined`, so the object's shape never changes.
- Keep visibility as narrow as possible. Prefer a module-level function to a private method. Leave out the `public` modifier except on a mutable parameter property, and never use `obj['name']` to get around `private`.
- Keep getters free of side effects, and skip accessors that only pass a property through.
- Leave prototypes and built-in objects unmodified.

## Control flow and errors

- Wrap every `if`, `for`, and `while` body in braces; only an `if` that fits on one line may skip them. Keep assignments out of conditions.
- When early returns cover every member of a union or an enum, end the function with `const unhandled: never = value;` and `return unhandled;`, so a new member fails the type check.
- In a `switch` you keep, give it a final `default` group, and end every non-empty `case` with `break`, `return`, or `throw`.
- Throw only `Error` objects or subclasses, created with `new`, and reject promises only with `Error`s. Prefer throwing to returning error objects.
- Treat a caught value as an `Error`, and skip defensive handling of non-`Error` throws unless a dependency actually throws them.
- Handle a caught error, or ignore it through a helper whose name states the case, such as `ignoreMissingFile`; never leave a `catch` block empty and silent.
- Keep a `try` block to the statements that can throw.
- Await every promise, return it, or handle its rejection. A promise left floating loses its errors; when fire-and-forget is intended, mark it with `void` and attach a `.catch`.

## Language features to avoid

- `const enum` (use a plain `enum` or a union of literals), `with`, `eval`, the `Function(string)` constructor, and `debugger` in committed code.
- `console.log` for diagnostics in shipped code. Use the structured logger of the repository.
- Semicolon-free code that relies on automatic semicolon insertion.
- Non-standard and proposal-stage JavaScript features, unless the project targets a runtime that ships them.
- New decorators. Use the decorators a framework defines, placed directly before the symbol they decorate.

## Naming

- Use `UpperCamelCase` for classes, interfaces, types, enums, and type parameters; `lowerCamelCase` for variables, functions, methods, and properties; and `CONSTANT_CASE` for module-level constants and enum members.
- Write descriptive names without abbreviations a new reader wouldn't know. Leave type information out of names: no `I` prefix on interfaces, no Hungarian notation, and no `_` prefix or suffix for private members.
- Mark deprecated APIs with `@deprecated` and directions for migrating call sites.
