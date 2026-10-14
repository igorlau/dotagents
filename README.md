# dotagents

dotagents installs a curated set of skills and rules into Claude Code,
OpenAI Codex, and GitHub Copilot, so every project you work on gets the same
AI workflow.

## Install

To install the skills and rules for all your projects, run the following
command:

```bash
npx --yes @igorlau/dotagents install
```

`npx` runs dotagents without installing it. To run `dotagents` as a command
in any terminal, install it globally:

```bash
npm install --global @igorlau/dotagents
```

To upgrade a global install, run
`npm install --global @igorlau/dotagents@latest`.

## Use dotagents in a repository

The global install covers every project, including team repositories, and
writes nothing to them.

To share the skills and rules with collaborators in a repository that you
own, run the following command in the repository, and commit the new files:

```bash
npx --yes @igorlau/dotagents init
```

## Commands

The following table summarizes the commands. For options, run
`dotagents --help`.

| Command | Description |
| ------- | ----------- |
| `install` | Install globally. |
| `init` | Install into the current repository for collaborators. |
| `update` | Apply the latest catalog to existing installs. |
| `uninstall` | Remove everything that dotagents installed. |
| `doctor` | Check installs for missing or modified files. |
| `list` | List the skills. |
| `self-update` | Run `update` with the latest release. |

dotagents doesn't overwrite files that you changed or that it didn't write.
To overwrite them, pass `--force`.

## What's included

The always-on rules in [`content/rules/`](content/rules/) cover working
agreements, the smallest complete change from
[ponytail](https://github.com/DietrichGebert/ponytail), and code comments.

The following skills load when a task needs them:

| Skill | Purpose |
| ----- | ------- |
| `dot-plan` | Plan a change as small, verifiable steps. |
| `dot-code-review` | Review a diff for correctness bugs. |
| `dot-commit` | Commit changes as small, logical commits. |
| `dot-docs-writing` | Write docs in the Google developer documentation style. |
| `dot-debug` | Diagnose hard bugs with a feedback loop. |
| `dot-grill-me` | Start an interview that sharpens a plan. |
| `dot-grilling` | Run the interview method behind `dot-grill-me`. |
| `dot-handoff` | Summarize a conversation for another agent. |
| `dot-writing-for-agents` | Write skills, `AGENTS.md`, and `CLAUDE.md` files. |

## More information

- [Design specification](SPEC.md)
- [Contributing guide](CONTRIBUTING.md): report problems and propose changes
  through pull requests
- [Third-party notices](THIRD_PARTY_NOTICES.md)
- [License (MIT)](LICENSE)
