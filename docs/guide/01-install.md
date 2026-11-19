# Install dotagents

dotagents has two parts. The plugin has the skills, `dot-factory`, the
agents, and the `check` hook. Claude Code gets `dot-factory` and the agents
only through the plugin. The CLI installs the always-on rules for both coding
agents, and the skills for Copilot. Plugins cannot ship always-on rules, so
every coding agent needs the CLI.

## Install with the wizard

To install dotagents, run the following command in a terminal:

```bash
npx --yes @igorlau/dotagents
```

The wizard asks these questions, in this order:

1. Which coding agents you use. Both are checked.
1. Where to install. Global is the default. The option for the repository
   appears only inside a Git repository.
1. Whether to install the Claude Code plugin. This question appears only for
   a global install with Claude Code checked, when the plugin is not
   installed yet and `claude` is on the PATH. Without `claude`, the summary
   shows the 2 `/plugin` commands.
1. Whether to set up the repository. Inside a Git repository, the wizard can
   enable the `check` hook and create `AGENTS.md` and the other starter files
   with `scaffold`. The `check` option appears when the repository has a
   `check` script and the hook is off. The `scaffold` option appears when the
   repository has no `AGENTS.md`. Both options come unchecked. When neither
   option applies, the wizard skips this question.

Then the wizard shows a summary and asks for confirmation. It writes nothing
before you confirm, and it never overwrites a file that you changed or that
dotagents did not write.

On Windows, if you installed Claude Code with npm, the wizard cannot start
`claude`. It then shows the 2 `/plugin` commands instead of the plugin
question. Run them in Claude Code.

## Install with flags

Use the flags in scripts and CI. Without a terminal, no wizard opens. A flag
skips its own question: for example, `--agents` skips the question about the
coding agents. `--dry-run` and `--force` skip the wizard.

### Install for Claude Code

To install for Claude Code, run these commands in a terminal:

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
`/dotagents:dot-plan`. Each commit is a new plugin version, because
`plugin.json` has no version.

### Install for Copilot

To install the rules and the skills, run the following command:

```bash
npx --yes @igorlau/dotagents install --agents copilot
```

In Copilot, the skills have no namespace, such as `/dot-plan`. The CLI does
not install `dot-factory`, and Copilot does not start the dotagents agents.
In Copilot, run each step of the flow yourself, in the main session.

The Copilot CLI and VS Code can also load the plugin. If you install both
the plugin and the CLI skills, Copilot can list each skill twice.

To install for both coding agents at the same time, leave out
`--agents`.

## Enable the check hook

The `check` hook runs the `check` script of a repository when an agent or a
subagent stops after it changed files. When the script fails, the hook gives
the output to that agent, and the agent continues. When the script fails a
second time, the hook shows you a warning and lets the agent stop. The hook runs only in a repository that
you enable, because the script is code of the repository.

The install wizard offers to enable the hook. To enable it with a command,
run the following command in the repository:

```bash
npx --yes @igorlau/dotagents check enable
```

The repository must have a `check` script in `package.json`, or a `check`
target in a `Makefile`, that
runs the type checker and the linter but not the tests. To stop the hook,
run `npx --yes @igorlau/dotagents check disable`.

## Shorten the Bash output

In Claude Code, the plugin `compress` hook shortens the Bash output of test,
build, install, and Git commands before Claude reads it. It removes color
codes, old progress lines, runs of similar lines, and the passing tests of a
failing run. It keeps every line that reports an error, a failure, or a
warning. The hook saves the full output in a temporary file and gives Claude
the path. The hook also asks Claude to read the page text before it takes a
browser screenshot.

The hook is on by default. To see how many characters it saved, run
`npx --yes @igorlau/dotagents compress`. To turn it off, run
`npx --yes @igorlau/dotagents compress disable`.

## Share dotagents with collaborators

The global install writes nothing to your repositories. To commit the skills
and rules to a repository that you own, run the following command in the
repository:

```bash
npx --yes @igorlau/dotagents init
```

You can also pick the repository in the install wizard. Commit the new
files. In a team repository, use only the global install.

To create the starter files, such as `AGENTS.md` and `CLAUDE.md`, run
`npx --yes @igorlau/dotagents scaffold`. In a terminal, it asks which files to
create.

## Check the install

To find missing or changed files, and Claude Code skills that the plugin
also provides, run the following command:

```bash
npx --yes @igorlau/dotagents doctor
```

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

Next: [The flow](02-the-flow.md).
