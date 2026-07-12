// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         RELOAD SELECTOR                                      ║
// ║      Picks a different Daily Simulation on every full page reload            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getResolvedSimulationFocus } from '../../../data/simulationCatalog.js';

/**
 * Get the simulation selected for this page load.
 * Daily Simulation picks from catalog entries marked daily-rotation and excludes
 * the last visible simulation so a full reload always produces a change.
 * Extended modes remain available through arrow/panel navigation, but they should
 * not become first-run daily candidates.
 * 
 * @returns {string} The mode identifier for this page load
 */
export function getDailyMode() {
  return getResolvedSimulationFocus().activeId;
}
