import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { hasGateAccess } from '../lib/access-gates.js';
import { buildRouteHref, getRouteById, resolveRouteFromHref, resolveRouteFromPathname } from '../lib/routes.js';
import { installSpaNavigationBridge } from '../lib/spa-navigation.js';
import { normalizeSimulationId, writeManualSimulationFocus } from '../data/simulationCatalog.js';
import { clearStableTimeout, setStableTimeout } from '../lib/legacy-runtime-scope.js';
import { getActiveLegacyRuntimeSnapshot } from './useLegacyRouteRuntime.js';
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
import {
  createEntranceSequence,
  resetEntranceTargets,
} from '../lib/motion/entrance-sequence.js';
import { dispatchRouteEntranceStart } from '../lib/motion/route-entrance-events.js';

/* ═══════════════════════════════════════════════════════════════════════════════
   ROUTE STATE
   ═══════════════════════════════════════════════════════════════════════════════ */

function readHomeFocusSimulationId(searchParams) {
  const requestedId = searchParams.get('mode') || searchParams.get('focus') || searchParams.get('simulation') || null;
  return requestedId ? normalizeSimulationId(requestedId) : null;
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
  const staleRouteTarget = consumeStaleRouteRequests(url);
  if (staleRouteTarget) {
    return computeRouteState(new URL(staleRouteTarget, window.location.origin).toString());
  }

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

  const lockedGateId = requestedRoute.gated && !hasGateAccess(requestedRoute.id) ? requestedRoute.id : null;
  if (!lockedGateId && requestedRoute.id === 'portfolio') {
    hasGateAccess('portfolio');
    ['portfolio', 'portfolioCode', 'access'].forEach((key) => url.searchParams.delete(key));
  }

  return {
    route: requestedRoute,
    requestedRouteId: requestedRoute.id,
    canonicalHref: buildCanonicalRouteHref(requestedRoute, url),
    redirectGateId: null,
    dailyFocusRouteId: null,
    focusSimulationId: null,
    lockedGateId,
  };
}

function consumeStaleRouteRequests(url) {
  try {
    const gate = url.searchParams.get('gate');
    if (gate === 'portfolio') {
      url.searchParams.delete('gate');
      return `${getRouteById('portfolio').path}${url.search}${url.hash}`;
    }
  } catch {
    return null;
  }

  return null;
}

function buildCanonicalRouteHref(route, url) {
  const canonical = new URL(buildRouteHref(route.id), window.location.origin);
  if (route.id === 'portfolio') {
    ['portfolio', 'portfolioCode', 'access'].forEach((key) => {
      const value = url.searchParams.get(key);
      if (value) canonical.searchParams.set(key, value);
    });
  }
  if (__DEV__ && route.id === 'about-narrative-lab' && url.searchParams.get('edit') === '1') {
    canonical.searchParams.set('edit', '1');
  }
  canonical.hash = url.hash;
  return `${canonical.pathname}${canonical.search}${canonical.hash}`;
}

function readRouteStateSimulationFocusId(routeState) {
  return routeState?.focusSimulationId || routeState?.dailyFocusRouteId || '';
}

function readRouteContentSignature(routeState) {
  return [
    routeState?.route?.id || '',
    routeState?.lockedGateId || '',
    routeState?.dailyFocusRouteId || '',
    routeState?.focusSimulationId || '',
  ].join(':');
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

const FADE_OUT_MS = 110;
const STAGGER_OFFSET_MS = 0;
const ELEMENT_REVEAL_MS = 165;
const EASE_OUT = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
const READY_FALLBACK_MS = 900;
const GROUPED_ROUTE_OFFSET_MS = 80;
const PORTFOLIO_GATE_SCENE_FADE_MS = 480;
const SIMULATION_FOCUS_EXIT_MS = 520;
const SIMULATION_FOCUS_ENTER_MS = 500;
const SIMULATION_FOCUS_ZERO_HOLD_MS = 48;
const SIMULATION_FOCUS_EXIT_LOCAL_MS = 240;
const SIMULATION_FOCUS_ENTER_LOCAL_MS = 280;
const SIMULATION_FOCUS_EASE_OUT = 'cubic-bezier(0.72, 0, 0.86, 0.32)';
const SIMULATION_FOCUS_EASE_IN = 'cubic-bezier(0.16, 1, 0.3, 1)';
const DAILY_LAB_ROUTE_IDS = new Set([
  'repel-room',
  'flock-of-birds',
  'mineral-growth',
  'rift-rings',
]);

let transitionToken = 0;
let activeAnimations = [];
let activeEntranceSequence = null;
let activeEntranceStartTimer = null;

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

function setInstrumentWakeState(state) {
  const root = document.documentElement;
  if (state) {
    root.dataset.absInstrumentWake = state;
    return;
  }
  delete root.dataset.absInstrumentWake;
}

function setRouteLayerVisibility(visible, surfaceRefs) {
  const { wall, hero, chrome, secondary } = getContentLayers(surfaceRefs);
  const hidden = !visible;
  const opacity = hidden ? '0' : '';
  const visibility = hidden ? 'hidden' : '';
  const pointerEvents = hidden ? 'none' : '';

  [wall, hero, chrome, secondary].forEach((el) => {
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

function pinRouteSurfacesForCommit(surfaceRefs) {
  const { wall, hero, chrome, secondary } = getContentLayers(surfaceRefs);

  [wall, hero, chrome, secondary].forEach((el) => {
    if (!el) return;
    el.style.opacity = '0';
    el.style.removeProperty('visibility');
    el.style.pointerEvents = 'none';
    el.style.willChange = 'opacity, transform, filter';
  });

  cancelActiveAnimations();
}

function holdPinnedRouteSurfacesUntilRouteIn(surfaceRefs, shouldContinue) {
  const tick = () => {
    if (!shouldContinue()) return;
    pinRouteSurfacesForCommit(surfaceRefs);
    window.requestAnimationFrame(tick);
  };

  window.requestAnimationFrame(tick);
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

function forceBackdropDismiss({ instant = false } = {}) {
  try {
    setTransitionPhase(TRANSITION_PHASES.IDLE);
    clearTransitionReturningState();
    const blur = document.getElementById('modal-blur-layer');
    const content = document.getElementById('modal-content-layer');
    if (instant) {
      [blur, content].forEach((layer) => {
        if (layer) layer.style.transition = 'none';
      });
    }
    if (blur) blur.classList.remove('active');
    if (content) content.classList.remove('active');
    blur?.setAttribute('aria-hidden', 'true');
    content?.setAttribute('aria-hidden', 'true');
    document.getElementById('custom-cursor')?.classList.remove('modal-active');
    if (instant && blur) {
      void blur.offsetWidth;
      requestAnimationFrame(() => {
        [blur, content].forEach((layer) => layer?.style.removeProperty('transition'));
      });
    }
    const scene = document.getElementById('abs-scene');
    if (scene) scene.classList.remove('gate-depth-active');
  } catch {
    /* no-op */
  }
}

function dismissGateBackdrop(options = {}) {
  if (options.instant) {
    forceBackdropDismiss(options);
  }
  import('../legacy/modules/ui/gate-modal-shared.js')
    .then((m) => m.dismissGateBackdrop(options))
    .catch(() => forceBackdropDismiss(options));
}

/* ── animation tracking ──────────────────────────────────────────────────── */

function cancelActiveAnimations() {
  if (activeEntranceStartTimer !== null) {
    clearStableTimeout(activeEntranceStartTimer);
    activeEntranceStartTimer = null;
  }
  activeEntranceSequence?.cancel();
  activeEntranceSequence = null;
  activeAnimations.forEach((a) => {
    try {
      a.cancel();
    } catch {
      /* no-op */
    }
  });
  activeAnimations = [];
}

function commitStaggerStyles(routeId, surfaceRefs) {
  getGroupedTransitionItems(routeId, surfaceRefs).forEach(({ el }) => {
    el.style.opacity = '1';
    el.style.transform = '';
    el.style.filter = '';
    el.style.willChange = 'auto';
  });
  const { wall, hero, chrome, secondary, footer } = getContentLayers(surfaceRefs);
  resetEntranceTargets([wall, hero, chrome, secondary, footer]);
}

/* ── single cleanup path (idempotent, always safe to call) ───────────────── */

function finalizeTransition(
  isGate,
  routeId,
  surfaceRefs,
  {
    suppressReturnAnimation = false,
    gateBackdropDismissed = false,
    preserveTransitionPhase = false,
  } = {}
) {
  cancelActiveAnimations();
  commitStaggerStyles(routeId, surfaceRefs);
  setRouteLayerVisibility(true, surfaceRefs);
  if (isGate && !gateBackdropDismissed) {
    dismissGateBackdrop({ suppressReturnAnimation });
  }
  clearLegacyRouteTransitionFlags();
  if (!preserveTransitionPhase) {
    setTransitionPhase(TRANSITION_PHASES.IDLE);
  }
  setInstrumentWakeState(null);

  // Restore content layers.
  const { wall, hero, ui, chrome, secondary } = getContentLayers(surfaceRefs);
  if (wall) { wall.style.opacity = '1'; wall.style.willChange = 'auto'; }
  if (hero) { hero.style.opacity = '1'; hero.style.willChange = 'auto'; }
  if (ui) { ui.style.opacity = '1'; ui.style.willChange = 'auto'; }
  if (chrome) { chrome.style.opacity = '1'; chrome.style.willChange = 'auto'; }
  if (secondary) { secondary.style.opacity = '1'; secondary.style.willChange = 'auto'; }
  [wall, hero, ui, chrome, secondary].forEach((el) => {
    if (!el) return;
    el.style.removeProperty('visibility');
    el.style.removeProperty('pointer-events');
    el.style.removeProperty('transform');
    el.style.removeProperty('filter');
  });
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
  setInstrumentWakeState(null);
}

/* ── fade out content layers (wall stays visible) ─────────────────────────── */

function fadeOutContent(durationMs, easing = EASE_OUT, surfaceRefs, options = {}) {
  const { wall, hero, chrome, secondary } = getContentLayers(surfaceRefs);
  const finalOpacity = Number.isFinite(options?.finalOpacity) ? options.finalOpacity : 0;
  const anims = [];
  const seen = new Set();

  setInstrumentWakeState('out');

  [wall, hero, chrome, secondary].forEach((el) => {
    if (!el) return;
    if (seen.has(el)) return;
    seen.add(el);
    if (typeof el.animate !== 'function') {
      el.style.opacity = String(finalOpacity);
      el.style.filter = 'blur(var(--instrument-wake-blur))';
      el.style.transform = 'scale(var(--instrument-wake-recede-scale))';
      return;
    }
    const anim = el.animate(
      [
        { opacity: 1, filter: 'blur(0)', transform: 'scale(1)' },
        {
          opacity: finalOpacity,
          filter: 'blur(var(--instrument-wake-blur))',
          transform: 'scale(var(--instrument-wake-recede-scale))',
        },
      ],
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

function removePortfolioGateSceneBridge() {
  document.querySelector('[data-portfolio-gate-scene-bridge]')?.remove();
}

function dismissPortfolioGateSceneBridge({
  durationMs = ELEMENT_REVEAL_MS,
  delayMs = 0,
  easing = EASE_OUT,
  instant = false,
} = {}) {
  const bridge = document.querySelector('[data-portfolio-gate-scene-bridge]');
  if (!bridge) return;
  if (instant || typeof bridge.animate !== 'function') {
    bridge.remove();
    return;
  }

  const resolvedOpacity = Number.parseFloat(getComputedStyle(bridge).opacity);
  const startOpacity = Number.isFinite(resolvedOpacity) ? resolvedOpacity : 0.5;
  const totalMs = Math.max(1, delayMs + durationMs);
  const holdOffset = Math.min(1, Math.max(0, delayMs / totalMs));
  const keyframes = holdOffset > 0
    ? [{ opacity: startOpacity, offset: 0 }, { opacity: startOpacity, offset: holdOffset }, { opacity: 0, offset: 1 }]
    : [{ opacity: startOpacity }, { opacity: 0 }];
  const animation = bridge.animate(keyframes, { duration: totalMs, easing, fill: 'forwards' });
  activeAnimations.push(animation);
  let settled = false;
  const remove = () => {
    if (settled) return;
    settled = true;
    bridge.remove();
  };
  animation.onfinish = remove;
  animation.oncancel = remove;
  setStableTimeout(remove, totalMs + 80);
}

function releasePortfolioDeck(reason = 'route-in') {
  const root = document.documentElement;
  const generation = getActiveLegacyRuntimeSnapshot().generation;
  root.dataset.absPortfolioReveal = reason;
  root.dataset.absPortfolioRevealGeneration = String(generation || 0);
  window.dispatchEvent(new CustomEvent('abs:portfolio:reveal', {
    detail: { generation, reason },
  }));
}

function clearPortfolioDeckRelease() {
  delete document.documentElement.dataset.absPortfolioReveal;
  delete document.documentElement.dataset.absPortfolioRevealGeneration;
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
  const stableSurfaces = [hero, ui, chrome, secondary, footer];

  if (!active) {
    delete root.dataset.absSimulationShellStable;
    delete root.dataset.absSimulationTitleSurface;
    stableSurfaces.forEach((el) => {
      if (!el) return;
      el.style.removeProperty('opacity');
      el.style.removeProperty('visibility');
      el.style.removeProperty('pointer-events');
      el.style.removeProperty('filter');
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

  stableSurfaces.forEach((el) => {
    if (!el) return;
    el.style.opacity = '1';
    el.style.removeProperty('visibility');
    el.style.removeProperty('pointer-events');
    el.style.removeProperty('filter');
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

function removeSimulationTransactionSnapshots() {
  document.querySelectorAll('.simulation-transaction-snapshot').forEach((node) => node.remove());
}

function resetSimulationFocusTransition(surfaceRefs, { discardSnapshots = false } = {}) {
  cleanupSimulationFocusLayer(surfaceRefs);
  if (discardSnapshots) {
    removeSimulationTransactionSnapshots();
  }
  setSimulationShellStability(false, surfaceRefs);
  setSimulationFocusTransitionState(null);
}

function captureSimulationTransactionSnapshot() {
  const host = document.getElementById('simulations');
  const snapshotHost = document.getElementById('simulation-transaction-snapshot-host');
  const hostRect = host?.getBoundingClientRect();
  if (!host || !snapshotHost || !hostRect || hostRect.width < 1 || hostRect.height < 1) return null;

  removeSimulationTransactionSnapshots();
  const pixelRatio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const snapshot = document.createElement('canvas');
  snapshot.className = 'simulation-transaction-snapshot';
  snapshot.dataset.state = 'captured';
  snapshot.width = Math.max(1, Math.round(hostRect.width * pixelRatio));
  snapshot.height = Math.max(1, Math.round(hostRect.height * pixelRatio));
  snapshot.style.left = `${hostRect.left}px`;
  snapshot.style.top = `${hostRect.top}px`;
  snapshot.style.width = `${hostRect.width}px`;
  snapshot.style.height = `${hostRect.height}px`;

  const context = snapshot.getContext('2d');
  const sourceCanvases = Array.from(host.querySelectorAll('canvas'))
    .filter((canvas) => canvas !== snapshot && canvas.width > 0 && canvas.height > 0)
    .sort((left, right) => {
      const leftZ = Number.parseFloat(getComputedStyle(left).zIndex) || 0;
      const rightZ = Number.parseFloat(getComputedStyle(right).zIndex) || 0;
      return leftZ - rightZ;
    });
  let capturedLayers = 0;
  sourceCanvases.forEach((canvas) => {
    const style = getComputedStyle(canvas);
    const rect = canvas.getBoundingClientRect();
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return;
    if (rect.width < 1 || rect.height < 1) return;
    try {
      context.globalAlpha = Number.parseFloat(style.opacity) || 1;
      context.drawImage(
        canvas,
        (rect.left - hostRect.left) * pixelRatio,
        (rect.top - hostRect.top) * pixelRatio,
        rect.width * pixelRatio,
        rect.height * pixelRatio,
      );
      capturedLayers += 1;
    } catch {
      // A failed layer capture must never block the route switch.
    }
  });
  context.globalAlpha = 1;
  if (capturedLayers === 0) return null;

  snapshot.dataset.capturedLayers = String(capturedLayers);
  let released = false;
  let releaseScheduled = false;
  let visibleAt = 0;
  const snapshotHandle = {
    node: snapshot,
    show() {
      if (released || !snapshotHost.isConnected) return;
      if (!snapshot.isConnected) {
        snapshotHost.append(snapshot);
        snapshot.getBoundingClientRect();
      }
      snapshot.dataset.state = 'visible';
      visibleAt = performance.now();
    },
    release({ immediate = false } = {}) {
      if (released) return;
      if (!immediate && visibleAt > 0) {
        const remainingRecoveryHold = 2500 - (performance.now() - visibleAt);
        if (remainingRecoveryHold > 0) {
          if (!releaseScheduled) {
            releaseScheduled = true;
            setStableTimeout(() => {
              releaseScheduled = false;
              snapshotHandle.release();
            }, remainingRecoveryHold);
          }
          return;
        }
      }
      released = true;
      if (immediate || !snapshot.isConnected) {
        snapshot.remove();
        return;
      }
      snapshot.dataset.state = 'releasing';
      setStableTimeout(() => snapshot.remove(), 200);
    },
  };
  return snapshotHandle;
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

function waitForRoutePaintFrames(count = 2) {
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let settled = false;
    let remaining = Math.max(1, count);
    const fallbackId = setStableTimeout(finish, Math.max(80, remaining * 34));
    function finish() {
      if (settled) return;
      settled = true;
      clearStableTimeout(fallbackId);
      resolve();
    }
    const tick = () => {
      if (settled) return;
      remaining -= 1;
      if (remaining <= 0) {
        finish();
        return;
      }
      window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
  });
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
  const deckPrepared = mount.classList.contains('is-portfolio-boot-preparing');
  const hasUsableGeometry = (
    isRectUsable(wallRect)
    && isRectUsable(cardRect)
    && cardRect.width >= Math.min(240, wallRect.width * 0.5)
    && cardRect.height >= 96
    && rectHasUsableVisibleArea(cardRect, wallRect)
  );
  return (
    hasUsableGeometry
    && (
      deckPrepared
      || (isElementVisiblyRevealed(mount) && isElementVisiblyRevealed(firstCard))
    )
  );
}

function isDailyLabRouteReady(routeId) {
  const isLocalAuditHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocalAuditHost && window.__ABS_AUDIT_FORCE_DAILY_NOT_READY__ === routeId) return false;
  switch (routeId) {
    case 'repel-room':
      return isCanvasSurfaceReady('#repel-room-canvas')
        && isSimulationVisualTransitionSourceActive(routeId);
    case 'flock-of-birds':
      return isCanvasSurfaceReady('#flock-of-birds-canvas')
        && isSimulationVisualTransitionSourceActive(routeId);
    case 'mineral-growth':
      return isCanvasSurfaceReady('#mineral-growth-canvas')
        && isSimulationVisualTransitionSourceActive(routeId);
    case 'rift-rings':
      return isCanvasSurfaceReady('#rift-rings-canvas')
        && isSimulationVisualTransitionSourceActive(routeId);
    case 'beach-ball-room': {
      const container = document.querySelector('.beach-ball-room-simulation');
      const loadState = container?.dataset?.beachBallRoomLoadState;
      return Boolean(
        loadState === 'ready'
          && isCanvasSurfaceReady('.beach-ball-room-canvas')
          && isSimulationVisualTransitionSourceActive(routeId)
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

function isRouteReadySnapshotStable(routeId, previous, next, options = {}) {
  if (routeId !== 'portfolio') return true;
  if (options.lockedGateId === 'portfolio') return true;
  if (!previous || !next) return false;
  const deckFailed = document.body?.classList.contains('portfolio-deck-failed');
  return (
    rectsMatchWithinThreshold(previous.wallRect, next.wallRect, 2)
    && (!previous.heroRect || !next.heroRect || rectsMatchWithinThreshold(previous.heroRect, next.heroRect, 2))
    && (deckFailed || rectsMatchWithinThreshold(previous.cardRect, next.cardRect, 2))
    && rectsMatchWithinThreshold(previous.topbarRect, next.topbarRect, 2)
  );
}

function isRouteBaselineReady(routeId, options = {}) {
  const body = document.body;
  if (!body) return false;

  if (routeId === 'home') {
    const isHomeRoute = !body.classList.contains('portfolio-page') && !body.classList.contains('cv-page');
    const root = document.documentElement;
    const hero = document.getElementById('hero-title');
    const routeTabs = document.querySelectorAll('[data-route-tab]');
    const bootOverlay = document.getElementById('abs-boot-overlay');
    const bootState = document.documentElement.dataset.absBootState || '';
    const runtime = getActiveLegacyRuntimeSnapshot();
    const semanticTitleReady = Boolean(
      hero?.querySelector('.hero-title__name')?.textContent?.trim()
      && hero?.querySelectorAll('.hero-title__role').length >= 2
      && [...hero.querySelectorAll('.hero-title__role')]
        .every((line) => line.textContent?.trim())
    );
    return Boolean(
      isHomeRoute
      && hero
      && routeTabs.length >= 4
      && hasCanvasBufferReady()
      && !bootOverlay
      && bootState !== 'booting'
      && runtime.routeId === 'home'
      && runtime.status === 'ready'
      && root.dataset.absHomeRouteReady === 'true'
      && (root.dataset.absHomeCanvasTitleReady === 'true' || semanticTitleReady)
    );
  }

  if (routeId === 'portfolio') {
    const deckFailed = body.classList.contains('portfolio-deck-failed');
    const lockedGate = document.querySelector('[data-route-content="portfolio-gate"]');
    const runtime = getActiveLegacyRuntimeSnapshot();
    if (options.lockedGateId === 'portfolio') {
      return Boolean(body.classList.contains('portfolio-page') && lockedGate);
    }
    if (options.lockedGateId === null && lockedGate) {
      return false;
    }
    return Boolean(
      body.classList.contains('portfolio-page')
      && (
        lockedGate
        || (
          runtime.routeId === 'portfolio'
          && runtime.status === 'ready'
          && hasCanvasBufferReady()
          && (
          document.getElementById('portfolioProjectMount')
          && (deckFailed || isPortfolioScrollRailReady())
          )
        )
      )
    );
  }

  if (routeId === 'about') {
    const aboutRoute = document.querySelector('[data-route-content="about"]');
    return Boolean(
      body.classList.contains('about-page')
      && aboutRoute
      && aboutRoute.dataset.aboutSceneReady === 'true'
    );
  }

  if (routeId === 'contact') {
    return Boolean(
      body.classList.contains('contact-page')
      && document.querySelector('[data-route-content="contact"]')
    );
  }

  if (isDailyLabRouteId(routeId)) {
    return isDailyLabRouteReady(routeId);
  }

  return Boolean(document.getElementById('app-frame'));
}

function waitForRouteReady(routeId, timeoutMs, options = {}) {
  let settle = () => {};
  const promise = new Promise((resolve) => {
    let settled = false;
    let pollId = 0;
    let timeoutId = 0;
    let previousSnapshot = null;
    let stableReadyFrames = 0;
    const POLL_MS = 16;
    const REQUIRED_STABLE_FRAMES = routeId === 'portfolio' ? 2 : 0;
    const maybeSettleReady = () => {
      if (!isRouteBaselineReady(routeId, options)) {
        stableReadyFrames = 0;
        previousSnapshot = null;
        return false;
      }
      if (REQUIRED_STABLE_FRAMES === 0) {
        settle('ready');
        return true;
      }

      const snapshot = readRouteReadySnapshot(routeId);
      if (snapshot && previousSnapshot && isRouteReadySnapshotStable(routeId, previousSnapshot, snapshot, options)) {
        stableReadyFrames += 1;
      } else {
        stableReadyFrames = 0;
      }
      previousSnapshot = snapshot;

      if (stableReadyFrames >= REQUIRED_STABLE_FRAMES) {
        settle('ready');
        return true;
      }
      return false;
    };

    settle = (status = 'cancelled') => {
      if (settled) return;
      settled = true;
      window.removeEventListener('abs:route-ready', onReady);
      window.removeEventListener('abs:daily-focus-failed', onFailed);
      if (pollId) clearStableTimeout(pollId);
      if (timeoutId) clearStableTimeout(timeoutId);
      resolve(status);
    };
    const onReady = (e) => {
      if ((e?.detail?.routeId || '') !== routeId) return;
      const eventGeneration = Number(e?.detail?.generation || 0);
      const currentGeneration = getActiveLegacyRuntimeSnapshot().generation;
      if (eventGeneration && eventGeneration !== currentGeneration) return;
      maybeSettleReady();
    };
    const onFailed = (event) => {
      if ((event?.detail?.routeId || '') !== routeId) return;
      settle('failed');
    };
    window.addEventListener('abs:route-ready', onReady);
    window.addEventListener('abs:daily-focus-failed', onFailed);
    timeoutId = setStableTimeout(() => settle('timeout'), timeoutMs);

    if (maybeSettleReady()) {
      return;
    }

    const tick = () => {
      if (settled) return;
      if (maybeSettleReady()) return;
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
  onViewSettled,
} = {}) {
  return new Promise((resolve) => {
    const groups = buildRouteTransitionGroups(routeId, surfaceRefs);
    const targets = getGroupedTransitionItems(routeId, surfaceRefs);
    const { wall, hero, ui, chrome, secondary, footer } = getContentLayers(surfaceRefs);
    const isRouteTransition = isRouteTransitionPhase(getTransitionPhase());
    // Safety: if DOM is unexpectedly empty, just restore layers.
    if (targets.length === 0) {
      cancelActiveAnimations();
      if (wall) wall.style.opacity = '1';
      if (hero) hero.style.opacity = '1';
      if (ui) ui.style.opacity = '1';
      if (typeof onPrepared === 'function') onPrepared();
      if (typeof onViewSettled === 'function') onViewSettled();
      dispatchRouteEntranceStart(routeId, 'route');
      resolve();
      return;
    }

    setInstrumentWakeState('in');

    // Hide every owned transition target before making it visible.
    targets.forEach(({ el }) => {
      el.style.opacity = '0';
      el.style.willChange = 'opacity, transform';
    });
    // Pin window content layers to opacity 0 via inline style BEFORE cancelling WAAPI.
    // This prevents a single-frame flash where the WAAPI fill:forwards is removed
    // and the element reverts to CSS opacity 1 before the new inline value applies.
    if (wall) wall.style.opacity = '0';
    if (hero) hero.style.opacity = '0';
    if (wall) wall.style.removeProperty('visibility');
    if (hero) hero.style.removeProperty('visibility');
    if (wall) wall.style.removeProperty('pointer-events');
    if (hero) hero.style.removeProperty('pointer-events');
    cancelActiveAnimations();

    const routeEntrance = createEntranceSequence({
      scopes: [wall, hero, chrome, secondary, footer],
      profile: 'route',
      onAnimation: (animation) => activeAnimations.push(animation),
    });
    activeEntranceSequence = routeEntrance;
    routeEntrance.stage();

    // Keep the .fade-content container visible: footer and bottom tabs live inside it.
    if (ui) {
      ui.style.opacity = '1';
      ui.style.willChange = 'auto';
    }
    // Force reflow so route-owned children are paint-committed at opacity 0
    // before their compact homepage-style entrance begins.
    void document.documentElement.offsetHeight;

    const hasWaapi = typeof document.documentElement.animate === 'function';
    if (typeof onPrepared === 'function') onPrepared();

    groups.forEach((group) => {
      group.items.forEach(({ el, slide }) => {
        const delay = isRouteTransition ? group.delayMs : group.delayMs;
        const routeSlideOffset = isRouteTransition ? 'scale(var(--instrument-wake-resolve-scale))' : 'translateY(var(--space-sm))';

        if (hasWaapi) {
          const keyframes = slide
            ? [
                { opacity: 0, transform: routeSlideOffset, filter: 'blur(var(--instrument-wake-blur))' },
                { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0)' },
              ]
            : [
                { opacity: 0, filter: 'blur(var(--instrument-wake-blur))' },
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

    const surfaceTotal = Math.max(0, ...groups.map((group) => group.delayMs)) + enterMs;
    activeEntranceStartTimer = setStableTimeout(() => {
      activeEntranceStartTimer = null;
      if (typeof onViewSettled === 'function') onViewSettled();
      dispatchRouteEntranceStart(routeId, 'route');
      void routeEntrance.play();
    }, surfaceTotal);

    const routeEnterTotal = routeEntrance.totalMs;
    setStableTimeout(resolve, surfaceTotal + routeEnterTotal + 50);
  });
}

/* ═══════════════════════════════════════════════════════════════════════════════
   HOOK
   ═══════════════════════════════════════════════════════════════════════════════ */

export function useShellRouteTransition({ getRouteView, getRouteRuntime, surfaceRefs }) {
  const [routeState, setRouteState] = useState(() => computeRouteState(window.location.href));
  const [pendingActiveRouteId, setPendingActiveRouteId] = useState(null);
  const transitionActiveRef = useRef(false);
  const queuedNavigationRef = useRef(null);
  const activeRouteIdRef = useRef(routeState.route.id);
  const activeRouteStateRef = useRef(routeState);
  const activeRouteContentSignatureRef = useRef(readRouteContentSignature(routeState));
  const activeFocusSimulationIdRef = useRef(readRouteStateSimulationFocusId(routeState));
  const activeGateTransitionRef = useRef(false);
  const activeTransitionCommittedRef = useRef(false);
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
    const nextRouteContentSignature = readRouteContentSignature(nextState);
    const nextFocusSimulationId = readRouteStateSimulationFocusId(nextState);
    const isSameRoute = nextRouteId === activeRouteIdRef.current;
    const hasRouteContentChange = nextRouteContentSignature !== activeRouteContentSignatureRef.current;
    const hasSimulationFocusChange = nextFocusSimulationId !== activeFocusSimulationIdRef.current;
    const method = options.replace ? 'replaceState' : 'pushState';
    const previousState = activeRouteStateRef.current;
    const previousRouteId = activeRouteIdRef.current;
    const previousRouteContentSignature = activeRouteContentSignatureRef.current;
    const previousFocusSimulationId = activeFocusSimulationIdRef.current;
    let historyCommitted = false;
    const commitHistory = (historyMethod = method) => {
      window.history[historyMethod](options.state || {}, '', nextState.canonicalHref);
      historyCommitted = true;
      activeTransitionCommittedRef.current = true;
    };
    const commit = () => {
      if (!historyCommitted) {
        commitHistory();
      }
      setRouteState(nextState);
      activeRouteStateRef.current = nextState;
      activeRouteIdRef.current = nextRouteId;
      activeRouteContentSignatureRef.current = nextRouteContentSignature;
      activeFocusSimulationIdRef.current = nextFocusSimulationId;
    };
    const rollback = (error) => {
      window.history.replaceState(window.history.state || {}, '', previousState.canonicalHref);
      setRouteState(previousState);
      activeRouteStateRef.current = previousState;
      activeRouteIdRef.current = previousRouteId;
      activeRouteContentSignatureRef.current = previousRouteContentSignature;
      activeFocusSimulationIdRef.current = previousFocusSimulationId;
      try {
        options.onFailure?.(error, previousState);
      } catch {
        // Failure reporting must not prevent route restoration.
      }
    };
    const canPreemptActiveTransition = Boolean(
      options.preemptTransition
      && !activeGateTransitionRef.current
      && isRouteTransitionPhase(getTransitionPhase())
    );
    const preemptActiveTransition = () => {
      const wasSimulationFocusTransition = Boolean(
        document.documentElement.dataset.absSimulationFocusTransition
      );
      ++transitionToken;
      queuedNavigationRef.current = null;
      activeRouteReadyCancelRef.current?.();
      activeRouteReadyCancelRef.current = null;
      transitionActiveRef.current = false;
      activeGateTransitionRef.current = false;
      finalizeTransition(false, activeRouteIdRef.current, surfaceRefs);
      resetSimulationFocusTransition(surfaceRefs, { discardSnapshots: true });
      if (wasSimulationFocusTransition) {
        dismissGateBackdrop({ suppressReturnAnimation: true, instant: true });
      }
      setPendingActiveRouteId(null);
      syncSteadyTransitionPhase();
      commitHistory(activeTransitionCommittedRef.current ? 'replaceState' : method);
    };

    if (transitionActiveRef.current && canPreemptActiveTransition) {
      preemptActiveTransition();
    } else if (transitionActiveRef.current) {
      if (!isSameRoute || hasRouteContentChange || hasSimulationFocusChange) {
        queuedNavigationRef.current = {
          href: targetUrl.toString(),
          options,
          routeId: nextRouteId,
          routeContentSignature: nextRouteContentSignature,
          focusSimulationId: nextFocusSimulationId,
        };
      }
      return true;
    }

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    const nextRouteRuntime = getRouteRuntimeRef.current(nextRouteId, nextState.canonicalHref, nextState);
    const isGate = options.transitionStyle === 'gate-success';
    const isSimulationFocus = options.transitionStyle === 'simulation-focus';
    if (!isSimulationFocus && document.documentElement.dataset.absSimulationFocusTransition) {
      resetSimulationFocusTransition(surfaceRefs, { discardSnapshots: true });
      dismissGateBackdrop({ suppressReturnAnimation: true, instant: true });
    }
    const readyMs = options.readyFallbackMs
      ?? (isGate ? 850 : (nextRouteId === 'home' ? 500 : (nextRouteId === 'portfolio' ? 2400 : 700)));
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
        && queued.routeContentSignature === activeRouteContentSignatureRef.current
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
      setPendingActiveRouteId(null);
      activeRouteReadyCancelRef.current?.();
      activeRouteReadyCancelRef.current = null;
      const releaseGateBackdrop = Boolean(options.releaseGateBackdropOnComplete);
      finalizeTransition(isGateTransition, activeRouteIdRef.current, surfaceRefs, {
        suppressReturnAnimation: isGateTransition,
        gateBackdropDismissed,
        preserveTransitionPhase: releaseGateBackdrop,
      });
      resetSimulationFocusTransition(surfaceRefs);
      if (releaseGateBackdrop) {
        dismissGateBackdrop({ instant: isSimulationFocus });
      } else {
        syncSteadyTransitionPhase();
      }
      // Portfolio consumes its release marker itself. Keeping the marker until
      // then makes the shell/runtime handshake replayable when module setup is
      // slower than the shell entrance preparation.
      if (activeRouteIdRef.current !== 'portfolio') clearPortfolioDeckRelease();
      if (isGateTransition) {
        removePortfolioGateSceneBridge();
      }
      try {
        options.onComplete?.(activeRouteStateRef.current);
      } catch {
        // Completion listeners are cosmetic cleanup; transition state is already settled.
      }
      processQueuedNavigation();
    };

    if (isSimulationFocus) {
      transitionActiveRef.current = true;
      activeGateTransitionRef.current = false;
      activeTransitionCommittedRef.current = historyCommitted;
      setLegacyRouteTransitionActive(true, { gate: false });
      setSimulationFocusTransitionState('prepare');
      const simulationTitleSurface = getSimulationTitleSurfaceForRouteChange(activeRouteIdRef.current, nextRouteId);
      setSimulationShellStability(true, surfaceRefs, {
        titleSurface: simulationTitleSurface,
      });

      const token = ++transitionToken;
      const stale = () => token !== transitionToken;
      const simulationTimings = getSimulationFocusTimings(options, reduceMotion);
      const retainedSimulation = captureSimulationTransactionSnapshot();
      const readinessRouteId = nextState.dailyFocusRouteId || nextState.route.id;
      const shouldWaitForRouteReady = !isSameRoute
        || Boolean(nextState.dailyFocusRouteId)
        || hasSimulationFocusChange
        || typeof options.afterRouteReady === 'function';
      let routeReadyWaiter = null;
      const waitForCommittedRouteReady = () => {
        if (!shouldWaitForRouteReady) return Promise.resolve('ready');
        routeReadyWaiter = waitForRouteReady(readinessRouteId, routeTimings.ready, {
          lockedGateId: nextState.lockedGateId || null,
        });
        activeRouteReadyCancelRef.current = routeReadyWaiter.cancel;
        return routeReadyWaiter.promise;
      };
      let routeCommitted = false;
      let transitionFinished = false;
      const runCommitCallback = () => Promise.resolve()
        .then(() => (typeof options.onCommit === 'function' ? options.onCommit(nextState) : undefined));
      const runAfterRouteReady = () => Promise.resolve()
        .then(() => (typeof options.afterRouteReady === 'function' ? options.afterRouteReady(nextState) : undefined));
      const finishSimulationFocusTransition = () => {
        if (transitionFinished) return;
        transitionFinished = true;
        retainedSimulation?.release();
        finishTransition(false);
      };
      const runSimulationFocusEnter = () => {
        setSimulationFocusTransitionState('in');
        if (nextRouteId === 'home' && !nextState.dailyFocusRouteId) {
          finishSimulationFocusTransition();
          return Promise.resolve();
        }
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
      const cancelStaleSimulationFocus = () => {
        routeReadyWaiter?.cancel();
        retainedSimulation?.release({ immediate: true });
        if (routeCommitted && transitionActiveRef.current && activeRouteIdRef.current === nextRouteId) {
          finishSimulationFocusTransition();
        }
      };

      Promise.resolve()
        .then(() => nextRouteRuntime?.loadModule?.())
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
          return waitForCommittedRouteReady();
        })
        .then((readinessStatus) => {
          if (readinessStatus !== 'ready') {
            throw new Error(`Route "${readinessRouteId}" did not become ready (${readinessStatus})`);
          }
          return runAfterRouteReady();
        })
        .then(() => runCommitCallback())
        .then(() => {
          if (stale()) {
            cancelStaleSimulationFocus();
            return undefined;
          }
          setSimulationShellStability(true, surfaceRefs, {
            titleSurface: simulationTitleSurface,
          });
          recordSimulationVisualTransitionEvent('runtime-ready', { routeId: nextState.route.id });
          retainedSimulation?.release({ immediate: true });
          return runSimulationFocusEnter();
        })
        .then(() => {
          if (stale()) {
            cancelStaleSimulationFocus();
            return;
          }
          finishSimulationFocusTransition();
        })
        .catch(async (error) => {
          routeReadyWaiter?.cancel();
          if (stale()) {
            cancelStaleSimulationFocus();
            return;
          }
          if (routeCommitted) {
            retainedSimulation?.show();
            rollback(error);
            const previousReadinessRouteId = previousState.dailyFocusRouteId || previousState.route.id;
            const restoredRouteWaiter = waitForRouteReady(previousReadinessRouteId, routeTimings.ready, {
              lockedGateId: previousState.lockedGateId || null,
            });
            await restoredRouteWaiter.promise;
          } else {
            try {
              options.onFailure?.(error, previousState);
            } catch {
              // Failure reporting must not prevent transition cleanup.
            }
          }
          retainedSimulation?.release({ immediate: !routeCommitted });
          finishSimulationFocusTransition();
        });

      return true;
    }

    /* ── smooth transition (gate-success OR any SPA route change) ────────── */
    if ((!isSameRoute || hasRouteContentChange) && !reduceMotion) {
      transitionActiveRef.current = true;
      activeGateTransitionRef.current = isGate;
      activeTransitionCommittedRef.current = historyCommitted;
      setPendingActiveRouteId(nextRouteId);
      setLegacyRouteTransitionActive(true, { gate: isGate });
      setTransitionPhase(TRANSITION_PHASES.ROUTE_OUT);

      const token = ++transitionToken;
      const stale = () => token !== transitionToken;
      const routeReadyWaiter = waitForRouteReady(nextState.route.id, routeTimings.ready, {
        lockedGateId: nextState.lockedGateId || null,
      });
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
            // Gate-success handoffs stay hidden while the destination settles.
            setRouteLayerVisibility(false, surfaceRefs);
          } else {
            pinRouteSurfacesForCommit(surfaceRefs);
          }
          commit();
          if (!isGate) {
            holdPinnedRouteSurfacesUntilRouteIn(
              surfaceRefs,
              () => !stale() && getTransitionPhase() === TRANSITION_PHASES.ROUTE_OUT
            );
          }
          return routeReady;
        })
        .then(() => {
          if (stale()) {
            routeReadyWaiter.cancel();
            return;
          }
          return waitForRoutePaintFrames(2);
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
            onPrepared: () => {
              dismissPortfolioGateSceneBridge({
                durationMs: PORTFOLIO_GATE_SCENE_FADE_MS,
                delayMs: GROUPED_ROUTE_OFFSET_MS,
                easing: 'linear',
              });
              dismissGateBackdropOnce();
            },
            onViewSettled: () => {
              if (nextRouteId === 'portfolio') {
                releasePortfolioDeck(isGate ? 'gate-success' : 'route-in');
              }
            },
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
      activeTransitionCommittedRef.current = historyCommitted;
      setPendingActiveRouteId(nextRouteId);
      setLegacyRouteTransitionActive(true, { gate: true });
      setTransitionPhase(TRANSITION_PHASES.ROUTE_OUT);
      const token = ++transitionToken;
      const stale = () => token !== transitionToken;
      const routeReadyWaiter = waitForRouteReady(nextState.route.id, routeTimings.ready, {
        lockedGateId: nextState.lockedGateId || null,
      });
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
          if (!isSameRoute || hasRouteContentChange) {
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
          releasePortfolioDeck('reduced-motion');
          dismissPortfolioGateSceneBridge({ instant: true });
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
    setPendingActiveRouteId(null);
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
      const releaseGateBackdrop = Boolean(options.releaseGateBackdropOnComplete);
      finalizeTransition(false, currentRouteId, surfaceRefs, {
        preserveTransitionPhase: releaseGateBackdrop,
      });
      resetSimulationFocusTransition(surfaceRefs);
      if (releaseGateBackdrop) {
        dismissGateBackdrop({ instant: isSimulationFocus });
      } else {
        syncSteadyTransitionPhase();
      }
      const queued = queuedNavigationRef.current;
      if (!queued) return;
      queuedNavigationRef.current = null;
      if (
        queued.routeId === activeRouteIdRef.current
        && queued.routeContentSignature === activeRouteContentSignatureRef.current
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
      activeTransitionCommittedRef.current = false;
      setLegacyRouteTransitionActive(true, { gate: false });
      setSimulationShellStability(true, surfaceRefs);
      const token = ++transitionToken;
      const stale = () => token !== transitionToken;
      const simulationTimings = getSimulationFocusTimings(options, reduceMotion);
      let taskError = null;

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
        .catch((error) => {
          taskError = error;
          try {
            options.onFailure?.(error);
          } catch {
            // Failure reporting must not prevent the current scene returning.
          }
        })
        .then(() => {
          if (stale()) return undefined;
          setSimulationShellStability(true, surfaceRefs);
          recordSimulationVisualTransitionEvent(taskError ? 'runtime-failed' : 'runtime-ready', {
            routeId: currentRouteId,
          });
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
      activeTransitionCommittedRef.current = false;
      setLegacyRouteTransitionActive(true, { gate: false });
      setTransitionPhase(TRANSITION_PHASES.ROUTE_OUT);
      runTask()
        .catch(() => undefined)
        .then(finishTransition);
      return true;
    }

    transitionActiveRef.current = true;
    activeTransitionCommittedRef.current = false;
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
      const wasSimulationFocusTransition = Boolean(
        document.documentElement.dataset.absSimulationFocusTransition
      );

      ++transitionToken;
      queuedNavigationRef.current = null;
      if (wasTransitionActive || wasGateTransition) {
        interruptTransitionForPopstate(wasGateTransition, activeRouteIdRef.current, surfaceRefs);
      }
      activeRouteReadyCancelRef.current?.();
      activeRouteReadyCancelRef.current = null;
      transitionActiveRef.current = false;
      activeGateTransitionRef.current = false;
      setPendingActiveRouteId(null);
      if (wasSimulationFocusTransition) {
        resetSimulationFocusTransition(surfaceRefs, { discardSnapshots: true });
        dismissGateBackdrop({ suppressReturnAnimation: true, instant: true });
      }
      if (isSameRoute) {
        setRouteLayerVisibility(true, surfaceRefs);
        setRouteState(nextState);
        activeRouteStateRef.current = nextState;
        activeRouteIdRef.current = nextState.route.id;
        activeRouteContentSignatureRef.current = readRouteContentSignature(nextState);
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
      const wasSimulationFocusTransition = Boolean(
        document.documentElement.dataset.absSimulationFocusTransition
      );
      if (transitionActiveRef.current) {
        ++transitionToken;
        queuedNavigationRef.current = null;
        activeRouteReadyCancelRef.current?.();
        activeRouteReadyCancelRef.current = null;
        finalizeTransition(activeGateTransitionRef.current, activeRouteIdRef.current, surfaceRefs);
        transitionActiveRef.current = false;
        activeGateTransitionRef.current = false;
        setPendingActiveRouteId(null);
        syncSteadyTransitionPhase();
      }
      if (wasSimulationFocusTransition) {
        resetSimulationFocusTransition(surfaceRefs, { discardSnapshots: true });
        dismissGateBackdrop({ suppressReturnAnimation: true, instant: true });
      }
    };
  }, [navigate, surfaceRefs, syncSteadyTransitionPhase]);

  useLayoutEffect(() => {
    getRouteRuntimeRef.current = getRouteRuntime;
  }, [getRouteRuntime]);

  useLayoutEffect(() => {
    activeRouteIdRef.current = routeState.route.id;
    activeRouteContentSignatureRef.current = readRouteContentSignature(routeState);
    activeFocusSimulationIdRef.current = readRouteStateSimulationFocusId(routeState);
  }, [routeState]);

  useLayoutEffect(() => {
    if (!transitionActiveRef.current) {
      syncSteadyTransitionPhase();
    }
  }, [routeState.route.id, syncSteadyTransitionPhase]);

  useLayoutEffect(() => {
    if (globalThis.__ABS_ROUTE_PERF_AUDIT__ === true) return;
    const simulationId = routeState.focusSimulationId || routeState.dailyFocusRouteId || '';
    const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (currentHref !== routeState.canonicalHref) {
      window.history.replaceState(window.history.state || {}, '', routeState.canonicalHref);
    }
    if (!simulationId) return;
    writeManualSimulationFocus(simulationId);
  }, [routeState.canonicalHref, routeState.dailyFocusRouteId, routeState.focusSimulationId]);

  const routeView = useMemo(() => getRouteView(routeState.route.id, routeState.canonicalHref, routeState), [
    getRouteView,
    routeState,
  ]);
  const routeRuntime = useMemo(() => getRouteRuntime(routeState.route.id, routeState.canonicalHref, routeState), [
    getRouteRuntime,
    routeState,
  ]);

  return {
    routeState,
    activeRouteId: pendingActiveRouteId || routeState.route.id,
    routeRuntime,
    routeView,
    transitionCurrentRoute,
  };
}
