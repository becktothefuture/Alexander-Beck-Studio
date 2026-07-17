# PRD: Portfolio Entrance Orchestration

## Status and dependency

Actioned on 17 July 2026 before `prd-project-triggered-portfolio-access-gate.md`, so the public Portfolio preview received its polished, verified arrival before becoming the unauthenticated default.

This PRD changes entrance orchestration only. It must not redesign the orbital deck, retime project drawer opening/closing, or replace any existing card, field, handoff, sound, haptic, cursor, or hover behavior.

## Introduction / Overview

Make the Portfolio route arrive with the same movement vocabulary and hierarchy as Home while preserving the Portfolio animations that already work well.

Home currently establishes route content in a deliberate order: identity, supporting context, action, then secondary detail. It starts readable objects in their final geometry and resolves them from low opacity, slight blur, a `3px` downward offset, and a `0.994` uniform scale using the shared organic easing. Portfolio already contains most of those ingredients, but they are split across three independent systems:

1. the shell's compact route-in entrance;
2. the Portfolio runtime's card reveal;
3. the particle field's lifecycle visibility.

Those systems do not currently share one release moment. The result is especially weak on direct load, where most Portfolio motion completes behind the boot overlay, and on SPA navigation, where cards can become readable before the title and description while the field arrives only after the route transition has ended.

The recommended solution is a small coordination change: keep the shell as the single route-transition owner, reuse the existing Portfolio reveal event as the release boundary for Portfolio-owned material, and make direct boot trigger the same ordered entrance after the boot overlay is gone. Do not add a second general animation framework.

## Current-State Analysis

### Home baseline

The Home direct-load entrance is intentionally more expansive because it has more content:

- Identity begins at `0ms`, with the second identity line at `58ms`.
- Six legend items begin at `360ms` and stagger by `96ms`.
- Context begins at `1340ms`.
- Action begins at `1740ms`.
- Footer/support begins at `2100ms`.
- The full direct-load choreography is cleaned up at approximately `3900ms`.

SPA route entrances use a compact version of the same hierarchy:

| Group | Start | Step | Duration |
| --- | ---: | ---: | ---: |
| Identity | `0ms` | `58ms` | `420ms` |
| Legend | `90ms` | `36ms` | `460ms` |
| Context | `210ms` | `54ms` | `480ms` |
| Action | `300ms` | `54ms` | `440ms` |
| Footer/support | `360ms` | `48ms` | `420ms` |

The compact motion uses `translateY(3px)`, `blur(1.5px)`, `scale(0.994)`, and `cubic-bezier(0.22, 0, 0.16, 1)`.

### Portfolio implementation today

- `createDeckIntro()` marks the title as `identity` and the description as `context`, so they participate in SPA route-in.
- The cards do not participate in the named shell entrance. `app.js` releases them through `is-portfolio-deck-visible` and `is-portfolio-deck-revealing`.
- Card opacity transitions for `560ms`; media filter transitions for `680ms`; card reveal delays use `revealOrder × 40ms`.
- `bootstrapPortfolio()` can release the cards before the shell begins its named route-in entrance.
- The particle field treats both `route-out` and `route-in` as fully hidden suspension states: it clears its canvas and adds `is-suspended`, whose CSS sets opacity to zero and visibility to hidden.
- Direct non-Home routes do not replay Home's post-boot child choreography. Portfolio therefore reveals its cards while the boot overlay is still covering them, and its title/description are already settled when the overlay disappears.

### Browser evidence from the production preview

Read-only Chromium inspection at `1440×1000` confirmed:

- On direct Portfolio load, the active card was already fully revealed before the boot overlay was removed; the title and description were also already at their final opacity.
- On Home → Work SPA navigation, an early destination frame was nearly empty.
- At the first sampled Portfolio route-in frame, the active card was approximately `0.89` opacity, the title approximately `0.66`, the description `0`, and the particle field hidden.
- The field did not become visibly active until the route phase returned to `idle`, after the title, description, and cards had settled.

This is the opposite of the documented hierarchy. The scene does contain good individual animations, but their ownership and release timing are misaligned.

## Resolved Product Decisions

The brief and implementation analysis resolve the decisions that would otherwise require clarification:

1. **Reference language:** approximate Home's depth-emergence vocabulary and information order, not its full `3.9s` duration.
2. **Portfolio pace:** because Portfolio has fewer groups than Home, complete the visible entrance in approximately `720–900ms` after release.
3. **Preservation:** retain the current orbital poses, active-card lead, adjacent-card stagger, particle composition, card press/hover behavior, and drawer handoff.
4. **Ownership:** `useShellRouteTransition` remains the only route-transition sequencer; the Portfolio runtime executes only its local material reveal.
5. **Direct and SPA parity:** both entry paths use the same relative group order and motion vocabulary, even though their release triggers differ.
6. **Reduced motion:** settle all content immediately in final geometry, render the field as a static composition, and apply no travel, blur, scale, or stagger.

## Options Considered

| Option | Speed / diff | Advantages | Problems | Decision |
| --- | --- | --- | --- | --- |
| Retune the existing card CSS only | Fastest / smallest | Keeps all code local to `portfolio.css` | Direct-load motion still runs behind the boot overlay; SPA still has two unrelated clocks; field still arrives last | Reject |
| Put `data-route-enter` on every card | Small apparent diff | Reuses shell group timing | Shell entrance writes inline `transform`; that would temporarily replace the cards' authored 3D orbit transforms and risks pose snaps | Reject |
| Coordinate existing shell markers and Portfolio reveal event | Small, focused diff | Reuses the shell's named groups, preserves card transforms, works for direct and SPA paths, avoids a new framework | Requires a clear prepared-versus-released readiness contract | **Recommend** |
| Generalise Home post-boot choreography into a site-wide entrance service | Largest diff | Clean long-term abstraction | Broad risk to Home and other routes; unnecessary for two Portfolio-specific groups | Defer |
| Capture and retain a visual snapshot through every route switch | Medium-large diff | Could conceal arbitrary destination latency | Adds a new compositing/snapshot system and duplicates an existing simulation-only mechanism | Reject for this PRD |

## Recommended Entrance Timeline

All timings are relative to the moment the destination is visually released. They are implementation baselines, not new author-facing controls.

| Beat | Start | Duration | Owner | Required behavior |
| --- | ---: | ---: | --- | --- |
| Field / scene material | `0–80ms` | shell surface `165ms` SPA; up to `420ms` direct | Shell surface + particle field | Show a static, final-geometry field composition. Do not begin drift yet. |
| Identity: Portfolio title | `0ms` | `420ms` | Existing `identity` marker | Resolve from the shared `3px / 1.5px / 0.994` start state. |
| Context: description | `210ms` | `480ms` | Existing `context` marker | Begin only after identity is recognisable. |
| Action: active card, then adjacent cards | `300ms` | approximately `440–560ms` | Portfolio runtime | Active card leads. Preserve current reveal order and use approximately `40ms` between visual orders. Do not alter final orbit transforms. |
| Support: pagination/dial | `360ms` | `420ms` | Portfolio runtime | Arrive after the primary action begins; remain subordinate. |
| Ambient motion and interaction | after geometry settles, no later than approximately `900ms` | ongoing | Portfolio runtime | Begin field drift/video playback and enable deck input only when the active card is readable and its final geometry is stable. |

The first readable frame must use final layout geometry. No title, card, dial, or field may translate from an off-layout position, and no ambient drift may begin before the entrance geometry has settled.

## Goals

- Make direct Portfolio loads visibly animate after the boot overlay is removed.
- Make Home → Work and other SPA arrivals follow `identity → context → action → support`.
- Remove the near-empty gap between destination commit and the first Portfolio material frame.
- Ensure the title and context lead the active card instead of the card appearing almost complete first.
- Bring the particle field in as early scene material while keeping it static during route-in.
- Preserve the current active-card-first reveal and all final card poses.
- Use one Portfolio material-release boundary for direct load, SPA route-in, and future project-gate return.
- Keep the full entrance within approximately `720–900ms` after release.
- Preserve stable shell geometry, Button Bar presence, reduced motion, focus, and route interruption cleanup.

## User Stories

### US-001: Stage the Portfolio in final geometry

**Description:** As a visitor, I want the Portfolio scene to appear from its final layout so the arrival feels deliberate rather than like content is loading into place.

**Acceptance Criteria:**

- [ ] Title, description, cards, dial, and field are measured and positioned before any of them becomes readable.
- [ ] The first readable title, active card, and field frames differ from their settled rectangles by no more than `2px` per edge.
- [ ] The active card's orbit transform, rotation, scale, crop, and aspect ratio are never replaced by a generic entrance transform.
- [ ] No unpositioned cards, fallback card sizes, blank canvas flash, or geometry snap is visible.
- [ ] The physical window, frame, footer, and Button Bar remain visible and geometrically unchanged.
- [ ] `npm run check:site` passes.
- [ ] Verify in browser using the dev-browser skill.

### US-002: Run a visible direct-load entrance

**Description:** As a visitor opening Portfolio directly, I want the scene to animate after the loader leaves so I experience an authored arrival rather than a finished static page.

**Acceptance Criteria:**

- [ ] Portfolio runtime, content, fonts, thumbnail geometry, and the static field composition prepare behind `#abs-boot-overlay`.
- [ ] Prepared elements remain at their entrance start state while the overlay is visible.
- [ ] `completeDirectBoot()` uses its existing `onOverlayHidden` callback or equivalent established hook to release Portfolio on the next animation frame.
- [ ] Identity begins within two animation frames after the overlay is removed.
- [ ] Context, cards, and dial follow the recommended timeline and are not already complete at overlay removal.
- [ ] Direct-load entrance cleanup completes no later than `1000ms` after overlay removal.
- [ ] A hard reveal fallback still produces a complete, interactive scene if media readiness times out.
- [ ] `npm run check:site` passes.
- [ ] Verify in browser using the dev-browser skill.

### US-003: Align SPA route-in with Home's hierarchy

**Description:** As a visitor moving from Home to Work, I want Portfolio to resolve in an understandable order so the transition feels related to Home rather than like several animations competing.

**Acceptance Criteria:**

- [ ] The outgoing route remains materially present until the Portfolio module/preparation promise is ready to commit or a bounded fallback is reached.
- [ ] Destination route-in does not begin until final Portfolio geometry is stable enough to reveal.
- [ ] The Portfolio title begins before the active card.
- [ ] The description begins before the active card becomes fully readable.
- [ ] The active card leads adjacent cards using the existing visual-order delay.
- [ ] The dial arrives as support after the primary action has begun.
- [ ] There is no fully blank or nearly empty destination frame between commit and route-in preparation.
- [ ] Route-in returns to `idle` with no stale inline opacity, filter, transform, transition, or pointer-event styles.
- [ ] `npm run check:site` passes.
- [ ] Verify in browser using the dev-browser skill.

### US-004: Preserve the Portfolio field as early material

**Description:** As a visitor, I want the particle field to establish atmosphere with the route rather than appearing after all useful content is already settled.

**Acceptance Criteria:**

- [ ] During Portfolio route-in, the field renders one deterministic static frame and is visually revealed with the wall surface.
- [ ] The field schedules no movement while global phase is `route-out` or `route-in`.
- [ ] Field drift resumes only after phase returns to `idle` and the deck is not drawer-open or otherwise suspended.
- [ ] Drawer-open, hidden-document, explicit suspension, unmount, and reduced-motion behavior remain unchanged.
- [ ] The field is never cleared into a late blank-to-pop transition during a normal Portfolio arrival.
- [ ] Particle count, palette, mask, quiet band, opacity targets, and deterministic seed remain unchanged.
- [ ] `npm run check:site` passes.
- [ ] Verify in browser using the dev-browser skill.

### US-005: Preserve the existing card and drawer animations

**Description:** As a returning visitor, I want the Portfolio interactions I already enjoy to behave exactly as before after the improved entrance.

**Acceptance Criteria:**

- [ ] Card press, release, hover, focus, wheel, drag, snap, depth, blur, shadow, sound, and haptic behavior are unchanged after entrance settlement.
- [ ] The active card still leads the initial card reveal.
- [ ] Card transforms are driven only by the existing deck pose variables and input runtime.
- [ ] Opening a project after settlement uses the existing selected-media handoff without a duplicate image, crop snap, or changed duration.
- [ ] Closing restores the same card, deck position, field, focus, and video behavior.
- [ ] Ten project cycles in both directions retain fixed card and particle counts.
- [ ] `npm run audit:portfolio-carousel`, `npm run audit:portfolio-drawer`, and `npm run audit:portfolio-transition` pass.
- [ ] Verify in browser using the dev-browser skill.

### US-006: Handle reduced motion and interruptions

**Description:** As a visitor, I want Portfolio to remain complete and predictable when motion is reduced or navigation interrupts the entrance.

**Acceptance Criteria:**

- [ ] Reduced motion removes translation, scale, blur, stagger, field movement, and media autoplay from the entrance.
- [ ] Reduced-motion content becomes readable and interactive in final geometry within one committed frame after release.
- [ ] A route change during Portfolio preparation or entrance cancels timers/listeners, removes prepared/entering classes, and leaves no Portfolio RAF running.
- [ ] Browser back/forward and bfcache restoration settle the Portfolio immediately rather than replaying a partial entrance.
- [ ] Rapid repeated route requests do not double-release the deck or leave route phase outside `idle`.
- [ ] `npm run check:site` passes.
- [ ] Verify in browser using the dev-browser skill.

### US-007: Add repeatable timing and visual proof

**Description:** As a maintainer, I want evidence that entrance order and timing remain intentional across direct loads and route changes.

**Acceptance Criteria:**

- [ ] Audit state exposes Portfolio entrance phase (`preparing`, `entering`, `complete`) and release reason (`direct`, `route-in`, `fallback`) without adding a public application API.
- [ ] Automated checkpoints record title, description, active card, adjacent card, dial, field, wall, and Button Bar opacity/geometry.
- [ ] Direct-load checkpoints cover overlay visible, overlay hidden/identity, context, action, and settled states.
- [ ] SPA checkpoints cover route-out, committed/prepared, early route-in, action stagger, and settled states.
- [ ] Assertions prove title begins before the active card, context begins before the active card completes, and field material is visible before route idle.
- [ ] Chromium and WebKit run normal and strict-RAF transition audits serially.
- [ ] Desktop and mobile, light and dark, normal and reduced-motion screenshots are inspected rather than accepted from command status alone.
- [ ] No checkpoint shows shell movement, a blank studio window, unpositioned cards, or a late field pop.
- [ ] `npm run check:site` passes.

## Functional Requirements

- **FR-1:** The shell hook remains the only owner of `data-abs-transition-phase` and route-in sequencing.
- **FR-2:** Portfolio must separate `layout prepared` from `visually released`; route readiness may accept fully measured hidden cards without requiring them to be visibly revealed first.
- **FR-3:** The existing `abs:portfolio:reveal` event must be generalised from gate-only release to the Portfolio material release contract, or replaced only if the replacement removes more code than it adds.
- **FR-4:** The Portfolio release operation must be idempotent for a runtime generation.
- **FR-5:** Direct load must trigger the Portfolio release only after `#abs-boot-overlay` is removed.
- **FR-6:** SPA route-in must trigger the Portfolio release from the shell's existing route-in `onPrepared` boundary after destination nodes are pinned to their initial state.
- **FR-7:** Title and description must continue to use the existing `data-route-enter` identity/context markers for SPA navigation.
- **FR-8:** Cards must retain Portfolio-owned opacity/filter reveal and existing pose transforms; generic route entrance code must not write card transforms.
- **FR-9:** The active card must use zero local reveal-order delay relative to the action-group start; adjacent cards retain approximately `40ms` visual-order steps.
- **FR-10:** The dial must use a Portfolio-owned supporting-detail reveal after the action group begins.
- **FR-11:** Field scheduling must distinguish route-transition pause from explicit hidden/drawer/unmount suspension so a static route-in frame can remain visible without movement.
- **FR-12:** Ambient field drift and active-card video playback must not begin before the entrance is geometry-settled.
- **FR-13:** Deck pointer, wheel, touch, and keyboard input must remain unavailable while the active card is unreadable or layout is unstable.
- **FR-14:** A bounded hard-reveal path must always remove preparation state and restore interaction after readiness failure.
- **FR-15:** Reduced motion must bypass all entrance interpolation while preserving complete content, field composition, focus, and interaction.
- **FR-16:** Route unmount and generation change must cancel every Portfolio entrance timeout, RAF, listener, and stale release.
- **FR-17:** The entrance must not mutate persistent shell opacity, transform, geometry, z-index, or Button Bar state.
- **FR-18:** The first readable destination frame must use final hero, card, field, and topbar geometry.
- **FR-19:** The production docs and audits must describe direct-load and SPA entrance ownership separately.

## Technical Plan

### 1. Keep the existing owner boundaries

- `useShellRouteTransition.js` continues to own route-out, readiness, paint barriers, route-in, named child markers, interruption, and cleanup.
- `app.js` continues to own Portfolio runtime readiness, card creation, card reveal order, interaction readiness, and local cleanup.
- `portfolio-speed-field.js` continues to own field drawing and lifecycle scheduling.
- `portfolio.css` continues to own Portfolio-specific prepared/entering/complete visuals.

Do not move Portfolio card animation into React and do not expose the shell transition hook to the legacy runtime.

### 2. Reuse the existing release boundary

- Rename gate-specific helpers only where necessary to reflect a general Portfolio release.
- During SPA navigation, dispatch the release for every Portfolio route-in from the existing `staggeredEntrance({ onPrepared })` callback, not only `transitionStyle: gate-success`.
- Include the authoritative runtime generation in the event and ignore mismatched events.
- During direct load, pass an `onOverlayHidden` callback to `completeDirectBoot()` and dispatch the same release on the next RAF.
- The existing timeout fallback may release with reason `fallback`, but it must be idempotent and generation-safe.

### 3. Split preparation from reveal

- `preparePortfolioLayers()` must create and measure the title, description, cards, and dial while keeping their visual start states and pointer blocking.
- Portfolio readiness checks must validate usable card/canvas/window geometry even while the deck has the preparation class.
- Do not require card opacity greater than `0.9` as a prerequisite for route-in; that dependency currently forces the local card animation to start before shell choreography.
- Keep the mount in final layout; hide readable children rather than setting `display: none` or collapsing the mount.

### 4. Use local group styling without touching card transforms

- Direct-load CSS may apply the shared opacity, blur, `3px` Y offset, and `0.994` scale to the title and description.
- Card entrances must animate only their existing reveal opacity and media filter variables.
- Apply support reveal to the dial wrapper, not each indicator line.
- Prefer a small set of local CSS variables in `portfolio.css` that mirror the canonical group timing. Do not refactor Home or create new design-config controls for fixed choreography.

### 5. Preserve a static field through route-in

- On route transition, cancel field scheduling but render/retain one static deterministic frame and keep it paintable.
- Continue clearing/hiding for explicit drawer-open/unmount/document-hidden states where the existing contract requires it.
- The route wall's own entrance provides field opacity/depth emergence; avoid a second long field fade.
- When phase returns to `idle`, resume the current bounded field cadence without reseeding.

### 6. Reduce perceived blank time without a new snapshot system

The preferred lightweight approach is to prepare/cache Portfolio runtime data before route-out when the existing runtime-module preload hook can do so without changing the hook's generic API. Specifically:

- Reuse the current `PORTFOLIO_ROUTE_RUNTIME.loadModule()` promise to warm the Portfolio module and, if safely cacheable, the JSON/config request before the shell fades Home.
- Reuse already-known thumbnail URLs for browser prefetch only if data saver is off and the cache can be consumed by `bootstrapPortfolio()`.
- Do not delay direct loads or create duplicate fetches.
- If thumbnail readiness still exceeds the bounded route timeout, keep the previous route materially present until commit where possible, then use the prepared final-geometry fallback. Do not add a general screenshot clone in this PRD.

Data/media preloading is an optimisation within this PRD, not permission to create a new caching subsystem. If reuse is not a net-small diff, ship the ordered release first and record measured residual latency.

## Likely Files

Primary implementation:

- `react-app/app/src/hooks/useShellRouteTransition.js`
- `react-app/app/src/legacy/modules/portfolio/app.js`
- `react-app/app/src/legacy/modules/portfolio/portfolio-speed-field.js`
- `react-app/app/public/css/portfolio.css`

Contract and verification:

- `docs/reference/PORTFOLIO.md`
- `docs/reference/TRANSITION-ORCHESTRATION.md`
- `docs/reference/SCENE-ENTRANCE-PRINCIPLE.md` only if the rule itself changes; implementation alignment alone should not rewrite it
- `scripts/audit-boot-overlay.mjs`
- `scripts/audit-transition-flows.mjs`
- `scripts/audit-portfolio-carousel.mjs`

Avoid changing `main.css`, `HomeRoute.jsx`, the Home post-boot constants, project drawer/handoff modules, or design-system JSON unless implementation proves a shared token is genuinely missing. A broad Home refactor is out of scope.

## Implementation Sequence

1. Add audit-only baseline capture for direct and SPA Portfolio entrance order.
2. Make hidden prepared Portfolio geometry satisfy readiness without becoming readable.
3. Generalise the existing Portfolio release event and make it generation-safe/idempotent.
4. Trigger the release from shell route-in `onPrepared` for all Portfolio SPA entries.
5. Trigger the same release after direct boot overlay removal.
6. Align title, context, cards, and dial to the recommended group order.
7. Retain a static field frame during route-in and resume motion only at idle.
8. Add interruption, reduced-motion, hard-reveal, and bfcache cleanup.
9. Run canonical and focused audits, inspect checkpoint screenshots, then review the final diff for unrelated changes.

## Non-Goals

- No redesign of the orbital deck, card art direction, intro copy, typography, or pagination geometry.
- No changes to wheel, trackpad, drag, snapping, bounded lead, or cycle rebasing.
- No changes to card hover, press, shadow, sound, or haptic tuning.
- No changes to drawer design, project content, shared-media handoff, open/close timing, or reversal behavior.
- No route-wide snapshot/compositing system.
- No GSAP, Framer Motion, or new animation dependency.
- No new author-facing timing panel or design-config keys.
- No replay of a long first-load sequence when returning from a modal or drawer.
- No shell/frame/Button Bar animation.
- No security or gate behavior changes; those belong to the dependent PRD.

## Accessibility and Performance Requirements

- A readable group must become recognisable as a group; do not animate card copy fragments independently.
- Pointer blocking must end only when the active card is readable and stable.
- Focus order and the active card's `tabindex`, `aria-hidden`, `aria-expanded`, and carousel semantics must remain correct.
- Reduced motion removes travel, scale, blur, stagger, drift, and video autoplay.
- Portfolio preparation and release must not allocate in the deck or field RAF hot paths.
- Card and particle counts remain fixed through entrance and settlement.
- No additional continuous observer may poll entrance state; use existing events, phase mutation observation, and bounded timers.

## Verification Plan

Build and serve production preview separately, then run serially:

```bash
npm run check:site
npm run audit:boot-overlay
ABS_DEV_URL=http://localhost:8013 npm run audit:portfolio-carousel
ABS_DEV_URL=http://localhost:8013 npm run audit:portfolio-drawer
ABS_DEV_URL=http://localhost:8013 npm run audit:portfolio-transition
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium ABS_TRANSITION_STRICT_RAF=1 npm run audit:transition-flows
ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=webkit ABS_TRANSITION_STRICT_RAF=1 ABS_TRANSITION_HARD_TIMEOUT_MS=300000 npm run audit:transition-flows
npm run certify:screens
```

Required inspected states:

- Direct Portfolio: overlay visible/prepared, identity, context, card action, support, settled.
- SPA Home → Work and About → Work: route-out, committed/prepared, early route-in, action stagger, settled.
- Work → another route during preparation and during route-in.
- Desktop `1440×900`, wide `3440×1440`, mobile `390×844`, compact `320×568`, and `600px/601px` boundary.
- Light/dark, normal/reduced motion, Chromium/WebKit.
- Drawer open and close after the entrance settles.

Screenshot review must confirm no blank inner window, card-before-title arrival, late field pop, crop snap, shell movement, or Button Bar overlap.

## Success Metrics

- Direct Portfolio identity begins within two RAFs after boot-overlay removal.
- Direct and SPA Portfolio content follows `identity → context → action → support`.
- The active card is never more visually resolved than both title and context at the first action checkpoint.
- A static field composition is visible during route-in and begins movement only after route idle.
- Entrance cleanup completes within `1000ms` after release, with a target of `720–900ms`.
- First readable and settled title/card/window rectangles remain within `2px` per edge.
- No new continuous scheduler, animation dependency, or duplicated card transform owner is introduced.
- Existing carousel, drawer, handoff, sound, haptic, cursor, and reduced-motion audits remain green.

## Risks and Mitigations

- **Risk: route readiness waits for visible cards, while the new entrance waits for readiness.** Mitigation: explicitly validate measured prepared geometry rather than opacity.
- **Risk: generic entrance transforms overwrite card orbit transforms.** Mitigation: animate card reveal opacity/media filter only; never apply shell transforms to cards.
- **Risk: field resumes movement before card geometry settles.** Mitigation: preserve a static frame during route-in and schedule movement only at `idle`.
- **Risk: direct and SPA paths drift again.** Mitigation: share one Portfolio release operation and assert group order in both paths.
- **Risk: preloading broadens scope.** Mitigation: cache only through existing runtime loading/fetch paths; omit it if it is not a net-small diff and report residual latency honestly.
- **Risk: hard readiness failure leaves the page inert.** Mitigation: keep one bounded, idempotent hard-reveal cleanup path.

## Open Questions

None blocking. The recommended timeline may be optically tuned by small amounts during screenshot review, but group order, ownership, upper duration bound, reduced-motion behavior, and final-geometry constraints are fixed.
