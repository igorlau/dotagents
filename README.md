# dotagents

dotagents installs a curated set of agent skills and rules into Claude Code,
OpenAI Codex, and GitHub Copilot, so every project gets the same AI workflow.

For the design and the reasons behind it, see [`SPEC.md`](SPEC.md).

## Install

dotagents runs with `npx` straight from this private repository, so your Git
credentials must have access to it.

To install the skills and rules for all your projects, run the following
command:

```bash
npx --yes github:igorlau/dotagents install
```

The command writes to user-level agent directories in your home directory,
such as `~/.claude/skills/` and `~/.agents/skills/`. It doesn't change any
repository.

On a machine that only has a company GitHub account, use a deploy key. For
more information, see [Install dotagents with a deploy key](docs/deploy-key.md).

## Use dotagents in a repository

Choose the mode by who owns the repository:

- **Your own repository:** run `npx --yes github:igorlau/dotagents init`, and
  commit the new files. Collaborators get the same skills and rules.
- **A team repository:** run
  `npx --yes github:igorlau/dotagents init --local-only`. dotagents lists its
  files in `.git/info/exclude`, so `git status` stays clean, and it never
  writes to a tracked file.

## Commands

The following table lists the commands:

| Command | Description |
|---------|-------------|
| `install` | Install globally. |
| `init [--local-only]` | Install into the current repository. |
| `update [--global \| --project]` | Apply the current catalog to existing installs. |
| `uninstall [--global \| --project]` | Remove everything that dotagents installed. |
| `doctor` | Check installs for missing or modified files and Git visibility. |
| `list` | List the skills in the catalog. |
| `self-update` | Run `update` with the latest release. |

`install` and `init` accept `--agents claude,codex,copilot` to limit the
agents. Commands that write files accept `--dry-run` and `--force`. Run
`dotagents --help` for details.

dotagents never overwrites a file that you changed or that it didn't write.
It reports the file instead. Pass `--force` to overwrite it.

## Catalog

The following table lists the skills:

| Skill | Purpose |
|-------|---------|
| `plan` | Plan a change as small, verifiable steps. |
| `code-review` | Review a diff for correctness bugs. |
| `commit` | Commit changes as small, logical commits. |
| `docs-writing` | Write docs in the Google developer documentation style. |
| `debug` | Diagnose hard bugs with a feedback loop. |
| `grill-me` | Start an interview that sharpens a plan. |
| `grilling` | The interview method behind `grill-me`. |
| `handoff` | Summarize a conversation for another agent. |
| `writing-for-agents` | Write skills, `AGENTS.md`, and `CLAUDE.md` files. |

The always-on rules are in [`content/rules/core.md`](content/rules/core.md).

## Develop

You need Node.js 22.18 or later, which runs the TypeScript sources directly.

```bash
npm install
npm test               # CLI tests against temporary homes and repositories
npm run lint:content   # Frontmatter, links, rules budget, UPSTREAM.json
npm run typecheck
node src/cli.ts list   # Run the CLI from source
```

To add a skill, create `content/skills/SKILL_NAME/SKILL.md`. The `name` in the
frontmatter must match the directory name. Before you write one, read the
`writing-for-agents` skill.

To vendor a skill from another repository, copy its directory and add an
`UPSTREAM.json` file. To see upstream changes since the recorded commit, run
`npm run check-upstream -- --diff`.

## Release

Every push to `main` runs the checks. If they pass, the release workflow tags
the commit as `vMAJOR.MINOR.RUN_NUMBER` and publishes a GitHub release with
an `npm pack` tarball. To start a new minor or major series, change the
version in `package.json`.

## Licenses

This repository is private and unlicensed. It includes third-party content
under the MIT and CC BY 4.0 licenses. For details, see
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
