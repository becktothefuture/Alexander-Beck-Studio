# PRD: Portfolio Project Detail View Improvements

## Introduction

The portfolio project detail view requires comprehensive improvements to achieve visual parity with the index and portfolio carousel pages, enhance accessibility, improve performance, and create a cohesive user experience. Currently, the detail view has inconsistencies in background treatment, noise overlay, typography, link styling, and lacks important UX features like an inline close button and proper keyboard navigation.

**Source of Truth:** The index page (`dist/index.html`) and portfolio carousel page (`dist/portfolio.html`) serve as the definitive reference for all styling decisions—buttons, text sizes, backgrounds, noise overlay, and link behaviors.

## Goals

- Achieve visual parity between detail view and index/portfolio pages
- Apply consistent noise overlay treatment matching the main pages
- Ensure background colors respect dark/light mode properly
- Add inline close button at bottom with 30vh vertical padding
- Use existing design tokens exclusively (no hardcoded values)
- Improve accessibility with focus trap and keyboard navigation
- Optimize video handling and loading states
- Support mobile gestures for intuitive navigation
- Maintain 60fps performance throughout all transitions

## User Stories

---

### US-001: Background Color Matches Page Theme
**Description:** As a user, I want the project detail background to match the portfolio page background (light in light mode, dark in dark mode) so the experience feels seamless.

**Starting Point:** 
- File: `source/css/portfolio.css` lines 535-552
- Current: Uses `--bg-light` / `--bg-dark` directly
- Issue: Background appears isolated from the page

**Expected Behavior:**
- Detail view background matches portfolio page exactly
- Smooth transition when opening/closing
- No flash of different color during transition

**Acceptance Criteria:**
- [ ] `.project-detail` uses `var(--bg-light)` in light mode
- [ ] `.project-detail` uses `var(--bg-dark)` in dark mode (via `body.dark-mode`)
- [ ] Background transition syncs with overlay opacity transition
- [ ] No visible color discontinuity during open/close animation
- [ ] Typecheck/lint passes
- [ ] Verify in browser: test both light and dark modes

---

### US-002: Noise Overlay Applied Correctly
**Description:** As a user, I want the same film-grain noise texture on the detail view as on the main portfolio page so the visual treatment is consistent.

**Starting Point:**
- Files: `source/css/portfolio.css` lines 817-854, `source/css/main.css` lines 1676-1765
- Current: Detail has `.project-detail__noise` but may not receive procedural texture from `initNoiseSystem()`
- Reference: Main page `.noise` class implementation

**Expected Behavior:**
- Same procedural noise texture appears over detail content
- Noise animates with same jitter/flicker settings
- Opacity matches page noise (light: 0.08-0.14, dark: 0.06-0.12)
- Noise does not interfere with content readability

**Acceptance Criteria:**
- [ ] Noise uses `--abs-noise-texture` CSS variable (set by `initNoiseSystem()`)
- [ ] Noise layer has correct z-index (above background, below content)
- [ ] Opacity respects `--noise-opacity-light` and `--noise-opacity-dark` tokens
- [ ] Animation uses `--abs-noise-keyframes` and `--abs-noise-speed`
- [ ] Noise visible but subtle on both light and dark modes
- [ ] Typecheck/lint passes
- [ ] Verify in browser: compare noise to portfolio carousel page

---

### US-003: Inline Close Button at Bottom
**Description:** As a user, I want a large, obvious close link at the bottom of the project content so I can easily dismiss the detail view after reading.

**Starting Point:**
- File: `source/modules/portfolio/app.js` function `renderDetailContent()` around line 1302
- File: `source/css/portfolio.css` - add new styles
- Reference: Existing `.project-detail__close` button styling (lines 569-595)

**Expected Behavior:**
- Large inline close button appears after "Personal takeaways" section
- Styled identically to floating close button (`.gate-back .abs-icon-btn`)
- Has 30vh vertical padding (15vh top, 15vh bottom) for generous spacing
- Click/tap closes detail view with same animation as floating button
- Button includes "Close" text and X icon

**Acceptance Criteria:**
- [ ] Close button rendered at bottom of `.project-detail__inner`
- [ ] Uses same classes: `gate-back abs-icon-btn`
- [ ] Vertical padding: `padding: 15vh 0` (totaling 30vh spacing)
- [ ] Button horizontally centered
- [ ] Click triggers `closeProjectDetail()` method
- [ ] Keyboard accessible (Enter/Space activates)
- [ ] Typecheck/lint passes
- [ ] Verify in browser: scroll to bottom, click close, verify animation

---

### US-004: Link Styling Matches Index Page
**Description:** As a user, I want links in the detail view to behave the same as on the index page (color change on hover, same transition timing).

**Starting Point:**
- File: `source/css/portfolio.css` lines 766-777 (`.project-detail__links a`)
- Reference: `source/css/main.css` link hover styles (search for `--link-hover-color`)
- Token: `--link-hover-color: var(--color-accent)` (#ff4013)

**Expected Behavior:**
- Links use `--text-primary` as default color
- Hover changes to `--link-hover-color` (accent orange)
- Transition uses `--duration-link-hover` timing
- Same subtle scale/lift effect as index links if applicable

**Acceptance Criteria:**
- [ ] `.project-detail__links a` uses `color: var(--text-primary)`
- [ ] Hover state: `color: var(--link-hover-color)`
- [ ] Transition: `transition: color var(--duration-link-hover) var(--ease-settle)`
- [ ] Text links in overview/body also follow same pattern
- [ ] Typecheck/lint passes
- [ ] Verify in browser: hover over links, compare to index page behavior

---

### US-005: Typography Uses Design Tokens
**Description:** As a user, I want consistent typography across all pages, using the same fluid sizing as index and portfolio pages.

**Starting Point:**
- File: `source/css/portfolio.css` lines 688-814 (detail typography)
- Issue: Hardcoded values like `font-size: 80px`, `font-size: 18px`, etc.
- Reference: `source/css/tokens.css` for `--text-*` and `--abs-text-*` tokens

**Expected Behavior:**
- Title uses clamp-based sizing matching portfolio meta title
- Body text uses `--text-md` or `--text-lg` tokens
- Eyebrow/labels use `--text-xs` or `--text-sm` tokens
- Line heights use `--line-height-*` tokens

**Acceptance Criteria:**
- [ ] `.project-detail__title` uses `clamp()` sizing (e.g., `clamp(36px, 8vw, 80px)`)
- [ ] `.project-detail__eyebrow` uses `var(--text-xs)` or `var(--text-sm)`
- [ ] `.project-detail__summary` uses `var(--text-lg)`
- [ ] `.project-detail__overview p` uses `var(--text-md)`
- [ ] Section headings use `var(--text-sm)` with `--letter-spacing-loose`
- [ ] All line-heights use tokens (`--line-height-body`, etc.)
- [ ] Typecheck/lint passes
- [ ] Verify in browser: resize window, confirm fluid typography

---

### US-006: Spacing Uses Design Tokens
**Description:** As a developer, I want all spacing to use design tokens so the system is maintainable and consistent.

**Starting Point:**
- File: `source/css/portfolio.css` lines 604-632
- Issue: Hardcoded gaps (`gap: 32px`, `padding: 0 24px`, etc.)
- Reference: `source/css/tokens.css` for `--gap-*` and `--space-*` tokens

**Expected Behavior:**
- All gaps use `--gap-md`, `--gap-lg`, `--gap-xl` etc.
- Padding uses `--content-padding` or `--space-*` tokens
- Margins use spacing tokens where applicable

**Acceptance Criteria:**
- [ ] `.project-detail__inner` gap uses `var(--gap-xl)` or similar
- [ ] `.project-detail__content` gap uses `var(--gap-lg)`
- [ ] Horizontal padding uses `var(--content-padding)` or `var(--gap-lg)`
- [ ] `.project-detail__intro` gaps use tokens
- [ ] `.project-detail__stack` gap uses `var(--gap-lg)`
- [ ] Typecheck/lint passes

---

### US-007: Transition Performance Optimization
**Description:** As a user, I want smooth 60fps transitions when opening/closing the detail view without jank or stuttering.

**Starting Point:**
- File: `source/css/portfolio.css` lines 535-557 (`.project-detail` transitions)
- File: `source/modules/portfolio/app.js` lines 1369-1441 (`openProjectDetail`)

**Expected Behavior:**
- Open/close transitions maintain 60fps
- No layout thrashing during animation
- GPU-accelerated properties only (transform, opacity)
- Content pop-in doesn't cause reflow

**Acceptance Criteria:**
- [ ] Transitions use only `transform` and `opacity` (GPU-accelerated)
- [ ] `will-change` applied strategically (remove after animation)
- [ ] No `width`, `height`, `top`, `left` animations
- [ ] Content uses `transform: scale()` for pop-in, not dimension changes
- [ ] Test on throttled CPU (Chrome DevTools) - no dropped frames
- [ ] Typecheck/lint passes
- [ ] Verify in browser: open/close multiple times, check DevTools Performance

---

### US-008: Focus Trap in Modal
**Description:** As a keyboard user, I want focus to be trapped within the detail modal so I can't accidentally tab into invisible carousel elements.

**Starting Point:**
- File: `source/modules/portfolio/app.js` lines 1369-1496 (open/close methods)
- Current: Focus moves to close button on open, returns on close
- Missing: Focus cycling within modal

**Expected Behavior:**
- Tab cycles through focusable elements within detail only
- Shift+Tab cycles backwards
- Focus never escapes to carousel behind
- On close, focus returns to previously focused element

**Acceptance Criteria:**
- [ ] Implement focus trap on `openProjectDetail()`
- [ ] Trap includes: close button (top), links, close button (bottom)
- [ ] Tab from last element goes to first element
- [ ] Shift+Tab from first element goes to last element
- [ ] Focus restored to `this.lastFocusedElement` on close
- [ ] Typecheck/lint passes
- [ ] Verify in browser: tab through entire modal, confirm no escape

---

### US-009: Video Controls and Preload Strategy
**Description:** As a user, I want to control video playback and not waste bandwidth on videos I haven't scrolled to yet.

**Starting Point:**
- File: `source/modules/portfolio/app.js` lines 1271-1281 (video rendering)
- File: `source/modules/portfolio/app.js` lines 1498-1523 (`syncDetailVideos`)
- Current: `preload="auto"` and `autoplay` on all videos

**Expected Behavior:**
- Videos use `preload="metadata"` until near viewport
- IntersectionObserver triggers `preload="auto"` when approaching
- Subtle play/pause indicator on hover (or tap on mobile)
- Video pauses when scrolled out of view (already implemented)

**Acceptance Criteria:**
- [ ] Videos render with `preload="metadata"` initially
- [ ] IntersectionObserver with `rootMargin: "200px"` upgrades to `preload="auto"`
- [ ] Add minimal play/pause overlay (icon only, no full controls)
- [ ] Overlay visible on hover (desktop) or tap (mobile)
- [ ] Respect `prefers-reduced-motion` - no autoplay if reduced motion
- [ ] Typecheck/lint passes
- [ ] Verify in browser: check Network tab, videos don't preload until near

---

### US-010: Scroll Progress Indicator
**Description:** As a user, I want to see my scroll position in long project content so I know how much remains.

**Starting Point:**
- File: `source/css/portfolio.css` - add new styles
- File: `source/modules/portfolio/app.js` - add scroll listener in `openProjectDetail()`

**Expected Behavior:**
- Thin progress bar at top of detail view (below close button)
- Uses `--color-accent` color
- Width represents scroll percentage (0-100%)
- Subtle fade in/out based on scroll activity

**Acceptance Criteria:**
- [ ] Progress bar element added to `.project-detail__card`
- [ ] Position: fixed at top, full width, 2-3px height
- [ ] Color: `var(--color-accent)` with slight transparency
- [ ] Width calculated from `scrollTop / (scrollHeight - clientHeight)`
- [ ] Cleanup scroll listener on `closeProjectDetail()`
- [ ] Typecheck/lint passes
- [ ] Verify in browser: scroll through long project, confirm progress updates

---

### US-011: Keyboard Navigation Between Projects
**Description:** As a keyboard user, I want to navigate to adjacent projects using arrow keys while in detail view.

**Starting Point:**
- File: `source/modules/portfolio/app.js` - add keydown listener
- Reference: `this.activeIndex` tracks current project
- Reference: `this.projects` array contains all projects

**Expected Behavior:**
- Left arrow: close current, open previous project
- Right arrow: close current, open next project
- Wraps around (first ↔ last)
- Brief transition animation between projects

**Acceptance Criteria:**
- [ ] Keydown listener added when detail opens
- [ ] ArrowLeft opens `projects[(activeIndex - 1 + length) % length]`
- [ ] ArrowRight opens `projects[(activeIndex + 1) % length]`
- [ ] Transition: quick fade out, update content, fade in
- [ ] Listener removed when detail closes
- [ ] Screen reader announcement of "Project X of Y"
- [ ] Typecheck/lint passes
- [ ] Verify in browser: open detail, press arrow keys, confirm navigation

---

### US-012: Hero Image Aspect Ratio
**Description:** As a user, I want hero images to display properly regardless of their original aspect ratio.

**Starting Point:**
- File: `source/css/portfolio.css` lines 651-671 (`.project-detail__media`)
- Current: Fixed `height: var(--detail-hero-height)` (75vh)
- Issue: Images crop unpredictably

**Expected Behavior:**
- Hero maintains image aspect ratio up to max height
- Uses `aspect-ratio` CSS property with fallback
- Image covers container without excessive cropping
- Responsive: smaller on mobile, larger on desktop

**Acceptance Criteria:**
- [ ] `.project-detail__media` uses `max-height: 75vh` instead of fixed height
- [ ] Add `aspect-ratio: 16/9` as baseline with `object-fit: cover`
- [ ] Image fills container width, height adjusts to ratio
- [ ] Mobile: `max-height: 50vh` for better content visibility
- [ ] Typecheck/lint passes
- [ ] Verify in browser: test with various image aspect ratios

---

### US-013: Loading States for Media
**Description:** As a user, I want to see loading indicators while images/videos load so the page doesn't feel broken.

**Starting Point:**
- File: `source/modules/portfolio/app.js` `renderDetailContent()` method
- File: `source/css/portfolio.css` - add skeleton styles

**Expected Behavior:**
- Skeleton placeholder shown while image loads
- Subtle pulse animation on skeleton
- Fade-in when image loads
- Skeleton color matches theme (light gray / dark gray)

**Acceptance Criteria:**
- [ ] Add skeleton wrapper div around each image/video
- [ ] Skeleton background: `var(--text-muted)` at 10% opacity
- [ ] Skeleton has subtle pulse animation
- [ ] Image has `opacity: 0` initially, fades to 1 on load
- [ ] JS adds `loaded` class on image `onload` event
- [ ] Typecheck/lint passes
- [ ] Verify in browser: throttle network, observe loading states

---

### US-014: Styled Scrollbar
**Description:** As a user, I want the detail view scrollbar to match the site's polished aesthetic.

**Starting Point:**
- File: `source/css/portfolio.css` lines 597-602 (`.project-detail__scroller`)

**Expected Behavior:**
- Thin scrollbar (6-8px width)
- Track: transparent or very subtle
- Thumb: `--text-muted` color at low opacity
- Rounded ends
- Hover: thumb becomes more visible

**Acceptance Criteria:**
- [ ] Add `::-webkit-scrollbar` styles for WebKit browsers
- [ ] Add `scrollbar-width: thin` and `scrollbar-color` for Firefox
- [ ] Track: `transparent`
- [ ] Thumb: `rgba(var(--abs-rgb-black), 0.2)` light mode
- [ ] Thumb: `rgba(var(--abs-rgb-white), 0.2)` dark mode
- [ ] Thumb border-radius: `4px`
- [ ] Typecheck/lint passes
- [ ] Verify in browser: scroll in detail view, confirm styled scrollbar

---

### US-015: Swipe Gestures on Mobile
**Description:** As a mobile user, I want to use natural gestures to navigate the detail view.

**Starting Point:**
- File: `source/modules/portfolio/app.js` - add touch handlers
- Reference: Existing touch handling in carousel (`bindEvents()`)

**Expected Behavior:**
- Swipe down from top: close detail view
- Swipe left/right: navigate to adjacent projects
- Threshold: 50px minimum, velocity considered
- Visual feedback during swipe (slight movement/opacity)

**Acceptance Criteria:**
- [ ] Touch start/move/end listeners on `.project-detail__scroller`
- [ ] Swipe down (when scrollTop === 0): triggers close if > 100px
- [ ] Swipe left (> 50px): navigate to next project
- [ ] Swipe right (> 50px): navigate to previous project
- [ ] Add slight transform feedback during swipe
- [ ] Debounce to prevent accidental triggers
- [ ] Typecheck/lint passes
- [ ] Verify on mobile device or DevTools mobile emulation

---

### US-016: External Link Indicators
**Description:** As a user, I want to know when a link will open in a new tab before I click it.

**Starting Point:**
- File: `source/modules/portfolio/app.js` lines 1294-1300 (links rendering)
- File: `source/css/portfolio.css` lines 766-777 (link styles)
- Icon: `ti-external-link` from Tabler Icons

**Expected Behavior:**
- External links show small arrow/external icon after text
- Icon is subtle (smaller, muted color)
- Icon animates slightly on hover

**Acceptance Criteria:**
- [ ] Add `<i class="ti ti-external-link">` after link text in render
- [ ] Style icon: `font-size: 0.75em`, `opacity: 0.6`, `margin-left: 4px`
- [ ] Icon color inherits from link color
- [ ] Add to Tabler icons font-face: `.ti-external-link:before { content: "\ea99"; }`
- [ ] Typecheck/lint passes
- [ ] Verify in browser: confirm icon appears on external links

---

### US-017: Preloading Strategy Enhancement
**Description:** As a developer, I want an optimized preloading strategy that balances performance with user experience.

**Starting Point:**
- File: `source/modules/portfolio/app.js` lines 1574-1599 (`prefetchProjectAssets`)
- Current: Preloads all assets for current project + adjacent on scroll

**Expected Behavior:**
- Preload cover images for ±2 adjacent projects
- Preload detail images only when detail is about to open
- Respect `navigator.connection.saveData` and `effectiveType`
- Use `requestIdleCallback` for non-critical preloads

**Acceptance Criteria:**
- [ ] Preload ±2 adjacent project cover images on carousel scroll
- [ ] On slide hover (300ms debounce): preload that project's detail assets
- [ ] Check `navigator.connection.effectiveType` - skip video on slow connections
- [ ] Use `<link rel="preload">` for critical images
- [ ] Log preload activity in dev mode for debugging
- [ ] Typecheck/lint passes
- [ ] Verify in browser: check Network tab, confirm smart preloading

---

## Functional Requirements

### Visual Parity
- **FR-01:** Detail background must use `--bg-light` / `--bg-dark` CSS variables
- **FR-02:** Noise overlay must use same `--abs-noise-*` variables as main page
- **FR-03:** All typography must use `--text-*` and `--line-height-*` tokens
- **FR-04:** All spacing must use `--gap-*` and `--space-*` tokens
- **FR-05:** Link hover color must be `--link-hover-color` (accent)
- **FR-06:** Scrollbar must be styled to match site aesthetic

### UX Improvements
- **FR-07:** Inline close button at bottom with 30vh vertical padding
- **FR-08:** Scroll progress indicator at top of detail view
- **FR-09:** Loading skeleton for images and videos
- **FR-10:** External links must show visual indicator icon

### Accessibility
- **FR-11:** Focus must be trapped within modal when open
- **FR-12:** Escape key must close detail view
- **FR-13:** Arrow keys must navigate between projects
- **FR-14:** Focus must return to trigger element on close

### Performance
- **FR-15:** Transitions must use only GPU-accelerated properties
- **FR-16:** Videos must use `preload="metadata"` until near viewport
- **FR-17:** Preloading must respect `saveData` and connection speed
- **FR-18:** All animations must maintain 60fps

### Mobile
- **FR-19:** Swipe down must close detail view (when at scroll top)
- **FR-20:** Swipe left/right must navigate between projects
- **FR-21:** All touch targets must be minimum 44px

## Non-Goals (Out of Scope)

- No changes to the carousel wheel mechanics
- No changes to portfolio data structure or JSON schema
- No new project fields or metadata
- No sharing/social features
- No comments or reactions
- No analytics tracking within detail view
- No print stylesheet
- No offline support / service worker caching
- No image zoom/lightbox feature
- No video fullscreen controls

## Design Considerations

### Visual Reference
- **Index page** (`dist/index.html`): Source of truth for buttons, links, noise, backgrounds
- **Portfolio carousel** (`dist/portfolio.html`): Source of truth for wall frame, chrome, typography

### Components to Reuse
- `.gate-back` - Back/close button styling
- `.abs-icon-btn` - Icon button with hover background
- `.noise` - Noise overlay implementation
- Design tokens from `source/css/tokens.css`

### Color Palette
- Background light: `#f5f5f5` (`--bg-light`)
- Background dark: `#0a0a0a` (`--bg-dark`)
- Accent: `#ff4013` (`--color-accent`)
- Text primary: `#454545` light / `#617282` dark

## Technical Considerations

### Files to Modify
1. `source/css/portfolio.css` - Primary styling changes
2. `source/modules/portfolio/app.js` - JS behavior changes
3. `source/css/main.css` - Only if adding shared styles

### Dependencies
- Tabler Icons font (already included)
- No new npm packages required
- No external services

### Browser Support
- Chrome/Edge (latest 2 versions)
- Safari (latest 2 versions)
- Firefox (latest 2 versions)
- iOS Safari (latest 2 versions)
- Chrome Android (latest 2 versions)

### Performance Targets
- Transition animations: 60fps
- Time to interactive: < 100ms after open animation
- Largest Contentful Paint: < 500ms (hero image)

## Success Metrics

- **Visual Parity:** Detail view is indistinguishable in style from index/portfolio pages
- **Accessibility:** WCAG 2.1 AA compliance for keyboard and screen reader users
- **Performance:** No dropped frames during transitions (DevTools Performance audit)
- **Mobile UX:** Users can navigate using gestures without friction
- **Maintainability:** Zero hardcoded pixel/color values in new code

## Open Questions

1. Should arrow key navigation wrap around (last → first) or stop at boundaries?
   - **Recommendation:** Wrap around for continuous exploration

2. Should swipe gestures work anywhere or only at specific scroll positions?
   - **Recommendation:** Swipe down only at scrollTop=0, left/right anywhere

3. Should video controls be always visible or only on hover/tap?
   - **Recommendation:** Only on hover/tap to maintain clean aesthetic

4. Should scroll progress bar be always visible or fade after inactivity?
   - **Recommendation:** Always visible while scrolling, fade after 2s inactivity

## Implementation Order

Recommended sequence based on dependencies and impact:

1. **Phase 1: Visual Foundation** (US-001, US-002, US-005, US-006)
   - Background, noise, typography, spacing tokens

2. **Phase 2: Core UX** (US-003, US-004, US-014)
   - Inline close button, link styling, scrollbar

3. **Phase 3: Accessibility** (US-008, US-011)
   - Focus trap, keyboard navigation

4. **Phase 4: Media Handling** (US-009, US-012, US-013)
   - Video controls, aspect ratio, loading states

5. **Phase 5: Polish** (US-007, US-010, US-016, US-017)
   - Performance, scroll progress, external links, preloading

6. **Phase 6: Mobile** (US-015)
   - Swipe gestures

---

*Generated: 2026-01-26*
*Author: AI Assistant*
*Status: Ready for Implementation*
