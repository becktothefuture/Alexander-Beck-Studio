# Bottom Shell Tabs Implementation Plan

## Source Inputs

- User reference screenshot: `/tmp/codex-remote-attachments/019f47da-0439-7d92-a0ea-3e2c72569d62/F9581A7E-210C-4EE4-9042-91F4DA8D5DCD/1-Photo-1.jpg`
- Current shell owner: `react-app/app/src/components/app/StudioShell.jsx`
- Current shared footer owner: `react-app/app/src/components/SiteFooter.jsx`
- Current primary link component: `react-app/app/src/components/MainNavLink.jsx`
- Current route registry: `react-app/app/src/lib/routes.js`
- Current route views: `react-app/app/src/routes/home/HomeRoute.jsx`, `react-app/app/src/routes/portfolio/PortfolioRoute.jsx`, `react-app/app/src/routes/cv/CvRoute.jsx`
- Current route runtime maps: `react-app/app/src/components/app/SiteApp.jsx`
- Current wall/frame CSS: `react-app/app/public/css/main.css`, `react-app/app/public/css/tokens.css`, `react-app/app/public/css/portfolio.css`
- Canonical docs to keep aligned: `docs/reference/LAYER-STACKING.md`, `docs/reference/COMPONENT-LIBRARY.md`, `docs/reference/SITE-STYLEGUIDE.md`, `docs/reference/TRANSITION-ORCHESTRATION.md`, `docs/reference/MATERIAL-PRESENCE.md`

## Product Intent

Move the primary site navigation from the home hero area into a persistent bottom shell dock that sits outside the inner wall/window. The bottom frame/wall becomes taller and intentionally houses four tab-like controls:

- Home: icon-only active tab on the home route.
- Contact: promoted to a route/page rather than only a modal.
- Portfolio: active when the portfolio route is current.
- About Me: active when the about/CV route is current.

The tabs should feel like physical objects seated in the bottom frame: skeuomorphic, tactile, softly inset, and materially related to the existing chrome buttons. One tab must always be active.

## Current Architecture Observations

- `#simulations` is the inner wall/window. It currently uses symmetric top and bottom insets from `--safari-tint-inset-y`.
- `.fade-content.ui-layer` holds route UI and `SiteFooter`; it stacks above the wall at z-index 200.
- `#portfolio-sheet-host` is a sibling after `.fade-content`; it must remain above route chrome and aligned to the inner-wall rectangle.
- Home nav links currently live in `HomeRoute.jsx` as `#main-links` and use legacy trigger IDs consumed by contact, portfolio, and CV modal code.
- Portfolio and CV routes still expose top-bar links for gates/actions.
- `Contact` currently opens `#contact-modal` via `legacy/modules/ui/contact-modal.js`; it is not a first-class route.
- `Portfolio` and `About Me` are gated routes with invite-code modal friction; access paths live in `access-gates.js`.

## Review-Driven Product Contract

1. The dock is shared shell chrome rendered by `StudioShell`, not owned by individual routes.
2. Dock display state comes from a deliberate display-route contract:
   - normal route: current resolved route ID;
   - gated route request without access: requested gated route while its gate is active;
   - dismissed/denied gate: current resolved route returns to active;
   - granted gate: target route becomes active after route transition.
3. Route targets:
   - Home -> `/index.html`
   - Contact -> `/contact.html`
   - Portfolio -> `/portfolio.html`
   - About Me -> `/cv.html` for now, with visible label `About Me`
4. Existing gate behavior remains for Portfolio/About unless explicitly changed later.
5. Contact becomes a route and can still reuse contact content/copy from the existing modal source.
6. The old home `#main-links` area is removed visually only after home route readiness and legacy trigger bindings are migrated or given explicit compatibility hooks.
7. The bottom dock must not sit inside the canvas/window; it sits in the expanded bottom frame band.
8. "Skeuomorphic" means restrained physical seating using the existing `.footer_link` / `.abs-icon-btn` token language. Do not introduce a second glass system, new palette, or heavy frosted stack.
9. Route top bars keep local utilities such as back/sound while primary text navigation moves to the bottom dock.
10. Footer metadata, social links, and edge caption must have explicit desktop and mobile placement rules relative to the dock.

## Implementation Phases

### Phase 1: Route and Navigation Model

- Add `contact` to `ROUTE_DEFS` in `react-app/app/src/lib/routes.js`.
- Add `contact.html` to Vite inputs or the equivalent direct-load build path.
- Add `getContactRouteView()` under `react-app/app/src/routes/contact/`.
- Add contact route imports and runtime map entries in `SiteApp.jsx`.
- Decide whether the contact route needs a bootstrap module or can be pure React.
- Create a shared dock/tab component, likely `ShellBottomTabs.jsx`, using route hrefs from `buildRouteHref`.
- Implement shell-owned SPA/gate handling instead of relying on route-runtime `data-nav-transition` attachment.
- Preserve existing IDs only where legacy modules still bind to them; otherwise retire trigger-only IDs in a controlled PRD.
- Add a tab-state matrix for resolved routes, requested gated routes, open gates, dismissed gates, direct loads, SPA transitions, and browser back/forward.

### Phase 2: Bottom Frame Geometry

- Introduce semantic CSS variables for bottom dock geometry:
  - `--shell-bottom-dock-height`
  - `--shell-bottom-dock-gap`
  - `--shell-wall-inset-top`
  - `--shell-wall-inset-right`
  - `--shell-wall-inset-bottom`
  - `--shell-wall-inset-left`
- Make the default wall geometry equivalent to today, then increase only bottom inset when the bottom dock shell is active.
- Update `#simulations` to consume the directional shell inset variables.
- Update all geometry consumers together so they share the same inner-window rectangle: `#simulations`, `.frame-vignette`, `.simulation-contrast-veil`, scene effects/fallbacks, `#portfolio-sheet-host`, portfolio drawer close offsets, and audits.
- Update canvas/SPA audits if assumptions about symmetric inner-wall dimensions are encoded.
- Keep wall/frame color separation intact.
- Define mobile safe-area behavior, minimum inner-wall height, dock row height, footer metadata behavior, and edge-caption behavior before coding.

### Phase 3: Dock Visual System

- Extend the existing `.footer_link` / `.abs-icon-btn` material language instead of creating unrelated button classes.
- Add a shared `.shell-bottom-tabs` pattern to `main.css`.
- Create four tab variants:
  - icon-only active home tab with accessible label.
  - text tabs for Contact, Portfolio, About Me.
  - active state via `aria-current="page"` and a route-derived class/data attribute.
- Add skeuomorphic states:
  - resting raised rim.
  - active seated/inset state.
  - hover/focus tactile fill using existing cursor color and readable `--cursor-hover-fg`.
  - reduced-motion-safe transitions.
- Add non-motion and non-color active affordances for keyboard, reduced motion, and high contrast.
- Keep hit targets stable and text fitting on mobile.
- Update `/styleguide.html` with the dock pattern.

### Phase 4: Content Repositioning and Route Cleanup

- Remove home `#main-links` from the visual center once the shell dock owns the primary nav.
- Reconcile legacy contact modal triggers:
  - Contact tab navigates to `/contact.html`.
  - Inline "Let's chat" should route to `/contact.html` unless an explicit compatibility exception is documented.
- Reconcile Portfolio/About gate triggers:
  - Dock tab click should route to the gate/page path.
  - If no access exists, current gate modal opens; if access exists, route loads.
- Remove route-local duplicate text navigation only after bottom dock navigation, sound, back, and gate flows are verified.
- Keep route-topbar structure for local utilities where required by the component library.

### Phase 5: Documentation and Validation

- Update `COMPONENT-LIBRARY.md` with the bottom dock/tab contract.
- Update `LAYER-STACKING.md` if the bottom dock becomes a named shell chrome layer.
- Update `SITE-STYLEGUIDE.md` for tab/dock behavior and material treatment.
- Update `CONFIGURATION.md` only if new design-system or generated config keys are introduced.
- Run full route, canvas, portfolio, transition, and screenshot verification from preview.

## PRD Split

1. `prd-contact-route-promotion.md` - first-class Contact route, build entry, route content, inline link behavior, modal compatibility.
2. `prd-route-and-tab-state-foundation.md` - shell dock model, active tab state, gate pending state, direct/back-forward behavior.
3. `prd-bottom-frame-geometry.md` - asymmetric bottom frame expansion, shared inset contract, footer/dock safe-area layout.
4. `prd-shell-tab-visual-system.md` - restrained physical tab treatment, active/focus states, responsive behavior, styleguide.
5. `prd-route-chrome-cleanup-and-legacy-compat.md` - home `#main-links` retirement, readiness/gate trigger migration, topbar cleanup.
6. `prd-release-verification-and-docs.md` - docs, full release gate, visual proof, PRD archive.

## Key Risks

- Changing `#simulations` bottom geometry can alter canvas backing-store size and break SPA/canvas audits.
- `#portfolio-sheet-host` must stay aligned with the new inner wall and above route chrome.
- Removing `#main-links` too early can break legacy modal/gate initialization.
- Contact route promotion can conflict with existing `abs_open_contact_modal` session behavior.
- Active tab state needs to stay correct during gate modals, denied access, route transitions, direct loads, and browser back/forward.
- Gate pending state requires an explicit state machine. Do not derive it only from `routeState.requestedRouteId`.
- Mobile safe-area handling can collide with the browser bottom bar and existing footer metadata.
- Visual changes could weaken the approved wall/frame separation.
- Existing validation scripts assert `#main-links`, Contact modal, route topbar, and screenshot route assumptions. Update affected scripts in the same PRDs that change those surfaces.

## Initial Verification Plan

Baseline before implementation:

```bash
git status --short
npm run check:site
npm run certify:screens
```

Preview-dependent gates:

```bash
npm run preview
ABS_DEV_URL=http://localhost:8013 npm run audit:canvas-spa
ABS_DEV_URL=http://localhost:8013 npm run audit:portfolio-gate
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium ABS_TRANSITION_STRICT_RAF=1 npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit ABS_TRANSITION_STRICT_RAF=1 ABS_TRANSITION_HARD_TIMEOUT_MS=300000 npm run audit:transition-flows
```

Manual/visual checks:

- Home desktop/mobile: tab dock outside inner window, Home active, no overlapping footer metadata.
- Contact desktop/mobile: Contact active, page content is readable and route-backed.
- Portfolio desktop/mobile: Portfolio active, deck remains centered, project drawer covers chrome.
- About desktop/mobile: About Me active, scroll content remains usable.
- Back/forward: active tab updates without stale state.
- Reduced motion: tabs do not rely on motion to communicate active state.
