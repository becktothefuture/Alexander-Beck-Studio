# Implementation Prompt: Bottom Shell Tabs Redesign

You are implementing the Bottom Shell Tabs Redesign in `/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website`.

Do not treat this as a simple nav restyle. This is a coordinated route, shell geometry, modal-removal, gate, motion, audit, and visual QA programme. Work from the PRD packet and keep the packet current as you go.

## Source Of Truth

Before editing application code, read:

- `tasks/project-bottom-shell-tabs-2026-07-10/README.md`
- `tasks/project-bottom-shell-tabs-2026-07-10/system-impact-map.md`
- `tasks/project-bottom-shell-tabs-2026-07-10/action-sequence.md`
- `tasks/project-bottom-shell-tabs-2026-07-10/progress-log.md`
- Every `prd-*.md` in `tasks/project-bottom-shell-tabs-2026-07-10/`
- `docs/reference/LAYER-STACKING.md`
- `docs/reference/TRANSITION-ORCHESTRATION.md`
- `docs/reference/SITE-STYLEGUIDE.md`
- `docs/reference/COMPONENT-LIBRARY.md`

Use the PRDs as implementation contracts. If code and PRD conflict, stop and resolve the conflict in the packet before continuing.

## Product Outcome

- Primary route controls move out of the `window` into an expanded bottom shell band.
- The inside wall content area is called the `window`; preserve compatibility IDs such as `#simulations` unless every consumer is deliberately migrated.
- Bottom controls become persistent tabs:
  - Home: icon-only visual, accessible name `Home`, route ID `home`, href `/index.html`.
  - Contact: label `Contact`, route ID `contact`, href `/contact.html`.
  - Portfolio: label `Portfolio`, route ID `portfolio`, href `/portfolio.html`.
  - About Me: label `About Me`, route ID `about`, href `/about.html`.
- Tabs use a restrained skeuomorphic material: raised default state, pressed active state, and a small active light under the icon/label.
- Contact is a real route. Its window content is the old Contact modal content and behavior, visually centered inside the window.
- About is a real non-gated route. `/about.html` and `/cv.html` are the same page. Archive current About/CV content before replacing the route with centered `Coming soon`.
- Portfolio is the only gated route. Locked `/portfolio.html` shows an in-window gate. Unlocked Portfolio persists in a first-party cookie named `abs_portfolio_ok` with `Path=/`, `SameSite=Lax`, and `Max-Age=31536000`.
- Old Contact/CV modal implementations are fully removed after their route replacements are verified.
- Tab switches use the Instrument Wake window-content transition.

## Execution Order

Implement in this order. Update `progress-log.md` before and after each PRD.

1. `prd-01-route-model-and-bottom-tabs.md`
2. `prd-02-bottom-shell-geometry-and-canvas.md`
3. `prd-03-skeuomorphic-tab-material.md`
4. `prd-04-contact-page-from-modal-content.md`
5. `prd-05-about-page-archive-coming-soon.md`
6. `prd-06-portfolio-in-window-gate.md`
7. `prd-08-window-content-transition.md`
8. `prd-07-audit-migration-and-release-gate.md`

Do not move `prd-08` before `prd-06`; Instrument Wake must be verified against Portfolio locked and unlocked states.

## Worker Plan

Use four subagents only where ownership is disjoint. The lead agent owns integration, final styling decisions, conflict resolution, and final verification.

Worker A: route model and tab skeleton

- Owns route definitions, Vite entries, route rendering, bottom tab data, stable selectors, and route readiness changes.
- Likely files: `react-app/app/vite.config.js`, route entry files, `routes.js`, `SiteApp.jsx`, `useShellRouteTransition.js`, bottom tab component files.
- Must update home readiness away from `#main-links .footer_link`.

Worker B: shell/window geometry and material CSS

- Owns expanded bottom shell band, window geometry, CSS tokens, tab material, safe-area handling, canvas/cursor/physics boundary checks.
- Likely files: `tokens.css`, `main.css`, `portfolio.css`, `design-system.json`, renderer/physics/cursor geometry consumers where needed.
- Must not rewrite the simulation engine.
- Must not hand-edit generated config outputs.

Worker C: Contact/About migration and modal removal

- Owns Contact route content, About archive and coming-soon route, full Contact/CV modal removal.
- Removal scope includes `StudioShell.jsx`, `legacy/main.js`, `shared-chrome.js`, `DailyFocusShellBridge.jsx`, route templates, CSS selectors, haptics selectors, and stale storage/session flags.
- Must preserve Contact copy/email behavior while removing modal presentation.

Worker D: audit migration and verification support

- Owns audit/script updates after implementation surfaces exist.
- Likely files: `scripts/certify-screens.mjs`, `scripts/audit-transition-flows.mjs`, `scripts/audit-portfolio-gate-flow.mjs`, drawer audits, modal audit replacement/narrowing.
- Must add checks for direct pages, stale flags, Portfolio persistence, Instrument Wake, reduced motion, and removed overlays.

## Critical Implementation Requirements

- Keep `useShellRouteTransition` as the only route transition owner.
- Route active state must derive from route state, not modal/session flags.
- Home route readiness must not depend exclusively on `#main-links`.
- Portfolio drawer must remain above route chrome and bottom tabs.
- Contact and About route content must be centered inside the window, not the full viewport.
- Contact route must not use `aria-modal="true"`, modal backdrop, or scene depth.
- About/CV gate must be removed from visible and normal route flows.
- Portfolio access is UX friction only, not secure auth.
- Extensionless aliases such as `/about`, `/cv`, `/contact`, and `/portfolio` must work through SPA navigation. Direct static extensionless URLs are host-dependent unless a deployment rewrite is added.
- Do not revert unrelated dirty worktree files.
- Commit only if the user explicitly asks.

## Stale Compatibility Outcomes

Implement and test these outcomes:

- `?gate=portfolio`: normalize to `/portfolio.html` without the query and show the in-window Portfolio gate if locked.
- `?gate=cv`: clean the query and resolve to About without opening any gate.
- `abs_open_contact_modal`: consume/remove the flag and route to `/contact.html`; never open an overlay.
- `abs_open_cv_gate` and `abs_open_cv_modal`: consume/remove the flags and route to `/about.html`; never open an overlay.
- `abs_open_portfolio_modal`: consume/remove the flag and route to `/portfolio.html`; show the in-window Portfolio gate if locked.
- Old CV access URL params such as `?cv=482916`, `?cvCode=482916`, or `?access=482916` on `/cv.html`: do not unlock anything; clean or ignore and resolve to About.

## Instrument Wake Transition

Implement Instrument Wake after Contact, About, and Portfolio locked/unlocked states exist.

Required feel:

1. Active tab light updates immediately.
2. Outgoing window content subtly dims, defocuses, and recedes.
3. A soft inner-shadow/highlight pass crosses the window inside the rounded mask.
4. Incoming content resolves into sharp focus.

Target timing:

- Total perceived duration: `220ms` to `280ms`.
- Outgoing: `90ms` to `120ms`.
- Incoming: `140ms` to `180ms`.
- Reduced motion: no blur/depth/sweep; use near-instant opacity/visibility swap.

Animate only the window content group. Do not animate the full shell, bottom tabs, modal layers, or `#portfolio-sheet-host`.

## Validation

Run each PRD gate from `action-sequence.md`. For the final gate:

```bash
git diff --check
npm run check:site
npm run build
npm run check:design-config
```

Then run preview in a separate terminal:

```bash
npm run preview
```

Against preview:

```bash
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

Restart preview after any build-affecting change.

Manual visual QA must cover:

- Home desktop and mobile.
- Contact route content and email copy state.
- About route via `/about.html` and `/cv.html`.
- Portfolio locked gate direct load.
- Portfolio unlock, reload persistence, and storage-clear reset.
- Portfolio drawer open state.
- Instrument Wake normal and reduced-motion paths.
- Bottom tabs default, hover, focus-visible, pressed, active, and pending states.

## Final Response Requirements

Report:

- PRDs completed.
- Files changed.
- Verification commands and results.
- Screenshot and audit artifact paths.
- Any blocked checks, risks, or follow-ups.

Do not claim completion until implementation, audits, and visual verification are done.
