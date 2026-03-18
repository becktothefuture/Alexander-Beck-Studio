import { getGlobals } from '../core/state.js';
import { getAllControls } from '../ui/control-registry.js';
import { getSoundConfig, getCurrentPreset } from '../audio/sound-engine.js';
import { buildStudioRuntimePatch, buildStudioShellPatch, buildStudioSurfaceSnapshot } from '../ui/studio-surface-controls.js';
import { getShellConfig } from '../visual/site-shell.js';
import { loadDesignSystemConfig, normalizeDesignSystemConfig } from './design-config.js';

function clone(value) {
  if (!value || typeof value !== 'object') return {};
  return JSON.parse(JSON.stringify(value));
}

export function buildRuntimeConfigSnapshot() {
  const g = getGlobals();
  const config = {};

  try {
    const controls = getAllControls();
    for (const control of controls) {
      if (!control?.stateKey) continue;
      const value = g[control.stateKey];
      if (value === undefined) continue;
      config[control.stateKey] = value;
    }
  } catch (e) {}

  config.gravityMultiplier = g.gravityMultiplierPit;
  config.restitution = g.REST;
  config.friction = g.FRICTION;
  config.ballMass = g.ballMassKg;
  config.ballScale = g.sizeScale;
  config.sizeScale = g.sizeScale;
  config.sizeVariation = g.sizeVariation;
  config.repelSoft = g.repelSoft;
  config.repelSoftness = g.repelSoft;

  config.layoutViewportWidthPx = g.layoutViewportWidthPx || 0;
  config.containerBorderVw = g.containerBorderVw;
  config.simulationPaddingVw = g.simulationPaddingVw;
  config.contentPaddingVw = g.contentPaddingVw;
  config.contentPaddingHorizontalRatio = g.contentPaddingHorizontalRatio;
  config.wallRadiusVw = g.wallRadiusVw;
  config.wallThicknessVw = g.wallThicknessVw;
  config.wallThicknessMinPx = g.wallThicknessMinPx;
  config.wallThicknessMaxPx = g.wallThicknessMaxPx;
  config.layoutMinContentPaddingPx = Math.max(0, Math.round(g.layoutMinContentPaddingPx ?? 0));
  config.layoutMinWallRadiusPx = Math.max(0, Math.round(g.layoutMinWallRadiusPx ?? 0));
  config.wallInset = g.wallInset;

  try {
    config.soundPreset = getCurrentPreset();
    config.soundConfig = getSoundConfig();
  } catch (e) {}

  config.chromeHarmonyMode = g.chromeHarmonyMode;
  config.autoDarkModeEnabled = g.autoDarkModeEnabled;
  config.autoDarkNightStartHour = g.autoDarkNightStartHour;
  config.autoDarkNightEndHour = g.autoDarkNightEndHour;
  config.enableLOD = false;

  return buildStudioRuntimePatch(buildStudioSurfaceSnapshot(), config);
}

export function buildShellConfigSnapshot() {
  const baseShell = clone(getShellConfig());
  const studioSurface = buildStudioSurfaceSnapshot();
  return buildStudioShellPatch(studioSurface, baseShell);
}

export async function buildDesignSystemSnapshot({
  runtimeSnapshot = null,
  shellSnapshot = null,
  portfolioSnapshot = null,
  cvSnapshot = null,
} = {}) {
  const base = normalizeDesignSystemConfig(await loadDesignSystemConfig());
  const nextRuntime = {
    ...clone(base.runtime),
    ...clone(runtimeSnapshot || buildRuntimeConfigSnapshot()),
  };

  return {
    ...base,
    runtime: nextRuntime,
    shell: clone(shellSnapshot || buildShellConfigSnapshot()),
    portfolio: portfolioSnapshot ? clone(portfolioSnapshot) : clone(base.portfolio),
    cv: cvSnapshot ? clone(cvSnapshot) : clone(base.cv),
  };
}

export async function persistDesignSystemConfig(snapshot) {
  try {
    const response = await fetch('/api/design-system/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: snapshot }),
    });
    if (!response.ok) return false;
    return true;
  } catch (e) {
    return false;
  }
}

export function downloadDesignSystemConfig(snapshot) {
  const blob = new Blob([`${JSON.stringify(snapshot, null, 2)}\n`], { type: 'application/json' });
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = 'design-system.json';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(anchor.href);
}

export async function performDesignSystemSave(options = {}) {
  const snapshot = await buildDesignSystemSnapshot(options);
  const saved = await persistDesignSystemConfig(snapshot);

  if (!saved) {
    downloadDesignSystemConfig(snapshot);
  }

  return {
    snapshot,
    saved,
    downloaded: !saved,
  };
}
