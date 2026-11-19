---
name: dot-security-changes
description: Check the uncommitted changes of the working tree, or the changes between two trees, for security problems. Use when the user or an agent asks for a security check of the current changes before a commit.
---

# Security check of changes

Find vulnerabilities that the diff adds or exposes. This skill uses the rules of [`dot-security-audit`](../dot-security-audit/SKILL.md) for a boundary, a status, and a severity. It differs in the target, the references, and the report. For a whole codebase, use `dot-security-audit` instead.

## 1. Pick the target

- **Working tree** (default): the working tree against `HEAD`. The diff is `git diff HEAD`, and each untracked file that `git status --porcelain` lists is a new file. Git ignores the files that `.gitignore` names, so they stay out.
- **Tree range**: `<old-tree> <new-tree>`, when the caller gives one. The diff is `git diff <old-tree> <new-tree>`.

Read each changed file from the working tree, or with `git show <tree>:<path>` for a tree range. For a deleted file, read it from `HEAD` or from the old tree.

State the target in one line: `working tree vs HEAD (<short sha>)`, or `<old-tree> .. <new-tree>`.

Done when you have the list of changed files. When there are none, stop and tell the user.

## 2. Map the topics

For each changed hunk, name the topics that it touches. Read the reference of a topic only when a hunk touches that topic. Read no other reference.

| Topic of the diff | Read |
| ----------------- | ---- |
| SQL or shell strings, templates, file paths, redirects, URL fetches, deserialization, archives, input parsing, permission checks, secrets, tokens, randomness, or crypto | [`ATTACK-CLASSES.md`](../dot-security-audit/references/ATTACK-CLASSES.md) |
| HTTP handlers, middleware, sessions, cookies, CSRF, JWT, OAuth, SAML, MFA, passkeys, API keys, or mTLS | [`WEB-PROTOCOL-AND-AUTH.md`](../dot-security-audit/references/WEB-PROTOCOL-AND-AUTH.md) |
| Browser code, DOM rendering, a webview, a browser extension, a service worker, CORS, or WebSockets | [`CLIENT-SIDE.md`](../dot-security-audit/references/CLIENT-SIDE.md) |
| Prompts, retrieval, agent memory, tool calls, or an MCP server or client | [`AI-AND-LLM.md`](../dot-security-audit/references/AI-AND-LLM.md) |
| C, C++, or unsafe Rust, parsers of binary data, FFI, or loaders | [`MEMORY-SAFETY-AND-BINARY.md`](../dot-security-audit/references/MEMORY-SAFETY-AND-BINARY.md) |
| Dependency files, CI workflows, signing, release scripts, updates, or plugins | [`SUPPLY-CHAIN-AND-RELEASE.md`](../dot-security-audit/references/SUPPLY-CHAIN-AND-RELEASE.md) |
| IAM, infrastructure as code, containers, Kubernetes, serverless, or ingress | [`CLOUD-AND-DEPLOYMENT.md`](../dot-security-audit/references/CLOUD-AND-DEPLOYMENT.md) |
| gRPC, GraphQL, custom protocols, queues, brokers, or webhooks | [`PROTOCOLS-RPC-AND-MESSAGING.md`](../dot-security-audit/references/PROTOCOLS-RPC-AND-MESSAGING.md) |
| Loops, uploads, queries, or jobs that run untrusted work on shared CPU, memory, disk, workers, or spend | [`RESOURCE-EXHAUSTION-AND-AVAILABILITY.md`](../dot-security-audit/references/RESOURCE-EXHAUSTION-AND-AVAILABILITY.md) |
| Tenant scoping, caches, search, exports, backups, migrations, or deletion | [`DATA-ISOLATION-AND-LIFECYCLE.md`](../dot-security-audit/references/DATA-ISOLATION-AND-LIFECYCLE.md) |
| Native apps, deep links, webview bridges, local daemons, or sockets | [`DESKTOP-MOBILE-AND-LOCAL-IPC.md`](../dot-security-audit/references/DESKTOP-MOBILE-AND-LOCAL-IPC.md) |

When a hunk touches no topic, read no reference. Tell the user which references you read.

## 3. Hunt

For each changed hunk, trace untrusted input to the dangerous sink, and check that each changed control checks the right permission on the right resource. Read the whole function and its callers: a hunk that looks safe can break a control elsewhere. Also check the code that the diff deletes. A removed check, validation, or escape is a candidate.

Write each candidate as a boundary hypothesis. Then apply the rules of "Rules for every finding" in [`dot-security-audit`](../dot-security-audit/SKILL.md#rules-for-every-finding), and drop each candidate that fails them. Do not report a problem in code that the diff does not change or expose. Run no target code unless the sandbox rules of `dot-security-audit` hold.

Done when you re-read the source of each candidate, searched for a control that stops it, and set its status.

## 4. Report

Give the findings from most to least severe, in the format of [`dot-code-review`](../dot-code-review/SKILL.md#5-report), which accepts only `high`, `medium`, and `low`. Use the **Scenario** line for the boundary: the principal, the input, and the result. Use the severity anchors of `dot-security-audit`, and give only a `confirmed` finding a severity. Map `critical` to `high` and `informational` to `low`. Put a `needs_validation` finding after the `confirmed` findings, and give it its missing fact and a safe check in place of a severity. Add the smallest fix, and a regression test idea.

```markdown
### <high | medium | low> <one-line summary>
`path/to/file.ts:42` (security)
**Scenario:** <principal and input>, then <result>
**Fix:** <smallest change that enforces the invariant at the last trusted decision point>
```

```markdown
### Needs validation: <one-line summary>
`path/to/file.ts:42` (security)
**Scenario:** <principal and input>, then <result>
**Missing fact:** <the one fact that blocks the proof>
**Check:** <safe way for the owner to check it>
```

If you find nothing, say that the check found no security problems, and list the topics that you checked. Edit no file.
