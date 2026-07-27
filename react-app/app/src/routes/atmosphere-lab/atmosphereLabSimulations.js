import { SIMULATION_CATALOG } from '../../data/simulationCatalog.js';

export const ATMOSPHERE_LAB_SIMULATION_OPTIONS = Object.freeze(
  SIMULATION_CATALOG
    .filter((entry) => entry.surface === 'home-mode')
    .map((entry) => Object.freeze({ id: entry.id, label: entry.name })),
);

const ATMOSPHERE_LAB_SIMULATION_IDS = new Set(
  ATMOSPHERE_LAB_SIMULATION_OPTIONS.map((entry) => entry.id),
);

export function isAtmosphereLabSimulationMode(mode) {
  return ATMOSPHERE_LAB_SIMULATION_IDS.has(String(mode || ''));
}
