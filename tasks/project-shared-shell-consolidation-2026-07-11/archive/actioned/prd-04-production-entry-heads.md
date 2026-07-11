# PRD 04: Production entry-head consolidation

## Introduction

Generate repeated production HTML head/boot content from one canonical source to prevent direct-entry drift.

## Goals

- One source for pre-paint theme seed, browser chrome metadata, fonts, favicons, and shared stylesheets.
- Preserve Vite multi-entry output and direct URLs.

## User stories

### US-001: Consistent direct entry
**Description:** As a visitor opening any route directly, I want the same shell before React loads.

**Acceptance criteria:**
- [ ] Home, Portfolio, About, Contact, and CV alias share canonical head markup.
- [ ] Theme-color behavior remains correct in Safari/theme-color browsers.
- [ ] No first-paint theme or frame flash.
- [ ] HTML-fragment and production-build checks pass.
- [ ] Verify direct entries in browser using Playwright.

## Functional requirements

- FR-1: A deterministic script/plugin/template must update all supported production entries.
- FR-2: Entry-specific title and module source remain configurable.
- FR-3: Build validation must detect drift.

## Non-goals

- Labs and standalone tools remain independent unless they already consume the template.

