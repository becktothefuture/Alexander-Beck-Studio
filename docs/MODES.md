## Simulation Modes – Product Spec (Human-Readable)

This document is the single source of truth for how each mode should behave, look, and feel. We will build the implementation to match this spec precisely, then validate against it via visual/manual tests and lightweight metrics.

### Global Principles
- Contained in a single DOM element: `#bravia-balls` (canvas + panel live inside it)
- 60fps target on desktop; graceful degrade on mobile; respects prefers-reduced-motion
- Clean, minimal UI; panel docked top-right with clear sections; collapsible details
- Performance: O(1) hot paths, batched updates, no unnecessary allocations

---

### Mode 1 — Ball Pit (Default)
Purpose: Classic, satisfying gravity-based bouncy balls with light interaction.

Behavior
- Balls spawn from a configurable strip across the top area (sweeping emitter)
- Gravity pulls balls downward; collisions with walls/text are bouncy but damped
- Optional mouse repeller pushes nearby balls away (feels like a magnetic force)
- Balls have subtle spin and squash on impact for a premium, tactile feel

User Interactions
- Mouse move: shows a cursor ball; if repeller is enabled, nearby balls push away
- Keyboard: `R` reset to spawn; `/` toggle panel; `1` switch to Ball Pit

Controls (Panel)
- Global Physics: gravity (multiplier), bounciness (REST), drag (FRICTION), size/variation, mass
- Spawn: emit interval, spawn region (x/y/width/height)
- Repeller: radius, power, softness, on/off
- Scene: corner radius, trail (motion blur) sliders
- Colors: template + 8 pickers; cursor color selector

Visual
- Crisp, colorful balls with premium squash/rotate micro-interactions
- Subtle motion blur if enabled; gently rounded container corners if set

Performance Targets
- >55–60fps desktop; >40fps mobile on modern devices

---

### Mode 2 — Flies to Light
Purpose: Elegant, living swarm that seeks the cursor like moths to a light.

Behavior
- No gravity; balls behave like lightweight agents in open space
- Each frame, balls are attracted toward the mouse position
- Near the target, a tangential (sideways) component encourages orbiting motion
- When the cursor moves away, the swarm fluidly re-targets and follows

User Interactions
- Mouse move: acts as the “light source”; swarm gathers and orbits around it
- Idle mouse: swarm softly circulates near last known target
- Keyboard: `2` switch to Flies

Controls (Panel)
- Attraction power (how strongly the swarm moves toward the cursor)
- Orbit radius (typical circulation distance around the cursor)
- Swarm speed (tangential bias strength)

Visual
- Graceful, organic motion; balls avoid jitter; orbit looks smooth and intentional
- Mild variance between agents adds life without chaos

Performance Targets
- Avoid N² effects; each ball uses only simple vector math per frame

---

### Mode 3 — Mouse Trail (Print)
Purpose: A painterly trail of particles following the cursor’s recent path.

Behavior
- Minimal/zero gravity; balls are softly pulled toward the recent cursor path
- The system keeps a short, configurable trail of path points (FIFO buffer)
- Each ball is pulled toward the nearest point on that recent path
- With motion-blur enabled, trails create elegant ribbons

User Interactions
- Mouse draw: move the cursor to “paint” the path the particles chase
- Keyboard: `3` switch to Trail

Controls (Panel)
- Trail length (number of recorded points)
- Particle spacing (minimum distance between recorded points)
- Fade speed (how quickly canvas clears between frames; higher = shorter trails)

Visual
- Clean ribbon-like flows; particles cohere and smoothly follow turns
- No noisy oscillations; path-following feels intentional and fluid

Performance Targets
- Trail buffer kept small (10–200 points); nearest-point search O(P) per ball with small P

---

---

### Mode 4 — Weightless Bounce
Purpose: Zero-gravity space with elastic collisions off all walls.

Behavior
- No gravity; balls float freely in space
- All 4 walls (including top) act as elastic boundaries
- Balls spawn with random velocities in all directions
- Optional subtle mouse repeller for gentle interaction
- Perfect energy conservation creates perpetual motion

User Interactions
- Mouse move: gentle repeller pushes nearby balls
- Keyboard: `4` switch to Weightless

Controls (Panel)
- Initial speed (velocity magnitude at spawn)
- Ball count (fixed number, no continuous spawning)
- Bounce elasticity (how much energy retained on wall hit)
- Repeller power & radius (subtle push effect)

Visual
- Balls float and bounce endlessly
- Clean elastic collisions with walls
- Mesmerizing perpetual motion patterns

Performance Targets
- Stable physics with no energy loss over time

---

### Mode 5 — Rainbow Drop
Purpose: Artistic display with one ball per color falling in sequence.

Behavior
- Balls drop one by one, each a different color from the palette
- Configurable delay between drops
- Gravity pulls balls down; they settle at bottom
- No mouse interaction; purely visual
- Resets and repeats when all colors have dropped

User Interactions
- Keyboard: `5` switch to Rainbow
- Watch the cascade of colors

Controls (Panel)
- Drop delay (time between each ball)
- Gravity strength (how fast they fall)
- Ball size distribution (visual variety)

Visual
- Each ball represents one color from current palette
- Sequential drops create a rainbow waterfall effect
- Balls accumulate at bottom in color order

Performance Targets
- Smooth sequential spawning without stutters

---

### Cross-Mode Details

Common UX
- Mode Switcher: 5 mode buttons + keyboard shortcuts 1-5
  - `1` Ball Pit (default)
  - `2` Flies to Light
  - `3` Mouse Trail
  - `4` Weightless Bounce
  - `5` Rainbow Drop
- Panel Toggle: `/` ; Reset: `R`

Rendering & Containment
- Everything renders on a single canvas inside `#bravia-balls`
- Panel, FPS counter, and helpers are absolutely positioned within `#bravia-balls`

Mobile & Accessibility
- Responsive scale reduces ball size on small screens (~0.6×)
- Avoid heavy reliance on hover-only interactions
- Respect reduced-motion: clamp trail and particle acceleration

Validation Checklist (Done when all true)
- Ball Pit: gravity, spawn sweep, repeller all work; collisions stable; no jitter
- Flies: swarm converges and orbits smoothly; no jitter when near target; stable idle
- Trail: particles follow recent path; ribbons look continuous with blur; no chattering
- Panel: switching modes updates visible controls; keyboard shortcuts switch instantly
- Performance: no evident frame drops on desktop; mobile within target; CPU/GPU stable


