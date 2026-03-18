// Canonical design-system save/export for the shared panel.

import { performDesignSystemSave } from '../utils/design-system-save.js';

export function setupBuildControls() {
  const btn = document.getElementById('saveRuntimeConfigBtn');
  if (!btn) return;
  if (btn.dataset.designSaveBound === 'true') return;
  btn.dataset.designSaveBound = 'true';

  btn.addEventListener('click', async () => {
    const originalLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Saving Design JSON…';

    try {
      const result = await performDesignSystemSave();
      btn.textContent = result.saved ? 'Saved Design JSON' : 'Downloaded Design JSON';
    } catch (e) {
      btn.textContent = 'Design Save Failed';
    } finally {
      window.setTimeout(() => {
        btn.disabled = false;
        btn.textContent = originalLabel;
      }, 1400);
    }
  });
}

