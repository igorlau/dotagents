# dotagents

dotagents installs a curated set of skills and rules into Claude Code,
OpenAI Codex, and GitHub Copilot, so every project you work on gets the same
AI workflow.

## Install

To install the rules for all your projects, and the skills for Codex and
Copilot, run the following command:

```bash
npx --yes @igorlau/dotagents install
```

Claude Code gets the skills, agents, and hooks from the dotagents plugin. To
install the plugin, run the following commands in Claude Code:

```text
/plugin marketplace add igorlau/dotagents
/plugin install dotagents@dotagents
```

The plugin's hook runs a repository's `check` script at the end of each turn
that changes files. It runs only in repositories you enable with
`dotagents check enable`.

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

## Start a new repository

To create starter agent instructions in a new repository, run the following
command in the repository:

```bash
npx --yes @igorlau/dotagents scaffold
```

The command creates the following files, skips any that already exist, and
never changes them afterward. They belong to the repository, so edit and
commit them like any other file:

| File | Purpose |
| ---- | ------- |
| `AGENTS.md` | Project instructions for every agent: how to work, code and tests, security, and Git. |
| `CLAUDE.md` | Imports `AGENTS.md`, so Claude Code reads the same instructions. |
| `.claude/settings.json` | Blocks Claude Code from reading secrets, and asks before `git push`. |
| `.editorconfig`, `.gitattributes` | Keep whitespace and line endings consistent across editors and operating systems. |

Run `scaffold` before `init`. `init` adds a block to `AGENTS.md`, and
`scaffold` doesn't overwrite an existing `AGENTS.md`.

## Commands

The following table summarizes the commands. For options, run
`dotagents --help`.

| Command | Description |
| ------- | ----------- |
| `install` | Install globally. |
| `init` | Install into the current repository for collaborators. |
| `scaffold` | Create starter agent instructions in the current repository. |
| `update` | Apply the latest catalog to existing installs. |
| `uninstall` | Remove everything that dotagents installed. |
| `doctor` | Check installs for missing or modified files. |
| `list` | List the skills. |
| `self-update` | Run `update` with the latest release. |
| `check enable`, `check disable` | Let the plugin's `check` hook run in the current repository, or stop it. |

dotagents doesn't overwrite files that you changed or that it didn't write.
To overwrite them, pass `--force`.

## What's included

The always-on rules in [`plugin/rules/`](plugin/rules/) cover working
agreements, the smallest complete change from
[ponytail](https://github.com/DietrichGebert/ponytail), code comments, and
writing.

The following skills load when a task needs them:

| Skill | Purpose |
| ----- | ------- |
| `dot-plan` | Plan a change as small, verifiable steps. |
| `dot-implement` | Implement a change or roadmap task to the repository's and language's standards. |
| `dot-testing` | Write tests around a shared makeSut factory. |
| `dot-code-review` | Review a diff for correctness bugs and maintainability problems. |
| `dot-commit` | Commit changes as small, logical commits. |
| `dot-docs-writing` | Write docs in the Google developer documentation style. |
| `dot-debug` | Diagnose hard bugs with a feedback loop. |
| `dot-grill-me` | Start an interview that sharpens a plan. |
| `dot-grilling` | Run the interview method behind `dot-grill-me`. |
| `dot-roadmap` | Split a grilled plan into phases and self-contained tasks. |
| `dot-handoff` | Summarize a conversation for another agent. |
| `dot-comments` | Delete the comments in a diff that no exception protects. |
| `dot-correct` | Turn a mistake that agents repeat into a check that prevents it. |
| `dot-writing-for-agents` | Write skills, `AGENTS.md`, and `CLAUDE.md` files. |

## More information

- [Design specification](SPEC.md)
- [Contributing guide](CONTRIBUTING.md): report problems and propose changes
  through pull requests
- [Third-party notices](THIRD_PARTY_NOTICES.md)
- [License (MIT)](LICENSE)
