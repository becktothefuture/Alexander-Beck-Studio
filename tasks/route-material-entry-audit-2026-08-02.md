# Route material entrance audit — 2026-08-02

## Scope

- Surface: shared-shell tab changes at 1280 × 900.
- Routes: Home, Work, About, Lab, and Contact.
- Method: Playwright continuous-RAF traces plus 70 ms frame captures in Chromium.
- Before evidence: `output/playwright/route-material-entry-before/` and `output/playwright/transition-flows/2026-08-02T20-21-18-795Z-chromium-1280x900-motion.json`.
- After evidence: `output/playwright/route-material-entry-final/`, `output/playwright/transition-flows/2026-08-02T21-44-35-931Z-chromium-1280x900-motion.json`, and `output/playwright/transition-flows/2026-08-02T21-44-00-413Z-webkit-1280x900-motion.json`.

## Logged defects

| Route | Visible defect | Cause |
| --- | --- | --- |
| Home | The first exposed destination frame already contained full-size circles. | The simulation grow ran during the covered loading phase, before the shell released route-in. A mounted development panel could also replay destructive control side effects and cancel a later grow. |
| Contact | The editorial text entered, then the ripple field appeared at full size in one frame. | The renderer treated route-in as a blocked transition phase, so it could not draw while the shell revealed the destination. |
| Lab | Nearby project tiles appeared at their final size. | The spatial project layer had no route-transition participant or material entrance state. |
| Work | Project cards appeared as complete objects. | The deck participant revealed opacity and blur only. Card geometry did not have an entrance scale. |
| About | The point field used a route-local hard-coded entrance and did not follow the shared timing controls. | The point-world renderer listened to the entrance event but owned fixed start and duration values. Its unavailable-WebGL fallback also had no explicit diagnostic settlement state. |
| Global | Motion could not be tuned as one system. | No canonical route-material timing contract or Parameterizer controls existed. |

## Orchestration contract

The shell remains the only owner of `route-out`, `route-loading`, `route-in`, and `idle`.

1. Destination material mounts while the loader fully covers the studio window.
2. The route participant prepares every material target at the configured start scale.
3. When the shell publishes `route-in`, the participant starts its delay, grow, and cascade.
4. Text and controls use the existing entrance sequence. Route-specific material uses a small adapter to the same global timing.
5. Completion, cancellation, rollback, and reduced motion always settle targets at scale 1.
6. A later tab visit creates a new transaction and repeats the prepare → enter → settle cycle.

## Shared controls

The Motion and Layers panel now includes **View Entrances**:

- Start Size: `materialStartScale` (0–50%).
- Grow Time: `materialDurationMs` (160–1600 ms in the panel).
- Cascade: `materialStaggerMs` (0–1000 ms).
- Start Delay: `materialDelayMs` (0–600 ms).

Live changes patch the active shell config and CSS variables. Save merges the same values into `shell.motion.routeTransition` in the canonical design system. The normal flatten step regenerates `shell-config.json`.

## Route adapters

- Home uses the indexed simulation visual-transition system. The legacy mode resets its 28 circles to 0. Route-backed Daily Focus modes use the same lifecycle; the Rift Rings audit reset and grew 1,136 runtime points.
- Contact applies the shared controller to every ripple body, ordered from the inner field to the outer field.
- Lab applies the shared controller to visible project tiles, ordered by distance from the viewport centre.
- Work composes a route entrance scale with the existing card press scale and uses the deck reveal rank for its cascade.
- About uses the global start, delay, duration, and easing for the WebGL point material. If WebGL is unavailable, the explicit ambient fallback settles as `fallback` instead of claiming a material animation ran.

## After-analysis

The continuous-RAF Chromium trace observed these route-in scale ranges:

| Route | Minimum | Maximum | Result |
| --- | ---: | ---: | --- |
| Contact | 0 | 1 | Progressive grow, 438 ripple bodies. |
| Lab | 0 | 1 | Progressive grow, visible project targets only. |
| Work | 0 | 1 | Progressive ranked card grow. |
| Home | 0 | 1 | Progressive indexed circle grow. |

A separate real-browser About sample observed `0.1846 → 0.7538 → 0.9247 → 0.9791 → 1.0000` during route-in. Headless Chromium can reject the WebGL adapter; the audit records that explicit fallback separately.

The existing transition-flow audit now records route-material state on every animation frame. For every available material adapter it fails if the route does not reset, show an intermediate scale, and settle at full size. Reduced motion must settle immediately.

## Verification

- Strict continuous-RAF transition flow passed in Chromium and WebKit at 1280 × 900 for Contact → Lab → Work → About → Home.
- Strict route-backed Home transition passed in Chromium with Rift Rings selected.
- Reduced-motion transition flow passed in Chromium with immediate material settlement.
- Contact passed desktop/mobile, light/dark, rapid interaction, SPA lifecycle, and live palette checks.
- Lab passed its full Chromium interaction and SPA lifecycle audit.
- Work passed its eight-viewport carousel, route-remount, interaction-stress, and reduced-motion audit.
