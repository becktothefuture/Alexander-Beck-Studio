import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { hasGateAccess, requestGateOpen } from '../lib/access-gates.js';
import { buildRouteHref, getRouteById, resolveRouteFromHref, resolveRouteFromPathname } from '../lib/routes.js';
import { installSpaNavigationBridge } from '../lib/spa-navigation.js';
import { writeManualSimulationFocus } from '../data/simulationCatalog.js';
import { clearStableTimeout, setStableTimeout } from '../lib/legacy-runtime-scope.js';
import {
  isSimulationVisualTransitionSourceActive,
  recordSimulationVisualTransitionEvent,
  runSimulationVisualTransition,
} from '../lib/simulationVisualTransition.js';
import {
  clearLegacyRouteTransitionFlags,
  clearTransitionReturningState,
  getTransitionPhase,
  installTransitionOwnershipGuard,
  installTransitionPhaseObserver,
  isRouteTransitionPhase,
  setLegacyRouteTransitionActive,
  setTransitionPhase,
  syncTransitionPhaseFromDom,
  TRANSITION_PHASES
} from '../lib/transition-phase.js';

/* ═══════════════════════════════════════════════════════════════════════════════
   ROUTE STATE
   ═══════════════════════════════════════════════════════════════════════════════ */

function readHomeFocusSimulationId(searchParams) {
  return searchParams.get('mode') || searchParams.get('focus') || searchParams.get('simulation') || null;
}

const SIMULATION_URL_STATE_PARAMS = new Set(['daily', 'focus', 'mode', 'simulation']);

function buildCleanHomeHref(url) {
  const cleanUrl = new URL(buildRouteHref('home'), window.location.origin);
  url.searchParams.forEach((value, key) => {
    if (!SIMULATION_URL_STATE_PARAMS.has(key)) {
      cleanUrl.searchParams.append(key, value);
    }
  });
  cleanUrl.hash = url.hash;
  return `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`;
}

function computeRouteState(href) {
  const url = new URL(href, window.location.href);
  const requestedRoute = resolveRouteFromPathname(url.pathname);
  const homeFocusSimulationId = requestedRoute.id === 'home'
    ? readHomeFocusSimulationId(url.searchParams)
    : null;
  const homeRouteBackedFocusId = DAILY_LAB_ROUTE_IDS.has(homeFocusSimulationId)
    ? homeFocusSimulationId
    : null;
  const labDailyFocusRouteId = DAILY_LAB_ROUTE_IDS.has(requestedRoute.id)
    && url.searchParams.get('daily') === '1'
    ? requestedRoute.id
    : null;
  const dailyFocusRouteId = homeRouteBackedFocusId || labDailyFocusRouteId;

  if (homeFocusSimulationId || dailyFocusRouteId) {
    return {
      route: getRouteById('home'),
      requestedRouteId: requestedRoute.id,
      canonicalHref: buildCleanHomeHref(url),
      redirectGateId: null,
      dailyFocusRouteId,
      focusSimulationId: homeFocusSimulationId || dailyFocusRouteId,
    };
  }

  if (requestedRoute.gated && !hasGateAccess(requestedRoute.id)) {
    const homeHref = buildRouteHref('home', {
      searchParams: { gate: requestedRoute.id },
    });
    return {
      route: getRouteById('home'),
      requestedRouteId: requestedRoute.id,
      canonicalHref: homeHref,
      redirectGateId: requestedRoute.id,
      dailyFocusRouteId: null,
      focusSimulationId: null,
    };
  }

  return {
    route: requestedRoute,
    requestedRouteId: requestedRoute.id,
    canonicalHref: `${url.pathname}${url.search}${url.hash}`,
    redirectGateId: null,
    dailyFocusRouteId: null,
    focusSimulationId: null,
  };
}

function readRouteStateSimulationFocusId(routeState) {
  return routeState?.focusSimulationId || routeState?.dailyFocusRouteId || '';
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SMOOTH TRANSITION ENGINE
   Fades route-owned surfaces (wall + title + UI) while the wall frame stays visible,
   swaps the route while invisible, then staggers the new content in.

   The wall (#simulations border/background) never changes opacity.
   #shell-wall-slot (canvas), #shell-hero-slot (title slot), and .fade-content (UI layer) fade.

   Invariants:
   - Every async step checks `stale()` before mutating DOM or state.
   - `finalizeTransition()` is the single cleanup path (idempotent).
   - Rapid route requests are queued while a transition is active and flushed afterward.
   ═══════════════════════════════════════════════════════════════════════════════ */

const FADE_OUT_MS = 220;
const STAGGER_OFFSET_MS = 0;
const ELEMENT_REVEAL_MS = 280;
const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
const READY_FALLBACK_MS = 900;
const GROUPED_ROUTE_OFFSET_MS = 80;
const SIMULATION_FOCUS_EXIT_MS = 520;
const SIMULATION_FOCUS_ENTER_MS = 500;
const SIMULATION_FOCUS_ZERO_HOLD_MS = 48;
const SIMULATION_FOCUS_EXIT_LOCAL_MS = 240;
const SIMULATION_FOCUS_ENTER_LOCAL_MS = 280;
const SIMULATION_FOCUS_EASE_OUT = 'cubic-bezier(0.72, 0, 0.86, 0.32)';
const SIMULATION_FOCUS_EASE_IN = 'cubic-bezier(0.16, 1, 0.3, 1)';
const DAILY_LAB_ROUTE_IDS = new Set([
  'wall-repel',
  'flock-of-birds',
  'mineral-growth',
  'napoleon-point-cloud',
]);

let transitionToken = 0;
let activeAnimations = [];

function readRootMs(name, fallback) {
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const value = Number.parseFloat(raw);
    if (!Number.isFinite(value)) return fallback;
    if (/ms$/i.test(raw)) return value;
    if (/s$/i.test(raw)) return value * 1000;
    return value;
  } catch {
    return fallback;
  }
}

function readRootEasing(name, fallback) {
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return raw || fallback;
  } catch {
    return fallback;
  }
}

function parseTransitionMs(value, fallback) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getRouteTransitionTimings({
  fadeMs,
  staggerMs,
  revealMs,
  readyMs,
  reduceMotion,
}) {
  const fallbackFade = readRootMs('--ui-route-duration-out', readRootMs('--ui-duration-out', FADE_OUT_MS));
  const fallbackStagger = readRootMs('--ui-route-stagger', readRootMs('--ui-stagger', STAGGER_OFFSET_MS));
  const fallbackReveal = readRootMs('--ui-route-duration-in', readRootMs('--ui-duration-in', ELEMENT_REVEAL_MS));
  const fallbackReady = parseTransitionMs(readyMs, READY_FALLBACK_MS);
  const revealEasing = readRootEasing('--ui-ease-in', EASE_OUT);
  const fadeEasing = readRootEasing('--ui-ease-out', EASE_OUT);

  if (reduceMotion) {
    return {
      fadeOut: 150,
      stagger: 0,
      reveal: 150,
      ready: fallbackReady,
      revealEasing,
      fadeEasing,
    };
  }

  return {
    fadeOut: parseTransitionMs(fadeMs, fallbackFade),
    stagger: parseTransitionMs(staggerMs, fallbackStagger),
    reveal: parseTransitionMs(revealMs, fallbackReveal),
    ready: fallbackReady,
    revealEasing,
    fadeEasing,
  };
}

/* ── content layer references ────────────────────────────────────────────── */

function getSurfaceNode(surfaceRef, fallbackSelector) {
  if (surfaceRef?.current) return surfaceRef.current;
  if (!fallbackSelector) return null;
  if (fallbackSelector.startsWith('#')) {
    return document.getElementById(fallbackSelector.slice(1));
  }
  return document.querySelector(fallbackSelector);
}

function getContentLayers(surfaceRefs) {
  return {
    wall: getSurfaceNode(surfaceRefs?.wall, '#shell-wall-slot'),
    hero: getSurfaceNode(surfaceRefs?.hero, '#shell-hero-slot'),
    ui: getSurfaceNode(surfaceRefs?.ui, '.fade-content'),
    chrome: getSurfaceNode(surfaceRefs?.chrome, '.shell-transition-surface--chrome'),
    secondary: getSurfaceNode(surfaceRefs?.secondary, '.shell-transition-surface--secondary'),
    footer: getSurfaceNode(surfaceRefs?.footer, '.shell-transition-surface--footer'),
  };
}

function setRouteLayerVisibility(visible, surfaceRefs) {
  const { wall, hero, ui } = getContentLayers(surfaceRefs);
  const hidden = !visible;
  const opacity = hidden ? '0' : '';
  const visibility = hidden ? 'hidden' : '';
  const pointerEvents = hidden ? 'none' : '';

  [wall, hero, ui].forEach((el) => {
    if (!el) return;
    if (hidden) {
      el.style.opacity = opacity;
      el.style.visibility = visibility;
      el.style.pointerEvents = pointerEvents;
    } else {
      el.style.removeProperty('opacity');
      el.style.removeProperty('visibility');
      el.style.removeProperty('pointer-events');
    }
  });
}

function buildRouteTransitionGroups(routeId, surfaceRefs) {
  const surfaces = getContentLayers(surfaceRefs);
  const addGroup = (delayMs, items) => ({
    delayMs,
    items: items.filter((item) => item?.el),
  });

  if (routeId === 'portfolio') {
    return [
      addGroup(0, [
        { el: surfaces.hero, slide: true },
        { el: surfaces.chrome, slide: true },
        { el: surfaces.footer, slide: false },
      ]),
      addGroup(GROUPED_ROUTE_OFFSET_MS, [
        { el: surfaces.wall, slide: false },
        { el: surfaces.secondary, slide: false },
      ]),
    ];
  }

  if (routeId === 'home') {
    return [
      addGroup(0, [
        { el: surfaces.hero, slide: true },
        { el: surfaces.chrome, slide: true },
        { el: surfaces.secondary, slide: true },
        { el: surfaces.footer, slide: false },
      ]),
      addGroup(GROUPED_ROUTE_OFFSET_MS, [
        { el: surfaces.wall, slide: false },
      ]),
    ];
  }

  return [
    addGroup(0, [
      { el: surfaces.chrome, slide: true },
      { el: surfaces.secondary, slide: true },
      { el: surfaces.footer, slide: false },
    ]),
    addGroup(GROUPED_ROUTE_OFFSET_MS, [
      { el: surfaces.wall, slide: false },
      { el: surfaces.hero, slide: true },
    ]),
  ];
}

function getGroupedTransitionItems(routeId, surfaceRefs) {
  const groups = buildRouteTransitionGroups(routeId, surfaceRefs);
  const seen = new Set();
  const items = [];
  groups.forEach((group) => {
    group.items.forEach((item) => {
      if (!item?.el || seen.has(item.el)) return;
      seen.add(item.el);
      items.push(item);
    });
  });
  return items;
}

/* ── backdrop cleanup (with direct-DOM fallback) ─────────────────────────── */

function forceBackdropDismiss() {
  try {
    setTransitionPhase(TRANSITION_PHASES.IDLE);
    clearTransitionReturningState();
    const blur = document.getElementById('modal-blur-layer');
    const content = document.getElementById('modal-content-layer');
    if (blur) blur.classList.remove('active');
    if (content) content.classList.remove('active');
    const scene = document.getElementById('abs-scene');
    if (scene) scene.classList.remove('gate-depth-active');
  } catch {
    /* no-op */
  }
}

function dismissGateBackdrop(options = {}) {
  import('../legacy/modules/ui/gate-modal-shared.js')
    .then((m) => m.dismissGateBackdrop(options))
    .catch(() => forceBackdropDismiss());
}

/* ── animation tracking ──────────────────────────────────────────────────── */

function cancelActiveAnimations() {
  activeAnimations.forEach((a) => {
    try {
      a.cancel();
    } catch {
      /* no-op */
    }
  });
  activeAnimations = [];
}

function isShellManagedRouteNavButton(el) {
  return Boolean(el?.matches?.('.ui-main-nav .footer_link'));
}

function commitStaggerStyles(routeId, surfaceRefs) {
  getGroupedTransitionItems(routeId, surfaceRefs).forEach(({ el }) => {
    el.style.opacity = '1';
    el.style.transform = '';
    el.style.filter = '';
    if (isShellManagedRouteNavButton(el)) {
      el.style.transition = '';
      el.style.transitionDelay = '';
    }
    el.style.willChange = 'auto';
  });
}

/* ── single cleanup path (idempotent, always safe to call) ───────────────── */

function finalizeTransition(
  isGate,
  routeId,
  surfaceRefs,
  {
    suppressReturnAnimation = false,
    gateBackdropDismissed = false,
  } = {}
) {
  cancelActiveAnimations();
  commitStaggerStyles(routeId, surfaceRefs);
  setRouteLayerVisibility(true, surfaceRefs);
  if (isGate && !gateBackdropDismissed) {
    dismissGateBackdrop({ suppressReturnAnimation });
  }
  clearLegacyRouteTransitionFlags();
  setTransitionPhase(TRANSITION_PHASES.IDLE);

  // Restore content layers.
  const { wall, hero, ui } = getContentLayers(surfaceRefs);
  if (wall) { wall.style.opacity = '1'; wall.style.willChange = 'auto'; }
  if (hero) { hero.style.opacity = '1'; hero.style.willChange = 'auto'; }
  if (ui) { ui.style.opacity = '1'; ui.style.willChange = 'auto'; }
  if (wall) {
    wall.style.removeProperty('visibility');
    wall.style.removeProperty('pointer-events');
  }
  if (hero) {
    hero.style.removeProperty('visibility');
    hero.style.removeProperty('pointer-events');
  }
  if (ui) {
    ui.style.removeProperty('visibility');
    ui.style.removeProperty('pointer-events');
  }
}

function interruptTransitionForPopstate(isGate, routeId, surfaceRefs) {
  cancelActiveAnimations();
  commitStaggerStyles(routeId, surfaceRefs);
  if (isGate) {
    dismissGateBackdrop({ suppressReturnAnimation: true });
  }
  clearLegacyRouteTransitionFlags();
  setRouteLayerVisibility(false, surfaceRefs);
  setTransitionPhase(TRANSITION_PHASES.IDLE);

  const { wall, hero, ui } = getContentLayers(surfaceRefs);
  if (wall) wall.style.willChange = 'auto';
  if (hero) hero.style.willChange = 'auto';
  if (ui) ui.style.willChange = 'auto';
}

/* ── fade out content layers (wall stays visible) ─────────────────────────── */

function fadeOutContent(durationMs, easing = EASE_OUT, surfaceRefs, options = {}) {
  const { wall, hero, ui, chrome, secondary, footer } = getContentLayers(surfaceRefs);
  const finalOpacity = Number.isFinite(options?.finalOpacity) ? options.finalOpacity : 0;
  const anims = [];
  const seen = new Set();

  [wall, hero, ui, chrome, secondary, footer].forEach((el) => {
    if (!el) return;
    if (seen.has(el)) return;
    seen.add(el);
    if (typeof el.animate !== 'function') {
      el.style.opacity = String(finalOpacity);
      return;
    }
    const anim = el.animate(
      [{ opacity: 1 }, { opacity: finalOpacity }],
      { duration: durationMs, easing, fill: 'forwards' }
    );
    activeAnimations.push(anim);
    anims.push(anim);
  });

  if (anims.length === 0) return Promise.resolve();

  return Promise.all(
    anims.map((a) => new Promise((r) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        r();
      };
      a.onfinish = finish;
      a.oncancel = finish;
      setStableTimeout(finish, durationMs + 80);
    }))
  );
}

function setSimulationFocusTransitionState(state) {
  const root = document.documentElement;
  if (state) {
    root.dataset.absSimulationFocusTransition = state;
    window.__ABS_SIMULATION_FOCUS_TRANSITION__ = {
      phase: state,
      startedAt: performance.now(),
    };
    return;
  }

  delete root.dataset.absSimulationFocusTransition;
  window.__ABS_SIMULATION_FOCUS_TRANSITION__ = {
    phase: 'idle',
    startedAt: performance.now(),
  };
}

function setSimulationShellStability(active, surfaceRefs, options = {}) {
  const root = document.documentElement;
  const { hero, ui, chrome, secondary, footer } = getContentLayers(surfaceRefs);
  const titleSurface = options.titleSurface || '';

  if (!active) {
    delete root.dataset.absSimulationShellStable;
    delete root.dataset.absSimulationTitleSurface;
    [hero, ui, chrome, secondary, footer].forEach((el) => {
      if (!el) return;
      el.style.removeProperty('opacity');
      el.style.removeProperty('visibility');
      el.style.removeProperty('pointer-events');
      el.style.removeProperty('filter');
      el.style.removeProperty('transform');
      el.style.willChange = 'auto';
    });
    return;
  }

  root.dataset.absSimulationShellStable = 'true';
  if (titleSurface) {
    root.dataset.absSimulationTitleSurface = titleSurface;
  } else {
    delete root.dataset.absSimulationTitleSurface;
  }

  [hero, ui, chrome, secondary, footer].forEach((el) => {
    if (!el) return;
    el.style.opacity = '1';
    el.style.removeProperty('visibility');
    el.style.removeProperty('pointer-events');
    el.style.removeProperty('filter');
    el.style.removeProperty('transform');
    el.style.willChange = 'auto';
  });
}

function getSimulationTitleSurfaceForRouteChange(currentRouteId, nextRouteId) {
  if (currentRouteId !== 'home' && nextRouteId === 'home') return 'dom-handoff';
  return '';
}

function getSimulationFocusLayer(surfaceRefs) {
  return getContentLayers(surfaceRefs).wall;
}

function cleanupSimulationFocusLayer(surfaceRefs) {
  const layer = getSimulationFocusLayer(surfaceRefs);
  if (!layer) return;
  layer.style.removeProperty('transform');
  layer.style.removeProperty('transform-origin');
  layer.style.removeProperty('will-change');
  layer.style.removeProperty('opacity');
  layer.style.removeProperty('filter');
  layer.style.removeProperty('pointer-events');
}

function animateSimulationFocusLayer(surfaceRefs, {
  direction,
  durationMs,
  localDurationMs,
  easing,
}) {
  const layer = getSimulationFocusLayer(surfaceRefs);
  if (layer) {
    layer.style.opacity = '1';
    layer.style.filter = 'none';
    layer.style.transform = 'none';
    layer.style.transformOrigin = '50% 50%';
    layer.style.willChange = 'auto';
    layer.style.pointerEvents = direction === 'out' ? 'none' : '';
  }

  return runSimulationVisualTransition(direction, {
    durationMs,
    localDurationMs,
    easing,
    reason: 'shell-route-transition',
  });
}

function getSimulationFocusTimings(options, reduceMotion) {
  if (reduceMotion) {
    return {
      exit: 0,
      enter: 0,
      hold: 0,
      exitLocal: 0,
      enterLocal: 0,
      exitEasing: SIMULATION_FOCUS_EASE_OUT,
      enterEasing: SIMULATION_FOCUS_EASE_IN,
    };
  }

  return {
    exit: parseTransitionMs(options.exitMs, SIMULATION_FOCUS_EXIT_MS),
    enter: parseTransitionMs(options.enterMs, SIMULATION_FOCUS_ENTER_MS),
    hold: parseTransitionMs(options.holdMs, SIMULATION_FOCUS_ZERO_HOLD_MS),
    exitLocal: parseTransitionMs(options.exitLocalMs, SIMULATION_FOCUS_EXIT_LOCAL_MS),
    enterLocal: parseTransitionMs(options.enterLocalMs, SIMULATION_FOCUS_ENTER_LOCAL_MS),
    exitEasing: options.exitEasing || SIMULATION_FOCUS_EASE_OUT,
    enterEasing: options.enterEasing || SIMULATION_FOCUS_EASE_IN,
  };
}

function waitForSimulationFocusHold(durationMs) {
  if (!durationMs) return Promise.resolve();
  return new Promise((resolve) => setStableTimeout(resolve, durationMs));
}

/* ── route ready ──────────────────────────────────────────────────────────── */

function hasCanvasBufferReady() {
  const canvas = document.getElementById('c');
  if (!canvas) return false;
  const cssW = canvas.clientWidth || 0;
  const cssH = canvas.clientHeight || 0;
  if (cssW < 64 || cssH < 64) return false;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const minW = Math.ceil((cssW + 2) * dpr) - 2;
  const minH = Math.ceil((cssH + 2) * dpr) - 2;
  return canvas.width >= minW && canvas.height >= minH;
}

function isRectUsable(rect) {
  return Boolean(rect && rect.width > 0 && rect.height > 0);
}

function rectHasUsableVisibleArea(innerRect, outerRect) {
  if (!isRectUsable(innerRect) || !isRectUsable(outerRect)) return false;
  const visibleWidth = Math.max(0, Math.min(innerRect.right, outerRect.right) - Math.max(innerRect.left, outerRect.left));
  const visibleHeight = Math.max(0, Math.min(innerRect.bottom, outerRect.bottom) - Math.max(innerRect.top, outerRect.top));
  return (
    visibleWidth >= Math.min(240, outerRect.width * 0.5)
    && visibleHeight >= Math.min(96, innerRect.height * 0.5)
  );
}

function rectsMatchWithinThreshold(previous, next, thresholdPx = 2) {
  if (!isRectUsable(previous) || !isRectUsable(next)) return false;
  return (
    Math.abs(previous.top - next.top) <= thresholdPx
    && Math.abs(previous.left - next.left) <= thresholdPx
    && Math.abs(previous.width - next.width) <= thresholdPx
    && Math.abs(previous.height - next.height) <= thresholdPx
  );
}

function isElementVisiblyRevealed(element) {
  if (!element) return false;
  const styles = window.getComputedStyle(element);
  return (
    styles.display !== 'none'
    && styles.visibility !== 'hidden'
    && Number(styles.opacity) > 0.9
  );
}

function isElementSurfaceReady(element) {
  if (!isElementVisiblyRevealed(element)) return false;
  const rect = element.getBoundingClientRect();
  return rect.width >= 64 && rect.height >= 64;
}

function isCanvasSurfaceReady(selector) {
  const canvas = document.querySelector(selector);
  if (!isElementSurfaceReady(canvas)) return false;
  return canvas.width >= 64 && canvas.height >= 64;
}

function isPortfolioScrollRailReady() {
  const wall = document.getElementById('simulations');
  const mount = document.getElementById('portfolioProjectMount');
  const firstCard = mount?.querySelector('.portfolio-deck-card.is-active, .portfolio-project-label');
  if (!wall || !mount || !firstCard) return false;
  const wallRect = wall.getBoundingClientRect();
  const cardRect = firstCard.getBoundingClientRect();
  return (
    isRectUsable(wallRect)
    && isRectUsable(cardRect)
    && cardRect.width >= Math.min(240, wallRect.width * 0.5)
    && cardRect.height >= 96
    && rectHasUsableVisibleArea(cardRect, wallRect)
    && isElementVisiblyRevealed(mount)
    && isElementVisiblyRevealed(firstCard)
  );
}

function isDailyLabRouteReady(routeId) {
  switch (routeId) {
    case 'wall-repel':
      return isCanvasSurfaceReady('#wall-repel-canvas')
        && isSimulationVisualTransitionSourceActive(routeId);
    case 'flock-of-birds':
      return isCanvasSurfaceReady('#flock-of-birds-canvas')
        && isSimulationVisualTransitionSourceActive(routeId);
    case 'mineral-growth':
      return isCanvasSurfaceReady('#mineral-growth-canvas')
        && isSimulationVisualTransitionSourceActive(routeId);
    case 'napoleon-point-cloud': {
      const figure = document.querySelector('.napoleon-point-cloud');
      const loadState = figure?.dataset?.pointCloudLoadState;
      return Boolean(
        (loadState === 'ready'
          && isCanvasSurfaceReady('.napoleon-point-cloud__canvas--front')
          && isSimulationVisualTransitionSourceActive(routeId))
        || loadState === 'error'
      );
    }
    case 'beach-ball-room': {
      const container = document.querySelector('.beach-ball-room-simulation');
      const loadState = container?.dataset?.beachBallRoomLoadState;
      return Boolean(
        (isCanvasSurfaceReady('.beach-ball-room-canvas')
          && isSimulationVisualTransitionSourceActive(routeId))
        || loadState === 'error'
      );
    }
    default:
      return false;
  }
}

function isDailyLabRouteId(routeId) {
  return DAILY_LAB_ROUTE_IDS.has(routeId);
}

function readRouteReadySnapshot(routeId) {
  if (routeId === 'portfolio') {
    return {
      wallRect: document.getElementById('simulations')?.getBoundingClientRect() || null,
      heroRect: document.getElementById('hero-title')?.getBoundingClientRect() || null,
      cardRect: document.querySelector('.portfolio-deck-card.is-active, .portfolio-project-label')?.getBoundingClientRect() || null,
      topbarRect: document.querySelector('.ui-top-main.route-topbar')?.getBoundingClientRect() || null,
    };
  }

  return null;
}

function isRouteReadySnapshotStable(routeId, previous, next) {
  if (routeId !== 'portfolio') return true;
  if (!previous || !next) return false;
  const deckFailed = document.body?.classList.contains('portfolio-deck-failed');
  return (
    rectsMatchWithinThreshold(previous.wallRect, next.wallRect, 2)
    && (!previous.heroRect || !next.heroRect || rectsMatchWithinThreshold(previous.heroRect, next.heroRect, 2))
    && (deckFailed || rectsMatchWithinThreshold(previous.cardRect, next.cardRect, 2))
    && rectsMatchWithinThreshold(previous.topbarRect, next.topbarRect, 2)
  );
}

function isRouteBaselineReady(routeId) {
  const body = document.body;
  if (!body) return false;

  if (routeId === 'home') {
    const isHomeRoute = !body.classList.contains('portfolio-page') && !body.classList.contains('cv-page');
    const hero = document.getElementById('hero-title');
    const navButtons = document.querySelectorAll('#main-links .footer_link');
    const bootOverlay = document.getElementById('abs-boot-overlay');
    const bootState = document.documentElement.dataset.absBootState || '';
    const homeRouteReady = document.documentElement.dataset.absHomeRouteReady === 'true';
    return Boolean(
      isHomeRoute
      && hero
      && navButtons.length >= 3
      && hasCanvasBufferReady()
      && !bootOverlay
      && bootState !== 'booting'
      && homeRouteReady
    );
  }

  if (routeId === 'portfolio') {
    const deckFailed = body.classList.contains('portfolio-deck-failed');
    return Boolean(
      body.classList.contains('portfolio-page')
      && document.getElementById('portfolioProjectMount')
      && document.querySelector('.ui-top-main.route-topbar')
      && hasCanvasBufferReady()
      && (deckFailed || isPortfolioScrollRailReady())
    );
  }

  if (routeId === 'cv') {
    return Boolean(
      body.classList.contains('cv-page')
      && document.querySelector('.ui-top-main.route-topbar')
      && document.querySelector('.cv-scroll-container')
    );
  }

  if (isDailyLabRouteId(routeId)) {
    return isDailyLabRouteReady(routeId);
  }

  return Boolean(document.getElementById('app-frame'));
}

function waitForRouteReady(routeId, timeoutMs) {
  let settle = () => {};
  const promise = new Promise((resolve) => {
    let settled = false;
    let pollId = 0;
    let timeoutId = 0;
    let readyEventSeen = false;
    let previousSnapshot = null;
    let stableReadyFrames = 0;
    const POLL_MS = 16;
    const REQUIRED_STABLE_FRAMES = routeId === 'portfolio' ? 2 : 0;
    const maybeSettleReady = () => {
      if (!isRouteBaselineReady(routeId)) {
        stableReadyFrames = 0;
        previousSnapshot = null;
        return false;
      }
      if (REQUIRED_STABLE_FRAMES === 0) {
        settle();
        return true;
      }

      const snapshot = readRouteReadySnapshot(routeId);
      if (snapshot && previousSnapshot && isRouteReadySnapshotStable(routeId, previousSnapshot, snapshot)) {
        stableReadyFrames += 1;
      } else {
        stableReadyFrames = 0;
      }
      previousSnapshot = snapshot;

      if (stableReadyFrames >= REQUIRED_STABLE_FRAMES) {
        settle();
        return true;
      }
      return false;
    };

    settle = () => {
      if (settled) return;
      settled = true;
      window.removeEventListener('abs:route-ready', onReady);
      if (pollId) clearStableTimeout(pollId);
      if (timeoutId) clearStableTimeout(timeoutId);
      resolve();
    };
    const onReady = (e) => {
      if ((e?.detail?.routeId || '') !== routeId) return;
      readyEventSeen = true;
      maybeSettleReady();
    };
    window.addEventListener('abs:route-ready', onReady);
    timeoutId = setStableTimeout(settle, timeoutMs);

    if (maybeSettleReady()) {
      return;
    }

    const tick = () => {
      if (settled) return;
      if (readyEventSeen && maybeSettleReady()) {
        return;
      }
      if (!readyEventSeen && maybeSettleReady()) {
        return;
      }
      pollId = setStableTimeout(tick, POLL_MS);
    };
    pollId = setStableTimeout(tick, POLL_MS);
  });
  return {
    promise,
    cancel: settle,
  };
}

/* ── staggered entrance ───────────────────────────────────────────────────── */

function staggeredEntrance({
  routeId,
  surfaceRefs,
  enterMs = ELEMENT_REVEAL_MS,
  revealEasing = EASE_OUT,
  onPrepared,
} = {}) {
  return new Promise((resolve) => {
    const groups = buildRouteTransitionGroups(routeId, surfaceRefs);
    const targets = getGroupedTransitionItems(routeId, surfaceRefs);
    const { wall, hero, ui } = getContentLayers(surfaceRefs);
    const isRouteTransition = isRouteTransitionPhase(getTransitionPhase());

    // Safety: if DOM is unexpectedly empty, just restore layers.
    if (targets.length === 0) {
      cancelActiveAnimations();
      if (wall) wall.style.opacity = '1';
      if (hero) hero.style.opacity = '1';
      if (ui) ui.style.opacity = '1';
      if (typeof onPrepared === 'function') onPrepared();
      resolve();
      return;
    }

    // Hide every target before making the UI layer visible.
    targets.forEach(({ el }) => {
      if (isShellManagedRouteNavButton(el)) {
        el.style.transition = 'none';
        el.style.transitionDelay = '0ms';
      }
      el.style.opacity = '0';
      el.style.willChange = 'opacity, transform';
    });

    // Pin content layers to opacity 0 via inline style BEFORE cancelling WAAPI.
    // This prevents a single-frame flash where the WAAPI fill:forwards is removed
    // and the element reverts to CSS opacity 1 before the new inline value applies.
    if (wall) wall.style.opacity = '0';
    if (hero) hero.style.opacity = '0';
    if (ui) ui.style.opacity = '0';
    if (wall) wall.style.removeProperty('visibility');
    if (hero) hero.style.removeProperty('visibility');
    if (ui) ui.style.removeProperty('visibility');
    if (wall) wall.style.removeProperty('pointer-events');
    if (hero) hero.style.removeProperty('pointer-events');
    if (ui) ui.style.removeProperty('pointer-events');
    cancelActiveAnimations();

    // Now restore the .fade-content container (transparent — children are hidden individually).
    if (ui) {
      ui.style.opacity = '1';
      ui.style.willChange = 'auto';
    }
    // Force reflow so children start at opacity 0 before WAAPI begins.
    void ui?.offsetHeight;

    const hasWaapi = typeof document.documentElement.animate === 'function';
    if (typeof onPrepared === 'function') onPrepared();

    groups.forEach((group) => {
      group.items.forEach(({ el, slide }) => {
        const delay = isRouteTransition ? group.delayMs : group.delayMs;
        const routeSlideOffset = isRouteTransition ? 'translateY(0)' : 'translateY(var(--space-sm))';

        if (hasWaapi) {
          const keyframes = slide
            ? [
                { opacity: 0, transform: routeSlideOffset, filter: 'blur(var(--space-xs))' },
                { opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' },
              ]
            : [
                { opacity: 0, filter: 'blur(var(--space-xs))' },
                { opacity: 1, filter: 'blur(0)' },
              ];

          const anim = el.animate(keyframes, {
            duration: enterMs,
            delay,
            easing: revealEasing,
            fill: 'forwards',
          });
          activeAnimations.push(anim);
          anim.onfinish = () => {
            el.style.opacity = '1';
            el.style.transform = '';
            el.style.filter = '';
            if (isShellManagedRouteNavButton(el)) {
              el.style.transition = '';
              el.style.transitionDelay = '';
            }
            el.style.willChange = 'auto';
          };
          anim.oncancel = anim.onfinish;
        } else {
          setStableTimeout(() => {
            el.style.transition = `opacity ${enterMs}ms ${revealEasing}, transform ${enterMs}ms ${revealEasing}, filter ${enterMs}ms ${revealEasing}`;
            el.style.opacity = '1';
            el.style.transform = '';
            el.style.filter = '';
            setStableTimeout(() => {
              el.style.transition = '';
              el.style.willChange = 'auto';
            }, enterMs + 50);
          }, delay);
        }
      });
    });

    const total = Math.max(0, ...groups.map((group) => group.delayMs)) + enterMs;
    setStableTimeout(resolve, total + 50);
  });
}

/* ═══════════════════════════════════════════════════════════════════════════════
   HOOK
   ═══════════════════════════════════════════════════════════════════════════════ */

export function useShellRouteTransition({ getRouteView, getRouteRuntime, surfaceRefs }) {
  const [routeState, setRouteState] = useState(() => computeRouteState(window.location.href));
  const transitionActiveRef = useRef(false);
  const queuedNavigationRef = useRef(null);
  const activeRouteIdRef = useRef(routeState.route.id);
  const activeFocusSimulationIdRef = useRef(readRouteStateSimulationFocusId(routeState));
  const activeGateTransitionRef = useRef(false);
  const activeRouteReadyCancelRef = useRef(null);
  const getRouteRuntimeRef = useRef(getRouteRuntime);
  const syncSteadyTransitionPhase = useCallback(() => {
    syncTransitionPhaseFromDom(document.documentElement);
  }, []);

  const navigate = useCallback((href, options = {}) => {
    const route = resolveRouteFromHref(href, window.location.href);
    if (!route) return false;

    const targetUrl = new URL(href, window.location.href);
    const nextState = computeRouteState(targetUrl.toString());
    const nextRouteId = nextState.route.id;
    const nextFocusSimulationId = readRouteStateSimulationFocusId(nextState);
    const isSameRoute = nextRouteId === activeRouteIdRef.current;
    const hasSimulationFocusChange = nextFocusSimulationId !== activeFocusSimulationIdRef.current;
    const method = options.replace ? 'replaceState' : 'pushState';
    const commit = () => {
      window.history[method](options.state || {}, '', nextState.canonicalHref);
      setRouteState(nextState);
      activeRouteIdRef.current = nextRouteId;
      activeFocusSimulationIdRef.current = nextFocusSimulationId;
    };

    if (transitionActiveRef.current) {
      if (!isSameRoute || hasSimulationFocusChange) {
        queuedNavigationRef.current = {
          href: targetUrl.toString(),
          options,
          routeId: nextRouteId,
          focusSimulationId: nextFocusSimulationId,
        };
      }
      return true;
    }

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    const nextRouteRuntime = getRouteRuntimeRef.current(nextRouteId, nextState.canonicalHref, nextState);
    const isGate = options.transitionStyle === 'gate-success';
    const isSimulationFocus = options.transitionStyle === 'simulation-focus';
    const readyMs = options.readyFallbackMs
      ?? (isGate ? 850 : (nextRouteId === 'home' ? 500 : 700));
    const routeTimings = getRouteTransitionTimings({
      fadeMs: options.exitMs,
      staggerMs: options.staggerMs,
      revealMs: options.enterMs,
      readyMs,
      reduceMotion,
    });

    const processQueuedNavigation = () => {
      const queued = queuedNavigationRef.current;
      if (!queued || transitionActiveRef.current) return;
      if (
        queued.routeId === activeRouteIdRef.current
        && (queued.focusSimulationId || '') === activeFocusSimulationIdRef.current
      ) {
        queuedNavigationRef.current = null;
        return;
      }
      queuedNavigationRef.current = null;
      setStableTimeout(() => {
        if (!transitionActiveRef.current) navigate(queued.href, queued.options);
      }, 0);
    };

    const finishTransition = (isGateTransition, gateBackdropDismissed = false) => {
      transitionActiveRef.current = false;
      activeGateTransitionRef.current = false;
      activeRouteReadyCancelRef.current?.();
      activeRouteReadyCancelRef.current = null;
      finalizeTransition(isGateTransition, activeRouteIdRef.current, surfaceRefs, {
        suppressReturnAnimation: isGateTransition,
        gateBackdropDismissed,
      });
      cleanupSimulationFocusLayer(surfaceRefs);
      setSimulationShellStability(false, surfaceRefs);
      setSimulationFocusTransitionState(null);
      syncSteadyTransitionPhase();
      processQueuedNavigation();
    };

    if (isSimulationFocus) {
      transitionActiveRef.current = true;
      activeGateTransitionRef.current = false;
      setLegacyRouteTransitionActive(true, { gate: false });
      const simulationTitleSurface = getSimulationTitleSurfaceForRouteChange(activeRouteIdRef.current, nextRouteId);
      setSimulationShellStability(true, surfaceRefs, {
        titleSurface: simulationTitleSurface,
      });

      const token = ++transitionToken;
      const stale = () => token !== transitionToken;
      const simulationTimings = getSimulationFocusTimings(options, reduceMotion);
      const readinessRouteId = nextState.dailyFocusRouteId || nextState.route.id;
      const shouldWaitForRouteReady = !isSameRoute
        || Boolean(nextState.dailyFocusRouteId)
        || hasSimulationFocusChange
        || typeof options.afterRouteReady === 'function';
      let routeReadyWaiter = null;
      const waitForCommittedRouteReady = () => {
        if (!shouldWaitForRouteReady) return Promise.resolve();
        routeReadyWaiter = waitForRouteReady(readinessRouteId, routeTimings.ready);
        activeRouteReadyCancelRef.current = routeReadyWaiter.cancel;
        return routeReadyWaiter.promise;
      };
      let routeCommitted = false;
      let enterStarted = false;
      let committedFallbackTimer = 0;
      let transitionFinished = false;
      const runCommitCallback = () => Promise.resolve()
        .then(() => (typeof options.onCommit === 'function' ? options.onCommit(nextState) : undefined))
        .catch(() => undefined);
      const runAfterRouteReady = () => Promise.resolve()
        .then(() => (typeof options.afterRouteReady === 'function' ? options.afterRouteReady(nextState) : undefined))
        .catch(() => undefined);
      const finishSimulationFocusTransition = () => {
        if (transitionFinished) return;
        transitionFinished = true;
        if (committedFallbackTimer) {
          clearStableTimeout(committedFallbackTimer);
          committedFallbackTimer = 0;
        }
        finishTransition(false);
      };
      const runSimulationFocusEnter = () => {
        enterStarted = true;
        if (committedFallbackTimer) {
          clearStableTimeout(committedFallbackTimer);
          committedFallbackTimer = 0;
        }
        setSimulationFocusTransitionState('in');
        return animateSimulationFocusLayer(surfaceRefs, {
          direction: 'in',
          durationMs: simulationTimings.enter,
          localDurationMs: simulationTimings.enterLocal,
          easing: simulationTimings.enterEasing,
        }).finally(() => {
          if (transitionActiveRef.current && activeRouteIdRef.current === nextRouteId) {
            finishSimulationFocusTransition();
          }
        });
      };
      const scheduleCommittedFallback = () => {
        if (committedFallbackTimer) clearStableTimeout(committedFallbackTimer);
        committedFallbackTimer = setStableTimeout(() => {
          committedFallbackTimer = 0;
          if (
            transitionFinished
            || enterStarted
            || !routeCommitted
            || !transitionActiveRef.current
            || activeRouteIdRef.current !== nextRouteId
          ) {
            return;
          }
          recordSimulationVisualTransitionEvent('runtime-ready-fallback', { routeId: nextState.route.id });
          void runSimulationFocusEnter();
        }, Math.max(0, routeTimings.ready) + 120);
      };
      const cancelStaleSimulationFocus = () => {
        routeReadyWaiter?.cancel();
        if (routeCommitted && transitionActiveRef.current && activeRouteIdRef.current === nextRouteId) {
          finishSimulationFocusTransition();
        }
      };

      Promise.resolve()
        .then(() => nextRouteRuntime?.loadModule?.()).catch(() => undefined)
        .then(() => {
          if (stale()) {
            cancelStaleSimulationFocus();
            return undefined;
          }
          setSimulationShellStability(true, surfaceRefs, {
            titleSurface: simulationTitleSurface,
          });
          setSimulationFocusTransitionState('out');
          return animateSimulationFocusLayer(surfaceRefs, {
            direction: 'out',
            durationMs: simulationTimings.exit,
            localDurationMs: simulationTimings.exitLocal,
            easing: simulationTimings.exitEasing,
          });
        })
        .then(() => {
          if (stale()) {
            cancelStaleSimulationFocus();
            return undefined;
          }
          setSimulationFocusTransitionState('hold');
          return waitForSimulationFocusHold(simulationTimings.hold);
        })
        .then(() => {
          if (stale()) {
            cancelStaleSimulationFocus();
            return undefined;
          }
          recordSimulationVisualTransitionEvent('commit', { routeId: nextState.route.id });
          commit();
          routeCommitted = true;
          return runCommitCallback();
        })
        .then(() => {
          if (stale()) {
            cancelStaleSimulationFocus();
            return undefined;
          }
          scheduleCommittedFallback();
          setSimulationShellStability(true, surfaceRefs, {
            titleSurface: simulationTitleSurface,
          });
          return waitForCommittedRouteReady();
        })
        .then(() => runAfterRouteReady())
        .then(() => {
          if (stale()) {
            cancelStaleSimulationFocus();
            return undefined;
          }
          return undefined;
        })
        .then(() => {
          if (stale()) {
            cancelStaleSimulationFocus();
            return undefined;
          }
          setSimulationShellStability(true, surfaceRefs, {
            titleSurface: simulationTitleSurface,
          });
          recordSimulationVisualTransitionEvent('runtime-ready', { routeId: nextState.route.id });
          return runSimulationFocusEnter();
        })
        .then(() => {
          if (stale()) {
            cancelStaleSimulationFocus();
            return;
          }
          finishSimulationFocusTransition();
        })
        .catch(() => {
          routeReadyWaiter?.cancel();
          if (stale()) {
            cancelStaleSimulationFocus();
            return;
          }
          finishSimulationFocusTransition();
        });

      return true;
    }

    /* ── smooth transition (gate-success OR any SPA route change) ────────── */
    if (!isSameRoute && !reduceMotion) {
      transitionActiveRef.current = true;
      activeGateTransitionRef.current = isGate;
      setLegacyRouteTransitionActive(true, { gate: isGate });
      setTransitionPhase(TRANSITION_PHASES.ROUTE_OUT);

      const token = ++transitionToken;
      const stale = () => token !== transitionToken;
      const routeReadyWaiter = waitForRouteReady(nextState.route.id, routeTimings.ready);
      const routeReady = routeReadyWaiter.promise;
      activeRouteReadyCancelRef.current = routeReadyWaiter.cancel;
      let gateBackdropDismissed = false;
      const dismissGateBackdropOnce = () => {
        if (!isGate || gateBackdropDismissed) return;
        gateBackdropDismissed = true;
        dismissGateBackdrop({ suppressReturnAnimation: true });
      };

      Promise.resolve()
        .then(() => nextRouteRuntime?.loadModule?.()).catch(() => undefined)
        .then(() => {
          if (stale()) {
            routeReadyWaiter.cancel();
            return;
          }
          return fadeOutContent(routeTimings.fadeOut, routeTimings.fadeEasing, surfaceRefs, {
            finalOpacity: isGate ? 0 : 0.08,
          });
        })
        .then(() => {
          if (stale()) {
            routeReadyWaiter.cancel();
            return;
          }
          if (isGate) {
            // Keep non-gate route handoffs perceptually present while waiting for destination readiness.
            setRouteLayerVisibility(false, surfaceRefs);
          }
          commit();
          return routeReady;
        })
        .then(() => {
          if (stale()) {
            routeReadyWaiter.cancel();
            return;
          }
          setTransitionPhase(TRANSITION_PHASES.ROUTE_IN);
          // Keep route layers hidden until staggeredEntrance has already pinned
          // the new route surfaces to opacity 0. Restoring visibility first can
          // expose portfolio text for a frame before the stagger prep runs.
          return staggeredEntrance({
            routeId: nextState.route.id,
            surfaceRefs,
            enterMs: routeTimings.reveal,
            revealEasing: routeTimings.revealEasing,
            onPrepared: dismissGateBackdropOnce,
          });
        })
        .then(() => {
          if (stale()) {
            routeReadyWaiter.cancel();
            return;
          }
          finishTransition(isGate, gateBackdropDismissed);
        })
        .catch(() => {
          routeReadyWaiter.cancel();
          if (!stale()) {
            finishTransition(isGate, gateBackdropDismissed);
          }
        });

      return true;
    }

    /* ── reduced motion or same-route: instant with cleanup ──────────────── */
    if (isGate) {
      transitionActiveRef.current = true;
      activeGateTransitionRef.current = true;
      setLegacyRouteTransitionActive(true, { gate: true });
      setTransitionPhase(TRANSITION_PHASES.ROUTE_OUT);
      const token = ++transitionToken;
      const stale = () => token !== transitionToken;
      const routeReadyWaiter = waitForRouteReady(nextState.route.id, routeTimings.ready);
      const routeReady = routeReadyWaiter.promise;
      activeRouteReadyCancelRef.current = routeReadyWaiter.cancel;
      let gateBackdropDismissed = false;
      const dismissGateBackdropOnce = () => {
        if (gateBackdropDismissed) return;
        gateBackdropDismissed = true;
        dismissGateBackdrop({ suppressReturnAnimation: true });
      };

      Promise.resolve()
        .then(() => nextRouteRuntime?.loadModule?.()).catch(() => undefined)
        .then(() => {
          if (stale()) {
            routeReadyWaiter.cancel();
            return;
          }
          if (!isSameRoute) {
            setRouteLayerVisibility(false, surfaceRefs);
            commit();
          }
          return routeReady;
        })
        .then(() => {
          if (stale()) {
            routeReadyWaiter.cancel();
            return;
          }
          setTransitionPhase(TRANSITION_PHASES.ROUTE_IN);
          setRouteLayerVisibility(true, surfaceRefs);
          dismissGateBackdropOnce();
          return undefined;
        })
        .then(() => {
          if (stale()) {
            routeReadyWaiter.cancel();
            return;
          }
          finishTransition(true, gateBackdropDismissed);
        })
        .catch(() => {
          routeReadyWaiter.cancel();
          if (!stale()) {
            finishTransition(true, gateBackdropDismissed);
          }
        });

      return true;
    }

    /* ── same-route or reduced-motion non-gate: instant commit ────────────── */
    commit();
    syncSteadyTransitionPhase();
    return true;
  }, [surfaceRefs, syncSteadyTransitionPhase]);

  const transitionCurrentRoute = useCallback((task, options = {}) => {
    if (transitionActiveRef.current) return false;

    const currentRouteId = activeRouteIdRef.current;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    const routeTimings = getRouteTransitionTimings({
      fadeMs: options.exitMs,
      staggerMs: options.staggerMs,
      revealMs: options.enterMs,
      readyMs: options.readyFallbackMs,
      reduceMotion,
    });
    const isSimulationFocus = options.transitionStyle === 'simulation-focus';

    const finishTransition = () => {
      transitionActiveRef.current = false;
      activeGateTransitionRef.current = false;
      finalizeTransition(false, currentRouteId, surfaceRefs);
      cleanupSimulationFocusLayer(surfaceRefs);
      setSimulationShellStability(false, surfaceRefs);
      setSimulationFocusTransitionState(null);
      syncSteadyTransitionPhase();
      const queued = queuedNavigationRef.current;
      if (!queued) return;
      queuedNavigationRef.current = null;
      if (
        queued.routeId === activeRouteIdRef.current
        && (queued.focusSimulationId || '') === activeFocusSimulationIdRef.current
      ) return;
      setStableTimeout(() => {
        if (!transitionActiveRef.current) navigate(queued.href, queued.options);
      }, 0);
    };

    const runTask = () => Promise.resolve()
      .then(() => (typeof task === 'function' ? task() : undefined));

    if (isSimulationFocus) {
      transitionActiveRef.current = true;
      setLegacyRouteTransitionActive(true, { gate: false });
      setSimulationShellStability(true, surfaceRefs);
      const token = ++transitionToken;
      const stale = () => token !== transitionToken;
      const simulationTimings = getSimulationFocusTimings(options, reduceMotion);

      setSimulationFocusTransitionState('out');
      animateSimulationFocusLayer(surfaceRefs, {
        direction: 'out',
        durationMs: simulationTimings.exit,
        localDurationMs: simulationTimings.exitLocal,
        easing: simulationTimings.exitEasing,
      })
        .then(() => {
          if (stale()) return undefined;
          setSimulationFocusTransitionState('hold');
          return waitForSimulationFocusHold(simulationTimings.hold);
        })
        .then(() => {
          if (stale()) return undefined;
          recordSimulationVisualTransitionEvent('commit', { routeId: currentRouteId });
          return runTask();
        })
        .catch(() => undefined)
        .then(() => {
          if (stale()) return undefined;
          setSimulationShellStability(true, surfaceRefs);
          recordSimulationVisualTransitionEvent('runtime-ready', { routeId: currentRouteId });
          setSimulationFocusTransitionState('in');
          return animateSimulationFocusLayer(surfaceRefs, {
            direction: 'in',
            durationMs: simulationTimings.enter,
            localDurationMs: simulationTimings.enterLocal,
            easing: simulationTimings.enterEasing,
          });
        })
        .then(() => {
          if (!stale()) {
            finishTransition();
          }
        })
        .catch(() => {
          if (!stale()) {
            finishTransition();
          }
        });

      return true;
    }

    if (reduceMotion) {
      transitionActiveRef.current = true;
      setLegacyRouteTransitionActive(true, { gate: false });
      setTransitionPhase(TRANSITION_PHASES.ROUTE_OUT);
      runTask()
        .catch(() => undefined)
        .then(finishTransition);
      return true;
    }

    transitionActiveRef.current = true;
    setLegacyRouteTransitionActive(true, { gate: false });
    setTransitionPhase(TRANSITION_PHASES.ROUTE_OUT);

    const token = ++transitionToken;
    const stale = () => token !== transitionToken;

    fadeOutContent(routeTimings.fadeOut, routeTimings.fadeEasing, surfaceRefs, { finalOpacity: 0.08 })
      .then(() => {
        if (stale()) return undefined;
        setRouteLayerVisibility(false, surfaceRefs);
        return runTask();
      })
      .catch(() => undefined)
      .then(() => {
        if (stale()) return undefined;
        setTransitionPhase(TRANSITION_PHASES.ROUTE_IN);
        return staggeredEntrance({
          routeId: currentRouteId,
          surfaceRefs,
          enterMs: routeTimings.reveal,
          revealEasing: routeTimings.revealEasing,
        });
      })
      .then(() => {
        if (!stale()) {
          finishTransition();
        }
      })
      .catch(() => {
        if (!stale()) {
          finishTransition();
        }
      });

    return true;
  }, [navigate, surfaceRefs, syncSteadyTransitionPhase]);

  useEffect(() => installSpaNavigationBridge(navigate), [navigate]);

  useEffect(() => installTransitionPhaseObserver({
    root: document.documentElement,
    isRouteTransitionActive: () => transitionActiveRef.current,
  }), []);

  useEffect(() => {
    if (!import.meta.env?.DEV) return () => {};
    return installTransitionOwnershipGuard({
      root: document.documentElement,
    });
  }, []);

  useEffect(() => {
    const onModalOpen = () => {
      if (transitionActiveRef.current) return;
      setTransitionPhase(TRANSITION_PHASES.MODAL_OPEN);
    };
    const onModalClose = (event) => {
      if (transitionActiveRef.current) return;
      setTransitionPhase(TRANSITION_PHASES.IDLE, {
        returning: !event?.detail?.suppressReturnAnimation,
      });
    };

    window.addEventListener('abs:transition-modal-open', onModalOpen);
    window.addEventListener('abs:transition-modal-close', onModalClose);
    return () => {
      window.removeEventListener('abs:transition-modal-open', onModalOpen);
      window.removeEventListener('abs:transition-modal-close', onModalClose);
    };
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const nextHref = window.location.href;
      const nextState = computeRouteState(nextHref);
      const isSameRoute = nextState.route.id === activeRouteIdRef.current;
      const wasGateTransition = activeGateTransitionRef.current;
      const wasTransitionActive = transitionActiveRef.current;

      ++transitionToken;
      queuedNavigationRef.current = null;
      if (wasTransitionActive || wasGateTransition) {
        interruptTransitionForPopstate(wasGateTransition, activeRouteIdRef.current, surfaceRefs);
      }
      activeRouteReadyCancelRef.current?.();
      activeRouteReadyCancelRef.current = null;
      transitionActiveRef.current = false;
      activeGateTransitionRef.current = false;
      if (isSameRoute) {
        setRouteLayerVisibility(true, surfaceRefs);
        setRouteState(nextState);
        activeRouteIdRef.current = nextState.route.id;
        activeFocusSimulationIdRef.current = readRouteStateSimulationFocusId(nextState);
        syncSteadyTransitionPhase();
        return;
      }
      setStableTimeout(() => {
        navigate(nextHref, { replace: true });
      }, 0);
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (transitionActiveRef.current) {
        ++transitionToken;
        queuedNavigationRef.current = null;
        activeRouteReadyCancelRef.current?.();
        activeRouteReadyCancelRef.current = null;
        finalizeTransition(activeGateTransitionRef.current, activeRouteIdRef.current, surfaceRefs);
        cleanupSimulationFocusLayer(surfaceRefs);
        setSimulationShellStability(false, surfaceRefs);
        setSimulationFocusTransitionState(null);
        transitionActiveRef.current = false;
        activeGateTransitionRef.current = false;
        syncSteadyTransitionPhase();
      }
    };
  }, [navigate, surfaceRefs, syncSteadyTransitionPhase]);

  useLayoutEffect(() => {
    getRouteRuntimeRef.current = getRouteRuntime;
  }, [getRouteRuntime]);

  useLayoutEffect(() => {
    activeRouteIdRef.current = routeState.route.id;
    activeFocusSimulationIdRef.current = readRouteStateSimulationFocusId(routeState);
  }, [routeState]);

  useLayoutEffect(() => {
    if (!transitionActiveRef.current) {
      syncSteadyTransitionPhase();
    }
  }, [routeState.route.id, syncSteadyTransitionPhase]);

  useLayoutEffect(() => {
    const gateId = routeState.redirectGateId || '';
    if (!gateId) return;
    requestGateOpen(gateId);
    window.history.replaceState({}, '', routeState.canonicalHref);
  }, [routeState.canonicalHref, routeState.redirectGateId]);

  useLayoutEffect(() => {
    const simulationId = routeState.focusSimulationId || routeState.dailyFocusRouteId || '';
    if (!simulationId) return;
    writeManualSimulationFocus(simulationId);
    const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (currentHref !== routeState.canonicalHref) {
      window.history.replaceState(window.history.state || {}, '', routeState.canonicalHref);
    }
  }, [routeState.canonicalHref, routeState.dailyFocusRouteId, routeState.focusSimulationId]);

  const routeView = useMemo(() => getRouteView(routeState.route.id, routeState.canonicalHref, routeState), [
    getRouteView,
    routeState,
  ]);
  const routeRuntime = useMemo(() => getRouteRuntime(routeState.route.id, routeState.canonicalHref, routeState), [
    getRouteRuntime,
    routeState,
  ]);

  return { routeState, routeRuntime, routeView, transitionCurrentRoute };
}
