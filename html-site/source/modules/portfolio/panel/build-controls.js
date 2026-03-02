// Export portfolio config from the panel (mirrors index behavior).

import { buildConfigSnapshot } from './control-registry.js';

export function setupBuildControls(config) {
  const btn = document.getElementById('savePortfolioConfigBtn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const snapshot = buildConfigSnapshot(config);
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'portfolio-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
}
