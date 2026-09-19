# About surface authoring — implementation and verification

19 September 2026. Development only. No commit or production publication.

## Ownership

- Editable source: `source-assets/about-surface-world/about-surface-world.blend`.
- Blender exports ordinary faced meshes, one effective material role per object, the evaluated camera, beat timing, fog and supported ambient motion.
- Browser `rollercoasterField.js` owns spacing, radius ratio, surface sampling and the six-colour mixture. Circles are generated once when the bundle loads, then rendered with the existing Home gradient atlas.
- The seventh Blender material is `All colours`. It maps to the existing six runtime colours; it does not add a new website colour.
- The previous point-authored master remains untouched in `source-assets/about-rollercoaster-reset/`. Recovery hashes and copies are under `output/about-surfaces-20260919/recovery/`.

## Changed files

| Responsibility | Files |
| --- | --- |
| Simple source, exporter and source guide | `scripts/about-rollercoaster/build-surfaces.py`, `export-surfaces.py`; `source-assets/about-surface-world/` |
| Browser conversion and loading | `react-app/app/src/routes/about-rollercoaster/rollercoasterField.js`, `rollercoasterContract.js`, `rollercoasterScene.js` |
| Read-only source inspector | `AboutRollercoasterControls.jsx` in the same route directory |
| Save/export/refresh | `scripts/watch-about-rollercoaster.mjs`, `scripts/lib/about-rollercoaster-publish.mjs`, `scripts/lib/about-rollercoaster-preview.mjs` |
| Checks | `scripts/check-about-rollercoaster-{field,runtime,publish,assets,controls,preview}.mjs`; `package.json` |
| Current guidance | `DESIGN.md`, `docs/reference/ABOUT-NARRATIVE-TOOLKIT.md`, old source README retirement notice |

The v2 publication contains `geometry.json`, `camera.json` and a manifest. The old `points.bin` is removed inside the same rollback-protected transaction. The manifest is installed last. Malformed geometry, stale source identity and excessive sampling work retain the last good bundle. Public production keeps its existing Coming soon gate.

## Editing

See the [source guide](../../../source-assets/about-surface-world/README.md). Save the Blender source while `npm run studio:about-blender` is running. The watcher exports in an isolated background Blender process. Vite reloads only a complete, source-matched bundle.

Use ordinary mesh edits and assign one palette material. Apply unsupported modelling modifiers before export. Rotate/translate/scale static objects or animated gate children. Keep the final wave object's transform at identity; edit its four vertices in Edit Mode. The final wall must remain a complete rectangle using All colours.

Density is the `spacing` value in `ROLLERCOASTER_FIELD`; smaller spacing produces more circles. `radiusRatio` controls circle size relative to that spacing. Neither value is stored in Blender or generated geometry.

## Swarm contributions

- S1: simple Blender meshes, material-role export, source guide and solid preview proof.
- S2: browser sampling, raw v2 contract, renderer integration and focused tests.
- S3: transactional publication, sampling-cost guard and independent asset checks.
- S4: read-only review; identified publication limits, effective material slots and animation parity risks.
- Root: source/bundle recovery, save/refresh integration, guidance, independent density and reading checks, website QA and final integration.

## Verification

Final source SHA: `4c96924a92f3d21f40caf82a32c9a15eae46d7114756a65a80c7cd74289b58e0`.

- Saved/reopened source: **29 objects, 1,254 base vertices, 1,085 base faces**. Nonplanar quads become triangles in the 1,387-face export. No circle instances, loose point vertices, radius or density controls remain.
- Browser density proof on identical geometry: spacing `0.23` → **167,747** circles; `0.299` → **99,725**; `0.391` → **56,486**. All single-role objects retain their role; All colours uses exactly roles 0–5. Default sampling took about 0.88 seconds in the local Node proof.
- Material proof saves/reopens a separate Blender copy with an Object-linked assignment. Exactly one object's role changes from 0 to 6; geometry and camera bytes stay identical.
- The 2,001 camera samples are byte-identical to the preserved source. Journey distance remains approximately 360 world units. Both passages and the final hold pass the independent asset gate.
- The complete ending plane generates **38,247** cells at default spacing, with zero rest-plane error and all six colours. No fixed circle count is stored in the source.
- **976/976** reading views have zero circle intrusions into the conservative protected column, across four ambient times. The original long right ribbon crossed the career prose; it now uses 16 short physical panels that remain outside that volume.
- Source motion: 30 evaluated rotation phases match; 4,356 evaluated wave samples match within 0.00001526 world units. Missing drivers, added actions and altered-rate drivers are rejected.
- `npm run studio:check`: **406 tests pass**, zero failures; lint, token/config checks, build and publication checks pass. Scoped runtime/field/publisher checks: 60/60 pass. Final review found no remaining code issue in scope.
- In-app Chromium: inspected desktop 1280×720 and portrait 390×844. Opening, open hoops, square/diamond gates, portrait career prose and complete ending in both themes rendered with the shared Home atlas. Browser reports 167,747 circles in one draw call. Forward/hold/reverse camera identity, moving ambient clock and reduced-motion checkpoints/frozen clock were verified. No browser errors or warnings.
- The saved-source watcher exported the frozen file and caused the expected validated reload. It remains running for manual edits. The exact new source path was opened and verified in Blender. Its native screenshot was too small for detailed inspection; actual solid renders were inspected separately.
- Built preview on port 8013 was opened and visually confirmed to retain **Coming soon**. That disposable preview process was stopped. The existing authoring server on 8012 remains running.

Evidence: `output/about-surfaces-20260919/{freeze,density-proof,reading-proof,browser-proof}.json`, `studio-check.log`, `asset-gate.log`, `watcher.log`; source proof and solid renders are in its `source/` directory.

### Limits

This establishes the requested authoring/runtime separation, not final cinematic acceptance. The opening panels pass out of view quickly in early travel; the cleared prose areas remain visually quiet. The source is now editable to refine that composition. WebKit and physical mobile hardware were not re-tested this turn. Full source sampling runs synchronously once at load; lower-powered device startup remains a separate performance check.
