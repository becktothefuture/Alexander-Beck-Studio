# PRD 07: Audit Migration And Release Gate

## 1. Overview

Update automated verification so the new route-tab model, in-window gate, Contact route, About route, and expanded bottom shell are tested directly.

## 2. Goals

- Remove stale assumptions about `#main-links` and full-window Contact/CV/Portfolio modals.
- Add direct coverage for new bottom tab states.
- Add route and screenshot coverage for Contact and About.
- Preserve portfolio drawer, transition, and canvas safety checks.

## 3. User Stories

### US-001: Audits Match Product Behavior

As a maintainer, the audits fail on real regressions rather than old modal selectors.

Acceptance criteria:

- [ ] Screenshot certification validates bottom tab labels/icons, active states, and non-overlap.
- [ ] Transition audit covers Home, Contact, About, Portfolio locked, Portfolio unlocked.
- [ ] Portfolio gate audit enters through the new in-window gate.
- [ ] Drawer audits start from the new authorized Portfolio state.
- [ ] Modal unified audit is removed, replaced, or narrowed to any remaining modal behavior after Contact/CV modal removal.
- [ ] Window content transition is covered for Home, Contact, About, Portfolio locked, and Portfolio unlocked states.
- [ ] Verify in browser using dev-browser skill.

### US-002: Release Confidence

As the site owner, the final result is visually verified before completion.

Acceptance criteria:

- [ ] Preview build is tested.
- [ ] Chromium and WebKit transition audits pass.
- [ ] Strict RAF transition audits pass or documented limitation is approved.
- [ ] Certification screenshots are regenerated.
- [ ] Manual visual QA covers desktop, mobile, reduced motion, and drawer state.
- [ ] Verify in browser using dev-browser skill.

## 4. Functional Requirements

- FR-1: Update `certify-screens.mjs` route matrix and selectors.
- FR-2: Update `audit-transition-flows.mjs` route paths and gate flows.
- FR-3: Update `audit-portfolio-gate-flow.mjs` for in-window gate.
- FR-4: Update drawer audits to bootstrap authorized Portfolio without legacy modal trigger.
- FR-5: Add semantic selectors for bottom tabs and gate/page content.
- FR-6: Assert `dist/contact.html` and `dist/about.html` exist and load after build.
- FR-7: Add stale compatibility tests for `?gate=portfolio`, `?gate=cv`, `abs_open_contact_modal`, `abs_open_cv_gate`, `abs_open_cv_modal`, and `abs_open_portfolio_modal`.
- FR-8: Record artifacts in `output/playwright/`.
- FR-9: Verify old Contact/CV modal triggers do not open removed overlays.
- FR-10: Verify Instrument Wake timing, reduced-motion behavior, and route settle phase.
- FR-11: Update `certify:screens` so it no longer requires `#main-links` as the primary nav source.
- FR-12: Add direct-route checks for `/contact.html`, `/about.html`, `/cv.html`, and locked `/portfolio.html`.
- FR-13: Add storage persistence checks for Portfolio unlock reload and storage-clear reset.
- FR-14: Add transition-readiness checks that fail if home route readiness still depends exclusively on `#main-links`.
- FR-15: Validate extensionless SPA aliases (`/about`, `/cv`, `/contact`, `/portfolio`) through client navigation. Direct static extensionless URLs may remain host-dependent unless a deployment rewrite is explicitly added.

## 5. Non-Goals

- No CI pipeline redesign beyond making current gates accurate.

## 6. Technical Considerations

- Selector churn is a risk. Prefer semantic selectors or stable data attributes.
- Run browser audits serially.
- Preview server must be restarted after build-affecting changes.
- Existing audit scripts currently reference legacy modal selectors such as `#portfolio-modal-trigger`, `.portfolio-digit`, `#cv-modal-trigger`, and `#contact-email`; update or remove those paths.

Stale compatibility outcomes:

- `?gate=portfolio`: normalize to `/portfolio.html` without the query and show the in-window Portfolio gate if locked.
- `?gate=cv`: clean the query and resolve to the About page without opening any gate.
- `abs_open_contact_modal`: consume/remove the flag and route to `/contact.html`; never open an overlay.
- `abs_open_cv_gate` and `abs_open_cv_modal`: consume/remove the flags and route to `/about.html`; never open an overlay.
- `abs_open_portfolio_modal`: consume/remove the flag and route to `/portfolio.html`; show the in-window Portfolio gate if locked.
- Old CV access URL params such as `?cv=482916`, `?cvCode=482916`, or `?access=482916` on `/cv.html`: do not unlock anything; clean or ignore and resolve to About.

## 7. Final Validation

```bash
git diff --check
npm run check:site
npm run build
npm run check:design-config
npm run preview
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:boot-overlay
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=chromium npm run audit:transition-flows
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=webkit npm run audit:transition-flows
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=chromium ABS_TRANSITION_STRICT_RAF=1 npm run audit:transition-flows
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=webkit ABS_TRANSITION_STRICT_RAF=1 ABS_TRANSITION_HARD_TIMEOUT_MS=300000 npm run audit:transition-flows
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-gate
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-drawer
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-drawer:pointer
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:modal-unified
ABS_DEV_URL=http://127.0.0.1:8013 npm run certify:screens
```

Run `npm run preview` in a separate terminal and restart it after any later build-affecting command.

## 8. Success Metrics

- Existing audits fail on real regressions rather than removed modal selectors.
- Preview build includes and serves `contact.html` and `about.html`.
- Screenshot certification captures bottom tab active states and window content states.
- Chromium and WebKit transition audits pass for normal and strict RAF modes, or any exception is documented and approved.

## 9. Open Questions

- None.
