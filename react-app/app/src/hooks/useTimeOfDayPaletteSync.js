import { useEffect } from 'react';
import { getGlobals } from '../legacy/modules/core/state.js';
import { applyColorTemplate } from '../legacy/modules/visual/colors.js';
import {
  getTimeOfDayPaletteId,
  getTimeUntilNextPalettePeriod,
} from '../palette/timeOfDayPalette.js';

const BOUNDARY_SETTLE_MS = 100;

export function useTimeOfDayPaletteSync(active = true) {
  useEffect(() => {
    if (!active || typeof window === 'undefined') return undefined;

    let timeoutId = 0;

    const scheduleNextSync = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(
        syncPalette,
        getTimeUntilNextPalettePeriod() + BOUNDARY_SETTLE_MS,
      );
    };

    const syncPalette = () => {
      const paletteId = getTimeOfDayPaletteId();
      const root = document.documentElement;
      const paletteChanged = getGlobals().currentTemplate !== paletteId
        || root.dataset.absTimeOfDayPalette !== paletteId;

      if (paletteChanged) applyColorTemplate(paletteId);
      root.dataset.absTimeOfDayPalette = paletteId;
      scheduleNextSync();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') syncPalette();
    };

    const handlePaletteChange = (event) => {
      if (event?.detail?.template === getTimeOfDayPaletteId()) return;
      window.queueMicrotask(syncPalette);
    };

    window.addEventListener('pageshow', syncPalette);
    window.addEventListener('bb:paletteChanged', handlePaletteChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    syncPalette();

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('pageshow', syncPalette);
      window.removeEventListener('bb:paletteChanged', handlePaletteChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [active]);
}
