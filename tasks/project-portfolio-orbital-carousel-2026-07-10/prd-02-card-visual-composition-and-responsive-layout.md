# PRD 02: Card Visual Composition And Responsive Layout

## 1. Overview

Implement the Figma/reference visual structure: a top title band, a middle orbital card band, and a bottom dot dial. Cards become image-led rounded rectangles with white titles on a thumbnail-color gradient. The active card is the only card that shows the `View` call to action.

## 2. Goals

- Match the supplied portfolio mockup proportions inside the site window.
- Keep the top title centered and readable.
- Keep the card carousel dominant in the middle band.
- Add a bottom dot dial that peeks inside the window and implies scrollability.
- Restyle closed cards without tag chips.
- Preserve light/dark mode by adapting the page background, text, and dot colors, not the card image treatment.
- Lock the oversized orbital feel from the reference: dominant upright center card, large rotated side cards, and aggressively clipped far-edge cards.

## 3. User Stories

### US-001: Window Band Composition

As a visitor, I see a refined portfolio composition with clear title, carousel, and indicator bands.

Acceptance criteria:

- [ ] Top title band occupies about 20% of the portfolio window height.
- [ ] Carousel card band occupies about 65% of the portfolio window height.
- [ ] Dot dial occupies/peeks through the lower band without colliding with bottom chrome.
- [ ] The composition responds to actual window height, not the full browser viewport when shell chrome changes the window.
- [ ] Verify in browser using dev-browser skill.

### US-002: Figma-Like Project Cards

As a visitor, I can read each card quickly and recognize each project from its image.

Acceptance criteria:

- [ ] Card top text has small client name and larger project title.
- [ ] Card title text is white.
- [ ] Card text sits over a top gradient derived from the thumbnail/accent color and fades toward the image.
- [ ] Tags do not render on closed cards.
- [ ] Card image is cropped in-card and does not distort.
- [ ] Verify in browser using dev-browser skill.

### US-003: Active Card CTA

As a visitor, I only see `View` on the active centered card, and it becomes more legible on hover/focus.

Acceptance criteria:

- [ ] Inactive cards do not show the CTA.
- [ ] Active card shows a low-emphasis `View`.
- [ ] Active card hover/focus reveals a pill behind `View`.
- [ ] Pill uses approximately 20% black transparency.
- [ ] CTA remains keyboard/focus accessible.

### US-004: Mobile Composition

As a mobile visitor, I see one main card and adjacent peeks without text or controls overlapping.

Acceptance criteria:

- [ ] One card is dominant on mobile.
- [ ] Adjacent cards peek but do not steal focus from the active card.
- [ ] Top title remains legible and does not collide with cards.
- [ ] Dot dial remains visible but compact.
- [ ] Verify in browser using dev-browser skill.

## 3.1 Visual Specification Targets

These are implementation targets, not hard-coded final constants; panel controls may tune them.

| Element | Desktop target | Mobile target |
| --- | --- | --- |
| Title band | 18-22% of portfolio window height | 18-24% |
| Carousel band | 62-68% of portfolio window height | 60-68% |
| Dot dial band | lower 10-18%, partly clipped by bottom edge/chrome | lower 10-16% |
| Active card width | roughly 22-30% of inner window width | 68-82% |
| Active card aspect | portrait, about 0.68-0.78 width/height | portrait, about 0.66-0.78 |
| Side card scale | 0.92-1.05 of active card | 0.86-0.96 |
| Side card rotation | about 8-18deg away from center | about 6-14deg |
| Far-edge cards | visibly clipped by the wall/window edge | narrow peeks only |
| Card text inset | generous top-left inset, about 6-9% of card width | about 7-10% |
| Title lines | max 2 lines on card before responsive reduction | max 3 lines only if unavoidable |
| CTA | bottom-center, low-emphasis at rest | bottom-center, touch target preserved |

## 3.2 Dot Dial Specification

- Dots form a shallow lower arc that shares the carousel's circular language; they must not render as a flat pagination row.
- Dot count/density is configurable and may exceed project count.
- The dial is visual/status only in the first pass: `aria-hidden="true"` and no tab stops.
- The dial tracks fractional carousel movement; an active dot or highlighted arc segment may move smoothly between dots.
- Inactive dots use subdued opacity/size; the active indicator is visible without becoming a heavy control.
- Dots may be partly clipped near the bottom edge, but must not overlap bottom navigation text or controls.

## 4. Functional Requirements

- FR-1: Add or revise CSS variables for title band, carousel band, and dot dial band.
- FR-2: Card layout must be image-led, single-surface, rounded, and overflow clipped.
- FR-3: Closed-card tags must be hidden from visual rendering but remain available in project data.
- FR-4: Card overlay gradient must support per-project color.
- FR-5: Active card CTA must be controlled by active/hover/focus state.
- FR-6: Light/dark mode must update portfolio background, title text, and dot colors.
- FR-7: Text must fit without clipping on desktop and mobile.
- FR-8: The composition must respect existing shell/window geometry and not alter wall/frame tokens.
- FR-9: Title typography must use a centered max width matching the reference rather than spanning the full window.
- FR-10: Card copy must sit in a text-safe top zone with a gradient that protects white text while fading naturally into the image.
- FR-11: Light mode must preserve wall/frame separation and dot contrast while leaving card title text white.
- FR-12: Card CTA focus state must be visible without adding a heavy button visual at rest.

## 5. Non-Goals

- No new card copy beyond client and title.
- No tag chip styling in this pass.
- No global shell redesign.
- No wall/frame geometry changes unless explicitly required by current bottom-shell work.

## 6. Technical Considerations

- Primary CSS: `react-app/app/public/css/portfolio.css`.
- Card creation currently appends `client`, `title`, optional `tags`, and media separately; this will need a card overlay structure.
- Consider adding a `portfolio-project-card__cta` element in `createProjectCard`.
- Use stable dimensions with aspect ratio and clamp/min/max values.

## 7. Validation

```bash
npm run build
npm run certify:screens
```

Manual/browser checks:

- Desktop wide.
- Desktop narrow.
- Mobile portrait.
- Light mode.
- Dark mode.
- Hover/focus on active card.

## 8. Success Metrics

- The first viewport reads like the supplied Figma/reference images.
- No visible text overlap.
- Active CTA is clear without making inactive cards noisy.

## 9. Open Questions

- Recommended default: title text source remains the current portfolio intro title.
- Recommended default: body intro copy is removed or visually hidden for this carousel view unless the user requests it.
