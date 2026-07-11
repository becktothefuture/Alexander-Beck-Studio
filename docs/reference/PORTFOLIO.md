# Portfolio Runtime

The portfolio route is a wall-contained **orbital project carousel**. It reuses the shared wall frame and route chrome, but the visible project UI is DOM-driven: one active centered project card, repeated bounded side cards around an implied offscreen circle, multi-axis wheel/drag/keyboard snapping, a lower dot dial, and an in-window project detail surface.

## Entry Points

- `react-app/app/src/routes/portfolio/PortfolioRoute.jsx`
- `react-app/app/src/legacy/modules/portfolio/app.js`

Retained parity surface:

- `react-app/app/src/pages/PortfolioPage.jsx`
- `react-app/app/src/templates/portfolio-body.html`

`PortfolioPage.jsx` is not wired into the active `SiteApp` route entries today. It imports `templates/portfolio-body.html?raw` for a possible future standalone split and for fragment validation coverage. Keep the retained template aligned with the route topbar contract and canonical copy, but do not treat it as an active production entry point unless routing is deliberately changed.

## Layer Stacking And Open Detail

Project detail opens inside the portfolio window and must leave the bottom dock/buttons visible. `#portfolioProjectView` still mounts in `#portfolio-sheet-host`, but the host is sized to the inner wall area above the bottom button band. Opening a project removes the host's `aria-hidden`, makes the carousel stage inert, and does not inert `#app-frame`; this preserves dock visibility and pointer access while the detail scroll/focus trap remains active.

`docs/reference/LAYER-STACKING.md` remains the z-index source for the host relationship to `.fade-content` and `#quote-viewport-host`, but this portfolio contract supersedes older notes that said the project drawer covers all route chrome.

## Project drawer scroll

Hero hint copy is **`(scroll please)`** (see `createProjectView()` in `app.js`). The drawer body scrolls with **native overflow** on **`.portfolio-project-view__scroll`** (no Lenis).

## Runtime Modules

- `react-app/app/src/legacy/modules/portfolio/app.js` bootstraps the route, loads project data, mounts the full project view, renders the bounded orbital carousel, controls active-card media playback/fallbacks, and handles card open/close behavior.
- `react-app/app/src/legacy/modules/portfolio/pit-mode.js` remains for archived/compatibility physics helpers. The visible portfolio route should not expose project balls.
- `react-app/app/src/legacy/modules/portfolio/portfolio-config.js` normalizes the authored portfolio config and applies portfolio CSS vars.
- `react-app/app/src/legacy/modules/portfolio/panel/` exposes the dev panel for carousel geometry, body sizing, labeling, and motion.

## Data And Assets

- `react-app/app/public/config/contents-portfolio.json` remains the source of truth for projects, detail copy, links, tags, and media.
- `react-app/app/public/images/portfolio/` holds the hero/detail assets resolved by the portfolio runtime.

Card media selection uses static `image` first. Optional `thumbnailVideo` / `video` may be attached only for the active visual card and is disabled by reduced motion. Inactive and duplicate virtual card instances render static image/poster surfaces only. Detail content videos inside `contentBlocks` are not reused as card thumbnails because they may be generic or too dark for the carousel preview.

Closed-card color uses optional project `thumbnailAccent` first, then the deterministic project palette fallback. Optional `thumbnailPosition` and `thumbnailFocalPoint` control image crop without changing the detail media.

## Config Model

Authored config lives in `react-app/app/public/config/design-system.json -> portfolio` and flattens to `react-app/app/public/config/portfolio-config.json`.

The active portfolio runtime groups are:

- `cssVars`: page/header/hero presentation values
- `runtime.layout`: spawn spacing and header offsets
- `runtime.bodies`: min/max diameter fractions vs √(inner pit area), block geometry
- `runtime.labeling`: title fit bounds and block rotation range
- `runtime.motion`: open timing and legacy physics values
- `runtime.carousel`: card size, path radius, spacing, side rotation, dot dial, bounded pool size, input sensitivity, and snap/follow values
- `runtime.behavior`: passive mouse reaction toggle and reduced-motion timing

## Orbital Carousel Contract

- Desktop shows one centered active portrait card, clear rotated side cards, and clipped edge peeks along a shared circular path.
- Mobile shows one dominant active card with adjacent peeks; card height is aspect-ratio driven so it does not collide with the bottom dock.
- The visual sequence is a bounded virtual card pool. Each rendered card carries canonical `data-project-index` and `data-project-id`; only the active centered instance is focusable/openable.
- Wheel `deltaX` and `deltaY`, pointer drag, touch drag, arrow keys, inactive-card click-to-center, and active-card click-to-open all feed the same continuous carousel position.
- Wheel `deltaMode` is normalized. Diagonal wheel/drag input uses the stronger axis.
- Closed cards render client, title, image, and active-only `View` CTA. Tags remain in project data but do not render on closed cards.
- The lower dot dial is visual/status-only and `aria-hidden`; it tracks fractional carousel progress without adding tab stops.
- Carousel tuning lives under `runtime.carousel`. `runtime.deck` may be read only as a compatibility fallback and should not receive new saved controls.
- The card-to-project open handoff uses one-time rect reads followed by transform-based ghost animation; hot animation must not animate `left`, `top`, `width`, or `height`.

## Archived Slider

The previous slider implementation is archived and no longer used in the live route:

- `react-app/app/src/legacy/modules/portfolio/archive/slider-v1/app.js`
- `react-app/app/public/css/archive/portfolio-slider-v1.css`
- `docs/archive/portfolio-slider-v1.md`
