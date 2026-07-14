# PRD: Persistent Portfolio Particle Field

## Introduction

Turn the Portfolio's speed-triggered particle canvas into a persistent atmospheric background. The field remains visible behind the carousel at all times, drifts very slowly while the carousel is idle, and accelerates in the carousel's direction as measured deck velocity increases.

The composition must protect the project cards as the primary focus. Particle opacity is therefore reduced through a soft horizontal quiet band centred on the configured Portfolio orbit Y position, while particles remain more visible above and below that band. The field continues to use the site's existing circle/ball palette and three deterministic parallax layers.

The current activation/deactivation model is replaced by an always-visible intensity model. Reduced-motion users see the same persistent composition as a static field with no particle movement.

## Goals

- Keep the Portfolio particle field visible before, during, and after carousel movement.
- Add subtle continuous idle drift without making the background compete with project content.
- Increase particle travel and opacity smoothly from measured carousel velocity, with no activation pop.
- Protect card legibility with a soft, configurable quiet band aligned to the authored orbit Y position.
- Expose a compact, durable Portfolio panel surface for opacity, band geometry, density, depth sizing, and speed response.
- Let authors control the smallest far-plane circles and largest near-plane circles independently.
- Preserve deterministic particles, three parallax layers, edge wrapping, palette ownership, reduced motion, and bounded Canvas 2D work.
- Maintain live apply, canonical save, reload, flattening, and production-preview parity for every new control.

## User Stories

### US-001: Show a persistent atmospheric field

**Description:** As a visitor, I want the particle field to remain softly visible while the Portfolio is idle so the carousel always feels spatial and alive.

**Acceptance Criteria:**

- [ ] The particle canvas is visible after Portfolio load without requiring wheel, trackpad, drag, or keyboard input.
- [ ] The idle field uses the configured Idle opacity rather than fading to zero.
- [ ] Particles drift continuously and very slowly while the carousel is settled.
- [ ] Idle drift remains materially slower than the slowest intentional carousel movement.
- [ ] The field does not flash, clear, reseed, or change particle bindings when transitioning between idle and moving states.
- [ ] The existing legacy `#c` canvas remains untouched and separately owned.
- [ ] `npm run check:site` passes.
- [ ] Verify in browser using dev-browser skill.

### US-002: Create a card-safe quiet band

**Description:** As a visitor, I want particles to recede behind the project-card corridor so titles and media remain visually dominant.

**Acceptance Criteria:**

- [ ] A soft horizontal opacity band reduces particle visibility through the carousel's focal corridor.
- [ ] The band centre follows the responsive effective orbit Y position; it does not introduce a duplicate centre-position control.
- [ ] Quiet band height controls the vertical size of the reduced-opacity region.
- [ ] Quiet band opacity controls the band centre as a multiplier of the field's current global opacity.
- [ ] Opacity transitions smoothly between the quiet band and the stronger top/bottom regions with no visible hard edge.
- [ ] The mask affects particles only; it does not alter cards, intro copy, route controls, drawer content, or the Button Bar.
- [ ] The band remains correctly aligned after viewport resize and when desktop/mobile orbit Y values change live.
- [ ] `npm run check:site` passes.
- [ ] Verify in browser using dev-browser skill.

### US-003: Respond continuously to carousel speed

**Description:** As a visitor, I want the existing background atmosphere to accelerate and strengthen with the carousel so fast scrolling feels powerful without introducing a separate effect.

**Acceptance Criteria:**

- [ ] Particle motion derives from signed measured `deckDisplayPosition / dt`, not raw wheel-event magnitude.
- [ ] Direction changes pass smoothly through zero and then reverse particle travel.
- [ ] Motion response controls how strongly measured carousel velocity affects field travel.
- [ ] Fast opacity defines the maximum field opacity at high measured speed.
- [ ] Opacity interpolates continuously between Idle opacity and Fast opacity.
- [ ] The previous activation and deactivation thresholds no longer gate visibility or movement.
- [ ] Fast wheel, horizontal trackpad, drag, reversal, and settlement produce no discontinuity, blank frame, or particle reseed.
- [ ] Layer travel remains bounded during extreme input and edge wrapping remains seamless.
- [ ] `npm run check:site` passes.
- [ ] Verify in browser using dev-browser skill.

### US-004: Author the field's depth envelope

**Description:** As a designer, I want to control the smallest and largest particles so I can determine how far away the far layer feels and how close the near layer feels.

**Acceptance Criteria:**

- [ ] Far size controls the minimum radius used by the most distant particle layer.
- [ ] Near size controls the maximum radius used by the closest particle layer.
- [ ] Middle-layer and within-layer radius ranges are derived deterministically between the Far size and Near size endpoints.
- [ ] Increasing the separation between Far size and Near size creates a visibly stronger depth range without changing particle positions or count.
- [ ] The normalizer guarantees a valid positive range and prevents Near size from becoming equal to or smaller than Far size.
- [ ] Density controls the fixed particle allocation created on initialization or meaningful configuration/viewport changes.
- [ ] Parallax depth controls the speed separation between far, middle, and near layers without changing their circle sizes.
- [ ] Radius changes and density changes may reallocate/reseed only during the authored control change, never inside the animation hot path.
- [ ] `npm run check:site` passes.
- [ ] Verify in browser using dev-browser skill.

### US-005: Provide durable Particle Field controls

**Description:** As a designer, I want the important field characteristics in the existing Portfolio configuration panel so I can tune the atmosphere without editing source code.

**Acceptance Criteria:**

- [ ] The Portfolio panel group is titled `Particle Field`, replacing the user-facing `Speed Field` title.
- [ ] The group exposes exactly these nine high-signal controls: Idle opacity, Fast opacity, Quiet band height, Quiet band opacity, Density, Far size, Near size, Motion response, and Parallax depth.
- [ ] Every control applies live without remounting the carousel or changing card instances.
- [ ] Every control has a concise hint explaining its visible effect.
- [ ] Obsolete Activation speed and Release speed controls are removed from the panel and canonical export.
- [ ] Values save to the canonical design system, survive reload, flatten into generated Portfolio configuration, and match in production preview.
- [ ] The existing docked/detached panel architecture and shared control schema remain the only control surface.
- [ ] `npm run check:site` passes.
- [ ] Verify in browser using dev-browser skill.

### US-006: Preserve accessibility and lifecycle behavior

**Description:** As a visitor, I want the atmospheric field to respect my motion preference and disappear when Portfolio content should no longer be active.

**Acceptance Criteria:**

- [ ] Under `prefers-reduced-motion: reduce`, the field remains visible but is completely static.
- [ ] Reduced motion still applies the configured idle opacity, quiet band, density, and size envelope.
- [ ] The controller pauses while the document is hidden, Portfolio is gated, route content is transitioning, a drawer is opening/open, or the Portfolio route is unmounted.
- [ ] Returning from a paused state restores the same deterministic particle arrangement without a visible flash.
- [ ] The canvas remains `aria-hidden` and pointer-inert.
- [ ] Project cards, focus targets, drawer handoff, and Button Bar stacking remain unchanged.
- [ ] `npm run check:site` passes.
- [ ] Verify in browser using dev-browser skill.

### US-007: Add visual and performance regression evidence

**Description:** As a maintainer, I want repeatable proof that the persistent field remains attractive and performant across responsive layouts and fast interaction.

**Acceptance Criteria:**

- [ ] Automated audit snapshots expose field mode, idle/fast opacity, mask values, particle count, min/max particle radius, measured velocity, and draw cadence.
- [ ] Browser coverage verifies the field is visible at idle, animates during normal and extreme carousel movement, and remains static under reduced motion.
- [ ] Light and dark screenshots cover idle, normal motion, peak speed, and settlement at desktop, `3440×1440`, `390px` mobile, and the `600px`/`601px` Button Bar boundary.
- [ ] Screenshots confirm the quiet band protects the active and adjacent cards while particles remain visibly stronger at the top and bottom.
- [ ] Ten seconds of peak-speed motion sustains at least 58 FPS with p95 frame interval no higher than 20ms in desktop Chromium.
- [ ] Idle drift uses a bounded cadence and fixed particle count, with no per-frame object allocation or DOM queries.
- [ ] Particle and DOM counts remain fixed during idle drift, ten logical loops, reversal, resize, and settlement.
- [ ] No particle controller RAF/timer remains after Portfolio is hidden, gated, transitioning, drawer-open, or unmounted.
- [ ] `npm run check:site` passes.
- [ ] Verify in browser using dev-browser skill.

## Functional Requirements

- FR-1: The Portfolio particle canvas must remain visibly rendered whenever the closed Portfolio deck is active and motion is not lifecycle-suspended.
- FR-2: The idle field must drift continuously at one fixed, implementation-owned ambient speed; idle drift speed is not an authored panel control in v1.
- FR-3: The particle field must use Idle opacity at zero carousel velocity and interpolate toward Fast opacity as smoothed absolute carousel velocity increases.
- FR-4: Signed carousel velocity must control particle travel direction; Motion response must scale the velocity-to-travel mapping.
- FR-5: The field must use three deterministic far, middle, and near particle layers with edge wrapping and no trails, lines, rings, blur, or collision physics.
- FR-6: Far size must define the smallest far-plane circle radius, and Near size must define the largest near-plane circle radius.
- FR-7: Layer-specific radius ranges must be derived from Far size and Near size using fixed depth ratios rather than exposing per-layer radius controls.
- FR-8: Parallax depth must adjust the relative travel-speed spread between layers while preserving their ordering: far slowest, near fastest.
- FR-9: Density must scale particle allocation responsively and must only allocate/reseed on initialization, meaningful resize, or authored density/size changes.
- FR-10: A smooth vertical opacity mask must reduce the field through a horizontal quiet band and retain full current field opacity toward the top and bottom edges.
- FR-11: The quiet band's centre must follow the effective responsive Portfolio orbit Y value.
- FR-12: Quiet band height must control the size of the subdued corridor, and Quiet band opacity must control its centre-opacity multiplier.
- FR-13: The mask or its equivalent lookup data must be cached on resize/configuration change and must not allocate inside the draw loop.
- FR-14: The field must resolve colours from the existing ball/circle palette variables and refresh with site palette/theme changes.
- FR-15: Reduced motion must render one static persistent frame and must not schedule movement.
- FR-16: The controller must pause and clear or hide appropriately while lifecycle-suspended, including hidden document, gate, route transition, drawer-open, and unmount states.
- FR-17: The user-facing panel group must be renamed from Speed Field to Particle Field.
- FR-18: Activation speed and Release speed must be removed from the panel and canonical persisted configuration because the field is no longer threshold-gated.
- FR-19: The nine authored controls must use the existing Portfolio `configKey` live-apply path and canonical design-system save/flatten pipeline.
- FR-20: The field must remain below cards, intro copy, route controls, drawer, and Button Bar and must remain clipped within the studio window.

## Configuration Specification

Initial values are implementation starting points and must be visually verified before final canonical save.

| Control label | Canonical key | Initial value | Range | Step | Visible effect |
| --- | --- | ---: | ---: | ---: | --- |
| Idle opacity | `runtime.carousel.particleField.idleOpacity` | `0.10` | `0.02–1` | `0.01` | Baseline field visibility at rest. |
| Fast opacity | `runtime.carousel.particleField.fastOpacity` | `0.26` | `0.08–1` | `0.01` | Maximum field visibility at high carousel speed. |
| Quiet band height | `runtime.carousel.particleField.quietBandHeight` | `0.42` | `0.18–0.72` | `0.01` | Height of the subdued card corridor as a viewport fraction. |
| Quiet band opacity | `runtime.carousel.particleField.quietBandOpacity` | `0.30` | `0.05–1` | `0.01` | Centre-band opacity as a multiplier of current field opacity. |
| Density | `runtime.carousel.particleField.densityScale` | `1` | `0.25–2` | `0.05` | Total deterministic particle allocation. |
| Far size | `runtime.carousel.particleField.minRadiusPx` | `1.8px` | `0.75–6px` | `0.05px` | Smallest distant circles and perceived far-plane distance. |
| Near size | `runtime.carousel.particleField.maxRadiusPx` | `18px` | `6–36px` | `0.5px` | Largest foreground circles and perceived near-plane distance. |
| Motion response | `runtime.carousel.particleField.motionResponse` | `1` | `0.25–2.5` | `0.05` | Strength of velocity-driven particle travel. |
| Parallax depth | `runtime.carousel.particleField.parallaxDepth` | `1` | `0.25–2` | `0.05` | Speed separation between far, middle, and near layers. |

Normalization rules:

- `fastOpacity` must be at least `idleOpacity`.
- `maxRadiusPx` must remain greater than `minRadiusPx` by a safe minimum separation.
- Layer radius and speed ratios remain implementation constants in v1.
- The existing `runtime.carousel.speedField` object may be accepted as a temporary load fallback, but canonical save/export must emit only `runtime.carousel.particleField`.

## Non-Goals

- No trails, streaks, lines, rings, blur, bloom, collision physics, or hand-drawn helper geometry.
- No per-layer colour controls or custom palette editor.
- No independent quiet-band centre control; the band follows Orbit Y.
- No per-layer particle count, radius, opacity, drift, or speed controls.
- No separate mobile particle configuration in v1.
- No user-facing idle-drift speed control in v1.
- No changes to carousel input, inertia, lead limiting, snapping, card geometry, drawer handoff, accessibility, or focus rules.
- No changes to the legacy `#c` renderer.
- No WebGL migration; retain the dedicated Portfolio Canvas 2D controller.
- No new public application API.

## Design Considerations

- The field should read as ambient spatial depth at rest, visual propulsion during normal scrolling, and a rushing layered environment at extreme speed.
- The centre corridor must be subdued, not empty. Particles remain visible behind cards at a lower opacity so the mask does not look like a cut-out stripe.
- The top and bottom should carry more particle presence, but must not overpower intro text, footer details, or Button Bar controls.
- Far size and Near size are depth-composition controls, not merely decoration. A larger endpoint difference should make the field feel deeper.
- Keep circles solid and material. Do not add thin illustrative geometry that conflicts with the site's ball/circle language.
- The transition from idle drift to velocity-driven movement must feel continuous; there is no activation event.

## Technical Considerations

- Primary runtime owner: `react-app/app/src/legacy/modules/portfolio/portfolio-speed-field.js` and its caller in `app.js`.
- Controls remain declared once in `src/legacy/modules/portfolio/panel/control-registry.js` and use the existing panel dock/popup hosts.
- Canonical authored source remains `react-app/app/public/config/design-system.json`; generated configs must be produced by `npm run flatten:design-config` rather than hand-edited.
- Rename the canonical configuration group from `speedField` to `particleField`, with a normalizer-only fallback for previously authored `speedField` values if required.
- Replace activation/deactivation hysteresis with a zero-based continuous intensity curve driven by smoothed measured velocity.
- Use a controller-owned bounded idle scheduler so slow drift can continue while the deck itself is settled. Increase draw cadence only while measured carousel motion requires it.
- Preserve allocation-free drawing. Particle arrays, colour batches, layer metadata, and the quiet-band mask/gradient must be created only on initialization or meaningful resize/configuration changes.
- Prefer a cached Canvas 2D opacity mask/compositing pass for consistent Chromium/WebKit rendering. If a CSS mask is used, verify equivalent output in both browsers and both themes.
- Keep DPR capped and preserve deterministic seeded particle positions across idle/moving state changes.
- Update `docs/reference/PORTFOLIO.md` because the field's lifecycle contract changes from speed-activated to persistent.
- Extend the existing Portfolio audit snapshot instead of adding a new public API.

## Success Metrics

- The field is visibly present within one rendered Portfolio frame after the closed deck becomes active.
- Visual inspection shows a clear but soft reduction behind the card corridor and stronger particle presence above and below it.
- Idle-to-motion and motion-to-idle transitions contain no opacity pop, canvas clear, or particle reseed.
- Far size and Near size produce independently visible changes and preserve valid derived layer ranges at both extremes.
- All nine controls apply live and round-trip through save, reload, flattening, build, and production preview.
- Peak-speed Chromium performance sustains at least 58 FPS with p95 frame interval no higher than 20ms during the focused ten-second measurement.
- Idle drift remains bounded with fixed DOM/particle counts and pauses completely when lifecycle-suspended.
- Reduced-motion mode shows the intended static field with no animation frames scheduled for particle movement.
- `npm run check:site` and the relevant Portfolio carousel, drawer, pointer, and serial transition audits pass.

## Open Questions

- None. Confirmed decisions: slow continuous idle drift; quiet band follows Orbit Y; reduced motion shows a static field; compact core controls; separate Far size and Near size depth endpoints.
