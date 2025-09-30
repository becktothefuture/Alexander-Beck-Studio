# 🎈 Ball Softness Control - Simple Explanation

## What Is Ball Softness?

**Ball softness controls how much the balls squash and stretch when they collide with things.**

Think of it like different types of balls in real life:
- **Basketball (hard)** - barely deforms when it bounces
- **Tennis ball (normal)** - squashes a bit on impact
- **Stress ball (squishy)** - squashes a lot, very elastic

---

## How To Use It

### Location:
Go to **⚙️ Ball Properties** section (at the top of the control panel)

### The Slider:
```
[0] ←──────●──────→ [100]
Hard    Normal (40)    Squishy
```

- **0 = Completely Hard**
  - Balls don't deform at all
  - Like perfect spheres
  - No squash/stretch animation

- **40 = Normal (Default)**
  - Moderate squash effect
  - Looks natural and realistic
  - Good balance

- **100 = Very Squishy**
  - Maximum squash/stretch
  - Like soft rubber balls
  - Very bouncy and jiggly looking

---

## How It Works (Technical)

### The Math:
```javascript
function getSquashMax() {
  if (ballSoftness === 0) return 0; // Hard = no squash
  return 0.20 * (ballSoftness / 40.0);
}
```

**Explanation:**
- The base squash amount is `0.20` (20% deformation)
- This happens at softness = `40` (the default)
- The formula scales linearly:
  - Softness 20 = half squash (0.10)
  - Softness 40 = normal squash (0.20)
  - Softness 80 = double squash (0.40)
  - Softness 100 = max squash (0.50)

### Where It's Applied:
The softness affects **ALL collision types** in modes that have collisions:

1. **Ball-to-Wall** - when balls hit the edges
2. **Ball-to-Ball** - when balls collide with each other
3. **Ball-to-Ground** - when balls hit the floor
4. **Corner Collisions** - when balls hit rounded corners

### The Squash Effect:
```
Before Impact:    During Impact:    After:
     ●           ╭───────╮          ●
                 │   ●   │
                 ╰───────╯
   Round         Squashed        Bounces Back
```

The squash is **area-preserving**, meaning:
- If it squashes vertically, it stretches horizontally
- The ball maintains its visual mass
- It looks physically accurate

---

## Visual Examples

### Softness = 0 (Hard)
```
●  →  ●  →  ●
   BOUNCE
No deformation, just rotation
```

### Softness = 40 (Normal)
```
●  →  ⬭  →  ●
   BOUNCE
Slight squash, feels natural
```

### Softness = 100 (Squishy)
```
●  →  ▬  →  ●
   BOUNCE
Heavy squash, very elastic
```

---

## Which Modes Use Softness?

| Mode | Uses Softness? | Why? |
|------|---------------|------|
| **Ball Pit** | ✅ YES | Has wall + ball collisions |
| **Flies** | ✅ YES | Has wall collisions only |
| **Sparkle Trail** | ❌ NO | No collisions at all |
| **Weightless** | ✅ YES | Has wall + ball collisions |

**Note:** Even if a mode doesn't have ball-to-ball collisions, it can still show squash on wall impacts!

---

## Settings Persistence

Your softness setting is **automatically saved** to your browser's localStorage:
- Change the slider → waits 500ms → saves automatically
- Refresh the page → setting restored
- Works across sessions

---

## Performance Impact

**Negligible!** The squash calculation is very fast:
- Single function call per collision
- Simple multiplication: `0.20 × (softness / 40)`
- No performance difference between softness=0 and softness=100

---

## Summary

**Ball Softness = How Much Balls Deform On Impact**

- **0**: Rock hard, no squash (like billiard balls)
- **40**: Normal, natural looking (default)
- **100**: Super squishy (like stress balls)

**Global setting** → affects all modes with collisions
**Auto-saved** → persists across page refreshes
**Real-time** → changes apply immediately

Try it yourself! Adjust the slider and watch how the balls behave differently! 🎈
