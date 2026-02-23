// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         SCENE CHANGE SOUND (SFX)                             ║
// ║      Soft “pebble-like” tick on simulation change (bb:modeChanged event)     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';
import { playCollisionSound } from '../audio/sound-engine.js';

let enabled = false;

export function initSceneChangeSFX() {
  if (typeof window === 'undefined') return;
  if (enabled) return;
  enabled = true;

  window.addEventListener('bb:modeChanged', (e) => {
    const g = getGlobals();
    if (g?.sceneChangeSoundEnabled === false) return;

    const detail = e?.detail || {};
    const didChange = detail.prevMode && detail.mode && detail.prevMode !== detail.mode;
    if (!didChange) return;

    // “Pebble-like” = small radius, moderate intensity, centered pan.
    const radius = Number(g?.sceneChangeSoundRadius ?? 18);
    const intensity = Number(g?.sceneChangeSoundIntensity ?? 0.35);
    playCollisionSound(radius, intensity, 0.5, null);
  }, { passive: true });
}


