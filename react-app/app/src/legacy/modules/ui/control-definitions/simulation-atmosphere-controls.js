import { getGlobals } from '../../core/state.js';
import {
  getSimulationAtmosphereConfig,
  invalidateSimulationAtmosphereGeometry,
  setSimulationAtmosphereConfig,
} from '../../rendering/atmosphere/simulation-atmosphere.js';
import {
  SIMULATION_ATMOSPHERE_CONTROL_GROUPS,
  normalizeSimulationAtmosphereConfig,
} from '../../rendering/atmosphere/simulation-atmosphere-config.js';

const ATMOSPHERE_PROFILE_GROUPS = SIMULATION_ATMOSPHERE_CONTROL_GROUPS
  .filter((group) => group.scope === 'themeProfile')
  .map((group) => ({
    ...group,
    controls: group.controls.filter((control) => control.scope !== 'common'),
  }))
  .filter((group) => group.controls.length > 0);

function getAtmosphereStateKey(id, theme = '') {
  const themePrefix = theme ? `${theme[0].toUpperCase()}${theme.slice(1)}` : '';
  const idPrefix = `${id[0].toUpperCase()}${id.slice(1)}`;
  return `atmosphere${themePrefix}${idPrefix}`;
}

function formatAtmosphereControlValue(value, control) {
  if (control.type === 'checkbox') return value ? 'On' : 'Off';
  if (control.type === 'select') return String(value);
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  if (control.display === 'percent') return `${Math.round(numeric * 100)}%`;
  if (control.display === 'px') return `${Math.round(numeric)}px`;
  if (control.display === 'subpx') return `${numeric.toFixed(2).replace(/\.00$/, '')}px`;
  if (control.display === 'vh') return `${numeric.toFixed(2).replace(/\.00$/, '')}vh`;
  if (control.display === 'ms') return `${Math.round(numeric)}ms`;
  if (control.display === 'pxs') return `${numeric.toFixed(2).replace(/\.00$/, '')}px/s`;
  return numeric.toFixed(2).replace(/\.00$/, '');
}

function readAtmosphereState(g, key, fallback) {
  const value = g?.[key];
  return value === undefined ? fallback : value;
}

export function hydrateSimulationAtmosphereControlState(g = getGlobals()) {
  if (!g) return;
  const config = getSimulationAtmosphereConfig();
  g[getAtmosphereStateKey('enabled')] = config.enabled;
  g[getAtmosphereStateKey('largeSpread')] = config.largeSpread;
  g[getAtmosphereStateKey('smallSpread')] = config.smallSpread;
  g[getAtmosphereStateKey('memoryMs')] = config.memoryMs;
  g[getAtmosphereStateKey('edgeStrength')] = config.edgeStrength;
  g[getAtmosphereStateKey('edgeWidthPx')] = config.edgeWidthPx;
  g[getAtmosphereStateKey('edgeInsetPx')] = config.edgeInsetPx;
  for (const theme of ['light', 'dark']) {
    for (const group of ATMOSPHERE_PROFILE_GROUPS) {
      for (const control of group.controls) {
        g[getAtmosphereStateKey(control.id, theme)] = config[theme][control.id];
      }
    }
  }
}

export function buildSimulationAtmosphereConfigFromControlState(
  g = getGlobals(),
  baseConfig = getSimulationAtmosphereConfig(),
) {
  const base = normalizeSimulationAtmosphereConfig(baseConfig);
  const next = {
    enabled: readAtmosphereState(g, getAtmosphereStateKey('enabled'), base.enabled),
    largeSpread: readAtmosphereState(g, getAtmosphereStateKey('largeSpread'), base.largeSpread),
    smallSpread: readAtmosphereState(g, getAtmosphereStateKey('smallSpread'), base.smallSpread),
    memoryMs: readAtmosphereState(g, getAtmosphereStateKey('memoryMs'), base.memoryMs),
    edgeStrength: readAtmosphereState(g, getAtmosphereStateKey('edgeStrength'), base.edgeStrength),
    edgeWidthPx: readAtmosphereState(g, getAtmosphereStateKey('edgeWidthPx'), base.edgeWidthPx),
    edgeInsetPx: readAtmosphereState(g, getAtmosphereStateKey('edgeInsetPx'), base.edgeInsetPx),
    light: { ...base.light },
    dark: { ...base.dark },
  };
  for (const theme of ['light', 'dark']) {
    for (const group of ATMOSPHERE_PROFILE_GROUPS) {
      for (const control of group.controls) {
        next[theme][control.id] = readAtmosphereState(
          g,
          getAtmosphereStateKey(control.id, theme),
          base[theme][control.id],
        );
      }
    }
  }
  return normalizeSimulationAtmosphereConfig(next);
}

function applySimulationAtmosphereControlState(g) {
  setSimulationAtmosphereConfig(buildSimulationAtmosphereConfigFromControlState(g));
  invalidateSimulationAtmosphereGeometry();
}

function createAtmosphereCommonControls(controlIds) {
  const controlsById = new Map(
    SIMULATION_ATMOSPHERE_CONTROL_GROUPS.flatMap((group) => (
      group.controls.map((control) => [control.id, { group: group.title, control }])
    )),
  );
  return controlIds.map((id) => {
    const entry = controlsById.get(id);
    const control = entry.control;
    return {
      ...control,
      id: getAtmosphereStateKey(id),
      stateKey: getAtmosphereStateKey(id),
      designScope: 'simulationAtmosphere',
      group: entry.group,
      default: normalizeSimulationAtmosphereConfig()[id],
      parse: control.type === 'checkbox' ? (value) => !!value : (
        control.type === 'select' ? (value) => String(value) : Number.parseFloat
      ),
      format: (value) => formatAtmosphereControlValue(value, control),
      hint: `Background atmosphere: ${control.label.toLowerCase()}.`,
      onChange: applySimulationAtmosphereControlState,
    };
  });
}

function createAtmosphereThemeControls(theme) {
  const defaults = normalizeSimulationAtmosphereConfig()[theme];
  return ATMOSPHERE_PROFILE_GROUPS.flatMap((group) => group.controls.map((control) => ({
    ...control,
    id: getAtmosphereStateKey(control.id, theme),
    stateKey: getAtmosphereStateKey(control.id, theme),
    designScope: 'simulationAtmosphere',
    group: group.title,
    default: defaults[control.id],
    parse: control.type === 'select' ? (value) => String(value) : Number.parseFloat,
    format: (value) => formatAtmosphereControlValue(value, control),
    hint: `${theme === 'dark' ? 'Dark' : 'Light'} atmosphere: ${control.label.toLowerCase()}.`,
    onChange: applySimulationAtmosphereControlState,
  })));
}

export const SIMULATION_ATMOSPHERE_CONTROL_SECTIONS = {
  atmosphereCommon: {
    title: 'Glow Field',
    icon: '🌐',
    defaultOpen: true,
    controls: createAtmosphereCommonControls(['enabled', 'largeSpread', 'smallSpread', 'memoryMs']),
  },
  atmosphereEdge: {
    title: 'Edge Response',
    icon: '🌗',
    defaultOpen: true,
    controls: createAtmosphereCommonControls(['edgeStrength', 'edgeWidthPx', 'edgeInsetPx']),
  },
  atmosphereLight: {
    title: 'Light Mode',
    icon: '☀️',
    defaultOpen: false,
    controls: createAtmosphereThemeControls('light'),
  },
  atmosphereDark: {
    title: 'Dark Mode',
    icon: '🌙',
    defaultOpen: false,
    controls: createAtmosphereThemeControls('dark'),
  },
};
