# About cinematic release — verified result

19 September 2026.

## Consolidated decision

The creative frontend reviewer and both film directors selected one responsive circle-spacing policy, a 105-degree portrait lens cap, a shared near/far visibility corridor, and a larger final invitation. The source Blender scene and camera export remain unchanged. Global theme-aware circle tonality protects text contrast without scene-specific masks, fog exceptions, title plates, or a hole in the final wall.

- Home remains the source of circle size and gradient atlas. All objects use the same viewport-calibrated diameter/pitch target, 0.55, with stable resize buckets.
- Visibility defaults: hidden at 2 WU; near fade ends at 7 WU; far fade starts at 8 WU; hidden again at 24 WU. The ending follows the same rule.
- The renderer uses a genuinely opaque WebGL2 context. Three's context defaults otherwise retain alpha despite its renderer option. Theme completion refreshes the canonical canvas background.
- Dark circles use a smooth luminance shoulder; light circles retain a minimum luminance. Primary text stays readable across the moving material. Years and reading labels use primary ink.
- Final support text is 16–18px before the saved type scale. Short landscape viewports retain a scrollable contact support area.
- Static reduced-motion frames skip GPU redraws. Resize, theme, material, visibility and graphics recovery invalidate them.
- Network and body reads have bounded deadlines, retry and cancellation. Late expired responses cannot launch later request stages. Failure leaves the complete semantic story readable.
- Production now includes the About journey. Editing controls, diagnostics and obsolete scene bundles remain outside the production experience.

## Review and evidence

- 60 baseline frames and 96 final frames: desktop 1440×1000 and phone 390×844, both themes. The final contact sheets are ordered by scroll progress.
- Both film directors accepted final static composition: readable prose, distinct round/square gates, quiet releases, centred titles, complete multicoloured wall and visible contact actions.
- Creative frontend review accepted the renderer, loading, resize, tonal and theme handling. It did not claim hardware certification.
- Actual native scroll moved forward and reversed to the identical scroll position, progress and camera position. Holding reduced motion kept GPU draw count at 59,329 while skipped frames increased from 2,465 to 2,538. The runtime retained one geometry and one texture.
- Production browser checks: direct About entry, `edit=1` exclusion, Home → About, About → Contact → back, one main landmark, no development diagnostics, no observed console errors.
- Responsive production checks: 320×740,390×844,430×932 and844×390; no horizontal support overflow. Landscape support is scrollable.
- Deliberately blocked model requests reached the visible, readable full-story fallback after the loading overlay completed. Blocking was removed.
- Source SHA-256: `434de647802cc0211ee34c090216391d60066bb7b302410f622d17c100049a37`.

Local screenshots and runtime records: `output/about-final-directors-20260919/`. They are generated evidence, not committed source.

## Validation

The isolated release checkout is based on current main and preserves its newer shared Home, Contact and Button Bar changes.

- `npm run studio:check`: passed, including lint, design-config parity and production build.
- About suite: 148 tests passed.
- Focused runtime/field tests: 45 passed. Theme tests: 3 passed.
- Root and app `npm audit`: zero vulnerabilities.
- Publication boundary: About published; Work and Fancy publication decisions preserved; authoring and debug excluded.
- Diff review: no unrelated Contact test removal, generated screenshots, Blender backup files, caches or dependency trees.

The original authoring checkout has unrelated unfinished CSS edits; its all-site gate reports the existing Portfolio CSS ownership snapshot mismatch. Those files are not part of this release. Browser checks used the Codex in-app Chromium browser, including emulated phone dimensions. Physical iPhone/Android and Safari verification remain user-device checks; the mobile tunnel supports them.

## Release

User authorized a scoped commit, fast-forward push to main and GitHub Pages deployment. The final deployment run and live URL must be verified after the push; local builds are not deployment evidence.

The first Pages run exposed a test-only 20ms wall-clock race on its shared runner. The retry test now advances a controlled clock for the stalled attempt and lets the valid body/hash work complete without a hardware-speed assumption. All148About tests pass after the correction, and the loading tests also pass under the CI version, Node22.19.0. Production code and rendered assets are unchanged by this follow-up.
