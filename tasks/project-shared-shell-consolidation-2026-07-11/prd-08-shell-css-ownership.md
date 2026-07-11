# PRD 08: Shell CSS ownership cleanup

## Introduction

Replace route-inferred shell CSS with semantic shell classes/attributes and ensure page styles own composition only.

## Goals

- Shared wall, frame, noise, shadows, footer, and chrome come from shared CSS.
- Page styles cannot redefine shell material.

## User stories

### US-001: Semantic shell selectors
**Description:** As a developer, I want selectors that state their intent so Contact cannot inherit Home styling accidentally.

**Acceptance criteria:**
- [ ] Production shell rules use semantic shell/route selectors.
- [ ] Route CSS contains only route content, motion, and interaction rules.
- [ ] No `!important` is introduced.
- [ ] Light and dark parity hold across all production routes.
- [ ] Verify in browser using Playwright.

## Functional requirements

- FR-1: Preserve approved frame geometry, shadows, inner edge, radii, noise, and Button Bar separation.
- FR-2: Portfolio project drawer remains above chrome.

