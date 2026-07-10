# Bottom Shell Tabs Redesign PRD Packet

Created: 2026-07-10

This packet maps the requested redesign before implementation. The change is not only a button restyle: it changes shell geometry, route navigation, gate presentation, contact/about content ownership, transition flows, canvas and physics bounds, and the validation suite.

## Current Status

- Previous bottom-shell implementation has been reverted with focused revert commits.
- Existing unrelated dirty worktree files were left untouched.
- Four read-only review lanes completed:
  - Product and material design review
  - Shell geometry and canvas impact review
  - Routing, gate, and content review
  - Verification and audit migration review

## Documents

- `system-impact-map.md` - affected files, systems, risks, and decisions.
- `skeuomorphic-material-research.md` - practical material model for the new tabs.
- `action-sequence.md` - dependency-aware implementation order and gates.
- `progress-log.md` - working status log for implementation.
- `prd-01-route-model-and-bottom-tabs.md`
- `prd-02-bottom-shell-geometry-and-canvas.md`
- `prd-03-skeuomorphic-tab-material.md`
- `prd-04-contact-page-from-modal-content.md`
- `prd-05-about-page-archive-coming-soon.md`
- `prd-06-portfolio-in-window-gate.md`
- `prd-07-audit-migration-and-release-gate.md`
- `prd-08-window-content-transition.md`
- `implementation-prompt.md`

## Confirmed Product Decisions

1. Canonical About URL: use `/about.html` as the new route and keep `/cv.html` as the same page via redirect or alias.
2. Portfolio unauthenticated URL: direct `/portfolio.html` should stay on `/portfolio.html` and render the in-window gate, rather than redirecting home with `?gate=portfolio`.
3. Portfolio unlock state persists in browser site storage until the user clears the site cache/storage.
4. Bottom shell geometry: the inner wall area is called the `window`; the window should shrink upward and the expanded bottom band should live outside the canvas/physics rect.
5. Contact content: the Contact modal becomes what is visible inside the Contact window.
6. Old Contact/CV modal triggers and visible modal implementations should be removed fully. Shared content or behavior can be extracted before removal.
7. Window content should use the Instrument Wake transition when switching tabs.
8. About archive path: save the current About/CV content under `react-app/app/src/content/archive/contents-cv-about-2026-07.json` so it is versioned but no longer a public runtime config file.
9. Direct routes: add real multi-entry files for `contact.html` and `about.html`, plus Vite Rollup inputs, so direct preview/static loads work.

## Working Rules

- Implement one PRD at a time unless file ownership is explicitly disjoint.
- Update `progress-log.md` before and after each PRD pass.
- Do not change unrelated dirty worktree files.
- Keep route transition ownership inside `useShellRouteTransition`.
- Keep Portfolio drawer stacking above the route chrome and new bottom tabs.
- Do not hand-author generated config outputs. Change `design-system.json` or source code, then flatten through the build workflow.
- Browser verification is mandatory for shell geometry, route navigation, gates, and visual material.
