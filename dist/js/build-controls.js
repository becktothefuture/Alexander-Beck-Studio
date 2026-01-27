/* Alexander Beck Studio | 2026-01-27 */
import { buildConfigSnapshot } from './control-registry.js';

// Export portfolio config from the panel (mirrors index behavior).


function setupBuildControls(config) {
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

export { setupBuildControls };
//# sourceMappingURL=build-controls.js.map
