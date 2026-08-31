# About V2: career approval and dot separation

Date: 2026-08-30
Scope: local About copy, existing career component and point-material sizing. No publication, camera edit or Blender export.

This update supersedes the career fact gate in the earlier plan, copy manifest and narrative completion audit. It also records the material correction requested after the mobile contact-sheet review.

## Career copy approved in this conversation

Alexander requested the proposed rows, accepted the Yoti dates for now, confirmed that MRM is no longer current, and added Critical Mass from May to September this year as Associate Design Director. There are now five rows, not four.

| Dates shown | Employer | Role shown |
| --- | --- | --- |
| 2014–2017 | Dennerlein GmbH | Art Director |
| 2017–2019 | Yoti | Senior Product Designer |
| 2020–2024 | Hugo & Cat | Associate Design Director |
| Joined 2024 | MRM (McCann) | Associate Design Director |
| May–Sep 2026 | Critical Mass | Associate Design Director |

The MRM end date is unknown. “Joined 2024” states the known start without implying current employment or inventing an end date. Hugo & Cat uses the supported role; no promotion sequence or promotion date was invented. The Critical Mass range is the user's supplied range, not a claim that September has already passed.

## Short, personal story

[Daniel Sun's About page](https://danielsun.space/about) informs the sequence: a person and their background first, concise career evidence next, then a point of view and invitation. Its wording and personal details were not copied.

The existing opening and 14-field story spine remain. The early background is more direct: Computer Science, Communication Design in Mainz, languages, interfaces made with developers, then identity work. The generic list of agency, in-house and independent settings was removed. The five career rows now provide that evidence themselves. The later discipline, client and method sections do not repeat the career list.

The ending remains three distinct beats: “If you’re shaping something…” → “…that needs more than one way of thinking…” → “Let’s begin.”

| Count | Current | Hard ceiling |
| --- | --- | --- |
| Core narrative | 366 | 436 |
| All reader-facing editorial copy | 505 | 574 |
| Career heading, dates, employers and roles | 35 | 56 |

These counts use the checked-in Unicode tokenizer. The total includes discipline descriptions and client names but excludes fixed interface labels. The budget tests run against canonical `contents-about.json`; the ceiling was not increased to fit the additions.

## Why the colour bands were too thick

The round point billboards retained their face-on footprint on surfaces viewed at a shallow angle. Neighbouring dots therefore overlapped as the projected surface compressed. A fixed minimum pixel radius could also override natural distance scaling.

At the sampled mobile terrain-thesis camera, 1,507 of 1,744 framed points were at a grazing angle. None had reached the minimum-radius floor; 163 had reached the maximum radius. The main problem at that shot was projected overlap, not simply too many points or an overly distant fog boundary.

`separatedSurfelRadius` now caps each circle using its radius-derived spacing and the projected area of its surface. It can shrink below the preferred distant size when that size would fill the gap. The point remains round and its palette core remains opaque. The existing parameter is labelled “Distant size target” to reflect this preferred-size contract.

This is a local spacing estimate, not a nearest-neighbour solver. The dense scroll captures are the visual acceptance check.

### Preserved boundaries

- The Blender source, camera file, point bundle and source hashes are unchanged.
- Point counts, profile selection, source flags and point retention are unchanged.
- Gate geometry, stage visibility, camera route, fog controls and daily palette are unchanged.
- The shell, typography and reading-window geometry are unchanged.
- The final camera and controls hold still while the material keeps moving. Reduced motion stops the idle material motion.
- No shader mask, text plate, palette wash, helper ring or new background layer was added.

## Evidence

All paths below are repository-relative. Captures are generated review artifacts under the gitignored `output/playwright/` directory.

- Detailed baseline and revised WebKit scroll captures: `output/playwright/about-career-dispersion-20260830/`. Each viewport is sampled at 72 scroll positions plus three stopped-ending times. Individual PNGs and paginated contact sheets remain available.
- Mobile and desktop career rows, actual whole-row visibility checks and supplementary viewport checks: `output/playwright/about-career-readability-20260830/`.
- Continuous ending motion, mobile touch input and reduced-motion checks: `output/playwright/about-career-dispersion-20260830/terminal-hold/chromium-report.json`.
- Full local site gate: `output/playwright/about-career-dispersion-20260830/site-check-final.log`.

The career-row strip combines actual viewport crops from separate scroll positions. It is not a claim that all five rows are visible at once. Density comparisons use matching semantic checkpoints and camera progress, not the same raw scroll position: adding rows changes the length of the early reading section.

### Validation status

- `npm run check:site`: passed after the material contract test was updated to the new bounded radius helper.
- Career, copy budget, story layout, reading stage, journey map and parameter tests: 60 passed.
- Chromium terminal hold: desktop, mobile touch and reduced motion passed; camera and copy remain fixed, two draw calls and stable GPU buffers are retained.
- Detailed WebKit mobile review: all 75 frames inspected. Terrain retains a visible horizon and separated foreground dots; the gate sequence remains present; the final banks remain on both sides of clear contact copy.
- Detailed WebKit desktop review: all 75 frames inspected, including every career row, gate checkpoint, final title and stopped-ending sample. All six full-resolution before/after pairs were inspected separately.
- `git diff --check`: passed. The renderer's changes in this pass are limited to the radius helper and its call. `aboutSceneLook.js`, camera-track bytes and point-bundle bytes match the start of the pass.

### Supported reading checks

Each count includes real rendered text lines and whole career rows. All five rows were captured separately in each supported case; there were no horizontal-overflow or browser-error failures. Text wrapping differs slightly between engines.

| Browser and viewport | Mode | Readable units |
| --- | --- | --- |
| WebKit 1440×1000 | Light and dark | 63/63 in each |
| WebKit 390×844 | Light, dark, DPR 2 and reduced motion | 79/79 in each |
| WebKit 320×740 | Light | 95/95 |
| WebKit 844×700 | Light | 59/59 |
| Chromium 1440×1000 | Light | 63/63 |
| Chromium 390×844 | Light | 77/77 |
| WebKit 844×390 | Existing viewport guard | Guard verified; not a reading result |

The first 844×390 probe incorrectly measured underlying content behind the existing “Bit of a Squeeze” cover. That diagnostic is retained as a failed audit, not a page-layout defect. The corrected audit verifies the cover and hidden/inert app root before returning `guarded-as-designed`. The supported 844×700 landscape probe reads all rows. No production viewport-guard or reading-layout change was made.

These are local browser viewport checks, not native-phone or frame-rate certification. About's publication guard is unchanged.

## Whole-sequence visual review

The complete review index is `output/playwright/about-career-dispersion-20260830/index.md`. It links all 20 revised contact pages and all 150 full-size frames. Before/after tables also retain every shared semantic checkpoint, including those with shifted camera positions.

| Sequence | Finding after the change |
| --- | --- |
| Opening and inciting question | Open, scattered points; title and paired question remain distinct. |
| Round portal | The repeated ring form remains visible during approach, turn and exit. |
| Personal origin and five jobs | The formerly merged middle-distance terrain now has visible gaps. Prose and each career row have a clear reading interval above it. |
| Thesis, disciplines and client proof | The terrain remains continuous; its slope and foreground dots are preserved without the former solid colour bands. |
| Short square-gate passage | The gate sequence remains present across entry, quarter points and exit. No new background chapter overlaps it. |
| Method and final approach | Both banks remain visible; the central reading corridor remains clear. |
| Two invitation titles and final frame | Each title gets its own interval. The final controls stay readable between both moving banks. |

At the matched earned-thesis cue, maximum coloured scanline coverage changes from **98.65% to 41.08% on mobile**, and **87.64% to 43.33% on desktop**. At terrain release, it changes from **75.14% to 45.41% on mobile** and **61.25% to 43.33% on desktop**. These are screenshot coverage measurements, not a quality score or a promise that every pair of dots is disjoint.

Ambient motion and surface noise remain live. The pairs use a fixed palette date, identical source assets and measured semantic positions; they are not strict pixel-difference tests. Two personal-section poses shift as the five-row section adds reading height and are excluded from material-only comparisons.

## Files changed in this pass

- `react-app/app/public/config/contents-about.json`: concise origin, removed repeated background and five career rows.
- `react-app/app/src/routes/about-narrative-lab/aboutNarrativeTrackSchema.js`: allow four or five bounded career rows.
- `react-app/app/src/routes/about-narrative-lab/aboutBlenderPointScene.js`: projected-spacing radius cap only.
- `react-app/app/src/routes/about-narrative-lab/aboutNarrativeDefinitions.js`: accurate “Distant size target” labels; parameter keys and defaults retained.
- `scripts/check-about-career-sequence.mjs` and `scripts/check-about-narrative-copy-variants.mjs`: approved row values and fixed word budgets.
- `scripts/check-about-narrative-parameters.mjs` and `scripts/check-sphere-body-materials.mjs`: actual shader-helper behavior and updated material contract.
- This note and top-of-file amendments in the prior cinematic plan, copy manifest and narrative completion audit.
- Capture, comparison and reading-audit scripts plus generated review artifacts under the two `output/playwright/about-career-*20260830/` folders.

The three reused filmmaker agents contributed the concise career edit, the read-only material/landscape diagnosis, and the detailed capture/comparison set. The main agent integrated the changes, inspected every revised contact page and ran the final validation. No files were staged or committed; nothing was published.

### Reproduce

```bash
npm run check:site
npm run preview
```

With preview running on port 8013, use a second terminal:

```bash
node output/playwright/about-career-dispersion-20260830/capture-cinematography.mjs --phase after --profile both --browser webkit --theme light
ABS_BASE_URL=http://localhost:8013 ABS_BROWSER=webkit node output/playwright/about-career-readability-20260830/audit-reading.mjs mobile light
ABS_BROWSER=chromium ABS_CHROMIUM_CHANNEL=chrome node scripts/audit-about-narrative-terminal-hold.mjs
```

The terminal-hold audit uses the development diagnostics on port 8012. The detailed contact sheets use the normal built preview on port 8013, with no injected replacement content or renderer. About still requires `?preview=about`; its production publication guard remains in place.
