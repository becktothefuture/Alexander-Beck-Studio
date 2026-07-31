# Playground Verification Checklist

## Source and build gates

- [x] `npm run validate:route-registry`
- [x] `npm run validate:route-registry:fixtures`
- [x] `npm run sync:entry-shell:check`
- [x] `npm run check:design-config`
- [x] Playground deterministic unit tests
- [x] `npm run check:site`
- [x] `npm run build`

## Required browser commands

- [x] `npm run certify:screens`
- [x] `npm run audit:canvas-spa`
- [x] `npm run audit:palette-surface-contract`
- [x] `npm run audit:playground`
- [x] `ABS_BROWSER=chromium npm run audit:transition-flows`
- [x] `ABS_BROWSER=webkit npm run audit:transition-flows`
- [x] Affected modal, focus/contrast, theme, frame, cursor, palette, and lifecycle audits

Run browser audits serially when they share a server or preview state.

## Route and shell

- [x] `/playground.html` direct load
- [x] `/playground` direct load
- [x] SPA entry and exit
- [x] Browser Back
- [x] Five shell tabs, active pill, labels, and 44px targets
- [x] No Button Bar or framed-window overlap
- [x] Shell remains stable through transitions

## Camera, wrapping, and grid

- [x] Initial title centring
- [x] Mouse, touch, pen, wheel, trackpad, arrow, WASD, and Home input
- [x] Diagonal movement
- [x] Positive, negative, horizontal, vertical, and diagonal wraps
- [x] No empty seam on large or narrow viewports
- [x] Dot phase moves with camera
- [x] Work and labels align to the same grid
- [x] Dot field remains below all project media and labels
- [x] No application zoom; browser zoom remains available
- [x] Resize preserves the logical centre point

## Content and media

- [x] Exactly 20 logical items
- [x] Exactly 8 image, 6 video, and 6 code items
- [x] Local assets load without console/page errors
- [x] Image, video, and code lightboxes work
- [x] Offscreen and route-exit media pause or dispose
- [x] One active video maximum per logical item
- [x] One active iframe maximum per logical item
- [x] Repeated copies create no duplicate tab stops or accessible items

## Accessibility and state

- [x] One main, one H1, one ordered collection
- [x] Visible focus and 44px targets
- [x] Enter/Space open and Escape closes
- [x] Dialog name, media type, trap, inert background, and exact focus restoration
- [x] Backdrop, close control, browser Back, and specified media re-click close
- [x] Valid and invalid `?work=` state
- [x] Drag release never activates work
- [x] AA text contrast in both themes
- [x] Reduced motion preserves complete functionality
- [x] Browser zoom is not disabled

## Configuration round trip

- [x] Live apply — direct evidence
- [x] Canonical save — direct evidence
- [x] Reload — direct evidence
- [x] Flatten/build — direct evidence
- [x] Preview — direct evidence
- [x] Detached host uses the same schema
- [x] Diagnostics are read-only
- [x] No browser-storage value overrides canonical design truth

## World growth

- [x] Default at least 80 × 56 cells
- [x] Default larger than 2000 × 1400 pixels
- [x] World derives from content footprint
- [x] Item 21 requires no code change
- [x] Item 21 preserves positions 1–20
- [x] Continued additions expand world area and copy coverage
- [x] Larger spans can expand the world
- [x] Same seed and content reproduce positions and dimensions
- [x] New seed deterministically regenerates arrangement
- [x] Growth preserves title anchor and unique interaction/media ownership

## Visual matrix

Routes: Home, Work, About Me, Playground, Contact.

Viewports: 1440 × 1000, 834 × 1194, 390 × 844.

Themes: light and dark.

Browsers: Chromium and WebKit.

Playground states: opening, horizontal/vertical/diagonal pan, near seam, after wrap, image/video/code lightbox, reduced motion, docked panel, detached panel, default world, and temporary expanded world.

- [x] Captures generated
- [x] Captures manually inspected
- [x] Artifact paths recorded

## Review and hygiene

- [x] Independent reviewer complete
- [x] All valid critical/high/medium findings resolved
- [x] Task-owned diff inspected
- [x] Pre-existing workspace changes preserved
- [x] No commit, push, publish, or deployment performed
