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

## Wall layer toggles (`default-config.json`)

- `outerWallShineEnabled`: enables/disables outer wall shine layer.
- `innerWallShineEnabled`: enables/disables inner wall shine layer.
- `wallSpecularEnabled`: enables/disables outer wall specular micro-highlight.
- `wallLightFluctuationEnabled`: enables/disables ambient wall light fluctuation animation.

## Noise blend deprecation

- `noiseBlendMode` is deprecated and treated as a no-op.
- Noise compositing now always uses normal blend mode.
