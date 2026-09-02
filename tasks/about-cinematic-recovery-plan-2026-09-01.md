# About cinematic recovery plan

Created 1 September 2026 after the current desktop/mobile Cannes contact sheets were rejected.

## Status

The forensic baseline at `4a73b244` remains rejected. B61 is the current canonical review build after the storyboard and jury refinement sweep. Its controlled Blender source has SHA-256 `4ae8204542c4fe4dcb195dacef4f787f5204567aa76ea4b96f9be8d1cbf10253`; release verification remains the completion boundary.

The public review mirror may show this source after the canonical bundle is regenerated, but production release remains a separate explicit action. Final repository, cross-browser and fresh jury gates still control the completion claim.

## Audience, use and completion condition

- Audience: prospective clients, hiring teams and collaborators.
- Intended use: a short, scroll-controlled personal film that remains readable and usable as a web page.
- Visual authority: the accepted 30 August desktop/mobile frames under `output/playwright/about-award-standard-20260830/`, supplemented by the detailed Blender source and export at fixed point `ebb0ecc3`.
- Failure evidence: `output/playwright/cannes-lions-review-20260901/` at `b172b8cd`, plus live measurements at `4a73b244`.
- Content authority: the 13-field PRD manifest is frozen during visual recovery. The fixed-point and current strings must be presented side by side before wording changes; a visual repair must not silently rewrite the narrative again.
- Canonical scene: `source-assets/about-v2-blender-current/about-v2-track-working.blend`.
- Canonical export: `react-app/app/public/models/about-v2-edited-world/` generated directly from that tracked source path.
- Completion condition: the exact candidate HEAD passes the visual, motion, gate, reading, logo, performance, access and public-preview gates in this document. A passing build or isolated diagnostic is not completion.

## Visual reset accepted after phone review

The five browser frames supplied on 1 September are the current visual brief. They replace B14's donor-object and workbench direction without cancelling the runtime, access, gate-passage or verification requirements already accepted.

1. Preserve the dense sixteen-square-gate tunnel shown in the first supplied frame. Its nested colour rhythm, depth and full-viewport enclosure are protected. Later work may extend its release but must not simplify or replace the existing gate bank.
2. Rebuild the opening as a much deeper irregular volume around “Hi, I’m Alex.” It must have foreground, middle and far populations, uneven clustering, overscan on all sides and a calm central reading volume. It must not read as a shallow wallpaper layer.
3. Replace the B14 editorial donor fragments with authored geometric forms. The first readable set is triangle, square and diamond; the volumetric set is pyramid, sphere and cube. These are real Blender meshes with deliberate face-level palette assignment before point sampling, not arbitrary particle clumps.
4. Make the round passage a long curved spatial tunnel. Author its centreline as an editable Blender curve, sample the camera by cumulative arclength, orient it from a smooth look-ahead tangent and keep scroll distance proportional to physical camera distance. The feeling may suggest a restrained rollercoaster, but speed, tangent and roll must remain stable.
5. Keep particles present behind every text and transition. Use one sparse ambient field plus overlapping outgoing/incoming stage windows. A major scene may be culled after passage, but the composite frame may never fall to an unapproved empty-black state.
6. Restore the prior floor-flight and emerging mountain-range sequence after the round tunnel. The floor must continue beyond the camera frustum; the mountains emerge through depth and fog rather than appearing as small isolated fragments.
7. Recover logo scale and spacing from the exact historical source commit that produced the earlier balanced layout. Do not estimate from memory. Preserve later accessibility and deterministic-loading fixes only when they do not alter the recovered optical result. Replace the surrounding particle-clump background completely with the floor/mountain world.
8. Replace the B14 workbench finale with one simple spatial event: the journey opens onto a broad living horizon that extends beyond both horizontal edges and into far depth. Keep the final title, support and actions vertically centred as one lockup. No former gates, donor fragments, visible terrain perimeter or decorative object pile may remain.

### Blender authoring contract

The tracked `.blend` file must expose coherent parameter groups for opening depth/density/randomness/seed; geometric-body type/size/rotation/spacing/face palette; round-tunnel length/curve/radius/ring spacing/twist; camera look-ahead/roll limit; ambient density and transition overlap; floor dimensions/variation; mountain amplitude/frequency/roughness/emergence; square-gate count/spacing/colour sequence; finale horizon dimensions/motion; and desktop/mobile point budgets. Parameters must be readable as Blender custom properties or Geometry Nodes inputs and documented with defaults, units and safe ranges.

The website remains an exported renderer. It must not recreate these compositions through CSS masks, screen-space fillers or per-breakpoint random placement. Desktop and mobile may use authored camera/composition profiles and nested point-budget prefixes, but both profiles must come from the same Blender source.

## What went wrong

### 1. One change replaced too many sources of truth

Commit `3d727980` changed 67 files with about 12,511 insertions and 2,438 deletions. It combined canonical copy, responsive text layout, logo sizing, the Blender scene, camera track, surfel export, renderer, scroll transport and new tests. This prevented a clean review of whether the new scene preserved the accepted visual character.

The next scene integration at `b172b8cd` changed another 62 files and declared the work complete. Its own later Cannes capture failed three of 24 visual checkpoints.

### 2. The detailed Blender journey was replaced

The fixed-point Blender file contained 60 objects, 31 mesh objects, 14 images, 28 materials, two curves with 1,442 curve points, recognisable floating objects and a five-part workbench finale. The rewritten scene contains 40 objects, 28 mesh objects, one image, 18 materials and one 17-point path curve. Its six broad stages reuse a ribbon canyon and responsive lattice as the dominant middle and final vocabulary.

The saved source shrank from 56.38 MB at `ebb0ecc3` to 7.94 MB in `3d727980`, then 10.66 MB at `b172b8cd`. This was a scene replacement, not a refinement that retained all earlier detail.

The camera also changed from an 85° horizontal FOV at the fixed point to 65° in the rewritten scene while the route became much longer. The narrower lens and longer travel compress apparent depth and reduce the foreground scale that made the earlier corridors feel deep.

The old visual donors must return as editable geometry or explicitly approved equivalents. The repaired gate camera and access/runtime work must be retained separately; the old camera track must not be restored wholesale.

### 3. The route was stretched faster than its visible density

The rail grew from 1,313.968 WU in `3d727980` to 2,399.977 WU in `b172b8cd`, an 82.7% increase. Over the same change:

- desktop canyon allocation fell from 46,423 to 43,823 surfels;
- mobile canyon allocation fell from 15,168 to 12,500;
- desktop terminal allocation fell from 39,385 to 36,866;
- mobile terminal allocation fell from 12,869 to 10,418;
- world width expanded from about `x ±129` to `x ±419`;
- the reading fit added a 105 WU shoulder lift and a central opening about 144–150 WU wide.

As a rough whole-rail comparison, visible desktop canyon and terminal points per rail unit fell by about half. The fit solved text clearance by moving material to peripheral banks and adding open distance. It did not preserve the accepted density, foreground layering or stage variety. That is why the middle reads as thin side strips and why the same wall silhouette appears at multiple stages.

### 4. Body measure has multiple owners

The live desktop page currently renders the main editorial fields at 800 px wide and `text-life-character` at 368 px because of a field-specific `23rem` rule introduced by `3d727980`. Mobile editorial fields are forced to 68vw, measured at 265.19 px on a 390 px viewport.

The route also mixes the reading-width token, 42ch prose, 34ch mobile prose and 24ch finale support. Visibility audits passed because the words were technically present. They did not check that same-role body copy used one coherent measure.

### 5. Logo normalisation measures files, not optical weight

`3d727980` added a runtime canvas scan that multiplies each logo by the inverse of its largest alpha-bound dimension, up to 3x. CSS then multiplies that result by authored and breakpoint scales.

On the live 390 px layout, measured visible mark heights range from about 5.3 px for Maybourne and 8.8–9.0 px for Lufthansa and Sony to 26.8 px for Yoti. Several wordmarks are therefore technically normalised by width but visually unreadable. The existing test reads only a CSS display-scale variable; it does not measure the final visible artwork.

### 6. Mechanical smoothness was mistaken for perceptual smoothness

The current local Chromium profile has fast frame delivery: about 9.1 ms p95 and no frames over 25 ms in the tested segments. Scroll-to-camera distance also remains mathematically linear with error below `2.3e-12` WU.

Those checks do not measure wheel-step quantisation, per-frame camera acceleration, orientation jerk or apparent geometry collapse. Current scroll smoothing is zero, so desktop camera samples follow painted native scroll steps. Commit `4a73b244` also multiplies every point radius by both ranked reveal and stage visibility, allowing whole structures to shrink towards zero during handoffs. It raised atmosphere while reducing colour strength. This can feel choppy and flat even when the renderer meets its frame budget.

### 7. Completion status ignored known visual failures

The current completion sweep says implementation and browser verification are complete. Later in the same document it records a sparse middle canyon, a quiet method world, narrow peripheral strips and an unsuccessful full checkpoint. The Cannes capture then reports:

- desktop shaping: zero framed terminal surfels;
- desktop thinking: zero framed terminal surfels;
- desktop terminal hold: 357 rendered surfels against a 2,000 minimum, with only about 0.97% of the visible model framed.

The work was marked complete because counts, hashes, clearance, gate passage and frame cadence passed. The actual composition did not.

Current export metadata also names a gitignored evidence copy under `output/playwright/` as its source instead of the tracked canonical `.blend`. The same source bytes exist in `source-assets/`, but a clean checkout cannot reproduce the advertised validation from the recorded path. Recovery must correct that provenance before another completion claim.

## Recovery decision

Preserve the rejected current HEAD at branch `codex/about-cinematic-forensic-4a73b244`. Use the active `codex/about-cinematic-refinement` branch as the recovery integration surface so the managed local/public preview continues to follow the work. Keep Blender write trials in recoverable candidate files until source review. Integrate four separately reviewable changes: visual source, typography/logos, motion/runtime, and validation evidence.

Use `ebb0ecc3` and the accepted 30 August frames as visual donors, not as a wholesale code revert. Retain the verified current contracts for semantic content, full-viewport reading, elapsed contact arrival, pause, reduced motion, restoration, lifecycle safety and all-gate passage. Rebuild the Blender placement and export so the detailed donors work on the repaired rail.

Do not solve depth by adding a global point budget, opacity wash, screen-space text mask or camera wobble. Do not use another broad parametric world rebuild.

## Shot contract

| Beat | Required composition | Rejected outcome |
| --- | --- | --- |
| Opening | Open mist and isolated circles in real depth. Circles emerge once from zero or fog. No full-height side walls frame the first title. | A corridor already present at page load; balls popping as a group; an entrance replay after scrolling back into a field. |
| Inciting pair | Titles remain vertically centred and particles occupy foreground, middle and far depth. The round portal grows from the existing material. | Small copy stranded in the upper half; flat edge decoration. |
| Portal | A deep, unmistakable aperture with approach, threshold and release. | A ring that reads as a flat graphic. |
| Personal origin | One shared body measure. Recognisable detail and layered terrain remain visible without covering copy. | Narrow side curtains repeated from the opening. |
| Disciplines | A broad, dense canyon with distinct foreground, middle and background. Each chapter changes silhouette. | The same two peripheral strips through multiple text fields. |
| Clients | Fifteen optically balanced marks, legible on 320–430 px mobile and desktop, using the same body measure above them. | Runtime auto-scaling, tiny wordmarks, clipped marks or fallback text. |
| Square gates | A deep bank of 16 square gates: the retained 14 plus two additional authored gates near the release. The camera centre passes through every aperture in both directions. | Skipping or clipping a gate; gates assembling too late; earlier gates visible after the passage. |
| Method | A deep central route with the same body width as the other editorial prose. Source detail remains around the aisle. | A special narrow 23rem column or another copy of the canyon wall. |
| Shaping / thinking | The gate bank is gone. Side banks physically end and the view opens through a continuous transition onto a distinct broad landscape. | Another pair of walls replacing the previous pair; empty desktop frames. |
| Final hold | The title, support and actions are vertically centred as one lockup. A point surface fills the complete usable width and extends beyond every visible edge, with no perimeter or former gates visible. | A thin bottom line, visible surface bounds, edge gaps, or a different desktop/mobile climax. |

## Implementation sequence

### Change 1 — Recover visual source and camera composition

1. Create the isolated recovery worktree and preserve hashes for the current source, export, camera and content.
2. Open the fixed-point and current `.blend` files side by side in controlled Blender sessions. Inventory the accepted landmark meshes, environment forms, imported assets, materials and finale parts.
3. Select the exact donor set that appears in the accepted frames. Retain those meshes and their detail; do not reintroduce unused or unlicensed assets by file size alone.
4. Place the donors on the repaired camera rail. Keep one rail, one camera owner, constant physical distance per rendered scroll distance, all current accessibility states and the gate aim correction.
5. Review 85° and 65° FOV with matched frames before committing to either. Select the lens that restores foreground scale and corridor depth while keeping every gate centred. Do not compensate for the wrong lens by widening all geometry.
6. Restore stage-specific silhouettes. The opening, terrain, gates, method and ending must not share the same side-bank generator.
7. Add two square gates at the release end for 16 total. Extend the gate bank in source space, update aperture metadata and verify exact front/middle/back passage for all gates.
8. End and cull the gate stage before shaping. Keep GPU buffers stable, but early-reject passed stages in the shader so old gates cannot reappear.
9. Build the final landscape as a distinct connected surface. Its physical extent must exceed the desktop and portrait frusta through the full held-motion envelope. Banks end before it; their geometry is not reused as the final surface.
10. Export only from the tracked canonical `.blend`. Metadata must name the tracked source path and reproduce in a clean checkout.

**Checkpoint:** matched source renders for opening, disciplines, method, gate entry/middle/exit, shaping, thinking and final hold on desktop and portrait. No runtime CSS compensation is allowed at this checkpoint.

### Change 2 — Restore one typography and logo system

1. Remove the `text-life-character` 23rem exception and the blanket 68vw field rule.
2. Define one semantic body measure per viewport class. Same-role body fields must compute within 2% of that measure. Use viewport padding and safe-area insets rather than field-specific widths.
3. Keep the full-height reading stage. Lines must enter through the bottom edge, travel through the vertical centre and leave through the top edge with only the small viewport-edge feather.
4. Preserve one body type token and line-height rhythm. Inspect at native scale before changing font size; the measured current desktop prose is 26.4 px and mobile prose is 17.36 px, so the primary confirmed defect is measure and staging.
5. Keep the closing lockup vertically centred as a unit in every supported height. Compose the landscape around the lockup, not by pushing the title upward.
6. Remove the runtime alpha-bound logo multiplier and its synchronous per-image canvas scan.
7. Add deterministic per-logo optical scale and offset values to the authored content or a checked logo manifest. Size against visible artwork bounds and cap both height and width so wide wordmarks and square marks feel balanced.
8. Add a rendered artwork-bounds audit for all 15 marks at desktop plus 320, 375, 390 and 430 px mobile.

**Checkpoint:** matched contact sheets show one editorial measure, native-size readable type, balanced logos and no text confined to the upper half.

### Change 3 — Make motion continuous without hiding defects

1. Revert the `4a73b244` stage-wide radius multiplication to the stable `b172b8cd` baseline for an A/B comparison.
2. Implement zero-to-full circle growth only for first material admission using deterministic per-point reveal rank. The scale is monotonic during entry and does not restart because a stage becomes visible again.
3. Use fog/density admission for scene handoffs. Do not multiply a complete structure by stage visibility after it has formed. Passed geometry is hard-culled only after its handoff completes.
4. Make fog feel volumetric with bounded analytic depth and height terms plus low-frequency world-space variation. Do not add a full-screen raymarch. Keep point colour and near/far separation strong enough that fog adds volume without flattening the scene.
5. Keep one scroll state for text and camera. Test direct native scroll and a shared rendered-scroll transport as an A/B on desktop. If interpolation is used, the entire page and camera use the same interpolated position; there is no independent camera lag or easing.
6. Keep native touch momentum on mobile unless physical-device evidence proves a shared transport is better. Remove non-passive input interception and per-frame React or history work.
7. Add a motion-continuity probe that records per-frame scroll delta, camera distance, camera rotation, acceleration, jerk, stage radius range and handoff state. Frame cadence remains a separate metric.
8. Tune the rail and orientation at the source. Do not use a steadycam filter to conceal a broken curve, gate aim or bank key.

**Checkpoint:** uninterrupted forward and reverse recordings at normal and fast input show stable speed, no entrance replay, no whole-stage pulse, no gate clipping and no optical camera jump.

### Change 4 — Lock performance, access and truthful evidence

1. Keep static point buffers and the existing bounded desktop/mobile LOD strategy. Reallocate by expected screen contribution and travel length before raising total budgets.
2. Keep GPU stage culling for passed geometry. Avoid dynamic buffer deletion, per-frame allocations and main-thread logo raster scans.
3. Measure desktop, WebKit and physical iOS/Android frame pacing. Record device limits separately from browser emulation.
4. Retain pause, reduced motion, semantic reading order, keyboard access, WebGL failure access, route restoration and immediate contact arrival.
5. Run all scene/export, text, gate, scroll, lifecycle, access, build and site gates from the exact candidate HEAD.
6. Capture new native-scale desktop/mobile contact sheets and continuous films from that same HEAD. Review every frame at full size.
7. Mark the work complete only after the visual capture has zero failures. Update the PRD and completion sweep after evidence exists, never in the implementation commit that changes the behaviour.

## Quantitative acceptance gates

### Viewport occupancy and spatial depth

- Measure the usable viewport after excluding the persistent shell, Button Bar, utility rail and protected text/action regions. Scene success is judged inside that usable area, not the raw browser rectangle.
- Divide the usable scene area into a 12×8 grid. Editorial beats must occupy at least 35% of unprotected cells; cinematic thresholds and the final landscape must occupy at least 45%.
- Except for an explicitly approved side-bank transition, no more than 65% of framed surfels may sit in the outer left/right 20% bands. The central 60% must contain visible material in at least three vertical bands.
- Each major spatial beat must contain visible near, middle and far depth populations. Calibrate the depth cuts against the accepted 30 August frames, then freeze them in the audit.
- Opening, disciplines, gates, method and finale must have materially different occupancy signatures. The audit records their grid signatures; the contact sheet remains the human composition authority.
- Occupancy cannot be improved by intersecting protected copy. Scene coverage and reading clearance must pass together at the same checkpoint.

### Text and logos

- Same-role body widths differ by no more than 2% within a viewport.
- No desktop method-only narrow column and no blanket 68vw mobile field.
- Every body line passes through the lower, middle and upper thirds of the usable viewport during its journey.
- All 15 logo artwork bounds are visible, unclipped and recognisable at 320, 375, 390, 430 and desktop widths.
- Logo sizing is deterministic before first paint; no synchronous alpha scan runs on image load.

### Scene and camera

- All 16 square apertures pass front, middle and back crossing checks forward and reverse.
- Every major beat has foreground, middle and background occupancy in matched desktop and portrait frames.
- Opening, disciplines, method and ending have visibly different silhouettes.
- Passed gates have zero framed surfels by shaping and remain absent through the final hold.
- Equal rendered scroll distance produces equal physical camera distance. Camera acceleration and orientation jerk remain within the reviewed motion envelope with no discontinuity at stage joins.

### Final landscape

- Shaping and thinking each frame at least 24 terminal surfels on desktop and portrait.
- Final hold renders at least 2,000 terminal surfels, occupies at least four screen rows and both outer 2% strips, and holds at least 200 WU of framed depth on each side.
- The connected surface covers all horizontal bins and remains beyond the visible frustum through two complete motion cycles.
- No contact/action intersection, visible perimeter, former gate or replacement side wall appears at any sampled phase.
- The final title/support/action lockup remains vertically centred at desktop, 390×844, 320×740 and short portrait.

### Motion and performance

- Continuous desktop and mobile forward/reverse journeys at normal and fast input contain no stage-size collapse, entrance restart, gate skip, camera lag, snap or stationary scroll tail.
- Chromium and WebKit keep p95 frame intervals at or below 20 ms, no frame above 100 ms and no more than 1% above 50 ms.
- Physical phone traces and video are required before describing phone motion as complete.
- Native touch momentum continues after release unless the reviewed shared-scroll experiment proves a better complete-page result.

## Verification commands

Run targeted checks after each change, then the full gate serially from the recovery worktree:

```bash
npm run studio:status
npm run check:about-v2-assets
npm run check:about-narrative
npm run check:site
npm run studio:check
npm run build:about-certification
ABS_BROWSER=chromium npm run audit:about-narrative-terminal-hold
ABS_BROWSER=webkit npm run audit:about-narrative-terminal-hold
ABS_BROWSER=chromium npm run audit:about-responsive-sequence
ABS_BROWSER=webkit npm run audit:about-responsive-sequence
node scripts/audit-about-gate-passage.mjs
node scripts/audit-about-scroll-coupling.mjs
node scripts/audit-about-scroll-smoothness.mjs
node scripts/capture-about-narrative-contact-sheets.mjs
```

The motion-continuity and rendered-logo-bounds probes described above are missing today and must be added before the recovery can close.

## Risks and controls

- A wholesale revert would lose valid access, restoration, gate and lifecycle work. Recover visual assets and behaviour in separate changes.
- Restoring every old Blender object would reintroduce unused detail and possible rights concerns. Select donors from the accepted frames and keep attribution accurate.
- Re-enabling smoothing can create camera lag. Any smoothing experiment must share one rendered scroll owner with text and camera and pass reverse/gate tests.
- Raising point counts can hurt phones without restoring depth. Fix lens, staging, travel length, sampling and LOD allocation first.
- Source-space clearance can become another empty corridor. Review rendered depth before accepting geometric clearance.
- The fixed-point images prove composition, not motion or access. They are visual targets, not completion evidence.

## Deliverables

1. A recoverable Blender source with selected detailed donors, 16-gate rail and distinct boundless finale.
2. A deterministic matching camera/export bundle generated from the tracked source path.
3. One responsive editorial measure system and deterministic optical logo manifest.
4. A renderer with monotonic first admission, fog-led handoffs and post-passage culling.
5. Motion-continuity and rendered-logo-bounds audits.
6. Native-scale matched contact sheets plus uninterrupted desktop/mobile forward/reverse films.
7. A corrected PRD/completion record that links only to evidence from the exact accepted candidate HEAD.

The dependency-based execution and subagent ownership are recorded in [about-cinematic-recovery-rollout-2026-09-01.md](about-cinematic-recovery-rollout-2026-09-01.md).
