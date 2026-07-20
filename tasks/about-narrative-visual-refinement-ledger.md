# About Narrative Visual Refinement Ledger

## Fixed references

- `DESIGN.md`
- `docs/reference/ABOUT-NARRATIVE-TOOLKIT.md`
- User's sequence brief in the active Codex task
- Baseline desktop/mobile/reduced contact sheets recorded before 2026-07-19 refinement

## Fixed preview set

- Desktop runtime contact sheet
- Mobile portrait runtime contact sheet
- Reduced-motion runtime contact sheet
- Tablet opener/discipline/finale spot checks
- Short-landscape opener/discipline/finale spot checks

## Rubric

Each category is scored 1–5: material continuity, narrative clarity, spatial hierarchy, typography, responsive parity, implementation realism. Any stable-shell, accessibility, visibility, reduced-motion, or runtime-gate regression is an automatic discard.

## Iteration 0 — baseline

- **Hypothesis:** The schema-v5 authoring model is structurally correct, but authored values and a few layout/runtime details create inconsistent apparent scale and composition.
- **Changed surface:** None; review only.
- **Evidence:** 32-checkpoint desktop/mobile/reduced runtime capture.
- **Score:** material continuity 2; narrative clarity 3; spatial hierarchy 2; typography 2; responsive parity 2; implementation realism 4.
- **Decision:** Discard as final presentation; keep as technical baseline.
- **Reasons:** Opener off-axis; threshold occlusion; turbulent/grid particles too distant/small; discipline constellation weak; editorial checkpoint inconsistent; bust formation too small; reduced-motion canvas faded.
- **Next mutation:** Correct Text-layer centering and reduced-motion visibility authority before changing spatial framing.

## Iteration 1 — typographic axis and reduced-motion parity

- **Hypothesis:** Removing perspective depth from the opener copy, giving it the full stage width, and preserving full canvas opacity in Reduced Motion will restore the shared visual axis without changing the authored narrative.
- **Changed surface:** Opener fragment layout, mobile stage padding, mobile finale measure, Reduced Motion canvas treatment.
- **Evidence:** Runtime geometry measured the opener at the exact viewport center on desktop, mobile, and Reduced Motion; mobile finale reduced from eight lines to five; Reduced Motion canvas opacity measured at `1`.
- **Score:** material continuity 3; narrative clarity 3; spatial hierarchy 3; typography 4; responsive parity 4; implementation realism 5.
- **Decision:** Keep.
- **Reasons:** The route now begins on a stable central axis and the accessibility profile retains the same material authority as full motion.
- **Next mutation:** Improve perceptual point scale while retaining one global material system.

## Iteration 2 — point-material continuity

- **Hypothesis:** A modest global point-size increase plus a tighter perspective floor will prevent distant passages from dissolving without creating a separate visual language per camera.
- **Changed surface:** Canonical point size, shader perspective range, shader CSS-size clamp.
- **Evidence:** All five Worlds retain one point material; the full runtime contact sheet shows legible individual points in turbulence, grid, ripple, orbital, and bust passages; point-world contract tests pass.
- **Score:** material continuity 4; narrative clarity 4; spatial hierarchy 3; typography 4; responsive parity 4; implementation realism 5.
- **Decision:** Keep.
- **Reasons:** Points now carry a consistent perceptual weight across depth while still scaling naturally during zooms.
- **Next mutation:** Use the camera rig and World transforms to improve composition rather than increasing point size again.

## Iteration 3 — authored camera and World framing

- **Hypothesis:** Bringing the bird's-eye and desktop orbital/bust poses closer, protecting mobile with explicit pose overrides, and compressing the turbulence volume will make each narrative state feel intentional and spatially connected.
- **Changed surface:** Camera X/Y/Z, rotation, FOV, responsive camera overrides, opener/complexity World transforms, turbulence bounds, orbital mobile scale, bust-formation pose.
- **Evidence:** Mobile orbital geometry retains at least an 8px point-radius safety clearance for the entire hold; the bust-build chromatic field occupies at least 18% of desktop viewport height; the 35-checkpoint contact sheet passes.
- **Score:** material continuity 4; narrative clarity 4; spatial hierarchy 4; typography 4; responsive parity 4; implementation realism 5.
- **Decision:** Keep.
- **Reasons:** Grid disciplines are readable, orbital bodies have greater presence, the bust build no longer collapses into a tiny knot, and compact framing remains protected.
- **Next mutation:** Repair editorial and Reduced Motion composition seams, then request independent final review.

## Iteration 4 — semantic seams and certification

- **Hypothesis:** A profile-local editorial position and geometry-preserving Reduced Motion labels will remove the mobile text sliver and keep the discipline constellation composition intact without restoring animation.
- **Changed surface:** Mobile discipline passage reveal line, Reduced Motion label layout, runtime visual-audit geometry assertions and editorial checkpoints.
- **Evidence:** Mobile and desktop editorial primary passages are complete at WU 11.72 and blank at WU 12.50; Reduced Motion discipline labels retain their point anchors; opener center error is no more than 1%; all 35 runtime visual checkpoints pass.
- **Score:** material continuity 4; narrative clarity 5; spatial hierarchy 4; typography 5; responsive parity 5; implementation realism 5.
- **Decision:** Keep for independent review.
- **Reasons:** The contact sheet now exposes the actual reading beat, verifies the empty handoff, and treats Reduced Motion as the same design with motion removed.
- **Next mutation:** Only changes justified by the second art-direction and frontend-simulation review pass.

## Iteration 5 — orbital countability loop

- **Hypothesis:** The live system can preserve five countable bodies without shrinking the material if phase, orbital radius, camera hold, and speed are treated as one composition.
- **Changed surface:** Orbital body phases, orbit/core/body radii, story speed, orbital camera hold, ripple-to-orbit easing, and compact living-field title clearance.
- **Evidence:** Deterministic projection tests now require all five silhouettes to maintain at least 12px separation and 16px viewport-edge clearance at WU 18.70 and 19.40 on 1440×1000 and 390×844; the full mobile hold retains point-radius clearance; regenerated normal- and Reduced-Motion frames show five discrete bodies.
- **Score:** material continuity 5; narrative clarity 5; spatial hierarchy 5; typography 5; responsive parity 5; implementation realism 5.
- **Decision:** Keep for final recertification.
- **Reasons:** The system reads immediately as a core plus four orbiting bodies, no body is cropped, the transition frame resolves into rounded lobes instead of a slab, and point size remains unchanged.
- **Next mutation:** None unless an independent reviewer finds a new P0/P1 issue in the regenerated evidence.

## Iteration 6 — formation-edge clearance loop

- **Hypothesis:** Advancing the existing ripple-to-orbit camera easing can lift the formation composition clear of the Button Bar boundary without adding another camera pose or changing settled/live scale.
- **Changed surface:** Outgoing `grid-ripple-zoomout` camera easing and a robust studio-window-relative formation clearance assertion.
- **Evidence:** The regenerated WU 18.10 formation frame retains rounded lobes and measures 32.20px of dense-material clearance from the studio-window edge, above the 16px gate; all 35 checkpoints pass again.
- **Score:** material continuity 5; narrative clarity 5; spatial hierarchy 5; typography 5; responsive parity 5; implementation realism 5.
- **Decision:** Keep for final recertification.
- **Reasons:** The lower lobe now assembles entirely above the persistent Button Bar while the settled/live five-body compositions remain unchanged.
- **Next mutation:** None unless either final reviewer identifies a P0/P1 issue in this exact regenerated set.

## Iteration 7 — compact-landscape finale closure

- **Hypothesis:** A finale-specific compact-landscape type measure and offset can preserve the centered editorial hierarchy without clipping the bust, invitation, actions, or persistent Button Bar.
- **Changed surface:** Short-landscape finale title measure, font scale, leading, and content offset; production visual-audit alignment and containment assertions.
- **Evidence:** The 844×390 Chromium and WebKit production/editor audits pass; the art-direction and frontend/simulation reviewers independently certify both browser captures; the final 35-checkpoint contact-sheet audit remains diagnostic-free.
- **Score:** material continuity 5; narrative clarity 5; spatial hierarchy 5; typography 5; responsive parity 5; implementation realism 5.
- **Decision:** Keep and close the visual feedback loop.
- **Reasons:** The bust, three-line invitation, and 44px actions share one centered axis with clear vertical intervals and approximately 59px of studio-window clearance beneath the actions in both browsers.
- **Next mutation:** None. Reopen only against new visual evidence or a new narrative requirement.
