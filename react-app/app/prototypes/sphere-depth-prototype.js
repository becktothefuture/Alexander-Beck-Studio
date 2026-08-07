import { withBasePath } from '../src/lib/base-path.js';
import {
  getSimulationPaletteSnapshot,
  startSimulationPaletteController,
  stopSimulationPaletteController,
  subscribeSimulationPalette,
} from '../src/palette/simulationPaletteController.js';
import {
  DAILY_FOCUS_DESIGN_SYSTEM_URL,
  loadDailyFocusJson,
  resolveDailyFocusTheme,
} from '../src/routes/daily-focus/dailyFocusTheme.js';
import {
  DEFAULT_FLOCK_OF_BIRDS_CONFIG,
  normalizeFlockOfBirdsConfig,
} from '../src/routes/flock-of-birds/flockOfBirdsControls.js';
import { createFlockOfBirdsRenderer } from '../src/routes/flock-of-birds/flockOfBirdsRenderer.js';
import { getGlobals, initState, setCanvas } from '../src/legacy/modules/core/state.js';
import { setupPointer } from '../src/legacy/modules/input/pointer.js';
import {
  disposeModeSystem,
  getForceApplicator,
  initModeSystem,
  setMode,
} from '../src/legacy/modules/modes/mode-controller.js';
import {
  render,
  setSimulationBodyMaterialRenderer,
} from '../src/legacy/modules/physics/engine.js';
import {
  appendPebbleBodyPath,
  getPebbleBodyRotation,
} from '../src/legacy/modules/visual/pebble-body.js';
import {
  disposeRendererListeners,
  getCanvas,
  getContext,
  resize,
  setForceRenderCallback,
  setupRenderer,
} from '../src/legacy/modules/rendering/renderer.js';
import {
  getPerformanceStatus,
  startMainLoop,
  stopMainLoop,
} from '../src/legacy/modules/rendering/loop.js';
import {
  clearSimulationBodyMaterialCache,
  drawClippedSimulationBodyMaterial,
  drawSimulationBodyMaterial,
  getSimulationBodyMaterialSprite,
  getSimulationBodyMaterialStats,
  prewarmSimulationBodyMaterial,
  setSimulationBodyMaterialConfig,
} from '../src/legacy/modules/rendering/materials/simulation-body-material.js';
import {
  DEFAULT_SIMULATION_BODY_MATERIAL_CONFIG,
  SIMULATION_BODY_MATERIAL_CACHE_DEBOUNCE_MS,
  SIMULATION_BODY_MATERIAL_REFERENCE_PROFILES,
} from '../src/legacy/modules/rendering/materials/simulation-body-material-config.js';
import { loadRuntimeConfig } from '../src/legacy/modules/utils/runtime-config.js';
import {
  getShellConfig,
  loadShellConfig,
} from '../src/legacy/modules/visual/site-shell.js';

const FLOCK_CONFIG_URL = withBasePath('/config/flock-of-birds-demo.json');
const DEFAULT_MATERIAL_PREVIEW_SCALE = 8;
const MATERIAL_CONFIG_STORAGE_KEY = 'sphere-depth-prototype:v2';
const LEGACY_MATERIAL_CONFIG_STORAGE_KEY = 'sphere-depth-prototype:v1';

const ENVIRONMENT_PROFILE_DEFAULTS = Object.freeze({
  light: Object.freeze({ ...DEFAULT_SIMULATION_BODY_MATERIAL_CONFIG.light }),
  dark: Object.freeze({ ...DEFAULT_SIMULATION_BODY_MATERIAL_CONFIG.dark }),
});

const PROFILE_CONTROL_IDS = new Set(Object.keys(ENVIRONMENT_PROFILE_DEFAULTS.light));

const SCENES = Object.freeze([
  {
    id: 'pit',
    mode: 'pit',
    name: 'Foundation / Pit',
    meta: 'Exact Home production runtime',
    interaction: 'Move / drag · push the packed surface',
  },
  {
    id: 'flock-of-birds',
    mode: null,
    name: 'Convergence / Flying Birds',
    meta: 'Exact route-backed production runtime',
    interaction: 'Move · split and steer the flock',
  },
  {
    id: 'water',
    mode: 'water',
    name: 'Flow / Water',
    meta: 'Exact Home production runtime',
    interaction: 'Move / drag · send pressure through the current',
  },
  {
    id: 'magnetic',
    mode: 'magnetic',
    name: 'Magnetic Field',
    meta: 'Exact Home production runtime',
    interaction: 'Hover · attract  /  press + drag · repel',
  },
]);

const SCENE_ALIASES = Object.freeze({
  flock: 'flock-of-birds',
  flow: 'water',
});

const CONTROL_GROUPS = Object.freeze([
  {
    title: 'Environment',
    open: true,
    controls: [
      {
        id: 'background',
        label: 'Lighting profile',
        type: 'select',
        options: [
          ['light', 'Light environment'],
          ['dark', 'Dark environment'],
        ],
      },
    ],
  },
  {
    title: 'Performance',
    open: true,
    controls: [
      {
        id: 'effectsEnabled',
        label: 'Sphere effects',
        type: 'checkbox',
      },
      {
        id: 'cacheDetailPx',
        label: 'Cache detail',
        type: 'select',
        numeric: true,
        options: [
          [24, '24 px · lean'],
          [32, '32 px · balanced'],
          [48, '48 px'],
        ],
      },
    ],
    metrics: [
      { id: 'prototype-metric-frame', label: 'Frame cost' },
      { id: 'prototype-metric-cache', label: 'Resident cache' },
      { id: 'prototype-metric-layers', label: 'Lighting work' },
    ],
    note: 'Five lighting cues flatten into one shared bitmap per palette colour. The 36ms rebuild debounce and direct sprite path are automatic.',
  },
  {
    title: 'Matte key light',
    open: true,
    controls: [
      { id: 'keyLevel', label: 'Key strength', type: 'range', min: 0, max: 1.5, step: 0.01 },
      { id: 'keyReach', label: 'Key reach', type: 'range', min: 0.5, max: 1.5, step: 0.01 },
    ],
  },
  {
    title: 'Ambient wrap',
    open: true,
    controls: [
      { id: 'ambientLevel', label: 'Ambient strength', type: 'range', min: 0, max: 1.5, step: 0.01 },
      { id: 'ambientReach', label: 'Ambient reach', type: 'range', min: 0.5, max: 1.5, step: 0.01 },
    ],
  },
  {
    title: 'Rim and bounce',
    open: true,
    controls: [
      { id: 'rimBounceLevel', label: 'Rim + bounce', type: 'range', min: 0, max: 1.5, step: 0.01 },
      { id: 'rimBounceReach', label: 'Rim reach', type: 'range', min: 0.5, max: 1.5, step: 0.01 },
    ],
  },
  {
    title: 'Shadow form',
    open: true,
    controls: [
      { id: 'shadowDepth', label: 'Shadow depth', type: 'range', min: 0, max: 1.5, step: 0.01 },
      { id: 'shadowArea', label: 'Shadow area', type: 'range', min: 0.5, max: 1.5, step: 0.01 },
    ],
  },
]);

const state = {
  scene: 'pit',
  background: 'light',
  effectsEnabled: true,
  cacheDetailPx: DEFAULT_SIMULATION_BODY_MATERIAL_CONFIG.cacheDetailPx,
  ...ENVIRONMENT_PROFILE_DEFAULTS.light,
};

const environmentProfiles = {
  light: { ...ENVIRONMENT_PROFILE_DEFAULTS.light },
  dark: { ...ENVIRONMENT_PROFILE_DEFAULTS.dark },
};

const controlsRoot = document.querySelector('#prototype-controls');
const profileLabel = document.querySelector('#prototype-profile-label');
const saveButton = document.querySelector('#prototype-save');
const resetButton = document.querySelector('#prototype-reset');
const collapseButton = document.querySelector('#prototype-collapse');
const previousButton = document.querySelector('#prototype-previous');
const nextButton = document.querySelector('#prototype-next');
const sceneLabel = document.querySelector('#prototype-scene-label');
const sceneMeta = document.querySelector('#prototype-scene-meta');
const eyebrow = document.querySelector('#prototype-eyebrow');
const description = document.querySelector('#prototype-description');
const interactionLabel = document.querySelector('#prototype-interaction');
const perfLabel = document.querySelector('#prototype-perf');
const materialPreviewCanvas = document.querySelector('#prototype-material-preview');
const previewColourLabel = document.querySelector('#prototype-preview-colour');
const previewScaleSelect = document.querySelector('#prototype-preview-scale');
const stage = document.querySelector('.prototype-stage');
const legacyCanvas = document.querySelector('#c');
const flockCanvas = document.querySelector('#flock-of-birds-canvas');
const simulationHost = document.querySelector('#simulations');

let runtimeReady = false;
let activeSceneId = 'pit';
let sceneChangeToken = 0;
let designSystem = null;
let flockConfig = DEFAULT_FLOCK_OF_BIRDS_CONFIG;
let flockTheme = null;
let flockRenderer = null;
let unregisterMaterialRenderer = null;
let unsubscribePalette = null;
let metricTimer = 0;
let cacheInvalidationTimer = 0;
let materialPreviewFrame = 0;
let saveFeedbackTimer = 0;
let materialPreviewScale = DEFAULT_MATERIAL_PREVIEW_SCALE;
let performanceModeChangedAt = performance.now();
let resolveReady;

const ready = new Promise((resolve) => {
  resolveReady = resolve;
});

window.__SPHERE_DEPTH_PROTOTYPE__ = Object.freeze({
  ready,
  getSnapshot,
  setScene: (sceneId) => selectScene(sceneId),
  setEnvironment: (background) => switchEnvironment(background),
  setEffectsEnabled: (enabled) => setEffectsEnabled(enabled),
  saveConfig: saveMaterialConfig,
  resetMaterial,
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatValue(control, value) {
  if (control.type === 'select') {
    return control.options.find(([optionValue]) => String(optionValue) === String(value))?.[1] || String(value);
  }
  const numeric = Number(value);
  if (control.signed) return `${numeric >= 0 ? '+' : ''}${numeric.toFixed(2)}`;
  return `${Math.round(numeric * 100)}%`;
}

function normalizeSceneId(value) {
  const requested = SCENE_ALIASES[value] || value;
  return SCENES.some((scene) => scene.id === requested) ? requested : 'pit';
}

function getScene(sceneId = activeSceneId) {
  return SCENES.find((scene) => scene.id === sceneId) || SCENES[0];
}

function readInitialUrlState() {
  const params = new URL(window.location.href).searchParams;
  state.scene = normalizeSceneId(params.get('scene') || 'pit');
  activeSceneId = state.scene;
  state.background = params.get('background') === 'dark' ? 'dark' : 'light';
  Object.assign(state, environmentProfiles[state.background]);
}

function loadSavedMaterialConfig() {
  try {
    let saved = JSON.parse(window.localStorage.getItem(MATERIAL_CONFIG_STORAGE_KEY) || 'null');
    let migrated = false;
    if (!saved) {
      const legacy = JSON.parse(
        window.localStorage.getItem(LEGACY_MATERIAL_CONFIG_STORAGE_KEY) || 'null',
      );
      if (legacy?.version === 1) {
        const migrateProfile = (profile, reference) => {
          const safeRatio = (value, baseline) => (
            Number.isFinite(Number(value)) && baseline > 0 ? Number(value) / baseline : 1
          );
          return {
            keyLevel: clamp(safeRatio(profile?.keyStrength, reference.keyStrength), 0, 1.5),
            keyReach: clamp(safeRatio(profile?.keySpread, reference.keySpread), 0.5, 1.5),
            ambientLevel: clamp(safeRatio(profile?.ambientStrength, reference.ambientStrength), 0, 1.5),
            ambientReach: clamp(safeRatio(profile?.ambientCoverage, reference.ambientCoverage), 0.5, 1.5),
            rimBounceLevel: clamp(
              (safeRatio(profile?.rimLightStrength, reference.rimLightStrength)
                + safeRatio(profile?.bounceStrength, reference.bounceStrength)) * 0.5,
              0,
              1.5,
            ),
            rimBounceReach: clamp(safeRatio(profile?.rimWidth, reference.rimWidth), 0.5, 1.5),
            shadowDepth: clamp(
              (safeRatio(profile?.shadowStrength, reference.shadowStrength)
                + safeRatio(profile?.edgeShadowStrength, reference.edgeShadowStrength)) * 0.5,
              0,
              1.5,
            ),
            shadowArea: 1,
          };
        };
        const legacyDetail = Number(legacy.spriteDetail);
        saved = {
          version: 2,
          profiles: {
            light: migrateProfile(legacy.profiles?.light, SIMULATION_BODY_MATERIAL_REFERENCE_PROFILES.light),
            dark: migrateProfile(legacy.profiles?.dark, SIMULATION_BODY_MATERIAL_REFERENCE_PROFILES.dark),
          },
          cacheDetailPx: legacyDetail <= 24 ? 24 : legacyDetail <= 32 ? 32 : 48,
          effectsEnabled: legacy.effectsEnabled !== false,
          previewScale: legacy.previewScale === 10 ? 10 : 8,
        };
        migrated = true;
      }
    }
    if (!saved || saved.version !== 2) return;
    for (const environment of ['light', 'dark']) {
      const savedProfile = saved.profiles?.[environment];
      if (!savedProfile || typeof savedProfile !== 'object') continue;
      for (const controlId of PROFILE_CONTROL_IDS) {
        const value = Number(savedProfile[controlId]);
        if (Number.isFinite(value)) environmentProfiles[environment][controlId] = value;
      }
    }
    const savedDetail = Number(saved.cacheDetailPx);
    if ([24, 32, 48].includes(savedDetail)) state.cacheDetailPx = savedDetail;
    if (typeof saved.effectsEnabled === 'boolean') state.effectsEnabled = saved.effectsEnabled;
    materialPreviewScale = saved.previewScale === 10 ? 10 : 8;
    previewScaleSelect.value = String(materialPreviewScale);
    if (migrated) window.localStorage.setItem(MATERIAL_CONFIG_STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // A malformed prototype save falls back to the authored defaults.
  }
}

function updateUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete('variant');
  url.searchParams.delete('pause');
  url.searchParams.set('scene', activeSceneId);
  url.searchParams.set('background', state.background);
  window.history.replaceState({}, '', url);
}

function createControlRow(control) {
  const row = document.createElement('label');
  row.className = `parameterizer-row${control.type !== 'range' ? ' parameterizer-row--wide' : ''}`;
  row.dataset.controlId = control.id;

  const label = document.createElement('span');
  label.className = 'parameterizer-label';
  label.textContent = control.label;
  row.append(label);

  const input = document.createElement(control.type === 'select' ? 'select' : 'input');
  input.className = 'parameterizer-control';
  input.dataset.controlInput = control.id;

  if (control.type === 'select') {
    for (const [optionValue, optionLabel] of control.options) {
      const option = document.createElement('option');
      option.value = String(optionValue);
      option.textContent = optionLabel;
      input.append(option);
    }
  } else if (control.type === 'checkbox') {
    input.type = 'checkbox';
  } else {
    input.type = 'range';
    input.min = String(control.min);
    input.max = String(control.max);
    input.step = String(control.step);
  }

  if (control.type === 'checkbox') input.checked = Boolean(state[control.id]);
  else input.value = String(state[control.id]);
  input.addEventListener('input', () => {
    const nextValue = control.type === 'checkbox'
      ? input.checked
      : control.type === 'select' && !control.numeric
        ? input.value
        : Number(input.value);
    if (control.id === 'background') {
      switchEnvironment(nextValue);
      return;
    }
    state[control.id] = nextValue;
    if (PROFILE_CONTROL_IDS.has(control.id)) {
      environmentProfiles[state.background][control.id] = nextValue;
    }
    const output = row.querySelector('.parameterizer-value');
    if (output) output.textContent = formatValue(control, nextValue);
    if (control.id === 'effectsEnabled') {
      setEffectsEnabled(nextValue);
      return;
    }
    scheduleCacheInvalidation();
  });
  row.append(input);

  if (control.type === 'range') {
    const output = document.createElement('output');
    output.className = 'parameterizer-value';
    output.textContent = formatValue(control, state[control.id]);
    row.append(output);
  }

  return row;
}

function createControlPanel() {
  const fragment = document.createDocumentFragment();
  for (const group of CONTROL_GROUPS) {
    const folder = document.createElement('details');
    folder.className = 'parameterizer-folder';
    folder.open = group.open;

    const summary = document.createElement('summary');
    summary.className = 'parameterizer-folder-title';
    summary.textContent = group.title;
    folder.append(summary);

    for (const control of group.controls) {
      folder.append(createControlRow(control));
    }
    if (group.metrics) {
      const metrics = document.createElement('dl');
      metrics.className = 'parameterizer-metrics';
      for (const metric of group.metrics) {
        const label = document.createElement('dt');
        label.textContent = metric.label;
        const value = document.createElement('dd');
        value.id = metric.id;
        value.textContent = '—';
        metrics.append(label, value);
      }
      folder.append(metrics);
    }
    if (group.note) {
      const note = document.createElement('p');
      note.className = 'parameterizer-note';
      note.textContent = group.note;
      folder.append(note);
    }
    fragment.append(folder);
  }
  controlsRoot.replaceChildren(fragment);
}

function syncControlPanel() {
  for (const group of CONTROL_GROUPS) {
    for (const control of group.controls) {
      const input = controlsRoot.querySelector(`[data-control-input="${control.id}"]`);
      if (input && control.type === 'checkbox') input.checked = Boolean(state[control.id]);
      else if (input) input.value = String(state[control.id]);
      const output = controlsRoot
        .querySelector(`[data-control-id="${control.id}"] .parameterizer-value`);
      if (output) output.textContent = formatValue(control, state[control.id]);
    }
  }
  profileLabel.textContent = `${state.background === 'dark' ? 'Dark' : 'Light'} environment · material only`;
}

function saveActiveProfile() {
  for (const controlId of PROFILE_CONTROL_IDS) {
    environmentProfiles[state.background][controlId] = state[controlId];
  }
}

function getPrototypeMaterialConfig() {
  saveActiveProfile();
  return {
    enabled: Boolean(state.effectsEnabled),
    cacheDetailPx: Number(state.cacheDetailPx),
    light: { ...environmentProfiles.light },
    dark: { ...environmentProfiles.dark },
  };
}

function switchEnvironment(requestedBackground) {
  const nextBackground = requestedBackground === 'dark' ? 'dark' : 'light';
  if (nextBackground !== state.background) {
    saveActiveProfile();
    state.background = nextBackground;
    Object.assign(state, environmentProfiles[nextBackground]);
  }
  applyEnvironment();
  syncControlPanel();
  invalidateMaterialCache();
  updateUrl();
  return getSnapshot();
}

function resetMaterial() {
  Object.assign(environmentProfiles[state.background], ENVIRONMENT_PROFILE_DEFAULTS[state.background]);
  Object.assign(state, ENVIRONMENT_PROFILE_DEFAULTS[state.background]);
  state.cacheDetailPx = DEFAULT_SIMULATION_BODY_MATERIAL_CONFIG.cacheDetailPx;
  syncControlPanel();
  invalidateMaterialCache();
  return getSnapshot();
}

function saveMaterialConfig() {
  saveActiveProfile();
  const savedConfig = {
    version: 2,
    profiles: {
      light: { ...environmentProfiles.light },
      dark: { ...environmentProfiles.dark },
    },
    cacheDetailPx: Number(state.cacheDetailPx),
    effectsEnabled: Boolean(state.effectsEnabled),
    previewScale: materialPreviewScale,
  };
  try {
    window.localStorage.setItem(MATERIAL_CONFIG_STORAGE_KEY, JSON.stringify(savedConfig));
    window.clearTimeout(saveFeedbackTimer);
    saveButton.textContent = 'Saved';
    saveButton.title = 'Prototype material config saved locally';
    saveFeedbackTimer = window.setTimeout(() => {
      saveButton.textContent = 'Save';
      saveButton.title = 'Save prototype material config';
    }, 1200);
    return true;
  } catch {
    saveButton.textContent = 'Failed';
    saveButton.title = 'Could not save prototype material config';
    return false;
  }
}

function scheduleCacheInvalidation() {
  window.clearTimeout(cacheInvalidationTimer);
  cacheInvalidationTimer = window.setTimeout(
    invalidateMaterialCache,
    SIMULATION_BODY_MATERIAL_CACHE_DEBOUNCE_MS,
  );
}

function invalidateMaterialCache() {
  window.clearTimeout(cacheInvalidationTimer);
  cacheInvalidationTimer = 0;
  setSimulationBodyMaterialConfig(getPrototypeMaterialConfig());
  clearSimulationBodyMaterialCache();
  resetPerformanceMeasurementWindow();
  prewarmActiveMaterialCache();
  if (activeSceneId === 'flock-of-birds') flockRenderer?.renderOnce();
  else if (runtimeReady) render();
  drawMaterialPreview();
}

function resetPerformanceMeasurementWindow() {
  performanceModeChangedAt = performance.now();
  const globals = getGlobals();
  globals.pitPerfStore = null;
  globals.pitPerfSummary = null;
}

function syncLegacyMaterialRenderer() {
  unregisterMaterialRenderer?.();
  unregisterMaterialRenderer = null;
  setSimulationBodyMaterialRenderer(null);
  if (state.effectsEnabled && activeSceneId !== 'flock-of-birds') {
    unregisterMaterialRenderer = setSimulationBodyMaterialRenderer(drawProductionBodyMaterial);
  }
}

function renderCurrentMaterialFrame() {
  if (!runtimeReady) {
    drawMaterialPreview();
    return;
  }
  if (activeSceneId === 'flock-of-birds') flockRenderer?.renderOnce();
  else render();
  drawMaterialPreview();
}

function setEffectsEnabled(enabled) {
  state.effectsEnabled = Boolean(enabled);
  setSimulationBodyMaterialConfig(getPrototypeMaterialConfig());
  syncLegacyMaterialRenderer();
  resetPerformanceMeasurementWindow();
  syncControlPanel();
  prewarmActiveMaterialCache();
  if (runtimeReady && activeSceneId === 'flock-of-birds') {
    selectScene(activeSceneId);
  } else {
    renderCurrentMaterialFrame();
    updateMetrics();
  }
  return getSnapshot();
}

function parseCssColor(value) {
  const source = String(value || '').trim();
  const shortHex = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(source);
  if (shortHex) {
    return shortHex.slice(1).map((channel) => Number.parseInt(`${channel}${channel}`, 16));
  }
  const longHex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(source);
  if (longHex) return longHex.slice(1).map((channel) => Number.parseInt(channel, 16));
  const rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(source);
  if (rgb) return rgb.slice(1, 4).map((channel) => clamp(Math.round(Number(channel)), 0, 255));
  return [128, 128, 128];
}

function getActiveMaterialColours() {
  const globals = getGlobals();
  const source = activeSceneId === 'flock-of-birds'
    ? Array.isArray(flockTheme?.palette)
      ? flockTheme.palette
      : getSimulationPaletteSnapshot()?.colors || []
    : Array.isArray(globals.balls)
      ? globals.balls.map((ball) => ball?.color)
      : [];
  return [...new Set(source.map((color) => String(color || '').trim()).filter(Boolean))];
}

function prewarmActiveMaterialCache() {
  if (!runtimeReady || !state.effectsEnabled) return;
  prewarmSimulationBodyMaterial(getActiveMaterialColours(), { theme: state.background });
}
function getPreviewBallSample() {
  const globals = getGlobals();
  const balls = Array.isArray(globals.balls) ? globals.balls : [];
  const palette = Array.isArray(flockTheme?.palette) && flockTheme.palette.length > 0
    ? flockTheme.palette
    : getSimulationPaletteSnapshot()?.colors || [];
  const seenColors = new Set();
  let color = null;
  let selectedBall = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  const consider = (candidateColor, ball = null) => {
    const normalizedColor = String(candidateColor || '').trim();
    if (!normalizedColor || seenColors.has(normalizedColor)) return;
    seenColors.add(normalizedColor);
    const [red, green, blue] = parseCssColor(normalizedColor);
    const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);
    const warmBias = Math.max(0, red + green * 0.72 - blue * 1.15);
    const score = chroma * 2 + warmBias * 0.28;
    if (score > bestScore) {
      bestScore = score;
      color = normalizedColor;
      selectedBall = ball;
    }
  };

  if (activeSceneId === 'flock-of-birds') {
    for (const paletteColor of palette) consider(paletteColor);
  } else {
    for (const ball of balls) consider(ball?.color, ball);
  }
  if (!color) {
    for (const paletteColor of palette) consider(paletteColor);
  }

  const canvasBounds = legacyCanvas.getBoundingClientRect();
  const backingScale = canvasBounds.width > 0
    ? legacyCanvas.width / canvasBounds.width
    : Math.max(1, Number(globals.DPR) || 1);
  const displayRadius = typeof selectedBall?.getDisplayRadius === 'function'
    ? selectedBall.getDisplayRadius() / Math.max(1, backingScale)
    : Number(flockTheme?.homeSimulationBodyRadiusPx) || 10.4;
  return {
    color: color || '#f3aa24',
    radius: clamp(Number.isFinite(displayRadius) ? displayRadius : 10.4, 1, 24),
  };
}

function drawMaterialPreview() {
  if (!materialPreviewCanvas || document.body.dataset.panelCollapsed === 'true') return;
  const bounds = materialPreviewCanvas.getBoundingClientRect();
  if (bounds.width <= 1 || bounds.height <= 1) return;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const backingWidth = Math.max(1, Math.round(bounds.width * dpr));
  const backingHeight = Math.max(1, Math.round(bounds.height * dpr));
  if (materialPreviewCanvas.width !== backingWidth) materialPreviewCanvas.width = backingWidth;
  if (materialPreviewCanvas.height !== backingHeight) materialPreviewCanvas.height = backingHeight;

  const ctx = materialPreviewCanvas.getContext('2d', { alpha: false });
  const sample = getPreviewBallSample();
  const diameter = sample.radius * 2 * materialPreviewScale;
  const x = (bounds.width - diameter) * 0.5;
  const y = (bounds.height - diameter) * 0.5;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = stage.style.background || (state.background === 'dark' ? '#202020' : '#efefef');
  ctx.fillRect(0, 0, bounds.width, bounds.height);
  if (state.effectsEnabled) {
    ctx.imageSmoothingEnabled = true;
    const sprite = getSimulationBodyMaterialSprite(sample.color, { theme: state.background });
    if (sprite) ctx.drawImage(sprite.canvas, x, y, diameter, diameter);
  } else {
    ctx.fillStyle = sample.color;
    ctx.beginPath();
    ctx.arc(bounds.width * 0.5, bounds.height * 0.5, diameter * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  previewColourLabel.textContent = sample.color.toUpperCase();
  materialPreviewCanvas.dataset.previewDiameter = diameter.toFixed(2);
  materialPreviewCanvas.dataset.previewScale = String(materialPreviewScale);
  materialPreviewCanvas.setAttribute(
    'aria-label',
    `${sample.color} production ball shown at ${materialPreviewScale} times its normal size`,
  );
}

function scheduleMaterialPreview() {
  window.cancelAnimationFrame(materialPreviewFrame);
  materialPreviewFrame = window.requestAnimationFrame(() => {
    materialPreviewFrame = 0;
    drawMaterialPreview();
  });
}

function appendProductionBodyPath(ctx, ball, radius, globals, simpleCircle, squashThreshold) {
  ctx.beginPath();
  if (simpleCircle) {
    ctx.arc(ball.x, ball.y, radius, 0, Math.PI * 2);
    return;
  }

  ctx.save();
  ctx.translate(ball.x, ball.y);
  if (ball.squashAmount > squashThreshold) {
    ctx.rotate(ball.theta + ball.squashNormalAngle);
    ctx.scale(
      1 - ball.squashAmount * 0.3,
      1 + ball.squashAmount * 0.3,
    );
    ctx.rotate(-ball.squashNormalAngle);
  } else {
    const rotation = getPebbleBodyRotation(ball);
    if (rotation !== 0) ctx.rotate(rotation);
  }
  appendPebbleBodyPath(ctx, ball, radius, globals);
  ctx.restore();
}

function drawProductionBodyMaterial(ctx, ball, radius, globals, simpleCircle, squashThreshold) {
  if (simpleCircle) {
    drawSimulationBodyMaterial(ctx, ball.color, ball.x, ball.y, radius, state.background);
    return;
  }
  drawClippedSimulationBodyMaterial(
    ctx,
    ball.color,
    ball.x,
    ball.y,
    radius,
    (pathContext) => appendProductionBodyPath(
      pathContext,
      ball,
      radius,
      globals,
      false,
      squashThreshold,
    ),
    state.background,
  );
}

function drawFlockBodyMaterial(ctx, x, y, radius, color) {
  drawSimulationBodyMaterial(ctx, color, x, y, radius, state.background);
}
function applyEnvironment() {
  document.body.dataset.background = state.background;
  document.documentElement.style.colorScheme = state.background;
  const snapshot = getSimulationPaletteSnapshot();
  flockTheme = resolveDailyFocusTheme(designSystem, state.background === 'dark', snapshot);
  const background = flockTheme?.active || (state.background === 'dark' ? '#202020' : '#efefef');
  document.body.style.background = background;
  stage.style.background = background;

  const globals = getGlobals();
  globals.isDarkMode = state.background === 'dark';
  simulationHost.classList.toggle('dark-mode', globals.isDarkMode);
  if (flockRenderer && activeSceneId === 'flock-of-birds') flockRenderer.start();
}

function applyHomeHeroRuntimeConfig() {
  const globals = getGlobals();
  const hero = getShellConfig()?.hero || {};
  globals.homeHeroKeepClear = {
    enabled: true,
    centerWidthRatio: Number(hero.centerKeepClearWidthRatio),
    centerHeightRatio: Number(hero.centerKeepClearHeightRatio),
    navWidthRatio: Number(hero.navKeepClearWidthRatio),
    navHeightRatio: Number(hero.navKeepClearHeightRatio),
    navOffsetRatio: Number(hero.navKeepClearOffsetRatio),
    force: Number(hero.centerKeepClearForce),
    spawnBiasX: Number(hero.pitSpawnBiasX),
    spawnBandWidthRatio: Number(hero.pitSpawnBandWidthRatio),
  };
}

function updateSceneLabels() {
  const scene = getScene();
  sceneLabel.textContent = scene.name;
  sceneMeta.textContent = scene.meta;
  interactionLabel.textContent = scene.interaction;
  description.textContent = state.background === 'dark'
    ? 'A fixed matte key meets a saturated terminator, sparse opposing fill, deep edge occlusion, and a restrained room reflection.'
    : 'Broad sky and opposing fill wrap the matte form while a coloured terminator, softbox band, rim, and warm bounce locate it in the bright room.';
}

async function selectScene(requestedSceneId) {
  const nextSceneId = normalizeSceneId(requestedSceneId);
  const token = ++sceneChangeToken;
  activeSceneId = nextSceneId;
  state.scene = nextSceneId;
  resetPerformanceMeasurementWindow();
  if (runtimeReady) syncLegacyMaterialRenderer();
  updateSceneLabels();
  updateUrl();
  if (!runtimeReady) return getSnapshot();

  stopMainLoop();
  flockRenderer?.destroy();
  flockRenderer = null;
  if (token !== sceneChangeToken) return getSnapshot();

  if (nextSceneId === 'flock-of-birds') {
    legacyCanvas.hidden = true;
    flockCanvas.hidden = false;
    prewarmActiveMaterialCache();
    flockRenderer = createFlockOfBirdsRenderer({
      canvas: flockCanvas,
      getConfig: () => flockConfig,
      getTheme: () => flockTheme,
      renderBody: state.effectsEnabled ? drawFlockBodyMaterial : null,
      reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true,
      transparentBackground: true,
      useHomeSimulationBodyRadius: true,
    });
    flockRenderer.start();
  } else {
    flockCanvas.hidden = true;
    legacyCanvas.hidden = false;
    const scene = getScene(nextSceneId);
    const didSetMode = await setMode(scene.mode);
    if (token !== sceneChangeToken || !didSetMode) return getSnapshot();
    prewarmActiveMaterialCache();
    startMainLoop(null, { getForcesFn: getForceApplicator });
  }

  drawMaterialPreview();
  updateMetrics();
  return getSnapshot();
}

function cycleScene(direction) {
  const currentIndex = SCENES.findIndex((scene) => scene.id === activeSceneId);
  const nextIndex = (currentIndex + direction + SCENES.length) % SCENES.length;
  selectScene(SCENES[nextIndex].id);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KiB`;
  return `${(bytes / (1024 ** 2)).toFixed(2)} MiB`;
}

function getMaterialCostSample(snapshot) {
  const elapsed = performance.now() - performanceModeChangedAt;
  if (activeSceneId === 'flock-of-birds') {
    const frameMs = Number(snapshot.simulation?.lastFrameMs || 0);
    return {
      ready: elapsed >= 750 && frameMs > 0,
      value: frameMs,
      label: 'frame',
      warming: `${Math.min(100, Math.round(elapsed / 7.5))}% warm`,
    };
  }

  if (activeSceneId === 'pit') {
    const pitSummary = getGlobals().pitPerfSummary;
    const sampleCount = Number(pitSummary?.sampleCount || 0);
    return {
      ready: sampleCount >= 30 && Number(pitSummary?.renderP95Ms) > 0,
      value: Number(pitSummary?.renderP95Ms || 0),
      label: 'render p95',
      warming: `${Math.min(sampleCount, 30)}/30 frames`,
    };
  }

  return {
    ready: false,
    value: 0,
    label: 'cadence',
    warming: 'Use Pit or Birds',
  };
}

function setMetricValue(id, value) {
  const element = document.querySelector(`#${id}`);
  if (element) element.textContent = value;
}

function updatePerformancePanel(snapshot, fps) {
  const materialStats = getSimulationBodyMaterialStats();
  const sample = getMaterialCostSample(snapshot);
  const cacheBytes = materialStats.spriteCount * state.cacheDetailPx ** 2 * 4;

  const measuredFps = activeSceneId === 'flock-of-birds'
    ? `${Math.round(Number(snapshot.simulation?.targetFps || fps))}fps target`
    : `${Math.round(fps)}fps`;
  setMetricValue(
    'prototype-metric-frame',
    sample.ready
      ? `${measuredFps} · ${sample.value.toFixed(2)}ms ${sample.label}`
      : `${measuredFps} · ${sample.warming}`,
  );

  setMetricValue('prototype-metric-layers', '5 cues → 1 bitmap · 0/frame');
  setMetricValue(
    'prototype-metric-cache',
    state.effectsEnabled
      ? `${materialStats.spriteCount} stickers · ≈${formatBytes(cacheBytes)} · ${materialStats.bakeMs.toFixed(1)}ms bake`
      : cacheBytes > 0
        ? `Off · ${materialStats.spriteCount} retained`
        : 'Off · no active cache',
  );
}

function getSnapshot() {
  const globals = getGlobals();
  const flockMetrics = flockRenderer?.getMetrics() || null;
  const legacyPerformance = getPerformanceStatus();
  const materialStats = getSimulationBodyMaterialStats();
  return {
    ready: runtimeReady,
    productionRuntime: true,
    materialOnlyControls: true,
    scene: activeSceneId,
    environment: state.background,
    bodyCount: activeSceneId === 'flock-of-birds'
      ? Number(flockMetrics?.birdCount || 0)
      : Number(globals.balls?.length || 0),
    simulation: activeSceneId === 'flock-of-birds'
      ? flockMetrics
      : {
          mode: globals.currentMode,
          fps: legacyPerformance.avgFPS,
          targetFps: legacyPerformance.targetFPS,
          throttleLevel: legacyPerformance.adaptiveThrottleLevel,
        },
    material: {
      profile: state.background,
      effectsEnabled: state.effectsEnabled,
      spriteFastPath: true,
      cachedColors: materialStats.spriteCount,
      cacheBuildCount: materialStats.bakeCount,
      cacheBuildMs: materialStats.bakeMs,
      cacheCanvasCount: materialStats.spriteCount,
      cacheColourParseCount: materialStats.colourParseCount,
      cachePrewarmBuildCount: materialStats.bakeCount,
      cacheAliasCount: materialStats.colourAliasCount,
      cacheDetailPx: state.cacheDetailPx,
      cacheDebounceMs: SIMULATION_BODY_MATERIAL_CACHE_DEBOUNCE_MS,
      values: Object.fromEntries([...PROFILE_CONTROL_IDS].map((key) => [key, state[key]])),
    },
    controlIds: CONTROL_GROUPS.flatMap((group) => group.controls.map((control) => control.id)),
  };
}

function updateMetrics() {
  const snapshot = getSnapshot();
  const simulation = snapshot.simulation || {};
  const fps = activeSceneId === 'flock-of-birds'
    ? Number(simulation.targetFps || 60)
    : Number(simulation.fps || 0);
  eyebrow.textContent = `${getScene().name} · ${snapshot.bodyCount} production bodies`;
  updatePerformancePanel(snapshot, fps);
  perfLabel.textContent = state.effectsEnabled
    ? `${Math.round(fps)} fps · ${snapshot.material.cacheCanvasCount} resident stickers · ${snapshot.material.cacheBuildMs.toFixed(1)} ms pre-loop bake · zero lighting or colour parsing in the animation loop`
    : `${Math.round(fps)} fps · exact flat production renderer · recording A/B baseline`;
}

async function initializeProductionRuntime() {
  perfLabel.textContent = 'Loading canonical production configuration…';
  const [runtimeConfig, , nextDesignSystem, nextFlockConfig] = await Promise.all([
    loadRuntimeConfig(),
    loadShellConfig(),
    loadDailyFocusJson(DAILY_FOCUS_DESIGN_SYSTEM_URL, null),
    loadDailyFocusJson(FLOCK_CONFIG_URL, DEFAULT_FLOCK_OF_BIRDS_CONFIG),
  ]);

  designSystem = nextDesignSystem;
  flockConfig = normalizeFlockOfBirdsConfig(nextFlockConfig);
  initState(runtimeConfig);
  startSimulationPaletteController();
  applyHomeHeroRuntimeConfig();
  applyEnvironment();

  setupRenderer();
  setCanvas(getCanvas(), getContext(), simulationHost);
  resize();
  setupPointer();
  initModeSystem();
  syncLegacyMaterialRenderer();
  setForceRenderCallback(() => {
    if (activeSceneId !== 'flock-of-birds') render();
  });

  unsubscribePalette = subscribeSimulationPalette(() => {
    applyEnvironment();
    invalidateMaterialCache();
  });

  runtimeReady = true;
  await selectScene(activeSceneId);
  metricTimer = window.setInterval(updateMetrics, 500);
  updateMetrics();
  resolveReady(getSnapshot());
}

function disposePrototype() {
  window.clearInterval(metricTimer);
  window.clearTimeout(cacheInvalidationTimer);
  window.clearTimeout(saveFeedbackTimer);
  window.cancelAnimationFrame(materialPreviewFrame);
  window.removeEventListener('resize', scheduleMaterialPreview);
  stopMainLoop();
  flockRenderer?.destroy();
  flockRenderer = null;
  unsubscribePalette?.();
  unsubscribePalette = null;
  unregisterMaterialRenderer?.();
  unregisterMaterialRenderer = null;
  setForceRenderCallback(null);
  disposeModeSystem();
  disposeRendererListeners();
  stopSimulationPaletteController();
}

loadSavedMaterialConfig();
readInitialUrlState();
setSimulationBodyMaterialConfig(getPrototypeMaterialConfig());
createControlPanel();
syncControlPanel();
updateSceneLabels();
updateUrl();

previousButton.addEventListener('click', () => cycleScene(-1));
nextButton.addEventListener('click', () => cycleScene(1));
saveButton.addEventListener('click', saveMaterialConfig);
resetButton.addEventListener('click', resetMaterial);
collapseButton.addEventListener('click', () => {
  const collapsed = document.body.dataset.panelCollapsed !== 'true';
  document.body.dataset.panelCollapsed = String(collapsed);
  collapseButton.textContent = collapsed ? '+' : '−';
  collapseButton.setAttribute('aria-expanded', String(!collapsed));
  if (!collapsed) scheduleMaterialPreview();
});
previewScaleSelect.addEventListener('change', () => {
  materialPreviewScale = previewScaleSelect.value === '10' ? 10 : 8;
  drawMaterialPreview();
});
window.addEventListener('resize', scheduleMaterialPreview);
window.addEventListener('beforeunload', disposePrototype, { once: true });

initializeProductionRuntime().catch((error) => {
  console.error('[SphereDepthPrototype] Failed to start', error);
  eyebrow.textContent = 'Prototype failed to start';
  perfLabel.textContent = error?.message || String(error);
  resolveReady({ ready: false, error: error?.message || String(error) });
});
