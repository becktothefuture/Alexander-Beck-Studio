import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { hasGateAccess } from '../lib/access-gates.js';
import {
  buildRouteHref,
  getRouteById,
  isSharedShellRoute,
  resolveRouteFromHref,
  resolveRouteFromPathname,
} from '../lib/routes.js';
import { installSpaNavigationBridge } from '../lib/spa-navigation.js';
import {
  getResolvedSimulationFocus,
  getSimulationLaunchTarget,
  normalizeSimulationId,
  writeManualSimulationFocus,
} from '../data/simulationCatalog.js';
import { clearStableTimeout, setStableTimeout } from '../lib/legacy-runtime-scope.js';
import {
  getActiveLegacyRuntimeSnapshot,
  loadRouteRuntimeModule,
} from './useLegacyRouteRuntime.js';
import {
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
  isDailyLabRouteId,
  observeRouteBaselineReady,
  waitForObservedRouteReady,
} from '../lib/motion/route-transition-readiness.js';
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
  SIMULATION_SWITCH_PHASES,
  SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS,
  advanceSimulationSwitchTransaction,
  beginSimulationSwitchRollback,
  canSettleSimulationSwitchTransaction,
  cancelSimulationSwitchTransaction,
  createSimulationSwitchTransaction,
  failOpenSimulationSwitchTransaction,
  isSimulationSwitchTransactionStale,
  markSimulationSwitchCommitted,
  rewindSimulationSwitchTransactionForRecovery,
  settleSimulationSwitchTransaction,
} from '../lib/motion/simulation-switch-transaction.js';
import {
  createRouteSurfaceInertRegistry,
  getOwnedRouteSurfaceNodes,
  getRouteContentLayers,
  pinRouteSurfacesForCommit,
  restoreRouteSurfaces,
  setRouteSurfaceVisibility,
} from '../lib/motion/route-transition-surfaces.js';
import {
  armSimulationAtmosphereReplacement,
  commitSimulationAtmosphereReplacement,
  prepareSimulationAtmosphereReplacement,
  prepareSimulationAtmosphereRollback,
  rollbackSimulationAtmosphereReplacement,
  setSimulationAtmosphereSwitchPhase,
  settleSimulationAtmosphereReplacement,
  waitForSimulationAtmosphereReady,
} from '../legacy/modules/rendering/atmosphere/simulation-atmosphere.js';
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
  if (!requestedRoute) {
    // Some fallback hosts serve the Home entry shell for every pathname. Keep
    // that shell bootable without claiming the unknown URL as an internal
    // route; the SPA bridge still declines unknown navigation for the host.
    return {
      route: getRouteById('home'),
      requestedRouteId: null,
      canonicalHref: `${url.pathname}${url.search}${url.hash}`,
      redirectGateId: null,
      dailyFocusRouteId: null,
      focusSimulationId: null,
      lockedGateId: null,
      hostFallback: true,
    };
  }
  const homeFocusSimulationId = requestedRoute.id === 'home'
    ? readHomeFocusSimulationId(url.searchParams)
    : null;
  const homeRouteBackedFocusId = isDailyLabRouteId(homeFocusSimulationId)
    ? homeFocusSimulationId
    : null;
  const labDailyFocusRouteId = isDailyLabRouteId(requestedRoute.id)
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
  if (route.id === 'playground') {
    const workId = url.searchParams.get('work');
    if (workId) canonical.searchParams.set('work', workId);
  }
  if (route.id.startsWith('atmosphere-')) {
    ['mode', 'panel', 'absAudit'].forEach((key) => {
      const value = url.searchParams.get(key);
      if (value) canonical.searchParams.set(key, value);
    });
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

function resolveRouteReadinessId(getRouteReadinessId, routeState) {
  const routeId = routeState?.route?.id || 'home';
  const fallbackId = routeState?.dailyFocusRouteId || routeId;
  if (typeof getRouteReadinessId !== 'function') return fallbackId;
  return getRouteReadinessId(routeId, routeState.canonicalHref, routeState) || fallbackId;
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
const SIMULATION_FOCUS_EXIT_LOCAL_MS = 240;
const SIMULATION_FOCUS_ENTER_LOCAL_MS = 280;
const SIMULATION_FOCUS_EASE_OUT = 'cubic-bezier(0.72, 0, 0.86, 0.32)';
const SIMULATION_FOCUS_EASE_IN = 'cubic-bezier(0.16, 1, 0.3, 1)';

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

const IDLE_SIMULATION_SWITCH_SNAPSHOT = Object.freeze({
  transactionId: null,
  generation: 0,
  phase: SIMULATION_SWITCH_PHASES.IDLE,
  phaseHistory: Object.freeze([SIMULATION_SWITCH_PHASES.IDLE]),
  fromSimulationId: null,
  targetSimulationId: null,
  topology: null,
  busy: false,
  recovering: false,
  commitCount: 0,
  publicationCount: 0,
  error: '',
  status: 'idle',
});

function getSimulationSwitchTopology(fromTarget, target) {
  const fromSurface = fromTarget?.routeBacked ? 'route-backed' : 'home-mode';
  const targetSurface = target?.routeBacked ? 'route-backed' : 'home-mode';
  return `${fromSurface}-to-${targetSurface}`;
}

function createSimulationSwitchBootstrapContext(transaction, target, readinessRouteId, options = {}) {
  return Object.freeze({
    transactionId: transaction.id,
    generation: transaction.generation,
    targetSimulationId: target.id,
    requestedHomeMode: target.routeBacked ? null : target.mode,
    directBoot: false,
    topology: transaction.topology,
    rollback: options.rollback === true,
    reducedMotion: transaction.timingMode === 'reduced-motion',
    readinessRouteId,
    signal: options.signal || transaction.abortController?.signal || null,
  });
}

function createSimulationSwitchDiagnosticSnapshot(transaction, status = '') {
  if (!transaction) return IDLE_SIMULATION_SWITCH_SNAPSHOT;
  return Object.freeze({
    transactionId: transaction.id,
    generation: transaction.generation,
    phase: transaction.phase,
    phaseHistory: Object.freeze([...transaction.phaseHistory]),
    fromSimulationId: transaction.from?.id || null,
    targetSimulationId: transaction.to?.id || null,
    topology: transaction.topology || null,
    busy: !transaction.settled && !transaction.cancelled,
    recovering: !transaction.settled && Boolean(transaction.recovering),
    commitCount: transaction.commitCount,
    publicationCount: transaction.publicationCount,
    error: transaction.error?.message || String(transaction.error || ''),
    status: status || transaction.settlementStatus || (transaction.failure ? 'recovering' : transaction.phase),
  });
}

function waitForSimulationPrimeBarrier({ target, timeoutMs, signal = null }) {
  return new Promise((resolve, reject) => {
    const startedAt = performance.now();
    let frameId = 0;
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      if (frameId) cancelAnimationFrame(frameId);
      signal?.removeEventListener('abort', handleAbort);
      callback(value);
    };
    const handleAbort = () => finish(
      reject,
      signal?.reason || new DOMException('Simulation prime aborted.', 'AbortError'),
    );
    const inspect = () => {
      const canvas = target.routeBacked
        ? document.querySelector('.daily-simulation-layer canvas')
        : document.getElementById('c');
      const ready = Boolean(canvas && canvas.width >= 64 && canvas.height >= 64);
      if (ready) {
        finish(resolve, true);
        return;
      }
      if (performance.now() - startedAt >= timeoutMs) {
        finish(reject, new Error('Simulation surface did not become ready'));
        return;
      }
      frameId = requestAnimationFrame(inspect);
    };
    if (signal?.aborted) {
      handleAbort();
      return;
    }
    signal?.addEventListener('abort', handleAbort, { once: true });
    frameId = requestAnimationFrame(inspect);
  });
}

function waitForSimulationRouteReady(readinessRouteId, timeoutMs, signal = null) {
  const waiter = waitForRouteReady(readinessRouteId, timeoutMs);
  if (!signal) return waiter.promise;
  if (signal.aborted) {
    waiter.cancel();
    return Promise.reject(signal.reason || new DOMException('Simulation readiness aborted.', 'AbortError'));
  }
  return new Promise((resolve, reject) => {
    const finish = (callback, value) => {
      signal.removeEventListener('abort', handleAbort);
      callback(value);
    };
    const handleAbort = () => {
      waiter.cancel();
      finish(reject, signal.reason || new DOMException('Simulation readiness aborted.', 'AbortError'));
    };
    signal.addEventListener('abort', handleAbort, { once: true });
    waiter.promise.then(
      (status) => finish(resolve, status),
      (error) => finish(reject, error),
    );
  });
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

function resetSimulationFocusTransition(surfaceRefs) {
  cleanupSimulationFocusLayer(surfaceRefs);
  setSimulationShellStability(false, surfaceRefs);
  setSimulationFocusTransitionState(null);
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
      exitLocal: 0,
      enterLocal: 0,
      exitEasing: SIMULATION_FOCUS_EASE_OUT,
      enterEasing: SIMULATION_FOCUS_EASE_IN,
    };
  }

  return {
    exit: parseTransitionMs(options.exitMs, SIMULATION_FOCUS_EXIT_MS),
    enter: parseTransitionMs(options.enterMs, SIMULATION_FOCUS_ENTER_MS),
    exitLocal: parseTransitionMs(options.exitLocalMs, SIMULATION_FOCUS_EXIT_LOCAL_MS),
    enterLocal: parseTransitionMs(options.enterLocalMs, SIMULATION_FOCUS_ENTER_LOCAL_MS),
    exitEasing: options.exitEasing || SIMULATION_FOCUS_EASE_OUT,
    enterEasing: options.enterEasing || SIMULATION_FOCUS_EASE_IN,
  };
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

function isRouteBaselineReady(routeId, options = {}) {
  return observeRouteBaselineReady(routeId, options, getActiveLegacyRuntimeSnapshot);
}

function waitForRouteReady(routeId, timeoutMs, options = {}) {
  return waitForObservedRouteReady(
    routeId,
    timeoutMs,
    options,
    getActiveLegacyRuntimeSnapshot,
  );
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

export function useShellRouteTransition({
  getRouteView,
  getRouteRuntime,
  getRouteReadinessId,
  surfaceRefs,
}) {
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
  const initialReadinessRouteId = resolveRouteReadinessId(getRouteReadinessId, routeState);
  const activeReadinessRouteIdRef = useRef(initialReadinessRouteId);
  const settledReadinessRouteIdRef = useRef(initialReadinessRouteId);
  const activeRouteContentSignatureRef = useRef(readRouteContentSignature(routeState));
  const activeFocusSimulationIdRef = useRef(readRouteStateSimulationFocusId(routeState));
  const activeGateTransitionRef = useRef(false);
  const activeTransitionCommittedRef = useRef(false);
  const activeRouteReadyCancelRef = useRef(null);
  const transitionGenerationRef = useRef(0);
  const activeTransactionRef = useRef(null);
  const activeSimulationSwitchRef = useRef(null);
  const queuedSimulationIntentRef = useRef(null);
  const cancelActiveSimulationSwitchRef = useRef(null);
  const simulationSwitchGenerationRef = useRef(0);
  const [simulationSwitchSnapshot, setSimulationSwitchSnapshot] = useState(
    IDLE_SIMULATION_SWITCH_SNAPSHOT,
  );
  const routeLoaderSessionRef = useRef(null);
  const navigateRef = useRef(null);
  const [animationRegistry] = useState(() => createAnimationRegistry());
  const [inertRegistry] = useState(() => createRouteSurfaceInertRegistry());
  const [historyCoordinator] = useState(() => createRouteHistoryCoordinator());
  const visitedRouteIdsRef = useRef(new Set([routeState.route.id]));
  const lastActivationRef = useRef('pointer');
  const getRouteRuntimeRef = useRef(getRouteRuntime);
  const getRouteReadinessIdRef = useRef(getRouteReadinessId);
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

  const publishSimulationSwitchTransaction = useCallback((transaction, status = '') => {
    const snapshot = createSimulationSwitchDiagnosticSnapshot(transaction, status);
    setSimulationSwitchSnapshot(snapshot);
    if (snapshot.phase === SIMULATION_SWITCH_PHASES.IDLE) {
      setSimulationFocusTransitionState(null);
    } else {
      setSimulationFocusTransitionState(snapshot.phase);
    }
    window.__ABS_SIMULATION_SWITCH_TRANSACTION__ = snapshot;
    window.dispatchEvent(new CustomEvent('abs:simulation-switch-state', { detail: snapshot }));
  }, []);

  useEffect(() => {
    window.__ABS_SIMULATION_SWITCH_TRANSACTION__ = simulationSwitchSnapshot;
  }, [simulationSwitchSnapshot]);

  const requestSimulationSwitch = useCallback((requestedSimulationId) => {
    const target = getSimulationLaunchTarget(requestedSimulationId);
    if (!target) return false;

    if (activeSimulationSwitchRef.current) {
      if (queuedSimulationIntentRef.current?.kind !== 'route') {
        queuedSimulationIntentRef.current = activeSimulationSwitchRef.current.to?.id === target.id
          ? null
          : Object.freeze({
              kind: 'simulation',
              simulationId: target.id,
            });
      }
      return true;
    }
    if (transitionActiveRef.current) return false;

    const settledState = settledRouteStateRef.current;
    const settledFocusId = readRouteStateSimulationFocusId(settledState)
      || getResolvedSimulationFocus().activeId;
    const fromTarget = getSimulationLaunchTarget(settledFocusId);
    if (!fromTarget || fromTarget.id === target.id) return Boolean(fromTarget);

    const generation = ++simulationSwitchGenerationRef.current;
    const abortController = new AbortController();
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    const transaction = createSimulationSwitchTransaction({
      transactionId: `simulation-switch-${generation}`,
      generation,
      from: fromTarget,
      to: target,
      topology: getSimulationSwitchTopology(fromTarget, target),
      timingMode: reduceMotion ? 'reduced-motion' : 'normal',
      abortController,
    });
    const previousState = Object.freeze({ ...settledState });
    const targetHref = target.routeBacked
      ? target.href
      : `${buildRouteHref('home')}?mode=${encodeURIComponent(target.mode)}`;
    const computedTargetState = computeRouteState(targetHref);
    const targetReadinessRouteId = resolveRouteReadinessId(
      getRouteReadinessIdRef.current,
      computedTargetState,
    );
    const targetContext = createSimulationSwitchBootstrapContext(
      transaction,
      target,
      targetReadinessRouteId,
    );
    const nextState = Object.freeze({
      ...computedTargetState,
      simulationSwitchContext: targetContext,
    });
    const previousReadinessRouteId = settledReadinessRouteIdRef.current;
    const changesRuntimeOwnership = fromTarget.routeBacked || target.routeBacked;
    const targetAtmosphereRouteId = target.routeBacked ? target.id : 'home';
    const previousAtmosphereRouteId = fromTarget.routeBacked ? fromTarget.id : 'home';
    const reusesHomeAtmosphereSource = !fromTarget.routeBacked && !target.routeBacked;
    const timings = getSimulationFocusTimings({}, reduceMotion);
    let committed = false;
    let atmospherePrepared = false;
    let outStarted = false;
    let orchestrationCancelled = false;
    let unmounted = false;
    let recoveryController = null;
    let recoveryPromise = null;
    let previousOwnershipRestored = false;
    let ownershipCommitPromise = Promise.resolve();

    const isStale = () => (
      orchestrationCancelled
      || abortController.signal.aborted
      || activeSimulationSwitchRef.current !== transaction
      || isSimulationSwitchTransactionStale(transaction, generation)
    );
    const publishPhase = (phase) => {
      if (!advanceSimulationSwitchTransaction(transaction, phase, generation)) {
        throw new Error(`Illegal simulation switch phase: ${transaction.phase} → ${phase}`);
      }
      setSimulationAtmosphereSwitchPhase(phase, transaction.id);
      publishSimulationSwitchTransaction(transaction);
    };
    const commitRouteState = (state, readinessRouteId) => {
      if (unmounted) return false;
      setRouteState(state);
      activeRouteStateRef.current = state;
      activeRouteIdRef.current = state.route.id;
      activeReadinessRouteIdRef.current = readinessRouteId;
      activeRouteContentSignatureRef.current = readRouteContentSignature(state);
      activeFocusSimulationIdRef.current = readRouteStateSimulationFocusId(state);
      return true;
    };
    const prepareTarget = async () => {
      const runtime = getRouteRuntimeRef.current(
        nextState.route.id,
        nextState.canonicalHref,
        nextState,
      );
      if (target.routeBacked) {
        await loadRouteRuntimeModule(runtime?.loadModule);
        return;
      }
      const [{ prewarmModeRuntime }, homeModule] = await Promise.all([
        import('../legacy/modules/modes/mode-controller.js'),
        loadRouteRuntimeModule(runtime?.loadModule),
      ]);
      const modeRuntime = await prewarmModeRuntime(target.mode);
      if (!modeRuntime) throw new Error(`Simulation "${target.mode}" failed to preload`);
      await homeModule?.prewarmHomeRoute?.({ signal: abortController.signal });
    };
    const commitTarget = async () => {
      publishPhase(SIMULATION_SWITCH_PHASES.COMMIT);
      if (!markSimulationSwitchCommitted(transaction, generation)) {
        throw new Error('Simulation switch commit was rejected');
      }
      committed = true;
      if (!commitSimulationAtmosphereReplacement({ transactionId: transaction.id })) {
        throw new Error('Simulation atmosphere ownership commit was rejected');
      }
      recordSimulationVisualTransitionEvent('commit', {
        routeId: nextState.route.id,
        transactionId: transaction.id,
      });
      if (!changesRuntimeOwnership) {
        const { setMode } = await import('../legacy/modules/modes/mode-controller.js');
        const applied = await setMode(target.mode);
        if (applied === false) throw new Error(`Simulation "${target.mode}" failed to initialize`);
        if (orchestrationCancelled || unmounted) {
          throw new DOMException('Simulation ownership commit was cancelled.', 'AbortError');
        }
        commitRouteState(
          Object.freeze({ ...nextState, simulationSwitchContext: null }),
          targetReadinessRouteId,
        );
        return;
      }
      commitRouteState(nextState, targetReadinessRouteId);
    };
    const primeTarget = async (primeTarget, readinessRouteId, signal = abortController.signal) => {
      publishPhase(SIMULATION_SWITCH_PHASES.PRIME);
      if (changesRuntimeOwnership) {
        const readinessStatus = await waitForSimulationRouteReady(
          readinessRouteId,
          primeTarget.routeBacked ? 13000 : 3200,
          signal,
        );
        if (readinessStatus !== 'ready') {
          throw new Error(`Simulation runtime "${readinessRouteId}" did not become ready (${readinessStatus})`);
        }
      }
      await waitForSimulationPrimeBarrier({
        target: primeTarget,
        timeoutMs: primeTarget.routeBacked ? 13000 : 3200,
        signal,
      });
      if (!armSimulationAtmosphereReplacement({ transactionId: transaction.id })) {
        throw new Error('Simulation atmosphere prime could not be armed');
      }
      await waitForSimulationAtmosphereReady({
        transactionId: transaction.id,
        targetSimulationId: primeTarget.id,
        timeoutMs: primeTarget.routeBacked ? 13000 : 3200,
        signal,
      });
    };
    const runIn = async () => {
      publishPhase(SIMULATION_SWITCH_PHASES.IN);
      recordSimulationVisualTransitionEvent('runtime-ready', {
        routeId: activeRouteIdRef.current,
        transactionId: transaction.id,
      });
      await animateSimulationFocusLayer(surfaceRefs, {
        direction: 'in',
        durationMs: timings.enter,
        localDurationMs: timings.enterLocal,
        easing: timings.enterEasing,
      });
    };
    const restorePrevious = async (signal) => {
      if (signal?.aborted || unmounted) {
        throw signal?.reason || new DOMException('Simulation recovery was aborted.', 'AbortError');
      }
      const rollbackHref = fromTarget.routeBacked
        ? fromTarget.href
        : `${buildRouteHref('home')}?mode=${encodeURIComponent(fromTarget.mode)}`;
      const rollbackComputedState = computeRouteState(rollbackHref);
      const rollbackContext = createSimulationSwitchBootstrapContext(
        transaction,
        fromTarget,
        previousReadinessRouteId,
        { rollback: true, signal },
      );
      const rollbackState = Object.freeze({
        ...rollbackComputedState,
        simulationSwitchContext: rollbackContext,
      });

      if (!prepareSimulationAtmosphereRollback({
        transactionId: transaction.id,
        targetSimulationId: fromTarget.id,
        targetSourceRouteId: previousAtmosphereRouteId,
        reuseActiveDefinition: reusesHomeAtmosphereSource,
      })) {
        throw new Error('Previous simulation atmosphere generation could not be reserved');
      }
      if (!commitSimulationAtmosphereReplacement({ transactionId: transaction.id })) {
        throw new Error('Previous simulation atmosphere ownership could not be restored');
      }

      if (!changesRuntimeOwnership && !fromTarget.routeBacked) {
        const { setMode } = await import('../legacy/modules/modes/mode-controller.js');
        const restored = await setMode(fromTarget.mode);
        if (restored === false) throw new Error(`Previous simulation "${fromTarget.mode}" failed to restore`);
        if (signal?.aborted || unmounted) {
          throw signal?.reason || new DOMException('Simulation recovery was aborted.', 'AbortError');
        }
        commitRouteState(
          Object.freeze({ ...previousState, simulationSwitchContext: null }),
          previousReadinessRouteId,
        );
      } else {
        commitRouteState(rollbackState, previousReadinessRouteId);
      }
      rewindSimulationSwitchTransactionForRecovery(transaction, generation);
      setSimulationAtmosphereSwitchPhase(SIMULATION_SWITCH_PHASES.PRIME, transaction.id);
      publishSimulationSwitchTransaction(transaction, 'recovering');
      if (changesRuntimeOwnership) {
        const readinessStatus = await waitForSimulationRouteReady(
          previousReadinessRouteId,
          fromTarget.routeBacked ? 13000 : 3200,
          signal,
        );
        if (readinessStatus !== 'ready') {
          throw new Error(`Previous simulation runtime "${previousReadinessRouteId}" did not recover (${readinessStatus})`);
        }
      }
      await waitForSimulationPrimeBarrier({
        target: fromTarget,
        timeoutMs: fromTarget.routeBacked ? 13000 : 3200,
        signal,
      });
      if (!armSimulationAtmosphereReplacement({ transactionId: transaction.id })) {
        throw new Error('Previous simulation atmosphere prime could not be armed');
      }
      await waitForSimulationAtmosphereReady({
        transactionId: transaction.id,
        targetSimulationId: fromTarget.id,
        timeoutMs: fromTarget.routeBacked ? 13000 : 3200,
        signal,
      });
      if (signal?.aborted || unmounted) {
        throw signal?.reason || new DOMException('Simulation recovery was aborted.', 'AbortError');
      }
      previousOwnershipRestored = true;
      publishPhase(SIMULATION_SWITCH_PHASES.IN);
      await animateSimulationFocusLayer(surfaceRefs, {
        direction: 'in',
        durationMs: timings.enter,
        localDurationMs: timings.enterLocal,
        easing: timings.enterEasing,
      });
      if (!settleSimulationAtmosphereReplacement({ transactionId: transaction.id })) {
        throw new Error('Previous simulation atmosphere settlement was rejected');
      }
    };
    const finish = (status) => {
      if (unmounted) return;
      activeSimulationSwitchRef.current = null;
      cancelActiveSimulationSwitchRef.current = null;
      transitionActiveRef.current = false;
      activeGateTransitionRef.current = false;
      setLegacyRouteTransitionActive(false);
      cleanupSimulationFocusLayer(surfaceRefs);
      setSimulationShellStability(false, surfaceRefs);
      setSimulationAtmosphereSwitchPhase(SIMULATION_SWITCH_PHASES.IDLE, transaction.id);
      publishSimulationSwitchTransaction(transaction, status);

      const nextIntent = queuedSimulationIntentRef.current;
      queuedSimulationIntentRef.current = null;
      if (nextIntent?.kind === 'route') {
        setStableTimeout(() => navigateRef.current?.(nextIntent.href, nextIntent.options), 0);
        return;
      }
      if (
        nextIntent?.kind === 'simulation'
        && nextIntent.simulationId !== readRouteStateSimulationFocusId(activeRouteStateRef.current)
      ) {
        setStableTimeout(() => requestSimulationSwitch(nextIntent.simulationId), 0);
        return;
      }
      const queuedNavigation = queuedNavigationRef.current;
      queuedNavigationRef.current = null;
      if (queuedNavigation) {
        setStableTimeout(() => navigateRef.current?.(queuedNavigation.href, queuedNavigation.options), 0);
      }
    };

    const publishTargetSettlement = (status, endpoint) => {
      const settlementOptions = { status, endpoint, publish: true };
      if (!canSettleSimulationSwitchTransaction(transaction, settlementOptions, generation)) {
        throw new Error('Simulation switch publication preflight was rejected');
      }
      const cleanHref = buildRouteHref('home');
      const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (currentHref !== cleanHref) {
        window.history.replaceState(window.history.state || {}, '', cleanHref);
      }
      const publishedFocus = writeManualSimulationFocus(target.id);
      if (!publishedFocus) throw new Error(`Simulation "${target.id}" could not be published`);
      const settledState = Object.freeze({
        ...activeRouteStateRef.current,
        canonicalHref: cleanHref,
      });
      commitRouteState(settledState, targetReadinessRouteId);
      settledRouteStateRef.current = settledState;
      settledReadinessRouteIdRef.current = targetReadinessRouteId;
      if (!settleSimulationSwitchTransaction(transaction, settlementOptions, generation)) {
        throw new Error('Simulation switch settlement failed after a successful preflight');
      }
    };

    const completeRecovery = async (status = 'recovered') => {
      if (recoveryPromise) return recoveryPromise;
      recoveryController = new AbortController();
      recoveryPromise = (async () => {
        await ownershipCommitPromise.catch(() => undefined);
        if (unmounted) return;
        await restorePrevious(recoveryController.signal);
        if (!settleSimulationSwitchTransaction(transaction, {
          status,
          endpoint: SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.RESTORE_PREVIOUS,
          publish: false,
        }, generation)) {
          throw new Error('Previous simulation recovery settlement was rejected');
        }
      })();
      return recoveryPromise;
    };

    const preserveMountedTarget = async () => {
      recoveryController = new AbortController();
      const preservationSignal = recoveryController.signal;
      const preservationContext = createSimulationSwitchBootstrapContext(
        transaction,
        target,
        targetReadinessRouteId,
        { signal: preservationSignal },
      );
      const preservedState = Object.freeze({
        ...computedTargetState,
        simulationSwitchContext: target.routeBacked ? preservationContext : null,
      });
      if (!prepareSimulationAtmosphereRollback({
        transactionId: transaction.id,
        targetSimulationId: target.id,
        targetSourceRouteId: targetAtmosphereRouteId,
        reuseActiveDefinition: reusesHomeAtmosphereSource,
      })) {
        throw new Error('Mounted target atmosphere generation could not be reserved');
      }
      if (!commitSimulationAtmosphereReplacement({ transactionId: transaction.id })) {
        throw new Error('Mounted target atmosphere ownership could not be preserved');
      }
      if (!changesRuntimeOwnership) {
        const { setMode } = await import('../legacy/modules/modes/mode-controller.js');
        const preserved = await setMode(target.mode);
        if (preserved === false) throw new Error(`Mounted target "${target.mode}" could not be preserved`);
        if (preservationSignal.aborted || unmounted) {
          throw preservationSignal.reason
            || new DOMException('Mounted-target preservation was aborted.', 'AbortError');
        }
      }
      commitRouteState(preservedState, targetReadinessRouteId);
      if (transaction.phase !== SIMULATION_SWITCH_PHASES.PRIME) {
        rewindSimulationSwitchTransactionForRecovery(transaction, generation);
      }
      setSimulationAtmosphereSwitchPhase(SIMULATION_SWITCH_PHASES.PRIME, transaction.id);
      if (changesRuntimeOwnership) {
        const readinessStatus = await waitForSimulationRouteReady(
          targetReadinessRouteId,
          target.routeBacked ? 13000 : 3200,
          preservationSignal,
        );
        if (readinessStatus !== 'ready') {
          throw new Error(`Mounted target runtime "${targetReadinessRouteId}" was not ready (${readinessStatus})`);
        }
      }
      await waitForSimulationPrimeBarrier({
        target,
        timeoutMs: target.routeBacked ? 13000 : 3200,
        signal: preservationSignal,
      });
      if (!armSimulationAtmosphereReplacement({ transactionId: transaction.id })) {
        throw new Error('Mounted target atmosphere prime could not be armed');
      }
      await waitForSimulationAtmosphereReady({
        transactionId: transaction.id,
        targetSimulationId: target.id,
        timeoutMs: target.routeBacked ? 13000 : 3200,
        signal: preservationSignal,
      });
      if (transaction.phase === SIMULATION_SWITCH_PHASES.PRIME) {
        advanceSimulationSwitchTransaction(transaction, SIMULATION_SWITCH_PHASES.IN, generation);
      }
      setSimulationAtmosphereSwitchPhase(SIMULATION_SWITCH_PHASES.IN, transaction.id);
      await animateSimulationFocusLayer(surfaceRefs, {
        direction: 'in',
        durationMs: timings.enter,
        localDurationMs: timings.enterLocal,
        easing: timings.enterEasing,
      });
      if (!settleSimulationAtmosphereReplacement({ transactionId: transaction.id })) {
        throw new Error('Mounted target atmosphere settlement was rejected');
      }
      publishTargetSettlement('degraded-target', SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.PRESERVE_TARGET);
    };

    const cancelActiveSimulationSwitch = (reason = 'cancelled', options = {}) => {
      if (options.unmount === true) {
        unmounted = true;
        orchestrationCancelled = true;
        cancelSimulationSwitchTransaction(transaction, reason, generation);
        abortController.abort(reason);
        recoveryController?.abort(reason);
        if (atmospherePrepared) {
          rollbackSimulationAtmosphereReplacement({ transactionId: transaction.id, reason });
          atmospherePrepared = false;
        }
        setSimulationAtmosphereSwitchPhase(SIMULATION_SWITCH_PHASES.IDLE, transaction.id);
        ++simulationSwitchGenerationRef.current;
        activeSimulationSwitchRef.current = null;
        cancelActiveSimulationSwitchRef.current = null;
        queuedSimulationIntentRef.current = null;
        transitionActiveRef.current = false;
        setLegacyRouteTransitionActive(false);
        cleanupSimulationFocusLayer(surfaceRefs);
        setSimulationShellStability(false, surfaceRefs);
        setSimulationFocusTransitionState(null);
        return true;
      }
      if (orchestrationCancelled) return false;
      orchestrationCancelled = true;
      cancelSimulationSwitchTransaction(transaction, reason, generation);
      recoveryController?.abort(reason);
      publishSimulationSwitchTransaction(transaction, committed ? 'recovering' : 'cancelling');

      void (async () => {
        if (!committed) {
          if (atmospherePrepared) {
            rollbackSimulationAtmosphereReplacement({ transactionId: transaction.id, reason });
            atmospherePrepared = false;
          }
          if (outStarted) {
            await animateSimulationFocusLayer(surfaceRefs, {
              direction: 'in',
              durationMs: timings.enter,
              localDurationMs: timings.enterLocal,
              easing: timings.enterEasing,
            });
          }
          finish('cancelled');
          return;
        }

        try {
          await completeRecovery('cancelled-recovered');
          if (unmounted) return;
          finish('cancelled-recovered');
        } catch (recoveryError) {
          if (unmounted) return;
          transaction.error = recoveryError;
          if (previousOwnershipRestored) {
            if (transaction.phase !== SIMULATION_SWITCH_PHASES.PRIME) {
              rewindSimulationSwitchTransactionForRecovery(transaction, generation);
            }
            if (transaction.phase === SIMULATION_SWITCH_PHASES.PRIME) {
              advanceSimulationSwitchTransaction(transaction, SIMULATION_SWITCH_PHASES.IN, generation);
            }
            setSimulationAtmosphereSwitchPhase(SIMULATION_SWITCH_PHASES.IN, transaction.id);
            await animateSimulationFocusLayer(surfaceRefs, {
              direction: 'in',
              durationMs: timings.enter,
              localDurationMs: timings.enterLocal,
              easing: timings.enterEasing,
            }).catch(() => undefined);
            settleSimulationAtmosphereReplacement({ transactionId: transaction.id });
            settleSimulationSwitchTransaction(transaction, {
              status: 'recovery-failed-open',
              endpoint: SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.RESTORE_PREVIOUS,
              publish: false,
            }, generation);
          } else {
            await preserveMountedTarget();
          }
          finish(previousOwnershipRestored ? 'recovery-failed-open' : 'degraded-target');
        }
      })().catch((error) => {
        if (unmounted) return;
        transaction.error = error;
        failOpenSimulationSwitchTransaction(transaction, 'recovery-failed-open', generation);
        finish('recovery-failed-open');
      });
      return true;
    };

    activeSimulationSwitchRef.current = transaction;
    cancelActiveSimulationSwitchRef.current = cancelActiveSimulationSwitch;
    transitionActiveRef.current = true;
    activeTransitionCommittedRef.current = false;
    setLegacyRouteTransitionActive(true, { gate: false });
    setSimulationShellStability(true, surfaceRefs);
    // Publish the accepted target before yielding to preload work. React batches this
    // with the chooser click, so the switcher label changes in the same interaction
    // commit instead of waiting for prepare—or the full runtime settlement—to finish.
    publishSimulationSwitchTransaction(transaction, 'accepted');

    void Promise.resolve()
      .then(() => {
        if (isStale()) return undefined;
        prepareSimulationAtmosphereReplacement({
          transactionId: transaction.id,
          targetSimulationId: target.id,
          targetSourceRouteId: targetAtmosphereRouteId,
          reuseActiveDefinition: reusesHomeAtmosphereSource,
        });
        atmospherePrepared = true;
        publishPhase(SIMULATION_SWITCH_PHASES.PREPARE);
        return prepareTarget();
      })
      .then(() => {
        if (isStale()) return undefined;
        publishPhase(SIMULATION_SWITCH_PHASES.OUT);
        outStarted = true;
        return animateSimulationFocusLayer(surfaceRefs, {
          direction: 'out',
          durationMs: timings.exit,
          localDurationMs: timings.exitLocal,
          easing: timings.exitEasing,
        });
      })
      .then(() => {
        if (isStale()) return undefined;
        ownershipCommitPromise = commitTarget();
        return ownershipCommitPromise;
      })
      .then(() => {
        if (isStale()) return undefined;
        return primeTarget(target, targetReadinessRouteId);
      })
      .then(() => {
        if (isStale()) return undefined;
        return runIn();
      })
      .then(() => {
        if (isStale()) return;
        if (!settleSimulationAtmosphereReplacement({ transactionId: transaction.id })) {
          throw new Error('Simulation atmosphere settlement was rejected');
        }
        publishTargetSettlement('ready', SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.SETTLE_INCOMING);
        finish('ready');
      })
      .catch(async (error) => {
        if (isStale()) return;
        beginSimulationSwitchRollback(transaction, error, generation);
        publishSimulationSwitchTransaction(transaction, committed ? 'recovering' : 'failed');
        try {
          if (committed) {
            await completeRecovery('recovered');
          } else {
            if (atmospherePrepared) {
              rollbackSimulationAtmosphereReplacement({
                transactionId: transaction.id,
                reason: 'precommit-failure',
              });
              atmospherePrepared = false;
            }
            if (outStarted) {
              await animateSimulationFocusLayer(surfaceRefs, {
                direction: 'in',
                durationMs: timings.enter,
                localDurationMs: timings.enterLocal,
                easing: timings.enterEasing,
              });
            }
            settleSimulationSwitchTransaction(transaction, {
              status: 'failed',
              endpoint: SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.RESTORE_OUTGOING,
              publish: false,
            }, generation);
          }
        } catch (recoveryError) {
          if (orchestrationCancelled || unmounted) return;
          transaction.error = recoveryError;
          if (committed && previousOwnershipRestored) {
            if (transaction.phase !== SIMULATION_SWITCH_PHASES.PRIME) {
              rewindSimulationSwitchTransactionForRecovery(transaction, generation);
            }
            if (transaction.phase === SIMULATION_SWITCH_PHASES.PRIME) {
              advanceSimulationSwitchTransaction(transaction, SIMULATION_SWITCH_PHASES.IN, generation);
            }
            setSimulationAtmosphereSwitchPhase(SIMULATION_SWITCH_PHASES.IN, transaction.id);
            await animateSimulationFocusLayer(surfaceRefs, {
              direction: 'in',
              durationMs: timings.enter,
              localDurationMs: timings.enterLocal,
              easing: timings.enterEasing,
            }).catch(() => undefined);
            settleSimulationAtmosphereReplacement({ transactionId: transaction.id });
            settleSimulationSwitchTransaction(transaction, {
              status: 'recovery-failed-open',
              endpoint: SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.RESTORE_PREVIOUS,
              publish: false,
            }, generation);
          } else if (committed) {
            try {
              await preserveMountedTarget();
            } catch (preservationError) {
              transaction.error = preservationError;
              failOpenSimulationSwitchTransaction(transaction, 'recovery-failed-open', generation);
            }
          } else if (!committed) {
            settleSimulationSwitchTransaction(transaction, {
              status: 'failed',
              endpoint: SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.RESTORE_OUTGOING,
              publish: false,
            }, generation);
          }
        }
        if (orchestrationCancelled || unmounted) return;
        finish(committed
          ? (previousOwnershipRestored
              ? 'recovered'
              : (transaction.settlementEndpoint === SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.PRESERVE_MOUNTED
                  ? 'recovery-failed-open'
                  : 'degraded-target'))
          : 'failed');
      });

    return true;
  }, [publishSimulationSwitchTransaction, surfaceRefs]);

  const navigate = useCallback((href, options = {}) => {
    const route = resolveRouteFromHref(href, window.location.href);
    if (!isSharedShellRoute(route)) return false;

    const targetUrl = new URL(href, window.location.href);
    const nextState = computeRouteState(targetUrl.toString());
    const nextRouteId = nextState.route.id;
    const nextReadinessRouteId = resolveRouteReadinessId(
      getRouteReadinessIdRef.current,
      nextState,
    );
    const nextRouteContentSignature = readRouteContentSignature(nextState);
    const nextFocusSimulationId = readRouteStateSimulationFocusId(nextState);
    if (options.transitionStyle === 'simulation-focus') {
      return requestSimulationSwitch(options.simulationId || nextFocusSimulationId);
    }
    if (activeSimulationSwitchRef.current) {
      queuedSimulationIntentRef.current = Object.freeze({
        kind: 'route',
        href: targetUrl.toString(),
        options: Object.freeze({ ...options }),
      });
      cancelActiveSimulationSwitchRef.current?.('route-navigation');
      return true;
    }
    const isSameRoute = nextRouteId === activeRouteIdRef.current;
    const hasRouteContentChange = nextRouteContentSignature !== activeRouteContentSignatureRef.current;
    const hasSimulationFocusChange = nextFocusSimulationId !== activeFocusSimulationIdRef.current;
    const previousState = options.resumeCovered === true
      ? settledRouteStateRef.current
      : activeRouteStateRef.current;
    const previousRouteId = activeRouteIdRef.current;
    const previousReadinessRouteId = options.resumeCovered === true
      ? settledReadinessRouteIdRef.current
      : activeReadinessRouteIdRef.current;
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
      activeReadinessRouteIdRef.current = nextReadinessRouteId;
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
      const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (options.source !== 'history' && currentHref !== previousState.canonicalHref) {
        window.history.replaceState(window.history.state || {}, '', previousState.canonicalHref);
      }
      setRouteState(previousState);
      activeRouteStateRef.current = previousState;
      activeRouteIdRef.current = previousRouteId;
      activeReadinessRouteIdRef.current = previousReadinessRouteId;
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
      setRouteSurfaceVisibility(false, surfaceRefs);
      setStableTimeout(() => {
        const queued = queuedNavigationRef.current;
        queuedNavigationRef.current = null;
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
          replace: true,
          resumeCovered: true,
          forceTransition: true,
        });
      }, 0);
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
    const resumeCovered = options.resumeCovered === true;
    if (document.documentElement.dataset.absSimulationFocusTransition) {
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
      settledReadinessRouteIdRef.current = activeReadinessRouteIdRef.current;
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
        dismissGateBackdrop();
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
        fromReadinessRouteId: previousReadinessRouteId,
        toReadinessRouteId: nextReadinessRouteId,
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
          routeReadyWaiter = waitForRouteReady(nextReadinessRouteId, routeTimings.ready, {
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
            throw new Error(`Route "${nextReadinessRouteId}" did not become ready (${readinessStatus}).`);
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
            nextReadinessRouteId,
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
            const restoredWaiter = waitForRouteReady(previousReadinessRouteId, routeTimings.ready, {
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
    settledReadinessRouteIdRef.current = nextReadinessRouteId;
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
    requestSimulationSwitch,
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
    if (isSimulationFocus) {
      return requestSimulationSwitch(options.simulationId);
    }

    const finishTransition = () => {
      transitionActiveRef.current = false;
      activeGateTransitionRef.current = false;
      const releaseGateBackdrop = Boolean(options.releaseGateBackdropOnComplete);
      finalizeTransition(false, currentRouteId, surfaceRefs, animationRegistry, inertRegistry, {
        preserveTransitionPhase: releaseGateBackdrop,
      });
      resetSimulationFocusTransition(surfaceRefs);
      if (releaseGateBackdrop) {
        dismissGateBackdrop();
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
  }, [
    animationRegistry,
    inertRegistry,
    navigate,
    requestSimulationSwitch,
    surfaceRefs,
    syncSteadyTransitionPhase,
  ]);

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
      if (activeSimulationSwitchRef.current) {
        queuedSimulationIntentRef.current = Object.freeze({
          kind: 'route',
          href: nextHref,
          options: Object.freeze({
            replace: true,
            source: 'history',
            activation: 'history',
          }),
        });
        cancelActiveSimulationSwitchRef.current?.('popstate');
        return;
      }
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
        const nextReadinessRouteId = resolveRouteReadinessId(
          getRouteReadinessIdRef.current,
          nextState,
        );
        activeReadinessRouteIdRef.current = nextReadinessRouteId;
        activeRouteContentSignatureRef.current = readRouteContentSignature(nextState);
        activeFocusSimulationIdRef.current = readRouteStateSimulationFocusId(nextState);
        settledRouteStateRef.current = nextState;
        settledReadinessRouteIdRef.current = nextReadinessRouteId;
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
      if (activeSimulationSwitchRef.current) {
        cancelActiveSimulationSwitchRef.current?.('unmount', { unmount: true });
      }
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
    getRouteReadinessIdRef.current = getRouteReadinessId;
  }, [getRouteReadinessId]);

  useLayoutEffect(() => {
    activeRouteIdRef.current = routeState.route.id;
    activeReadinessRouteIdRef.current = resolveRouteReadinessId(getRouteReadinessId, routeState);
    activeRouteContentSignatureRef.current = readRouteContentSignature(routeState);
    activeFocusSimulationIdRef.current = readRouteStateSimulationFocusId(routeState);
  }, [getRouteReadinessId, routeState]);

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
    if (
      simulationSwitchGenerationRef.current !== 0
      || transitionActiveRef.current
      || !routeState.dailyFocusRouteId
    ) return;
    const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (currentHref !== routeState.canonicalHref) {
      window.history.replaceState(window.history.state || {}, '', routeState.canonicalHref);
    }
  }, [routeState.canonicalHref, routeState.dailyFocusRouteId]);

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
    requestSimulationSwitch,
    simulationSwitchSnapshot,
  };
}
