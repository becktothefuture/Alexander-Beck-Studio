// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                                 PRESETS                                      ║
// ║          Physics, spawn, repeller and grid presets (subset)                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

export const PHYSICS_PRESETS = {
  rubberHeavy: { label: 'Rubber – Heavy', G: 1960, REST: 0.97, FRICTION: 0.0035, sizeScale: 1.2 },
  rubberPlayground: { label: 'Rubber – Playground', G: 1960, REST: 0.90, FRICTION: 0.0025, sizeScale: 1.2 }
};

export const GRID_PRESETS = {
  synchronized: { label: '✨ Synchronized Pulse', columns: 40, interval: 0.8, speed: 0.25, synch: 0.0, randomness: 0.1 },
  organic: { label: '🌿 Organic Flow', columns: 40, interval: 0.8, speed: 0.25, synch: 0.3, randomness: 0.4 },
  chaotic: { label: '⚡ Chaotic Dance', columns: 40, interval: 0.6, speed: 0.2, synch: 0.8, randomness: 0.8 }
};



