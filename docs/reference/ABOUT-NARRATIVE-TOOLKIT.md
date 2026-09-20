# About journey toolkit

19 September 2026. About uses simple Blender surfaces with browser-generated circles, open hoops and gates. The full journey is published; authoring controls remain development-only. See the [base implementation record](../plans/about-rollercoaster-reset-20260917/IMPLEMENTATION.md) and [surface authoring record](../plans/about-surface-authoring-20260919/IMPLEMENTATION.md) for verification status.

## Source ownership

| Edit | Authoritative source |
| --- | --- |
| Camera rail, bank, surfaces, colour roles, motion and beats | `source-assets/about-surface-world/about-surface-world.blend` |
| Circle density | `react-app/app/src/routes/about-rollercoaster/rollercoasterField.js` |
| Visibility corridor and Home size baseline | `react-app/app/public/config/design-system.json` runtime |
| Copy, career entries, clients and typography | `react-app/app/public/config/contents-about.json` |
| Circle gradients and live colour palette | Shared Home material generator and palette controller |
| Playback and native scroll layout | `react-app/app/src/routes/about-rollercoaster/` |

The browser reads `public/models/about-rollercoaster-world/meta.json`, `camera.json` and `geometry.json`. These are generated exports. Do not edit them by hand. Source identity and export hashes must match before the renderer becomes ready. An invalid bundle shows the complete readable story as a fallback; it never loads the rejected scene.

## How scrolling works

A native scroll container maps eleven source beats to the camera rail. The Blender baseline is 23.7 viewport lengths. The canonical text-motion duration scale gives title sections 75% more native scroll distance, bringing the current baseline to 28.5 viewport lengths. Travel-only gaps and excess prose budgets are shorter; the title holds are unchanged. Measured prose can extend reading beats so every line can enter and leave the viewport. This does not shorten either tunnel.

The camera follows evaluated Blender position and rotation. A critically damped spring gives the camera a gentle glide after scrolling, covering 95% of an impulse in about 600 ms. Slow frames retain the easing instead of snapping to the scroll target. It settles exactly on the native scroll target without overshoot. Reverse scrolling retraces the path; history restoration and reduced motion bypass the glide. Moving assemblies have a separate ambient clock. They keep moving during a scroll hold and stop when the page is hidden or reduced motion is enabled. The surface contract supports ambient object loops only; scroll-bound object animation is not an exposed control.

Opening, intermediate and ending titles use measured glyph bounds to centre visible lettering in the studio window. Each new title visit replays Home’s shared per-letter colour reveal. The heading travels gently in depth, using the existing `globals.textMotion` perspective and entry/exit distances (1600px, 300px and 210px); it never moves sideways or vertically. Opening and ending titles ease towards the reading plane over 1400ms. Titles remain fully opaque through the first 90% of their interval, then fade. Reflow preserves the current reveal; leaving a title settles its letters, and returning starts a new reveal. Reduced Motion shows settled letters with zero depth. Prose scrolls through physical reading chambers. No browser mask, title plate or camera-gaze correction creates the reading space. The camera stops at 97% and holds while the full multicolour wall continues to move.

Reduced motion selects stable views of the same scene and freezes environment loops. Semantic copy and contact actions remain available. Browser history restores scroll progress. The stable Button Bar can open Contact at any point.

## Current passage geometry

The opening is a straight, level flight over four adjacent floor lanes. The first walls and gates stand at the tunnel threshold and enter through the shared visibility corridor. Two broad camera sweeps replace the former small turns; zero authored tilt stabilizes the horizon.

The first passage alternates enclosed entry, twelve separate round hoops and enclosed exit. Seven infill hoops keep the open stretch from becoming a blank view between gates. The second uses the same structure with five square or diamond gates. The spaces between each short hoop or gate are real openings. Geometry remains in the world throughout; the browser does not switch scenes on and off.

The current environment contains 36 simple surface objects, preserving the author's latest removals. Upright panels follow the reading route, and four simple floor strips form open releases. The large terminal wall is the intentional exception to the close-to-path composition. Each object uses one of six palette-role materials; `All colours` is a seventh authoring marker. Its browser result uses all six current website colours. Assign the material through Blender's Material Properties. Both disciplines gate ribbons use All colours. The browser creates the same original, unmuted gradient-circle material on all surfaces. A global pitch target of about 0.389 gives approximately twice the former circle count per surface, with half-size circles and wider clear gaps.

One visibility corridor applies to every circle. Defaults: hidden through 2 WU, clear from 7 to 8 WU, and fully hidden from 24 WU onward. Smooth fades join the boundaries. The four values save in the canonical design system and apply live without rebuilding the field. The final wall has no exception. Fully hidden circles do not write depth over other surfaces.

The final wall is one complete four-corner rest plane, with a preview-only deformation that shows its broad wave in Blender. Browser spacing determines its circle count. There is no central recess, cutout or separate neutral-colour patch. The ending title stays centred, with its support line in primary text colour and medium weight.

## Website controls

Open `http://localhost:8012/about.html` and press `/` to open the docked panel. Escape closes it. `?edit=0` hides authoring controls for review.

Copy, typography and visibility use live apply, canonical save, reload and revert. Copy/type save to contents-about.json with existing conflict checks. Visibility saves only the four About visibility runtime keys in design-system.json, merging against a fresh copy. The panel has one Save action for both sources. Geometry, camera and motion remain read-only: their owner is the saved Blender file. Shared schema, persistence, fonts and history helpers remain under `about-narrative-lab/`; these are compatibility infrastructure, not the old scene.

## Blender controls and export

See the [source guide](../../source-assets/about-surface-world/README.md). Edit `FlightRail`'s 23 aligned Bézier controls and tilt to change the camera and environment together. Static surfaces use a shared Geometry Nodes path binding; moving gates and the final wall use fixed normalized Follow Path anchors. Lengthening the path retains their place in the journey. Static source meshes use unrolled coordinates; preserve their binding modifiers. Use `About World Controls` for progress, ambient time and timeline playback. The browser controls the shared near/far visibility corridor. Space plays or stops, and the timeline has named chapter markers. Frames 1–5401 cover the 180-second reference journey at 30 fps. Solid Blender surfaces show the camera and object motion; browser code adds the circle material and distance fade. Set `ROLLERCOASTER_FIELD.spacing` in browser code to change density. Circle size uses 50% of Home's shared helper at an 8-WU reference depth and retains perspective. The About panel saves four visibility distances to the canonical design-system runtime; the final wall has no exemption. Rotation controllers own loop period, phase and amplitude.

Start the saved-source exporter beside the development server:

```bash
npm run dev
# In another terminal:
npm run studio:about-blender
```

The watcher opens the saved scene in an isolated background Blender process. Vite validates the completed export before refreshing the preview. Correct failed exports in the source; do not patch generated metadata. `ABS_BLENDER_BIN` overrides the watcher executable.

For one explicit export:

```bash
'/Applications/Blender.app/Contents/MacOS/Blender' --background --factory-startup --enable-autoexec --python-exit-code 1 --python scripts/about-rollercoaster/export-surfaces.py -- --source source-assets/about-surface-world/about-surface-world.blend --output react-app/app/public/models/about-rollercoaster-world
npm run check:about-narrative
npm run studio:check
```

The authoring builder is a one-time constructor, not the normal save/export loop. It must not overwrite a hand-edited source. Keep the final wave plane object transform at identity and edit its four vertices in Edit Mode. Static objects and rotating gate children support normal mesh and object transforms. Unsupported modifiers and animation fail export rather than silently diverge from the browser.

## Verification and retirement

The exporter checks source identity, the live rail constraint and evaluated camera alignment. The asset gate independently checks bundle hashes, forward direction, tunnel length/events, grid completeness, the single grid rest plane and final framing. Runtime tests check animation, loading and disposal. Field tests check equal density across subdivisions, welded seams, mixed roles and allocation limits. Publication checks the sampling budget before replacing the last good bundle. Story/control tests check content, pacing and persistence.

Checks do not establish visual acceptance. Review forward, hold and reverse travel, prose entry/exit, titles, both themes, portrait, enlarged text and reduced motion. Label untested browsers and physical devices explicitly.

The rejected source and tools are recorded in [RETIRED.md](../plans/about-rollercoaster-reset-20260917/RETIRED.md). Recovery copies remain local. Historical toolkit documentation is preserved in `output/about-rollercoaster-build-20260917/recovery/`. Saving and exporting update development only.

The first gallery ends in a clear downward entry to the round tunnel. Its 30 panel pairs sit beside the rail and stop before the drop; the lateral turn and bank develop inside the passage. Keep this entrance free of crossing panels when editing the first curve.

The former point-authored master in `source-assets/about-rollercoaster-reset/` is retained only for recovery. The active watcher reads the new surface master.
