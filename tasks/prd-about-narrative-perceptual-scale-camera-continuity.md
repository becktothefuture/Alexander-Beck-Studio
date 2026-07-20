# PRD: About Narrative Perceptual Scale and Camera Continuity

## 1. Introduction / Overview

The schema-v5 About narrative has the correct five-lane authoring model—Camera, Visibility, World, Text, and Motion—but its authored values do not yet sustain one coherent material experience. The opening orb and final bust have useful presence, while the turbulent field, grid, discipline constellation, ripple, orbital system, and forming bust often recede into small confetti or distant dust.

This work must make the same circles feel materially continuous across the full story. It must not reintroduce targets, frame origins, depth offsets, orbit controls, per-camera fog, or other retired positioning systems. Camera composition will be controlled only by absolute XYZ position, XYZ rotation, FOV, and easing. World framing will use the existing World transform and shape parameters. Visibility will remain a whole-simulation opacity track. Motion will remain choreography, not a hidden camera system.

The review baseline is the three contact sheets in `output/playwright/about-narrative-hardening/runtime/` recorded before this PRD. Independent art-direction and frontend reviews agreed that the current weakest beats are turbulent depth, the grid/discipline scale, late-grid point size, orbital separation, forming-bust scale, and reduced-motion material weight.

## 2. Clarifying Decisions Resolved from the Brief

The user asked the work to proceed autonomously through repeated visual review. The following decisions are therefore treated as fixed:

- Scope is the complete About narrative, not one checkpoint.
- The existing narrative order and core motion are retained.
- Desktop, mobile portrait, tablet/short landscape, and reduced motion are in scope.
- The exact voids and editorial simulation-off intervals remain intentional.
- “Same look and feel” means a bounded apparent circle-size family and a stable material identity, not identical camera framing at every beat.
- The loop stops only after regenerated contact sheets receive no actionable P0/P1 visual feedback from both independent reviewers.

## 3. Goals

- Keep visible circles large enough to read as circles at every non-zero-visibility checkpoint.
- Preserve an apparent-scale ladder: hero forms, environmental fields, and semantic constellations each have an intentional scale range.
- Make the turbulent passage feel like travelling inside the opening orb rather than looking back at distant particles.
- Make the grid recognizable through rise, flyover, bird's-eye discipline isolation, return, and ripple.
- Make the six-discipline constellation occupy a deliberate central footprint on desktop and mobile.
- Keep one core plus four orbital satellites individually legible.
- Make bust formation readable before the final portrait arrival.
- Make reduced motion still rather than visually disabled.
- Preserve the allocation-free bounded renderer and fixed point pool.

## 4. User Stories

### US-001: Establish a durable circle-size floor

**Description:** As a visitor, I want distant particles to remain legible circles so the visual material feels consistent throughout the sequence.

**Acceptance Criteria:**

- [ ] The point shader has an explicit CSS-pixel diameter floor appropriate to the About narrative.
- [ ] The point shader retains a bounded maximum diameter to prevent giant foreground discs.
- [ ] Perspective scaling varies smoothly and does not produce near-pixel specks in ordinary visible fields.
- [ ] At every non-zero-visibility audit checkpoint, the 10th-percentile visible coloured-point diameter is at least 3.5 CSS px and the median isolated diameter is at least 4 CSS px.
- [ ] Desktop/mobile median point diameters at corresponding beats differ by no more than 20% unless a documented hero-scale exception applies.
- [ ] The fixed point pool, one-draw-call visible state, and zero-draw-call hidden state remain intact.
- [ ] `npm run check:about-narrative-hardening` passes.
- [ ] Verify in browser using the dev-browser workflow or the project Playwright visual audit when the standalone dev-browser runtime is unavailable.

### US-002: Preserve the inside-complexity depth experience

**Description:** As a visitor, I want the scattered field to retain foreground, midground, and distance so flying into complexity feels continuous with the opening orb.

**Acceptance Criteria:**

- [ ] `desktop-complexity-threshold` retains a dominant near/mid mass without making the text unreadable.
- [ ] `desktop-turbulent` contains at least one edge-clipping foreground band, one readable midground knot, and sparse distant material.
- [ ] `mobile-complexity-inside` contains a dominant nearby mass rather than only isolated dust.
- [ ] The turbulent World depth is compressed only enough to limit extreme perspective variation; forward travel and scatter remain evident.
- [ ] Global fog remains one pair and is not repurposed as per-key visibility.
- [ ] No new Camera keys are added solely to repair the turbulent shot unless existing keys cannot satisfy the target.
- [ ] Verify in browser using the fixed desktop/mobile checkpoints.

### US-003: Reframe the grid and discipline constellation

**Description:** As a visitor, I want the organized grid and six disciplines to read as a coherent system rather than tiny confetti and detached labels.

**Acceptance Criteria:**

- [ ] Grid rise still emerges from the bottom as a floor.
- [ ] Grid flyover retains a visible plane and near-point scale while the camera tilts toward bird's-eye.
- [ ] At the discipline hold, the six-label constellation occupies approximately 45–65% of the usable width and 30–50% of the usable height on desktop.
- [ ] The mobile discipline composition is centered, keeps all labels safe, and does not leave the constellation trapped in the top 20%.
- [ ] Each label remains paired with its coloured anchor under exact anchor sampling.
- [ ] Background-grid opacity supports the constellation without competing with it.
- [ ] Grid return and ripple use the same world center and remain recognizably the same material.
- [ ] No label, circle, or field edge clips the studio window.
- [ ] Verify in browser at desktop, mobile, reduced-motion, tablet, and short-landscape discipline checkpoints.

### US-004: Preserve orbital body separation

**Description:** As a visitor, I want to perceive one core and four orbiting bodies so the system feels alive and intentionally three-dimensional.

**Acceptance Criteria:**

- [ ] One core and four satellites are countable at settled and live checkpoints.
- [ ] At settled state, neighbouring silhouettes have at least two projected point diameters of separation.
- [ ] All bodies remain at least 8 CSS px inside the viewport through the audited hold.
- [ ] Orbital motion retains continuous revolution and uses the existing Motion modifier.
- [ ] The orbital center remains the ripple center.
- [ ] Mobile is recomposed with existing profile overrides/World mobile scale rather than miniaturizing desktop.
- [ ] Verify in browser at settled, live, and transition-in frames.

### US-005: Make bust formation readable before arrival

**Description:** As a visitor, I want the orbital material to resolve into a recognizable bust before the finale so the transformation feels continuous rather than rescued by a scale cut.

**Acceptance Criteria:**

- [ ] At WU 20.40 the forming bust occupies 25–35% of the studio-window height.
- [ ] Head and shoulder structure is recognizable at WU 20.40.
- [ ] The existing formation/arrival Camera keys move toward the portrait during the World morph; no target/orbit/depth-offset controls are added.
- [ ] The final bust remains fully in view with at least 24 CSS px of visual separation from the invitation on desktop and mobile.
- [ ] The interaction hit area and Button Bar clearance remain correct.
- [ ] Intermediate morph frames do not expose unacceptable correspondence outliers.
- [ ] Verify in browser at WU 20.30, 20.40, 20.55, 20.65, and 21.10.

### US-006: Preserve material weight in reduced motion

**Description:** As a reduced-motion visitor, I want a stable version of the same visual material rather than a faded or disabled-looking simulation.

**Acceptance Criteria:**

- [ ] Reduced motion disables/settles continuous travel and ambient motion as before.
- [ ] No CSS rule applies a second whole-canvas opacity authority outside the Visibility lane.
- [ ] Equivalent full/reduced checkpoints differ in simulation alpha by no more than 10%.
- [ ] Authored zero-visibility beats still produce zero draw calls.
- [ ] Orb, grid anchors, orbital bodies, and bust retain recognizable palette and silhouette.
- [ ] Verify in browser using the expanded reduced-motion contact sheet.

## 5. Functional Requirements

- **FR-1:** The global point material must define one baseline point size for the sequence.
- **FR-2:** The vertex shader must clamp projected CSS-space diameter to a documented minimum and maximum.
- **FR-3:** Perspective scaling must remain continuous and bounded.
- **FR-4:** The World lane must own turbulent-field dimensions, density, and transforms.
- **FR-5:** The Camera lane must own grid, discipline, orbital, and bust framing through absolute position, rotation, FOV, and easing only.
- **FR-6:** The Visibility lane must remain the only whole-simulation presence control.
- **FR-7:** Global fog must remain constant for the whole sequence.
- **FR-8:** The Motion lane may tune ripple/orbital dynamics but must not reposition the camera.
- **FR-9:** Profile overrides may recompose mobile but must not create a second positioning model.
- **FR-10:** Existing World correspondence modes and shared ripple/orbital/bust center must remain valid.
- **FR-11:** Renderer changes must remain allocation-free in the hot path and use the fixed point pool.
- **FR-12:** Visual audits must expose enough intermediate frames to judge continuity, not only endpoints.

## 6. Non-Goals

- No new camera target, look-at, orbit, depth-offset, frame-origin, or dolly controls.
- No per-camera or per-key fog.
- No replacement of the point-cloud visual language.
- No new typefaces, colour system, shell geometry, or Button Bar behavior.
- No removal of intentional voids.
- No wholesale rewrite of the shape generator or renderer.
- No attempt to make every World occupy exactly the same number of pixels.

## 7. Design Considerations

- Hero forms should occupy roughly 25–45% of window height.
- Environmental fields may fill/crop the frame but need readable near/mid circles.
- Semantic constellations need a stable central footprint and legible anchor/label relationships.
- Negative space remains valuable when it is intentional and timed.
- Material may frame copy but must not erase glyph counters.
- Mobile should be deliberately recomposed.

## 8. Technical Considerations

- Primary authored file: `react-app/app/public/config/contents-about.json`.
- Renderer point-size logic: `react-app/app/src/routes/about-narrative-lab/AboutNarrativePointWorld3D.jsx`.
- Editor range, if baseline size exceeds the current UI maximum: `aboutNarrativeDefinitions.js`.
- Exact Camera assertions live in `scripts/check-about-narrative-sectionless-live.mjs` and must be updated intentionally.
- Shape/correspondence and runtime hardening suites must remain green.
- Raising point diameter increases overdraw; keep the maximum bounded and validate runtime metrics.

## 9. Success Metrics

- No P0/P1 scale/framing issue remains in the final independent contact-sheet reviews.
- Every non-zero checkpoint meets the point-diameter thresholds.
- Six disciplines are centered and safely paired to anchors across profiles.
- Five orbital bodies are individually countable at settled/live checkpoints.
- Bust formation meets the 25–35% height target before finale arrival.
- Reduced-motion alpha parity remains within 10%.
- All About hardening tests, site checks, and browser audits pass.

## 10. Open Questions

None. Exact numerical values are tuning variables and must be selected through the fixed capture/review loop rather than further product clarification.
