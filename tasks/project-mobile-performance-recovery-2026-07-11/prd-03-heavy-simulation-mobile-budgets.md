# PRD 03: Heavy Simulation Mobile Budgets

## Introduction

Apply explicit mobile budgets only where deterministic solver or route-runtime work remains excessive after shared fixes.

## Goals

- Keep the visual concept and interaction of every Daily simulation.
- Reduce solver passes, synchronous startup work, layout reads, and excessive DPR only where profiling supports it.
- Prioritize Sphere Orbit, Soft Blob, Ball Field, Water, Bubble Lift, Magnetic Field, Particle Fountain, Flock Drift, and Mineral Bloom.

## User Stories

### US-01: Stable worst-case modes

As a mobile visitor, I want the most complex simulations to remain responsive without looking like different designs.

Acceptance criteria:

- Collision budgets are mode-specific rather than a blind global reduction.
- Flock performs no large synchronous warmup block.
- Route-backed renderers do not measure unchanged layout every frame.
- Mobile DPR/count reductions are used only after cheaper orchestration work.

## Functional Requirements

1. Preserve concept, palette, title layering, touch response, and route cleanup.
2. Record resolved count, DPR, solver budget, p95 interval, longest gap, and errors for changed modes.
3. Validate collision integrity, blob connectivity, flock distribution, and title depth visually.
4. Keep desktop budgets unchanged.

## Non-goals

- New simulations.
- Rewriting the engine or changing approved wall/frame surfaces.

## Success Metrics

- Proof 1: each changed mode improves a deterministic cost or p95/long-gap metric without lowering accepted FPS.
- Proof 2: interaction and screenshot checks confirm visual identity and structural integrity.
- Final 17-mode WebKit matrix has zero errors and runtime target approximately 60 FPS.

## Open Questions

- Physical iPhone evidence may justify stricter count/DPR tiers than emulation does.
