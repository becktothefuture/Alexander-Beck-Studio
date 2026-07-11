# PRD 03: React chrome ownership

## Introduction

Remove legacy ownership of footer, social icons, London time, theme toggle, and shared chrome once React renders those surfaces.

## Goals

- One footer component and one Button Bar across production routes.
- One clock lifecycle and one theme control lifecycle.
- No route runtime mutates shared React chrome.

## User stories

### US-001: Persistent shared footer
**Description:** As a visitor, I want the same footer on every route, except Portfolio intentionally omits its middle caption.

**Acceptance criteria:**
- [ ] Footer geometry, typography, color, opacity, padding, and controls match across routes.
- [ ] Portfolio differs only by middle-caption absence.
- [ ] Social links remain accessible and functional.
- [ ] Verify in browser using Playwright.

### US-002: Shared clock and theme control
**Description:** As a visitor, I want time and theme controls to remain stable during navigation.

**Acceptance criteria:**
- [ ] Exactly one clock timer is active.
- [ ] Exactly one theme-toggle handler is active.
- [ ] Theme persists across all tabs and direct loads.

## Functional requirements

- FR-1: Remove redundant `initSharedChrome`, `initTimeDisplay`, `upgradeSocialIcons`, and route-level theme initialization from production runtimes.
- FR-2: Preserve accessibility labels, focus states, haptics, and reduced-motion behavior.

