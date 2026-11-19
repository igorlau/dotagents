---
name: dot-security-audit
description: Security guidance and a vulnerability audit of a whole codebase, a branch, or a path. Use for security questions, focused reviews, vulnerability research, security audits, or pen tests. Run the full audit only when the user asks to audit the codebase or asks for a full or end-to-end security review. Do not use it for the uncommitted changes: use `dot-security-changes`.
---

# Security audit

Find vulnerabilities that cross a real trust boundary. Give the owner the source evidence, the priority, and the smallest fix. This is a defensive, source-first workflow. A candidate with no affected principal, resource, or security result is not a finding.

## Pick the mode

- **Guidance mode** (default): for a security question, a focused review, or the triage of one finding. Use only the parts that apply, and write no file.
- **Full audit mode**: when the user asks to audit or pen-test a codebase, or asks for a full, comprehensive, or end-to-end security review. Follow "Full audit" below.

When the request fits both, ask one question before you write a file.

## Run code safely

Source reading is read-only. Run a build, a test, or a fixture of the target only inside a sandbox that has all of these controls:

- No external network. Use an isolated loopback only when the check needs local traffic.
- An empty environment, with only the variables that you allow, and a temporary `HOME`.
- A read-only target. The process writes only to a scratch directory.
- Low limits for CPU, memory, processes, disk, and time.

When the sandbox lacks a control, do not run the target code. Report the check as `needs_validation`, and give a safe plan to run it.

Use dummy principals and secrets. Do not probe a deployed endpoint, a shared service, a production identity, or another person's data. Do not install dependencies. Stop at the least effect that proves the defect: a wrong return value, an unauthorized dummy record, or a sanitizer finding.

## Rules for every finding

- **Boundary and result.** Name the lower-trust principal, the input or action, the control that should stop it, the boundary that it crosses, and the concrete result. A missing best practice, a guess about the deployment, a generic parser crash, or an effect on the caller only is not a finding.
- **Source visibility.** A proxy, an identity policy, a provider setting, or a header can stop an attack. When the repository does not show it, do not assume that it exists or that it is missing. Mark the finding `needs_validation`, with the missing fact and a safe way for the owner to check it.
- **Status.** `confirmed` means that the source and a bounded check show the whole path and the result. `needs_validation` means that one named fact blocks the proof. Only `confirmed` has a severity.
- **Severity.** Calibrate with these anchors, and never go above the demonstrated impact:
  - `critical`: an unauthenticated actor gets code execution, full data-store access, or takeover of any account.
  - `high`: an actor fully defeats an explicit control with real consequences, such as an authentication bypass, a read or write across tenants, or stored script that runs for other users.
  - `medium`: a real violation with a small blast radius or uncommon preconditions.
  - `low`: disclosure of non-secret internals, or an effect that needs long effort for little gain.
  - `informational`: a confirmed observation with minimal impact, useful as a step in a larger finding.
- **Fix.** Name the invariant that the code must enforce, and the narrowest change that enforces it at the last trusted decision point. Add a regression test idea. Do not edit the target source.

## Full audit

The target is the whole codebase of the current branch, or the path that the user gives. Work alone, in this order, and do not skip a step.

1. **Map.** Read the repository: its entry points, trust boundaries, authentication, data stores, build and release files, and dependencies. Run `git rev-parse HEAD` and `git status --short`, and note whether the worktree is dirty. List the components in scope, and state what is out of scope.
2. **Choose references.** For each topic in the table below that the map shows, read the reference now.
3. **Hunt.** For each component and each attack class that applies, trace untrusted input to the dangerous sink, and check that each control checks the right permission on the right resource. Write each candidate as a boundary hypothesis. Drop a candidate that fails the rules above.
4. **Validate.** Re-read the source of each candidate, as if you did not write it. Search for a control that stops it. Run a bounded check when the sandbox allows. Set the status, and the severity for `confirmed`.
5. **Report.** Write `.tmp/security-audit/REPORT.md` at the repository root. First run `git check-ignore -q .tmp`: if Git does not ignore `.tmp`, stop and tell the user. Do not edit `.gitignore`.

The report has these sections:

- **Scope and coverage:** the commit, the dirty state, the path, the components that you read, and the attack classes that you checked. State that the audit is one pass, and that a run on a path is partial.
- **Findings:** the `confirmed` findings, sorted by severity. Give each one a title, the `file:line`, the severity, the boundary (principal, input, control, crossing, result), the evidence, and the fix.
- **Needs validation:** each blocked finding with the missing fact and the safe check.
- **Rejected:** the candidates that you dropped, with the reason, so that the next run does not repeat them.

Tell the user the path of the report and the count of findings for each severity.

## References

Each file lists attack classes for one kind of target. Read a file only when the map shows its topic.

| Read | When the target has |
| ---- | ------------------- |
| [`ATTACK-CLASSES.md`](references/ATTACK-CLASSES.md) | Any target. Read it in step 2. |
| [`WEB-PROTOCOL-AND-AUTH.md`](references/WEB-PROTOCOL-AND-AUTH.md) | HTTP servers, proxies, sessions, CSRF, JWT, OAuth, SAML, MFA, passkeys, API keys, or mTLS. |
| [`CLIENT-SIDE.md`](references/CLIENT-SIDE.md) | A single-page app, a browser extension, a webview, a service worker, CORS, WebSockets, or DOM rendering. |
| [`AI-AND-LLM.md`](references/AI-AND-LLM.md) | Prompts, retrieval, agent memory, tool calls, or an MCP server or client. |
| [`MEMORY-SAFETY-AND-BINARY.md`](references/MEMORY-SAFETY-AND-BINARY.md) | C, C++, or unsafe Rust, parsers, FFI, loaders, or kernel code. |
| [`SUPPLY-CHAIN-AND-RELEASE.md`](references/SUPPLY-CHAIN-AND-RELEASE.md) | Dependency resolution, CI, signing, release, updates, or plugins. |
| [`CLOUD-AND-DEPLOYMENT.md`](references/CLOUD-AND-DEPLOYMENT.md) | IAM, infrastructure as code, containers, Kubernetes, serverless, or ingress. |
| [`PROTOCOLS-RPC-AND-MESSAGING.md`](references/PROTOCOLS-RPC-AND-MESSAGING.md) | gRPC, GraphQL, custom protocols, queues, brokers, or webhooks. |
| [`RESOURCE-EXHAUSTION-AND-AVAILABILITY.md`](references/RESOURCE-EXHAUSTION-AND-AVAILABILITY.md) | Untrusted work that uses shared CPU, memory, disk, workers, quotas, or spend. |
| [`DATA-ISOLATION-AND-LIFECYCLE.md`](references/DATA-ISOLATION-AND-LIFECYCLE.md) | Multiple tenants, caches, search, exports, backups, migrations, or deletion. |
| [`DESKTOP-MOBILE-AND-LOCAL-IPC.md`](references/DESKTOP-MOBILE-AND-LOCAL-IPC.md) | Native apps, deep links, webview bridges, local daemons, or sockets. |

## Mistakes to avoid

1. A checklist deviation that you report as a vulnerability.
2. Defense-in-depth advice with no reachable violation.
3. A test against a live or shared environment when a local check is not enough.
4. A guess about provider, proxy, browser, or deployment behavior that the source does not show.
5. Intended authority of the same principal, or an effect on the caller only, that you report as a crossing.
6. An effect that you report as stronger than the effect that you observed.
