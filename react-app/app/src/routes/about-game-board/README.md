# About game board development route

This directory owns the local About experience at `http://localhost:8012/about.html`.
The reviewed [Figma frame](https://www.figma.com/design/5WbJdwCYLbs3HBqhJopRet?node-id=2-2)
is the visible geometry source. Reviewed captures live under
`docs/plans/about-game-board-20260921/figma-geometry/`. Run
`node scripts/sync-about-game-board-geometry.mjs` after a new capture is
approved. Never hand-edit generated files in `public/models/about-game-board/`.
The [editable modular reference](https://www.figma.com/design/5WbJdwCYLbs3HBqhJopRet?node-id=81-2)
has seven full-width architecture masters. Desktop uses them at 1412 px;
mobile uses the same masters scaled to 370 px. The funnel and valve share one
master, as do both compartment drums and their connecting canal. Text, logos
and the captured ball piles remain separate responsive layers. This is the
Figma handoff structure; the live renderer still owns its responsive physics.

The local route remains behind the existing production launch boundary. The
main physics path is still being profiled, so passing a focused check does not
make this scene production-ready and does not authorize a publish.

## Experience contract

**Architecture** means every visible machine fixture inside the About window,
excluding balls, text, controls and the Studio shell.

- Architecture uses exactly three monochrome roles in each theme: fixture,
  wall and action. Canonical values live in `public/config/design-system.json`;
  `boardArchitecturePalette.js` resolves them and `about-game-board.css` maps
  them into the scene. Visible strokes and matching collision rails use the
  shared one-third line scale in `boardArchitectureWeight.js`; drum centres,
  pinball rims and empty socket lips follow that scale. Ball colours remain
  under the shared Canvas palette.
- The first screen reserves 70% for the opening copy and reveals the supported
  reservoir surface in the lower 30%. The visible reservoir is the funnel;
  side bounds remain physical but are not drawn. Its finite inventory uses half
  of the former chamber capacity at the shared Home ball size, so the resting
  pile is about half as tall. Balls begin supported in the funnel.
- The opening and final “Let’s talk” titles use Instrument Serif. All narrative
  copy, discipline headings, descriptions and instructions share one Geist
  reading size. At viewport widths up to 640 px, the title and reading sizes
  use `--about-board-mobile-type-scale: .8`. Shared navigation and action
  controls retain their normal text and touch sizes. Measures stay within
  32 characters. Mobile copy uses wider gutters beside the drums; the pinball
  sling tips and lower bumper row leave a larger central reading pocket.
  Visible slings and collisions use the same rounded vertices. Selected-client
  logos use the canonical assets in four columns with extra mobile row spacing.
- Both automatic wheels have six open compartments. Radial paddles carry
  several loose balls per compartment around a smaller central hub. Each
  rotor uses 13 convex collision parts instead of the old 272-triangle ring.
  Its rounded tips, casing clearance and inlet/outlet follow the Home radius.
- The transfer between the drums is one smooth, constant-width downhill canal,
  wide enough for at least two balls together. Its inner bends cannot fold
  over themselves; drawing and colliders consume the same sampled walls.
  The later pinball bank contains five symmetric high-rebound bumpers.
- A filled grid cell owns one ball. Its socket disappears while occupied, and
  the 2D socket shadow fades as the 3D seam takes over.
- The socket grid continues into one curved band and refines into the retained
  Blender tunnel in the same Three.js world and camera. The contact passage
  clears through organic movement and shrink, rather than a detached scene cut.
- The final centred action group contains email, LinkedIn and Download CV. The
  CV action reuses the Work invite grant and CV-specific gate copy. This is a
  client-side invitation boundary only: the public PDF remains retrievable by
  its direct static URL.

`contents-about.json` remains the content source for the selected-client logo
module and contact details. `boardCopy.js` owns the shorter scene beats.

## Runtime ownership

| File | Responsibility |
| --- | --- |
| `boardScene.js` | Board coordinates, source path IDs and colour-role mapping. |
| `boardLayout.js` | One responsive board coordinate map and reservoir origin. |
| `boardInventory.js` | Finite reservoir population at the shared ball radius; no downstream spawning. |
| `boardReservoirPacking.js` | Supported initial positions against real fixtures and neighbours. |
| `boardGeometry.js` | SVG-to-world geometry for colliding architecture. |
| `boardArchitectureWeight.js` | Shared fine-line ratio applied before art and colliders are built. |
| `boardArtwork.js` | Bounded SVG artwork, cached poses and viewport rendering. |
| `boardBallPresentation.js` | Shared Home/About ball-radius conversion. |
| `boardRigidBodyWorld.js` | Active Rapier integration, exact-circle CCD and contact-volume guard. |
| `boardPhysics.js` | Scene orchestration plus Matter authoring and render-facing proxies. |
| `boardCircleContacts.js` | Allocation-bounded circle/circle position guard. |
| `boardCircleFixtureContacts.js` | Circle/fixture boundary resolution for the same guard. |
| `boardDrums.js` | Six-compartment wheel art, rounded paddles and batch ports. |
| `boardTransferCanal.js` | Shared art/collider samples for the smooth drum canal. |
| `boardHandoffs.js` | Reservoir, valves, pipelines, seesaw, leaves and five bumpers. |
| `boardMaterials.js` | Default, high and zero-rebound fixture roles. |
| `boardRenderer.js` | Bounded Canvas strip inside the native scroll world, with the shared material atlas. |
| `boardViewportWindow.js` | Pure strip placement and overscan bounds; at most three viewport heights. |
| `boardSceneLifecycle.js` | Scene preparation/release margins, reverse prewarming and frame pacing. |
| `boardTextSafety.js` | Painted-shape and semantic keep-out checks for editorial slots. |
| `boardTextPresentation.js` | Global lower-viewport line-draw sampling. |
| `boardTextDrawing.js` | Measured line masks that follow scroll and responsive wrapping. |
| `boardGrid.js` | Stable socket identity and occupancy record. |
| `boardGridHandoffScene.js` | 2D-grid replacement and organic contact clearing. |
| `boardBandJourney.js` | Continuous curved band, camera path and Blender-tunnel join. |
| `boardAuthoredEnding.js` | Scroll-owned retained tunnel and final-wall adapter. |
| `AboutGameBoardExperience.jsx` | Route lifecycle, scroll, input and renderer ownership. |
| `about-game-board.css` | Responsive composition, three type roles and themed materials. |

## Physical contract

Rapier 2D is the motion source of truth. Its fixed integration step is 1/60 s
under world gravity of `9.81 m/s²`. The target is 60 steps per wall-clock second;
the performance report also measures actual simulated time because overloaded
frames currently slow dense desktop release. Dynamic balls use native exact-circle
colliders with continuous collision detection. Drawn and collision radii are identical,
and one shared responsive radius feeds Canvas, fixtures, sockets and Three.js.

Matter remains useful for source-derived fixture authoring, mechanism state,
events and render-facing body proxies. It does not integrate the active balls.
Do not reintroduce a second Matter simulation, derive motion from scroll, or
freeze reservoir rows to obtain a composed first frame.

The circle-boundary guard preserves hard ball volume where dense contacts and
moving fixtures need an extra positional safeguard. It runs after integration
for the whole active circle set and before the native solve when scroll-owned
valves sweep through sampled poses. It resolves position without velocity
kicks, so a neighbouring ball cannot push another through a rail and a valve
cannot create a synthetic launch. Approaching normal motion is damped without
adding energy; a moving support uses the balls' real masses. Rapier still owns
the material response and continuous motion.

Initial reservoir positions are packed against real architecture and already
supported neighbours. The support chain is validated before display. A ball
whose support disappears returns to normal dynamic motion; there are no pinned
or frozen rows. Sleeping is physical rest only. There is no feeder. Mechanisms
must not use timed nudges or nonphysical steering to clear a queue. Each initial
identity has exactly one owner: live, capturing, captured or retired. The
initially occupied socket uses a real identity from this same population.

`boardMaterials.js` exposes three fixture responses: `default`, `high` and
non-elastic `zero`. Ball mass, restitution and friction remain configurable
through the canonical material controls. Gravity is always the Earth baseline
and is not a design control.

The SVG is artwork, not a collision oracle. Only selected rails collide.
Mechanisms use explicit matching art and collision geometry, and hidden source
drawings must not leave phantom colliders behind. Apertures, seats and gaps are
derived from the current ball radius; do not fix a narrow passage by shrinking
only a ball or its collider.

## Scroll and scene lifetime

Architecture and balls belong to the same native scrolling world. The Canvas
retains an overscanned strip, rebased only near its edges or after a large jump.
Changing the scroll position never depends on finishing a physics step.

Ball pixels carry a revision from `boardPhysics.getBodies()`. A physical step,
capture update or palette change invalidates them; automatic SVG mechanisms
can keep moving without repainting a genuinely resting pile. The renderer also
invalidates on material/theme, backing-store/DPR, buffered-strip, radius and
socket-state changes. New code that mutates a rendered ball must advance that
revision. `paintCount` counts actual Canvas paints; `reusedPaintCount` counts
valid bitmap reuse. `renderedScrollTop` acknowledges both forms of presentation
because native scrolling moves the cached pixels with the architecture.

The native adapter reuses membership sets only while every input reference is
unchanged, including equal-length replacements. Its small moving-fixture list
avoids scanning the whole reservoir for each valve sample. The circle guard
retains the same passes and contact correction order: it may reuse its spatial
grid within one solve only while cell membership and bottom-to-top order match
a fresh build. It always starts a new grid after the next native step.

The full machine remains active through the visible 2D journey. Once the opaque
3D stage covers it, native bodies/colliders are freed, physics time stops and the
2D bitmap shrinks to 1 × 1. Matter authoring/render proxies and a compact typed
checkpoint remain; shared WASM heap pages are not guaranteed to shrink.

Three.js prepares within three viewports and retires beyond four viewports on
return. Its Canvas loading fallback is disposed after the authored scene paints.
Reverse travel rebuilds physics one viewport before exposure and retains it
across small seam reversals. This prewarm does not simulate an invisible machine.
An abrupt jump can still incur synchronous rebuild time. Responsive width
changes retain the existing full-world reconstruction behaviour.

## Editorial and responsive safeguards

Text belongs in purposeful openings in the architecture. `boardTextSafety.js`
checks rendered line boxes against painted SVG geometry after fonts load,
responsive resize and text mutation. Art Direction sits to the left of the
large drum; Motion & 3D sits to the right of the small drum. At enlarged text or
when a safe slot cannot hold the copy, the route uses its accessible normal-flow
reader before the board.

All scroll text uses the same globally configurable faint-to-focus-to-faint
contrast sampler. The progress track remains on the left and the opening arrow
stays separate at the lower right. The Studio utility rail and Button Bar stay
outside this route's ownership.

Temporary zero-width measurements during route removal retain the last real
board scale. Reduced Motion keeps gravity and uses stable handoff checkpoints.
If WebGL or retained assets fail, the stable-height fallback must leave the
contact content reachable.

## Verification

Run focused checks from the repository root:

```bash
npm run check:about-game-board
npm run lint --prefix react-app/app
ABS_BROWSER=chromium node scripts/audit-about-scroll-motion.mjs
ABS_BROWSER=webkit node scripts/audit-about-scroll-motion.mjs
node scripts/capture-about-scene-map.mjs
node scripts/audit-about-performance.mjs
node scripts/audit-about-render-cache.mjs
node scripts/audit-about-scene-lifecycle.mjs
```

Use `window.__ABS_ABOUT_GAME_BOARD__.getStats()` in development to inspect
inventory, gravity, contacts, grid occupancy, handoff projection and frame
timings. Inspect the route at desktop, phone and short-landscape sizes in both
themes. Record the exact checks and screenshots that pass. Performance profiling
of the full physical inventory remains open; do not report full test coverage,
frame-rate certification or production readiness until that work is complete.
See the source-attributed investigation in
[`docs/qa/about-performance-20260925.md`](../../../../../docs/qa/about-performance-20260925.md).
The follow-up cache changes, measured gains and remaining desktop limit are in
[`docs/qa/about-performance-followup-20260925.md`](../../../../../docs/qa/about-performance-followup-20260925.md).

Stable scene names and capture labels are defined in
[`docs/reference/ABOUT-SCENE-MAP.md`](../../../../../docs/reference/ABOUT-SCENE-MAP.md).
