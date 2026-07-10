# System Impact Map: Bottom Shell Tabs Redesign

## Product Change

The requested design moves primary navigation out of the inner window and into an expanded bottom shell band. The bottom controls become persistent route tabs:

- Home: icon-only tab.
- Contact: text tab, route page.
- Portfolio: text tab, route page with the only remaining gate.
- About Me: text tab, route page, no gate, coming soon for now.

The active tab is always visible and selected. The active control has a pressed state and a small machine-like light below the icon or label. The old color-fill hover treatment is not used for these tabs; the new default button material should already have the refined light/shadow edge.

## Architecture Summary

The existing system treats `#simulations` as the authoritative inner wall. For this redesign, call the visible content/canvas area the `window`:

- Canvas buffer size comes from `#simulations`.
- Ball physics and rounded-corner collision math use the canvas dimensions.
- Custom cursor simulation hit testing uses the `#simulations` rect.
- Portfolio drawer geometry is aligned to the inner wall.
- Screenshot and transition audits assert against this geometry.

The redesign therefore needs an explicit two-rect model:

- Inner window rect: canvas, simulation, page content, in-window contact/about/portfolio gate content.
- Bottom shell band rect: persistent route tabs and related bottom chrome outside the inner window.

## Affected Source Areas

### Shell and Routing

- `react-app/app/src/components/app/StudioShell.jsx`
  - Owns `#abs-scene`, `#simulations`, `.fade-content`, modal hosts, `SiteFooter`, `#portfolio-sheet-host`, and route layers.
- `react-app/app/src/components/app/SiteApp.jsx`
  - Route switching surface.
- `react-app/app/src/hooks/useShellRouteTransition.js`
  - Single owner for route transitions and readiness.
- `react-app/app/src/lib/routes.js`
  - Today defines `home`, `portfolio`, and `cv`; `portfolio` and `cv` are gated.
- `react-app/app/src/lib/access-gates.js`
  - Today owns `portfolio` and `cv` gate codes, request flags, redirects, and access storage.
- `react-app/app/src/lib/spa-navigation.js`
  - SPA route navigation and history behavior.
- `react-app/app/vite.config.js`
  - Multi-entry build inputs. Direct `/contact.html` and `/about.html` require explicit entries, matching existing `portfolio.html` and `cv.html`.
- `react-app/app/contact.html`
- `react-app/app/about.html`
- `react-app/app/src/entries/contact.jsx`
- `react-app/app/src/entries/about.jsx`
  - Required if Contact and About are canonical direct-load pages.

### Route Content

- `react-app/app/src/routes/home/HomeRoute.jsx`
  - Today renders `#main-links.ui-main-nav` inside the home route.
- `react-app/app/src/routes/portfolio/PortfolioRoute.jsx`
  - Today assumes portfolio route content renders only after gate access.
- `react-app/app/src/routes/cv/CvRoute.jsx`
  - Today is the About/CV content route and is gated.
- New route needed for Contact.
- New or repurposed route needed for About.

### Modal and Gate Code

- `react-app/app/src/legacy/modules/ui/contact-modal.js`
  - Source of the Contact content that should be reused on the Contact page.
- `react-app/app/src/legacy/modules/ui/portfolio-modal.js`
  - Source of portfolio gate logic and code validation.
- `react-app/app/src/legacy/modules/ui/cv-modal.js`
  - Should stop being a visible About gate.
- `react-app/app/src/legacy/modules/ui/modal-overlay.js`
  - Current full-window modal phase scales/disables the shell and conflicts with persistent bottom tabs.
- `react-app/app/src/legacy/modules/ui/gate-modal-shared.js`
  - Useful for gate styling and digit input behavior, but not as an `aria-modal` overlay if tabs remain accessible.

### Shell CSS and Material

- `react-app/app/public/css/tokens.css`
  - Add directional bottom-shell tokens and tab material tokens.
- `react-app/app/public/css/main.css`
  - Current owner of `.footer_link`, `.abs-icon-btn`, `#main-links`, route topbar, footer, modal layers, wall frame, safe-area rules.
- `react-app/app/public/css/portfolio.css`
  - Currently hides footer/chrome in portfolio contexts and aligns `#portfolio-sheet-host` to the inner wall.
- `docs/reference/SITE-STYLEGUIDE.md`
- `docs/reference/COMPONENT-LIBRARY.md`
- `docs/reference/LAYER-STACKING.md`
- `docs/reference/TRANSITION-ORCHESTRATION.md`

### Canvas, Physics, Cursor, and Frame Geometry

- `react-app/app/src/legacy/modules/rendering/renderer.js`
  - Sizes `#c` from `#simulations`.
- `react-app/app/src/legacy/modules/physics/Ball.js`
  - Rounded-rect collision math.
- `react-app/app/src/legacy/modules/physics/engine.js`
  - Corner and wall forces.
- `react-app/app/src/legacy/modules/physics/wall-state.js`
  - Wall geometry state.
- `react-app/app/src/legacy/modules/core/state.js`
  - Applies layout CSS variables.
- `react-app/app/src/legacy/modules/utils/frame-geometry.js`
  - Frame geometry helper.
- `react-app/app/src/legacy/modules/rendering/cursor.js`
  - Simulation hit area and cursor mode.
- `react-app/app/src/legacy/modules/portfolio/app.js`
- `react-app/app/src/legacy/modules/portfolio/pit-mode.js`
  - Portfolio deck/pit geometry and wall readings.

### Config and Generated Outputs

- `react-app/app/public/config/design-system.json`
  - Canonical authored config.
- `react-app/app/public/config/default-config.json`
- `react-app/app/public/config/shell-config.json`
- `react-app/app/public/config/portfolio-config.json`
- `react-app/app/public/config/cv-config.json`
  - Generated outputs. Do not hand-edit.

### Validation and Audits

- `scripts/certify-screens.mjs`
- `scripts/audit-portfolio-gate-flow.mjs`
- `scripts/audit-modal-unified-behavior.mjs`
- `scripts/audit-transition-flows.mjs`
- `scripts/audit-transition-gate-serial.mjs`
- `scripts/audit-portfolio-drawer-open.mjs`
- `scripts/audit-portfolio-drawer-pointer.mjs`
- `scripts/test-gate-roundtrip.mjs`

These currently assume `#main-links`, full-viewport modal triggers, CV gate flow, and home-to-modal-to-route transitions.

## Layout Risks To Solve

- Title and simulation switcher vertical spacing after the nav moves away from the title zone.
- Expanded bottom shell space without crushing the inner window on mobile.
- Footer/social/time/edge-caption ownership relative to the new tab band.
- Rounded corner collision geometry after the inner window height changes.
- Portfolio drawer geometry and z-order above the new tabs.
- Direct route boot readiness for Contact/About/Portfolio locked/unlocked states.
- Back/forward behavior with tabs acting as route controls.
- Accessibility: `aria-current`, focus-visible, tab order, and in-window gate semantics.
- Reduced-motion behavior for pressed tab states and gate transitions.

## Recommended Decisions

- Keep `MainNavLink` compatibility, but add a scoped bottom-shell tab layer instead of globally restyling every `.footer_link`.
- Make `/portfolio.html` the canonical URL for both locked and unlocked portfolio states.
- Add `/contact.html` and `/about.html` as canonical routes.
- Keep `/cv.html` as the same page as `/about.html` during migration to avoid breaking existing links while making About the canonical page.
- Shrink the inner window/canvas upward so the expanded bottom band is outside physics and page content.
- Implement the Portfolio gate as an in-window route state, not as `modal-open`.
- Remove the Contact and CV/About global modal implementations after extracting any shared content or behavior.
- Add the Instrument Wake transition for content changes inside the window.
