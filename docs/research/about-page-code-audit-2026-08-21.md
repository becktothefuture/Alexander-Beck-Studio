# About page code audit — 21 August 2026

## Scope

This audit covers the About route, the V2 point-world runtime and editor, the
Blender export path, and the checks that protect them. It distinguishes code
that ships, code used only during development, fallback code, and historical
code.

## Runtime boundary

- Production still renders `AboutComingSoon`. The V2 narrative route is loaded
  only when `import.meta.env.DEV` is true. `AboutComingSoon` is therefore not
  redundant; it is the current production gate.
- The V2 route graph reaches 70 of the 84 JavaScript and JSX files in
  `src/routes/about-narrative-lab/` when worker entry points and Vite's
  production/certification aliases are included.
- The edited Blender binary and `camera-track.json` are the primary scene and
  camera sources. `aboutNarrativeLongAssembly.js` remains the load-failure
  fallback and must stay until the product accepts a blank-scene failure mode.
- The certification and production resource-tool and runtime-observer variants
  are Vite aliases. A normal static import scan can misclassify them as dead.

## Removed now

- Removed the retired procedural Blender builder, the matching JSON exporter,
  and their ocean-specific checker: 1,096 lines in total.
- Removed the obsolete scene-source JSON and manifest from the current authored
  Blender folder. The separate historical reconstruction archive remains.
- Removed false “live” controls from the V2 Director and advanced point-field
  inspector. Blender-only arrow, hoop, square-tunnel, camera transform, mouse
  pan, and steadicam values remain in the document only for schema and fallback
  compatibility. The visible controls now affect the loaded point field:
  density, point size, ambient motion, scroll response, and fog reveal.
- Confirmed that active About runtime source and canonical About configuration
  contain no ocean-specific renderer or configuration fields.

## Retained on purpose

- `AboutComingSoon.jsx`: current production route.
- Procedural Long Assembly generation: recovery when the Blender binary cannot
  load.
- Legacy shape fields in the schema: old-document and procedural-fallback
  compatibility. They are no longer presented as controls for the Blender
  asset.
- Camera story keys: currently used as editor navigation and timing metadata,
  although the renderer takes pose, roll, and field of view from Blender.
- The historical `source-assets/about-v2-blender/` folder: reference archive,
  not an active build input.

## Deferred cleanup candidates

Fourteen files are disconnected from the active V2 route graph. One is a test
file. The other 13 modules total 4,265 lines:

- 273 lines: the retired pointer-pan and steadicam controllers. The canonical
  `check:about-narrative` command still tests them, so removal must also update
  that contract.
- 337 lines: legacy modifier sampling. It is referenced by old standalone point
  world checks and a motion test, not by the current renderer.
- 3,655 lines: the previous compiler/editor/timeline/track-model/persistence
  stack. Manual certification and about 5,400 lines of old checks still depend
  on this stack.

These files do not increase the shipped About bundle, but they do increase
maintenance cost. Remove them as one migration: retire or rewrite the old
certification command, update `ABOUT-NARRATIVE-TOOLKIT.md`, then delete the old
modules and their checks together. Deleting individual modules now would leave
misleading commands and broken historical coverage.

One unreferenced 2.9 MB `about-v2-track-reference.glb` remains in the current
Blender folder. It is an old exchange file and is not used by the website or the
current exporter. It can move to the historical archive after confirming that
no external Blender workflow still opens it directly.

## Completion checks

- Blender export checker passes for both fixed point profiles.
- About narrative checks, lint, and the full site gate must pass after cleanup.
- Review the About sequence at the hoop tunnel, floating models, square tunnel,
  forest, and valley on desktop and mobile.
