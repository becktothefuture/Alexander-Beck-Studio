# PRD: Shell Tab Visual System

## 1. Introduction

Design and implement the tactile bottom shell tabs. The controls should reference the screenshot's physical/tab-like quality while staying within the site's approved chrome language.

## 2. Goals

- Create a reusable bottom tab component and CSS pattern.
- Use existing `.footer_link` and `.abs-icon-btn` material language.
- Provide clear resting, hover, focus, active, pending, and disabled states.
- Add a styleguide specimen for the pattern.
- Keep mobile text fitting and hit targets stable.

## 3. User Stories

### US-001: Render four shell tabs

**Description:** As a visitor, I want four bottom controls that clearly map to Home, Contact, Portfolio, and About Me.

**Acceptance Criteria:**
- [ ] Home renders as an icon-only control with accessible label.
- [ ] Contact, Portfolio, and About Me render as text tabs.
- [ ] Controls have stable dimensions and do not resize the layout on hover/focus/active.
- [ ] The tab order matches visual order.

### US-002: Communicate active route

**Description:** As a visitor, I want the active tab to feel selected like a tab.

**Acceptance Criteria:**
- [ ] Active state is visibly different from hover and resting state.
- [ ] Active state does not rely on color alone.
- [ ] Active state does not rely on motion alone.
- [ ] `aria-current="page"` is present for the loaded route.
- [ ] Pending gated state is visually distinct or accessibly described if it differs from loaded active state.

### US-003: Preserve site material language

**Description:** As a creative stakeholder, I want the tabs to feel physical without competing with the existing wall/chrome language.

**Acceptance Criteria:**
- [ ] Styling uses existing tokens for cursor color, hover foreground, rim, radius, gap, text scale, and icon frame size where possible.
- [ ] Styling does not introduce a new palette.
- [ ] Styling does not introduce heavy frosted glass or multi-layer white gradient stacks.
- [ ] Hover/focus uses existing cursor fill behavior and readable foreground.
- [ ] Reduced motion keeps the same state clarity.

### US-004: Add styleguide coverage

**Description:** As a developer, I want the new pattern visible in the styleguide so future changes stay consistent.

**Acceptance Criteria:**
- [ ] `/styleguide.html` includes a shell bottom tabs specimen.
- [ ] The specimen shows resting, active, and focus/hover representative states.
- [ ] The component-library docs mention the pattern and its constraints.

### US-005: Preserve dock layer behavior

**Description:** As a developer, I need the visual system to stay inside the shell layer defined by the navigation foundation.

**Acceptance Criteria:**
- [ ] Visual styling assumes the dock is inside `.fade-content.ui-layer` at the same stacking level as footer chrome.
- [ ] The dock does not create a new overlay layer above `#portfolio-sheet-host`.
- [ ] Hover/focus effects do not bleed into the inner wall or block canvas pointer input outside controls.

## 4. Functional Requirements

- FR-1: Add reusable bottom tab markup/component.
- FR-2: Add CSS for resting, hover, focus-visible, active, pending, and reduced-motion states.
- FR-3: Keep Home icon-only while preserving accessible name.
- FR-4: Use existing tokens and control families rather than parallel button classes.
- FR-5: Add styleguide and docs coverage.

## 5. Non-Goals

- No route registry changes in this PRD.
- No Contact route content work in this PRD.
- No removal of legacy home nav triggers in this PRD.

## 6. Design Considerations

- The tabs should feel seated in the bottom shell.
- Active tab should read as selected, not merely hovered.
- Text should be compact and professional, with no viewport-width font scaling.

## 7. Technical Considerations

- Relevant files: `ShellBottomTabs.jsx` or equivalent, `main.css`, `StyleguideRoute.jsx`, `StyleguideTypography.jsx` if needed, `COMPONENT-LIBRARY.md`, `SITE-STYLEGUIDE.md`.
- Use Tabler icon webfont already present for Home if consistent with current icon usage.
- Keep focus rings visible.

## 8. Success Metrics

- Users can identify the current tab without reading the URL.
- Mobile tabs fit without overlap or text clipping.
- Styleguide specimen documents the pattern.

## 9. Resolved Decisions

- Home remains icon-only on all breakpoints, with accessible label and tooltip/visible focus affordance.
- Pending gated state uses the same active seat plus a subtle pending/access affordance and does not claim `aria-current="page"`.
