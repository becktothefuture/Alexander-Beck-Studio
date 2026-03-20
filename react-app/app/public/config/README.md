# Config files

## Canonical source

- `design-system.json` — the only authored design config source.

## Generated design outputs

- `default-config.json` — generated runtime settings for the homepage simulation.
- `shell-config.json` — generated shared shell/surface/layout settings.
- `portfolio-config.json` — generated portfolio-specific tuning.
- `cv-config.json` — generated CV-specific tuning.

These generated files exist for runtime compatibility and build output. Do not treat them as the primary source of truth.

## Content files

- `contents-home.json` — runtime copy for UI strings (copied to `dist/config/contents-home.json` + `dist/js/contents-home.json`).
- `contents-portfolio.json` — portfolio projects (copied to `dist/config/contents-portfolio.json` + `dist/js/contents-portfolio.json`).
- Do not add a parallel `portfolio-data.json` content source. `contents-portfolio.json` is the only live portfolio content file.

## Workflow

- Save design changes through the canonical `design-system.json` flow.
- Run builds from the repo root, not only from `react-app/app`, so `flatten:design-config` always runs before `vite build`.
- A design control is only complete when it supports:
  - live apply in dev
  - canonical save into `design-system.json`
  - flattening into the generated config files used by build/preview
- Shared finish such as light edge, wall atmosphere, quote treatment, and edge-caption spacing should land in `shell`, not be duplicated as separate page-local truths.
- Page-local config should own layout, composition, and page-specific motion. It should not redefine the global shell/material system unless there is a deliberate exception.
- If a control is removed from the visible panel, also remove or bypass its persistence path if it should no longer affect saved config.

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
