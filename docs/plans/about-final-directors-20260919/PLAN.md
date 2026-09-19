# About cinematic finish and release

19 September 2026. Authorized: consolidate three reviews, implement the selected improvements, verify desktop and phone, commit and publish to main, provide a safe phone tunnel. Blender geometry stays intact.

## Evidence and direction

New baseline: 60 actual browser captures in `output/about-final-directors-20260919/before/`, with four contact sheets and a linked full-resolution gallery. Three independent reviews: creative frontend, photographic composition, cinematic sequence.

All three identify excessive mobile circle overlap. The phone lens also crops gate shoulders, but widening it brings reading-gallery rows toward the text. Treat circle spacing and framing as one controlled comparison. The sequence already has useful contrast between dense passages and open floor releases.

## Execution graph

| ID | Work | Dependencies | Owner | Acceptance |
| --- | --- | --- | --- | --- |
| C1 | Source/runtime review | Baseline | Creative frontend | Ranked, file-backed recommendations |
| D1 | Composition review | New contact sheet | Film director 1 | Desktop/phone, light/dark evidence |
| D2 | Sequence/peak-end review | New contact sheet | Film director 2 | Peaks, counterpoints, ending criteria |
| C2 | Responsive global spacing; idle GPU robustness | C1/D1/D2 | Creative frontend | Same Home size and all-object circle/gap policy; stable resize; static invalidation |
| R1 | Bounded startup reads | C1 | Root | Timeout, cancel, retry and fallback tests |
| R2 | Lens, reading and ending refinement | C2 | Root + directors | Compare same source progress; keep only complete-sequence improvement |
| R3 | Production launch and isolated integration | C2/R1/R2 | Root | About shipped; editor/debug excluded; latest main and unrelated work preserved |
| R4 | Final verification and release | R3 | Root + three reviewers | Before/after sheets, real scroll, theme/size/reduced-motion, site gate, deployed SHA and page |

## Selected changes

1. Keep Home-linked circle size. Apply a single viewport-calibrated sampling pitch to every object. Preserve discrete gradient circles on phones and keep changes outside the frame loop.
2. Compare portrait lens candidates after spacing is corrected. Choose one aspect-based policy; no per-chapter lens jumps. Keep the source camera rail and world geometry.
3. Recheck prose and the final title/support on full-resolution captures. Prefer restrained global material/density/framing and existing typography roles. Do not carve a hole in the wall, add a title plate, introduce local fog overrides, or hide scenes by chapter.
4. Skip repeated static reduced-motion GPU draws with complete invalidation. Bound network/body loading so the readable fallback is reachable.
5. Publish the new About experience. Preserve Work/Fancy publication decisions, shared shell, Home, Contact, and unrelated dirty work. Use an isolated checkout based on latest main.

## Stop conditions

- Source geometry/camera files retain their accepted hashes.
- One visibility corridor and Home material/size rule across all surfaces.
- Phone tunnel gates remain identifiable; circular and square motifs are distinct.
- Preserve quiet counterpoints around 17%,43%,89%; centered titles and complete ending contact actions.
- Verify native forward, hold, reverse, resize, history, reduced motion and failure paths in the local browser. State physical-device limitations.
- Final `npm run studio:check`, production build and publication checks pass in the release checkout.
- Commit only scoped changes; push fast-forward to main; verify Pages success and deployed About.

## Executed outcome

All review and implementation phases completed. See [RESULT.md](RESULT.md) for selected parameters, review acceptance, verification and release boundaries.
