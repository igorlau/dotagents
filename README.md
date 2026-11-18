# dotagents

dotagents gives Claude Code, OpenAI Codex, and GitHub Copilot one AI workflow
for every project. The workflow plans a change, writes code and tests in small
steps, verifies each step, reviews the result, and asks for your decision.

dotagents has two parts:

- A plugin with skills, agents, and hooks. Claude Code, the
  Copilot CLI, and VS Code load the plugin.
- A CLI that installs the always-on rules for all three coding agents, and the
  skills for Codex and Copilot.

## Install

To install dotagents, run the following command in a terminal:

```bash
npx --yes @igorlau/dotagents
```

The wizard asks for your coding agents and where to install. For a global
install with Claude Code, it offers to install the Claude Code plugin. In a
repository, it can enable the `check` hook. It shows a summary and writes
nothing before you confirm.

The plugin skills have the `dotagents:` namespace, such as
`/dotagents:dot-plan`. The plugin hook runs the `check` script of a
repository at the end of each turn that changes files, only in a repository
that you enable.

For scripts and CI, use the commands with flags. Without a terminal, no
wizard opens. See [Install dotagents](docs/guide/01-install.md).

`npx` runs dotagents without an install. To run `dotagents` as a command in
any terminal, install it globally:

```bash
npm install --global @igorlau/dotagents
```

To upgrade a global install, run
`npm install --global @igorlau/dotagents@latest`.

## Use dotagents in a repository

The global install covers every project, team repositories too, and writes
nothing to them.

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

The command creates the following files. It skips a file that exists, and it
never changes the files after that. The files belong to the repository, so
edit and commit them like any other file:

| File | Purpose |
| ---- | ------- |
| `AGENTS.md` | Project instructions for every agent: how to work, code and tests, security, and Git. |
| `CLAUDE.md` | Imports `AGENTS.md`, so Claude Code reads the same instructions. |
| `.claude/settings.json` | Blocks secret files from Claude Code, and asks before `git push`. |
| `.editorconfig`, `.gitattributes` | Keep whitespace and line endings the same in all editors and operating systems. |

Run `scaffold` before `init`. `init` adds a block to `AGENTS.md`, and
`scaffold` does not overwrite an `AGENTS.md` that exists.

## The flow

The following diagram shows the full flow, from an idea to the commits of one
task. The agent stops for your decision at each "approve", "fix", or "accept":

```mermaid
sequenceDiagram
    actor User
    participant Main as Main session
    participant Agents as Step agents
    User->>Main: dot-grilling with an idea
    Main-->>User: Questions in rounds, with recommended answers
    User->>Main: Answers until the plan is clear
    User->>Main: dot-plan
    Main-->>User: Requirements
    User->>Main: Approve the requirements
    Main-->>User: Entity schemas
    User->>Main: Approve the schemas
    Main-->>User: Plan as small, verifiable steps
    User->>Main: Approve the plan
    User->>Main: dot-roadmap
    Main-->>User: Phases and task files with test cases
    User->>Main: Approve the roadmap
    loop Each task
        User->>Main: dot-flow with the task file
        Main->>Agents: 1. Production code (dot-implementer)
        Agents-->>Main: Reply
        Main->>Main: Run the checks of the reply
        Main->>Agents: 2. Tests (dot-tester)
        Agents-->>Main: Reply
        Main->>Main: Run the tests of the reply
        Main->>Agents: 3. Review (dot-reviewer)
        Agents-->>Main: Findings
        loop At most 2 automatic rounds, until a stop rule fires
            Main->>Agents: Steps 1 to 3 again for the high and medium findings
            Agents-->>Main: Status of each finding, and new findings
        end
        Main-->>User: Round history and findings
        break A blocker, or a check that differs from the reply
            Main-->>User: Stop. The files stay as they are.
        end
        opt Fix
            User->>Main: Fix these findings
            Main->>Agents: Steps 1 to 3 again, or only step 1 on the light path
            Main-->>User: Round history and findings
        end
        User->>Main: Accept
        User->>Main: dot-commit
        Main-->>User: Each commit for approval
        User->>Main: Approve
        Main-->>User: Commits, and a tick in the roadmap
    end
```

`dot-flow` never commits. In Codex and Copilot, `dot-flow` runs the three steps
in the main session, with the same verification and stops.

To learn the workflow step by step, read the [guide](docs/guide/README.md).

## Commands

The following table gives a summary of the commands. For the options, run
`dotagents --help`.

| Command | Description |
| ------- | ----------- |
| `install` | Install globally. |
| `init` | Install into the current repository for collaborators. |
| `scaffold` | Create starter agent instructions in the current repository. |
| `update` | Apply the latest catalog to the installs. |
| `uninstall` | Remove everything that dotagents installed. |
| `doctor` | Find missing or changed files in the installs. |
| `list` | List the skills. |
| `self-update` | Run `update` with the latest release. A CLI installed with `npm install -g` updates itself first. |
| `check enable`, `check disable` | Start or stop the plugin `check` hook in the current repository. |

dotagents does not overwrite a file that you changed or that it did not
write. To overwrite the file, add `--force`.

## What is included

The always-on rules in [`plugin/rules/`](plugin/rules/) cover working
agreements, the smallest complete change from
[ponytail](https://github.com/DietrichGebert/ponytail), code comments, code
style, and writing.

The 15 skills in [`plugin/skills/`](plugin/skills/) load when a task needs
them:

| Skill | Purpose |
| ----- | ------- |
| `dot-grilling` | Run an interview, in rounds of questions, that makes a plan clear. |
| `dot-plan` | Plan a change as small, verifiable steps, with requirements and entity schemas. |
| `dot-roadmap` | Split a plan into phases and tasks that each stand alone. |
| `dot-flow` | Take a roadmap task through code, tests, and review, verify each step, fix the `high` and `medium` findings in automatic rounds, and stop for your decision. |
| `dot-testing` | Write tests with a makeSut factory, alone or after `dot-implement`. |
| `dot-implement` | Write the code of a change or roadmap task to the standards of the repository and the language. |
| `dot-code-review` | Review a diff for correctness bugs and maintainability problems. |
| `dot-stack-review` | Review the commits of a branch as an ordered stack of dependency layers. |
| `dot-comments` | Delete the comments in a diff that no exception protects. |
| `dot-commit` | Commit changes as small, logical commits. |
| `dot-debug` | Find the cause of a hard bug with a feedback loop. |
| `dot-correct` | Change a mistake that agents repeat into a check that prevents it. |
| `dot-handoff` | Give a summary of a conversation to another agent. |
| `dot-docs-writing` | Give docs the structure and format of the Google developer documentation style. |
| `dot-writing-for-agents` | Write skills, `AGENTS.md`, and `CLAUDE.md` files. |

The plugin also has 3 agents in [`plugin/agents/`](plugin/agents/).
`dot-flow` starts a new agent for each step, so each step starts with a clean
context:

| Agent | Purpose |
| ----- | ------- |
| `dot-tester` | Write the tests of a task after the code exists. |
| `dot-implementer` | Write the production code of a task. |
| `dot-reviewer` | Review the changes of a task. |

## More information

- [Design specification](SPEC.md)
- [Contributing guide](CONTRIBUTING.md): report problems and propose changes
  with pull requests
- [Third-party notices](THIRD_PARTY_NOTICES.md)
- [License (MIT)](LICENSE)
