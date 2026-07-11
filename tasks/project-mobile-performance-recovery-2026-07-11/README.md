# Mobile Performance Recovery

This packet restores sustained mobile simulation performance with the smallest visual sacrifice possible. Physical iPhone performance has priority over decorative shell effects.

## Baseline

- Reported physical-device result: approximately 15 FPS.
- Playwright WebKit, iPhone 13 emulation, production: 17/17 Daily simulations measured, 0 errors, 70.60–72.03 rAF FPS, runtime target approximately 60 FPS.
- The emulated result is a regression guard, not a substitute for physical iOS GPU and thermal proof.
- Last known-good comparison: `7e111d14`. The only Home rendering feature added between that commit and `794477e6` is the treated-glass light film chain.

## Action order

1. `archive/actioned/prd-01-mobile-compositor-budget.md`
2. `archive/actioned/prd-02-shared-canvas-fast-path.md`
3. `archive/actioned/prd-03-heavy-simulation-mobile-budgets.md`

Each PRD requires two proof points, a focused commit, a push to `main`, and production verification before the next begins.

All three PRDs are actioned and archived.
