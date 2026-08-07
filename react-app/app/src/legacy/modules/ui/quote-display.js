// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                       QUOTE DISPLAY COMPONENT                                 ║
// ║   Viewport layer under #abs-scene (modal depth + blur stack). Drag: quote-puck. ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getState } from '../core/state.js';
import { NARRATIVE_QUOTES } from '../core/constants.js';
import { destroyQuotePuck } from './quote-puck.js';
import {
  getSimulationBodyMaterialSprite,
  subscribeSimulationBodyMaterial,
} from '../rendering/materials/simulation-body-material.js';
import { THEME_CHANGE_EVENT } from '../../../lib/theme-state.js';
import { subscribeSimulationPalette } from '../../../palette/simulationPaletteController.js';

let quoteContainer = null;
let contentWrapper = null;
let quoteTextEl = null;
let quoteAuthorEl = null;
let isAnimating = false;
let modeChangedHandler = null;
let materialChangedCleanup = null;
let paletteChangedCleanup = null;
let themeChangedHandler = null;

const ANIM_DURATION = 320;
const QUOTE_END_SYMBOL = ' ⁕';

function getQuoteMaterialTheme() {
  return document.documentElement?.classList?.contains('dark-mode')
    || document.body?.classList?.contains('dark-mode')
    ? 'dark'
    : 'light';
}

function syncQuoteMaterial() {
  const disk = quoteContainer?.querySelector?.('.quote-display__disk');
  const canvas = disk?.querySelector?.('.quote-display__material');
  if (!disk || !canvas) return;
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return;
  const color = getComputedStyle(disk).backgroundColor || '#808080';
  const sprite = getSimulationBodyMaterialSprite(color, { theme: getQuoteMaterialTheme() });
  if (!sprite?.canvas) {
    canvas.hidden = true;
    canvas.style.display = 'none';
    disk.dataset.ballFinish = 'flat-fill';
    return;
  }
  canvas.width = sprite.detail;
  canvas.height = sprite.detail;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(sprite.canvas, 0, 0, canvas.width, canvas.height);
  canvas.hidden = false;
  canvas.style.display = 'block';
  disk.dataset.ballFinish = 'cached-sphere-sticker';
}

function getQuoteMountParent() {
  return (
    document.getElementById('quote-viewport-host') ||
    document.getElementById('abs-scene') ||
    document.body
  );
}

/**
 * Returns or creates the viewport layer inside #quote-viewport-host (or #abs-scene)
 * so the puck shares gate-depth transform and sits under the modal blur stack.
 */
function getViewportLayer() {
  const parent = getQuoteMountParent();
  let layer = document.getElementById('quote-viewport-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'quote-viewport-layer';
    layer.className = 'quote-viewport-layer';
    parent.appendChild(layer);
    return layer;
  }
  if (layer.parentElement !== parent) {
    parent.appendChild(layer);
  }
  return layer;
}

/**
 * Creates the quote display DOM structure and appends it to the viewport layer (body).
 * position:fixed so left/top are viewport coordinates; collides with browser edges.
 */
function createQuoteElement() {
  const layer = getViewportLayer();

  // Check if already created
  if (document.getElementById('quote-display')) {
    return document.getElementById('quote-display');
  }

  // Create container
  quoteContainer = document.createElement('div');
  quoteContainer.id = 'quote-display';
  quoteContainer.className = 'quote-display';
  quoteContainer.dataset.routeEnter = 'footer';
  quoteContainer.dataset.routeEnterOrder = '4';
  quoteContainer.setAttribute('role', 'button');
  quoteContainer.setAttribute('aria-live', 'polite');
  quoteContainer.setAttribute('aria-atomic', 'true');

  const disk = document.createElement('div');
  disk.className = 'quote-display__disk';
  disk.setAttribute('aria-hidden', 'true');
  const materialCanvas = document.createElement('canvas');
  materialCanvas.className = 'quote-display__material';
  materialCanvas.setAttribute('aria-hidden', 'true');
  Object.assign(materialCanvas.style, {
    display: 'block',
    width: '100%',
    height: '100%',
    borderRadius: 'inherit',
    pointerEvents: 'none',
  });
  disk.appendChild(materialCanvas);

  // Create content wrapper for animations (sibling of disk — hover scale only affects disk)
  contentWrapper = document.createElement('div');
  contentWrapper.className = 'quote-display__content quote-display__content--entering';

  // Create quote text element
  quoteTextEl = document.createElement('p');
  quoteTextEl.className = 'quote-display__text';

  // Create author element
  quoteAuthorEl = document.createElement('p');
  quoteAuthorEl.className = 'quote-display__author';

  // Assemble
  contentWrapper.appendChild(quoteTextEl);
  contentWrapper.appendChild(quoteAuthorEl);
  quoteContainer.appendChild(disk);
  quoteContainer.appendChild(contentWrapper);

  layer.appendChild(quoteContainer);

  return quoteContainer;
}

/**
 * Updates the quote display with the current mode's quote.
 * Includes subtle enter/exit animation.
 * @param {string} [mode] - Optional mode override; uses state.currentMode if not provided
 * @param {boolean} [animate=true] - Whether to animate the transition
 */
function updateQuote(mode, animate = true) {
  if (!quoteContainer || !contentWrapper) return;

  const currentMode = mode || getState().currentMode;
  const quoteData = NARRATIVE_QUOTES[currentMode];

  if (!quoteData) {
    // No quote for this mode - hide the container
    quoteContainer.classList.add('quote-display--hidden');
    return;
  }

  quoteContainer.classList.remove('quote-display--hidden');

  // Skip animation for initial load or if already animating
  if (!animate || isAnimating) {
    quoteTextEl.textContent = quoteData.quote + QUOTE_END_SYMBOL;
    quoteAuthorEl.textContent = quoteData.author;
    contentWrapper.classList.remove('quote-display__content--entering', 'quote-display__content--exiting');
    return;
  }

  // Animate out → update → animate in
  isAnimating = true;
  contentWrapper.classList.add('quote-display__content--exiting');

  setTimeout(() => {
    // Update content while hidden
    quoteTextEl.textContent = quoteData.quote + QUOTE_END_SYMBOL;
    quoteAuthorEl.textContent = quoteData.author;

    // Switch to entering state
    contentWrapper.classList.remove('quote-display__content--exiting');
    contentWrapper.classList.add('quote-display__content--entering');

    // Force reflow to restart animation
    void contentWrapper.offsetWidth;

    // Animate in
    contentWrapper.classList.remove('quote-display__content--entering');

    setTimeout(() => {
      isAnimating = false;
    }, ANIM_DURATION);
  }, ANIM_DURATION);
}

/**
 * Removes quote UI and listeners (e.g. when leaving the home route in the SPA).
 */
export function destroyQuoteDisplay() {
  destroyQuotePuck();
  if (modeChangedHandler) {
    window.removeEventListener('bb:modeChanged', modeChangedHandler);
    modeChangedHandler = null;
  }
  materialChangedCleanup?.();
  materialChangedCleanup = null;
  paletteChangedCleanup?.();
  paletteChangedCleanup = null;
  if (themeChangedHandler) {
    window.removeEventListener(THEME_CHANGE_EVENT, themeChangedHandler);
    themeChangedHandler = null;
  }
  document.getElementById('quote-display')?.remove();
  document.getElementById('quote-viewport-layer')?.remove();
  quoteContainer = null;
  contentWrapper = null;
  quoteTextEl = null;
  quoteAuthorEl = null;
  isAnimating = false;
}

/**
 * Initializes the quote display component.
 * Creates DOM elements and sets up mode change listener.
 */
export function initQuoteDisplay() {
  destroyQuoteDisplay();
  if (getState().quotePuckEnabled === false) return;

  createQuoteElement();
  syncQuoteMaterial();
  materialChangedCleanup = subscribeSimulationBodyMaterial(syncQuoteMaterial);
  paletteChangedCleanup = subscribeSimulationPalette(syncQuoteMaterial);
  themeChangedHandler = syncQuoteMaterial;
  window.addEventListener(THEME_CHANGE_EVENT, themeChangedHandler);

  // Set initial quote based on current mode (no animation)
  const state = getState();
  if (state.currentMode) {
    updateQuote(state.currentMode, false);
    // Trigger enter animation after a brief delay
    requestAnimationFrame(() => {
      contentWrapper?.classList.remove('quote-display__content--entering');
    });
  }

  modeChangedHandler = (e) => {
    const newMode = e.detail?.mode;
    if (newMode) {
      updateQuote(newMode, true);
    }
  };
  window.addEventListener('bb:modeChanged', modeChangedHandler);
}

/**
 * Manually trigger a quote update (useful for testing or external control).
 * @param {string} mode - The mode to display the quote for
 */
export function setQuote(mode) {
  updateQuote(mode, true);
}
