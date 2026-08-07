# Pebble Guide

## Intent

The pebble system replaces perfect circles with a calmer, more natural material read without destabilising the physics.

The target is:

- smooth, slightly irregular bodies
- stable weight and settling
- a clean silhouette with the shared cached matte sphere finish on eligible simulation bodies
- conservative performance

This is not a “make everything random” system. It is a controlled visual-material language.

The sphere finish applies whenever a circle or pebble is a semantic production ball. Coverage is route-wide; it is not limited to the Daily simulation catalog. The collider and motion guidance below still applies only where the renderer has physical bodies.

## Core Model

Each pebble has two identities:

1. **Simulation body**
   - Conservative collider used by physics, walls, sleep, wake, drag, and hit-testing.
   - Keep this simple and trustworthy.

2. **Visual body**
   - Rendered pebble silhouette drawn on top of the simulation body.
   - This is where the organic shape language lives.

Rule:

- physics may be simpler than visuals
- visuals must stay inside, or very close to, the physical envelope

If the visual pebble can exceed the trusted collision footprint too much, it will clip into neighbours or walls and immediately look wrong.

## What We Implemented

### 1. Shared Pebble Silhouette

The site now uses a deterministic pebble family instead of perfect circles.

- shared controls: `pebbleBlend`, `pebbleStretch`, `pebbleOrganic`, `pebbleBulge`
- fixed template pool with stable per-body seeds
- no per-frame random generation
- low-point contour suitable for real-time canvas rendering

### 2. Cached Matte Sphere Finish

Semantic production pebbles and circles use the shared cached matte sphere sticker/atlas material.

Rule:

- rotate the silhouette when the mode needs it
- keep the light fixed in screen space rather than rotating it with the body
- preserve the active palette colour as the base hue and chroma
- use only the shared key, ambient, rim-bounce, and self-shadow cues
- do not add contour strokes, cast shadows, drop shadows, glows, renderer-local lights, or per-frame gradients

Implementation:

- the renderer selects and draws/samples a cached sticker or atlas entry
- config, theme, and palette invalidation rebake the cache; ordinary body frames do not rebuild the material
- the self-shadow is baked inside the silhouette and does not become a second dynamic or cast-shadow pass
- depth comes from the restrained matte cues together with motion, overlap discipline, scale, and silhouette
- a flat colour path is a guarded fallback for a disabled or unavailable shared sprite/atlas, not an alternative production finish

Route coverage includes Home simulation bodies and the quote puck, Portfolio speed-field particles and pit project bodies, the six About discipline balls, Playground active coloured wake balls, and Contact ripple balls.

Neutral grid dots and generic point particles are not pebbles only because they are round. The neutral Playground grid, generic About point-field particles, Portfolio DOM cards, UI and editorial dots, artwork circles, the cursor, loaders, navigation, and atmosphere emitters keep their own material.

### 3. Portfolio Physics Tuning

Portfolio pebbles were tuned to feel heavy rather than rubbery.

- lower restitution
- stronger dynamic/static contact friction
- reduced spin transfer
- stricter wake thresholds
- faster real sleep entry
- resting-contact hold for supported bodies

The aim is “stones coming to rest”, not lively bouncy discs.

### 4. Portfolio Collider Strategy

For portfolio, the final safe solution is:

- conservative circular simulation body
- custom pebble render silhouette
- tiny explicit flat gap between bodies
- matching tiny wall inset so body-to-wall spacing reads the same as body-to-body spacing

This avoids visible clipping while keeping the visual language soft and organic.

### 5. Visual-First Validation

Pebble behavior is validated on the real canvas, not only in code.

We use repeatable visual scenarios such as:

- baseline settle
- gentle nudge
- hard throw
- vertical flick
- long drop
- wall slam
- dense shove
- forced overlap glitch
- resize under load

Acceptance is based on both:

- how the motion reads
- whether the bodies actually settle and stay performant

## Rotation Rules

Rotation is allowed when it helps the pebble read as a body rather than a sticker.

Use these rules:

- let the silhouette rotate
- keep the lighting orientation fixed in screen space
- keep angular speed modest
- avoid constant busy spin

Pebbles should turn because of motion and contact, not because they are trying to entertain the viewer.

## Performance Rules

Performance matters more than geometric purity.

### Safe

- shared template pool
- stable seeds
- circle physics
- low-point pebble outlines
- cached sticker/atlas sampling in the body draw pass
- small body counts

### Risky

- polygon physics for every pebble
- per-frame shape regeneration
- per-frame gradients, colour parsing, blur-heavy shading, or local-light calculations
- large numbers of independently rotating complex paths

## Home Pit Guidance

The home pit can use the same pebble language, but it has many more bodies than portfolio.

So the correct strategy is:

- keep pit physics circular
- reuse the shared pebble silhouette
- reuse the shared cached matte sphere material
- allow visual rotation only
- use the same small explicit gap model for neighbors and walls
- rely on existing LOD and throttle systems

This gives the home pit the same material family without paying portfolio-style narrow-phase costs on hundreds of bodies.

## Default Artistic Direction

The default should feel like:

- smooth beach pebbles
- slight asymmetry
- restrained variation
- calm weight
- crisp silhouettes with restrained matte volume on eligible simulation bodies

If the bodies feel noisy, cartoonish, or over-styled, the system has gone too far.
