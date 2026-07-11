# PRD 06: Daily Focus shell integration

## Introduction

Reduce Daily Focus bridging to renderer/content responsibilities and consume the production shared shell for material and chrome.

## Goals

- Daily Focus does not load or synchronize shell config independently.
- Daily simulations preserve clean URL, transition, and rendering contracts.

## User stories

### US-001: Shared Daily shell
**Description:** As a visitor switching simulations, I want the same physical studio window and controls to remain present.

**Acceptance criteria:**
- [ ] Daily Focus bridge does not initialize theme, time, noise, or shell config.
- [ ] Daily route content and simulation switching remain functional.
- [ ] Clean home URL contract remains intact.
- [ ] Canvas and transition audits pass.
- [ ] Verify in browser using Playwright.

## Non-goals

- No changes to approved simulation visuals or physics.

