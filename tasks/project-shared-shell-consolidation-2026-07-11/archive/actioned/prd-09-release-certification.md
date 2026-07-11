# PRD 09: Release, performance, and visual certification

## Introduction

Certify the consolidated shell across production routes, themes, breakpoints, transitions, overlays, and runtime performance before publishing.

## Goals

- Release-grade confidence backed by repeatable artifacts.
- No misplaced controls, shell flashes, animation regressions, or canvas remount defects.

## User stories

### US-001: Cross-route visual certification
**Description:** As a visitor, I want every tab transition to preserve the same studio window and chrome.

**Acceptance criteria:**
- [ ] Playwright tabs Home → Portfolio → About → Contact → Home.
- [ ] Screenshots inspected at mobile, tablet, and desktop.
- [ ] Footer and window geometry remain invariant.
- [ ] Portfolio middle caption exception remains correct.
- [ ] Theme toggles correctly on every route.
- [ ] Simulation chooser and Portfolio gate preserve wall finish.
- [ ] Animations settle without missing or overlapping UI.

### US-002: Performance certification
**Description:** As a visitor, I want shell consolidation to reduce duplicate work and preserve smooth interaction.

**Acceptance criteria:**
- [ ] One shared noise generation, clock timer, theme lifecycle, and shell config load per session.
- [ ] Canvas, transition, theme, Portfolio, and runtime-performance audits pass.
- [ ] No console errors or warnings attributable to the application.
- [ ] Production build passes.

## Required gates

- `npm run check:site`
- `npm run audit:canvas-spa`
- `npm run audit:portfolio-gate`
- `npm run audit:transition-flows` in Chromium and WebKit, including strict RAF
- Theme consistency and wall-invariance audits
- Playwright visual inspection at 390×844, 768×1024, and 1440×900

## Scoring

Score out of 10 using: architecture 20%, visual parity 25%, behavior/animation 20%, performance 20%, verification 15%. Do not award 10 without zero known regressions.

