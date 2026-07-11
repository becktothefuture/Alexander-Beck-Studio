# PRD 02: Shared Mobile Canvas Fast Path

## Introduction

Reduce work paid by every legacy simulation while preserving visible circles, title depth, and interactions.

## Goals

- Remove avoidable steady-state DOM/style reads and duplicate decorative draw passes.
- Use the existing batched circle renderer when canonical pebble blending is disabled.
- Start mobile automatic quality at the balanced tier.

## User Stories

### US-01: Efficient shared rendering

As a mobile visitor, I want every simulation to use the cheapest equivalent circle-rendering path.

Acceptance criteria:

- Canonical circular bodies render through the existing batched path on mobile.
- The optional contrast veil is skipped on mobile.
- Mobile automatic quality starts balanced and still adapts downward under pressure.
- Title geometry is cached between genuine invalidations rather than reread every settled frame.

## Functional Requirements

1. Preserve ball positions, radii, colors, alpha, squash behavior where applicable, title order, and input.
2. Keep desktop rendering unchanged.
3. Invalidate title geometry on resize, font readiness, route/title change, and canvas remount.
4. Add no allocations to physics hot paths.

## Non-goals

- Changing simulation counts or physics behavior.
- Replacing the Canvas 2D engine.

## Success Metrics

- Proof 1: instrumented steady-state title/contrast paths show eliminated redundant DOM/style reads.
- Proof 2: complete WebKit matrix is unchanged or improved and representative screenshots preserve circle/title visuals.

## Open Questions

- Depth modes may still justify a later single-surface renderer, but only with separate visual proof.
