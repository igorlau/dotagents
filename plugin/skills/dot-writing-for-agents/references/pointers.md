# Pointers and splits

## Context pointers

A **context pointer** is a reference in the agent's context that names material outside the context and states the condition to reach it. A skill's description is a pointer. A line in `AGENTS.md` that names a doc is the same object. The _wording_ of the pointer decides when the agent reaches the material, and how reliably. The target does not. A weak pointer to material that the agent must have is a variance bug. First make the wording sharper. Put the material inline only if that fails.

A pointer has two jobs: state what the material is, and list the **branches** that must trigger it. A branch is a distinct case that the material handles. Every word of an always-loaded pointer costs on every turn, so prune a pointer harder than the body:

- Put the **leading word** first. The pointer is where the word triggers the material.
- Write one trigger for each branch. Synonyms that name one branch are one branch written two times. Collapse them, and keep only the distinct branches.
- Cut identity that the body already carries.

## The two loads

Every document and pointer that you add spends one of two budgets:

- **Context load** is the cost of always-loaded material on the agent's window: an `AGENTS.md` line, a skill description, anything that is in context on every turn. It costs tokens and attention, whether or not it fires.
- **Cognitive load** is the cost on the person, who must know which documents exist and when to use each one. The person is the index. Do not minimize this cost: it is the price of human control. Spend it where human judgment matters, and remove it where it does not.

Material that only a pointer reaches costs no context load, except the line of the pointer. Material with no pointer costs only cognitive load.

## When to split

A split of one document into two spends one of the two loads. Split only when the cut earns that cost:

- **By sequence**: split a run of steps when the steps after the end of the work tempt the agent to rush the current step. When the agent cannot see them, it does more legwork on the current task. The reverse also applies: a merge of two sequences shows each step the steps that follow it, and that causes premature completion.
- **By invocation**, for skills only: see [`skill-mechanics.md`](skill-mechanics.md).
