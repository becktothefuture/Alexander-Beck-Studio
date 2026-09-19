# Live path authoring

## Outcome

Edit one smooth Bézier camera path in Blender and see the simple surface environment follow immediately. Preserve the current live scene, including deleted objects, material roles, independent animation, and browser-controlled circle density.

## Dependencies and ownership

1. **Preserve and inspect (root):** capture the unsaved live scene; inventory its 36 meshes and current camera rig.
2. **Independent implementation:** fit a small, smooth Bézier rail (`bezier-rail.py`); convert existing surfaces into path-relative coordinates (`bind-track.py`); update evaluated-surface export (`export-surfaces.py`). Root creates the shared Geometry Nodes binding through Blender's structured tools.
3. **Integrate:** apply conversion in place, attach native curve dependencies, retain normalized stations, and update the final wall's local animation basis.
4. **Verify:** move and lengthen a Bézier span, confirm camera and all affected surface types follow, then restore it. Check saved/reopened parity, ambient animation, export, browser rendering, and the site gate.
5. **Handoff:** select the rail in Blender, document editing and playback, and release control.

## Boundaries

- No regeneration of removed geometry; no unrelated changes or production publish.
- Static surfaces deform along normalized curve progress. Rigid gates and the wall follow fixed normalized anchors.
- Keep 2,001 runtime camera samples for smooth browser playback; fewer Blender controls do not reduce playback quality.
- Recovery snapshot: `output/about-bezier-binding-20260919/recovery/live-before.blend`.

## Risks

Curve-frame orientation, independent gate rotation, and the final wall's wave basis must agree between Blender and the browser. Extreme self-intersecting path edits can still cause scene overlap and require visual review.
