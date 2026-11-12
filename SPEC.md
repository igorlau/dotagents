# dotagents specification

dotagents is a personal CLI that installs a curated set of agent skills and
rules into Claude Code, OpenAI Codex, and GitHub Copilot. It makes a good
AI workflow available in every project, including projects that belong to
teams with their own conventions.

This document records the design decisions and the reasons behind them.

## Goals

- Keep one source of truth for skills and rules, and adapt it to each agent.
- Work in personal projects and in team projects without changing what the
  team sees in Git, unless you ask for it.
- Keep installs reversible: every file that dotagents writes is tracked and
  can be updated or removed without touching anything else.

## Non-goals

- A general-purpose package manager for third-party skills. Use
  [`npx skills`](https://skills.sh) for that.
- Commands, subagents, hooks, and MCP servers in the CLI. They aren't
  portable across the three agents, so each one needs its own adapter. The
  plugin ships agents and hooks, because Claude Code and Copilot load the
  same plugin format.

## Decisions

The following table lists each decision and the reason for it:

| # | Decision | Reason |
| --- | ---------- | -------- |
| 1 | Support Claude Code, Codex, and GitHub Copilot. | These are the agents in use across personal and team projects. |
| 2 | Support two install modes: global (default) and project. Team repositories use only the global install. | The default must never change a team repository. |
| 3 | Manage only skills and rules in v1. | Skills use the same `SKILL.md` format in all three agents. Rules compile from one source. |
| 4 | Drop the local-only mode, which wrote Git-excluded files into team repositories. | It installed the same content as the global install, and its files still affected tools such as `git clean`, search, and Copilot, which listed skills twice. |
| 5 | Write the CLI in TypeScript and run it with `npx`. | Node is on almost every development machine, and no install step is needed. |
| 6 | Bundle the content with the CLI, release on every merge, and track installs in a manifest. | One version describes both code and content. The manifest makes update and uninstall safe. |
| 7 | Install the whole catalog. | The catalog is small. Revisit with profiles when it grows. The manifest already records skills by name. |
| 8 | Write skills and rules in English. | Models follow English instructions slightly more precisely, and vendored skills are in English. |
| 9 | Vendor third-party skills and record their origin. | Upstream renames or rewrites can't break installs. A script shows upstream changes on demand. |
| 10 | Publish a public npm package, `@igorlau/dotagents`, from a public repository under the MIT license. | Any machine can install without Git credentials, including machines with only an Enterprise Managed User (EMU) account. The content is generic, so it can be public. The unscoped `dotagents` name belongs to another project. |
| 11 | Stage releases from GitHub Actions with npm trusted publishing, and approve each one on npmjs.com. | No npm token to store or leak, npm records provenance for each version, and nothing reaches users without the maintainer's security key. Earlier versions installed from Git, with a deploy key for EMU machines. |
| 12 | Test the CLI against temporary Git repositories and lint the content in CI. | The main risk is changing files in a team repository. |
| 13 | Ship the ponytail ruleset as an always-on rule, not as a skill. | Smallest-change discipline must apply to every interaction, and it reduces generated code and tokens. |
| 14 | Add an always-on rule for code comments. | Agents tend to write comments that restate code or narrate changes. |
| 15 | Prefix every skill name with `dot-`, such as `dot-plan`. | Claude Code runs a personal skill over a project skill with the same name, so an unprefixed dotagents skill would hide a repository's own skill. The prefix also tells the skills apart in the `/` menu. Rules need no prefix: they live in dotagents-named files and blocks. |
| 16 | Add a `scaffold` command that creates starter project instructions once, and leaves them out of the manifest. | A new repository needs instructions written for the project, and those belong to the repository: `update` must never rewrite them. Write-once files also keep the command safe in a repository that already has instructions. |
| 17 | Keep the catalog in `plugin/`, which is also a Claude Code plugin, and list it in a marketplace at the repository root. | One source serves the CLI and the plugin. Adding the repository as a marketplace needs no registry and costs nothing. |
| 18 | Ship one end-of-turn hook in the plugin that runs the repository's `check` script (type check and lint, not tests) and makes the agent continue when it fails. | Claude Code, Copilot, and Codex all load the plugin's `hooks/hooks.json`, and Claude Code, Copilot CLI, and Codex document a `block` decision, so one script covers the three agents. Tests stay out because `dot-implement` can leave expected test failures for `dot-testing`. The hook allows the second stop, so it can't loop. It runs the check only when the turn changed the working tree, compared with a snapshot taken when the prompt arrived, so a turn that changes nothing never makes the agent fix existing problems or runs repository code. It acts only in repositories listed in `checkRepos` in the user's `config.json`, which `dotagents check enable` sets: the `check` script is the repository's own code, and an opt-in inside the repository would let an untrusted one enable itself. |
| 19 | The global CLI install writes rules for all three agents and skills only for Codex and Copilot. Claude Code gets the skills, agents, and hooks from the plugin. | Plugins can't ship always-on rules, and the CLI can't install agents and hooks safely. `update` removes the Claude Code skills that earlier versions installed, and `doctor` warns about leftover copies. Project installs still write `.claude/skills/`, so collaborators don't need the plugin. |
| 20 | Add an always-on writing rule, based on ASD-STE100, for all text that agents write: chat, CLI output, plans and reports, commits, pull requests, and docs. It takes precedence over the Google style in `dot-docs-writing`. | Short sentences with a controlled vocabulary are easier to read for a reader in a second language and for translation tools. One rule for all text replaces the prose rules that `dot-docs-writing` kept only for docs. The rules are in our own words, because the ASD-STE100 dictionary is copyrighted. |

## Install modes

| Mode | Command | Where files go | Visible to Git |
| ------ | --------- | ---------------- | ---------------- |
| Global | `dotagents install` | User-level agent directories in your home directory | Not applicable |
| Project | `dotagents init` | The repository | Yes, commit them |

In a team repository, use only the global install. It writes nothing to the
repository, so the team's Git history and your intentional edits to tracked
files, such as `AGENTS.md`, are unaffected.

If the catalog gains project-specific content, such as stack profiles, team
repositories might need a per-repository install again. The options
considered were the following:

- Git-excluded sibling files in the repository: removed in v0.1, for the
  reasons in decision 4.
- A per-repository overlay outside the repository, which only Copilot can
  load through `COPILOT_CUSTOM_INSTRUCTIONS_DIRS`.
- A Git clean filter that hides a marked block inside a tracked file.

## Agent targets

Paths were verified against each agent's documentation on 2026-10-14. Agents
change these locations often. When they change, update `src/targets.ts`.

### Skills

| Mode | Claude Code | Codex | Copilot |
|------|-------------|-------|---------|
| Global | The dotagents plugin | `~/.agents/skills/` | `~/.agents/skills/` |
| Project | `.claude/skills/` | `.agents/skills/` | `.agents/skills/` |

### Rules

| Mode | Claude Code | Codex | Copilot |
| ------ | ------------- | ------- | --------- |
| Global | `~/.claude/rules/dotagents.md` | Block in `~/.codex/AGENTS.md` | Block in `~/.copilot/copilot-instructions.md` |
| Project | `.claude/rules/dotagents.md` | Block in `AGENTS.md` | Block in `AGENTS.md` |

Notes on these choices:

- Claude Code rules go to `.claude/rules/`, not `CLAUDE.local.md`. When a
  `CLAUDE.local.md` exists, Claude Code stops reading the project's
  `AGENTS.md`. Files in `.claude/rules/` load alongside both.
- Codex reads at most one instruction file per directory, and
  `AGENTS.override.md` replaces `AGENTS.md`, so Codex rules go in a block.
- A block is the content between `<!-- dotagents:start -->` and
  `<!-- dotagents:end -->`. dotagents never changes text outside the block.
- Copilot rules go in `~/.copilot/copilot-instructions.md`, which VS Code and
  the Copilot CLI load in every session. Files in `~/.copilot/instructions/`
  load only when their `applyTo` pattern matches a file being edited.
- `CODEX_HOME`, `COPILOT_HOME`, `CLAUDE_CONFIG_DIR`, and `XDG_CONFIG_HOME`
  override the default directories.

### Known limitations

- On 2026-11-12, a live run in Claude Code 2.1.322 confirmed that the `check`
  hook blocks the end of a turn that changed files, and allows the retry.
  Codex 0.160 installs the Claude-format plugin unchanged and copies
  `hooks/`, but a live run in Codex isn't verified. Neither is Copilot in
  VS Code, where hooks are in preview.
- In project mode, Copilot in VS Code reads skills from both `.claude/skills/`
  and `.agents/skills/`, so it can list each skill twice. Claude Code reads
  only the first location and Codex only the second, so dotagents writes
  both. When Copilot also has the dotagents plugin, it can list the skills
  twice in global mode too.
- In project mode, Claude Code reads `AGENTS.md` when the project has no
  `CLAUDE.md`, so it can see the rules twice.
  The same happens after `scaffold`, whose `CLAUDE.md` imports `AGENTS.md`.

## Commands

| Command | Description |
| --------- | ------------- |
| `dotagents install` | Install skills and rules globally. |
| `dotagents init` | Install into the current repository. |
| `dotagents scaffold` | Create starter project instructions in the current repository. See "Scaffold". |
| `dotagents update [--global \| --project]` | Reapply the current catalog to existing installs and remove skills that left the catalog. |
| `dotagents uninstall [--global \| --project]` | Remove everything that dotagents installed. |
| `dotagents doctor` | Check installs for missing or modified files, Git visibility, and agent-specific issues. |
| `dotagents list` | List the skills in the catalog. |
| `dotagents self-update` | Run `update` with the latest release from the recorded source. |

Common options:

- `--agents claude,codex,copilot`: limit the install to some agents.
- `--dry-run`: print the changes without writing them.
- `--force`: overwrite files that were modified locally or that dotagents
  doesn't own.

## Manifest

The manifest records each file and block that dotagents wrote, with a
SHA-256 hash of the content:

- Global installs: `~/.config/dotagents/manifest.json`.
- Project installs: `.dotagents.json` at the repository root, committed with
  the other files.

The hashes let dotagents tell its own files apart from your edits:

- dotagents skips a file that changed since it was written and reports it,
  unless you pass `--force`.
- dotagents reports a conflict for an existing file that it didn't write,
  unless the content is already identical.
- `update` removes files from skills that left the catalog.

## Content

### Rules

Rules load into every conversation. dotagents joins every file in
`plugin/rules/` into one rules document, with `core.md` first:

| File | Content | Origin |
| ---- | ------- | ------ |
| `core.md` | Working agreements: verification, scope, destructive actions | Original |
| `ponytail.md` | Smallest complete change, reuse before writing, concise replies | Vendored from the `AGENTS.md` file in `DietrichGebert/ponytail` (MIT), adapted |
| `comments.md` | Delete code comments by default, and keep only the named exceptions | Original, based on the `pstack` comment policy from `cursor/plugins` (MIT) |
| `writing.md` | Plain, short sentences and no AI tells in all text that agents write | Original, based on ASD-STE100, with patterns condensed from `pstack/skills/unslop` in `cursor/plugins` (MIT) |

Each rule says one thing in one place. For example, `comments.md` owns
comment guidance, so the comment bullet was removed from `ponytail.md`.

Rules cost tokens on every turn, so CI fails if they exceed the character
budget in `scripts/lint-content.ts`. A vendored rule has a
`NAME.upstream.json` file next to it.

### Skills

| Skill | Origin |
| ------- | -------- |
| `dot-plan` | Original, with principles from `pstack` in `cursor/plugins` (MIT) |
| `dot-implement` | Original, based on the Google TypeScript style guide (CC BY 3.0) and `pstack/skills/typescript-best-practices` in `cursor/plugins` (MIT) |
| `dot-testing` | Original, with a principle from `pstack` in `cursor/plugins` (MIT) |
| `dot-code-review` | Original, with a maintainability pass adapted from `cursor-team-kit/skills/thermo-nuclear-code-quality-review` and principles from `pstack` in `cursor/plugins` (MIT) |
| `dot-commit` | Original |
| `dot-docs-writing` | Original, based on the Google developer documentation style guide (CC BY 4.0) |
| `dot-roadmap` | Original, based on `to-tickets` from `mattpocock/skills` (MIT), with a principle from `pstack` in `cursor/plugins` (MIT) |
| `dot-grill-me` | Vendored from `mattpocock/skills` (MIT), adapted |
| `dot-grilling` | Vendored from `mattpocock/skills` (MIT) |
| `dot-writing-for-agents` | Vendored from `mattpocock/skills` (MIT) |
| `dot-debug` | Vendored from `mattpocock/skills` as `diagnosing-bugs` (MIT), renamed |
| `dot-handoff` | Vendored from `mattpocock/skills` (MIT) |
| `dot-comments` | Vendored from `pstack/skills/no-comments` in `cursor/plugins` (MIT), adapted |
| `dot-correct` | Vendored from `pstack/skills/correct` in `cursor/plugins` (MIT), adapted, with a principle from `pstack` |

Each vendored skill has an `UPSTREAM.json` file with the source repository,
path, commit, license, and a summary of local changes. dotagents doesn't
install this file. `npm run check-upstream` shows what changed upstream since
the recorded commit.

### Scaffold

`plugin/scaffold/` holds the files that `dotagents scaffold` copies to the
repository root. Each template ends in `.tmpl`, which the command strips, so
agents and Git working in the dotagents repository don't load them as its own
`AGENTS.md`, `CLAUDE.md`, or `.gitattributes`.

- `AGENTS.md` is the single source of truth for every agent. `CLAUDE.md` only
  imports it, because Claude Code reads `CLAUDE.md` instead of `AGENTS.md`
  when both exist.
- `AGENTS.md` covers what a new repository already needs and asks agents to
  record each project decision as it lands. It leaves commands to their
  source of truth, such as `package.json`.
- The rules don't repeat in `AGENTS.md`: collaborators get them through
  `init` and the maintainer through the global install.
- With `--agents`, the command skips `CLAUDE.md` and `.claude/` when Claude
  Code isn't selected.

## Distribution

### Plugin

`plugin/.claude-plugin/plugin.json` makes `plugin/` a Claude Code plugin, and
`.claude-plugin/marketplace.json` lists it. The CLI reads only `rules/`,
`skills/`, and `scaffold/` from `plugin/`. `plugin.json` has no `version`:
with a fixed version, Claude Code skips updates, and without one it versions
the plugin by commit. `npm run lint:content` fails when a version is added.
The npm package doesn't include the marketplace file: Claude Code installs the
plugin from Git.

### npm

dotagents is published to npm as `@igorlau/dotagents`:

```bash
# The latest release
npx --yes @igorlau/dotagents install

# A pinned release
npx --yes @igorlau/dotagents@1.0.7 install
```

The release workflow runs on every push to `main`. If the checks pass, it
sets the version to `MAJOR.MINOR.RUN_NUMBER`, stages the package on npm with
trusted publishing, tags the release commit, and attaches the `npm pack`
tarball to a GitHub release as an offline fallback. The trusted publisher
allows only staging, so a version reaches users only after the maintainer
approves it on npmjs.com, under **Staged Packages**, with two-factor
authentication.

Installing from Git, such as `npx github:igorlau/dotagents`, still works for
testing unreleased commits. npm runs the `prepare` script, which compiles the
TypeScript and records the commit in `dist/build-info.json`, so these builds
report versions such as `1.0.0-dev+30d0533`.

## Testing

- `npm test` runs the CLI against temporary home directories and Git
  repositories. The tests cover block merging, global installs that leave
  repositories untouched, conflicts, local modifications, stale skill
  removal, uninstall, and dry runs.
- `npm run lint:content` checks skill frontmatter, relative links, the rules
  character budget, and upstream metadata files.
- Evaluations that run skills against a model are out of scope for v1.

## Future work

- Profiles, such as `core`, `frontend`, and `backend`, when the catalog grows.
- Skill evaluations.
