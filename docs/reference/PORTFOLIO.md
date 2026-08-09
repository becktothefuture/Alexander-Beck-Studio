# Portfolio

Production design intent and shared responsive rules live in [`DESIGN.md`](../../DESIGN.md). This file owns the Portfolio-specific deck, gate, drawer, and handoff contract.

## Current experience

Portfolio is an orbital, scroll/drag-controlled DOM card deck managed by `PortfolioScrollApp`. Selecting a card opens a project drawer mounted in `#portfolio-sheet-host`.

The project seats follow a deliberately flat orbit. The authored `8000px` desktop and `3200px` mobile radii pair with smaller minimum angle steps so the horizontal card rhythm remains stable while the vertical arc is substantially reduced. The collision guard may still widen the effective angle at constrained sizes to prevent overlap.

The five-item pagination track uses tall, narrow vertical capsules arranged on the existing shallow arc. The active mark is fully opaque; the remaining marks share the site-wide quiet indicator material and thickness.

The orbit seat is height-responsive. Its authored desktop and mobile centre endpoints are each five percentage points lower than the previous composition (`56.25%` desktop and `63%` mobile). Desktop also adds a `3dvh` visual offset to its configured centre so the card row keeps proportionate clearance below the intro as the viewport height changes. The standard desktop card remains capped at `316 × 461px` through `1440 × 900`; when both viewport dimensions grow, the card cap interpolates to `1.75×` at `2560 × 1440` and remains capped there. As the enlarged card approaches that endpoint, the orbit eases into a title-relative cap; once the card scale is capped, its top edge remains approximately `8dvh` below the complete intro block so the two regions retain clear optical separation. Above the `1440px`-tall endpoint, the intro and capped orbit descend together, reaching an additional `6dvh` offset at `1800px` and retaining that offset on taller viewports. Card copy, internal spacing, and corner radius follow the same progress with a quieter `1.45×` cap. The enlarged wide endpoint keeps at least five project cards visible. On narrow portrait viewports, the desktop offset, orbit cap, tall-screen group offset, and large-viewport scaling are removed, the intro inset follows the available window height, the cards use the reduced mobile endpoint on a lower orbit seat, and the pagination track remains anchored near the bottom of the studio window. The three regions must keep visible separation without borrowing space from the persistent Button Bar.

The development panel exposes two signed composition offsets after that responsive layout resolves: **Slider Y** moves the complete card orbit and its particle-field quiet band, while **Title group Y** moves the Work title and description as one unit. Both are authored in `dvh`, default to zero, and preserve the automatic responsive baseline when untouched.

The deck uses a fixed repeated-card pool rather than growing the DOM. Sustained wheel or trackpad input advances through rebased project coordinates indefinitely while a bounded target lead prevents an unbounded catch-up queue. A Portfolio-owned Canvas 2D field continuously draws three deterministic layers of solid circles behind the cards. It drifts slowly at rest, responds to signed measured deck velocity, and remains visible as a static composition under reduced motion.

The field has a soft horizontal quiet band centred on the effective responsive Orbit Y value. Its nine authored controls cover idle/fast opacity, quiet-band height/opacity, density, far/near circle size, motion response, and parallax depth. During route-in it paints one deterministic static composition without scheduling drift; movement resumes only after the route returns to idle. It clears or pauses while the route is hidden, drawer-open, explicitly suspended, or unmounted. It does not own the legacy `#c` canvas.

The visible project media is the shared handoff object. `project-handoff.js` measures the selected card media and animates its `left`, `top`, `width`, and `height` into the drawer hero geometry. Reversal, interruption, and reduced-motion paths must preserve ownership and focus.

There is no visible Portfolio physics pit or archived slider pipeline.

## Typography

Portfolio deliberately separates the route voice from the project-information voice.

- The deck intro and protected-project access title are route-entry headlines, so they use Instrument Serif through `.route-centered-page__title` and the shared headline tokens.
- The deck intro description uses the same Geist size, weight, leading, tracking, measure, colour, and quiet opacity as the Contact description.
- Portfolio card titles and the project-drawer title remain Geist. They identify work and support interaction, so they should retain the site's precise structural voice.
- Card labels and titles stay compact and media-led, supported by a broad low-contrast scrim. Cards do not cast an exterior shadow.
- Portfolio cards are the complete interaction target and do not carry a separate visible “View” pill.
- Do not make the drawer title serif merely to create continuity with the route intro. The contrast is the hierarchy: editorial arrival first, clear project information second.
- Instrument Serif may be considered later for an occasional pull quote or chapter opener inside a case study, but only as an explicitly art-directed exception.

## Ownership

- React route/window: `src/routes/portfolio/PortfolioRoute.jsx`
- Protected-project gate: `src/routes/portfolio/PortfolioGateRoute.jsx`
- Deck and route lifecycle: `src/legacy/modules/portfolio/app.js`
- Project data, asset paths, access defaults, and cached configuration loading: `src/legacy/modules/portfolio/portfolio-data.js`
- Route data/media prewarming and its audit diagnostics: `src/legacy/modules/portfolio/portfolio-prewarm.js`
- Stable selector and state-marker vocabulary: `src/legacy/modules/portfolio/portfolio-dom-contract.js`
- Persistent particle field: `src/legacy/modules/portfolio/portfolio-speed-field.js`
- Drawer: `project-drawer.js`
- Media handoff: `project-handoff.js`
- Project content/media: `public/config/contents-portfolio.json`
- Access storage and invite-code contract: `src/lib/access-gates.js`
- Content access validation: `scripts/check-portfolio-content.mjs`
- Authored controls: `public/config/design-system.json > portfolio`
- Generated runtime config: `public/config/portfolio-config.json`
- Styling: `public/css/portfolio.css`

## Entrance orchestration

Portfolio prepares its final title, description, field, card, and dial geometry before release. Direct loads hold those prepared states behind `#abs-boot-overlay`; SPA arrivals wait for the shell's `abs:portfolio:reveal` boundary. Both paths then follow `identity → context → action → support`: title at release, description at approximately `210ms`, active card at `300ms` with the existing `40ms` visual-order stagger, and dial at `360ms`. Deck input unlocks when the lead card starts to appear, independently of the remaining title and support animation. Ambient field and video motion still begin only after the entrance geometry settles. Reduced motion resolves the same final geometry immediately with a static field.

The shell remains the route-transition owner. The Portfolio runtime owns only its local material reveal, exposed in audit state as `preparing`, `entering`, or `complete` plus the release reason. Never add generic entrance transforms to the cards because that would replace their authored orbital transforms.

SPA arrivals use the normalized `portfolio.runtime.entrance` profile. Only the nearest visible permanent card instances receive stable visual ranks in the order centre, right one, left one, right two, left two. Opacity and media blur use those ranks; orbital transforms remain entirely runtime-owned. Completion follows the real visible-card and dial animation promises with a guarded timeout, so offscreen repeated copies cannot extend the global transition.

## Route prewarming and readiness

`preloadPortfolioRoute()` participates in the shell's document-scoped readiness registry and is used by initial data preparation, eligible background media preparation, Button Bar intent, and navigation. It may load Portfolio data and normalized configuration and decode only the five readiness-critical first-view thumbnail sources. It never constructs `PortfolioScrollApp`, mounts cards, starts the particle field, starts the orbital loop, plays video, opens access UI, or creates a project handoff.

The real route bootstrap reuses those exact decoded-image promises. Readiness-critical media is limited to the visible first-view posters/images or an existing fallback. Video playback and project-detail/lazy case-study media are explicitly outside the route-ready barrier. Failed image promises are released so route bootstrap can retry or install the existing fallback; no prewarm result is persisted across reloads.

`window.__ABS_PORTFOLIO_PREWARM__` is an audit-only snapshot of prewarm status and critical/ready source counts. It is output, never product or design truth.

During a route transition, the runtime may publish the first valid measured deck geometry as its readiness boundary because the Portfolio route participant then confirms that geometry across two painted frames before the shell begins route-in. Direct loads retain their self-contained two-pass geometry check.

## Stable DOM contract

`portfolio-dom-contract.js` is the explicit selector and state-marker boundary for CSS ownership work. M16 may consolidate existing CSS against that vocabulary, but it must not rename, duplicate, or move those nodes and markers. The frozen contract covers the route scene/frame/wall/canvas/title/top bar, deck mount/cards/labels, drawer host/view, and the load, entrance, input-release, media-ready, and active-project attributes. `check-portfolio-characterization.mjs` fails if that contract drifts. Permanently hidden project-tag lists are not card DOM. Card palette work is generation-gated after construction, so normal mount skips its duplicate pass; a shared palette event forces the required rerun.

## Project-triggered access gate

Portfolio always boots the full live deck on route entry, regardless of access storage. Each project explicitly declares `access: "public" | "protected"`; missing values fail closed at runtime and the content validator rejects missing or unsupported authored values.

Public projects open directly with the shared press-plus-soft-tail project sound. Opening a protected project without access plays only the ordinary press, freezes deck input and ambient media, stores one pending project identity/focus source inside `PortfolioScrollApp`, and opens `PortfolioGateRoute` in the shell-owned in-window overlay. The quieter opening tail, drawer, hero bridge, and open haptic wait until acceptance. Close, Escape, or backdrop dismissal clears the intent and restores the same card, field, video, and focus without replaying the route entrance.

The orbit emits one step click only when a distinct project reaches centre. It emits no continuous travel detents. The open project drawer uses the speed-responsive Scroll Crystal voice on vertical user scrolling and resets the voice before open, close, or programmatic scroll restoration.

A correct code uses the existing `abs_portfolio_ok` cookie/session contract. The gate closes completely, the deck returns to stable final geometry, and the runtime remeasures the selected card before invoking the existing drawer/handoff path. The grant applies to every protected project and survives reload. The URL and route history do not change.

The old `PortfolioGateScene` and same-route gate-success bridge are dormant compatibility/rollback surfaces, not production behavior. Do not restore them as the route-entry experience. This remains client-side access friction rather than secure authentication: the static deployment still ships code and media to the browser.

## Required verification

Use a fresh production build, then run the Portfolio gate in Chromium and WebKit, followed by the carousel, drawer, pointer, and project-transition audits. The gate audit covers public bypass, protected intent, invalid/valid code, exact-project continuation, Portfolio-wide persistence, reset, click/keyboard cancellation, focus, route interruption, reduced motion, desktop/mobile, and light/dark. The carousel audit must cover sustained traversal beyond ten project cycles in both directions, bounded lead and coordinates, fixed card and particle counts, rapid reversal, reduced motion, settlement, and active-field frame timing. The route-transition audit must also send real wheel input while the lead card is entering and before the title sequence completes. Run project/route transitions in Chromium and WebKit serially. Manually inspect entrance and gate screenshots for hierarchy, live-deck recognisability, stable card geometry, and Button Bar clearance.

The carousel audit is process-bounded by `ABS_PORTFOLIO_AUDIT_TIMEOUT_MS` (240000ms by default) and reports the active viewport/step on timeout so headless SwiftShader stalls cannot run indefinitely.
