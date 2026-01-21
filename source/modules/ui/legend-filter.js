// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           LEGEND TOOLTIP SYSTEM                              ║
// ║  Purpose:                                                                   ║
// ║  - Provide hover tooltips (writes to #legend-tooltip-output)                 ║
// ║  - Expose a no-op `window.legendFilter.syncAllBalls()` for backwards compat  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

/**
 * Initialize legend tooltip system.
 *
 * Notes:
 * - This runs once at startup.
 * - It is safe in production: no panel dependencies, no dev-only behavior.
 * - Hover shows tooltip; click/keyboard filtering has been removed.
 */
export function initLegendFilterSystem() {
  // Expose no-op sync hook for backwards compatibility with mode-controller.
  try {
    if (typeof window !== 'undefined') {
      if (!window.legendFilter) window.legendFilter = {};
      window.legendFilter.syncAllBalls = () => {}; // No-op (filtering removed)
    }
  } catch (e) {}

  // Attach tooltip behavior.
  try {
    const legend = document.getElementById('expertise-legend');
    const tooltipOutput = document.getElementById('legend-tooltip-output');
    if (!legend) return;

    const legendItems = Array.from(legend.querySelectorAll('.legend__item'));

    for (const item of legendItems) {
      if (!item) continue;

      // Add class for CSS hover effects (not clickable)
      item.classList.add('legend__item--interactive');

      // Tooltip output: hover only (doesn't allocate in hot paths).
      if (tooltipOutput) {
        item.addEventListener('mouseenter', () => {
          const tooltipText = item.getAttribute('data-tooltip');
          if (!tooltipText) return;
          tooltipOutput.textContent = tooltipText;
          tooltipOutput.style.opacity = '1';
          tooltipOutput.style.visibility = 'visible';
        });

        item.addEventListener('mouseleave', () => {
          tooltipOutput.style.opacity = '0';
          window.setTimeout(() => {
            if (tooltipOutput.style.opacity === '0') {
              tooltipOutput.style.visibility = 'hidden';
            }
          }, 50);
        });
      }
    }

    if (tooltipOutput) {
      tooltipOutput.style.visibility = 'hidden';
      tooltipOutput.style.opacity = '0';
    }
  } catch (e) {
    // Never allow legend setup to crash boot.
  }
}
