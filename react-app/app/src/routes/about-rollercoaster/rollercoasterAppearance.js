import { withBasePath } from '../../lib/base-path.js';
import { normalizeHomeSimulationBodyRadius } from '../../lib/homeSimulationSizing.js';
import { normalizeMobileSimulationBodyScale } from '../../lib/mobileSimulationSizing.js';
import { withAboutLoadDeadline } from './rollercoasterLoading.js';

export const ABOUT_VISIBILITY_CONTROLS = Object.freeze([
  { id: 'nearHidden', runtimeKey: 'aboutVisibilityNearHiddenWU', label: 'Near hidden', min: 0, max: 8, defaultValue: 2 },
  { id: 'nearClear', runtimeKey: 'aboutVisibilityNearClearWU', label: 'Near clear', min: 0.1, max: 12, defaultValue: 7 },
  { id: 'farClear', runtimeKey: 'aboutVisibilityFarClearWU', label: 'Far clear', min: 3, max: 60, defaultValue: 8 },
  { id: 'farHidden', runtimeKey: 'aboutVisibilityFarHiddenWU', label: 'Far hidden', min: 4, max: 120, defaultValue: 24 },
].map(control => Object.freeze({ ...control, step: 0.05, unit: 'WU' })));

const HOME_KEYS = ['homeSimulationBodyRadiusPx', 'mobileSimulationBodyScale'];
const defaults = Object.fromEntries(ABOUT_VISIBILITY_CONTROLS.map(control => [control.id, control.defaultValue]));
const listeners = new Set();
let pendingLoad = null;
let pendingSave = null;
let state = Object.freeze({
  config: Object.freeze({ ...defaults, homeSimulationBodyRadiusPx: normalizeHomeSimulationBodyRadius(), mobileSimulationBodyScale: normalizeMobileSimulationBodyScale() }),
  baseline: null, dirty: false, status: 'idle', message: 'Load the saved visibility settings.',
});

function validateCorridor(config) {
  for (const control of ABOUT_VISIBILITY_CONTROLS) {
    const value = config[control.id];
    if (!Number.isFinite(value) || value < control.min || value > control.max) {
      throw new Error(`${control.label} must be between ${control.min} and ${control.max} WU.`);
    }
  }
  if (!(config.nearHidden < config.nearClear && config.nearClear <= config.farClear && config.farClear < config.farHidden)) {
    throw new Error('Visibility must follow Near hidden < Near clear ≤ Far clear < Far hidden.');
  }
  return config;
}

function sameCorridor(left, right) {
  return Boolean(left && right) && ABOUT_VISIBILITY_CONTROLS.every(control => left[control.id] === right[control.id]);
}

function fromCanonical(document) {
  if (!document?.runtime || typeof document.runtime !== 'object' || Array.isArray(document.runtime)) {
    throw new Error('The canonical design config has no runtime settings.');
  }
  const runtime = document.runtime;
  return Object.freeze(validateCorridor({
    ...Object.fromEntries(ABOUT_VISIBILITY_CONTROLS.map(control => [
      control.id, Object.hasOwn(runtime, control.runtimeKey) ? runtime[control.runtimeKey] : control.defaultValue,
    ])),
    homeSimulationBodyRadiusPx: normalizeHomeSimulationBodyRadius(runtime.homeSimulationBodyRadiusPx),
    mobileSimulationBodyScale: normalizeMobileSimulationBodyScale(runtime.mobileSimulationBodyScale),
  }));
}

function publish(patch) {
  state = Object.freeze({ ...state, ...patch });
  listeners.forEach(callback => callback(state.config));
}

async function readCanonical() {
  return withAboutLoadDeadline(async (signal) => {
    const response = await fetch(withBasePath('/config/design-system.json'), { cache: 'no-store', signal });
    if (!response.ok) throw new Error(`Could not load visibility settings (${response.status}). Your draft is kept.`);
    const document = await response.json();
    fromCanonical(document);
    return document;
  });
}

export function getRollercoasterAppearance() {
  return state.config;
}

// Panel metadata and renderer uniforms read the same store. No second draft.
export function getRollercoasterAppearanceState() {
  return state;
}

export function subscribeRollercoasterAppearance(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export async function loadRollercoasterAppearance({ forceReload = false } = {}) {
  if (pendingSave) throw new Error('Wait for visibility settings to finish saving.');
  if (pendingLoad) return pendingLoad;
  if (state.baseline && !forceReload) return state.config;
  publish({ status: 'loading', message: 'Loading visibility settings…' });
  pendingLoad = (async () => {
    try {
      const config = fromCanonical(await readCanonical());
      publish({ config, baseline: config, dirty: false, status: 'ready', message: 'Visibility settings ready.' });
      return config;
    } catch (error) {
      publish({ status: 'failed', message: error.message });
      throw error;
    } finally {
      pendingLoad = null;
    }
  })();
  return pendingLoad;
}

export function setRollercoasterAppearance(config) {
  if (state.status !== 'ready') throw new Error('Load the canonical visibility settings before editing.');
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('Visibility settings must be an object.');
  for (const key of Object.keys(config)) {
    if (HOME_KEYS.includes(key)) {
      if (config[key] !== state.config[key]) throw new Error('Ball size is linked to Home and is read only here.');
    } else if (!ABOUT_VISIBILITY_CONTROLS.some(control => control.id === key)) {
      throw new Error(`Unknown visibility setting: ${key}.`);
    }
  }
  const next = Object.freeze(validateCorridor({ ...state.config, ...config }));
  if (sameCorridor(next, state.config)) return state.config;
  const dirty = !sameCorridor(next, state.baseline);
  publish({ config: next, dirty, message: dirty ? 'Unsaved visibility changes.' : 'Visibility settings match the saved source.' });
  return next;
}

export function revertRollercoasterAppearance() {
  if (pendingSave || pendingLoad || !state.baseline) return false;
  publish({ config: state.baseline, dirty: false, message: 'Reverted to the last loaded visibility settings.' });
  return true;
}

export function getRollercoasterVisibilityBounds(id, config = state.config) {
  const control = ABOUT_VISIBILITY_CONTROLS.find(item => item.id === id);
  if (!control) throw new Error(`Unknown visibility setting: ${id}.`);
  const { step } = control;
  if (id === 'nearHidden') return { min: control.min, max: Math.min(control.max, Math.max(config.nearHidden, config.nearClear - step)) };
  if (id === 'nearClear') return { min: Math.max(control.min, Math.min(config.nearClear, config.nearHidden + step)), max: Math.min(control.max, config.farClear) };
  if (id === 'farClear') return { min: Math.max(control.min, config.nearClear), max: Math.min(control.max, Math.max(config.farClear, config.farHidden - step)) };
  return { min: Math.max(control.min, Math.min(config.farHidden, config.farClear + step)), max: control.max };
}

export async function saveRollercoasterAppearance() {
  if (pendingSave) return pendingSave;
  if (state.status !== 'ready' || !state.baseline) throw new Error('Reload the canonical visibility settings before saving.');
  if (!state.dirty) return state.config;
  const submitted = state.config;
  const baseline = state.baseline;
  publish({ status: 'saving', message: 'Saving visibility settings…' });
  pendingSave = (async () => {
    try {
      // Fetch immediately before the write. Preserve Home, shell, route and
      // unknown future runtime keys; never serialize a global runtime snapshot.
      const current = await readCanonical();
      if (!sameCorridor(fromCanonical(current), baseline)) {
        const error = new Error('Visibility settings changed on disk. Your draft is kept. Discard & reload before saving.');
        error.code = 'conflict';
        throw error;
      }
      const runtime = { ...current.runtime };
      ABOUT_VISIBILITY_CONTROLS.forEach(control => { runtime[control.runtimeKey] = submitted[control.id]; });
      const response = await fetch('/api/design-system/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: { ...current, runtime } }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || `Visibility save failed (${response.status}). Your draft is kept.`);
      }
      const verified = await readCanonical();
      if (!ABOUT_VISIBILITY_CONTROLS.every(control => verified.runtime[control.runtimeKey] === submitted[control.id])) {
        throw new Error('Visibility save could not be verified. Your draft is kept. Reload the source before retrying.');
      }
      const config = fromCanonical(verified);
      publish({ config, baseline: config, dirty: false, status: 'ready', message: 'Visibility settings saved to design-system.json.' });
      return config;
    } catch (error) {
      publish({ status: error.code === 'conflict' ? 'conflict' : 'ready', message: error.message });
      throw error;
    } finally {
      pendingSave = null;
    }
  })();
  return pendingSave;
}
