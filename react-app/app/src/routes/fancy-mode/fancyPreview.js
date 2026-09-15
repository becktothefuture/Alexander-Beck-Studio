import { FancyField } from './fancyField.js';
import { readFancyConfig, normalizeFancyConfig } from './fancyConfig.js';
import { FancyPatternAtlas, paintFancyLegend } from './fancyPatterns.js';
import { createFancyGpuRenderer } from './fancyGpuRenderer.js';
import { fancyViewFromPath } from './fancyRoutes.js';
import { getFancyPaletteOverride } from './fancyStyles.js';
import { getResolvedSimulationFocus, writeManualSimulationFocus } from '../../data/simulationCatalog.js';
import { setSimulationPresentation } from '../../legacy/modules/rendering/simulation-presentation.js';
import { getGlobals } from '../../legacy/modules/core/state.js';
import { render } from '../../legacy/modules/physics/engine.js';
import { setTheme } from '../../legacy/modules/visual/dark-mode-v2.js';
import { isDarkThemeDocument, THEME_CHANGE_EVENT } from '../../lib/theme-state.js';
import { getSimulationPaletteSnapshot, refreshSimulationPalette } from '../../palette/simulationPaletteController.js';
import {
  getSimulationAtmosphereConfig,
  setSimulationAtmosphereConfig,
} from '../../legacy/modules/rendering/atmosphere/simulation-atmosphere.js';
import './fancy-preview.css';

const TITLE_SELECTOR = '#hero-title, #playground-route-title';
// Home copy uses its existing soft CSS shadows, without a second particle mask.
const COPY_CLEARANCE_SELECTORS = '#contact-route-content, #playground-route-description, .playground-drag-instruction';

export function initializeFancyPreview() {
  // The override belongs only to the same-origin, explicitly labelled lab frame.
  // Adding the query to the ordinary Home page does not activate Fancy Mode.
  if (!window.frameElement?.hasAttribute('data-fancy-preview')) return;
  if (!/\/lab\/fancy-(?:mode|home)(?:\.html)?$/.test(window.parent.location.pathname)) return;
  function resolveNavigationHref(href) {
    const destination = new URL(href, window.location.href);
    const mode = window.frameElement?.dataset.fancySimulation;
    if (mode && destination.origin === window.location.origin
      && /^\/(?:index(?:\.html)?)?$/.test(destination.pathname)) {
      // Home cleans its query before the legacy runtime starts. Publish through
      // the native page-session choice too, so its reload rotation cannot win.
      if (getResolvedSimulationFocus().activeId !== mode) writeManualSimulationFocus(mode);
      destination.searchParams.set('mode', mode);
      return `${destination.pathname}${destination.search}${destination.hash}`;
    }
    return href;
  }
  const initialHref = resolveNavigationHref(window.location.href);
  if (initialHref !== window.location.href) window.history.replaceState(window.history.state, '', initialHref);
  const params = new URLSearchParams(window.location.search);
  let config = readFancyConfig(params);
  // The frame carries the live preset through native full-page navigation too.
  // It is accepted only after the same-origin lab-parent check above.
  try {
    const inherited = window.frameElement.dataset.fancyConfig;
    if (inherited) config = normalizeFancyConfig(JSON.parse(inherited));
  } catch { /* A malformed frame preset falls back to the URL. */ }
  let atmosphereConfig = null;
  let observedCanvas = null;
  let canvasRect = null;
  let surfaceKey = '';
  let firstFrame = true;
  let introduced = false;
  let measuredLayoutRevision = 0;
  const patterns = new FancyPatternAtlas();
  const root = document.documentElement;
  root.classList.add('fancy-preview');

  function syncSurface() {
    root.style.setProperty('--fancy-home-shadow-opacity', String(config.fancy ? Math.min(0.8, config.copyClearance) : 0.8));
    if (isDarkThemeDocument() !== config.dark) {
      setTheme(config.dark ? 'dark' : 'light', { persist: false });
    }
    const currentAtmosphere = getSimulationAtmosphereConfig();
    if (config.fancy && currentAtmosphere.enabled) {
      atmosphereConfig = currentAtmosphere;
      setSimulationAtmosphereConfig({ ...currentAtmosphere, enabled: false });
    }
    const nextSurfaceKey = `${config.fancy}:${config.dark}:${config.artwork}`;
    if (surfaceKey !== nextSurfaceKey) {
      surfaceKey = nextSurfaceKey;
      root.dataset.fancyFinish = config.fancy ? 'fancy' : 'normal';
      root.dataset.fancyGround = config.dark ? 'black' : 'white';
      root.dataset.fancyArtwork = String(config.artwork);
    }
    patterns.update(getSimulationPaletteSnapshot(), config.dark, config.family, config.followPalette);
    paintFancyLegend(patterns, config.shape);
  }

  function measureField() {
    canvasRect = observedCanvas?.getBoundingClientRect() || null;
    const title = document.querySelector(TITLE_SELECTOR)?.getBoundingClientRect();
    field.title = null;
    if (title && canvasRect) {
      field.title = {
        x: title.left + title.width / 2 - canvasRect.left,
        y: title.top + title.height / 2 - canvasRect.top,
        rx: title.width * 0.72,
        ry: title.height * 1.05,
      };
    }
    if (canvasRect) {
      field.copyRegions = [...document.querySelectorAll(COPY_CLEARANCE_SELECTORS)].map((item) => {
        const box = item.getBoundingClientRect();
        return box.width > 0 && box.height > 0 ? {
          left: box.left - canvasRect.left, right: box.right - canvasRect.left,
          top: box.top - canvasRect.top, bottom: box.bottom - canvasRect.top,
        } : null;
      }).filter(Boolean);
    }
    field.clearanceDirty = true;
  }
  const resizeObserver = new ResizeObserver(measureField);
  const field = new FancyField({
    config,
    patterns,
    getPalette: getSimulationPaletteSnapshot,
    getSimulation: () => fancyViewFromPath(window.location.pathname) === 'home'
      ? getGlobals().currentMode || params.get('mode') : fancyViewFromPath(window.location.pathname),
    onFrame: () => {
      if (firstFrame) {
        firstFrame = false;
        syncSurface();
      }
      if (field.canvas && observedCanvas !== field.canvas) {
        resizeObserver.disconnect();
        observedCanvas = field.canvas;
        measureField();
        resizeObserver.observe(observedCanvas);
        const title = document.querySelector(TITLE_SELECTOR);
        if (title) resizeObserver.observe(title);
        document.querySelectorAll(COPY_CLEARANCE_SELECTORS).forEach((item) => resizeObserver.observe(item));
      }
      if (field.layoutRevision !== measuredLayoutRevision) {
        measuredLayoutRevision = field.layoutRevision;
        measureField();
      }
      if (!introduced && field.stats.frames > 24) {
        introduced = true;
        field.ripple(field.width * 0.62, field.height * 0.72, 0.8, 'intro');
      }
    },
  });
  field.createGpuRenderer = (THREE, renderer) => createFancyGpuRenderer(THREE, renderer, field);
  field.resolveNavigationHref = resolveNavigationHref;
  field.paletteOverride = getFancyPaletteOverride(config);
  const clearPresentation = setSimulationPresentation(field);
  refreshSimulationPalette();

  function configure(next) {
    const wasFancy = config.fancy;
    config = normalizeFancyConfig({ ...config, ...next });
    field.configure(config);
    const paletteOverride = getFancyPaletteOverride(config);
    if (field.paletteOverride !== paletteOverride) {
      field.paletteOverride = paletteOverride;
      refreshSimulationPalette();
    }
    if (wasFancy && !config.fancy && atmosphereConfig) {
      setSimulationAtmosphereConfig(atmosphereConfig);
    }
    syncSurface();
    window.dispatchEvent(new Event('abs:simulation-presentation-changed'));
    if (document.getElementById('c')) render();
  }

  function handlePointer(event) {
    if (!canvasRect || event.target.closest('button, a, input, select, summary')) return;
    const x = event.clientX - canvasRect.left;
    const y = event.clientY - canvasRect.top;
    if (x < 0 || y < 0 || x > canvasRect.width || y > canvasRect.height) return;
    field.pointer(x, y, event.type === 'pointerdown', event.pointerType === 'touch' || event.pointerType === 'pen' ? 'touch' : 'mouse');
  }
  function handleRouteReady() {
    syncSurface();
    measureField();
  }
  function handleThemeChange() {
    // Let every subscriber finish reading this event before restoring the lab
    // ground. A nested theme event could leave React on the older preference.
    queueMicrotask(syncSurface);
  }
  window.addEventListener('pointermove', handlePointer, { passive: true });
  window.addEventListener('pointerdown', handlePointer, { passive: true });
  window.addEventListener('abs:route-ready', handleRouteReady);
  window.addEventListener('bb:paletteChanged', syncSurface);
  window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
  window.__ABS_FANCY_PREVIEW__ = {
    configure,
    ripple: () => field.ripple(),
    snapshot: () => ({
      ...field.stats,
      ...config,
      config: { ...config },
      view: fancyViewFromPath(window.location.pathname),
      mode: document.querySelector('#flock-of-birds-canvas') ? 'flock-of-birds'
        : document.querySelector('#repel-room-canvas') ? 'repel-room' : getGlobals().currentMode,
      palette: getSimulationPaletteSnapshot().paletteId,
      palettePeriod: getSimulationPaletteSnapshot().periodId,
      activeFamily: patterns.family,
      reducedMotion: field.reducedMotion,
      ripples: field.ripples.length,
      rippleSources: field.ripples.map((ripple) => ripple.source),
      cell: field.cell,
      ready: (field.canvas?.isConnected && fancyViewFromPath(window.location.pathname) !== 'home')
        || Boolean(document.querySelector('[data-point-world-state="unavailable"][data-about-scene-ready="true"]'))
        || root.dataset.absHomeSimulationReady === 'true'
        || Boolean(document.querySelector('#flock-of-birds-canvas, #repel-room-canvas')?.dataset.simulationBodyCount),
    }),
  };
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) return;
    clearPresentation();
    resizeObserver.disconnect();
    window.removeEventListener('pointermove', handlePointer);
    window.removeEventListener('pointerdown', handlePointer);
    window.removeEventListener('abs:route-ready', handleRouteReady);
    window.removeEventListener('bb:paletteChanged', syncSurface);
    window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    delete window.__ABS_FANCY_PREVIEW__;
  });
  syncSurface();
}
