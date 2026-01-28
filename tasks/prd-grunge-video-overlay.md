# PRD: Grunge Video Overlay System

## Introduction

Add a configurable video overlay system that creates an atmospheric, found-footage aesthetic using blend modes. The video should match the noise layer positioning exactly, sitting inside the wall frame with controllable opacity and blend modes for creative experimentation.

## Goals

- Position video overlay exactly matching the noise layer (inset inside wall frame)
- Create atmospheric mood with subtle, screen-blend lightening effect
- Provide strong visibility (0.8-1.0 opacity) with config panel controls
- Layer video below noise so grain texture sits on top
- Support real-time blend mode experimentation via config panel
- Maintain 60fps performance with no visual artifacts

## Current Issues

### Issue 1: Video Too Large
- **Problem:** Video overhangs on edges, not matching simulation bounds
- **Cause:** Using `padding` for inset instead of CSS `inset` property
- **Solution:** Use `position: absolute` with `inset: var(--wall-thickness, 9px)` exactly like noise

### Issue 2: Blend Mode Not Working
- **Problem:** Blend modes have no visible effect
- **Cause:** Video positioned at body root level creates stacking context isolation
- **Solution:** Move video back into `.overlay-effects` container as sibling to `.noise`

### Issue 3: Wrong Container
- **Problem:** Video is direct child of `<body>`, isolated from blend context
- **Cause:** Trying to avoid container interference
- **Solution:** Video must be inside `.overlay-effects` to share blending context with noise

## User Stories

### US-001: Video matches noise positioning exactly
**Description:** As a developer, I need the video positioned identically to the noise layer so they align perfectly within the wall frame.

**Acceptance Criteria:**
- [ ] Video uses `position: absolute` (not fixed)
- [ ] Video uses `inset: var(--wall-thickness, 9px)` (same as noise)
- [ ] Video has `border-radius: var(--wall-radius)` (same as noise)
- [ ] Video is sibling to `.noise` inside `.overlay-effects` container
- [ ] No overhang on edges - perfectly contained within wall bounds
- [ ] Verify in browser using dev-browser skill

### US-002: Video sits below noise in z-index stack
**Description:** As a user, I want the noise texture to appear on top of the video so the grain effect is most prominent.

**Acceptance Criteria:**
- [ ] Video has lower z-index than noise (video: z:15, noise: z:25)
- [ ] Visual stack order: canvas → video → noise → wall frame
- [ ] Noise texture visible on top of video effect
- [ ] Verify in browser using dev-browser skill

### US-003: Blend mode works correctly
**Description:** As a user, I want to see the video blend with content below using screen mode so dark areas are transparent and light areas brighten.

**Acceptance Criteria:**
- [ ] Video uses `mix-blend-mode: screen` (hardcoded, no CSS vars initially)
- [ ] Dark areas of video are transparent/invisible
- [ ] Light areas of video brighten the content below
- [ ] Blend effect visible when video opacity is 1.0
- [ ] No `isolation: isolate` on parent containers
- [ ] No `transform` or `will-change` properties on video element
- [ ] Verify in browser using dev-browser skill

### US-004: Config panel controls work
**Description:** As a user, I want to adjust video opacity and blend mode in real-time via the config panel.

**Acceptance Criteria:**
- [ ] Video Overlay checkbox enables/disables video
- [ ] Video Opacity slider (0-1) updates opacity in real-time
- [ ] Video Blend Mode dropdown changes blend mode in real-time
- [ ] Changes persist when saving config
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

### Positioning & Layout
- FR-1: Video MUST be inside `.overlay-effects` container (sibling to `.noise`)
- FR-2: Video MUST use `position: absolute` (relative to `.overlay-effects`)
- FR-3: Video MUST use `inset: var(--wall-thickness, 9px)` for exact noise-matching positioning
- FR-4: Video MUST use `border-radius: var(--wall-radius)` to match wall interior
- FR-5: Video dimensions MUST be derived from inset (no explicit width/height needed)

### Blend Mode & Opacity
- FR-6: Initial blend mode MUST be `screen` (makes darks transparent)
- FR-7: Default opacity MUST be 0.8 (80% visibility)
- FR-8: Video MUST NOT have `transform`, `will-change`, or other GPU hints that create stacking contexts
- FR-9: Parent container (`.overlay-effects`) MUST NOT have `isolation: isolate`
- FR-10: Class added to `.overlay-effects` when video ready (not body, not #abs-scene)

### Z-Index Layering
- FR-11: Video z-index MUST be below noise (video: 15, noise: 25)
- FR-12: Final stack order: canvas (10) → video (15) → noise (25) → wall frame (30/40)

### Config Panel Integration
- FR-13: Video controls MUST appear in "Depth & Blur" section
- FR-14: Controls MUST update CSS custom properties in real-time
- FR-15: onChange handlers MUST apply to `document.documentElement.style`

## Technical Specifications

### HTML Structure (All Pages)
```html
<div id="overlay-effects" class="overlay-effects">
  <div class="noise"></div>
  <video id="grunge-video-overlay" class="grunge-video-overlay" ...>
    <source src="video/videoE.mp4" type="video/mp4">
  </video>
</div>
```

### CSS Requirements
```css
.grunge-video-overlay {
  position: absolute;  /* NOT fixed - relative to .overlay-effects */
  inset: var(--wall-thickness, 9px);  /* Exactly match noise */
  border-radius: var(--wall-radius);
  width: auto;
  height: auto;
  object-fit: cover;
  object-position: center;
  pointer-events: none;
  z-index: 15;  /* Below noise (25) */
  opacity: 0;
  visibility: hidden;
  mix-blend-mode: screen;  /* Hardcoded initially */
  transition: opacity 2000ms ease-out, visibility 0s linear 2000ms;
}

.grunge-video-ready .grunge-video-overlay {
  opacity: var(--grunge-video-opacity, 0.8);
  visibility: visible;
  transition: opacity 2000ms ease-out, visibility 0s linear 0s;
}
```

### JavaScript Requirements
```javascript
// Add class to .overlay-effects when video ready
const grungeVideo = document.getElementById('grunge-video-overlay');
const overlayContainer = document.getElementById('overlay-effects');

grungeVideo.addEventListener('canplaythrough', () => {
  overlayContainer.classList.add('grunge-video-ready');
  grungeVideo.play();
});
```

## Non-Goals

- No video file selector in config panel (hardcoded in HTML)
- No separate light/dark mode blend modes initially (use screen for both)
- No video playback controls (always autoplay, loop, muted)
- No video on mobile if performance is impacted (add media query if needed)

## Design Considerations

- Video should enhance the atmosphere without overwhelming content
- Screen blend mode creates subtle lightening that preserves readability
- Opacity at 0.8 provides visible effect while maintaining text contrast
- Noise grain on top of video creates layered depth

## Success Metrics

- Video positioned exactly within wall bounds (no overhang)
- Blend mode creates visible atmospheric effect
- Config panel controls update video in real-time
- No performance impact (maintains 60fps)
- Visual consistency across all three pages (index, portfolio, CV)

## Implementation Checklist

### Phase 1: Fix Positioning
- [ ] Move video element into `.overlay-effects` container (sibling to `.noise`)
- [ ] Change video CSS to `position: absolute` with `inset: var(--wall-thickness, 9px)`
- [ ] Remove `padding` property from video CSS
- [ ] Set video `z-index: 15` (below noise at 25)
- [ ] Update all three HTML files (index, portfolio, CV)
- [ ] Verify in browser - no overhang, matches noise bounds exactly

### Phase 2: Fix Blend Mode
- [ ] Hardcode `mix-blend-mode: screen` in CSS
- [ ] Remove CSS variable from mix-blend-mode (test if vars are the issue)
- [ ] Verify blend mode applies (check computed styles in DevTools)
- [ ] Confirm dark areas are transparent, light areas brighten

### Phase 3: Fix JavaScript
- [ ] Update JS to add class to `.overlay-effects` (not body, not #abs-scene)
- [ ] Update all three JS files (main.js, portfolio/app.js, cv-init.js)
- [ ] Verify video fades in when ready

### Phase 4: Re-enable Config Panel (After Positioning Works)
- [ ] Add back CSS variable support for blend mode
- [ ] Add back CSS variable support for opacity  
- [ ] Verify config panel controls update video in real-time
- [ ] Test all blend modes work correctly

## Open Questions

- Should we add a loading state for the video?
- Should video respect `prefers-reduced-motion`? (currently yes)
- Should we add fallback for browsers that don't support blend modes?
