# PRD: Work Simulation Palette Integration

## Introduction/Overview

The Work/Portfolio route renders a persistent speed field behind the orbital deck and can expose ball material through route overlays. This integration makes that field consume the approved global snapshot without reseeding particles or restarting motion. It depends on `prd-global-simulation-palette-system.md`.

## Goals

- Assign Portfolio particles through the global deterministic weighted sequence.
- Preserve particle geometry, order, position, and motion across palette commits.
- Keep the field and shared atmosphere on the same generation.

## User Stories

### US-001: Seed stable Portfolio material roles
**Description:** As a visitor, I want the Work field to reflect the global material rationale so that its colour balance matches the rest of the site.

**Acceptance Criteria:**
- [ ] Initial particle creation uses `createSimulationMaterialSequence`.
- [ ] Each particle stores a stable role assignment.
- [ ] The resulting role counts match authored weights within deterministic rounding tolerance.
- [ ] Verify in browser using dev-browser skill.

### US-002: Recolour Work without reseeding
**Description:** As a visitor, I want a time boundary to change Work colours without interrupting the orbital experience.

**Acceptance Criteria:**
- [ ] A palette commit updates colour lookup only.
- [ ] Particle count, object identity, position, phase, velocity, deck state, and RAF lifecycle remain unchanged.
- [ ] Open drawers and moving/dragging states remain intact.
- [ ] Verify in browser using dev-browser skill.

### US-003: Keep atmosphere generation-aligned
**Description:** As a visitor, I want diffuse atmosphere to belong to the visible field so that no stale accent appears after a palette change.

**Acceptance Criteria:**
- [ ] Canvas source and atmosphere diagnostics report the same generation.
- [ ] Ambient fallback derives from the active snapshot.
- [ ] No Portfolio-specific palette owner or timer exists.
- [ ] Verify in browser using dev-browser skill.

## Functional Requirements

1. FR-1: Portfolio subscribes to the global controller or approved legacy adapter.
2. FR-2: Particle creation stores role IDs from the shared deterministic sequence.
3. FR-3: Palette commits mutate the field colour lookup without calling `seedParticles()`.
4. FR-4: Snapshot diagnostics expose generation, distribution, and role counts.
5. FR-5: Project UI accents remain outside the contract unless rendered as ball material.
6. FR-6: Drawer, gate, transition, and atmosphere state survive a palette commit.

## Non-Goals

- Changing deck layout, card colours, project accents, access gates, drawer design, field density, or motion.

## Design Considerations

- The Work field keeps its current spatial distribution and parallax character.
- Palette material remains secondary to project content and interaction.

## Technical Considerations

- Separate resize reseeding from palette refresh.
- Keep the render loop allocation-free and update only cached style/material data.

## Success Metrics

- Zero particle reseeds attributable to palette commits.
- Work field and atmosphere share the shell generation within the next visible frame.
- Portfolio carousel, drawer, and transition audits remain green.

## Open Questions

- Resolved: project-card and editorial accent colours are excluded unless they become literal ball material.
