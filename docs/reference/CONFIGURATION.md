# Configuration Reference

**Source of truth:** `source/config/default-config.json`

This document describes the configuration keys that are copied into the production build and loaded at runtime by `source/main.js`.

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


