# System Impact Map

## Goal

Replace the current stacked portfolio deck presentation with a high-performance orbital carousel that reads as a large circular dial of repeated project cards. The center card is always the active project, scroll and drag can move the dial on either axis, and opening a project makes the selected card feel like it expands into the existing full project view.

## Primary Affected Files

- `react-app/app/src/legacy/modules/portfolio/app.js`
  - Deck rendering, input handling, card pose calculation, active index, video playback, open ghost.
- `react-app/app/public/css/portfolio.css`
  - Carousel layout, card aspect, card overlays, CTA visibility, dot dial, light/dark background adaptation, responsive breakpoints.
- `react-app/app/src/legacy/modules/portfolio/panel/control-registry.js`
  - New parent configuration category and controls.
- `react-app/app/src/legacy/modules/portfolio/portfolio-config.js`
  - Default runtime config normalization for new carousel values.
- `react-app/app/public/config/design-system.json`
  - Canonical authored values.
- `react-app/app/public/config/contents-portfolio.json`
  - Optional metadata additions for thumbnail crop/color/video readiness.
- `react-app/app/src/legacy/modules/portfolio/project-drawer.js`
  - Hero/open-state alignment and title/image reveal behavior.
- `docs/reference/PORTFOLIO.md`
  - Contract update after implementation.

## Secondary Affected Files

- `react-app/app/src/legacy/modules/visual/page-departure.js`
- `react-app/app/src/legacy/modules/audio/sound-engine.js`
- `scripts/audit-*.mjs` portfolio, transition, screenshot, and drawer audits.
- `docs/reference/LAYER-STACKING.md` only if stacking requirements change. Expected: no change.

## Existing Contracts To Preserve

- Portfolio detail opens inside the portfolio window and leaves the bottom dock/buttons visible.
- Portfolio content remains runtime-loaded from `contents-portfolio.json`.
- Existing `thumbnailVideo` / `video` support remains video-ready, but static thumbnails are the initial target.
- Reduced motion must provide direct snapping and a non-elaborate open.
- Keyboard access must still allow previous/next and opening the active project.
- Project details continue to scroll natively inside the drawer.

## Design Decisions

- The carousel is not native document scrolling. Wheel, trackpad, touch, and pointer drag feed a continuous carousel position that settles to an integer project index.
- Both `deltaX` and `deltaY` should advance the same carousel, with the stronger axis or combined signed delta used consistently.
- The visible sequence repeats projects through a bounded virtual card pool. Each rendered instance must carry canonical `data-project-index` / `data-project-id`; only one active instance is focusable and interactive, while duplicate/inactive instances are inert or `aria-hidden` as appropriate.
- The bottom dot dial is decorative/status, not a pagination control in the first pass. It is generated from a configurable density model, tracks fractional carousel progress visually, and is `aria-hidden`.
- Card tags remain in data and accessibility metadata, but closed cards render client, title, thumbnail, and active-card CTA only.
- Thumbnail color can be authored per project first; automatic image sampling is optional only if it is cheap, cached, and stable.
- The open transition should build on the existing ghost/card clone and project drawer, not introduce a second drawer implementation.
- New persisted config belongs under `portfolio.runtime.carousel`. Existing `runtime.deck` values may be read for backward compatibility during migration, but new controls save to `runtime.carousel`.

## High-Risk Areas

- Scroll feel: must feel natural and not like page scroll is trapped without feedback.
- Performance: card transforms should stay compositor-friendly; no per-frame layout reads; no unbounded DOM repetition.
- Safari compatibility: avoid relying only on unsupported View Transitions behavior. WAAPI/CSS transforms plus fallback are preferred.
- Mobile input: vertical drag must feel good without accidental project opening.
- Art direction: proportions must match the reference more than the current deck: top title band, middle card orbit, bottom dot dial.
- Config parity: new controls must not become live-only panel state.

## Open Technical Questions For Implementation

- Whether the top title comes from current home/portfolio intro text or a new portfolio-specific content field.
- Whether each project receives an authored `thumbnailAccent` value in content or derives it from an asset-processing script.
- Whether the initial orbit should render 9, 11, or 13 virtual card instances for desktop to cover edge peeks while staying cheap.
