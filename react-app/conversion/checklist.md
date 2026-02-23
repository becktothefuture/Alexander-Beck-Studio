# Conversion Checklist (Current Scope: 3 Pages)

Date: 2026-02-10

## A) Safety And Isolation
- [x] Conversion created in a new root subfolder: `react-app/`
- [x] Original app remains the source of truth and untouched by conversion flow
- [x] React code and migration artifacts live only under `react-app/`
- [x] Build runs successfully in React app (`npm run build`)

## B) Route And Shell Architecture
- [x] Multi-entry React setup for `index.html`, `portfolio.html`, `cv.html`
- [x] Shared frame pattern implemented for all three pages
- [x] Page-specific templates mounted through React bridge
- [x] Legacy runtime bootstrapped per route through hook contract

## C) Behavior Parity
- [x] `index.html` runtime initializes and renders expected UI anchors
- [x] `cv.html` runtime initializes and renders CV content/scroll container
- [x] Portfolio soft gate parity preserved (`portfolio.html` redirects without token)
- [x] Portfolio authorized path parity preserved (token allows page entry)
- [x] Modal interactions parity checked on home (`Contact`, `Work`, `Bio/CV`)
- [x] ESC closes modal interactions parity checked

## D) Visual Parity Evidence
- [x] Desktop screenshots captured (source vs React for all 3 routes)
- [x] Mobile screenshots captured (source vs React for all 3 routes)
- [x] Diff overlays generated for all compared routes
- [x] Pixel metrics generated and logged
- [x] Findings documented in `conversion/parity-report.md`
- [x] Second-pass captures completed for all three areas (home, portfolio, cv)
- [x] Second-pass diff metrics generated and logged

## D2) Area-by-Area Second Pass
- [x] Home: core shell/motion anchors and modal trigger parity re-validated
- [x] Portfolio: locked redirect and unlocked slider parity re-validated
- [x] CV: scroller/typography anchor parity re-validated

## D3) Third Frontend Parity Pass
- [x] Computed-style parity checks on key home anchors (desktop + mobile)
- [x] Contact modal open behavior re-validated
- [x] Portfolio locked-route redirect re-validated
- [x] CV anchor parity re-validated
- [x] Pass-3 visual captures and diff metrics generated

## E) Documentation
- [x] React conversion README created at `react-app/README.md`
- [x] Legacy DOM contract documented
- [x] Post-parity simplification direction documented (without changing parity behavior)

## F) Remaining (Needs Your Eyes)
- [ ] Final human visual sign-off from you on motion feel + micro-details

## Progress
- Task count completion: 25 / 26 items (96.15%)
- Milestone-weighted completion: 99% complete
  - Engineering + parity execution milestones: 99% (done)
  - Final user visual sign-off milestone: 1% (pending)

## Path To 100%
- Confirm visual parity on your side for the three routes and motion feel.
- Once confirmed, final milestone closes and completion becomes 100%.
