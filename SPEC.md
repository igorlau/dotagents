# dotagents specification

dotagents is a personal CLI and plugin that installs a curated set of agent
skills, agents, and rules into Claude Code, OpenAI Codex, and GitHub Copilot.
It makes one AI workflow available in every project, and also in projects
that belong to teams with their own conventions.

This document records the design decisions and the reasons for them.

## Goals

- Keep one source of truth for skills and rules, and adapt it to each coding
  agent.
- Work in personal projects and in team projects. Do not change what the team
  sees in Git, unless you ask for it.
- Keep installs reversible: dotagents tracks every file that it writes, and
  can update or remove the file and nothing else.

## Non-goals

- A general-purpose package manager for third-party skills. Use
  [`npx skills`](https://skills.sh) for that.
- Commands, subagents, hooks, and MCP servers in the CLI. They do not work
  the same way in the three coding agents, so each one needs its own adapter.
  The plugin ships agents and hooks, because Claude Code and Copilot load the
  same plugin format.
- Paid model evaluations, such as `claude plugin eval`. See decision 26.

## Decisions

The following table gives each decision and its reason:

| # | Decision | Reason |
| --- | ---------- | -------- |
| 1 | Support Claude Code, Codex, and GitHub Copilot. | These are the coding agents in use in personal and team projects. |
| 2 | Support two install modes: global (default) and project. Team repositories use only the global install. | The default must never change a team repository. |
| 3 | Manage only skills and rules in the CLI. | Skills use the same `SKILL.md` format in all three coding agents. Rules compile from one source. |
| 4 | Drop the local-only mode, which wrote Git-excluded files into team repositories. | It installed the same content as the global install. Its files still had an effect on tools such as `git clean`, search, and Copilot, which listed skills twice. |
| 5 | Write the CLI in TypeScript and run it with `npx`. | Node is on almost every development machine, and `npx` needs no install step. |
| 6 | Bundle the content with the CLI, release on every merge, and track installs in a manifest. | One version describes both code and content. The manifest makes update and uninstall safe. |
| 7 | Install the whole catalog. | The catalog is small. Add profiles when it grows. The manifest already records skills by name. |
| 8 | Write skills and rules in English. | Models follow English instructions slightly more precisely, and vendored skills are in English. |
| 9 | Vendor third-party skills and record their origin. | An upstream rename or rewrite cannot break installs. A script shows upstream changes on demand. |
| 10 | Publish a public npm package, `@igorlau/dotagents`, from a public repository under the MIT license. | Any machine can install without Git credentials, also machines with only an Enterprise Managed User (EMU) account. The content is generic, so it can be public. The unscoped `dotagents` name belongs to another project. |
| 11 | Stage releases from GitHub Actions with npm trusted publishing, and approve each one on npmjs.com. | No npm token to store or leak, npm records provenance for each version, and nothing reaches users without the security key of the maintainer. Earlier versions installed from Git, with a deploy key for EMU machines. |
| 12 | Test the CLI against temporary Git repositories and lint the content in CI. | The main risk is a change to files in a team repository. |
| 13 | Ship the ponytail ruleset as an always-on rule, not as a skill. | The smallest-change discipline must apply to every interaction, and it reduces generated code and tokens. |
| 14 | Add an always-on rule that deletes code comments by default and keeps only named exceptions. | Agents write comments that restate code or describe changes. A surprise in the code gets a new name or a new function, and a constraint gets a type, a check, or a test. |
| 15 | Prefix every skill name with `dot-`, such as `dot-plan`. | Codex, Copilot, and project installs for Claude Code load skills without a namespace, so a skill without the prefix can clash with a skill of the repository or of another source. The prefix also groups the skills in the `/` menu. Rules need no prefix: they live in files and blocks with the dotagents name. |
| 16 | Add a `scaffold` command that creates starter project instructions once, and keeps them out of the manifest. | A new repository needs instructions for its project, and those belong to the repository: `update` must never rewrite them. Files that dotagents writes only once also keep the command safe in a repository that has instructions. |
| 17 | Keep the catalog in `plugin/`, which is also a Claude Code plugin, and list it in a marketplace at the repository root. Publish only this marketplace. | One source serves the CLI and the plugin. A marketplace in the repository needs no registry and costs nothing. |
| 18 | Ship one hook script in the plugin that runs the `check` script of the repository (type check and lint, not tests) when an agent or a subagent stops, and makes that agent continue when it fails. | Claude Code, Copilot, and Codex all load `hooks/hooks.json` from the plugin, and Claude Code, Copilot CLI, and Codex document a `block` decision, so one script covers the three coding agents. Tests stay out because `dot-implement` can leave expected test failures for `dot-testing`. The hook allows the second stop, so it cannot loop, and it shows the user a warning when the check still fails there. It runs the check only when the working tree changed, compared with a snapshot from the start of the prompt. In Claude Code, the hook also takes a snapshot on `SubagentStart` and runs on `SubagentStop`, so each agent answers only for the changes that it made, and the subagent that broke the check fixes it. When the check still fails at the stop of the main agent, `dot-flow` stops and does not edit the code. The check is an npm script, or a `Makefile` target for a repository without `package.json`. A turn that changes nothing never makes the agent fix old problems or runs repository code. It acts only in repositories listed in `checkRepos` in the `config.json` of the user, which `dotagents check enable` sets: the `check` script is code of the repository, and an opt-in inside the repository would let an untrusted repository enable itself. |
| 19 | The global CLI install writes rules for all three coding agents, and skills only for Codex and Copilot. Claude Code gets the skills, agents, and hooks from the plugin. | Plugins cannot ship always-on rules, and the CLI cannot install agents and hooks safely. `update` removes the Claude Code skills that earlier versions installed, and `doctor` warns about copies that stay. Project installs still write `.claude/skills/`, so collaborators do not need the plugin. |
| 20 | Add an always-on writing rule, based on ASD-STE100, for all text that agents write: chat, CLI output, plans and reports, commits, pull requests, and docs. It takes precedence over the Google style in `dot-docs-writing`. | Short sentences with a controlled vocabulary are easier to read for a reader in a second language and for translation tools. One rule for all text replaces the prose rules that `dot-docs-writing` kept only for docs. The rules are in our own words, because the ASD-STE100 dictionary is copyrighted. |
| 21 | Ship three agents in the plugin only: `dot-implementer`, `dot-tester`, and `dot-reviewer`. Each one preloads one skill as `dotagents:<skill>`, and none of them can start another agent. | Each step of a roadmap task runs in a new context with only its skill. With a bare name, Claude Code preloads a skill with the same name from `~/.claude/skills/` first, such as an old copy from an earlier CLI install. A live run on 2026-11-12 showed that agents receive `~/.claude/rules/dotagents.md`, so the agents do not load the rules themselves. |
| 22 | Keep each `SKILL.md` within 8,000 characters, with only the workflow and the rules that apply on every run. Move conditional content, such as a language, a mode, or a rare case, to `references/TOPIC.md`, behind a line that says when to read it. | A `SKILL.md` loads in full each time its skill runs, so content for one language or mode costs tokens in every other run. `npm run lint:content` enforces the budget. |
| 23 | Run each roadmap task in three steps: production code, tests, and review. `dot-implement` writes no tests. It runs the type checker, the linter, and the existing tests, and gives `dot-testing` the list of expected failures. `dot-testing` then writes the test cases of the task. Outside `dot-flow`, `dot-implement` starts `dot-testing` itself. `dot-flow` runs each step in a new agent, runs the commands of each reply again, and continues without a stop when the results agree. It stops on a blocker, on a result that differs from the reply, and after the review, where the user fixes findings or accepts. It never commits: `dot-commit` ticks the roadmap. In Codex and Copilot, `dot-flow` runs the steps in the main session. | The test names in the roadmap task fix the behavior before the code exists. An earlier step that wrote the names as pending tests cost an agent and an approval, and added nothing to the task file. A new context for each step keeps the step to its own skill. A reply is a claim of the agent that did the work, so a command that runs again is a better gate than an approval of a summary. The user decides where a decision exists: after the review. |
| 24 | `dot-plan` shows a schema for each domain entity that it adds or changes, in the form that the repository uses for its entities, or in JSON Schema (draft 2020-12) when it has none. The user approves the schemas before the steps. The schemas stay in the plan and the roadmap, not in committed files. `dot-plan` and `dot-roadmap` put removal steps first. | A wrong data model costs the most when you find it late. A schema in the form of the repository is the code that lands, with no translation. Removal steps first make the later steps smaller. |
| 25 | `dot-code-review` has two passes: correctness, and maintainability. Each finding gives `file:line` and the smallest fix, and the report ends with a check that would prevent each class of finding. `dot-correct` changes a repeated mistake into architecture, a type, a lint rule, a test, or docs, in that order. | A check that prevents a class of mistakes does more than a fix of one instance. The maintainability pass is vendored, and keeps its direct tone. |
| 26 | Test with `npm test` and `npm run lint:content` only, with no paid model evaluations, now or later. `lint:content` also checks the docs: links and anchors, skill and agent names, the README lists, the counts, and the mechanical part of the writing rule. | Model evaluations cost money on every run, and their results change from run to run. The structural checks find the most frequent drift: a renamed skill, a broken link, or a wrong count. |
| 27 | Keep the README short, with a sequence diagram of the flow. Teach the workflow in ordered pages in `docs/guide/`. This document records decisions, and `CONTRIBUTING.md` tells contributors how to change the repository. | Each page has one reader and one goal. |
| 28 | State each always-on rule as the behavior to follow, and keep the lists of words and patterns to avoid in `lint:content`. State the "repository conventions first" agreement one time, in `core.md`, not in each skill. | A word to avoid that loads on every turn makes the word more available to the model, and a rule that the model cannot follow weakens the other rules. An earlier rule against all `-ing` verb forms was such a rule. A paragraph that 14 skills repeated cost tokens on each run and said what the rules already say. |
| 29 | Warn at the start of a Claude Code session when `~/.claude/rules/dotagents.md` differs from the rules in the plugin. | The plugin updates on every commit, and the rules update only with `dotagents update`, so the skills can name a rule that the installed rules do not have. |

## Install modes

The following table gives the two install modes:

| Mode | Command | Where files go | Visible to Git |
| ------ | --------- | ---------------- | ---------------- |
| Global | `dotagents install` | Agent directories in your home directory | Not applicable |
| Project | `dotagents init` | The repository | Yes, commit them |

In a team repository, use only the global install. It writes nothing to the
repository, so the Git history of the team and your edits to tracked files,
such as `AGENTS.md`, stay as they are.

If the catalog gets project-specific content, such as stack profiles, team
repositories can need a per-repository install again. The options were the
following:

- Git-excluded files next to the tracked files in the repository: removed in
  v0.1, for the reasons in decision 4.
- A per-repository overlay outside the repository, which only Copilot can
  load through `COPILOT_CUSTOM_INSTRUCTIONS_DIRS`.
- A Git clean filter that hides a marked block inside a tracked file.

## Agent targets

The paths agree with the documentation of each coding agent on 2026-10-14.
Agents change these locations often. When they change, update
`src/targets.ts`.

### Skill locations

The following table gives the skill locations:

| Mode | Claude Code | Codex | Copilot |
|------|-------------|-------|---------|
| Global | The dotagents plugin | `~/.agents/skills/` | `~/.agents/skills/` |
| Project | `.claude/skills/` | `.agents/skills/` | `.agents/skills/` |

### Rules locations

The following table gives the rules locations:

| Mode | Claude Code | Codex | Copilot |
| ------ | ------------- | ------- | --------- |
| Global | `~/.claude/rules/dotagents.md` | Block in `~/.codex/AGENTS.md` | Block in `~/.copilot/copilot-instructions.md` |
| Project | `.claude/rules/dotagents.md` | Block in `AGENTS.md` | Block in `AGENTS.md` |

The reasons for these locations are the following:

- Claude Code rules go to `.claude/rules/`, not `CLAUDE.local.md`. When a
  `CLAUDE.local.md` exists, Claude Code stops and does not read the
  `AGENTS.md` of the project. Files in `.claude/rules/` load with both.
- Codex reads at most one instruction file per directory, and
  `AGENTS.override.md` replaces `AGENTS.md`, so Codex rules go in a block.
- A block is the content between `<!-- dotagents:start -->` and
  `<!-- dotagents:end -->`. dotagents never changes text outside the block.
- Copilot rules go in `~/.copilot/copilot-instructions.md`, which VS Code and
  the Copilot CLI load in every session. Files in `~/.copilot/instructions/`
  load only when their `applyTo` pattern matches a file that the agent edits.
- `CODEX_HOME`, `COPILOT_HOME`, `CLAUDE_CONFIG_DIR`, and `XDG_CONFIG_HOME`
  override the default directories.

### Known limitations

- On 2026-11-12, a live run in Claude Code 2.1.322 showed that the `check`
  hook blocks the end of a turn that changed files, and allows the retry.
  The `SubagentStop` run, the warning on the retry, and the rules warning at
  the start of a session have tests, but a live run is not verified.
  The hook runs only an npm script or a `Makefile` target. It is not verified
  that Copilot and Codex load a `hooks.json` that names `SessionStart`,
  `SubagentStart`, and `SubagentStop`.
  Codex 0.160 installs the plugin in the Claude format with no change and
  copies `hooks/`, but a live run in Codex is not verified. A live run in
  Copilot in VS Code, where hooks are in preview, is also not verified.
- On 2026-11-12, `dot-flow` ran live in Claude Code with four steps and an
  approval after each one. A live run of the three steps with verification
  is not verified. The inline mode in Codex
  and Copilot is not verified. It is also not verified that Copilot reads the
  `skills` field of an agent.
- In project mode, Copilot in VS Code reads skills from both `.claude/skills/`
  and `.agents/skills/`, so it can list each skill twice. Claude Code reads
  only the first location and Codex only the second, so dotagents writes
  both. When Copilot also has the dotagents plugin, it can list the skills
  twice in global mode too.
- In project mode, Claude Code reads `AGENTS.md` when the project has no
  `CLAUDE.md`, so it can see the rules twice. The same occurs after
  `scaffold`, whose `CLAUDE.md` imports `AGENTS.md`.

## Commands

The following table gives the commands:

| Command | Description |
| --------- | ------------- |
| `dotagents install` | Install skills and rules globally. |
| `dotagents init` | Install into the current repository. |
| `dotagents scaffold` | Create starter project instructions in the current repository. See "Scaffold". |
| `dotagents update [--global \| --project]` | Apply the current catalog to the installs, and remove skills that left the catalog. |
| `dotagents uninstall [--global \| --project]` | Remove everything that dotagents installed. |
| `dotagents doctor` | Find missing or changed files, Git visibility problems, and problems of a coding agent in the installs. |
| `dotagents list` | List the skills in the catalog. |
| `dotagents self-update` | Run `update` with the latest release from the recorded source. |
| `dotagents check enable`, `dotagents check disable` | Start or stop the plugin `check` hook in the current repository. |

The common options are the following:

- `--agents claude,codex,copilot`: limit the install to some coding agents.
- `--dry-run`: print the changes and write nothing.
- `--force`: overwrite files that you changed or that dotagents does not own.

## Manifest

The manifest records each file and block that dotagents wrote, with a
SHA-256 hash of the content:

- Global installs: `~/.config/dotagents/manifest.json`.
- Project installs: `.dotagents.json` at the repository root, committed with
  the other files.

With the hashes, dotagents can tell its own files from your edits:

- dotagents skips a file that changed after dotagents wrote it, and reports
  it, unless you add `--force`.
- dotagents reports a conflict for a file that exists and that it did not
  write, unless the content is already the same.
- `update` removes the files of skills that left the catalog.

## Content

### Rules

Rules load into every conversation. dotagents joins every file in
`plugin/rules/` into one rules document, with `core.md` first:

| File | Content | Origin |
| ---- | ------- | ------ |
| `core.md` | Working agreements: verification, scope, destructive actions | Original |
| `ponytail.md` | Smallest complete change, reuse before new code, short replies | Vendored from the `AGENTS.md` file in `DietrichGebert/ponytail` (MIT), adapted |
| `comments.md` | Delete code comments by default, and keep only the named exceptions | Original, based on the `pstack` comment policy from `cursor/plugins` (MIT) |
| `code-style.md` | Early returns, and sorted keys in JSON files | Original |
| `writing.md` | Plain, short sentences and no AI tells in all text that agents write | Original, based on ASD-STE100, with patterns condensed from `pstack/skills/unslop` in `cursor/plugins` (MIT) |

Each rule says one thing in one place. For example, `comments.md` owns the
comment guidance, so `ponytail.md` has no comment bullet.

Rules cost tokens on every turn, so CI fails if they are more than the
character budget in `scripts/lint-content.ts`. A vendored rule has a
`NAME.upstream.json` file next to it.

### Skills

The following table gives the origin of each skill:

| Skill | Origin |
| ------- | -------- |
| `dot-plan` | Original, with principles from `pstack` in `cursor/plugins` (MIT) |
| `dot-implement` | Original, based on the Google TypeScript style guide (CC BY 3.0) and `pstack/skills/typescript-best-practices` in `cursor/plugins` (MIT) |
| `dot-testing` | Original, with a principle from `pstack` in `cursor/plugins` (MIT) |
| `dot-code-review` | Original, with a maintainability pass adapted from `cursor-team-kit/skills/thermo-nuclear-code-quality-review` and principles from `pstack` in `cursor/plugins` (MIT) |
| `dot-commit` | Original |
| `dot-flow` | Original |
| `dot-docs-writing` | Original, based on the Google developer documentation style guide (CC BY 4.0) |
| `dot-roadmap` | Original, based on `to-tickets` from `mattpocock/skills` (MIT), with a principle from `pstack` in `cursor/plugins` (MIT) |
| `dot-grilling` | Vendored from `mattpocock/skills` (MIT), adapted |
| `dot-writing-for-agents` | Vendored from `mattpocock/skills` (MIT), adapted |
| `dot-debug` | Vendored from `mattpocock/skills` as `diagnosing-bugs` (MIT), renamed and adapted, with principles from `pstack` in `cursor/plugins` (MIT) |
| `dot-handoff` | Vendored from `mattpocock/skills` (MIT), adapted |
| `dot-comments` | Vendored from `pstack/skills/no-comments` in `cursor/plugins` (MIT), adapted |
| `dot-correct` | Vendored from `pstack/skills/correct` in `cursor/plugins` (MIT), adapted, with a principle from `pstack` |

Each vendored skill has an `UPSTREAM.json` file with the source repository,
path, commit, license, and a summary of local changes. dotagents does not
install this file. `npm run check-upstream` shows the upstream changes after
the recorded commit.

### Agents

The agents are in `plugin/agents/`, and only the plugin ships them. Each
agent preloads one skill, as the following table shows. See decision 21.

| Agent | Skill | Step of `dot-flow` |
| ----- | ----- | ------------------ |
| `dot-tester` | `dot-testing` | Tests |
| `dot-implementer` | `dot-implement` | Production code |
| `dot-reviewer` | `dot-code-review` | Review |

### Scaffold

`plugin/scaffold/` has the files that `dotagents scaffold` copies to the
repository root. Each template ends in `.tmpl`, which the command removes.
Thus agents and Git in the dotagents repository do not load them as its own
`AGENTS.md`, `CLAUDE.md`, or `.gitattributes`.

- `AGENTS.md` is the single source of truth for every coding agent.
  `CLAUDE.md` only imports it, because Claude Code reads `CLAUDE.md` instead
  of `AGENTS.md` when both exist.
- `AGENTS.md` covers what a new repository needs, and asks agents to record
  each project decision when it is made. It leaves commands to their source
  of truth, such as `package.json`, and names the `check` script for the
  plugin hook.
- `AGENTS.md` does not repeat the rules: collaborators get them through
  `init`, and the maintainer through the global install.
- With `--agents`, the command skips `CLAUDE.md` and `.claude/` when you do
  not select Claude Code.

## Distribution

### Plugin

`plugin/.claude-plugin/plugin.json` makes `plugin/` a Claude Code plugin, and
`.claude-plugin/marketplace.json` lists it. Claude Code finds `skills/`,
`agents/`, and `hooks/hooks.json` by default, so `plugin.json` names none of
them. The CLI reads only `rules/`, `skills/`, and `scaffold/` from `plugin/`,
so the agents reach users only through the plugin.

`plugin.json` has no `version`. With a fixed version, Claude Code skips
updates. Without one, it versions the plugin by commit, so every push reaches
users. `npm run lint:content` fails when you add a version. The npm package
does not include the marketplace file: Claude Code installs the plugin from
Git.

### npm

dotagents is on npm as `@igorlau/dotagents`. The following commands run the
latest release and a pinned release:

```bash
# The latest release
npx --yes @igorlau/dotagents install

# A pinned release
npx --yes @igorlau/dotagents@1.0.7 install
```

The release workflow runs on every push to `main`. If the checks pass, the
workflow does these steps:

1. It sets the version to `MAJOR.MINOR.RUN_NUMBER`.
1. It stages the package on npm with trusted publishing.
1. It tags the release commit.
1. It attaches the `npm pack` tarball to a GitHub release, as an offline
   fallback.

The trusted publisher can only stage, so a version reaches users only after
the maintainer approves it on npmjs.com, under **Staged Packages**, with
two-factor authentication.

An install from Git, such as `npx github:igorlau/dotagents`, still works for
tests of unreleased commits. npm runs the `prepare` script, which compiles
the TypeScript and records the commit in `dist/build-info.json`. Thus these
builds report versions such as `1.0.0-dev+30d0533`.

## Tests

- `npm test` runs the CLI against temporary home directories and Git
  repositories. The tests cover block merges, global installs that do not
  change repositories, conflicts, local changes, removal of old skills,
  uninstall, dry runs, and the `check` and rules hooks.
- `npm run lint:content` checks the following:
  - Skill and agent frontmatter, the skills that each agent preloads, and
    that `agents/openai.yaml` agrees with `disable-model-invocation`.
  - The rules and `SKILL.md` character budgets, and upstream metadata files.
  - The plugin and marketplace manifests.
  - Relative links and their anchors in `plugin/` and in the docs.
  - In `README.md`, `SPEC.md`, `CONTRIBUTING.md`, and `docs/`: each `dot-*`
    name is a skill or an agent, and each count of skills or agents is
    correct.
  - The README lists every skill and agent.
  - In the rules, the skills, the agents, and the docs: no em dash, arrow,
    contraction, or word that the writing rule replaces.

## Future work

- Profiles, such as `core`, `frontend`, and `backend`, when the catalog grows.
- Rules injection through a SessionStart hook in the plugin, when hooks in
  VS Code leave preview. The plugin could then ship the rules, and the CLI
  would only install skills for Codex and Copilot.
