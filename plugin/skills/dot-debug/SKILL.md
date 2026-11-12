---
name: dot-debug
description: Diagnosis loop for hard bugs and performance regressions. Use when the user says "diagnose" or "debug this", or reports that something is broken, throws, fails, or is slow.
---

# Diagnose bugs

Use this method for hard bugs. Skip a phase only when you can state the reason.

To learn the modules in the area, read `GLOSSARY.md` if it exists, and read the ADRs for the area that you change.

## Repository conventions first

Before you start, read what the repository defines: agent instructions (`AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.github/instructions/`, `.cursor/rules/`), project skills, `CONTRIBUTING.md`, style guides, linter and formatter configuration, and the patterns in the nearby code. They take precedence over this skill: where they differ, follow the repository, and point out the difference. Do not change the repository's standard. Build the feedback loop with the test framework, scripts, and tools of the repository.

## Redact

This skill shows commands, outputs, and captured artifacts. Redact every secret first: write `<REDACTED>` in its place. Build loops against environment variables, so the credential stays in the environment and out of what you show. Captured artifacts carry auth headers: quote only the lines that carry the signal.

If the redacted output is not enough to diagnose the bug, say so and ask the user.

## Phase 1: Build a feedback loop

This phase is the skill. The other phases are mechanical. With a **tight** pass or fail signal for the bug, one that goes **red** on _this_ bug, you will find the cause. Bisection, hypothesis tests, and instrumentation all use that signal. Without one, the code alone will not show you the bug.

Spend most of your effort here. Be aggressive and creative, and do not give up.

Start with a test that fails at the seam that reaches the bug. When no test can reach the bug, when the bug is not deterministic, or when you cannot build a loop, read [`references/loops.md`](references/loops.md).

### Tighten the loop

Treat the loop as a product. When you have _a_ loop, make it **tight**:

- Make it faster: cache the setup, skip unrelated startup work, and narrow the test scope.
- Make the signal sharper: assert on the specific symptom, not on "did not crash".
- Make it more deterministic: pin the time, seed the random number generator, isolate the filesystem, and freeze the network.

A flaky loop of 30 seconds is little better than no loop. A deterministic loop of 2 seconds is tight, and it makes the bug easy to find.

### Completion criterion: a tight loop that goes red

Phase 1 is done when the loop is **tight** and can go **red**. Name **one command**, such as a script path, a test command, or a curl call. You must have run it at least one time: show the command and its redacted output. The command must be:

- [ ] Red-capable: it drives the real bug code path and asserts the user's exact symptom, so it goes red on this bug and green after the fix. A command that only runs without an error is not enough: it must catch this specific bug.
- [ ] Deterministic: it gives the same verdict on every run. For a flaky bug, it has a pinned, high reproduction rate.
- [ ] Fast: it takes seconds, not minutes.
- [ ] Agent-runnable: you can run it without a person. A person can take part only through `scripts/hitl-loop.template.sh`.

Do not read code to build a theory before this command exists. A jump to a hypothesis is the exact failure that this skill prevents. Without a red-capable command, do not start Phase 2.

## Phase 2: Reproduce and minimize

Run the loop. Watch it go red when the bug appears.

Confirm:

- [ ] The loop produces the failure that the user described, not a different failure nearby. The wrong bug leads to the wrong fix.
- [ ] The failure occurs on every run, or for a flaky bug, at a rate high enough to debug against.
- [ ] You captured the exact symptom (the error message, the wrong output, the slow time), so later phases can verify that the fix addresses it.

### Minimize

When the loop is red, shrink the repro to the **smallest scenario that still goes red**. Cut inputs, callers, configuration, data, and steps **one at a time**, and run the loop again after each cut. Keep only what the failure needs.

A minimal repro shrinks the set of hypotheses in Phase 3, because fewer parts remain to suspect. It also becomes the clean regression test in Phase 5.

Done when **every element that remains is necessary**: when you remove any one of them, the loop goes green.

Do not continue until you have reproduced **and** minimized the bug.

## Phase 3: Hypothesize

Write **3 to 5 ranked hypotheses** before you test any of them. A single hypothesis anchors on the first plausible idea.

Each hypothesis must be **falsifiable**: state the prediction that it makes.

> Format: "If <X> is the cause, then a change to <Y> makes the bug disappear, and a change to <Z> makes it worse."

If you cannot state the prediction, the hypothesis is a guess: drop it or make it sharper.

**Show the ranked list to the user before you test it.** The user often has domain knowledge that changes the rank ("we deployed a change to #3"), or knows hypotheses that are already ruled out. If the user does not answer, continue with your rank.

## Phase 4: Instrument

Map each probe to a specific prediction from Phase 3. **Change one variable at a time.**

Use these tools, in this order of preference:

1. A debugger or REPL, if the environment supports it. One breakpoint is better than ten logs.
2. Targeted logs at the boundaries that tell the hypotheses apart.
3. Never log everything and grep the output.

**Tag every debug log** with a unique prefix, such as `[DEBUG-a4f2]`. At the end, one grep finds them all for cleanup.

For a performance regression, logs are usually the wrong tool. First, measure a baseline with a harness that measures time, `performance.now()`, a profiler, or a query plan. Then bisect. Measure first, and fix second.

## Phase 5: Fix and regression test

Fix the root cause, not the symptom. Ask "why" until the answer is the first wrong decision in the code, not a result of an earlier one. Fix every place that has the same pattern. Add a guard only for a state that is legitimate: a guard for a state that must never exist hides the bug.

When two fixes fail the same check, write down the premise that both fixes assumed. Test the premise before you write a third fix.

Write the regression test **before the fix**, but only if a **correct seam** exists for it.

A correct seam is one where the test runs the **real bug pattern** as it occurs at the call site. Sometimes the only seam is too shallow: a test with one caller when the bug needs several callers, or a unit test that cannot repeat the chain that triggered the bug. A regression test there gives false confidence.

**If no correct seam exists, that is the finding.** Note it. The architecture of the codebase prevents a test that locks the bug down. Flag it for the next phase.

If a correct seam exists:

1. Turn the minimized repro into a test that fails at that seam.
2. Watch it fail. If you forced the red with a change to code or a fixture, `diff` against a clean copy to prove that the change landed before you trust it.
3. Apply the fix.
4. Watch the test pass.
5. Run the Phase 1 feedback loop again against the original scenario, before minimization.

## Phase 6: Clean up

Do these before you declare the work done:

- [ ] The original repro no longer reproduces: run the Phase 1 loop again.
- [ ] The regression test passes, or you documented that no correct seam exists.
- [ ] All `[DEBUG-...]` instrumentation is removed: grep the prefix.
- [ ] Throwaway prototypes are deleted, or moved to a clearly marked debug location.
- [ ] The commit or pull request message states the hypothesis that was correct, so the next person who debugs the code learns from it.
