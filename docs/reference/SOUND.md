# Sound Engine Documentation

## Overview

The sound engine provides **realistic collision sounds** using Web Audio API synthesis. Sounds are generated in real-time (not sampled) using a voice pool architecture optimized for performance.

**Design Philosophy:** Soft, organic impacts that respond to collision intensity. Soft touches are nearly silent; hard impacts are prominent but never harsh.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                             SOUND ENGINE                               │
├─────────────────────────────────────────────────────────────────────────┤
│  Voice Pool (8 voices)                                                  │
│    └─ Per collision:                                                    │
│         Oscillator (sine) → Filter (lowpass) → Envelope → Panner → Bus  │
│         Noise burst → Bandpass → Envelope → Panner (shared)             │
├─────────────────────────────────────────────────────────────────────────┤
│  Audio Graph                                                            │
│    Voices → Dry/Wet Split → Soft Clipper → High Shelf → Limiter → Out  │
│                    ↓                                                    │
│               Reverb (FDN)                                              │
├─────────────────────────────────────────────────────────────────────────┤
│  Rate Limiting                                                          │
│    └─ Global: max 200 sounds/sec                                        │
│    └─ Per-ball: 12ms debounce                                           │
│    └─ Energy threshold: 0.58 minimum intensity                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Key Concepts

### 1. Intensity-Driven Dynamics

The most important aspect of realistic sound: **collision intensity drives everything**.

```javascript
// Non-linear intensity curve
const gainShape = Math.pow(intensity, 1.5);
```

| Collision Intensity | Perceived Volume |
|---------------------|------------------|
| 100% (hard hit) | 100% |
| 50% (medium) | ~35% |
| 25% (soft) | ~12% |
| 10% (gentle) | ~3% |

This creates natural dynamics where soft touches are nearly inaudible and only hard impacts produce prominent sounds.

### 2. Timbre Responds to Intensity

**Darker baseline, brighter on hard hits:**

```javascript
// Filter opens with intensity
filterFreq = filterBaseFreq + filterVelocityRange * Math.pow(gainShape, 1.3);
```

- Soft hits: ~580 Hz (dark, muffled)
- Hard hits: ~980 Hz (brighter, more presence)

### 3. Noise Transient

The "snap" at the moment of impact:

- Only triggers on harder hits (`gainShape > 0.25`)
- Scales with intensity squared (`intensity^1.4`)
- Short bandpass-filtered noise burst (~8ms)
- Adds physical texture without being harsh

### 4. Micro-Variation

No two sounds are identical. Every parameter has random variance:

| Parameter | Variance |
|-----------|----------|
| Pitch | ±6% |
| Decay | ±20% |
| Gain | ±15% |
| Filter | ±18% |
| Transient | ±25% |

---

## Signal Chain

### Per-Voice Chain

```
[Oscillator] ─→ [Lowpass Filter] ─→ [Gain Envelope] ─→ [Stereo Panner] ─┬→ [Dry Bus]
                                                                        └→ [Reverb Send]
[Noise Source] ─→ [Bandpass Filter] ─→ [Gain Envelope] ─→ [Same Panner] ─┘
```

### Master Chain

```
[Dry Bus] ─────────────┬─→ [Soft Clipper] ─→ [High Shelf -6dB@2.2kHz] ─→ [Limiter] ─→ [Master Gain] ─→ [Output]
                       │
[Wet Bus] ─→ [Reverb] ─┘
```

---

## Anti-Harshness System

### High-Shelf EQ

Aggressive but smooth rolloff to prevent "clacky" sounds:

```javascript
highShelfFreq: 2200,  // Hz - rolloff starts here
highShelfGain: -6.0,  // dB - significant cut
```

### Tone Safety

Extreme frequencies get automatic attenuation:

```javascript
// High frequencies: reduce gain and brightness
toneSafetyHighGainAtten: 0.25,
toneSafetyHighBrightAtten: 0.45,

// Low frequencies: slight gain reduction
toneSafetyLowGainAtten: 0.06,
```

### Soft Clipper + Limiter

Prevents clipping on loud collisions:

```javascript
// Soft clipper (gentle saturation)
saturator.curve = makeSoftClipCurve(0.55);  // tanh-based

// Limiter (catches peaks)
limiter.threshold.value = -6;   // dB
limiter.ratio.value = 16;       // Hard limiting
limiter.attack.value = 0.0005;  // Fast attack catches transients
```

---

## Presets

### Available Presets

| Preset | Description | Character |
|--------|-------------|-----------|
| `woodenBeads` | **Default.** Ultra-soft, muted thuds (recommended) | Warm, muted |
| `organicImpact` | Soft thuds with intensity dynamics | Warm, natural |
| `glassMarbles` | Brighter, more resonant | Clear, glassy |
| `rubberBalls` | Longer decay, more bounce | Bouncy, playful |
| `metallicClick` | Sharper attack, brighter filter | Crisp, percussive |

### Preset Parameters

```javascript
// woodenBeads (default) — ultra-soft and muted
{
  filterBaseFreq: 420,
  filterVelocityRange: 200,
  noiseTransientGain: 0.025,
  decayTime: 0.095,
  intensityExponent: 1.7,
}

// organicImpact — warm, natural
{
  filterBaseFreq: 580,
  filterVelocityRange: 400,
  noiseTransientGain: 0.045,
  decayTime: 0.075,
  intensityExponent: 1.5,
}

// glassMarbles — clear, glassy
{
  filterBaseFreq: 850,
  filterVelocityRange: 600,
  noiseTransientGain: 0.065,
  decayTime: 0.055,
  intensityExponent: 1.3,
}

// woodenBeads — soft, muted
{
  filterBaseFreq: 420,
  filterVelocityRange: 200,
  noiseTransientGain: 0.025,
  decayTime: 0.095,
  intensityExponent: 1.7,
}

// rubberBalls — bouncy, playful
{
  filterBaseFreq: 520,
  filterVelocityRange: 350,
  noiseTransientGain: 0.035,
  decayTime: 0.120,
  intensityExponent: 1.4,
}

// metallicClick — crisp, percussive
{
  filterBaseFreq: 720,
  filterVelocityRange: 550,
  noiseTransientGain: 0.080,
  decayTime: 0.045,
  intensityExponent: 1.2,
}
```

---

## Performance

### O(1) Per Collision

Each collision sound is constant time:
- One `Math.pow()` for intensity curve
- One oscillator creation (lightweight)
- Parameter scheduling via Web Audio (native)

### Rate Limiting

Prevents CPU overload during chaotic scenes:

```javascript
GLOBAL_MIN_INTERVAL: 0.005,     // Max 200 sounds/sec total
minTimeBetweenSounds: 0.012,    // Per-ball debounce (12ms)
collisionMinImpact: 0.58,       // Ignore soft touches entirely
```

### Voice Pool

8 pre-allocated voices with stealing:
- Persistent filter/envelope/panner nodes (reused)
- Only oscillators created per-sound (lightweight)
- Oldest voice stolen if all busy (smooth crossfade)

### Memory

- Shared noise buffer (created once: 2 seconds of pink-ish noise)
- No allocations in hot path
- `lastSoundTime` Map cleaned periodically

---

## API Reference

### Initialization

```javascript
import { initSoundEngine, unlockAudio } from './audio/sound-engine.js';

// Call once at startup
initSoundEngine();

// Call from user gesture (click/tap)
await unlockAudio();
```

### Playing Sounds

```javascript
import { playCollisionSound } from './audio/sound-engine.js';

// Called automatically by Ball.walls() and collision.js
playCollisionSound(
  ballRadius,      // number: maps to pitch
  intensity,       // number 0-1: collision energy
  xPosition,       // number 0-1: stereo pan
  ballId           // string|number: for debouncing
);
```

### Control

```javascript
import { toggleSound, setSoundEnabled, getSoundState } from './audio/sound-engine.js';

toggleSound();          // Returns new state (boolean)
setSoundEnabled(false); // Explicit set
getSoundState();        // { isUnlocked, isEnabled, activeSounds, poolSize }
```

### Presets

```javascript
import { 
  SOUND_PRESETS, 
  applySoundPreset, 
  getCurrentPreset 
} from './audio/sound-engine.js';

// List available presets
Object.keys(SOUND_PRESETS);  // ['organicImpact', 'glassMarbles', ...]

// Apply a preset
applySoundPreset('glassMarbles');

// Get current preset name
getCurrentPreset();  // 'organicImpact'
```

### Runtime Tweaking

```javascript
import { getSoundConfig, updateSoundConfig } from './audio/sound-engine.js';

// Read current config
const config = getSoundConfig();

// Update specific parameters
updateSoundConfig({
  filterBaseFreq: 700,
  noiseTransientGain: 0.06,
});
```

---

## Ball Collision Integration

Sounds are triggered from two places:

### 1. Wall Collisions (`Ball.js`)

```javascript
// Floor
playCollisionSound(this.r, impact * 0.7, this.x / w, this._soundId);

// Ceiling  
playCollisionSound(this.r, impact * 0.7, this.x / w, this._soundId);

// Left/Right walls
playCollisionSound(this.r, impact * 0.6, xPosition, this._soundId);
```

### 2. Ball-to-Ball Collisions (`collision.js`)

```javascript
// Only on first solver iteration (prevents duplicates)
if (iter === 0) {
  const avgRadius = (A.r + B.r) / 2;
  const midX = (A.x + B.x) / 2;
  const xNormalized = midX / canvasWidth;
  const collisionId = `${i}-${j}`;
  playCollisionSound(avgRadius, impact, xNormalized, collisionId);
}
```

---

## Accessibility

### Reduced Motion

```javascript
// Checked on init and on preference change
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
if (motionQuery.matches) {
  // Sound is disabled entirely
  return;
}
```

### User Control

- Sound starts disabled until explicit user gesture (browser requirement)
- Enable/disable using the sound button in the panel (audio requires user gesture)
- State persisted to localStorage

---

## Browser Support

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome 66+ | ✅ Full | Best latency (~3ms) |
| Firefox 60+ | ✅ Full | Good latency (~5ms) |
| Safari 14.1+ | ✅ Full | Requires user gesture |
| Edge 79+ | ✅ Full | Chromium-based |
| Mobile Safari | ✅ Full | Requires tap to unlock |
| Mobile Chrome | ✅ Full | Requires tap to unlock |

---

## Troubleshooting

### No Sound

1. Check if unlocked: `getSoundState().isUnlocked`
2. Check if enabled: `getSoundState().isEnabled`
3. Check console for "Audio unlocked" message
4. Ensure user gesture triggered `unlockAudio()`

### Sounds Too Quiet

1. Increase `masterGain` in config
2. Lower `collisionMinImpact` threshold
3. Increase `maxGain`

### Sounds Too Harsh

1. Lower `highShelfFreq` (earlier rolloff)
2. Increase `highShelfGain` cut (more negative)
3. Lower `filterBaseFreq` and `filterVelocityRange`
4. Reduce `noiseTransientGain`

### Performance Issues

1. Reduce `VOICE_POOL_SIZE` (minimum 4)
2. Increase `GLOBAL_MIN_INTERVAL` (fewer sounds/sec)
3. Increase `collisionMinImpact` (ignore more soft hits)

---

## File Location

```
source/modules/audio/
├── sound-engine.js      # Core engine (645 lines)
└── sound-control-registry.js  # Panel controls binding
```

---

## Summary

The sound engine delivers realistic collision audio through:

1. **Intensity-driven dynamics** — soft touches silent, hard hits prominent
2. **Timbre variation** — darker baseline, brighter on impact
3. **Noise transients** — physical "snap" texture
4. **Micro-variation** — no two sounds identical
5. **Anti-harshness** — high shelf, soft clip, limiter
6. **Performance** — O(1) per collision, voice pooling, rate limiting

**Philosophy:** Sounds should enhance the physical feel without being distracting or harsh.

