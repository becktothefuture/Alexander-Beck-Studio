import { getGlobals } from '../../core/state.js';
import {
  getSimulationBodyMaterialConfig,
  scheduleSimulationBodyMaterialConfig,
} from '../../rendering/materials/simulation-body-material.js';
import {
  SIMULATION_BODY_MATERIAL_CONTROL_GROUPS,
  normalizeSimulationBodyMaterialConfig,
} from '../../rendering/materials/simulation-body-material-config.js';

const PROFILE_GROUPS = SIMULATION_BODY_MATERIAL_CONTROL_GROUPS
  .filter((group) => group.scope === 'themeProfile');

function getStateKey(id, theme = '') {
  const idPrefix = `${id[0].toUpperCase()}${id.slice(1)}`;
  const themePrefix = theme ? `${theme[0].toUpperCase()}${theme.slice(1)}` : '';
  return `bodyMaterial${themePrefix}${idPrefix}`;
}

function readState(g, key, fallback) {
  return g?.[key] === undefined ? fallback : g[key];
}

function formatValue(value, control) {
  if (control.type === 'checkbox') return value ? 'On' : 'Off';
  if (control.type === 'select') return `${Math.round(Number(value))}px`;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${Math.round(numeric * 100)}%` : '—';
}

export function hydrateSimulationBodyMaterialControlState(g = getGlobals()) {
  if (!g) return;
  const config = getSimulationBodyMaterialConfig();
  g[getStateKey('enabled')] = config.enabled;
  g[getStateKey('cacheDetailPx')] = config.cacheDetailPx;
  for (const theme of ['light', 'dark']) {
    for (const group of PROFILE_GROUPS) {
      for (const control of group.controls) {
        g[getStateKey(control.id, theme)] = config[theme][control.id];
      }
    }
  }
}

export function buildSimulationBodyMaterialConfigFromControlState(
  g = getGlobals(),
  baseConfig = getSimulationBodyMaterialConfig(),
) {
  const base = normalizeSimulationBodyMaterialConfig(baseConfig);
  const next = {
    enabled: readState(g, getStateKey('enabled'), base.enabled),
    cacheDetailPx: readState(g, getStateKey('cacheDetailPx'), base.cacheDetailPx),
    light: { ...base.light },
    dark: { ...base.dark },
  };
  for (const theme of ['light', 'dark']) {
    for (const group of PROFILE_GROUPS) {
      for (const control of group.controls) {
        next[theme][control.id] = readState(
          g,
          getStateKey(control.id, theme),
          base[theme][control.id],
        );
      }
    }
  }
  return normalizeSimulationBodyMaterialConfig(next);
}

function applyControlState(g) {
  scheduleSimulationBodyMaterialConfig(buildSimulationBodyMaterialConfigFromControlState(g));
}

function createCommonControls() {
  const group = SIMULATION_BODY_MATERIAL_CONTROL_GROUPS.find((entry) => entry.scope === 'common');
  const defaults = normalizeSimulationBodyMaterialConfig();
  return group.controls.map((control) => ({
    ...control,
    id: getStateKey(control.id),
    stateKey: getStateKey(control.id),
    designScope: 'simulationBodyMaterial',
    default: defaults[control.id],
    parse: control.type === 'checkbox' ? (value) => Boolean(value) : Number,
    format: (value) => formatValue(value, control),
    hint: control.id === 'enabled'
      ? 'Toggle the cached sphere finish without changing simulation behavior.'
      : 'One-time sticker resolution. Higher values use more cache memory, not more per-frame lighting.',
    onChange: applyControlState,
  }));
}

function createThemeControls(theme) {
  const defaults = normalizeSimulationBodyMaterialConfig()[theme];
  return PROFILE_GROUPS.flatMap((group) => group.controls.map((control) => ({
    ...control,
    id: getStateKey(control.id, theme),
    stateKey: getStateKey(control.id, theme),
    designScope: 'simulationBodyMaterial',
    default: defaults[control.id],
    parse: Number.parseFloat,
    format: (value) => formatValue(value, control),
    hint: `${theme === 'dark' ? 'Dark' : 'Light'} sphere material: ${control.label.toLowerCase()}.`,
    onChange: applyControlState,
  })));
}

export const SIMULATION_BODY_MATERIAL_CONTROL_SECTIONS = Object.freeze({
  bodyMaterialCommon: {
    title: 'Sphere Material',
    icon: '◉',
    defaultOpen: true,
    controls: createCommonControls(),
  },
  bodyMaterialLight: {
    title: 'Light Mode',
    icon: '☀️',
    defaultOpen: false,
    controls: createThemeControls('light'),
  },
  bodyMaterialDark: {
    title: 'Dark Mode',
    icon: '🌙',
    defaultOpen: false,
    controls: createThemeControls('dark'),
  },
});
