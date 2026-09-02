# About page radical simplification plan

## Outcome

Replace the current collection of particle scenes with one continuous point world and four clear editorial acts. The public page should feel calm, deep, and deliberate at every scroll position. The square-gate passage is the single hero event.

## Audience and use

The page is for prospective collaborators, clients, and design juries. It must explain Alexander's practice, show credible proof, and end with a direct invitation. The experience should reward scrolling without making the visitor decode the interface.

## Source of truth

- Product intent: `PRODUCT.md`
- Visual rules: `DESIGN.md`
- Authored About copy and client assets: `react-app/app/public/config/contents-about.json`
- Stable shell and navigation: existing `StudioShell` and `ShellButtonBar`
- Review evidence: current desktop and mobile contact sheets under `output/playwright/about-simplification-baseline/`

## Diagnosis

The current page contains seven model stages, thirteen text fields, two tunnel systems, several unrelated particle grammars, and a separate engineered finale. These parts repeatedly reset the visual language. A fully blank interval is visible around 76% of travel. The circular portal duplicates the stronger square-gate sequence, the object gallery reads as scattered icons, the client proof competes with particles, and the finale exposes its bounded construction.

## New four-act journey

### 1. Arrival

- Keep the opening title and description.
- Use one deep, irregular point field that remains visible behind the whole page.
- Let the field establish foreground, middle distance, and far distance without object silhouettes.

### 2. Passage

- Resolve the same material into one long, curved sequence of sixteen square gates.
- Move the camera through every gate in order.
- Use a smooth rail with constant distance per unit of scroll.
- Retire gates after the camera passes them.
- Remove the crafted forms and circular tunnel.

### 3. Landscape and proof

- Open the tunnel into a full-width point surface and distant mountain field.
- Present one concise worldview statement, the career sequence, and the selected client grid inside the continuing landscape.
- Give text and logos a quiet central reading zone without particle intersections.
- Use deterministic, authored logo sizing. Do not scan image pixels at runtime.

### 4. Open horizon

- Continue and widen the same landscape beyond all viewport edges.
- Centre `Let's begin.`, its support copy, and contact actions vertically.
- Remove the method corridor, lattices, shaping and thinking fragments, finale bowl, and orbit continuation.

## Motion and performance contract

- Use the native internal scrollport on desktop and mobile.
- Map normalized `scrollTop` directly to normalized scene travel; do not apply a second easing or delayed camera target.
- Render from one `requestAnimationFrame` loop only while the route is visible.
- Precompute point and gate data. Do not allocate arrays or objects per frame.
- Cap device-pixel ratio and reduce point count on narrow/mobile viewports.
- Keep background particles visible at every sampled position.
- Keep at most two geometry families active during a transition.
- Respect `prefers-reduced-motion` by drawing a stable representative frame and keeping all content reachable.

## What leaves the public runtime

- Crafted particle bodies and shape-recognition sequence
- Circular portal and its hoops
- Separate method banks and study lattice
- Shaping and thinking title fragments
- Finale bowl, orbit, and synthetic continuation
- Per-logo canvas alpha scanning
- Independent camera smoothing and scene-specific scroll easing

The previous Blender and narrative modules can remain in the repository as inactive source during this replacement. They are no longer loaded by the public About route.

## Implementation ownership

1. Renderer worker: deterministic point field, curved gates, landscape projection, theme-aware palette, performance bounds.
2. Editorial worker: four-act React structure, semantic copy, career and client proof, contact actions, responsive CSS.
3. Orchestrator: route integration, readiness and transition compatibility, production check update, end-to-end validation.
4. Reviewer: read-only diff and visual review after integration.

## Acceptance criteria

- Four acts only: Arrival, Passage, Landscape and proof, Open horizon.
- No empty frame when sampled every 2% on desktop or mobile.
- Sixteen square gates are visible and crossed in order; no circular tunnel remains.
- Camera travel has a direct, monotonic, constant scroll-to-progress relationship.
- Text uses the full viewport with intentional vertical placement and one body measure.
- All fifteen client logos are present, optically restrained, and do not dominate the page.
- The landscape fills the width and extends beyond the visible frame at the ending.
- The final title and actions are vertically centred.
- The public About route does not load the old multi-scene runtime.
- Keyboard scrolling, touch scrolling, reduced motion, theme switching, and route transitions remain functional.
- Desktop and mobile contact sheets show one coherent visual language.
- Lint, production build, focused About audits, and `npm run studio:check` pass before release.
