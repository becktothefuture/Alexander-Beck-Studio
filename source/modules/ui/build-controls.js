// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                             BUILD / SAVE CONFIG                              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';
import { getAllControls } from './control-registry.js';
import { getSoundConfig, getCurrentPreset } from '../audio/sound-engine.js';

export function setupBuildControls() {
  const btn = document.getElementById('saveRuntimeConfigBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const g = getGlobals();
    // Build a "complete" config snapshot that round-trips all panel settings.
    // - Includes all registered controls (mode + global sections)
    // - Includes canonical key aliases for compatibility (ballScale/sizeScale, repelSoft/repelSoftness)
    // - Includes sound preset + full soundConfig overrides
    const config = {};

    // 1) All registered controls → copy from state by stateKey
    try {
      const controls = getAllControls();
      for (const c of controls) {
        if (!c || !c.stateKey) continue;
        const v = g[c.stateKey];
        if (v === undefined) continue;
        config[c.stateKey] = v;
      }
    } catch (e) {}

    // 2) Canonical + legacy aliases (keep these stable)
    config.gravityMultiplier = g.gravityMultiplierPit;
    config.restitution = g.REST;
    config.friction = g.FRICTION;
    config.ballMass = g.ballMassKg;
    config.ballScale = g.sizeScale;
    config.sizeScale = g.sizeScale;
    config.sizeVariation = g.sizeVariation;
    config.repelSoft = g.repelSoft;
    config.repelSoftness = g.repelSoft;

    // 3) Explicitly include layout controls (not in registry)
    // Layout is vw-native (derived to px at runtime). Export vw keys as canonical.
    config.layoutViewportWidthPx = g.layoutViewportWidthPx || 0;
    config.containerBorderVw = g.containerBorderVw;
    config.simulationPaddingVw = g.simulationPaddingVw;
    config.contentPaddingVw = g.contentPaddingVw;
    config.contentPaddingHorizontalRatio = g.contentPaddingHorizontalRatio;
    config.wallRadiusVw = g.wallRadiusVw;
    config.wallThicknessVw = g.wallThicknessVw;
    // Minimum clamp targets (px)
    config.layoutMinContentPaddingPx = Math.max(0, Math.round(g.layoutMinContentPaddingPx ?? 0));
    config.layoutMinWallRadiusPx = Math.max(0, Math.round(g.layoutMinWallRadiusPx ?? 0));
    // Physics-only inset remains px.
    config.wallInset = g.wallInset;

    // 4) Sound (full round-trip)
    try {
      config.soundPreset = getCurrentPreset();
      config.soundConfig = getSoundConfig();
    } catch (e) {}

    // 4b) Browser / theme environment
    config.chromeHarmonyMode = g.chromeHarmonyMode;
    config.autoDarkModeEnabled = g.autoDarkModeEnabled;
    config.autoDarkNightStartHour = g.autoDarkNightStartHour;
    config.autoDarkNightEndHour = g.autoDarkNightEndHour;

    // 5) Stable housekeeping defaults
    config.enableLOD = false;
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    // This is the file you can drop in as `source/config/default-config.json` and rebuild.
    a.download = 'default-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
}


