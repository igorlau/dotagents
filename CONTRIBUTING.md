# Contributing to dotagents

This guide explains how to change the catalog and the CLI. For the design and
the reasons behind it, see the [design specification](SPEC.md).

## Set up

You need Node.js 22.18 or later, which runs the TypeScript sources directly.

To install the dependencies and run the checks, run the following commands:

```bash
npm install
npm run typecheck
npm run lint:content
npm test
```

To run the CLI from source, run `node src/cli.ts COMMAND`. The tests use
temporary home directories, but the CLI writes to your real home directory.
To preview the changes first, add `--dry-run`.

## Add a skill

To add a skill, follow these steps:

1. Read the `writing-for-agents` skill.
1. Create `content/skills/SKILL_NAME/SKILL.md`. Replace `SKILL_NAME` with a
   lowercase name that uses hyphens between words. The `name` field in the
   frontmatter must match it.
1. Run `npm run lint:content`.

## Change the rules

Rules load into every conversation, so every word costs tokens on every turn.
Each file in `content/rules/` covers one topic, and each piece of guidance
lives in one file. `npm run lint:content` fails when the rules exceed the
character budget.

## Vendor content from another repository

To copy a skill or a rule from another repository, follow these steps:

1. Copy the skill directory to `content/skills/`, or the rules file to
   `content/rules/`.
1. Record the origin. For a skill, create `UPSTREAM.json` in the skill
   directory. For a rule, create `NAME.upstream.json` next to the rules file.
   Include the following fields:

    - `repository`: the Git URL.
    - `path`: the path in the source repository.
    - `commit`: the full commit SHA that you copied.
    - `license`: the license identifier, such as `MIT`.
    - `modified`: `true` if you changed the content.
    - `notes`: what you changed. Required when `modified` is `true`.

1. Add the license text to `THIRD_PARTY_NOTICES.md`.

To see what changed upstream since the recorded commits, run
`npm run check-upstream -- --diff`.

## Update agent paths

Agents sometimes change where they read skills and instructions. The paths
are in `src/targets.ts`. When you change them, update the agent targets
table in [the design specification](SPEC.md), and add a test in `test/`.

## Commit and release

Write commit messages in the Conventional Commits format. Every push to
`main` that passes the checks becomes a release with the tag
`vMAJOR.MINOR.RUN_NUMBER`. To start a new minor or major series, change the
version in `package.json`.
