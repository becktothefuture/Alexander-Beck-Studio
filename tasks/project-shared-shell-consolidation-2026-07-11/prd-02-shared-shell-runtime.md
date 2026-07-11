# PRD 02: Shared shell runtime ownership

## Introduction

Make one shared runtime responsible for config, wall material, theme synchronization, noise, and persistent shell state.

## Goals

- Initialize shell services once per application session.
- Reuse one noise texture and material configuration across routes.
- Prevent legacy runtimes from overwriting shell state.

## User stories

### US-001: Single shell boot
**Description:** As a visitor, I want the studio window to remain physically continuous while navigating.

**Acceptance criteria:**
- [ ] Direct loads initialize config, wall, theme, noise, and layout.
- [ ] SPA navigation does not regenerate or replace shell material.
- [ ] Home and Portfolio runtimes do not initialize shared noise/theme/wall services.
- [ ] Shared initialization is idempotent.
- [ ] Verify in browser using Playwright.

## Functional requirements

- FR-1: `SiteApp` or a dedicated provider owns production shell initialization.
- FR-2: Shell readiness is stored on the persistent document/shell boundary.
- FR-3: Route runtimes own only route content, simulation, physics, and page interaction.

## Performance requirements

- One noise texture generation per application session.
- No duplicate resize listeners or theme observers from route round trips.

## Non-goals

- No simulation-engine rewrite.

