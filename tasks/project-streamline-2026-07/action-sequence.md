# Studio Website Streamline Action Sequence

## Sequencing Principle

Start by repairing the test gates, then reduce drift in registries, then fix visible contract mismatches, then simplify architecture. This keeps every later change covered by stronger validation.

## Phase 0: Baseline Before Any Implementation

Required before starting the first implementation PRD:

```bash
git status --short
npm run check:site
npm run sim:validate
```

Expected state:

- Worktree status is understood before edits.
- `check:site` passes.
- `sim:validate` passes.
- Known current exception: `npm run audit:daily-focus-boundary` is expected to fail until `prd-validation-gate-repair.md` is complete.

## Preview-Dependent Audit Setup

For every gate that uses `ABS_DEV_URL=http://localhost:8013`, start the preview server in a separate terminal and leave it running:

```bash
npm run preview
```

Then run the audit commands from a second terminal. Do not place `npm run preview` in the same command block as the audits; it is a foreground server.

## Phase 1: Restore Trust In Gates

1. `prd-validation-gate-repair.md`

Required exit gate:

```bash
npm run sim:validate
npm run check:site
```

With preview running in another terminal:

```bash
ABS_DEV_URL=http://localhost:8013 npm run audit:daily-focus-boundary
ABS_DEV_URL=http://localhost:8013 npm run audit:simulation-focus
ABS_DEV_URL=http://localhost:8013 npm run audit:simulation-focus:stress
```

Proceed only when all pass.

## Phase 2: Reduce Registry Drift

2. `prd-simulation-validator-expansion.md`

Required exit gate:

```bash
npm run sim:validate
npm run check:site
```

If route ownership, daily focus routing, or SPA route behavior changes, also run:

```bash
ABS_DEV_URL=http://localhost:8013 npm run audit:simulation-focus
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit npm run audit:transition-flows
```

Run browser audits serially.

3. `prd-route-manifest-strategy.md`

This is a design/strategy PRD, not a required implementation step. Action it only if validator-first work still leaves route promotion/removal too manual.

## Phase 3: Fix Visible Contract Mismatches

4. `prd-cv-route-topbar-contract.md`
5. `prd-content-source-alignment.md`
6. `prd-css-token-ownership.md`

Required exit gate for each PRD:

```bash
npm run check:site
npm run certify:screens
```

For CV/topbar and CSS work, also verify in browser using the dev-browser skill across:

- Home
- Portfolio
- CV/About
- Styleguide
- At least one mobile viewport

## Phase 4: Simplify Transition And Boot Architecture

7. `prd-transition-navigation-inventory.md`
8. `prd-transition-listener-cleanup.md`
9. `prd-transition-hook-helper-extraction.md`
10. `prd-boot-shell-entry-consolidation.md`

Required exit gate:

```bash
npm run check:site
npm run certify:screens
ABS_DEV_URL=http://localhost:8013 npm run audit:boot-overlay
ABS_DEV_URL=http://localhost:8013 npm run audit:portfolio-gate
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium ABS_TRANSITION_STRICT_RAF=1 npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit ABS_TRANSITION_STRICT_RAF=1 ABS_TRANSITION_HARD_TIMEOUT_MS=300000 npm run audit:transition-flows
```

Proceed only when transition audits pass in normal and strict modes.

## Phase 5: Setup And Documentation Cleanup

11. `prd-setup-docs-hygiene.md`

Required exit gate:

```bash
npm run check:site
npm run sim:validate
```

Also inspect docs diff manually to confirm stale guidance was removed rather than duplicated elsewhere.

## Program Closeout

Final coordination: update `prd-project-streamline-program.md` and `progress-log.md`.

Program is complete only when:

- Every individual PRD is marked `complete` or, for optional PRDs, `not-actioned` with rationale and verification evidence in `progress-log.md`.
- The full final gate passes:

```bash
npm run check:site
npm run sim:validate
npm run certify:screens
ABS_DEV_URL=http://localhost:8013 npm run audit:boot-overlay
ABS_DEV_URL=http://localhost:8013 npm run audit:canvas-spa
ABS_DEV_URL=http://localhost:8013 npm run audit:simulation-focus
ABS_DEV_URL=http://localhost:8013 npm run audit:portfolio-gate
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium ABS_TRANSITION_STRICT_RAF=1 npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit ABS_TRANSITION_STRICT_RAF=1 ABS_TRANSITION_HARD_TIMEOUT_MS=300000 npm run audit:transition-flows
```

- `git status --short` has no unrelated changes.
- User verifies the visible site behavior.
