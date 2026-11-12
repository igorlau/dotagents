---
name: dot-handoff
description: Compact the current conversation into a handoff document for another agent to pick up.
argument-hint: "What will the next session be used for?"
disable-model-invocation: true
---

Write a handoff document that summarizes the current conversation, so a fresh agent can continue the work. Save it to the temporary directory of the user's OS (`$TMPDIR`, else `/tmp`, or `%TEMP%` on Windows), not to the current workspace.

Include a "Suggested skills" section in the document, with the skills that the next agent must call the Skill tool for.

Do not repeat content that other artifacts already hold, such as specs, plans, ADRs, issues, commits, and diffs. Name them by path or URL instead.

Redact all sensitive information, such as API keys, passwords, and personally identifiable information.

If the user passed arguments, they describe the focus of the next session. Write the document for that focus.

## Repository conventions first

Before you start, read what the repository defines: agent instructions (`AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.github/instructions/`, `.cursor/rules/`), project skills, `CONTRIBUTING.md`, style guides, linter and formatter configuration, and the patterns in the nearby code. They take precedence over this skill: where they differ, follow the repository, and point out the difference. Do not change the repository's standard. List the repository conventions that the next agent must follow, by path.
