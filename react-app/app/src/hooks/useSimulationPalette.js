import { useSyncExternalStore } from 'react';

import {
  getSimulationPaletteSnapshot,
  subscribeSimulationPalette,
} from '../palette/simulationPaletteController.js';

export function useSimulationPalette() {
  return useSyncExternalStore(
    subscribeSimulationPalette,
    getSimulationPaletteSnapshot,
    getSimulationPaletteSnapshot,
  );
}
