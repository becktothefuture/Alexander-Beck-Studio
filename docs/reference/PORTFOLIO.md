# Portfolio

## Current experience

Portfolio is an orbital, scroll/drag-controlled DOM card deck managed by `PortfolioScrollApp`. Selecting a card opens a project drawer mounted in `#portfolio-sheet-host`.

The visible project media is the shared handoff object. `project-handoff.js` measures the selected card media and animates its `left`, `top`, `width`, and `height` into the drawer hero geometry. Reversal, interruption, and reduced-motion paths must preserve ownership and focus.

There is no visible Portfolio physics pit or archived slider pipeline.

## Ownership

- React route/window: `src/routes/portfolio/PortfolioRoute.jsx`
- Deck and route lifecycle: `src/legacy/modules/portfolio/app.js`
- Drawer: `project-drawer.js`
- Media handoff: `project-handoff.js`
- Project content/media: `public/config/contents-portfolio.json`
- Authored controls: `public/config/design-system.json > portfolio`
- Generated runtime config: `public/config/portfolio-config.json`
- Styling: `public/css/portfolio.css`

The in-window Portfolio gate is the only access gate. It does not use the retired whole-page Portfolio modal.

When locked, Portfolio renders an inert CSS/DOM ghost scene and the code form only. It does not boot the deck, canvas, project JSON, title/copy, or video runtime until the code is accepted. The scene deliberately requests four fixed, static project poster frames—without card labels or interaction—so it preserves the live deck silhouette while it is blurred. This is client-side access friction, not secure authentication: a determined visitor can still discover publicly hosted static files.

## Required verification

Use a fresh production build, then run the Portfolio gate, carousel, drawer, pointer, and project-transition audits. Run project/route transitions in Chromium and WebKit. Manually check desktop and mobile input, reversal during open/close, focus restoration, native drawer scrolling, tap-ring switching, and Button Bar clearance.
