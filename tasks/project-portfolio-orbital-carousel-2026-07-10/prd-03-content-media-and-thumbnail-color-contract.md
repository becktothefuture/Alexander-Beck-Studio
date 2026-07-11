# PRD 03: Content, Media, And Thumbnail Color Contract

## 1. Overview

Define the project data contract needed by the new card design. Static thumbnails remain the first implementation target, but the carousel must be ready for thumbnail videos. Each project needs a stable way to provide the color used for the card's top gradient.

## 2. Goals

- Keep `contents-portfolio.json` as the portfolio project source of truth.
- Support static images now and videos later.
- Provide deterministic thumbnail accent colors.
- Preserve tags as metadata without rendering them on closed cards.
- Keep project detail media and card thumbnail media separable.

## 3. User Stories

### US-001: Static Thumbnail Cards

As a visitor, I see each project represented by its thumbnail image in the carousel.

Acceptance criteria:

- [ ] Every project resolves a static thumbnail image.
- [ ] Images use `loading`, `decoding`, and preload behavior appropriate to active/nearby cards.
- [ ] Missing images fall back gracefully.
- [ ] Thumbnails are high enough resolution for desktop active-card display without blurry upscaling.
- [ ] Thumbnails avoid letterboxing inside the card.
- [ ] Verify in browser using dev-browser skill.

### US-002: Video-Ready Thumbnails

As a maintainer, I can later replace a static thumbnail with a video without rewriting the carousel.

Acceptance criteria:

- [ ] Existing `thumbnailVideo` / `video` semantics are preserved or explicitly documented.
- [ ] Only the active card attempts playback.
- [ ] Reduced motion disables autoplaying thumbnail video.
- [ ] Non-active videos are paused.
- [ ] Non-active virtual card instances do not attach/load video sources.
- [ ] Active thumbnail video source is attached lazily and removed or paused when inactive.
- [ ] Duplicate visual instances cannot create duplicate active video playback.

### US-003: Thumbnail Accent Color

As a designer, I can control the top card gradient color so each project blends cleanly with its thumbnail.

Acceptance criteria:

- [ ] Each project can provide an authored thumbnail/accent color.
- [ ] If no color is authored, a deterministic fallback is used.
- [ ] The gradient keeps white title text readable.
- [ ] Color values are stable across reload/build.
- [ ] Each project can provide `thumbnailPosition` and optional `thumbnailFocalPoint` for crop art direction.
- [ ] The top text-safe zone remains readable without hiding the image subject.

## 4. Functional Requirements

- FR-1: Extend the project schema to support optional `thumbnailAccent`, `thumbnailPosition`, and `thumbnailVideo` fields if not already present.
- FR-1a: Support optional `thumbnailFocalPoint` for future crop tooling; default to CSS object-position when absent.
- FR-2: Do not remove existing `tags`; closed cards simply do not render them.
- FR-3: Keep `image` as a valid fallback thumbnail source.
- FR-4: Detail content blocks must not be reused as thumbnail videos by default.
- FR-5: Card gradient color must be resolved once per card/project and applied through CSS variables.
- FR-6: If automatic sampling is added, it must be cached and must not run in the animation loop.
- FR-7: Asset handling must preserve current `resolveAsset` behavior and base path support.
- FR-8: Inactive and duplicate card instances must render static poster/image surfaces only; they must not preload or autoplay video.
- FR-9: Active-card video behavior must be testable through DOM/media state, not only visual observation.

## 5. Non-Goals

- No CMS migration.
- No remote image analysis service.
- No required build-time image processing in the first pass.
- No change to project detail body copy.

## 6. Technical Considerations

- Current content source: `react-app/app/public/config/contents-portfolio.json`.
- Current media helpers: `getProjectImageSrc`, `getProjectVideoSrc`, `createProjectCardMedia`.
- Current palette logic derives card material colors from site palette; this PRD changes closed-card overlay color to project thumbnail/accent color.
- Authored colors are safer than runtime image sampling for a one-shot build.

## 7. Validation

```bash
npm run build
npm run check:design-config
```

Manual/browser checks:

- Each project has a thumbnail.
- Each card has a readable white title.
- Tags remain in data but not visible on closed cards.
- Optional video field remains ignored or paused until enabled.

## 8. Success Metrics

- Project thumbnails and colors are stable and deterministic.
- Carousel can support future video thumbnails without changing the public card API.
- No duplicate or inactive thumbnail video playback is possible in the virtual card model.

## 9. Open Questions

- Recommended default: add authored `thumbnailAccent` values by hand for the current projects, then consider a helper script later.
