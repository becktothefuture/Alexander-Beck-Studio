# Transition Orchestration Contract

Canonical engineering contract for route and modal transitions.

## 1) Single owner
- **Only** `useShellRouteTransition` may own transition sequencing.
- Canonical phase state lives on `<html data-abs-transition-phase>`.
- Allowed values:
  - `idle`
  - `modal-open`
  - `route-out`
  - `route-in`

## 2) Legacy role (execute, do not orchestrate)
- Legacy modules may execute visual effects (blur/depth/modal card/cursor behavior).
- Legacy modules must not own route/modal transition sequencing.
- Legacy modules must not directly set orchestration state outside the phase API.

## 3) Phase contract
- Entering a modal sets `modal-open`.
- Route transition starts with `route-out`.
- Destination reveal uses `route-in`.
- Settled state returns to `idle`.
- Optional return easing marker: `data-abs-transition-returning="active"`.

## 4) Forbidden ownership patterns
- Do not reintroduce direct orchestration ownership via:
  - `html.modal-active`
  - `html.modal-returning`
  - `data-abs-route-transition` / `data-abs-gate-transition`
  - `center-stage--modal-hidden`
  - `fade-out-up`
- These may exist for compatibility, but must not be the source of truth for sequencing.

## 5) Validation gate for transition changes
Run on preview or dev server (serially, not in parallel):

```bash
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium ABS_TRANSITION_STRICT_RAF=1 npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit ABS_TRANSITION_STRICT_RAF=1 ABS_TRANSITION_HARD_TIMEOUT_MS=300000 npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 npm run certify:screens
```

## 6) PR acceptance checklist (transition-related work)
- [ ] Transition owner remains centralized in shell hook/FSM.
- [ ] No new direct orchestration class/dataset toggles in legacy modules.
- [ ] Chromium/WebKit audits pass (normal + strict RAF).
- [ ] In-flight and settled checkpoint artifacts are generated.
- [ ] `certify:screens` passes.
