# PRD: Build Pipeline Overhaul

| Field | Value |
|-------|-------|
| **Status** | Draft |
| **Author** | AI Assistant |
| **Created** | 2026-01-17 |
| **Last Updated** | 2026-01-17 |
| **Priority** | High |
| **Estimated Effort** | 4-6 hours |

---

## 1. Executive Summary

Reorganize the build system to output optimized production artifacts into a clean `dist/` folder (replacing `public/`), implement code-splitting for shared modules to reduce duplicate code across pages, adopt generic file naming conventions, and apply additional performance optimizations.

### Key Outcomes
- **~50% reduction** in total shipped JavaScript across all pages
- **Improved caching** for repeat visitors navigating between pages
- **Cleaner project structure** with industry-standard `dist/` naming
- **Generic asset names** (`app.js`, `styles.css`) instead of branded names

---

## 2. Background & Motivation

### 2.1 Current State

The project currently uses a `public/` directory for production builds with four separate JavaScript bundles:

| Bundle | Raw Size | Gzipped | Purpose |
|--------|----------|---------|---------|
| `bouncy-balls-embed.js` | 360KB | ~97KB | Main home page (physics simulation) |
| `portfolio-bundle.js` | 172KB | ~48KB | Portfolio carousel gallery |
| `cv-bundle.js` | 124KB | ~37KB | Bio/CV page |
| `splat-bundle.js` | 128KB | ~38KB | 3D point cloud demo |
| **Total** | **784KB** | **~220KB** | |

### 2.2 Problems Identified

1. **Code Duplication**: Each bundle independently includes shared modules:
   - `core/state.js` - duplicated 4x
   - `visual/colors.js` - duplicated 4x
   - `visual/dark-mode-v2.js` - duplicated 4x
   - `visual/noise-system.js` - duplicated 4x
   - `utils/runtime-config.js` - duplicated 4x
   - `utils/text-loader.js` - duplicated 4x
   - `ui/shared-chrome.js` - duplicated 3x
   - Plus ~15 more shared modules

   **Estimated duplication**: ~200KB+ of redundant code shipped across all pages.

2. **Non-Standard Naming**: `public/` is ambiguous (could mean "public-facing source" like in Create React App). Industry standard is `dist/` for distribution artifacts.

3. **Branded File Names**: `bouncy-balls-embed.js` and `bouncy-balls.css` expose internal project naming to production URLs. Generic names (`app.js`, `styles.css`) are more professional.

4. **No Code-Splitting**: Rollup is configured with `inlineDynamicImports: true`, forcing all code into single monolithic bundles per page.

5. **IIFE Format**: Current bundles use IIFE (Immediately Invoked Function Expression) format which prevents code-splitting. ES modules required for chunk sharing.

### 2.3 Opportunity

By implementing code-splitting with a shared chunk:
- **First-time visitors**: Download shared code once (~200KB → ~60KB gzip)
- **Repeat visitors**: Only download page-specific code (~20-50KB) as shared chunk is cached
- **Total unique code**: ~784KB → ~380KB (52% reduction)

---

## 3. Goals & Non-Goals

### 3.1 Goals

| ID | Goal | Success Metric |
|----|------|----------------|
| G1 | Rename output directory from `public/` to `dist/` | All references updated, builds work |
| G2 | Implement code-splitting with shared chunk | `shared.js` contains common modules |
| G3 | Rename assets to generic names | `app.js`, `styles.css` in production |
| G4 | Reduce total shipped JavaScript | ≥40% reduction in unique code |
| G5 | Maintain dev/prod parity | Same behavior in both environments |
| G6 | Zero breaking changes to functionality | All pages load and work correctly |

### 3.2 Non-Goals

- **Asset hashing** (e.g., `app.[hash].js`) - Future enhancement, not in scope
- **CDN integration** - Deployment infrastructure unchanged
- **Source map changes** - Keep existing sourcemap behavior
- **New features** - Pure infrastructure refactor
- **CSS code-splitting** - CSS remains a single bundled file

---

## 4. Technical Architecture

### 4.1 Directory Structure Change

```
BEFORE                          AFTER
───────                         ─────
public/                         dist/
├── index.html                  ├── index.html
├── portfolio.html              ├── portfolio.html
├── cv.html                     ├── cv.html
├── splat/                      ├── splat/
│   └── index.html              │   └── index.html
├── css/                        ├── css/
│   ├── bouncy-balls.css        │   └── styles.css
│   └── portfolio.css           │   └── portfolio.css
├── js/                         ├── js/
│   ├── bouncy-balls-embed.js   │   ├── shared.js      (NEW - common code)
│   ├── portfolio-bundle.js     │   ├── app.js         (main page)
│   ├── cv-bundle.js            │   ├── portfolio.js
│   └── splat-bundle.js         │   ├── cv.js
│                               │   └── splat.js
├── config/                     ├── config/
├── fonts/                      ├── fonts/
└── images/                     └── images/
```

### 4.2 Code-Splitting Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SHARED CHUNK (~200KB raw)                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ core/state.js          core/constants.js                    │   │
│  │ visual/colors.js       visual/dark-mode-v2.js               │   │
│  │ visual/noise-system.js visual/wall-frame.js                 │   │
│  │ visual/entrance-animation.js                                │   │
│  │ utils/runtime-config.js utils/text-loader.js                │   │
│  │ utils/font-loader.js    utils/page-nav.js                   │   │
│  │ utils/tokens.js         utils/logger.js                     │   │
│  │ ui/shared-chrome.js     ui/modal-overlay.js                 │   │
│  │ ui/cv-modal.js          ui/portfolio-modal.js               │   │
│  │ ui/contact-modal.js     ui/time-display.js                  │   │
│  │ ui/social-icons.js      ui/apply-text.js                    │   │
│  │ ui/sound-toggle.js      ui/theme-toggle.js                  │   │
│  │ audio/sound-engine.js                                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
          ▲               ▲               ▲               ▲
          │               │               │               │
    ┌─────┴─────┐   ┌─────┴─────┐   ┌─────┴─────┐   ┌─────┴─────┐
    │  app.js   │   │portfolio.js│   │   cv.js   │   │ splat.js  │
    │  (~80KB)  │   │  (~50KB)   │   │  (~20KB)  │   │  (~30KB)  │
    ├───────────┤   ├───────────┤   ├───────────┤   ├───────────┤
    │ physics/* │   │ portfolio/│   │ cv/*      │   │ 3d-sphere │
    │ modes/*   │   │ app.js    │   │ cv-scroll │   │ point     │
    │ rendering/│   │ carousel  │   │ slideshow │   │ cloud     │
    │ input/*   │   │ scroll-fx │   │ panel     │   │ variants  │
    │ ui/panel* │   │           │   │           │   │           │
    │ ui/legend*│   │           │   │           │   │           │
    └───────────┘   └───────────┘   └───────────┘   └───────────┘
```

### 4.3 Rollup Configuration Transformation

**Current Configuration** (`rollup.config.mjs`):
```javascript
// 4 separate IIFE builds
export default [
  {
    input: 'source/main.js',
    output: {
      file: 'public/js/bouncy-balls-embed.js',
      format: 'iife',
      inlineDynamicImports: true,
    }
  },
  // ... 3 more similar configs
];
```

**New Configuration**:
```javascript
export default {
  input: {
    app: 'source/main.js',
    portfolio: 'source/modules/portfolio/app.js',
    cv: 'source/modules/cv-init.js',
    splat: 'source/splat/splat.js'
  },
  output: {
    dir: 'dist/js',
    format: 'es',
    entryFileNames: '[name].js',
    chunkFileNames: '[name].js',
    sourcemap: !isProd,
    compact: isProd,
  },
  manualChunks: (id) => {
    // Shared modules go into 'shared' chunk
    if (id.includes('source/modules/core/')) return 'shared';
    if (id.includes('source/modules/visual/')) return 'shared';
    if (id.includes('source/modules/utils/')) return 'shared';
    if (id.includes('source/modules/audio/')) return 'shared';
    if (id.includes('source/modules/ui/shared-chrome')) return 'shared';
    if (id.includes('source/modules/ui/modal-overlay')) return 'shared';
    if (id.includes('source/modules/ui/cv-modal')) return 'shared';
    if (id.includes('source/modules/ui/portfolio-modal')) return 'shared';
    if (id.includes('source/modules/ui/contact-modal')) return 'shared';
    if (id.includes('source/modules/ui/time-display')) return 'shared';
    if (id.includes('source/modules/ui/social-icons')) return 'shared';
    if (id.includes('source/modules/ui/apply-text')) return 'shared';
    if (id.includes('source/modules/ui/sound-toggle')) return 'shared';
    if (id.includes('source/modules/ui/theme-toggle')) return 'shared';
    // Everything else stays in the entry chunk
    return undefined;
  },
  plugins: [
    replace({ /* same as before */ }),
    nodeResolve({ browser: true }),
    commonjs(),
    json(),
    isProd && terserPlugin(terserConfig),
  ]
};
```

### 4.4 HTML Script Loading Change

**Current** (IIFE with `defer`):
```html
<!-- ABS_BUILD_MARKER:JS_PROD -->
<script id="bravia-balls-js" src="js/bouncy-balls-embed.js?v=123" defer></script>
```

**New** (ES module):
```html
<!-- ABS_BUILD_MARKER:JS_PROD -->
<link rel="modulepreload" href="js/shared.js?v=123">
<script type="module" src="js/app.js?v=123"></script>
```

The browser will automatically:
1. Parse `app.js` and discover the `import` of `shared.js`
2. Fetch `shared.js` (aided by the `modulepreload` hint)
3. Execute in correct dependency order

### 4.5 Browser Compatibility

ES modules (`type="module"`) are supported in:
- Chrome 61+ (2017)
- Firefox 60+ (2018)
- Safari 11+ (2017)
- Edge 79+ (2020)

**Coverage**: ~97% of global users (caniuse.com)

For the <3% on legacy browsers, the page will gracefully fail with no JavaScript functionality. This is acceptable for a portfolio/creative site.

---

## 5. Detailed Implementation Plan

### 5.1 Phase 1: Rollup Configuration Rewrite

**File**: `rollup.config.mjs`

**Changes**:
1. Convert from array of 4 separate configs to single multi-entry config
2. Change `format` from `'iife'` to `'es'`
3. Change `output.file` to `output.dir` with `entryFileNames`/`chunkFileNames`
4. Add `manualChunks` function to group shared modules
5. Remove `inlineDynamicImports: true`
6. Update banner comments to generic names
7. Update output directory from `public/js/` to `dist/js/`

**Validation**:
- Run `npm run build` and verify 5 JS files are created: `shared.js`, `app.js`, `portfolio.js`, `cv.js`, `splat.js`
- Verify `shared.js` contains expected modules (inspect output or use source maps)

### 5.2 Phase 2: Build Script Updates

**File**: `build-production.js`

**Changes**:

| Line/Section | Current | New |
|--------------|---------|-----|
| CONFIG.publicDestination | `'./public'` | `'./dist'` |
| All `public/` references in comments | `public/` | `dist/` |
| CSS output name | `bouncy-balls.css` | `styles.css` |
| JS asset injection | `bouncy-balls-embed.js` | `app.js` |
| Resource hints | Font preload only | Add `modulepreload` for `shared.js` |
| HTML ID attributes | `id="bravia-balls-css"` | `id="main-css"` |
| HTML ID attributes | `id="bravia-balls-js"` | `id="main-js"` |

**New resource hints to inject**:
```html
<!-- Preload shared chunk for faster module loading -->
<link rel="modulepreload" href="js/shared.js?v=${buildStamp}">
```

**Updated script injection**:
```html
<script type="module" src="js/app.js?v=${buildStamp}"></script>
```

### 5.3 Phase 3: NPM Scripts Update

**File**: `package.json`

**Changes**:
```json
{
  "scripts": {
    "start": "python3 -m http.server 8000 --directory dist",
    // All other scripts remain unchanged (they reference public indirectly)
  }
}
```

### 5.4 Phase 4: Development Scripts Update

**File**: `scripts/dev-startup.js`

**Changes**:
| Function | Current | New |
|----------|---------|-----|
| `checkBuildOutput()` | `path.join(..., 'public', 'js', 'bouncy-balls-embed.js')` | `path.join(..., 'dist', 'js', 'app.js')` |
| `startServer()` npm run start case | `'--directory', 'public'` | `'--directory', 'dist'` |
| All console messages | References to "public/" | References to "dist/" |

**File**: `scripts/live-reload-server.js`

**Changes**:
```javascript
// Line 23
const WATCH_TARGETS = [
  path.join(ROOT, 'source'),
  path.join(ROOT, 'dist'),  // Changed from 'public'
];
```

### 5.5 Phase 5: Build Verification Script Update

**File**: `scripts/verify-build-parity.js`

**Changes**:
| Check | Current | New |
|-------|---------|-----|
| Default publicDir | `path.join(process.cwd(), 'public')` | `path.join(process.cwd(), 'dist')` |
| CSS assertion | `'id="bravia-balls-css"'` | `'id="main-css"'` |
| JS assertion | `'id="bravia-balls-js"'` | `'id="main-js"'` |
| CSS path check | `'css/bouncy-balls.css'` | `'css/styles.css'` |
| JS path check | `'js/bouncy-balls-embed.js'` | `'js/app.js'` |
| Modules dir check | `'public/modules/'` | `'dist/modules/'` |
| Console success message | `'public/ HTML'` | `'dist/ HTML'` |

### 5.6 Phase 6: Git Ignore Update

**File**: `.gitignore`

**Change**:
```diff
- # Build output
- public/
+ # Build output
+ dist/
```

### 5.7 Phase 7: HTML Template Updates

**File**: `source/index.html`

**Changes**:
1. Update CSS marker comment expectations
2. Update JS marker comment expectations
3. Ensure `type="module"` is used in dev mode too (for parity)

**Current dev block**:
```html
<!-- ABS_BUILD_MARKER:JS_DEV_START -->
<script type="module" src="main.js"></script>
<!-- ABS_BUILD_MARKER:JS_DEV_END -->
```

**No change needed** - already uses `type="module"` in dev.

**Production injection changes** (handled by build script):
- Script changes from `<script defer>` to `<script type="module">`
- Add `modulepreload` hint

**Files**: `source/portfolio.html`, `source/cv.html`, `source/splat/index.html`

Apply equivalent changes to all HTML files.

### 5.8 Phase 8: Source File Fallback Path Updates

**File**: `source/modules/utils/runtime-config.js`

**Change**:
```javascript
// Line 19
'../dist/js/config.json'  // Changed from '../public/js/config.json'
```

**File**: `source/modules/utils/text-loader.js`

**Change**:
```javascript
// Line 26
'../dist/js/contents-home.json',  // Changed from '../public/js/...'
```

**File**: `source/modules/portfolio/app.js`

**Change**:
```javascript
// Line 63
'../dist/js/contents-portfolio.json',  // Changed from '../public/js/...'
```

### 5.9 Phase 9: Documentation Updates

**Files to update**:
- `README.md`
- `AGENTS.md`
- `docs/development/DEV-WORKFLOW.md`
- `docs/reference/CONFIGURATION.md`
- `docs/reference/PORTFOLIO.md`
- `SIMULATION_VERIFICATION_REPORT.md`
- `source/config/README.md`

**Search and replace**:
| Find | Replace |
|------|---------|
| `public/` | `dist/` |
| `public/js/bouncy-balls-embed.js` | `dist/js/app.js` |
| `public/js/portfolio-bundle.js` | `dist/js/portfolio.js` |
| `public/js/cv-bundle.js` | `dist/js/cv.js` |
| `public/css/bouncy-balls.css` | `dist/css/styles.css` |
| `bouncy-balls-embed.js` | `app.js` (in context) |
| `bouncy-balls.css` | `styles.css` (in context) |

### 5.10 Phase 10: Test File Updates

**File**: `test-all-simulations.js`

**Changes**:
```javascript
// Line 122-125
const requiredFiles = [
  'dist/index.html',
  'dist/js/app.js',
  'dist/css/styles.css'
];
```

---

## 6. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Browser compatibility (ES modules) | Low | Medium | ~97% browser support; graceful degradation acceptable |
| Build breaks during transition | Medium | Low | Atomic commits; rollback capability |
| Dev/prod behavior drift | Medium | Medium | Maintain `type="module"` in both environments |
| Missed file references | Medium | Low | Global search for `public/` and `bouncy-balls` |
| Performance regression | Low | Medium | Measure before/after; `modulepreload` ensures fast loading |
| Cache invalidation issues | Low | Low | Existing `?v=timestamp` cache-busting preserved |

---

## 7. Testing Plan

### 7.1 Build Verification

1. **Clean build**: Delete `dist/`, run `npm run build`, verify directory created
2. **File count**: Verify expected files exist:
   - `dist/js/shared.js`
   - `dist/js/app.js`
   - `dist/js/portfolio.js`
   - `dist/js/cv.js`
   - `dist/js/splat.js`
   - `dist/css/styles.css`
   - `dist/css/portfolio.css`
3. **Size check**: Verify `shared.js` is largest, page bundles are smaller
4. **Parity verifier**: Run `node scripts/verify-build-parity.js`

### 7.2 Functional Testing

| Page | Test | Expected Result |
|------|------|-----------------|
| index.html | Load page | Physics simulation runs, UI visible |
| index.html | Dark mode toggle | Theme switches, colors update |
| index.html | Sound toggle | Audio plays/mutes |
| index.html | CV modal | Password gate appears, accepts code |
| index.html | Portfolio modal | Password gate appears, accepts code |
| portfolio.html | Load page | Carousel renders, wall visible |
| portfolio.html | Navigation | Carousel scrolls, items expand |
| portfolio.html | Back to home | Transitions smoothly |
| cv.html | Load page | Typography renders, slideshow works |
| cv.html | Scroll | Scroll effects apply |
| splat/index.html | Load page | 3D point cloud renders |
| splat/index.html | Interaction | Mouse drag rotates model |

### 7.3 Performance Testing

**Before (baseline)**:
- Record Lighthouse scores for each page
- Record Network tab waterfall for each page
- Note total transfer size

**After (verification)**:
- Lighthouse score should not decrease
- First Contentful Paint should not increase
- Total transfer size should decrease for multi-page sessions

### 7.4 Cross-Browser Testing

Test on:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Mobile Safari (iOS)
- Chrome Android

---

## 8. Rollback Plan

If critical issues are discovered post-deployment:

1. **Immediate**: Revert commit(s) introducing the changes
2. **Build**: Run `npm run build` (will produce old `public/` structure)
3. **Deploy**: Push reverted build

The old build configuration is preserved in git history and can be restored within minutes.

---

## 9. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Build completes without errors | 100% | CI/build script exit code |
| All pages load correctly | 100% | Manual testing checklist |
| Total unique JS reduced | ≥40% | `du -sh dist/js/*.js` sum |
| Repeat visitor transfer size | <100KB | Network tab on page 2+ |
| Lighthouse Performance score | ≥90 | Lighthouse audit |
| Zero console errors | 100% | Browser DevTools |

---

## 10. Future Enhancements (Out of Scope)

These are not included in this PRD but could be addressed in future iterations:

1. **Content hashing**: `app.[hash].js` for immutable caching
2. **Brotli compression**: Build-time `.br` files for smaller transfer
3. **CSS code-splitting**: Separate critical/non-critical CSS
4. **Service Worker**: Offline support and prefetching
5. **Dynamic imports**: Lazy-load modes/features on demand
6. **Bundle analysis**: Integrate `rollup-plugin-visualizer`

---

## 11. Appendix

### A. Complete File Change List

| File | Type | Changes |
|------|------|---------|
| `rollup.config.mjs` | Rewrite | Multi-entry, ES modules, manualChunks |
| `build-production.js` | Modify | Paths, asset names, modulepreload |
| `package.json` | Modify | NPM scripts directory |
| `scripts/dev-startup.js` | Modify | Paths, health checks |
| `scripts/live-reload-server.js` | Modify | Watch targets |
| `scripts/verify-build-parity.js` | Modify | Paths, asset names |
| `.gitignore` | Modify | Ignore pattern |
| `source/index.html` | Modify | Script loading (handled by build) |
| `source/portfolio.html` | Modify | Script loading (handled by build) |
| `source/cv.html` | Modify | Script loading (handled by build) |
| `source/splat/index.html` | Modify | Script loading (handled by build) |
| `source/modules/utils/runtime-config.js` | Modify | Fallback paths |
| `source/modules/utils/text-loader.js` | Modify | Fallback paths |
| `source/modules/portfolio/app.js` | Modify | Fallback paths |
| `README.md` | Modify | Documentation |
| `AGENTS.md` | Modify | Documentation |
| `docs/development/DEV-WORKFLOW.md` | Modify | Documentation |
| `docs/reference/CONFIGURATION.md` | Modify | Documentation |
| `docs/reference/PORTFOLIO.md` | Modify | Documentation |
| `SIMULATION_VERIFICATION_REPORT.md` | Modify | Documentation |
| `source/config/README.md` | Modify | Documentation |
| `test-all-simulations.js` | Modify | Test paths |

### B. Shared Module List

Modules that will be placed in `shared.js`:

```
source/modules/core/state.js
source/modules/core/constants.js
source/modules/visual/colors.js
source/modules/visual/dark-mode-v2.js
source/modules/visual/noise-system.js
source/modules/visual/wall-frame.js
source/modules/visual/entrance-animation.js
source/modules/utils/runtime-config.js
source/modules/utils/text-loader.js
source/modules/utils/font-loader.js
source/modules/utils/page-nav.js
source/modules/utils/tokens.js
source/modules/utils/logger.js
source/modules/utils/storage.js
source/modules/audio/sound-engine.js
source/modules/ui/shared-chrome.js
source/modules/ui/modal-overlay.js
source/modules/ui/cv-modal.js
source/modules/ui/portfolio-modal.js
source/modules/ui/contact-modal.js
source/modules/ui/time-display.js
source/modules/ui/social-icons.js
source/modules/ui/apply-text.js
source/modules/ui/sound-toggle.js
source/modules/ui/theme-toggle.js
source/modules/ui/link-cursor-hop.js
```

### C. Page-Specific Module List

**app.js** (main page only):
```
source/modules/physics/*
source/modules/modes/*
source/modules/rendering/*
source/modules/input/*
source/modules/ui/panel-dock.js
source/modules/ui/control-registry.js
source/modules/ui/controls.js
source/modules/ui/keyboard.js
source/modules/ui/legend-*.js
source/modules/ui/scene-*.js
```

**portfolio.js** (portfolio page only):
```
source/modules/portfolio/app.js (main class)
source/modules/portfolio/portfolio-config.js
source/modules/portfolio/wall-only-canvas.js
source/modules/portfolio/cylinder-background.js
source/modules/portfolio/panel/*
```

**cv.js** (CV page only):
```
source/modules/cv/cv-scroll-typography.js
source/modules/cv/cv-photo-slideshow.js
source/modules/cv/cv-panel.js
```

**splat.js** (splat page only):
```
source/splat/splat.js (includes all 3D rendering logic)
source/modules/modes/3d-sphere.js (point projection)
```

---

## 12. Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Project Owner | | | |
| Technical Lead | | | |
| QA Lead | | | |
