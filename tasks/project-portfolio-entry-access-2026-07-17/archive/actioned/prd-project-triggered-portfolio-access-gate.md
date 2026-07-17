# PRD: Project-Triggered Portfolio Access Gate

## Status and dependency

Actioned on 17 July 2026 after `prd-portfolio-entrance-orchestration.md`, so unauthenticated visitors arrive on a complete, polished Portfolio preview before access is requested.

This PRD moves the access boundary from Portfolio route entry to protected project opening. It must preserve the existing selected-card-to-drawer media handoff and must not begin that handoff until access is accepted and the modal/deck geometry has fully settled.

## Introduction / Overview

Allow every visitor to enter and explore the live Portfolio deck. Ask for the invite code only when an unauthorised visitor attempts to open a protected project. After a correct code:

1. persist Portfolio-wide access using the existing cookie/session contract;
2. close the access overlay;
3. restore the exact selected card to stable final geometry;
4. continue the original project-open intent through the existing drawer handoff;
5. allow all other protected projects to open without another gate.

Public projects, when authored, open directly without showing the gate. Protected projects share one Portfolio-wide code and one Portfolio-wide access grant.

The gate remains client-side access friction, not secure authentication. The current static site publicly ships the code, project JSON, images, and videos. A determined visitor can inspect or request those resources without using the UI. This PRD deliberately recommends the smallest UX change that matches the brief; real NDA-grade protection requires a separate server/edge-auth and private-asset project.

## Current-State Analysis

### Current access boundary

- `routes.js` marks Portfolio as `gated: true`.
- `computeRouteState()` calls `hasGateAccess('portfolio')` before the route view/runtime is selected.
- Without access, `PortfolioRoute.jsx` returns a different locked route tree with `legacyRuntime: false`.
- The locked route mounts `PortfolioGateScene` and `PortfolioGateRoute`; it does not boot the live deck, field, Portfolio JSON, project copy, thumbnails as DOM nodes, videos, drawer, or handoff.
- A correct code writes `abs_portfolio_ok` to a one-year `SameSite=Lax` cookie and to `sessionStorage`, clones a static scene bridge, and performs a same-route `gate-success` navigation.
- The same-route transition swaps the locked route tree for the live route tree, waits for the deck runtime, fades the bridge, and releases the deck.

That architecture correctly keeps the real runtime out of the locked route, but it cannot show the desired live preview. The access decision occurs before there is a project click or a project runtime capable of retaining that intent.

### Current project-open path

`PortfolioScrollApp.openProjectByIndex()` currently performs all project-open side effects immediately:

- stops deck settlement and field motion;
- plays open sound/haptic feedback;
- prefetches project assets and pauses deck videos;
- stores focus and selected project state;
- makes the drawer host interactive and the deck inert;
- synchronises project content;
- marks the originating card selected;
- starts `PortfolioProjectHandoff.open()` from the selected card media to the drawer hero.

The access check must happen before every one of those side effects. In particular, the drawer and shared-media bridge must not mount or animate while the code gate is open.

### Existing reusable infrastructure

- `access-gates.js` already owns the invite code, code length, cookie/session persistence, URL-code consumption, and access lookup.
- `ShellWindowOverlay` already provides the correct in-window blur/content layers clipped above the Button Bar.
- `gate-modal-shared.js` and the simulation-focus chooser already demonstrate modal phase, backdrop/depth, focus, Escape, and dismissal behavior.
- `useShellRouteTransition` already owns the global `modal-open` phase through transition events.
- The Portfolio deck already has an event boundary (`abs:portfolio:open-project`) and a local drawer/handoff state machine.

The implementation should reuse these surfaces instead of adding a router-level auth state, a new modal library, or a second global transition owner.

## Resolved Product Decisions

The brief and code analysis resolve the core product decisions:

1. **Preview first:** the Portfolio route and full live deck are accessible without a code.
2. **Gate trigger:** an unauthorised click/Enter/Space on a protected active card opens the access overlay.
3. **Grant scope:** one accepted Portfolio code unlocks every protected project.
4. **Persistence:** reuse the existing one-year cookie plus sessionStorage fallback; do not introduce a new storage system.
5. **Continuation:** after successful access, open the exact project that triggered the gate.
6. **Sequencing:** close the gate and restore stable card geometry before beginning the existing drawer handoff.
7. **Public projects:** support an explicit per-project access field; public projects bypass the gate.
8. **Fail-closed content:** missing or invalid access metadata is treated as protected.
9. **No route hop:** successful access stays on the clean Portfolio URL and does not remount or re-enter the route.
10. **Security level:** client-side access friction is accepted for this minimal implementation; it is not represented as secure NDA protection.

## Security Boundary

### Recommended v1: client-side access friction

This is the fastest, lightest solution and preserves the current static hosting model:

- the code remains in client JavaScript;
- the access cookie is JavaScript-readable, not `HttpOnly` or signed;
- the project index, details, images, and videos remain publicly requestable;
- the gate prevents casual UI access only.

Use wording such as “access gate”, “invite code”, or “unlock” in technical documentation. Do not call this secure authentication.

### If actual confidentiality is required

Do not ship the client-only implementation as the security boundary. A secure alternative requires:

- server/edge validation of the invite code;
- a signed, expiring, `Secure`, `HttpOnly`, `SameSite` session cookie;
- private project-detail and media storage;
- authorised API/media requests;
- cache and revocation policy;
- a hosting/deployment change away from purely public static GitHub Pages resources.

That is a separate large PRD. Splitting the current JSON into two public static files is not security because both files remain public.

## Options Considered

| Option | Speed / overhead | Advantages | Problems | Decision |
| --- | --- | --- | --- | --- |
| Keep route-entry gate | Already implemented | Does not boot real project content before access | No preview; contradicts brief; same-route unlock is complex | Reject |
| Intercept protected project open in the live deck | Smallest complete diff | Preserves static hosting, current code/storage, overlay, drawer, and handoff; exact-click continuation | UX friction only, not secure | **Recommend for v1** |
| Split public deck index from static project-detail JSON | Medium diff | Reduces casual detail loading before access | Static detail/media URLs remain discoverable; duplicates content-fetch paths | Reject as false security |
| Add server/edge auth and private assets | Largest diff | Real confidentiality boundary | New infrastructure, hosting, APIs, session lifecycle, deployment, and operations | Separate future PRD if required |
| Create a dedicated gate route/modal router state | Medium-large diff | Explicit URL/state representation | Adds route/remount/history complexity and risks the drawer handoff | Reject |

## Project Access Data Contract

Add one explicit authored field to each Portfolio project:

```json
{
  "id": "chapter-example",
  "access": "protected"
}
```

Allowed values:

- `"protected"`: requires Portfolio-wide access before opening.
- `"public"`: opens directly for every visitor.

Normalization rules:

- Missing `access` resolves to `"protected"`.
- Unsupported values resolve to `"protected"` at runtime and fail the content/audit validation so the author sees the error.
- Access is authored in `contents-portfolio.json`; do not create a second list of protected IDs in JavaScript or design configuration.
- The initial migration must mark every current project explicitly. Until the owner names public projects, use `"protected"` as the safe initial value.
- One Portfolio-wide grant bypasses the gate for all projects whose access is `"protected"`.
- This v1 does not support different codes per project.

## Interaction and State Contract

### Normal unauthorised preview

- Portfolio boots exactly like the authorised route: intro, field, cards, dial, carousel input, card labels, and approved thumbnail media are visible.
- No gate is present on route entry.
- The visitor can wheel, drag, scroll, use arrow keys, focus active cards, and inspect project titles.
- A public card opens through the existing drawer path.

### Protected-card request

When the active, settled protected card is activated without Portfolio access:

1. store one pending intent in `PortfolioScrollApp`: project ID/index, input type, and focus source;
2. do not call the current project-open side-effect path;
3. place the deck in a local `access-pending` input state and stop settlement without changing its active index;
4. pause field movement and active-card video on the current deterministic frame;
5. dispatch one access-request event to the React-owned gate;
6. open the in-window overlay, set global phase to `modal-open` through the existing transition event contract, and focus the first code input.

The drawer host remains hidden/inert, `aria-expanded` remains false, and there is no media bridge.

### Invalid code

- Preserve the current error haptic.
- Apply error feedback only to the code group; do not shake or move the deck.
- Clear the digits after approximately `150ms` and focus the first digit.
- Keep the pending project intent and the gate open.
- Do not write access storage or preload/open the drawer.

### Correct code

The recommended handoff is:

| Relative time | State | Required behavior |
| ---: | --- | --- |
| `0ms` | Accepted | Mark gate accepted/busy, disable inputs, write access cookie/session, success haptic, run the existing success pulse. |
| `0–180ms` | Confirmation | Keep the deck frozen and the gate readable; do not start the drawer. |
| approximately `180–420ms` | Gate close | Use the existing fast gate-handoff/modal-return vocabulary. Remove the access modal and restore the live deck as one complete group. |
| After overlay/depth settlement | Continue intent | Return global phase to `idle`, revalidate stored access and pending project identity, remeasure the current active card, then call the existing drawer-open path once. |
| Existing drawer duration | Drawer opening | Preserve the current shared-media handoff and project-specific content animation. |

The gate and drawer animations must not overlap. Measuring the handoff source while the deck is still depth-scaled or blurred would give the wrong card rectangle and cause a visible jump.

### Dismissal

- Close button, Escape, or permitted backdrop dismissal cancels the pending intent.
- Restore the deck, field, videos, input state, and focus to the originating active card.
- Do not replay the Portfolio route entrance or card reveal.
- Do not change the URL, active project index, or access storage.
- The return must be simpler and faster than the first Portfolio entrance, targeting completion within `240ms` after modal dismissal begins.

### Already authorised

- Protected projects take the existing direct drawer path without showing the gate.
- The open path must still remeasure the active card immediately before handoff.
- A reload, new tab on the same site, or later return reads the existing cookie and stays unlocked.

## Minimal Event Boundary

Use a narrow event bridge because React owns the in-window modal and the imperative Portfolio runtime owns card/drawer state.

Recommended events:

- `abs:portfolio:request-access`: deck → gate; detail contains `gateId: 'portfolio'` and non-sensitive project ID/index for diagnostics.
- `abs:portfolio:access-granted`: gate → deck after the overlay is fully closed; detail contains `gateId` only. The deck uses its own stored pending intent.
- `abs:portfolio:access-dismissed`: gate → deck after close; clears pending intent and restores focus/input.

Rules:

- The deck is the only owner of pending project intent.
- The gate must not open a project by itself.
- Events are ignored when the active route/runtime generation is no longer Portfolio.
- Repeated requests while one gate is open are ignored.
- Grant continuation rechecks `hasGateAccess('portfolio')` and validates that the pending project still exists.
- Route unmount cancels pending intent and modal state; a stale grant can never open a drawer on another route.

## Goals

- Show the full live Portfolio preview to unauthorised visitors.
- Trigger the gate only from a protected project-open intent.
- Keep public projects immediately accessible.
- Persist one Portfolio-wide grant using the existing cookie/session behavior.
- Resume the exact protected project after successful access.
- Ensure no drawer, hero, or shared-media opening animation starts before access succeeds.
- Preserve stable card geometry between gate close and drawer handoff.
- Preserve cancel, keyboard, focus, reduced-motion, route interruption, and storage behavior.
- Replace the route-gate audit with project-intent coverage.
- Keep implementation changes small and reuse existing overlay/access/handoff infrastructure.

## User Stories

### US-001: Browse Portfolio without a code

**Description:** As a prospective client or recruiter, I want to see the live Portfolio deck immediately so I can understand the quality and range of work before deciding to request access.

**Acceptance Criteria:**

- [ ] `/portfolio.html` always mounts the live Portfolio route and runtime regardless of access storage.
- [ ] No gate appears on direct load or SPA arrival.
- [ ] Intro, field, cards, labels, approved thumbnails, dial, and carousel input work without access.
- [ ] The Portfolio entrance from the dependent PRD runs for unauthorised and authorised visitors alike.
- [ ] Clearing access storage does not replace the route with the old ghost scene.
- [ ] Button Bar, route URL, field, card counts, and carousel behavior match the current authorised deck.
- [ ] `npm run check:site` passes.
- [ ] Verify in browser using the dev-browser skill.

### US-002: Author public and protected projects

**Description:** As the site owner, I want project access declared with project content so I can change a project from protected to public without editing application logic.

**Acceptance Criteria:**

- [ ] Every authored project contains `access: "public" | "protected"`.
- [ ] Missing access metadata fails closed as protected.
- [ ] Unsupported values fail validation and also fail closed at runtime.
- [ ] No JavaScript allowlist/denylist duplicates the content field.
- [ ] A public project opens without a code even when no Portfolio cookie/session exists.
- [ ] A protected project requests access when no grant exists.
- [ ] Project order, cards, copy, content blocks, and media are unchanged by the metadata addition.
- [ ] `npm run check:site` passes.

### US-003: Gate a protected project before drawer opening

**Description:** As the site owner, I want protected detail views blocked until a visitor enters the invite code while still allowing the deck preview.

**Acceptance Criteria:**

- [ ] Mouse/touch click and keyboard Enter/Space use the same access decision.
- [ ] The access check occurs before sound/haptic `open`, project asset prefetch, drawer sync, background inerting, `aria-expanded=true`, or media handoff.
- [ ] The live deck remains visible beneath the in-window blur and stops above the Button Bar.
- [ ] The active card/index and final orbit geometry do not change while the gate is open.
- [ ] No `.portfolio-project-media-bridge` exists and the drawer remains hidden/inert while access is pending.
- [ ] Global transition phase is `modal-open`, owned through the existing shell transition contract.
- [ ] The first input receives focus and the modal traps Tab/Shift+Tab.
- [ ] `npm run check:site` passes.
- [ ] Verify in browser using the dev-browser skill.

### US-004: Recover from an incorrect code

**Description:** As a visitor, I want a wrong code to be easy to retry without losing the project I was trying to open.

**Acceptance Criteria:**

- [ ] Non-numeric input is rejected using the current digit-input behavior.
- [ ] A complete incorrect code triggers error haptic and visible local error feedback.
- [ ] Inputs clear after approximately `150ms` and focus returns to digit one.
- [ ] Pending project ID/index, active card, deck position, and modal-open phase remain unchanged.
- [ ] No access cookie/session is written.
- [ ] No project content drawer or handoff begins.
- [ ] Repeated invalid attempts create no duplicate listeners, timers, or events.
- [ ] Verify in browser using the dev-browser skill.

### US-005: Continue the clicked project after successful access

**Description:** As a visitor, I want the project I selected to open automatically after my code is accepted so I do not have to find and click it again.

**Acceptance Criteria:**

- [ ] The correct code writes the existing Portfolio access cookie and sessionStorage value once.
- [ ] Inputs become disabled/busy and the existing success pulse/haptic runs.
- [ ] The gate closes completely before drawer opening begins.
- [ ] Global phase returns to `idle` and the deck is no longer depth-scaled or blurred before source measurement.
- [ ] The pending project's active card is remeasured immediately before `PortfolioProjectHandoff.open()`.
- [ ] The existing shared-media bridge begins from the selected card's current media rectangle.
- [ ] Exactly one drawer opens, containing the project that originally triggered the gate.
- [ ] The drawer's existing open duration, content reveal, hero motion, focus, cursor, sound, and haptic behavior are unchanged.
- [ ] The URL remains the clean Portfolio URL with no same-route navigation or extra history entry.
- [ ] `npm run check:site` passes.
- [ ] Verify in browser using the dev-browser skill.

### US-006: Unlock every protected project

**Description:** As an authorised visitor, I want one accepted code to unlock the full protected portfolio so I am not interrupted repeatedly.

**Acceptance Criteria:**

- [ ] After successful access, closing the first drawer and opening any other protected project does not show the gate.
- [ ] Access survives Portfolio reload and later same-site navigation through the one-year cookie.
- [ ] SessionStorage provides same-tab fallback behavior.
- [ ] Existing supported URL invite parameters still grant access, clean themselves from the URL, and do not show the gate on the next protected click.
- [ ] Clearing both the cookie and sessionStorage returns only protected project clicks to gated behavior; the Portfolio preview remains live.
- [ ] Public projects remain unaffected by access storage.
- [ ] Verify in browser using the dev-browser skill.

### US-007: Dismiss the gate safely

**Description:** As a visitor, I want to close the access prompt and continue browsing from exactly where I was.

**Acceptance Criteria:**

- [ ] Close control and Escape cancel the pending intent.
- [ ] Backdrop dismissal follows the chosen modal policy consistently on desktop and touch devices.
- [ ] The modal return completes within approximately `240ms` under normal motion.
- [ ] Focus returns to the originating active card and its `aria-expanded` remains false.
- [ ] Field, video, carousel input, and deck status resume without replaying the route entrance.
- [ ] Active project index and deck position do not change.
- [ ] No stale modal class, phase, inert state, timer, or event listener remains.
- [ ] Verify in browser using the dev-browser skill.

### US-008: Handle interruption and repeated input

**Description:** As a visitor, I want the site to remain stable if I double-click, navigate away, resize, or use browser history during the gate flow.

**Acceptance Criteria:**

- [ ] Rapid repeated protected-card activation opens one modal and stores one pending intent.
- [ ] Route change/unmount during modal open cancels pending intent and removes the modal without opening a drawer.
- [ ] A delayed/stale granted event is ignored after route generation changes.
- [ ] Resize while the gate is open does not premeasure or begin a drawer handoff.
- [ ] Browser back/forward leaves global phase and overlay state valid.
- [ ] Reduced motion closes the gate without travel/blur/stagger and then uses the existing reduced-motion drawer path.
- [ ] No bridge node, drawer node, or access-pending state leaks after any interruption.
- [ ] `npm run check:site` passes.
- [ ] Verify in browser using the dev-browser skill.

### US-009: Replace route-gate audit coverage

**Description:** As a maintainer, I want automated proof of the new preview → gate → exact-project flow so future changes do not silently restore route gating or start the drawer too early.

**Acceptance Criteria:**

- [ ] `audit:portfolio-gate` is rewritten around project intent rather than the static ghost-route scene.
- [ ] The audit covers public bypass, protected gate, invalid code, valid code continuation, second protected project bypass, reload persistence, and storage reset.
- [ ] It asserts no drawer/bridge before grant and exact project identity after grant.
- [ ] It asserts the gate closes and global phase is `idle` before the media bridge is measured/created.
- [ ] It covers click, Enter/Space, Escape/close, rapid repeat, route-away cancellation, reduced motion, desktop/mobile, and light/dark.
- [ ] It verifies clean URL/history behavior.
- [ ] It captures preview, modal-open, accepted, gate-closing, drawer-opening, and settled-drawer screenshots.
- [ ] Chromium and WebKit project/route transition audits pass serially.
- [ ] Screenshot artifacts are inspected, not merely generated.

## Functional Requirements

- **FR-1:** Portfolio route definition must no longer cause route-level access gating.
- **FR-2:** `PortfolioRoute.jsx` must always return the live deck/runtime view and must mount one Portfolio project-access gate in the shell's window overlay host.
- **FR-3:** Project content must support explicit `access: "public" | "protected"`; missing/invalid values fail closed.
- **FR-4:** `openProjectByIndex()` or its immediate caller must perform the project access decision before any drawer-open side effect.
- **FR-5:** Public projects and authorised protected projects must use the existing open path without modal delay.
- **FR-6:** Unauthorised protected projects must store one deck-owned pending intent and dispatch one gate request.
- **FR-7:** Pending intent must include stable project identity and focus source; card geometry must be remeasured after modal close rather than stored before the modal depth effect.
- **FR-8:** While gate-open, drawer host remains hidden/inert, project cards remain `aria-expanded=false`, and no handoff bridge exists.
- **FR-9:** The access modal must use the in-window overlay clipped above the Button Bar and reuse current gate copy/input material unless copy is explicitly revised.
- **FR-10:** The shell transition hook remains the only owner of global modal phase; the gate uses the existing open/close event contract.
- **FR-11:** Correct code must call `markGateAccess('portfolio')` before the modal begins closing.
- **FR-12:** Project continuation must occur only after modal/backdrop/depth close is complete and global phase is `idle`.
- **FR-13:** Grant continuation must recheck access, validate the pending project against current data/runtime generation, and open exactly once.
- **FR-14:** One grant unlocks every protected project through the existing `hasGateAccess('portfolio')` lookup.
- **FR-15:** Dismissal must clear pending intent, restore field/video/input/focus, and not replay route entrance.
- **FR-16:** Route unmount, runtime destroy, popstate, and stale generation must cancel modal and pending intent without drawer opening.
- **FR-17:** Existing cookie name, code, URL invite parameters, `SameSite=Lax`, path, and one-year maximum age remain unchanged unless a separate security decision is approved.
- **FR-18:** The clean Portfolio URL must remain unchanged through request, rejection, acceptance, and drawer opening.
- **FR-19:** No new external dependency, global state store, router route, API, or per-project code system may be added.
- **FR-20:** Production docs and audits must stop describing the static ghost scene as the active gate.

## Technical Plan

### 1. Make Portfolio route-public without broad transition refactoring

- Change the Portfolio route definition so `computeRouteState()` no longer returns `lockedGateId: 'portfolio'` for ordinary Portfolio navigation.
- Remove the locked branch from production `getPortfolioRouteView()` and always boot `PORTFOLIO_ROUTE_RUNTIME`.
- Mount the access-gate component through `windowOverlayContent` on the live Portfolio view.
- Do not remove generic route-gate or `gate-success` transition infrastructure in this PRD; it may serve other flows and deleting it would widen the diff.

### 2. Reuse and retarget the gate component

- Refactor/rename `PortfolioGateRoute.jsx` to a project-access modal component while reusing its copy, six digit inputs, paste/advance/backspace behavior, success pulse, and haptics.
- Remove its same-route navigation and static scene bridge responsibilities.
- Add close control, dialog semantics, focus trap, Escape handling, mount/active/closing state, and focus restoration using the simulation-focus chooser as the local pattern.
- Add a Portfolio-specific open marker only as a visual selector for `ShellWindowOverlay`; global phase still comes from the shell hook.
- Reuse current desktop/mobile gate blur values and current light/dark surface ownership.

### 3. Guard the existing open path at its top

Keep one main open method. At its beginning:

1. resolve the project and normalised access mode;
2. if public or `hasGateAccess('portfolio')`, continue unchanged;
3. otherwise create pending intent, freeze local deck input/material, and dispatch the gate request;
4. return before current open side effects.

On grant, call the same method with an internal, non-public continuation flag only after rechecking access. Do not duplicate the existing drawer-open body into a second authorised function unless extraction is a net deletion.

### 4. Keep pending intent in the deck runtime

- Add one nullable pending-intent field to `PortfolioScrollApp`.
- Store project ID/index and focus source, not a stale card rectangle.
- Use the current active card lookup after modal close to obtain fresh geometry.
- Clear pending intent on dismissal, successful continuation, destroy, route change, and invalid project identity.
- Expose pending gate state through the existing audit snapshot only.

### 5. Sequence modal return before drawer handoff

- Use the established fast gate-handoff/modal-return timing for accepted/cancel paths.
- Ensure the in-window overlay has removed pointer/visibility state and the scene has restored scale/translation/filter before dispatching `access-granted`.
- Confirm global phase is `idle` before calling the drawer open path.
- Under reduced motion, settle overlay state immediately, then invoke the existing reduced-motion handoff; do not overlap the two.

### 6. Preserve access storage and URL compatibility

- Reuse `getGateInviteCode`, `getGateCodeLength`, `hasGateAccess`, and `markGateAccess`.
- Do not add localStorage access state.
- Continue consuming supported invite-code query parameters and cleaning them from history.
- Because Portfolio is no longer route-gated, ensure access lookup is invoked when Portfolio mounts or before project intent so a URL code is consumed even without a protected click.
- Keep development preview behavior explicit and covered so it cannot mask unauthorised production tests.

### 7. Retain the former ghost scene for a later explicit cleanup decision

`PortfolioGateScene.jsx` and its static-poster CSS become non-production after this change. Do not delete them solely because imports disappear; repo policy requires explicit approval for legacy-surface removal. Remove production references and document them as dormant cleanup candidates. A later cleanup can delete the scene, gate-success bridge branches, and old audit assumptions after confirming no fixture or rollback dependency remains.

## Likely Files

Primary implementation:

- `react-app/app/src/lib/routes.js`
- `react-app/app/src/lib/access-gates.js`
- `react-app/app/src/routes/portfolio/PortfolioRoute.jsx`
- `react-app/app/src/routes/portfolio/PortfolioGateRoute.jsx` or a narrowly renamed successor
- `react-app/app/src/legacy/modules/portfolio/app.js`
- `react-app/app/public/config/contents-portfolio.json`
- `react-app/app/public/css/portfolio.css`
- `react-app/app/public/css/main.css` only for the minimal in-window overlay selector if it cannot remain Portfolio-local

Contract and verification:

- `docs/reference/PORTFOLIO.md`
- `docs/reference/TRANSITION-ORCHESTRATION.md`
- `docs/reference/LAYER-STACKING.md` only if overlay ownership text needs clarification
- `DESIGN.md` because the active Portfolio gate behavior changes
- `scripts/audit-portfolio-gate-flow.mjs`
- `scripts/audit-portfolio-drawer-open.mjs`
- `scripts/audit-portfolio-project-transition.mjs`
- `scripts/audit-transition-flows.mjs`

Avoid changing project drawer/handoff implementation, card geometry, route URLs, Button Bar, shell layers, content-block rendering, or field tuning.

## Implementation Sequence

1. Add/adjust audit fixtures so one project path can prove public bypass and one can prove protected gating without guessing production content policy.
2. Add and validate the project `access` content field with fail-closed normalization.
3. Make Portfolio route-public and always boot the live deck.
4. Refactor the current gate form into an in-window project-access modal.
5. Add the top-of-open access guard and deck-owned pending intent.
6. Add accepted/dismissed event continuation with generation and route safety.
7. Ensure modal close/depth settlement precedes fresh card measurement and existing handoff open.
8. Preserve URL invite, cookie, session, reload, and reset behavior.
9. Rewrite the gate audit for preview/project-intent behavior.
10. Run canonical checks and focused Chromium/WebKit audits; inspect all timing screenshots and the final diff.

## Non-Goals

- No secure server authentication, signed session, user accounts, password reset, rate limiting, or revocation UI.
- No private CDN/object storage or protected media endpoint.
- No claim that public static project resources are NDA-secure.
- No different code per project.
- No route redirect, gate route, same-route navigation, URL modal state, or new history entry.
- No redesign of gate typography, input material, copy, blur, or success pulse beyond adapting it to modal semantics.
- No changes to project drawer, shared-media handoff, hero animation, project content, or close reversal.
- No changes to Portfolio entrance, carousel, field tuning, card art direction, or Button Bar.
- No automatic deletion of the former ghost scene or generic gate transition code.
- No external modal/auth/state dependency.

## Accessibility Requirements

- Access modal uses `role="dialog"`, `aria-modal="true"`, labelled title, and described-by copy.
- Focus moves to the first digit when opened and is trapped within the modal.
- Escape and the visible close control cancel the request.
- Correct/incorrect state is visible and announced; haptics are supplemental only.
- Inputs expose digit position and total length, retain paste behavior, and use numeric input mode.
- Background deck is pointer- and keyboard-inert while the modal is open, but remains visually present.
- Dismissal returns focus to the originating active card.
- Successful continuation moves focus according to the existing drawer contract.
- Reduced motion removes depth travel, blur interpolation, stagger, and media travel while preserving complete state changes.

## Verification Plan

Build and serve a production preview separately, then run serially:

```bash
npm run check:site
ABS_DEV_URL=http://localhost:8013 npm run audit:portfolio-gate
ABS_DEV_URL=http://localhost:8013 npm run audit:portfolio-carousel
ABS_DEV_URL=http://localhost:8013 npm run audit:portfolio-drawer
ABS_DEV_URL=http://localhost:8013 npm run audit:portfolio-drawer:pointer
ABS_DEV_URL=http://localhost:8013 npm run audit:portfolio-transition
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium ABS_TRANSITION_STRICT_RAF=1 npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit ABS_TRANSITION_STRICT_RAF=1 ABS_TRANSITION_HARD_TIMEOUT_MS=300000 npm run audit:transition-flows
npm run certify:screens
```

Required gate scenarios:

1. No storage → direct Portfolio preview, no gate.
2. No storage → public project opens directly.
3. No storage → protected click opens gate; drawer/bridge absent.
4. Incorrect code → retry with exact pending project preserved.
5. Correct code → gate closes, phase idle, exact project handoff begins.
6. Close drawer → second protected project opens without gate.
7. Reload/new same-site navigation → cookie preserves access.
8. Clear cookie and session → live preview remains; next protected click gates.
9. URL invite code → URL cleans and protected project opens directly.
10. Gate cancel/Escape → focus, deck, field, video, and input restore.
11. Double activation and route-away interruption → no duplicate/stale open.
12. Reduced motion → sequential state change with no gate/drawer overlap.

Required visual matrix:

- `1440×900`, `768×1024`, `390×844`, `320×568`, `844×390`, and `600px/601px` boundary.
- Light and dark.
- Chromium and WebKit.
- Mouse, touch/coarse pointer, and keyboard.
- Preview, modal open, invalid, accepted, closing, drawer opening, drawer settled, cancel return.

Screenshot review must confirm the live deck remains recognisable under the gate, the Button Bar is never covered, no drawer/bridge appears early, the card does not jump between modal close and handoff, and cancel does not replay the Portfolio entrance.

## Success Metrics

- Every visitor sees an interactive Portfolio preview without entering a code.
- A protected project click opens the access modal before any drawer-open side effect.
- Correct access opens the exact originally selected project without a second click.
- Gate overlay and scene depth are fully settled before card handoff geometry is measured.
- One accepted code unlocks all protected projects across the existing cookie lifetime.
- Public projects never show the gate.
- Gate dismissal restores the same card/focus/deck within approximately `240ms` without route re-entry.
- No route navigation, URL mutation beyond supported invite-code cleanup, duplicate drawer, stale bridge, or leaked modal phase occurs.
- Implementation adds no dependency, backend, global store, per-project code system, or second transition owner.

## Risks and Mitigations

- **Risk: stakeholders assume the gate secures NDA content.** Mitigation: document the client-only boundary prominently; require a separate secure-auth decision before making confidentiality claims.
- **Risk: drawer geometry is measured while the deck is depth-scaled.** Mitigation: dispatch grant only after modal/depth close and remeasure the active card then.
- **Risk: public/protected lists drift.** Mitigation: author one field in each project record and fail closed; no JavaScript ID list.
- **Risk: modal and drawer compete for focus/inert ownership.** Mitigation: gate fully closes and restores the deck before the existing drawer path begins.
- **Risk: stale grant opens a project after navigation.** Mitigation: runtime-generation checks plus deck-owned pending intent cleared on destroy/unmount.
- **Risk: route-public change leaves old gate branches in production logic.** Mitigation: remove production references, update docs/audit, and defer deletion of dormant surfaces to an approved cleanup.
- **Risk: development auto-access hides production behavior.** Mitigation: gate audits use production preview, clear cookie/session explicitly, and assert unauthorised state before every protected scenario.

## Open Questions

1. **Which current projects are public?** This is not implementation-blocking. Migrate all current records to `"protected"` unless the owner explicitly marks named projects `"public"`; changing the field later is content-only.
2. **Is real NDA-grade confidentiality required?** If yes, the client-only implementation is not an acceptable security boundary and a separate server/private-asset PRD is required before launch. If the current gate is intentionally casual access friction, proceed with the recommended minimal implementation.
