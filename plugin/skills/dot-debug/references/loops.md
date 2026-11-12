# Feedback loops

## Ways to build a loop

Try these in about this order:

1. A test that fails at the seam that reaches the bug: unit, integration, or end-to-end.
2. A curl or HTTP script against a dev server that runs locally.
3. A CLI call with a fixture input, with a diff of stdout against a known good snapshot.
4. A headless browser script (Playwright or Puppeteer) that drives the UI and asserts on the DOM, the console, or the network.
5. A replay of a captured trace. Save a real network request, payload, or event log to disk, and replay it through the code path alone.
6. A throwaway harness. Start a minimal subset of the system, such as one service with stubbed dependencies, that runs the bug code path with one function call.
7. A property or fuzz loop. If the bug is "sometimes wrong output", run 1,000 random inputs and look for the failure.
8. A bisection harness. If the bug appeared between two known states (a commit, a dataset, a version), automate "start at state X, check, repeat", so you can use `git bisect run`.
9. A differential loop. Run the same input through the old and the new version, or through two configurations, and diff the outputs.
10. A human-in-the-loop bash script, as the last resort. If a person must click, drive the person with [`scripts/hitl-loop.template.sh`](../scripts/hitl-loop.template.sh), so the loop keeps its structure. The captured output comes back to you.

With the right feedback loop, the bug is 90% fixed.

## Bugs that are not deterministic

The goal is not a clean repro. The goal is a **higher reproduction rate**. Run the trigger 100 times, run copies in parallel, add stress, narrow the time windows, and add sleeps. A bug that fails 50% of the time is easy to debug, and a bug that fails 1% of the time is not. Raise the rate until you can debug the bug.

## When you cannot build a loop

Stop and say so. List what you tried. Ask the user for one of these:

- Access to the environment that reproduces the bug.
- A redacted captured artifact: a HAR file, a log dump, a core dump, or a video of the screen with timestamps.
- Permission to add temporary instrumentation in production.

Do **not** start to form hypotheses without a loop.
