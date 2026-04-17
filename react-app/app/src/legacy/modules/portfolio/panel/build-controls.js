// Export portfolio config from the panel (mirrors index behavior).

import { buildConfigSnapshot } from './control-registry.js';
import { performDesignSystemSave } from '../../utils/design-system-save.js';
import { resolvePanelUiDocument } from '../../ui/panel-ui-context.js';

export function setupBuildControls(config, options = {}) {
  const uiDocument = resolvePanelUiDocument(options.uiDocument);
  const btn = uiDocument?.getElementById('savePortfolioConfigBtn');
  if (!btn) return;
  if (btn.dataset.designSaveBound === 'true') return;
  btn.dataset.designSaveBound = 'true';

  btn.addEventListener('click', async () => {
    const originalLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Saving Design JSON…';

    try {
      const portfolioSnapshot = buildConfigSnapshot(config, { uiDocument });
      const result = await performDesignSystemSave({ portfolioSnapshot });
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
