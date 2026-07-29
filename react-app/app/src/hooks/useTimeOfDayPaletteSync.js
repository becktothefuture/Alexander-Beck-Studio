import { useLayoutEffect } from 'react';

import {
  startSimulationPaletteController,
  stopSimulationPaletteController,
} from '../palette/simulationPaletteController.js';
import {
  startLegacySimulationPaletteAdapter,
  stopLegacySimulationPaletteAdapter,
} from '../legacy/modules/visual/simulation-palette-adapter.js';

export function useTimeOfDayPaletteSync(active = true) {
  useLayoutEffect(() => {
    if (!active || typeof window === 'undefined') return undefined;
    startLegacySimulationPaletteAdapter();
    startSimulationPaletteController();
    return () => {
      stopLegacySimulationPaletteAdapter();
      stopSimulationPaletteController();
    };
  }, [active]);
}
