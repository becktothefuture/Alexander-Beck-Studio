# Config files

- `default-config.json` — runtime settings for the homepage simulation (copied to `dist/config/default-config.json` + `dist/js/config.json`).
- `contents-home.json` — runtime copy for UI strings (copied to `dist/config/contents-home.json` + `dist/js/contents-home.json`).
- `portfolio-config.json` — carousel tuning (copied to `dist/config/portfolio-config.json` + `dist/js/portfolio-config.json`).
- `contents-portfolio.json` — portfolio projects (copied to `dist/config/contents-portfolio.json` + `dist/js/contents-portfolio.json`).

## Performance rollout keys (`default-config.json`)

- `featureRenderSchedulerEnabled`, `featureLazyModeLoadingEnabled`, `featureQualityTieringEnabled`, `featureCrittersNeighborCacheEnabled`: independent rollback toggles.
- `renderTargetFpsDesktop`, `renderTargetFpsMobile`, `renderTargetFpsReducedMotion`: scheduler FPS targets by device/motion context.
- `performanceModeEnabled`, `renderQualityTier`, `performanceHudEnabled`: quality profile + diagnostics controls.
- `modePerformanceBudgets`: per-mode object-count guardrails (`desktop`/`mobile`) applied before mobile/lite multipliers.
