# Studio Website Follow-Up Action Sequence

## Sequencing Principle

Strengthen setup and validators first, then consolidate route/boot ownership, then simplify transition and HTML entry boundaries, then clean visible content/styling ownership, and finish by triaging historical docs. This keeps later behavior changes protected by better checks.

## Preview-Dependent Gate Pattern

Any gate that uses `ABS_DEV_URL=http://localhost:8013` requires a fresh preview server after the latest build-affecting command.

Terminal A:

```bash
npm run preview
```

Terminal B:

```bash
ABS_DEV_URL=http://localhost:8013 <audit command>
```

Stop Terminal A after the audit block. If `npm run check:site`, `npm run build`, or any source/config edit happens afterward, restart Terminal A before running browser audits again.

## Phase 0: Baseline Before Any Implementation

Required before starting the first implementation PRD:

```bash
git status --short
npm run check:site
npm run sim:validate
npm run certify:screens
```

Terminal A:

```bash
npm run preview
```

Terminal B:

```bash
ABS_DEV_URL=http://localhost:8013 npm run audit:boot-overlay
ABS_DEV_URL=http://localhost:8013 npm run audit:canvas-spa:quick
ABS_DEV_URL=http://localhost:8013 npm run audit:daily-focus-boundary
ABS_DEV_URL=http://localhost:8013 npm run audit:portfolio-gate:quick
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit npm run audit:transition-flows
```

Stop if the baseline fails. Record the failure in `progress-log.md`.

## Phase 1: Setup And Validation Guardrails

1. `prd-setup-environment-and-ci-parity.md`
2. `prd-simulation-validation-hardening.md`

Required exit gate after each PRD:

```bash
git diff --check
npm run check:site
npm run sim:validate
```

Additional gate for simulation validator changes.

Terminal A:

```bash
npm run preview
```

Terminal B:

```bash
ABS_DEV_URL=http://localhost:8013 npm run audit:daily-focus-boundary
ABS_DEV_URL=http://localhost:8013 npm run audit:simulation-focus
```

Proceed only when local and CI-equivalent gates are aligned and the validator catches the newly covered drift class.

## Phase 2: Route, Boot, And Transition Ownership

3. `prd-route-source-validation.md`
4. `prd-direct-boot-readiness-ownership.md`
5. `prd-transition-compatibility-boundary.md`
6. `prd-build-warning-html-entry-cleanup.md`

Required exit gate after each PRD:

```bash
npm run check:site
npm run certify:screens
```

Terminal A:

```bash
npm run preview
```

Terminal B:

```bash
ABS_DEV_URL=http://localhost:8013 npm run audit:boot-overlay
ABS_DEV_URL=http://localhost:8013 npm run audit:canvas-spa
ABS_DEV_URL=http://localhost:8013 npm run audit:portfolio-gate
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit npm run audit:transition-flows
```

If transition timing, route animation phases, readiness dispatch, or legacy page-nav behavior changes, keep Terminal A running and also run strict audits from Terminal B:

```bash
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium ABS_TRANSITION_STRICT_RAF=1 npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit ABS_TRANSITION_STRICT_RAF=1 ABS_TRANSITION_HARD_TIMEOUT_MS=300000 npm run audit:transition-flows
```

Run browser audits serially.

## Phase 3: Visible Content And CSS Ownership

7. `prd-content-label-source-alignment.md`
8. `prd-portfolio-legacy-template-retirement.md`
9. `prd-route-topbar-css-ownership.md`

Required exit gate after each PRD:

```bash
npm run check:site
npm run certify:screens
```

Terminal A:

```bash
npm run preview
```

Terminal B:

```bash
ABS_DEV_URL=http://localhost:8013 npm run audit:portfolio-gate:quick
```

Browser surfaces that must be visually checked:

- Home desktop and mobile
- Portfolio deck desktop and mobile
- Portfolio drawer open state
- CV/About desktop and mobile
- Styleguide route-topbar examples

Use browser verification and preserve screenshot artifacts under `output/playwright/`.

## Phase 4: Documentation Triage And Programme Closeout

10. `prd-backlog-historical-docs-triage.md`
11. `prd-followup-streamline-program.md`

Required final gate:

```bash
git diff --check
npm run check:site
npm run sim:validate
npm run certify:screens
```

Terminal A:

```bash
npm run preview
```

Terminal B:

```bash
ABS_DEV_URL=http://localhost:8013 npm run audit:boot-overlay
ABS_DEV_URL=http://localhost:8013 npm run audit:canvas-spa
ABS_DEV_URL=http://localhost:8013 npm run audit:daily-focus-boundary
ABS_DEV_URL=http://localhost:8013 npm run audit:simulation-focus
ABS_DEV_URL=http://localhost:8013 npm run audit:portfolio-gate
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium ABS_TRANSITION_STRICT_RAF=1 npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit ABS_TRANSITION_STRICT_RAF=1 ABS_TRANSITION_HARD_TIMEOUT_MS=300000 npm run audit:transition-flows
```

Programme closeout requires:

- Every PRD status is `complete`, `not-actioned`, or `blocked` with evidence.
- `progress-log.md` contains the implementation summary and verification commands.
- Senior review is recorded in `progress-log.md`.
- User-visible behavior is verified by the user before considering the programme closed.
