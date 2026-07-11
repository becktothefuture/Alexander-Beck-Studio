# PRD 07: Legacy compatibility and dead-code removal

## Introduction

Remove production legacy shell bootstraps, fallback DOM construction, obsolete CV paths, and archived code from the active build graph when React provides the equivalent.

## Goals

- Smaller, clearer production ownership graph.
- Fail visibly when required React shell DOM is missing instead of silently recreating it.

## User stories

### US-001: Remove duplicate production boot
**Description:** As a developer, I want legacy runtimes to contain only route behavior so shell regressions have one place to debug.

**Acceptance criteria:**
- [ ] Home and Portfolio do not create or initialize shell DOM/chrome/material.
- [ ] Proven-unreachable CV and archived Portfolio bootstraps are removed from active entry/config graphs.
- [ ] Required DOM absence produces a clear development error.
- [ ] Build and all production-route audits pass.

## Non-goals

- Do not delete lab code solely for aesthetic cleanup.
- Do not rewrite the Canvas 2D engine.

