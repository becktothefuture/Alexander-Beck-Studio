# About Narrative visual QA bug log

Date: 17 July 2026

Status: Twelve scene/editor findings resolved; transient development-server observations separated from product defects

QA surfaces: `/about.html`, `/lab/about-narrative.html?edit=1`, the About unit gate, and focused Playwright checks in Chromium and WebKit

Checkpoint: `3af6e214 feat(about): checkpoint narrative toolkit`

## Timeline location

The reviewed handoff spans three Sections:

- `03 Curiosity across aesthetics and technology`: `4.65-7.55 WU`. Camera keys at `50%`, `74%`, and `100%` turn the calm field into the top-down composition.
- `04 The practice comes into view`: `7.55-9.35 WU`. The World morphs into `discipline-grid`; six labelled points reveal and rise.
- `05 Six connected disciplines`: begins at `9.35 WU`. The labelled composition gives way to a left-aligned editorial passage.

Camera percentages are percentages of a Section's scroll travel, not its full rendered height. The editor now names the remaining one-viewport tail as a `settled hold`, so the camera, World, reveal, and editorial ownership are visible as one system.

## Resolved product findings

### AN-001 — Point-world preparation warnings on a changing worktree

- Severity: P0 runtime confidence
- Result: **Closed as a partial-save observation.** Clean desktop and mobile reloads reach `data-world-prepare="ready"` with the prepared sequence installed and no preparation warning.
- Guard: browser audits wait for the ready state and fail on page errors. Runtime preparation tests remain in the canonical gate.

### AN-002 — Reduced-motion status appeared stuck on Section 1

- Severity: P0 accessibility confidence
- Result: **Closed as a partial-save observation.** A clean reduced-motion run at the same scroll position reports the corresponding later Section rather than Section 1.
- Guard: the unit gate verifies settled reduced-motion camera behaviour; the production indicator audit verifies Section 8 at the end of the route.

### AN-003 — Production progress indicator appeared missing

- Severity: P0 release gate
- Result: **Closed.** The production-only audit passes direct load, reload, SPA entry, desktop, mobile, light, and dark in Chromium and WebKit.
- Verification:

  ```bash
  ABS_BROWSER=chromium ABS_ABOUT_PRODUCTION_INDICATOR_ONLY=1 npm run audit:about-narrative
  ABS_BROWSER=webkit ABS_ABOUT_PRODUCTION_INDICATOR_ONLY=1 npm run audit:about-narrative
  ```

### AN-004 — Canonical About test gate failed during an intermediate save

- Severity: P0 release gate
- Result: **Closed.** `npm run check:about-narrative` now passes `47/47` tests.
- Added guard: the new palette contract compares the six discipline labels and ball-token indices directly with `design-system.json`.

### AN-005 — Mobile showed only two of six discipline labels

- Severity: P1 responsive scene
- Result: **Fixed.** The grid uses a mobile-specific scale of `0.15`, keeping all six labels and markers inside the `390 × 844` scene.
- Current measured horizontal bounds: `113-357px` inside a `10-380px` scene.
- Evidence: [Chromium mobile discipline scene](../../../output/playwright/about-narrative/chromium-system-mobile-discipline.png) and [WebKit mobile discipline scene](../../../output/playwright/about-narrative/webkit-system-mobile-discipline.png).
- Guard: the Playwright audit now fails if any visible discipline label escapes the scene bounds.

### AN-006 — Mobile editorial copy collided with the progress rail

- Severity: P1 legibility
- Result: **Fixed.** Every mobile editorial Section shares a `3rem` left safe area.
- Current measured clearance: `30px` between the rail and editorial column in Chromium and WebKit.
- Evidence: [Chromium mobile editorial scene](../../../output/playwright/about-narrative/chromium-system-mobile-editorial.png) and [WebKit mobile editorial scene](../../../output/playwright/about-narrative/webkit-system-mobile-editorial.png).
- Guard: the Playwright audit requires at least `12px` clearance.

### AN-007 — Protected 100% camera keys could not be inspected

- Severity: P1 editor UX
- Result: **Fixed.** Boundary keys remain selected, show their complete camera pose, and identify why timing and deletion are protected. Framing remains editable and propagates across the linked Section boundary.
- Guard: the Playwright audit selects the practice Section's `100%` key and verifies the disabled Position and delete controls.

### AN-008 — Camera travel and the top-down handoff had unclear ownership

- Severity: P1 editor comprehension
- Result: **Fixed.** Camera tracks now label the non-moving tail as `settled hold`; authored motion remains a solid rail, base dolly a dashed rail, and World transition start/end keys remain visible in the World lane.
- Scene tuning: the top-down camera height changed from `7.2 WU` to `6.4 WU`, reducing the zoom-out without changing the Section structure.
- Evidence: [desktop timeline and discipline scene](../../../output/playwright/about-narrative/chromium-system-desktop-discipline.png).

### AN-009 — Discipline reveal obscured the editorial Text clip

- Severity: P1 editor legibility
- Result: **Fixed.** Discipline reveal and vertical editorial clips use separate upper and lower Text sublanes.
- Guard: Playwright compares their bounding boxes and requires a non-overlapping boundary.

### AN-010 — Label-to-editorial handoff passed through an unreadable blur

- Severity: P2 motion polish
- Result: **Fixed.** Maximum label blur reduced from `7px` to `4.5px` and lateral drift from `12px` to `8px`, retaining a readable outgoing layer while the editorial heading establishes itself.

### AN-011 — The white Art Direction marker disappeared on the light surface

- Severity: P2 palette accessibility
- Result: **Fixed without changing its color.** A semantic marker is projected at every labelled anchor, filled by the canonical Home ball token and given a soft local shadow. Art Direction remains `--ball-3`.
- System change: the six-token mapping is now one exported contract used by the scene, renderer, and editor instead of three independent lists.

### AN-012 — Point density moved from too faint to too competitive

- Severity: P2 visual hierarchy
- Result: **Fixed and made editable.** Resting grid opacity increased from `0.06` to `0.10`; editorial reconnect opacity is independently authored at `0.24` instead of restoring the whole field to full opacity.
- System change: `Editorial grid opacity` is now a first-class discipline-reveal control in the schema and editor.

## Additional system findings resolved during implementation

### AN-013 — Cue activation depended on a pointer-down event

- Severity: P1 editor accessibility
- Result: **Fixed.** Keyboard and programmatic button activation now selects the Cue as well as moving the playhead; pointer multi-selection behaviour remains unchanged.

### AN-014 — Browser audit treated clipped timeline width as authored duration

- Severity: P2 verification reliability
- Result: **Fixed.** Near a Section boundary, the visible cue bar legitimately clips even though its authored envelope is unchanged. Browser checks now verify that cues remain visible; the unit test owns the exact duration-preservation invariant.

## Development-server observations

These are not current product defects:

- Vite/WebKit can briefly report `Importing a module script failed` when a browser run begins during an active file save. A quiet rerun passes.
- The broad editor audit also contains load-sensitive main-thread timing checks. Focused scene checks and production indicator checks are reported separately so a noisy development sample cannot be mistaken for a visual regression.
- A previously observed Undo jump after two Cue drags has not reproduced in the stable unit/editor history checks. It remains a watch item rather than an open bug.

## Verification summary

- `npm run check:about-narrative`: `47/47` passing.
- `npm run lint --prefix react-app/app`: passing.
- Production progress-indicator audit: passing in Chromium and WebKit.
- Focused Playwright visual checks: passing in Chromium and WebKit at `390 × 844`; Chromium editor/timeline also checked at `1440 × 1000`.
- Focused browser console: no page errors in the settled scene runs.
