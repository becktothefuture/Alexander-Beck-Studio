// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                        LEGEND FILTER + TOOLTIP SYSTEM                        ║
// ║  Purpose:                                                                   ║
// ║  - Make the expertise legend behave like a dashboard filter                  ║
// ║  - Provide hover tooltips (writes to #legend-tooltip-output)                 ║
// ║  - Expose a `window.legendFilter.syncAllBalls()` hook so mode changes         ║
// ║    can re-apply filters after re-spawning balls                              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';

const INACTIVE_OPACITY = 0.35;

/**
 * Initialize legend interactivity + filtering.
 *
 * Notes:
 * - This runs once at startup.
 * - It is safe in production: no panel dependencies, no dev-only behavior.
 * - Filtering is done by swapping `globals.balls` to a filtered subset so the
 *   simulation/render loop naturally uses the visible set (no per-frame checks).
 */
export function initLegendFilterSystem() {
  // Track active legend indices:
  // - Empty set = “all active”
  // - Non-empty set = only those indices are active
  const legendActiveSet = new Set();
  let legendItems = [];
  let allBalls = [];

  const syncAllBalls = () => {
    const g = getGlobals();
    if (!g?.balls) return;
    // Snapshot current population (called after mode changes / respawns)
    allBalls = [...g.balls];
    if (legendActiveSet.size > 0) {
      updateBallsForFilter();
    }
  };

  const updateBallsForFilter = () => {
    const g = getGlobals();
    if (!g) return;

    // If we don't have a stable snapshot, build one once and bail (next call can filter).
    if (!allBalls || allBalls.length === 0) {
      allBalls = [...(g.balls || [])];
      return;
    }

    const allActive = legendActiveSet.size === 0;
    if (allActive) {
      g.balls = [...allBalls];
      return;
    }

    // Filter by distributionIndex (assigned at spawn time for each ball)
    g.balls = allBalls.filter((ball) => {
      if (!ball) return false;
      const idx = ball.distributionIndex ?? -1;
      return idx >= 0 && legendActiveSet.has(idx);
    });
  };

  const updateLegendVisuals = () => {
    const allActive = legendActiveSet.size === 0;

    for (let i = 0; i < legendItems.length; i++) {
      const item = legendItems[i];
      if (!item) continue;

      if (allActive) {
        item.classList.remove('legend__item--active', 'legend__item--dimmed');
        item.style.opacity = '';
        continue;
      }

      if (legendActiveSet.has(i)) {
        item.classList.add('legend__item--active');
        item.classList.remove('legend__item--dimmed');
        item.style.opacity = '';
      } else {
        item.classList.remove('legend__item--active');
        item.classList.add('legend__item--dimmed');
        item.style.opacity = String(INACTIVE_OPACITY);
      }
    }
  };

  const toggleLegendItem = (index) => {
    if (!Number.isFinite(index) || index < 0) return;

    if (legendActiveSet.size === 0) {
      // From “all active” → “only this one active”
      legendActiveSet.add(index);
    } else if (legendActiveSet.has(index)) {
      legendActiveSet.delete(index);
      // If we delete down to zero, revert to “all active”
    } else {
      legendActiveSet.add(index);
    }

    updateLegendVisuals();
    updateBallsForFilter();
  };

  // Expose sync hook for mode-controller (mode changes respawn balls).
  try {
    if (typeof window !== 'undefined') {
      if (!window.legendFilter) window.legendFilter = {};
      window.legendFilter.syncAllBalls = syncAllBalls;
    }
  } catch (e) {}

  // Attach listeners + tooltip behavior.
  try {
    const legend = document.getElementById('expertise-legend');
    const tooltipOutput = document.getElementById('legend-tooltip-output');
    if (!legend) return;

    legendItems = Array.from(legend.querySelectorAll('.legend__item'));

    for (let index = 0; index < legendItems.length; index++) {
      const item = legendItems[index];
      if (!item) continue;

      // Make clickable + keyboard-accessible
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      // Cursor style is handled by CSS (.legend__item--interactive { cursor: none; })

      // Critical for CSS hover background and pointer routing
      item.classList.add('legend__item--interactive');

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleLegendItem(index);
      });

      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          toggleLegendItem(index);
        }
      });

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

