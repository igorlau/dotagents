---
name: dot-docs-writing
description: Write and edit developer documentation in the Google developer documentation style. Use when creating or revising a README, guide, tutorial, reference page, changelog, or code comments meant for readers.
---

# Docs writing

Write documentation that a developer in a hurry, reading in their second language, can follow on the first pass. The rules come from the Google developer documentation style guide.

## Repository conventions first

Before you start, read what the repository defines: agent instructions (`AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.github/instructions/`, `.cursor/rules/`), project skills, `CONTRIBUTING.md`, style guides, linter and formatter configuration, and the patterns in the surrounding code. They take precedence over this skill: where they differ, follow the repository, and point out the difference instead of changing the repository's standard. This includes the project's documentation style guide, prose linter configuration such as Vale, and the structure and terms of its existing docs.

## 1. Frame the document

Before drafting, answer these questions:

- **Reader**: who is "you" in this document (an app developer, an operator, a contributor), and what do they already know?
- **Goal**: what can the reader do after reading?
- **Type**: a task (how to do something), a concept (how something works), or reference (facts to look up). Use a task title with a bare verb, such as "Deploy the service", and a concept title with a noun phrase, such as "Deployment model".

## 2. Draft with the core rules

**Voice and tone**

- Write like a knowledgeable colleague: conversational and direct, without slang, jokes, or hype.
- Address the reader as "you". Use the imperative for instructions. Use "we" only for a named organization.
- Use active voice and name the actor: "The server sends a response", not "A response is sent".
- Use present tense. Use "will" only for events that happen later.
- Use common contractions, such as "don't" and "isn't".
- Write "click **Save**", not "please click" or "simply click". Words such as "simply", "easy", "just", and "quickly" judge difficulty for the reader, so leave them out.

**Sentences**

- Keep sentences under 26 words, with the subject and verb near the start.
- Put the condition before the instruction: "If the build fails, run `make clean`."
- Put the goal before the action: "To create a folder, click **New**."
- Use the same term for the same concept throughout. Spell out an abbreviation at its first use.
- Replace ambiguous pronouns ("it", "this") with the noun.
- Use "can" for ability, "might" for possibility, and "must" for requirements. Avoid "should" and "may".

**Structure**

- Use sentence case for titles and headings. Don't skip heading levels, and use one level-1 heading per page.
- Introduce every list, table, code sample, and procedure with a complete sentence that ends in a colon.
- Use numbered lists for sequences and bulleted lists for everything else. Keep list items parallel.
- Write each procedure step as one imperative action. State where the action happens before the action.
- Use serial commas: "Linux, macOS, and Windows".

**Formatting**

- Put code-related text in code font: commands, filenames, paths, variables, values, and field input.
- Put UI element names in bold, matching the label's capitalization: click **Create project**.
- Write placeholders in uppercase with underscores, such as `PROJECT_ID`, and explain each one after the sample.
- Use descriptive link text, such as the page title. Never use "click here" or a bare URL.
- Write dates as "January 19, 2026", or as ISO 8601 (`2026-01-19`) when space is tight.
- Give every image alt text, and never put information only in an image.

## 3. Revise

Read the draft once per checklist item, and fix every instance:

- [ ] Each heading matches its section type (task, concept, or reference).
- [ ] No passive voice hides who acts.
- [ ] No sentence exceeds 26 words.
- [ ] Every list, table, and code block has an introductory sentence.
- [ ] Every placeholder is explained.
- [ ] Every command and code sample runs as written, apart from its placeholders.
- [ ] No directional language ("above", "below", "on the right"). Use "preceding", "following", or the element's name.
- [ ] No words from the word list's "avoid" entries.

## References

Load the reference that matches what you're writing:

- [`references/formatting.md`](references/formatting.md): headings, lists, tables, procedures, code samples, commands, placeholders, notices, links, UI elements, and dates in detail.
- [`references/word-list.md`](references/word-list.md): words and phrases to avoid, with replacements. Read it during the revision pass.
- [`references/global-and-accessible.md`](references/global-and-accessible.md): writing for a global audience, accessibility, and inclusive language.

---

Adapted from the [Google developer documentation style guide](https://developers.google.com/style), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Condensed and reorganized for use by coding agents.
