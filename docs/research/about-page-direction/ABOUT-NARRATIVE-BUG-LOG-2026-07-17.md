# About Narrative visual QA bug log

Date: 17 July 2026

Status: Open findings against the current local worktree

QA surfaces: `/lab/about-narrative.html?edit=1`, `/lab/about-narrative.html`, and the production About route exercised by `audit:about-narrative`

Evidence: `output/playwright/about-narrative-visual-qa-2026-07-17/`

## Timeline location

The reviewed handoff spans three Sections:

- `03 Curiosity across aesthetics and technology`: `4.65-7.55 WU`. The camera keys land at `5.60 WU` (50%), `6.06 WU` (74%), and `6.55 WU` (100% of the Section's `1.90 WU` scroll travel). The World is still `calm-field`.
- `04 The practice comes into view`: `7.55-9.35 WU`. The World changes to `discipline-grid`; the six labels reveal and travel upward.
- `05 Six connected disciplines`: starts at `9.35 WU`. The labels blur away while the four-block editorial copy enters from below.

This split is important: the camera reaches its top-down key at `6.55 WU`, one full viewport before the discipline grid begins at `7.55 WU`. The editor therefore places the camera change, World change, label reveal, and editorial handoff in different places even though they read as one continuous audience-facing transition.

## Open bugs

### AN-001 — Point-world sequence preparation repeatedly fails

- Severity: P0 runtime
- Where: clean load of the lab; reproduced on desktop and mobile
- Actual: the console repeatedly reports `[About narrative] Sequence preparation failed; retaining the last valid field. Error: [object Object]`. A clean reload produced dozens of warnings within seconds and the longer session exceeded 100 warnings.
- Effect: the scene can retain stale geometry instead of preparing the requested World sequence, so visual review after the failure is not trustworthy.
- Reproduction: open `/lab/about-narrative.html`, resize or move through the narrative, and inspect the warning console.
- Evidence: [Playwright console log](../../../.playwright-cli/console-2026-07-17T10-19-39-725Z.log) and [trace](../../../.playwright-cli/traces/trace-1784283028460.trace).
- Likely owner: `AboutNarrativePointWorld3D.jsx` and the correspondence worker response/error path.

### AN-002 — Reduced-motion scrolling stays on Section 1

- Severity: P0 accessibility/runtime
- Where: reduced-motion profile at `9.60 WU`
- Actual: after setting `scrollTop` to `8832px` (`9.60 × 920px`), the accessible status still reports `Section 1 of 8` and the viewport shows the Intro rather than the discipline/editorial handoff.
- Expected: reduced motion should settle animation within the current Section, not disconnect narrative state from scroll position.
- Evidence: [18-reduced-motion-handoff.png](../../../output/playwright/about-narrative-visual-qa-2026-07-17/18-reduced-motion-handoff.png).
- Likely owner: reduced-motion playhead/scroll synchronisation in the About narrative runtime. This may be compounded by AN-001, but it reproduces as a distinct state error.

### AN-003 — The production progress indicator is missing on direct load

- Severity: P0 release gate
- Where: production desktop direct load, Chromium and WebKit
- Actual:
  - Chromium: `indicator never became visible`, sampled as `host:"missing"` then `host:"shell-persistent", state:"hidden"`.
  - WebKit: `indicator never became visible`, sampled as `host:"missing", state:"missing"`.
- Reproduction:

  ```bash
  ABS_BROWSER=chromium npm run audit:about-narrative
  ABS_BROWSER=webkit npm run audit:about-narrative
  ```

- Likely owner: production About route handoff and shell indicator mounting/state.

### AN-004 — The canonical About test gate currently fails

- Severity: P0 release gate
- Where: `scripts/check-about-narrative.mjs:750`
- Actual: `45/46` tests pass. `spatial Cues move continuously through their focus point` fails because an expected value is `undefined`.
- Reproduction:

  ```bash
  npm run check:about-narrative
  ```

- Effect: `npm run check:site` cannot be considered green while this failure remains.
- Likely owner: spatial Cue compilation/evaluation and its test contract.

### AN-005 — Mobile never presents all six disciplines inside the frame

- Severity: P1 responsive scene
- Where: `390 × 844`, approximately `8.40-9.20 WU`
- Actual: only `Experience Design` and `Creative Engineering` are visibly inside the frame. At `8.40 WU`, measured label positions were:

  | Label | X | Result |
  | --- | ---: | --- |
  | Product Design | `-173px` | off the left edge |
  | Experience Design | `129px` | visible |
  | Art Direction | `410px` | off the right edge |
  | Motion & 3D | `-122px` | off the left edge |
  | Creative Engineering | `196px` | visible |
  | Parametric Systems | `379px` | clipped at the right edge |

- Expected: the mobile composition must communicate six categories, even if it uses a tighter or more editorial arrangement than desktop.
- Evidence: [11-mobile-all-six.png](../../../output/playwright/about-narrative-visual-qa-2026-07-17/11-mobile-all-six.png) and [12-mobile-scroll-up.png](../../../output/playwright/about-narrative-visual-qa-2026-07-17/12-mobile-scroll-up.png).
- Likely owner: discipline-grid mobile scale/framing and label projection in `AboutNarrativePointWorld3D.jsx` plus mobile label constraints in `about-narrative-lab.css`.

### AN-006 — Mobile editorial copy collides with the progress rail

- Severity: P1 legibility
- Where: `390 × 844`, approximately `9.95-10.80 WU`
- Actual: the editorial heading and paragraphs begin around `x=26-31px`, while the progress dashes occupy roughly `x=20-28px`. The dashes visibly cut into the first letters and sit inside the text column.
- Expected: one shared left inset should clear the rail for every editorial block.
- Evidence: [15-mobile-editorial-established.png](../../../output/playwright/about-narrative-visual-qa-2026-07-17/15-mobile-editorial-established.png) and [17-mobile-editorial-late-reload.png](../../../output/playwright/about-narrative-visual-qa-2026-07-17/17-mobile-editorial-late-reload.png).
- Likely owner: mobile editorial padding in `about-narrative-lab.css` and the shell progress-rail safe area.

### AN-007 — The protected 100% camera key cannot be inspected reliably

- Severity: P1 editor UX
- Where: Section 03, protected camera key at `100%` / `6.55 WU`
- Actual: clicking the visible key sets it to pressed and moves the playhead, but the inspector changes to `Camera track — Editing Section base` and offers `Set camera key at 99.5%` instead of showing the protected key's pose.
- Expected: the clicked protected key should remain selected and expose its read-only/inspectable pose.
- Effect: a real camera key looks missing or uneditable, matching the original authoring confusion.
- Evidence: [03-camera-key-100.png](../../../output/playwright/about-narrative-visual-qa-2026-07-17/03-camera-key-100.png).
- Likely owner: boundary selection tolerance and `CameraInspector` selection resolution in `AboutNarrativeEditor.jsx`.

### AN-008 — The perceived top-down transition has unclear timeline ownership

- Severity: P1 editor comprehension
- Where: Section 03 into Section 04, `5.60-7.55 WU`
- Actual: the camera keys finish at `6.55 WU`, while the `discipline-grid` World begins at `7.55 WU`. The `100%` camera key is plotted at the end of scroll travel, not the visible end of the `2.90 WU` Section clip. This creates a one-viewport visual gap and makes `100%` appear to mean two different things.
- Expected: the timeline should make the camera-to-World handoff explicit, either through one transition span or unambiguous travel-versus-total labels.
- Evidence: [02-camera-key-74.png](../../../output/playwright/about-narrative-visual-qa-2026-07-17/02-camera-key-74.png), [03-camera-key-100.png](../../../output/playwright/about-narrative-visual-qa-2026-07-17/03-camera-key-100.png), and [04-practice-start.png](../../../output/playwright/about-narrative-visual-qa-2026-07-17/04-practice-start.png).
- Likely owner: camera-key positioning semantics in `AboutNarrativeEditor.jsx` and timeline labelling.

### AN-009 — The Discipline reveal obscures the editorial clip in the Text lane

- Severity: P1 editor legibility
- Where: Section 04 into Section 05
- Actual: `Discipline reveal from 32% to 290%` is drawn over the same Text lane as `Vertical · 4 blocks`. Its striped bar and label obscure the editorial clip label and timing.
- Expected: overlapping authored elements should use separate sublanes, stacking, or compact markers so both timings remain readable.
- Evidence: [06-all-six-disciplines.png](../../../output/playwright/about-narrative-visual-qa-2026-07-17/06-all-six-disciplines.png) and [09-editorial-handoff-mid.png](../../../output/playwright/about-narrative-visual-qa-2026-07-17/09-editorial-handoff-mid.png).
- Likely owner: Text-lane layout in `AboutNarrativeEditor.jsx` and `about-narrative-editor.css`.

### AN-010 — The label-to-editorial handoff passes through an unreadable blur state

- Severity: P2 motion polish
- Where: desktop around `9.60 WU`
- Actual: all discipline labels are heavily blurred while the incoming editorial heading is still low and soft. For a noticeable interval, neither layer is comfortably readable.
- Expected: the incoming heading should establish legibility before, or as, the outgoing labels lose it.
- Evidence: [09-editorial-handoff-mid.png](../../../output/playwright/about-narrative-visual-qa-2026-07-17/09-editorial-handoff-mid.png).
- Likely owner: discipline label exit timing versus editorial block entrance timing.

### AN-011 — The Art Direction marker disappears on the light surface

- Severity: P2 palette accessibility
- Where: discipline labels on the light theme, approximately `8.10-9.35 WU`
- Actual: `Art Direction` correctly uses the Home simulation's `--ball-3` (`#fffdf6`), but the marker is almost invisible against the near-white background.
- Expected: preserve the canonical ball colour while giving the marker enough local contrast through placement, a broad tonal field, or another palette-safe treatment.
- Evidence: [06-all-six-disciplines.png](../../../output/playwright/about-narrative-visual-qa-2026-07-17/06-all-six-disciplines.png).
- Likely owner: discipline-marker contrast treatment in `about-narrative-lab.css`.

### AN-012 — Point density changes from too faint to too competitive across the handoff

- Severity: P2 visual hierarchy
- Where: `8.40 WU` versus `9.95 WU`
- Actual: behind the six labels, the field is so fine and faint that it barely carries the site's ball language; once the editorial copy is established, many stronger coloured points sit directly behind multiple lines of text.
- Expected: keep enough point presence to explain the grid, then reduce local density/contrast behind the editorial reading column.
- Evidence: [06-all-six-disciplines.png](../../../output/playwright/about-narrative-visual-qa-2026-07-17/06-all-six-disciplines.png) and [10-editorial-established.png](../../../output/playwright/about-narrative-visual-qa-2026-07-17/10-editorial-established.png).
- Likely owner: discipline-grid point size/opacity and editorial-phase point masking or density choreography.

## Needs a clean follow-up reproduction

- A cue-drag history check previously moved one cue from `77%` to `12%`, waited, then moved it to `92%`; the first Undo jumped straight to `77%` instead of restoring `12%`. The active worktree changed during this QA pass, so this should be reproduced once the editor is stable before it is promoted to an open bug.
- During concurrent edits, Vite briefly failed to reload `AboutNarrativeEditor.jsx` because `aboutNarrativeTimeline.js` did not yet export `deriveAboutNarrativeLoopRange`. The export now exists, so this is recorded as a transient integration interruption rather than an open defect.

## Verified in this pass

- The editor does contain explicit protected camera boundary keys for every Section, plus authored interior keys where framing changes. The problem is presentation/selection, not an empty camera track.
- The discipline composition now moves upward. From `8.40` to `9.20 WU`, the measured shift was about `57px` on desktop and `96px` on mobile.
- Discipline colours resolve from the Home ball tokens rather than a parallel palette: `#c0bfbf`, `#1768ff`, `#fffdf6`, `#53b9ff`, `#d8ff38`, and `#ff6a00` for the six current categories.
- The editorial copy is left-aligned and uses one highlighted phrase in its lead sentence. The remaining problem is the mobile safe area, not indentation or excessive highlighting.

## Verification summary

- Headed Chromium: editor and clean lab at `1440 × 1000` and `390 × 844`.
- Reduced motion: reproduced AN-002 at desktop size.
- Chromium project audit: failed AN-003.
- WebKit project audit: failed AN-003.
- Canonical About unit gate: failed AN-004 (`45/46` passing).
