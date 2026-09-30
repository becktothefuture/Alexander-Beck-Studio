# About machine: current development contract

Updated 29 September 2026 with the split garden, restored prose and shared ten-module machine.
The full experience remains local/development-only under `AboutRoute.jsx`.

## 2D motion

- About Me aligns left and Follow me aligns right on the common twelve-column
  grid. The introduction retains Hi, I’m Alex and the approved personal copy.
- The visible reservoir has only its funnel walls and one finite inventory at
  half the former chamber capacity. Balls use Home's screen-pixel radius.
  There are no downstream spawners or replacement balls.
- `boardReservoirPacking.js` creates a hidden loose seed above the funnel.
  Bounded normal-gravity steps drop the balls against the actual architecture.
  `boardRestingState.js` freezes only grains with a physical support chain,
  then returns every prepared grain to a sleeping dynamic body before reveal.
  The opening never displays the seed rows. The supported pile stays still
  until scrolling opens the valve.
- `boardRigidBodyWorld.js` owns About's Rapier world at 60 Hz, with continuous
  collision detection and Earth gravity. Matter records hold geometry and
  presentation data; Home's runtime is unchanged. Contact graphs are read for
  diagnostics on demand. Physics work and catch-up remain bounded.
- Both valves follow scroll directly and reversibly. Three rotors and the two
  compartment drums turn automatically. Moving the opening margin after
  preparation invalidates scroll coordinates, even if the world size is fixed.
- The garden has three upper rows, a centred statement, then two lower rows
  and the ramp. The discipline list follows; three rotors lead to nine pinball
  bumpers. The old lower pinball flippers, slings and return lanes are removed.
- Practice prose precedes the upper assembly gate. The gate opens as that prose
  enters view so its receiver does not fill the reading interval. It joins closely
  to the connected drums; the redundant middle receiver is removed.
- `boardDrums.js` retains both six-compartment wheels. White spokes sit behind
  the solid carrier centres. The canal has zero friction and rebound. Drawing
  and collision walls share endpoints. Common phone-sized clearances allow
  both viewport layouts to use exactly the same architecture pieces.
- Four small seesaws sit mainly beneath the left drum outlet. Their angular
  response depends on the impact lever and speed, with a light restoring spring.
  The lower bumper bank has nine symmetric buttons. Vector_164 and Vector_165
  are removed. Six ramps alternate between the left and right window edges.
- Empty sockets sit behind balls. Captured balls retire from loose physics and
  become the socket's sole occupant. The socket disappears, and its temporary
  inset shadow fades before the 3D seam.

## Text, grid and editable design

- **Quiet intervals** alternates the introduction, centred garden statement,
  discipline grid, two practice paragraphs, four career rows, sector experience,
  logos and the service-led “Design direction. / Hands-on delivery.” passage.
- Reading text is Geist at 28px desktop and 20px phone, with 1.45 leading and
  full opacity. Instrument Serif remains reserved for bookend titles.
- `boardTextGrid.js` defines twelve columns with 48-unit margins, 24-unit gutters
  and 50-unit columns on a 960-unit board. Prose occupies six desktop columns or
  ten mobile columns. Figma uses these same proportional guides and text slots.
- `BoardEditorial.jsx` presents six disciplines in two columns on desktop and
  one list on phones. Semantic colour dots sit beside the titles; descriptions
  align with the title edge. Career entries use the approved CV roles at MRM
  (McCann), Hugo & Cat, Yoti and Dennerlein, without dates. The fifteen client
  logos span all twelve guide columns in four visual columns.
- `boardQuietIntervals.js` measures content heights and inserts space only at
  named reading intervals. Artwork, collisions and moving pivots share rigid
  translations. Text can grow without stretching or splitting mechanisms.
- Figma contains ten full-width architecture masters used by both viewport
  layouts. Text and sections use native auto layout and hug their contents.
  The settled ball reference is a separate locked image; architecture and text
  remain editable. `boardMachineParts.js` holds the shared module and part specs.
- `boardTextSafety.js` retains readable normal-flow fallback for enlarged text
  or unexpected overlap. Its check waits for fonts and matching text-height
  measurements. Short windows allow the introduction to grow.
- The existing centred ending and email, LinkedIn and CV actions are retained.
  The CV uses Work's invitation gate with separate copy. That gate is a client
  presentation control; the public PDF remains directly retrievable.

## 3D world

`boardBandJourney.js` continues the authoritative socket grid as additional
rows, follows an S-shaped band and closes its cross-section into the existing
Blender tunnel. The band, tunnel and final wall share one renderer and camera.
The raw scroll progress controls both the journey and camera; reverse scroll
reconstructs the same pose. Original Blender source/export assets are retained.

`rollercoasterEnding.js` measures the final content opening. In the board
experience only, the wall particles shrink in place along a gently irregular
boundary. The clear centre and centred text are preserved.

## Review and verification

The reference is generated from the actual page by
`node scripts/capture-about-scene-map.mjs`, under
`output/playwright/about-scene-map/`. Labels belong only to that review document.

Focused contracts: `npm run check:about-game-board`.
Quiet intervals browser checks: `node scripts/audit-about-quiet-intervals.mjs` against a
certification preview (`ABS_BASE_URL`); run Chromium and WebKit serially with
`ABS_BROWSER=webkit` for the second pass. Older feedback audits describe the
previous text placements and are retained as historical evidence.
Machine structure and scroll interactions: `node scripts/audit-about-machine-refinement.mjs`.
Run it after the quiet-interval capture, which supplies its measured layout.
CV interactions: `node scripts/audit-cv-download.mjs` (repeat with `ABS_BROWSER=webkit`).
Reservoir rest and release: `node scripts/audit-about-reservoir-rest.mjs`.
On this Mac, set `ABS_ABOUT_GPU=metal` for Chromium checks against the actual
graphics processor. The default SwiftShader run remains a software fallback
check; its frame cadence is not a device performance measurement. Reports
record the requested graphics backend. Keep browser performance runs serial.
The complete repository gate is `npm run check:site`.
