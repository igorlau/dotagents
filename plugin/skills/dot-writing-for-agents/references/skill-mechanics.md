# Skill mechanics

This is the branch of [`dot-writing-for-agents`](../SKILL.md) for skills: the frontmatter, the invocation choice, and router skills. Everything else about how to write a skill is in `SKILL.md` and [`pointers.md`](pointers.md).

## Invocation

There are two choices, and each one trades one load for the other:

- A **model-invoked** skill keeps a `description`, so the agent can fire it on its own, and other skills can reach it. You can still type its name: model invocation always _includes_ the user's reach. A description only adds discovery by the agent, and never removes the person's reach. The description is the skill's top-level context pointer, and it stays loaded at all times: permanent context load in exchange for discovery. A model-invoked skill with only reference content is also one home for shared reference: another skill can invoke it, so several skills can use one copy of the reference. To set it up, omit `disable-model-invocation`, and write a description for the model that carries the trigger branches. The pointer rules in `pointers.md` apply in full.
- A **user-invoked** skill takes the description out of the agent's reach: only the person who types its name can invoke it, and no other skill can. It costs no context load, but it costs cognitive load: the person is the index that must remember that it exists. To set it up, set `disable-model-invocation: true`. The `description` is then for people: a one-line summary without trigger lists.

Pick model invocation only when the agent must reach the skill on its own, or another skill must reach it. If a person always fires it by hand, make it user-invoked and pay no context load.

Shared reference that two user-invoked skills both need cannot live in either one: with no descriptions, neither skill can fire the other. Put it in a plain file outside the skill system, as external reference that any skill can point to.

## Split by invocation

This is the invocation cut of a split. The sequence cut is in `pointers.md`. Split off a model-invoked skill when it has a distinct leading word that must trigger it on its own, a word that you use in your prompts, or when another skill must reach it. The new description is always loaded and adds context load, so the separate reach must be worth that cost.

## Router skills

When you have more user-invoked skills than you can remember, a **router skill** fixes that cognitive load. It is one user-invoked skill that names the others and when to use each one, so the person remembers one skill instead of many. It can only suggest the other skills and cannot fire them: user-invoked skills have no description, so only the person can reach them.
