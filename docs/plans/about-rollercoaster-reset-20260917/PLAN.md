# About — a new Blender-authored rollercoaster

17 September 2026 · **Implemented development candidate; visual acceptance pending**

This replaces the V05 visual direction. [Status quo and reset inventory](STATUS-QUO.md) records what exists, why it fails and what survives. The user brief is the authority: longer forward-facing travel through interesting, animated circle environments; a readable centre; all titles centred; a huge animated multicolour grid wall at the end.

## 1. Outcome and boundaries

For prospective collaborators, the page must combine a memorable spatial journey with a complete, readable account of Alexander's practice. Contact and persistent navigation remain available without finishing the ride.

One saved Blender scene owns the real environment, editable camera rail, zones, choreography and supported moving parts. The browser plays its exported data. Website copy and typography keep their existing canonical owners. Home owns the gradient-circle appearance and current colour palette.

We will not inherit the previous camera, geometry, scene boundaries, reading gaze offsets, overlook, numeric circle scale or 210-unit length. Shared code is retained only where it serves this new contract. About already consumes Home's gradient atlas: retain that integration and prove its visible scale. No new colour scheme, separate About material, faux camera shake, opaque text plate or publication change is part of the work.

## 2. The experience to author

The values below are **first-greybox targets**, not verified defaults. A 180-second reference playback makes reviews comparable; real visitors still control speed with scroll. Baseline desktop scroll length starts at 32 viewport heights, up from approximately 18; measured copy can extend it. Neither a larger number of world units nor more empty scrolling counts as success.

| Progress target | Beat | Geometry and motion | Editorial role |
| --- | --- | --- | --- |
| 0–4% | Departure | Look forward into a deep, recognisable passage. Nearby shaded circles establish scale. | Opening title precisely centred. Support follows as a distinct reading phase. |
| 4–16% | Reading gallery A | Broad continuous chamber; moving ribs at the sides and above; tunnel entrance ahead. | Background and complete career. Empty central reading channel. |
| 16–20% | Curiosity statement | Entrance grows as the camera remains forward-facing. | “I follow the idea.” centred; no prose beneath an active title. |
| 20–40% | Long tunnel A | Continuous round enclosure: descending spiral, broad bank, low underpass, then an ascending exit. Rotating nested gates belong to the same space. | No prose. Roughly 36 seconds in the reference playback. |
| 40–44% | Release | Tunnel visibly opens into a larger chamber. | “Across disciplines.” centred. |
| 44–59% | Reading gallery B | Geometric canopy with oscillating peripheral assemblies and a clear centre. | Disciplines and client marks. |
| 59–64% | Statements | Continue forward through a quieter straight chamber. | Intermediate titles alternate at the same central anchor, never simultaneously. |
| 64–72% | Reading gallery C | Sheltered central corridor; next entrance remains ahead. | Complete method prose; anticipation at the periphery. |
| 72–90% | Long tunnel B / peak | Square-to-diamond enclosure: climb, compress, bank over a crest, descend into an opposing turn, then release. One dominant crest/turn around 84–87%. | No prose. Roughly 32 seconds in the reference playback. |
| 90–97% | Final straight | Camera levels and flies directly at one enormous multicolour grid wall, visible first in the distance. The grid grows through approach, not scaling. | No prose during approach. The ending can begin once the camera has settled. |
| 97–100% | End / lasting image | Camera stops safely in front of the wall. Slow waves continue through its circles. | Final title exactly centred; support and contact actions below. Unlimited dwell. |

The final section may ease physical distance to a hold through an authored monotone progress curve. It must remain reversible. There is no autonomous camera movement after scroll stops.

### Peak–end application

Build anticipation, deliver a clear strongest spatial event late in tunnel B, then resolve into the immense, calmer animated wall. The end must remain enjoyable for a long hold; it must not collapse into a static empty screen or an extra weak scene.

This is a design application of the peak–end principle, not a prediction of portfolio conversion. The original experiment concerns remembered aversive experiences: [Kahneman et al., 1993, original paper abstract](https://www.psychologicalscience.org/journals/psychological-science/j.1467-9280.1993.tb00589.x/). We use the structure as a creative hypothesis and verify the actual experience with Alexander.

## 3. Camera rules

1. One editable `FlightRail` drives `FlightCamera` in Blender. A live constraint/driver setup evaluates it; no disconnected guide curve. Export samples the evaluated camera, never a second independently authored path.
2. Aim follows the local forward tangent with a short bounded look-ahead. Stable transported up vectors and an authored bank curve prevent twist flips. No world-centre target, backwards gaze or upward copy-clearance offset.
3. Camera-forward versus rail-tangent deviation must stay within 8° during travel and 3° throughout the final straight; reading defaults to within 5°. Bank is independent of forward direction. Endpoints use one-sided tangents.
4. Banking follows turns. Initial exploration: reading 0–2°, tunnel A up to 20°, dominant peak up to 30°. No full inversion. These are authoring limits to review, not reasons to force a bank into every turn.
5. The two long passages must each contain at least four distinct spatial events and extend at least 10 local clear tunnel widths, with continuous enclosing structure visible for at least 75% of their reference duration. Target 15–20 widths if it improves the ride.
6. Judge longevity at comparable travel speed relative to tunnel width, with meaningful near/mid/far optic flow. Slowing an empty corridor or repeating identical rings fails.
7. Keep the lens stable during travel. Mobile is framed from the same rail with the existing responsive lens approach; validate the actual fit. No runtime camera offsets to patch copy or title layout.
8. Approaching a bend may obscure the ultimate exit, but nearby walls and the next opening must still explain where the camera is going. A blank fog centre or a wall covering the whole view fails.

## 4. Titles and prose: two explicit compositions

### Every title

- Centre the **rendered title glyph block**, not a combined title/description/button wrapper, at `(50%, 50%)` of the inner studio viewport. The outside Button Bar does not enter this calculation.
- This applies to opening, all intermediate titles and the end. The centre stays fixed throughout visibility, including entrance/exit. Colour and opacity can animate; the title does not translate, zoom or bank.
- Long/multiline titles wrap symmetrically around the same centre. Existing headline typography remains authoritative. Description and actions occupy a separate area below the title.
- Titles may overlay visually busy scenery, as requested, provided their strokes remain legible. Prose never moves behind a visible title.
- Verify the title block centre to within 2 CSS px at every sampled visible frame. Screenshots must also confirm optical centring; a correct wrapper alone is insufficient.

### Prose

- Use a centred semantic DOM column. “White space” means genuinely quiet space in the current theme, not a white rectangle.
- Feed measured website line boxes to Blender as review guides for desktop, portrait and enlarged text. Reserve the complete paragraph footprint from its first entering line to its last exiting line, plus a 24 CSS px projected clearance margin as an initial target.
- Initial guide widths: 56% of inner desktop viewport and 86% in portrait, expanded if the actual text demands it. These are source-composition guides, not a clipping mask.
- Carve broad physical reading chambers and keep active assemblies beside, above and below that footprint. Do not hide individual points, fade a chapter, tilt the camera or move the text aside to fake clearance.
- Check all ambient phases as well as all scroll positions. Animated ribs must never sweep through the protected reading volume or camera clearance envelope.
- Real copy fit can extend a reading interval. Do not shorten content or compress the two travel passages to compensate. Recompute normalised progress boundaries from the measured per-beat budgets; preserve the authored order and physical endpoints.

## 5. Circle material and palette

The appearance target is Home's actual camera-facing gradient circles, not tiny flat dots and not mesh-normal lighting that turns away from the viewer.

- Reuse the Home material generator/atlas and shared lighting configuration in the browser. Blender previews use textures generated from that same material and a palette snapshot with a recorded revision/hash.
- Billboard orientation follows the active preview camera in Blender and the actual camera in the browser, independent of the source surface normal. Geometry can move while its circle faces remain camera-facing.
- Build a proof strip first: the Home reference and About candidate at 8, 16, 32 and 64 px in both themes. Inspect gradient, rim softness, highlight position and colour. Small far circles can lose detail; important near surfaces must visibly retain it.
- Palette indices refer only to the active website palette. Do not author new hex colours per zone. At least three palette colours remain visibly present at the ending; use the full non-neutral palette when available. Light-mode contrast must be reviewed rather than solved by inventing colours.
- One radius/spacing policy and one global nested quality policy apply to all regions. Explicit regular row/column sampling is permitted for the grid; it must retain the same circle material, scale policy and stable IDs. No chapter-specific radius compensation or density fade.
- Point counts are performance outputs, not an aesthetic acceptance target. Final radius, density and budgets are established by the proof, not inherited from V05.

## 6. Blender world and parameter ownership

Fresh source: `source-assets/about-rollercoaster-reset/about-rollercoaster.blend`.

Fresh generated bundle: `react-app/app/public/models/about-rollercoaster-world/`, with a new versioned scene contract. The candidate adapter must load that exact source identity. Missing/invalid new assets show the existing accessible loading/error treatment; they must never silently fall back to V05. Production stays behind its existing gate. Reuse the existing development About entry for integration rather than inventing a new public route.

Suggested collections: `Controls`, `Flight`, `ReadingZones`, `TunnelA`, `Gallery`, `TunnelB`, `FinalGrid`, `PreviewGuides`. Persistent base architecture and independently animated assemblies may be separate objects; no forced merge into one static mesh.

### One durable control definition

The new scene schema defines labels, units, allowed ranges and export bindings once. A Blender sidebar edits scene-owned values. The browser inspector displays them read-only with source identity; do not introduce a second writable geometry/timing source. Existing browser controls remain editable for their existing website-owned copy/type fields. Source changes save, export and refresh the preview atomically. [Parameter ownership evidence](PARAMETER-OWNERSHIP.md) maps the current control, save and build paths. Keep the current fixed docked panel shell; no detached panel is required.

| Group | Primary controls | Owner and behaviour |
| --- | --- | --- |
| Journey | Reference playback seconds; per-beat scroll budget; reading allowance; arrival hold | Blender owns choreography; measured copy may increase reading budgets only. Camera speed is derived from the exported mapping. |
| Flight | Editable rail; look-ahead; bank curve/limit; lens | Blender. Path edits move the live camera immediately. No separate yaw/pitch patch knobs. |
| Reading zones | Clearance width/height/margin; calm interval bounds | Blender owns the spatial volume; website provides measured text fixtures. Title position is fixed by design, not adjustable. |
| Environment | Tunnel length/width; bend/crest shapes; gate spacing/type | Blender. Direct modelling remains available; expose recurring high-value Geometry Nodes inputs. |
| Motion | Motion type; axis/pivot; amplitude; period; phase; scroll or ambient binding | Blender custom properties/animation. Unsupported motion fails export explicitly. |
| Final grid | Width/height; spacing; depth-wave amplitude; wave period; phase pattern; stopping distance | Blender. Rows/columns and quality subsets are derived. Same circle policy; no independent material. |
| Appearance | Global circle radius/spacing; material reference; palette roles | Blender spatial scale; Home owns gradient and colours. No About-only palette editor. |

For each exposed control the implementation must record current baseline, proposed default, safe range/options, live effect, save location and reload proof. The new scene has no established baseline yet; numerical UI ranges must be validated during the greybox, not invented in advance. Start with numeric inputs for uncertain geometry ranges.

Manual polish: landmark placement, curve handles and gate silhouettes. Fixed by design: centred titles, stable IDs, publication gate, panel shell geometry, supported animation algebra and protection checks. Generated data: camera samples, quality subsets, row counts, derived CSS variables and normalised stage boundaries.

Round trip: **Blender live preview → save → export → browser → reload → build preview**. Website-owned controls separately retain **live apply → canonical save → reload → flatten/build → preview**. A control is incomplete if either applicable loop fails.

## 7. Authored animation, two explicit clocks

`progress` selects the position along the journey. `ambientSeconds` drives independent looping motion. Runtime state must be a deterministic function of these values and the saved scene data, not accumulated frame-by-frame transforms.

```text
native scroll + measured beat budgets → progress → authored distance map → camera pose
                                            └→ scroll-bound object motion
pause-aware ambientSeconds ───────────────────→ looping object/wall motion
Blender source + Home material/palette ─────────→ one validated export bundle
```

- First supported motions: existing continuous and bounded axis rotations for gates/ribs, plus an analytic depth wave for the final grid. The same equations and saved parameters must drive Blender's evaluated preview and browser transforms. Define the grid's local U/V plane and displacement normal explicitly; do not assume a horizontal terrain basis fits a vertical wall.
- Existing axis-rotation/wave code is reusable only after absolute-time evaluation and parity tests. Do not copy the old helper whose Blender and runtime motions differ. Sample evaluated Blender points/transforms at matching progress and time; require positional error below 0.001 local clear tunnel widths and a maximum 1 CSS px projected difference at the reference views.
- Export object pivots, stable group/point IDs, loop duration, interpolation, phase, conservative animated bounds, palette roles and clock binding. Respect the existing GPU group capacities or explicitly prove a new bounded capacity. Baked rigid transform tracks are a later extension only if an accepted motion needs them; reject arbitrary topology-changing simulations and unsupported node behaviours in this first version.
- Blender review mode exposes progress and ambient phase separately. A reference-play mode advances both at the reference rate. Scrub either clock in either direction and reproduce the same state. No animation resets when entering a zone.
- Holding normal scroll holds the camera while the environment continues. Reversing scroll retraces camera and scroll-bound geometry; ambient loops continue unless their clock is deliberately scrubbed. Test these independently.
- A clearly labelled reduced-motion control switches to stable authored checkpoints and freezes ambient movement. OS Reduced Motion uses the same policy. Keep the semantic story and contact controls accessible. No misleading Pause label that affects an invisible clock only.
- Hidden-page time is suspended; resuming must not jump animation phase. Loop endpoints must match in position and velocity. Animated bounds govern visibility and collision checks, not just the rest pose.

## 8. The enormous animated ending

One real grid wall is placed normal to the final straight. It appears in the distance before the camera reaches it and grows by perspective. It is not spawned, scaled into view or replaced by a screen overlay.

At rest, its width and height exceed the camera frustum by at least 25% in both tested orientations, including full wave bounds. Stop safely in front; do not fly through the wall. Distribute active palette colours in a deliberate multicolour field. Slow depth waves and phase offsets animate its cells without flicker or point births.

The title stays at the viewport centre. The grid remains a grid behind it: **do not cut an enormous central hole by default**. Author a calm central bay with lower displacement and suitable palette/spacing composition; let the stronger movement live around it. Maintain the shared density/material policy. The short support line and contact actions need their own quiet projected footprint below. If this does not remain legible in both themes, revise the source composition before proceeding; do not move the title up or add a text plate.

The last pose holds indefinitely while ambient waves continue. This lasting image is the end of the experience.

## 9. Dependency-aware execution

| ID | Assignment / file ownership | Depends on | Completion evidence |
| --- | --- | --- | --- |
| R0 | Root: status quo, recovery snapshot, rejected-status guidance, this plan | None | Source audit and recoverable snapshot verified. Done in this planning pass. |
| R1 | Root: explicit per-file retain/replace/delete list; new source identity and minimal candidate adapter | R0; live Blender available | Clean scene opens; no inherited V05 camera/geometry. Old files remain quarantined until their imports are replaced. |
| R2 | Material worker: Home atlas reuse and Blender material preview; only material adapter/export files | R1 | Side-by-side material strip, current palette identity, camera-facing proof in Blender/browser. |
| R3 | Blender worker: ONE long tunnel + adjacent reading gallery + live rail; owns new `.blend` and new authoring helpers | R1 | Film includes the complete selected tunnel at its reference duration (approximately 36 seconds for A), plus the complete title/prose lifecycle, reverse and holds. No arbitrary whole-film duration cap or skyward compensation. |
| R4 | Runtime worker: animation data adapter/schema; owns new contract/runtime animation module, not Blender source | R1; integrate R2/R3 data | Same IDs and positions/transforms at identical progress/ambient phases in Blender/browser. |
| R4E | Editorial worker: minimal centre-anchor and measured-reading adapter for the first proof; owns title/layout integration, not scene or animation modules | R1; coordinate R3 gallery bounds | One actual complete passage and title exercise the final proposed layout contract; no temporary fake copy or special proof-only positioning. |
| G1 | Root + independent reviewer + Alexander: evaluate the proof | R2, R3, R4, R4E | Accept actual enclosure, material, duration, forward aim and text clearance. A numerical pass cannot substitute. Reject/rework the slice before expanding. |
| R5 | Blender worker: full journey and huge grid wall; owns source only | G1 | Two distinct sustained passages, single strongest peak, meaningful straight approach and animated ending. |
| R6 | Editorial worker: extend the proven R4E adapter to all measured beat budgets and title stages; owns title/layout/timeline integration | G1; coordinated source zones | All existing prose preserved; every title centred; reflow and mobile fit; no geometry masks. |
| R7 | Root: integrate; remove obsolete V05-only files/branches from exact disposition list; update guidance | R5, R6 | Reference audit, matching source/bundle, no rejected fallback path, recovery archive still verifiable. |
| R8 | Verification worker: serial browser matrix; read-only reviewer: final diff and films | R7 | All gates below, then user visual acceptance. No deployment in this scope. |

Workers do not spawn further agents. No overlapping writes to the `.blend`, exporter or timeline. Root integrates each wave. R2/R3/R4/R4E can run independently after their schema boundary is agreed; R2 prepares material resources while R3 alone owns `.blend` writes. R5/R6 coordinate region IDs but own separate files.

### Deletion policy for the requested reset

Delete the rejected design's active source and generated assets as part of R7 after the replacement loads, not by wiping the dirty repository now. The recovery archive is the only required preserved copy of obsolete implementation files. Historical evidence/licences can remain archived. Every removal names a concrete path and checks remaining imports/scripts/docs. Do not delete approved prose, Home materials, shell/navigation, unrelated work or tests that enforce still-valid guarantees. R1 must classify the 133 recovery entries; membership in the archive never authorises deletion by itself.

## 10. Acceptance gates

### A. First proof — before the whole journey

- A recognisable enclosed tunnel with at least four events, forward-facing aim and useful near/mid/far depth.
- Actual Home gradient circles in both browser and Blender; current palette only.
- One complete reading passage, including entry and exit, clear throughout all animation phases.
- A title that remains centred throughout its lifecycle.
- Moving environment parts that visibly agree between Blender and browser at common clock values.
- Review one continuous film, not selected stills. This gate is deliberately early to avoid another full rejected build.

### B. Full route

- Reference recording around 180 seconds plus ordinary native scrolling at slow/fast/reverse speeds. Publish actual per-passage duration, widths traversed and spatial-event count.
- Title centre, forward tangent, conservative animated clearance, monotone distance mapping, loop continuity, stable IDs and complete content checks.
- Inspect complete forward/hold/reverse films at desktop and portrait in light/dark; sample at least five ambient phases per region and a complete grid loop at the finale.
- Chromium then WebKit, serially. Include 1440×1000, 390×844, narrow reflow/enlarged type, keyboard, OS/user reduced motion, reload/back/forward and the existing landscape cover. Physical phone review remains separately labelled.
- Target sustained 60 FPS on the reference desktop; report actual frame-time distribution and mobile limits. Bound allocations and GPU buffers. If quality reduction is necessary, apply one global tier with stable sample identity.
- Check active palette changes, theme transitions and persistent black shell. Contact actions must remain reachable without completing travel.

Implementation commands (run only after new schemas/checks are integrated):

```bash
npm run check:about-narrative
npm run studio:check
npm run build:about-certification
```

Adapt relevant existing About motion/editorial/restoration audits to the new schema; do not silently retain assertions for static geometry or constant distance-per-scroll. Add targeted animation-parity and forward-tangent checks. No separate typecheck command is currently defined.

## 11. Exit criteria and current limits

The new scene and full development page are implemented. [The implementation record](IMPLEMENTATION.md) separates completed checks from unverified acceptance items. The final result still requires Alexander's visual acceptance.

The saved Blender scene was authored and checked in an isolated background process because no live instance was claimable. Rejected source/runtime files were retired after verified recovery archives and replacement checks. The full site gate passes. Complete film/browser/performance acceptance remains open as recorded in IMPLEMENTATION.md. No production change, commit or push was performed.
