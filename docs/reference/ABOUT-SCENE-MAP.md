# About scene map

Use **2D motion** for the top of the page and **3D world** for the bottom.
These names describe the local development experience. The production launch
hold and publish gate remain separate.

Generate the annotated reference with
`node scripts/capture-about-scene-map.mjs` while the development server is
running. It captures desktop at **1440 × 1000** and mobile at **390 × 844** in
light mode. The updated reference is `output/playwright/about-scene-map/index.html`;
its viewport links switch between desktop and `mobile.html`. Each has a full-page
PNG export (`annotated-page.png` and `annotated-page-mobile.png`). `map.json`
records the capture time, source URL, viewport dimensions and annotation positions.

The continuous 2D strip stops where the sticky spatial stage begins. A separate
socket-grid viewport and four 3D views continue to the final contact clearing;
stitching that stage as a flat page would misrepresent its changing perspective.
Labels retain their existing IDs across both viewports. The generator checks
image loading, annotation clearance and viewport navigation before replacing the
reference, and retains the previous output in a dated sibling folder.

## Presentation contract

- The opening is a 70/30 composition: copy occupies the upper 70%, while the
  supported ball-pit surface peeks through the lower 30%.
- The straight reservoir is `100svh` tall before the funnel and fills the real
  chamber volume at the shared Home/About ball size. It has no frozen display
  rows or unsupported decorative balls.
- Type has two roles: Instrument Serif for the opening and ending titles,
  and one Geist size for all narrative, descriptions and instructions. The
  shared reading measure is capped at 32ch. Art Direction sits left of its
  drum, and the engineering/system columns leave a clear central bumper lane.
- Selected-client assets come from the `text-selected-clients` content module
  and render as a responsive four-column logo grid in both themes.
- Architecture uses only the configurable fixture, wall and action monochrome
  roles. Balls keep the shared site palette.

## Motion vocabulary

- **Scroll:** a reversible function of native scroll position. Holding scroll
  holds the mechanism pose; no elapsed-time easing continues afterwards.
- **Automatic:** the mechanism runs with time while its scene is active.
- **Impact:** physical balls move or deflect the mechanism.
- **Manual:** click, tap or keyboard input operates the mechanism.
- **Static + physics:** architecture is fixed while loose balls remain physical.
- **Capture:** one socket takes ownership of one incoming ball before seating it.

Gravity and ball motion remain independent of scroll. Reverse scroll closes a
valve; it does not rewind balls that have already passed it.
Fine-pointer wheel input uses the site's shared smooth-scroll easing. Touch and
reduced-motion input remain native. The architecture, physics controls and 3D
camera all sample the same painted scroll position in one frame.

## Part A — 2D motion

| ID | Name | Motion / key elements |
| --- | --- | --- |
| A01 | Introduction | About Me, merged opening paragraph and scroll contrast |
| A02 | Reservoir | Full-height straight chamber and supported physical pile |
| A03 | Funnel | Sloped shoulders and outlet throat |
| A04 | Reservoir valve | Scroll-controlled outlet arm and pivot |
| A05 | Bumper garden | Static circular bumpers and centred narrative |
| A06 | Transfer wedge | Static ramp below the garden |
| A07 | Propeller | Automatic three-vane rotor; balls remain outside the shape |
| A08 | Pinball chamber | Return lanes, paired solid slings and three top bumpers |
| A09 | Flipper pair | Manual left/right flippers; click/tap or J/K |
| A10 | Product receiver | Raised funnel under Product Design; shorter flipper-to-receiver gap |
| A11 | Metering valve | Second scroll-controlled valve |
| A12 | Transfer pipeline | Enclosed diagonal channel and outlet |
| A13 | Experience receiver | Funnel feeding the large drum |
| A14 | Art Direction drum | Automatic pocket wheel; copy sits to its left |
| A15 | Drum transfer canal | Smooth constant-width downhill canal shared by art and collision |
| A16 | Motion & 3D drum | Automatic smaller pocket wheel; copy sits to its right |
| A17 | Balance beam | Impact-driven seesaw |
| A21 | Pinball bumper bank | Five symmetric high-rebound bumpers; inserted later, so its ID stays unchanged |
| A18 | Impact leaves | Hinged left/right ramps; selected-client logos below |
| A19 | Direction ramps | Final static ramps and purpose statement |
| A20 | Socket grid | 176 receptacles and shared 2D/3D occupancy layout |

## Part B — 3D world

| ID | Name | Motion / key elements |
| --- | --- | --- |
| B01 | Ceiling band and tower wall | The exact grid folds overhead while the scroll-owned camera descends |
| B02 | Authored tunnel | The same camera joins the retained Blender tunnel without a scene cut |
| B03 | Final wall | Scroll-owned tunnel approach with automatic surface movement |
| B04 | Contact clearing | Some dots swell, others shrink, then disappear around the fixed centred CTA |

The flat grid, curved band and retained tunnel are one scene, rather than a
stack of unrelated 2D and 3D sections. Occupied cells display their balls and
remove their socket discs. Empty sockets remain visible at the seam, then their
recesses shrink away early in the band. The 2D socket shadow fades as the 3D
scene takes over. Reverse scrolling reconstructs the same occupancy state.

The ending holds “Let’s talk”, its supporting copy, email, LinkedIn and
Download CV in the sticky viewport while the ball field moves behind them.
Its opening is measured from the actual text and action bounds, with a less
regular edge than a circle. The CV action uses the same client-side invite
grant as Work and CV-specific gate copy. It is not file authentication: the
public PDF can still be reached directly by its static URL.

## Physical continuity

`boardRigidBodyWorld.js` is the active motion source. Rapier 2D advances exact
circle colliders at a fixed 60 Hz under Earth gravity (`9.81 m/s²`) with native
continuous collision detection. Matter shapes remain the authoring, mechanism,
event and render-proxy layer; Matter is not a second active ball solver.

A global circle-volume guard resolves residual ball/ball and ball/fixture
penetration after native integration. Scroll-owned valves also run the guard
against their sampled swept poses before the native solve. The guard makes
position corrections without artificial velocity impulses. It prevents dense
neighbour pressure or a moving valve from pushing a ball through architecture.

The initial reservoir is packed against real fixtures and already-supported
balls. Support chains are checked before display; a body wakes when its support
is removed. No row is pinned or frozen. Ball mass, restitution and friction are
configurable, while gravity always stays at the Earth baseline.

## Source ownership

Paths below are relative to `react-app/app/src/routes/about-game-board/`.

- `boardLayout.js`: viewport origin and full-height reservoir placement.
- `boardInventory.js`, `boardReservoirPacking.js`: chamber volume and supported
  starting positions.
- `boardPinball.js`: shared pinball artwork, solid sling vertices and flipper endpoints.
- `boardHandoffs.js`, `boardTransferCanal.js`: responsive mechanisms, canal and
  five-bumper bank.
- `boardRigidBodyWorld.js`: Rapier integration, native CCD and boundary guard.
- `boardPhysics.js`: Matter-authored fixtures, proxies and scene orchestration.
- `boardGrid.js`, `boardGridHandoffScene.js`: stable occupancy and organic
  clearing from the final 2D grid.
- `boardBandJourney.js`: continuous curved band and retained tunnel join.
- `boardAuthoredEnding.js`: retained Blender tunnel and final-wall adapter.
- `boardTextSafety.js`, `boardTextPresentation.js`: clear-space placement and
  shared contrast behavior.
- `AboutGameBoardExperience.jsx`: native scroll, input, capture and lifecycle.
- `about-game-board.css`: 70/30 opening, two type roles, responsive layout and
  three-role architecture theming.
- `../../components/app/CvDownloadAction.jsx`, `../../lib/cv-download.js`: shared
  Work/CV invite access and static download behavior.

## Verification status

Run the focused checks serially:

```bash
npm run check:about-game-board
node scripts/audit-about-board-feedback.mjs
ABS_BROWSER=webkit node scripts/audit-about-board-feedback.mjs
ABS_BROWSER=chromium node scripts/audit-about-scroll-motion.mjs
ABS_BROWSER=webkit node scripts/audit-about-scroll-motion.mjs
node scripts/capture-about-scene-map.mjs
```

Inspect the complete route at desktop, phone and short-landscape sizes in light
and dark themes. The main full-inventory physics path is still being profiled.
These commands are the required evidence to collect, not a claim that every
test, browser, performance target or production-readiness gate currently passes.
