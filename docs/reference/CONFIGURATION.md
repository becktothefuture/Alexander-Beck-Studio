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
  "containerBorder": 20,
  "simulationPadding": 0,
  "contentPadding": 40,
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
  "wallThickness": 12,
  "wallRadius": 42,
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
  "critterAvoidRadius": 120,
  "critterAvoidForce": 9000,
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

## Crystal Growth (Simulation 12)

These keys control the Crystal Growth simulation (mode `crystal`).

**Important:** The cursor affects **movement only** in this mode. Crystal growth is automatic and is never accelerated by cursor proximity.

- `crystalBallCount` (number): initial seed count (re-init on change; hard-capped)
- `crystalGrowthRate` (number): crystal mass accumulation rate (mass/sec)
- `crystalBondThreshold` (number 0..1): mass required before a ball can form a bond
- `crystalBondRadius` (number px): proximity threshold for bond formation
- `crystalBondStiffness` (number 0..1): constraint stiffness (higher = tighter bonds)
- `crystalBondDamping` (number 0..1): constraint damping (higher = less oscillation)
- `crystalMaxBondsPerBall` (number): branching cap per ball
- `crystalMaxBondsTotal` (number): hard cap for total bonds (FIFO pruning when full; may re-init on change)
- `crystalCursorRadius` (number px): cursor field radius (movement only)
- `crystalCursorPower` (number): cursor force strength (positive repels, negative attracts)
- `crystalCursorSoft` (number): cursor force softness (prevents singularities)
- `crystalBondWidth` (number px): bond line width
- `crystalBondOpacity` (number 0..1): bond opacity
- `crystalGlowBlur` (number px): glow blur radius for bonds + balls
- `crystalPulseAmt` (number 0..1): pulse amplitude for bonds + balls
- `crystalPulseHz` (number Hz): pulse rate
- `crystalParticlesPerBond` (number): number of sparkle particles spawned per new bond
- `crystalParticleMax` (number): hard cap for active sparkle particles
- `crystalParticleLife` (number s): sparkle particle lifetime

---

## Layout (Frame & Content)

Two-level padding system:
- **Outer**: `containerBorder` insets the whole simulation container from the viewport.
- **Inner**: `simulationPadding` insets the canvas inside the container.

### `containerBorder` (number, px)
- **Applied to**: CSS var `--container-border`

### `simulationPadding` (number, px)
- **Applied to**: CSS var `--simulation-padding`

### `contentPadding` (number, px)
- **Meaning**: Padding for fixed content elements inside the frame (legend/statement blocks).
- **Applied to**: CSS var `--content-padding`

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
- `wallThickness` (number, px) → `--wall-thickness`
- `wallRadius` (number, px) → `--wall-radius` (also feeds rounded-corner collision bounds)
- `wallInset` (number, px) → physics-only inset (shrinks effective collision bounds to prevent visual overlap)

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


