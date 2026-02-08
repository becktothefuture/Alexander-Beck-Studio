# Simulation Performance Rollout Notes

Date: 2026-02-07

## Shipped controls

- Configurable render scheduler target FPS (`renderTargetFpsDesktop`, `renderTargetFpsMobile`, `renderTargetFpsReducedMotion`)
- Daily-mode-first lazy loading for mode modules (dynamic import + cache)
- Dev-only performance HUD (FPS, target, frame ms, throttle, long-frame counters)
- Critters neighbor-cache optimization (single neighbor collection per frame-step)
- Deterministic render quality guardrails (depth wash + wall gradient + overlay gating)
- Per-mode object-count budgets (`modePerformanceBudgets`)

## Independent rollback toggles

Set these keys in `source/config/default-config.json` (or runtime config source) and rebuild:

- `featureRenderSchedulerEnabled: false`
- `featureLazyModeLoadingEnabled: false`
- `featureQualityTieringEnabled: false`
- `featureCrittersNeighborCacheEnabled: false`

## Known risks

- Async mode loading introduces short initialization gaps if a mode chunk cold-loads slowly.
- Aggressive low-tier quality can reduce visual richness during sustained heavy load.
- Any custom debug tooling depending on fixed 60 FPS assumptions should be updated.
