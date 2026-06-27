# Configuration Reference

**Primary (React app) source of truth:** `react-app/app/public/config/default-config.json`

This document describes the configuration keys loaded at runtime. The React app serves config from `react-app/app/public/config/`.

**Visual spec for shell buttons and on-page UI harmony:** [`SITE-STYLEGUIDE.md`](SITE-STYLEGUIDE.md).

**Typography:** UI sans is **DM Sans** and UI monospace is **DM Mono** (Google Fonts), linked from the HTML shells (`index.html`, `portfolio.html`, `cv.html`, `styleguide.html`). Tokens: `--abs-font-sans` and `--abs-font-mono` in [`react-app/app/public/css/tokens.css`](../../react-app/app/public/css/tokens.css); default UI tracking is **`--abs-letter-spacing-global`** (`-0.07ch` on `body` — site-wide scale ~40% tighter than the previous `-0.05ch`; mono / some controls reset to `normal` where needed). The home hero wordmark uses **`--hero-title-letter-spacing`** (`-0.027ch`) and is **not** tied to that global bump. Figma export mirrors font families in `react-app/app/public/config/figma-tokens.json` (`abs-font-sans`, `abs-font-mono`). **Long-form UI copy** (decorative script, quote card, CV sections, gate modals, portfolio sheet body) uses **`widows` / `orphans`** and, where supported, **`text-wrap: pretty`**; portfolio hero and gate **`modal-title`** use **`text-wrap: balance`** — see grouped rules in [`react-app/app/public/css/main.css`](../../react-app/app/public/css/main.css) after `.decorative-script p a::after`.

---

## Portfolio Page Configuration (Separate Runtime)

The portfolio route now uses a dedicated **vertical project rail** runtime instead of the archived slider/carousel and legacy project-pit surface.

- **Authored source**: `react-app/app/public/config/design-system.json -> portfolio`
- **Generated compatibility file**: `react-app/app/public/config/portfolio-config.json`
- **Project content**: `react-app/app/public/config/contents-portfolio.json`
- **Loader/normalizer**: `react-app/app/src/legacy/modules/portfolio/portfolio-config.js`
- **Stylesheet**: `react-app/app/public/css/portfolio.css` is linked from **`index.html`** and **`portfolio.html`**. Deck, detail surface, and portfolio chrome rules use **`body.portfolio-page`**.

Portfolio config applies to the portfolio **infinite deck** and the **wall-contained project detail surface**. `runtime.motion.openDurationMs` drives detail slide in/out; `colorFloodHoldMs` is unused in this layout but remains in generated JSON for compatibility. The project dialog (`#portfolioProjectView`) is inserted by `portfolio/app.js` **`createProjectView()`** into **`#portfolio-sheet-host`**. **Stacking (non-negotiable):** the host is a **sibling of `.fade-content` inside `#abs-scene`**, **after** `.fade-content` in the DOM (`StudioShell.jsx`), with **`z-index: 220`** and **`z-index: 260`** when `body.portfolio-project-open` — **above** route header/footer (**200**) and above **`#quote-viewport-host` (250)** when open. **Do not** mount the host only inside **`#simulations`** (that cannot stack above chrome). Authoritative table: **`docs/reference/LAYER-STACKING.md`**. The host uses the **same fixed inset** as the inner canvas and **`border-radius: var(--frame-inner-radius)`** + **`overflow: hidden`**; inherits **`corner-shape`** like **`#c`**. **`.portfolio-project-view__drawer`** has no duplicate frame border. **`--portfolio-drawer-radius`** is **`--frame-inner-radius`** for hero inset math. Close uses an **inline SVG**. The deck lives in `#portfolioProjectMount`. Without the host, the dialog falls back to the mount. **`.portfolio-project-view__scroll`**: **`overflow-y: auto`**, **`line-height: var(--line-height-body)`**, hidden scrollbars. Hero uses **`--portfolio-hero-image-gutter`** and **`--portfolio-hero-image-radius`**. Hero height: **`100cqh`** / `min(100dvh, 100svh)` fallback.

- **Legacy `bodies.*` config**: retained for compatibility with the archived physics implementation; the live route uses DOM cards.
- **Pebble render language:** [`PEBBLE-BODIES.md`](PEBBLE-BODIES.md) documents the archived portfolio physics direction. The live portfolio route should not expose project balls.

**Legacy simulation notes (2025-03, pebble pass):** Portfolio body physics remains in `react-app/app/src/legacy/modules/portfolio/pit-mode.js` for archive/compatibility paths, but the live portfolio route now hides the canvas and uses DOM scroll cards. The canvas logo draw path is still skipped on the portfolio route so home hero artwork cannot leak after SPA navigation. On SPA route changes, React remounts `#c`; `setupRenderer()` clears the renderer’s cached previous backing-store dimensions when the canvas **node** changes so `resize()` cannot treat a fresh default 300×150 buffer as already matching the last route’s layout.

**Project card colors:** Live deck cards use `getPortfolioProjectPaletteColor()` and expose the result as `--portfolio-card-*` variables on each card. The helper reads the global `colorDistribution` first, preserving configured order and deduping resolved colors, then appends remaining unique palette slots before generated fallbacks. Closed deck card ink is not content-authored; it is computed from contrast against the card background and written to `--portfolio-card-ink`. `getPortfolioProjectPaletteColor` also remains a fallback for legacy/archived physics paths.

**Quote puck:** `runtime.quotePuckEnabled` (boolean, default `false`) controls whether the draggable quote roundel mounts on the home route; the dev panel exposes it under **Puck → Puck → Quote Puck**. When enabled, `initQuoteDisplay` + `initQuotePuck` create the home-only puck. Portfolio bootstrap calls `destroyQuoteDisplay()` so the same DOM host does not keep a home quote when using the SPA shell. **`#quote-display`** wraps **`.quote-display__disk`** (round fill + shadow, hover scale) and **`.quote-display__content`** (text); diameter is **`0.75 × --abs-quote-button-size`**. **`initQuotePuck`** drives **`left`/`top`** plus air-hockey motion (flick, wall bounce, friction). Spin is **`--quote-tilt`** on **`.quote-display__content`** only. **No** hover recolour on the puck (glass stays constant). **No** typewriter press scaling on the puck. With global squircle, **`#quote-display`** / **`.quote-display__disk`** are listed in **`tokens.css`** as **`corner-shape: round`** so the puck stays circular.

**Legacy collision notes:** Archived pit paths set `ballSpacing` to **0** and `wallInset` to **0** on load, then reset `ballBallSurfaceGapPx` / `collisionPairSlopPx` on destroy so the index pit keeps ratio-only `ballSpacing` from config. The live deck does not depend on these physics values.

### Portfolio `cssVars`

These control the page-level presentation around the pit and the opened hero:

`--portfolio-nav-top` is **extra** padding below the base top inset (`var(--gap-xs)`), on top of safe-area already applied by `.fade-content`. Default `0px` aligns the route header with the home legend row.

```json
{
  "cssVars": {
    "--portfolio-nav-top": "0px",
    "--portfolio-stage-pad": "24px",
    "--portfolio-hero-title-max": "14ch",
    "--portfolio-image-veil-opacity": "0.14",
    "--portfolio-scroll-hint-offset": "52px"
  }
}
```

### Portfolio `runtime`

The portfolio runtime is grouped by behavior rather than slider mechanics:

```json
{
  "runtime": {
    "layout": {
      "spawnInsetViewport": 0.1,
      "spawnBandWidthRatio": 0.78,
      "spawnHeightViewport": 0.62,
      "bodyCountPolicy": "one-per-project",
      "headerTopSpacing": 24
    },
    "bodies": {
      "minDiameterViewport": 0.14,
      "maxDiameterViewport": 0.22,
      "diameterScale": 1,
      "wallPaddingViewport": 0.05
    },
    "labeling": {
      "fontDesktopPx": 28,
      "fontMobilePx": 20,
      "lineHeight": 0.94,
      "innerPaddingRatio": 0.18
    },
    "motion": {
      "gravityScale": 0.52,
      "neighborImpulse": 0,
      "dragThrowMultiplier": 1.05,
      "openDurationMs": 420,
      "colorFloodHoldMs": 120,
      "imageFadeMs": 220,
      "titleRevealDelayMs": 480
    },
    "behavior": {
      "passiveMouseReaction": false,
      "reducedMotionDurationMs": 320
    }
  }
}
```

**`runtime.bodies.minDiameterViewport` / `maxDiameterViewport`:** Diameter fractions multiply **`Math.sqrt(innerWidth × innerHeight)`** of the **inner wall** (canvas buffer minus `frameBorderWidth`/`wallThickness` inset), then `diameterScale`, then a fixed **diameter boost** (`PORTFOLIO_BODY_DIAMETER_BOOST` in `pit-mode.js`, currently **~1.6×**), and are **clamped** so bodies stay inside the pit. This tracks the same “playable area” as wall collision (`Ball.js` interior SDF), so relative size stays consistent across mobile and desktop aspect ratios (the old `min(canvas)` × mobile-only shrink is removed).

Portfolio content still comes from `react-app/app/public/config/contents-portfolio.json` and resolves against `react-app/app/public/images/portfolio/`.

---

## Configuration System (How It Loads)

At startup the app attempts to fetch (in order):
- `config/default-config.json`
- `js/config.json`
- `../dist/js/config.json`

If nothing loads, it falls back to a small in-code default.

---

## Persistence (Privacy-first)

### Simulation settings persistence

Simulation settings persistence is **disabled by default**.

To enable it, set `LOCALSTORAGE_ENABLED = true` in `react-app/app/src/legacy/modules/utils/storage.js` and rebuild.

### Panel UI state persistence

Panel position / dock visibility / collapsed state is persisted (best-effort) via `panel-dock.js` localStorage keys.

**Dev config panel (single dock):** One implementation in `panel-dock.js` + `control-registry.js` on every route that mounts it (home, portfolio, CV). Default is the **full** master panel (all groups + **`includeRegisteredSections: true`**). Home prepends the mode switcher; portfolio prepends pit chrome; all routes prepend the **active mode** accordion so Ball Pit / etc. sliders are visible. `DevConfigPanelBridge` only registers **`/`** in the React shell — it is not a second panel. Home: **`createPanelDock` after `setMode`**. CV: **`initCvPanel` before `initializeDarkMode`** (theme segment binds). **Styleguide** has no dock.

### Wall layer visualization (Light Group)

The dev panel has a top-level **Light Group** master section (peer to Studio / Shell) with **Outer Wall** and **Inner Wall** accordions (border, shine, shadows, glow). Runtime values are stamped into CSS variables by `applyLayoutCSSVars()` in `state.js`: `#simulations` has **no outward cast shadow**; inward depth uses `.frame-vignette` inset shadows, and **`.inner-wall-gradient-edge`** paints a **light rim** on the bottom and sides plus a **shadow rim** on the top (`innerWallGradientEdgeTopShadowOpacity` → `--inner-wall-gradient-edge-top-shadow-opacity`, independent of the light-rim master). **`--ui-chrome-rim-*`** links footer / nav / icon button hover rims (`--ui-chrome-button-edge`) to the inner-wall top light / bottom shadow strengths. The frame border uses a **180°** linear gradient on the border ring: **edge** and **mid** opacities stay ~**1:2** so the **mid** stop still “peeks” on the **left/right** vertical rails (and top/bottom). Defaults are tuned **subtle**; Studio surface maps `sceneHighlight` to frame opacities with factors **0.029** / **0.058** (same ~1:2 ratio). The optional isometric “Wall stack” helper in `control-registry.js` mirrors z-order when present.

---

## Complete JSON Structure (Current)

```json
{
  "gravityMultiplier": 1.1,
  "restitution": 0.69,
  "friction": 0.006,
  "ballMass": 129,
  "ballSpacing": 2.5,
  "maxBalls": 300,
  "repelRadius": 120,
  "repelPower": 274000,
  "cursorInfluenceRadiusVw": 14,
  "cursorSize": 1.0,
  "cursorColorMode": "auto",
  "cursorColorIndex": 5,
  "cursorColorLumaMax": 0.62,
  "cursorColorAllowIndices": [],
  "cursorColorDenyIndices": [],
  "mouseTrailEnabled": true,
  "mouseTrailLength": 18,
  "mouseTrailSize": 1.3,
  "mouseTrailFadeMs": 220,
  "mouseTrailOpacity": 0.35,
  "layoutViewportWidthPx": 0,
  "containerBorderVw": 1.11,
  "simulationPaddingVw": 0,
  "contentPaddingVw": 2.36,
  "layoutMinContentPaddingPx": 16,
  "containerInnerShadowOpacity": 0.12,
  "containerInnerShadowBlur": 80,
  "containerInnerShadowSpread": -10,
  "containerInnerShadowOffsetY": 0,
  "noiseEnabled": true,
  "noiseOpacityLight": 0.15,
  "noiseOpacityDark": 0.48,
  "noiseSize": 175,
  "noiseStructureStrength": 0.3,
  "noiseStructureScale": 0.38,
  "noiseMotion": "jitter",
  "wallThicknessVw": 0.83,
  "wallRadiusVw": 2.92,
  "layoutMinWallRadiusPx": 28,
  "wallInset": 3,
  "frameColor": "#0a0a0a",
  "wallWobbleMaxDeform": 80,
  "wallWobbleStiffness": 2500,
  "wallWobbleDamping": 65,
  "wallWobbleSigma": 4.0,
  "wallWobbleCornerClamp": 1.0,

  // Scene (mode change micro-interaction)
  "sceneImpactEnabled": true,
  "sceneImpactMul": 0.008,
  "sceneImpactAnticipation": 0.0,
  "sceneImpactPressMs": 75,
  "sceneImpactReleaseMs": 220,

  // Critters (Simulation 11)
  "critterCount": 90,
  "critterSpeed": 680,
  "critterMaxSpeed": 1400,
  "critterStepHz": 5,
  "critterStepSharpness": 2.4,
  "critterTurnNoise": 2.2,
  "critterTurnDamp": 10,
  "critterTurnSeek": 10,
  "critterAvoidRadius": 90,
  "critterAvoidForce": 9500,
  "critterEdgeAvoid": 1,
  "critterMousePull": 1,
  "critterMouseRadiusVw": 30,
  "critterRestitution": 0.18,
  "critterFriction": 0.018
}
```

---

## Parameters by Category

## Physics (Global)

### Collision Solver (Ball-on-ball)

- **`physicsCollisionIterations`** (number, 3..20)
  - **Meaning**: Ball–ball collision solver iterations for physics-based modes.
  - **Lower** = faster but looser stacks; **higher** = tighter stacks but more CPU.

- **`physicsSkipSleepingCollisions`** (boolean)
  - **Meaning**: When **both** balls in a pair are sleeping, keep **positional correction** but skip all non-essential collision work (impulses/sound/squash).
  - **Why**: Reduces CPU while preserving “no overlap drift”.

### Global Sleep (Non-Pit physics modes)

These keys complement the **Pit-only** sleep keys (`sleepVelocityThreshold`, `sleepAngularThreshold`, `timeToSleep`).  
Pit modes still use the Pit keys; other physics modes can use the global keys to reduce idle work.

- **`physicsSleepThreshold`** (number, px/s)
  - **Meaning**: Linear speed threshold below which a ball can start sleeping in **non-Pit** physics modes.
  - **Notes**: DPR-scaled internally. Set to `0` to effectively disable.

- **`physicsSleepTime`** (number, seconds)
  - **Meaning**: Time a ball must remain below `physicsSleepThreshold` before sleeping in **non-Pit** modes.

- **`physicsSkipSleepingSteps`** (boolean)
  - **Meaning**: If enabled, sleeping balls skip `Ball.step()` work until woken (e.g. cursor proximity / impacts).

### Spatial Grid / Pair Collection

- **`physicsSpatialGridOptimization`** (boolean)
  - **Meaning**: Reuse spatial grid buckets + collision pair buffers to reduce allocations / GC during collision detection.

## Balls (Global)

### Color Distribution (Global)

Controls **which palette colors are used** for new balls across **all modes**, and **how frequently** they appear.

- **`colorDistribution`** (array of 6 objects)
  - **Meaning**: Maps each discipline label to exactly one palette slot (`colorIndex`) and a weight (`weight`).
  - **Schema**:

```json
{
  "colorDistribution": [
    { "label": "Product Systems", "colorIndex": 0, "weight": 44 },
    { "label": "Experience Strategy", "colorIndex": 3, "weight": 14 },
    { "label": "Art Direction", "colorIndex": 2, "weight": 17 },
    { "label": "Generative R&D", "colorIndex": 6, "weight": 11 },
    { "label": "Creative Engineering", "colorIndex": 7, "weight": 7 },
    { "label": "Parametric Systems", "colorIndex": 5, "weight": 7 }
  ]
}
```

  - **`label`** (string): The discipline text used in the legend.
  - **`colorIndex`** (integer, 0–7): Palette slot index. This maps to CSS variables `--ball-1` .. `--ball-8` via \(index + 1\).
  - **`weight`** (integer, 0–100): Relative weight for spawning. The panel enforces the weights sum to **100**.
  - **Uniqueness**: The panel enforces each label uses a **unique** `colorIndex`, so 6 labels will select 6 distinct palette slots (two of the 8 palette colors may remain unused).
  - **Representation**: Mode resets seed one pass through all positive-weight labels before weighted random spawning, so the full legend stays visible even in smaller simulations.
  - **Portfolio deck**: Closed project cards consume this distribution in order before any fallback colors. With the current 6 projects, this means each project gets one unique distribution color and no card background repeats.

### Sleep / Settling (Ball Pit modes)

These keys tune the **sleep** behavior used to stop micro-jiggle when balls are fully at rest (billiard-ball feel).  
They are only applied in **Ball Pit** (`pit`).

- **`sleepVelocityThreshold`** (number, px/s)
  - **Meaning**: Linear speed below which a grounded ball can begin sleeping.
  - **Higher** = settles sooner (less idle motion).

- **`sleepAngularThreshold`** (number, rad/s)
  - **Meaning**: Angular speed below which a grounded ball can begin sleeping.
  - **Higher** = stops spinning sooner.

- **`timeToSleep`** (number, seconds)
  - **Meaning**: Time a grounded ball must remain below both thresholds before sleeping.
  - **Lower** = sleeps faster.

---

## Effects

### Ghost Layer (Motion Trails)

These keys control the **ghost trail** effect implemented in `source/modules/physics/engine.js` (it replaces the hard `clearRect` with a fade-to-transparent pass when enabled, so DOM elements behind the canvas remain visible).

- **`ghostLayerEnabled`** (boolean)
  - **Meaning**: Enables/disables ghost trails.
  - **Default**: `false`

- **`ghostLayerOpacity`** (number, 0.05..1.0)
  - **Meaning**: Fade amount per frame when ghost trails are enabled.
  - **Important**: **Higher = shorter trails** (more clearing each frame).
  - **Default**: `0.70`
  - **Panel range**: 0.05 → 1.0 (step 0.01)

- **`ghostLayerUsePerThemeOpacity`** (boolean)
  - **Meaning**: If true, use `ghostLayerOpacityLight` / `ghostLayerOpacityDark` instead of `ghostLayerOpacity`.
  - **Default**: `false`

- **`ghostLayerOpacityLight`** (number, 0.05..1.0)
  - **Meaning**: Fade amount per frame in **Light mode** when `ghostLayerUsePerThemeOpacity` is enabled.
  - **Default**: `0.70`
  - **Panel range**: 0.05 → 1.0 (step 0.01)

- **`ghostLayerOpacityDark`** (number, 0.05..1.0)
  - **Meaning**: Fade amount per frame in **Dark mode** when `ghostLayerUsePerThemeOpacity` is enabled.
  - **Default**: `0.70`
  - **Panel range**: 0.05 → 1.0 (step 0.01)

### `sizeVariationGlobalMul` (number, 0..2)
- **Meaning**: Global multiplier applied on top of each simulation’s **Size Variation** slider.  
  - `1.0` = neutral (no influence)  
  - `0.0` = forces **no variation** everywhere  
  - `2.0` = doubles all per-mode variation amounts
- **Applied to**: `state.sizeVariationGlobalMul` (used by per-mode sizing helper)
- **Notes**:
  - Each simulation has its own slider (`sizeVariation*`) in the range `0..1`.
  - There is an internal cap (`state.sizeVariationCap`, currently `0.2`) that defines what “1.0 variation” means in absolute size terms.

### Pebble Silhouette (render-only, phase 1)

These keys shape the shared pebble visual language used by the ball system. They are persisted in `design-system.json` and surfaced in the `Balls` panel, but phase 1 keeps collisions circular.

- **`pebbleBlend`** (number, 0..1)
  - **Meaning**: Circle-to-pebble amount.

- **`pebbleStretch`** (number, 0..1)
  - **Meaning**: Long-axis pressure for slightly oval or squeezed forms.

- **`pebbleOrganic`** (number, 0..1)
  - **Meaning**: Asymmetry and contour drift.

- **`pebbleBulge`** (number, 0..1)
  - **Meaning**: Fullness versus pinch, which controls how thick or soft the body feels.

---

## Balls (Per Simulation)

These keys are all **0..1**:

- `sizeVariationPit`
- `sizeVariationFlies`
- `sizeVariationWeightless`
- `sizeVariationWater`
- `sizeVariationMagnetic`
- `sizeVariationBubbles`
- `sizeVariationKaleidoscope`
- `sizeVariationCritters`
- `sizeVariationParallaxLinear`
- `sizeVariationParallaxFloat`

- **Meaning**: Per-simulation size variance. `0` => no variation (all balls use the medium radius); `1` => maximum variation (as defined by the internal cap), scaled by `sizeVariationGlobalMul`.

---

### `gravityMultiplier` (number)
- **Meaning**: Ball Pit gravity multiplier (applied to base gravity \(G_E = 1960\)).
- **Applied to**: `state.gravityMultiplierPit`

---

### `restitution` (number)
- **Meaning**: Coefficient of restitution (energy retained on impact).
- **Applied to**: `state.REST`

### `friction` (number)
- **Meaning**: Drag amount used in velocity damping.
- **Applied to**: `state.FRICTION`

### `ballMass` (number)
- **Meaning**: Relative mass scalar used for drag scaling and collision feel (not real-world kg).
- **Applied to**: `state.ballMassKg` (historical variable name)

### `ballScale` / `sizeScale` (number)
- **Meaning**: Global size multiplier for balls.
- **Applied to**: `state.sizeScale`
- **Notes**: Both keys are accepted for compatibility. `ballScale` is the canonical name.

### `sizeVariation` (number)
- **Meaning**: Ball size variation amount (currently used by legacy ball init logic).
- **Applied to**: `state.sizeVariation`

### `ballSpacing` (number, px)
- **Meaning**: Extra collision padding between balls.
- **Applied to**: `state.ballSpacing`

### `maxBalls` (number)
- **Meaning**: Safety cap for total balls (performance guardrail).
- **Applied to**: `state.maxBalls`

---

## Cursor Repeller (Interaction)

### `repelRadius` (number, px)
- **Meaning**: Repeller radius around the cursor.
- **Applied to**: `state.repelRadius`

### `repelPower` (number)
- **Meaning**: Repeller force strength.
- **Applied to**: `state.repelPower`

### `repelSoft` / `repelSoftness` (number)
- **Meaning**: Softness falloff for repeller field.
- **Applied to**: `state.repelSoft`
- **Notes**: Both keys are accepted for compatibility. `repelSoft` is the canonical name.

---

## Gate modals (CSS motion)

- **`--ease-gate-motion`** in `tokens.css` aliases **`--ease-settle`**. Invite gate panels use it for **opacity**; `#modal-blur-layer` for **backdrop-filter** / **background**; `#abs-scene` depth for **transform** — so motion does not inherit **`--ease-magnetic`** overshoot. **`--ease-gate`** remains **`--ease-magnetic`** for other UI that should keep the magnetic feel.
- **Invite gates (`.cv-modal` / `.portfolio-modal` / `.contact-modal`)** are centered with **`inset: 0` + `margin: auto`**. The panel does **not** animate **`transform: scale()`**: when browsers composite **scaled text**, it is often drawn as a **texture**; when the scale settles to **1**, glyphs are re-rasterized and can **snap** (widely reported for WebKit/Blink with `scale` + text). Gate **motion** is **opacity** (plus the shared **backdrop blur** on `#modal-blur-layer`). **`.modal-label`** also uses **opacity only** (no **`translateY`**) on the title/description stack.

---

## Cursor (Visual)

**Behaviour spec (simulation dot vs modal ring, SPA rules):** [`CUSTOM-CURSOR.md`](CUSTOM-CURSOR.md).

These keys control the cursor’s **visual system** (dot + canvas trail) and its palette-driven cursor color.

### `cursorSize` (number)
- **Meaning**: Cursor size multiplier relative to average ball size.
- **Applied to**: `state.cursorSize`

### `cursorInfluenceRadiusVw` (number, vw)
- **Meaning**: Universal cursor interaction zone radius (scales with viewport width).
- **Applied to**: `state.cursorInfluenceRadiusVw` (derived into px for mode-specific forces)

### `cursorColorMode` (`\"auto\" | \"manual\"`)
- **Meaning**: Whether the cursor color auto-cycles or stays fixed.
- **Applied to**: `state.cursorColorMode`
- **Behavior**:
  - `auto`: picks a new **contrasty** ball color on **startup**, **mode switch**, and **reset**.
  - `manual`: locks to `cursorColorIndex`.

### `cursorColorIndex` (number, 0..7)
- **Meaning**: Palette index used for cursor color selection (dot + trail).
- **Applied to**: `state.cursorColorIndex`

### `cursorColorLumaMax` (number, 0..1)
- **Meaning**: Maximum allowed relative luminance for cursor candidates.
- **Notes**: Lower values exclude light colors (e.g., whites / light greys) to keep the cursor high-contrast.

### `cursorColorAllowIndices` / `cursorColorDenyIndices` (array of 0..7)
- **Meaning**: Optional allow/deny overrides for cursor candidate indices.
- **Notes**: If `cursorColorAllowIndices` is non-empty, auto-pick will only choose from that subset.

### Mouse trail
- `mouseTrailEnabled` (boolean)
- `mouseTrailLength` (number)
- `mouseTrailSize` (number)
- `mouseTrailFadeMs` (number)
- `mouseTrailOpacity` (number)

---

## Scene (Mode Change Micro‑Interaction)

These keys tune the **scene-wide** reaction that triggers **only** when the simulation/mode changes (event: `bb:modeChanged`).  
Implementation: `source/modules/ui/scene-impact-react.js` drives CSS vars on `#abs-scene` so **all layers move together** via a single GPU transform.

### `sceneImpactEnabled` (boolean)
- **Meaning**: Enables/disables the scene click-in micro reaction.

### `sceneImpactMul` (number, unitless)
- **Meaning**: How deep the scene “clicks in” (scale-down strength per pulse).
- **Applied to**: CSS var `--abs-scene-impact-mul` (stamped on `#abs-scene`)

### `sceneImpactAnticipation` (number, 0..~0.6)
- **Meaning**: Micro pre-pop in the opposite direction before click-in (0 disables).

### `sceneImpactPressMs` (number, ms)
- **Meaning**: Press-in duration.

### `sceneImpactReleaseMs` (number, ms)
- **Meaning**: Release duration (“bounce out” length).

---

## Scene Change Sound (SFX)

These keys add a soft, non-intrusive “pebble-like” tick on simulation changes (event: `bb:modeChanged`).  
Implementation: `source/modules/ui/scene-change-sfx.js` uses the existing collision synth so it only plays when sound is enabled/unlocked.

### `sceneChangeSoundEnabled` (boolean)
- **Meaning**: Enables/disables the scene-change sound.

### `sceneChangeSoundIntensity` (number, 0..1)
- **Meaning**: Loudness/brightness of the tick.

### `sceneChangeSoundRadius` (number)
- **Meaning**: Pitch proxy (mapped like “ball size”). Higher values tend to sound lower.

---

## Critters (Simulation 11)

These keys control the ball-only Critters simulation (mode `critters`).

- `critterCount` (number): initial critter count (re-init on change)
- `critterSpeed` (number): forward thrust scale
- `critterMaxSpeed` (number): velocity clamp
- `critterStepHz` (number): step cadence (higher = faster feet)
- `critterStepSharpness` (number): step “staccato” amount (higher = more stop/start)
- `critterTurnNoise` (number): wander amount
- `critterTurnDamp` (number): turning inertia damping
- `critterTurnSeek` (number): steering strength toward desired heading
- `critterAvoidRadius` (number px): local separation radius
- `critterAvoidForce` (number): local separation push strength
- `critterEdgeAvoid` (number): strength of soft edge repulsion (reduces edge clumping)
- `critterMousePull` (number): flee strength within mouse zone
- `critterMouseRadiusVw` (number vw): mouse zone radius (viewport width units)
- `critterRestitution` (number 0..1): Critters-only collision bounciness override
- `critterFriction` (number): Critters-only drag override

---

## 3D Sphere (Mode 16)

These keys control the 3D Sphere simulation (mode `3d-sphere`). Rotating sphere point cloud, camera-locked like 3D Cube.

- `sphere3dRadiusVw` (number, vmin): sphere radius (percent of shorter side → px) — default: 18
- `sphere3dDensity` (number): number of surface points (re-init on change) — default: 140
- `sphere3dFocalLength` (number, px): perspective focal length — default: 600
- `sphere3dDotSizeMul` (number): dot size multiplier — default: 1.5
- `sphere3dIdleSpeed` (number, rad/s): idle rotation speed — default: 0.15
- `sphere3dTumbleSpeed` (number): spin sensitivity when mouse moves over sphere — default: 0.65
- `sphere3dMouseDamping` (number): mouse-follow smoothing factor; lower values feel heavier/smoother — default: 0.08
- `sphere3dTumbleDamping` (number): decay factor for spin impulse — default: 0.9
- `sphere3dWarmupFrames` (number): physics warmup frames on mode init — default: 10

Notes:
- Uses a Fibonacci sphere distribution (surface-only).
- Ball-to-ball collisions are disabled; sphere is camera-locked (no movement, only rotation).
- No physics: sphere spins when mouse moves over it (like pushing a globe with your finger).
- Mouse movement over the sphere surface creates rotation; movement away from sphere has no effect.
- Rotational damping prevents endless spinning; idle rotation provides gentle drift.
- Heavy gravity (1400 px/s²) and low restitution (0.35) for weighted, squishy feel.
- Very high squash max (0.75) with slow decay (3.5/s) for soft, organic deformation.

---

## 3D Cube (Mode 17)

These keys control the 3D Cube simulation (mode `3d-cube`):

- `cube3dSizeVw` (number, vw): cube edge length (vw → px at init)
- `cube3dEdgeDensity` (number): points per edge (re-init on change)
- `cube3dFaceGrid` (number): face subdivision count (0 = edges only)
- `cube3dIdleSpeed` (number, rad/s): idle rotation speed
- `cube3dCursorInfluence` (number): cursor-to-rotation sensitivity
- `cube3dTumbleSpeed` (number): impulse added from mouse movement
- `cube3dTumbleDamping` (number): decay factor for tumble impulse
- `cube3dFocalLength` (number, px): perspective focal length - default: 1200
- `cube3dDotSizeMul` (number): dot size multiplier
- `cube3dFogStart` (number, 0..1): normalized depth where rear fog begins - default: 0.95
- `cube3dFogMin` (number, 0..1): minimum opacity for the furthest dots - default: 0.58
- `cube3dWarmupFrames` (number): physics warmup frames on mode init

Notes:
- Points stay camera-centered; ball-to-ball collisions are disabled.
- Cursor offset changes yaw/pitch; mouse movement adds a tumble impulse.
- Dots further into the scene use a bounded opacity fog; they should fade slightly, not disappear.

---

## Layout (Frame & Content)

Two-level padding system:
- **Outer**: `containerBorderVw` insets the whole simulation container from the viewport (vw-native).
- **Inner**: `simulationPaddingVw` insets the canvas inside the container (vw-native).

All vw-native layout keys are converted to **derived px** at runtime and applied to CSS vars. This keeps the simulation/physics hot-paths px-based (no per-frame conversion), while allowing layout to scale with viewport width.

### `layoutViewportWidthPx` (number, px)
- **Meaning**: Optional “virtual viewport width” used for vw→px conversion.
- **Default**: `0` (auto: uses `window.innerWidth`)
- **Used for**: tuning vw-based layout without resizing the browser window.

### `containerBorderVw` (number, vw)
- **Applied to**: CSS var `--container-border` (derived px)

### `simulationPaddingVw` (number, vw)
- **Applied to**: CSS var `--simulation-padding` (derived px)

### `contentPaddingVw` (number, vw)
- **Meaning**: Padding for fixed content elements inside the frame (legend/statement blocks).
- **Applied to**: CSS var `--content-padding` (derived px)

**Home expertise legend (CSS, not JSON):** The legend uses **content-sized grid columns** (`repeat(3, auto)` / `repeat(2, auto)` at mid widths), not equal `1fr` columns. Equal-width columns left large empty space beside short labels, which looked like oversized gutters regardless of `column-gap`. The legend also uses a slightly larger **`padding-inline-start`** (`--gap-md`) than other sides so the block aligns visually with bottom chrome.

### Area clamp mode (recommended)
Instead of using `contentPaddingVw` (width-driven), you can enable an **area-based clamp** that uses an effective viewport size:
\[
\text{viewportSizePx} = \sqrt{\text{viewportWidthPx} \cdot \text{viewportHeightPx}}
\]

Then content padding becomes:
\[
\text{contentPadPx} = \text{lerp}(\text{minPx}, \text{maxPx}, \text{clamp}(\frac{\text{viewportSizePx}}{\text{capPx}}, 0, 1))
\]

At `capPx = 2200`, content padding is a **fixed** `maxPx` for larger viewports.

- **`layoutContentPaddingUseAreaClamp`** (boolean)
  - **Meaning**: Enables area-based clamping for content padding.
- **`layoutMinContentPaddingPx`** (number, px)
  - **Meaning**: Minimum content padding (also used as the legacy clamp floor).
- **`layoutMaxContentPaddingPx`** (number, px)
  - **Meaning**: Maximum content padding used by area clamp.
- **`layoutContentPaddingMaxViewportPx`** (number, px)
  - **Meaning**: Cap effective viewport size where padding becomes fixed at `layoutMaxContentPaddingPx`.
  - **Default**: `2200`

### Legacy compatibility (px keys)
The following legacy keys are still accepted and will be converted to vw at startup (using `layoutViewportWidthPx` if set, otherwise `window.innerWidth`):
- `containerBorder` (px)
- `simulationPadding` (px)
- `contentPadding` (px)

### Container inner shadow
- `containerInnerShadowOpacity` (number)
- `containerInnerShadowBlur` (number, px)
- `containerInnerShadowSpread` (number, px)
- `containerInnerShadowOffsetY` (number, px)

Applied to CSS vars `--container-inner-shadow-*`.

---

## Edge Labels (UI)

These keys control the **vertical edge labels**:
- Left: current chapter title (`#edge-chapter`)
- Right: copyright (`#edge-copyright`)

They’re intentionally **independent** from the global text colors so you can tune them as faint “frame metadata”.

### `edgeLabelColorLight` (string, CSS color)
- **Meaning**: Edge label color in **light mode**
- **Applied to**: CSS var `--edge-label-color-light`

### `edgeLabelColorDark` (string, CSS color)
- **Meaning**: Edge label color in **dark mode**
- **Applied to**: CSS var `--edge-label-color-dark`

### `edgeLabelInsetAdjustPx` (number, px)
- **Meaning**: Adjusts how far the edge labels sit from the frame.
  - **Higher** = further inward
  - **Lower / negative** = further outward
- **Applied to**: CSS var `--edge-label-inset-adjust` (added on top of the base inset)

---

## UI Spacing (Text + Controls)

These keys control **spacing/padding/positioning** for most UI text elements and are applied as **CSS variables** at runtime (and exposed in the dev panel under **UI Spacing**).

### `uiHitAreaMul` (number, 0.5..2.5)
- **Meaning**: Multiplier for most UI hit areas (buttons/links), scaling the `--hit-area-*` tokens.
- **Applied to**: CSS var `--ui-hit-area-mul`

### `uiIconCornerRadiusMul` (number, 0..1)
- **Meaning**: Icon button corner radius as a **fraction of the wall radius**. Default `0.4` ≈ “40% of the wall”.
- **Applied to**: CSS var `--ui-icon-corner-radius-mul` (derived px var: `--ui-icon-corner-radius`)

### `uiIconFramePx` (number, px; 0 = auto)
- **Meaning**: Square icon button frame size (height/width). If `0`, uses token-derived default (`--ui-icon-frame-size`).
- **Applied to**: CSS var `--ui-icon-frame-size`

### `uiIconGlyphPx` (number, px; 0 = auto)
- **Meaning**: Icon glyph size. If `0`, uses token-derived default (`--ui-icon-glyph-size`).
- **Applied to**: CSS var `--ui-icon-glyph-size`

### `uiIconGroupMarginPx` (number, px; can be negative)
- **Meaning**: Margin applied to the social icon group (Apple/X/LinkedIn). Use negative values to push the icons outward.
- **Applied to**: CSS var `--ui-icon-group-margin`

### `contentPaddingRatio` (number; viewport fraction, legacy px supported)
- **Meaning**: Additive content padding on top of wall thickness, as a fraction of **layout width only** (not height, not \(\sqrt{wh}\)):
  \[
  \text{addPx} = \text{layoutWidthPx} \cdot \text{contentPaddingRatio}
  \]
  **Back-compat**: if `|contentPaddingRatio| > 1`, it is treated as legacy px and converted to a fraction using `layoutWidthPx`.
- **Applied to**: Derived `contentPadding` → `--content-padding` and directional vars stamped by `applyLayoutCSSVars()`.
- **Breath clamp (additive only)**: `addPx` is clamped between **8px** (mobile layout) and **24px** (desktop) minimum, **64px** maximum, then `contentPadding = round(wallThickness + clampedAddPx)`. **Tuning**: raise `contentPaddingRatio` in `design-system.json` / dev panel to add more inset everywhere on a given width. CSS fallback `--abs-content-padding` in `tokens.css` is **vw + px** (no `vmin`/`vh`); from **641px** width up, the token floor is **24px**.
- **`.fade-content`**: Four **longhand** paddings; `applyLayoutCSSVars()` stamps `--content-padding-x`, `--content-padding-y`, `--content-padding-y-bottom` as **px** (viewport width **≤600px** applies **1.5×** to x/y like the old mobile rule; bottom includes `contentPaddingBottomRatio`).

### `linkTextPadding` (number, px)
- **Meaning**: Padding applied to text links (main links, CV links).
- **Applied to**: CSS vars `--link-text-padding`, `--link-text-margin`

### `linkIconPadding` (number, px)
- **Meaning**: Legacy icon padding token. When `uiIconFramePx` is `0` (auto), this contributes to the derived icon button frame size via `--ui-icon-frame-size`.
- **Applied to**: CSS vars `--link-icon-padding`, `--link-icon-margin`

### `linkImpactScale` (number, 0.5..1.0)
- **Meaning**: Press depth scale for interactive elements (links/buttons).
- **Applied to**: CSS var `--link-impact-scale`

### `linkImpactBlur` (number, px)
- **Meaning**: Blur amount during press (adds “depth”).
- **Applied to**: CSS var `--link-impact-blur`

### `linkImpactDuration` (number, ms)
- **Meaning**: Duration of the press animation.
- **Applied to**: CSS var `--link-impact-duration`

### `hoverSnapEnabled` (boolean)
- **Meaning**: Enables the hover-target “snap” bounce on hover entry.
- **Applied to**: CSS var `--abs-hover-snap-enabled` (`1` or `0`)

### `hoverSnapDuration` (number, ms)
- **Meaning**: Total duration of the hover snap bounce.
- **Applied to**: CSS var `--abs-hover-snap-duration`

### `hoverSnapOvershoot` (number, scale; >= 1.0)
- **Meaning**: Peak scale during hover snap.
- **Applied to**: CSS var `--abs-hover-snap-overshoot`

### `hoverSnapUndershoot` (number, scale; <= 1.0)
- **Meaning**: Recoil scale before settling back to `1.0`.
- **Applied to**: CSS var `--abs-hover-snap-undershoot`

### `linkHoverNudge` (number, px)
- **Meaning**: Vertical translation applied to hover, focus, and active states (corner links + icon buttons).
- **Applied to**: CSS var `--link-nudge`

### `linkHoverIntensityLight` (number, 0..1)
- **Meaning**: Legacy tuning value; still written to CSS var `--abs-hover-intensity-light` at runtime for saved-config compatibility.
- **Applied to**: `--abs-hover-intensity-light` (currently **not** consumed by site chrome — nav/icon/meta hovers use solid `var(--cursor-color)`).

### `linkHoverIntensityDark` (number, 0..1)
- **Meaning**: Legacy tuning value; still written to `--abs-hover-intensity-dark`.
- **Applied to**: Same as above (not used by current chrome hover CSS).

### `linkHoverIntensityActive` (number, 0..1)
- **Meaning**: Legacy tuning value; still written to `--abs-hover-intensity-active`.
- **Applied to**: Same as above (legend active chip uses solid cursor color; no translucent mix).

### Brand logo scale (`--brand-logo-user-scale`)
- **Meaning**: Multiplier on the hero Alexander Beck logo’s rendered size (default **`0.936`**, i.e. 20% larger than the previous **`0.78`** tune).
- **Where**: `tokens.css` on `:root`; read in `canvas-logo.js` `calculateLogoSize()` so the **canvas** logo matches the CSS transform on `#brand-logo`.

### Hero title letter-spacing (`--hero-title-letter-spacing`)
- **Meaning**: Tracking for the home center wordmark (`.hero-title` lines) and styleguide hero specimens. Default **`-0.027ch`** — **excluded** from the site-wide ~40% tracking tighten applied to `--abs-letter-spacing-*` and most other UI.
- **Where**: `tokens.css` on `:root`; consumed in `main.css` for `.hero-title` / `.hero-title__*` and `body.styleguide-page .styleguide-type-sample--hero-*`.

### Site-wide letter spacing (tokens)
- **Meaning**: Core scale in `tokens.css`: `--abs-letter-spacing-global` (**`-0.07ch`**), `--abs-letter-spacing-tight` / `normal` / `loose`, plus `--legend-letter-spacing`, are tuned ~**40% tighter** than the prior scale (positive tracks ×**0.6**, negative ×**1.4**). Hardcoded `letter-spacing` in `main.css`, `portfolio.css`, and `panel.css` was adjusted the same way, except the hero title token above.

### `homeMainLinksBelowLogoPx` (number, px)
- **Meaning**: Index-only vertical offset for the main links cluster below the logo.
- **Applied to**: CSS var `--home-main-links-below-logo-px`

### `footerNavBarTopVh` (number, vh)
- **Meaning**: Vertical placement of the full-width main links nav bar (0..100).
- **Applied to**: CSS vars `--footer-nav-bar-top`, `--footer-nav-bar-top-svh`, `--footer-nav-bar-top-dvh`

### `footerNavBarGapVw` (number, vw)
- **Meaning**: Gap between main links nav bar links (expressed in vw; applied as a `clamp()` for a stable min/max).
- **Applied to**: CSS var `--footer-nav-bar-gap`

---

## Noise / Film Grain (Visual)

**Stacking:** `#scene-effects` / `.noise` is a child of `#simulations` with `z-index: 1`, under `.shell-wall-slot` (`z-index: 2`) and the pit canvas (`#c`, `z-index: 10`), so grain sits on the wall interior surface **behind** the simulation, not on top of the balls.

### Procedural grain (runtime / panel: Shell → Background grain)

- **`noiseOpacityLight` / `noiseOpacityDark`** (0–1) → `--noise-opacity-light` / `--noise-opacity-dark`; these scale a dark alpha ink texture, not an opaque bright/dark image.
- **`noiseColorLight` / `noiseColorDark`** (hex) → `--noise-color-light` / `--noise-color-dark` — ink color inputs are clamped to dark values before texture generation so the grain cannot brighten the wall.
- **`noiseStructureStrength`** (0–0.45, default `0.30`) blends a lower-frequency dark-alpha field into the generated tile so the wall reads less mechanically without adding another DOM/compositor layer.
- **`noiseStructureScale`** (0.18–0.75, default `0.38`) controls the second field’s relative frequency. Lower values make broader clouding; higher values make the added structure finer.

### Noise sizing
- `noiseSize` (number, px) → `--noise-size`; this scales the single generated texture in CSS.
- The second field is baked into the same texture; it has no separate opacity, animation, or stacking layer. The generated texture is transparent dark ink, is painted only by `.noise::before`, and is revealed after decode so the wall grain appears as one settled surface.

---

## Rubber Wall System (Visual + Collision Alignment)

### `frameColor` (string, hex)
- **Meaning**: Unified frame color (border + walls + browser chrome meta tags).

### Geometry
- `wallThicknessVw` (number, vw) → `--wall-thickness` (derived px)
- `wallRadiusVw` (number, vw) → `--wall-radius` (derived px; also feeds rounded-corner collision bounds)
- `wallInset` (number, px) → physics-only inset (shrinks effective collision bounds to prevent visual overlap)

**Design rule (wall frame):** The inner wall corner radius is applied at **1.15×** the base radius (in `applyLayoutFromVwToPx`) to visually compensate for the extra outer offset of the second outer wall band (`.wall-outer-2`). If the number of outer bands or their offset changes, this multiplier may need adjustment.

**iOS-like squircle corners (global):** Runtime flag `cornerShapeSquircleEnabled` (boolean, default `true`) in `design-system.json` → `runtime`. When enabled, `applyLayoutCSSVars()` adds class `abs-corner-shape-squircle` on `<html>`; `tokens.css` applies `corner-shape: squircle` to `html` and all descendants (plus `::before` / `::after`) inside `@supports (corner-shape: squircle)` — the property is not inherited, so the stylesheet lists descendants explicitly. **Exceptions (stay circular):** `#custom-cursor`, `.legend .circle`, and **`#quote-display`** (plus nested **`.quote-display__disk`**) so the quote puck stays a true circle. Browsers without support keep standard circular `border-radius` arcs. Dev panel (**dev only**): **Browser → Squircle corners** (same state key). Canvas-drawn geometry is unchanged (CSS-only enhancement).

### Legacy compatibility (px keys)
The following legacy keys are still accepted and will be converted to vw at startup:
- `wallThickness` (px)
- `wallRadius` (px)

### Wobble tuning (visual-only deformation)
- `wallWobbleMaxDeform` (number, px)
- `wallWobbleStiffness` (number)
- `wallWobbleDamping` (number)
- `wallWobbleSigma` (number)
- `wallWobbleCornerClamp` (number)
- `wallWobbleMaxVel` (number)
- `wallWobbleMaxImpulse` (number)
- `wallWobbleMaxEnergyPerStep` (number)

### Stability clamps (recommended)
- **`wallWobbleMaxVel`**: Caps the wobble velocity to prevent erratic spikes (especially in dense bottom stacks).
- **`wallWobbleMaxImpulse`**: Caps per-sample impact injection so repeated impacts don't create runaway energy.
- **`wallWobbleMaxEnergyPerStep`**: Caps total injected impact energy per wall physics tick (last-resort failsafe for rare spikes).

### Performance (visual-only wall system)

- **`wallPhysicsSamples`** (number, 8..96)
  - **Meaning**: Sample count used for the wall wobble **integration** (visual-only). Lower is faster; higher is smoother.

- **`wallPhysicsSkipInactive`** (boolean)
  - **Meaning**: Skip wall wobble integration when there is no active deformation.

- **`wallRenderDecimation`** (number, 1..12)
  - **Meaning**: Renders every Nth wall sample (visual-only).
  - **Common settings**:
    - `1` = 96 points (smoothest, slowest)
    - `2` = 48 points (default balance)
    - `4` = 24 points (faster)
    - `12` = 8 points (fastest/polygonal)
  - **Notes**: This affects **rendering only**; it does not change the wall wobble physics sample count (`wallPhysicsSamples`).

---

## Related Docs

- [`MODES.md`](./MODES.md) — Mode behavior & keyboard shortcuts
- [`INTEGRATION.md`](./INTEGRATION.md) — Embed/runtime integration details
- [`../development/DEV-WORKFLOW.md`](../development/DEV-WORKFLOW.md) — Build and preview workflow
