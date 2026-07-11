# PRD 05: Thumbnail Accent Gradient Contract

## 1. Introduction

Each project has a `thumbnailAccent`, but the rendered card gradient does not visibly pick up the project color. This PRD makes project-colored gradients part of the visual contract while preserving title readability.

## 2. Goals

- Make each card's top veil/gradient visibly reflect its project thumbnail accent.
- Keep text contrast accessible.
- Preserve image legibility and card polish.
- Keep accent logic deterministic and content-driven.

## 3. User Stories

### US-001: Visible Project-Colored Gradient

**Description:** As a visitor, I want each card to inherit color from its project thumbnail so the carousel feels authored rather than generic.

**Acceptance Criteria:**

- [ ] Each active card shows a visibly distinct top gradient or color wash based on `thumbnailAccent`.
- [ ] Inactive cards retain enough accent identity to read as project-specific without becoming noisy.
- [ ] Accent color is not drowned by a fixed dark-blue/black overlay.
- [ ] Verify in browser using dev-browser skill.

### US-002: Readable Text On Every Accent

**Description:** As a visitor, I need the client and title text to remain legible on every project image.

**Acceptance Criteria:**

- [ ] Client/title text passes visual contrast review on all six projects.
- [ ] The CTA remains legible over the thumbnail and gradient.
- [ ] No project card requires hand-authored one-off CSS to be readable.
- [ ] Verify in browser using dev-browser skill.

## 4. Functional Requirements

- FR-1: Continue resolving accent from `thumbnailAccent`, `thumbnailAccentColor`, or fallback palette.
- FR-2: Increase accent influence in the card veil using controlled color mixing.
- FR-3: Provide separate active and inactive accent strengths if needed.
- FR-4: Ensure accent variables apply after card data changes during carousel virtualization.
- FR-5: Add visual QA that samples or screenshots every canonical project as active.

## 5. Non-Goals

- No new content fields unless the current accent fields are insufficient.
- No per-project bespoke CSS.
- No automatic image analysis in this pass.

## 6. Design Considerations

- The gradient should be visible but not neon.
- Project accents should support, not overpower, the photography/product imagery.
- The Personal dark-blue project should still have a readable accent even though its source image is already dark.

## 7. Technical Considerations

- Existing functions: `resolveThumbnailAccent`, `getProjectCardTheme`, `applyProjectCardTheme`.
- Existing CSS: `.portfolio-project-card__media-veil`.
- Existing content: `react-app/app/public/config/contents-portfolio.json`.

## 8. Success Metrics

- Side-by-side screenshots show distinct card color identities.
- No contrast/readability regressions.
- No generated config drift after build.

## 9. Open Questions

- Should accents be hand-picked brand colors or sampled thumbnail colors? Recommended for this pass: keep the existing authored `thumbnailAccent` values and tune rendering.

