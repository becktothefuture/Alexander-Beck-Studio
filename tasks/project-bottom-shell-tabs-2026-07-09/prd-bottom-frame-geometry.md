# PRD: Bottom Frame Geometry

## 1. Introduction

Expand the bottom frame/wall area so the new shell tabs sit outside the inner wall/window. The geometry must preserve canvas sizing, portfolio drawer alignment, safe-area behavior, and visible separation between browser frame, outer wall, inner wall, and canvas surface.

Scope decision: apply the expanded bottom shell to the public shared-shell routes first: Home, Contact, Portfolio, and About/CV. Lab/daily routes keep current geometry unless they inherit the public shared shell safely through the same variables without visual regression.

## 2. Goals

- Create asymmetric bottom shell geometry for the dock.
- Keep the inner wall/window aligned across home, Contact, Portfolio, and About.
- Keep portfolio project drawer host aligned with the visible inner wall.
- Preserve footer/social/time metadata without overlap.
- Verify canvas backing-store dimensions after geometry changes.

## 3. User Stories

### US-001: Expand bottom shell band

**Description:** As a visitor, I want the tabs to live outside the inner window in a deliberate bottom shell area.

**Acceptance Criteria:**
- [ ] The inner wall bottom edge moves up enough to house the dock outside the wall.
- [ ] The dock never visually overlaps the canvas/window interior.
- [ ] The top/side wall geometry remains visually consistent with the approved shell.
- [ ] Browser frame, outer frame, inner wall, and canvas surface remain visibly separated.

### US-002: Share directional inner-wall variables

**Description:** As a developer, I need every shell layer to use the same directional inner-window contract.

**Acceptance Criteria:**
- [ ] New semantic variables define top, right, bottom, and left wall insets.
- [ ] `#simulations` uses the directional variables.
- [ ] `.frame-vignette`, `.simulation-contrast-veil`, and scene effect/fallback geometry remain aligned.
- [ ] `#portfolio-sheet-host` uses the same inner-window rectangle.
- [ ] Portfolio drawer close offsets still align with the visible host.

### US-003: Preserve canvas and portfolio audits

**Description:** As a developer, I want route/canvas audits to keep catching geometry regressions.

**Acceptance Criteria:**
- [ ] `audit:canvas-spa` passes after geometry changes.
- [ ] `audit:portfolio-gate` passes after geometry changes.
- [ ] Canvas backing-store dimensions match the new CSS rectangle at DPR.
- [ ] Portfolio drawer still covers header/footer and aligns to the inner wall.

### US-004: Mobile safe-area layout

**Description:** As a mobile visitor, I want the dock and footer metadata to fit above the browser bottom area without overlap.

**Acceptance Criteria:**
- [ ] The dock respects `env(safe-area-inset-bottom)`.
- [ ] The dock remains one readable row on iPhone-width viewports.
- [ ] Social links, time/location, and edge caption do not overlap the dock.
- [ ] A minimum inner-wall height is enforced or documented for small viewports.
- [ ] Desktop and mobile may use separate dock geometry tokens where needed for safe-area fit.
- [ ] Verify in browser using mobile viewport screenshots.

## 4. Functional Requirements

- FR-1: Add directional shell wall inset variables with current geometry as fallback.
- FR-2: Add bottom dock geometry variables for height, gap, and safe-area clearance.
- FR-3: Apply the variables to all wall/overlay consumers in one PRD.
- FR-4: Keep portfolio drawer host above chrome and aligned with the wall.
- FR-5: Update docs for the new geometry contract.

## 5. Non-Goals

- No final dock visual styling in this PRD.
- No Contact route content work in this PRD.
- No changes to simulation physics or daily simulation visuals.

## 6. Design Considerations

- The bottom shell should feel like a physical ledge, not a floating overlay.
- Do not make the entire page read as one flat black field; preserve separation.
- Keep the existing ball/circle visual language untouched.

## 7. Technical Considerations

- Relevant files: `main.css`, `tokens.css`, `portfolio.css`, geometry docs, canvas audits if needed.
- Current `#simulations` bottom is symmetric with top; this PRD intentionally changes that.
- Any `--safari-tint-inset-*` compatibility aliases should remain unless every consumer is migrated.

## 8. Success Metrics

- All four primary routes show the dock outside the wall at desktop and mobile sizes.
- Canvas and portfolio audits pass.
- Screenshot certification captures no obvious overlap.

## 9. Resolved Decisions

- Expanded bottom shell is required on Home, Contact, Portfolio, and About/CV.
- Lab/daily routes are not required to adopt the expanded shell unless verification shows the shared variable path is safe.
- Desktop and mobile may use separate responsive tokens.
