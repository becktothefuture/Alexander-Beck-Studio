# Simulation Performance Baseline

Date: 2026-02-07  
Build: current branch (post-rollout instrumentation)

## Collection method

- Open homepage in dev mode (`npm run dev`, port `8001`)
- Use dev HUD (`FPS / target / frame ms / throttle / long-frame counts`)
- Record values after 60s idle + 30s active pointer interaction
- Run desktop and mobile viewport presets

## Metrics (per mode)

| Mode | Viewport | Avg FPS | 1% Low FPS | Avg Frame ms | Long Frames >16.67ms | Long Frames >8.33ms | Notes |
|------|----------|---------|------------|--------------|----------------------|---------------------|-------|
| pit | desktop | TBD | TBD | TBD | TBD | TBD | |
| flies | desktop | TBD | TBD | TBD | TBD | TBD | |
| weightless | desktop | TBD | TBD | TBD | TBD | TBD | |
| water | desktop | TBD | TBD | TBD | TBD | TBD | |
| magnetic | desktop | TBD | TBD | TBD | TBD | TBD | |
| bubbles | desktop | TBD | TBD | TBD | TBD | TBD | |
| kaleidoscope-3 | desktop | TBD | TBD | TBD | TBD | TBD | |
| critters | desktop | TBD | TBD | TBD | TBD | TBD | |
| parallax-float | desktop | TBD | TBD | TBD | TBD | TBD | |
| 3d-sphere | desktop | TBD | TBD | TBD | TBD | TBD | |
| 3d-cube | desktop | TBD | TBD | TBD | TBD | TBD | |
| starfield-3d | desktop | TBD | TBD | TBD | TBD | TBD | |
| elastic-center | desktop | TBD | TBD | TBD | TBD | TBD | |
| particle-fountain | desktop | TBD | TBD | TBD | TBD | TBD | |

## Notes

- Scheduler target FPS is now runtime-configurable (`renderTargetFpsDesktop`, `renderTargetFpsMobile`).
- Long-frame counters are emitted continuously by runtime telemetry.
