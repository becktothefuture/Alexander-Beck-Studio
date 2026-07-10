# PRD 03: Skeuomorphic Tab Material

## 1. Overview

Implement the new bottom tab material: tactile, dark, raised controls with gradient borders, inset highlights, layered shadows, and active indicator lights.

## 2. Goals

- Replace color-fill tab hover with tactile default material.
- Add active pressed state and under-label light.
- Preserve accessible focus and keyboard behavior.
- Keep the design compatible with the existing dark shell.

## 3. User Stories

### US-001: Tactile Controls

As a visitor, the bottom tabs feel like physical controls built into the site shell.

Acceptance criteria:

- [ ] Default state has visible bevel, shine, and shadow.
- [ ] Hover does not flood the button with the old color-fill treatment.
- [ ] Active state appears pressed.
- [ ] Active state shows the small indicator light.
- [ ] Text and icon remain readable at mobile widths.
- [ ] Verify in browser using dev-browser skill.

### US-002: Accessible Interaction

As a keyboard or assistive technology user, I can operate the tabs predictably.

Acceptance criteria:

- [ ] Focus-visible is clear.
- [ ] Active route is exposed semantically.
- [ ] Reduced-motion mode suppresses nonessential pulsing or motion.
- [ ] Hit areas remain large enough for touch.
- [ ] Verify in browser using dev-browser skill.

## 4. Functional Requirements

- FR-1: Add scoped bottom tab classes and tokens.
- FR-2: Keep `MainNavLink` compatibility where useful.
- FR-3: Use pseudo-elements for body/light layers.
- FR-4: Implement default, hover, focus-visible, active route, pointer-down, pending, disabled states.
- FR-5: Add styleguide examples and documentation.
- FR-6: The old cursor-color flood hover must not apply to bottom shell tabs.
- FR-7: Active indicator light must be inside the tab and centered under icon/text.
- FR-8: Icon-only Home must share the same material system without requiring a text label.
- FR-9: Tab labels must not overflow at mobile widths; use responsive widths or text constraints rather than viewport-scaled font sizes.

## 5. Non-Goals

- No final tuning of the entire site material system.
- No visual redesign of existing icon-only buttons unless required for consistency.

## 6. Technical Considerations

- Scope styles to the bottom shell tab nav to avoid changing route topbar buttons unexpectedly.
- Update `SITE-STYLEGUIDE.md` and `COMPONENT-LIBRARY.md` because this becomes canonical bottom chrome.
- Keep CSS token names aligned with existing shell naming.
- Existing `.footer_link` uses cursor-color hover fill. Implement the new material under scoped classes such as `.shell-bottom-band`, `.shell-tab-nav`, and `.shell-tab`.
- Use pseudo-elements carefully so button content remains accessible and pointer targets remain stable.

## 7. Validation

```bash
npm run build
npm run certify:screens
```

Manual visual checks:

- Default, hover, focus-visible, active, pending, disabled.
- Desktop and mobile.
- Light/dark if both are supported by the current surface.

## 8. Success Metrics

- The default tab state reads as a finished tactile control before hover.
- Active route state is visually obvious through pressed depth and the indicator light.
- No bottom tab text overflows at mobile screenshot widths.
- Keyboard focus remains visible without relying on hover.

## 9. Open Questions

- None. Recommended default: active indicator uses the current cursor color mixed with white, with opacity around `0.75` to `0.9`; tune visually after browser screenshots.
