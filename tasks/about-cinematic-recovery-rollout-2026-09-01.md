# About cinematic recovery rollout

Created 1 September 2026. This is the execution graph for [the recovery plan](about-cinematic-recovery-plan-2026-09-01.md).

## Goal

Recover and rebuild the About cinematic experience so every desktop and mobile viewport is deliberately occupied by deep, varied, performant point-cloud composition; text and logos are correctly sized; scrolling and camera motion remain smooth and matched; all square gates are traversed and discarded after passage; the ending is vertically centred and visually boundless; and an independent Cannes Lions-style jury completes visual design, UI/web design, motion craft and copywriting assessments from Playwright recordings and matched contact sheets. No completion claim is allowed until the jury evidence and repository gates pass.

## Done criteria

1. The viewport-occupancy, shot, text, logo, camera, gate, finale, motion and performance gates in the recovery plan pass at the exact candidate HEAD.
2. Desktop and mobile continuous Playwright journeys show smooth forward/reverse travel, complete gate passage, distinct spatial beats and a boundless final surface.
3. Matched native-scale contact sheets show correct typography and logos and materially occupied foreground, centre, depth and edges.
4. Chromium, WebKit, reduced-motion, route lifecycle, accessibility and production build gates pass.
5. A separate read-only Cannes-style jury reviews only the final Playwright recordings, contact sheets and copy manifest. Visual design, UI/web design, motion craft and copywriting each issue a finding and vote.
6. The jury president may recommend completion only if no critical visual or functional blocker remains. An award opinion is a simulated creative assessment, not a guarantee of a Cannes Lion.

## Wave 1 — contracts and independent regressions

### Task ID: A01
Title: Viewport occupancy and Blender recovery specification
Type: explore
Dependencies: none
Allowed scope: fixed-point/current Blender source and exports, accepted/current screenshots, camera metadata, scene scripts and task documents
Out of scope: file edits, source mutation, browser/server lifecycle
Can run in parallel with: A02, A03, A04
Validation: source/object/FOV/path comparison; per-shot occupancy recommendations tied to evidence
Risk level: medium

### Task ID: A02
Title: Unified editorial measure and optical logo system
Type: implement
Dependencies: confirmed live layout measurements from the investigation
Allowed scope: `AboutNarrativeLabExperience.jsx`, `about-narrative-lab.css`, canonical About logo scale records if required, focused editorial/logo checks
Out of scope: Blender/export, camera, point renderer, copy wording, shell
Can run in parallel with: A01, A03, A04
Validation: computed-width equality, rendered logo artwork bounds, desktop/mobile screenshots, focused tests
Risk level: medium

### Task ID: A03
Title: Stable surfel admission, fog and passed-stage culling
Type: implement
Dependencies: confirmed `4a73b244` reveal regression
Allowed scope: point renderer, scene look/compositor and focused renderer/projection checks
Out of scope: Blender geometry/export, text/logo CSS, camera/scroll owner, copy
Can run in parallel with: A01, A02, A04
Validation: monotonic first admission, no stage-wide radius collapse, hard cull after handoff, analytic fog cost, focused tests
Risk level: high

### Task ID: A04
Title: Viewport occupancy and perceptual motion audit tooling
Type: test
Dependencies: recovery-plan thresholds
Allowed scope: new/focused scripts under `scripts/`, Playwright output under gitignored `output/`, package scripts only if needed
Out of scope: production runtime, Blender/export, content and styling
Can run in parallel with: A01, A02, A03
Validation: audit runs against current preview and fails the known side-strip/finale/motion defects without false completion
Risk level: medium

## Wave 2 — Blender composition and camera

### Task ID: B01
Title: Detailed visual-donor integration
Type: implement
Dependencies: A01 complete and reviewed
Allowed scope: canonical `.blend`, controlled Blender scripts and scene documentation
Out of scope: runtime CSS/JS, copy, generated export until source review
Can run in parallel with: none
Validation: source renders for opening, disciplines, method and finale; donor inventory and rights/attribution review
Risk level: high

### Task ID: B02
Title: Sixteen-gate rail and distinct final landscape
Type: implement
Dependencies: B01 source checkpoint accepted
Allowed scope: canonical `.blend`, gate/finale Blender scripts, camera/gate metadata
Out of scope: runtime scroll easing, text/logo, shell
Can run in parallel with: none
Validation: 16 apertures crossed front/middle/back in both directions; gates absent after release; final surface exceeds desktop/portrait frusta
Risk level: high

### Task ID: B03
Title: Canonical export and source provenance
Type: implement
Dependencies: B02 complete
Allowed scope: Blender exporter/checker, canonical point bundle, source README/attribution
Out of scope: layout, copy, shell
Can run in parallel with: none
Validation: clean tracked-source export, deterministic hashes, scene contract and point allocations
Risk level: high

## Wave 3 — integration and visual correction

### Task ID: C01
Title: Integrate Wave 1 runtime changes with canonical scene export
Type: implement
Dependencies: A02, A03, A04, B03 complete and reviewed
Allowed scope: About route integration and focused contract repairs
Out of scope: unrelated routes or design system changes
Can run in parallel with: none
Validation: targeted tests plus first complete Chromium desktop/mobile capture
Risk level: high

### Task ID: C02
Title: Composition correction from first complete capture
Type: implement
Dependencies: C01 capture reviewed
Allowed scope: source-owned geometry/camera/material adjustments and narrowly required responsive composition values
Out of scope: new narrative, new visual language, shell changes
Can run in parallel with: none
Validation: occupancy, reading, logo, gate and finale thresholds all pass together
Risk level: high

## Wave 4 — certification and Cannes jury

### Task ID: D01
Title: Repository and browser certification
Type: test
Dependencies: C02 complete
Allowed scope: validation scripts and gitignored evidence
Out of scope: implementation changes except narrowly diagnosed fixes returned to C02
Can run in parallel with: none
Validation: site/build, Chromium/WebKit, reduced motion, lifecycle, access, continuous forward/reverse recordings and native-scale contact sheets
Risk level: high

### Task ID: D02
Title: Cannes visual-design jury
Type: review
Dependencies: D01 passes
Allowed scope: final contact sheets, continuous films, final copy manifest and validation report
Out of scope: implementation edits
Can run in parallel with: D03, D04, D05
Validation: evidence-cited art-direction and spatial-composition assessment with vote
Risk level: low

### Task ID: D03
Title: Cannes UI and web-design jury
Type: review
Dependencies: D01 passes
Allowed scope: same final evidence as D02
Out of scope: implementation edits
Can run in parallel with: D02, D04, D05
Validation: evidence-cited responsive, interaction, usability and web-craft assessment with vote
Risk level: low

### Task ID: D04
Title: Cannes motion-craft jury
Type: review
Dependencies: D01 passes
Allowed scope: continuous films, frame/motion traces and contact sheets
Out of scope: implementation edits
Can run in parallel with: D02, D03, D05
Validation: evidence-cited camera, scroll, handoff, gate and finale-motion assessment with vote
Risk level: low

### Task ID: D05
Title: Cannes copywriting jury
Type: review
Dependencies: D01 passes
Allowed scope: final copy manifest, contact sheets and continuous films
Out of scope: implementation edits
Can run in parallel with: D02, D03, D04
Validation: evidence-cited voice, hierarchy, pacing, specificity and CTA assessment with vote
Risk level: low

### Task ID: D06
Title: Jury-president final vote
Type: review
Dependencies: D02, D03, D04 and D05 complete
Allowed scope: all final evidence and jury reports
Out of scope: implementation edits
Can run in parallel with: none
Validation: consolidated blockers, award-readiness vote and explicit separation between observed quality and any real-world award guarantee
Risk level: low

## Integration rules

- The orchestrator reviews every worker diff and validation result before accepting it.
- Rejected baseline `4a73b244` remains preserved at branch `codex/about-cinematic-forensic-4a73b244`; the active refinement branch is the recovery integration surface.
- Write-heavy workers never share file ownership in one wave.
- Failed audits return to the owning task; thresholds are not weakened to make a candidate pass.
- Blender changes are saved in recoverable candidates before canonical promotion.
- Generated export, browser preview, commit, push and production deployment remain distinct states.
- The current public mirror remains review-only and must not be represented as the recovered result until its hashes match the accepted candidate.

## Execution record

### 1 September 2026 — visual reset after public phone review

The B14 donor-object and workbench direction is rejected and must remain isolated. Numeric viewport occupancy was insufficient because the rendered objects read as cropped debris, the logo background became random particle clumps, the round tunnel remained too short and straight, and several transitions exposed empty black space.

The revised dependency graph is:

1. **H01 — historical logo recovery (read-only):** identify the exact earlier commit and values for optical logo size, spacing, spans and offsets. Preserve later access/loading behavior only when visually neutral.
2. **H02 — scene precedent recovery (read-only):** locate the strongest saved opening, round tunnel, floor, mountain, square-gate and finale sources/renders. Record provenance and reject-state boundaries.
3. **C02 — curved-camera architecture (read-only):** define the arclength camera path, tangent/look-ahead orientation, bounded roll, path-speed metrics and round/square passage tests.
4. **B15/B16 — isolated Blender rebuild (write):** create one parameterized candidate scene with persistent ambient material, a deep random opening, recognisable geometric bodies, a long curved round tunnel, the restored floor/mountain flight, the unchanged square-gate tunnel and a simple overscanned horizon ending.
5. **B17 — source review and candidate export:** render desktop/mobile source checkpoints, verify parameter inventory and gate hashes, export deterministically twice and run the routed Chromium audit without touching canonical files.
6. **B18 — canonical promotion:** only after native-scale visual acceptance, copy the accepted Blender source to the tracked canonical path, export from that exact path and update provenance.
7. **C03/D01 — integration and certification:** apply the historical logo result, verify transition overlap and stage disposal, then run repository, Chromium, WebKit, reduced-motion, lifecycle, access and motion-film gates.
8. **D02–D06 — fresh Cannes jury:** discard every earlier jury report. Four independent jurors and the jury president may inspect only the exact final films, matched contact sheets, copy manifest and validation report.

Protected decisions:

- The square-gate geometry is frozen through B16. Its mesh hash and sixteen-aperture inventory must remain identical.
- A continuous ambient field is part of the scene contract. At every sampled route position, at least one background population must remain rendered outside protected copy.
- The camera uses one cumulative-distance clock. No easing, steadycam lag or scroll-dependent speed change may conceal a poor source curve.
- The logo result comes from source history and rendered optical bounds, not another normalization algorithm.
- No B14 object cluster, workbench pile or thin terminal strip may survive into the accepted candidate.

### 1 September 2026 — runtime recovery accepted for scene integration

- The editorial measure and deterministic logo bounds pass the focused desktop and 320, 375, 390 and 430 px mobile audit.
- Scroll and camera use one painted position. Camera distance remains linear with that position, desktop smoothing is shared by the page and camera, and mobile keeps native touch momentum.
- The repaired journey places the disciplines before gate entry, traverses all 16 gates, moves the Method after gate release and reserves the final section for shaping, thinking and the held invitation.
- Surfel admission grows each point once from zero, scene handoffs use fog-led admission, and passed gates are rejected before the final section.
- A nine-second real-Chrome motion trace passed in both directions on desktop and mobile against the isolated B11 bundle. P95 frame intervals stayed between 9.1 and 9.4 ms, maximum intervals stayed at or below 16.7 ms, camera distance per painted scroll remained effectively constant, orientation had no measured step, and the maximum handoff step stayed below 0.065. This accepts the transport and handoff timing independently of B11's rejected composition.

### 1 September 2026 — B11 isolated scene export rejected

The B10 Blender proxy inspected source vertices only. B11 proved that the deterministic exporter sampled polygon interiors across several large faces, filling intended copy clearings with dense points. Real Chrome desktop and mobile contact sheets therefore rejected the candidate before canonical promotion or jury review.

Observed failures included a dense opening mass behind the lockup, rectangular disciplines clouds, Method surfaces crossing copy, and a finale that became full-viewport confetti. The canonical tracked Blender source and public bundle were left unchanged.

### Recovery subwave B12–B13

1. B12 reconstructs only the opening, disciplines, Method and finale geometry against measured desktop and mobile protected-copy envelopes. Every face must stay outside its protected envelope; no polygon may bridge through a clearing.
2. B12 validation must triangulate/evaluate meshes and sample polygon interiors proportionally, or use an isolated deterministic export. Vertex-only projections are invalid evidence.
3. B13 exports the candidate into a gitignored bundle with repeatable hashes and unchanged camera/gate data.
4. The orchestrator runs the actual candidate bundle in Chrome at the seven desktop and seven mobile checkpoints. A candidate that passes numeric occupancy but reads as wallpaper, flat decoration or repeated side walls is still rejected.
5. Canonical promotion remains blocked until the candidate passes both machine gates and native-scale human inspection. Only that promoted result may enter Wave 4 certification and jury review.

### 1 September 2026 — B13 real-browser result rejected

B12 removed the catastrophic full-face fills, but B13 exposed two remaining problems in the actual WebGL renderer:

- Blender-side camera projections did not match runtime copy intersections closely enough. The sampled proxy reported zero protected hits, while real Chrome measured protected ratios of 0.106 for desktop disciplines, 0.822 for mobile disciplines and 0.309 for mobile Method.
- The replacement vocabulary remained generic: regular rectangular clusters, a block-like disciplines band, repeated Method rows, upper/lower walls and a finale composed as a thin strip plus floating tiles. It did not restore the detailed Blender character or produce the requested boundless landscape.

The deterministic B13 export remains isolated and reproducible, but it is rejected and must not be promoted. B14 must use the routed real-Chrome bundle as the projection authority, restore selected recognisable donor geometry, replace the opening with volumetric balls, and build a true overscanned ground landscape for the finale. Thresholds remain unchanged.

### 1 September 2026 — B41 accepted composition and B42 live controls

B41 is the accepted composition checkpoint. It replaces every rejected B01–B40 trial
without promoting their generators as durable project source.

- Source candidate SHA-256: `1e3b6c0e0150d1434a312a728c531bc5b2bb05f055ba1c48c7ffcce9124e7712`.
- Seven models, 191 exported objects, 28 round hoops, 16 square gates and 1,001
  camera samples.
- The 503.14682 WU camera track uses constant cumulative arclength through its curved
  opening section and a stationary terminal hold.
- The exact candidate bundle passed the generic edited-world checker, all seven
  desktop and seven mobile viewport checkpoints, 73-position desktop/mobile particle
  continuity and nine-second forward/reverse desktop/mobile motion traces.
- Native-scale browser review confirmed the deep opening, recognisable geometric
  bodies, long round tunnel, floor/mountain passage, recovered logo scale, complete
  square-gate bank, populated Method scene and full-width terminal horizon.
- The mobile disciplines correction adds only the three points required in one
  measured unprotected cell. It does not change the gate, camera or point budgets.

B42 installs a real authoring rig instead of claiming that inert custom properties are
parameters. The controlled canonical source SHA-256 is
`062a9245fd708672f81d008eb1cbcdade826a0a8f1a7da14b53745ca8d3c471d`.

- `ABS_AUTHORING_CONTROLS` exposes 25 live parameters across all seven scenes.
- Default evaluated geometry and all 1,001 camera matrices are identical to B41.
- Camera curvature changes the camera and all 28 round hoops together.
- Floor controls include the continuous floor, mountain range and ribbon canyon.
- Logo controls include all 22 atmosphere and safe-continuity surfaces.
- All controls mutated only their intended targets and restored cleanly.
- Gate topology remained unchanged, and the controlled export again passed at 191
  objects, seven models, 135,000 master surfels and zero semantic fallbacks.
- The installer is idempotent and the embedded Blender guide documents re-audit
  requirements for every non-default edit.

The controlled B42 source has been promoted to
`source-assets/about-v2-blender-current/about-v2-track-working.blend`, and the public
bundle has been regenerated directly from that tracked path. D01 certification and
fresh D02–D06 jury review remain the final gates before completion, commit and push.

### 1 September 2026 — B45 storyboard refinement promoted

B45 supersedes B42 as the final canonical scene candidate. It translates the approved
director storyboard into the Blender source and exported runtime without changing the
late gate, Method, finale or logo-atmosphere topology.

- Canonical Blender SHA-256:
  `9a8129c873311a9c6f1fe4897958591c52d3cc2a9d6005892b4fdfb2cd9b6755`.
- The opening contains a deeper asymmetric field; the form passage has six distinct
  hero bodies: triangle, square, diamond, pyramid, sphere and cube.
- Frames 1–430 use an equal-distance C2-continuous S-curve, with all 28 round hoops
  recentered and reoriented on the same rail. Frames 431–1001 preserve the accepted
  late journey.
- The continuous floor, ribbon canyon and mountain field remain visible through the
  nested client section. No approved checkpoint falls to an empty black background.
- All 28 hoops and all 16 square gates are crossed once, centred and in order. The
  503.1467 WU moving path has a maximum step delta of 0.000015 WU, maximum angular
  rate of 0.6904 degrees per WU and maximum roll of 0.000004 degrees.
- `ABS_AUTHORING_CONTROLS` now exposes 31 live controls. The six additions cover
  opening asymmetry, shape progression, floor/mountain depth and density, Method bank
  spread and finale overscan.
- The deterministic export retains seven models, 191 objects, 135,000 master,
  90,000 desktop and 30,000 mobile surfels, 1,001 samples and zero fallbacks.
- Native-scale candidate proof is stored in
  `output/playwright/about-cinematic-storyboard-final-b45/browser-candidate/`.

The promoted public bundle is generated directly from the tracked B45 source. D01
cross-browser certification and a fresh final jury remain the completion gates.

### 2 September 2026 — B61 review build promoted

B60 carries the frozen storyboard through the expanded landscape, earlier gate and
Method overlap, protected Method banks, raised finale canopy and optically corrected
client grid. The canonical Blender source and runtime bundle share SHA-256
`4ae8204542c4fe4dcb195dacef4f787f5204567aa76ea4b96f9be8d1cbf10253`.
