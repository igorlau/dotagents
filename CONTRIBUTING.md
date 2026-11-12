# Contributing to dotagents

This guide tells you how to change the catalog, the plugin, and the CLI. For
the design and the reasons for it, see the
[design specification](SPEC.md).

## Report a problem or propose a change

This repository does not use issues. To report a problem or propose a
change, fork the repository and open a pull request. For a problem without a
fix, open a pull request that adds a test that fails, or that describes the
problem in its description. The maintainer reviews every pull request.
Workflows on pull requests from forks run only after approval.

## Set up

You need Node.js 22.18 or later, which runs the TypeScript sources directly.

To install the dependencies and run the checks, run the following commands.
`npm run check` runs the type checker and the content lint:

```bash
npm install
npm run check
npm test
```

To run the CLI from source, run `node src/cli.ts COMMAND`. The tests use
temporary home directories, but the CLI writes to your real home directory.
To see the changes first, add `--dry-run`.

To try the plugin from your clone, run the following command in Claude Code,
then install `dotagents@dotagents`:

```text
/plugin marketplace add PATH_TO_CLONE
```

Replace `PATH_TO_CLONE` with the absolute path of your clone.

The plugin `check` hook runs only in repositories that you enable. To try
the hook in a repository, run `node src/cli.ts check enable` there.

## Layout

The catalog and the plugin are the same directory, `plugin/`:

| Path | Content | Used by |
| ---- | ------- | ------- |
| `plugin/.claude-plugin/plugin.json` | The plugin manifest | The plugin |
| `plugin/skills/` | Skills | The plugin and the CLI |
| `plugin/agents/` | Agents | The plugin |
| `plugin/hooks/` | `hooks.json` and the hook scripts | The plugin |
| `plugin/rules/` | Always-on rules | The CLI |
| `plugin/scaffold/` | Templates for `dotagents scaffold` | The CLI |

The marketplace file, `.claude-plugin/marketplace.json`, is at the
repository root and points to `./plugin`.

## Add a skill

To add a skill, do these steps:

1. Read the `dot-writing-for-agents` skill.
1. Create `plugin/skills/SKILL_NAME/SKILL.md`. Replace `SKILL_NAME` with a
   name in lowercase words joined by hyphens, with the `dot-` prefix. The
   `name` field in the frontmatter must be the same name.
1. Keep `SKILL.md` within 8,000 characters. Keep only what applies on every
   run. Move conditional content, such as a language, a mode, or a rare
   case, to `references/TOPIC.md`, behind a line that says when to read it.
1. For a skill that sets `disable-model-invocation`, add
   `agents/openai.yaml` with `allow_implicit_invocation: false`, so Codex
   follows the same choice.
1. State a convention of the repository only when the skill needs more than
   the first working agreement in `plugin/rules/core.md`.
1. Add the skill to the skills table in the `README.md`, and to the skills
   table in the [design specification](SPEC.md#skills).
1. Run `npm run lint:content`.

## Add an agent

Only the plugin ships agents. In Codex and Copilot, `dot-flow` runs its
steps in the main session instead. To add an agent, do these steps:

1. Create `plugin/agents/AGENT_NAME.md`. Replace `AGENT_NAME` with a name
   with the `dot-` prefix. The `name` field in the frontmatter must be the
   same name.
1. Give the agent a `description` that says when to use it.
1. To preload skills, list them in the `skills` field with the plugin
   namespace, such as `dotagents:dot-testing`. Claude Code loads a bare name
   from `~/.claude/skills/` first. A skill that sets
   `disable-model-invocation` cannot load into an agent.
1. To block the `Agent` tool, so that the agent cannot start other agents,
   set `disallowedTools: Agent`.
1. Add the agent to the agents tables in the `README.md` and in the
   [design specification](SPEC.md#agents).
1. Run `npm run lint:content`.

The agents receive the rules from `~/.claude/rules/dotagents.md`, so an
agent does not need to load them.

## Add a hook

The plugin hooks are in `plugin/hooks/hooks.json`. Claude Code, Copilot, and
Codex load this file. To add a hook, do these steps:

1. Put the script in `plugin/hooks/`, and start it from `hooks.json` with
   `node "${CLAUDE_PLUGIN_ROOT}/hooks/SCRIPT_NAME"`. Replace `SCRIPT_NAME`
   with the file name of the script.
1. Make the script do nothing in a repository that did not opt in. A hook
   runs in every repository of the user, and code of the repository is
   untrusted.
1. Make sure that the hook cannot loop. For example, `check.mjs` allows the
   second stop, and shows the user a warning instead.
1. For an event of Claude Code only, such as `SubagentStop`, make sure that
   the script does no harm when another coding agent ignores the event.
1. Add a test in `test/` that runs the script with the JSON input of the
   hook. See `test/check-hook.test.ts`.

## Plugin version

`plugin.json` has no `version` field. Without a version, Claude Code
versions the plugin by commit, so every push to `main` reaches users. With a
fixed version, Claude Code skips updates until the version changes.
`npm run lint:content` fails when `plugin.json` has a version.

## Change the rules

Rules load into every conversation, so every word costs tokens on every
turn. State a rule as the behavior to follow. A list of words or patterns to
avoid belongs in `PROSE_PATTERNS` in `scripts/lint-content.ts`, where no
agent reads it. Each file in `plugin/rules/` covers one topic, and each piece of
guidance lives in one file. `npm run lint:content` fails when the rules are
more than the character budget.

## Change the docs

Write all docs by the `writing.md` rule. `npm run lint:content` checks the
mechanical part of that rule: em dashes, arrows, contractions, and the words
that the rule replaces. It also checks the links and anchors in the docs, the names and counts of skills and agents,
and that the `README.md` lists every skill and agent. When you add a page to
`docs/guide/`, add it to the index in `docs/guide/README.md`.

## Vendor content from another repository

To copy a skill or a rule from another repository, do these steps:

1. Copy the skill directory to `plugin/skills/`, or the rules file to
   `plugin/rules/`.
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

To see the upstream changes after the recorded commits, run
`npm run check-upstream -- --diff`.

## Update agent paths

Coding agents sometimes change where they read skills and instructions. The
paths are in `src/targets.ts`. When you change them, update the agent
targets table in the [design specification](SPEC.md#agent-targets), and add
a test in `test/`.

## Commit and release

Write commit messages in the Conventional Commits format. CI stages every
push to `main` that passes the checks on npm as
`@igorlau/dotagents@MAJOR.MINOR.RUN_NUMBER`, and tags it
`vMAJOR.MINOR.RUN_NUMBER`. The version becomes available after the
maintainer approves it on npmjs.com, under **Staged Packages**.

On `main`, `package.json` keeps the version `MAJOR.MINOR.0-dev`, and builds
from a branch report the commit, such as `1.0.0-dev+30d0533`. To start a new
minor or major series, change `MAJOR.MINOR` in `package.json`, and keep the
`.0-dev` suffix.
