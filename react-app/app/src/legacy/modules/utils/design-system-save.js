import { getGlobals } from '../core/state.js';
import {
  buildSimulationAtmosphereConfigFromControlState,
  buildSimulationBodyMaterialConfigFromControlState,
  getAllControls,
} from '../ui/control-registry.js';
import { getSoundConfig, getCurrentPreset } from '../audio/sound-engine.js';
import { buildStudioShellPatch, buildStudioSurfaceSnapshot } from '../ui/studio-surface-controls.js';
import { getShellConfig } from '../visual/site-shell.js';
import { buildContactRippleSnapshot } from '../../../routes/contact/contactRippleConfig.js';
import { buildPlaygroundCanonicalSnapshot } from '../../../routes/playground/config/playgroundConfig.js';
import { loadDesignSystemConfig, normalizeDesignSystemConfig } from './design-config.js';

const CONFIG_ONLY_RUNTIME_KEYS = [
  'tensionLoomBallCount',
  'tensionLoomGridDensity',
  'tensionLoomMassMultiplier',
  'tensionLoomHomeStrength',
  'tensionLoomLinkStrength',
  'tensionLoomDragRadius',
  'tensionLoomDragStrength',
  'tensionLoomHoverRadius',
  'tensionLoomHoverStrength',
  'tensionLoomDamping',
  'tensionLoomMaxSpeed',
  'tensionLoomReleaseGain',
  'tensionLoomIdleWavePx',
  'tensionLoomPulseStrength',
  'tensionLoomPulseSpeed',
  'tensionLoomPulseWidth',
  'tensionLoomWarmupFrames',
];

function clone(value) {
  if (!value || typeof value !== 'object') return {};
  return JSON.parse(JSON.stringify(value));
}

export function buildRuntimeConfigSnapshot() {
  const g = getGlobals();
  const config = {};

  const controls = getAllControls();
  for (const control of controls) {
    if (!control?.stateKey) continue;
    if (
      control.designScope === 'shellTheme'
      || control.designScope === 'shellLayout'
      || control.designScope === 'simulationAtmosphere'
      || control.designScope === 'simulationBodyMaterial'
    ) continue;
    const value = g[control.stateKey];
    if (value === undefined) continue;
    config[control.stateKey] = value;
  }

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
  config.contentPaddingVw = g.contentPaddingVw;
  config.contentPaddingHorizontalRatio = g.contentPaddingHorizontalRatio;
  config.layoutMinContentPaddingPx = Math.max(0, Math.round(g.layoutMinContentPaddingPx ?? 0));

  config.soundPreset = getCurrentPreset();
  config.soundConfig = getSoundConfig();

  config.cornerShapeSquircleEnabled = g.cornerShapeSquircleEnabled !== false;
  config.enableLOD = false;

  for (const key of CONFIG_ONLY_RUNTIME_KEYS) {
    if (g[key] !== undefined) config[key] = g[key];
  }

  return config;
}

export function buildShellConfigSnapshot() {
  const baseShell = clone(getShellConfig());
  const studioSurface = buildStudioSurfaceSnapshot();
  const nextShell = buildStudioShellPatch(studioSurface, baseShell);
  const g = getGlobals();

  nextShell.theme = {
    ...(nextShell.theme || {}),
    wallBase: g.wallBase || nextShell.theme?.wallBase,
    quoteButtonColorLight: g.quoteButtonColorLight || nextShell.theme?.quoteButtonColorLight,
    quoteButtonColorDark: g.quoteButtonColorDark || nextShell.theme?.quoteButtonColorDark,
    siteFrame: g.frameColor || nextShell.theme?.siteFrame,
    chromeHarmonyMode: 'auto',
  };
  delete nextShell.theme.safariFrameLight;
  delete nextShell.theme.safariFrameDark;
  delete nextShell.theme.lockedHeaderLight;
  delete nextShell.theme.lockedHeaderDark;
  delete nextShell.theme.wallBaseLight;
  delete nextShell.theme.wallBaseDark;
  delete nextShell.theme.siteFrameLight;
  delete nextShell.theme.siteFrameDark;

  nextShell.layout = {
    ...(nextShell.layout || {}),
    frameInsetMobile: `${Math.max(0, Number(g.frameInsetMobilePx) || 10)}px`,
    frameInsetDesktop: `${Math.max(
      Number(g.frameInsetMobilePx) || 10,
      Number(g.frameInsetDesktopPx) || 16
    )}px`,
    frameRadiusMobile: `${Math.max(0, Number(g.frameRadiusMobilePx) || 32)}px`,
    frameRadiusDesktop: `${Math.max(
      Number(g.frameRadiusMobilePx) || 32,
      Number(g.frameRadiusDesktopPx) || 72
    )}px`,
  };
  delete nextShell.layout.frameInsetTablet;
  delete nextShell.layout.frameRadiusTablet;

  nextShell.surface = {
    ...(nextShell.surface || {}),
    simulationAtmosphere: buildSimulationAtmosphereConfigFromControlState(
      g,
      nextShell.surface?.simulationAtmosphere,
    ),
    simulationBodyMaterial: buildSimulationBodyMaterialConfigFromControlState(
      g,
      nextShell.surface?.simulationBodyMaterial,
    ),
  };
  return nextShell;
}

export async function buildDesignSystemSnapshot({
  runtimeSnapshot = null,
  shellSnapshot = null,
  portfolioSnapshot = null,
  contactSnapshot = null,
  playgroundSnapshot = null,
  cvSnapshot = null,
} = {}) {
  const base = normalizeDesignSystemConfig(await loadDesignSystemConfig());
  const nextRuntime = clone(runtimeSnapshot || buildRuntimeConfigSnapshot());

  return {
    ...base,
    runtime: nextRuntime,
    shell: clone(shellSnapshot || buildShellConfigSnapshot()),
    portfolio: portfolioSnapshot ? clone(portfolioSnapshot) : clone(base.portfolio),
    contact: clone(contactSnapshot || buildContactRippleSnapshot()),
    playground: buildPlaygroundCanonicalSnapshot(playgroundSnapshot || base.playground),
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
