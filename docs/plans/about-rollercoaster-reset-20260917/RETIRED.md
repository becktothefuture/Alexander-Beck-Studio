# V05 retirement record

17 September 2026. The replacement About route imports `AboutRollercoasterExperience.jsx`. This record covers source/tool retirement, not visual acceptance of the replacement.

## Completed

- Removed 32 explicitly selected obsolete files listed below. Immediately before removal, every current file and its archived entry matched the recovery manifest SHA-256. There were no mismatches.
- Verified the complete archive SHA-256: `40e4f19c035ade63816351d8344c17702b5243a97a50bec901714db7993fc6ac`.
- Removed the V05 preview resolver import, instance and configuration from `react-app/app/vite.dev-admin-plugin.js`.
- `/__about-blender-preview` now returns HTTP 410 for GET, HEAD and same-origin write methods. It performs no file reads or writes. Cross-origin writes still return 403. The public development guard remains unchanged and blocks the endpoint before local middleware.
- Retained `scripts/about-v2-blender/resolve-home-palette-preview.mjs`, all unlisted files, donors, backups, `.blend1` files and provenance. The recovery archive and manifest were not changed.

Recovery: [manifest](../../../output/about-rollercoaster-reset-20260917/recovery-manifest.json), [archive](../../../output/about-rollercoaster-reset-20260917/rejected-v05-recovery.tar.gz). Restore only a deliberately selected archive member; do not unpack the entire snapshot over current work.

## Removed files

- `react-app/app/public/models/about-v2-edited-world/camera-track.json`
- `react-app/app/public/models/about-v2-edited-world/meta.json`
- `react-app/app/public/models/about-v2-edited-world/surfels.bin`
- `scripts/about-v2-blender/apply-semantic-palette-system.py`
- `scripts/about-v2-blender/author-cinematic-london-journey.py`
- `scripts/about-v2-blender/author-clean-bust-finale.py`
- `scripts/about-v2-blender/author-gates-thames-journey.py`
- `scripts/about-v2-blender/author-persistent-world-motion.py`
- `scripts/about-v2-blender/camera-gate-metrics.mjs`
- `scripts/about-v2-blender/check-about-v2-edited-world.mjs`
- `scripts/about-v2-blender/check-london-scan.py`
- `scripts/about-v2-blender/choreograph-text-scene-symphony.py`
- `scripts/about-v2-blender/compact-finale-approach.py`
- `scripts/about-v2-blender/consolidate-opening-field.py`
- `scripts/about-v2-blender/equalize-scene-sections.py`
- `scripts/about-v2-blender/export-edited-about-v2-point-world.py`
- `scripts/about-v2-blender/lengthen-about-scene.py`
- `scripts/about-v2-blender/lengthen-opening-solid-bodies.py`
- `scripts/about-v2-blender/parameterize-landscape-appearance.py`
- `scripts/about-v2-blender/parameterize-opening-landscape-ranges.py`
- `scripts/about-v2-blender/parameterize-passage-families.py`
- `scripts/about-v2-blender/parameterize-solid-body-field.py`
- `scripts/about-v2-blender/prepare-connected-world.py`
- `scripts/about-v2-blender/prepare-london-scan.py`
- `scripts/about-v2-blender/rebuild-about-director-cut.py`
- `scripts/about-v2-blender/simplify-authoring-controls.py`
- `scripts/about-v2-blender/simplify-opening-and-separate-passages.py`
- `scripts/about-v2-blender/simplify-scene-names.py`
- `scripts/about-v2-blender/smooth-camera-drone-motion.py`
- `scripts/about-v2-blender/space-retained-early-scenes.py`
- `scripts/about-v2-blender/watch-about-v2-blend.mjs`
- `source-assets/about-v2-blender-current/about-v2-track-working.blend`

## Renderer and check retirement completed

The old renderer chain was removed together:

- `react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx`
- `react-app/app/src/routes/about-narrative-lab/AboutNarrativeWorld.jsx`
- `react-app/app/src/routes/about-narrative-lab/AboutNarrativePointWorld3D.jsx`
- `react-app/app/src/routes/about-narrative-lab/aboutBlenderPointScene.js`
- `react-app/app/src/routes/about-narrative-lab/about-narrative-lab.css`

All five matched the original recovery manifest. The ten obsolete checks below were not included in that manifest, so a separate exact snapshot of **all 15 files** was created and every archived byte hash was checked before deletion:

- `scripts/check-about-narrative-main.mjs`
- `scripts/check-about-narrative-editorial-refinement.mjs`
- `scripts/check-about-narrative-copy-variants.mjs`
- `scripts/check-about-career-sequence.mjs`
- `scripts/check-about-narrative-reading-stage.mjs`
- `scripts/check-about-narrative-parameters.mjs`
- `scripts/check-about-narrative-journey-map.mjs`
- `scripts/check-about-narrative-sequence-identity.mjs`
- `scripts/check-about-blender-scene-lifecycle.mjs`
- `scripts/check-about-blender-scene-contract.mjs`

Scoped recovery: [manifest](../../../output/about-rollercoaster-reset-20260917/retired-renderer-checks-manifest.json), [archive](../../../output/about-rollercoaster-reset-20260917/retired-renderer-checks-recovery.tar.gz). Archive SHA-256: `705c75fd6a4b3f9109c46d0c9b6ded656e2f0e20bad6b777aae615560abba618`. This preserves the latest dirty test edits rather than reverting to an older snapshot.

Shared font readiness, copy schema/persistence, scroll history and palette helpers remain. No active route imports the retired renderer. Negative old-chunk assertions in production/publication checks remain intentional safeguards.

Removed obsolete npm aliases (their audit source files remain historical evidence):

- `audit:about-interactive-stack`
- `audit:about-narrative`
- `audit:about-narrative-editorial-refinement`
- `audit:about-narrative-restoration`
- `audit:about-narrative-runtime-soak`
- `audit:about-narrative-terminal-hold`
- `audit:about-particle-continuity`
- `audit:about-recovery-logos`
- `audit:about-recovery-motion`
- `audit:about-recovery-viewport`
- `audit:about-responsive-sequence`
- `capture:about-cannes-jury`
- `certify:about-narrative`
- `check:about-career-sequence`
- `check:about-interactive-stack`
- `check:about-narrative-journey-map`

Current local verification remains `npm run check:about-narrative`; it runs the replacement asset, runtime, story, control and loading checks. Publication checks and `build:about-certification` remain available. Root owns final browser acceptance and documentation integration.

## Shared title regression correction

The title test now inspects the actual cached `titleRecords` update loop after a runtime allocation optimization. It explicitly requires a nonempty loop, source opacity calculation, hidden-title inert/accessibility state, and no positional/transform writes during the visible lifecycle. Glyph optical centring and full-viewport CSS checks remain intact.

## Validation

- `node --check react-app/app/vite.dev-admin-plugin.js`: pass.
- `node --test scripts/check-local-authoring-write-contract.mjs scripts/check-simulation-admin-deletion.mjs`: 30/30 pass, including public mirror guard coverage.
- Direct temporary-directory middleware harness: GET/HEAD/POST/PUT/DELETE return 410; HEAD has no body; cross-origin POST returns 403; no files created.
- Reference scan confirms the active About route imports the new component. No runtime source or package command references the five removed renderer files. Historical audit sources remain intentionally unmodified.
- No full build or browser test was run by this retirement worker.

Final retirement checks: 80/80 shared title/transition/loading tests pass; sphere material and palette contract checks pass; title-check syntax, package JSON parsing and scoped diff checks pass. No browser or full build run by this worker.
