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

- Status: verified
- Proof 1: settled Sphere title layout reads fell from 720 to 24 over three seconds (96.7% reduction); Ball Field records 12 reads. Mobile resolves the balanced tier and confirms the contrast veil is skipped.
- Proof 2: 17/17 WebKit/iPhone simulations passed with 0 errors, 71.67–72.07 rAF FPS, p95 16 ms. Sphere retained 84 points, DPR 1.25, and an even behind/front title partition; settled screenshot preserves title depth and circular body visuals.
- Canonical gate: `npm run check:site` passed before the final cache-condition correction; scoped lint and build rerun after it.

## PRD 03

- Status: verified
- Proof 1: deterministic mobile cost reductions: Flock warmup 168 → 0 frames and resize-owned layout sync; Flock/Mineral DPR 1.50 → 1.15; Soft Blob contact work 18 → 3 passes; Bubble Lift generic collision passes 4 → 0. Desktop branches are unchanged.
- Proof 2: 17/17 WebKit/iPhone simulations passed with 0 errors, 71.67–72.07 rAF FPS, p95 15–16 ms. Visual/touch checks preserved 77 birds, 62 Mineral bodies during growth, 52 connected Blob beads, 120 rising bubbles, title composition, and Button Bar clearance.
- Canonical gate: `npm run check:site` passed.
