# About game board

This directory owns the About experience at `/about.html`.
The [current About Figma page](https://www.figma.com/design/5WbJdwCYLbs3HBqhJopRet?node-id=228-2)
is the design reference. See the repository’s About Figma component map for the
adopted module IDs. The existing SVG and ball snapshot remain generated from the
reviewed captures under docs/plans/about-game-board-20260921/figma-geometry/.
Runtime geometry supplies the revised fixtures and combined assembly.

## Experience contract

- The opening uses the shared title role, a grey surface and a settled finite
  ball inventory at the shared Home size. The phone reference adds a band of
  page surface above the introduction. The centred title group starts lower
  in both layouts and the settled pile begins at the foot of the introduction.
- The filled reservoir, mirrored garden exit, ten pinball bumpers, combined
  assembly, and six tapered ramps share their visible and physical geometry.
  Both valves follow scroll and reverse. The automatic wheels have six and
  four paddles. The receiver grades toward the outlet, and the feed throat
  grows for the larger ball radius.
- Reading intervals use the shared grid and measure their content. The ending
  pairs a central chute and clear drop with a flat grey ledge. The portrait
  builds upward from the ledge as the original balls arrive. Phone visitors
  can pan the portrait. The invitation offers Contact Me, Download CV and
  LinkedIn. The CV action uses the existing invite gate.
- The production build serves the full journey. Authoring tools and diagnostics
  are available locally.

The editorial copy comes from contents-about.json and boardCopy.js. Geometry
adoption stays local to this route.

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
| `boardDrums.js` | Filled assembly artwork, wall bodies and moving wheel carriers. |
| `boardAssemblyGeometry.js` | Shared valve, receiver, wheel and channel geometry. |
| `boardHandoffs.js` | Filled reservoir, valve and supporting fixture artwork. |
| `boardMaterials.js` | Default, high and zero-rebound fixture roles. |
| `boardRenderer.js` | Bounded Canvas strip inside the native scroll world, with the shared material atlas. |
| `boardViewportWindow.js` | Pure strip placement and overscan bounds; at most three viewport heights. |
| `boardSceneLifecycle.js` | Scene preparation/release margins, reverse prewarming and frame pacing. |
| `boardTextSafety.js` | Painted-shape and semantic keep-out checks for editorial slots. |
| `boardPortraitMap.js` | Portrait targets and original pigment totals. |
| `boardPortraitCapture.js` | Physical outlet transfer and bounded placement. |
| `boardPortraitRenderer.js` | Cached 2D portrait rendering and viewport pan. |
| `AboutGameBoardExperience.jsx` | Route lifecycle, scroll, input and renderer ownership. |
| `about-game-board.css` | Responsive composition, three type roles and themed materials. |

## Physical contract

Rapier 2D is the motion source of truth. Its fixed integration step is 1/60 s
under world gravity of `9.81 m/s²`. The target is 60 steps per wall-clock second;
the performance report also measures actual simulated time because overloaded
frames currently slow dense desktop release. Dynamic balls use native exact-circle
colliders with continuous collision detection. The active machine and portrait
use the same ball radius for paint and collision.

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
or frozen rows. Sleeping is physical rest only. The machine uses a finite
starting inventory. The existing arch recovery can give a nearly stationary
body a small impulse once both valves are open. Each identity is live,
capturing, captured or retired. Only a physical outlet crossing can enter the
portrait.

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

Released balls continue through the offscreen machine until they reach the live
portrait. Canvas paint stays bounded to the visible strip, and a drained
machine releases its native bodies and colliders. Responsive reflow restores
the checkpoint against the same local assembly geometry for the current
inventory.

## Editorial and responsive safeguards

Text belongs in purposeful openings in the architecture. `boardTextSafety.js`
checks rendered line boxes against painted SVG geometry after fonts load,
responsive resize and text mutation. At enlarged text or when a safe slot
cannot hold the copy, the route uses its accessible normal-flow reader before
the board.

Scroll text stays readable at each position. The progress track runs along
the left. The Studio shell owns
the utility rail and Button Bar.

Temporary zero-width measurements during route removal retain the last real
board scale. Reduced Motion keeps gravity and places each arrived ball
directly. Asset failures use the route's readable error state.

## Verification

Run focused checks from the repository root:

```bash
npm run check:about-game-board
npm run studio:check
npm run audit:about-game-board
node scripts/audit-about-opening-readiness.mjs
ABS_ASSEMBLY_REFLOW=1 node scripts/audit-about-assembly-gate.mjs
node scripts/audit-about-figma-sync.mjs
ABS_DRAIN_TIMEOUT_MS=180000 npm run audit:about-portrait
```

Use `window.__ABS_ABOUT_GAME_BOARD__.getStats()` in development to inspect
inventory, gravity, contacts, portrait arrivals and frame timings. Run browser
audits serially with `ABS_BROWSER=chromium` and `ABS_BROWSER=webkit`. See the
earlier performance investigation in
[`docs/qa/about-performance-20260925.md`](../../../../../docs/qa/about-performance-20260925.md).
The follow-up cache changes, measured gains and remaining desktop limit are in
[`docs/qa/about-performance-followup-20260925.md`](../../../../../docs/qa/about-performance-followup-20260925.md).

Stable scene names and capture labels are defined in
[`docs/reference/ABOUT-SCENE-MAP.md`](../../../../../docs/reference/ABOUT-SCENE-MAP.md).
