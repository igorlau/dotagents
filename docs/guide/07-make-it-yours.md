# Make it yours

Change the workflow when it fails you. Put each lesson where the agent
cannot skip it: in the code, the types, the checks, or a skill.

## Stop a repeated mistake with dot-correct

When an agent makes the same mistake again, start
[`dot-correct`](../../plugin/skills/dot-correct/SKILL.md) with the mistake:

```text
/dotagents:dot-correct The agents add `as` casts to API responses again and again.
```

The agent names the class of mistake, then picks the highest level that can
prevent it, in this order: architecture, a type, a lint rule, a test, then
docs. It makes the change and shows that the check catches the mistake.

## Run your checks at the end of each turn

The `check` hook makes the agent fix type and lint errors before it stops.
To use the hook in a repository, do these steps:

1. Add a `check` script that runs the type checker and the linter, but not
   the tests. For example, in `package.json`:

    ```json
    {
      "scripts": {
        "check": "tsc --noEmit && eslint ."
      }
    }
    ```

1. In the repository, run `npx --yes @igorlau/dotagents check enable`.

The hook runs the script only after a turn that changed files. It makes the
agent continue one time at most, so it cannot loop. `dotagents scaffold`
writes an `AGENTS.md` that tells the agent about the script.

## Write your own skills

Put the skills for one repository in the repository, such as in
`.claude/skills/` or `.agents/skills/`. The conventions of the repository
come first in every dotagents skill, so your skills and your `AGENTS.md`
change how the dotagents skills work there.

To write a skill or an `AGENTS.md`, start
[`dot-writing-for-agents`](../../plugin/skills/dot-writing-for-agents/SKILL.md).
To add a skill to dotagents itself, see
[Add a skill](../../CONTRIBUTING.md#add-a-skill).

## Vendor a skill from another repository

dotagents copies third-party skills into the catalog, and records the source
commit in `UPSTREAM.json`. An upstream rename or rewrite cannot break an
install. `npm run check-upstream` shows the upstream changes after the
recorded commit. To vendor a skill, see
[Vendor content from another repository](../../CONTRIBUTING.md#vendor-content-from-another-repository).

Back to the [guide index](README.md).
