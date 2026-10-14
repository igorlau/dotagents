# Formatting reference

Detailed formatting rules for the [`docs-writing`](../SKILL.md) skill.

## Headings and titles

- Use sentence case: "Transfer data sets", not "Transfer Data Sets".
- Start task headings with a bare verb: "Create an instance", not "Creating an instance".
- Write concept headings as noun phrases that don't start with an -ing verb: "Migration to the cloud".
- Gerunds are acceptable only when no better option exists, such as "Billing".
- Prefix optional sections with "Optional:", as in "Optional: Customize your alias".
- Use exactly one level-1 heading per page, and make it unique in the doc set. Don't repeat the page title as a section heading.
- Don't skip levels: a level-3 heading belongs under a level-2 heading.
- Follow every heading with content.
- Don't number headings to show sequence, and don't put links in headings.
- Avoid code in headings. If you must, add a descriptive noun, such as "The `init` command".
- Keep heading punctuation minimal. Heavy punctuation means the heading needs rewriting.
- Introduce a group of subsections with "the following sections", not "this section" or "these sections".

## Lists

- Use a numbered list when order matters, a bulleted list when it doesn't, and a description list for term-definition pairs.
- Don't make a list of one item.
- Introduce a list with a complete sentence. End the sentence with a colon if the list follows immediately, or with a period if other material comes between them.
  - Recommended: "Use the **Submit** button for any of the following purposes:"
  - Not recommended: "Use the **Submit** button to:"
- Make items parallel in syntax and structure.
- Start each item with a capital letter.
- End items with a period unless the item is a single word, has no verb, is entirely code, or is entirely link text. When items are mixed, make them parallel or punctuate all of them.
- In run-in lists, separate the bold term from its description with a colon or a period, and use the same punctuation for every item.
- In prose lists, don't end with "etc." or "and so on". Introduce the list so that it's clearly not exhaustive, for example with "including".
- Nest sequential sub-items with lowercase letters, and their sub-items with lowercase Roman numerals.

## Tables

- Use a table when each item has three or more related pieces of data. A one-column table should be a list.
- Introduce each table with a complete sentence that states its purpose.
- Use sentence case for column headings, without ending punctuation.
- Don't merge cells, and don't put a table in the middle of a numbered procedure.
- Sort rows logically, or alphabetically when no logical order exists.
- Refer to a table by its position, such as "the following table", not "the table below".

## Procedures

- Use a numbered list for two or more steps. Write a one-step procedure as a single bulleted sentence.
- Introduce the procedure with a complete sentence: "To rename the folder, follow these steps:". Skip the introduction only if the heading says everything.
- Start each step with an imperative verb, and use one action per step. Combine sequential menu selections with `>`: "Click **File > Save as**".
- State the location before the action: "In the admin console, go to **Users**."
- State the goal before the action: "To create a folder, click **New**." If the goal makes the step look optional, put the action first: "Sort the data by date: click **Sort**."
- Begin optional steps with "Optional:".
- Give the result after the action, in the same step: "Click **Submit**. A confirmation message appears."
- State the action, then its reason: "Store the token safely. You need it to sign in later."
- Order a complex step as follows: action, command, placeholder explanations, further explanation, output, result.
- List prerequisites (hardware, software, permissions, information) before the first step.
- When two procedures share steps, link to the earlier one instead of repeating it.
- Document one method, the shortest one that works for every reader. Separate alternatives with headings or tabs only when necessary.

## Code in text

Use code font for the following items:

- Commands, utilities, flags, and options: `kubectl`, `--force`.
- Filenames, paths, directories, and extensions.
- Class, method, function, variable, enum, and constant names.
- Data types, keywords, attribute names and values, and environment variables.
- HTTP verbs and status codes, such as `POST` and `404 Not Found`, and content types.
- Port numbers, query parameters, and package names.
- Text that the reader types and command output.
- Placeholders.

Don't use code font for product names, domain names in prose, or URLs that the reader visits in a browser.

Use code names grammatically as proper nouns. Don't pluralize them, make them possessive, or turn them into verbs. Add a plain noun instead:

- Recommended: "The `ADDRESS` constant's value", "send a `POST` request".
- Not recommended: "`ADDRESS`'s value", "`POST` the data".

Don't wrap code in quotation marks unless the quotation marks are part of the code.

## Code samples

- Introduce each sample with a sentence that ends in a colon.
- Use fenced code blocks with a language tag.
- Wrap lines at 80 characters.
- Mark omitted code with a comment in the sample's language. Don't use an ellipsis.
- Follow the language's own style guide, or the project's.

## Commands

- Make copyable commands runnable as written, apart from placeholders.
- Link each command to its reference documentation where it's introduced.
- Show as few optional flags as possible. Point to the reference for the rest.
- Break long commands before a flag, end each continued line with ` \` (or ` ^` on Windows), and indent continuation lines four spaces.
- In multi-line examples, start each input line with `$`. If a document mixes one-line and multi-line commands, use the prompt for all of them. Don't show the current directory.
- Put input and output in separate code blocks.
- Show output only when the reader needs to verify or copy a value. Introduce it with "The output is similar to the following:". Mark omitted lines with `...` on a line of its own.
- In syntax descriptions, wrap optional arguments in `[]`, mutually exclusive choices in `{a|b}`, and mark repeatable arguments with `...`. Keep these symbols out of copyable commands.

## Placeholders

- Use descriptive uppercase names with underscores: `PROJECT_ID`, not `x`, `my-project`, or `YOUR_PROJECT`.
- In Markdown prose, write placeholders as code.
- Explain every placeholder after its first appearance, even if it seems obvious:
  - For one placeholder: "Replace `PROJECT_ID` with the ID of your project."
  - For several placeholders: "Replace the following:", then a list in the order they appear, each item as "`NAME`: description that starts with a lowercase letter".
- Explain placeholders in output with "This output includes the following values:".

## Notices

- Use notices sparingly, and never place two in a row.
- **Note:** relevant but optional information that the reader can skip.
- **Caution:** proceed carefully.
- **Warning:** an action might cause irreversible harm, such as data loss, cost, or a security exposure.
- Don't use a notice for prerequisites, required steps, results, or cross-references. Put that information in the main text.
- Start each notice with its bold label and a colon: "**Note:**".

## Links

- Use the destination's page title, or a short descriptive phrase with the key words first, as link text.
- Never use "click here", "this page", "this document", or a bare URL as link text.
- Introduce cross-references with "For more information, see LINK." or "For more information about TOPIC, see LINK."
- Link only what's relevant, and don't repeat a link to the same destination on one page.
- Say when a link downloads a file or leaves the doc set. Don't force new tabs.
- Keep punctuation outside the link text, and don't put link text in quotation marks.

## UI elements

- Put UI element names in bold, matching their capitalization on screen. Use sentence case if the label is all caps.
- Name the element and its type: "the **Name** field", "the **File** menu", "the **Advanced** tab".
- Use "click" for buttons and links, "select" and "clear" for checkboxes and options, "enter" for text, and "press" for keys. Don't write "click on", "hit", "check", or "uncheck".
- Use "in" with dialogs, fields, lists, menus, panes, and windows, and "on" with pages, tabs, and toolbars.
- Don't use a UI label as a verb: "To save the file, click **Save**", not "**Save** the file".
- Write key combinations with spelled-out modifier names: Control+S. For several operating systems, give Windows and Linux first and macOS in parentheses.

## Dates and times

- Write dates with the full month and a four-digit year: "January 19, 2026". Abbreviate only in tables or headings: "Jan 19, 2026".
- When a numeric date is unavoidable, use ISO 8601: `2026-01-19`.
- Use the 12-hour clock with AM or PM: "3:45 PM", "3 PM". Use 24-hour time only when the product uses it.
- Avoid time zones unless they're necessary. Spell out the region and add the UTC offset: "Pacific Standard Time (UTC-8)".
- Avoid seasons, because they differ between hemispheres. Use months or quarters.

## Numbers

- Use numerals for numbers that are followed by a unit, and in technical contexts.
- Write "10 times", not "10x".

---

Adapted from the [Google developer documentation style guide](https://developers.google.com/style), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
