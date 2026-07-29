# PRD: Contact Simulation Palette Integration

## Introduction/Overview

Contact renders idle bodies, ripple waves, interactive bursts, and confirmation material with cached Canvas sprites. This integration makes every Contact material resolve from the approved global snapshot while preserving ring geometry, phase, burst timing, sound, haptics, and interaction state. It depends on `prd-global-simulation-palette-system.md`.

## Goals

- Use the global deterministic role sequence for every Contact material state.
- Rebuild colour sprites safely on a generation while preserving all simulation state.
- Apply new colours to in-flight bursts on the first render after commit.

## User Stories

### US-001: Assign stable Contact roles
**Description:** As a visitor, I want Contact’s idle and active material to follow the site-wide colour rationale so that it belongs to the same system.

**Acceptance Criteria:**
- [ ] Idle bodies, ripple waves, active bursts, and confirmation material resolve through snapshot roles.
- [ ] Bodies retain role assignment across palette changes.
- [ ] The sequence is centrally generated and deterministically interleaved.
- [ ] Verify in browser using dev-browser skill.

### US-002: Replace sprites without resetting interaction
**Description:** As a visitor, I want colours to update during an active ripple without losing the gesture or animation.

**Acceptance Criteria:**
- [ ] Sprite atlases may rebuild once per palette generation.
- [ ] Ring objects, geometry, animation phase, active burst timing, pointer state, sound, haptics, and confirmation state remain intact.
- [ ] In-flight bursts use the new palette on the first post-commit render.
- [ ] Verify in browser using dev-browser skill.

### US-003: Expose Contact palette diagnostics
**Description:** As a developer, I want Contact to report palette state and stable object counts so that atomic recolouring can be certified.

**Acceptance Criteria:**
- [ ] Diagnostics include palette ID, generation, colours, distribution, ring count, and active burst count.
- [ ] A boundary assertion proves no ring or renderer recreation.
- [ ] `npm run audit:contact-ripple` passes.

## Functional Requirements

1. FR-1: Contact consumes the global snapshot through the shared Daily theme adapter.
2. FR-2: The renderer stores stable role IDs or distribution indices for bodies and waves.
3. FR-3: The central deterministic sequence defines role order; Contact does not own weights.
4. FR-4: Palette generation changes rebuild cached sprites and invalidate the next frame.
5. FR-5: Palette changes preserve all ring, burst, confirmation, audio, haptic, and interaction state.
6. FR-6: Contact and its atmosphere source report the same generation.

## Non-Goals

- Changing Contact copy, layout, ripple geometry, burst timing, audio, haptics, or interaction design.

## Design Considerations

- Confirmation remains semantically distinct through a central role, not a route-owned hex colour.
- Atomic replacement is preferred to blending between sprite atlases.

## Technical Considerations

- Rebuild sprites outside the per-frame loop and retain role indices on all live objects.
- Dispose obsolete cached canvases by releasing references after the new set is complete.

## Success Metrics

- In-flight and idle Contact material displays the new generation on the first post-commit frame.
- Zero ring, burst, or runtime resets occur during palette changes.
- Contact ripple and production atmosphere audits pass.

## Open Questions

- Resolved: the current central role mapped to palette index 7 remains the confirmation material unless the authored distribution changes.
