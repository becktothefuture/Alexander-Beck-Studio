# PRD 01: Explicit route identity and state boundaries

## Introduction

Replace implicit negative body-class selectors with an explicit shell route identity so Home rules cannot accidentally affect Contact, About, or Portfolio.

## Goals

- Expose one canonical production route identifier on the persistent shell.
- Separate route identity from persistent theme/runtime readiness.
- Preserve visual and transition parity.

## User stories

### US-001: Canonical route identity
**Description:** As a developer, I want one route identity attribute so CSS and runtime behavior target the intended route directly.

**Acceptance criteria:**
- [ ] Home, Portfolio, About, and Contact expose the correct stable route ID.
- [ ] Identity updates during SPA navigation and on direct load.
- [ ] No route relies on `:not(.portfolio-page):not(.cv-page)` to mean Home.
- [ ] Lint and production build pass.
- [ ] Verify in browser using Playwright.

### US-002: Persistent state boundary
**Description:** As a user, I want theme and material readiness to survive tab changes so the shell never visually rebuilds.

**Acceptance criteria:**
- [ ] Route changes do not remove theme, noise, boot, or accessibility state.
- [ ] Body route classes cannot overwrite shell runtime state.

## Functional requirements

- FR-1: Route identity must be authored once by the React router/shell.
- FR-2: Persistent shell state must live outside replaceable route class strings.
- FR-3: Existing route URLs and body classes remain compatible until consumers migrate.

## Non-goals

- No route content redesign.
- No lab-route migration.

## Success metrics

- Zero production CSS selectors using negative route inference for shell behavior.
- Correct route identity after repeated round trips.

