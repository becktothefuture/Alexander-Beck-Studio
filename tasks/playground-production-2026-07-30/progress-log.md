# Playground Progress Log

## Baseline

- Date: 2026-07-30
- Branch: `main`
- HEAD: `3abd7565`
- Tracked `origin/main`: `ec3dba41`
- Sync: 0 behind, 2 ahead
- Local authoring: running at `http://localhost:8012`
- Safe public mirror: running at `http://localhost:8014`
- Public tunnel: existing managed session reused
- Production authorization: none
- Commit authorization: none

`npm run studio:status` reported a clean worktree. A direct Git inspection then found substantial staged and unstaged changes, including shared route, configuration, and audit files. Those changes are treated as pre-existing shared-workspace changes and must not be reverted, staged, or included in any task-specific claim.

## Phase status

| Phase | Status | Evidence | Notes |
|---|---|---|---|
| Preparation | Complete | Skill and authority reads; studio status | Existing processes reused |
| MAP-ROUTES | Complete | Route mapping report | Fifth-tab and audit matrices identified |
| MAP-REFERENCE | Complete | `output/playwright/dan-machado-playground-desktop-1440x900.png` | Fixed 2000 × 1400 period and duplicated live iframes directly observed |
| MAP-CONFIG | Complete | Config mapping report and synthetic normalizer probe | `playground` is currently dropped; detached host is structural only |
| MAP-DESIGN | Complete | Shared-contract mapping report | Route lockup, palette, overlay, sound/haptics, and lifecycle mapped |
| Task packet | Complete | This directory | PRD and dependency graph recorded before implementation |
| Implementation | Complete | Route, spatial, media, config, style, and lead integration diffs | Fifth route, exact catalogue, world, media, panel, and shared-shell integration are complete |
| Tests and docs | Complete | 19 focused tests, dedicated browser audit, and production documentation | Durable evidence is in this packet and `docs/reference/PLAYGROUND.md` |
| Independent review | Complete | Read-only reviewer report plus resolved P2/P3 fixes | Final confirmation found no actionable P0–P3 issue; regenerated preview manifests are accurate |
| Final validation | Complete | Canonical site gate, browser audits, route matrices, scoped reports, and current built-preview reports | No commit, push, publish, or deployment was performed |

## Mapping reconciliation decisions

- React owns semantics and route lifecycle; hot camera and Canvas work remain imperative and route-local.
- One logical collection owns accessible identity. Wrap copies are presentation only.
- The reference confirms drag momentum, direct wheel mapping, modulo-style wrapping, varied rectangles, and duplicated live iframes. It does not confirm accessible modal behavior, keyboard panning, or pointer attraction.
- Playground inherits the current shared cursor without editing the conflicting cursor-scale contract.
- Playground consumes the existing time-of-day palette controller and does not create a palette override.
- The shared parameter panel architecture is reused. The current Button Bar playground lab is not the production route and is not a persistence model.
- Shared-file writes are serialized through the lead because the working tree already contains overlapping edits.

## Worker contribution record

| Task | Contribution | Files changed |
|---|---|---|
| MAP-ROUTES | Complete multi-surface route/entry/readiness/audit checklist | None |
| MAP-REFERENCE | Direct browser evidence for board period, input, copies, embeds, and accessibility weaknesses | Ignored browser artifacts only |
| MAP-CONFIG | Complete panel and persistence path; proved namespace loss | None |
| MAP-DESIGN | Shared title, palette, shell, modal, cursor, sound, haptics, responsive, and reduced-motion map | None |
| IMP-ROUTE | Fifth production entry, manifest, descriptor, readiness, Vite input, and validators | Route, entry, shell, transition, and validation files |
| IMP-SPATIAL | Deterministic append-stable placement, content-sized toroidal world, shared camera, copy coverage, Canvas dot field, and focused tests | `react-app/app/src/routes/playground/spatial/` |
| IMP-MEDIA | Validated 20-item catalogue, local placeholders, safe media renderers, URL helpers, and accessible lightbox | Playground content, assets, and `media/` modules |
| IMP-CONFIG | Canonical Playground namespace, normalization/save support, one panel schema, diagnostics, actions, and validation | Playground config/panel plus shared configuration paths |
| IMP-STYLES | Route-scoped visual system, responsive five-tab fit, focus, theme, lightbox, and reduced-motion rules | Playground CSS; lead integrated narrow shell-tab fit repair |
| DOC-PLAYGROUND | Production, architecture, configuration, component, authoring, transition, parity, and workflow documentation | Eleven documentation files |

## Decisions and blockers

| Date | Item | Decision or blocker | Status |
|---|---|---|---|
| 2026-07-30 | Visible name | Use `Playground`; keep internal identity stable | Resolved |
| 2026-07-30 | Rendering model | React route plus route-local imperative camera/Canvas | Resolved |
| 2026-07-30 | Config namespace | Extend normalizer/save/build before canonical save | Resolved |
| 2026-07-30 | Dirty shared worktree | Preserve and integrate around existing changes; recheck before each shared edit | Active risk |
| 2026-07-30 | Config namespace | Normalization, save snapshot, canonical load, flattening, and build preservation implemented | Resolved with direct round-trip evidence |
| 2026-07-30 | Fifth-tab mobile fit | The first 390px inspection found clipped shell controls; reduced route-group gaps and enforced 44px tab targets | Resolved by direct geometry inspection |
| 2026-07-30 | Item activation | Canvas hit testing, focus-induced page scroll, and early pointer capture prevented click activation | Resolved and covered by the final browser audit |
| 2026-07-30 | Modal camera lifecycle | Direct URL selection could leave a newly created camera enabled | Resolved by initializing from route selection state |
| 2026-07-30 | Panel lifecycle | Route exit could retain Playground panel registration | Resolved with explicit route unregister cleanup |
| 2026-07-30 | Field media semantics | Active code media placed an iframe inside a button | Resolved with an inert visual sibling and one semantic button |
| 2026-07-30 | Hidden-tab video | A visible world video could continue when the document was hidden | Resolved with visibility lifecycle handling and browser coverage |
| 2026-07-30 | Video controls | Native video-control clicks could bubble into the close surface | Resolved with target-specific lightbox close handling |
| 2026-07-30 | Grid stacking | Shared `#simulations canvas` CSS lifted the dot field above project media | Resolved with an explicit route selector and a computed stacking assertion: grid 0, project world 1 |
| 2026-07-30 | Cursor route identity | The shared cursor accent map listed only four production routes | Resolved by adding Playground while preserving the one 48px neutral lens contract |

## Change log

- The follow-up refinement moved Playground before Contact, reduced the authoring surface to eight high-signal controls, moved Save to the shared pinned panel action, and added live grid-density save coverage.
- The repeated period no longer applies target density twice after placement. The denser `28px` default grid and tighter hidden world padding reduce unused border corridors while preserving the minimum cell contract and content-driven growth.
- The wrapping audit now requires visible projects at horizontal, vertical, and diagonal tile cuts and proves exact rectangle continuity on both axes across the true modulo boundary.
- The canonical `npm run check:site` gate passed, including lint, 387 About tests, 20 Playground tests, design-config parity, and the production build.
- Dedicated Playground audits passed in Chromium and WebKit on the authoring server and current built preview. The final reports record the exact 20-item mix, media ownership, input, wrapping, configuration, item-21 growth, user-paused video behavior, and grid-below-project stacking contract.
- The direct canonical save run changed `gridSpacingPx` to `44`, `dotRadiusPx` to `5.25`, `wheelSensitivity` to `1.5`, and `dragMomentum` to `0`; reload reproduced the saved world dimensions, then the authored defaults were restored. Flatten/build/preview parity passed.
- Route transition audits passed serially in Chromium and WebKit. Canvas SPA, palette surface, outer frame, theme consistency, cursor, focus/contrast, and mobile wall-invariance checks passed for the fifth route.
- Final inspected opening and world-media artifacts confirm that the full `Playground` title is settled and the dot field remains behind opaque project media.
