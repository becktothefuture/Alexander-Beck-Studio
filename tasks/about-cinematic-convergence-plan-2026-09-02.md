# About cinematic convergence plan

Date: 2 September 2026
Status: planning only; no scene implementation is included in this planning turn
Audience: Alexander, Blender authoring, website integration, visual QA and review agents

## 1. Objective

Shape the About page into a clear personal film made from a small number of large, legible spatial chapters. Each chapter has one dominant visual idea, one narrative purpose and one clean transition. The browser follows the exact Blender camera rail at constant physical speed, while the typography remains readable across the full viewport and the final landscape resolves into a centred invitation. Primary geometry must occupy the viewport as a spatial world, rather than collecting at the sides around a black centre.

The page should feel expansive without being continuously busy. Atmosphere is punctuation. Negative space is allowed when it creates rhythm; accidental empty handoffs, overlapping tunnels, repeated walls and background material with no narrative purpose are not.

## 2. Current baseline to preserve before further work

The next implementation pass starts from the current local canonical baseline, not from a historical commit or a new world rebuild.

- Branch: `codex/about-cinematic-refinement`.
- Canonical Blender file: `source-assets/about-v2-blender-current/about-v2-track-working.blend`.
- Current Blender SHA-256: `50400236c113ecea9adf8725a2f36baae4b7f491441ab5bea84ad9cb4d692306`.
- Runtime bundle: `react-app/app/public/models/about-v2-edited-world/`.
- Camera: 1,001 deterministic samples over a 975.496 WU Blender rail.
- Scene source: 108 exported objects and 24,671 source triangles.
- Current ambient policy: no corridor behind the forms or round tunnel; no ambient veil behind the square gates or horizon banks; one 260-triangle terrain transition pocket and one 320-triangle finale transition pocket.
- Current visual evidence:
  - `output/playwright/about-narrative-contact-sheets/localized-clouds-desktop/`
  - `output/playwright/about-narrative-contact-sheets/localized-clouds-mobile/`
- Current structural evidence: the asset and focused Blender/runtime contracts pass for the current source SHA.
- Current visual failure: the localized-cloud captures contain almost empty frames around WU 16.257–17.350 and WU 26.500. The current viewport-occupancy report is failing, while the saved particle-continuity and gate-passage reports refer to older candidates. Structural green checks therefore do not approve this baseline.

The working tree contains connected About work and unrelated Home/footer changes. Future commits must use path-based staging and must not sweep unrelated files into the About release.

## 3. Direction selected from the critique trajectory

### Leading direction: authored chapters with cinematic continuity

Use one continuous camera journey through distinct spatial chapters. The camera path provides continuity; repeated ambient clouds do not. Every chapter is recognisable in a still frame and becomes more compelling through motion.

This direction explains the repeated requests for a deeper opening, recognisable geometry, a long curved round tunnel, the restored landscape, complete square-gate passage, an expansive ending and less visual confusion.

### Rival direction considered: one continuously populated point world

A persistent ambient field could prevent empty frames and make every transition seamless. It also caused the recent clutter, doubled-tunnel reading and undifferentiated background texture. The latest instruction explicitly removes constant particle presence, so this is no longer the primary direction. A local transition pocket may remain only when it improves a specific handoff.

### Decision rule

When continuity and clarity conflict, preserve camera continuity and simplify the material. Do not add another visual layer to conceal a weak transition.

## 4. Scene contract

| Chapter | Narrative purpose | Dominant Blender geometry | Supporting material | Must not happen |
| --- | --- | --- | --- | --- |
| 00 — Introduction | Meet Alex inside a deep, surprising world | Irregular opening depth field | Opening particles and fog | Flat wallpaper, shallow edge decoration or an immediate hard cut |
| 01 — Visual language | Show clear systems and forms | Recognisable triangle, square, diamond, pyramid, sphere and cube families | None unless a transition study proves it necessary | Arbitrary clumps, tiny edge islands or a corridor behind the forms |
| 02 — Curved passage | Create one memorable forward flight | One 28-hoop round tunnel on the editable camera curve | No rectangular corridor and no second tunnel family | Head-on concentric poster, doubled passage, unstable roll or skipped hoops |
| 03 — Landscape and proof | Open the journey into breadth and support biography/clients | Full-width floor and emerging terrain | One short 260-triangle entry pocket | Thin horizon strip, visible floor bounds or continuous cloud cover |
| 04 — Square-gate cathedral | Deliver the strongest precise spatial sequence | Sixteen ordered square gates | None | Ambient veil, doubled gates, camera missing an aperture or old gates reappearing later |
| 05 — Release | Let the enclosed sequence physically open | Two horizon/method banks that end visibly | None | Another tunnel, permanent side walls or an empty transition caused by late incoming geometry |
| 06 — Finale | Resolve scale, thinking and invitation | One overscanned connected landscape | One short 320-triangle entry pocket | Visible perimeter, small platform, residual gates, competing wall system or off-centre lockup |

The scene table is a structure, not a demand to preserve every current mesh. A mesh survives only if it makes its chapter clearer.

## 5. Non-negotiable system rules

1. **One dominant geometry family per chapter.** A transition may add one subordinate support field for a bounded distance. No chapter may contain two competing tunnels, two landscapes or a permanent atmosphere plus a complete primary world.
2. **Blender owns the physical journey.** Camera path, geometry placement, distances, roll, field of view and scene scale remain editable in the canonical `.blend` file. The website consumes the exported samples and does not recreate composition with CSS or runtime randomness.
3. **One motion law.** Equal rendered scroll distance produces equal physical camera distance. Text and camera use the same painted scroll state in the same frame. One global travel gain may be calibrated to make the journey feel faster, but no chapter gets an independent speed, easing, catch-up, brake, sway or scroll schedule.
4. **Readable full-viewport typography.** Titles and body fields may use the lower, middle and upper usable viewport. Preserve the current title scale and animation. The opening and final lockups remain vertically centred.
5. **Intentional negative space.** Particles do not need to be constantly visible. Empty space is acceptable for a short breath; it fails when it exposes an unplanned black/white interval, leaves active copy visually unsupported or lasts across consecutive narrative checkpoints.
6. **Passed geometry retires.** A completed scene cannot remain visible after the camera has entered a later chapter. Square gates and round hoops must not reappear near the finale or during reverse/forward loops.
7. **Responsive composition uses one source.** Desktop and mobile use the same Blender world and camera logic, with deterministic point-budget prefixes and responsive projection. Mobile must not collapse the world into side decoration.
8. **Visual evidence is the approval gate.** A passing build, export hash or frame-time report cannot approve the composition. Native-scale desktop/mobile frames and continuous motion evidence must be reviewed.
9. **The material belongs to the same site.** Resolved foreground particles use the Home simulation's matte, shaded sphere language and six-colour palette. Small far-depth points may use a simpler level of detail. Fog, scale and depth create atmosphere; per-frame sprite baking and uniform dot noise are prohibited.
10. **The world uses the viewport.** Each dominant scene deliberately occupies the centre, edges and depth bands appropriate to its beat. Side-only clusters, a dead central void and a final surface whose perimeter is visible are composition failures.

## 6. Dependency-aware rollout

### Phase 0 — Freeze and annotate the baseline

**Action**

- Record the Blender, camera, surfel and content hashes.
- Create one twelve-frame desktop strip and one twelve-frame mobile strip from the current runtime.
- Label each frame `keep`, `refine`, `replace` or `remove` and identify its chapter, visible geometry, copy state and transition owner.
- Record the current object inventory by chapter and flag duplicate or non-exported donor rigs separately.

**Checkpoint**

Alexander can point to the exact frames and objects that remain. No Blender mutation begins before this strip is reviewed.

### Phase 1 — Clean the Blender scene graph

**Dependency:** approved Phase 0 strip.

**Action**

- Organise exported geometry into seven named chapter collections plus guides/controls.
- Remove or permanently disable duplicated tunnel, corridor, veil and obsolete donor exports.
- Expose a compact control surface for chapter progress, scale, tunnel range/radius, gate range/roll, terrain position, finale position and camera roll.
- Add a Blender-side audit that reports more than one dominant geometry family in any chapter.

**Checkpoint**

The saved `.blend` file and a deterministic rerun of the authoring scripts produce the same object list, transforms and export hash.

### Phase 2 — Fix physical scene admission before adding atmosphere

**Dependency:** clean scene graph.

**Action**

- Start with the WU 16–18 void. Move only `square_gate_start_progress` earlier while camera, gate count, gate end, copy, clouds and all other geometry remain fixed.
- Capture desktop/mobile probes every 0.25 WU across the handoff plus a short forward/reverse film.
- If the void remains, test terrain, horizon-bank and finale admission timing one control at a time. Do not add particles during these timing experiments.
- Bring the landscape and finale surface into view before the previous meaningful scene fully retires, without allowing gates to leak into the ending.

**Learning signal**

If moving meaningful geometry earlier removes the empty interval, the problem is stage timing. If it does not, the plan may test one coherent far-depth field later. Isolated dust patches are not an acceptable substitute.

**Checkpoint**

The first gate becomes legible before the client/landscape field fully retires; at least three gates read ahead after admission; all sixteen apertures remain clear and ordered; the finale landscape arrives early without sharing a frame with residual gates.

### Phase 3 — Refine the single curved tunnel as a protected experiment

**Dependency:** corrected physical timing.

**Action**

- Work only on chapters 01–03: forms, round tunnel and landscape arrival.
- Produce three tunnel-path candidates by changing Blender controls only: restrained curve, stronger rollercoaster curve and wide cinematic curve.
- Keep tunnel length, global speed and all 28 hoops fixed so curvature is the comparison variable.
- Compare protected gate and finale camera samples before accepting an early rail edit.
- Test the forms and landscape handoffs without reintroducing a corridor, a second tunnel or a global ambient field.

**Learning signal**

A moving desktop/mobile strip must make the curve and camera following readable without unstable roll. If viewers still perceive a flat concentric poster, change the path and framing before touching later chapters.

**Checkpoint**

One path is selected; strong curvature is visible; the camera crosses all 28 hoops centrally in both directions; later protected camera samples remain unchanged within the agreed tolerance.

### Phase 4 — Simplify and separate the latter chapters

**Dependency:** selected early journey.

**Action**

- Keep the sixteen-gate passage as the precision event.
- Ensure the gate world ends before the release chapter becomes dominant.
- Test whether both horizon banks are needed; remove one or both if they repeat the tunnel/wall language.
- Bring the finale landscape into view early enough to support the closing titles without overlapping the gates.
- Retain only the localized finale transition pocket if it helps the landscape arrival in motion.

**Checkpoint**

Four consecutive frames across each handoff show a single readable outgoing world, a controlled transition, then a single readable incoming world. No frame contains residual gates plus finale walls plus ambient cloud.

### Phase 5 — Editorial and logo composition

**Dependency:** stable geometry and camera.

**Action**

- Freeze title size, entrance animation and full-viewport reading behaviour.
- Verify one coherent body measure for equivalent copy fields.
- Retain deterministic per-logo optical scales and offsets; compare visible artwork bounds rather than SVG boxes.
- Place the client grid over the broad landscape without using particle clumps as filler.
- Keep the final title, support copy and actions vertically centred as one lockup.

**Checkpoint**

All fifteen marks are recognisable and optically balanced at 320, 375, 390, 430 and desktop widths. Yoti does not dominate. No copy is confined to the top half or obscured by primary geometry.

### Phase 6 — Motion, lifecycle and performance

**Dependency:** locked composition.

**Action**

- Verify direct scroll/camera coupling in Chromium and WebKit, forward and reverse.
- Keep native touch momentum on coarse-pointer devices and use no competing touch transport.
- Compare a small set of global travel-gain values, select one brisk pace from complete-journey films and then keep that gain constant for every chapter.
- Cull passed chapters through existing bounded GPU visibility; do not add per-frame buffer rebuilds.
- Profile complete normal and fast journeys on desktop and emulated mobile, then validate once on a physical phone.

**Checkpoint**

No gate or hoop is skipped. Camera error remains within the existing deterministic tolerance. There is no stage collapse, input interception, frame hitch cluster or stationary scroll tail.

### Phase 7 — Final visual and simulated jury review

**Dependency:** all prior checkpoints.

**Evidence package**

- Continuous forward and reverse recordings on desktop and mobile.
- Native-scale contact sheets at the opening, forms, tunnel, landscape, logos, gates, release and finale.
- Focused tunnel, gate, transition and finale strips.
- Reduced-motion and WebGL-failure frames.
- Motion, viewport-occupation, gate-passage, accessibility, performance and build reports.

**Review panels**

- Visual design: composition, hierarchy, colour, depth and recognisability.
- Motion/film craft: pace, curvature, continuity, roll and release.
- UI/web design: reading, navigation, responsiveness, input and accessibility.
- Copywriting: narrative clarity, proportional emphasis and invitation.

This is a simulated Cannes-style assessment, not an actual Cannes Lions jury or an award guarantee.

**Completion condition**

The exact candidate source/export pair passes every technical gate and the complete browser journey is explicitly accepted from the final evidence. Until then, the page remains a development candidate.

## 7. Agent rollout after plan approval

Use a shallow team with non-overlapping ownership.

1. **Blender scene worker** — chapters, controls, curve, geometry and deterministic source save.
2. **Export/runtime worker** — deterministic export, source-hash contract, lifecycle and culling; no visual redesign.
3. **Editorial worker** — copy measures, logo optics and lockup composition; no Blender geometry.
4. **Motion QA worker** — scroll/camera coupling, tunnel and gate passage, reverse travel and performance.
5. **Visual QA worker** — desktop/mobile capture, contact sheets and chapter-by-chapter findings.
6. **Independent reviewer** — read-only review of the integrated diff and final evidence.

The orchestrator integrates one phase at a time. No worker starts a dependent phase before the prior checkpoint is accepted.

## 8. First action after approval

Create the twelve-frame annotated baseline strip from the current runtime. This is the smallest reversible step that determines what survives before more Blender work. It will answer the remaining question: which current later chapter is worth refining, and which should be removed rather than polished.

No geometry, camera, copy, logo or runtime change should be made before that review.
