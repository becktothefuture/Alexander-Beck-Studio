# About: simple Blender surfaces, browser-owned circles

## Approved request

Replace the point-cloud authoring model with simple editable geometry. Each Blender mesh has one of six palette-role materials, or a seventh `All colours` marker. Browser code replaces those roles with the site's active palette and generates the gradient circles at a code-owned density. Keep the full story, centred titles, camera rail, ambient motion, reduced motion and development publication boundary.

## Shared v2 contract

- Source: `source-assets/about-surface-world/about-surface-world.blend`. The former source remains a recovery/reference only.
- Public bundle directory stays `react-app/app/public/models/about-rollercoaster-world/`.
- Schema: `about-rollercoaster-world/v2`.
- Files: `meta.json`, unchanged-format `camera.json`, `geometry.json`. No exported balls, point ranges, radii or point density.
- `meta.geometry = {file: 'geometry.json', sha256, objectCount}`. Remove `meta.points` and `meta.circleField`. Retain camera, beats, motionGroups, fog, regions, finalGrid, distance and reference timing as applicable.
- `geometry.json = {objects: [{id, name, positions: [x,y,z,...], faces: [[a,b,c] or [a,b,c,d],...], paletteRole: 0..6, motionGroup: integer}]}`. Positions are world rest coordinates in the existing browser coordinate basis. Faces use object-local vertex indices. IDs and names are nonempty and unique. Role 6 means all six current site roles; it is never a seventh browser colour.
- `meta.finalGrid.objectId` identifies one complete planar four-corner wall mesh. Retain world-space origin, normal, uAxis, vAxis, width, height, stoppingDistance and motionGroup. Remove rows, columns and pointRanges; browser spacing creates the grid.
- Each exported mesh has one material and every face uses it. The material property `about_palette_role` is the authoritative numeric 0..6 role. `About · All colours` has an obvious distinct authoring marker colour. Ordinary Blender material reassignment must change the exported role.
- Retain current absolute-time `static`, `rotate` and `wave` motion algebra. The simple geometry previews those motions in Blender. Source and browser parity is required.
- Browser field module owns spacing (initial 0.23 WU), radius ratio (initial radius 0.075 WU at default spacing), deterministic sampling and mixed-role assignment. Regular quads use surface grids; triangles use bounded deterministic sampling. Weld shared seams and avoid density growth from subdivisions/duplicate faces. Cap allocation explicitly; fail invalid/oversized inputs before rendering. Sampling happens once per load, never per frame.
- Runtime loading returns `{meta, camera, points, field}` where points are generated in the existing six-float GPU format and field describes code-owned spacing/radius/count/object ranges. Raw surface validation remains usable by the publisher without rendering or sampling.

## Task graph and ownership

1. Root: freeze this interface; back up current source, bundle and touched modules; own integration, watcher paths, UI diagnostics and documentation.
2. S1 source worker: new simple-mesh builder, exporter, saved source, source guide and isolated staging export. Keep camera rail from the saved source; build separate low-complexity objects. No public-bundle promotion until integration. No browser/source-contract edits.
3. S2 runtime worker: v2 contract/loader, circle-field sampler, scene integration and focused runtime/sampling tests. No Blender/publisher/editor writes.
4. S3 validation worker: publisher and publisher tests, asset gate and tests relevant to the v2 boundary. Depend on this contract; integrate against runtime exports when ready. No runtime or Blender writes.
5. Root integrates all three, exports the saved source through the validated publisher, updates source watcher/controls references, and checks actual website views and Blender authoring view.
6. Read-only review of final diff; root resolves findings and runs `npm run studio:check`.

## Observable completion

- Blender contains simple editable meshes with visible faces, not authored ball instances or dense circle-centre vertices.
- Assigning any one material maps the whole object to its current site colour; assigning All colours yields all six roles in the browser.
- Changing the code-owned spacing changes generated count without changing Blender source or exported geometry.
- Simple gates and complete animated wall render with the shared Home circle finish. Source camera and full prose stay intact.
- Saved source opens for manual editing; forward/hold/reverse, portrait, both ending themes and reduced-motion behaviour are inspected. No commit or deployment.

## Risks

Surface sampling can cause seams, uneven density or excessive startup work. Keep it deterministic and bounded and test topology changes, role mapping, malformed files and allocation limits. The source is open in Blender, so create a new file rather than overwrite possible user edits in the old window. The Blender connection is currently inactive; background construction and export are isolated from the user's window, then the new saved source is opened through the app.
