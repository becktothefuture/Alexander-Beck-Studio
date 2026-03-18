# Quote Puck — Air-Hockey Physics

The quote button is a draggable circular element that behaves like an air-hockey puck. Users can grab it, fling it, and watch it bounce off the viewport edges with realistic physics.

---

## Architecture

The system is split across three files with clearly separated concerns:

| File | Responsibility |
|------|---------------|
| `react-app/app/src/legacy/modules/ui/quote-display.js` | DOM creation, quote content, mode-change animations |
| `react-app/app/src/legacy/modules/ui/quote-puck.js` | Physics engine: drag, inertia, bounce, spin, sound |
| `react-app/app/public/css/main.css` (Quote Puck section) | Visual styling, hover color, dark mode |

### Key design decision: left/top positioning, not transform

Position is driven via `el.style.left` / `el.style.top`, **not** CSS `transform: translate()`.

This was chosen after discovering that using `transform` for position caused three interacting bugs:
1. The base CSS `transition: transform 0.28s` made every JS frame lag behind the physics — the puck visually never reached the wall before bouncing back.
2. Wall-hit `scale()` on the same transform shrank the element off the wall by ~5px.
3. Rotation, scale, and position sharing one `transform` property meant CSS transitions animated all three together.

With `left`/`top` for position, `transform` is free for rotation — zero conflicts, zero lag.

### Viewport layer

The quote element is appended to `document.documentElement` (not `<body>`), so it sits outside the page layout. This means **`body.dark-mode` selectors don't match** — all dark-mode styles use `.dark-mode` instead.

---

## Physics Model

### Translation

- **Drag**: pointer events with `setPointerCapture`. Position tracks the pointer directly.
- **Release**: velocity estimated from a rolling window of the last 5 pointer samples (max 120ms age), weighted toward newer samples.
- **Inertia**: `requestAnimationFrame` loop with delta-time integration.
- **Friction**: exponential damping — `v *= e^(-friction × dt)`. Frame-rate independent.
- **Speed cap**: velocity is clamped to `MAX_SPEED` (5000 px/s) to prevent tunneling.

### Wall Bounce

Axis-independent reflection with energy loss:

```
if (x <= 0 and vx < 0):
    x = 0
    vx = -vx × RESTITUTION
```

Both axes are resolved in the same frame, so corner hits reflect both components and play one sound.

### Rotation

Spin comes from two physically realistic sources:

1. **Drag-path curvature** — the change in movement direction (`atan2` heading) between consecutive pointer samples. A straight drag produces zero rotation. An arc produces rotation proportional to the arc's curvature. The `× 0.3` scaling keeps it subtle.

2. **Wall-bounce tangent** — when the puck hits a wall at an angle, the tangential velocity component kicks spin:
   - Hit left/right wall → tangential component is `vy`
   - Hit top/bottom wall → tangential component is `vx`
   - `spin += tangential × WALL_SPIN_GAIN`

Spin decays with exponential friction (`SPIN_FRICTION = 3.0`, faster than translation).

### Sound

On wall collision, `playCollisionSound(radius, intensity, pan, id)` is called from the shared sound engine. Intensity is proportional to impact speed. Pan follows the puck's x-position across the viewport.

---

## Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `SAMPLES` | 5 | Rolling velocity estimation window |
| `SAMPLE_AGE` | 120 ms | Max age of a pointer sample |
| `MAX_DT` | 1/30 s | Frame delta clamp (prevents huge jumps) |
| `MIN_RELEASE` | 30 px/s | Below this, no inertia on release |
| `MIN_ALIVE` | 8 px/s | Below this, stop the RAF loop |
| `MAX_SPEED` | 5000 px/s | Velocity cap |
| `RESTITUTION` | 0.55 | Wall bounce energy retention |
| `FRICTION` | 1.2 | Translational drag coefficient |
| `SPIN_FRICTION` | 3.0 | Rotational drag coefficient |
| `WALL_SPIN_GAIN` | 0.06 | Tangential wall speed → spin (deg/px) |
| `MIN_SPIN` | 0.3 deg/s | Below this, kill spin |

---

## Edge Cases

### Pointer leaves viewport while dragging
The `pointermove` handler detects out-of-bounds coordinates (`clientX < 0`, etc.) and auto-releases with momentum from the last good in-bounds samples. Out-of-bounds coordinates are never recorded — they would corrupt velocity estimation.

### User releases exactly at a wall
After estimating release velocity, the code checks if the puck is already at a wall boundary and the velocity points into it. If so, an immediate bounce is applied before the first RAF frame.

### Very fast flick (tunneling prevention)
Release velocity is capped to `MAX_SPEED`. Even at max speed with `MAX_DT`, the puck moves at most ~167px per frame — well within detection range for viewport-sized bounds.

### User grabs puck while it's still moving (in-flight catch)
`pointerdown` calls `stopLoop()` immediately, zeroing velocity and canceling any running RAF. The puck enters drag mode with no residual inertia.

### Very slow drag release
If release speed is below `MIN_RELEASE` (30 px/s), no inertia is applied. The puck stays where it was dropped.

### Velocity near zero during inertia
If speed drops below `MIN_ALIVE` (8 px/s) and spin drops below `MIN_SPIN` (0.3 deg/s), the RAF loop stops entirely. No idle CPU burn.

### Tiny wall jitter
After a wall bounce, if the post-bounce speed on the bounced axis is below `MIN_ALIVE`, that axis velocity is zeroed immediately. This prevents the puck from micro-oscillating against a wall.

### Corner hit (two walls simultaneously)
Both axes are resolved independently in the same frame. Both components reflect, spin is kicked by the combined tangential contribution, and one sound is played.

### Window resize
`resize` event re-clamps position to new viewport bounds. If the puck was in motion, it continues.

### Tab hidden / visible (`visibilitychange`)
When hidden: RAF is canceled, `lastTs` is reset. When visible: if the puck still has velocity, the loop restarts with a fresh timestamp — no giant `dt` jump.

### Browser loses focus while dragging (`blur`)
Auto-releases with momentum, same as pointer leaving viewport.

### `pointercancel` (system gesture, e.g. iOS swipe)
Ends drag without momentum — the puck stays where it is.

### `lostpointercapture`
Fallback release with momentum, in case the capture is broken by the browser.

### `prefers-reduced-motion`
All inertia, bounce, and spin are disabled. Drag moves the puck directly; release leaves it in place.

### Touch devices
Pointer events handle touch identically to mouse. `touchAction: none` prevents browser scroll/zoom interference.

---

## Hover Color

The puck fills with the cursor color (`--cursor-color`) on hover. Text keeps readable contrast via `--quote-hover-fg`, a WCAG AA-safe color computed by `colors.js` against the cursor color.

The default (non-hover) background:
- **Light mode**: `rgba(240, 240, 240, 0.98)`
- **Dark mode**: `rgba(18, 18, 20, 0.98)` — matches the inner wall/content area

---

## Studio Panel Controls

The **Puck Physics** section in the studio panel (`🏒`) exposes 8 parameters as CSS custom properties:

| Control | CSS Variable | Range | Default |
|---------|-------------|-------|---------|
| Bounce | `--puck-restitution` | 0–1 | 0.65 |
| Air friction | `--puck-friction` | 0–5 | 0.5 |
| Wall inset | `--puck-wall-inset` | 0–200 px | 0 |
| Max speed | `--puck-max-speed` | 500–10000 px/s | 4000 |
| Spin gain | `--puck-spin-gain` | 0–0.5 | 0.12 |
| Spin friction | `--puck-spin-friction` | 0–10 | 3.0 |
| Wall squash | `--puck-wall-squash` | 0.8–1 | 0.96 |
| Hit volume | `--puck-sound-intensity` | 0–2 | 0.7 |

These are persisted via the design-system save pipeline into `design-system.json` → `shell-config.json` under `motion.*`.

> **Note:** The hardcoded constants in `quote-puck.js` (`RESTITUTION`, `FRICTION`, etc.) are the runtime defaults. The studio panel CSS variables, when present, override them through the controls system.
