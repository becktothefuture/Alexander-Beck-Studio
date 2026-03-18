// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           LEGEND TOOLTIP SYSTEM                              ║
// ║  Purpose:                                                                   ║
// ║  - Provide click-to-toggle tooltips (writes to #legend-tooltip-output)       ║
// ║  - Expose a no-op `window.legendFilter.syncAllBalls()` for backwards compat  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

/**
 * Initialize legend tooltip system.
 *
 * Notes:
 * - This runs once at startup.
 * - It is safe in production: no panel dependencies, no dev-only behavior.
 * - Click on label toggles tooltip; click outside closes it.
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
    let tooltipOutput = document.getElementById('legend-tooltip-output');
    if (!legend) return;

    // Move tooltip to body so position:fixed is viewport-relative (not affected by parent transform/scroll).
    if (tooltipOutput && tooltipOutput.parentNode !== document.body) {
      document.body.appendChild(tooltipOutput);
    }

    const legendItems = Array.from(legend.querySelectorAll('.legend__item'));
    const TOOLTIP_GAP = 8;
    const TOOLTIP_MAX_WIDTH = 260;
    const VIEWPORT_PAD = 16;

    function positionTooltip(el, item) {
      const rect = item.getBoundingClientRect();
      let left = rect.left;
      const top = rect.bottom + TOOLTIP_GAP;
      const viewportW = document.documentElement.clientWidth;
      if (left + TOOLTIP_MAX_WIDTH + VIEWPORT_PAD > viewportW) {
        left = Math.max(VIEWPORT_PAD, viewportW - TOOLTIP_MAX_WIDTH - VIEWPORT_PAD);
      }
      if (left < VIEWPORT_PAD) left = VIEWPORT_PAD;
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
    }

    function hideTooltip() {
      if (tooltipOutput) tooltipOutput.classList.remove('is-visible');
    }

    function showTooltip(item) {
      const tooltipText = item.getAttribute('data-tooltip');
      if (!tooltipText || !tooltipOutput) return;
      tooltipOutput.textContent = tooltipText;
      positionTooltip(tooltipOutput, item);
      tooltipOutput.classList.add('is-visible');
    }

    function isTooltipOpenFor(item) {
      if (!tooltipOutput || !tooltipOutput.classList.contains('is-visible')) return false;
      return tooltipOutput.textContent === item.getAttribute('data-tooltip');
    }

    for (const item of legendItems) {
      if (!item) continue;

      item.classList.add('legend__item--interactive');

      if (tooltipOutput) {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (isTooltipOpenFor(item)) {
            hideTooltip();
          } else {
            showTooltip(item);
          }
        });
      }
    }

    document.addEventListener('click', (e) => {
      if (!tooltipOutput) return;
      const isLegendClick = legend && legend.contains(e.target);
      if (!isLegendClick) hideTooltip();
    });

    if (tooltipOutput) {
      tooltipOutput.classList.remove('is-visible');
    }
  } catch (e) {
    // Never allow legend setup to crash boot.
  }
}
