# PRD: Wall-Aligned Depth Overlay Layer

## Introduction/Overview

Add a fixed-position DOM overlay that reproduces the Figma `depth-overlay` effect (rounded rectangle with multiply blend mode, stacked shadow, and radial gradient) and stays perfectly aligned with the site's wall geometry across responsive breakpoints.

This overlay must:
- Use **`position: fixed`** and **`pointer-events: none`**.
- Be inset to match the **scene's outer inset** plus **wall thickness** (so it sits exactly where the wall's inner surface begins).
- Apply **mode-specific** stacked shadows and gradient opacity differences.

## Goals

- Visually match the Figma `depth-overlay` treatment (shape, blend mode, shadows, gradient geometry).
- Stay geometrically locked to the wall across viewport sizes and device classes.
- Support both light and dark mode styling (driven by existing `.dark-mode` system).
- Apply across **all pages**.

## User Stories

### US-001: Fixed overlay element and correct layering
**Description:** As a user, I want the depth overlay to add a consistent sense of depth without blocking interaction.

**Acceptance Criteria:**
- [ ] Overlay element is `position: fixed` and `pointer-events: none`
- [ ] Overlay is above canvas/noise, below UI/modals/panel (z-index tuned to existing layering)
- [ ] No interaction regressions (canvas interactions still work)
- [ ] Typecheck/lint passes
- [ ] **Verify in browser using dev-browser skill**

### US-002: Wall-aligned geometry
**Description:** As a user, I want the overlay to align exactly with the wall interior so it feels "built into" the frame.

**Acceptance Criteria:**
- [ ] Overlay inset matches `#bravia-balls` outer inset plus `--wall-thickness`
- [ ] Overlay radius matches wall interior radius (derived from wall radius and thickness)
- [ ] Overlay remains aligned on resize/orientation change
- [ ] Typecheck/lint passes
- [ ] **Verify in browser using dev-browser skill**

### US-003: Dark mode styling (Figma parity)
**Description:** As a user in dark mode, I want the overlay to match the Figma dark variant.

**Acceptance Criteria:**
- [ ] `mix-blend-mode: multiply` is applied
- [ ] `border-radius: 40px` (or derived if wall-driven; must match Figma on target layout)
- [ ] Shadow stack matches Figma dark:
  - `0px 4px 10px 24px rgba(0,0,0,0.24)`
  - `0px 4px 6px 18px rgba(0,0,0,0.25)`
  - `0px 4px 20px -4px rgba(0,0,0,0.5)`
- [ ] Gradient matches requested geometry and dark opacity:
  - center at **50% x, 30% y**
  - reaches **100% at bottom**
  - colors from provided CSS:
    - `rgba(255,255,255,0.50)` at 0%
    - `rgba(20,43,72,0.50)` at 100%
- [ ] Typecheck/lint passes
- [ ] **Verify in browser using dev-browser skill**

### US-004: Light mode styling (derived opacity)
**Description:** As a user in light mode, I want a lighter, subtler version of the overlay with the same structure.

**Acceptance Criteria:**
- [ ] Light mode shadows match Figma light:
  - `0px 4px 10px 24px rgba(156,159,173,0.2)`
  - `0px 4px 6px 18px rgba(156,159,173,0.24)`
  - `0px 4px 8px 6px rgba(156,159,173,0.8)`
- [ ] Light mode gradient uses the **same stops/geometry** as dark mode, but with **opacity × 0.1** (i.e. alpha values become 0.05 instead of 0.50)
- [ ] Typecheck/lint passes
- [ ] **Verify in browser using dev-browser skill**

## Functional Requirements

- FR-1: Add a fixed overlay element available across all pages.
- FR-2: Overlay must be `pointer-events: none` and not alter cursor behavior.
- FR-3: Overlay inset must match `#bravia-balls` inset plus `--wall-thickness`.
- FR-4: Overlay must apply `mix-blend-mode: multiply`.
- FR-5: Overlay must apply stacked shadows with mode-specific values (light vs dark).
- FR-6: Overlay must apply a radial gradient with center at (50%, 30%) and extending to bottom (100%).
- FR-7: Light mode gradient opacity must be 0.1× the dark mode gradient opacity.
- FR-8: Must not introduce performance regressions (no per-frame allocations; CSS-only).

## Non-Goals (Out of Scope)

- No changes to the canvas wall deformation rendering.
- No new theme system; reuse existing `.dark-mode`.
- No new interaction/controls for the overlay in this iteration.

## Design Considerations

- The overlay should sit **above canvas/noise** but **below UI**.
- Do not isolate blending (`isolation: isolate` not required per decision); allow blending with the scene behind it.
- Prefer CSS variables for maintainability:
  - `--depth-overlay-shadow-light`, `--depth-overlay-shadow-dark`
  - `--depth-overlay-gradient-light`, `--depth-overlay-gradient-dark`

## Technical Considerations

- **Wall geometry sources**:
  - `--wall-thickness`, `--wall-radius` are stamped by `applyLayoutCSSVars()` in `source/modules/core/state.js`.
  - Index scene inset uses `--safari-tint-inset` in `source/css/main.css` for `#bravia-balls`.
- **Theme switch** uses `.dark-mode` applied to `html/body` by `source/modules/visual/dark-mode-v2.js`.
- Layering should align with the existing structure in `source/index.html`: `#bravia-balls` (canvas) + `#app-frame` (UI wrapper).

## Success Metrics

- Visual match to Figma on index/portfolio/cv pages (spot-check).
- Overlay alignment remains correct on resize/orientation changes.
- No reported interaction regressions (canvas still interactive).

## Open Questions

- Should `border-radius` be hard-set to `40px` (Figma) or derived from wall vars for perfect geometric lock across all viewports if wall radius differs?
- Do we need a reduced-motion accommodation (not animation-related here, but if future transitions are added)?

## Implementation Notes

### Files to Modify

1. **`source/index.html`** - Add overlay element to DOM
2. **`source/portfolio.html`** - Add overlay element to DOM
3. **`source/cv.html`** - Add overlay element to DOM
4. **`source/styleguide-frame.html`** - Add overlay element to DOM
5. **`source/css/main.css`** - Add overlay styles with light/dark mode variants

### CSS Variable Mapping

The overlay geometry will be driven by existing CSS variables:
- `--safari-tint-inset` (index page scene inset)
- `--wall-thickness` (wall thickness in px)
- `--wall-radius` (wall corner radius in px)

### Z-Index Strategy

Based on existing layering in `source/css/main.css`:
- Canvas: `z-index: 5`
- UI layer wrapper: higher (appears to be default flow)
- Modals/panel: `z-index: 10000+`

Target z-index for overlay: **`z-index: 6`** (above canvas, below UI)

### Gradient Implementation

Dark mode gradient:
```css
radial-gradient(
  circle at 50% 30%,
  rgba(255, 255, 255, 0.50) 0%,
  rgba(20, 43, 72, 0.50) 100%
)
```

Light mode gradient (opacity × 0.1):
```css
radial-gradient(
  circle at 50% 30%,
  rgba(255, 255, 255, 0.05) 0%,
  rgba(20, 43, 72, 0.05) 100%
)
```
