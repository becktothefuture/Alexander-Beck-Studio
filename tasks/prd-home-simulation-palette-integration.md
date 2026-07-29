# PRD: Home Simulation Palette Integration

## Introduction/Overview

Home includes the legacy Canvas runtime and four route-backed Daily simulations. This integration makes every Home ball consume the approved global palette snapshot while preserving its current physics, mode behaviour, title legibility, and readiness choreography. It depends on `prd-global-simulation-palette-system.md` and does not redefine the palette algorithm.

## Goals

- Apply the current global generation to Home and every production Daily mode before reveal.
- Keep existing body role assignments stable across palette changes.
- Remove direct time resolution and duplicated distributions from Daily renderers.
- Recolour without changing position, velocity, size, sleep state, or runtime identity.

## User Stories

### US-001: Recolour existing Home bodies by stable role
**Description:** As a visitor, I want Home balls to change material together without their motion changing so that the update feels site-wide rather than like a reset.

**Acceptance Criteria:**
- [ ] Every body stores a stable material `roleId` or distribution index.
- [ ] A palette commit changes only the colour resolved for that role.
- [ ] Position, velocity, radius, sleep state, preserved-colour semantics, and physics body identity remain unchanged.
- [ ] Verify in browser using dev-browser skill.

### US-002: Assign new Home bodies centrally
**Description:** As a developer, I want new balls to use the shared weighted selector so that authored material proportions remain consistent.

**Acceptance Criteria:**
- [ ] New bodies use `selectSimulationMaterialRole` or an approved sequence adapter.
- [ ] Shapes and semantic discipline mappings store central role IDs rather than route colour defaults.
- [ ] Existing coverage guarantees for all six disciplines remain intact.

### US-003: Migrate all Daily simulations
**Description:** As a visitor, I want each Daily simulation to use the same active colours as Home, Work, About, and Contact.

**Acceptance Criteria:**
- [ ] Rift Rings, Flock of Birds, Mineral Growth, and Repel Room consume the shared snapshot through the common Daily theme adapter.
- [ ] Their production renderers contain no local distribution arrays or direct time-of-day imports.
- [ ] Direct loads, SPA navigation, and simulation switches show the active generation before the readiness cover exits.
- [ ] Existing bodies retain their role assignments on palette change.
- [ ] Verify in browser using dev-browser skill.

## Functional Requirements

1. FR-1: The Home legacy adapter copies the committed colours and distribution into legacy globals synchronously.
2. FR-2: Existing Home balls remap stable role assignment to the new palette without random reassignment.
3. FR-3: New Home balls use the global weighted selector.
4. FR-4: The shared Daily theme adapter returns snapshot colours, distribution, palette ID, and generation.
5. FR-5: All four production route-backed Daily renderers update on adapter changes without remounting their route runtime.
6. FR-6: Route readiness diagnostics include the active palette generation.

## Non-Goals

- Changing Home density, mode selection, title layout, physics, interaction, or Daily visual choreography.
- Migrating collection simulations, labs, launchpads, or development demos.

## Design Considerations

- Home title legibility remains governed by the existing density and placement rules.
- Intentional preserved colours retain their semantic role, not a hard-coded hex value.

## Technical Considerations

- Legacy arrays may remain mutable internally, but their values must be projections of the frozen snapshot.
- Renderer update methods should invalidate a frame rather than rebuild geometry or physics.

## Success Metrics

- All six Home material roles retain authored proportions.
- No body or route-runtime identity changes during a palette boundary.
- Home and all five Daily modes report the same active generation as the shell.

## Open Questions

- Resolved: production Daily scope includes every legacy mode in the Daily rotation plus the four route-backed Daily runtimes selected by `DailyFocusRoute.jsx`; collection-only labs remain excluded.
- Resolved: exact per-ball order may remain route-specific; role weights and colour lookup are global.
