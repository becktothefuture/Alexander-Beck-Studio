# Track-centred About composition

## Requested outcome

Blender timeline playback must move the real camera. All environment geometry should follow the rail and be approached closely. Keep the frame interesting through the full journey, prefer balanced sides and use some floor-only sections. Retain simple editable surfaces, material-role assignment, browser-owned circles/density, full copy, readable prose and centred titles.

## Source and scope

The current live scene was copied to `output/about-track-composition-20260919/recovery/live-before.blend` before edits. Canonical source remains `source-assets/about-surface-world/about-surface-world.blend`; the v2 runtime contract stays unchanged. Large remote gallery ribbons and short opening wings are replaced with rail-centred geometry. Existing tunnels, gates and the complete final wall provide landmarks. The ending wall remains the intentional large terminal surface.

## Work and dependencies

1. Root: preserve live and saved source; configure timeline playback and chapter markers; own live Blender mutations and final integration.
2. C1 source worker: isolated geometry refinement function and candidate; owns `refine-track-surfaces.py` and geometry proof output. No live Blender writes.
3. C2 audit worker: independent track-distance and projected-coverage audit; owns `audit-composition.py` and audit output. No runtime or source mutation.
4. Root: integrate candidate, inspect sample views and full scroll travel; adjust real geometry/fog to remove gaps and preserve readable prose. Freeze only after these checks.
5. Root plus read-only review: verify exact source/export identity, timeline motion, material/motion parity, code density unchanged, desktop/portrait and reduced motion. Run `npm run studio:check` and preserve production gates.

## Acceptance

- Playing and scrubbing the Blender timeline move the camera; ambient animations use the same clock. Save with timeline mode enabled and the camera view visible.
- No remote ribbons that never approach the rail. Report distances for every environment object and distinguish the large final wall.
- Near geometry remains visible in the opening and reading sections. Side pairs read as balanced where track bends permit; intentional floor-only interludes remain visibly grounded.
- Nothing is switched on/off by scroll. The camera travels through persistent geometry.
- Maintain a central reading corridor through actual geometry and depth; all prose and centred titles remain intact.
- Assess representative solid Blender views and the browser circles, including gaps between landmarks. Quantitative projection checks support visual review; they do not establish cinematic acceptance on their own.
