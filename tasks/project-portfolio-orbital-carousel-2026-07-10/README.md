# Portfolio Orbital Carousel PRD Packet

Created: 2026-07-10

This packet plans the new Portfolio carousel before implementation. The target is the Figma/reference direction supplied by the user: a wall-contained circular/infinite project carousel with repeated cards around an implied dial, vertical and horizontal scroll/drag input, a center-locked active project, top title band, bottom dot dial, thumbnail-driven card gradients, and a card-to-full-project opening transition.

## Source Material

- Figma file: `Alexander Beck Studio - Brand`
  - Original requested node `293:910` is now stale/not present in metadata.
  - Original requested node `293:850` is current and maps to `ABS/Portfolio/Project Card / Active`.
  - Current closed composition source: `304:2504`.
  - Current expansion storyboard source: `304:3048`.
  - Current desktop open/detail mock: `293:983`.
- Attached visual references:
  - `references/portfolio-carousel-reference.png`
  - `references/portfolio-open-reference.png`
- Current Figma captures:
  - `references/figma-active-card-293-850.png`
  - `references/figma-current-closed-304-2504.png`
  - `references/figma-current-open-293-983.png`
  - `references/figma-preview-expansion-304-3048.png`

Figma MCP was rate-limited during packet creation. On 2026-07-11 the app Figma connector successfully fetched current metadata and screenshots; see `figma-findings-2026-07-11.md`.

## Current Architecture Baseline

- Active route: `react-app/app/src/routes/portfolio/PortfolioRoute.jsx`
- Active runtime: `react-app/app/src/legacy/modules/portfolio/app.js`
- Active stylesheet: `react-app/app/public/css/portfolio.css`
- Content source: `react-app/app/public/config/contents-portfolio.json`
- Canonical authored config: `react-app/app/public/config/design-system.json -> portfolio`
- Generated config: `react-app/app/public/config/portfolio-config.json`
- Open detail host/behavior must be revised from the old `#portfolio-sheet-host` full-chrome overlay contract: project detail opens inside the portfolio window and leaves the bottom dock visible.
- Existing reference implementation: `react-app/app/src/legacy/modules/portfolio/archive/slider-v1/app.js`

## Documents

- `system-impact-map.md` - affected systems, risks, and architecture decisions.
- `action-sequence.md` - dependency-aware implementation order and gates.
- `progress-log.md` - working status log.
- `figma-findings-2026-07-11.md` - current Figma node map, screenshots, and implementation implications.
- `implementation-prompt.md` - paste-ready prompt for actioning the full PRD packet.
- `prd-01-orbital-deck-geometry-and-input.md`
- `prd-02-card-visual-composition-and-responsive-layout.md`
- `prd-03-content-media-and-thumbnail-color-contract.md`
- `prd-04-carousel-configuration-and-dev-panel.md`
- `prd-05-card-to-project-open-transition.md`
- `prd-06-verification-performance-and-art-direction-gates.md`

## Working Rules

- Do not implement from this packet until the PRDs are reviewed and accepted.
- Keep the bottom dock/buttons visible at all times; project detail opens inside the portfolio window, not over the dock.
- Keep portfolio content in `contents-portfolio.json` unless a separate migration is approved.
- Keep tags as metadata only in the new closed-card carousel; do not render tag chips on cards.
- Keep video support in the model, but use static images for the first implementation pass.
- Persist new carousel controls under `portfolio.runtime.carousel`; read legacy `runtime.deck` values only as compatibility fallbacks.
- Any config control is complete only when it applies live, saves to `design-system.json`, and flattens to generated config.
- Verify visually in browser on desktop and mobile. Inspect screenshots, not only command output.

## Subagent Plan

Use a shallow swarm:

- Architecture mapper: current deck/drawer/input/config impact.
- Motion and performance engineer: scroll/drag, snap, infinite loop, video-readiness.
- Art director/digital creative: Figma intent, proportions, type scale, card CTA, light/dark fit.
- QA reviewer: browser audits, transition gates, Safari/WebKit and mobile risk.

The lead agent owns final integration and validation. Subagents may review and map; write scopes should remain with the lead unless a later implementation phase deliberately splits disjoint files.
