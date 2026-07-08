# Studio Website Streamline Follow-Up PRD Packet

Created: 2026-07-08

This folder is the action hub for the follow-up review completed after the first streamline PRD programme shipped. It turns the latest 3-band audit into implementation-ready PRDs, a dependency-aware action order, required verification gates, and a progress log.

## Contents

- `action-sequence.md` - implementation order, dependencies, and mandatory QA gates.
- `progress-log.md` - status log for each PRD and senior review notes.
- `archive/actioned/` - completed/actioned PRDs:
  - `prd-followup-streamline-program.md` - programme-level PRD tying the individual tasks together.
  - `prd-setup-environment-and-ci-parity.md` - fix stale Codex environment setup and align CI/local gates.
  - `prd-simulation-validation-hardening.md` - catch remaining simulation catalog, daily-route, label, and schema drift.
  - `prd-route-source-validation.md` - make route metadata drift fail fast before any route generation/refactor.
  - `prd-direct-boot-readiness-ownership.md` - consolidate direct route boot readiness ownership after route validation is stronger.
  - `prd-transition-compatibility-boundary.md` - narrow legacy transition compatibility mutations.
  - `prd-build-warning-html-entry-cleanup.md` - remove build-warning noise from public CSS links and classify lab entries.
  - `prd-content-label-source-alignment.md` - normalize `About Me` casing and ownership.
  - `prd-portfolio-legacy-template-retirement.md` - decide and act on stale portfolio template/page surfaces.
  - `prd-route-topbar-css-ownership.md` - centralize shared route topbar layout rules.
  - `prd-backlog-historical-docs-triage.md` - separate active backlog from historical audit notes.

## Working Rules

- Do not implement from more than one PRD at a time unless write ownership is explicitly disjoint.
- Update `progress-log.md` before and after every PRD implementation pass.
- Record baseline results, exit commands, artifact paths, reviewer signoff, blocked rationale, and `not-actioned` evidence in `progress-log.md`.
- Do not proceed to a dependent PRD until that PRD's exit gate passes.
- Any route, shell, boot, transition, canvas, portfolio drawer, or visual shell change requires browser validation.
- Any UI-visible story must be verified in browser using the dev-browser skill, with screenshots or audit artifacts when relevant.
- Ask for user guidance before changing product intent, removing a public route, deleting a legacy surface that might still be intentionally preserved, or changing the About/CV content model.
- The previous packet in `tasks/project-streamline-2026-07/` is complete and should remain historical unless a specific follow-up PRD explicitly references it.
