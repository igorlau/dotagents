# Changelog

## [2.0.1](https://github.com/igorlau/dotagents/compare/v2.0.0...v2.0.1) (2026-11-19)


### Bug Fixes

* **skills:** look up facts inline in dot-grilling ([4a701ed](https://github.com/igorlau/dotagents/commit/4a701ed027c0c7e6902581684b5fc0a9d2b37f7a))
* **skills:** make the dot-debug log ban a guardrail ([711e53c](https://github.com/igorlau/dotagents/commit/711e53cf2ff112918f41b0972ed7c2421a5d603f))
* **skills:** return only the layers file on a layers call ([cd22a0b](https://github.com/igorlau/dotagents/commit/cd22a0b021eb096fea4caec2875bb22520a19e82))

## [2.0.0](https://github.com/igorlau/dotagents/compare/v1.0.22...v2.0.0) (2026-11-19)


### ⚠ BREAKING CHANGES

* **skills:** dot-stack-review is renamed to dot-walkthrough-branch.
* the CLI no longer installs for Codex, and the dot-flow skill and the old dot-reviewer agent are removed.
* **skills:** dot-grill-me is removed; use dot-grilling. dot-flow no longer writes test stubs or waits for an approval between steps.
* global installs no longer write ~/.claude/skills; install the dotagents plugin in Claude Code.
* **skills:** skills are invoked by their new names, such as /dot-plan instead of /plan.
* the documented install source is now npm. The deploy key guide for Git installs is removed.
* `dotagents init --local-only` no longer exists.

### Features

* add a scaffold command for new repositories ([9ea2648](https://github.com/igorlau/dotagents/commit/9ea26484b468a0f014721779af6f2c5e18a321d2))
* add dot-factory with the Gate and the review loop ([df6b23f](https://github.com/igorlau/dotagents/commit/df6b23f58c60fb68384648258763206e2ebedf19))
* add ponytail and code comment rules, contributing guide ([f507c71](https://github.com/igorlau/dotagents/commit/f507c71bad3433b148b04789b1c78837eb5fdfea))
* **cli:** add a scaffold wizard ([5ac4a41](https://github.com/igorlau/dotagents/commit/5ac4a410c72510489d4ea52f73467e611bb64ac1))
* **cli:** add an interactive install wizard ([3d3efc7](https://github.com/igorlau/dotagents/commit/3d3efc7295d27ce0afb127288a3dc1de484fe470))
* **cli:** add an uninstall wizard ([5139e6e](https://github.com/igorlau/dotagents/commit/5139e6e10247c8a5ba2806dad03bf3eb04264529))
* **cli:** ask for the install scope in the wizard ([1e8c2d1](https://github.com/igorlau/dotagents/commit/1e8c2d1016177b027a3381e91c86fd5adf2c49e9))
* **cli:** hint when CLAUDE.md does not import AGENTS.md ([28e720c](https://github.com/igorlau/dotagents/commit/28e720cd47c65d588bd4ecec3f5bcbdfd491e95d))
* **cli:** install the Claude Code plugin from the wizard ([dc24fe3](https://github.com/igorlau/dotagents/commit/dc24fe335c099a5eca28245c322fa9f42900e6fe))
* **cli:** offer the check hook and scaffold in the wizard ([8f472cd](https://github.com/igorlau/dotagents/commit/8f472cd53096d4b36008b3776f371c4cd0e3cbf5))
* **cli:** show a grouped summary in the install wizard ([6df6e76](https://github.com/igorlau/dotagents/commit/6df6e762e023a7b5fc2f994e525bb01009930f32))
* **cli:** write Claude Code rules in AGENTS.md when CLAUDE.md imports it ([167a771](https://github.com/igorlau/dotagents/commit/167a771a499d10da1024a813d8845da7d20c09ac))
* **docs:** check docs links, names, and counts in lint:content ([5722435](https://github.com/igorlau/dotagents/commit/57224351ebc3101623acd6e3c2d9130d0286bf93))
* initial dotagents CLI, catalog, and spec ([ecdf051](https://github.com/igorlau/dotagents/commit/ecdf051408e55715f0d9efc810095750a629b87b))
* install Claude Code skills from the plugin instead of the CLI ([011a678](https://github.com/igorlau/dotagents/commit/011a67848657532f1857147d19068985ad8477a6))
* **plugin:** add an end-of-turn hook that runs the check script ([229f595](https://github.com/igorlau/dotagents/commit/229f59585d0b1335f9b52bc22297a7b925be9e8e))
* **plugin:** add tester, implementer, and reviewer agents ([e2026e3](https://github.com/igorlau/dotagents/commit/e2026e35bbac6c15982f0eb6d83c97d8338b2e63))
* **plugin:** check each subagent and warn about stale rules ([3e5fd27](https://github.com/igorlau/dotagents/commit/3e5fd27970cba6b79b127f0e8b9a01442956910f))
* **plugin:** publish plugin/ as a Claude Code plugin with a marketplace ([2b0b273](https://github.com/igorlau/dotagents/commit/2b0b2730d8722c8e71b3a9e1d455eafe9b07b1a9))
* **plugin:** run the check hook only in repositories the user enables ([8d595fc](https://github.com/igorlau/dotagents/commit/8d595fcefef0735ff1bf38877cd8943191b14780))
* publish to npm as @igorlau/dotagents ([353f166](https://github.com/igorlau/dotagents/commit/353f1666ee7f10bdc4aec72e5f727f4aa5000ce2))
* remove Codex support and dot-flow ([b335dc0](https://github.com/igorlau/dotagents/commit/b335dc06ac3ab758d527c927f36c0726f59b238b))
* **rules:** add a code style rule for early returns and sorted JSON keys ([5a4f8b0](https://github.com/igorlau/dotagents/commit/5a4f8b0c0c2b0f2026f8d0f57d2a9650a1c42b2f))
* **rules:** add an always-on writing rule based on ASD-STE100 ([e4b032c](https://github.com/igorlau/dotagents/commit/e4b032c37b9522baf75694c61c2094f5646c1973))
* **rules:** default to no comments and doc comments on declarations ([8333597](https://github.com/igorlau/dotagents/commit/833359709b0b8794ee8b3c365f948a496eb593a5))
* **rules:** delete comments by default and add dot-comments ([96348ef](https://github.com/igorlau/dotagents/commit/96348efb9edc39cd1527d3621558b2b2ef88d9c7))
* **rules:** drop the colored status headings ([56d328e](https://github.com/igorlau/dotagents/commit/56d328ec6312fbd40f5da29b7d0b0392aca62983))
* **rules:** flag more metaphor nouns and generic sentences ([9e00e9e](https://github.com/igorlau/dotagents/commit/9e00e9e3a0dad05f583112023e8e4262ce2e2679))
* **rules:** group status lines under colored headings ([c4705cf](https://github.com/igorlau/dotagents/commit/c4705cf907cf543c4c19336073be44e9c4eded1d))
* **rules:** mark status lines with colored markers ([0ae6a4f](https://github.com/igorlau/dotagents/commit/0ae6a4f0ea0d1134d80616b6f9ce147c2cdbd991))
* **rules:** require Conventional Commits without AI attribution ([5f8805e](https://github.com/igorlau/dotagents/commit/5f8805e5bda153a5edf4dd8da5ed71bdcf7202ce))
* **rules:** state the writing rules as behavior to follow ([b06440b](https://github.com/igorlau/dotagents/commit/b06440b35f2dcef8e358764166928466290bf694))
* **skills:** add a light fix path to dot-flow ([10b3029](https://github.com/igorlau/dotagents/commit/10b302970606d11d0fa15e69ff7db6833f6fcd55))
* **skills:** add a maintainability pass to dot-code-review ([fdbeb6f](https://github.com/igorlau/dotagents/commit/fdbeb6f3ce44cb9f5d4d3bbca540ed55fcc3a92e))
* **skills:** add a roadmap skill for grilled plans ([a676226](https://github.com/igorlau/dotagents/commit/a676226d5d733fa1ce34d816c03bc856c1918e32))
* **skills:** add a testing skill built on makeSut ([3187ce7](https://github.com/igorlau/dotagents/commit/3187ce7d8e61a6d5b569148d020629a17ecb05c8))
* **skills:** add an implement skill with a TypeScript reference ([e82bea2](https://github.com/igorlau/dotagents/commit/e82bea26828411360537fa6706093e341c00ff9d))
* **skills:** add an iterative review workflow to the commit skill ([cd51a6a](https://github.com/igorlau/dotagents/commit/cd51a6a7c80f486e3f2cc78e8984f34299ff36d5))
* **skills:** add dot-correct to encode repeated mistakes ([0bb7976](https://github.com/igorlau/dotagents/commit/0bb79762a02ebe6cbd082eb6db14e7ec0c5dce9e))
* **skills:** add dot-flow to run a roadmap task step by step ([f4f049f](https://github.com/igorlau/dotagents/commit/f4f049f63b501024d769c9cd68feebfbd4af233b))
* **skills:** add dot-stack-review with a Markdown report ([7fc7ae9](https://github.com/igorlau/dotagents/commit/7fc7ae98f2d18e036a6ff72dff095cd5556b915b))
* **skills:** add stub and fill modes to dot-testing ([0165331](https://github.com/igorlau/dotagents/commit/0165331db18f56d8b06787826a88153dea7f242f))
* **skills:** add the HTML page to dot-stack-review ([c43fd40](https://github.com/igorlau/dotagents/commit/c43fd405d4cb9d02b0249a47bfc598f9e5739064))
* **skills:** add the walkthrough, security, UX, and UI reviews ([7f8518b](https://github.com/igorlau/dotagents/commit/7f8518ba97950a158c5ae592f1d6800e66eeaa52))
* **skills:** check the diff against the comments rule in dot-implement ([f6ee8bc](https://github.com/igorlau/dotagents/commit/f6ee8bc4741c065da44ac71c7b2094f840cc27a1))
* **skills:** enforce a SKILL.md size budget in lint:content ([be493e8](https://github.com/igorlau/dotagents/commit/be493e841a0dc9e7d887cbbe2888cba96389b139))
* **skills:** fix high and medium findings without a stop ([0daa4dd](https://github.com/igorlau/dotagents/commit/0daa4dd221ce8c0a0e8757350bf66609d79edce4))
* **skills:** fix root causes and test premises in dot-debug ([c177a88](https://github.com/igorlau/dotagents/commit/c177a8811978f17bee75eb3b3a6870ae70e2bacf))
* **skills:** keep class helpers inside the class ([44258a7](https://github.com/igorlau/dotagents/commit/44258a7f48c176934c993d7eab651ece916a79ef))
* **skills:** list requirements before planning and trace them ([bf3061a](https://github.com/igorlau/dotagents/commit/bf3061a95307081184b15e6e0539662840b31a58))
* **skills:** list test cases in roadmap tasks and cut removals first ([e000587](https://github.com/igorlau/dotagents/commit/e000587e8fa410a0dc9aeeaf6dd6b5330b268d9c))
* **skills:** make dot-implement write production code only ([a4e8b2c](https://github.com/igorlau/dotagents/commit/a4e8b2cc3e824d3733c217add86fd593d8a74fe6))
* **skills:** merge pstack TypeScript rules into the implement reference ([d40d81c](https://github.com/igorlau/dotagents/commit/d40d81c7d2d63a136fda42cfc64ba457c9d03e3c))
* **skills:** place tests by module and order HTTP tests by status ([9ae4f56](https://github.com/igorlau/dotagents/commit/9ae4f564c990824f3608ec901643bbc2dff91581))
* **skills:** prefix skill names with dot- ([0618870](https://github.com/igorlau/dotagents/commit/06188706f8af0e2fdbb75900baed5847ec24459a))
* **skills:** put repository conventions ahead of dotagents guidance ([268b54b](https://github.com/igorlau/dotagents/commit/268b54bda1e8222b19da526200be6676edde91d3))
* **skills:** restyle the stack review page ([c2f6694](https://github.com/igorlau/dotagents/commit/c2f6694f54f500d8ef6cc162174483a37d2b2c35))
* **skills:** review only the fix on later dot-flow rounds ([e994970](https://github.com/igorlau/dotagents/commit/e994970fe8f38f66a2ddd90d97a6090df5024735))
* **skills:** review the full change on a dot-flow fix run ([efb6bba](https://github.com/igorlau/dotagents/commit/efb6bbac71d245ecc845255792fa92e20abf3d16))
* **skills:** run dot-flow as implement, test, and review ([6e38c12](https://github.com/igorlau/dotagents/commit/6e38c12df870abd698051d506b214e54c42ad0da))
* **skills:** show entity schemas and plan removals first ([d679071](https://github.com/igorlau/dotagents/commit/d679071469fcfcf13d60c94674dc9ce75b6d6771))
* **skills:** sort type properties and prefer early-return exhaustiveness in TypeScript ([2da3cdf](https://github.com/igorlau/dotagents/commit/2da3cdf06642bc3e6738de88ab8518ca58ce3d10))


### Bug Fixes

* **agents:** make dot-reviewer load the skill of each lens ([5db3e15](https://github.com/igorlau/dotagents/commit/5db3e15a9028683eac8bd304e7cdce911b625d41))
* **ci:** tag releases as vX.Y.Z ([5050ff6](https://github.com/igorlau/dotagents/commit/5050ff6dd87c21775e3c141c803710082c5adcc3))
* **cli:** show the check hook repository with ~ in the summary ([386b124](https://github.com/igorlau/dotagents/commit/386b1248878d5e1c5642b91aaefc9a93637b9cc5))
* **cli:** start npx through the shell on Windows in self-update ([85a839f](https://github.com/igorlau/dotagents/commit/85a839f8fc1acab218acdf11bc138f7d88b00955))
* **cli:** stop update from downgrading a newer install ([64dbe06](https://github.com/igorlau/dotagents/commit/64dbe06165e7bd2e3f92894c261849169108d879))
* **cli:** treat a missing git as no repository ([07050ae](https://github.com/igorlau/dotagents/commit/07050aea0b68f1f2c9f5150db76703b8bb1710e5))
* **cli:** write the Claude Code rules only in AGENTS.md without CLAUDE.md ([6f88dc2](https://github.com/igorlau/dotagents/commit/6f88dc2badb25e6dbe6997d54374da1d1a455a79))
* **copilot:** load global rules in every Copilot session ([b878f11](https://github.com/igorlau/dotagents/commit/b878f11e3b6b79173e5362a29b4c42add735f26f))
* **factory:** apply the findings of the final review ([a0d3b69](https://github.com/igorlau/dotagents/commit/a0d3b69491a9bfd30808f625b568beb46dfa32a4))
* **plugin:** explain silent check failures and delete hook snapshots ([1d877ea](https://github.com/igorlau/dotagents/commit/1d877ea6f04c2442363523f7ba073b653725d87d))
* report the commit in versions built from a branch ([d7edf2c](https://github.com/igorlau/dotagents/commit/d7edf2c87e9c418123b473b98af51fdac2799c3b))
* **skills:** check the .tmp folder with a trailing slash ([46fa557](https://github.com/igorlau/dotagents/commit/46fa557588cb8e7e229df803029be8478856f985))
* **skills:** pick only unticked tasks in dot-implement ([b9c12f2](https://github.com/igorlau/dotagents/commit/b9c12f2f91a5d44265b77f8f3b41667be1492d4f))


### Code Refactoring

* remove the local-only install mode ([30d0533](https://github.com/igorlau/dotagents/commit/30d0533e5d0691b4398bd235e52cb360f0bbecd6))


### Continuous Integration

* release with release-please ([e45a4ae](https://github.com/igorlau/dotagents/commit/e45a4ae0e1dfae94ddaa99938250418604225020))
