# Studio Website Streamline PRD Packet

Created: 2026-07-08

This folder is the action hub for the repo-wide streamlining review. It turns the review findings into implementation-ready PRDs, dependency order, required QA gates, and a progress log.

## Contents

- `action-sequence.md` - recommended order of execution and required gates between phases.
- `progress-log.md` - running status log for each PRD.
- `prd-project-streamline-program.md` - overall program PRD tying the individual work together.
- `prd-validation-gate-repair.md` - repair stale/broken validation and promote simulation validation into the canonical gate.
- `prd-simulation-validator-expansion.md` - expand cheap validation for simulation/daily runtime drift.
- `prd-route-manifest-strategy.md` - later route manifest/codegen strategy, only after validator-first work lands.
- `prd-cv-route-topbar-contract.md` - align CV/About route chrome with the documented topbar contract.
- `prd-transition-navigation-inventory.md` - inventory transition/navigation ownership without behavior changes.
- `prd-transition-listener-cleanup.md` - remove or isolate duplicated legacy navigation bindings.
- `prd-transition-hook-helper-extraction.md` - optional helper extraction after ownership cleanup.
- `prd-boot-shell-entry-consolidation.md` - reduce duplicated HTML/entry boot surfaces.
- `prd-content-source-alignment.md` - clarify and align route content loading sources.
- `prd-css-token-ownership.md` - tighten CSS ownership, token usage, and unused default CSS.
- `prd-setup-docs-hygiene.md` - clean setup metadata, stale docs, placeholder scripts, and README drift.

## Working Rules

- Do not implement from more than one PRD at a time unless write ownership is explicitly disjoint.
- Each PRD must pass its own acceptance criteria before the next dependent PRD starts.
- Any route, runtime, canvas, transition, portfolio drawer, or visual shell change must run the required QA gates listed in `action-sequence.md`.
- If implementation changes conflict with docs, update docs in the same PRD rather than leaving drift.
- Ask for user guidance before changing product intent, visible route composition, or the CV/About page content model.
- Preview-dependent audits must be run with `npm run preview` already running in another terminal, unless an implementation PRD adds a controlled wrapper.
- Optional PRDs can close as `not-actioned` only when the rationale and verification evidence are recorded in `progress-log.md`.
