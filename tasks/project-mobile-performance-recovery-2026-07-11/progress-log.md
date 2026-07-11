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
- Proof 2: settled light/dark Sphere screenshots preserve the window, title depth, palette, controls, and Button Bar. Desktop computed styles remain film `display:block`, opacity `0.18`, noise `display:block`, and chooser blur `18px`.
- Canonical gate: `npm run check:site` passed.

- Caveat: proof is a relative WebKit guard; physical iPhone validation is still required for the reported 15 FPS.

## PRD 02

- Status: verified
- Proof 1: settled Sphere title layout reads fell from 720 to 24 over three seconds (96.7% reduction); Ball Field records 12 reads. Mobile resolves the balanced tier and confirms the contrast veil is skipped.
- Proof 2: 17/17 WebKit/iPhone simulations passed with 0 errors, 71.67–72.07 rAF FPS, p95 16 ms. Sphere retained 84 points, DPR 1.25, and an even behind/front title partition; settled screenshot preserves title depth and circular body visuals.
- Canonical gate: `npm run check:site` passed before the final cache-condition correction; scoped lint and build rerun after it.

## PRD 03

- Status: verified
- Proof 1: deterministic mobile cost reductions: Flock warmup 168 → 0 frames; Flock/Mineral DPR 1.50 → 1.15; Soft Blob contact work 18 → 4 passes; Bubble Lift generic collision passes 14 → 0. Flock layout synchronization is resize-owned on every viewport; visual budgets remain mobile-only.
- Proof 2: 17/17 WebKit/iPhone simulations passed with 0 errors, 71.67–72.07 rAF FPS, p95 15–16 ms. Visual/touch checks preserved 77 birds, 62 Mineral bodies during growth, 52 connected Blob beads, 120 rising bubbles, title composition, and Button Bar clearance.
- Canonical gate: `npm run check:site` passed.

## Final release gate

- Release candidate: final reviewer-correction commit.
- WebKit/iPhone portrait matrix: 17/17 simulations, 0 errors, 0 performance failures; actual runtime/render band 59.88–72.40 FPS.
- WebKit/iPhone landscape matrix: 17/17 simulations, 0 errors, 0 performance failures; actual runtime/render band 59.88–72.40 FPS.
- Route-render instrumentation exposed and fixed Repel Room and Mineral Bloom cadence near 36 FPS; their actual renderer cadence is now 60.40 and 60.40–60.80 FPS respectively.
- Landscape safeguards: Flock remains 77 birds, DPR 1.15, warmup 0; Mineral remains DPR 1.15.
- Strict transition audit: Chromium passed, 9 checkpoints; WebKit passed, 9 checkpoints.
- Home return title: canvas draw sampling recorded 282 title draws; the two title lines ramped from approximately 0.04 to 1 opacity over the entrance rather than appearing as one late frame.
- Visual QA: portrait and landscape Sphere, Flock, Mineral, Soft Blob, Bubble Lift, Home return, Button Bar, and desktop film parity inspected. Landscape Button Bar hides Theme, retains Sound at right with its divider, and stays below the framed window.
- Physical-device caveat: final user confirmation on the original iPhone remains necessary because emulation cannot reproduce thermal/GPU limits.
