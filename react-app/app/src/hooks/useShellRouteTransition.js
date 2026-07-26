import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { hasGateAccess } from '../lib/access-gates.js';
import { buildRouteHref, getRouteById, resolveRouteFromHref, resolveRouteFromPathname } from '../lib/routes.js';
import { installSpaNavigationBridge } from '../lib/spa-navigation.js';
import { normalizeSimulationId, writeManualSimulationFocus } from '../data/simulationCatalog.js';
import { clearStableTimeout, setStableTimeout } from '../lib/legacy-runtime-scope.js';
import {
  getActiveLegacyRuntimeSnapshot,
  loadRouteRuntimeModule,
} from './useLegacyRouteRuntime.js';
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
import { createRouteLoaderTimingDriver } from '../lib/motion/route-transition-loader-timing.js';
import {
  createRouteHistoryCoordinator,
  createRouteHistoryDriver,
  settleRouteFocus,
} from '../lib/motion/route-transition-navigation.js';
import { prewarmRouteReadiness } from '../lib/motion/route-readiness-registry.js';
import { createRouteTransitionParticipantGeneration } from '../lib/motion/route-transition-participants.js';
import {
  ROUTE_NAVIGATION_DECISIONS,
  advanceRouteTransitionTransaction,
  cancelRouteTransitionTransaction,
  classifyRouteNavigationIntent,
  createRouteTransitionTransaction,
  markRouteTransitionCommitted,
  settleRouteTransitionTransaction,
} from '../lib/motion/route-transition-transaction.js';
import {
  createRouteSurfaceInertRegistry,
  getOwnedRouteSurfaceNodes,
  getRouteContentLayers,
  pinRouteSurfacesForCommit,
  restoreRouteSurfaces,
  setRouteSurfaceVisibility,
} from '../lib/motion/route-transition-surfaces.js';
import { getShellRouteTransitionConfig } from '../legacy/modules/visual/site-shell.js';

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

function createAnimationRegistry() {
  const registry = {
    animations: new Set(),
    timers: new Map(),
    entranceSequence: null,
    add(animation) {
      if (animation) registry.animations.add(animation);
      return animation;
    },
    addTimer(callback, delayMs, onCancel = null) {
      let timeoutId = null;
      timeoutId = setStableTimeout(() => {
        registry.timers.delete(timeoutId);
        callback();
      }, delayMs);
      registry.timers.set(timeoutId, onCancel);
      return timeoutId;
    },
    removeTimer(timeoutId) {
      if (!registry.timers.has(timeoutId)) return false;
      clearStableTimeout(timeoutId);
      registry.timers.delete(timeoutId);
      return true;
    },
    cancel() {
      registry.entranceSequence?.cancel();
      registry.entranceSequence = null;
      registry.animations.forEach((animation) => {
        try {
          animation.cancel();
        } catch {
          /* The animation may already be detached with its route. */
        }
      });
      registry.animations.clear();
      registry.timers.forEach((onCancel, timeoutId) => {
        clearStableTimeout(timeoutId);
        onCancel?.();
      });
      registry.timers.clear();
    },
  };
  return registry;
}

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
  repeatVisit = false,
}) {
  const shared = getShellRouteTransitionConfig();
  const fallbackFade = readRootMs('--ui-route-duration-out', readRootMs('--ui-duration-out', FADE_OUT_MS));
  const fallbackStagger = readRootMs('--ui-route-stagger', readRootMs('--ui-stagger', STAGGER_OFFSET_MS));
  const fallbackReveal = readRootMs('--ui-route-duration-in', readRootMs('--ui-duration-in', ELEMENT_REVEAL_MS));
  const fallbackReady = parseTransitionMs(readyMs, shared.readinessTimeoutMs || READY_FALLBACK_MS);
  const revealEasing = readRootEasing('--ui-ease-in', EASE_OUT);
  const fadeEasing = readRootEasing('--ui-ease-out', EASE_OUT);
  const timingScale = repeatVisit ? shared.repeatTimingScale : 1;
  const staggerScale = repeatVisit ? shared.repeatStaggerScale : 1;

  if (reduceMotion) {
    return {
      fadeOut: 120,
      stagger: 0,
      reveal: 120,
      ready: fallbackReady,
      revealEasing,
      fadeEasing,
      spinnerDelay: shared.spinnerDelayMs,
      spinnerMinimum: 0,
      staggerScale: 0,
      opacityOnly: true,
      repeatVisit,
    };
  }

  return {
    fadeOut: parseTransitionMs(fadeMs, shared.exitDurationMs ?? fallbackFade) * timingScale,
    stagger: parseTransitionMs(staggerMs, fallbackStagger) * staggerScale,
    reveal: parseTransitionMs(revealMs, shared.surfaceEnterDurationMs ?? fallbackReveal) * timingScale,
    ready: fallbackReady,
    revealEasing,
    fadeEasing,
    spinnerDelay: shared.spinnerDelayMs,
    spinnerMinimum: shared.spinnerMinimumMs,
    staggerScale,
    opacityOnly: false,
    repeatVisit,
  };
}

function prepareRouteRuntime({
  routeId,
  contentSignature,
  runtime,
  priority = 'data',
  reason = 'unknown',
  signal = null,
} = {}) {
  const prepare = typeof runtime?.prewarm === 'function'
    ? (context) => runtime.prewarm(context)
    : (typeof runtime?.loadModule === 'function'
        ? () => loadRouteRuntimeModule(runtime.loadModule)
        : () => true);
  return prewarmRouteReadiness({
    routeId,
    contentSignature,
    priority,
    reason,
    signal,
    prepare,
  });
}

/* ── content layer references ────────────────────────────────────────────── */

function setInstrumentWakeState(state) {
  const root = document.documentElement;
  if (state) {
    root.dataset.absInstrumentWake = state;
    return;
  }
  delete root.dataset.absInstrumentWake;
}

function buildRouteTransitionGroups(routeId, surfaceRefs, groupOffsetMs = GROUPED_ROUTE_OFFSET_MS) {
  const surfaces = getRouteContentLayers(surfaceRefs);
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
      addGroup(groupOffsetMs, [
        { el: surfaces.wall, slide: false, materialOwned: true },
        { el: surfaces.secondary, slide: false },
        { el: surfaces.footer, slide: true },
        { el: surfaces.controls, slide: true },
      ]),
    ];
  }

  if (routeId === 'home') {
    return [
      addGroup(0, [
        { el: surfaces.wall, slide: false, materialOwned: true },
        { el: surfaces.hero, slide: true },
        { el: surfaces.chrome, slide: true },
        { el: surfaces.secondary, slide: true },
        { el: surfaces.footer, slide: true },
        { el: surfaces.controls, slide: true },
      ]),
    ];
  }

  return [
    addGroup(0, [
      { el: surfaces.chrome, slide: true },
      { el: surfaces.secondary, slide: true },
      { el: surfaces.footer, slide: true },
      { el: surfaces.controls, slide: true },
    ]),
    addGroup(groupOffsetMs, [
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

function commitStaggerStyles(routeId, surfaceRefs) {
  getGroupedTransitionItems(routeId, surfaceRefs).forEach(({ el }) => {
    el.style.opacity = '1';
    el.style.transform = '';
    el.style.filter = '';
    el.style.willChange = 'auto';
  });
  resetEntranceTargets(getOwnedRouteSurfaceNodes(surfaceRefs));
}

/* ── single cleanup path (idempotent, always safe to call) ───────────────── */

function finalizeTransition(
  isGate,
  routeId,
  surfaceRefs,
  animationRegistry,
  inertRegistry,
  {
    suppressReturnAnimation = false,
    gateBackdropDismissed = false,
    preserveTransitionPhase = false,
  } = {}
) {
  animationRegistry.cancel();
  inertRegistry.restore();
  commitStaggerStyles(routeId, surfaceRefs);
  setRouteSurfaceVisibility(true, surfaceRefs);
  if (isGate && !gateBackdropDismissed) {
    dismissGateBackdrop({ suppressReturnAnimation });
  }
  clearLegacyRouteTransitionFlags();
  if (!preserveTransitionPhase) {
    setTransitionPhase(TRANSITION_PHASES.IDLE);
  }
  delete document.documentElement.dataset.absRouteLoadingCoveredAt;
  setInstrumentWakeState(null);

  restoreRouteSurfaces(surfaceRefs);
}

/* ── fade out content layers (wall stays visible) ─────────────────────────── */

function fadeOutContent(durationMs, easing = EASE_OUT, surfaceRefs, animationRegistry, options = {}) {
  const finalOpacity = Number.isFinite(options?.finalOpacity) ? options.finalOpacity : 0;
  const opacityOnly = options?.opacityOnly === true;
  const anims = [];
  const seen = new Set();

  setInstrumentWakeState(opacityOnly ? null : 'out');

  getOwnedRouteSurfaceNodes(surfaceRefs).forEach((el) => {
    if (!el) return;
    if (seen.has(el)) return;
    seen.add(el);
    if (typeof el.animate !== 'function') {
      el.style.opacity = String(finalOpacity);
      if (!opacityOnly) {
        el.style.filter = 'blur(var(--instrument-wake-blur))';
        el.style.transform = 'scale(var(--instrument-wake-recede-scale))';
      }
      return;
    }
    const resolvedOpacity = Number.parseFloat(getComputedStyle(el).opacity);
    const startOpacity = Number.isFinite(resolvedOpacity) ? resolvedOpacity : 1;
    const anim = el.animate(
      opacityOnly
        ? [{ opacity: startOpacity }, { opacity: finalOpacity }]
        : [
            { opacity: startOpacity, filter: 'blur(0)', transform: 'scale(1)' },
            {
              opacity: finalOpacity,
              filter: 'blur(var(--instrument-wake-blur))',
              transform: 'scale(var(--instrument-wake-recede-scale))',
            },
          ],
      { duration: durationMs, easing, fill: 'forwards' }
    );
    animationRegistry.add(anim);
    anims.push(anim);
  });

  if (anims.length === 0) return Promise.resolve();

  return Promise.all(
    anims.map((a) => new Promise((r) => {
      let settled = false;
      let fallbackId = null;
      const finish = () => {
        if (settled) return;
        settled = true;
        animationRegistry.removeTimer(fallbackId);
        r();
      };
      a.onfinish = finish;
      a.oncancel = finish;
      fallbackId = animationRegistry.addTimer(finish, durationMs + 80, finish);
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
  animationRegistry = null,
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
  animationRegistry?.add(animation);
  let settled = false;
  let fallbackId = null;
  const remove = () => {
    if (settled) return;
    settled = true;
    animationRegistry?.removeTimer(fallbackId);
    bridge.remove();
  };
  animation.onfinish = remove;
  animation.oncancel = remove;
  fallbackId = animationRegistry
    ? animationRegistry.addTimer(remove, totalMs + 80, remove)
    : setStableTimeout(remove, totalMs + 80);
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
  const { hero, ui, chrome, secondary, footer } = getRouteContentLayers(surfaceRefs);
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
  return getRouteContentLayers(surfaceRefs).wall;
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

function waitWithTransitionTimeout(promise, timeoutMs, signal = null) {
  if (signal?.aborted) {
    return Promise.reject(new DOMException('Transition aborted.', 'AbortError'));
  }
  if (!(timeoutMs > 0)) return Promise.resolve(promise);
  return new Promise((resolve, reject) => {
    const finish = (callback, value) => {
      clearStableTimeout(timeoutId);
      signal?.removeEventListener('abort', handleAbort);
      callback(value);
    };
    const handleAbort = () => finish(reject, new DOMException('Transition aborted.', 'AbortError'));
    const timeoutId = setStableTimeout(() => {
      finish(reject, new Error('Route transition participant readiness timed out.'));
    }, timeoutMs);
    signal?.addEventListener('abort', handleAbort, { once: true });
    Promise.resolve(promise).then(
      (value) => finish(resolve, value),
      (error) => finish(reject, error),
    );
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
  const deckPrepared = document.getElementById('portfolioProjectMount')
    ?.classList.contains('is-portfolio-boot-preparing');
  if (deckPrepared) {
    return (
      rectsMatchWithinThreshold(previous.wallRect, next.wallRect, 2)
      && rectsMatchWithinThreshold(previous.cardRect, next.cardRect, 2)
    );
  }
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
    const portfolioMount = document.getElementById('portfolioProjectMount');
    const deckPrepared = portfolioMount?.classList.contains('is-portfolio-boot-preparing');
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
            portfolioMount
            && (deckFailed || deckPrepared || isPortfolioScrollRailReady())
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
      && (
        aboutRoute.dataset.aboutSceneReady === 'true'
        || !body.classList.contains('about-narrative-page')
      )
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
    const isLocalAuditHost = window.location.hostname === 'localhost'
      || window.location.hostname === '127.0.0.1';
    const auditDelayMs = isLocalAuditHost
      ? Math.max(0, Number(window.__ABS_AUDIT_ROUTE_READINESS_DELAY_MS__ || 0))
      : 0;
    const readinessStartedAt = Number(options.readinessStartedAt) || performance.now();
    const auditReadyNotBefore = readinessStartedAt + auditDelayMs;
    // Portfolio's runtime and participant each own painted-geometry barriers;
    // repeating them in the shell delayed a fully prepared deck by three more
    // frames without adding a stronger invariant.
    const REQUIRED_STABLE_FRAMES = 0;
    const maybeSettleReady = () => {
      if (!isRouteBaselineReady(routeId, options)) {
        stableReadyFrames = 0;
        previousSnapshot = null;
        return false;
      }
      if (auditDelayMs > 0 && performance.now() < auditReadyNotBefore) return false;
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
      window.removeEventListener('abs:route-failed', onFailed);
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
    window.addEventListener('abs:route-failed', onFailed);
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
  animationRegistry,
  enterMs = ELEMENT_REVEAL_MS,
  revealEasing = EASE_OUT,
  repeatVisit = false,
  reducedMotion = false,
  staggerScale = 1,
  onPrepared,
  onViewSettled,
} = {}) {
  return new Promise((resolve) => {
    const groupOffsetMs = reducedMotion ? 0 : GROUPED_ROUTE_OFFSET_MS * staggerScale;
    const groups = buildRouteTransitionGroups(routeId, surfaceRefs, groupOffsetMs);
    const targets = getGroupedTransitionItems(routeId, surfaceRefs);
    const { wall, hero, ui, chrome, secondary, footer, controls } = getRouteContentLayers(surfaceRefs);
    const isRouteTransition = isRouteTransitionPhase(getTransitionPhase());
    // Safety: if DOM is unexpectedly empty, just restore layers.
    if (targets.length === 0) {
      animationRegistry.cancel();
      if (wall) wall.style.opacity = '1';
      if (hero) hero.style.opacity = '1';
      if (ui) ui.style.opacity = '1';
      if (typeof onPrepared === 'function') onPrepared();
      if (typeof onViewSettled === 'function') onViewSettled();
      dispatchRouteEntranceStart(routeId, 'route');
      resolve();
      return;
    }

    setInstrumentWakeState(reducedMotion ? null : 'in');

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
    animationRegistry.cancel();

    const routeEntrance = createEntranceSequence({
      scopes: [wall, hero, chrome, secondary, footer, controls],
      profile: 'route',
      timingMode: reducedMotion ? 'reduced' : (repeatVisit ? 'repeat' : 'first'),
      reducedMotion,
      onAnimation: (animation) => animationRegistry.add(animation),
    });
    animationRegistry.entranceSequence = routeEntrance;
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
    if (typeof onViewSettled === 'function') onViewSettled();
    dispatchRouteEntranceStart(routeId, 'route');
    const childEntrancePromise = routeEntrance.play();
    const surfacePromises = [];

    groups.forEach((group) => {
      group.items.forEach(({ el, slide, materialOwned = false }) => {
        const delay = reducedMotion ? 0 : group.delayMs;
        const routeSlideOffset = isRouteTransition ? 'scale(var(--instrument-wake-resolve-scale))' : 'translateY(var(--space-sm))';

        if (materialOwned) {
          el.style.opacity = '1';
          el.style.transform = '';
          el.style.filter = '';
          el.style.willChange = 'auto';
          return;
        }

        if (hasWaapi) {
          const keyframes = reducedMotion
            ? [{ opacity: 0 }, { opacity: 1 }]
            : slide
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
          animationRegistry.add(anim);
          anim.onfinish = () => {
            el.style.opacity = '1';
            el.style.transform = '';
            el.style.filter = '';
            el.style.willChange = 'auto';
          };
          anim.oncancel = anim.onfinish;
          surfacePromises.push(anim.finished.catch(() => undefined));
        } else {
          surfacePromises.push(new Promise((surfaceResolve) => {
            let resolved = false;
            const settleSurface = () => {
              if (resolved) return;
              resolved = true;
              surfaceResolve();
            };
            animationRegistry.addTimer(() => {
              if (!el.isConnected) {
                settleSurface();
                return;
              }
              el.style.transition = reducedMotion
                ? `opacity ${enterMs}ms ${revealEasing}`
                : `opacity ${enterMs}ms ${revealEasing}, transform ${enterMs}ms ${revealEasing}, filter ${enterMs}ms ${revealEasing}`;
              el.style.opacity = '1';
              el.style.transform = '';
              el.style.filter = '';
              animationRegistry.addTimer(() => {
                if (el.isConnected) {
                  el.style.transition = '';
                  el.style.willChange = 'auto';
                }
                settleSurface();
              }, enterMs + 50, settleSurface);
            }, delay, settleSurface);
          }));
        }
      });
    });
    Promise.all([childEntrancePromise, ...surfacePromises]).then(resolve);
  });
}

/* ═══════════════════════════════════════════════════════════════════════════════
   HOOK
   ═══════════════════════════════════════════════════════════════════════════════ */

export function useShellRouteTransition({ getRouteView, getRouteRuntime, surfaceRefs }) {
  const [routeState, setRouteState] = useState(() => computeRouteState(window.location.href));
  const [pendingActiveRouteId, setPendingActiveRouteId] = useState(null);
  const [transitionState, setTransitionState] = useState(() => ({
    phase: TRANSITION_PHASES.IDLE,
    generation: 0,
    pendingRouteId: null,
    loaderPresentation: 'plate',
    loaderSpinnerStartedAt: 0,
    activation: null,
    phaseStartedAt: performance.now(),
    settledGeneration: 0,
    settledRouteId: routeState.route.id,
  }));
  const transitionActiveRef = useRef(false);
  const queuedNavigationRef = useRef(null);
  const activeRouteIdRef = useRef(routeState.route.id);
  const activeRouteStateRef = useRef(routeState);
  const settledRouteStateRef = useRef(routeState);
  const activeRouteContentSignatureRef = useRef(readRouteContentSignature(routeState));
  const activeFocusSimulationIdRef = useRef(readRouteStateSimulationFocusId(routeState));
  const activeGateTransitionRef = useRef(false);
  const activeTransitionCommittedRef = useRef(false);
  const activeRouteReadyCancelRef = useRef(null);
  const transitionGenerationRef = useRef(0);
  const activeTransactionRef = useRef(null);
  const routeLoaderSessionRef = useRef(null);
  const navigateRef = useRef(null);
  const [animationRegistry] = useState(() => createAnimationRegistry());
  const [inertRegistry] = useState(() => createRouteSurfaceInertRegistry());
  const [historyCoordinator] = useState(() => createRouteHistoryCoordinator());
  const visitedRouteIdsRef = useRef(new Set([routeState.route.id]));
  const lastActivationRef = useRef('pointer');
  const getRouteRuntimeRef = useRef(getRouteRuntime);
  const syncSteadyTransitionPhase = useCallback(() => {
    syncTransitionPhaseFromDom(document.documentElement);
  }, []);
  const publishTransitionPhase = useCallback((
    phase,
    generation = 0,
    pendingRouteId = null,
    activation = null,
  ) => {
    // The DOM phase is synchronous and is the paint-safety boundary. React state
    // mirrors it for the persistent loader, accessibility, and diagnostics.
    const transaction = activeTransactionRef.current;
    if (transaction?.generation === generation && isRouteTransitionPhase(phase)) {
      advanceRouteTransitionTransaction(transaction, phase);
    }
    setTransitionPhase(phase);
    setTransitionState((current) => ({
      ...current,
      phase,
      generation,
      pendingRouteId,
      activation: activation || current.activation,
      phaseStartedAt: performance.now(),
    }));
  }, []);
  const publishLoaderPresentation = useCallback((presentation, detail = {}) => {
    const normalized = presentation === 'spinner' ? 'spinner' : 'plate';
    document.documentElement.dataset.absRouteLoaderPresentation = normalized;
    setTransitionState((current) => ({
      ...current,
      loaderPresentation: normalized,
      loaderSpinnerStartedAt: normalized === 'spinner'
        ? Number(detail.spinnerShownAt || performance.now())
        : 0,
    }));
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
    const previousState = options.resumeCovered === true
      ? settledRouteStateRef.current
      : activeRouteStateRef.current;
    const previousRouteId = activeRouteIdRef.current;
    const previousRouteContentSignature = activeRouteContentSignatureRef.current;
    const previousFocusSimulationId = activeFocusSimulationIdRef.current;
    const activation = options.activation
      || (options.source === 'history' ? 'history' : lastActivationRef.current);
    const focusAtStart = document.activeElement;
    const historyDriver = createRouteHistoryDriver({
      source: options.source,
      replace: options.replace,
      state: options.state || {},
      nextHref: nextState.canonicalHref,
      previousHref: previousState.canonicalHref,
      coordinator: historyCoordinator,
    });
    let historyCommitted = historyDriver.committed;
    if (historyCommitted) activeTransitionCommittedRef.current = true;
    const commitHistory = (historyMode = historyDriver.historyMode) => {
      historyDriver.commit(historyMode);
      historyCommitted = historyDriver.committed;
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
    const finalizeHistory = () => {
      historyDriver.finalize();
      activeTransitionCommittedRef.current = historyDriver.finalized;
    };
    const rollback = (error) => {
      historyDriver.rollback();
      historyCommitted = false;
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
    const activeTransaction = activeTransactionRef.current;
    const repeatsQueuedIntent = Boolean(
      queuedNavigationRef.current
      && queuedNavigationRef.current.routeContentSignature === nextRouteContentSignature
    );
    const repeatsActiveTransaction = Boolean(
      transitionActiveRef.current
      && activeTransaction
      && readRouteContentSignature(activeTransaction.toState) === nextRouteContentSignature
    );
    const canPreemptWithoutTransaction = Boolean(
      options.preemptTransition
      && !activeGateTransitionRef.current
      && isRouteTransitionPhase(getTransitionPhase())
    );
    const navigationDecision = activeTransaction
      ? classifyRouteNavigationIntent({
          transitionActive: transitionActiveRef.current,
          phase: getTransitionPhase(),
          activeCommitted: activeTransaction.committed,
          activeRecovering: activeTransaction.recovering,
          repeatsActive: repeatsActiveTransaction,
          repeatsQueued: repeatsQueuedIntent,
          gateActive: activeGateTransitionRef.current,
          allowPreempt: canPreemptWithoutTransaction,
        })
      : (
          transitionActiveRef.current
            ? (canPreemptWithoutTransaction
                ? ROUTE_NAVIGATION_DECISIONS.PREEMPT
                : ROUTE_NAVIGATION_DECISIONS.QUEUE)
            : ROUTE_NAVIGATION_DECISIONS.START
        );
    const canPreemptActiveTransition = navigationDecision === ROUTE_NAVIGATION_DECISIONS.PREEMPT;
    const canRetargetCoveredTransition = navigationDecision === ROUTE_NAVIGATION_DECISIONS.RETARGET_COVERED;
    const canRecoverIncomingTransition = navigationDecision === ROUTE_NAVIGATION_DECISIONS.RECOVER_ROUTE_IN;
    const preemptActiveTransition = () => {
      const wasSimulationFocusTransition = Boolean(
        document.documentElement.dataset.absSimulationFocusTransition
      );
      ++transitionGenerationRef.current;
      cancelRouteTransitionTransaction(activeTransactionRef.current, 'preempted');
      activeTransactionRef.current?.abortController.abort('preempted');
      activeTransactionRef.current?.participants.cancel('preempted');
      activeTransactionRef.current = null;
      queuedNavigationRef.current = null;
      activeRouteReadyCancelRef.current?.();
      activeRouteReadyCancelRef.current = null;
      transitionActiveRef.current = false;
      activeGateTransitionRef.current = false;
      routeLoaderSessionRef.current?.clear();
      routeLoaderSessionRef.current = null;
      historyCoordinator.rollback();
      finalizeTransition(false, activeRouteIdRef.current, surfaceRefs, animationRegistry, inertRegistry);
      resetSimulationFocusTransition(surfaceRefs, { discardSnapshots: true });
      if (wasSimulationFocusTransition) {
        dismissGateBackdrop({ suppressReturnAnimation: true, instant: true });
      }
      setPendingActiveRouteId(null);
      syncSteadyTransitionPhase();
      commitHistory(activeTransitionCommittedRef.current ? 'replace' : historyDriver.historyMode);
    };

    if (navigationDecision === ROUTE_NAVIGATION_DECISIONS.IGNORE) return true;

    if (activeTransaction?.recovering) {
      queuedNavigationRef.current = {
        href: targetUrl.toString(),
        options,
        routeId: nextRouteId,
        routeContentSignature: nextRouteContentSignature,
        focusSimulationId: nextFocusSimulationId,
      };
      return true;
    }

    if (canRecoverIncomingTransition) {
      queuedNavigationRef.current = {
        href: targetUrl.toString(),
        options,
        routeId: nextRouteId,
        routeContentSignature: nextRouteContentSignature,
        focusSimulationId: nextFocusSimulationId,
      };
      activeTransaction.recovering = true;
      ++transitionGenerationRef.current;
      cancelRouteTransitionTransaction(activeTransaction, 'route-in-retargeted');
      activeTransaction.abortController.abort('route-in-retargeted');
      activeTransaction.participants.cancel('route-in-retargeted');
      activeRouteReadyCancelRef.current?.();
      activeRouteReadyCancelRef.current = null;
      animationRegistry.cancel();
      publishTransitionPhase(
        TRANSITION_PHASES.ROUTE_LOADING,
        transitionGenerationRef.current,
        nextRouteId,
        activation,
      );
      routeLoaderSessionRef.current?.retarget();
      void fadeOutContent(80, EASE_OUT, surfaceRefs, animationRegistry, {
        finalOpacity: 0,
        opacityOnly: true,
      }).then(() => {
        const queued = queuedNavigationRef.current;
        queuedNavigationRef.current = null;
        setRouteSurfaceVisibility(false, surfaceRefs);
        const targetRouteId = queued?.routeId || nextRouteId;
        publishTransitionPhase(
          TRANSITION_PHASES.ROUTE_LOADING,
          transitionGenerationRef.current,
          targetRouteId,
          queued?.options?.activation || activation,
        );
        activeTransactionRef.current = null;
        transitionActiveRef.current = false;
        activeGateTransitionRef.current = false;
        setPendingActiveRouteId(null);
        navigateRef.current?.(queued?.href || targetUrl.toString(), {
          ...(queued?.options || options),
          resumeCovered: true,
          forceTransition: true,
        });
      });
      return true;
    }

    if (canRetargetCoveredTransition) {
      ++transitionGenerationRef.current;
      cancelRouteTransitionTransaction(activeTransactionRef.current, 'retargeted');
      activeTransactionRef.current.abortController.abort('retargeted');
      activeTransactionRef.current.participants.cancel('retargeted');
      activeTransactionRef.current = null;
      activeRouteReadyCancelRef.current?.();
      activeRouteReadyCancelRef.current = null;
      animationRegistry.cancel();
      setRouteSurfaceVisibility(false, surfaceRefs);
      routeLoaderSessionRef.current?.retarget();
      publishTransitionPhase(
        TRANSITION_PHASES.ROUTE_LOADING,
        transitionGenerationRef.current,
        nextRouteId,
        activation,
      );
      transitionActiveRef.current = false;
      activeGateTransitionRef.current = false;
      queuedNavigationRef.current = null;
      setPendingActiveRouteId(null);
      setStableTimeout(() => {
        navigateRef.current?.(targetUrl.toString(), {
          ...options,
          resumeCovered: true,
          forceTransition: true,
        });
      }, 0);
      return true;
    }

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
    const resumeCovered = options.resumeCovered === true;
    if (!isSimulationFocus && document.documentElement.dataset.absSimulationFocusTransition) {
      resetSimulationFocusTransition(surfaceRefs, { discardSnapshots: true });
      dismissGateBackdrop({ suppressReturnAnimation: true, instant: true });
    }
    const readyMs = options.readyFallbackMs;
    const isRepeatVisit = visitedRouteIdsRef.current.has(nextRouteId);
    const routeTimings = getRouteTransitionTimings({
      fadeMs: options.exitMs,
      staggerMs: options.staggerMs,
      revealMs: options.enterMs,
      readyMs,
      reduceMotion,
      repeatVisit: isRepeatVisit,
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
        if (!transitionActiveRef.current) navigateRef.current?.(queued.href, queued.options);
      }, 0);
    };

    const finishTransition = (isGateTransition, gateBackdropDismissed = false) => {
      const settledRouteId = activeRouteIdRef.current;
      const settledGeneration = transitionGenerationRef.current;
      visitedRouteIdsRef.current.add(settledRouteId);
      settledRouteStateRef.current = activeRouteStateRef.current;
      activeTransactionRef.current?.participants.complete('ready');
      settleRouteTransitionTransaction(activeTransactionRef.current, 'ready');
      activeTransactionRef.current = null;
      transitionActiveRef.current = false;
      activeGateTransitionRef.current = false;
      setPendingActiveRouteId(null);
      activeRouteReadyCancelRef.current?.();
      activeRouteReadyCancelRef.current = null;
      routeLoaderSessionRef.current?.clear();
      routeLoaderSessionRef.current = null;
      publishLoaderPresentation('plate');
      const releaseGateBackdrop = Boolean(options.releaseGateBackdropOnComplete);
      finalizeTransition(isGateTransition, activeRouteIdRef.current, surfaceRefs, animationRegistry, inertRegistry, {
        suppressReturnAnimation: isGateTransition,
        gateBackdropDismissed,
        preserveTransitionPhase: true,
      });
      resetSimulationFocusTransition(surfaceRefs);
      if (releaseGateBackdrop) {
        dismissGateBackdrop({ instant: isSimulationFocus });
      } else {
        setTransitionState((current) => ({
          ...current,
          phase: TRANSITION_PHASES.IDLE,
          generation: settledGeneration,
          pendingRouteId: null,
          activation,
          phaseStartedAt: performance.now(),
          settledGeneration,
          settledRouteId,
        }));
      }
      settleRouteFocus({ activation, focusAtStart });
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

      const token = ++transitionGenerationRef.current;
      const stale = () => token !== transitionGenerationRef.current;
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

    /* ── shared route transaction (standard, gate, and reduced motion) ───── */
    if (!isSameRoute || hasRouteContentChange || options.forceTransition === true) {
      transitionActiveRef.current = true;
      activeGateTransitionRef.current = isGate;
      activeTransitionCommittedRef.current = historyCommitted;
      setPendingActiveRouteId(nextRouteId);
      setLegacyRouteTransitionActive(true, { gate: isGate });
      const token = ++transitionGenerationRef.current;
      const abortController = new AbortController();
      const participants = createRouteTransitionParticipantGeneration({
        generation: token,
        fromRouteId: previousRouteId,
        toRouteId: nextRouteId,
        signal: abortController.signal,
      });
      let loaderTimingDriver = resumeCovered ? routeLoaderSessionRef.current : null;
      if (!loaderTimingDriver) {
        routeLoaderSessionRef.current?.clear();
        loaderTimingDriver = createRouteLoaderTimingDriver({
          spinnerDelayMs: routeTimings.spinnerDelay,
          spinnerMinimumMs: routeTimings.spinnerMinimum,
          reducedMotion: routeTimings.opacityOnly,
          onPresentationChange: publishLoaderPresentation,
        });
        routeLoaderSessionRef.current = loaderTimingDriver;
        publishLoaderPresentation('plate');
      }
      const transaction = createRouteTransitionTransaction({
        generation: token,
        fromState: previousState,
        toState: nextState,
        historyMode: historyDriver.historyMode,
        activation,
        resumedCovered: resumeCovered,
        timingMode: reduceMotion ? 'reduced' : (visitedRouteIdsRef.current.has(nextRouteId) ? 'repeat' : 'first'),
        abortController,
        participants,
        animationRegistry,
        loaderTimingDriver,
      });
      activeTransactionRef.current = transaction;
      inertRegistry.activate(getOwnedRouteSurfaceNodes(surfaceRefs));
      const stale = () => (
        token !== transitionGenerationRef.current
        || abortController.signal.aborted
      );
      publishTransitionPhase(
        resumeCovered ? TRANSITION_PHASES.ROUTE_LOADING : TRANSITION_PHASES.ROUTE_OUT,
        token,
        nextRouteId,
        activation,
      );

      let routeReadyWaiter = null;
      let routeReadinessStartedAt = 0;
      let gateBackdropDismissed = false;
      const dismissGateBackdropOnce = () => {
        if (!isGate || gateBackdropDismissed) return;
        gateBackdropDismissed = true;
        dismissGateBackdrop({ suppressReturnAnimation: true });
      };

      const preloadRouteModule = typeof options.preloadRouteModule === 'function'
        ? options.preloadRouteModule
        : nextRouteRuntime?.loadModule;
      const preloadPromise = typeof options.preloadRouteModule === 'function'
        ? loadRouteRuntimeModule(preloadRouteModule)
        : prepareRouteRuntime({
            routeId: nextRouteId,
            contentSignature: nextRouteContentSignature,
            runtime: nextRouteRuntime,
            priority: 'navigation',
            reason: 'navigation',
            signal: abortController.signal,
          });
      const preloadResult = preloadPromise
        .then(() => ({ error: null }), (error) => ({ error }));
      const participantDepartureResult = waitWithTransitionTimeout(
        Promise.all([participants.prepare(), participants.exit()]),
        routeTimings.ready,
        abortController.signal,
      ).then(() => ({ error: null }), (error) => ({ error }));
      const exitPromise = resumeCovered
        ? Promise.resolve()
        : fadeOutContent(
            routeTimings.fadeOut,
            routeTimings.fadeEasing,
            surfaceRefs,
            animationRegistry,
            {
              finalOpacity: isGate ? 0 : 0.08,
              opacityOnly: routeTimings.opacityOnly,
            },
          );

      Promise.all([preloadResult, exitPromise, participantDepartureResult])
        .then(async ([preload, , participantDeparture]) => {
          if (stale()) return;
          const departureError = preload.error || participantDeparture.error;

          publishTransitionPhase(TRANSITION_PHASES.ROUTE_LOADING, token, nextRouteId, activation);
          setRouteSurfaceVisibility(false, surfaceRefs);
          animationRegistry.cancel();
          await loaderTimingDriver.establishCover();
          if (departureError) throw departureError;
        })
        .then(() => {
          if (stale()) return undefined;
          pinRouteSurfacesForCommit(surfaceRefs, animationRegistry);
          commit();
          markRouteTransitionCommitted(transaction);
          routeReadinessStartedAt = performance.now();
          loaderTimingDriver.beginReadinessWait();
          // Dynamic routes own their final-geometry paint barrier at the point
          // their runtime becomes ready. Static routes use the shell barrier
          // immediately after commit.
          if (nextState.route.id === 'home' || nextState.route.id === 'portfolio') {
            return undefined;
          }
          return loaderTimingDriver.waitForDestinationPaint();
        })
        .then(async () => {
          if (stale()) return;
          await waitWithTransitionTimeout(
            participants.prepare(),
            routeTimings.ready,
            abortController.signal,
          );
          if (stale()) return;
          routeReadyWaiter = waitForRouteReady(nextState.route.id, routeTimings.ready, {
            lockedGateId: nextState.lockedGateId || null,
            readinessStartedAt: routeReadinessStartedAt,
          });
          transaction.readinessWaiter = routeReadyWaiter;
          activeRouteReadyCancelRef.current = routeReadyWaiter.cancel;
          const [readinessStatus] = await Promise.all([
            routeReadyWaiter.promise,
            waitWithTransitionTimeout(
              participants.waitUntilReady(),
              routeTimings.ready,
              abortController.signal,
            ),
          ]);
          if (readinessStatus !== 'ready') {
            throw new Error(`Route "${nextState.route.id}" did not become ready (${readinessStatus}).`);
          }
          if (stale()) return;
          // Home readiness is the first scheduled canvas/title composition, so
          // keep its final geometry covered for two paints. Portfolio's route
          // participant owns the equivalent barrier.
          if (nextState.route.id === 'home') {
            await loaderTimingDriver.waitForDestinationPaint();
            if (stale()) return;
          }
          await loaderTimingDriver.waitForReadiness();
        })
        .then(() => {
          if (stale()) return;
          let participantEnterPromise = Promise.resolve();
          const shellEntrancePromise = staggeredEntrance({
            routeId: nextState.route.id,
            surfaceRefs,
            animationRegistry,
            enterMs: routeTimings.reveal,
            revealEasing: routeTimings.revealEasing,
            repeatVisit: routeTimings.repeatVisit,
            reducedMotion: routeTimings.opacityOnly,
            staggerScale: routeTimings.staggerScale,
            onPrepared: () => {
              finalizeHistory();
              publishTransitionPhase(TRANSITION_PHASES.ROUTE_IN, token, nextRouteId, activation);
              participantEnterPromise = waitWithTransitionTimeout(
                participants.enter(),
                routeTimings.ready,
                abortController.signal,
              );
              dismissPortfolioGateSceneBridge({
                durationMs: PORTFOLIO_GATE_SCENE_FADE_MS,
                delayMs: GROUPED_ROUTE_OFFSET_MS,
                easing: 'linear',
                animationRegistry,
              });
              dismissGateBackdropOnce();
            },
            onViewSettled: () => {
              if (nextRouteId === 'portfolio') {
                releasePortfolioDeck(isGate ? 'gate-success' : 'route-in');
              }
            },
          });
          return Promise.all([shellEntrancePromise, participantEnterPromise]);
        })
        .then(() => {
          if (stale()) return;
          finishTransition(isGate, gateBackdropDismissed);
        })
        .catch(async (error) => {
          routeReadyWaiter?.cancel();
          if (stale()) return;

          const keepMountedDestination = transaction.committed && isRouteBaselineReady(
            nextRouteId,
            { lockedGateId: nextState.lockedGateId || null },
          );
          let revealRouteId = previousRouteId;
          if (keepMountedDestination) {
            revealRouteId = nextRouteId;
            setPendingActiveRouteId(nextRouteId);
            try {
              options.onFailure?.(error, nextState);
            } catch {
              // A degraded but usable destination still needs to settle visibly.
            }
          } else if (transaction.committed) {
            participants.cancel('rollback');
            rollback(error);
            setPendingActiveRouteId(previousRouteId);
            await loaderTimingDriver.waitForDestinationPaint();
            const restoredWaiter = waitForRouteReady(previousRouteId, routeTimings.ready, {
              lockedGateId: previousState.lockedGateId || null,
            });
            activeRouteReadyCancelRef.current = restoredWaiter.cancel;
            await restoredWaiter.promise;
          } else {
            await waitWithTransitionTimeout(
              participants.restore(),
              routeTimings.ready,
              abortController.signal,
            ).catch(() => undefined);
            const restoringDifferentRoute = readRouteContentSignature(activeRouteStateRef.current)
              !== previousRouteContentSignature;
            rollback(error);
            setPendingActiveRouteId(previousRouteId);
            if (restoringDifferentRoute) {
              await loaderTimingDriver.waitForDestinationPaint();
            }
          }

          if (stale()) return;
          await staggeredEntrance({
            routeId: revealRouteId,
            surfaceRefs,
            animationRegistry,
            enterMs: routeTimings.reveal,
            revealEasing: routeTimings.revealEasing,
            repeatVisit: visitedRouteIdsRef.current.has(revealRouteId),
            reducedMotion: routeTimings.opacityOnly,
            staggerScale: routeTimings.staggerScale,
            onPrepared: () => {
              finalizeHistory();
              publishTransitionPhase(
                TRANSITION_PHASES.ROUTE_IN,
                token,
                revealRouteId,
                activation,
              );
              if (keepMountedDestination) {
                void waitWithTransitionTimeout(
                  participants.enter(),
                  routeTimings.ready,
                  abortController.signal,
                ).catch(() => undefined);
              }
            },
            onViewSettled: () => {
              if (revealRouteId === 'portfolio') releasePortfolioDeck('route-in-fallback');
            },
          });
          if (!stale()) finishTransition(isGate, gateBackdropDismissed);
        });

      return true;
    }

    /* ── same-route non-gate: instant commit ─────────────────────────────── */
    commit();
    finalizeHistory();
    settledRouteStateRef.current = nextState;
    setPendingActiveRouteId(null);
    syncSteadyTransitionPhase();
    return true;
  }, [
    animationRegistry,
    historyCoordinator,
    inertRegistry,
    publishLoaderPresentation,
    publishTransitionPhase,
    surfaceRefs,
    syncSteadyTransitionPhase,
  ]);

  useLayoutEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  const prewarmRoute = useCallback((routeId, options = {}) => {
    const route = getRouteById(routeId);
    if (!route?.id) return Promise.resolve(false);
    const href = options.href || buildRouteHref(route.id);
    const nextState = computeRouteState(new URL(href, window.location.href).toString());
    const runtime = getRouteRuntimeRef.current(route.id, nextState.canonicalHref, nextState);
    const pending = prepareRouteRuntime({
      routeId: route.id,
      contentSignature: readRouteContentSignature(nextState),
      runtime,
      priority: options.priority || (options.reason === 'idle' ? 'media' : 'intent'),
      reason: options.reason || 'intent',
      signal: options.signal || null,
    })
      .then(() => true)
      .catch((error) => {
        if (options.throwOnError) throw error;
        if (options.reason !== 'idle' && error?.name !== 'AbortError') {
          console.warn(`[transition] Route prewarm failed for "${route.id}"`, error);
        }
        return false;
      });
    return pending;
  }, []);

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
      repeatVisit: true,
    });
    const isSimulationFocus = options.transitionStyle === 'simulation-focus';

    const finishTransition = () => {
      transitionActiveRef.current = false;
      activeGateTransitionRef.current = false;
      const releaseGateBackdrop = Boolean(options.releaseGateBackdropOnComplete);
      finalizeTransition(false, currentRouteId, surfaceRefs, animationRegistry, inertRegistry, {
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
      const token = ++transitionGenerationRef.current;
      const stale = () => token !== transitionGenerationRef.current;
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
      inertRegistry.activate(getOwnedRouteSurfaceNodes(surfaceRefs));
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
    inertRegistry.activate(getOwnedRouteSurfaceNodes(surfaceRefs));
    activeTransitionCommittedRef.current = false;
    setLegacyRouteTransitionActive(true, { gate: false });
    setTransitionPhase(TRANSITION_PHASES.ROUTE_OUT);

    const token = ++transitionGenerationRef.current;
    const stale = () => token !== transitionGenerationRef.current;

    fadeOutContent(
      routeTimings.fadeOut,
      routeTimings.fadeEasing,
      surfaceRefs,
      animationRegistry,
      { finalOpacity: 0.08 },
    )
      .then(() => {
        if (stale()) return undefined;
        setRouteSurfaceVisibility(false, surfaceRefs);
        return runTask();
      })
      .catch(() => undefined)
      .then(() => {
        if (stale()) return undefined;
        setTransitionPhase(TRANSITION_PHASES.ROUTE_IN);
        return staggeredEntrance({
          routeId: currentRouteId,
          surfaceRefs,
          animationRegistry,
          enterMs: routeTimings.reveal,
          revealEasing: routeTimings.revealEasing,
          repeatVisit: true,
          reducedMotion: routeTimings.opacityOnly,
          staggerScale: routeTimings.staggerScale,
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
  }, [animationRegistry, inertRegistry, navigate, surfaceRefs, syncSteadyTransitionPhase]);

  useEffect(() => {
    const markPointer = () => { lastActivationRef.current = 'pointer'; };
    const markKeyboard = () => { lastActivationRef.current = 'keyboard'; };
    window.addEventListener('pointerdown', markPointer, true);
    window.addEventListener('keydown', markKeyboard, true);
    return () => {
      window.removeEventListener('pointerdown', markPointer, true);
      window.removeEventListener('keydown', markKeyboard, true);
    };
  }, []);

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
    const generationRef = transitionGenerationRef;
    const handlePopState = () => {
      historyCoordinator.discard();
      const nextHref = window.location.href;
      const nextState = computeRouteState(nextHref);
      const isSameRoute = nextState.route.id === activeRouteIdRef.current;
      const wasGateTransition = activeGateTransitionRef.current;
      const wasTransitionActive = transitionActiveRef.current;
      const wasSimulationFocusTransition = Boolean(
        document.documentElement.dataset.absSimulationFocusTransition
      );

      ++transitionGenerationRef.current;
      cancelRouteTransitionTransaction(activeTransactionRef.current, 'popstate');
      activeTransactionRef.current?.abortController.abort('popstate');
      activeTransactionRef.current?.participants.cancel('popstate');
      activeTransactionRef.current = null;
      queuedNavigationRef.current = null;
      if (wasTransitionActive || wasGateTransition) {
        animationRegistry.cancel();
        setRouteSurfaceVisibility(false, surfaceRefs);
        publishTransitionPhase(
          TRANSITION_PHASES.ROUTE_LOADING,
          transitionGenerationRef.current,
          nextState.route.id,
          'history',
        );
        if (wasGateTransition) {
          dismissGateBackdrop({ suppressReturnAnimation: true, instant: true });
        }
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
      if (isSameRoute && !wasTransitionActive && !wasGateTransition) {
        setRouteSurfaceVisibility(true, surfaceRefs);
        setRouteState(nextState);
        activeRouteStateRef.current = nextState;
        activeRouteIdRef.current = nextState.route.id;
        activeRouteContentSignatureRef.current = readRouteContentSignature(nextState);
        activeFocusSimulationIdRef.current = readRouteStateSimulationFocusId(nextState);
        settledRouteStateRef.current = nextState;
        syncSteadyTransitionPhase();
        return;
      }
      setStableTimeout(() => {
        navigate(nextHref, {
          replace: true,
          source: 'history',
          activation: 'history',
          resumeCovered: wasTransitionActive || wasGateTransition,
          forceTransition: wasTransitionActive || wasGateTransition,
        });
      }, 0);
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      const wasSimulationFocusTransition = Boolean(
        document.documentElement.dataset.absSimulationFocusTransition
      );
      if (transitionActiveRef.current) {
        ++generationRef.current;
        cancelRouteTransitionTransaction(activeTransactionRef.current, 'unmount');
        activeTransactionRef.current?.abortController.abort('unmount');
        activeTransactionRef.current?.participants.cancel('unmount');
        activeTransactionRef.current = null;
        queuedNavigationRef.current = null;
        activeRouteReadyCancelRef.current?.();
        activeRouteReadyCancelRef.current = null;
        routeLoaderSessionRef.current?.clear();
        routeLoaderSessionRef.current = null;
        historyCoordinator.rollback();
        finalizeTransition(
          activeGateTransitionRef.current,
          activeRouteIdRef.current,
          surfaceRefs,
          animationRegistry,
          inertRegistry,
        );
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
  }, [
    animationRegistry,
    historyCoordinator,
    inertRegistry,
    navigate,
    publishTransitionPhase,
    surfaceRefs,
    syncSteadyTransitionPhase,
  ]);

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
    if (transitionState.phase !== TRANSITION_PHASES.IDLE || transitionActiveRef.current) return;
    syncSteadyTransitionPhase();
  }, [syncSteadyTransitionPhase, transitionState.phase, transitionState.settledGeneration]);

  useLayoutEffect(() => {
    if (globalThis.__ABS_ROUTE_PERF_AUDIT__ === true) return;
    if (transitionActiveRef.current || historyCoordinator.provisional) return;
    const simulationId = routeState.focusSimulationId || routeState.dailyFocusRouteId || '';
    const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (currentHref !== routeState.canonicalHref) {
      window.history.replaceState(window.history.state || {}, '', routeState.canonicalHref);
    }
    if (!simulationId) return;
    writeManualSimulationFocus(simulationId);
  }, [
    historyCoordinator,
    routeState.canonicalHref,
    routeState.dailyFocusRouteId,
    routeState.focusSimulationId,
    transitionState.phase,
    transitionState.settledGeneration,
  ]);

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
    pendingRouteId: pendingActiveRouteId,
    transitionState,
    routeRuntime,
    routeView,
    transitionCurrentRoute,
    prewarmRoute,
  };
}
