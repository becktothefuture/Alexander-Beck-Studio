# About rollercoaster implementation

17 September 2026. Implemented development candidate; visual acceptance pending. This is the implementation record for [the approved plan](PLAN.md), not a visual acceptance claim.

## Ownership

| Area | Source |
| --- | --- |
| Physical scene, live camera rail, circle positions, animation and beat markers | `source-assets/about-rollercoaster-reset/about-rollercoaster.blend` |
| Fresh source authoring and export | `scripts/about-rollercoaster/` |
| Validated browser bundle | `react-app/app/public/models/about-rollercoaster-world/` |
| Scene playback, semantic story and native scrolling | `react-app/app/src/routes/about-rollercoaster/` |
| Copy, clients and local typography | `react-app/app/public/config/contents-about.json` |
| Circle appearance and active palette | Shared Home material generator and simulation palette controller |

Blender runs in an isolated background process because no live MCP instance was claimable. This does not touch any open user scene. The new scene is authored from a clean factory state. Its exporter must also work on the saved, manually edited source.

## Integration boundaries

- Development About loads the new experience. Production retains its build-time Coming soon gate.
- The new loader accepts only `about-rollercoaster-world/v1`, with matching camera/point hashes and the new source identity. It never falls back to V05.
- The new root keeps the existing scene-ready selector and event so the shared route transition can wait for a first frame.
- Old source and generated geometry are removed only after their replacement loads. The verified 133-file recovery archive remains available.
- Copy persistence still has compatibility dependencies under `about-narrative-lab/`. Their presence does not make the rejected camera or scene active. Do not delete that directory wholesale.
- Home, Work, shell, mobile and Fancy Mode changes already in the working tree are outside this task.

## Worker contributions

- Scene worker: new `.blend`, evaluated rail, moving assemblies, exporter and source checks.
- Runtime worker: validated loader, instanced Home circles, absolute-time animation, lifecycle and parity tests.
- Editorial worker: complete canonical story, measured scroll budgets, centred titles, contact actions, history and reduced motion.
- Controls worker: existing docked authoring pattern, website copy/type controls and read-only source parameters.
- Check worker: shared title, material, palette and readiness checks against the new implementation.
- Independent audit: exact old-file dependencies and safe retirement candidates.
- Root: interface agreement, Home texture export, route integration, source identity/forward-camera checks, browser review and final gates.

## Version 1 motion scope

Scroll owns the camera rail. All moving scene groups in this first bundle use independent ambient loops; unsupported group clocks fail validation. Source-owned scroll-bound object animation is not exposed as a working control. This is narrower than the plan's future clock-binding option and does not change the requested animated tunnels and wall.

## Final source and technical evidence

- Saved source SHA256: `3d9b9a7c1ee80c54feb51d5e83ccd241446a930db2ab7c9c9286ff432c189988`.
- 155,524 persistent circles; 2,001 evaluated camera samples; 359.997 world units; one radius of 0.075 and spacing of 0.23.
- Tunnel A spans 14.005 clear widths; tunnel B spans 13.098. Each declares four authored spatial events. Their baseline reference allocations are 36 and 32.4 seconds.
- Blender forward deviation is at most 1.836 degrees against its evaluated rail; final approach is 0 degrees. The independent exported-sample checker also passes.
- Conservative all-phase camera clearance is 1.47137 units. An additional sampled Blender check measures at least 2.27194 units over 401 poses and four ambient times.
- Opening and three prose regions: no protected-column intrusion in 976 pose/phase cases. Ending: no earlier non-grid geometry in the conservatively expanded final frustum.
- Final grid is complete: 210 × 184 = 38,640 points. A physically recessed support bay preserves the full population while clearing contact copy.
- Evaluated Blender/browser motion comparison: 76 samples at four clock values, maximum position difference 0.0000351 units. This is browser scene-inspector parity, not GPU pixel readback.
- Editing the live rail moves the evaluated camera; probe displacement 0.27465 units. Export leaves the saved source unchanged.
- Nine unsupported source-edit cases fail before publishing and preserve destination bytes. The publisher also rejects invalid material/binary/hash/source/story contracts before replacement.

Evidence lives in `output/about-rollercoaster-build-20260917/source/`: `export-report.json`, `evaluated-final.json`, `reading-v04.json`, `ending-v04-proof.json`, `browser-parity-result.json`, and `negative-preflight/`. Earlier version-labelled reports remain historical evidence, not the final source pin.

## Browser verification

Actual Codex in-app browser captures are in `output/about-rollercoaster-build-20260917/browser/`; `manifest.json` identifies the final capture set. The root contact sheet and `review.html` expose the complete review.

- Desktop: 1440 × 1000; inner window 1412 × 898. Opening, all prose regions, both tunnels, and dark/light endings inspected.
- Portrait: 390 × 844; inner window 370 × 746. Opening, career, both tunnels, reduced motion and dark/light endings inspected; no horizontal prose overflow.
- Reverse scrolling by the same native wheel distance returns the exact camera position. Stopping scroll holds the camera while the ambient clock continues.
- Reduced motion holds a useful tunnel midpoint at progress 0.30 and sets effective ambient time to zero. Full motion restores through the visible control.
- All statement headings remain present in the accessible story; inactive ending controls alone are inert.
- Body-size live apply → save → reload → revert → save verified in the actual panel. The canonical content file returned byte-for-byte to SHA `cccb029975e234a383c42b9f2c9bc9150a6ff43f474ccb592ce52dff6bcdfd41`.
- Enlarged body type at 1.8× reflowed without horizontal overflow. This is not an OS 200% zoom certification.
- Copy-email feedback, Contact navigation and return to ending were checked. No message was sent.
- Production preview retains Coming soon; development scene, authoring controls and diagnostics remain outside production chunks.

## Commands and review

- `npm run studio:check`: passed, including lint, configuration/route contracts, 93 focused About tests and the production build. Log: `output/about-rollercoaster-build-20260917/studio-check-final.log`.
- `npm run build:about-certification`: passed. This build still uses the production hold and does **not** certify the development cinematic page.
- Independent reviewer closed invalid-publication, transform-parity and semantic-title findings. Final scoped publisher/runtime/story run: 48/48 passed.
- No separate typecheck command is defined. No commit, push or deployment was performed.

## Remaining acceptance and visual limits

The implementation is reviewable, but it is not labelled visually accepted or production-ready.

The generous physical reading clearances make some views extremely sparse: the method passage can show no surrounding scenery, and the portrait opening is nearly empty. The next design judgment is whether to bring a small amount of architecture closer to the side edges using the measured text bounds, while preserving readability.

The final-source Blender film (`source/reading-and-tunnel-a-final-64.875s.mp4` in the evidence folder) covers the first reading gallery and tunnel A at reference speed: 519 frames, 640 × 400, 8 fps, 64.875 seconds. Six spaced frames were visually inspected after encoding. The packed Blender palette is the source-time website palette; the browser follows the current scheduled palette. It is not a full website recording. Complete 180-second website films and the desktop/portrait × light/dark forward/hold/reverse matrix, WebKit, OS reduced-motion/zoom, physical-phone review, and sustained 60 FPS distributions have not been certified. Four ambient phases were measured, not the plan's five-phase-per-region visual matrix.

A successful technical gate does not replace these checks or Alexander's creative acceptance.
