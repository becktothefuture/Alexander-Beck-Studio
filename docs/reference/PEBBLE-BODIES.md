# Pebble Guide

## Intent

The pebble system replaces perfect circles with a calmer, more natural material read without destabilising the physics.

The target is:

- smooth, slightly irregular bodies
- stable weight and settling
- readable light edge and dark edge
- conservative performance

This is not a “make everything random” system. It is a controlled visual-material language.

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

### 2. Screen-Locked Rim Lighting

The pebble can rotate, but the light direction stays fixed to the scene.

Rule:

- rotate the body
- do not rotate the light

Implementation:

- fill path rotates with the pebble
- highlight/shadow rim is drawn in screen/world space
- the rim is clipped to the rotated pebble path

This keeps the light edge visually stable while preserving body rotation.

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

- let the fill rotate
- let the silhouette rotate
- keep the lighting direction fixed
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
- world-locked gradient rim
- small body counts

### Risky

- polygon physics for every pebble
- per-frame shape regeneration
- blur-heavy shading
- large numbers of independently rotating complex paths

## Home Pit Guidance

The home pit can use the same pebble language, but it has many more bodies than portfolio.

So the correct strategy is:

- keep pit physics circular
- reuse the shared pebble silhouette
- allow visual rotation only
- keep lighting world-fixed
- rely on existing LOD and throttle systems

This gives the home pit the same material family without paying portfolio-style narrow-phase costs on hundreds of bodies.

## Default Artistic Direction

The default should feel like:

- smooth beach pebbles
- slight asymmetry
- restrained variation
- calm weight
- soft but readable edge lighting

If the bodies feel noisy, cartoonish, or over-styled, the system has gone too far.
