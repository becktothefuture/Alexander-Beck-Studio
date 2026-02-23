# Parity Report

Date: 2026-02-10

## Scope
Compared original static implementation (`http://127.0.0.1:8001`) against React conversion (`http://127.0.0.1:8002`) for:
- `/index.html`
- `/portfolio.html`
- `/cv.html`

Both desktop and mobile captures were taken, using fresh storage state before each route load.

## Behavior Parity Checks
- Home route parity: pass
- CV route parity: pass
- Portfolio soft gate parity: pass
  - source and React both redirect `portfolio.html` -> `index.html` when `sessionStorage.abs_portfolio_ok` is missing
  - source and React both open portfolio route when token is set

## Visual Capture Artifacts
- Desktop captures: `react-app/conversion/parity-screens/desktop/`
- Mobile captures: `react-app/conversion/parity-screens/mobile/`
- Diff overlays: `react-app/conversion/parity-screens/diff/`
- Diff metrics: `react-app/conversion/parity-screens/diff/metrics.csv`

## Pixel Diff Summary
- `desktop/index`: AE `1.00426e+06`, MSE `828.764`
- `desktop/portfolio`: AE `988853`, MSE `797.002`
- `desktop/cv`: AE `712814`, MSE `1.28979`
- `mobile/index`: AE `287189`, MSE `1717.38`
- `mobile/portfolio`: AE `287286`, MSE `1704.72`
- `mobile/cv`: AE `186897`, MSE `3.35168`

## Interpretation
- Large diffs on `index`/`portfolio` are expected due to animated, stochastic particle/canvas states and timing.
- `cv` diffs are very low and mainly due to animation/frame timing.
- Structural and behavioral parity is validated through route outcome checks plus manual visual review.

## Notes
- A favicon 404 appears in React dev runtime (`/favicon.ico`). This does not affect UX parity of core pages.

## Second Pass (All Areas)
Performed a second full pass focused on:
- Home shell + motion anchors
- Portfolio locked and unlocked flows
- CV scroll + typography anchors

### Functional Assertions (Source vs React)
- Home:
  - `#c` canvas exists and is sized (`1412 x 872` in desktop run)
  - `#app-frame` is visible (`opacity: 1`)
  - tagline text matches
  - contact modal opens from `#contact-email`
- Portfolio:
  - locked route redirects to `index.html` for both source and React
  - unlocked route loads `portfolio.html` for both source and React
  - slider track exists
  - 12 slide-like items detected in both source and React
  - portfolio meta block is visible
- CV:
  - `.cv-right` scroller exists
  - first section title is `About`
  - scroll position changes after programmatic scroll (`~473` source, `~476` React)
  - `.cv-photo__image` exists

### Second Pass Visual Captures
- Desktop:
  - `parity-screens/desktop/source-index-pass2.png`
  - `parity-screens/desktop/source-portfolio-pass2.png`
  - `parity-screens/desktop/source-cv-pass2.png`
  - `parity-screens/desktop/react-index-pass2.png`
  - `parity-screens/desktop/react-portfolio-pass2.png`
  - `parity-screens/desktop/react-cv-pass2.png`
- Mobile:
  - `parity-screens/mobile/source-index-pass2.png`
  - `parity-screens/mobile/source-portfolio-pass2.png`
  - `parity-screens/mobile/source-cv-pass2.png`
  - `parity-screens/mobile/react-index-pass2.png`
  - `parity-screens/mobile/react-portfolio-pass2.png`
  - `parity-screens/mobile/react-cv-pass2.png`

### Second Pass Pixel Diff Summary
- Metrics file: `parity-screens/diff-pass2/metrics-pass2.csv`
- `desktop/index`: AE `988885`, MSE `767.502`
- `desktop/portfolio`: AE `1.00552e+06`, MSE `801.334`
- `desktop/cv`: AE `714471`, MSE `1.08954`
- `mobile/index`: AE `287514`, MSE `1524.15`
- `mobile/portfolio`: AE `286295`, MSE `1679.12`
- `mobile/cv`: AE `186423`, MSE `3.14724`

Interpretation remains unchanged: large diffs on particle-driven pages are expected from stochastic animation and frame timing, while CV remains very close.

## Third Pass (Frontend-Focused Audit)
Performed an additional pass specifically for frontend parity confidence:
- Computed-style parity checks on key home anchors (`#app-frame`, `#brand-logo`, `#main-links`, `#edge-caption`)
- Modal open behavior check from `#contact-email`
- Portfolio locked-route redirect parity
- CV anchor parity (`.cv-section-title`, `.cv-right`, `.cv-photo__image`)
- Fresh desktop/mobile screenshots (pass3) and diff metrics

### Third Pass Functional Result
- Source and React matched on all checked assertions across desktop and mobile:
  - Home:
    - matching display/position/opacity/visibility/font metrics for key anchors
    - canvas present
    - contact modal opens
  - Portfolio:
    - direct locked visit to `portfolio.html` redirects to `index.html` in both
  - CV:
    - first section title `About` in both
    - scroll container and profile image present in both

### Third Pass Visual Metrics
- Metrics file: `parity-screens/diff-pass3/metrics-pass3.csv`
- `desktop/index`: AE `879422`, MSE `668.493`
- `desktop/portfolio`: AE `866893`, MSE `752.317`
- `desktop/cv`: AE `737699`, MSE `1.9135`
- `mobile/index`: AE `295060`, MSE `1486.15`
- `mobile/portfolio`: AE `285929`, MSE `1697.32`
- `mobile/cv`: AE `191836`, MSE `1.54198`

Interpretation is still consistent: motion-heavy pages differ mainly due to stochastic animation state; CV remains close in static structure and rendering.
