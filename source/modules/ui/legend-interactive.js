// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                       INTERACTIVE LEGEND SYSTEM                              ║
// ║    Makes expertise legend items clickable like data dashboard controls       ║
// ║    Click to highlight/filter balls of that category                          ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';

// DEBUG: Track module load (document.body may not exist at module eval time)
window.__LEGEND_MODULE_LOADED__ = Date.now();

let activeFilter = null; // Currently active legend label (or null for "all")
let legendItems = [];

/**
 * Normalize label text for comparison
 */
function normalizeLabel(s) {
  return String(s || '').trim().toLowerCase();
}

/**
 * Get the color distribution entry for a given label
 */
function getDistributionForLabel(labelText) {
  const g = getGlobals();
  const target = normalizeLabel(labelText);
  const dist = Array.isArray(g.colorDistribution) ? g.colorDistribution : null;
  if (!dist) return null;
  
  for (const row of dist) {
    if (normalizeLabel(row?.label) === target) {
      return row;
    }
  }
  return null;
}

/**
 * Toggle filter for a specific legend category
 * @param {string} label - The category label
 */
function toggleFilter(label) {
  const normalizedLabel = normalizeLabel(label);
  
  if (activeFilter === normalizedLabel) {
    // Already active - deactivate (show all)
    activeFilter = null;
    updateBallVisibility(null);
    updateLegendActiveStates(null);
  } else {
    // Activate this filter
    activeFilter = normalizedLabel;
    updateBallVisibility(normalizedLabel);
    updateLegendActiveStates(normalizedLabel);
  }
}

/**
 * Update ball opacity based on active filter
 * @param {string|null} filterLabel - The active filter label, or null for all
 */
function updateBallVisibility(filterLabel) {
  const g = getGlobals();
  if (!g.balls || !Array.isArray(g.balls)) return;
  
  const dist = Array.isArray(g.colorDistribution) ? g.colorDistribution : [];
  
  for (const ball of g.balls) {
    if (!ball) continue;
    
    // Default opacity
    let targetOpacity = 1;
    
    if (filterLabel !== null) {
      // Find which category this ball belongs to based on its colorIndex
      const ballCategory = dist.find(row => row?.colorIndex === ball.colorIndex);
      const ballLabel = ballCategory ? normalizeLabel(ballCategory.label) : null;
      
      if (ballLabel !== filterLabel) {
        // Dim non-matching balls
        targetOpacity = 0.15;
      }
    }
    
    // Apply opacity (balls will use this in their render)
    ball.filterOpacity = targetOpacity;
  }
}

/**
 * Update legend item visual states
 * @param {string|null} activeLabel - The active label, or null
 */
function updateLegendActiveStates(activeLabel) {
  for (const item of legendItems) {
    const labelEl = item.querySelector('span');
    if (!labelEl) continue;
    
    const itemLabel = normalizeLabel(labelEl.textContent);
    
    if (activeLabel === null) {
      // No filter active - all items normal
      item.classList.remove('legend__item--active', 'legend__item--dimmed');
    } else if (itemLabel === activeLabel) {
      // This is the active filter
      item.classList.add('legend__item--active');
      item.classList.remove('legend__item--dimmed');
    } else {
      // Not active - dim it
      item.classList.remove('legend__item--active');
      item.classList.add('legend__item--dimmed');
    }
  }
}

/**
 * Handle click on legend item
 * @param {Event} e - Click event
 */
function handleItemClick(e) {
  const item = e.currentTarget;
  const labelEl = item.querySelector('span');
  if (!labelEl) return;
  
  toggleFilter(labelEl.textContent);
}

/**
 * Handle keyboard interaction
 * @param {KeyboardEvent} e - Keyboard event
 */
function handleItemKeydown(e) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    handleItemClick(e);
  }
}

/**
 * Initialize interactive legend system
 */
export function initLegendInteractive() {
  // DEBUG: Force visible alert to confirm function runs
  // alert('initLegendInteractive starting!');
  
  // Set window flag for testing
  if (typeof window !== 'undefined') {
    window.__LEGEND_INIT_RAN__ = true;
  }
  
  const legend = document.getElementById('expertise-legend');
  
  // DEBUG: Add visible marker to DOM
  try {
    const marker = document.createElement('div');
    marker.id = '__legend_init_marker__';
    marker.style.cssText = 'position:fixed;top:0;left:0;background:red;color:white;padding:5px;z-index:99999;font-size:10px';
    marker.textContent = 'Legend init ran! Found: ' + (legend ? 'yes' : 'no');
    document.body.appendChild(marker);
    setTimeout(() => marker.remove(), 3000);
  } catch(e) {}
  if (!legend) {
    return;
  }
  
  legendItems = Array.from(legend.querySelectorAll('.legend__item'));
  if (legendItems.length === 0) {
    return;
  }
  
  for (const item of legendItems) {
    // Make items accessible as buttons
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    // Cursor style is handled by CSS (.legend__item--interactive { cursor: none; })
    
    // Add event listeners with stopPropagation to prevent mode cycling
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      handleItemClick(e);
    });
    item.addEventListener('keydown', handleItemKeydown);
    
    // Add class for CSS targeting
    item.classList.add('legend__item--interactive');
  }
}

/**
 * Reset all filters (called on mode change, etc.)
 */
export function resetLegendFilter() {
  activeFilter = null;
  updateBallVisibility(null);
  updateLegendActiveStates(null);
}

/**
 * Get current active filter
 * @returns {string|null} Active filter label or null
 */
export function getActiveFilter() {
  return activeFilter;
}
