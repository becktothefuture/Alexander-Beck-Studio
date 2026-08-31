# About cinematic completion sweep

Started 31 August 2026. Implementation and browser verification are complete; the explicit human-review limits remain recorded below.

This checklist covers the [cinematic PRD](prd-about-me-cinematic-refinement.md) and the subsequent requests for a vast scene, a full-width ending without visible outer bounds, full-viewport text, consistent camera travel through every square gate, and smooth desktop/mobile scrolling.

The latest request authorizes completing and integrating the missing improvements in development. Earlier notes that left the finale as a separate study do not close that requirement. Production launch, external outreach, new biographical claims and Figma publication are separate actions.

## Baseline and ownership

- Working branch: `codex/about-cinematic-refinement`; starting commit: `8123d69d`.
- Prior implementation diff: `git diff ebb0ecc3...8123d69d`.
- Authored content: `react-app/app/public/config/contents-about.json`.
- Canonical scene: `source-assets/about-v2-blender-current/about-v2-track-working.blend`.
- Canonical export: `react-app/app/public/models/about-v2-edited-world/`.
- Local authoring: `http://localhost:8012/about.html?preview=about`.
- Phone preview: the current `npm run studio:status` Cloudflare URL plus `/about.html?preview=about`.
- Preserve the existing shell, palette, typography, source ownership, native scroll owner and repaired gate camera. Do not restore the old candidate's camera when integrating its geometry.

Each requirement needs implementation evidence and fresh rendered verification. An old report, a diagnostic-only candidate, or a successful command without the relevant assertion is insufficient.

## Requirement checklist


Current canonical scene: R26, promoted after exact saved-source reproduction and rendered desktop/mobile/short-portrait acceptance.

| ID | Outcome | Status and fresh evidence |
| --- | --- | --- |
| R01 | Truthful concise copy and complete career/client data | Complete: schema/content gates retain 13 fields, five careers, six disciplines, 15 marks and both closing titles. |
| R02 | Text uses the usable viewport and remains readable | Complete in browser automation: every prose module was checked at seven desktop/mobile/reflow profiles in Chromium and WebKit. The opener description is now immediately visible with its title. |
| R03 | Vast point world with recognisable landmarks | Complete for the requested implementation: the denser opening uses real authored seed populations; deep terrain banks, 14 gates and the connected ending are present. Desktop/mobile light and dark recordings and DPR 1/2/3 frames were captured. |
| R04 | Moving points stay clear of copy/actions | Complete: shader-disc projection checks measured actual DOM line boxes; physical source-space aisles replace the earlier overlap. A swept terminal-motion envelope checks all phases. |
| R05 | Equal native scroll means equal physical camera travel | Complete: 162 forward/reverse samples in five profiles per browser have error below 2.4e-12 WU. No camera easing, lag, brake or stationary tail remains. |
| R06 | Camera passes through all square gates | Complete: all 14 gates passed forward and reverse in eight profiles in Chromium and WebKit, including close-approach framing and a stationary camera check. |
| R07 | Smooth desktop/mobile native input | Complete in local browsers: native wheel/touch forward/reverse recordings passed with zero frames above 25ms; touch momentum remains native. Physical phone timing remains a device observation. |
| R08 | Method has a local response leading to an open landscape | Implemented and recorded. The terminal response is one connected source-owned surface. Unprompted comprehension by an unfamiliar viewer remains a user-research question, not a runtime defect. |
| R09 | Ending fills the width with no visible bound | Complete: the below-lockup surface covers all 12 horizontal bins and both outer 2% strips through two full motion cycles on desktop and portrait. |
| R10 | Contact appears promptly and remains usable | Complete: 10/25/50% arrival, direct end, reverse focus and 44px actions passed in both engines. |
| R11 | Pause, reduced motion, hidden tab and failure access | Complete in automation: reduced-motion cuts, pause, restoration, asset/WebGL recovery, hidden-tab clocks and 200% zoom passed. Manual screen-reader use remains unverified. |
| R12 | Invalid drafts preserve the last valid scene | Complete in Chromium and WebKit, including resize and recovery. |
| R13 | Safe phone preview | Complete for the canonical assets: public hashes, native scroll, end lockup and read-only API/FS blocks passed. Current URL is recorded below. |
| R14 | Passage and reading timings do not collide | Complete across seven profiles in each browser using DOM line bounds plus physical passage bounds. |


## Final evidence

- Canonical source SHA-256: `72ddd07e441b7b1dbe9931e053bb745deb36ab1826cd3de0dd7aab158ae0e3c8`; camera track: `e8bb88304d09746fde1a9d896e1280c8e56b95bc63cadf6ba7bc16fac0dbf95b`; surfels: `adfc80c48f1c7bc28523e80460cd171828db15a5732210859136517a92c1c4de`.
- The durable Blender recipe reproduced the camera and surfel exports byte-for-byte before promotion. The checker reports 135,000 master surfels, 3,600 camera samples and zero semantic fallbacks.
- `npm run studio:check` passes, including 157 project tests, lint, build and the production/editor boundary checks. The focused final suite adds exact projected-disc, swept-motion, lifecycle and malformed-allocation regression coverage.
- Chromium and WebKit pass all gate, reading-clearance and scroll-coupling checks. The 14 square gates were crossed in both directions in eight profiles per engine. Seven reading profiles per engine and five forward/reverse coupling profiles per engine pass; coupling error is below `2.4e-12 WU`.
- Installed Chrome native input measurements cover desktop/mobile forward and reverse. They retain native touch momentum, show no editor rerenders during scrolling, and have zero samples above 25 ms in the captured local run.
- Canonical light/dark desktop/mobile motion recordings were captured in both engines. The constrained `390x600` Chrome recording passes 2.31 complete terminal cycles with zero copy intersections; its final frame is under `output/playwright/about-completion-sweep-20260831/final-r26f/short-motion/`.
- The safe public mirror verifies canonical hashes, native wheel travel, end lockup, desktop/phone bounds and blocked `/api/*` and `/@fs/*` access at `https://ins-transformation-inform-election.trycloudflare.com/about.html?preview=about`.
- Limits: browser emulation and installed Chrome are not a physical-phone timing test. Manual screen-reader use and unprompted causal comprehension by an unfamiliar viewer remain observations for human review.

## Standards review

Independent read-only review of `ebb0ecc3...8123d69d` found two actionable issues:

1. `aboutBlenderPointScene.js` continuously samples `uStoryWU` for stage visibility and scales points during handoffs even when the camera uses reduced-motion cuts. This conflicts with the toolkit's step-sampled visibility and settled-form contract. A canonical-map probe held reduced camera progress at zero while stage visibility changed from 0.15625 to 0.84375.
2. `aboutNarrativeTrackSchema.js` calls `.flatMap()` on career `items` after detecting that the value is not an array. String/object inputs throw instead of returning invalid-draft diagnostics.

The reviewer ran 84 focused contract/lifecycle/journey/reading/career tests. Those passed but do not cover the defects above. No rendered state was verified by this review. The scroll profiler's lack of timing assertions is a separate verification follow-up, not an additional code-smell finding.

## Specification review

Independent read-only review found four requirement gaps:

1. Canonical `meta.json` still declares `split-lattice-finale`. The connected response requires diagnostic `terminalStudy` metadata, and the study capture substitutes assets only in its own browser. The normal preview cannot show it.
2. `audit-about-narrative-runtime-visuals.mjs` targets deleted `text-life-form` and expects camera lock at invitation start/focus. Those assertions conflict with the current 13-field, page-end-only camera contract and cannot certify composition.
3. `create-about-terminal-study.py` pins an earlier source hash. Rebuild on the current `550af31a...` source; copying the old study bundle would risk restoring the old gate camera.
4. Current checks do not cover every text line, the full terminal perimeter/motion envelope, repeated route cycles, real hidden-tab behavior, zoom or physical device operation. Twelve occupied image columns at one moment do not prove an invisible perimeter through motion.

Standards: two findings; the reduced-motion transition is the main motion-contract issue. Specification: four findings; the absent integrated ending is the main missing outcome. These are distinct review axes, not a certification of the rendered experience.

## Execution sequence

1. Freeze current content/source/export files and capture the current whole journey. Repair stale audit contracts without reducing their coverage.
2. Rebase the expansive candidate onto the current saved scene. Preserve the repaired rail, all gate apertures, orientation and FOV; verify exact before/after hashes for unaffected exports and models.
3. Establish readable source-space staging for the opener and other overlap failures. Finish a clear connected response and a full-width final landscape; inspect the moving study before integration.
4. Integrate canonical geometry and an explicit validated material-motion contract. Remove dependence on diagnostic-only study substitution. Fix reduced-motion and editor-validation defects.
5. Run the complete content, scene, camera, gate, native-input, lifecycle and accessibility matrix. Capture and inspect continuous forward/reverse recordings plus held motion. Repair any defects revealed.
6. Verify the read-only public preview against the actual canonical assets. Close each row with current implementation and evidence links. Leave genuine limits visible.

## First implementation and evidence checkpoint

- Added one `sceneStoryWU` clock shared by camera cuts, stage admission and fog under Reduced Motion. Its shader admits whole settled circles without transitional scale/stagger. Normal motion retains the same continuous clock and camera samples.
- Fixed career word counting for non-array `items`; invalid drafts now return diagnostics rather than throwing.
- Updated deleted field references and page-end-only lock expectations in the composition audit. This repairs stale checks; it does not certify composition. Its fresh opener check correctly fails.
- `npm run studio:check` passed. The 57 focused tests passed. The independent follow-up review also compared 3,003 normal-motion samples with the committed version and found no differences.
- `scripts/audit-about-reduced-motion.mjs` passed 45 forward/reverse samples per profile on desktop and mobile Chromium and WebKit (180 total), plus endpoint and preference-toggle checks. Evidence: `output/playwright/about-completion-sweep-20260831/reduced-motion/`. This does not certify physical-device performance or the unresolved composition.
- Rebuilt the isolated terminal study from frozen source `550af31a...`, rather than the old hardcoded source. Its camera-track bytes and model `about.00` through `about.04` point bytes are unchanged. Evidence: `candidate/preservation.json` beneath the sweep output folder.
- Rendered four candidate profiles: 1440×1000, 390×844, 320×740 and 390×600. Desktop and mobile ending frames show the full-width surface. The normal preview has not been switched to this candidate: method/gate overlap and the complete response/motion envelope still need work.

### Reading and physical-scene mismatch

The constant-distance sampler computes `cameraStoryWU` independently from the Story Stack's editorial `storyWU`. No current invariant ties visible reading intervals to physical passage bounds. Saved candidate render-span probes show:

| Profile | First biography text / round model expiry | First method text / square model expiry |
| --- | --- | --- |
| 1440×1000 | 5.68 / 7.08 WU | 18.08 / 19.54 WU |
| 390×844 | 5.54 / 6.92 WU | 17.69 / 19.09 WU |
| 320×740 | 5.54 / 7.10 WU | 18.32 / 19.59 WU |
| 390×600 | 5.54 / 7.29 WU | 18.88 / 20.12 WU |

These entry estimates use measured section positions and the current 0.78-screen lead. The implementation gate must use actual first/last painted lines, not just these estimates. Model expiry includes the existing 0.18-WU handoff and is distinct from the later conservative `*-CLEAR` cues.

A terminal extension alone cannot fix both joins: it advances gate arrival into client reading. A fixed extra gap also changes total page length and therefore moves the physical cue again. Keep the native distance sampler unchanged. Fit clear terrain and final approach space in the authored Blender rail against measured reading constraints, preserving the complete gate segment and all 14 aperture frames. Add the corresponding clearance invariant before promoting the result. The prior claim of a preserved 1.10-WU square passage does not describe current playback; current physical traversal occupies roughly 3.78–3.99 story WU.

## Evidence and limits

- New evidence belongs under `output/playwright/about-completion-sweep-20260831/`.
- At the start, Blender MCP lists no claimable live session: registered sessions are unreachable or busy. No session was claimed or modified. Preserve all live/unsaved state. Saved-source work may use a separate recoverable background candidate; do not describe that as live Blender verification.
- Do not claim a real iPhone/Android test, manual screen-reader pass or unfamiliar-viewer understanding from browser emulation or an agent review. Record those separately and request the specific remaining user observation when useful work is complete.
- A verified client anecdote is optional for the usable page and requires source and permission. Do not invent one, lift an AHA hold, or claim personal-specificity research is complete.
- Commits, build success and a running tunnel are not the completion condition. The requested improvements must be present and inspectable in that preview.

## Development integration checkpoint

The reviewed connected ending is now in the canonical development source and export. This is a
working preview checkpoint, not completion of this sweep or a production release.

- Source SHA-256: `2c9abd60974b506f6c0a0fd98c643ce7208a8d9bd58196245fed10c13ba7256f`.
- The saved source was exported again from its canonical path. Camera and surfel bytes exactly match
  the reviewed R7 candidate. `integrated-export-check.log` and `integrated-studio-check.log` pass.
- The connected surface uses the source-authored 8-second response with a 2.6-second spatial delay,
  2-second pulse and 3.2-WU amplitude. Desktop and portrait recordings cover two full cycles. The
  inspected reveal/hold frames fill both side edges without a visible perimeter; contact remains clear.
- The open rail gained 172 WU before the round passage, 519.3 WU in the reading terrain and 394.7 WU
  before the endpoint. All 17 anchors remain editable. The square-gate segment is rigidly translated,
  preserving all 14 apertures, orientation and FOV. Total travel is 2399.9775 WU. Native progress still
  maps linearly to physical distance. The shared round/square reading gaps are now 3.8 screens.
- Measured reading intervals motivated the fit. The five original supported profiles have positive
  passage/prose clearance in the fitted calculation. Fresh full-line browser clearance remains open.
- This intentionally does not preserve the PRD's stale 1.10-WU traversal or shorten the already edited
  24-screen snapshot. Keeping physical travel constant and clearing actual reading takes priority over
  those earlier timing estimates. Do not describe the new route as shorter than that snapshot.
- All 74 focused runtime tests pass. Terminal metadata rejects missing, malformed, shared or gapped
  motion bindings. Five real malformed-source export probes exit before changing existing bundle files.
- Native Chrome 200% zoom passed using the real browser setting, with a full-window CDP screenshot.
  The About-only fine-pointer exception passes Chromium/WebKit viewport audits; coarse phone landscape
  remains guarded. Evidence: `native-zoom-r8/`, `viewport-{chromium,webkit}.log`.
- The timing audit now rejects empty/nonfinite samples and blocked gestures. Measured native desktop
  and emulated-phone gestures had 9–9.6 ms p95 frame intervals and no frames over 25 ms, with retained
  touch momentum. These measurements precede the new geometry; rerun after integration.
- Independent access review passed 12 serial runs plus two real hidden-tab probes. It covers arrival,
  reverse focus, pause, reduced motion, restoration, malformed-editor recovery, 200% zoom, asset and
  WebGL recovery. The source snapshot was before R7 integration. Evidence: `access-r8/`.

Remaining visual failures are explicit: the middle canyon is too sparse, and the method world is too
quiet. R8 density-only and R9 tall-shoulder trials remain isolated under `output/`; R9 intersects phone
text and was rejected. Earlier terminal fog opening exposed the ground behind lower prose and was
reverted. No projected text mask, opacity wash, camera easing or higher point budget was introduced.

The old footprint checks describe the former broad terrain and tall-bank ending. They have **not** been
silently relaxed: the current full visual audit still fails. A new ground-specific endpoint audit must
measure the requested full-width surface and its actual motion envelope; middle-scene clearance and
presence need a source-space solution and new rendered evidence. R03/R04/R08 and the complete visual
matrix remain open, as do physical-device and unfamiliar-viewer observations.

### Public preview read-back

- The existing Cloudflare mirror serves the exact canonical camera/surfel hashes and the new
  `about-terminal-response/v1` metadata. No asset substitution was used for this check.
- Desktop 1440×1000 and phone-layout 390×844 browsers loaded the actual public URL, accepted native
  wheel input, reached the endpoint and kept both actions in bounds. Both public ending screenshots
  were opened and inspected. This is browser emulation, not a physical phone test.
- `/api/*` and `/@fs/*` retain the mirror's intended 404 block. No authoring safeguard was changed.
- Evidence: `public-preview/report.json` and `public-preview/{desktop,phone}-ending.png`.
- Fresh Chrome and WebKit gate checks pass 112 forward/reverse samples each on desktop and mobile,
  including all 14 openings and a stationary camera check. Evidence: `gates-integrated/{chromium,webkit}/`.
  The earlier SwiftShader-only diagnostic run was stopped because software rendering was too slow;
  it is not recorded as a pass. The wider integrated matrix remains to run.
- The new `scripts/audit-about-reading-clearance.mjs` passes against the integrated source at desktop
  and 390px portrait. It measures painted DOM ranges and verifies that both passages fit between
  reading intervals, including their admission/release margins. Evidence: `reading-integrated/chromium/`.
  This proves passage timing; it does not certify point/type clearance across the middle landscape.
- Integrated native Chrome performance checks also pass: all six desktop/phone forward/reverse
  segments stay at 9.1–9.5 ms p95, with a 16.7 ms maximum and no frames over 25 ms. Native touch
  momentum continues 101 CSS pixels after release. No editor renders occur during the gestures.
  Evidence: `native-integrated/report.json`. This is an unthrottled desktop-host browser measurement,
  including a 3-DPR phone layout, not physical-phone performance certification.

## Reading-space and material checkpoint

Canonical/public geometry remains R7 (`2c9abd60...`). The following source trials are isolated;
none is a completed or publicly integrated visual result.

- R10 widened the canyon shoulders to ±86 WU. This cleared prose but left only 8–34 framed points
  at many stops because those shoulders enter the frustum near the existing 150-WU fog limit.
  It was rejected. R11 retains the full population and admits more distant canyon points using
  source-owned material scales; it also extends the side landscape through the final client rows.
- The renderer/exporter now support optional bounded per-model manifestation/detail scales. The
  canonical bundle omits them, so its appearance is unchanged. Fixed uniforms are installed once;
  stage admission, camera travel, opacity, buffers and total point budgets remain unchanged.
- Independent review caught and closed two validation issues: malformed unrelated motion-group
  entries and explicit nonfinite/string source scales. Eight actual Blender failure probes preserve
  every existing export hash. Evidence: `material-export-failure-proof.log`; 76 independently rerun
  focused tests and `material-final-studio-check.log` pass.
- The visual collector now includes career labels/rows and client artwork/fallback labels. It checks
  actual ambient displacement plus the maximum possible shader radius, including points LOD would
  reject. This conservative envelope can over-report intrusion; it cannot prove rendered density.
  Sparse checkpoint selection also now activates the client span before measuring its target.
- Diagnostic collection continues after composition failures but returns exit code 1. It never
  converts failing composition into a pass. Old terrain/ending thresholds remain unchanged pending
  a distinct reading-space/ground contract and visual acceptance.
- R12's taller canyon and reduced ground sampling were rejected: they weakened the landscape and
  exposed closing-title intrusion. R13 restored ground sampling and visible method banks, but its
  phone closing titles still intersected the conservative point envelope.
- R14 clears all 18 selected desktop/phone reading/ending stops, including career/client content,
  but its lowered ground made the desktop ending too shallow. It is not the intended final design.
- R15 retains R11's canyon and R13's extended/thicker method banks. Its deep foreground clears the
  phone titles; a physical rise 255–350 WU beyond the endpoint fills the final view. Sampling follows
  that distant landscape. This is fixed connected geometry, not camera motion or a projected mask.
  Source SHA: `e1612bfce51a4213ebaad40345fcfda1f1df9c5c7e0fb31c6e8718f779c7ffc2`.
  Its camera bytes still match canonical R7 (`e8bb8830...`). All six selected method/ending stops on
  desktop and phone have zero conservative intrusion. Endpoint population is 11,031/4,519 framed
  points, spanning all twelve horizontal columns. These counts are diagnostics, not visual approval.
- R15 whole-route forward/reverse recordings at one screen per second include 2.007/2.025 complete
  terminal cycles, stable endpoint camera/buffers and no collected page errors. Both filmstrips and
  the full-size endpoint/reading screenshots were inspected. Evidence: `valley-r15/moving/` and
  `valley-r15/visual/`. Native-input performance is separate from this recorded programmatic sweep.

Remaining work: the canyon still reads mainly as narrow peripheral strips and the phone method
banks remain quiet. Do not call that an expansive, recognisable middle world merely because text
clearance passes. Complete the full checkpoint/continuous-motion matrix, resolve the reading-space
and ground-specific checks, then integrate an accepted source and repeat public/runtime proof.
The existing tunnel remains active; no new commit, push or production publication occurred here.

The subsequent full R15 desktop/phone checkpoint run remains unsuccessful. It additionally finds
possible maximum-radius intrusion on the phone opener and second interest title, plus a completely
empty `visible-early` method-title view on both profiles. These are open until physical composition
and rendered edges are checked and fixed. Early round-passage and phone inciting-title stage assertions
also disagree with the current physical handoff; inspect actual framed populations before deciding
whether these are scene defects or stale audit assumptions. Evidence: `valley-r15/full-visual/` and
`valley-r15/full-visual.log`. The selected method/ending clearance result above does not close these gaps.

The portal-entry 'chapter leak' was a stale visibility assumption: the outgoing nebula had 0 framed
points even while its logical handoff remained at 0.053. The audit now counts only framed material as
visual leakage; the named passage still requires fully established portal geometry and no copy.
The phone opener/interest-title findings remain conservative possibilities, not confirmed painted
occlusion; full-size frames were inspected and actual projected radii/LOD need to distinguish near
edges from the intentionally over-bounded diagnostic before changing otherwise clear geometry.
