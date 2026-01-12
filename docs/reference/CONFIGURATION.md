# Configuration Reference

**Source of truth:** `source/config/default-config.json`

This document describes the configuration keys that are copied into the production build and loaded at runtime by `source/main.js`.

---

## Portfolio Page Configuration (Separate Runtime)

The **portfolio page** (see `source/portfolio.html`) uses a **separate config file** and loader:

- **Source of truth (portfolio)**: `source/config/portfolio-config.json`
- **Portfolio data (slides/content)**: `source/config/contents-portfolio.json`
- **Loader/normalizer**: `source/modules/portfolio/portfolio-config.js`

The portfolio config is copied into the build as `public/js/portfolio-config.json` and is applied only to the portfolio carousel + portfolio-only effects (it does **not** affect the main simulation).

### Portfolio `cssVars` (Card sizing)

Card sizing is **height-driven** (via `vh`) with a **locked aspect ratio**. Width is derived as:
\[
\text{cardWidth} = \text{cardHeight} \cdot \frac{\text{aspectW}}{\text{aspectH}}
\]

Relevant keys (all strings, applied as CSS variables):

```json
{
  "cssVars": {
    "--card-aspect-w": "5",
    "--card-aspect-h": "4",
    "--card-height-min": "29vh",
    "--card-height-ideal": "49vh",
    "--card-height-max": "62vh"
  }
}
```

### Portfolio `runtime.sound` (Carousel scroll + detail SFX)

These keys control the **portfolio carousel sound cues** (implemented in `source/modules/portfolio/app.js` using `source/modules/audio/sound-engine.js`).

Portfolio content (cover + gallery + detail blocks) is pulled from `config/contents-portfolio.json` and resolved against `images/portfolio/` (mirrored to `public/` at build time).

```json
{
  "runtime": {
    "sound": {
      "centerClickEnabled": true,
      "centerClickGain": 8,
      "centerClickFilterHz": 1600,
      "centerClickMinSpeed": 120,
      "centerClickDebounceMs": 70,

      "continuousWheelEnabled": false,
      "continuousTickGainMul": 100,
      "continuousSwishGainMul": 100,

      "snapEnabled": false,
      "snapGain": 12,
      "openGain": 12,
      "openFilterHz": 1800,
      "closeGain": 10,
      "closeFilterHz": 1600,
      "snapDebounceMs": 300
    }
  }
}
```

- **`centerClick*`**: Plays **one click per project** when it passes the carousel center (debounced to prevent boundary chatter).
- **`continuousWheelEnabled`**: Enables the legacy continuous tick/swish loop driven by scroll velocity (off by default).
- **`snapEnabled`**: Enables an extra click when the carousel settles/snaps (off by default to avoid double-clicking when center clicks are enabled).

---

## Configuration System (How It Loads)

At startup the app attempts to fetch (in order):
- `config/default-config.json`
- `js/config.json`
- `../public/js/config.json`

If nothing loads, it falls back to a small in-code default.

---

## Persistence (Privacy-first)

### Simulation settings persistence

Simulation settings persistence is **disabled by default**.

To enable it, set `LOCALSTORAGE_ENABLED = true` in `source/modules/utils/storage.js` and rebuild.

### Panel UI state persistence

Panel position / dock visibility / collapsed state is persisted (best-effort) via `panel-dock.js` localStorage keys.

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
  "noiseSizeBase": 90,
  "noiseSizeTop": 80,
  "noiseBackOpacity": 0.051,
  "noiseFrontOpacity": 0.012,
  "noiseBackOpacityDark": 0.08,
  "noiseFrontOpacityDark": 0.05,
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

- **`colorDistribution`** (array of 7 objects)
  - **Meaning**: Maps each discipline label to exactly one palette slot (`colorIndex`) and a weight (`weight`).
  - **Schema**:

```json
{
  "colorDistribution": [
    { "label": "AI Integration", "colorIndex": 0, "weight": 30 },
    { "label": "UI/UX Design", "colorIndex": 4, "weight": 18 },
    { "label": "Creative Strategy", "colorIndex": 3, "weight": 15 },
    { "label": "Frontend Development", "colorIndex": 2, "weight": 12 },
    { "label": "Brand Identity", "colorIndex": 5, "weight": 10 },
    { "label": "3D Design", "colorIndex": 6, "weight": 10 },
    { "label": "Art Direction", "colorIndex": 7, "weight": 5 }
  ]
}
```

  - **`label`** (string): The discipline text used in the legend.
  - **`colorIndex`** (integer, 0–7): Palette slot index. This maps to CSS variables `--ball-1` .. `--ball-8` via \(index + 1\).
  - **`weight`** (integer, 0–100): Relative weight for spawning. The panel enforces the weights sum to **100**.
  - **Uniqueness**: The panel enforces each label uses a **unique** `colorIndex`, so 7 labels will select 7 distinct palette slots (one of the 8 palette colors may remain unused).

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

---

## Balls (Per Simulation)

These keys are all **0..1**:

- `sizeVariationPit`
- `sizeVariationFlies`
- `sizeVariationWeightless`
- `sizeVariationWater`
- `sizeVariationVortex`
- `sizeVariationPingPong`
- `sizeVariationMagnetic`
- `sizeVariationBubbles`
- `sizeVariationKaleidoscope`
- `sizeVariationCritters`

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

## Cursor (Visual)

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

- `sphere3dRadiusVw` (number, vw): sphere radius (vw → px at init) — default: 18
- `sphere3dDensity` (number): number of surface points (re-init on change) — default: 140
- `sphere3dFocalLength` (number, px): perspective focal length — default: 600
- `sphere3dDotSizeMul` (number): dot size multiplier — default: 1.5
- `sphere3dIdleSpeed` (number, rad/s): idle rotation speed — default: 0.15
- `sphere3dTumbleSpeed` (number): spin sensitivity when mouse drags over sphere — default: 2.5
- `sphere3dTumbleDamping` (number): decay factor for spin impulse — default: 0.94
- `sphere3dWarmupFrames` (number): physics warmup frames on mode init — default: 10

Notes:
- Uses a Fibonacci sphere distribution (surface-only).
- Ball-to-ball collisions are disabled; sphere is camera-locked (no movement, only rotation).
- No physics: sphere spins when mouse drags over it (like pushing a globe with your finger).
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
- `cube3dFocalLength` (number, px): perspective focal length
- `cube3dDotSizeMul` (number): dot size multiplier
- `cube3dWarmupFrames` (number): physics warmup frames on mode init

Notes:
- Points stay camera-centered; ball-to-ball collisions are disabled.
- Cursor offset changes yaw/pitch; mouse movement adds a tumble impulse.

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
- **Meaning**: Additive content padding applied on top of wall thickness, expressed as a fraction of:
  \[
  \text{viewportSizePx} = \sqrt{\text{viewportWidthPx} \cdot \text{viewportHeightPx}}
  \]
  So additive padding is:
  \[
  \text{addPx} = \text{viewportSizePx} \cdot \text{contentPaddingRatio}
  \]
  **Back-compat**: if `|contentPaddingRatio| > 1`, it is treated as a legacy px value and converted to a fraction at runtime.
- **Applied to**: Derived layout value `contentPadding` → CSS var `--content-padding`

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

### Noise sizing
- `noiseSizeBase` (number, px) → `--noise-size-base`
- `noiseSizeTop` (number, px) → `--noise-size-top`

### Noise opacity (light mode)
- `noiseBackOpacity` (number) → `--noise-back-opacity`
- `noiseFrontOpacity` (number) → `--noise-front-opacity`

### Noise opacity (dark mode)
- `noiseBackOpacityDark` (number) → `--noise-back-opacity-dark`
- `noiseFrontOpacityDark` (number) → `--noise-front-opacity-dark`

---

## Rubber Wall System (Visual + Collision Alignment)

### `frameColor` (string, hex)
- **Meaning**: Unified frame color (border + walls + browser chrome meta tags).

### Geometry
- `wallThicknessVw` (number, vw) → `--wall-thickness` (derived px)
- `wallRadiusVw` (number, vw) → `--wall-radius` (derived px; also feeds rounded-corner collision bounds)
- `wallInset` (number, px) → physics-only inset (shrinks effective collision bounds to prevent visual overlap)

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
- [`SOUND.md`](./SOUND.md) — Collision sound system
- [`BUILD-SYSTEM.md`](./BUILD-SYSTEM.md) — How config gets copied into `public/`
