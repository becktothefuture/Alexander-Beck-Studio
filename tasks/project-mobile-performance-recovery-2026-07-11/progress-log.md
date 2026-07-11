# Progress Log

## Baseline — 2026-07-11

- Status: complete
- Commit tested: `794477e6`
- Production origin: `https://www.beck.fyi`
- Browser/device: Playwright WebKit, iPhone 13 profile
- Coverage: 17/17 Daily simulations, 0 errors
- Band: 70.60–72.03 rAF FPS; lowest `flubber-blob`, highest `flock-of-birds`
- Caveat: desktop-hosted headless WebKit does not reproduce physical iPhone GPU/thermal limits or the reported 15 FPS.
- Archaeology: `fe703363` introduced the only post-known-good Home rendering feature: a full-frame film with oversized soft-light and screen blend surfaces.

## PRD 01

- Status: verified
- Proof 1: 17/17 WebKit/iPhone simulations, 0 errors. Mean rAF improved from 71.87 to 71.97 FPS and the worst isolated gap reduced from 54 ms to 40 ms. The runner confirmed mobile film/noise are `display:none` and chooser backdrop is `none`.
- Proof 2: settled light/dark Sphere screenshots preserve the window, title depth, palette, controls, and Button Bar. Desktop computed styles remain film `display:block`, opacity `0.24`, noise `display:block`, and chooser blur `18px`.
- Canonical gate: `npm run check:site` passed.
- Caveat: proof is a relative WebKit guard; physical iPhone validation is still required for the reported 15 FPS.

## PRD 02

- Status: pending

## PRD 03

- Status: pending
