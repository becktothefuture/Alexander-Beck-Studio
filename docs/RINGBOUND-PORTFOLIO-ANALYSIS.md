# Ringbound Portfolio — Status Quo & Improvement Plan

**Date:** 2025-01-20  
**Scope:** Page-flip notebook experience in `source/portfolio/ringbound/`

---

## 1) System Snapshot
- **Input → Scroll Engine:** `scrollEngine.js` maps wheel/touch/keyboard to fractional page index (0.0 → 1.0 per flip) with momentum + optional spring settle (`PagePhysics`).
- **Render Pipeline:** `render.js` observers scroll state → culling → `computeTransform()` (3D lift/hinge) → shadows → ring rotations → DOM updates.
- **Transforms Math:** `pageTransforms.js` sets depth model (5px base, 4px spacing), sine-based lift, micro-offsets to avoid z-fighting.
- **Content Build:** `portfolioLoader.js` builds pages from `data/portfolio.json`, chapters, tabs, cover pages, consistent hole DOM, lazy assets via `data-src`.
- **Preloader:** `preloader.js` sequential chapter queue, 50% byte target to reveal, background loading, IO for lazy-load + video playback control.
- **Performance Layer:** `performance.js` FPS/memory monitor + adaptive quality scale; `render` uses `perf` start/end; aggressive page/content culling.
- **Zoom/Parallax:** `zoomManager.js` applies CSS vars for zoom; `mouseParallax.js` sets `--mouse-rotate-x/y`; (Bug fixed now: transforms combined in `.notebook`).

---

## 2) Strengths
- Strong separation of concerns (input ↔ render ↔ content build).
- Deterministic depth model, z-fighting protection, GPU-friendly `translateZ`.
- Smart preloader with chapter ordering and video pause/resume via IO.
- Adaptive performance scaling and visibility culling.
- Config-driven (JSON + GLOBAL_CONFIG) with extensive runtime hooks (`window.notebook.*`).

---

## 3) Weaknesses / Risks (Current State)
**Performance**
- Transform strings allocated every frame for every page; style writes interleaved with reads → layout thrash risk.
- Ring rotations throttled every other frame (possible stutter).
- Shadow math uses `Math.pow` per page/frame; could table/cache.
- Sequential asset loading underutilizes bandwidth; video blobs never revoked.
- Aggressive culling (maxVisiblePages=12) can cause “popping” on fast scroll.

**Memory**
- Video blobs kept in memory; image/video URLs not released on unload.
- Cached shadow data never cleared; observer arrays recreated per notify.

**Code Quality**
- Duplicate event listener APIs in scroll engine; unused helpers (`createFlipAnimation`, `incrementLandingZ`, wheelAccumulator).
- Mixed transition declarations (transform) previously overriding; fixed for `.notebook`, but may exist elsewhere.

**UX / Edge Cases**
- Infinite-loop normalization only in some paths; zoom-pause can drop final observer notify.
- Tab pages rely on DOM queries per frame; if missing, could be culled incorrectly.
- Preloader counts failed assets as “loaded” (progress may over-report).

---

## 4) Potential Bugs
- **Transform override (fixed):** `.notebook` had double `transform`; parallax rotation lost. Now combined: `scale(...) rotateX(...) rotateY(...)`.
- **Blob leak:** `preloader.js` creates `URL.createObjectURL` for videos, never revoked.
- **Dead zone / NaN risk:** `pendingTargetPage` could be NaN if scrollPosition invalid; infinite-loop not applied in direct-force path.
- **Shadow cache growth:** dataset caches never cleared for far pages.

---

## 5) Optimization Roadmap (Path to Excellence)
### Phase 1 – FPS & GC (highest impact)
1) **Transform pooling + batched writes** in `render.js` (precompute transforms array, single write pass; reuse strings via small cache).
2) **Shadow lookup table** for exponential curve (0–180°) to replace `Math.pow` in `updatePageShadow`.
3) **Ring updates** every frame with timestamp-based throttle instead of every 2nd frame.
4) **Parallel preloading** (5-at-a-time within chapter) + keep byte-based progress target.
5) **Blob lifecycle**: track video blob URLs, revoke on unload; prefer direct src where possible.

### Phase 2 – Memory & UX
6) Increase visible buffer (e.g., maxVisiblePages 15–20, tuned) to reduce popping; keep fade zone.
7) Unify page/content visibility; avoid duplicate queries; clear shadow cache on hide.
8) Normalize scroll in all paths (direct force + momentum); ensure observer notified when zoom pauses input.

### Phase 3 – Cleanup & Resilience
9) Remove unused helpers; dedupe scroll event init; tighten config typing.
10) Add error boundaries for asset load failures; retry/backoff for critical assets.
11) Expose performance controls (toggle auto quality scaling; dev panel hooks).

---

## 6) Next Steps (Concrete Tasks)
- Implement Phase 1 items 1–5 above.
- Add blob cleanup + parallel preload toggles behind a small feature flag for safe rollout.
- After Phase 1, measure FPS (target 60fps with 100+ pages) and memory (<120MB with videos).

---

## 7) Notes on CSS-Only Scroll Idea
- Pure CSS scroll-snapping + scroll-timeline (view-timeline) could drive per-page transforms, but:
  - Limited browser support (Chrome 115+, Safari TP; Firefox in progress).
  - 3D stacking order and depth interpolation per page still need JS or heavy CSS variables per element.
  - Our depth model (unread vs read stack) and ring sync are stateful; hard to express in pure CSS.
- Feasible hybrid: use native `scroll-snap` for paging, drive custom properties via JS for depth/stack/rings as fallback; revisit after Phase 1 performance wins.

