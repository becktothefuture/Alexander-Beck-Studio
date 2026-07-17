# Portfolio Entry and Access Progress Log

## Packet status

| PRD | Status | Verification | Commit | Notes |
| --- | --- | --- | --- | --- |
| Portfolio Entrance Orchestration | Actioned | Targeted lint/build; direct and Home → Work timing screenshots; gate, drawer, and transition regression suite | Not requested | Shell release owns timing; Portfolio retains local card/dial transforms and a static route-in field |
| Project-Triggered Portfolio Access Gate | Actioned | Content validator; Chromium/WebKit project-gate audits; six-project drawer audit | Not requested | Preview-first route; protected click gate; exact-project continuation; Portfolio-wide cookie/session grant |

## Product and engineering decisions

- [x] Keep the full live Portfolio deck available before authorisation.
- [x] Use explicit per-project `access: "public" | "protected"` metadata and fail closed at runtime.
- [x] Reuse the existing cookie/session access contract and in-window overlay/depth helpers.
- [x] Store one pending project identity and focus source in `PortfolioScrollApp`; never store a pre-gate card rectangle.
- [x] Close the gate before remeasuring the selected card and invoking the existing drawer handoff.
- [x] Keep the route URL/history stable and unlock all protected projects with one grant.
- [x] Preserve the orbital deck, card interactions, drawer, handoff, shell, Button Bar, and reduced-motion behavior.
- [x] Add no dependency, route, global store, per-project code system, or replacement animation framework.

## Implementation record

- Entrance release is shared by direct boot and SPA route-in through the existing Portfolio reveal event.
- The route module preloads Portfolio data/config and warms thumbnails before destination commit.
- Title, context, active/adjacent cards, dial, and field now resolve in the Home hierarchy without replacing card transforms.
- The field renders a deterministic static composition during route-in and reduced motion, then resumes drift only when allowed.
- Portfolio is route-public; protected-project intent opens the React gate over the still-mounted deck.
- Invalid code leaves drawer/handoff state untouched. Acceptance persists access, closes the gate, waits two animation frames, remeasures the selected card, and uses the original open path.
- Dismissal restores deck input, field/video state, and focus; route unmount clears stale intent and modal state.
- `contents-portfolio.json` explicitly marks all six current projects protected. Public-project behavior is covered by the browser audit fixture.
- `check:portfolio-content` rejects missing/unsupported access metadata and is included in `check:site`.
- Production design, Portfolio, transition, layer, and theme documentation now describe the preview-first behavior; the old ghost scene remains dormant rather than being deleted.

## Verification record

| Check | Result | Evidence / note |
| --- | --- | --- |
| Targeted Portfolio ESLint | Pass | Production JS/JSX files changed by this packet |
| `npm run check:portfolio-content` | Pass | Six explicit, valid project access modes |
| App Vite production build | Pass | Existing dynamic-import and chunk-size warnings only |
| Chromium `audit:portfolio-gate` | Pass | `output/playwright/portfolio-gate-audit/chromium-report.json` |
| WebKit `audit:portfolio-gate` | Pass | `output/playwright/portfolio-gate-audit/webkit-report.json` |
| `audit:portfolio-drawer` | Pass | All six projects open and close |
| Chromium/WebKit `audit:portfolio-transition` | Pass | Full desktop `3×` and mobile `2×` repeated handoff cycles in both engines |
| Chromium/WebKit `audit:transition-flows` | Pass | Normal, strict RAF, and reduced-motion route sequences |
| `audit:portfolio-carousel` | Baseline exception only | Packet-specific reduced-motion/static-field checks pass; the same five pre-existing centering/crowding assertions and identical measurements remain in the 09:02 and 10:50 artifacts |
| Direct-load and Home → Work visual review | Pass | Final geometry, static early field, title/context/action/support order inspected |
| Source lint | Pass | `npm run lint --prefix react-app/app -- --ignore-pattern dist-certify` |
| Design config and production build | Pass | `check:design-config`, root build, and `check:about-production` |
| Canonical `check:site` | External artifact exception | All checks through Portfolio validation pass; lint then includes unrelated generated `react-app/app/dist-certify/` bundles and reports 385 minified-output errors |

## Final closeout checklist

- [x] Both PRDs implemented in dependency order.
- [x] Existing visual language and project handoff preserved.
- [x] Desktop/mobile, light/dark, keyboard, focus, invalid/valid code, persistence, reset, interruption, and reduced motion covered by the gate audit.
- [x] Production docs and canonical content validation updated.
- [x] Long carousel stress audit rerun; the updated reduced-motion/static-field contract passes and unchanged baseline layout failures are recorded separately.
- [x] Chromium/WebKit route/project transition audits pass serially, including strict RAF and reduced motion.
- [x] Canonical `npm run check:site` result recorded, with the unrelated `dist-certify/` lint failure separated and all remaining stages rerun successfully.
- [x] Final packet diff passes `git diff --check`; unrelated concurrent About Narrative and generated-artifact changes remain untouched.

## Archive record

Both PRDs were moved into `archive/actioned/` after implementation and closeout on 17 July 2026. No commit was requested for this packet.
