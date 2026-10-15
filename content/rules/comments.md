# Code comments

Apply these rules when you write, refactor, or review code:

- Leave most code without comments. Comment the why the code can't show: a constraint, a workaround with its issue link, a non-obvious trade-off, an invariant, or the source of copied code. Keep it to one line when you can.
- Let names and types carry the what. When a comment would restate the code, improve a name or extract a function instead.
- Assume the reader knows the language, its libraries, and the platform. Comment only what is specific to this code.
- Write comments for future readers of the code as it is. Change history, notes such as "added" or "now uses", and messages to the reviewer belong in the commit message or pull request.
- Delete code instead of commenting it out. Git keeps the history.
- Write doc comments where the repository documents its APIs, or on an exported API whose name and types don't show its contract. Cover purpose, contract, errors, and side effects, not the implementation.
- Write comments above a function, class, property, or other declaration as doc comments in the language's convention, such as `/** */` JSDoc in TypeScript, so editors show them in hover tooltips, unless the surrounding code uses another style.
- Explain regular expressions and complex algorithms with what they match or compute.
- When you change code, update every comment that the change makes inaccurate, and delete comments that no longer apply.
- When you review code, flag comments that restate the code, contradict it, or narrate changes, and ask for a why comment where intentional code looks wrong.
- Match the comment density and style of the surrounding code. In a new file, match the repository's other files.
