// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Styleguide route — no simulation bootstrap; shell + static samples only.   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { stampCursorContrastFromTheme } from '../../legacy/modules/visual/colors.js';
import { forcePageVisible } from '../../legacy/modules/visual/page-orchestrator.js';
import { loadRuntimeConfig } from '../../legacy/modules/utils/runtime-config.js';
import { syncCornerShapeSquircleClass } from '../../legacy/modules/core/state.js';

export async function bootstrapStyleguide() {
  // styleguide.html keeps #abs-scene / #app-frame hidden via #fade-blocking until
  // legacy boot clears it; other routes do this inside main.js / entrance flow.
  forcePageVisible();
  try {
    const runtime = await loadRuntimeConfig();
    syncCornerShapeSquircleClass(runtime?.cornerShapeSquircleEnabled !== false);
  } catch (e) {
    syncCornerShapeSquircleClass(true);
  }
  // No palette bootstrap here — still need readable labels on solid cursor hover fills.
  stampCursorContrastFromTheme();
  requestAnimationFrame(() => stampCursorContrastFromTheme());
  return undefined;
}
