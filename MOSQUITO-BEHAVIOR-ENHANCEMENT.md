# 🦟 Mosquito Swarm Enhancement - FAST & ERRATIC

## Problem
Swarm was too slow and too circular - didn't feel like real mosquitos.

## Solution - Realistic Mosquito Flight Patterns

### 🚀 **Speed Increases:**
| Parameter | Before | After | Change |
|-----------|--------|-------|--------|
| Attraction multiplier | 1.5x | **4.0x** | 2.67× stronger |
| Max speed | 600 px/s | **1400 px/s** | 2.33× faster |
| Jitter strength | 300 | **1200** | 4× more erratic |
| Orbital base | 600 | **1200** | 2× faster spin |
| Damping | 0.98 | **0.99** | Less energy loss |
| Separation force | 8000 | **15000** | More spread out |
| Separation radius | 60px | **80px** | Wider spacing |

### 🎯 **New Behaviors:**

#### 1. Sudden Burst Movements
```javascript
const burstChance = 0.05; // 5% chance per frame
if (Math.random() < burstChance) {
  // Random direction burst (800 strength)
  const burstAngle = Math.random() * Math.PI * 2;
  b.vx += Math.cos(burstAngle) * 800;
  b.vy += Math.sin(burstAngle) * 800;
}
```
**Effect:** Mosquitos randomly dart away in unpredictable directions

#### 2. Variable Orbital Motion
```javascript
const orbitVariation = 0.5 + Math.random() * 1.5; // 0.5x to 2x
const orbitStrength = swarmSpeed * 1200 * orbitVariation * dt;
```
**Effect:** Not perfect circles - chaotic, varied orbits like real insects

#### 3. Stronger Erratic Jitter
```javascript
const jitterBase = 1200; // Was 300
b.vx += (Math.random() - 0.5) * jitterBase * dt;
b.vy += (Math.random() - 0.5) * jitterBase * dt;
```
**Effect:** Constant twitchy, jittery movement

#### 4. Much Stronger Attraction
```javascript
const attractForce = attractionPower * 4.0; // Was 1.5x
```
**Effect:** Mosquitos dart quickly toward the light source

### 📊 **Visual Result:**

**Before:**
- Slow, predictable circular motion
- Very little randomness
- Felt like slow-motion bees

**After:**
- ⚡ **FAST darting movements**
- 🎲 **Unpredictable burst changes**
- 🌪️ **Chaotic swirling patterns**
- 🦟 **Feels like real mosquitos!**

### 🧪 **Testing:**

1. Press `2` to enter Flies mode
2. Move cursor around
3. Observe:
   - Mosquitos dart MUCH faster
   - Random sudden bursts
   - More spread out (not clumping)
   - Chaotic orbits (not perfect circles)
   - High energy, jittery movements

### 🎛️ **User Controls:**
All existing sliders still work:
- **Attraction power:** 0-200,000 (now 4x multiplier internally)
- **Orbit radius:** Spacing from cursor
- **Swarm speed:** Affects orbital motion (now 2x base)

**Result:** Realistic mosquito flight simulation! 🦟✨
