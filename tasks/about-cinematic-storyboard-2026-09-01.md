# About cinematic refinement storyboard

Status: **frozen visual composition contract**

This storyboard is the visual approval gate before the final Blender and runtime refinement. The generated images define composition and atmosphere. The written rules below define the motion contract and take precedence when a still image cannot express timing.

## Shared motion contract

- One camera rail owns the entire journey. It advances at constant arc-length speed and matches the painted scroll position on every frame.
- The camera has no sway, catch-up, elastic response, velocity jump, or independent easing.
- Each outgoing field remains visible until the incoming field already occupies the viewport. No handoff may expose empty black space.
- Background particles remain visible at every story position. Density may become quiet around copy, but never absent.
- Desktop and mobile use the same spatial choreography. Mobile crops and reframes the world; it does not shrink the scene into side decoration.
- Text may occupy the lower, middle, or upper viewport. The simulation must support the full viewport while preserving line-level legibility.
- Geometry behind the camera is retired after its handoff. Passed round hoops and square gates cannot reappear later.
- Forward and reverse scrolling are exact spatial inverses.

The first generated contact sheets were mood boards, not implementation storyboards. The first jury rejected them as a final gate because they lacked real viewport ratios, copy, persistent shell controls, transition frames, and mobile two-column logos. The v2 director boards correct those omissions with entry, key, and exit frames for every beat.

## Storyboard jury decision

The second-pass simulated Cannes jury froze this director board as the implementation contract. The narrative review found no remaining copy or story blockers and scored overall narrative readiness 9/10. The responsive/UI review found no remaining storyboard-level blockers and scored implementation-gate readiness 8.7/10. Both reviews require the final browser implementation to prove continuous timing, copy dwell, logo legibility, gate traversal, and full-viewport occupation; the still board does not substitute for that motion evidence.

## Measurable movement rules

- Measured journey allocation is 0–11% origin, 11–22% forms, 22–45% round tunnel, 45–59% landscape, 59–81% square gates, 81–95% method release, and 95–100% finale. The client constellation is intentionally nested inside the living landscape at 46.5–52%; it is an editorial layer over the continuing floor and fog, not a separate disjoint scene.
- The rail is C2-continuous. Orientation uses a parallel-transport frame with world-up correction and no roll. Position and orientation sample the same painted scroll progress in the same render frame.
- Within any 1% rail window, heading changes by no more than 6 degrees and pitch by no more than 3 degrees. Adjacent windows may not change angular rate by more than 25%.
- All 28 hoop planes and all 16 gate planes are crossed in order. At each crossing, the optical axis stays within 5% of the opening width from its centre.
- During the central 80% of the round tunnel, at least eight hoops remain visible ahead. During the gate run, at least five gates remain visible ahead until the final four crossings.
- Before outgoing coverage drops below 50%, incoming material covers at least 65% of viewport width and 65% of viewport height. Outside declared text-safe cells, no sampled viewport may contain an empty 2-by-2 block in a 6-by-10 occupancy grid.
- Particle forms interpolate from already visible material. Radius may increase after a particle is spatially present, but opacity and radius may not both begin at zero.
- Retirement is reversible. Geometry deactivates one frustum depth behind the camera and preactivates one frustum depth before reverse re-entry, with bounded distance hysteresis.
- The terminal stop comes from scroll progress clamping at 100%. It does not have a separate camera ease.

## Eight beats

### 1. Origin field

- **Camera:** constant forward drift through three or more depth bands.
- **Field:** deeper and more random than the current opening; near, middle, and far particles remain visible around the copy.
- **Text:** centred entry lockup with full-height breathing room.
- **Handoff:** the field resolves into recognisable forms while the deep background remains continuous.

### 2. Crafted forms

- **Camera:** calm forward parallax without roll or wobble.
- **Field:** readable triangle, square, and diamond silhouettes plus pyramid, sphere, and cube bodies. Each face or coherent surface uses a deliberate palette role.
- **Text:** the forms frame the copy without collapsing into edge-only clusters.
- **Handoff:** distant circular hoops appear before the final form leaves the viewport.

### 3. Round portal run

- **Camera:** follows a long, strongly curved spline at the same constant speed as the rest of the journey.
- **Field:** at least twenty-eight circular hoops; the continuation remains visible far ahead like a rollercoaster tunnel.
- **Text:** copy may cross different vertical zones without the tunnel disappearing.
- **Handoff:** the point floor becomes visible before the last hoop retires behind the camera.

### 4. Living landscape

- **Camera:** low glide above the floor, following its broad curve.
- **Field:** a full-width point floor with an emerging mountain range made from the same material; visible background particles and volumetric depth.
- **Text:** copy floats above the terrain with protected lines, not a black replacement plate.
- **Handoff:** the quiet client atmosphere begins only after the floor owns the frame.

### 5. Client constellation

- **Camera:** steady forward glide with shallow parallax only.
- **Field:** quiet floor and fog continue behind a historically balanced logo arrangement. No random blobs cross the logos.
- **Logos:** restore the optical size and spacing relationships from the accepted historical layout; desktop uses three columns and mobile uses two.
- **Handoff:** the first square gate is visible before the final logo row leaves.

### 6. Square gate cathedral

- **Camera:** remains dead-centre through all sixteen gates and passes through every opening.
- **Field:** nested rounded-square gates fill the viewport, preserving the density and depth of the approved screenshot.
- **Motion:** camera travel and scroll remain one-to-one; passed gates are retired behind the camera.
- **Handoff:** the gates open into the method field before the last visible gate disappears.

### 7. Method release

- **Camera:** continues forward on the same rail.
- **Field:** the corridor releases into two broad, fluid particle banks and a central path. No passed gates remain visible.
- **Text:** vertically centred while geometry occupies the top, middle, bottom, and sides.
- **Handoff:** the banks flatten and widen into the final surface without a cut.

### 8. Infinite finale

- **Camera:** maintains the journey speed, then performs one clean terminal lock when the scroll reaches the end.
- **Field:** a vast point surface extends beyond every viewport edge. No platform boundary, perimeter, or isolated island is visible.
- **Text:** final title and action are vertically centred.
- **Ambient motion:** subtle volumetric drift continues after the camera locks.

## Jury evidence

- Tracked desktop director board: `tasks/assets/about-cinematic-storyboard-2026-09-01/about-storyboard-desktop-director-board.jpg`
- Tracked mobile director board: `tasks/assets/about-cinematic-storyboard-2026-09-01/about-storyboard-mobile-director-board.jpg`
- Desktop v2 director board: `output/playwright/about-cinematic-storyboard-v2-2026-09-01/about-storyboard-desktop-director-board.png`
- Mobile v2 director board: `output/playwright/about-cinematic-storyboard-v2-2026-09-01/about-storyboard-mobile-director-board.png`
- Director-board source and layout: `output/playwright/about-cinematic-storyboard-v2-2026-09-01/storyboard.html`
- Structural validation: `output/playwright/about-cinematic-storyboard-v2-2026-09-01/storyboard-validation.json`
- ImageGen source plates: `output/playwright/about-cinematic-storyboard-v2-2026-09-01/source/`
- Superseded first contact sheets: `output/playwright/about-cinematic-storyboard-2026-09-01/`
