// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                       QUOTE DISPLAY COMPONENT                                 ║
// ║   Viewport layer under #abs-scene (modal depth + blur stack). Drag: quote-puck. ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getState } from '../core/state.js';
import { NARRATIVE_QUOTES } from '../core/constants.js';

let quoteContainer = null;
let contentWrapper = null;
let quoteTextEl = null;
let quoteAuthorEl = null;
let isAnimating = false;
let modeChangedHandler = null;

const ANIM_DURATION = 320;
const QUOTE_END_SYMBOL = ' ⁕';

const QUOTE_LENS_FILTER_ID = 'abs-quoteLensFilter';
const QUOTE_LENS_SVG_ID = 'abs-quoteLensSvg';

/**
 * Builds an RGBA displacement map (neutral = 128,128) with radial falloff so the
 * backdrop is bent like a mild lens. Used by SVG feDisplacementMap + backdrop-filter.
 */
function buildQuoteLensDisplacementMap(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;
  const inv = 1 / size;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const nx = (i + 0.5) * inv - 0.5;
      const ny = (j + 0.5) * inv - 0.5;
      const dist = Math.hypot(nx, ny);
      const maxR = 0.5;
      const t = Math.min(dist / maxR, 1);
      const falloff = (1 - t * t) * (1 - t * t);
      const k = 0.38 * falloff;
      const rdx = -nx * k * 2;
      const rdy = -ny * k * 2;
      const r = Math.round(128 + rdx * 127);
      const g = Math.round(128 + rdy * 127);
      const idx = (j * size + i) * 4;
      data[idx] = Math.max(0, Math.min(255, r));
      data[idx + 1] = Math.max(0, Math.min(255, g));
      data[idx + 2] = 128;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Injects a hidden SVG filter (feImage + feDisplacementMap) for Tier-1 “liquid glass”
 * refraction via CSS backdrop-filter: url(#id). One per viewport layer.
 */
function ensureQuoteLensFilter(mountEl) {
  if (document.getElementById(QUOTE_LENS_SVG_ID)) return;

  const dataUrl = buildQuoteLensDisplacementMap(128);
  if (!dataUrl) return;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('id', QUOTE_LENS_SVG_ID);
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.cssText = 'position:absolute;overflow:hidden;pointer-events:none;width:0;height:0;';

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
  filter.setAttribute('id', QUOTE_LENS_FILTER_ID);
  filter.setAttribute('x', '-28%');
  filter.setAttribute('y', '-28%');
  filter.setAttribute('width', '156%');
  filter.setAttribute('height', '156%');
  filter.setAttribute('color-interpolation-filters', 'sRGB');

  const feImage = document.createElementNS('http://www.w3.org/2000/svg', 'feImage');
  feImage.setAttribute('result', 'map');
  feImage.setAttribute('preserveAspectRatio', 'none');
  feImage.setAttribute('width', '100%');
  feImage.setAttribute('height', '100%');
  feImage.setAttribute('href', dataUrl);
  feImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', dataUrl);

  const feDisp = document.createElementNS('http://www.w3.org/2000/svg', 'feDisplacementMap');
  feDisp.setAttribute('in', 'SourceGraphic');
  feDisp.setAttribute('in2', 'map');
  feDisp.setAttribute('scale', '11');
  feDisp.setAttribute('xChannelSelector', 'R');
  feDisp.setAttribute('yChannelSelector', 'G');

  filter.appendChild(feImage);
  filter.appendChild(feDisp);
  defs.appendChild(filter);
  svg.appendChild(defs);
  mountEl.insertBefore(svg, mountEl.firstChild);
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
  ensureQuoteLensFilter(layer);

  // Check if already created
  if (document.getElementById('quote-display')) {
    return document.getElementById('quote-display');
  }

  // Create container
  quoteContainer = document.createElement('div');
  quoteContainer.id = 'quote-display';
  quoteContainer.className = 'quote-display';
  quoteContainer.setAttribute('role', 'button');
  quoteContainer.setAttribute('aria-live', 'polite');
  quoteContainer.setAttribute('aria-atomic', 'true');

  const surface = document.createElement('div');
  surface.className = 'quote-display__surface';

  // Create content wrapper for animations
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
  surface.appendChild(contentWrapper);
  quoteContainer.appendChild(surface);

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
  if (modeChangedHandler) {
    window.removeEventListener('bb:modeChanged', modeChangedHandler);
    modeChangedHandler = null;
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

  createQuoteElement();

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
