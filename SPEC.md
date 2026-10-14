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
- Commands, subagents, hooks, and MCP servers. They aren't portable across
  the three agents, so each one needs its own adapter.

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
| 10 | Keep the repository private and distribute it through Git, not npm. | npm private packages need a paid plan. `npx` installs directly from a Git URL. |
| 11 | Use a read-only deploy key on machines without access to the personal GitHub account. | Enterprise Managed User (EMU) accounts can't access repositories outside the enterprise. |
| 12 | Test the CLI against temporary Git repositories and lint the content in CI. | The main risk is changing files in a team repository. |
| 13 | Ship the ponytail ruleset as an always-on rule, not as a skill. | Smallest-change discipline must apply to every interaction, and it reduces generated code and tokens. |
| 14 | Add an always-on rule for code comments. | Agents tend to write comments that restate code or narrate changes. |

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
| Global | `~/.claude/skills/` | `~/.agents/skills/` | `~/.agents/skills/` |
| Project | `.claude/skills/` | `.agents/skills/` | `.agents/skills/` |

### Rules

| Mode | Claude Code | Codex | Copilot |
| ------ | ------------- | ------- | --------- |
| Global | `~/.claude/rules/dotagents.md` | Block in `~/.codex/AGENTS.md` | `~/.copilot/instructions/dotagents.instructions.md` |
| Project | `.claude/rules/dotagents.md` | Block in `AGENTS.md` | Block in `AGENTS.md` |

Notes on these choices:

- Claude Code rules go to `.claude/rules/`, not `CLAUDE.local.md`. When a
  `CLAUDE.local.md` exists, Claude Code stops reading the project's
  `AGENTS.md`. Files in `.claude/rules/` load alongside both.
- Codex reads at most one instruction file per directory, and
  `AGENTS.override.md` replaces `AGENTS.md`, so Codex rules go in a block.
- A block is the content between `<!-- dotagents:start -->` and
  `<!-- dotagents:end -->`. dotagents never changes text outside the block.
- `CODEX_HOME`, `COPILOT_HOME`, `CLAUDE_CONFIG_DIR`, and `XDG_CONFIG_HOME`
  override the default directories.

### Known limitations

- In project mode, Copilot reads skills from both
  `.claude/skills/` and `.agents/skills/`, so it can list each skill twice.
- In project mode, Claude Code reads `AGENTS.md` when the project has no
  `CLAUDE.md`, so it can see the rules twice.
- Personal instructions for Copilot in VS Code use a different location than
  the Copilot CLI. v1 targets the Copilot CLI location.

## Commands

| Command | Description |
| --------- | ------------- |
| `dotagents install` | Install skills and rules globally. |
| `dotagents init` | Install into the current repository. |
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
`content/rules/` into one rules document, with `core.md` first:

| File | Content | Origin |
| ---- | ------- | ------ |
| `core.md` | Working agreements: verification, scope, destructive actions | Original |
| `ponytail.md` | Smallest complete change, reuse before writing, concise replies | Vendored from the `AGENTS.md` file in `DietrichGebert/ponytail` (MIT), adapted |
| `comments.md` | When and how to write code comments | Original |

Each rule says one thing in one place. For example, `comments.md` owns
comment guidance, so the comment bullet was removed from `ponytail.md`.

Rules cost tokens on every turn, so CI fails if they exceed the character
budget in `scripts/lint-content.ts`. A vendored rule has a
`NAME.upstream.json` file next to it.

### Skills

| Skill | Origin |
| ------- | -------- |
| `plan` | Original |
| `code-review` | Original |
| `commit` | Original |
| `docs-writing` | Original, based on the Google developer documentation style guide (CC BY 4.0) |
| `grill-me` | Vendored from `mattpocock/skills` (MIT), adapted |
| `grilling` | Vendored from `mattpocock/skills` (MIT) |
| `writing-for-agents` | Vendored from `mattpocock/skills` (MIT) |
| `debug` | Vendored from `mattpocock/skills` as `diagnosing-bugs` (MIT), renamed |
| `handoff` | Vendored from `mattpocock/skills` (MIT) |

Each vendored skill has an `UPSTREAM.json` file with the source repository,
path, commit, license, and a summary of local changes. dotagents doesn't
install this file. `npm run check-upstream` shows what changed upstream since
the recorded commit.

## Distribution

The repository is private, so dotagents installs from Git:

```bash
# Personal machines, using your normal GitHub credentials
npx github:igorlau/dotagents install

# A pinned release
npx github:igorlau/dotagents#v0.1.42 install

# Machines with only an EMU account, using a deploy key
npx git+ssh://git@github-dotagents/igorlau/dotagents.git install
```

npm runs the `prepare` script when it installs from Git, which compiles the
TypeScript and records the commit in `dist/build-info.json`. Release tags
report their version, such as `0.1.2`. Builds from a branch report the
development version and the commit, such as `0.1.0-dev+30d0533`. The release
workflow runs on every push to `main`. If the tests
pass, it tags the commit and attaches an `npm pack` tarball to a GitHub
release as an offline fallback.

For the deploy key setup, see [`docs/deploy-key.md`](docs/deploy-key.md).

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
- Copilot personal instructions for VS Code.
- Skill evaluations.
