import { syncCornerShapeSquircleClass } from '../../legacy/modules/core/state.js';
import { stampCursorContrastFromTheme } from '../../legacy/modules/visual/colors.js';
import {
  completeDirectBoot,
  waitForFrames,
  waitForPageReadyBarrier,
  waitForUsableRects,
} from '../../legacy/modules/visual/page-orchestrator.js';
import { loadShellConfig, syncShellToDocument } from '../../legacy/modules/visual/site-shell.js';
import { waitForFonts } from '../../legacy/modules/utils/font-loader.js';
import { loadRuntimeConfig } from '../../legacy/modules/utils/runtime-config.js';

export async function bootstrapPaletteLab() {
  try {
    const runtime = await loadRuntimeConfig();
    syncCornerShapeSquircleClass(runtime?.cornerShapeSquircleEnabled !== false);
  } catch {
    syncCornerShapeSquircleClass(true);
  }

  try {
    const shellConfig = await loadShellConfig();
    syncShellToDocument({
      config: shellConfig,
      isDark: document.documentElement.classList.contains('dark-mode'),
    });
  } catch {
    syncShellToDocument({
      isDark: document.documentElement.classList.contains('dark-mode'),
    });
  }

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
  await waitForUsableRects(['#abs-scene', '#app-frame', '.route-topbar', '.palette-lab-main'], {
    timeoutMs: 2400,
  });
  await waitForFrames(2);
  await completeDirectBoot({
    selectors: ['#abs-scene', '#app-frame'],
    detail: 'palette-lab-ready',
  });

  return undefined;
}
