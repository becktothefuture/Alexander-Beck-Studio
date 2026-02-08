# PRD: Inner Wall Shine Effect

## Introduction
Add a new visual "shine" effect to the `.inner-wall` element. This effect simulates a strong, blurred glow originating from all sides of the wall, using the background color, and slightly overshooting the wall boundaries.

## Goals
- Create a new visual layer `.inner-wall__shine`.
- Apply a strong blur effect from all sides.
- Use the environment/background color for the shine.
- Ensure the effect overshoots the wall boundaries slightly.
- Support both Light and Dark modes.

## User Stories

### US-001: Implement Shine Element
**Description:** As a user, I want a new DOM element for the shine so it can be styled independently.
**Acceptance Criteria:**
- [ ] New `div.inner-wall__shine` created inside `.inner-wall`.
- [ ] Element is positioned absolutely.
- [ ] `pointer-events: none` to avoid blocking interactions.

### US-002: Style the Shine
**Description:** As a user, I want the shine to look blurred and use the background color.
**Acceptance Criteria:**
- [ ] Uses CSS variables for blur, opacity, spread, and color.
- [ ] Color matches `--bg-light` (Light Mode) and `--bg-dark` (Dark Mode) by default.
- [ ] "Overshoot" implemented via negative inset or scaling.
- [ ] "Strong blur" implemented (e.g., `filter: blur(20px)`).

## Functional Requirements
- FR-1: The shine must be visible in both light and dark modes.
- FR-2: The shine color must adapt to the active theme (Light/Dark).
- FR-3: The shine must extend beyond the inner wall edges ("overshoot").

## Technical Considerations
- **Structure:**
  ```html
  <div class="inner-wall">
      <div class="inner-wall__glow"></div> <!-- Existing -->
      <div class="inner-wall__shine"></div> <!-- New -->
      <!-- Canvas/Content -->
  </div>
  ```
- **CSS Variables (Tokens):**
  - `--inner-wall-shine-blur`: Blur radius.
  - `--inner-wall-shine-opacity`: Opacity level.
  - `--inner-wall-shine-overshoot`: Negative inset amount.
  - `--inner-wall-shine-color`: The color to use (defaults to background).

## Success Metrics
- Visual parity with user description ("stronger blur", "overshooting").
- No impact on performance (using GPU-accelerated properties where possible).
