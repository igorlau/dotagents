# dotagents

dotagents gives Claude Code and GitHub Copilot the same skills and rules
for every project. The skills plan a change, write code and tests in small
steps, verify each step, review the result, and ask for your decision.

## How dotagents is delivered

dotagents has two parts. You need both in Claude Code, and only the CLI in
Copilot:

| Part | What it installs | Coding agents |
| ---- | ---------------- | ------------- |
| Plugin | The skills, `dot-factory`, the agents, and the `check` hook. | Claude Code. The Copilot CLI and VS Code can also load it. |
| CLI | The always-on rules, the skills for Copilot, and the files of a repository install. | Claude Code and Copilot. |

Plugins cannot ship always-on rules, so every coding agent needs the CLI.
`dot-factory` and the agents work only in Claude Code.

## Setup options

You pick a coding agent and a scope. The scope is global or repository:

- A global install covers every project on your computer, and writes
  nothing to your repositories. Use it for team repositories too.
- A repository install writes the skills and rules into one repository that
  you own. Commit the files, so collaborators get them without the plugin or
  the CLI.

The following table shows where each install puts the skills and the rules:

| Scope | Claude Code | Copilot |
| ----- | ----------- | ------- |
| Global | Skills from the plugin. Rules in `~/.claude/rules/dotagents.md`. | Skills in `~/.agents/skills/`. Rules in a block of `~/.copilot/copilot-instructions.md`. |
| Repository | Skills in `.claude/skills/`. Rules in `.claude/rules/dotagents.md`, or in a block of `AGENTS.md`. | Skills in `.agents/skills/`. Rules in a block of `AGENTS.md`. |

A repository install already gives Claude Code the skills. If you also have
the plugin, Claude Code lists each skill twice.

## Run the CLI

The CLI needs Node.js 20 or later. `npx` runs it without an install:

```bash
npx --yes @igorlau/dotagents
```

With no command, the CLI opens a wizard in a terminal. The wizard asks for
your coding agents and the scope. For a global install with Claude Code, it
offers to install the plugin. It writes nothing before you confirm.

To run `dotagents` as a command in any terminal, install the CLI globally:

```bash
npm install --global @igorlau/dotagents
```

In scripts and CI, use the commands with flags, such as
`--agents claude`. Without a terminal, no wizard opens. For all flags and
wizard questions, see [Install dotagents](docs/guide/01-install.md).

## Set up Claude Code

To set up Claude Code globally, run these commands in a terminal:

1. Add the marketplace:

   ```bash
   claude plugin marketplace add igorlau/dotagents
   ```

1. Install the plugin:

   ```bash
   claude plugin install dotagents@dotagents
   ```

1. Install the always-on rules:

   ```bash
   npx --yes @igorlau/dotagents install --agents claude
   ```

The plugin skills have the `dotagents:` namespace, such as
`/dotagents:dot-plan`.

## Set up Copilot

To install the rules and the skills for Copilot globally, run the following
command:

```bash
npx --yes @igorlau/dotagents install --agents copilot
```

In Copilot, the skills have no namespace, such as `/dot-plan`.

## Set up a repository

Run these commands inside the repository:

| Command | Effect |
| ------- | ------ |
| `npx --yes @igorlau/dotagents scaffold` | Creates starter agent instructions: `AGENTS.md`, `CLAUDE.md`, `.claude/settings.json`, `.editorconfig`, and `.gitattributes`. It skips a file that exists. |
| `npx --yes @igorlau/dotagents init` | Installs the skills and rules into the repository. Commit the new files. |
| `npx --yes @igorlau/dotagents check enable` | Starts the plugin `check` hook in the repository. |

Run `scaffold` before `init`. `init` adds a block to `AGENTS.md`, and
`scaffold` does not overwrite an `AGENTS.md` that exists.

The `check` hook runs the `check` script of the repository at the end of
each turn that changes files. The hook runs only in a repository that you
enable, because the script is code of the repository.

## Update dotagents

To update the plugin, run these commands, then restart Claude Code:

```bash
claude plugin marketplace update dotagents
claude plugin update dotagents@dotagents
```

The plugin has no fixed version, so each commit to `main` is a new plugin
version. To update the rules and the CLI skills, run
`npx --yes @igorlau/dotagents self-update`.

## Remove dotagents

To remove dotagents, run these commands in a terminal:

1. Uninstall the Claude Code plugin:

   ```bash
   claude plugin uninstall dotagents@dotagents
   ```

1. Remove the marketplace:

   ```bash
   claude plugin marketplace remove dotagents
   ```

1. Remove the rules, and the skills for Copilot:

   ```bash
   npx --yes @igorlau/dotagents uninstall
   ```

   In a terminal, the command shows the files to remove and asks for
   confirmation. To remove a repository install, run the command in that
   repository.

## Commands

The following table gives a summary of the CLI commands. For the options,
run `dotagents --help`:

| Command | Description |
| ------- | ----------- |
| `install` | Install globally. |
| `init` | Install into the current repository. |
| `scaffold` | Create starter agent instructions in the current repository. |
| `check enable`, `check disable` | Start or stop the plugin `check` hook in the current repository. |
| `update` | Apply the catalog of this CLI version to the installs. |
| `self-update` | Run `update` with the latest release. A CLI installed with `npm install --global` updates itself first. |
| `doctor` | Find missing or changed files in the installs, and Claude Code skills that the plugin also provides. |
| `list` | List the skills. |
| `uninstall` | Remove everything that dotagents installed. |

dotagents does not overwrite a file that you changed or that it did not
write. To overwrite the file, add `--force`. To see the changes first, add
`--dry-run`.

## What is included

The always-on rules in [`rules/`](rules/) cover working agreements, the
smallest complete change from
[ponytail](https://github.com/DietrichGebert/ponytail), code comments, code
style, and writing.

The 20 skills in [`skills/`](skills/) and
[`claude/skills/`](claude/skills/) load when a task needs them:

| Skill | Purpose |
| ----- | ------- |
| `dot-factory` | Take a problem from one description to a staged change, with one spec approval and a Gate for each task. Claude Code only. |
| `dot-grilling` | Run an interview, in rounds of questions, that makes a plan clear. |
| `dot-plan` | Plan a change as small, verifiable steps, with requirements and entity schemas. |
| `dot-roadmap` | Split a plan into phases and tasks that each stand alone. |
| `dot-implement` | Write the code of a change or roadmap task to the standards of the repository and the language. |
| `dot-testing` | Write tests with a makeSut factory, alone or after `dot-implement`. |
| `dot-code-review` | Review a diff for correctness bugs and maintainability problems. |
| `dot-walkthrough-branch` | Review the commits of a branch as an ordered stack of dependency layers. |
| `dot-walkthrough-changes` | Walk through the working-tree changes as an ordered stack of dependency layers. |
| `dot-security-audit` | Audit the whole codebase of a branch, or a path, for security vulnerabilities. |
| `dot-security-changes` | Check the working-tree changes for security problems. |
| `dot-ux-review` | Review UI code for UX and accessibility rules by reading the code, against the Vercel web interface guidelines. |
| `dot-ui-review` | Review UI changes visually in a browser against a live preview, or report why the review cannot run. |
| `dot-comments` | Delete the comments in a diff that no exception protects. |
| `dot-commit` | Commit changes as small, logical commits. |
| `dot-debug` | Find the cause of a hard bug with a feedback loop. |
| `dot-correct` | Change a mistake that agents repeat into a check that prevents it. |
| `dot-handoff` | Give a summary of a conversation to another agent. |
| `dot-docs-writing` | Give docs the structure and format of the Google developer documentation style. |
| `dot-writing-for-agents` | Write skills, `AGENTS.md`, and `CLAUDE.md` files. |

The plugin also has 3 agents in [`claude/agents/`](claude/agents/). Each
agent runs one step of a task in a clean context, with a fixed model and
effort:

| Agent | Purpose | Model | Effort |
| ----- | ------- | ----- | ------ |
| `dot-implementer` | Write the production code of a task. | `sonnet` | `high` |
| `dot-tester` | Write the tests of a task after the code exists. | `sonnet` | `medium` |
| `dot-reviewer` | Review a range of two trees, and write the findings as JSON. | `sonnet` | `high` |

## Learn the flow

The skills form one flow: plan the change, split it into tasks, build and
test each task, then review and commit. The [guide](docs/guide/README.md)
teaches the flow, with `dot-factory` in Claude Code and by hand in Copilot.

## More information

- [Design specification](SPEC.md)
- [Contributing guide](CONTRIBUTING.md): report problems and propose changes
  with pull requests
- [Third-party notices](THIRD_PARTY_NOTICES.md)
- [License (MIT)](LICENSE)
