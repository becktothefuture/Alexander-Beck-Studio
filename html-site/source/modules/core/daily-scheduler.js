// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          DAILY SCHEDULER                                     ║
// ║      Deterministic simulation selection based on day of year                 ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { NARRATIVE_MODE_SEQUENCE } from './constants.js';

/**
 * Calculate the day of the year (0-365/366) for a given date.
 * @param {Date} date - The date to calculate from (defaults to today)
 * @returns {number} Day of year (0-based index)
 */
function getDayOfYear(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Get the daily mode based on the current date.
 * Uses local user time to ensure everyone sees the same simulation on the same day.
 * The simulation rotates through NARRATIVE_MODE_SEQUENCE deterministically.
 * 
 * @returns {string} The mode identifier for today
 */
export function getDailyMode() {
  const dayOfYear = getDayOfYear();
  const modeIndex = dayOfYear % NARRATIVE_MODE_SEQUENCE.length;
  return NARRATIVE_MODE_SEQUENCE[modeIndex];
}
