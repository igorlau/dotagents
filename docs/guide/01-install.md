# Install dotagents

dotagents has two parts. The plugin has the skills, the agents, and the
`check` hook. The CLI installs the always-on rules for all coding agents, and
the skills for Codex and Copilot. Plugins cannot ship always-on rules, so
every coding agent needs the CLI.

## Install for Claude Code

To install the plugin, run the following commands in Claude Code:

```text
/plugin marketplace add igorlau/dotagents
/plugin install dotagents@dotagents
```

To install the rules, run the following command:

```bash
npx --yes @igorlau/dotagents install --agents claude
```

The plugin skills have the `dotagents:` namespace, such as
`/dotagents:dot-plan`. Each commit is a new plugin version, because
`plugin.json` has no version.

## Install for Codex and Copilot

To install the rules and the skills, run the following command:

```bash
npx --yes @igorlau/dotagents install --agents codex,copilot
```

In Codex and Copilot, the skills have no namespace, such as `/dot-plan`.
`dot-flow` runs its steps in the main session, because these coding agents
do not start the dotagents agents.

The Copilot CLI and VS Code can also load the plugin. If you install both
the plugin and the CLI skills, Copilot can list each skill twice.

To install for all three coding agents at the same time, leave out
`--agents`.

## Enable the check hook

The `check` hook runs the `check` script of a repository when an agent or a
subagent stops after it changed files. When the script fails, the hook gives
the output to that agent, and the agent continues. When the script fails a
second time, the hook shows you a warning and lets the agent stop. The hook runs only in a repository that
you enable, because the script is code of the repository.

To enable the hook, run the following command in the repository:

```bash
npx --yes @igorlau/dotagents check enable
```

The repository must have a `check` script in `package.json`, or a `check`
target in a `Makefile`, that
runs the type checker and the linter but not the tests. To stop the hook,
run `npx --yes @igorlau/dotagents check disable`.

## Share the workflow with collaborators

The global install writes nothing to your repositories. To commit the skills
and rules to a repository that you own, run the following command in the
repository:

```bash
npx --yes @igorlau/dotagents init
```

Commit the new files. In a team repository, use only the global install.

## Check the install

To find missing or changed files, and Claude Code skills that the plugin
also provides, run the following command:

```bash
npx --yes @igorlau/dotagents doctor
```

Next: [The flow](02-the-flow.md).
