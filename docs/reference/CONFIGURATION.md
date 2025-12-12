# Configuration Reference

**Complete guide to all configuration parameters**

## Configuration System

Settings are managed through:
1. **UI Control Panel** - Live tuning with `/` key
2. **default-config.json** - Runtime defaults copied to `public/js/config.json`
3. (Optional) localStorage - Disabled by default for privacy

## Configuration Schema

### Complete JSON Structure

```json
{
  "ballSize": 0.7,
  "ballWeight": 8.0,
  "colorPalette": "industrial_teal",
  "currentMode": "pit",
  "gravity": 1.1,
  "bounciness": 0.85,
  "groundFriction": 0.008,
  "ballSoftness": 0.3,
  "emitInterval": 0.033,
  "fliesAttraction": 800,
  "fliesOrbitRadius": 120,
  "weightlessCount": 80,
  "weightlessSpeed": 200,
  "containerBorder": 0,
  "simulationPadding": 0
}
```

## Parameters by Category

### Global Settings

#### `ballSize` (Number)
- **Range:** 0.5 - 1.5
- **Default:** 0.7
- **Description:** Ball radius multiplier
- **Impact:** Visual size, collision radius
- **Realistic:** 0.6 - 0.8 (natural variation)

#### `ballWeight` (Number, kg)
- **Range:** 5.0 - 15.0
- **Default:** 8.0
- **Description:** Ball mass in kilograms
- **Impact:** Inertia, momentum, drag effect
- **Realistic:** 7 - 10 (rubber ball range)

#### `colorPalette` (String)
- **Options:**
  - `"industrial_teal"` - Original teal palette
  - `"sunset_coral"` - Warm coral tones
  - `"violet_punch"` - Bold purple accents
  - `"citrus_blast"` - Energetic yellows
  - `"cobalt_spark"` - Professional blues
- **Default:** `"industrial_teal"`
- **Description:** Active color scheme
- **Impact:** Ball colors only

### Frame/Border Settings

Two-level padding system that creates a sophisticated layered frame effect around the simulation.

#### `containerBorder` (Number, pixels)
- **Range:** 0 - 60
- **Default:** 0
- **Description:** Outer frame — insets `#bravia-balls` from viewport edges
- **Impact:** Reveals body background (`--chrome-bg`) as an outer picture frame
- **Visual effect:** Creates a dark/light border around the entire rounded container

#### `simulationPadding` (Number, pixels)
- **Range:** 0 - 60
- **Default:** 0
- **Description:** Inner padding — space inside `#bravia-balls` around the canvas
- **Impact:** Shrinks the ball play area, canvas radius auto-adjusts
- **Visual effect:** Creates breathing room inside the container

**Two-level visual stack (outside → inside):**
```
[Body/chrome bg] → [Container border gap] → [#bravia-balls] → [Sim padding] → [Canvas]
```

**Technical notes:**
- Container has `border-radius: 42px` (CSS var: `--container-radius`)
- Canvas border-radius auto-calculates: `calc(var(--container-radius) - var(--simulation-padding))`
- Physics corner collisions automatically adjust to canvas radius
- Container border color uses `--chrome-bg` CSS variable (matches body/browser chrome)
- Simulation dimensions are **container-relative** not viewport-relative

### Ball Pit Mode

#### `gravity` (Number, multiplier)
- **Range:** 0.0 - 2.0
- **Default:** 1.1
- **Description:** Gravity strength multiplier
- **Base:** 1960 px/s² (≈ 9.8 m/s²)
- **Realistic:** 1.0 - 1.2 (Earth to slightly enhanced)

#### `bounciness` (Number)
- **Range:** 0.0 - 1.0
- **Default:** 0.85
- **Description:** Coefficient of restitution
- **Impact:** Energy retained per bounce
- **Realistic:** 0.75 - 0.85 (rubber balls)
- **Values:**
  - 0.0 = No bounce (inelastic)
  - 0.5 = Loses half energy
  - 0.85 = Realistic rubber
  - 1.0 = Perfect elastic (unrealistic)

#### `groundFriction` (Number)
- **Range:** 0.000 - 0.020
- **Default:** 0.008
- **Description:** Rolling friction coefficient
- **Impact:** How quickly balls slow when rolling
- **Realistic:** 0.005 - 0.010 (smooth surfaces)

#### `ballSoftness` (Number)
- **Range:** 0.0 - 1.0
- **Default:** 0.3
- **Description:** Squash deformation amount
- **Impact:** Visual only (doesn't affect physics)
- **Values:**
  - 0.0 = Rigid (no squash)
  - 0.3 = Natural rubber
  - 1.0 = Very soft/squishy

#### `emitInterval` (Number, seconds)
- **Range:** 0.01 - 0.1
- **Default:** 0.033 (30 balls/sec)
- **Description:** Time between ball spawns
- **Values:**
  - 0.01 = 100 balls/sec (fast)
  - 0.033 = 30 balls/sec (default)
  - 0.1 = 10 balls/sec (slow)

### Flies Mode

#### `fliesAttraction` (Number)
- **Range:** 100 - 8000
- **Default:** 800
- **Description:** Attraction force toward cursor
- **Impact:** How strongly flies pull toward light
- **Realistic:** 4000 - 6000 (insect behavior)
- **Values:**
  - 100 = Weak attraction
  - 800 = Default (balanced)
  - 5000 = Strong attraction (realistic)

#### `fliesOrbitRadius` (Number, pixels)
- **Range:** 50 - 400
- **Default:** 120
- **Description:** Comfortable orbit distance
- **Impact:** How close flies get to cursor
- **Realistic:** 150 - 250 (insects maintain distance)

### Zero-G Mode

#### `weightlessCount` (Number)
- **Range:** 20 - 200
- **Default:** 80
- **Description:** Initial ball count (fixed, no spawning)
- **Performance:**
  - 80 = 60 FPS stable
  - 150 = 60 FPS good
  - 200 = 55-58 FPS acceptable

#### `weightlessSpeed` (Number, px/s)
- **Range:** 100 - 600
- **Default:** 200
- **Description:** Initial velocity magnitude
- **Impact:** How fast perpetual motion appears
- **Realistic:** 200 - 300 (visible but not chaotic)

## Persistence

### localStorage (Optional)

Disabled by default. To enable, set `LOCALSTORAGE_ENABLED = true` in `source/modules/utils/storage.js` and rebuild.

### Auto-Save Behavior

- **Trigger:** Any parameter change in UI
- **Debounce:** 500ms (prevents spam)
- **Scope:** Per-browser, per-domain

### Manual Save

Click "Save Config" button in panel to download a `current-config.json` snapshot for reference. Place values into `source/config/default-config.json` as needed.

## Validation

### Type Validation

```javascript
const CONFIG_SCHEMA = {
  ballSize: { type: 'number', min: 0.5, max: 1.5 },
  ballWeight: { type: 'number', min: 5, max: 15 },
  colorPalette: { type: 'string', enum: [...PALETTE_NAMES] },
  // ...
};
```

### Range Clamping

Invalid values are automatically clamped:
```javascript
function validateValue(key, value) {
  const schema = CONFIG_SCHEMA[key];
  return Math.max(schema.min, Math.min(schema.max, value));
}
```

## Presets

### Quick Configurations

**Chaos Mode:**
```json
{
  "gravity": 0.5,
  "bounciness": 0.95,
  "ballSize": 1.2,
  "ballSoftness": 0.8
}
```

**Realistic Physics:**
```json
{
  "gravity": 1.0,
  "bounciness": 0.80,
  "ballWeight": 8.0,
  "groundFriction": 0.007
}
```

**Performance Mode:**
```json
{
  "emitInterval": 0.05,
  "weightlessCount": 60,
  "ballSize": 0.6
}
```

## Advanced Configuration

### Constants (Hard-coded)

Not configurable via UI:

```javascript
const CONSTANTS = {
  GRAVITY: 1960,               // Base gravity (px/s²)
  PHYSICS_DT: 1/120,           // Physics timestep
  MAX_BALLS: 300,              // Performance limit
  CANVAS_HEIGHT_VH_PIT: 1.5,   // Ball Pit canvas height
  CANVAS_HEIGHT_VH_DEFAULT: 1.0,
};
```

### Mode Defaults

Each mode has optimal defaults:

```javascript
const MODE_DEFAULTS = {
  pit: {
    gravity: 1.1,
    bounciness: 0.85,
    friction: 0.008,
  },
  flies: {
    attraction: 800,
    orbitRadius: 120,
  },
  weightless: {
    count: 80,
    speed: 200,
    bounciness: 0.98,
  },
};
```

## Programmatic Access

### Read Configuration

```javascript
// Get current settings
const config = window.BRAVIA_BALLS.getConfig();
console.log(config.ballSize); // 0.7

// Get specific value
const gravity = window.BRAVIA_BALLS.getConfigValue('gravity');
```

### Update Configuration

```javascript
// Update single value
window.BRAVIA_BALLS.setConfigValue('ballSize', 0.9);

// Update multiple values
window.BRAVIA_BALLS.updateConfig({
  ballSize: 0.9,
  gravity: 1.2,
  bounciness: 0.9
});

// Save to localStorage
window.BRAVIA_BALLS.saveConfig();
```

## Color Palettes

### Available Palettes

Each palette has 8 colors with weighted distribution:

**Industrial Teal** (Default):
```javascript
[
  '#2A2A2A',  // 50% (Dark gray)
  '#E0E0E0',  // 25% (Light gray)
  '#FFFFFF',  // 12% (White)
  '#40E0D0',  // 6%  (Turquoise)
  '#0A0A0A',  // 3%  (Black)
  '#20B2AA',  // 2%  (Light sea green)
  '#008B8B',  // 1%  (Dark cyan)
  '#00CED1'   // 1%  (Dark turquoise)
]
```

**Distribution Pattern:**
- 50% primary neutral
- 25% secondary neutral
- 12% tertiary neutral
- 6% + 3% + 2% + 1% + 1% accent colors

### Psychology

See [COLOR-PALETTES.md](./COLOR-PALETTES.md) for:
- Mood associations
- Use case recommendations
- Accessibility notes

## Performance Impact

### High Impact Parameters
- `weightlessCount` - More balls = lower FPS
- `emitInterval` - Faster spawning = more balls = lower FPS
- `ballSize` - Larger = more pixels = slightly lower FPS

### Low Impact Parameters
- `ballSoftness` - Visual only
- `colorPalette` - No performance impact
- `gravity` - Negligible impact

### Optimization Tips

**For Best Performance:**
```json
{
  "ballSize": 0.6,
  "emitInterval": 0.05,
  "weightlessCount": 60,
  "currentMode": "flies"
}
```

**Flies mode** is most performant (no collisions).

---

**See Also:**
- [MODES.md](./MODES.md) - Mode specifications
- [INTEGRATION.md](./INTEGRATION.md) - Embedding guide
- [../development/ARCHITECTURE.md](../development/ARCHITECTURE.md) - Technical details

