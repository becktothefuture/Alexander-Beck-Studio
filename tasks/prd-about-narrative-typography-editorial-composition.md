# PRD: About Narrative Typography and Editorial Composition

## 1. Introduction / Overview

The About narrative's typeface hierarchy is sound: Instrument Serif is reserved for the opener, the “So I move between several” display beat, and the finale; travelling statements and editorial copy remain Geist. The defects are compositional rather than stylistic. The opening wrapper is left-anchored inside a wider spatial field, 3D exit travel magnifies that displacement, the complexity title is materially occluded, the WU 12.50 editorial checkpoint is blank on desktop but leaves an orphaned mobile text sliver, and the mobile finale becomes an eight-line wall.

This PRD corrects those defects with the existing Text lane, presentation layouts, responsive CSS, and contact-sheet checkpoints. It must preserve semantic headings, accessible copy, existing text content, and the established typeface roles.

## 2. Clarifying Decisions Resolved from the Brief

- “About Me” must share the orb's center axis on every profile.
- The text itself is retained unless a line-break-only treatment is required.
- Intentional blank pauses are allowed; accidental clipped fragments are not.
- The complexity beat should remain immersive without adding plates, outlines, or heavy shadows.
- Mobile finale typography should target five or six balanced lines while staying clear of the bust and Button Bar.

## 3. Goals

- Center the opening title, description, and scroll cue within 1% of the studio-window center.
- Preserve the opener's vertical travel without perspective-induced horizontal drift.
- Keep threshold copy fully legible while the material surrounds it.
- Show complete editorial reading beats consistently across desktop/mobile/reduced motion.
- Eliminate orphaned top-edge text slivers.
- Rebalance the mobile finale into five or six lines with comfortable sculpture and CTA spacing.
- Preserve accessibility, semantic headings, and existing copy.

## 4. User Stories

### US-001: Center the opening typographic axis

**Description:** As a visitor, I want the orb, “About Me,” description, and scroll cue to share one center axis so the opening feels deliberate.

**Acceptance Criteria:**

- [ ] The opener inner wrapper is horizontally centered inside the spatial field.
- [ ] The opener does not rely on an authored X offset to correct layout.
- [ ] At WU 0.45, the title center is within 1% of the studio-window width and within 12 CSS px of the coloured-orb centroid.
- [ ] The description and scroll cue share the title center within 4 CSS px.
- [ ] Desktop, tablet, mobile, and reduced motion satisfy the same alignment check.
- [ ] Opener vertical movement and fade remain intact.
- [ ] 3D depth travel cannot introduce large horizontal drift.
- [ ] Verify in browser using the fixed opener checkpoints.

### US-002: Protect threshold title legibility

**Description:** As a visitor, I want to read the complexity statement while feeling surrounded by material.

**Acceptance Criteria:**

- [ ] No dense point mass crosses the central counters/stems of either title line at the focus checkpoint.
- [ ] A text-safe pocket of approximately one line-height surrounds the two-line title.
- [ ] Material remains dense above, around, and near the frame edges.
- [ ] No background plate, text outline, or stronger shadow is introduced.
- [ ] The next inside-complexity beat still feels spatially continuous.
- [ ] Verify in browser on desktop and mobile.

### US-003: Author complete editorial reading beats

**Description:** As a visitor, I want editorial prose to appear as complete, comfortably placed passages rather than inconsistent blank or clipped states.

**Acceptance Criteria:**

- [ ] The first discipline/editorial paragraph has a dedicated contact-sheet checkpoint at its readable focus.
- [ ] The following role paragraph has a dedicated checkpoint at its readable focus.
- [ ] At WU 12.50, every profile either shows a complete paragraph with at least 16 CSS px top clearance or a genuinely empty pause.
- [ ] No profile shows a 1–48px text sliver at the top or bottom edge.
- [ ] Simulation Visibility remains zero throughout the authored editorial-off interval.
- [ ] Copy content and emphasis remain unchanged.
- [ ] Mobile content-pressure validation passes.
- [ ] Verify in browser at the start, focus, midpoint, and exit of each editorial field.

### US-004: Rebalance the mobile finale

**Description:** As a mobile visitor, I want the finale invitation to feel like a quiet epilogue rather than an oversized wall of text.

**Acceptance Criteria:**

- [ ] The invitation resolves into five or six balanced lines at 390×844.
- [ ] The bust and headline maintain a 24–32 CSS px visual gap.
- [ ] The CTA cluster has at least 16 CSS px separation from the headline.
- [ ] All content remains clear of the Button Bar and safe-area insets.
- [ ] Instrument Serif, regular weight, and the existing copy are retained.
- [ ] Desktop finale line breaks and hierarchy do not regress.
- [ ] Bust interaction bounds remain usable.
- [ ] Verify in browser at 320, 375, 390, 430, and short-landscape widths/heights.

### US-005: Preserve semantic and accessible text behavior

**Description:** As a keyboard, screen-reader, or reduced-motion visitor, I want the refined composition without losing document semantics or access.

**Acceptance Criteria:**

- [ ] The primary opener remains the route H1.
- [ ] Subsequent travelling titles retain their existing heading hierarchy.
- [ ] Editorial copy remains selectable and present in the DOM.
- [ ] Reduced motion removes blur/travel as before without changing text order.
- [ ] Focus, pointer, and CTA states remain accessible.
- [ ] Lint and relevant accessibility/runtime audits pass.

## 5. Functional Requirements

- **FR-1:** The opener layout must center its inner wrapper within the existing spatial stage.
- **FR-2:** Mobile stage padding must not displace centered titles from the viewport origin.
- **FR-3:** Opener exit motion must not create horizontal drift through perspective.
- **FR-4:** Threshold legibility must be achieved through World/Camera composition or bounded text placement, not decorative text effects.
- **FR-5:** Editorial fields must have auditable focus checkpoints based on their authored Text timings.
- **FR-6:** Responsive editorial layout must prevent clipped fragments at transition checkpoints.
- **FR-7:** Finale measure and size may be profile-specific but must retain the existing typeface role and copy.
- **FR-8:** No CSS `!important` may be introduced.
- **FR-9:** Existing semantic heading IDs, ARIA relationships, and CTA labels must remain valid.

## 6. Non-Goals

- No new copywriting or typeface selection.
- No change to the stable shell, frame, or Button Bar.
- No text plates, outlines, or drop-shadow escalation.
- No absolute per-checkpoint X offsets as a substitute for correct centering.
- No removal of intentional negative space.
- No conversion of editorial copy into canvas text.

## 7. Design Considerations

- The opener is a single vertical lockup: orb, title, description, cue.
- Optical centering must be measured against the studio window, not the browser page.
- Editorial prose should occupy an upper-middle reading position with a stable left edge.
- Instrument Serif remains limited to the three established display beats.
- Mobile finale rhythm should feel calm and compact, not small for its own sake.

## 8. Technical Considerations

- Opener markup: `AboutNarrativeLabExperience.jsx`.
- About-specific composition: `about-narrative-lab.css`.
- Shared route title rules in `public/css/main.css` should not be modified unless the defect is proven global.
- Text sampling lives in `aboutNarrativeRuntimePlan.js` and `useAboutNarrativeTimeline.js`; avoid duplicating motion calculations in CSS.
- Editorial spans use absolute scroll positions and the global reveal threshold. Fix the authored timing/layout seam rather than hiding it with simulation visibility.
- Add DOM geometry assertions to the visual audit for title centers and edge slivers.

## 9. Success Metrics

- Opener center error is ≤1% of the studio-window width on all profiles.
- Threshold title remains legible without text-decoration workarounds.
- No editorial edge sliver is detected across the audited timing windows.
- Two complete editorial reading beats are visible in every desktop/mobile contact sheet.
- Mobile finale uses five or six lines at the reference viewport and remains clear of the bust/actions.
- Independent art-direction and frontend reviews report no P0/P1 typography/composition defect.

## 10. Open Questions

None. Fine line breaks and exact offsets are visual tuning decisions governed by the fixed review loop.
