// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          DAILY SCHEDULER                                     ║
// ║      Deterministic simulation selection based on day of year                 ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { FEATURED_MODES } from './constants.js';

/**
 * Calculate the day of the year (0-365/366) for a given date.
 * @param {Date} date - The date to calculate from (defaults to today)
 * @returns {number} Day of year (0-based index)
 */
function getDayOfYear(date = new Date()) {
  const oneDay = 1000 * 60 * 60 * 24;
  const start = Date.UTC(date.getFullYear(), 0, 1);
  const current = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((current - start) / oneDay);
}

/**
 * Get the daily mode based on the current date.
 * Uses local user time to ensure everyone sees the same simulation on the same day.
 * The daily simulation rotates through FEATURED_MODES only. Extended modes remain
 * available through arrow/panel navigation, but they should not become first-run
 * daily candidates.
 * 
 * @returns {string} The mode identifier for today
 */
export function getDailyMode() {
  const dayOfYear = getDayOfYear();
  const modeIndex = dayOfYear % FEATURED_MODES.length;
  return FEATURED_MODES[modeIndex];
}
