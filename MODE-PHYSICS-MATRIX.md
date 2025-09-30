# Mode Physics Matrix

This document defines which physics behaviors are active in each simulation mode.

## Physics Features by Mode

| Feature | Ball Pit | Flies | Trail | Weightless |
|---------|----------|-------|-------|------------|
| **Gravity** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Ball-to-Ball Collision** | ✅ Yes | ❌ No | ❌ No | ✅ Yes |
| **Wall Collision** | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes |
| **Mouse Repeller** | ✅ Yes (strong) | ❌ No | ❌ No | ✅ Yes (subtle) |
| **Mouse Attraction** | ❌ No | ✅ Yes (swarm) | ❌ No | ❌ No |
| **Emission Point** | 🔼 Top emitter | 🔼 Top emitter | 🖱️ Cursor | 🎲 Random (init) |
| **Ball Colors** | 🎨 Palette | 🎨 Palette | 🎨 Palette | 🎨 Palette |
| **Fade/Alpha** | ❌ No | ❌ No | ✅ Yes | ❌ No |

---

## Mode-Specific Details

### 🎯 Ball Pit
**Goal:** Realistic bouncing balls with gravity
- Full physics simulation
- Balls spawn from top with throw motion
- Strong mouse repeller
- Realistic collisions and bouncing

### 🕊️ Flies to Light
**Goal:** Swarm behavior around cursor
- No gravity (flies float)
- Swarm attraction with separation
- Ball-to-ball collisions disabled (flies pass through)
- Wall bouncing enabled (flies stay in scene)
- Erratic flight + orbital motion

### 🖱️ Mouse Trail (Print)
**Goal:** Paint-like ribbon following cursor
- Balls spawn FROM cursor
- Small initial velocity (slight spread)
- NO wall collisions
- NO ball-to-ball collisions
- Particles fade out over time (alpha)
- Creates flowing ribbon behind cursor
- Uses standard color palette

### 🌌 Weightless (Zero-G)
**Goal:** Billiard balls in space
- No gravity (weightless)
- Full ball-to-ball collisions
- Wall bouncing (elastic)
- Subtle mouse repeller (optional)
- Balls spawn with random velocities
- Infinite bouncing simulation

---

## Ball Appearance

**All modes use the SAME visual style:**
- Size: Controlled by global size slider
- Colors: From the current color palette (8 colors)
- Shape: Circular with squash/stretch effects (except Trail mode - simpler)
- All balls are visually identical across modes (only behavior changes)

---

## Containment

| Mode | Stays in Viewport? | Reason |
|------|-------------------|--------|
| Ball Pit | ✅ Yes | Walls stop balls |
| Flies | ✅ Yes | Walls bounce flies |
| Trail | ❌ No | Particles drift off-screen and fade |
| Weightless | ✅ Yes | Walls bounce balls |

---

## Performance Considerations

- **Ball Pit:** Most expensive (full physics)
- **Flies:** Moderate (neighbor search O(n²) but capped)
- **Trail:** Lightest (no collisions, particles fade quickly)
- **Weightless:** Moderate-Heavy (collisions but no gravity)
