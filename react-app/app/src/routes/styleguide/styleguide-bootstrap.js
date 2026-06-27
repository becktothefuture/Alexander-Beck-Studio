// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Styleguide route — no simulation bootstrap; shell + static samples only.   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { stampCursorContrastFromTheme } from '../../legacy/modules/visual/colors.js';
import { waitForFonts } from '../../legacy/modules/utils/font-loader.js';
import {
  completeDirectBoot,
  waitForFrames,
  waitForPageReadyBarrier,
  waitForUsableRects,
} from '../../legacy/modules/visual/page-orchestrator.js';
import { loadShellConfig, syncShellToDocument } from '../../legacy/modules/visual/site-shell.js';
import { loadRuntimeConfig } from '../../legacy/modules/utils/runtime-config.js';
import { syncCornerShapeSquircleClass } from '../../legacy/modules/core/state.js';
import { initNoiseSystem } from '../../legacy/modules/visual/noise-system.js';
import { initWallShadowPlateSystem } from '../../legacy/modules/visual/wall-shadow-plate.js';

function syncRuntimeThemeVars(runtime) {
  const root = document.documentElement;
  if (runtime?.bgLight) {
    root.style.setProperty('--bg-light', runtime.bgLight);
  }
  if (runtime?.bgDark) {
    root.style.setProperty('--bg-dark', runtime.bgDark);
  }
}

export async function bootstrapStyleguide() {
  let runtime = null;
  try {
    runtime = await loadRuntimeConfig();
    syncRuntimeThemeVars(runtime);
    syncCornerShapeSquircleClass(runtime?.cornerShapeSquircleEnabled !== false);
  } catch {
    syncCornerShapeSquircleClass(true);
  }
  try {
    initNoiseSystem(runtime || {});
  } catch (error) {
    void error;
  }
  try {
    const shellConfig = await loadShellConfig();
    syncShellToDocument({
      config: shellConfig,
      isDark: document.documentElement.classList.contains('dark-mode')
    });
  } catch (error) {
    void error;
    // Styleguide can render with the critical-shell defaults if shell config is unavailable.
  }
  try {
    initWallShadowPlateSystem(runtime || {});
  } catch (error) {
    void error;
  }
  // No simulation palette bootstrap here — still need readable labels on solid cursor hover fills.
  stampCursorContrastFromTheme();
  requestAnimationFrame(() => stampCursorContrastFromTheme());
  await waitForPageReadyBarrier({
    waitForFonts: async () => {
      try {
        await waitForFonts();
        return true;
      } catch {
        return false;
      }
    },
    minimumMs: 80,
  });
  await waitForUsableRects(['#abs-scene', '#app-frame', '.route-topbar', '.styleguide-main'], {
    timeoutMs: 2400,
  });
  await waitForFrames(2);
  await completeDirectBoot({
    selectors: ['#abs-scene', '#app-frame'],
    detail: 'styleguide-ready',
  });
  return undefined;
}
