# PRD 08: Instrument Wake Window Content Transition

## 1. Introduction/Overview

Add a fast, orchestrated transition for content changes inside the `window`, which is the visible content/canvas area inside the wall. When a user switches bottom tabs, the outer shell and bottom tabs remain stable while the current window content briefly recedes, a soft inner-shadow pass crosses the window, and the incoming content resolves into sharp focus.

This transition is called `Instrument Wake`. It should feel like a refined machine response: the selected tab light leads the action, then the window content wakes into its new state.

## 2. Goals

- Make tab switching feel intentional without slowing navigation.
- Keep the shell, wall, and bottom tabs stable during content transitions.
- Avoid generic page fades.
- Respect the existing transition ownership in `useShellRouteTransition`.
- Respect `prefers-reduced-motion`.

## 3. User Stories

### US-001: Fast Orchestrated Tab Switch

**Description:** As a visitor, I want the window content to change quickly and deliberately when I switch tabs so the interface feels physical and responsive.

**Acceptance Criteria:**
- [ ] Active tab light updates before or at the start of the window content transition.
- [ ] Outgoing content subtly dims, defocuses, and recedes without moving the outer shell.
- [ ] Incoming content resolves into sharp focus inside the window.
- [ ] Total perceived transition duration is approximately `220ms` to `280ms`.
- [ ] Verify in browser using dev-browser skill.

### US-002: Stable Shell During Transition

**Description:** As a visitor, I want the wall, bottom tabs, and browser-like shell to remain stable so tab switching feels controlled.

**Acceptance Criteria:**
- [ ] `#simulations`/window geometry does not resize during the transition unless the route itself changes geometry by design.
- [ ] Bottom tabs remain visible and clickable after transition completion.
- [ ] Portfolio drawer stacking remains above tabs when drawer is open.
- [ ] No content overlaps the bottom band during transition.
- [ ] Verify in browser using dev-browser skill.

### US-003: Accessible Reduced-Motion Fallback

**Description:** As a reduced-motion user, I want route changes to remain clear without defocus, depth, or sweeping motion.

**Acceptance Criteria:**
- [ ] `prefers-reduced-motion: reduce` uses a near-instant opacity or visibility swap.
- [ ] Focus is restored to the appropriate route landmark or active tab.
- [ ] In-window Portfolio gate digit focus remains predictable.
- [ ] Screen-reader route labels and errors are not delayed by animation.
- [ ] Verify in browser using dev-browser skill.

## 4. Functional Requirements

- FR-1: Implement a named transition mode or phase for Instrument Wake without adding a second route transition owner.
- FR-2: Trigger Instrument Wake for bottom-tab route changes: Home, Contact, Portfolio locked, Portfolio unlocked, and About.
- FR-3: Keep the shell, bottom band, route tabs, and portfolio drawer host outside the animated content group.
- FR-4: Animate only the window content group using opacity, filter, transform, and a soft inner-shadow pass.
- FR-5: Use CSS variables for timing, easing, blur, opacity, and transform depth.
- FR-6: Ensure active tab state and indicator light are route-derived and not delayed behind content animation.
- FR-7: Provide reduced-motion CSS that disables blur/depth/sweep and keeps route changes functional.
- FR-8: Add or update Playwright checks for transition completion and non-overlap.
- FR-9: Document the transition in `TRANSITION-ORCHESTRATION.md` or the relevant site styleguide/reference doc.
- FR-10: Ensure route phase returns to `idle` after every Instrument Wake transition, including direct locked Portfolio and reduced-motion paths.
- FR-11: If blur is too expensive on canvas-backed home content, replace blur with opacity, contrast, and shadow-pass timing while preserving the perceived sequence.

## 5. Non-Goals

- No animation of the entire site shell.
- No shutter/aperture effect.
- No directional slide based on tab order.
- No new animation library unless existing CSS/React transition hooks are insufficient.
- No change to Portfolio drawer open/close animation.

## 6. Design Considerations

Instrument Wake sequence:

1. Tab press: active tab indicator light switches on immediately.
2. Outgoing content: opacity drops slightly, blur increases subtly, and content recedes by a few pixels.
3. Window pass: a soft inner-shadow/highlight pass moves through the window, staying inside the rounded wall mask.
4. Incoming content: content resolves upward into sharp focus.

Recommended timing:

- Total: `220ms` to `280ms`.
- Outgoing: `90ms` to `120ms`.
- Incoming: `140ms` to `180ms`.
- Easing: precise and mechanical, such as `cubic-bezier(0.2, 0.8, 0.2, 1)`.

The effect should be visible but not theatrical. It should feel premium at normal browsing speed.

## 7. Technical Considerations

- `useShellRouteTransition` is the transition owner and should remain the only owner.
- The animated target should be the window content group, not `#abs-scene`, bottom tabs, modal layers, or `#portfolio-sheet-host`.
- Existing route readiness logic must account for the transition ending after content is mounted.
- Avoid expensive filters on large canvases if performance drops. If blur is too costly, use opacity, contrast, and a shadow-pass pseudo-element instead.
- Canvas-rendered home content may need a DOM/CSS transition wrapper rather than per-frame canvas animation.
- Existing transition phases are owned by `useShellRouteTransition`; do not add a parallel global state machine in legacy modules.
- The animated content group should expose stable selectors for Playwright timing checks.
- This PRD is sequenced after Portfolio in-window gate so locked and unlocked Portfolio states exist before transition completion is verified.

## 8. Success Metrics

- Tab switches feel responsive and intentional in manual browser review.
- Route transition audits pass in Chromium and WebKit.
- Reduced-motion mode has no blur/depth sweep.
- No visible bottom-band overlap or shell resize during transition.
- No route remains stuck outside the `idle` transition phase.

## 9. Open Questions

- None. The selected direction is Instrument Wake.
