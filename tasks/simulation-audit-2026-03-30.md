# Simulation Audit: 2026-03-30

## Scope

- Verified the home-route simulation suite in dev at `http://127.0.0.1:8012/`
- Verified the built preview at `http://127.0.0.1:8013/`
- Captured desktop and mobile screenshots to `output/playwright/mode-audit/2026-03-30/`
- Mouse interaction was exercised in each mode before capture

## Verification Method

1. Build from repo root with `npm run build`
2. Sweep every home-route mode on desktop (`1440x1000`)
3. Sweep every home-route mode on mobile (`390x844`)
4. Capture mode screenshots after pointer movement
5. Spot-check the visual outliers with direct screenshots

## Observed Counts

| Mode | Desktop | Mobile | Notes |
| --- | ---: | ---: | --- |
| `pit` | 300 | 163 | Shared baseline radius family |
| `flies` | 60 | 60 | Stable |
| `3d-cube` | 108 | 108 | Size now reads closer to baseline |
| `water` | 300 | 222 | Still one of the heavier mobile modes |
| `3d-sphere` | 140 | 140 | Size control now actually applies |
| `elastic-center` | 240 | 150 | Ring remains readable behind hero content |
| `kaleidoscope-3` | 180 | 72 | Desktop denser than before; mobile reduced for readability |
| `bubbles` | 200 | 180 | Expected radius variance |
| `magnetic` | 180 | 140 | Stable |
| `weightless` | 43 | 43 | Stable |
| `critters` | 90 | 90 | Stable |
| `starfield-3d` | 200 expected | 150 expected | Mode bypasses `g.balls`; visual spot-check used |
| `parallax-float` | 315 | 160 | Reduced from prior 980-point load |
| `particle-fountain` | ~94 active | ~96 active | Dynamic emission, not a fixed-count mode |

## Findings

- Cross-mode dot size is materially more coherent now. `3d-sphere`, `3d-cube`, and `starfield-3d` no longer read as obvious large-object outliers against the shared site dots.
- `starfield-3d` now reads as a lighter depth field instead of oversized marbles. Near stars still feel closer than far stars, but the spread no longer dominates the hero.
- `parallax-float` was the biggest performance issue before this pass. It now uses a total-point budget and is down to `315` dots on desktop and `160` on mobile.
- `kaleidoscope-3` is intentionally denser now. Desktop improved in the intended direction. Mobile needed extra guardrails, so the mobile budget was reduced and the dot size trimmed.
- `water` is still a follow-up candidate on mobile because it remains one of the heaviest modes in the audit.

## Mode-Specific Notes

- `starfield-3d`
  - Size normalized by reducing the base radius formula and restoring mild depth-based size variation.
  - Mobile spot-check passed: hero text remains parseable.
- `3d-sphere`
  - The mode was ignoring `sphere3dDotSizeMul` and effectively hardcoding oversized dots.
  - That bug is fixed.
- `3d-cube`
  - Perspective size exaggeration was reduced so front dots no longer feel disconnected from the rest of the system.
- `parallax-float`
  - The prior `14 × 10 × 7` fallback grid created a `980` point cloud.
  - The mode now scales its grid dimensions to a total count budget instead of only reducing each axis independently.
- `kaleidoscope-3`
  - Density was tightened by shrinking the spawn field and increasing desktop count.
  - Mobile readability still needs to be watched in future tuning; this remains the busiest mode visually.

## Follow-Up Opportunities

1. `Water` mobile density/performance rebalance
   - Outcome: bring mobile load down closer to the other premium modes without making water feel empty.
2. `Kaleidoscope` readability pass
   - Outcome: preserve the denser bloom while improving hero-title legibility on mobile.
3. `Particle Fountain` active-particle budget documentation
   - Outcome: define a clearer expected steady-state count so future perf checks are less ambiguous.

## Artifacts

- Desktop screenshots: `output/playwright/mode-audit/2026-03-30/desktop/`
- Mobile screenshots: `output/playwright/mode-audit/2026-03-30/mobile/`
