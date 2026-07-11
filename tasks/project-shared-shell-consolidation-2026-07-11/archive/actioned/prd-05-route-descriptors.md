# PRD 05: Route descriptor consolidation

## Introduction

Replace parallel route-view, route-runtime, and title registries with one typed-by-convention route descriptor source.

## Goals

- One definition per production route.
- Clear aliases for CV/About and clean fallback behavior.

## User stories

### US-001: Single route registration
**Description:** As a developer, I want route metadata together so adding or modifying a route cannot leave title/runtime/view configuration out of sync.

**Acceptance criteria:**
- [ ] Each production route descriptor owns ID, title, view factory, runtime, and aliases.
- [ ] Route-backed Daily Focus resolution remains compatible.
- [ ] Existing public URLs resolve unchanged.
- [ ] Route and transition audits pass.

## Functional requirements

- FR-1: Remove parallel registries after all consumers migrate.
- FR-2: Keep descriptor data free of shell visual configuration.

