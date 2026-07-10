# PRD 06: Portfolio In-Window Gate

## 1. Overview

Portfolio remains gated, but the gate must render inside the inner window as route content. The old body-scale modal rationale no longer applies because bottom tabs must remain visible and usable.

## 2. Goals

- Portfolio tab navigates to Portfolio route.
- Locked Portfolio route shows an in-window gate.
- Bottom tabs remain visible during the gate.
- Successful unlock shows the Portfolio deck.
- Portfolio unlock persists in browser site storage until the user clears the site cache/storage.
- Existing Portfolio code validation is preserved while old full-window modal presentation is removed.

## 3. User Stories

### US-001: Portfolio Locked State

As a visitor without access, I see the Portfolio gate inside the site window after pressing Portfolio.

Acceptance criteria:

- [ ] URL is Portfolio route.
- [ ] Portfolio tab is active.
- [ ] Gate content is visually centered in the inner window.
- [ ] Bottom tabs remain visible and clickable.
- [ ] No global modal depth/scale phase is used.
- [ ] Verify in browser using dev-browser skill.

### US-002: Portfolio Unlock

As a visitor with the code, I can unlock Portfolio and see the Portfolio deck.

Acceptance criteria:

- [ ] Existing code works.
- [ ] Access is marked using persistent browser site storage that survives reloads and clears when site cache/storage is cleared.
- [ ] Route remains Portfolio.
- [ ] Portfolio deck mounts with readable labels.
- [ ] Portfolio drawer still covers route chrome when open.
- [ ] Verify in browser using dev-browser skill.

## 4. Functional Requirements

- FR-1: Change unauthorized Portfolio route behavior from home redirect/modal request to in-window locked route state.
- FR-2: Reuse gate input behavior and validation where practical.
- FR-3: Avoid `aria-modal="true"` for the in-window gate if tabs remain accessible.
- FR-4: Keep transition ownership in `useShellRouteTransition`.
- FR-5: Update Portfolio route readiness for locked and unlocked states.
- FR-6: Preserve Portfolio drawer z-order above bottom tabs.
- FR-7: Persist successful unlock in a first-party cookie named `abs_portfolio_ok` with `Path=/`, `SameSite=Lax`, and `Max-Age=31536000`; it must survive page reloads and disappear when the user clears site cookies/storage.
- FR-8: Remove the old full-window Portfolio modal presentation after in-window gate flow is verified.
- FR-9: Keep invite token security expectations unchanged: client-side invite code is UX friction, not secure authentication.
- FR-10: Direct `/portfolio.html?portfolio=739284`, `/portfolio.html?portfolioCode=739284`, or `/portfolio.html?access=739284` should still unlock and clean the URL if current behavior is preserved.

## 5. Non-Goals

- No final Portfolio visual redesign.
- No change to portfolio access code unless separately requested.

## 6. Technical Considerations

- `portfolio-modal.js` combines gate presentation and gate logic. Split or adapt carefully.
- `computeRouteState` currently redirects unauthorized gated routes to home with `?gate=portfolio`.
- Current audits enter Portfolio through `#portfolio-modal-trigger`; they must migrate.
- `portfolio.css` currently hides footer/chrome in portfolio contexts. Bottom tabs need a distinct ownership rule.
- Current `markGateAccess()` writes to `sessionStorage`; implementation must change Portfolio access to the persistent cookie above and remove `cv` access.
- Do not use a session cookie or `sessionStorage` as the sole Portfolio unlock store.

## 7. Validation

```bash
npm run check:site
npm run build
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-gate
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-drawer
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-drawer:pointer
```

Browser checks:

- Home to Portfolio locked.
- Direct Portfolio locked.
- Correct code unlock.
- Portfolio deck and drawer.
- Back/forward.
- Mobile.

## 8. Success Metrics

- Locked Portfolio renders inside the window on direct load and tab navigation.
- Correct code unlock persists after reload and resets after site storage/cache is cleared.
- Portfolio drawer still covers route chrome and bottom tabs when open.
- No old full-window Portfolio modal is reachable from normal route flow.

## 9. Open Questions

- None. Portfolio access is intentional UX friction only, not secure authentication.
