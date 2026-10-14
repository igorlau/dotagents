# dotagents

dotagents installs a curated set of skills and rules into Claude Code,
OpenAI Codex, and GitHub Copilot, so every project you work on gets the same
AI workflow.

## Install

To install the skills and rules for all your projects, run the following
command:

```bash
npx --yes github:igorlau/dotagents install
```

The repository is private, so your Git credentials need access to it. On a
machine with only a company GitHub account, see
[Install dotagents with a deploy key](docs/deploy-key.md).

## Use dotagents in a repository

The global install covers most cases. To add the skills and rules to a
single repository, choose a mode based on who owns the repository:

- **Your repository:** run `npx --yes github:igorlau/dotagents init`, and
  commit the new files.
- **A team repository:** run
  `npx --yes github:igorlau/dotagents init --local-only`. dotagents keeps its
  files out of Git and never edits tracked files.

## Commands

The following table summarizes the commands. For options, run
`dotagents --help`.

| Command | Description |
| ------- | ----------- |
| `install` | Install globally. |
| `init [--local-only]` | Install into the current repository. |
| `update` | Apply the latest catalog to existing installs. |
| `uninstall` | Remove everything that dotagents installed. |
| `doctor` | Check installs for missing, modified, or Git-visible files. |
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
| `plan` | Plan a change as small, verifiable steps. |
| `code-review` | Review a diff for correctness bugs. |
| `commit` | Commit changes as small, logical commits. |
| `docs-writing` | Write docs in the Google developer documentation style. |
| `debug` | Diagnose hard bugs with a feedback loop. |
| `grill-me` | Start an interview that sharpens a plan. |
| `grilling` | Run the interview method behind `grill-me`. |
| `handoff` | Summarize a conversation for another agent. |
| `writing-for-agents` | Write skills, `AGENTS.md`, and `CLAUDE.md` files. |

## More information

- [Design specification](SPEC.md)
- [Contributing guide](CONTRIBUTING.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)
