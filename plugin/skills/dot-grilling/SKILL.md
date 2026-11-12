---
name: dot-grilling
description: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their ideas, or uses any 'grill' trigger phrases.
---

Interview the user relentlessly until you reach a shared understanding. Map the interview as a **design tree**: every decision branches into the decisions that depend on it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are settled: the questions that you can ask _now_, without a guess at answers that you have not heard yet. Ask the whole frontier in one round: number each question, and give your recommended answer. Then wait for the user's answers before the next round.

Use this format for a round:

```
**Q1: <question title>**: <question body, one or more paragraphs, with choices if there are any>

Recommended: <your recommended answer>

---

**Q2: <question title>**: <question body, one or more paragraphs, with choices if there are any>

Recommended: <your recommended answer>
```

Word each question so that "yes" accepts your recommended answer.

Each round of answers changes the tree: settled decisions move the frontier out and unblock the questions that depend on them. Compute the frontier again and ask the next round. A question whose answer depends on another open question in this round belongs to a _later_ round.

Facts are your job, never the user's. When a frontier question needs a fact from the environment (the filesystem, tools, and so on), send a subagent to find it. Do not ask the user for anything that you can look up. Do not block on the search: a search that still runs is an unsettled prerequisite, so only the questions that depend on it wait for the subagent. Ask the rest of the frontier now. The _decisions_ belong to the user: ask the user each one, and wait.

The session is done when the frontier is empty: you visited every branch of the design tree, and you assumed nothing in silence. Do not act on the result until the user confirms that you reached a shared understanding.

## Repository conventions first

Before you start, read what the repository defines: agent instructions (`AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.github/instructions/`, `.cursor/rules/`), project skills, `CONTRIBUTING.md`, style guides, linter and formatter configuration, and the patterns in the nearby code. They take precedence over this skill: where they differ, follow the repository, and point out the difference. Do not change the repository's standard. Base your recommended answers on those conventions.
