# PRD 01: Mobile Compositor Budget

## Introduction

Restore mobile frame headroom by removing nonessential full-frame compositing effects while preserving the desktop finish and all simulation behavior.

## Goals

- Eliminate the regression introduced after `7e111d14` on mobile.
- Preserve the window, palette, title, controls, simulation geometry, and desktop film.
- Make all 17 Daily simulations measurable with WebKit/iPhone emulation.

## User Stories

### US-01: Smooth mobile simulations

As a mobile visitor, I want simulation motion to take priority over subtle film and blur effects.

Acceptance criteria:

- Mobile/coarse input does not render the treated-glass film.
- Mobile/coarse input does not animate the full-frame grain texture.
- The mobile simulation chooser uses an opaque static ground without backdrop capture.
- Desktop treatment remains unchanged.

### US-02: Repeatable evidence

As a maintainer, I want a complete WebKit/iPhone audit so regressions are ranked rather than guessed.

Acceptance criteria:

- The audit covers every `daily-rotation` catalogue entry.
- Browser, device, origin, commit, FPS percentiles, long gaps, resolved DPR/count, errors, and caveat are written to JSON.
- The browser can be selected with `ABS_BROWSER=webkit|chromium`.

## Functional Requirements

1. Use `display: none` for the mobile film so descendants cannot retain compositor work.
2. Stop the mobile noise animation and hide its generated paint surface.
3. Remove mobile chooser `backdrop-filter` while retaining legibility.
4. Do not alter desktop film/noise configuration.
5. Do not alter wall/frame geometry or simulation physics.
6. Verify all 17 Daily simulations with zero page errors.

## Non-goals

- Individual mode physics changes.
- Desktop visual redesign.
- Treating emulation as physical-iPhone proof.

## Success Metrics

- Two proof points: complete before/after WebKit matrix; mobile light/dark plus desktop screenshots and computed-style checks.
- No mode falls below the runtime 60 FPS target in the repeatable audit.
- No canvas sizing, route, or console-error regression.

## Open Questions

- Physical iPhone Safari remains the release truth for the original 15 FPS report.
