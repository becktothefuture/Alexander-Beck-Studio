# 🖱️ Trail Mode - Sparkling Particles Specification

## ✨ Visual Goal: SPARKLES FROM CURSOR

**Effect:** Tiny sparkling particles emit from the cursor as it moves, like a magic wand leaving sparkles/fairy dust behind.

---

## 🎯 Core Behavior

### Emission:
- **Spawn particles FROM cursor position** as mouse moves
- **Continuous emission** when mouse is moving (not just on click)
- **No emission** when mouse is stationary
- **Emission rate:** Based on mouse velocity - faster mouse = more particles

### Particle Movement:
- **Initial velocity:** Small random spread in all directions from spawn point
- **No gravity** (zero-G)
- **Gentle drift:** Particles slowly float/drift with slight random motion
- **Deceleration:** Particles slow down over time (friction/drag)

### Particle Lifecycle:
- **Fade out:** Particles gradually fade based on age
  - Start: Full opacity (alpha = 1.0)
  - Fade: Linear fade over 1-2 seconds
  - End: Disappear when alpha reaches 0
- **Auto-cleanup:** Remove faded particles from memory

### Visual Properties:
- **Size:** Smaller than other mode balls (maybe 0.6× scale)
- **Colors:** Use color palette (same as other modes)
- **Sparkle effect:** Could have subtle glow or brightness variation

---

## 🚫 What Trail Mode Does NOT Have:

- ❌ No ball-to-ball collisions
- ❌ No wall collisions (particles drift off-screen and fade)
- ❌ No mouse attraction/repulsion after spawning
- ❌ No physics forces after initial spawn
- ❌ Particles are NOT static (they drift and fade)

---

## 🎛️ Adjustable Parameters:

1. **Emission Rate:**
   - How many particles spawn per frame
   - Could be velocity-dependent (more when mouse moves fast)

2. **Particle Lifetime:**
   - How long before they fully fade (default: 1-2 seconds)

3. **Initial Velocity Spread:**
   - How much random velocity particles get on spawn
   - Larger = more explosive spread
   - Smaller = tighter trail

4. **Drift Amount:**
   - How much gentle random motion during lifetime
   - Creates organic "floating" feeling

5. **Fade Speed:**
   - How quickly particles fade out
   - Fast fade = short sparkle trail
   - Slow fade = longer visible trail

---

## 📊 Technical Implementation Notes:

### Spawn Logic:
```javascript
// Only emit when mouse is moving
if (mouseVelocity > threshold) {
  // Spawn particle at cursor position
  const particle = spawnBall(mouseX, mouseY);
  
  // Small random initial velocity (spread in all directions)
  const spreadAngle = Math.random() * Math.PI * 2;
  const spreadStrength = 50-150; // randomize
  particle.vx = Math.cos(spreadAngle) * spreadStrength;
  particle.vy = Math.sin(spreadAngle) * spreadStrength;
  
  // Mark for age-based fade
  particle.spawnTime = currentTime;
  particle.lifetime = 1.5; // seconds
}
```

### Update Logic:
```javascript
// Apply gentle drift (small random forces)
particle.vx += (Math.random() - 0.5) * driftStrength;
particle.vy += (Math.random() - 0.5) * driftStrength;

// Deceleration (friction)
particle.vx *= 0.98;
particle.vy *= 0.98;

// Age-based fade
const age = currentTime - particle.spawnTime;
particle.alpha = Math.max(0, 1 - (age / particle.lifetime));

// Remove if fully faded
if (particle.alpha <= 0.01) {
  removeParticle(particle);
}
```

---

## 🎨 Visual Inspiration:

Think of:
- ✨ Magic wand sparkles
- 🎆 Fairy dust
- ⭐ Sparkler firework trail
- 🌟 Glitter falling
- 💫 Pixie dust from Tinkerbell

**NOT:**
- ❌ Paint drops that stay static
- ❌ Ribbon/snake following cursor
- ❌ Explosion from cursor

---

## 🖥️ Device Availability:

**Desktop Only** - Requires precise cursor control and continuous mouse movement tracking.

Hidden on mobile/touch devices.

---

## 📝 Summary:

Trail mode = **Moving cursor leaves a trail of sparkling, fading particles that gently drift and disappear** ✨

Like drawing with sparkles in the air!
