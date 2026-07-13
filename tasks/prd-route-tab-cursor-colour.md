# PRD: Route-Selected Solid Cursor Colour

## Introduction

Make the custom solid-dot cursor adopt the accent colour of the currently selected primary route tab. The feature applies to Home, Portfolio, About Me, and Contact, using the same computed route accent that visually identifies each selected tab.

The colour is controlled by the active route, not by hover or an in-progress navigation preview. It applies only while the custom cursor is inside the studio window. Outside the window, the site must continue to show the native system cursor. The existing 64px tap-ring cursor is deliberately excluded and must retain its current appearance.

The route colour source still needs to resolve for all four production routes so the solid-dot cursor and its existing trail/effects remain synchronized whenever the solid-dot form is active. Under the current cursor contract, Home and the closed Portfolio deck display the solid dot; About Me, Contact, Portfolio detail, gates, and modal states use the unchanged tap ring.

## Goals

- Match the solid-dot cursor colour to the selected production route tab.
- Change the cursor colour only after the destination route becomes active.
- Keep the selected route colour correct after SPA navigation, direct page load, and reload.
- Limit the custom cursor colour treatment to the studio-window interior.
- Keep the existing cursor trail/effects synchronized with the active route colour.
- Preserve the current tap-ring appearance, cursor geometry, interaction rules, and route-specific cursor forms.

## User Stories

### US-001: Resolve the selected route accent

**Description:** As a visitor, I want the cursor colour system to use the selected route's tab accent so the cursor feels connected to my current location.

**Acceptance Criteria:**

- [ ] The active route resolves to the exact computed accent used by its selected Button Bar tab.
- [ ] Home resolves from the Home tab accent, Portfolio from the Portfolio tab accent, About Me from the About Me tab accent, and Contact from the Contact tab accent.
- [ ] The route-to-accent mapping reuses the canonical Button Bar accent variables rather than duplicating hard-coded colours.
- [ ] Hovering, focusing, or pressing an inactive route tab does not preview or temporarily apply that tab's colour.
- [ ] The route accent changes only when the destination route becomes the selected route.
- [ ] The resolved route accent is correct after SPA navigation, direct page load, browser reload, and back/forward navigation.
- [ ] `npm run check:site` passes.
- [ ] Verify in browser using dev-browser skill.

### US-002: Apply the route accent to the solid-dot cursor inside the window

**Description:** As a visitor, I want the solid-dot cursor to match the selected tab while I interact inside the studio window so navigation and pointer feedback share one colour identity.

**Acceptance Criteria:**

- [ ] When the solid-dot cursor form is active inside the studio window, its visible fill matches the selected route tab's computed accent.
- [ ] The colour updates without requiring a full page reload after a completed SPA route change.
- [ ] The custom cursor remains hidden outside the studio window and the native system cursor remains unchanged.
- [ ] Moving across the studio-window boundary does not leak the custom cursor onto the frame, outer wall, Button Bar, or browser chrome.
- [ ] The solid dot retains its current size, circular geometry, positioning, movement, fade, and stacking behavior.
- [ ] Home's canvas-derived cursor sizing and Portfolio's equivalent perceptual sizing remain unchanged.
- [ ] `npm run check:site` passes.
- [ ] Verify in browser using dev-browser skill.

### US-003: Synchronize the existing cursor trail and effects

**Description:** As a visitor, I want the solid cursor and its existing motion effects to share one route colour so the pointer feedback remains visually coherent.

**Acceptance Criteria:**

- [ ] Existing cursor trail/effects that currently consume the cursor colour use the selected route accent.
- [ ] The main solid dot and its trail/effects do not show different route colours during or after navigation.
- [ ] The implementation does not add a new trail, particle effect, helper ring, or decorative line.
- [ ] Existing reduced-motion behavior is preserved.
- [ ] Cursor movement and effect updates remain allocation-free and bounded in animation hot paths.
- [ ] `npm run check:site` passes.
- [ ] Verify in browser using dev-browser skill.

### US-004: Preserve the tap-ring cursor contract

**Description:** As a visitor, I want interaction-heavy views to retain their established tap-ring affordance so this colour enhancement does not change their interaction language.

**Acceptance Criteria:**

- [ ] The 64px tap-ring cursor does not adopt the selected route tab colour.
- [ ] About Me, Contact, Portfolio detail, gates, focus states, and modal states retain their current tap-ring appearance and behavior.
- [ ] Switching between the solid-dot and tap-ring forms does not leave stale fill, border, label, or route-colour styles on the wrong cursor form.
- [ ] Portfolio detail open/close reversal restores the correct Portfolio solid-dot colour when the closed deck becomes active again.
- [ ] Pointer, pen, touch, keyboard-focus, route teardown, and SPA remount behavior remain unchanged.
- [ ] `npm run check:site` passes.
- [ ] Verify in browser using dev-browser skill.

### US-005: Add regression coverage for route colour ownership

**Description:** As a maintainer, I want executable checks for the route-to-cursor contract so later palette, navigation, or cursor changes do not silently break it.

**Acceptance Criteria:**

- [ ] Automated browser coverage checks all four production routes after direct load and SPA navigation.
- [ ] The check compares the resolved cursor colour source with the computed selected-tab accent for each route.
- [ ] The check verifies that inactive-tab hover does not change the cursor colour source.
- [ ] The check verifies that the native cursor remains in control outside the studio window.
- [ ] The check verifies that tap-ring states retain their existing visual styling while route colour state changes underneath them.
- [ ] Desktop light and dark screenshots cover Home, Portfolio, About Me, and Contact.
- [ ] Mobile/touch checks confirm that no custom mouse cursor is introduced for touch interaction.
- [ ] `npm run check:site` passes.
- [ ] Verify in browser using dev-browser skill.

## Functional Requirements

- FR-1: The system must derive the cursor's active route colour from the canonical computed accent of the currently selected primary route tab.
- FR-2: The supported route set must be Home, Portfolio, About Me, and Contact only.
- FR-3: The system must not change cursor colour in response to inactive-tab hover, focus, pointer-down, or transition preview state.
- FR-4: The cursor colour must update when the destination becomes the active route and must remain correct across SPA navigation, direct loads, reloads, and browser history navigation.
- FR-5: The solid-dot cursor must display the selected route colour only while the pointer is inside the studio window.
- FR-6: The native system cursor outside the studio window must not be recoloured, replaced, or otherwise altered.
- FR-7: Existing cursor trail/effects that share the cursor colour source must update to the selected route colour.
- FR-8: The 64px tap-ring cursor must not visually adopt the selected route colour.
- FR-9: Transitioning between solid-dot and tap-ring cursor forms must clear form-specific inline styles and classes so colour state cannot leak between forms.
- FR-10: Route accents must continue to follow the existing authored palette and canonical design configuration; generated configuration files must not be hand-edited.
- FR-11: The feature must preserve current cursor geometry, movement, layering, reduced-motion behavior, accessibility behavior, and input-device handling.
- FR-12: The implementation must not add per-frame DOM queries, unbounded work, or object allocation to the pointer/rendering hot path.

## Non-Goals

- No colour change for the 64px tap-ring cursor.
- No cursor-colour preview when hovering or pressing an inactive tab.
- No custom cursor outside the studio window, including the frame, wall, Button Bar, or browser chrome.
- No changes to Button Bar colours, selected-tab styling, geometry, interactions, or responsive layout.
- No changes to cursor size, cursor form selection, Portfolio detail affordances, modal behavior, or cursor labels.
- No new trails, particles, rings, helper lines, or animation effects.
- No support for styleguide, simulation-lab, palette-lab, or other non-production routes.
- No redesign of route palettes or manual per-route colour controls.

## Design Considerations

- The selected tab is the visual source of truth: the cursor should look like it belongs to the active route, not merely use a similar hard-coded colour.
- The ownership boundary is spatial. The custom treatment begins at the studio-window interior and stops at its edge.
- Preserve the established cursor hierarchy: solid palette dot for Home and the closed Portfolio deck; 64px tap ring for About Me, Contact, Portfolio detail, gates, focus states, and modals.
- The tap ring's exclusion means About Me and Contact continue to show their existing ring rather than a route-coloured solid dot. Their route accent must still resolve correctly for synchronized trail/effect state and future-safe cursor-form transitions.
- The selected route colour should change cleanly after navigation without flashing the destination colour during hover or before route selection completes.

## Technical Considerations

- Reuse the existing `--button-bar-accent-home`, `--button-bar-accent-portfolio`, `--button-bar-accent-about`, and `--button-bar-accent-contact` variables populated from the authored palette.
- Keep `public/config/design-system.json` as the canonical authored design source. Do not hand-edit generated runtime configuration.
- Use the active route state already supplied to the shared shell/Button Bar rather than inferring selection from pointer hover.
- Preserve the existing `--cursor-color` consumers and safe foreground calculations where possible, but separate tap-ring presentation if necessary so its visual colour remains unchanged.
- Ensure the route colour is available before the first visible custom-cursor frame on direct page load to avoid a flash of a previous or fallback colour.
- Keep route-change work event-driven. Do not recompute styles during every pointer-move or animation frame.
- Review `docs/reference/CUSTOM-CURSOR.md` if implementation changes the documented colour source or route-form behavior.

## Success Metrics

- On each supported route, automated inspection reports an exact match between the active route accent and the shared cursor/trail colour source.
- The visible solid dot matches the selected tab on every state where the solid-dot cursor is active.
- Zero cursor-colour changes occur from inactive-tab hover or press interactions.
- The tap ring shows no visual regression across About Me, Contact, Portfolio detail, gate, focus, and modal states.
- The native cursor remains the only cursor visible outside the studio window.
- `npm run check:site` passes with no new lint, configuration, or production-build failures.
- Relevant cursor and navigation browser audits pass, with desktop light/dark evidence for all four production routes.

## Open Questions

- None. Scope decisions are confirmed: solid dot only; existing trail/effects synchronized; active-route timing; studio-window interior only; four production routes only.
