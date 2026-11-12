# Maintainability pass

Judge the structure of the change, not only its behavior. Do not approve code because it works. Code that works and makes the codebase messier is a finding.

Be direct and strict. Do not soften a structural problem into a mild suggestion. If the change makes the code messier, say so. If it missed a much simpler design, say that too. Give a few findings that you are sure of, not a long list of cosmetic notes.

## Code judo

First, look for a restructure that keeps the behavior and deletes whole branches, modes, helpers, or layers. Assume that one often exists: a new arrangement that uses the current architecture better and makes the change much smaller. A refactor that moves complexity around and deletes none of it is not enough. When you see a path to delete complexity, push for it.

## Presumed blockers

Report each of these as `high`, unless the author gives a clear reason:

- The diff keeps a lot of incidental complexity, and a code judo move would delete it.
- The diff pushes a file from under 1,000 lines to over 1,000 lines. Ask to split the file first.
- The diff adds ad hoc branches to a flow, or scatters feature checks across shared code.
- The diff adds an abstraction, a wrapper, or a cast that makes the design more indirect.
- The diff duplicates a helper that the codebase already has, or puts logic in the wrong layer.

## Smells

Report each of these as `medium`:

- Spaghetti growth: new conditionals, special cases, or one-off branches in unrelated flows. One-off booleans, nullable modes, and "temporary" branches that will stay.
- Thin wrappers and pass-through helpers: a wrapper with one caller, an adapter with no second implementation, a layer that repeats the methods and arguments of the layer below it. Inline them.
- Casts, `any`, `unknown`, and extra optional parameters that hide the real contract. Ask for an explicit type at the boundary.
- Silent fallbacks that hide an unclear invariant. Make the boundary explicit, so the invalid state fails.
- Layer leaks: feature logic in a shared module, or implementation details that leak through an API. Move the logic to the module that owns the concept.
- Duplicated helpers: copied logic, or a new helper next to a canonical one that does the same job.
- Needless sequential work: independent steps that run one after the other for no reason.
- Half-applied state: related updates that can stop part of the way through. Ask for an atomic structure.

## Reader load

Count two costs for the reader: the layers to trace from the question to the answer, and the state to hold in mind. A new reader must answer "where does X come from?" and "what can change X?" in 30 seconds. If not, cut layers or cut state.

- A layer must hide a real decision. Collapse a layer that costs more than it saves.
- Shrink the scope of state: return values over mutation, locals over fields, fields over module state, module state over globals. Derive a value instead of two copies that you keep in sync.
- State an invariant once, at the boundary, not in each consumer.

## Domain model

Flag these signs that the change skipped the domain model: an if/else chain that grows by one branch, a second boolean that must stay in sync with the first, a shape assumption repeated across files, or modules named after steps (load, validate, save) that repeat the same domain rules. Propose the structure that fits: a state machine, a typed model, a lookup table, a discriminated union, or a reducer. Do not force an abstraction when the current shape is clear, local, and unlikely to grow.

## Scope

Check the diff against the request or the task. The smallest complete change wins:

- Flag features, options, configuration, and "for later" code that nobody asked for.
- Flag guards, validators, and parsers that the spec does not require. Validation at a trust boundary is required.
- Flag code that the codebase, the standard library, or an installed dependency already provides.
- Flag a new dependency that replaces a few lines of code.
- Flag a part of the task that the diff left out, such as a caller, a test, or a fixture that the change breaks.

## Comments

Run step 1 of the `dot-comments` skill on the diff. Report each Delete, Reshape, and Encode flag as a `low` finding, with the change that the flag proposes. Do not apply the flags.

## Example phrases

- "This pushes the file past 1,000 lines. Split it first."
- "This adds one more special case to a busy flow. Move it behind its own abstraction."
- "This works, but it tangles the code around it. Keep the behavior and restructure the code."
- "This wrapper adds a layer and hides nothing. Call the function directly."
- "Why does this need a cast? Make the boundary explicit."
- "This refactor moves the complexity and deletes none of it. A code judo move removes these branches."
