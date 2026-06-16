// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Styleguide route — no simulation bootstrap; shell + static samples only.   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { stampCursorContrastFromTheme } from '../../legacy/modules/visual/colors.js';
import { forceBootVisible } from '../../legacy/modules/visual/page-orchestrator.js';
import { loadShellConfig, syncShellToDocument } from '../../legacy/modules/visual/site-shell.js';
import { loadRuntimeConfig } from '../../legacy/modules/utils/runtime-config.js';
import { syncCornerShapeSquircleClass } from '../../legacy/modules/core/state.js';

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
  // styleguide.html keeps #abs-scene / #app-frame hidden via #fade-blocking until
  // legacy boot clears it; other routes do this inside main.js / entrance flow.
  forceBootVisible();
  try {
    const runtime = await loadRuntimeConfig();
    syncRuntimeThemeVars(runtime);
    syncCornerShapeSquircleClass(runtime?.cornerShapeSquircleEnabled !== false);
  } catch {
    syncCornerShapeSquircleClass(true);
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
  // No simulation palette bootstrap here — still need readable labels on solid cursor hover fills.
  stampCursorContrastFromTheme();
  requestAnimationFrame(() => stampCursorContrastFromTheme());
  return undefined;
}
