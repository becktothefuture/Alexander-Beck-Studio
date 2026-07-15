# Portfolio

Production design intent and shared responsive rules live in [`DESIGN.md`](../../DESIGN.md). This file owns the Portfolio-specific deck, gate, drawer, and handoff contract.

## Current experience

Portfolio is an orbital, scroll/drag-controlled DOM card deck managed by `PortfolioScrollApp`. Selecting a card opens a project drawer mounted in `#portfolio-sheet-host`.

The deck uses a fixed repeated-card pool rather than growing the DOM. Sustained wheel or trackpad input advances through rebased project coordinates indefinitely while a bounded target lead prevents an unbounded catch-up queue. A Portfolio-owned Canvas 2D field continuously draws three deterministic layers of solid circles behind the cards. It drifts slowly at rest, responds to signed measured deck velocity, and remains visible as a static composition under reduced motion.

The field has a soft horizontal quiet band centred on the effective responsive Orbit Y value. Its nine authored controls cover idle/fast opacity, quiet-band height/opacity, density, far/near circle size, motion response, and parallax depth. It pauses while the route is hidden, gated, transitioning, drawer-open, or unmounted; it does not own the legacy `#c` canvas.

The visible project media is the shared handoff object. `project-handoff.js` measures the selected card media and animates its `left`, `top`, `width`, and `height` into the drawer hero geometry. Reversal, interruption, and reduced-motion paths must preserve ownership and focus.

There is no visible Portfolio physics pit or archived slider pipeline.

## Typography

Portfolio deliberately separates the route voice from the project-information voice.

- The deck intro and the locked gate title are route-entry headlines, so they use Instrument Serif through `.route-centered-page__title` and the shared headline tokens.
- Portfolio card titles and the project-drawer title remain Geist. They identify work and support interaction, so they should retain the site's precise structural voice.
- Do not make the drawer title serif merely to create continuity with the route intro. The contrast is the hierarchy: editorial arrival first, clear project information second.
- Instrument Serif may be considered later for an occasional pull quote or chapter opener inside a case study, but only as an explicitly art-directed exception.

## Ownership

- React route/window: `src/routes/portfolio/PortfolioRoute.jsx`
- Deck and route lifecycle: `src/legacy/modules/portfolio/app.js`
- Persistent particle field: `src/legacy/modules/portfolio/portfolio-speed-field.js`
- Drawer: `project-drawer.js`
- Media handoff: `project-handoff.js`
- Project content/media: `public/config/contents-portfolio.json`
- Authored controls: `public/config/design-system.json > portfolio`
- Generated runtime config: `public/config/portfolio-config.json`
- Styling: `public/css/portfolio.css`

The in-window Portfolio gate is the only access gate. It does not use the retired whole-page Portfolio modal.

When locked, Portfolio renders an inert CSS/DOM ghost scene and the code form only. It does not boot the deck, canvas, project JSON, title/copy, or video runtime until the code is accepted. The scene deliberately requests four fixed, static project poster frames—without card labels or interaction—so it preserves the live deck silhouette while it is blurred. This is client-side access friction, not secure authentication: a determined visitor can still discover publicly hosted static files.

## Required verification

Use a fresh production build, then run the Portfolio gate, carousel, drawer, pointer, and project-transition audits. The carousel audit must cover sustained traversal beyond ten project cycles in both directions, bounded lead and coordinates, fixed card and particle counts, rapid reversal, reduced motion, settlement, active-field frame timing, and the 3440×1440 layout exposing all seven unique projects. Run project/route transitions in Chromium and WebKit. Manually check desktop and mobile input, reversal during open/close, focus restoration, native drawer scrolling, tap-ring switching, and Button Bar clearance.
