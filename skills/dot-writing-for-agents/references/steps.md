# Steps and completion criteria

End every step on a **completion criterion**, the condition that tells the agent the step is done. Two properties make it a lever:

- **Clarity**: the agent must tell done from not done. A vague bound, such as "understanding reached", causes **premature completion**: the agent ends the step before it is done, because its attention moves to the end. The steps still ahead, the **post-completion steps**, pull the agent forward, and a clear criterion holds it back. First, make the bound sharper, because that is local and cheap. Only if the bound stays vague _and_ you see the rush, hide the later steps: split the sequence. Hiding works only across a real context boundary, such as a handoff or a subagent. An inline call keeps the later steps in context.
- **Demand**: how much the criterion requires. "Every changed model accounted for" forces thorough work, and "produce a change list" does not. Demand drives **legwork**, the extra work that the wording implies but that no step states. Demand also binds reference: "every rule applied" binds a flat set of rules as "every step done" binds a sequence. So a document with only reference can still require full coverage.

The strongest criteria are checkable and exhaustive.
