---
name: dot-writing-for-agents
description: Write documents for agents. Use when you create or edit skills, or change AGENTS.md or CLAUDE.md.
---

Use this reference for any document that an agent reads: a skill, an `AGENTS.md` or `CLAUDE.md` file, or a doc that a pointer names. The package differs, but the method is the same. The same levers make each document predictable: the agent takes the same _process_ on every run, even when the output differs.

Read each reference that applies:

- [`references/pointers.md`](references/pointers.md): read when you write a skill description, an `AGENTS.md` line that names a doc, or another pointer, or when you decide whether to split a document.
- [`references/steps.md`](references/steps.md): read when the document has steps, for the completion criterion of each step.
- [`references/skill-mechanics.md`](references/skill-mechanics.md): read when the document is a skill, for the frontmatter, the invocation choice, and router skills.

## Repository conventions first

Before you start, read what the repository defines: agent instructions (`AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.github/instructions/`, `.cursor/rules/`), project skills, `CONTRIBUTING.md`, style guides, linter and formatter configuration, and the patterns in the nearby code. They take precedence over this skill: where they differ, follow the repository, and point out the difference. Do not change the repository's standard. When you edit the `AGENTS.md`, `CLAUDE.md`, or skills of a repository, keep their structure, format, and conventions.

## Information hierarchy

A document has two types of content. **Steps** are the actions that the agent does, in order. **Reference** is the definitions, rules, and facts that the agent reads when it needs them. A document can have only steps (a recipe), only reference (the rules of a review, or this skill), or both. The main decision is where each part goes on the **information hierarchy**, a ladder ranked by how soon the agent needs the material:

1. **In-file step**: the first tier. What the agent does, in order.
2. **In-file reference**: material that the agent reads when it needs it. A flat set of peers, such as every rule of a review on one rung, is a correct arrangement.
3. **Disclosed reference**: material in a separate file that a pointer names. The agent loads it only when the pointer fires. It can be a file next to the document, or an external file that any document can point to.

If you push too little down, the top gets too large. If you push too much down, you hide material that the agent needs. That trade-off is the whole decision.

**Progressive disclosure** moves material down the ladder, out of the main file and behind a pointer, so the top stays easy to read. It protects the hierarchy more than it saves tokens. Use branches to decide: put inline what every branch needs, and put behind a pointer what only some branches need. A **branch** is a distinct case that the document handles, so different runs take different paths through it. In a document with steps, reference that you should disclose buries the steps, and the agent attends to them only by chance.

**Co-location** decides what goes next to a part on the same rung. Keep the definition, rules, and caveats of a concept under one heading, so the agent reads them together. The document must read like documentation written for the agent. Scatter differs from duplication: duplication repeats one meaning in two places, and scatter splits one meaning across many places.

**Sprawl** is a document that is too long, even when every line is current and unique. Attention gets thin across the extra lines, and each line is one more to keep current. To fix sprawl, use the ladder: disclose reference behind pointers, and split by branch or by sequence so each path carries only what it needs.

## Leading words

A **leading word** is a compact concept from the model's pretraining that the agent thinks with while it runs the document, such as _lesson_, _fog of war_, or _tracer bullets_. Repeat it as a token, never as a sentence. Each use adds to its definition, and it anchors a whole region of behavior in few tokens, because the model already holds its meaning. You can coin a word if you define it clearly, but a new word brings no prior meaning. You pay in definition tokens for what a known word gives for free, so try a known word first.

A leading word anchors in two places. In the body, it anchors _execution_: the agent does the same thing each time the word appears, and in flat reference it focuses attention on one class of thing to look for. In a pointer, it anchors _invocation_: when the same word is in your prompts, your docs, and your code, the agent links the shared word to the material and reaches it more reliably.

Look for text that a leading word can replace: a set of three adjectives at three sites, or a pointer that spends a sentence on one idea. Examples:

- "fast, deterministic, low-overhead" becomes _tight_, as in a _tight_ loop.
- "a loop you believe in" becomes _red_. The vague gate becomes a binary state: the loop goes _red_ on the bug, or it does not.

You get fewer tokens and a sharper hook for the agent. Assume that every document repeats ideas that a leading word can replace, and find them.

**Negation** is the failure mode next to this lever. A prohibition puts the forbidden behavior in context and makes it _more_ available. The negation is a weak modifier, and the strong concept overrides it, so the ban half reads as an instruction to do the thing. State the **positive** target instead, such as "write one-line comments", so the context never names the banned behavior. Use a prohibition only as a hard guardrail that you cannot state as a positive. Even then, pair it with the positive target.

## Prune

- Keep each meaning in a **single source of truth**: one place, so a change to the behavior is a change in one place. **Duplication**, the same meaning in more than one place, costs maintenance and tokens. It also makes the meaning look more important than its real rung. A leading word repeats a token on purpose, never the meaning.
- The **environment** is also a source of truth: `package.json` scripts, configuration files, the directory layout, and `--help` output. A document that restates it is a **cache**: a copy of a lookup. A cache earns its load only when the lookup is expensive. Cache what the agent cannot find with a lookup: the unwritten convention, the reason for a choice, the gotcha that no configuration shows. Leave lookups of one file or one command to the environment, where they cannot go stale.
- Check every line for **relevance**: does it still apply to what the document does? A line loses relevance when it never applies to the task, such as an explanation or a branch that you should disclose. It also loses relevance when the behavior it describes changes. Short documents are easier to keep relevant. If you never prune, **sediment** collects: stale layers stay, because an addition feels safe and a removal feels risky.
- Find **no-ops**, one sentence at a time: an instruction that the model already obeys by default costs load and changes nothing. The test is "does it change the behavior from the default?", and it depends on the model, not the reader. When two people disagree about a no-op, they disagree about the default, so run the document to decide. When a sentence fails the test, delete the whole sentence. Do not trim words from it. The test also grades leading words: a word too weak to change the default, such as _be thorough_ when the agent is already thorough, is a no-op. The fix is a stronger word, such as _relentless_, not a different technique.
