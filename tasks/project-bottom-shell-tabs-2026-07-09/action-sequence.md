# Bottom Shell Tabs Action Sequence

## Sequencing Principle

Promote Contact first so the dock never points at a missing route, then create the route/tab state foundation, then change geometry, then apply the visual tab system, then remove duplicate/legacy chrome. Final closeout verifies documentation, audits, screenshots, and archive state.

## Phase 0: Baseline

Record current dirty worktree and do not stage unrelated changes.

```bash
git status --short
npm run check:site
npm run certify:screens
```

If baseline commands fail because of pre-existing unrelated worktree edits, record the failure in `progress-log.md` and isolate subsequent verification to the PRD being actioned.

## Phase 1: Contact Route

1. `prd-contact-route-promotion.md`

Exit gate:

```bash
git diff --check
npm run check:site
```

Preview checks:

```bash
npm run preview
ABS_DEV_URL=http://localhost:8013 npm run audit:boot-overlay
```

Manual/browser checks:

- `/contact.html` direct load.
- Home -> Contact SPA navigation.
- Inline "Let's chat" routes to Contact.
- Copy email interaction.
- Browser back from Contact returns to previous route.

Commit after this PRD passes. This is allowed by the user's explicit request to commit and action the PRDs.

## Phase 2: Route And State Foundation

2. `prd-route-and-tab-state-foundation.md`

Exit gate:

```bash
git diff --check
npm run check:site
```

Preview checks:

```bash
npm run preview
ABS_DEV_URL=http://localhost:8013 npm run audit:boot-overlay
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium npm run audit:transition-flows
```

Manual/browser checks:

- Home, Contact, Portfolio, About active tab state.
- Unauthenticated Portfolio/About gate pending state.
- Gate dismissal restores resolved route active state.
- Gate success transitions to target active state.
- Browser back/forward active tab state.

Commit after this PRD passes.

## Phase 3: Bottom Frame Geometry

3. `prd-bottom-frame-geometry.md`

Exit gate:

```bash
git diff --check
npm run check:site
npm run certify:screens
```

Preview checks:

```bash
npm run preview
ABS_DEV_URL=http://localhost:8013 npm run audit:canvas-spa
ABS_DEV_URL=http://localhost:8013 npm run audit:portfolio-gate
```

Manual/browser checks:

- Home, Contact, Portfolio, About desktop.
- Home, Contact, Portfolio, About mobile.
- Portfolio drawer open state alignment.
- iPhone-sized viewport with bottom safe area.

Commit after this PRD passes.

## Phase 4: Visual Tab System

4. `prd-shell-tab-visual-system.md`

Exit gate:

```bash
git diff --check
npm run check:site
npm run certify:screens
```

Manual/browser checks:

- Resting, hover, focus, active, and reduced-motion states.
- Text fitting for Contact, Portfolio, About Me.
- Home icon-only accessible label.
- Styleguide specimen.

Commit after this PRD passes.

## Phase 5: Route Chrome Cleanup And Legacy Compatibility

5. `prd-route-chrome-cleanup-and-legacy-compat.md`

Exit gate:

```bash
git diff --check
npm run check:site
npm run certify:screens
```

Preview checks:

```bash
npm run preview
ABS_DEV_URL=http://localhost:8013 npm run audit:boot-overlay
ABS_DEV_URL=http://localhost:8013 npm run audit:canvas-spa
ABS_DEV_URL=http://localhost:8013 npm run audit:portfolio-gate
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit npm run audit:transition-flows
```

Commit after this PRD passes.

## Phase 6: Release Verification And Docs

6. `prd-release-verification-and-docs.md`

Final gate:

```bash
git diff --check
npm run check:site
npm run certify:screens
```

Preview checks:

```bash
npm run preview
ABS_DEV_URL=http://localhost:8013 npm run audit:boot-overlay
ABS_DEV_URL=http://localhost:8013 npm run audit:canvas-spa
ABS_DEV_URL=http://localhost:8013 npm run audit:portfolio-gate
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium ABS_TRANSITION_STRICT_RAF=1 npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit ABS_TRANSITION_STRICT_RAF=1 ABS_TRANSITION_HARD_TIMEOUT_MS=300000 npm run audit:transition-flows
```

Closeout:

- Record final evidence in `progress-log.md`.
- Move actioned PRDs to `archive/actioned/`.
- Run a read-only final review.
- Commit closeout.
