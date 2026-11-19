# Code comments

Apply these rules when you write, refactor, or review code:

- Delete comments by default. Keep only these kinds:
  - Legal and license headers.
  - A gotcha forced by an external dependency, platform, or protocol that you cannot change.
  - Formatter-ignore markers, such as `// prettier-ignore`.
  - Doc comments on a public API, in the language's convention, such as `/** */` in TypeScript.
  - An issue or RFC link for a constraint that the code cannot express.
  - The ponytail `shortcut:` comment.
- When your own code would surprise a reader, rename, extract, or retype it until it needs no comment.
- Turn a constraint into a type, a runtime check, a test, or a lint rule where that is cheap, then delete its comment.
- If you are not sure that an exception applies, delete the comment.
- Delete code instead of commenting it out. Git keeps the history.
- When you change code, update or delete every comment that the change makes wrong.
- To review the comments in a diff, use the `dot-comments` skill.
