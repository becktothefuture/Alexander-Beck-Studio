import { configureSimulationPalette, subscribeSimulationPalette } from '../../../palette/simulationPaletteController.js';
import { getGlobals } from '../core/state.js';
import { applySimulationPaletteSnapshot } from './colors.js';

let unsubscribe = null;

export function startLegacySimulationPaletteAdapter() {
  if (unsubscribe) return unsubscribe;
  configureSimulationPalette({ colorDistribution: getGlobals().colorDistribution });
  unsubscribe = subscribeSimulationPalette(applySimulationPaletteSnapshot);
  return unsubscribe;
}

export function stopLegacySimulationPaletteAdapter() {
  unsubscribe?.();
  unsubscribe = null;
}
