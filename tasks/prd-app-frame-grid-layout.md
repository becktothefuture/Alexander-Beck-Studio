# PRD: App Frame CSS Grid Layout System

## Introduction

Refactor `#app-frame` from flexbox-based layout to a 6-column × 3-row CSS Grid system. This change simplifies positioning logic, creates visual harmony through consistent spatial relationships, and makes the layout more maintainable. The grid structure will be consistent across all viewport sizes (desktop and mobile), with main navigation links remaining horizontally aligned.

## Goals

- Replace complex flexbox + absolute positioning with a clean 6×3 CSS Grid
- Move `#main-links` inside `#app-frame` to participate in the grid layout
- Maintain pixel-perfect visual parity with current design
- Preserve all existing entrance/exit animations without modification
- Keep all element IDs and class names unchanged for JS compatibility
- Simplify CSS by removing redundant positioning rules

## User Stories

### US-001: Create CSS Grid foundation for #app-frame
**Description:** As a developer, I need `#app-frame` to use CSS Grid so that child elements can be placed in specific grid cells.

**Acceptance Criteria:**
- [ ] `#app-frame` uses `display: grid` with 6 columns and 3 rows
- [ ] Grid template: `grid-template-columns: repeat(6, 1fr)`
- [ ] Grid template: `grid-template-rows: auto 1fr auto` (top content, center flexible, bottom content)
- [ ] Remove conflicting flexbox properties (`flex-direction`, `justify-content: space-between`)
- [ ] Grid gap matches current visual spacing (`var(--gap-24)` or equivalent)
- [ ] Typecheck/lint passes

### US-002: Position ui-top-left in row 1, columns 1-3
**Description:** As a user, I want the expertise legend to remain in the top-left area spanning half the width.

**Acceptance Criteria:**
- [ ] `.ui-top-left` uses `grid-column: 1 / 4` (spans columns 1, 2, 3)
- [ ] `.ui-top-left` uses `grid-row: 1`
- [ ] Content aligns to start (left) and top
- [ ] Legend max-width constraints preserved
- [ ] Tooltip positioning still works correctly
- [ ] Typecheck/lint passes

### US-003: Position ui-top-right in row 1, columns 4-6
**Description:** As a user, I want the philosophy blockquote to remain in the top-right area spanning half the width.

**Acceptance Criteria:**
- [ ] `.ui-top-right` uses `grid-column: 4 / 7` (spans columns 4, 5, 6)
- [ ] `.ui-top-right` uses `grid-row: 1`
- [ ] Content aligns to end (right) and top
- [ ] Text reflow behavior unchanged
- [ ] Sound toggle slot positioning preserved
- [ ] Typecheck/lint passes

### US-004: Remove ui-top-main wrapper if redundant
**Description:** As a developer, I want to simplify the DOM by removing unnecessary wrapper elements.

**Acceptance Criteria:**
- [ ] Evaluate if `.ui-top-main` wrapper is still needed with grid layout
- [ ] If removable: update HTML to place `.ui-top-left` and `.ui-top-right` as direct children
- [ ] If kept: ensure it spans full width (`grid-column: 1 / -1`) and uses subgrid or inner layout
- [ ] No visual regression
- [ ] Typecheck/lint passes

### US-005: Move #main-links inside #app-frame
**Description:** As a developer, I need to move the main navigation inside the grid so it participates in the layout system.

**Acceptance Criteria:**
- [ ] Move `<nav id="main-links">` from outside `#app-frame` to inside, positioned in row 2
- [ ] Update CSS: remove `position: fixed` from `#main-links`
- [ ] `#main-links` uses `grid-column: 1 / -1` (full width, all 6 columns)
- [ ] `#main-links` uses `grid-row: 2`
- [ ] Navigation remains horizontally centered with `justify-self: center`
- [ ] Links remain horizontally aligned (not stacked) on all viewports
- [ ] Element ID `main-links` unchanged
- [ ] Typecheck/lint passes

### US-006: Position brand logo in row 2
**Description:** As a user, I want the logo to appear above the navigation, both vertically centered in the middle row.

**Acceptance Criteria:**
- [ ] Create a wrapper or use existing structure to place logo in row 2
- [ ] Logo positioned above nav links, both centered horizontally
- [ ] Logo uses `grid-column: 1 / -1` and `grid-row: 2` (or contained within row 2 element)
- [ ] Vertical stacking: logo on top, nav below, both centered
- [ ] Logo reveal animation unchanged (inline style + JS control)
- [ ] `#brand-logo` ID unchanged
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-007: Position social icons in row 3, columns 1-2
**Description:** As a user, I want social media links in the bottom-left area.

**Acceptance Criteria:**
- [ ] `.ui-meta-left` (or container) uses `grid-column: 1 / 3`
- [ ] `.ui-meta-left` uses `grid-row: 3`
- [ ] Content aligns to start (left) and bottom
- [ ] Social icon spacing unchanged
- [ ] Typecheck/lint passes

### US-008: Position edge caption in row 3, columns 3-4
**Description:** As a user, I want the tagline/copyright caption centered in the bottom middle area.

**Acceptance Criteria:**
- [ ] `#edge-caption` uses `grid-column: 3 / 5` (spans columns 3, 4)
- [ ] `#edge-caption` uses `grid-row: 3`
- [ ] Remove `position: absolute` and transform centering
- [ ] Content horizontally centered within cell (`justify-self: center`)
- [ ] Two-line stack layout preserved (tagline + copyright)
- [ ] Text reflows naturally within the 2-column cell width
- [ ] Opacity and font styling unchanged
- [ ] Typecheck/lint passes

### US-009: Position London time in row 3, columns 5-6
**Description:** As a user, I want the location/time display in the bottom-right area.

**Acceptance Criteria:**
- [ ] `.ui-meta-right` (or container) uses `grid-column: 5 / 7`
- [ ] `.ui-meta-right` uses `grid-row: 3`
- [ ] Content aligns to end (right) and bottom
- [ ] Time display formatting unchanged
- [ ] Theme toggle behavior preserved
- [ ] Typecheck/lint passes

### US-010: Update entrance animation for moved #main-links
**Description:** As a developer, I need to ensure entrance animations work after #main-links moves inside the grid.

**Acceptance Criteria:**
- [ ] `entrance-animation.js` continues to find `#main-links` by ID
- [ ] Staggered link reveal animation works identically
- [ ] `.main-links--staggered` and `.main-links--staggered-in` classes function correctly
- [ ] No visual difference in animation timing or easing
- [ ] Modal active state (`html.modal-active #main-links`) still hides nav correctly
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-011: Maintain mobile grid (no collapse)
**Description:** As a user on mobile, I want the same 6×3 grid layout with horizontally aligned navigation.

**Acceptance Criteria:**
- [ ] Remove mobile media query that stacks nav vertically (`flex-direction: column`)
- [ ] Grid structure identical on all viewports (6 columns, 3 rows)
- [ ] Main links remain horizontal (row layout, not column)
- [ ] Touch targets remain accessible (sufficient padding)
- [ ] No horizontal overflow on small screens
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill (mobile viewport)

### US-012: Clean up deprecated flexbox/positioning CSS
**Description:** As a developer, I want to remove CSS rules made obsolete by the grid layout.

**Acceptance Criteria:**
- [ ] Remove `.ui-center-spacer` element and styles (grid row handles this)
- [ ] Remove absolute positioning from `#edge-caption`
- [ ] Remove fixed positioning from `#main-links`
- [ ] Remove `justify-content: space-between` from `#app-frame`
- [ ] Remove redundant flexbox properties from `.ui-top`, `.ui-bottom`
- [ ] Audit and remove any orphaned selectors
- [ ] Typecheck/lint passes

### US-013: Update View Transitions compatibility
**Description:** As a developer, I need to ensure View Transitions API still works with the new grid structure.

**Acceptance Criteria:**
- [ ] `#app-frame` retains `view-transition-name: content`
- [ ] Page transitions between index/portfolio/cv work correctly
- [ ] No ghost artifacts during transitions
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: `#app-frame` must use `display: grid` with `grid-template-columns: repeat(6, 1fr)` and `grid-template-rows: auto 1fr auto`
- FR-2: Row 1 contains `.ui-top-left` (col 1-3) and `.ui-top-right` (col 4-6)
- FR-3: Row 2 contains `#brand-logo` and `#main-links`, stacked vertically, both centered
- FR-4: Row 3 contains social icons (col 1-2), `#edge-caption` (col 3-4), and time display (col 5-6)
- FR-5: `#main-links` must be a child of `#app-frame` (moved from outside)
- FR-6: All navigation links must remain horizontally aligned on all viewport sizes
- FR-7: Grid layout must be identical on desktop and mobile (no column collapse)
- FR-8: All element IDs must remain unchanged: `app-frame`, `main-links`, `brand-logo`, `edge-caption`, `social-links`, `site-year`
- FR-9: All entrance animation classes must function: `.main-links--staggered`, `.main-links--staggered-in`
- FR-10: `#edge-caption` must display as two-line centered stack within its grid cell

## Non-Goals

- No changes to animation timing, easing, or choreography
- No changes to color, typography, or visual styling
- No new JavaScript functionality
- No changes to modal system or overlay layers
- No responsive column count changes (always 6 columns)
- No changes to pages other than index.html (portfolio.html, cv.html may need separate evaluation)

## Design Considerations

**Grid Visualization:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ Row 1 │ col 1  │ col 2  │ col 3  │ col 4  │ col 5  │ col 6  │
│       │◄─── ui-top-left ────►│◄─── ui-top-right ───►│
├───────┼────────┼────────┼────────┼────────┼────────┼────────┤
│ Row 2 │◄─────────────── brand-logo (centered) ──────────────►│
│       │◄─────────────── main-links (centered) ──────────────►│
├───────┼────────┼────────┼────────┼────────┼────────┼────────┤
│ Row 3 │◄─ social ─►│◄─ caption ──►│◄── time ───►│
│       │  col 1-2   │   col 3-4    │   col 5-6   │
└───────┴────────┴────────┴────────┴────────┴────────┴────────┘
```

**Key CSS Properties:**
```css
#app-frame {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-template-rows: auto 1fr auto;
  /* gap, padding, etc. preserved from current design */
}
```

## Technical Considerations

- **DOM Change:** `#main-links` moves from sibling of `.fade-content` to child of `#app-frame`
- **CSS Specificity:** Some selectors target `#main-links` with fixed positioning assumptions
- **Animation Timing:** `entrance-animation.js` uses `getElementById('main-links')` which will still work
- **View Transitions:** `view-transition-name: content` on `#app-frame` must be preserved
- **Z-index:** Moving `#main-links` inside grid may affect stacking context; verify modal overlays still work
- **Subgrid Consideration:** Row 2 may benefit from `display: contents` or subgrid for logo/nav alignment

## Success Metrics

- Zero visual regression on desktop (1920×1080, 1440×900, 1280×720)
- Zero visual regression on mobile (375×667 iPhone SE, 390×844 iPhone 14)
- All entrance animations play identically to current implementation
- Modal open/close correctly hides/shows navigation
- Page transitions work without artifacts
- No horizontal scrollbar on any viewport size

## Open Questions

1. Should `.ui-top-main` wrapper be preserved for semantic grouping, or removed for flatter DOM?
2. Does row 2 need an inner container for logo + nav vertical stack, or can they be separate grid items with alignment?
3. Should `#edge-caption` keep `role="status"` and `aria-live` attributes in new position?
4. Are there any portfolio.html or cv.html changes needed to match the new grid structure?
