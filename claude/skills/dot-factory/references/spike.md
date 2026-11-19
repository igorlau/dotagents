# Spike

This is the `spike` track of [`dot-factory`](../SKILL.md). A spike answers a question with a prototype, and leaves a clean tree. It has no research, grill, spec, Gate, or review.

## 1. Set the time box

Add these lines under **Request** in `state.md`, and set **Phase** to `Spike`:

```markdown
**Question:** <the question, in one sentence>
**Time box:** <minutes> minutes, from <the output of `date`>
```

Propose 30 minutes when the user gave no time box. The user can correct it with the track.

Done when `state.md` has the question and the time box.

## 2. Prototype

Build the smallest prototype that answers the question, in the working tree. Run it, and keep each command and its output as evidence. When the time box ends, stop and answer with the evidence that you have.

Done when you can answer the question, or the time box ended.

## 3. Write the answer

Write `<run dir>/spike.md`:

```markdown
# <slug>: spike

**Question:** <the question>
**Answer:** <yes, no, or partly, and one sentence>
**Stash:** spike: <slug>

## Evidence

- <a command and its output, or a `file:line` of the prototype>

## Recommendation

<the next step: promote the spike to a feature run, drop the idea, or ask a new question>
```

Then run `git stash push -u -m "spike: <slug>"`. Git ignores `.tmp/`, so `spike.md` stays in place. Run `git status --porcelain`, and check that it prints nothing. When the prototype changed no file, Git saves no stash: write `none` for **Stash**.

Done when `spike.md` exists and the tree is clean.

## 4. Offer the promotion

Show `spike.md`, and ask the user whether to promote the spike to a `feature` run.

- On yes, copy `spike.md` to `<run dir>/research.md`. Set **Track** to `feature` and **Phase** to `Grill`, and continue with the grill step. The run keeps its slug.
- On no, set **Phase** to `Done`.
