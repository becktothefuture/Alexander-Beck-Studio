// Canonical design-system save/export for the shared panel.

import { performDesignSystemSave } from '../utils/design-system-save.js';
import { resolvePanelUiDocument } from './panel-ui-context.js';

export function setupBuildControls(options = {}) {
  const uiDocument = resolvePanelUiDocument(options.uiDocument);
  const btn = uiDocument?.getElementById('saveRuntimeConfigBtn');
  if (!btn) return;
  if (btn.dataset.designSaveBound === 'true') return;
  btn.dataset.designSaveBound = 'true';

  btn.addEventListener('click', async () => {
    const originalLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Updating…';

    try {
      const result = await performDesignSystemSave();
      btn.textContent = result.saved ? '✓ Updated' : 'Downloaded JSON';
    } catch (e) {
      btn.textContent = 'Update Failed';
    } finally {
      window.setTimeout(() => {
        btn.disabled = false;
        btn.textContent = originalLabel;
      }, 1400);
    }
  });
}
