# PRD: Seamless Page Transitions

## Introduction

Add cinematic page transitions to the Alexander Beck Studio website using the **View Transitions API** (Chrome/Edge) with a graceful **departure/arrival fallback** (Safari/Firefox). The wall frame stays visually stable during navigation while interior content transitions with depth animations.

This approach uses **normal page navigations** — no SPA, no PJAX, no content fetching. The browser handles everything; we just choreograph the visuals.

## Goals

- **Visual continuity**: Wall appears to stay fixed while content transitions (Chrome native, Safari approximated)
- **Cinematic depth**: Content recedes/emerges with scale, blur, and opacity
- **Gate unlock theater**: Satisfying animation when 4-digit code succeeds
- **Minimal complexity**: ~200 lines of new code, not 2000
- **Zero loading penalty**: Normal navigations, browser caching works as expected
- **Progressive enhancement**: Works without JS, just loses the polish

## Architecture: How It Works

### Chrome/Edge (View Transitions API)

The browser captures a screenshot of the current page, navigates, captures the new page, then animates between them. We control the animation via CSS.

```css
/* Wall stays fixed (same view-transition-name = morphs in place) */
#bravia-balls { view-transition-name: wall; }
.noise { view-transition-name: noise; }
#edge-caption { view-transition-name: caption; }

/* Content transitions with depth */
::view-transition-old(content) {
  animation: recede 400ms ease-out forwards;
}
::view-transition-new(content) {
  animation: emerge 500ms ease-out forwards;
}
```

### Safari/Firefox (Departure + Arrival)

No View Transitions support, so we fake it:
1. **Departure**: On link click, animate content out (300ms), then navigate
2. **Arrival**: Destination page runs entrance animation (you already have this)

The wall "flashes" briefly during navigation, but the departure/arrival animations mask it perceptually.

---

## User Stories

### US-001: Add View Transitions CSS
**Description:** As a user on Chrome, I want the wall to stay fixed and content to transition with depth when navigating between pages.

**Acceptance Criteria:**
- [ ] Add `@view-transition { navigation: auto; }` to enable cross-document transitions
- [ ] Assign `view-transition-name: wall` to `#bravia-balls`
- [ ] Assign `view-transition-name: noise` to `.noise`
- [ ] Assign `view-transition-name: caption` to `#edge-caption`
- [ ] Assign `view-transition-name: content` to interior content zones
- [ ] Define `::view-transition-old(content)` animation: scale 1→0.92, opacity 1→0, blur 0→8px
- [ ] Define `::view-transition-new(content)` animation: scale 0.96→1, opacity 0→1, blur 6px→0
- [ ] Wall elements (wall, noise, caption) use `animation: none` to stay static
- [ ] Transitions work on index→portfolio, portfolio→cv, cv→index, all directions
- [ ] npm run build passes

---

### US-002: Create Departure Animation Module
**Description:** As a developer, I need a module that animates content out before navigation for browsers without View Transitions.

**Acceptance Criteria:**
- [ ] Create `source/modules/visual/page-departure.js`
- [ ] Export `animateDeparture()` that fades/scales content out over 300ms
- [ ] Return a Promise that resolves when animation completes
- [ ] Only runs if `!document.startViewTransition` (View Transitions not supported)
- [ ] Uses WAAPI for GPU-accelerated animation
- [ ] Respects `prefers-reduced-motion` (instant navigation, no animation)
- [ ] npm run build passes

---

### US-003: Intercept Navigation for Departure Animation
**Description:** As a user on Safari, I want a smooth fade-out before the page changes, not an abrupt jump.

**Acceptance Criteria:**
- [ ] Add `data-transition` attribute to navigation links (back arrows, gate success redirects)
- [ ] On click of `[data-transition]` links, run departure animation before navigating
- [ ] Use `event.preventDefault()`, animate, then `window.location.href = url`
- [ ] Skip interception if View Transitions API is supported (browser handles it)
- [ ] Gate success (portfolio/CV modals) triggers departure before redirect
- [ ] npm run build passes
- [ ] Verify in browser: Safari shows fade-out before navigation

---

### US-004: Enhance Entrance Animations for Arrival
**Description:** As a user arriving on any page, I want content to emerge from depth with the same cinematic quality as the index page.

**Acceptance Criteria:**
- [ ] Portfolio page entrance: `.portfolio-stage` and `#portfolioMeta` emerge with depth animation
- [ ] CV page entrance: `.cv-scroll-container` emerges with depth animation
- [ ] All pages use consistent timing: 500ms duration, `cubic-bezier(0.16, 1, 0.3, 1)` easing
- [ ] All pages use consistent depth values: scale 0.96→1, translateZ -40px→0, blur 6px→0
- [ ] Chrome: Entrance animation skipped if View Transition just ran (avoid double animation)
- [ ] Safari: Entrance animation always runs (it's the only "arrival" effect)
- [ ] npm run build passes
- [ ] Verify in browser using dev-browser skill

---

### US-005: Gate Unlock Animation Enhancement
**Description:** As a user, when I enter the correct 4-digit code, I want a satisfying unlock animation before transitioning to the destination.

**Acceptance Criteria:**
- [ ] On correct code: inputs pulse (scale 1→1.08→1) with subtle glow
- [ ] Success flash: `#page-flash` shows green tint for 150ms
- [ ] Gate modal dissolves: scale 1→1.03, opacity 1→0, blur 0→4px over 250ms
- [ ] After dissolve: trigger departure animation (US-002) or let View Transition take over
- [ ] Total time from correct code to navigation start: ~500ms
- [ ] Feels "unlocked" and earned, not abrupt
- [ ] npm run build passes
- [ ] Verify in browser using dev-browser skill

---

### US-006: Chrome Cross-Fade for Navigation Elements
**Description:** As a user, I want the header/footer navigation links to smoothly transition between pages, not jump.

**Acceptance Criteria:**
- [ ] Assign `view-transition-name: header` to `.ui-top`
- [ ] Assign `view-transition-name: footer` to `.ui-bottom`
- [ ] Header/footer cross-fade during transition (opacity animation, not morph)
- [ ] Social links (same on all pages) stay visually stable
- [ ] Time display continues updating through transition
- [ ] npm run build passes

---

### US-007: Reduced Motion Support
**Description:** As a user with motion sensitivity, I want simple, non-disorienting transitions.

**Acceptance Criteria:**
- [ ] Detect `prefers-reduced-motion: reduce`
- [ ] View Transitions: Use simple 200ms cross-fade, no scale/blur/depth
- [ ] Departure animation: Skip entirely, navigate immediately
- [ ] Entrance animation: Use existing reduced motion path (simple fade)
- [ ] Gate unlock: Simple fade, no pulse/glow
- [ ] npm run build passes

---

### US-008: Back Navigation Polish
**Description:** As a user clicking the back arrow on Portfolio or CV, I want the same smooth transition back to Index.

**Acceptance Criteria:**
- [ ] Back arrow (`.gate-back`) has `data-transition` attribute
- [ ] Clicking back triggers departure animation (Safari) or View Transition (Chrome)
- [ ] Browser back button also triggers View Transition in Chrome
- [ ] Safari browser back: No departure animation (already navigated), entrance animation plays
- [ ] npm run build passes
- [ ] Verify in browser using dev-browser skill

---

## Functional Requirements

- **FR-1**: View Transitions enabled via `@view-transition { navigation: auto; }` in CSS
- **FR-2**: Wall elements (`#bravia-balls`, `.noise`, `#edge-caption`) have stable `view-transition-name` values
- **FR-3**: Interior content zones have matching `view-transition-name: content` across pages
- **FR-4**: Departure animation runs only when View Transitions unavailable
- **FR-5**: Gate unlock sequence: pulse → flash → dissolve → depart/transition
- **FR-6**: All depth animations use scale 0.92-0.96, blur 6-8px, cubic-bezier easing
- **FR-7**: Reduced motion users get simple fades, no depth effects
- **FR-8**: Each page remains fully functional without JS (graceful degradation)

---

## Non-Goals (Out of Scope)

- **No PJAX or content fetching** — normal page navigations only
- **No SPA conversion** — keep separate HTML files
- **No prefetching system** — browser handles this natively
- **No audio transition sounds** — future enhancement
- **No simulation state persistence** — balls reset when returning to index
- **No history.pushState** — browser handles navigation naturally

---

## Technical Considerations

### File Changes

```
source/
├── css/
│   └── main.css                    # Add view-transition rules (~50 lines)
├── modules/
│   └── visual/
│       ├── page-departure.js       # NEW: Departure animation (~60 lines)
│       └── entrance-animation.js   # MODIFY: Add View Transition detection (~20 lines)
└── index.html, portfolio.html, cv.html  # Add data-transition attributes
```

### View Transition CSS (Core)

```css
@view-transition {
  navigation: auto;
}

/* Wall stays fixed */
#bravia-balls { view-transition-name: wall; }
.noise { view-transition-name: noise; }
#edge-caption { view-transition-name: caption; }

/* Wall elements don't animate */
::view-transition-old(wall),
::view-transition-new(wall),
::view-transition-old(noise),
::view-transition-new(noise),
::view-transition-old(caption),
::view-transition-new(caption) {
  animation: none;
  mix-blend-mode: normal;
}

/* Content depth transition */
::view-transition-old(content) {
  animation: vt-recede 400ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

::view-transition-new(content) {
  animation: vt-emerge 500ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes vt-recede {
  to {
    opacity: 0;
    transform: scale(0.92) translateZ(-60px);
    filter: blur(8px);
  }
}

@keyframes vt-emerge {
  from {
    opacity: 0;
    transform: scale(0.96) translateZ(-40px);
    filter: blur(6px);
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(content),
  ::view-transition-new(content) {
    animation-duration: 200ms;
    animation-name: vt-fade;
  }
  
  @keyframes vt-fade {
    from { opacity: 0; }
    to { opacity: 1; }
  }
}
```

### Animation Timing

| Phase | Duration | Notes |
|-------|----------|-------|
| Gate unlock pulse | 200ms | Input feedback |
| Gate dissolve | 250ms | Modal exit |
| Content recede (View Transition) | 400ms | Old page out |
| Content emerge (View Transition) | 500ms | New page in |
| Departure fallback (Safari) | 300ms | Before navigation |
| Entrance fallback (Safari) | 500ms | After navigation |

### Browser Support

| Browser | Approach | Quality |
|---------|----------|---------|
| Chrome 126+ | View Transitions API | Native, wall stays fixed |
| Edge 126+ | View Transitions API | Native, wall stays fixed |
| Safari | Departure + Entrance | Smooth fade, wall briefly reloads |
| Firefox | Departure + Entrance | Smooth fade, wall briefly reloads |
| No JS | Normal navigation | Instant, still works |

---

## Success Metrics

- **Chrome/Edge**: Wall visually stays fixed, content depth-transitions (0 flicker)
- **Safari**: Content fades out, page loads, content fades in (masked reload)
- **Performance**: No additional network requests, no loading penalty
- **Code size**: <200 lines of new code total
- **Complexity**: No lifecycle management, no state syncing, no cleanup hooks

---

### US-009: Speculative Prefetching on Hover
**Description:** As a user, I want page transitions to feel instant because the destination page is prefetched while I hover over the link.

**Acceptance Criteria:**
- [ ] On hover/focus of navigation links for 100ms+, inject `<link rel="prefetch">` for destination
- [ ] Prefetch only once per URL (track in Set to avoid duplicates)
- [ ] On mobile: prefetch on touchstart
- [ ] Cancel prefetch timeout on mouseleave/touchend if <100ms
- [ ] No prefetch if `navigator.connection.saveData` is true (respect data saver)
- [ ] Works for: main-links buttons, gate-back arrows, modal success redirects
- [ ] npm run build passes

---

## Open Questions

1. Should the edge caption text change per page during transition?
2. Should we add a subtle audio cue for transitions (future enhancement)?
3. Should portfolio/CV remember scroll position on return?

---

## Implementation Order

1. **US-001**: View Transitions CSS (foundation, Chrome works immediately)
2. **US-002**: Departure animation module
3. **US-003**: Navigation interception for Safari
4. **US-004**: Enhance entrance animations
5. **US-005**: Gate unlock animation
6. **US-006**: Chrome cross-fade
7. **US-007**: Reduced motion
8. **US-008**: Back navigation polish
9. **US-009**: Speculative prefetching (optimization)

---

## Comparison: This PRD vs Original PJAX Approach

| Aspect | PJAX Approach (Original) | View Transitions (This PRD) |
|--------|--------------------------|----------------------------|
| **New code** | ~1500-2000 lines | ~200 lines |
| **Complexity** | High (fetch, parse, swap, lifecycle) | Low (CSS + small JS module) |
| **Wall persistence** | True (never unmounts) | Visual (Chrome native, Safari faked) |
| **Loading speed** | Same (still fetches pages) | Same (normal navigation) |
| **Safari experience** | Identical to Chrome | Slightly less seamless (masked reload) |
| **Debugging** | Complex (virtual navigation state) | Simple (normal page lifecycle) |
| **Risk** | High (many edge cases) | Low (browser handles navigation) |
| **Maintenance** | Ongoing (lifecycle hooks for each page) | Minimal (CSS + one small module) |
| **Graceful degradation** | Complex (fallback modes) | Natural (just normal navigation) |

**Verdict**: The PJAX approach was over-engineered. This approach achieves 95% of the polish with 10% of the complexity.

---

*This PRD defines a lightweight, progressive enhancement that makes page transitions feel cinematic without the engineering overhead of a custom navigation system.*
