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
They are only applied in **Ball Pit** (`pit`) and **Ball Pit (Throws)** (`pit-throws`).

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
  - There is an internal cap (`state.sizeVariationCap`, currently `0.12`) that defines what “1.0 variation” means in absolute size terms.

---

## Balls (Per Simulation)

These keys are all **0..1**:

- `sizeVariationPit`
- `sizeVariationPitThrows`
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

## Ball Pit (Throws)

These keys tune the **Ball Pit (Throws)** mode (`pit-throws`): balls thrown in **color-by-color batches** from the **top-left/top-right** toward the center.

### `pitThrowSpeed` (number)
- **Meaning**: Base launch speed for side throws.
- **Applied to**: `state.pitThrowSpeed`

### `pitThrowSpeedJitter` (number, 0..1)
- **Meaning**: Random speed variation (multiplier jitter around `pitThrowSpeed`).
- **Applied to**: `state.pitThrowSpeedJitter`

### `pitThrowSpeedVar` (number, 0..1)
- **Meaning**: Per-throw speed multiplier variance (each throw gets its own speed scaling before jitter).
- **Applied to**: `state.pitThrowSpeedVar`

### `pitThrowAngleJitter` (number, 0..1)
- **Meaning**: Random angular variation applied to the aim direction.
- **Applied to**: `state.pitThrowAngleJitter`

### `pitThrowBatchSize` (number)
- **Meaning**: Balls per color batch (each batch uses a single color; batches alternate left/right).
- **Applied to**: `state.pitThrowBatchSize`

### `pitThrowIntervalMs` (number, ms)
- **Meaning**: Time between throws *within* a single color batch.
- **Applied to**: `state.pitThrowIntervalMs`

### `pitThrowColorPauseMs` (number, ms)
- **Meaning**: Pause between colors (after a batch finishes, before the next color starts).
- **Applied to**: `state.pitThrowColorPauseMs`

### `pitThrowPairChance` (number, 0..1)
- **Meaning**: Chance that a throw will schedule a second, opposite-side throw (for overlap).
- **Applied to**: `state.pitThrowPairChance`

### `pitThrowPairStaggerMs` (number, ms)
- **Meaning**: Delay for the paired (second) throw.
- **Applied to**: `state.pitThrowPairStaggerMs`

### `pitThrowTargetYFrac` (number, 0..1)
- **Meaning**: Vertical aim point for throws, as a fraction of canvas height.
- **Applied to**: `state.pitThrowTargetYFrac`

### `pitThrowInletInset` (number, 0..1)
- **Meaning**: How far in from each wall the top “inlets” are, as a fraction of usable width.
- **Applied to**: `state.pitThrowInletInset`

### `pitThrowCrossBias` (number, 0..1)
- **Meaning**: Cross-aim bias. Left throws aim slightly right-of-center; right throws aim slightly left-of-center.
- **Applied to**: `state.pitThrowCrossBias`

### `pitThrowSpawnSpread` (number, 0..1)
- **Meaning**: Horizontal spawn spread around the inlet, as a fraction of usable width.
- **Applied to**: `state.pitThrowSpawnSpread`

### `pitThrowAimJitter` (number, 0..1)
- **Meaning**: Aim X jitter, as a fraction of canvas width (adds organic randomness).
- **Applied to**: `state.pitThrowAimJitter`

### `pitThrowSpreadVar` (number, 0..1)
- **Meaning**: Per-throw spread multiplier variance (affects spawn spread + aim jitter per throw).
- **Applied to**: `state.pitThrowSpreadVar`

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

## Orbit 3D (Mode 12)

These keys control the Orbit 3D simulation (mode `orbit-3d`):

- `orbit3dBallCount` (number): number of orbiting balls (re-init on change)
- `orbit3dMinRadiusVw` (number, vw): inner orbit radius bound (vw → px at init)
- `orbit3dMaxRadiusVw` (number, vw): outer orbit radius bound (vw → px at init)
- `orbit3dAngularSpeed` (number, rad/s): base angular speed (inner orbits run faster via Kepler-ish scaling)
- `orbit3dFollowStrength` (number): spring strength pulling balls toward their orbit target (higher = tighter, less lag)
- `orbit3dFollowDamping` (number): damping applied during target following (higher = heavier, less overshoot)
- `orbit3dMaxSpeed` (number, px/s): velocity clamp to prevent spikes on fast cursor movement
- `orbit3dDepthScale` (number, 0..1): faux-3D depth strength (size scaling based on orbital angle)

Notes:
- Orbit 3D uses a **spring-damper anchor** to preserve “weight” and inertia; it does not snap balls to the cursor.
- Collisions are disabled between balls (for clarity), but wall collisions still apply.

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

---

## Related Docs

- [`MODES.md`](./MODES.md) — Mode behavior & keyboard shortcuts
- [`SOUND.md`](./SOUND.md) — Collision sound system
- [`BUILD-SYSTEM.md`](./BUILD-SYSTEM.md) — How config gets copied into `public/`
