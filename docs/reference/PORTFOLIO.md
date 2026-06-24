# Portfolio Runtime

The portfolio route is a wall-contained **infinite project deck**. It reuses the shared wall frame and route chrome, but the visible project UI is DOM-driven: one active project card, two blurred depth cards behind it, controlled wheel/touch/keyboard snapping, and a full wall-contained project detail surface.

## Entry Points

- `react-app/app/src/routes/portfolio/PortfolioRoute.jsx`
- `react-app/app/src/templates/portfolio-body.html`
- `react-app/app/src/legacy/modules/portfolio/app.js`

## Layer stacking (drawer above chrome)

**Authoritative doc:** **`docs/reference/LAYER-STACKING.md`**. Mount `#portfolioProjectView` into **`#portfolio-sheet-host`**. In `StudioShell.jsx`, **`#portfolio-sheet-host` is inside `#abs-scene` and comes after `.fade-content`**, with **`z-index` 220 / 260** when open, so the drawer and backdrop sit **above** the route header row and footer. **Do not** mount the host only inside `#simulations` (cannot exceed `.fade-content`’s stacking).

## Project drawer scroll

Hero hint copy is **`(scroll please)`** (see `createProjectView()` in `app.js`). The drawer body scrolls with **native overflow** on **`.portfolio-project-view__scroll`** (no Lenis).

## Runtime Modules

- `react-app/app/src/legacy/modules/portfolio/app.js` bootstraps the route, loads project data, mounts the full project view, renders the infinite deck, controls active-card media playback/fallbacks, and handles card open/close behavior.
- `react-app/app/src/legacy/modules/portfolio/pit-mode.js` remains for archived/compatibility physics helpers. The visible portfolio route should not expose project balls.
- `react-app/app/src/legacy/modules/portfolio/portfolio-config.js` normalizes the authored portfolio config and applies portfolio CSS vars.
- `react-app/app/src/legacy/modules/portfolio/panel/` exposes the dev panel for body sizing, labeling, and motion.

## Data And Assets

- `react-app/app/public/config/contents-portfolio.json` remains the source of truth for projects, detail copy, links, tags, and media.
- `react-app/app/public/images/portfolio/` holds the hero/detail assets resolved by the portfolio runtime.

Card media selection uses `thumbnailVideo` / `video` only when explicitly present. Otherwise the card falls back to the project `image`. Detail content videos inside `contentBlocks` are not reused as card thumbnails because they may be generic or too dark for the deck preview.

## Config Model

Authored config lives in `react-app/app/public/config/design-system.json -> portfolio` and flattens to `react-app/app/public/config/portfolio-config.json`.

The active portfolio runtime groups are:

- `cssVars`: page/header/hero presentation values
- `runtime.layout`: spawn spacing and header offsets
- `runtime.bodies`: min/max diameter fractions vs √(inner pit area), block geometry
- `runtime.labeling`: title fit bounds and block rotation range
- `runtime.motion`: open timing and deck snapping values
- `runtime.behavior`: passive mouse reaction toggle and reduced-motion timing

## Infinite Deck Contract

- Desktop shows one centered horizontal card and two rear depth cards behind it.
- Mobile shows one centered vertical card with the image on top and two rear depth cards behind it.
- Cards use unique per-project material colors from the active ball palette. `getPortfolioProjectPaletteColor()` reads `colorDistribution` first, preserves that order, dedupes resolved colors, then uses remaining unique palette slots before generated fallbacks. With the current six projects, the live deck uses palette indices `0, 3, 2, 6, 7, 5` with no repeated backgrounds.
- Closed-card ink is computed from contrast against the assigned card background. Do not let per-project content override `--portfolio-card-ink` on closed deck cards; dark/light ink must be chosen by contrast ratio.
- Wheel, touch, and arrow keys are controlled by the deck controller, not native document scrolling, so the project list wraps infinitely. Larger wheel/touch gestures may queue multiple soft card advances before settling.
- Closed cards show client, title, media, and at most three tags. Detail summaries stay in the opened project surface.
- Deck motion is a closed-loop conveyor in perspective: visible cards advance along one continuous path through the stack, the front card continues past the front edge while fading/blurring, and hidden wrap/rejoin occurs only after opacity reaches zero.
- The outgoing card reappears from the deepest rear pose. It must not visibly reverse direction or travel backward through the stack.
- Deck tuning lives under `runtime.deck`: `exitTravelPx`, `exitFadeStart`, `exitFadeEnd`, `wrapDepthPx`, `reappearStart`, `reappearFade`, and `exitScale` control the closed-loop exit and hidden wrap.
- Open project views mount in `#portfolio-sheet-host`, cover route chrome, and must remove the host's `aria-hidden` while open.

## Archived Slider

The previous slider implementation is archived and no longer used in the live route:

- `react-app/app/src/legacy/modules/portfolio/archive/slider-v1/app.js`
- `react-app/app/public/css/archive/portfolio-slider-v1.css`
- `docs/archive/portfolio-slider-v1.md`
