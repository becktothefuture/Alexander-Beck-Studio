# PRD: Transition Hook Helper Extraction

## 1. Introduction/Overview

Optionally extract helper concerns from `useShellRouteTransition` after listener cleanup. This PRD should only be actioned if the hook remains too broad after ownership cleanup.

## 2. Goals

- Improve readability of route state, readiness, and sequencing logic.
- Preserve one public transition owner.
- Avoid behavior changes beyond mechanical helper extraction.

## 3. User Stories

### US-001: Identify extraction candidates
**Description:** As a developer, I want to extract only cohesive helper logic so the hook becomes easier to maintain without hiding orchestration.

**Acceptance Criteria:**
- [ ] Identify candidate helpers for route state, readiness checks, URL cleanup, or gate resolution.
- [ ] Do not extract transition sequencing into a second owner.
- [ ] Keep public hook behavior unchanged.

### US-002: Extract one helper group at a time
**Description:** As a maintainer, I want small helper extractions so any regression is easy to locate.

**Acceptance Criteria:**
- [ ] Each helper extraction has a narrow diff.
- [ ] Existing tests/audits pass after each extraction group.
- [ ] No new phase state API is introduced.
- [ ] `npm run check:site` passes.

## 4. Functional Requirements

- FR-1: Extracted helpers must be pure or have clearly named DOM side effects.
- FR-2: `useShellRouteTransition` remains the single public orchestrator.
- FR-3: Behavior must remain parity-equivalent.

## 5. Non-Goals

- No listener cleanup.
- No new transition behavior.
- No route alias changes.

## 6. Design Considerations

- No visual change intended.

## 7. Technical Considerations

- Only action this PRD after `prd-transition-listener-cleanup.md`.
- Browser audits are still required because the hook is parity-sensitive.

## 8. Success Metrics

- Hook complexity is reduced without changing route behavior.
- Audits pass after extraction.

## 9. Sequencing Decision

- This PRD is optional; decide whether to action it after listener cleanup.

## 10. Action Decision

Status: not-actioned

Decision date: 2026-07-08

The listener cleanup reduced duplicated route click binding without touching the transition sequencer. Extracting helpers from `useShellRouteTransition` now would broaden the diff across the most parity-sensitive route code without removing an immediate risk.

Known future candidates:

- route-state parsing helpers near `computeRouteState`;
- route readiness helpers near `waitForRouteReady`;
- pure timing/default helpers.

Do not extract the sequencing path, phase ownership, queued navigation handling, or gate/simulation-focus orchestration unless a dedicated PRD scopes and verifies that migration.
