// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          DAILY SCHEDULER                                     ║
// ║      Deterministic simulation selection based on day of year                 ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getDailySimulationId } from '../../../data/simulationCatalog.js';

/**
 * Get the daily mode based on the current date.
 * Uses local user time to ensure everyone sees the same simulation on the same day.
 * The daily simulation rotates through catalog entries marked daily-rotation.
 * Extended modes remain available through arrow/panel navigation, but they should
 * not become first-run daily candidates.
 * 
 * @returns {string} The mode identifier for today
 */
export function getDailyMode(date = new Date()) {
  return getDailySimulationId(date);
}
