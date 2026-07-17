import.meta.env = {"BASE_URL": "/", "DEV": true, "MODE": "development", "PROD": false, "SSR": false};import __vite__cjsImport0_react from "/node_modules/.vite/deps/react.js?v=6e8fde4d"; const useCallback = __vite__cjsImport0_react["useCallback"]; const useEffect = __vite__cjsImport0_react["useEffect"]; const useLayoutEffect = __vite__cjsImport0_react["useLayoutEffect"]; const useMemo = __vite__cjsImport0_react["useMemo"]; const useRef = __vite__cjsImport0_react["useRef"]; const useState = __vite__cjsImport0_react["useState"];
import { hasGateAccess } from "/src/lib/access-gates.js";
import { buildRouteHref, getRouteById, resolveRouteFromHref, resolveRouteFromPathname } from "/src/lib/routes.js";
import { installSpaNavigationBridge } from "/src/lib/spa-navigation.js";
import { normalizeSimulationId, writeManualSimulationFocus } from "/src/data/simulationCatalog.js";
import { clearStableTimeout, setStableTimeout } from "/src/lib/legacy-runtime-scope.js";
import { getActiveLegacyRuntimeSnapshot } from "/src/hooks/useLegacyRouteRuntime.js";
import {
  isSimulationVisualTransitionSourceActive,
  recordSimulationVisualTransitionEvent,
  runSimulationVisualTransition,
} from "/src/lib/simulationVisualTransition.js";
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
} from "/src/lib/transition-phase.js";

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
const ROUTE_ENTER_SELECTOR = '[data-route-enter]';
const ROUTE_ENTER_TOTAL_MS = 720;
const PORTFOLIO_GATE_SCENE_FADE_MS = 480;
const ROUTE_ENTER_GROUPS = {
  identity: {
    startMs: 0,
    stepMs: 58,
    durationMs: 420,
    slide: true,
  },
  legend: {
    startMs: 90,
    stepMs: 36,
    durationMs: 460,
    slide: true,
  },
  context: {
    startMs: 210,
    stepMs: 54,
    durationMs: 480,
    slide: true,
  },
  action: {
    startMs: 300,
    stepMs: 54,
    durationMs: 440,
    slide: false,
  },
  footer: {
    startMs: 360,
    stepMs: 48,
    durationMs: 420,
    slide: true,
  },
};
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

function readRouteEnterMotion() {
  return {
    y: getComputedStyle(document.documentElement).getPropertyValue('--route-enter-ty').trim() || '3px',
    blur: getComputedStyle(document.documentElement).getPropertyValue('--route-enter-blur').trim() || '1.5px',
    scale: getComputedStyle(document.documentElement).getPropertyValue('--route-enter-scale').trim() || '0.994',
    easing: readRootEasing('--route-enter-ease', 'cubic-bezier(0.22, 0, 0.16, 1)'),
  };
}

function getRouteEnterGroupConfig(groupName) {
  return ROUTE_ENTER_GROUPS[groupName] || ROUTE_ENTER_GROUPS.context;
}

function parseRouteEnterOrder(el, fallback) {
  const raw = el?.dataset?.routeEnterOrder ?? el?.style?.getPropertyValue('--i') ?? '';
  const parsed = Number.parseInt(String(raw), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getRouteEnterTargets(surfaceRefs) {
  const { wall, hero, chrome, secondary } = getContentLayers(surfaceRefs);
  const scopeNodes = [wall, hero, chrome, secondary].filter(Boolean);
  const seen = new Set();
  const targets = [];
  const groupCounts = new Map();

  scopeNodes.forEach((scope) => {
    const candidates = [
      ...(scope.matches?.(ROUTE_ENTER_SELECTOR) ? [scope] : []),
      ...Array.from(scope.querySelectorAll?.(ROUTE_ENTER_SELECTOR) || []),
    ];

    candidates.forEach((el) => {
      if (!el || seen.has(el)) return;
      seen.add(el);
      const group = el.dataset.routeEnter || 'context';
      const fallbackOrder = groupCounts.get(group) || 0;
      const order = parseRouteEnterOrder(el, fallbackOrder);
      groupCounts.set(group, Math.max(fallbackOrder + 1, order + 1));
      const config = getRouteEnterGroupConfig(group);
      const finalOpacity = getComputedStyle(el).opacity || '1';
      targets.push({
        el,
        group,
        order,
        delayMs: config.startMs + (config.stepMs * order),
        durationMs: config.durationMs,
        finalOpacity,
        slide: el.dataset.routeEnterSlide === 'false' ? false : config.slide,
      });
    });
  });

  return targets.sort((a, b) => (
    a.delayMs - b.delayMs
    || a.group.localeCompare(b.group)
    || a.order - b.order
  ));
}

function setRouteEnterInitialState(targets, routeEnterMotion) {
  targets.forEach(({ el, slide }) => {
    el.style.transition = 'none';
    el.style.opacity = '0';
    el.style.filter = `blur(${routeEnterMotion.blur})`;
    el.style.transform = slide
      ? `translateY(${routeEnterMotion.y}) scale(${routeEnterMotion.scale})`
      : 'translateY(0) scale(1)';
    el.style.pointerEvents = 'none';
    el.style.willChange = 'opacity, transform, filter';
  });
}

function playRouteEnterTargets(targets, routeEnterMotion) {
  targets.forEach(({ el, delayMs, durationMs, finalOpacity }) => {
    el.style.transition = [
      `opacity ${durationMs}ms ${routeEnterMotion.easing} ${delayMs}ms`,
      `transform ${durationMs}ms ${routeEnterMotion.easing} ${delayMs}ms`,
      `filter ${durationMs}ms ${routeEnterMotion.easing} ${delayMs}ms`,
    ].join(', ');
    el.style.opacity = finalOpacity || '1';
    el.style.filter = 'blur(0)';
    el.style.transform = 'translateY(0) scale(1)';
    setStableTimeout(() => {
      el.style.opacity = '';
      el.style.transform = '';
      el.style.filter = '';
      el.style.transition = '';
      el.style.transitionDelay = '';
      el.style.pointerEvents = '';
      el.style.willChange = '';
    }, delayMs + durationMs + 80);
  });
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
  import("/src/legacy/modules/ui/gate-modal-shared.js")
    .then((m) => m.dismissGateBackdrop(options))
    .catch(() => forceBackdropDismiss(options));
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

function commitStaggerStyles(routeId, surfaceRefs) {
  getGroupedTransitionItems(routeId, surfaceRefs).forEach(({ el }) => {
    el.style.opacity = '1';
    el.style.transform = '';
    el.style.filter = '';
    el.style.willChange = 'auto';
  });
  getRouteEnterTargets(surfaceRefs).forEach(({ el }) => {
    el.style.opacity = '';
    el.style.transform = '';
    el.style.filter = '';
    el.style.transition = '';
    el.style.transitionDelay = '';
    el.style.pointerEvents = '';
    el.style.willChange = '';
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
  root.dataset.absPortfolioReveal = reason;
  const generation = getActiveLegacyRuntimeSnapshot().generation;
  window.dispatchEvent(new CustomEvent('abs:portfolio:reveal', {
    detail: { generation, reason },
  }));
}

function clearPortfolioDeckRelease() {
  delete document.documentElement.dataset.absPortfolioReveal;
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
  const hostRect = host?.getBoundingClientRect();
  if (!host || !hostRect || hostRect.width < 1 || hostRect.height < 1) return null;

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
  document.body.append(snapshot);
  let released = false;
  return {
    node: snapshot,
    show() {
      if (released || !snapshot.isConnected) return;
      snapshot.dataset.state = 'visible';
    },
    release({ immediate = false } = {}) {
      if (released) return;
      released = true;
      if (immediate || !snapshot.isConnected) {
        snapshot.remove();
        return;
      }
      snapshot.dataset.state = 'releasing';
      setStableTimeout(() => snapshot.remove(), 200);
    },
  };
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
    let remaining = Math.max(1, count);
    const tick = () => {
      remaining -= 1;
      if (remaining <= 0) {
        resolve();
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
      && hero?.querySelector('.hero-title__role')?.textContent?.trim()
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
          hasCanvasBufferReady()
          && (
          document.getElementById('portfolioProjectMount')
          && (deckFailed || isPortfolioScrollRailReady())
          )
        )
      )
    );
  }

  if (routeId === 'about') {
    return Boolean(
      body.classList.contains('about-page')
      && document.querySelector('[data-route-content="about"]')
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
} = {}) {
  return new Promise((resolve) => {
    const groups = buildRouteTransitionGroups(routeId, surfaceRefs);
    const targets = getGroupedTransitionItems(routeId, surfaceRefs);
    const routeEnterTargets = getRouteEnterTargets(surfaceRefs);
    const { wall, hero, ui } = getContentLayers(surfaceRefs);
    const isRouteTransition = isRouteTransitionPhase(getTransitionPhase());
    const routeEnterMotion = readRouteEnterMotion();

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

    setInstrumentWakeState('in');

    // Hide every owned transition target before making it visible.
    targets.forEach(({ el }) => {
      el.style.opacity = '0';
      el.style.willChange = 'opacity, transform';
    });
    setRouteEnterInitialState(routeEnterTargets, routeEnterMotion);

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

    window.requestAnimationFrame(() => {
      playRouteEnterTargets(routeEnterTargets, routeEnterMotion);
    });

    const surfaceTotal = Math.max(0, ...groups.map((group) => group.delayMs)) + enterMs;
    const routeEnterTotal = routeEnterTargets.length > 0
      ? Math.max(ROUTE_ENTER_TOTAL_MS, ...routeEnterTargets.map((target) => target.delayMs + target.durationMs))
      : 0;
    setStableTimeout(resolve, Math.max(surfaceTotal, routeEnterTotal) + 50);
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
      clearPortfolioDeckRelease();
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
          retainedSimulation?.show();
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
          retainedSimulation?.release();
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
          retainedSimulation?.release();
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInVzZVNoZWxsUm91dGVUcmFuc2l0aW9uLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydC5tZXRhLmVudiA9IHtcIkJBU0VfVVJMXCI6IFwiL1wiLCBcIkRFVlwiOiB0cnVlLCBcIk1PREVcIjogXCJkZXZlbG9wbWVudFwiLCBcIlBST0RcIjogZmFsc2UsIFwiU1NSXCI6IGZhbHNlfTtpbXBvcnQgX192aXRlX19janNJbXBvcnQwX3JlYWN0IGZyb20gXCIvbm9kZV9tb2R1bGVzLy52aXRlL2RlcHMvcmVhY3QuanM/dj02ZThmZGU0ZFwiOyBjb25zdCB1c2VDYWxsYmFjayA9IF9fdml0ZV9fY2pzSW1wb3J0MF9yZWFjdFtcInVzZUNhbGxiYWNrXCJdOyBjb25zdCB1c2VFZmZlY3QgPSBfX3ZpdGVfX2Nqc0ltcG9ydDBfcmVhY3RbXCJ1c2VFZmZlY3RcIl07IGNvbnN0IHVzZUxheW91dEVmZmVjdCA9IF9fdml0ZV9fY2pzSW1wb3J0MF9yZWFjdFtcInVzZUxheW91dEVmZmVjdFwiXTsgY29uc3QgdXNlTWVtbyA9IF9fdml0ZV9fY2pzSW1wb3J0MF9yZWFjdFtcInVzZU1lbW9cIl07IGNvbnN0IHVzZVJlZiA9IF9fdml0ZV9fY2pzSW1wb3J0MF9yZWFjdFtcInVzZVJlZlwiXTsgY29uc3QgdXNlU3RhdGUgPSBfX3ZpdGVfX2Nqc0ltcG9ydDBfcmVhY3RbXCJ1c2VTdGF0ZVwiXTtcbmltcG9ydCB7IGhhc0dhdGVBY2Nlc3MgfSBmcm9tIFwiL3NyYy9saWIvYWNjZXNzLWdhdGVzLmpzXCI7XG5pbXBvcnQgeyBidWlsZFJvdXRlSHJlZiwgZ2V0Um91dGVCeUlkLCByZXNvbHZlUm91dGVGcm9tSHJlZiwgcmVzb2x2ZVJvdXRlRnJvbVBhdGhuYW1lIH0gZnJvbSBcIi9zcmMvbGliL3JvdXRlcy5qc1wiO1xuaW1wb3J0IHsgaW5zdGFsbFNwYU5hdmlnYXRpb25CcmlkZ2UgfSBmcm9tIFwiL3NyYy9saWIvc3BhLW5hdmlnYXRpb24uanNcIjtcbmltcG9ydCB7IG5vcm1hbGl6ZVNpbXVsYXRpb25JZCwgd3JpdGVNYW51YWxTaW11bGF0aW9uRm9jdXMgfSBmcm9tIFwiL3NyYy9kYXRhL3NpbXVsYXRpb25DYXRhbG9nLmpzXCI7XG5pbXBvcnQgeyBjbGVhclN0YWJsZVRpbWVvdXQsIHNldFN0YWJsZVRpbWVvdXQgfSBmcm9tIFwiL3NyYy9saWIvbGVnYWN5LXJ1bnRpbWUtc2NvcGUuanNcIjtcbmltcG9ydCB7IGdldEFjdGl2ZUxlZ2FjeVJ1bnRpbWVTbmFwc2hvdCB9IGZyb20gXCIvc3JjL2hvb2tzL3VzZUxlZ2FjeVJvdXRlUnVudGltZS5qc1wiO1xuaW1wb3J0IHtcbiAgaXNTaW11bGF0aW9uVmlzdWFsVHJhbnNpdGlvblNvdXJjZUFjdGl2ZSxcbiAgcmVjb3JkU2ltdWxhdGlvblZpc3VhbFRyYW5zaXRpb25FdmVudCxcbiAgcnVuU2ltdWxhdGlvblZpc3VhbFRyYW5zaXRpb24sXG59IGZyb20gXCIvc3JjL2xpYi9zaW11bGF0aW9uVmlzdWFsVHJhbnNpdGlvbi5qc1wiO1xuaW1wb3J0IHtcbiAgY2xlYXJMZWdhY3lSb3V0ZVRyYW5zaXRpb25GbGFncyxcbiAgY2xlYXJUcmFuc2l0aW9uUmV0dXJuaW5nU3RhdGUsXG4gIGdldFRyYW5zaXRpb25QaGFzZSxcbiAgaW5zdGFsbFRyYW5zaXRpb25Pd25lcnNoaXBHdWFyZCxcbiAgaW5zdGFsbFRyYW5zaXRpb25QaGFzZU9ic2VydmVyLFxuICBpc1JvdXRlVHJhbnNpdGlvblBoYXNlLFxuICBzZXRMZWdhY3lSb3V0ZVRyYW5zaXRpb25BY3RpdmUsXG4gIHNldFRyYW5zaXRpb25QaGFzZSxcbiAgc3luY1RyYW5zaXRpb25QaGFzZUZyb21Eb20sXG4gIFRSQU5TSVRJT05fUEhBU0VTXG59IGZyb20gXCIvc3JjL2xpYi90cmFuc2l0aW9uLXBoYXNlLmpzXCI7XG5cbi8qIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuICAgUk9VVEUgU1RBVEVcbiAgIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkCAqL1xuXG5mdW5jdGlvbiByZWFkSG9tZUZvY3VzU2ltdWxhdGlvbklkKHNlYXJjaFBhcmFtcykge1xuICBjb25zdCByZXF1ZXN0ZWRJZCA9IHNlYXJjaFBhcmFtcy5nZXQoJ21vZGUnKSB8fCBzZWFyY2hQYXJhbXMuZ2V0KCdmb2N1cycpIHx8IHNlYXJjaFBhcmFtcy5nZXQoJ3NpbXVsYXRpb24nKSB8fCBudWxsO1xuICByZXR1cm4gcmVxdWVzdGVkSWQgPyBub3JtYWxpemVTaW11bGF0aW9uSWQocmVxdWVzdGVkSWQpIDogbnVsbDtcbn1cblxuY29uc3QgU0lNVUxBVElPTl9VUkxfU1RBVEVfUEFSQU1TID0gbmV3IFNldChbJ2RhaWx5JywgJ2ZvY3VzJywgJ21vZGUnLCAnc2ltdWxhdGlvbiddKTtcblxuZnVuY3Rpb24gYnVpbGRDbGVhbkhvbWVIcmVmKHVybCkge1xuICBjb25zdCBjbGVhblVybCA9IG5ldyBVUkwoYnVpbGRSb3V0ZUhyZWYoJ2hvbWUnKSwgd2luZG93LmxvY2F0aW9uLm9yaWdpbik7XG4gIHVybC5zZWFyY2hQYXJhbXMuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgIGlmICghU0lNVUxBVElPTl9VUkxfU1RBVEVfUEFSQU1TLmhhcyhrZXkpKSB7XG4gICAgICBjbGVhblVybC5zZWFyY2hQYXJhbXMuYXBwZW5kKGtleSwgdmFsdWUpO1xuICAgIH1cbiAgfSk7XG4gIGNsZWFuVXJsLmhhc2ggPSB1cmwuaGFzaDtcbiAgcmV0dXJuIGAke2NsZWFuVXJsLnBhdGhuYW1lfSR7Y2xlYW5Vcmwuc2VhcmNofSR7Y2xlYW5VcmwuaGFzaH1gO1xufVxuXG5mdW5jdGlvbiBjb21wdXRlUm91dGVTdGF0ZShocmVmKSB7XG4gIGNvbnN0IHVybCA9IG5ldyBVUkwoaHJlZiwgd2luZG93LmxvY2F0aW9uLmhyZWYpO1xuICBjb25zdCBzdGFsZVJvdXRlVGFyZ2V0ID0gY29uc3VtZVN0YWxlUm91dGVSZXF1ZXN0cyh1cmwpO1xuICBpZiAoc3RhbGVSb3V0ZVRhcmdldCkge1xuICAgIHJldHVybiBjb21wdXRlUm91dGVTdGF0ZShuZXcgVVJMKHN0YWxlUm91dGVUYXJnZXQsIHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4pLnRvU3RyaW5nKCkpO1xuICB9XG5cbiAgY29uc3QgcmVxdWVzdGVkUm91dGUgPSByZXNvbHZlUm91dGVGcm9tUGF0aG5hbWUodXJsLnBhdGhuYW1lKTtcbiAgY29uc3QgaG9tZUZvY3VzU2ltdWxhdGlvbklkID0gcmVxdWVzdGVkUm91dGUuaWQgPT09ICdob21lJ1xuICAgID8gcmVhZEhvbWVGb2N1c1NpbXVsYXRpb25JZCh1cmwuc2VhcmNoUGFyYW1zKVxuICAgIDogbnVsbDtcbiAgY29uc3QgaG9tZVJvdXRlQmFja2VkRm9jdXNJZCA9IERBSUxZX0xBQl9ST1VURV9JRFMuaGFzKGhvbWVGb2N1c1NpbXVsYXRpb25JZClcbiAgICA/IGhvbWVGb2N1c1NpbXVsYXRpb25JZFxuICAgIDogbnVsbDtcbiAgY29uc3QgbGFiRGFpbHlGb2N1c1JvdXRlSWQgPSBEQUlMWV9MQUJfUk9VVEVfSURTLmhhcyhyZXF1ZXN0ZWRSb3V0ZS5pZClcbiAgICAmJiB1cmwuc2VhcmNoUGFyYW1zLmdldCgnZGFpbHknKSA9PT0gJzEnXG4gICAgPyByZXF1ZXN0ZWRSb3V0ZS5pZFxuICAgIDogbnVsbDtcbiAgY29uc3QgZGFpbHlGb2N1c1JvdXRlSWQgPSBob21lUm91dGVCYWNrZWRGb2N1c0lkIHx8IGxhYkRhaWx5Rm9jdXNSb3V0ZUlkO1xuXG4gIGlmIChob21lRm9jdXNTaW11bGF0aW9uSWQgfHwgZGFpbHlGb2N1c1JvdXRlSWQpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcm91dGU6IGdldFJvdXRlQnlJZCgnaG9tZScpLFxuICAgICAgcmVxdWVzdGVkUm91dGVJZDogcmVxdWVzdGVkUm91dGUuaWQsXG4gICAgICBjYW5vbmljYWxIcmVmOiBidWlsZENsZWFuSG9tZUhyZWYodXJsKSxcbiAgICAgIHJlZGlyZWN0R2F0ZUlkOiBudWxsLFxuICAgICAgZGFpbHlGb2N1c1JvdXRlSWQsXG4gICAgICBmb2N1c1NpbXVsYXRpb25JZDogaG9tZUZvY3VzU2ltdWxhdGlvbklkIHx8IGRhaWx5Rm9jdXNSb3V0ZUlkLFxuICAgIH07XG4gIH1cblxuICBjb25zdCBsb2NrZWRHYXRlSWQgPSByZXF1ZXN0ZWRSb3V0ZS5nYXRlZCAmJiAhaGFzR2F0ZUFjY2VzcyhyZXF1ZXN0ZWRSb3V0ZS5pZCkgPyByZXF1ZXN0ZWRSb3V0ZS5pZCA6IG51bGw7XG4gIGlmICghbG9ja2VkR2F0ZUlkICYmIHJlcXVlc3RlZFJvdXRlLmlkID09PSAncG9ydGZvbGlvJykge1xuICAgIGhhc0dhdGVBY2Nlc3MoJ3BvcnRmb2xpbycpO1xuICAgIFsncG9ydGZvbGlvJywgJ3BvcnRmb2xpb0NvZGUnLCAnYWNjZXNzJ10uZm9yRWFjaCgoa2V5KSA9PiB1cmwuc2VhcmNoUGFyYW1zLmRlbGV0ZShrZXkpKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgcm91dGU6IHJlcXVlc3RlZFJvdXRlLFxuICAgIHJlcXVlc3RlZFJvdXRlSWQ6IHJlcXVlc3RlZFJvdXRlLmlkLFxuICAgIGNhbm9uaWNhbEhyZWY6IGJ1aWxkQ2Fub25pY2FsUm91dGVIcmVmKHJlcXVlc3RlZFJvdXRlLCB1cmwpLFxuICAgIHJlZGlyZWN0R2F0ZUlkOiBudWxsLFxuICAgIGRhaWx5Rm9jdXNSb3V0ZUlkOiBudWxsLFxuICAgIGZvY3VzU2ltdWxhdGlvbklkOiBudWxsLFxuICAgIGxvY2tlZEdhdGVJZCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gY29uc3VtZVN0YWxlUm91dGVSZXF1ZXN0cyh1cmwpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBnYXRlID0gdXJsLnNlYXJjaFBhcmFtcy5nZXQoJ2dhdGUnKTtcbiAgICBpZiAoZ2F0ZSA9PT0gJ3BvcnRmb2xpbycpIHtcbiAgICAgIHVybC5zZWFyY2hQYXJhbXMuZGVsZXRlKCdnYXRlJyk7XG4gICAgICByZXR1cm4gYCR7Z2V0Um91dGVCeUlkKCdwb3J0Zm9saW8nKS5wYXRofSR7dXJsLnNlYXJjaH0ke3VybC5oYXNofWA7XG4gICAgfVxuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiBidWlsZENhbm9uaWNhbFJvdXRlSHJlZihyb3V0ZSwgdXJsKSB7XG4gIGNvbnN0IGNhbm9uaWNhbCA9IG5ldyBVUkwoYnVpbGRSb3V0ZUhyZWYocm91dGUuaWQpLCB3aW5kb3cubG9jYXRpb24ub3JpZ2luKTtcbiAgaWYgKHJvdXRlLmlkID09PSAncG9ydGZvbGlvJykge1xuICAgIFsncG9ydGZvbGlvJywgJ3BvcnRmb2xpb0NvZGUnLCAnYWNjZXNzJ10uZm9yRWFjaCgoa2V5KSA9PiB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHVybC5zZWFyY2hQYXJhbXMuZ2V0KGtleSk7XG4gICAgICBpZiAodmFsdWUpIGNhbm9uaWNhbC5zZWFyY2hQYXJhbXMuc2V0KGtleSwgdmFsdWUpO1xuICAgIH0pO1xuICB9XG4gIGlmIChfX0RFVl9fICYmIHJvdXRlLmlkID09PSAnYWJvdXQtbmFycmF0aXZlLWxhYicgJiYgdXJsLnNlYXJjaFBhcmFtcy5nZXQoJ2VkaXQnKSA9PT0gJzEnKSB7XG4gICAgY2Fub25pY2FsLnNlYXJjaFBhcmFtcy5zZXQoJ2VkaXQnLCAnMScpO1xuICB9XG4gIGNhbm9uaWNhbC5oYXNoID0gdXJsLmhhc2g7XG4gIHJldHVybiBgJHtjYW5vbmljYWwucGF0aG5hbWV9JHtjYW5vbmljYWwuc2VhcmNofSR7Y2Fub25pY2FsLmhhc2h9YDtcbn1cblxuZnVuY3Rpb24gcmVhZFJvdXRlU3RhdGVTaW11bGF0aW9uRm9jdXNJZChyb3V0ZVN0YXRlKSB7XG4gIHJldHVybiByb3V0ZVN0YXRlPy5mb2N1c1NpbXVsYXRpb25JZCB8fCByb3V0ZVN0YXRlPy5kYWlseUZvY3VzUm91dGVJZCB8fCAnJztcbn1cblxuZnVuY3Rpb24gcmVhZFJvdXRlQ29udGVudFNpZ25hdHVyZShyb3V0ZVN0YXRlKSB7XG4gIHJldHVybiBbXG4gICAgcm91dGVTdGF0ZT8ucm91dGU/LmlkIHx8ICcnLFxuICAgIHJvdXRlU3RhdGU/LmxvY2tlZEdhdGVJZCB8fCAnJyxcbiAgICByb3V0ZVN0YXRlPy5kYWlseUZvY3VzUm91dGVJZCB8fCAnJyxcbiAgICByb3V0ZVN0YXRlPy5mb2N1c1NpbXVsYXRpb25JZCB8fCAnJyxcbiAgXS5qb2luKCc6Jyk7XG59XG5cbi8qIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuICAgU01PT1RIIFRSQU5TSVRJT04gRU5HSU5FXG4gICBGYWRlcyByb3V0ZS1vd25lZCBzdXJmYWNlcyAod2FsbCArIHRpdGxlICsgVUkpIHdoaWxlIHRoZSB3YWxsIGZyYW1lIHN0YXlzIHZpc2libGUsXG4gICBzd2FwcyB0aGUgcm91dGUgd2hpbGUgaW52aXNpYmxlLCB0aGVuIHN0YWdnZXJzIHRoZSBuZXcgY29udGVudCBpbi5cblxuICAgVGhlIHdhbGwgKCNzaW11bGF0aW9ucyBib3JkZXIvYmFja2dyb3VuZCkgbmV2ZXIgY2hhbmdlcyBvcGFjaXR5LlxuICAgI3NoZWxsLXdhbGwtc2xvdCAoY2FudmFzKSwgI3NoZWxsLWhlcm8tc2xvdCAodGl0bGUgc2xvdCksIGFuZCAuZmFkZS1jb250ZW50IChVSSBsYXllcikgZmFkZS5cblxuICAgSW52YXJpYW50czpcbiAgIC0gRXZlcnkgYXN5bmMgc3RlcCBjaGVja3MgYHN0YWxlKClgIGJlZm9yZSBtdXRhdGluZyBET00gb3Igc3RhdGUuXG4gICAtIGBmaW5hbGl6ZVRyYW5zaXRpb24oKWAgaXMgdGhlIHNpbmdsZSBjbGVhbnVwIHBhdGggKGlkZW1wb3RlbnQpLlxuICAgLSBSYXBpZCByb3V0ZSByZXF1ZXN0cyBhcmUgcXVldWVkIHdoaWxlIGEgdHJhbnNpdGlvbiBpcyBhY3RpdmUgYW5kIGZsdXNoZWQgYWZ0ZXJ3YXJkLlxuICAg4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQICovXG5cbmNvbnN0IEZBREVfT1VUX01TID0gMTEwO1xuY29uc3QgU1RBR0dFUl9PRkZTRVRfTVMgPSAwO1xuY29uc3QgRUxFTUVOVF9SRVZFQUxfTVMgPSAxNjU7XG5jb25zdCBFQVNFX09VVCA9ICdjdWJpYy1iZXppZXIoMC4yLCAwLjgsIDAuMiwgMSknO1xuY29uc3QgUkVBRFlfRkFMTEJBQ0tfTVMgPSA5MDA7XG5jb25zdCBHUk9VUEVEX1JPVVRFX09GRlNFVF9NUyA9IDgwO1xuY29uc3QgUk9VVEVfRU5URVJfU0VMRUNUT1IgPSAnW2RhdGEtcm91dGUtZW50ZXJdJztcbmNvbnN0IFJPVVRFX0VOVEVSX1RPVEFMX01TID0gNzIwO1xuY29uc3QgUE9SVEZPTElPX0dBVEVfU0NFTkVfRkFERV9NUyA9IDQ4MDtcbmNvbnN0IFJPVVRFX0VOVEVSX0dST1VQUyA9IHtcbiAgaWRlbnRpdHk6IHtcbiAgICBzdGFydE1zOiAwLFxuICAgIHN0ZXBNczogNTgsXG4gICAgZHVyYXRpb25NczogNDIwLFxuICAgIHNsaWRlOiB0cnVlLFxuICB9LFxuICBsZWdlbmQ6IHtcbiAgICBzdGFydE1zOiA5MCxcbiAgICBzdGVwTXM6IDM2LFxuICAgIGR1cmF0aW9uTXM6IDQ2MCxcbiAgICBzbGlkZTogdHJ1ZSxcbiAgfSxcbiAgY29udGV4dDoge1xuICAgIHN0YXJ0TXM6IDIxMCxcbiAgICBzdGVwTXM6IDU0LFxuICAgIGR1cmF0aW9uTXM6IDQ4MCxcbiAgICBzbGlkZTogdHJ1ZSxcbiAgfSxcbiAgYWN0aW9uOiB7XG4gICAgc3RhcnRNczogMzAwLFxuICAgIHN0ZXBNczogNTQsXG4gICAgZHVyYXRpb25NczogNDQwLFxuICAgIHNsaWRlOiBmYWxzZSxcbiAgfSxcbiAgZm9vdGVyOiB7XG4gICAgc3RhcnRNczogMzYwLFxuICAgIHN0ZXBNczogNDgsXG4gICAgZHVyYXRpb25NczogNDIwLFxuICAgIHNsaWRlOiB0cnVlLFxuICB9LFxufTtcbmNvbnN0IFNJTVVMQVRJT05fRk9DVVNfRVhJVF9NUyA9IDUyMDtcbmNvbnN0IFNJTVVMQVRJT05fRk9DVVNfRU5URVJfTVMgPSA1MDA7XG5jb25zdCBTSU1VTEFUSU9OX0ZPQ1VTX1pFUk9fSE9MRF9NUyA9IDQ4O1xuY29uc3QgU0lNVUxBVElPTl9GT0NVU19FWElUX0xPQ0FMX01TID0gMjQwO1xuY29uc3QgU0lNVUxBVElPTl9GT0NVU19FTlRFUl9MT0NBTF9NUyA9IDI4MDtcbmNvbnN0IFNJTVVMQVRJT05fRk9DVVNfRUFTRV9PVVQgPSAnY3ViaWMtYmV6aWVyKDAuNzIsIDAsIDAuODYsIDAuMzIpJztcbmNvbnN0IFNJTVVMQVRJT05fRk9DVVNfRUFTRV9JTiA9ICdjdWJpYy1iZXppZXIoMC4xNiwgMSwgMC4zLCAxKSc7XG5jb25zdCBEQUlMWV9MQUJfUk9VVEVfSURTID0gbmV3IFNldChbXG4gICdyZXBlbC1yb29tJyxcbiAgJ2Zsb2NrLW9mLWJpcmRzJyxcbiAgJ21pbmVyYWwtZ3Jvd3RoJyxcbiAgJ3JpZnQtcmluZ3MnLFxuXSk7XG5cbmxldCB0cmFuc2l0aW9uVG9rZW4gPSAwO1xubGV0IGFjdGl2ZUFuaW1hdGlvbnMgPSBbXTtcblxuZnVuY3Rpb24gcmVhZFJvb3RNcyhuYW1lLCBmYWxsYmFjaykge1xuICB0cnkge1xuICAgIGNvbnN0IHJhdyA9IGdldENvbXB1dGVkU3R5bGUoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50KS5nZXRQcm9wZXJ0eVZhbHVlKG5hbWUpLnRyaW0oKTtcbiAgICBjb25zdCB2YWx1ZSA9IE51bWJlci5wYXJzZUZsb2F0KHJhdyk7XG4gICAgaWYgKCFOdW1iZXIuaXNGaW5pdGUodmFsdWUpKSByZXR1cm4gZmFsbGJhY2s7XG4gICAgaWYgKC9tcyQvaS50ZXN0KHJhdykpIHJldHVybiB2YWx1ZTtcbiAgICBpZiAoL3MkL2kudGVzdChyYXcpKSByZXR1cm4gdmFsdWUgKiAxMDAwO1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGZhbGxiYWNrO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlYWRSb290RWFzaW5nKG5hbWUsIGZhbGxiYWNrKSB7XG4gIHRyeSB7XG4gICAgY29uc3QgcmF3ID0gZ2V0Q29tcHV0ZWRTdHlsZShkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQpLmdldFByb3BlcnR5VmFsdWUobmFtZSkudHJpbSgpO1xuICAgIHJldHVybiByYXcgfHwgZmFsbGJhY2s7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBmYWxsYmFjaztcbiAgfVxufVxuXG5mdW5jdGlvbiBwYXJzZVRyYW5zaXRpb25Ncyh2YWx1ZSwgZmFsbGJhY2spIHtcbiAgY29uc3QgcGFyc2VkID0gTnVtYmVyLnBhcnNlRmxvYXQodmFsdWUpO1xuICByZXR1cm4gTnVtYmVyLmlzRmluaXRlKHBhcnNlZCkgPyBwYXJzZWQgOiBmYWxsYmFjaztcbn1cblxuZnVuY3Rpb24gZ2V0Um91dGVUcmFuc2l0aW9uVGltaW5ncyh7XG4gIGZhZGVNcyxcbiAgc3RhZ2dlck1zLFxuICByZXZlYWxNcyxcbiAgcmVhZHlNcyxcbiAgcmVkdWNlTW90aW9uLFxufSkge1xuICBjb25zdCBmYWxsYmFja0ZhZGUgPSByZWFkUm9vdE1zKCctLXVpLXJvdXRlLWR1cmF0aW9uLW91dCcsIHJlYWRSb290TXMoJy0tdWktZHVyYXRpb24tb3V0JywgRkFERV9PVVRfTVMpKTtcbiAgY29uc3QgZmFsbGJhY2tTdGFnZ2VyID0gcmVhZFJvb3RNcygnLS11aS1yb3V0ZS1zdGFnZ2VyJywgcmVhZFJvb3RNcygnLS11aS1zdGFnZ2VyJywgU1RBR0dFUl9PRkZTRVRfTVMpKTtcbiAgY29uc3QgZmFsbGJhY2tSZXZlYWwgPSByZWFkUm9vdE1zKCctLXVpLXJvdXRlLWR1cmF0aW9uLWluJywgcmVhZFJvb3RNcygnLS11aS1kdXJhdGlvbi1pbicsIEVMRU1FTlRfUkVWRUFMX01TKSk7XG4gIGNvbnN0IGZhbGxiYWNrUmVhZHkgPSBwYXJzZVRyYW5zaXRpb25NcyhyZWFkeU1zLCBSRUFEWV9GQUxMQkFDS19NUyk7XG4gIGNvbnN0IHJldmVhbEVhc2luZyA9IHJlYWRSb290RWFzaW5nKCctLXVpLWVhc2UtaW4nLCBFQVNFX09VVCk7XG4gIGNvbnN0IGZhZGVFYXNpbmcgPSByZWFkUm9vdEVhc2luZygnLS11aS1lYXNlLW91dCcsIEVBU0VfT1VUKTtcblxuICBpZiAocmVkdWNlTW90aW9uKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGZhZGVPdXQ6IDE1MCxcbiAgICAgIHN0YWdnZXI6IDAsXG4gICAgICByZXZlYWw6IDE1MCxcbiAgICAgIHJlYWR5OiBmYWxsYmFja1JlYWR5LFxuICAgICAgcmV2ZWFsRWFzaW5nLFxuICAgICAgZmFkZUVhc2luZyxcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBmYWRlT3V0OiBwYXJzZVRyYW5zaXRpb25NcyhmYWRlTXMsIGZhbGxiYWNrRmFkZSksXG4gICAgc3RhZ2dlcjogcGFyc2VUcmFuc2l0aW9uTXMoc3RhZ2dlck1zLCBmYWxsYmFja1N0YWdnZXIpLFxuICAgIHJldmVhbDogcGFyc2VUcmFuc2l0aW9uTXMocmV2ZWFsTXMsIGZhbGxiYWNrUmV2ZWFsKSxcbiAgICByZWFkeTogZmFsbGJhY2tSZWFkeSxcbiAgICByZXZlYWxFYXNpbmcsXG4gICAgZmFkZUVhc2luZyxcbiAgfTtcbn1cblxuLyog4pSA4pSAIGNvbnRlbnQgbGF5ZXIgcmVmZXJlbmNlcyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAgKi9cblxuZnVuY3Rpb24gZ2V0U3VyZmFjZU5vZGUoc3VyZmFjZVJlZiwgZmFsbGJhY2tTZWxlY3Rvcikge1xuICBpZiAoc3VyZmFjZVJlZj8uY3VycmVudCkgcmV0dXJuIHN1cmZhY2VSZWYuY3VycmVudDtcbiAgaWYgKCFmYWxsYmFja1NlbGVjdG9yKSByZXR1cm4gbnVsbDtcbiAgaWYgKGZhbGxiYWNrU2VsZWN0b3Iuc3RhcnRzV2l0aCgnIycpKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGZhbGxiYWNrU2VsZWN0b3Iuc2xpY2UoMSkpO1xuICB9XG4gIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGZhbGxiYWNrU2VsZWN0b3IpO1xufVxuXG5mdW5jdGlvbiBnZXRDb250ZW50TGF5ZXJzKHN1cmZhY2VSZWZzKSB7XG4gIHJldHVybiB7XG4gICAgd2FsbDogZ2V0U3VyZmFjZU5vZGUoc3VyZmFjZVJlZnM/LndhbGwsICcjc2hlbGwtd2FsbC1zbG90JyksXG4gICAgaGVybzogZ2V0U3VyZmFjZU5vZGUoc3VyZmFjZVJlZnM/Lmhlcm8sICcjc2hlbGwtaGVyby1zbG90JyksXG4gICAgdWk6IGdldFN1cmZhY2VOb2RlKHN1cmZhY2VSZWZzPy51aSwgJy5mYWRlLWNvbnRlbnQnKSxcbiAgICBjaHJvbWU6IGdldFN1cmZhY2VOb2RlKHN1cmZhY2VSZWZzPy5jaHJvbWUsICcuc2hlbGwtdHJhbnNpdGlvbi1zdXJmYWNlLS1jaHJvbWUnKSxcbiAgICBzZWNvbmRhcnk6IGdldFN1cmZhY2VOb2RlKHN1cmZhY2VSZWZzPy5zZWNvbmRhcnksICcuc2hlbGwtdHJhbnNpdGlvbi1zdXJmYWNlLS1zZWNvbmRhcnknKSxcbiAgICBmb290ZXI6IGdldFN1cmZhY2VOb2RlKHN1cmZhY2VSZWZzPy5mb290ZXIsICcuc2hlbGwtdHJhbnNpdGlvbi1zdXJmYWNlLS1mb290ZXInKSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gc2V0SW5zdHJ1bWVudFdha2VTdGF0ZShzdGF0ZSkge1xuICBjb25zdCByb290ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICBpZiAoc3RhdGUpIHtcbiAgICByb290LmRhdGFzZXQuYWJzSW5zdHJ1bWVudFdha2UgPSBzdGF0ZTtcbiAgICByZXR1cm47XG4gIH1cbiAgZGVsZXRlIHJvb3QuZGF0YXNldC5hYnNJbnN0cnVtZW50V2FrZTtcbn1cblxuZnVuY3Rpb24gc2V0Um91dGVMYXllclZpc2liaWxpdHkodmlzaWJsZSwgc3VyZmFjZVJlZnMpIHtcbiAgY29uc3QgeyB3YWxsLCBoZXJvLCBjaHJvbWUsIHNlY29uZGFyeSB9ID0gZ2V0Q29udGVudExheWVycyhzdXJmYWNlUmVmcyk7XG4gIGNvbnN0IGhpZGRlbiA9ICF2aXNpYmxlO1xuICBjb25zdCBvcGFjaXR5ID0gaGlkZGVuID8gJzAnIDogJyc7XG4gIGNvbnN0IHZpc2liaWxpdHkgPSBoaWRkZW4gPyAnaGlkZGVuJyA6ICcnO1xuICBjb25zdCBwb2ludGVyRXZlbnRzID0gaGlkZGVuID8gJ25vbmUnIDogJyc7XG5cbiAgW3dhbGwsIGhlcm8sIGNocm9tZSwgc2Vjb25kYXJ5XS5mb3JFYWNoKChlbCkgPT4ge1xuICAgIGlmICghZWwpIHJldHVybjtcbiAgICBpZiAoaGlkZGVuKSB7XG4gICAgICBlbC5zdHlsZS5vcGFjaXR5ID0gb3BhY2l0eTtcbiAgICAgIGVsLnN0eWxlLnZpc2liaWxpdHkgPSB2aXNpYmlsaXR5O1xuICAgICAgZWwuc3R5bGUucG9pbnRlckV2ZW50cyA9IHBvaW50ZXJFdmVudHM7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVsLnN0eWxlLnJlbW92ZVByb3BlcnR5KCdvcGFjaXR5Jyk7XG4gICAgICBlbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eSgndmlzaWJpbGl0eScpO1xuICAgICAgZWwuc3R5bGUucmVtb3ZlUHJvcGVydHkoJ3BvaW50ZXItZXZlbnRzJyk7XG4gICAgfVxuICB9KTtcbn1cblxuZnVuY3Rpb24gcGluUm91dGVTdXJmYWNlc0ZvckNvbW1pdChzdXJmYWNlUmVmcykge1xuICBjb25zdCB7IHdhbGwsIGhlcm8sIGNocm9tZSwgc2Vjb25kYXJ5IH0gPSBnZXRDb250ZW50TGF5ZXJzKHN1cmZhY2VSZWZzKTtcblxuICBbd2FsbCwgaGVybywgY2hyb21lLCBzZWNvbmRhcnldLmZvckVhY2goKGVsKSA9PiB7XG4gICAgaWYgKCFlbCkgcmV0dXJuO1xuICAgIGVsLnN0eWxlLm9wYWNpdHkgPSAnMCc7XG4gICAgZWwuc3R5bGUucmVtb3ZlUHJvcGVydHkoJ3Zpc2liaWxpdHknKTtcbiAgICBlbC5zdHlsZS5wb2ludGVyRXZlbnRzID0gJ25vbmUnO1xuICAgIGVsLnN0eWxlLndpbGxDaGFuZ2UgPSAnb3BhY2l0eSwgdHJhbnNmb3JtLCBmaWx0ZXInO1xuICB9KTtcblxuICBjYW5jZWxBY3RpdmVBbmltYXRpb25zKCk7XG59XG5cbmZ1bmN0aW9uIGhvbGRQaW5uZWRSb3V0ZVN1cmZhY2VzVW50aWxSb3V0ZUluKHN1cmZhY2VSZWZzLCBzaG91bGRDb250aW51ZSkge1xuICBjb25zdCB0aWNrID0gKCkgPT4ge1xuICAgIGlmICghc2hvdWxkQ29udGludWUoKSkgcmV0dXJuO1xuICAgIHBpblJvdXRlU3VyZmFjZXNGb3JDb21taXQoc3VyZmFjZVJlZnMpO1xuICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGljayk7XG4gIH07XG5cbiAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSh0aWNrKTtcbn1cblxuZnVuY3Rpb24gYnVpbGRSb3V0ZVRyYW5zaXRpb25Hcm91cHMocm91dGVJZCwgc3VyZmFjZVJlZnMpIHtcbiAgY29uc3Qgc3VyZmFjZXMgPSBnZXRDb250ZW50TGF5ZXJzKHN1cmZhY2VSZWZzKTtcbiAgY29uc3QgYWRkR3JvdXAgPSAoZGVsYXlNcywgaXRlbXMpID0+ICh7XG4gICAgZGVsYXlNcyxcbiAgICBpdGVtczogaXRlbXMuZmlsdGVyKChpdGVtKSA9PiBpdGVtPy5lbCksXG4gIH0pO1xuXG4gIGlmIChyb3V0ZUlkID09PSAncG9ydGZvbGlvJykge1xuICAgIHJldHVybiBbXG4gICAgICBhZGRHcm91cCgwLCBbXG4gICAgICAgIHsgZWw6IHN1cmZhY2VzLmhlcm8sIHNsaWRlOiB0cnVlIH0sXG4gICAgICAgIHsgZWw6IHN1cmZhY2VzLmNocm9tZSwgc2xpZGU6IHRydWUgfSxcbiAgICAgIF0pLFxuICAgICAgYWRkR3JvdXAoR1JPVVBFRF9ST1VURV9PRkZTRVRfTVMsIFtcbiAgICAgICAgeyBlbDogc3VyZmFjZXMud2FsbCwgc2xpZGU6IGZhbHNlIH0sXG4gICAgICAgIHsgZWw6IHN1cmZhY2VzLnNlY29uZGFyeSwgc2xpZGU6IGZhbHNlIH0sXG4gICAgICBdKSxcbiAgICBdO1xuICB9XG5cbiAgaWYgKHJvdXRlSWQgPT09ICdob21lJykge1xuICAgIHJldHVybiBbXG4gICAgICBhZGRHcm91cCgwLCBbXG4gICAgICAgIHsgZWw6IHN1cmZhY2VzLmhlcm8sIHNsaWRlOiB0cnVlIH0sXG4gICAgICAgIHsgZWw6IHN1cmZhY2VzLmNocm9tZSwgc2xpZGU6IHRydWUgfSxcbiAgICAgICAgeyBlbDogc3VyZmFjZXMuc2Vjb25kYXJ5LCBzbGlkZTogdHJ1ZSB9LFxuICAgICAgXSksXG4gICAgICBhZGRHcm91cChHUk9VUEVEX1JPVVRFX09GRlNFVF9NUywgW1xuICAgICAgICB7IGVsOiBzdXJmYWNlcy53YWxsLCBzbGlkZTogZmFsc2UgfSxcbiAgICAgIF0pLFxuICAgIF07XG4gIH1cblxuICByZXR1cm4gW1xuICAgIGFkZEdyb3VwKDAsIFtcbiAgICAgIHsgZWw6IHN1cmZhY2VzLmNocm9tZSwgc2xpZGU6IHRydWUgfSxcbiAgICAgIHsgZWw6IHN1cmZhY2VzLnNlY29uZGFyeSwgc2xpZGU6IHRydWUgfSxcbiAgICBdKSxcbiAgICBhZGRHcm91cChHUk9VUEVEX1JPVVRFX09GRlNFVF9NUywgW1xuICAgICAgeyBlbDogc3VyZmFjZXMud2FsbCwgc2xpZGU6IGZhbHNlIH0sXG4gICAgICB7IGVsOiBzdXJmYWNlcy5oZXJvLCBzbGlkZTogdHJ1ZSB9LFxuICAgIF0pLFxuICBdO1xufVxuXG5mdW5jdGlvbiBnZXRHcm91cGVkVHJhbnNpdGlvbkl0ZW1zKHJvdXRlSWQsIHN1cmZhY2VSZWZzKSB7XG4gIGNvbnN0IGdyb3VwcyA9IGJ1aWxkUm91dGVUcmFuc2l0aW9uR3JvdXBzKHJvdXRlSWQsIHN1cmZhY2VSZWZzKTtcbiAgY29uc3Qgc2VlbiA9IG5ldyBTZXQoKTtcbiAgY29uc3QgaXRlbXMgPSBbXTtcbiAgZ3JvdXBzLmZvckVhY2goKGdyb3VwKSA9PiB7XG4gICAgZ3JvdXAuaXRlbXMuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgaWYgKCFpdGVtPy5lbCB8fCBzZWVuLmhhcyhpdGVtLmVsKSkgcmV0dXJuO1xuICAgICAgc2Vlbi5hZGQoaXRlbS5lbCk7XG4gICAgICBpdGVtcy5wdXNoKGl0ZW0pO1xuICAgIH0pO1xuICB9KTtcbiAgcmV0dXJuIGl0ZW1zO1xufVxuXG5mdW5jdGlvbiByZWFkUm91dGVFbnRlck1vdGlvbigpIHtcbiAgcmV0dXJuIHtcbiAgICB5OiBnZXRDb21wdXRlZFN0eWxlKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCkuZ2V0UHJvcGVydHlWYWx1ZSgnLS1yb3V0ZS1lbnRlci10eScpLnRyaW0oKSB8fCAnM3B4JyxcbiAgICBibHVyOiBnZXRDb21wdXRlZFN0eWxlKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCkuZ2V0UHJvcGVydHlWYWx1ZSgnLS1yb3V0ZS1lbnRlci1ibHVyJykudHJpbSgpIHx8ICcxLjVweCcsXG4gICAgc2NhbGU6IGdldENvbXB1dGVkU3R5bGUoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50KS5nZXRQcm9wZXJ0eVZhbHVlKCctLXJvdXRlLWVudGVyLXNjYWxlJykudHJpbSgpIHx8ICcwLjk5NCcsXG4gICAgZWFzaW5nOiByZWFkUm9vdEVhc2luZygnLS1yb3V0ZS1lbnRlci1lYXNlJywgJ2N1YmljLWJlemllcigwLjIyLCAwLCAwLjE2LCAxKScpLFxuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRSb3V0ZUVudGVyR3JvdXBDb25maWcoZ3JvdXBOYW1lKSB7XG4gIHJldHVybiBST1VURV9FTlRFUl9HUk9VUFNbZ3JvdXBOYW1lXSB8fCBST1VURV9FTlRFUl9HUk9VUFMuY29udGV4dDtcbn1cblxuZnVuY3Rpb24gcGFyc2VSb3V0ZUVudGVyT3JkZXIoZWwsIGZhbGxiYWNrKSB7XG4gIGNvbnN0IHJhdyA9IGVsPy5kYXRhc2V0Py5yb3V0ZUVudGVyT3JkZXIgPz8gZWw/LnN0eWxlPy5nZXRQcm9wZXJ0eVZhbHVlKCctLWknKSA/PyAnJztcbiAgY29uc3QgcGFyc2VkID0gTnVtYmVyLnBhcnNlSW50KFN0cmluZyhyYXcpLCAxMCk7XG4gIHJldHVybiBOdW1iZXIuaXNGaW5pdGUocGFyc2VkKSA/IHBhcnNlZCA6IGZhbGxiYWNrO1xufVxuXG5mdW5jdGlvbiBnZXRSb3V0ZUVudGVyVGFyZ2V0cyhzdXJmYWNlUmVmcykge1xuICBjb25zdCB7IHdhbGwsIGhlcm8sIGNocm9tZSwgc2Vjb25kYXJ5IH0gPSBnZXRDb250ZW50TGF5ZXJzKHN1cmZhY2VSZWZzKTtcbiAgY29uc3Qgc2NvcGVOb2RlcyA9IFt3YWxsLCBoZXJvLCBjaHJvbWUsIHNlY29uZGFyeV0uZmlsdGVyKEJvb2xlYW4pO1xuICBjb25zdCBzZWVuID0gbmV3IFNldCgpO1xuICBjb25zdCB0YXJnZXRzID0gW107XG4gIGNvbnN0IGdyb3VwQ291bnRzID0gbmV3IE1hcCgpO1xuXG4gIHNjb3BlTm9kZXMuZm9yRWFjaCgoc2NvcGUpID0+IHtcbiAgICBjb25zdCBjYW5kaWRhdGVzID0gW1xuICAgICAgLi4uKHNjb3BlLm1hdGNoZXM/LihST1VURV9FTlRFUl9TRUxFQ1RPUikgPyBbc2NvcGVdIDogW10pLFxuICAgICAgLi4uQXJyYXkuZnJvbShzY29wZS5xdWVyeVNlbGVjdG9yQWxsPy4oUk9VVEVfRU5URVJfU0VMRUNUT1IpIHx8IFtdKSxcbiAgICBdO1xuXG4gICAgY2FuZGlkYXRlcy5mb3JFYWNoKChlbCkgPT4ge1xuICAgICAgaWYgKCFlbCB8fCBzZWVuLmhhcyhlbCkpIHJldHVybjtcbiAgICAgIHNlZW4uYWRkKGVsKTtcbiAgICAgIGNvbnN0IGdyb3VwID0gZWwuZGF0YXNldC5yb3V0ZUVudGVyIHx8ICdjb250ZXh0JztcbiAgICAgIGNvbnN0IGZhbGxiYWNrT3JkZXIgPSBncm91cENvdW50cy5nZXQoZ3JvdXApIHx8IDA7XG4gICAgICBjb25zdCBvcmRlciA9IHBhcnNlUm91dGVFbnRlck9yZGVyKGVsLCBmYWxsYmFja09yZGVyKTtcbiAgICAgIGdyb3VwQ291bnRzLnNldChncm91cCwgTWF0aC5tYXgoZmFsbGJhY2tPcmRlciArIDEsIG9yZGVyICsgMSkpO1xuICAgICAgY29uc3QgY29uZmlnID0gZ2V0Um91dGVFbnRlckdyb3VwQ29uZmlnKGdyb3VwKTtcbiAgICAgIGNvbnN0IGZpbmFsT3BhY2l0eSA9IGdldENvbXB1dGVkU3R5bGUoZWwpLm9wYWNpdHkgfHwgJzEnO1xuICAgICAgdGFyZ2V0cy5wdXNoKHtcbiAgICAgICAgZWwsXG4gICAgICAgIGdyb3VwLFxuICAgICAgICBvcmRlcixcbiAgICAgICAgZGVsYXlNczogY29uZmlnLnN0YXJ0TXMgKyAoY29uZmlnLnN0ZXBNcyAqIG9yZGVyKSxcbiAgICAgICAgZHVyYXRpb25NczogY29uZmlnLmR1cmF0aW9uTXMsXG4gICAgICAgIGZpbmFsT3BhY2l0eSxcbiAgICAgICAgc2xpZGU6IGVsLmRhdGFzZXQucm91dGVFbnRlclNsaWRlID09PSAnZmFsc2UnID8gZmFsc2UgOiBjb25maWcuc2xpZGUsXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgcmV0dXJuIHRhcmdldHMuc29ydCgoYSwgYikgPT4gKFxuICAgIGEuZGVsYXlNcyAtIGIuZGVsYXlNc1xuICAgIHx8IGEuZ3JvdXAubG9jYWxlQ29tcGFyZShiLmdyb3VwKVxuICAgIHx8IGEub3JkZXIgLSBiLm9yZGVyXG4gICkpO1xufVxuXG5mdW5jdGlvbiBzZXRSb3V0ZUVudGVySW5pdGlhbFN0YXRlKHRhcmdldHMsIHJvdXRlRW50ZXJNb3Rpb24pIHtcbiAgdGFyZ2V0cy5mb3JFYWNoKCh7IGVsLCBzbGlkZSB9KSA9PiB7XG4gICAgZWwuc3R5bGUudHJhbnNpdGlvbiA9ICdub25lJztcbiAgICBlbC5zdHlsZS5vcGFjaXR5ID0gJzAnO1xuICAgIGVsLnN0eWxlLmZpbHRlciA9IGBibHVyKCR7cm91dGVFbnRlck1vdGlvbi5ibHVyfSlgO1xuICAgIGVsLnN0eWxlLnRyYW5zZm9ybSA9IHNsaWRlXG4gICAgICA/IGB0cmFuc2xhdGVZKCR7cm91dGVFbnRlck1vdGlvbi55fSkgc2NhbGUoJHtyb3V0ZUVudGVyTW90aW9uLnNjYWxlfSlgXG4gICAgICA6ICd0cmFuc2xhdGVZKDApIHNjYWxlKDEpJztcbiAgICBlbC5zdHlsZS5wb2ludGVyRXZlbnRzID0gJ25vbmUnO1xuICAgIGVsLnN0eWxlLndpbGxDaGFuZ2UgPSAnb3BhY2l0eSwgdHJhbnNmb3JtLCBmaWx0ZXInO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gcGxheVJvdXRlRW50ZXJUYXJnZXRzKHRhcmdldHMsIHJvdXRlRW50ZXJNb3Rpb24pIHtcbiAgdGFyZ2V0cy5mb3JFYWNoKCh7IGVsLCBkZWxheU1zLCBkdXJhdGlvbk1zLCBmaW5hbE9wYWNpdHkgfSkgPT4ge1xuICAgIGVsLnN0eWxlLnRyYW5zaXRpb24gPSBbXG4gICAgICBgb3BhY2l0eSAke2R1cmF0aW9uTXN9bXMgJHtyb3V0ZUVudGVyTW90aW9uLmVhc2luZ30gJHtkZWxheU1zfW1zYCxcbiAgICAgIGB0cmFuc2Zvcm0gJHtkdXJhdGlvbk1zfW1zICR7cm91dGVFbnRlck1vdGlvbi5lYXNpbmd9ICR7ZGVsYXlNc31tc2AsXG4gICAgICBgZmlsdGVyICR7ZHVyYXRpb25Nc31tcyAke3JvdXRlRW50ZXJNb3Rpb24uZWFzaW5nfSAke2RlbGF5TXN9bXNgLFxuICAgIF0uam9pbignLCAnKTtcbiAgICBlbC5zdHlsZS5vcGFjaXR5ID0gZmluYWxPcGFjaXR5IHx8ICcxJztcbiAgICBlbC5zdHlsZS5maWx0ZXIgPSAnYmx1cigwKSc7XG4gICAgZWwuc3R5bGUudHJhbnNmb3JtID0gJ3RyYW5zbGF0ZVkoMCkgc2NhbGUoMSknO1xuICAgIHNldFN0YWJsZVRpbWVvdXQoKCkgPT4ge1xuICAgICAgZWwuc3R5bGUub3BhY2l0eSA9ICcnO1xuICAgICAgZWwuc3R5bGUudHJhbnNmb3JtID0gJyc7XG4gICAgICBlbC5zdHlsZS5maWx0ZXIgPSAnJztcbiAgICAgIGVsLnN0eWxlLnRyYW5zaXRpb24gPSAnJztcbiAgICAgIGVsLnN0eWxlLnRyYW5zaXRpb25EZWxheSA9ICcnO1xuICAgICAgZWwuc3R5bGUucG9pbnRlckV2ZW50cyA9ICcnO1xuICAgICAgZWwuc3R5bGUud2lsbENoYW5nZSA9ICcnO1xuICAgIH0sIGRlbGF5TXMgKyBkdXJhdGlvbk1zICsgODApO1xuICB9KTtcbn1cblxuLyog4pSA4pSAIGJhY2tkcm9wIGNsZWFudXAgKHdpdGggZGlyZWN0LURPTSBmYWxsYmFjaykg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAICovXG5cbmZ1bmN0aW9uIGZvcmNlQmFja2Ryb3BEaXNtaXNzKHsgaW5zdGFudCA9IGZhbHNlIH0gPSB7fSkge1xuICB0cnkge1xuICAgIHNldFRyYW5zaXRpb25QaGFzZShUUkFOU0lUSU9OX1BIQVNFUy5JRExFKTtcbiAgICBjbGVhclRyYW5zaXRpb25SZXR1cm5pbmdTdGF0ZSgpO1xuICAgIGNvbnN0IGJsdXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbW9kYWwtYmx1ci1sYXllcicpO1xuICAgIGNvbnN0IGNvbnRlbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbW9kYWwtY29udGVudC1sYXllcicpO1xuICAgIGlmIChpbnN0YW50KSB7XG4gICAgICBbYmx1ciwgY29udGVudF0uZm9yRWFjaCgobGF5ZXIpID0+IHtcbiAgICAgICAgaWYgKGxheWVyKSBsYXllci5zdHlsZS50cmFuc2l0aW9uID0gJ25vbmUnO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGlmIChibHVyKSBibHVyLmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuICAgIGlmIChjb250ZW50KSBjb250ZW50LmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuICAgIGJsdXI/LnNldEF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nLCAndHJ1ZScpO1xuICAgIGNvbnRlbnQ/LnNldEF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nLCAndHJ1ZScpO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjdXN0b20tY3Vyc29yJyk/LmNsYXNzTGlzdC5yZW1vdmUoJ21vZGFsLWFjdGl2ZScpO1xuICAgIGlmIChpbnN0YW50ICYmIGJsdXIpIHtcbiAgICAgIHZvaWQgYmx1ci5vZmZzZXRXaWR0aDtcbiAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICAgIFtibHVyLCBjb250ZW50XS5mb3JFYWNoKChsYXllcikgPT4gbGF5ZXI/LnN0eWxlLnJlbW92ZVByb3BlcnR5KCd0cmFuc2l0aW9uJykpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGNvbnN0IHNjZW5lID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Ficy1zY2VuZScpO1xuICAgIGlmIChzY2VuZSkgc2NlbmUuY2xhc3NMaXN0LnJlbW92ZSgnZ2F0ZS1kZXB0aC1hY3RpdmUnKTtcbiAgfSBjYXRjaCB7XG4gICAgLyogbm8tb3AgKi9cbiAgfVxufVxuXG5mdW5jdGlvbiBkaXNtaXNzR2F0ZUJhY2tkcm9wKG9wdGlvbnMgPSB7fSkge1xuICBpZiAob3B0aW9ucy5pbnN0YW50KSB7XG4gICAgZm9yY2VCYWNrZHJvcERpc21pc3Mob3B0aW9ucyk7XG4gIH1cbiAgaW1wb3J0KFwiL3NyYy9sZWdhY3kvbW9kdWxlcy91aS9nYXRlLW1vZGFsLXNoYXJlZC5qc1wiKVxuICAgIC50aGVuKChtKSA9PiBtLmRpc21pc3NHYXRlQmFja2Ryb3Aob3B0aW9ucykpXG4gICAgLmNhdGNoKCgpID0+IGZvcmNlQmFja2Ryb3BEaXNtaXNzKG9wdGlvbnMpKTtcbn1cblxuLyog4pSA4pSAIGFuaW1hdGlvbiB0cmFja2luZyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAgKi9cblxuZnVuY3Rpb24gY2FuY2VsQWN0aXZlQW5pbWF0aW9ucygpIHtcbiAgYWN0aXZlQW5pbWF0aW9ucy5mb3JFYWNoKChhKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGEuY2FuY2VsKCk7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvKiBuby1vcCAqL1xuICAgIH1cbiAgfSk7XG4gIGFjdGl2ZUFuaW1hdGlvbnMgPSBbXTtcbn1cblxuZnVuY3Rpb24gY29tbWl0U3RhZ2dlclN0eWxlcyhyb3V0ZUlkLCBzdXJmYWNlUmVmcykge1xuICBnZXRHcm91cGVkVHJhbnNpdGlvbkl0ZW1zKHJvdXRlSWQsIHN1cmZhY2VSZWZzKS5mb3JFYWNoKCh7IGVsIH0pID0+IHtcbiAgICBlbC5zdHlsZS5vcGFjaXR5ID0gJzEnO1xuICAgIGVsLnN0eWxlLnRyYW5zZm9ybSA9ICcnO1xuICAgIGVsLnN0eWxlLmZpbHRlciA9ICcnO1xuICAgIGVsLnN0eWxlLndpbGxDaGFuZ2UgPSAnYXV0byc7XG4gIH0pO1xuICBnZXRSb3V0ZUVudGVyVGFyZ2V0cyhzdXJmYWNlUmVmcykuZm9yRWFjaCgoeyBlbCB9KSA9PiB7XG4gICAgZWwuc3R5bGUub3BhY2l0eSA9ICcnO1xuICAgIGVsLnN0eWxlLnRyYW5zZm9ybSA9ICcnO1xuICAgIGVsLnN0eWxlLmZpbHRlciA9ICcnO1xuICAgIGVsLnN0eWxlLnRyYW5zaXRpb24gPSAnJztcbiAgICBlbC5zdHlsZS50cmFuc2l0aW9uRGVsYXkgPSAnJztcbiAgICBlbC5zdHlsZS5wb2ludGVyRXZlbnRzID0gJyc7XG4gICAgZWwuc3R5bGUud2lsbENoYW5nZSA9ICcnO1xuICB9KTtcbn1cblxuLyog4pSA4pSAIHNpbmdsZSBjbGVhbnVwIHBhdGggKGlkZW1wb3RlbnQsIGFsd2F5cyBzYWZlIHRvIGNhbGwpIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgCAqL1xuXG5mdW5jdGlvbiBmaW5hbGl6ZVRyYW5zaXRpb24oXG4gIGlzR2F0ZSxcbiAgcm91dGVJZCxcbiAgc3VyZmFjZVJlZnMsXG4gIHtcbiAgICBzdXBwcmVzc1JldHVybkFuaW1hdGlvbiA9IGZhbHNlLFxuICAgIGdhdGVCYWNrZHJvcERpc21pc3NlZCA9IGZhbHNlLFxuICAgIHByZXNlcnZlVHJhbnNpdGlvblBoYXNlID0gZmFsc2UsXG4gIH0gPSB7fVxuKSB7XG4gIGNhbmNlbEFjdGl2ZUFuaW1hdGlvbnMoKTtcbiAgY29tbWl0U3RhZ2dlclN0eWxlcyhyb3V0ZUlkLCBzdXJmYWNlUmVmcyk7XG4gIHNldFJvdXRlTGF5ZXJWaXNpYmlsaXR5KHRydWUsIHN1cmZhY2VSZWZzKTtcbiAgaWYgKGlzR2F0ZSAmJiAhZ2F0ZUJhY2tkcm9wRGlzbWlzc2VkKSB7XG4gICAgZGlzbWlzc0dhdGVCYWNrZHJvcCh7IHN1cHByZXNzUmV0dXJuQW5pbWF0aW9uIH0pO1xuICB9XG4gIGNsZWFyTGVnYWN5Um91dGVUcmFuc2l0aW9uRmxhZ3MoKTtcbiAgaWYgKCFwcmVzZXJ2ZVRyYW5zaXRpb25QaGFzZSkge1xuICAgIHNldFRyYW5zaXRpb25QaGFzZShUUkFOU0lUSU9OX1BIQVNFUy5JRExFKTtcbiAgfVxuICBzZXRJbnN0cnVtZW50V2FrZVN0YXRlKG51bGwpO1xuXG4gIC8vIFJlc3RvcmUgY29udGVudCBsYXllcnMuXG4gIGNvbnN0IHsgd2FsbCwgaGVybywgdWksIGNocm9tZSwgc2Vjb25kYXJ5IH0gPSBnZXRDb250ZW50TGF5ZXJzKHN1cmZhY2VSZWZzKTtcbiAgaWYgKHdhbGwpIHsgd2FsbC5zdHlsZS5vcGFjaXR5ID0gJzEnOyB3YWxsLnN0eWxlLndpbGxDaGFuZ2UgPSAnYXV0byc7IH1cbiAgaWYgKGhlcm8pIHsgaGVyby5zdHlsZS5vcGFjaXR5ID0gJzEnOyBoZXJvLnN0eWxlLndpbGxDaGFuZ2UgPSAnYXV0byc7IH1cbiAgaWYgKHVpKSB7IHVpLnN0eWxlLm9wYWNpdHkgPSAnMSc7IHVpLnN0eWxlLndpbGxDaGFuZ2UgPSAnYXV0byc7IH1cbiAgaWYgKGNocm9tZSkgeyBjaHJvbWUuc3R5bGUub3BhY2l0eSA9ICcxJzsgY2hyb21lLnN0eWxlLndpbGxDaGFuZ2UgPSAnYXV0byc7IH1cbiAgaWYgKHNlY29uZGFyeSkgeyBzZWNvbmRhcnkuc3R5bGUub3BhY2l0eSA9ICcxJzsgc2Vjb25kYXJ5LnN0eWxlLndpbGxDaGFuZ2UgPSAnYXV0byc7IH1cbiAgW3dhbGwsIGhlcm8sIHVpLCBjaHJvbWUsIHNlY29uZGFyeV0uZm9yRWFjaCgoZWwpID0+IHtcbiAgICBpZiAoIWVsKSByZXR1cm47XG4gICAgZWwuc3R5bGUucmVtb3ZlUHJvcGVydHkoJ3Zpc2liaWxpdHknKTtcbiAgICBlbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eSgncG9pbnRlci1ldmVudHMnKTtcbiAgICBlbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eSgndHJhbnNmb3JtJyk7XG4gICAgZWwuc3R5bGUucmVtb3ZlUHJvcGVydHkoJ2ZpbHRlcicpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gaW50ZXJydXB0VHJhbnNpdGlvbkZvclBvcHN0YXRlKGlzR2F0ZSwgcm91dGVJZCwgc3VyZmFjZVJlZnMpIHtcbiAgY2FuY2VsQWN0aXZlQW5pbWF0aW9ucygpO1xuICBjb21taXRTdGFnZ2VyU3R5bGVzKHJvdXRlSWQsIHN1cmZhY2VSZWZzKTtcbiAgaWYgKGlzR2F0ZSkge1xuICAgIGRpc21pc3NHYXRlQmFja2Ryb3AoeyBzdXBwcmVzc1JldHVybkFuaW1hdGlvbjogdHJ1ZSB9KTtcbiAgfVxuICBjbGVhckxlZ2FjeVJvdXRlVHJhbnNpdGlvbkZsYWdzKCk7XG4gIHNldFJvdXRlTGF5ZXJWaXNpYmlsaXR5KGZhbHNlLCBzdXJmYWNlUmVmcyk7XG4gIHNldFRyYW5zaXRpb25QaGFzZShUUkFOU0lUSU9OX1BIQVNFUy5JRExFKTtcblxuICBjb25zdCB7IHdhbGwsIGhlcm8sIHVpIH0gPSBnZXRDb250ZW50TGF5ZXJzKHN1cmZhY2VSZWZzKTtcbiAgaWYgKHdhbGwpIHdhbGwuc3R5bGUud2lsbENoYW5nZSA9ICdhdXRvJztcbiAgaWYgKGhlcm8pIGhlcm8uc3R5bGUud2lsbENoYW5nZSA9ICdhdXRvJztcbiAgaWYgKHVpKSB1aS5zdHlsZS53aWxsQ2hhbmdlID0gJ2F1dG8nO1xuICBzZXRJbnN0cnVtZW50V2FrZVN0YXRlKG51bGwpO1xufVxuXG4vKiDilIDilIAgZmFkZSBvdXQgY29udGVudCBsYXllcnMgKHdhbGwgc3RheXMgdmlzaWJsZSkg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAICovXG5cbmZ1bmN0aW9uIGZhZGVPdXRDb250ZW50KGR1cmF0aW9uTXMsIGVhc2luZyA9IEVBU0VfT1VULCBzdXJmYWNlUmVmcywgb3B0aW9ucyA9IHt9KSB7XG4gIGNvbnN0IHsgd2FsbCwgaGVybywgY2hyb21lLCBzZWNvbmRhcnkgfSA9IGdldENvbnRlbnRMYXllcnMoc3VyZmFjZVJlZnMpO1xuICBjb25zdCBmaW5hbE9wYWNpdHkgPSBOdW1iZXIuaXNGaW5pdGUob3B0aW9ucz8uZmluYWxPcGFjaXR5KSA/IG9wdGlvbnMuZmluYWxPcGFjaXR5IDogMDtcbiAgY29uc3QgYW5pbXMgPSBbXTtcbiAgY29uc3Qgc2VlbiA9IG5ldyBTZXQoKTtcblxuICBzZXRJbnN0cnVtZW50V2FrZVN0YXRlKCdvdXQnKTtcblxuICBbd2FsbCwgaGVybywgY2hyb21lLCBzZWNvbmRhcnldLmZvckVhY2goKGVsKSA9PiB7XG4gICAgaWYgKCFlbCkgcmV0dXJuO1xuICAgIGlmIChzZWVuLmhhcyhlbCkpIHJldHVybjtcbiAgICBzZWVuLmFkZChlbCk7XG4gICAgaWYgKHR5cGVvZiBlbC5hbmltYXRlICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICBlbC5zdHlsZS5vcGFjaXR5ID0gU3RyaW5nKGZpbmFsT3BhY2l0eSk7XG4gICAgICBlbC5zdHlsZS5maWx0ZXIgPSAnYmx1cih2YXIoLS1pbnN0cnVtZW50LXdha2UtYmx1cikpJztcbiAgICAgIGVsLnN0eWxlLnRyYW5zZm9ybSA9ICdzY2FsZSh2YXIoLS1pbnN0cnVtZW50LXdha2UtcmVjZWRlLXNjYWxlKSknO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBhbmltID0gZWwuYW5pbWF0ZShcbiAgICAgIFtcbiAgICAgICAgeyBvcGFjaXR5OiAxLCBmaWx0ZXI6ICdibHVyKDApJywgdHJhbnNmb3JtOiAnc2NhbGUoMSknIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBvcGFjaXR5OiBmaW5hbE9wYWNpdHksXG4gICAgICAgICAgZmlsdGVyOiAnYmx1cih2YXIoLS1pbnN0cnVtZW50LXdha2UtYmx1cikpJyxcbiAgICAgICAgICB0cmFuc2Zvcm06ICdzY2FsZSh2YXIoLS1pbnN0cnVtZW50LXdha2UtcmVjZWRlLXNjYWxlKSknLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIHsgZHVyYXRpb246IGR1cmF0aW9uTXMsIGVhc2luZywgZmlsbDogJ2ZvcndhcmRzJyB9XG4gICAgKTtcbiAgICBhY3RpdmVBbmltYXRpb25zLnB1c2goYW5pbSk7XG4gICAgYW5pbXMucHVzaChhbmltKTtcbiAgfSk7XG5cbiAgaWYgKGFuaW1zLmxlbmd0aCA9PT0gMCkgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuXG4gIHJldHVybiBQcm9taXNlLmFsbChcbiAgICBhbmltcy5tYXAoKGEpID0+IG5ldyBQcm9taXNlKChyKSA9PiB7XG4gICAgICBsZXQgc2V0dGxlZCA9IGZhbHNlO1xuICAgICAgY29uc3QgZmluaXNoID0gKCkgPT4ge1xuICAgICAgICBpZiAoc2V0dGxlZCkgcmV0dXJuO1xuICAgICAgICBzZXR0bGVkID0gdHJ1ZTtcbiAgICAgICAgcigpO1xuICAgICAgfTtcbiAgICAgIGEub25maW5pc2ggPSBmaW5pc2g7XG4gICAgICBhLm9uY2FuY2VsID0gZmluaXNoO1xuICAgICAgc2V0U3RhYmxlVGltZW91dChmaW5pc2gsIGR1cmF0aW9uTXMgKyA4MCk7XG4gICAgfSkpXG4gICk7XG59XG5cbmZ1bmN0aW9uIHJlbW92ZVBvcnRmb2xpb0dhdGVTY2VuZUJyaWRnZSgpIHtcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignW2RhdGEtcG9ydGZvbGlvLWdhdGUtc2NlbmUtYnJpZGdlXScpPy5yZW1vdmUoKTtcbn1cblxuZnVuY3Rpb24gZGlzbWlzc1BvcnRmb2xpb0dhdGVTY2VuZUJyaWRnZSh7XG4gIGR1cmF0aW9uTXMgPSBFTEVNRU5UX1JFVkVBTF9NUyxcbiAgZGVsYXlNcyA9IDAsXG4gIGVhc2luZyA9IEVBU0VfT1VULFxuICBpbnN0YW50ID0gZmFsc2UsXG59ID0ge30pIHtcbiAgY29uc3QgYnJpZGdlID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignW2RhdGEtcG9ydGZvbGlvLWdhdGUtc2NlbmUtYnJpZGdlXScpO1xuICBpZiAoIWJyaWRnZSkgcmV0dXJuO1xuICBpZiAoaW5zdGFudCB8fCB0eXBlb2YgYnJpZGdlLmFuaW1hdGUgIT09ICdmdW5jdGlvbicpIHtcbiAgICBicmlkZ2UucmVtb3ZlKCk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3QgcmVzb2x2ZWRPcGFjaXR5ID0gTnVtYmVyLnBhcnNlRmxvYXQoZ2V0Q29tcHV0ZWRTdHlsZShicmlkZ2UpLm9wYWNpdHkpO1xuICBjb25zdCBzdGFydE9wYWNpdHkgPSBOdW1iZXIuaXNGaW5pdGUocmVzb2x2ZWRPcGFjaXR5KSA/IHJlc29sdmVkT3BhY2l0eSA6IDAuNTtcbiAgY29uc3QgdG90YWxNcyA9IE1hdGgubWF4KDEsIGRlbGF5TXMgKyBkdXJhdGlvbk1zKTtcbiAgY29uc3QgaG9sZE9mZnNldCA9IE1hdGgubWluKDEsIE1hdGgubWF4KDAsIGRlbGF5TXMgLyB0b3RhbE1zKSk7XG4gIGNvbnN0IGtleWZyYW1lcyA9IGhvbGRPZmZzZXQgPiAwXG4gICAgPyBbeyBvcGFjaXR5OiBzdGFydE9wYWNpdHksIG9mZnNldDogMCB9LCB7IG9wYWNpdHk6IHN0YXJ0T3BhY2l0eSwgb2Zmc2V0OiBob2xkT2Zmc2V0IH0sIHsgb3BhY2l0eTogMCwgb2Zmc2V0OiAxIH1dXG4gICAgOiBbeyBvcGFjaXR5OiBzdGFydE9wYWNpdHkgfSwgeyBvcGFjaXR5OiAwIH1dO1xuICBjb25zdCBhbmltYXRpb24gPSBicmlkZ2UuYW5pbWF0ZShrZXlmcmFtZXMsIHsgZHVyYXRpb246IHRvdGFsTXMsIGVhc2luZywgZmlsbDogJ2ZvcndhcmRzJyB9KTtcbiAgYWN0aXZlQW5pbWF0aW9ucy5wdXNoKGFuaW1hdGlvbik7XG4gIGxldCBzZXR0bGVkID0gZmFsc2U7XG4gIGNvbnN0IHJlbW92ZSA9ICgpID0+IHtcbiAgICBpZiAoc2V0dGxlZCkgcmV0dXJuO1xuICAgIHNldHRsZWQgPSB0cnVlO1xuICAgIGJyaWRnZS5yZW1vdmUoKTtcbiAgfTtcbiAgYW5pbWF0aW9uLm9uZmluaXNoID0gcmVtb3ZlO1xuICBhbmltYXRpb24ub25jYW5jZWwgPSByZW1vdmU7XG4gIHNldFN0YWJsZVRpbWVvdXQocmVtb3ZlLCB0b3RhbE1zICsgODApO1xufVxuXG5mdW5jdGlvbiByZWxlYXNlUG9ydGZvbGlvRGVjayhyZWFzb24gPSAncm91dGUtaW4nKSB7XG4gIGNvbnN0IHJvb3QgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gIHJvb3QuZGF0YXNldC5hYnNQb3J0Zm9saW9SZXZlYWwgPSByZWFzb247XG4gIGNvbnN0IGdlbmVyYXRpb24gPSBnZXRBY3RpdmVMZWdhY3lSdW50aW1lU25hcHNob3QoKS5nZW5lcmF0aW9uO1xuICB3aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2Ficzpwb3J0Zm9saW86cmV2ZWFsJywge1xuICAgIGRldGFpbDogeyBnZW5lcmF0aW9uLCByZWFzb24gfSxcbiAgfSkpO1xufVxuXG5mdW5jdGlvbiBjbGVhclBvcnRmb2xpb0RlY2tSZWxlYXNlKCkge1xuICBkZWxldGUgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmRhdGFzZXQuYWJzUG9ydGZvbGlvUmV2ZWFsO1xufVxuXG5mdW5jdGlvbiBzZXRTaW11bGF0aW9uRm9jdXNUcmFuc2l0aW9uU3RhdGUoc3RhdGUpIHtcbiAgY29uc3Qgcm9vdCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgaWYgKHN0YXRlKSB7XG4gICAgcm9vdC5kYXRhc2V0LmFic1NpbXVsYXRpb25Gb2N1c1RyYW5zaXRpb24gPSBzdGF0ZTtcbiAgICB3aW5kb3cuX19BQlNfU0lNVUxBVElPTl9GT0NVU19UUkFOU0lUSU9OX18gPSB7XG4gICAgICBwaGFzZTogc3RhdGUsXG4gICAgICBzdGFydGVkQXQ6IHBlcmZvcm1hbmNlLm5vdygpLFxuICAgIH07XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgZGVsZXRlIHJvb3QuZGF0YXNldC5hYnNTaW11bGF0aW9uRm9jdXNUcmFuc2l0aW9uO1xuICB3aW5kb3cuX19BQlNfU0lNVUxBVElPTl9GT0NVU19UUkFOU0lUSU9OX18gPSB7XG4gICAgcGhhc2U6ICdpZGxlJyxcbiAgICBzdGFydGVkQXQ6IHBlcmZvcm1hbmNlLm5vdygpLFxuICB9O1xufVxuXG5mdW5jdGlvbiBzZXRTaW11bGF0aW9uU2hlbGxTdGFiaWxpdHkoYWN0aXZlLCBzdXJmYWNlUmVmcywgb3B0aW9ucyA9IHt9KSB7XG4gIGNvbnN0IHJvb3QgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gIGNvbnN0IHsgaGVybywgdWksIGNocm9tZSwgc2Vjb25kYXJ5LCBmb290ZXIgfSA9IGdldENvbnRlbnRMYXllcnMoc3VyZmFjZVJlZnMpO1xuICBjb25zdCB0aXRsZVN1cmZhY2UgPSBvcHRpb25zLnRpdGxlU3VyZmFjZSB8fCAnJztcbiAgY29uc3Qgc3RhYmxlU3VyZmFjZXMgPSBbaGVybywgdWksIGNocm9tZSwgc2Vjb25kYXJ5LCBmb290ZXJdO1xuXG4gIGlmICghYWN0aXZlKSB7XG4gICAgZGVsZXRlIHJvb3QuZGF0YXNldC5hYnNTaW11bGF0aW9uU2hlbGxTdGFibGU7XG4gICAgZGVsZXRlIHJvb3QuZGF0YXNldC5hYnNTaW11bGF0aW9uVGl0bGVTdXJmYWNlO1xuICAgIHN0YWJsZVN1cmZhY2VzLmZvckVhY2goKGVsKSA9PiB7XG4gICAgICBpZiAoIWVsKSByZXR1cm47XG4gICAgICBlbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eSgnb3BhY2l0eScpO1xuICAgICAgZWwuc3R5bGUucmVtb3ZlUHJvcGVydHkoJ3Zpc2liaWxpdHknKTtcbiAgICAgIGVsLnN0eWxlLnJlbW92ZVByb3BlcnR5KCdwb2ludGVyLWV2ZW50cycpO1xuICAgICAgZWwuc3R5bGUucmVtb3ZlUHJvcGVydHkoJ2ZpbHRlcicpO1xuICAgICAgZWwuc3R5bGUud2lsbENoYW5nZSA9ICdhdXRvJztcbiAgICB9KTtcbiAgICByZXR1cm47XG4gIH1cblxuICByb290LmRhdGFzZXQuYWJzU2ltdWxhdGlvblNoZWxsU3RhYmxlID0gJ3RydWUnO1xuICBpZiAodGl0bGVTdXJmYWNlKSB7XG4gICAgcm9vdC5kYXRhc2V0LmFic1NpbXVsYXRpb25UaXRsZVN1cmZhY2UgPSB0aXRsZVN1cmZhY2U7XG4gIH0gZWxzZSB7XG4gICAgZGVsZXRlIHJvb3QuZGF0YXNldC5hYnNTaW11bGF0aW9uVGl0bGVTdXJmYWNlO1xuICB9XG5cbiAgc3RhYmxlU3VyZmFjZXMuZm9yRWFjaCgoZWwpID0+IHtcbiAgICBpZiAoIWVsKSByZXR1cm47XG4gICAgZWwuc3R5bGUub3BhY2l0eSA9ICcxJztcbiAgICBlbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eSgndmlzaWJpbGl0eScpO1xuICAgIGVsLnN0eWxlLnJlbW92ZVByb3BlcnR5KCdwb2ludGVyLWV2ZW50cycpO1xuICAgIGVsLnN0eWxlLnJlbW92ZVByb3BlcnR5KCdmaWx0ZXInKTtcbiAgICBlbC5zdHlsZS53aWxsQ2hhbmdlID0gJ2F1dG8nO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gZ2V0U2ltdWxhdGlvblRpdGxlU3VyZmFjZUZvclJvdXRlQ2hhbmdlKGN1cnJlbnRSb3V0ZUlkLCBuZXh0Um91dGVJZCkge1xuICBpZiAoY3VycmVudFJvdXRlSWQgIT09ICdob21lJyAmJiBuZXh0Um91dGVJZCA9PT0gJ2hvbWUnKSByZXR1cm4gJ2RvbS1oYW5kb2ZmJztcbiAgcmV0dXJuICcnO1xufVxuXG5mdW5jdGlvbiBnZXRTaW11bGF0aW9uRm9jdXNMYXllcihzdXJmYWNlUmVmcykge1xuICByZXR1cm4gZ2V0Q29udGVudExheWVycyhzdXJmYWNlUmVmcykud2FsbDtcbn1cblxuZnVuY3Rpb24gY2xlYW51cFNpbXVsYXRpb25Gb2N1c0xheWVyKHN1cmZhY2VSZWZzKSB7XG4gIGNvbnN0IGxheWVyID0gZ2V0U2ltdWxhdGlvbkZvY3VzTGF5ZXIoc3VyZmFjZVJlZnMpO1xuICBpZiAoIWxheWVyKSByZXR1cm47XG4gIGxheWVyLnN0eWxlLnJlbW92ZVByb3BlcnR5KCd0cmFuc2Zvcm0nKTtcbiAgbGF5ZXIuc3R5bGUucmVtb3ZlUHJvcGVydHkoJ3RyYW5zZm9ybS1vcmlnaW4nKTtcbiAgbGF5ZXIuc3R5bGUucmVtb3ZlUHJvcGVydHkoJ3dpbGwtY2hhbmdlJyk7XG4gIGxheWVyLnN0eWxlLnJlbW92ZVByb3BlcnR5KCdvcGFjaXR5Jyk7XG4gIGxheWVyLnN0eWxlLnJlbW92ZVByb3BlcnR5KCdmaWx0ZXInKTtcbiAgbGF5ZXIuc3R5bGUucmVtb3ZlUHJvcGVydHkoJ3BvaW50ZXItZXZlbnRzJyk7XG59XG5cbmZ1bmN0aW9uIHJlbW92ZVNpbXVsYXRpb25UcmFuc2FjdGlvblNuYXBzaG90cygpIHtcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnNpbXVsYXRpb24tdHJhbnNhY3Rpb24tc25hcHNob3QnKS5mb3JFYWNoKChub2RlKSA9PiBub2RlLnJlbW92ZSgpKTtcbn1cblxuZnVuY3Rpb24gcmVzZXRTaW11bGF0aW9uRm9jdXNUcmFuc2l0aW9uKHN1cmZhY2VSZWZzLCB7IGRpc2NhcmRTbmFwc2hvdHMgPSBmYWxzZSB9ID0ge30pIHtcbiAgY2xlYW51cFNpbXVsYXRpb25Gb2N1c0xheWVyKHN1cmZhY2VSZWZzKTtcbiAgaWYgKGRpc2NhcmRTbmFwc2hvdHMpIHtcbiAgICByZW1vdmVTaW11bGF0aW9uVHJhbnNhY3Rpb25TbmFwc2hvdHMoKTtcbiAgfVxuICBzZXRTaW11bGF0aW9uU2hlbGxTdGFiaWxpdHkoZmFsc2UsIHN1cmZhY2VSZWZzKTtcbiAgc2V0U2ltdWxhdGlvbkZvY3VzVHJhbnNpdGlvblN0YXRlKG51bGwpO1xufVxuXG5mdW5jdGlvbiBjYXB0dXJlU2ltdWxhdGlvblRyYW5zYWN0aW9uU25hcHNob3QoKSB7XG4gIGNvbnN0IGhvc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2ltdWxhdGlvbnMnKTtcbiAgY29uc3QgaG9zdFJlY3QgPSBob3N0Py5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgaWYgKCFob3N0IHx8ICFob3N0UmVjdCB8fCBob3N0UmVjdC53aWR0aCA8IDEgfHwgaG9zdFJlY3QuaGVpZ2h0IDwgMSkgcmV0dXJuIG51bGw7XG5cbiAgcmVtb3ZlU2ltdWxhdGlvblRyYW5zYWN0aW9uU25hcHNob3RzKCk7XG4gIGNvbnN0IHBpeGVsUmF0aW8gPSBNYXRoLm1pbigyLCBNYXRoLm1heCgxLCB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyB8fCAxKSk7XG4gIGNvbnN0IHNuYXBzaG90ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gIHNuYXBzaG90LmNsYXNzTmFtZSA9ICdzaW11bGF0aW9uLXRyYW5zYWN0aW9uLXNuYXBzaG90JztcbiAgc25hcHNob3QuZGF0YXNldC5zdGF0ZSA9ICdjYXB0dXJlZCc7XG4gIHNuYXBzaG90LndpZHRoID0gTWF0aC5tYXgoMSwgTWF0aC5yb3VuZChob3N0UmVjdC53aWR0aCAqIHBpeGVsUmF0aW8pKTtcbiAgc25hcHNob3QuaGVpZ2h0ID0gTWF0aC5tYXgoMSwgTWF0aC5yb3VuZChob3N0UmVjdC5oZWlnaHQgKiBwaXhlbFJhdGlvKSk7XG4gIHNuYXBzaG90LnN0eWxlLmxlZnQgPSBgJHtob3N0UmVjdC5sZWZ0fXB4YDtcbiAgc25hcHNob3Quc3R5bGUudG9wID0gYCR7aG9zdFJlY3QudG9wfXB4YDtcbiAgc25hcHNob3Quc3R5bGUud2lkdGggPSBgJHtob3N0UmVjdC53aWR0aH1weGA7XG4gIHNuYXBzaG90LnN0eWxlLmhlaWdodCA9IGAke2hvc3RSZWN0LmhlaWdodH1weGA7XG5cbiAgY29uc3QgY29udGV4dCA9IHNuYXBzaG90LmdldENvbnRleHQoJzJkJyk7XG4gIGNvbnN0IHNvdXJjZUNhbnZhc2VzID0gQXJyYXkuZnJvbShob3N0LnF1ZXJ5U2VsZWN0b3JBbGwoJ2NhbnZhcycpKVxuICAgIC5maWx0ZXIoKGNhbnZhcykgPT4gY2FudmFzICE9PSBzbmFwc2hvdCAmJiBjYW52YXMud2lkdGggPiAwICYmIGNhbnZhcy5oZWlnaHQgPiAwKVxuICAgIC5zb3J0KChsZWZ0LCByaWdodCkgPT4ge1xuICAgICAgY29uc3QgbGVmdFogPSBOdW1iZXIucGFyc2VGbG9hdChnZXRDb21wdXRlZFN0eWxlKGxlZnQpLnpJbmRleCkgfHwgMDtcbiAgICAgIGNvbnN0IHJpZ2h0WiA9IE51bWJlci5wYXJzZUZsb2F0KGdldENvbXB1dGVkU3R5bGUocmlnaHQpLnpJbmRleCkgfHwgMDtcbiAgICAgIHJldHVybiBsZWZ0WiAtIHJpZ2h0WjtcbiAgICB9KTtcbiAgbGV0IGNhcHR1cmVkTGF5ZXJzID0gMDtcbiAgc291cmNlQ2FudmFzZXMuZm9yRWFjaCgoY2FudmFzKSA9PiB7XG4gICAgY29uc3Qgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlKGNhbnZhcyk7XG4gICAgY29uc3QgcmVjdCA9IGNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBpZiAoc3R5bGUuZGlzcGxheSA9PT0gJ25vbmUnIHx8IHN0eWxlLnZpc2liaWxpdHkgPT09ICdoaWRkZW4nIHx8IE51bWJlcihzdHlsZS5vcGFjaXR5KSA9PT0gMCkgcmV0dXJuO1xuICAgIGlmIChyZWN0LndpZHRoIDwgMSB8fCByZWN0LmhlaWdodCA8IDEpIHJldHVybjtcbiAgICB0cnkge1xuICAgICAgY29udGV4dC5nbG9iYWxBbHBoYSA9IE51bWJlci5wYXJzZUZsb2F0KHN0eWxlLm9wYWNpdHkpIHx8IDE7XG4gICAgICBjb250ZXh0LmRyYXdJbWFnZShcbiAgICAgICAgY2FudmFzLFxuICAgICAgICAocmVjdC5sZWZ0IC0gaG9zdFJlY3QubGVmdCkgKiBwaXhlbFJhdGlvLFxuICAgICAgICAocmVjdC50b3AgLSBob3N0UmVjdC50b3ApICogcGl4ZWxSYXRpbyxcbiAgICAgICAgcmVjdC53aWR0aCAqIHBpeGVsUmF0aW8sXG4gICAgICAgIHJlY3QuaGVpZ2h0ICogcGl4ZWxSYXRpbyxcbiAgICAgICk7XG4gICAgICBjYXB0dXJlZExheWVycyArPSAxO1xuICAgIH0gY2F0Y2gge1xuICAgICAgLy8gQSBmYWlsZWQgbGF5ZXIgY2FwdHVyZSBtdXN0IG5ldmVyIGJsb2NrIHRoZSByb3V0ZSBzd2l0Y2guXG4gICAgfVxuICB9KTtcbiAgY29udGV4dC5nbG9iYWxBbHBoYSA9IDE7XG4gIGlmIChjYXB0dXJlZExheWVycyA9PT0gMCkgcmV0dXJuIG51bGw7XG5cbiAgc25hcHNob3QuZGF0YXNldC5jYXB0dXJlZExheWVycyA9IFN0cmluZyhjYXB0dXJlZExheWVycyk7XG4gIGRvY3VtZW50LmJvZHkuYXBwZW5kKHNuYXBzaG90KTtcbiAgbGV0IHJlbGVhc2VkID0gZmFsc2U7XG4gIHJldHVybiB7XG4gICAgbm9kZTogc25hcHNob3QsXG4gICAgc2hvdygpIHtcbiAgICAgIGlmIChyZWxlYXNlZCB8fCAhc25hcHNob3QuaXNDb25uZWN0ZWQpIHJldHVybjtcbiAgICAgIHNuYXBzaG90LmRhdGFzZXQuc3RhdGUgPSAndmlzaWJsZSc7XG4gICAgfSxcbiAgICByZWxlYXNlKHsgaW1tZWRpYXRlID0gZmFsc2UgfSA9IHt9KSB7XG4gICAgICBpZiAocmVsZWFzZWQpIHJldHVybjtcbiAgICAgIHJlbGVhc2VkID0gdHJ1ZTtcbiAgICAgIGlmIChpbW1lZGlhdGUgfHwgIXNuYXBzaG90LmlzQ29ubmVjdGVkKSB7XG4gICAgICAgIHNuYXBzaG90LnJlbW92ZSgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBzbmFwc2hvdC5kYXRhc2V0LnN0YXRlID0gJ3JlbGVhc2luZyc7XG4gICAgICBzZXRTdGFibGVUaW1lb3V0KCgpID0+IHNuYXBzaG90LnJlbW92ZSgpLCAyMDApO1xuICAgIH0sXG4gIH07XG59XG5cbmZ1bmN0aW9uIGFuaW1hdGVTaW11bGF0aW9uRm9jdXNMYXllcihzdXJmYWNlUmVmcywge1xuICBkaXJlY3Rpb24sXG4gIGR1cmF0aW9uTXMsXG4gIGxvY2FsRHVyYXRpb25NcyxcbiAgZWFzaW5nLFxufSkge1xuICBjb25zdCBsYXllciA9IGdldFNpbXVsYXRpb25Gb2N1c0xheWVyKHN1cmZhY2VSZWZzKTtcbiAgaWYgKGxheWVyKSB7XG4gICAgbGF5ZXIuc3R5bGUub3BhY2l0eSA9ICcxJztcbiAgICBsYXllci5zdHlsZS5maWx0ZXIgPSAnbm9uZSc7XG4gICAgbGF5ZXIuc3R5bGUudHJhbnNmb3JtID0gJ25vbmUnO1xuICAgIGxheWVyLnN0eWxlLnRyYW5zZm9ybU9yaWdpbiA9ICc1MCUgNTAlJztcbiAgICBsYXllci5zdHlsZS53aWxsQ2hhbmdlID0gJ2F1dG8nO1xuICAgIGxheWVyLnN0eWxlLnBvaW50ZXJFdmVudHMgPSBkaXJlY3Rpb24gPT09ICdvdXQnID8gJ25vbmUnIDogJyc7XG4gIH1cblxuICByZXR1cm4gcnVuU2ltdWxhdGlvblZpc3VhbFRyYW5zaXRpb24oZGlyZWN0aW9uLCB7XG4gICAgZHVyYXRpb25NcyxcbiAgICBsb2NhbER1cmF0aW9uTXMsXG4gICAgZWFzaW5nLFxuICAgIHJlYXNvbjogJ3NoZWxsLXJvdXRlLXRyYW5zaXRpb24nLFxuICB9KTtcbn1cblxuZnVuY3Rpb24gZ2V0U2ltdWxhdGlvbkZvY3VzVGltaW5ncyhvcHRpb25zLCByZWR1Y2VNb3Rpb24pIHtcbiAgaWYgKHJlZHVjZU1vdGlvbikge1xuICAgIHJldHVybiB7XG4gICAgICBleGl0OiAwLFxuICAgICAgZW50ZXI6IDAsXG4gICAgICBob2xkOiAwLFxuICAgICAgZXhpdExvY2FsOiAwLFxuICAgICAgZW50ZXJMb2NhbDogMCxcbiAgICAgIGV4aXRFYXNpbmc6IFNJTVVMQVRJT05fRk9DVVNfRUFTRV9PVVQsXG4gICAgICBlbnRlckVhc2luZzogU0lNVUxBVElPTl9GT0NVU19FQVNFX0lOLFxuICAgIH07XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGV4aXQ6IHBhcnNlVHJhbnNpdGlvbk1zKG9wdGlvbnMuZXhpdE1zLCBTSU1VTEFUSU9OX0ZPQ1VTX0VYSVRfTVMpLFxuICAgIGVudGVyOiBwYXJzZVRyYW5zaXRpb25NcyhvcHRpb25zLmVudGVyTXMsIFNJTVVMQVRJT05fRk9DVVNfRU5URVJfTVMpLFxuICAgIGhvbGQ6IHBhcnNlVHJhbnNpdGlvbk1zKG9wdGlvbnMuaG9sZE1zLCBTSU1VTEFUSU9OX0ZPQ1VTX1pFUk9fSE9MRF9NUyksXG4gICAgZXhpdExvY2FsOiBwYXJzZVRyYW5zaXRpb25NcyhvcHRpb25zLmV4aXRMb2NhbE1zLCBTSU1VTEFUSU9OX0ZPQ1VTX0VYSVRfTE9DQUxfTVMpLFxuICAgIGVudGVyTG9jYWw6IHBhcnNlVHJhbnNpdGlvbk1zKG9wdGlvbnMuZW50ZXJMb2NhbE1zLCBTSU1VTEFUSU9OX0ZPQ1VTX0VOVEVSX0xPQ0FMX01TKSxcbiAgICBleGl0RWFzaW5nOiBvcHRpb25zLmV4aXRFYXNpbmcgfHwgU0lNVUxBVElPTl9GT0NVU19FQVNFX09VVCxcbiAgICBlbnRlckVhc2luZzogb3B0aW9ucy5lbnRlckVhc2luZyB8fCBTSU1VTEFUSU9OX0ZPQ1VTX0VBU0VfSU4sXG4gIH07XG59XG5cbmZ1bmN0aW9uIHdhaXRGb3JTaW11bGF0aW9uRm9jdXNIb2xkKGR1cmF0aW9uTXMpIHtcbiAgaWYgKCFkdXJhdGlvbk1zKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gc2V0U3RhYmxlVGltZW91dChyZXNvbHZlLCBkdXJhdGlvbk1zKSk7XG59XG5cbmZ1bmN0aW9uIHdhaXRGb3JSb3V0ZVBhaW50RnJhbWVzKGNvdW50ID0gMikge1xuICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgfHwgdHlwZW9mIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgIT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gIH1cblxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBsZXQgcmVtYWluaW5nID0gTWF0aC5tYXgoMSwgY291bnQpO1xuICAgIGNvbnN0IHRpY2sgPSAoKSA9PiB7XG4gICAgICByZW1haW5pbmcgLT0gMTtcbiAgICAgIGlmIChyZW1haW5pbmcgPD0gMCkge1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGljayk7XG4gICAgfTtcbiAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRpY2spO1xuICB9KTtcbn1cblxuLyog4pSA4pSAIHJvdXRlIHJlYWR5IOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgCAqL1xuXG5mdW5jdGlvbiBoYXNDYW52YXNCdWZmZXJSZWFkeSgpIHtcbiAgY29uc3QgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2MnKTtcbiAgaWYgKCFjYW52YXMpIHJldHVybiBmYWxzZTtcbiAgY29uc3QgY3NzVyA9IGNhbnZhcy5jbGllbnRXaWR0aCB8fCAwO1xuICBjb25zdCBjc3NIID0gY2FudmFzLmNsaWVudEhlaWdodCB8fCAwO1xuICBpZiAoY3NzVyA8IDY0IHx8IGNzc0ggPCA2NCkgcmV0dXJuIGZhbHNlO1xuICBjb25zdCBkcHIgPSBNYXRoLm1pbih3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyB8fCAxLCAyKTtcbiAgY29uc3QgbWluVyA9IE1hdGguY2VpbCgoY3NzVyArIDIpICogZHByKSAtIDI7XG4gIGNvbnN0IG1pbkggPSBNYXRoLmNlaWwoKGNzc0ggKyAyKSAqIGRwcikgLSAyO1xuICByZXR1cm4gY2FudmFzLndpZHRoID49IG1pblcgJiYgY2FudmFzLmhlaWdodCA+PSBtaW5IO1xufVxuXG5mdW5jdGlvbiBpc1JlY3RVc2FibGUocmVjdCkge1xuICByZXR1cm4gQm9vbGVhbihyZWN0ICYmIHJlY3Qud2lkdGggPiAwICYmIHJlY3QuaGVpZ2h0ID4gMCk7XG59XG5cbmZ1bmN0aW9uIHJlY3RIYXNVc2FibGVWaXNpYmxlQXJlYShpbm5lclJlY3QsIG91dGVyUmVjdCkge1xuICBpZiAoIWlzUmVjdFVzYWJsZShpbm5lclJlY3QpIHx8ICFpc1JlY3RVc2FibGUob3V0ZXJSZWN0KSkgcmV0dXJuIGZhbHNlO1xuICBjb25zdCB2aXNpYmxlV2lkdGggPSBNYXRoLm1heCgwLCBNYXRoLm1pbihpbm5lclJlY3QucmlnaHQsIG91dGVyUmVjdC5yaWdodCkgLSBNYXRoLm1heChpbm5lclJlY3QubGVmdCwgb3V0ZXJSZWN0LmxlZnQpKTtcbiAgY29uc3QgdmlzaWJsZUhlaWdodCA9IE1hdGgubWF4KDAsIE1hdGgubWluKGlubmVyUmVjdC5ib3R0b20sIG91dGVyUmVjdC5ib3R0b20pIC0gTWF0aC5tYXgoaW5uZXJSZWN0LnRvcCwgb3V0ZXJSZWN0LnRvcCkpO1xuICByZXR1cm4gKFxuICAgIHZpc2libGVXaWR0aCA+PSBNYXRoLm1pbigyNDAsIG91dGVyUmVjdC53aWR0aCAqIDAuNSlcbiAgICAmJiB2aXNpYmxlSGVpZ2h0ID49IE1hdGgubWluKDk2LCBpbm5lclJlY3QuaGVpZ2h0ICogMC41KVxuICApO1xufVxuXG5mdW5jdGlvbiByZWN0c01hdGNoV2l0aGluVGhyZXNob2xkKHByZXZpb3VzLCBuZXh0LCB0aHJlc2hvbGRQeCA9IDIpIHtcbiAgaWYgKCFpc1JlY3RVc2FibGUocHJldmlvdXMpIHx8ICFpc1JlY3RVc2FibGUobmV4dCkpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIChcbiAgICBNYXRoLmFicyhwcmV2aW91cy50b3AgLSBuZXh0LnRvcCkgPD0gdGhyZXNob2xkUHhcbiAgICAmJiBNYXRoLmFicyhwcmV2aW91cy5sZWZ0IC0gbmV4dC5sZWZ0KSA8PSB0aHJlc2hvbGRQeFxuICAgICYmIE1hdGguYWJzKHByZXZpb3VzLndpZHRoIC0gbmV4dC53aWR0aCkgPD0gdGhyZXNob2xkUHhcbiAgICAmJiBNYXRoLmFicyhwcmV2aW91cy5oZWlnaHQgLSBuZXh0LmhlaWdodCkgPD0gdGhyZXNob2xkUHhcbiAgKTtcbn1cblxuZnVuY3Rpb24gaXNFbGVtZW50VmlzaWJseVJldmVhbGVkKGVsZW1lbnQpIHtcbiAgaWYgKCFlbGVtZW50KSByZXR1cm4gZmFsc2U7XG4gIGNvbnN0IHN0eWxlcyA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGVsZW1lbnQpO1xuICByZXR1cm4gKFxuICAgIHN0eWxlcy5kaXNwbGF5ICE9PSAnbm9uZSdcbiAgICAmJiBzdHlsZXMudmlzaWJpbGl0eSAhPT0gJ2hpZGRlbidcbiAgICAmJiBOdW1iZXIoc3R5bGVzLm9wYWNpdHkpID4gMC45XG4gICk7XG59XG5cbmZ1bmN0aW9uIGlzRWxlbWVudFN1cmZhY2VSZWFkeShlbGVtZW50KSB7XG4gIGlmICghaXNFbGVtZW50VmlzaWJseVJldmVhbGVkKGVsZW1lbnQpKSByZXR1cm4gZmFsc2U7XG4gIGNvbnN0IHJlY3QgPSBlbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICByZXR1cm4gcmVjdC53aWR0aCA+PSA2NCAmJiByZWN0LmhlaWdodCA+PSA2NDtcbn1cblxuZnVuY3Rpb24gaXNDYW52YXNTdXJmYWNlUmVhZHkoc2VsZWN0b3IpIHtcbiAgY29uc3QgY2FudmFzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gIGlmICghaXNFbGVtZW50U3VyZmFjZVJlYWR5KGNhbnZhcykpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIGNhbnZhcy53aWR0aCA+PSA2NCAmJiBjYW52YXMuaGVpZ2h0ID49IDY0O1xufVxuXG5mdW5jdGlvbiBpc1BvcnRmb2xpb1Njcm9sbFJhaWxSZWFkeSgpIHtcbiAgY29uc3Qgd2FsbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzaW11bGF0aW9ucycpO1xuICBjb25zdCBtb3VudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwb3J0Zm9saW9Qcm9qZWN0TW91bnQnKTtcbiAgY29uc3QgZmlyc3RDYXJkID0gbW91bnQ/LnF1ZXJ5U2VsZWN0b3IoJy5wb3J0Zm9saW8tZGVjay1jYXJkLmlzLWFjdGl2ZSwgLnBvcnRmb2xpby1wcm9qZWN0LWxhYmVsJyk7XG4gIGlmICghd2FsbCB8fCAhbW91bnQgfHwgIWZpcnN0Q2FyZCkgcmV0dXJuIGZhbHNlO1xuICBjb25zdCB3YWxsUmVjdCA9IHdhbGwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gIGNvbnN0IGNhcmRSZWN0ID0gZmlyc3RDYXJkLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICBjb25zdCBkZWNrUHJlcGFyZWQgPSBtb3VudC5jbGFzc0xpc3QuY29udGFpbnMoJ2lzLXBvcnRmb2xpby1ib290LXByZXBhcmluZycpO1xuICBjb25zdCBoYXNVc2FibGVHZW9tZXRyeSA9IChcbiAgICBpc1JlY3RVc2FibGUod2FsbFJlY3QpXG4gICAgJiYgaXNSZWN0VXNhYmxlKGNhcmRSZWN0KVxuICAgICYmIGNhcmRSZWN0LndpZHRoID49IE1hdGgubWluKDI0MCwgd2FsbFJlY3Qud2lkdGggKiAwLjUpXG4gICAgJiYgY2FyZFJlY3QuaGVpZ2h0ID49IDk2XG4gICAgJiYgcmVjdEhhc1VzYWJsZVZpc2libGVBcmVhKGNhcmRSZWN0LCB3YWxsUmVjdClcbiAgKTtcbiAgcmV0dXJuIChcbiAgICBoYXNVc2FibGVHZW9tZXRyeVxuICAgICYmIChcbiAgICAgIGRlY2tQcmVwYXJlZFxuICAgICAgfHwgKGlzRWxlbWVudFZpc2libHlSZXZlYWxlZChtb3VudCkgJiYgaXNFbGVtZW50VmlzaWJseVJldmVhbGVkKGZpcnN0Q2FyZCkpXG4gICAgKVxuICApO1xufVxuXG5mdW5jdGlvbiBpc0RhaWx5TGFiUm91dGVSZWFkeShyb3V0ZUlkKSB7XG4gIGNvbnN0IGlzTG9jYWxBdWRpdEhvc3QgPSB3aW5kb3cubG9jYXRpb24uaG9zdG5hbWUgPT09ICdsb2NhbGhvc3QnIHx8IHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZSA9PT0gJzEyNy4wLjAuMSc7XG4gIGlmIChpc0xvY2FsQXVkaXRIb3N0ICYmIHdpbmRvdy5fX0FCU19BVURJVF9GT1JDRV9EQUlMWV9OT1RfUkVBRFlfXyA9PT0gcm91dGVJZCkgcmV0dXJuIGZhbHNlO1xuICBzd2l0Y2ggKHJvdXRlSWQpIHtcbiAgICBjYXNlICdyZXBlbC1yb29tJzpcbiAgICAgIHJldHVybiBpc0NhbnZhc1N1cmZhY2VSZWFkeSgnI3JlcGVsLXJvb20tY2FudmFzJylcbiAgICAgICAgJiYgaXNTaW11bGF0aW9uVmlzdWFsVHJhbnNpdGlvblNvdXJjZUFjdGl2ZShyb3V0ZUlkKTtcbiAgICBjYXNlICdmbG9jay1vZi1iaXJkcyc6XG4gICAgICByZXR1cm4gaXNDYW52YXNTdXJmYWNlUmVhZHkoJyNmbG9jay1vZi1iaXJkcy1jYW52YXMnKVxuICAgICAgICAmJiBpc1NpbXVsYXRpb25WaXN1YWxUcmFuc2l0aW9uU291cmNlQWN0aXZlKHJvdXRlSWQpO1xuICAgIGNhc2UgJ21pbmVyYWwtZ3Jvd3RoJzpcbiAgICAgIHJldHVybiBpc0NhbnZhc1N1cmZhY2VSZWFkeSgnI21pbmVyYWwtZ3Jvd3RoLWNhbnZhcycpXG4gICAgICAgICYmIGlzU2ltdWxhdGlvblZpc3VhbFRyYW5zaXRpb25Tb3VyY2VBY3RpdmUocm91dGVJZCk7XG4gICAgY2FzZSAncmlmdC1yaW5ncyc6XG4gICAgICByZXR1cm4gaXNDYW52YXNTdXJmYWNlUmVhZHkoJyNyaWZ0LXJpbmdzLWNhbnZhcycpXG4gICAgICAgICYmIGlzU2ltdWxhdGlvblZpc3VhbFRyYW5zaXRpb25Tb3VyY2VBY3RpdmUocm91dGVJZCk7XG4gICAgY2FzZSAnYmVhY2gtYmFsbC1yb29tJzoge1xuICAgICAgY29uc3QgY29udGFpbmVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmJlYWNoLWJhbGwtcm9vbS1zaW11bGF0aW9uJyk7XG4gICAgICBjb25zdCBsb2FkU3RhdGUgPSBjb250YWluZXI/LmRhdGFzZXQ/LmJlYWNoQmFsbFJvb21Mb2FkU3RhdGU7XG4gICAgICByZXR1cm4gQm9vbGVhbihcbiAgICAgICAgbG9hZFN0YXRlID09PSAncmVhZHknXG4gICAgICAgICAgJiYgaXNDYW52YXNTdXJmYWNlUmVhZHkoJy5iZWFjaC1iYWxsLXJvb20tY2FudmFzJylcbiAgICAgICAgICAmJiBpc1NpbXVsYXRpb25WaXN1YWxUcmFuc2l0aW9uU291cmNlQWN0aXZlKHJvdXRlSWQpXG4gICAgICApO1xuICAgIH1cbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzRGFpbHlMYWJSb3V0ZUlkKHJvdXRlSWQpIHtcbiAgcmV0dXJuIERBSUxZX0xBQl9ST1VURV9JRFMuaGFzKHJvdXRlSWQpO1xufVxuXG5mdW5jdGlvbiByZWFkUm91dGVSZWFkeVNuYXBzaG90KHJvdXRlSWQpIHtcbiAgaWYgKHJvdXRlSWQgPT09ICdwb3J0Zm9saW8nKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHdhbGxSZWN0OiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2ltdWxhdGlvbnMnKT8uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkgfHwgbnVsbCxcbiAgICAgIGhlcm9SZWN0OiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaGVyby10aXRsZScpPy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSB8fCBudWxsLFxuICAgICAgY2FyZFJlY3Q6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5wb3J0Zm9saW8tZGVjay1jYXJkLmlzLWFjdGl2ZSwgLnBvcnRmb2xpby1wcm9qZWN0LWxhYmVsJyk/LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpIHx8IG51bGwsXG4gICAgICB0b3BiYXJSZWN0OiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcudWktdG9wLW1haW4ucm91dGUtdG9wYmFyJyk/LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpIHx8IG51bGwsXG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1JvdXRlUmVhZHlTbmFwc2hvdFN0YWJsZShyb3V0ZUlkLCBwcmV2aW91cywgbmV4dCwgb3B0aW9ucyA9IHt9KSB7XG4gIGlmIChyb3V0ZUlkICE9PSAncG9ydGZvbGlvJykgcmV0dXJuIHRydWU7XG4gIGlmIChvcHRpb25zLmxvY2tlZEdhdGVJZCA9PT0gJ3BvcnRmb2xpbycpIHJldHVybiB0cnVlO1xuICBpZiAoIXByZXZpb3VzIHx8ICFuZXh0KSByZXR1cm4gZmFsc2U7XG4gIGNvbnN0IGRlY2tGYWlsZWQgPSBkb2N1bWVudC5ib2R5Py5jbGFzc0xpc3QuY29udGFpbnMoJ3BvcnRmb2xpby1kZWNrLWZhaWxlZCcpO1xuICByZXR1cm4gKFxuICAgIHJlY3RzTWF0Y2hXaXRoaW5UaHJlc2hvbGQocHJldmlvdXMud2FsbFJlY3QsIG5leHQud2FsbFJlY3QsIDIpXG4gICAgJiYgKCFwcmV2aW91cy5oZXJvUmVjdCB8fCAhbmV4dC5oZXJvUmVjdCB8fCByZWN0c01hdGNoV2l0aGluVGhyZXNob2xkKHByZXZpb3VzLmhlcm9SZWN0LCBuZXh0Lmhlcm9SZWN0LCAyKSlcbiAgICAmJiAoZGVja0ZhaWxlZCB8fCByZWN0c01hdGNoV2l0aGluVGhyZXNob2xkKHByZXZpb3VzLmNhcmRSZWN0LCBuZXh0LmNhcmRSZWN0LCAyKSlcbiAgICAmJiByZWN0c01hdGNoV2l0aGluVGhyZXNob2xkKHByZXZpb3VzLnRvcGJhclJlY3QsIG5leHQudG9wYmFyUmVjdCwgMilcbiAgKTtcbn1cblxuZnVuY3Rpb24gaXNSb3V0ZUJhc2VsaW5lUmVhZHkocm91dGVJZCwgb3B0aW9ucyA9IHt9KSB7XG4gIGNvbnN0IGJvZHkgPSBkb2N1bWVudC5ib2R5O1xuICBpZiAoIWJvZHkpIHJldHVybiBmYWxzZTtcblxuICBpZiAocm91dGVJZCA9PT0gJ2hvbWUnKSB7XG4gICAgY29uc3QgaXNIb21lUm91dGUgPSAhYm9keS5jbGFzc0xpc3QuY29udGFpbnMoJ3BvcnRmb2xpby1wYWdlJykgJiYgIWJvZHkuY2xhc3NMaXN0LmNvbnRhaW5zKCdjdi1wYWdlJyk7XG4gICAgY29uc3Qgcm9vdCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgICBjb25zdCBoZXJvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2hlcm8tdGl0bGUnKTtcbiAgICBjb25zdCByb3V0ZVRhYnMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdbZGF0YS1yb3V0ZS10YWJdJyk7XG4gICAgY29uc3QgYm9vdE92ZXJsYXkgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYWJzLWJvb3Qtb3ZlcmxheScpO1xuICAgIGNvbnN0IGJvb3RTdGF0ZSA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5kYXRhc2V0LmFic0Jvb3RTdGF0ZSB8fCAnJztcbiAgICBjb25zdCBydW50aW1lID0gZ2V0QWN0aXZlTGVnYWN5UnVudGltZVNuYXBzaG90KCk7XG4gICAgY29uc3Qgc2VtYW50aWNUaXRsZVJlYWR5ID0gQm9vbGVhbihcbiAgICAgIGhlcm8/LnF1ZXJ5U2VsZWN0b3IoJy5oZXJvLXRpdGxlX19uYW1lJyk/LnRleHRDb250ZW50Py50cmltKClcbiAgICAgICYmIGhlcm8/LnF1ZXJ5U2VsZWN0b3IoJy5oZXJvLXRpdGxlX19yb2xlJyk/LnRleHRDb250ZW50Py50cmltKClcbiAgICApO1xuICAgIHJldHVybiBCb29sZWFuKFxuICAgICAgaXNIb21lUm91dGVcbiAgICAgICYmIGhlcm9cbiAgICAgICYmIHJvdXRlVGFicy5sZW5ndGggPj0gNFxuICAgICAgJiYgaGFzQ2FudmFzQnVmZmVyUmVhZHkoKVxuICAgICAgJiYgIWJvb3RPdmVybGF5XG4gICAgICAmJiBib290U3RhdGUgIT09ICdib290aW5nJ1xuICAgICAgJiYgcnVudGltZS5yb3V0ZUlkID09PSAnaG9tZSdcbiAgICAgICYmIHJ1bnRpbWUuc3RhdHVzID09PSAncmVhZHknXG4gICAgICAmJiByb290LmRhdGFzZXQuYWJzSG9tZVJvdXRlUmVhZHkgPT09ICd0cnVlJ1xuICAgICAgJiYgKHJvb3QuZGF0YXNldC5hYnNIb21lQ2FudmFzVGl0bGVSZWFkeSA9PT0gJ3RydWUnIHx8IHNlbWFudGljVGl0bGVSZWFkeSlcbiAgICApO1xuICB9XG5cbiAgaWYgKHJvdXRlSWQgPT09ICdwb3J0Zm9saW8nKSB7XG4gICAgY29uc3QgZGVja0ZhaWxlZCA9IGJvZHkuY2xhc3NMaXN0LmNvbnRhaW5zKCdwb3J0Zm9saW8tZGVjay1mYWlsZWQnKTtcbiAgICBjb25zdCBsb2NrZWRHYXRlID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignW2RhdGEtcm91dGUtY29udGVudD1cInBvcnRmb2xpby1nYXRlXCJdJyk7XG4gICAgaWYgKG9wdGlvbnMubG9ja2VkR2F0ZUlkID09PSAncG9ydGZvbGlvJykge1xuICAgICAgcmV0dXJuIEJvb2xlYW4oYm9keS5jbGFzc0xpc3QuY29udGFpbnMoJ3BvcnRmb2xpby1wYWdlJykgJiYgbG9ja2VkR2F0ZSk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLmxvY2tlZEdhdGVJZCA9PT0gbnVsbCAmJiBsb2NrZWRHYXRlKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiBCb29sZWFuKFxuICAgICAgYm9keS5jbGFzc0xpc3QuY29udGFpbnMoJ3BvcnRmb2xpby1wYWdlJylcbiAgICAgICYmIChcbiAgICAgICAgbG9ja2VkR2F0ZVxuICAgICAgICB8fCAoXG4gICAgICAgICAgaGFzQ2FudmFzQnVmZmVyUmVhZHkoKVxuICAgICAgICAgICYmIChcbiAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncG9ydGZvbGlvUHJvamVjdE1vdW50JylcbiAgICAgICAgICAmJiAoZGVja0ZhaWxlZCB8fCBpc1BvcnRmb2xpb1Njcm9sbFJhaWxSZWFkeSgpKVxuICAgICAgICAgIClcbiAgICAgICAgKVxuICAgICAgKVxuICAgICk7XG4gIH1cblxuICBpZiAocm91dGVJZCA9PT0gJ2Fib3V0Jykge1xuICAgIHJldHVybiBCb29sZWFuKFxuICAgICAgYm9keS5jbGFzc0xpc3QuY29udGFpbnMoJ2Fib3V0LXBhZ2UnKVxuICAgICAgJiYgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignW2RhdGEtcm91dGUtY29udGVudD1cImFib3V0XCJdJylcbiAgICApO1xuICB9XG5cbiAgaWYgKHJvdXRlSWQgPT09ICdjb250YWN0Jykge1xuICAgIHJldHVybiBCb29sZWFuKFxuICAgICAgYm9keS5jbGFzc0xpc3QuY29udGFpbnMoJ2NvbnRhY3QtcGFnZScpXG4gICAgICAmJiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1yb3V0ZS1jb250ZW50PVwiY29udGFjdFwiXScpXG4gICAgKTtcbiAgfVxuXG4gIGlmIChpc0RhaWx5TGFiUm91dGVJZChyb3V0ZUlkKSkge1xuICAgIHJldHVybiBpc0RhaWx5TGFiUm91dGVSZWFkeShyb3V0ZUlkKTtcbiAgfVxuXG4gIHJldHVybiBCb29sZWFuKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhcHAtZnJhbWUnKSk7XG59XG5cbmZ1bmN0aW9uIHdhaXRGb3JSb3V0ZVJlYWR5KHJvdXRlSWQsIHRpbWVvdXRNcywgb3B0aW9ucyA9IHt9KSB7XG4gIGxldCBzZXR0bGUgPSAoKSA9PiB7fTtcbiAgY29uc3QgcHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgbGV0IHNldHRsZWQgPSBmYWxzZTtcbiAgICBsZXQgcG9sbElkID0gMDtcbiAgICBsZXQgdGltZW91dElkID0gMDtcbiAgICBsZXQgcHJldmlvdXNTbmFwc2hvdCA9IG51bGw7XG4gICAgbGV0IHN0YWJsZVJlYWR5RnJhbWVzID0gMDtcbiAgICBjb25zdCBQT0xMX01TID0gMTY7XG4gICAgY29uc3QgUkVRVUlSRURfU1RBQkxFX0ZSQU1FUyA9IHJvdXRlSWQgPT09ICdwb3J0Zm9saW8nID8gMiA6IDA7XG4gICAgY29uc3QgbWF5YmVTZXR0bGVSZWFkeSA9ICgpID0+IHtcbiAgICAgIGlmICghaXNSb3V0ZUJhc2VsaW5lUmVhZHkocm91dGVJZCwgb3B0aW9ucykpIHtcbiAgICAgICAgc3RhYmxlUmVhZHlGcmFtZXMgPSAwO1xuICAgICAgICBwcmV2aW91c1NuYXBzaG90ID0gbnVsbDtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKFJFUVVJUkVEX1NUQUJMRV9GUkFNRVMgPT09IDApIHtcbiAgICAgICAgc2V0dGxlKCdyZWFkeScpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgc25hcHNob3QgPSByZWFkUm91dGVSZWFkeVNuYXBzaG90KHJvdXRlSWQpO1xuICAgICAgaWYgKHNuYXBzaG90ICYmIHByZXZpb3VzU25hcHNob3QgJiYgaXNSb3V0ZVJlYWR5U25hcHNob3RTdGFibGUocm91dGVJZCwgcHJldmlvdXNTbmFwc2hvdCwgc25hcHNob3QsIG9wdGlvbnMpKSB7XG4gICAgICAgIHN0YWJsZVJlYWR5RnJhbWVzICs9IDE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdGFibGVSZWFkeUZyYW1lcyA9IDA7XG4gICAgICB9XG4gICAgICBwcmV2aW91c1NuYXBzaG90ID0gc25hcHNob3Q7XG5cbiAgICAgIGlmIChzdGFibGVSZWFkeUZyYW1lcyA+PSBSRVFVSVJFRF9TVEFCTEVfRlJBTUVTKSB7XG4gICAgICAgIHNldHRsZSgncmVhZHknKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcblxuICAgIHNldHRsZSA9IChzdGF0dXMgPSAnY2FuY2VsbGVkJykgPT4ge1xuICAgICAgaWYgKHNldHRsZWQpIHJldHVybjtcbiAgICAgIHNldHRsZWQgPSB0cnVlO1xuICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Ficzpyb3V0ZS1yZWFkeScsIG9uUmVhZHkpO1xuICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2FiczpkYWlseS1mb2N1cy1mYWlsZWQnLCBvbkZhaWxlZCk7XG4gICAgICBpZiAocG9sbElkKSBjbGVhclN0YWJsZVRpbWVvdXQocG9sbElkKTtcbiAgICAgIGlmICh0aW1lb3V0SWQpIGNsZWFyU3RhYmxlVGltZW91dCh0aW1lb3V0SWQpO1xuICAgICAgcmVzb2x2ZShzdGF0dXMpO1xuICAgIH07XG4gICAgY29uc3Qgb25SZWFkeSA9IChlKSA9PiB7XG4gICAgICBpZiAoKGU/LmRldGFpbD8ucm91dGVJZCB8fCAnJykgIT09IHJvdXRlSWQpIHJldHVybjtcbiAgICAgIGNvbnN0IGV2ZW50R2VuZXJhdGlvbiA9IE51bWJlcihlPy5kZXRhaWw/LmdlbmVyYXRpb24gfHwgMCk7XG4gICAgICBjb25zdCBjdXJyZW50R2VuZXJhdGlvbiA9IGdldEFjdGl2ZUxlZ2FjeVJ1bnRpbWVTbmFwc2hvdCgpLmdlbmVyYXRpb247XG4gICAgICBpZiAoZXZlbnRHZW5lcmF0aW9uICYmIGV2ZW50R2VuZXJhdGlvbiAhPT0gY3VycmVudEdlbmVyYXRpb24pIHJldHVybjtcbiAgICAgIG1heWJlU2V0dGxlUmVhZHkoKTtcbiAgICB9O1xuICAgIGNvbnN0IG9uRmFpbGVkID0gKGV2ZW50KSA9PiB7XG4gICAgICBpZiAoKGV2ZW50Py5kZXRhaWw/LnJvdXRlSWQgfHwgJycpICE9PSByb3V0ZUlkKSByZXR1cm47XG4gICAgICBzZXR0bGUoJ2ZhaWxlZCcpO1xuICAgIH07XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2Ficzpyb3V0ZS1yZWFkeScsIG9uUmVhZHkpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdhYnM6ZGFpbHktZm9jdXMtZmFpbGVkJywgb25GYWlsZWQpO1xuICAgIHRpbWVvdXRJZCA9IHNldFN0YWJsZVRpbWVvdXQoKCkgPT4gc2V0dGxlKCd0aW1lb3V0JyksIHRpbWVvdXRNcyk7XG5cbiAgICBpZiAobWF5YmVTZXR0bGVSZWFkeSgpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgdGljayA9ICgpID0+IHtcbiAgICAgIGlmIChzZXR0bGVkKSByZXR1cm47XG4gICAgICBpZiAobWF5YmVTZXR0bGVSZWFkeSgpKSByZXR1cm47XG4gICAgICBwb2xsSWQgPSBzZXRTdGFibGVUaW1lb3V0KHRpY2ssIFBPTExfTVMpO1xuICAgIH07XG4gICAgcG9sbElkID0gc2V0U3RhYmxlVGltZW91dCh0aWNrLCBQT0xMX01TKTtcbiAgfSk7XG4gIHJldHVybiB7XG4gICAgcHJvbWlzZSxcbiAgICBjYW5jZWw6IHNldHRsZSxcbiAgfTtcbn1cblxuLyog4pSA4pSAIHN0YWdnZXJlZCBlbnRyYW5jZSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAgKi9cblxuZnVuY3Rpb24gc3RhZ2dlcmVkRW50cmFuY2Uoe1xuICByb3V0ZUlkLFxuICBzdXJmYWNlUmVmcyxcbiAgZW50ZXJNcyA9IEVMRU1FTlRfUkVWRUFMX01TLFxuICByZXZlYWxFYXNpbmcgPSBFQVNFX09VVCxcbiAgb25QcmVwYXJlZCxcbn0gPSB7fSkge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBjb25zdCBncm91cHMgPSBidWlsZFJvdXRlVHJhbnNpdGlvbkdyb3Vwcyhyb3V0ZUlkLCBzdXJmYWNlUmVmcyk7XG4gICAgY29uc3QgdGFyZ2V0cyA9IGdldEdyb3VwZWRUcmFuc2l0aW9uSXRlbXMocm91dGVJZCwgc3VyZmFjZVJlZnMpO1xuICAgIGNvbnN0IHJvdXRlRW50ZXJUYXJnZXRzID0gZ2V0Um91dGVFbnRlclRhcmdldHMoc3VyZmFjZVJlZnMpO1xuICAgIGNvbnN0IHsgd2FsbCwgaGVybywgdWkgfSA9IGdldENvbnRlbnRMYXllcnMoc3VyZmFjZVJlZnMpO1xuICAgIGNvbnN0IGlzUm91dGVUcmFuc2l0aW9uID0gaXNSb3V0ZVRyYW5zaXRpb25QaGFzZShnZXRUcmFuc2l0aW9uUGhhc2UoKSk7XG4gICAgY29uc3Qgcm91dGVFbnRlck1vdGlvbiA9IHJlYWRSb3V0ZUVudGVyTW90aW9uKCk7XG5cbiAgICAvLyBTYWZldHk6IGlmIERPTSBpcyB1bmV4cGVjdGVkbHkgZW1wdHksIGp1c3QgcmVzdG9yZSBsYXllcnMuXG4gICAgaWYgKHRhcmdldHMubGVuZ3RoID09PSAwKSB7XG4gICAgICBjYW5jZWxBY3RpdmVBbmltYXRpb25zKCk7XG4gICAgICBpZiAod2FsbCkgd2FsbC5zdHlsZS5vcGFjaXR5ID0gJzEnO1xuICAgICAgaWYgKGhlcm8pIGhlcm8uc3R5bGUub3BhY2l0eSA9ICcxJztcbiAgICAgIGlmICh1aSkgdWkuc3R5bGUub3BhY2l0eSA9ICcxJztcbiAgICAgIGlmICh0eXBlb2Ygb25QcmVwYXJlZCA9PT0gJ2Z1bmN0aW9uJykgb25QcmVwYXJlZCgpO1xuICAgICAgcmVzb2x2ZSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHNldEluc3RydW1lbnRXYWtlU3RhdGUoJ2luJyk7XG5cbiAgICAvLyBIaWRlIGV2ZXJ5IG93bmVkIHRyYW5zaXRpb24gdGFyZ2V0IGJlZm9yZSBtYWtpbmcgaXQgdmlzaWJsZS5cbiAgICB0YXJnZXRzLmZvckVhY2goKHsgZWwgfSkgPT4ge1xuICAgICAgZWwuc3R5bGUub3BhY2l0eSA9ICcwJztcbiAgICAgIGVsLnN0eWxlLndpbGxDaGFuZ2UgPSAnb3BhY2l0eSwgdHJhbnNmb3JtJztcbiAgICB9KTtcbiAgICBzZXRSb3V0ZUVudGVySW5pdGlhbFN0YXRlKHJvdXRlRW50ZXJUYXJnZXRzLCByb3V0ZUVudGVyTW90aW9uKTtcblxuICAgIC8vIFBpbiB3aW5kb3cgY29udGVudCBsYXllcnMgdG8gb3BhY2l0eSAwIHZpYSBpbmxpbmUgc3R5bGUgQkVGT1JFIGNhbmNlbGxpbmcgV0FBUEkuXG4gICAgLy8gVGhpcyBwcmV2ZW50cyBhIHNpbmdsZS1mcmFtZSBmbGFzaCB3aGVyZSB0aGUgV0FBUEkgZmlsbDpmb3J3YXJkcyBpcyByZW1vdmVkXG4gICAgLy8gYW5kIHRoZSBlbGVtZW50IHJldmVydHMgdG8gQ1NTIG9wYWNpdHkgMSBiZWZvcmUgdGhlIG5ldyBpbmxpbmUgdmFsdWUgYXBwbGllcy5cbiAgICBpZiAod2FsbCkgd2FsbC5zdHlsZS5vcGFjaXR5ID0gJzAnO1xuICAgIGlmIChoZXJvKSBoZXJvLnN0eWxlLm9wYWNpdHkgPSAnMCc7XG4gICAgaWYgKHdhbGwpIHdhbGwuc3R5bGUucmVtb3ZlUHJvcGVydHkoJ3Zpc2liaWxpdHknKTtcbiAgICBpZiAoaGVybykgaGVyby5zdHlsZS5yZW1vdmVQcm9wZXJ0eSgndmlzaWJpbGl0eScpO1xuICAgIGlmICh3YWxsKSB3YWxsLnN0eWxlLnJlbW92ZVByb3BlcnR5KCdwb2ludGVyLWV2ZW50cycpO1xuICAgIGlmIChoZXJvKSBoZXJvLnN0eWxlLnJlbW92ZVByb3BlcnR5KCdwb2ludGVyLWV2ZW50cycpO1xuICAgIGNhbmNlbEFjdGl2ZUFuaW1hdGlvbnMoKTtcblxuICAgIC8vIEtlZXAgdGhlIC5mYWRlLWNvbnRlbnQgY29udGFpbmVyIHZpc2libGU6IGZvb3RlciBhbmQgYm90dG9tIHRhYnMgbGl2ZSBpbnNpZGUgaXQuXG4gICAgaWYgKHVpKSB7XG4gICAgICB1aS5zdHlsZS5vcGFjaXR5ID0gJzEnO1xuICAgICAgdWkuc3R5bGUud2lsbENoYW5nZSA9ICdhdXRvJztcbiAgICB9XG4gICAgLy8gRm9yY2UgcmVmbG93IHNvIHJvdXRlLW93bmVkIGNoaWxkcmVuIGFyZSBwYWludC1jb21taXR0ZWQgYXQgb3BhY2l0eSAwXG4gICAgLy8gYmVmb3JlIHRoZWlyIGNvbXBhY3QgaG9tZXBhZ2Utc3R5bGUgZW50cmFuY2UgYmVnaW5zLlxuICAgIHZvaWQgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50Lm9mZnNldEhlaWdodDtcblxuICAgIGNvbnN0IGhhc1dhYXBpID0gdHlwZW9mIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5hbmltYXRlID09PSAnZnVuY3Rpb24nO1xuICAgIGlmICh0eXBlb2Ygb25QcmVwYXJlZCA9PT0gJ2Z1bmN0aW9uJykgb25QcmVwYXJlZCgpO1xuXG4gICAgZ3JvdXBzLmZvckVhY2goKGdyb3VwKSA9PiB7XG4gICAgICBncm91cC5pdGVtcy5mb3JFYWNoKCh7IGVsLCBzbGlkZSB9KSA9PiB7XG4gICAgICAgIGNvbnN0IGRlbGF5ID0gaXNSb3V0ZVRyYW5zaXRpb24gPyBncm91cC5kZWxheU1zIDogZ3JvdXAuZGVsYXlNcztcbiAgICAgICAgY29uc3Qgcm91dGVTbGlkZU9mZnNldCA9IGlzUm91dGVUcmFuc2l0aW9uID8gJ3NjYWxlKHZhcigtLWluc3RydW1lbnQtd2FrZS1yZXNvbHZlLXNjYWxlKSknIDogJ3RyYW5zbGF0ZVkodmFyKC0tc3BhY2Utc20pKSc7XG5cbiAgICAgICAgaWYgKGhhc1dhYXBpKSB7XG4gICAgICAgICAgY29uc3Qga2V5ZnJhbWVzID0gc2xpZGVcbiAgICAgICAgICAgID8gW1xuICAgICAgICAgICAgICAgIHsgb3BhY2l0eTogMCwgdHJhbnNmb3JtOiByb3V0ZVNsaWRlT2Zmc2V0LCBmaWx0ZXI6ICdibHVyKHZhcigtLWluc3RydW1lbnQtd2FrZS1ibHVyKSknIH0sXG4gICAgICAgICAgICAgICAgeyBvcGFjaXR5OiAxLCB0cmFuc2Zvcm06ICd0cmFuc2xhdGVZKDApIHNjYWxlKDEpJywgZmlsdGVyOiAnYmx1cigwKScgfSxcbiAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgOiBbXG4gICAgICAgICAgICAgICAgeyBvcGFjaXR5OiAwLCBmaWx0ZXI6ICdibHVyKHZhcigtLWluc3RydW1lbnQtd2FrZS1ibHVyKSknIH0sXG4gICAgICAgICAgICAgICAgeyBvcGFjaXR5OiAxLCBmaWx0ZXI6ICdibHVyKDApJyB9LFxuICAgICAgICAgICAgICBdO1xuXG4gICAgICAgICAgY29uc3QgYW5pbSA9IGVsLmFuaW1hdGUoa2V5ZnJhbWVzLCB7XG4gICAgICAgICAgICBkdXJhdGlvbjogZW50ZXJNcyxcbiAgICAgICAgICAgIGRlbGF5LFxuICAgICAgICAgICAgZWFzaW5nOiByZXZlYWxFYXNpbmcsXG4gICAgICAgICAgICBmaWxsOiAnZm9yd2FyZHMnLFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGFjdGl2ZUFuaW1hdGlvbnMucHVzaChhbmltKTtcbiAgICAgICAgICBhbmltLm9uZmluaXNoID0gKCkgPT4ge1xuICAgICAgICAgICAgZWwuc3R5bGUub3BhY2l0eSA9ICcxJztcbiAgICAgICAgICAgIGVsLnN0eWxlLnRyYW5zZm9ybSA9ICcnO1xuICAgICAgICAgICAgZWwuc3R5bGUuZmlsdGVyID0gJyc7XG4gICAgICAgICAgICBlbC5zdHlsZS53aWxsQ2hhbmdlID0gJ2F1dG8nO1xuICAgICAgICAgIH07XG4gICAgICAgICAgYW5pbS5vbmNhbmNlbCA9IGFuaW0ub25maW5pc2g7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc2V0U3RhYmxlVGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBlbC5zdHlsZS50cmFuc2l0aW9uID0gYG9wYWNpdHkgJHtlbnRlck1zfW1zICR7cmV2ZWFsRWFzaW5nfSwgdHJhbnNmb3JtICR7ZW50ZXJNc31tcyAke3JldmVhbEVhc2luZ30sIGZpbHRlciAke2VudGVyTXN9bXMgJHtyZXZlYWxFYXNpbmd9YDtcbiAgICAgICAgICAgIGVsLnN0eWxlLm9wYWNpdHkgPSAnMSc7XG4gICAgICAgICAgICBlbC5zdHlsZS50cmFuc2Zvcm0gPSAnJztcbiAgICAgICAgICAgIGVsLnN0eWxlLmZpbHRlciA9ICcnO1xuICAgICAgICAgICAgc2V0U3RhYmxlVGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgIGVsLnN0eWxlLnRyYW5zaXRpb24gPSAnJztcbiAgICAgICAgICAgICAgZWwuc3R5bGUud2lsbENoYW5nZSA9ICdhdXRvJztcbiAgICAgICAgICAgIH0sIGVudGVyTXMgKyA1MCk7XG4gICAgICAgICAgfSwgZGVsYXkpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgICAgcGxheVJvdXRlRW50ZXJUYXJnZXRzKHJvdXRlRW50ZXJUYXJnZXRzLCByb3V0ZUVudGVyTW90aW9uKTtcbiAgICB9KTtcblxuICAgIGNvbnN0IHN1cmZhY2VUb3RhbCA9IE1hdGgubWF4KDAsIC4uLmdyb3Vwcy5tYXAoKGdyb3VwKSA9PiBncm91cC5kZWxheU1zKSkgKyBlbnRlck1zO1xuICAgIGNvbnN0IHJvdXRlRW50ZXJUb3RhbCA9IHJvdXRlRW50ZXJUYXJnZXRzLmxlbmd0aCA+IDBcbiAgICAgID8gTWF0aC5tYXgoUk9VVEVfRU5URVJfVE9UQUxfTVMsIC4uLnJvdXRlRW50ZXJUYXJnZXRzLm1hcCgodGFyZ2V0KSA9PiB0YXJnZXQuZGVsYXlNcyArIHRhcmdldC5kdXJhdGlvbk1zKSlcbiAgICAgIDogMDtcbiAgICBzZXRTdGFibGVUaW1lb3V0KHJlc29sdmUsIE1hdGgubWF4KHN1cmZhY2VUb3RhbCwgcm91dGVFbnRlclRvdGFsKSArIDUwKTtcbiAgfSk7XG59XG5cbi8qIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuICAgSE9PS1xuICAg4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQICovXG5cbmV4cG9ydCBmdW5jdGlvbiB1c2VTaGVsbFJvdXRlVHJhbnNpdGlvbih7IGdldFJvdXRlVmlldywgZ2V0Um91dGVSdW50aW1lLCBzdXJmYWNlUmVmcyB9KSB7XG4gIGNvbnN0IFtyb3V0ZVN0YXRlLCBzZXRSb3V0ZVN0YXRlXSA9IHVzZVN0YXRlKCgpID0+IGNvbXB1dGVSb3V0ZVN0YXRlKHdpbmRvdy5sb2NhdGlvbi5ocmVmKSk7XG4gIGNvbnN0IFtwZW5kaW5nQWN0aXZlUm91dGVJZCwgc2V0UGVuZGluZ0FjdGl2ZVJvdXRlSWRdID0gdXNlU3RhdGUobnVsbCk7XG4gIGNvbnN0IHRyYW5zaXRpb25BY3RpdmVSZWYgPSB1c2VSZWYoZmFsc2UpO1xuICBjb25zdCBxdWV1ZWROYXZpZ2F0aW9uUmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBhY3RpdmVSb3V0ZUlkUmVmID0gdXNlUmVmKHJvdXRlU3RhdGUucm91dGUuaWQpO1xuICBjb25zdCBhY3RpdmVSb3V0ZVN0YXRlUmVmID0gdXNlUmVmKHJvdXRlU3RhdGUpO1xuICBjb25zdCBhY3RpdmVSb3V0ZUNvbnRlbnRTaWduYXR1cmVSZWYgPSB1c2VSZWYocmVhZFJvdXRlQ29udGVudFNpZ25hdHVyZShyb3V0ZVN0YXRlKSk7XG4gIGNvbnN0IGFjdGl2ZUZvY3VzU2ltdWxhdGlvbklkUmVmID0gdXNlUmVmKHJlYWRSb3V0ZVN0YXRlU2ltdWxhdGlvbkZvY3VzSWQocm91dGVTdGF0ZSkpO1xuICBjb25zdCBhY3RpdmVHYXRlVHJhbnNpdGlvblJlZiA9IHVzZVJlZihmYWxzZSk7XG4gIGNvbnN0IGFjdGl2ZVRyYW5zaXRpb25Db21taXR0ZWRSZWYgPSB1c2VSZWYoZmFsc2UpO1xuICBjb25zdCBhY3RpdmVSb3V0ZVJlYWR5Q2FuY2VsUmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBnZXRSb3V0ZVJ1bnRpbWVSZWYgPSB1c2VSZWYoZ2V0Um91dGVSdW50aW1lKTtcbiAgY29uc3Qgc3luY1N0ZWFkeVRyYW5zaXRpb25QaGFzZSA9IHVzZUNhbGxiYWNrKCgpID0+IHtcbiAgICBzeW5jVHJhbnNpdGlvblBoYXNlRnJvbURvbShkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQpO1xuICB9LCBbXSk7XG5cbiAgY29uc3QgbmF2aWdhdGUgPSB1c2VDYWxsYmFjaygoaHJlZiwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gICAgY29uc3Qgcm91dGUgPSByZXNvbHZlUm91dGVGcm9tSHJlZihocmVmLCB3aW5kb3cubG9jYXRpb24uaHJlZik7XG4gICAgaWYgKCFyb3V0ZSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgY29uc3QgdGFyZ2V0VXJsID0gbmV3IFVSTChocmVmLCB3aW5kb3cubG9jYXRpb24uaHJlZik7XG4gICAgY29uc3QgbmV4dFN0YXRlID0gY29tcHV0ZVJvdXRlU3RhdGUodGFyZ2V0VXJsLnRvU3RyaW5nKCkpO1xuICAgIGNvbnN0IG5leHRSb3V0ZUlkID0gbmV4dFN0YXRlLnJvdXRlLmlkO1xuICAgIGNvbnN0IG5leHRSb3V0ZUNvbnRlbnRTaWduYXR1cmUgPSByZWFkUm91dGVDb250ZW50U2lnbmF0dXJlKG5leHRTdGF0ZSk7XG4gICAgY29uc3QgbmV4dEZvY3VzU2ltdWxhdGlvbklkID0gcmVhZFJvdXRlU3RhdGVTaW11bGF0aW9uRm9jdXNJZChuZXh0U3RhdGUpO1xuICAgIGNvbnN0IGlzU2FtZVJvdXRlID0gbmV4dFJvdXRlSWQgPT09IGFjdGl2ZVJvdXRlSWRSZWYuY3VycmVudDtcbiAgICBjb25zdCBoYXNSb3V0ZUNvbnRlbnRDaGFuZ2UgPSBuZXh0Um91dGVDb250ZW50U2lnbmF0dXJlICE9PSBhY3RpdmVSb3V0ZUNvbnRlbnRTaWduYXR1cmVSZWYuY3VycmVudDtcbiAgICBjb25zdCBoYXNTaW11bGF0aW9uRm9jdXNDaGFuZ2UgPSBuZXh0Rm9jdXNTaW11bGF0aW9uSWQgIT09IGFjdGl2ZUZvY3VzU2ltdWxhdGlvbklkUmVmLmN1cnJlbnQ7XG4gICAgY29uc3QgbWV0aG9kID0gb3B0aW9ucy5yZXBsYWNlID8gJ3JlcGxhY2VTdGF0ZScgOiAncHVzaFN0YXRlJztcbiAgICBjb25zdCBwcmV2aW91c1N0YXRlID0gYWN0aXZlUm91dGVTdGF0ZVJlZi5jdXJyZW50O1xuICAgIGNvbnN0IHByZXZpb3VzUm91dGVJZCA9IGFjdGl2ZVJvdXRlSWRSZWYuY3VycmVudDtcbiAgICBjb25zdCBwcmV2aW91c1JvdXRlQ29udGVudFNpZ25hdHVyZSA9IGFjdGl2ZVJvdXRlQ29udGVudFNpZ25hdHVyZVJlZi5jdXJyZW50O1xuICAgIGNvbnN0IHByZXZpb3VzRm9jdXNTaW11bGF0aW9uSWQgPSBhY3RpdmVGb2N1c1NpbXVsYXRpb25JZFJlZi5jdXJyZW50O1xuICAgIGxldCBoaXN0b3J5Q29tbWl0dGVkID0gZmFsc2U7XG4gICAgY29uc3QgY29tbWl0SGlzdG9yeSA9IChoaXN0b3J5TWV0aG9kID0gbWV0aG9kKSA9PiB7XG4gICAgICB3aW5kb3cuaGlzdG9yeVtoaXN0b3J5TWV0aG9kXShvcHRpb25zLnN0YXRlIHx8IHt9LCAnJywgbmV4dFN0YXRlLmNhbm9uaWNhbEhyZWYpO1xuICAgICAgaGlzdG9yeUNvbW1pdHRlZCA9IHRydWU7XG4gICAgICBhY3RpdmVUcmFuc2l0aW9uQ29tbWl0dGVkUmVmLmN1cnJlbnQgPSB0cnVlO1xuICAgIH07XG4gICAgY29uc3QgY29tbWl0ID0gKCkgPT4ge1xuICAgICAgaWYgKCFoaXN0b3J5Q29tbWl0dGVkKSB7XG4gICAgICAgIGNvbW1pdEhpc3RvcnkoKTtcbiAgICAgIH1cbiAgICAgIHNldFJvdXRlU3RhdGUobmV4dFN0YXRlKTtcbiAgICAgIGFjdGl2ZVJvdXRlU3RhdGVSZWYuY3VycmVudCA9IG5leHRTdGF0ZTtcbiAgICAgIGFjdGl2ZVJvdXRlSWRSZWYuY3VycmVudCA9IG5leHRSb3V0ZUlkO1xuICAgICAgYWN0aXZlUm91dGVDb250ZW50U2lnbmF0dXJlUmVmLmN1cnJlbnQgPSBuZXh0Um91dGVDb250ZW50U2lnbmF0dXJlO1xuICAgICAgYWN0aXZlRm9jdXNTaW11bGF0aW9uSWRSZWYuY3VycmVudCA9IG5leHRGb2N1c1NpbXVsYXRpb25JZDtcbiAgICB9O1xuICAgIGNvbnN0IHJvbGxiYWNrID0gKGVycm9yKSA9PiB7XG4gICAgICB3aW5kb3cuaGlzdG9yeS5yZXBsYWNlU3RhdGUod2luZG93Lmhpc3Rvcnkuc3RhdGUgfHwge30sICcnLCBwcmV2aW91c1N0YXRlLmNhbm9uaWNhbEhyZWYpO1xuICAgICAgc2V0Um91dGVTdGF0ZShwcmV2aW91c1N0YXRlKTtcbiAgICAgIGFjdGl2ZVJvdXRlU3RhdGVSZWYuY3VycmVudCA9IHByZXZpb3VzU3RhdGU7XG4gICAgICBhY3RpdmVSb3V0ZUlkUmVmLmN1cnJlbnQgPSBwcmV2aW91c1JvdXRlSWQ7XG4gICAgICBhY3RpdmVSb3V0ZUNvbnRlbnRTaWduYXR1cmVSZWYuY3VycmVudCA9IHByZXZpb3VzUm91dGVDb250ZW50U2lnbmF0dXJlO1xuICAgICAgYWN0aXZlRm9jdXNTaW11bGF0aW9uSWRSZWYuY3VycmVudCA9IHByZXZpb3VzRm9jdXNTaW11bGF0aW9uSWQ7XG4gICAgICB0cnkge1xuICAgICAgICBvcHRpb25zLm9uRmFpbHVyZT8uKGVycm9yLCBwcmV2aW91c1N0YXRlKTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICAvLyBGYWlsdXJlIHJlcG9ydGluZyBtdXN0IG5vdCBwcmV2ZW50IHJvdXRlIHJlc3RvcmF0aW9uLlxuICAgICAgfVxuICAgIH07XG4gICAgY29uc3QgY2FuUHJlZW1wdEFjdGl2ZVRyYW5zaXRpb24gPSBCb29sZWFuKFxuICAgICAgb3B0aW9ucy5wcmVlbXB0VHJhbnNpdGlvblxuICAgICAgJiYgIWFjdGl2ZUdhdGVUcmFuc2l0aW9uUmVmLmN1cnJlbnRcbiAgICAgICYmIGlzUm91dGVUcmFuc2l0aW9uUGhhc2UoZ2V0VHJhbnNpdGlvblBoYXNlKCkpXG4gICAgKTtcbiAgICBjb25zdCBwcmVlbXB0QWN0aXZlVHJhbnNpdGlvbiA9ICgpID0+IHtcbiAgICAgIGNvbnN0IHdhc1NpbXVsYXRpb25Gb2N1c1RyYW5zaXRpb24gPSBCb29sZWFuKFxuICAgICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuZGF0YXNldC5hYnNTaW11bGF0aW9uRm9jdXNUcmFuc2l0aW9uXG4gICAgICApO1xuICAgICAgKyt0cmFuc2l0aW9uVG9rZW47XG4gICAgICBxdWV1ZWROYXZpZ2F0aW9uUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgICAgYWN0aXZlUm91dGVSZWFkeUNhbmNlbFJlZi5jdXJyZW50Py4oKTtcbiAgICAgIGFjdGl2ZVJvdXRlUmVhZHlDYW5jZWxSZWYuY3VycmVudCA9IG51bGw7XG4gICAgICB0cmFuc2l0aW9uQWN0aXZlUmVmLmN1cnJlbnQgPSBmYWxzZTtcbiAgICAgIGFjdGl2ZUdhdGVUcmFuc2l0aW9uUmVmLmN1cnJlbnQgPSBmYWxzZTtcbiAgICAgIGZpbmFsaXplVHJhbnNpdGlvbihmYWxzZSwgYWN0aXZlUm91dGVJZFJlZi5jdXJyZW50LCBzdXJmYWNlUmVmcyk7XG4gICAgICByZXNldFNpbXVsYXRpb25Gb2N1c1RyYW5zaXRpb24oc3VyZmFjZVJlZnMsIHsgZGlzY2FyZFNuYXBzaG90czogdHJ1ZSB9KTtcbiAgICAgIGlmICh3YXNTaW11bGF0aW9uRm9jdXNUcmFuc2l0aW9uKSB7XG4gICAgICAgIGRpc21pc3NHYXRlQmFja2Ryb3AoeyBzdXBwcmVzc1JldHVybkFuaW1hdGlvbjogdHJ1ZSwgaW5zdGFudDogdHJ1ZSB9KTtcbiAgICAgIH1cbiAgICAgIHNldFBlbmRpbmdBY3RpdmVSb3V0ZUlkKG51bGwpO1xuICAgICAgc3luY1N0ZWFkeVRyYW5zaXRpb25QaGFzZSgpO1xuICAgICAgY29tbWl0SGlzdG9yeShhY3RpdmVUcmFuc2l0aW9uQ29tbWl0dGVkUmVmLmN1cnJlbnQgPyAncmVwbGFjZVN0YXRlJyA6IG1ldGhvZCk7XG4gICAgfTtcblxuICAgIGlmICh0cmFuc2l0aW9uQWN0aXZlUmVmLmN1cnJlbnQgJiYgY2FuUHJlZW1wdEFjdGl2ZVRyYW5zaXRpb24pIHtcbiAgICAgIHByZWVtcHRBY3RpdmVUcmFuc2l0aW9uKCk7XG4gICAgfSBlbHNlIGlmICh0cmFuc2l0aW9uQWN0aXZlUmVmLmN1cnJlbnQpIHtcbiAgICAgIGlmICghaXNTYW1lUm91dGUgfHwgaGFzUm91dGVDb250ZW50Q2hhbmdlIHx8IGhhc1NpbXVsYXRpb25Gb2N1c0NoYW5nZSkge1xuICAgICAgICBxdWV1ZWROYXZpZ2F0aW9uUmVmLmN1cnJlbnQgPSB7XG4gICAgICAgICAgaHJlZjogdGFyZ2V0VXJsLnRvU3RyaW5nKCksXG4gICAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgICByb3V0ZUlkOiBuZXh0Um91dGVJZCxcbiAgICAgICAgICByb3V0ZUNvbnRlbnRTaWduYXR1cmU6IG5leHRSb3V0ZUNvbnRlbnRTaWduYXR1cmUsXG4gICAgICAgICAgZm9jdXNTaW11bGF0aW9uSWQ6IG5leHRGb2N1c1NpbXVsYXRpb25JZCxcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGNvbnN0IHJlZHVjZU1vdGlvbiA9IHdpbmRvdy5tYXRjaE1lZGlhPy4oJyhwcmVmZXJzLXJlZHVjZWQtbW90aW9uOiByZWR1Y2UpJyk/Lm1hdGNoZXMgPz8gZmFsc2U7XG4gICAgY29uc3QgbmV4dFJvdXRlUnVudGltZSA9IGdldFJvdXRlUnVudGltZVJlZi5jdXJyZW50KG5leHRSb3V0ZUlkLCBuZXh0U3RhdGUuY2Fub25pY2FsSHJlZiwgbmV4dFN0YXRlKTtcbiAgICBjb25zdCBpc0dhdGUgPSBvcHRpb25zLnRyYW5zaXRpb25TdHlsZSA9PT0gJ2dhdGUtc3VjY2Vzcyc7XG4gICAgY29uc3QgaXNTaW11bGF0aW9uRm9jdXMgPSBvcHRpb25zLnRyYW5zaXRpb25TdHlsZSA9PT0gJ3NpbXVsYXRpb24tZm9jdXMnO1xuICAgIGlmICghaXNTaW11bGF0aW9uRm9jdXMgJiYgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmRhdGFzZXQuYWJzU2ltdWxhdGlvbkZvY3VzVHJhbnNpdGlvbikge1xuICAgICAgcmVzZXRTaW11bGF0aW9uRm9jdXNUcmFuc2l0aW9uKHN1cmZhY2VSZWZzLCB7IGRpc2NhcmRTbmFwc2hvdHM6IHRydWUgfSk7XG4gICAgICBkaXNtaXNzR2F0ZUJhY2tkcm9wKHsgc3VwcHJlc3NSZXR1cm5BbmltYXRpb246IHRydWUsIGluc3RhbnQ6IHRydWUgfSk7XG4gICAgfVxuICAgIGNvbnN0IHJlYWR5TXMgPSBvcHRpb25zLnJlYWR5RmFsbGJhY2tNc1xuICAgICAgPz8gKGlzR2F0ZSA/IDg1MCA6IChuZXh0Um91dGVJZCA9PT0gJ2hvbWUnID8gNTAwIDogNzAwKSk7XG4gICAgY29uc3Qgcm91dGVUaW1pbmdzID0gZ2V0Um91dGVUcmFuc2l0aW9uVGltaW5ncyh7XG4gICAgICBmYWRlTXM6IG9wdGlvbnMuZXhpdE1zLFxuICAgICAgc3RhZ2dlck1zOiBvcHRpb25zLnN0YWdnZXJNcyxcbiAgICAgIHJldmVhbE1zOiBvcHRpb25zLmVudGVyTXMsXG4gICAgICByZWFkeU1zLFxuICAgICAgcmVkdWNlTW90aW9uLFxuICAgIH0pO1xuXG4gICAgY29uc3QgcHJvY2Vzc1F1ZXVlZE5hdmlnYXRpb24gPSAoKSA9PiB7XG4gICAgICBjb25zdCBxdWV1ZWQgPSBxdWV1ZWROYXZpZ2F0aW9uUmVmLmN1cnJlbnQ7XG4gICAgICBpZiAoIXF1ZXVlZCB8fCB0cmFuc2l0aW9uQWN0aXZlUmVmLmN1cnJlbnQpIHJldHVybjtcbiAgICAgIGlmIChcbiAgICAgICAgcXVldWVkLnJvdXRlSWQgPT09IGFjdGl2ZVJvdXRlSWRSZWYuY3VycmVudFxuICAgICAgICAmJiBxdWV1ZWQucm91dGVDb250ZW50U2lnbmF0dXJlID09PSBhY3RpdmVSb3V0ZUNvbnRlbnRTaWduYXR1cmVSZWYuY3VycmVudFxuICAgICAgICAmJiAocXVldWVkLmZvY3VzU2ltdWxhdGlvbklkIHx8ICcnKSA9PT0gYWN0aXZlRm9jdXNTaW11bGF0aW9uSWRSZWYuY3VycmVudFxuICAgICAgKSB7XG4gICAgICAgIHF1ZXVlZE5hdmlnYXRpb25SZWYuY3VycmVudCA9IG51bGw7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHF1ZXVlZE5hdmlnYXRpb25SZWYuY3VycmVudCA9IG51bGw7XG4gICAgICBzZXRTdGFibGVUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgaWYgKCF0cmFuc2l0aW9uQWN0aXZlUmVmLmN1cnJlbnQpIG5hdmlnYXRlKHF1ZXVlZC5ocmVmLCBxdWV1ZWQub3B0aW9ucyk7XG4gICAgICB9LCAwKTtcbiAgICB9O1xuXG4gICAgY29uc3QgZmluaXNoVHJhbnNpdGlvbiA9IChpc0dhdGVUcmFuc2l0aW9uLCBnYXRlQmFja2Ryb3BEaXNtaXNzZWQgPSBmYWxzZSkgPT4ge1xuICAgICAgdHJhbnNpdGlvbkFjdGl2ZVJlZi5jdXJyZW50ID0gZmFsc2U7XG4gICAgICBhY3RpdmVHYXRlVHJhbnNpdGlvblJlZi5jdXJyZW50ID0gZmFsc2U7XG4gICAgICBzZXRQZW5kaW5nQWN0aXZlUm91dGVJZChudWxsKTtcbiAgICAgIGFjdGl2ZVJvdXRlUmVhZHlDYW5jZWxSZWYuY3VycmVudD8uKCk7XG4gICAgICBhY3RpdmVSb3V0ZVJlYWR5Q2FuY2VsUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgICAgY29uc3QgcmVsZWFzZUdhdGVCYWNrZHJvcCA9IEJvb2xlYW4ob3B0aW9ucy5yZWxlYXNlR2F0ZUJhY2tkcm9wT25Db21wbGV0ZSk7XG4gICAgICBmaW5hbGl6ZVRyYW5zaXRpb24oaXNHYXRlVHJhbnNpdGlvbiwgYWN0aXZlUm91dGVJZFJlZi5jdXJyZW50LCBzdXJmYWNlUmVmcywge1xuICAgICAgICBzdXBwcmVzc1JldHVybkFuaW1hdGlvbjogaXNHYXRlVHJhbnNpdGlvbixcbiAgICAgICAgZ2F0ZUJhY2tkcm9wRGlzbWlzc2VkLFxuICAgICAgICBwcmVzZXJ2ZVRyYW5zaXRpb25QaGFzZTogcmVsZWFzZUdhdGVCYWNrZHJvcCxcbiAgICAgIH0pO1xuICAgICAgcmVzZXRTaW11bGF0aW9uRm9jdXNUcmFuc2l0aW9uKHN1cmZhY2VSZWZzKTtcbiAgICAgIGlmIChyZWxlYXNlR2F0ZUJhY2tkcm9wKSB7XG4gICAgICAgIGRpc21pc3NHYXRlQmFja2Ryb3AoeyBpbnN0YW50OiBpc1NpbXVsYXRpb25Gb2N1cyB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN5bmNTdGVhZHlUcmFuc2l0aW9uUGhhc2UoKTtcbiAgICAgIH1cbiAgICAgIGNsZWFyUG9ydGZvbGlvRGVja1JlbGVhc2UoKTtcbiAgICAgIGlmIChpc0dhdGVUcmFuc2l0aW9uKSB7XG4gICAgICAgIHJlbW92ZVBvcnRmb2xpb0dhdGVTY2VuZUJyaWRnZSgpO1xuICAgICAgfVxuICAgICAgdHJ5IHtcbiAgICAgICAgb3B0aW9ucy5vbkNvbXBsZXRlPy4oYWN0aXZlUm91dGVTdGF0ZVJlZi5jdXJyZW50KTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICAvLyBDb21wbGV0aW9uIGxpc3RlbmVycyBhcmUgY29zbWV0aWMgY2xlYW51cDsgdHJhbnNpdGlvbiBzdGF0ZSBpcyBhbHJlYWR5IHNldHRsZWQuXG4gICAgICB9XG4gICAgICBwcm9jZXNzUXVldWVkTmF2aWdhdGlvbigpO1xuICAgIH07XG5cbiAgICBpZiAoaXNTaW11bGF0aW9uRm9jdXMpIHtcbiAgICAgIHRyYW5zaXRpb25BY3RpdmVSZWYuY3VycmVudCA9IHRydWU7XG4gICAgICBhY3RpdmVHYXRlVHJhbnNpdGlvblJlZi5jdXJyZW50ID0gZmFsc2U7XG4gICAgICBhY3RpdmVUcmFuc2l0aW9uQ29tbWl0dGVkUmVmLmN1cnJlbnQgPSBoaXN0b3J5Q29tbWl0dGVkO1xuICAgICAgc2V0TGVnYWN5Um91dGVUcmFuc2l0aW9uQWN0aXZlKHRydWUsIHsgZ2F0ZTogZmFsc2UgfSk7XG4gICAgICBzZXRTaW11bGF0aW9uRm9jdXNUcmFuc2l0aW9uU3RhdGUoJ3ByZXBhcmUnKTtcbiAgICAgIGNvbnN0IHNpbXVsYXRpb25UaXRsZVN1cmZhY2UgPSBnZXRTaW11bGF0aW9uVGl0bGVTdXJmYWNlRm9yUm91dGVDaGFuZ2UoYWN0aXZlUm91dGVJZFJlZi5jdXJyZW50LCBuZXh0Um91dGVJZCk7XG4gICAgICBzZXRTaW11bGF0aW9uU2hlbGxTdGFiaWxpdHkodHJ1ZSwgc3VyZmFjZVJlZnMsIHtcbiAgICAgICAgdGl0bGVTdXJmYWNlOiBzaW11bGF0aW9uVGl0bGVTdXJmYWNlLFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHRva2VuID0gKyt0cmFuc2l0aW9uVG9rZW47XG4gICAgICBjb25zdCBzdGFsZSA9ICgpID0+IHRva2VuICE9PSB0cmFuc2l0aW9uVG9rZW47XG4gICAgICBjb25zdCBzaW11bGF0aW9uVGltaW5ncyA9IGdldFNpbXVsYXRpb25Gb2N1c1RpbWluZ3Mob3B0aW9ucywgcmVkdWNlTW90aW9uKTtcbiAgICAgIGNvbnN0IHJldGFpbmVkU2ltdWxhdGlvbiA9IGNhcHR1cmVTaW11bGF0aW9uVHJhbnNhY3Rpb25TbmFwc2hvdCgpO1xuICAgICAgY29uc3QgcmVhZGluZXNzUm91dGVJZCA9IG5leHRTdGF0ZS5kYWlseUZvY3VzUm91dGVJZCB8fCBuZXh0U3RhdGUucm91dGUuaWQ7XG4gICAgICBjb25zdCBzaG91bGRXYWl0Rm9yUm91dGVSZWFkeSA9ICFpc1NhbWVSb3V0ZVxuICAgICAgICB8fCBCb29sZWFuKG5leHRTdGF0ZS5kYWlseUZvY3VzUm91dGVJZClcbiAgICAgICAgfHwgaGFzU2ltdWxhdGlvbkZvY3VzQ2hhbmdlXG4gICAgICAgIHx8IHR5cGVvZiBvcHRpb25zLmFmdGVyUm91dGVSZWFkeSA9PT0gJ2Z1bmN0aW9uJztcbiAgICAgIGxldCByb3V0ZVJlYWR5V2FpdGVyID0gbnVsbDtcbiAgICAgIGNvbnN0IHdhaXRGb3JDb21taXR0ZWRSb3V0ZVJlYWR5ID0gKCkgPT4ge1xuICAgICAgICBpZiAoIXNob3VsZFdhaXRGb3JSb3V0ZVJlYWR5KSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCdyZWFkeScpO1xuICAgICAgICByb3V0ZVJlYWR5V2FpdGVyID0gd2FpdEZvclJvdXRlUmVhZHkocmVhZGluZXNzUm91dGVJZCwgcm91dGVUaW1pbmdzLnJlYWR5LCB7XG4gICAgICAgICAgbG9ja2VkR2F0ZUlkOiBuZXh0U3RhdGUubG9ja2VkR2F0ZUlkIHx8IG51bGwsXG4gICAgICAgIH0pO1xuICAgICAgICBhY3RpdmVSb3V0ZVJlYWR5Q2FuY2VsUmVmLmN1cnJlbnQgPSByb3V0ZVJlYWR5V2FpdGVyLmNhbmNlbDtcbiAgICAgICAgcmV0dXJuIHJvdXRlUmVhZHlXYWl0ZXIucHJvbWlzZTtcbiAgICAgIH07XG4gICAgICBsZXQgcm91dGVDb21taXR0ZWQgPSBmYWxzZTtcbiAgICAgIGxldCB0cmFuc2l0aW9uRmluaXNoZWQgPSBmYWxzZTtcbiAgICAgIGNvbnN0IHJ1bkNvbW1pdENhbGxiYWNrID0gKCkgPT4gUHJvbWlzZS5yZXNvbHZlKClcbiAgICAgICAgLnRoZW4oKCkgPT4gKHR5cGVvZiBvcHRpb25zLm9uQ29tbWl0ID09PSAnZnVuY3Rpb24nID8gb3B0aW9ucy5vbkNvbW1pdChuZXh0U3RhdGUpIDogdW5kZWZpbmVkKSk7XG4gICAgICBjb25zdCBydW5BZnRlclJvdXRlUmVhZHkgPSAoKSA9PiBQcm9taXNlLnJlc29sdmUoKVxuICAgICAgICAudGhlbigoKSA9PiAodHlwZW9mIG9wdGlvbnMuYWZ0ZXJSb3V0ZVJlYWR5ID09PSAnZnVuY3Rpb24nID8gb3B0aW9ucy5hZnRlclJvdXRlUmVhZHkobmV4dFN0YXRlKSA6IHVuZGVmaW5lZCkpO1xuICAgICAgY29uc3QgZmluaXNoU2ltdWxhdGlvbkZvY3VzVHJhbnNpdGlvbiA9ICgpID0+IHtcbiAgICAgICAgaWYgKHRyYW5zaXRpb25GaW5pc2hlZCkgcmV0dXJuO1xuICAgICAgICB0cmFuc2l0aW9uRmluaXNoZWQgPSB0cnVlO1xuICAgICAgICByZXRhaW5lZFNpbXVsYXRpb24/LnJlbGVhc2UoKTtcbiAgICAgICAgZmluaXNoVHJhbnNpdGlvbihmYWxzZSk7XG4gICAgICB9O1xuICAgICAgY29uc3QgcnVuU2ltdWxhdGlvbkZvY3VzRW50ZXIgPSAoKSA9PiB7XG4gICAgICAgIHNldFNpbXVsYXRpb25Gb2N1c1RyYW5zaXRpb25TdGF0ZSgnaW4nKTtcbiAgICAgICAgaWYgKG5leHRSb3V0ZUlkID09PSAnaG9tZScgJiYgIW5leHRTdGF0ZS5kYWlseUZvY3VzUm91dGVJZCkge1xuICAgICAgICAgIGZpbmlzaFNpbXVsYXRpb25Gb2N1c1RyYW5zaXRpb24oKTtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFuaW1hdGVTaW11bGF0aW9uRm9jdXNMYXllcihzdXJmYWNlUmVmcywge1xuICAgICAgICAgIGRpcmVjdGlvbjogJ2luJyxcbiAgICAgICAgICBkdXJhdGlvbk1zOiBzaW11bGF0aW9uVGltaW5ncy5lbnRlcixcbiAgICAgICAgICBsb2NhbER1cmF0aW9uTXM6IHNpbXVsYXRpb25UaW1pbmdzLmVudGVyTG9jYWwsXG4gICAgICAgICAgZWFzaW5nOiBzaW11bGF0aW9uVGltaW5ncy5lbnRlckVhc2luZyxcbiAgICAgICAgfSkuZmluYWxseSgoKSA9PiB7XG4gICAgICAgICAgaWYgKHRyYW5zaXRpb25BY3RpdmVSZWYuY3VycmVudCAmJiBhY3RpdmVSb3V0ZUlkUmVmLmN1cnJlbnQgPT09IG5leHRSb3V0ZUlkKSB7XG4gICAgICAgICAgICBmaW5pc2hTaW11bGF0aW9uRm9jdXNUcmFuc2l0aW9uKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH07XG4gICAgICBjb25zdCBjYW5jZWxTdGFsZVNpbXVsYXRpb25Gb2N1cyA9ICgpID0+IHtcbiAgICAgICAgcm91dGVSZWFkeVdhaXRlcj8uY2FuY2VsKCk7XG4gICAgICAgIHJldGFpbmVkU2ltdWxhdGlvbj8ucmVsZWFzZSh7IGltbWVkaWF0ZTogdHJ1ZSB9KTtcbiAgICAgICAgaWYgKHJvdXRlQ29tbWl0dGVkICYmIHRyYW5zaXRpb25BY3RpdmVSZWYuY3VycmVudCAmJiBhY3RpdmVSb3V0ZUlkUmVmLmN1cnJlbnQgPT09IG5leHRSb3V0ZUlkKSB7XG4gICAgICAgICAgZmluaXNoU2ltdWxhdGlvbkZvY3VzVHJhbnNpdGlvbigpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBQcm9taXNlLnJlc29sdmUoKVxuICAgICAgICAudGhlbigoKSA9PiBuZXh0Um91dGVSdW50aW1lPy5sb2FkTW9kdWxlPy4oKSlcbiAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIGlmIChzdGFsZSgpKSB7XG4gICAgICAgICAgICBjYW5jZWxTdGFsZVNpbXVsYXRpb25Gb2N1cygpO1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICB9XG4gICAgICAgICAgc2V0U2ltdWxhdGlvblNoZWxsU3RhYmlsaXR5KHRydWUsIHN1cmZhY2VSZWZzLCB7XG4gICAgICAgICAgICB0aXRsZVN1cmZhY2U6IHNpbXVsYXRpb25UaXRsZVN1cmZhY2UsXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgc2V0U2ltdWxhdGlvbkZvY3VzVHJhbnNpdGlvblN0YXRlKCdvdXQnKTtcbiAgICAgICAgICByZXR1cm4gYW5pbWF0ZVNpbXVsYXRpb25Gb2N1c0xheWVyKHN1cmZhY2VSZWZzLCB7XG4gICAgICAgICAgICBkaXJlY3Rpb246ICdvdXQnLFxuICAgICAgICAgICAgZHVyYXRpb25Nczogc2ltdWxhdGlvblRpbWluZ3MuZXhpdCxcbiAgICAgICAgICAgIGxvY2FsRHVyYXRpb25Nczogc2ltdWxhdGlvblRpbWluZ3MuZXhpdExvY2FsLFxuICAgICAgICAgICAgZWFzaW5nOiBzaW11bGF0aW9uVGltaW5ncy5leGl0RWFzaW5nLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgaWYgKHN0YWxlKCkpIHtcbiAgICAgICAgICAgIGNhbmNlbFN0YWxlU2ltdWxhdGlvbkZvY3VzKCk7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzZXRTaW11bGF0aW9uRm9jdXNUcmFuc2l0aW9uU3RhdGUoJ2hvbGQnKTtcbiAgICAgICAgICByZXR1cm4gd2FpdEZvclNpbXVsYXRpb25Gb2N1c0hvbGQoc2ltdWxhdGlvblRpbWluZ3MuaG9sZCk7XG4gICAgICAgIH0pXG4gICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICBpZiAoc3RhbGUoKSkge1xuICAgICAgICAgICAgY2FuY2VsU3RhbGVTaW11bGF0aW9uRm9jdXMoKTtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlY29yZFNpbXVsYXRpb25WaXN1YWxUcmFuc2l0aW9uRXZlbnQoJ2NvbW1pdCcsIHsgcm91dGVJZDogbmV4dFN0YXRlLnJvdXRlLmlkIH0pO1xuICAgICAgICAgIHJldGFpbmVkU2ltdWxhdGlvbj8uc2hvdygpO1xuICAgICAgICAgIGNvbW1pdCgpO1xuICAgICAgICAgIHJvdXRlQ29tbWl0dGVkID0gdHJ1ZTtcbiAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9KVxuICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgaWYgKHN0YWxlKCkpIHtcbiAgICAgICAgICAgIGNhbmNlbFN0YWxlU2ltdWxhdGlvbkZvY3VzKCk7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzZXRTaW11bGF0aW9uU2hlbGxTdGFiaWxpdHkodHJ1ZSwgc3VyZmFjZVJlZnMsIHtcbiAgICAgICAgICAgIHRpdGxlU3VyZmFjZTogc2ltdWxhdGlvblRpdGxlU3VyZmFjZSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm4gd2FpdEZvckNvbW1pdHRlZFJvdXRlUmVhZHkoKTtcbiAgICAgICAgfSlcbiAgICAgICAgLnRoZW4oKHJlYWRpbmVzc1N0YXR1cykgPT4ge1xuICAgICAgICAgIGlmIChyZWFkaW5lc3NTdGF0dXMgIT09ICdyZWFkeScpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgUm91dGUgXCIke3JlYWRpbmVzc1JvdXRlSWR9XCIgZGlkIG5vdCBiZWNvbWUgcmVhZHkgKCR7cmVhZGluZXNzU3RhdHVzfSlgKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHJ1bkFmdGVyUm91dGVSZWFkeSgpO1xuICAgICAgICB9KVxuICAgICAgICAudGhlbigoKSA9PiBydW5Db21taXRDYWxsYmFjaygpKVxuICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgaWYgKHN0YWxlKCkpIHtcbiAgICAgICAgICAgIGNhbmNlbFN0YWxlU2ltdWxhdGlvbkZvY3VzKCk7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzZXRTaW11bGF0aW9uU2hlbGxTdGFiaWxpdHkodHJ1ZSwgc3VyZmFjZVJlZnMsIHtcbiAgICAgICAgICAgIHRpdGxlU3VyZmFjZTogc2ltdWxhdGlvblRpdGxlU3VyZmFjZSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZWNvcmRTaW11bGF0aW9uVmlzdWFsVHJhbnNpdGlvbkV2ZW50KCdydW50aW1lLXJlYWR5JywgeyByb3V0ZUlkOiBuZXh0U3RhdGUucm91dGUuaWQgfSk7XG4gICAgICAgICAgcmV0YWluZWRTaW11bGF0aW9uPy5yZWxlYXNlKCk7XG4gICAgICAgICAgcmV0dXJuIHJ1blNpbXVsYXRpb25Gb2N1c0VudGVyKCk7XG4gICAgICAgIH0pXG4gICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICBpZiAoc3RhbGUoKSkge1xuICAgICAgICAgICAgY2FuY2VsU3RhbGVTaW11bGF0aW9uRm9jdXMoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgZmluaXNoU2ltdWxhdGlvbkZvY3VzVHJhbnNpdGlvbigpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goYXN5bmMgKGVycm9yKSA9PiB7XG4gICAgICAgICAgcm91dGVSZWFkeVdhaXRlcj8uY2FuY2VsKCk7XG4gICAgICAgICAgaWYgKHN0YWxlKCkpIHtcbiAgICAgICAgICAgIGNhbmNlbFN0YWxlU2ltdWxhdGlvbkZvY3VzKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChyb3V0ZUNvbW1pdHRlZCkge1xuICAgICAgICAgICAgcm9sbGJhY2soZXJyb3IpO1xuICAgICAgICAgICAgY29uc3QgcHJldmlvdXNSZWFkaW5lc3NSb3V0ZUlkID0gcHJldmlvdXNTdGF0ZS5kYWlseUZvY3VzUm91dGVJZCB8fCBwcmV2aW91c1N0YXRlLnJvdXRlLmlkO1xuICAgICAgICAgICAgY29uc3QgcmVzdG9yZWRSb3V0ZVdhaXRlciA9IHdhaXRGb3JSb3V0ZVJlYWR5KHByZXZpb3VzUmVhZGluZXNzUm91dGVJZCwgcm91dGVUaW1pbmdzLnJlYWR5LCB7XG4gICAgICAgICAgICAgIGxvY2tlZEdhdGVJZDogcHJldmlvdXNTdGF0ZS5sb2NrZWRHYXRlSWQgfHwgbnVsbCxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYXdhaXQgcmVzdG9yZWRSb3V0ZVdhaXRlci5wcm9taXNlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBvcHRpb25zLm9uRmFpbHVyZT8uKGVycm9yLCBwcmV2aW91c1N0YXRlKTtcbiAgICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgICAvLyBGYWlsdXJlIHJlcG9ydGluZyBtdXN0IG5vdCBwcmV2ZW50IHRyYW5zaXRpb24gY2xlYW51cC5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0YWluZWRTaW11bGF0aW9uPy5yZWxlYXNlKCk7XG4gICAgICAgICAgZmluaXNoU2ltdWxhdGlvbkZvY3VzVHJhbnNpdGlvbigpO1xuICAgICAgICB9KTtcblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLyog4pSA4pSAIHNtb290aCB0cmFuc2l0aW9uIChnYXRlLXN1Y2Nlc3MgT1IgYW55IFNQQSByb3V0ZSBjaGFuZ2UpIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgCAqL1xuICAgIGlmICgoIWlzU2FtZVJvdXRlIHx8IGhhc1JvdXRlQ29udGVudENoYW5nZSkgJiYgIXJlZHVjZU1vdGlvbikge1xuICAgICAgdHJhbnNpdGlvbkFjdGl2ZVJlZi5jdXJyZW50ID0gdHJ1ZTtcbiAgICAgIGFjdGl2ZUdhdGVUcmFuc2l0aW9uUmVmLmN1cnJlbnQgPSBpc0dhdGU7XG4gICAgICBhY3RpdmVUcmFuc2l0aW9uQ29tbWl0dGVkUmVmLmN1cnJlbnQgPSBoaXN0b3J5Q29tbWl0dGVkO1xuICAgICAgc2V0UGVuZGluZ0FjdGl2ZVJvdXRlSWQobmV4dFJvdXRlSWQpO1xuICAgICAgc2V0TGVnYWN5Um91dGVUcmFuc2l0aW9uQWN0aXZlKHRydWUsIHsgZ2F0ZTogaXNHYXRlIH0pO1xuICAgICAgc2V0VHJhbnNpdGlvblBoYXNlKFRSQU5TSVRJT05fUEhBU0VTLlJPVVRFX09VVCk7XG5cbiAgICAgIGNvbnN0IHRva2VuID0gKyt0cmFuc2l0aW9uVG9rZW47XG4gICAgICBjb25zdCBzdGFsZSA9ICgpID0+IHRva2VuICE9PSB0cmFuc2l0aW9uVG9rZW47XG4gICAgICBjb25zdCByb3V0ZVJlYWR5V2FpdGVyID0gd2FpdEZvclJvdXRlUmVhZHkobmV4dFN0YXRlLnJvdXRlLmlkLCByb3V0ZVRpbWluZ3MucmVhZHksIHtcbiAgICAgICAgbG9ja2VkR2F0ZUlkOiBuZXh0U3RhdGUubG9ja2VkR2F0ZUlkIHx8IG51bGwsXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHJvdXRlUmVhZHkgPSByb3V0ZVJlYWR5V2FpdGVyLnByb21pc2U7XG4gICAgICBhY3RpdmVSb3V0ZVJlYWR5Q2FuY2VsUmVmLmN1cnJlbnQgPSByb3V0ZVJlYWR5V2FpdGVyLmNhbmNlbDtcbiAgICAgIGxldCBnYXRlQmFja2Ryb3BEaXNtaXNzZWQgPSBmYWxzZTtcbiAgICAgIGNvbnN0IGRpc21pc3NHYXRlQmFja2Ryb3BPbmNlID0gKCkgPT4ge1xuICAgICAgICBpZiAoIWlzR2F0ZSB8fCBnYXRlQmFja2Ryb3BEaXNtaXNzZWQpIHJldHVybjtcbiAgICAgICAgZ2F0ZUJhY2tkcm9wRGlzbWlzc2VkID0gdHJ1ZTtcbiAgICAgICAgZGlzbWlzc0dhdGVCYWNrZHJvcCh7IHN1cHByZXNzUmV0dXJuQW5pbWF0aW9uOiB0cnVlIH0pO1xuICAgICAgfTtcblxuICAgICAgUHJvbWlzZS5yZXNvbHZlKClcbiAgICAgICAgLnRoZW4oKCkgPT4gbmV4dFJvdXRlUnVudGltZT8ubG9hZE1vZHVsZT8uKCkpLmNhdGNoKCgpID0+IHVuZGVmaW5lZClcbiAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIGlmIChzdGFsZSgpKSB7XG4gICAgICAgICAgICByb3V0ZVJlYWR5V2FpdGVyLmNhbmNlbCgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gZmFkZU91dENvbnRlbnQocm91dGVUaW1pbmdzLmZhZGVPdXQsIHJvdXRlVGltaW5ncy5mYWRlRWFzaW5nLCBzdXJmYWNlUmVmcywge1xuICAgICAgICAgICAgZmluYWxPcGFjaXR5OiBpc0dhdGUgPyAwIDogMC4wOCxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIGlmIChzdGFsZSgpKSB7XG4gICAgICAgICAgICByb3V0ZVJlYWR5V2FpdGVyLmNhbmNlbCgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaXNHYXRlKSB7XG4gICAgICAgICAgICAvLyBHYXRlLXN1Y2Nlc3MgaGFuZG9mZnMgc3RheSBoaWRkZW4gd2hpbGUgdGhlIGRlc3RpbmF0aW9uIHNldHRsZXMuXG4gICAgICAgICAgICBzZXRSb3V0ZUxheWVyVmlzaWJpbGl0eShmYWxzZSwgc3VyZmFjZVJlZnMpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwaW5Sb3V0ZVN1cmZhY2VzRm9yQ29tbWl0KHN1cmZhY2VSZWZzKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29tbWl0KCk7XG4gICAgICAgICAgaWYgKCFpc0dhdGUpIHtcbiAgICAgICAgICAgIGhvbGRQaW5uZWRSb3V0ZVN1cmZhY2VzVW50aWxSb3V0ZUluKFxuICAgICAgICAgICAgICBzdXJmYWNlUmVmcyxcbiAgICAgICAgICAgICAgKCkgPT4gIXN0YWxlKCkgJiYgZ2V0VHJhbnNpdGlvblBoYXNlKCkgPT09IFRSQU5TSVRJT05fUEhBU0VTLlJPVVRFX09VVFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHJvdXRlUmVhZHk7XG4gICAgICAgIH0pXG4gICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICBpZiAoc3RhbGUoKSkge1xuICAgICAgICAgICAgcm91dGVSZWFkeVdhaXRlci5jYW5jZWwoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHdhaXRGb3JSb3V0ZVBhaW50RnJhbWVzKDIpO1xuICAgICAgICB9KVxuICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgaWYgKHN0YWxlKCkpIHtcbiAgICAgICAgICAgIHJvdXRlUmVhZHlXYWl0ZXIuY2FuY2VsKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHNldFRyYW5zaXRpb25QaGFzZShUUkFOU0lUSU9OX1BIQVNFUy5ST1VURV9JTik7XG4gICAgICAgICAgLy8gS2VlcCByb3V0ZSBsYXllcnMgaGlkZGVuIHVudGlsIHN0YWdnZXJlZEVudHJhbmNlIGhhcyBhbHJlYWR5IHBpbm5lZFxuICAgICAgICAgIC8vIHRoZSBuZXcgcm91dGUgc3VyZmFjZXMgdG8gb3BhY2l0eSAwLiBSZXN0b3JpbmcgdmlzaWJpbGl0eSBmaXJzdCBjYW5cbiAgICAgICAgICAvLyBleHBvc2UgcG9ydGZvbGlvIHRleHQgZm9yIGEgZnJhbWUgYmVmb3JlIHRoZSBzdGFnZ2VyIHByZXAgcnVucy5cbiAgICAgICAgICByZXR1cm4gc3RhZ2dlcmVkRW50cmFuY2Uoe1xuICAgICAgICAgICAgcm91dGVJZDogbmV4dFN0YXRlLnJvdXRlLmlkLFxuICAgICAgICAgICAgc3VyZmFjZVJlZnMsXG4gICAgICAgICAgICBlbnRlck1zOiByb3V0ZVRpbWluZ3MucmV2ZWFsLFxuICAgICAgICAgICAgcmV2ZWFsRWFzaW5nOiByb3V0ZVRpbWluZ3MucmV2ZWFsRWFzaW5nLFxuICAgICAgICAgICAgb25QcmVwYXJlZDogKCkgPT4ge1xuICAgICAgICAgICAgICBkaXNtaXNzUG9ydGZvbGlvR2F0ZVNjZW5lQnJpZGdlKHtcbiAgICAgICAgICAgICAgICBkdXJhdGlvbk1zOiBQT1JURk9MSU9fR0FURV9TQ0VORV9GQURFX01TLFxuICAgICAgICAgICAgICAgIGRlbGF5TXM6IEdST1VQRURfUk9VVEVfT0ZGU0VUX01TLFxuICAgICAgICAgICAgICAgIGVhc2luZzogJ2xpbmVhcicsXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICBkaXNtaXNzR2F0ZUJhY2tkcm9wT25jZSgpO1xuICAgICAgICAgICAgICBpZiAobmV4dFJvdXRlSWQgPT09ICdwb3J0Zm9saW8nKSB7XG4gICAgICAgICAgICAgICAgcmVsZWFzZVBvcnRmb2xpb0RlY2soaXNHYXRlID8gJ2dhdGUtc3VjY2VzcycgOiAncm91dGUtaW4nKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIGlmIChzdGFsZSgpKSB7XG4gICAgICAgICAgICByb3V0ZVJlYWR5V2FpdGVyLmNhbmNlbCgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBmaW5pc2hUcmFuc2l0aW9uKGlzR2F0ZSwgZ2F0ZUJhY2tkcm9wRGlzbWlzc2VkKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKCgpID0+IHtcbiAgICAgICAgICByb3V0ZVJlYWR5V2FpdGVyLmNhbmNlbCgpO1xuICAgICAgICAgIGlmICghc3RhbGUoKSkge1xuICAgICAgICAgICAgZmluaXNoVHJhbnNpdGlvbihpc0dhdGUsIGdhdGVCYWNrZHJvcERpc21pc3NlZCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLyog4pSA4pSAIHJlZHVjZWQgbW90aW9uIG9yIHNhbWUtcm91dGU6IGluc3RhbnQgd2l0aCBjbGVhbnVwIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgCAqL1xuICAgIGlmIChpc0dhdGUpIHtcbiAgICAgIHRyYW5zaXRpb25BY3RpdmVSZWYuY3VycmVudCA9IHRydWU7XG4gICAgICBhY3RpdmVHYXRlVHJhbnNpdGlvblJlZi5jdXJyZW50ID0gdHJ1ZTtcbiAgICAgIGFjdGl2ZVRyYW5zaXRpb25Db21taXR0ZWRSZWYuY3VycmVudCA9IGhpc3RvcnlDb21taXR0ZWQ7XG4gICAgICBzZXRQZW5kaW5nQWN0aXZlUm91dGVJZChuZXh0Um91dGVJZCk7XG4gICAgICBzZXRMZWdhY3lSb3V0ZVRyYW5zaXRpb25BY3RpdmUodHJ1ZSwgeyBnYXRlOiB0cnVlIH0pO1xuICAgICAgc2V0VHJhbnNpdGlvblBoYXNlKFRSQU5TSVRJT05fUEhBU0VTLlJPVVRFX09VVCk7XG4gICAgICBjb25zdCB0b2tlbiA9ICsrdHJhbnNpdGlvblRva2VuO1xuICAgICAgY29uc3Qgc3RhbGUgPSAoKSA9PiB0b2tlbiAhPT0gdHJhbnNpdGlvblRva2VuO1xuICAgICAgY29uc3Qgcm91dGVSZWFkeVdhaXRlciA9IHdhaXRGb3JSb3V0ZVJlYWR5KG5leHRTdGF0ZS5yb3V0ZS5pZCwgcm91dGVUaW1pbmdzLnJlYWR5LCB7XG4gICAgICAgIGxvY2tlZEdhdGVJZDogbmV4dFN0YXRlLmxvY2tlZEdhdGVJZCB8fCBudWxsLFxuICAgICAgfSk7XG4gICAgICBjb25zdCByb3V0ZVJlYWR5ID0gcm91dGVSZWFkeVdhaXRlci5wcm9taXNlO1xuICAgICAgYWN0aXZlUm91dGVSZWFkeUNhbmNlbFJlZi5jdXJyZW50ID0gcm91dGVSZWFkeVdhaXRlci5jYW5jZWw7XG4gICAgICBsZXQgZ2F0ZUJhY2tkcm9wRGlzbWlzc2VkID0gZmFsc2U7XG4gICAgICBjb25zdCBkaXNtaXNzR2F0ZUJhY2tkcm9wT25jZSA9ICgpID0+IHtcbiAgICAgICAgaWYgKGdhdGVCYWNrZHJvcERpc21pc3NlZCkgcmV0dXJuO1xuICAgICAgICBnYXRlQmFja2Ryb3BEaXNtaXNzZWQgPSB0cnVlO1xuICAgICAgICBkaXNtaXNzR2F0ZUJhY2tkcm9wKHsgc3VwcHJlc3NSZXR1cm5BbmltYXRpb246IHRydWUgfSk7XG4gICAgICB9O1xuXG4gICAgICBQcm9taXNlLnJlc29sdmUoKVxuICAgICAgICAudGhlbigoKSA9PiBuZXh0Um91dGVSdW50aW1lPy5sb2FkTW9kdWxlPy4oKSkuY2F0Y2goKCkgPT4gdW5kZWZpbmVkKVxuICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgaWYgKHN0YWxlKCkpIHtcbiAgICAgICAgICAgIHJvdXRlUmVhZHlXYWl0ZXIuY2FuY2VsKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghaXNTYW1lUm91dGUgfHwgaGFzUm91dGVDb250ZW50Q2hhbmdlKSB7XG4gICAgICAgICAgICBzZXRSb3V0ZUxheWVyVmlzaWJpbGl0eShmYWxzZSwgc3VyZmFjZVJlZnMpO1xuICAgICAgICAgICAgY29tbWl0KCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiByb3V0ZVJlYWR5O1xuICAgICAgICB9KVxuICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgaWYgKHN0YWxlKCkpIHtcbiAgICAgICAgICAgIHJvdXRlUmVhZHlXYWl0ZXIuY2FuY2VsKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHNldFRyYW5zaXRpb25QaGFzZShUUkFOU0lUSU9OX1BIQVNFUy5ST1VURV9JTik7XG4gICAgICAgICAgc2V0Um91dGVMYXllclZpc2liaWxpdHkodHJ1ZSwgc3VyZmFjZVJlZnMpO1xuICAgICAgICAgIHJlbGVhc2VQb3J0Zm9saW9EZWNrKCdyZWR1Y2VkLW1vdGlvbicpO1xuICAgICAgICAgIGRpc21pc3NQb3J0Zm9saW9HYXRlU2NlbmVCcmlkZ2UoeyBpbnN0YW50OiB0cnVlIH0pO1xuICAgICAgICAgIGRpc21pc3NHYXRlQmFja2Ryb3BPbmNlKCk7XG4gICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfSlcbiAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIGlmIChzdGFsZSgpKSB7XG4gICAgICAgICAgICByb3V0ZVJlYWR5V2FpdGVyLmNhbmNlbCgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBmaW5pc2hUcmFuc2l0aW9uKHRydWUsIGdhdGVCYWNrZHJvcERpc21pc3NlZCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaCgoKSA9PiB7XG4gICAgICAgICAgcm91dGVSZWFkeVdhaXRlci5jYW5jZWwoKTtcbiAgICAgICAgICBpZiAoIXN0YWxlKCkpIHtcbiAgICAgICAgICAgIGZpbmlzaFRyYW5zaXRpb24odHJ1ZSwgZ2F0ZUJhY2tkcm9wRGlzbWlzc2VkKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKiDilIDilIAgc2FtZS1yb3V0ZSBvciByZWR1Y2VkLW1vdGlvbiBub24tZ2F0ZTogaW5zdGFudCBjb21taXQg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAICovXG4gICAgY29tbWl0KCk7XG4gICAgc2V0UGVuZGluZ0FjdGl2ZVJvdXRlSWQobnVsbCk7XG4gICAgc3luY1N0ZWFkeVRyYW5zaXRpb25QaGFzZSgpO1xuICAgIHJldHVybiB0cnVlO1xuICB9LCBbc3VyZmFjZVJlZnMsIHN5bmNTdGVhZHlUcmFuc2l0aW9uUGhhc2VdKTtcblxuICBjb25zdCB0cmFuc2l0aW9uQ3VycmVudFJvdXRlID0gdXNlQ2FsbGJhY2soKHRhc2ssIG9wdGlvbnMgPSB7fSkgPT4ge1xuICAgIGlmICh0cmFuc2l0aW9uQWN0aXZlUmVmLmN1cnJlbnQpIHJldHVybiBmYWxzZTtcblxuICAgIGNvbnN0IGN1cnJlbnRSb3V0ZUlkID0gYWN0aXZlUm91dGVJZFJlZi5jdXJyZW50O1xuICAgIGNvbnN0IHJlZHVjZU1vdGlvbiA9IHdpbmRvdy5tYXRjaE1lZGlhPy4oJyhwcmVmZXJzLXJlZHVjZWQtbW90aW9uOiByZWR1Y2UpJyk/Lm1hdGNoZXMgPz8gZmFsc2U7XG4gICAgY29uc3Qgcm91dGVUaW1pbmdzID0gZ2V0Um91dGVUcmFuc2l0aW9uVGltaW5ncyh7XG4gICAgICBmYWRlTXM6IG9wdGlvbnMuZXhpdE1zLFxuICAgICAgc3RhZ2dlck1zOiBvcHRpb25zLnN0YWdnZXJNcyxcbiAgICAgIHJldmVhbE1zOiBvcHRpb25zLmVudGVyTXMsXG4gICAgICByZWFkeU1zOiBvcHRpb25zLnJlYWR5RmFsbGJhY2tNcyxcbiAgICAgIHJlZHVjZU1vdGlvbixcbiAgICB9KTtcbiAgICBjb25zdCBpc1NpbXVsYXRpb25Gb2N1cyA9IG9wdGlvbnMudHJhbnNpdGlvblN0eWxlID09PSAnc2ltdWxhdGlvbi1mb2N1cyc7XG5cbiAgICBjb25zdCBmaW5pc2hUcmFuc2l0aW9uID0gKCkgPT4ge1xuICAgICAgdHJhbnNpdGlvbkFjdGl2ZVJlZi5jdXJyZW50ID0gZmFsc2U7XG4gICAgICBhY3RpdmVHYXRlVHJhbnNpdGlvblJlZi5jdXJyZW50ID0gZmFsc2U7XG4gICAgICBjb25zdCByZWxlYXNlR2F0ZUJhY2tkcm9wID0gQm9vbGVhbihvcHRpb25zLnJlbGVhc2VHYXRlQmFja2Ryb3BPbkNvbXBsZXRlKTtcbiAgICAgIGZpbmFsaXplVHJhbnNpdGlvbihmYWxzZSwgY3VycmVudFJvdXRlSWQsIHN1cmZhY2VSZWZzLCB7XG4gICAgICAgIHByZXNlcnZlVHJhbnNpdGlvblBoYXNlOiByZWxlYXNlR2F0ZUJhY2tkcm9wLFxuICAgICAgfSk7XG4gICAgICByZXNldFNpbXVsYXRpb25Gb2N1c1RyYW5zaXRpb24oc3VyZmFjZVJlZnMpO1xuICAgICAgaWYgKHJlbGVhc2VHYXRlQmFja2Ryb3ApIHtcbiAgICAgICAgZGlzbWlzc0dhdGVCYWNrZHJvcCh7IGluc3RhbnQ6IGlzU2ltdWxhdGlvbkZvY3VzIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3luY1N0ZWFkeVRyYW5zaXRpb25QaGFzZSgpO1xuICAgICAgfVxuICAgICAgY29uc3QgcXVldWVkID0gcXVldWVkTmF2aWdhdGlvblJlZi5jdXJyZW50O1xuICAgICAgaWYgKCFxdWV1ZWQpIHJldHVybjtcbiAgICAgIHF1ZXVlZE5hdmlnYXRpb25SZWYuY3VycmVudCA9IG51bGw7XG4gICAgICBpZiAoXG4gICAgICAgIHF1ZXVlZC5yb3V0ZUlkID09PSBhY3RpdmVSb3V0ZUlkUmVmLmN1cnJlbnRcbiAgICAgICAgJiYgcXVldWVkLnJvdXRlQ29udGVudFNpZ25hdHVyZSA9PT0gYWN0aXZlUm91dGVDb250ZW50U2lnbmF0dXJlUmVmLmN1cnJlbnRcbiAgICAgICAgJiYgKHF1ZXVlZC5mb2N1c1NpbXVsYXRpb25JZCB8fCAnJykgPT09IGFjdGl2ZUZvY3VzU2ltdWxhdGlvbklkUmVmLmN1cnJlbnRcbiAgICAgICkgcmV0dXJuO1xuICAgICAgc2V0U3RhYmxlVGltZW91dCgoKSA9PiB7XG4gICAgICAgIGlmICghdHJhbnNpdGlvbkFjdGl2ZVJlZi5jdXJyZW50KSBuYXZpZ2F0ZShxdWV1ZWQuaHJlZiwgcXVldWVkLm9wdGlvbnMpO1xuICAgICAgfSwgMCk7XG4gICAgfTtcblxuICAgIGNvbnN0IHJ1blRhc2sgPSAoKSA9PiBQcm9taXNlLnJlc29sdmUoKVxuICAgICAgLnRoZW4oKCkgPT4gKHR5cGVvZiB0YXNrID09PSAnZnVuY3Rpb24nID8gdGFzaygpIDogdW5kZWZpbmVkKSk7XG5cbiAgICBpZiAoaXNTaW11bGF0aW9uRm9jdXMpIHtcbiAgICAgIHRyYW5zaXRpb25BY3RpdmVSZWYuY3VycmVudCA9IHRydWU7XG4gICAgICBhY3RpdmVUcmFuc2l0aW9uQ29tbWl0dGVkUmVmLmN1cnJlbnQgPSBmYWxzZTtcbiAgICAgIHNldExlZ2FjeVJvdXRlVHJhbnNpdGlvbkFjdGl2ZSh0cnVlLCB7IGdhdGU6IGZhbHNlIH0pO1xuICAgICAgc2V0U2ltdWxhdGlvblNoZWxsU3RhYmlsaXR5KHRydWUsIHN1cmZhY2VSZWZzKTtcbiAgICAgIGNvbnN0IHRva2VuID0gKyt0cmFuc2l0aW9uVG9rZW47XG4gICAgICBjb25zdCBzdGFsZSA9ICgpID0+IHRva2VuICE9PSB0cmFuc2l0aW9uVG9rZW47XG4gICAgICBjb25zdCBzaW11bGF0aW9uVGltaW5ncyA9IGdldFNpbXVsYXRpb25Gb2N1c1RpbWluZ3Mob3B0aW9ucywgcmVkdWNlTW90aW9uKTtcbiAgICAgIGxldCB0YXNrRXJyb3IgPSBudWxsO1xuXG4gICAgICBzZXRTaW11bGF0aW9uRm9jdXNUcmFuc2l0aW9uU3RhdGUoJ291dCcpO1xuICAgICAgYW5pbWF0ZVNpbXVsYXRpb25Gb2N1c0xheWVyKHN1cmZhY2VSZWZzLCB7XG4gICAgICAgIGRpcmVjdGlvbjogJ291dCcsXG4gICAgICAgIGR1cmF0aW9uTXM6IHNpbXVsYXRpb25UaW1pbmdzLmV4aXQsXG4gICAgICAgIGxvY2FsRHVyYXRpb25Nczogc2ltdWxhdGlvblRpbWluZ3MuZXhpdExvY2FsLFxuICAgICAgICBlYXNpbmc6IHNpbXVsYXRpb25UaW1pbmdzLmV4aXRFYXNpbmcsXG4gICAgICB9KVxuICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgaWYgKHN0YWxlKCkpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgc2V0U2ltdWxhdGlvbkZvY3VzVHJhbnNpdGlvblN0YXRlKCdob2xkJyk7XG4gICAgICAgICAgcmV0dXJuIHdhaXRGb3JTaW11bGF0aW9uRm9jdXNIb2xkKHNpbXVsYXRpb25UaW1pbmdzLmhvbGQpO1xuICAgICAgICB9KVxuICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgaWYgKHN0YWxlKCkpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgcmVjb3JkU2ltdWxhdGlvblZpc3VhbFRyYW5zaXRpb25FdmVudCgnY29tbWl0JywgeyByb3V0ZUlkOiBjdXJyZW50Um91dGVJZCB9KTtcbiAgICAgICAgICByZXR1cm4gcnVuVGFzaygpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goKGVycm9yKSA9PiB7XG4gICAgICAgICAgdGFza0Vycm9yID0gZXJyb3I7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIG9wdGlvbnMub25GYWlsdXJlPy4oZXJyb3IpO1xuICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgLy8gRmFpbHVyZSByZXBvcnRpbmcgbXVzdCBub3QgcHJldmVudCB0aGUgY3VycmVudCBzY2VuZSByZXR1cm5pbmcuXG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgaWYgKHN0YWxlKCkpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgc2V0U2ltdWxhdGlvblNoZWxsU3RhYmlsaXR5KHRydWUsIHN1cmZhY2VSZWZzKTtcbiAgICAgICAgICByZWNvcmRTaW11bGF0aW9uVmlzdWFsVHJhbnNpdGlvbkV2ZW50KHRhc2tFcnJvciA/ICdydW50aW1lLWZhaWxlZCcgOiAncnVudGltZS1yZWFkeScsIHtcbiAgICAgICAgICAgIHJvdXRlSWQ6IGN1cnJlbnRSb3V0ZUlkLFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHNldFNpbXVsYXRpb25Gb2N1c1RyYW5zaXRpb25TdGF0ZSgnaW4nKTtcbiAgICAgICAgICByZXR1cm4gYW5pbWF0ZVNpbXVsYXRpb25Gb2N1c0xheWVyKHN1cmZhY2VSZWZzLCB7XG4gICAgICAgICAgICBkaXJlY3Rpb246ICdpbicsXG4gICAgICAgICAgICBkdXJhdGlvbk1zOiBzaW11bGF0aW9uVGltaW5ncy5lbnRlcixcbiAgICAgICAgICAgIGxvY2FsRHVyYXRpb25Nczogc2ltdWxhdGlvblRpbWluZ3MuZW50ZXJMb2NhbCxcbiAgICAgICAgICAgIGVhc2luZzogc2ltdWxhdGlvblRpbWluZ3MuZW50ZXJFYXNpbmcsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICBpZiAoIXN0YWxlKCkpIHtcbiAgICAgICAgICAgIGZpbmlzaFRyYW5zaXRpb24oKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaCgoKSA9PiB7XG4gICAgICAgICAgaWYgKCFzdGFsZSgpKSB7XG4gICAgICAgICAgICBmaW5pc2hUcmFuc2l0aW9uKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgaWYgKHJlZHVjZU1vdGlvbikge1xuICAgICAgdHJhbnNpdGlvbkFjdGl2ZVJlZi5jdXJyZW50ID0gdHJ1ZTtcbiAgICAgIGFjdGl2ZVRyYW5zaXRpb25Db21taXR0ZWRSZWYuY3VycmVudCA9IGZhbHNlO1xuICAgICAgc2V0TGVnYWN5Um91dGVUcmFuc2l0aW9uQWN0aXZlKHRydWUsIHsgZ2F0ZTogZmFsc2UgfSk7XG4gICAgICBzZXRUcmFuc2l0aW9uUGhhc2UoVFJBTlNJVElPTl9QSEFTRVMuUk9VVEVfT1VUKTtcbiAgICAgIHJ1blRhc2soKVxuICAgICAgICAuY2F0Y2goKCkgPT4gdW5kZWZpbmVkKVxuICAgICAgICAudGhlbihmaW5pc2hUcmFuc2l0aW9uKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHRyYW5zaXRpb25BY3RpdmVSZWYuY3VycmVudCA9IHRydWU7XG4gICAgYWN0aXZlVHJhbnNpdGlvbkNvbW1pdHRlZFJlZi5jdXJyZW50ID0gZmFsc2U7XG4gICAgc2V0TGVnYWN5Um91dGVUcmFuc2l0aW9uQWN0aXZlKHRydWUsIHsgZ2F0ZTogZmFsc2UgfSk7XG4gICAgc2V0VHJhbnNpdGlvblBoYXNlKFRSQU5TSVRJT05fUEhBU0VTLlJPVVRFX09VVCk7XG5cbiAgICBjb25zdCB0b2tlbiA9ICsrdHJhbnNpdGlvblRva2VuO1xuICAgIGNvbnN0IHN0YWxlID0gKCkgPT4gdG9rZW4gIT09IHRyYW5zaXRpb25Ub2tlbjtcblxuICAgIGZhZGVPdXRDb250ZW50KHJvdXRlVGltaW5ncy5mYWRlT3V0LCByb3V0ZVRpbWluZ3MuZmFkZUVhc2luZywgc3VyZmFjZVJlZnMsIHsgZmluYWxPcGFjaXR5OiAwLjA4IH0pXG4gICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgIGlmIChzdGFsZSgpKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICBzZXRSb3V0ZUxheWVyVmlzaWJpbGl0eShmYWxzZSwgc3VyZmFjZVJlZnMpO1xuICAgICAgICByZXR1cm4gcnVuVGFzaygpO1xuICAgICAgfSlcbiAgICAgIC5jYXRjaCgoKSA9PiB1bmRlZmluZWQpXG4gICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgIGlmIChzdGFsZSgpKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICBzZXRUcmFuc2l0aW9uUGhhc2UoVFJBTlNJVElPTl9QSEFTRVMuUk9VVEVfSU4pO1xuICAgICAgICByZXR1cm4gc3RhZ2dlcmVkRW50cmFuY2Uoe1xuICAgICAgICAgIHJvdXRlSWQ6IGN1cnJlbnRSb3V0ZUlkLFxuICAgICAgICAgIHN1cmZhY2VSZWZzLFxuICAgICAgICAgIGVudGVyTXM6IHJvdXRlVGltaW5ncy5yZXZlYWwsXG4gICAgICAgICAgcmV2ZWFsRWFzaW5nOiByb3V0ZVRpbWluZ3MucmV2ZWFsRWFzaW5nLFxuICAgICAgICB9KTtcbiAgICAgIH0pXG4gICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgIGlmICghc3RhbGUoKSkge1xuICAgICAgICAgIGZpbmlzaFRyYW5zaXRpb24oKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5jYXRjaCgoKSA9PiB7XG4gICAgICAgIGlmICghc3RhbGUoKSkge1xuICAgICAgICAgIGZpbmlzaFRyYW5zaXRpb24oKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSwgW25hdmlnYXRlLCBzdXJmYWNlUmVmcywgc3luY1N0ZWFkeVRyYW5zaXRpb25QaGFzZV0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiBpbnN0YWxsU3BhTmF2aWdhdGlvbkJyaWRnZShuYXZpZ2F0ZSksIFtuYXZpZ2F0ZV0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiBpbnN0YWxsVHJhbnNpdGlvblBoYXNlT2JzZXJ2ZXIoe1xuICAgIHJvb3Q6IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCxcbiAgICBpc1JvdXRlVHJhbnNpdGlvbkFjdGl2ZTogKCkgPT4gdHJhbnNpdGlvbkFjdGl2ZVJlZi5jdXJyZW50LFxuICB9KSwgW10pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKCFpbXBvcnQubWV0YS5lbnY/LkRFVikgcmV0dXJuICgpID0+IHt9O1xuICAgIHJldHVybiBpbnN0YWxsVHJhbnNpdGlvbk93bmVyc2hpcEd1YXJkKHtcbiAgICAgIHJvb3Q6IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCxcbiAgICB9KTtcbiAgfSwgW10pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgY29uc3Qgb25Nb2RhbE9wZW4gPSAoKSA9PiB7XG4gICAgICBpZiAodHJhbnNpdGlvbkFjdGl2ZVJlZi5jdXJyZW50KSByZXR1cm47XG4gICAgICBzZXRUcmFuc2l0aW9uUGhhc2UoVFJBTlNJVElPTl9QSEFTRVMuTU9EQUxfT1BFTik7XG4gICAgfTtcbiAgICBjb25zdCBvbk1vZGFsQ2xvc2UgPSAoZXZlbnQpID0+IHtcbiAgICAgIGlmICh0cmFuc2l0aW9uQWN0aXZlUmVmLmN1cnJlbnQpIHJldHVybjtcbiAgICAgIHNldFRyYW5zaXRpb25QaGFzZShUUkFOU0lUSU9OX1BIQVNFUy5JRExFLCB7XG4gICAgICAgIHJldHVybmluZzogIWV2ZW50Py5kZXRhaWw/LnN1cHByZXNzUmV0dXJuQW5pbWF0aW9uLFxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdhYnM6dHJhbnNpdGlvbi1tb2RhbC1vcGVuJywgb25Nb2RhbE9wZW4pO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdhYnM6dHJhbnNpdGlvbi1tb2RhbC1jbG9zZScsIG9uTW9kYWxDbG9zZSk7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdhYnM6dHJhbnNpdGlvbi1tb2RhbC1vcGVuJywgb25Nb2RhbE9wZW4pO1xuICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Ficzp0cmFuc2l0aW9uLW1vZGFsLWNsb3NlJywgb25Nb2RhbENsb3NlKTtcbiAgICB9O1xuICB9LCBbXSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCBoYW5kbGVQb3BTdGF0ZSA9ICgpID0+IHtcbiAgICAgIGNvbnN0IG5leHRIcmVmID0gd2luZG93LmxvY2F0aW9uLmhyZWY7XG4gICAgICBjb25zdCBuZXh0U3RhdGUgPSBjb21wdXRlUm91dGVTdGF0ZShuZXh0SHJlZik7XG4gICAgICBjb25zdCBpc1NhbWVSb3V0ZSA9IG5leHRTdGF0ZS5yb3V0ZS5pZCA9PT0gYWN0aXZlUm91dGVJZFJlZi5jdXJyZW50O1xuICAgICAgY29uc3Qgd2FzR2F0ZVRyYW5zaXRpb24gPSBhY3RpdmVHYXRlVHJhbnNpdGlvblJlZi5jdXJyZW50O1xuICAgICAgY29uc3Qgd2FzVHJhbnNpdGlvbkFjdGl2ZSA9IHRyYW5zaXRpb25BY3RpdmVSZWYuY3VycmVudDtcbiAgICAgIGNvbnN0IHdhc1NpbXVsYXRpb25Gb2N1c1RyYW5zaXRpb24gPSBCb29sZWFuKFxuICAgICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuZGF0YXNldC5hYnNTaW11bGF0aW9uRm9jdXNUcmFuc2l0aW9uXG4gICAgICApO1xuXG4gICAgICArK3RyYW5zaXRpb25Ub2tlbjtcbiAgICAgIHF1ZXVlZE5hdmlnYXRpb25SZWYuY3VycmVudCA9IG51bGw7XG4gICAgICBpZiAod2FzVHJhbnNpdGlvbkFjdGl2ZSB8fCB3YXNHYXRlVHJhbnNpdGlvbikge1xuICAgICAgICBpbnRlcnJ1cHRUcmFuc2l0aW9uRm9yUG9wc3RhdGUod2FzR2F0ZVRyYW5zaXRpb24sIGFjdGl2ZVJvdXRlSWRSZWYuY3VycmVudCwgc3VyZmFjZVJlZnMpO1xuICAgICAgfVxuICAgICAgYWN0aXZlUm91dGVSZWFkeUNhbmNlbFJlZi5jdXJyZW50Py4oKTtcbiAgICAgIGFjdGl2ZVJvdXRlUmVhZHlDYW5jZWxSZWYuY3VycmVudCA9IG51bGw7XG4gICAgICB0cmFuc2l0aW9uQWN0aXZlUmVmLmN1cnJlbnQgPSBmYWxzZTtcbiAgICAgIGFjdGl2ZUdhdGVUcmFuc2l0aW9uUmVmLmN1cnJlbnQgPSBmYWxzZTtcbiAgICAgIHNldFBlbmRpbmdBY3RpdmVSb3V0ZUlkKG51bGwpO1xuICAgICAgaWYgKHdhc1NpbXVsYXRpb25Gb2N1c1RyYW5zaXRpb24pIHtcbiAgICAgICAgcmVzZXRTaW11bGF0aW9uRm9jdXNUcmFuc2l0aW9uKHN1cmZhY2VSZWZzLCB7IGRpc2NhcmRTbmFwc2hvdHM6IHRydWUgfSk7XG4gICAgICAgIGRpc21pc3NHYXRlQmFja2Ryb3AoeyBzdXBwcmVzc1JldHVybkFuaW1hdGlvbjogdHJ1ZSwgaW5zdGFudDogdHJ1ZSB9KTtcbiAgICAgIH1cbiAgICAgIGlmIChpc1NhbWVSb3V0ZSkge1xuICAgICAgICBzZXRSb3V0ZUxheWVyVmlzaWJpbGl0eSh0cnVlLCBzdXJmYWNlUmVmcyk7XG4gICAgICAgIHNldFJvdXRlU3RhdGUobmV4dFN0YXRlKTtcbiAgICAgICAgYWN0aXZlUm91dGVTdGF0ZVJlZi5jdXJyZW50ID0gbmV4dFN0YXRlO1xuICAgICAgICBhY3RpdmVSb3V0ZUlkUmVmLmN1cnJlbnQgPSBuZXh0U3RhdGUucm91dGUuaWQ7XG4gICAgICAgIGFjdGl2ZVJvdXRlQ29udGVudFNpZ25hdHVyZVJlZi5jdXJyZW50ID0gcmVhZFJvdXRlQ29udGVudFNpZ25hdHVyZShuZXh0U3RhdGUpO1xuICAgICAgICBhY3RpdmVGb2N1c1NpbXVsYXRpb25JZFJlZi5jdXJyZW50ID0gcmVhZFJvdXRlU3RhdGVTaW11bGF0aW9uRm9jdXNJZChuZXh0U3RhdGUpO1xuICAgICAgICBzeW5jU3RlYWR5VHJhbnNpdGlvblBoYXNlKCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHNldFN0YWJsZVRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBuYXZpZ2F0ZShuZXh0SHJlZiwgeyByZXBsYWNlOiB0cnVlIH0pO1xuICAgICAgfSwgMCk7XG4gICAgfTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCBoYW5kbGVQb3BTdGF0ZSk7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIGhhbmRsZVBvcFN0YXRlKTtcbiAgICAgIGNvbnN0IHdhc1NpbXVsYXRpb25Gb2N1c1RyYW5zaXRpb24gPSBCb29sZWFuKFxuICAgICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuZGF0YXNldC5hYnNTaW11bGF0aW9uRm9jdXNUcmFuc2l0aW9uXG4gICAgICApO1xuICAgICAgaWYgKHRyYW5zaXRpb25BY3RpdmVSZWYuY3VycmVudCkge1xuICAgICAgICArK3RyYW5zaXRpb25Ub2tlbjtcbiAgICAgICAgcXVldWVkTmF2aWdhdGlvblJlZi5jdXJyZW50ID0gbnVsbDtcbiAgICAgICAgYWN0aXZlUm91dGVSZWFkeUNhbmNlbFJlZi5jdXJyZW50Py4oKTtcbiAgICAgICAgYWN0aXZlUm91dGVSZWFkeUNhbmNlbFJlZi5jdXJyZW50ID0gbnVsbDtcbiAgICAgICAgZmluYWxpemVUcmFuc2l0aW9uKGFjdGl2ZUdhdGVUcmFuc2l0aW9uUmVmLmN1cnJlbnQsIGFjdGl2ZVJvdXRlSWRSZWYuY3VycmVudCwgc3VyZmFjZVJlZnMpO1xuICAgICAgICB0cmFuc2l0aW9uQWN0aXZlUmVmLmN1cnJlbnQgPSBmYWxzZTtcbiAgICAgICAgYWN0aXZlR2F0ZVRyYW5zaXRpb25SZWYuY3VycmVudCA9IGZhbHNlO1xuICAgICAgICBzZXRQZW5kaW5nQWN0aXZlUm91dGVJZChudWxsKTtcbiAgICAgICAgc3luY1N0ZWFkeVRyYW5zaXRpb25QaGFzZSgpO1xuICAgICAgfVxuICAgICAgaWYgKHdhc1NpbXVsYXRpb25Gb2N1c1RyYW5zaXRpb24pIHtcbiAgICAgICAgcmVzZXRTaW11bGF0aW9uRm9jdXNUcmFuc2l0aW9uKHN1cmZhY2VSZWZzLCB7IGRpc2NhcmRTbmFwc2hvdHM6IHRydWUgfSk7XG4gICAgICAgIGRpc21pc3NHYXRlQmFja2Ryb3AoeyBzdXBwcmVzc1JldHVybkFuaW1hdGlvbjogdHJ1ZSwgaW5zdGFudDogdHJ1ZSB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9LCBbbmF2aWdhdGUsIHN1cmZhY2VSZWZzLCBzeW5jU3RlYWR5VHJhbnNpdGlvblBoYXNlXSk7XG5cbiAgdXNlTGF5b3V0RWZmZWN0KCgpID0+IHtcbiAgICBnZXRSb3V0ZVJ1bnRpbWVSZWYuY3VycmVudCA9IGdldFJvdXRlUnVudGltZTtcbiAgfSwgW2dldFJvdXRlUnVudGltZV0pO1xuXG4gIHVzZUxheW91dEVmZmVjdCgoKSA9PiB7XG4gICAgYWN0aXZlUm91dGVJZFJlZi5jdXJyZW50ID0gcm91dGVTdGF0ZS5yb3V0ZS5pZDtcbiAgICBhY3RpdmVSb3V0ZUNvbnRlbnRTaWduYXR1cmVSZWYuY3VycmVudCA9IHJlYWRSb3V0ZUNvbnRlbnRTaWduYXR1cmUocm91dGVTdGF0ZSk7XG4gICAgYWN0aXZlRm9jdXNTaW11bGF0aW9uSWRSZWYuY3VycmVudCA9IHJlYWRSb3V0ZVN0YXRlU2ltdWxhdGlvbkZvY3VzSWQocm91dGVTdGF0ZSk7XG4gIH0sIFtyb3V0ZVN0YXRlXSk7XG5cbiAgdXNlTGF5b3V0RWZmZWN0KCgpID0+IHtcbiAgICBpZiAoIXRyYW5zaXRpb25BY3RpdmVSZWYuY3VycmVudCkge1xuICAgICAgc3luY1N0ZWFkeVRyYW5zaXRpb25QaGFzZSgpO1xuICAgIH1cbiAgfSwgW3JvdXRlU3RhdGUucm91dGUuaWQsIHN5bmNTdGVhZHlUcmFuc2l0aW9uUGhhc2VdKTtcblxuICB1c2VMYXlvdXRFZmZlY3QoKCkgPT4ge1xuICAgIGlmIChnbG9iYWxUaGlzLl9fQUJTX1JPVVRFX1BFUkZfQVVESVRfXyA9PT0gdHJ1ZSkgcmV0dXJuO1xuICAgIGNvbnN0IHNpbXVsYXRpb25JZCA9IHJvdXRlU3RhdGUuZm9jdXNTaW11bGF0aW9uSWQgfHwgcm91dGVTdGF0ZS5kYWlseUZvY3VzUm91dGVJZCB8fCAnJztcbiAgICBjb25zdCBjdXJyZW50SHJlZiA9IGAke3dpbmRvdy5sb2NhdGlvbi5wYXRobmFtZX0ke3dpbmRvdy5sb2NhdGlvbi5zZWFyY2h9JHt3aW5kb3cubG9jYXRpb24uaGFzaH1gO1xuICAgIGlmIChjdXJyZW50SHJlZiAhPT0gcm91dGVTdGF0ZS5jYW5vbmljYWxIcmVmKSB7XG4gICAgICB3aW5kb3cuaGlzdG9yeS5yZXBsYWNlU3RhdGUod2luZG93Lmhpc3Rvcnkuc3RhdGUgfHwge30sICcnLCByb3V0ZVN0YXRlLmNhbm9uaWNhbEhyZWYpO1xuICAgIH1cbiAgICBpZiAoIXNpbXVsYXRpb25JZCkgcmV0dXJuO1xuICAgIHdyaXRlTWFudWFsU2ltdWxhdGlvbkZvY3VzKHNpbXVsYXRpb25JZCk7XG4gIH0sIFtyb3V0ZVN0YXRlLmNhbm9uaWNhbEhyZWYsIHJvdXRlU3RhdGUuZGFpbHlGb2N1c1JvdXRlSWQsIHJvdXRlU3RhdGUuZm9jdXNTaW11bGF0aW9uSWRdKTtcblxuICBjb25zdCByb3V0ZVZpZXcgPSB1c2VNZW1vKCgpID0+IGdldFJvdXRlVmlldyhyb3V0ZVN0YXRlLnJvdXRlLmlkLCByb3V0ZVN0YXRlLmNhbm9uaWNhbEhyZWYsIHJvdXRlU3RhdGUpLCBbXG4gICAgZ2V0Um91dGVWaWV3LFxuICAgIHJvdXRlU3RhdGUsXG4gIF0pO1xuICBjb25zdCByb3V0ZVJ1bnRpbWUgPSB1c2VNZW1vKCgpID0+IGdldFJvdXRlUnVudGltZShyb3V0ZVN0YXRlLnJvdXRlLmlkLCByb3V0ZVN0YXRlLmNhbm9uaWNhbEhyZWYsIHJvdXRlU3RhdGUpLCBbXG4gICAgZ2V0Um91dGVSdW50aW1lLFxuICAgIHJvdXRlU3RhdGUsXG4gIF0pO1xuXG4gIHJldHVybiB7XG4gICAgcm91dGVTdGF0ZSxcbiAgICBhY3RpdmVSb3V0ZUlkOiBwZW5kaW5nQWN0aXZlUm91dGVJZCB8fCByb3V0ZVN0YXRlLnJvdXRlLmlkLFxuICAgIHJvdXRlUnVudGltZSxcbiAgICByb3V0ZVZpZXcsXG4gICAgdHJhbnNpdGlvbkN1cnJlbnRSb3V0ZSxcbiAgfTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxD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O0FBRXJDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pGLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUNULENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVwRixRQUFRLENBQUMseUJBQXlCLENBQUMsWUFB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QUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDYjs7QUFFQSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqRixDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO0FBQ3JCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQU87QUFDcEYsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRTs7QUFFcEUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU87QUFDbEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSTs7QUFFOUYsQ0FBQyxDQUFDLENBQUMsVUFBVTtBQUNiLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEtBQUs7QUFDbkUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQztBQUNuRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsU0FBUztBQUN2RixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFcEYsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRztBQUN2QixLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0IsS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxHQUFHO0FBQzdCLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqRCxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEdBQUc7QUFDN0IsS0FBSyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQ2xDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDakQsS0FBSyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxHQUFHO0FBQ2hDLEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUMsR0FBRztBQUN4QyxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO0FBQzNCLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNaLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUNkLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRTtBQUNkLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRztBQUNuQixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUk7QUFDZixDQUFDLENBQUMsQ0FBQztBQUNILENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNWLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRTtBQUNmLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRTtBQUNkLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRztBQUNuQixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUk7QUFDZixDQUFDLENBQUMsQ0FBQztBQUNILENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUNYLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRztBQUNoQixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUU7QUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUc7QUFDbkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJO0FBQ2YsQ0FBQyxDQUFDLENBQUM7QUFDSCxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDVixDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUc7QUFDaEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFO0FBQ2QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxHQUFHO0FBQ25CLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSztBQUNoQixDQUFDLENBQUMsQ0FBQztBQUNILENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNWLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRztBQUNoQixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUU7QUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUc7QUFDbkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJO0FBQ2YsQ0FBQyxDQUFDLENBQUM7QUFDSCxDQUFDO0FBQ0QsS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxHQUFHO0FBQ3BDLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUMsR0FBRztBQUNyQyxLQUFLLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDeEMsS0FBSyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxHQUFHO0FBQzFDLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLENBQUMsR0FBRztBQUMzQyxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNyRSxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hFLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQztBQUNwQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO0FBQ2QsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUM7QUFDbEIsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQztBQUNsQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO0FBQ2QsQ0FBQyxDQUFDOztBQUVGLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkIsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRXpCLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDcEMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3hGLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7QUFDeEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUTtBQUNoRCxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLO0FBQ3RDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUM1QyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLO0FBQ2hCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQ1YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUTtBQUNuQixDQUFDLENBQUM7QUFDRjs7QUFFQSxRQUFRLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ3hDLENBQUMsQ0FBQyxHQUFHLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN4RixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUTtBQUMxQixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUNWLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVE7QUFDbkIsQ0FBQyxDQUFDO0FBQ0Y7O0FBRUEsUUFBUSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQzVDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQztBQUN6QyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUTtBQUNwRDs7QUFFQSxRQUFRLENBQUMseUJBQXlCLENBQUM7QUFDbkMsQ0FBQyxDQUFDLE1BQU07QUFDUixDQUFDLENBQUMsU0FBUztBQUNYLENBQUMsQ0FBQyxRQUFRO0FBQ1YsQ0FBQyxDQUFDLE9BQU87QUFDVCxDQUFDLENBQUMsWUFBWTtBQUNkLENBQUMsQ0FBQyxDQUFDO0FBQ0gsQ0FBQyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDMUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDekcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUNoSCxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUMsaUJBQWlCLENBQUM7QUFDckUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO0FBQy9ELENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQzs7QUFFOUQsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO0FBQ1gsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRztBQUNsQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQ2hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUc7QUFDakIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsYUFBYTtBQUMxQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZO0FBQ2xCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVU7QUFDaEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDOztBQUVGLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDLFlBQVksQ0FBQztBQUNwRCxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxDQUFDLGVBQWUsQ0FBQztBQUMxRCxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDLGNBQWMsQ0FBQztBQUN2RCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGFBQWE7QUFDeEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZO0FBQ2hCLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVTtBQUNkLENBQUMsQ0FBQyxDQUFDO0FBQ0g7O0FBRUEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRS9FLFFBQVEsQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUN0RCxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxPQUFPO0FBQ3BELENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsTUFBTSxDQUFDLElBQUk7QUFDcEMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4QyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM3RCxDQUFDLENBQUM7QUFDRixDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUM7QUFDakQ7O0FBRUEsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ3ZDLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMvRCxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMvRCxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ3hELENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3BGLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQzdGLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3BGLENBQUMsQ0FBQyxDQUFDO0FBQ0g7O0FBRUEsUUFBUSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3ZDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsZUFBZTtBQUN2QyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDYixDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDMUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQ1YsQ0FBQyxDQUFDO0FBQ0YsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQjtBQUN2Qzs7QUFFQSxRQUFRLENBQUMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDdkQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDO0FBQ3pFLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU87QUFDekIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25DLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzQyxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRTVDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xELENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNO0FBQ25CLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDaEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU87QUFDaEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFVBQVU7QUFDdEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLGFBQWE7QUFDNUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ1gsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUN4QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQzNDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQy9DLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0o7O0FBRUEsUUFBUSxDQUFDLHlCQUF5QixDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ2hELENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQzs7QUFFekUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU07QUFDbkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3pDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ25DLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsTUFBTSxDQUFDO0FBQ3RELENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRUosQ0FBQyxDQUFDLHNCQUFzQixDQUFDLENBQUM7QUFDMUI7O0FBRUEsUUFBUSxDQUFDLG1DQUFtQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQzFFLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNyQixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDakMsQ0FBQyxDQUFDLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQyxXQUFXLENBQUM7QUFDMUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDO0FBQ3RDLENBQUMsQ0FBQyxDQUFDOztBQUVILENBQUMsQ0FBQyxNQUFNLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDO0FBQ3BDOztBQUVBLFFBQVEsQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUMxRCxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDO0FBQ2hELENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDeEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPO0FBQ1gsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQzNDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRUosQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztBQUMvQixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUNYLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMxQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUM1QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDUixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLENBQUMsQ0FBQztBQUN4QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMzQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNoRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDUixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUM7O0FBRUYsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUMxQixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUNYLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMxQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUM1QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMvQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDUixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLENBQUMsQ0FBQztBQUN4QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMzQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDUixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUM7O0FBRUYsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUNULENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDMUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUM3QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLHVCQUF1QixDQUFDLENBQUM7QUFDdEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN6QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ04sQ0FBQyxDQUFDLENBQUM7QUFDSDs7QUFFQSxRQUFRLENBQUMseUJBQXlCLENBQUMsT0FBTyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDekQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLDBCQUEwQixDQUFDLE9BQU8sQ0FBQyxDQUFDLFdBQVcsQ0FBQztBQUNqRSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3hCLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1QixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQ2hELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztBQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztBQUN0QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUs7QUFDZDs7QUFFQSxRQUFRLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDO0FBQ2hDLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUN0RyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7QUFDN0csQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0FBQy9HLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xGLENBQUMsQ0FBQyxDQUFDO0FBQ0g7O0FBRUEsUUFBUSxDQUFDLHdCQUF3QixDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsT0FBTztBQUNwRTs7QUFFQSxRQUFRLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDNUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0RixDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDakQsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVE7QUFDcEQ7O0FBRUEsUUFBUSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQzNDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQztBQUN6RSxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDO0FBQ3BFLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDeEIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwQixDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDOztBQUUvQixDQUFDLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7QUFDdkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMvRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6RSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRUwsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDckMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7QUFDbEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDdEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQztBQUMzRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLEtBQUssQ0FBQztBQUNwRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztBQUNuQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUNWLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLO0FBQ2IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDYixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7QUFDekQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVO0FBQ3JDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZO0FBQ3BCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUs7QUFDNUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVKLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDcEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkIsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKOztBQUVBLFFBQVEsQ0FBQyx5QkFBeUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQzlELENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNyQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUNoQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxQixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUN0RCxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztBQUN6QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMzRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ25DLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsTUFBTSxDQUFDO0FBQ3RELENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSjs7QUFFQSxRQUFRLENBQUMscUJBQXFCLENBQUMsT0FBTyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUMxRCxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7QUFDMUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO0FBQ3ZFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztBQUN6RSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7QUFDdEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoQixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pELENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25DLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDakMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKOztBQUVBLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRS9FLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3hELENBQUMsQ0FBQyxHQUFHLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQztBQUM5QyxDQUFDLENBQUMsQ0FBQyxDQUFDLDZCQUE2QixDQUFDLENBQUM7QUFDbkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUM1RCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ2xFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDakIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ2xELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNSLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDN0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ25ELENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUM3QyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDaEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzlFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVztBQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztBQUNyRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDUixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3RELENBQUMs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QUUsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3hCLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4RCxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4QixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMvQixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKOztBQUVBLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFL0UsUUFBUSxDQUFDLGtCQUFrQjtBQUMzQixDQUFDLENBQUMsTUFBTTtBQUNSLENBQUMsQ0FBQyxPQUFPO0FBQ1QsQ0FBQyxDQUFDLFdBQVc7QUFDYixDQUFDLENBQUM7QUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxLQUFLO0FBQ25DLENBQUMsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDakMsQ0FBQyxDQUFDLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsS0FBSztBQUNuQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDO0FBQ0YsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLENBQUM7QUFDMUIsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxDQUFDLFdBQVcsQ0FBQztBQUMzQyxDQUFDLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLENBQUMsV0FBVyxDQUFDO0FBQzVDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0FBQ3hDLENBQUMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQztBQUNwRCxDQUFDLENBQUM7QUFDRixDQUFDLENBQUMsK0JBQStCLENBQUMsQ0FBQztBQUNuQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0FBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDO0FBQzlDLENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUM7O0FBRTlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU07QUFDM0IsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDO0FBQzdFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3hFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3hFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ2xFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQzlFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3ZGLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RELENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNO0FBQ25CLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUN6QyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUN4QyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7QUFD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QUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsRCxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTTtBQUNuQixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQzVCLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7QUFDaEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztBQUMxQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQztBQUM3QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDM0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUN2RSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQ1osQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU87QUFDM0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxZQUFZO0FBQy9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDckQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDakUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDdkQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO0FBQy9CLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7QUFDcEIsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFSixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7O0FBRWxELENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUc7QUFDcEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDekIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU07QUFDM0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUN0QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDWCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUN6QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQ3pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQy9DLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ04sQ0FBQyxDQUFDLENBQUM7QUFDSDs7QUFFQSxRQUFRLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDO0FBQzFDLENBQUMsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDeEU7O0FBRUEsUUFBUSxDQUFDLCtCQUErQixDQUFDO0FBQ3pDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLGlCQUFpQjtBQUNoQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2IsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUTtBQUNuQixDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLO0FBQ2pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNSLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUM3RSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNO0FBQ3JCLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7QUFDdkQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDbkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQ1YsQ0FBQyxDQUFDOztBQUVGLENBQUMsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUM3RSxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMvRSxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQztBQUNuRCxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDaEUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7QUFDakMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JILENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqRCxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUYsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUM7QUFDbEMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDckIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTTtBQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUNsQixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNuQixDQUFDLENBQUMsQ0FBQztBQUNILENBQUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQzdCLENBQUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQzdCLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUN4Qzs7QUFFQSxRQUFRLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ25ELENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsZUFBZTtBQUN2QyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUMxQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLFVBQVU7QUFDaEUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUMvRCxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNsQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTDs7QUFFQSxRQUFRLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDO0FBQ3JDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsa0JBQWtCO0FBQzVEOztBQUVBLFFBQVEsQ0FBQyxpQ0FBaUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNsRCxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGVBQWU7QUFDdkMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ2IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLDRCQUE0QixDQUFDLENBQUMsQ0FBQyxLQUFLO0FBQ3JELENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLG1DQUFtQyxDQUFDLENBQUMsQ0FBQztBQUNqRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLO0FBQ2xCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNsQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDVixDQUFDLENBQUM7O0FBRUYsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLDRCQUE0QjtBQUNsRCxDQUFDLENBQUMsTUFBTSxDQUFDLG1DQUFtQyxDQUFDLENBQUMsQ0FBQztBQUMvQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ2pCLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2hDLENBQUMsQ0FBQyxDQUFDO0FBQ0g7O0FBRUEsUUFBUSxDQUFDLDJCQUEyQixDQUFDLE1BQU0sQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4RSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGVBQWU7QUFDdkMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDO0FBQy9FLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqRCxDQUFDLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLENBQUM7O0FBRTlELENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ2YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyx3QkFBd0I7QUFDaEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyx5QkFBeUI7QUFDakQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNO0FBQ3JCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDeEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUMzQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUMvQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUNsQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUNWLENBQUMsQ0FBQzs7QUFFRixDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDaEQsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUMsWUFBWTtBQUN6RCxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUNULENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMseUJBQXlCO0FBQ2pELENBQUMsQ0FBQzs7QUFFRixDQUFDLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNO0FBQ25CLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzFCLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUN6QyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNyQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUNoQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0o7O0FBRUEsUUFBUSxDQUFDLHVDQUF1QyxDQUFDLGNBQWMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQzlFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDO0FBQy9FLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBQ1g7O0FBRUEsUUFBUSxDQUFDLHVCQUF1QixDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQzlDLENBQUMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSTtBQUMzQzs7QUFFQSxRQUFRLENBQUMsMkJBQTJCLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDbEQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLFdBQVcsQ0FBQztBQUNwRCxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNO0FBQ3BCLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ3pDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNoRCxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDM0MsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDdkMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDdEMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzlDOztBQUVBLFFBQVEsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLENBQUM7QUFDaEQsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBQ2hHOztBQUVBLFFBQVEsQ0FBQyw4QkFBOEIsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDeEYsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLFdBQVcsQ0FBQztBQUMxQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUN4QixDQUFDLENBQUMsQ0FBQyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7QUFDMUMsQ0FBQyxDQUFDO0FBQ0YsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLEtBQUssQ0FBQyxDQUFDLFdBQVcsQ0FBQztBQUNqRCxDQUFDLENBQUMsaUNBQWlDLENBQUMsSUFBSSxDQUFDO0FBQ3pDOztBQUVBLFFBQVEsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLENBQUM7QUFDaEQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUNyRCxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUNoRCxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJOztBQUVsRixDQUFDLENBQUMsb0NBQW9DLENBQUMsQ0FBQztBQUN4QyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzRSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ25ELENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDO0FBQ3hELENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7QUFDckMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUN2RSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3pFLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7QUFDNUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztBQUMxQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO0FBQzlDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7O0FBRWhELENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDM0MsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDbkUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ04sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDeEIsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNyQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQztBQUMxQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0FBQy9DLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDeEcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUNqRCxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUNSLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVM7QUFDdkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVU7QUFDaEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVO0FBQzlDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMs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QUFDLE9BQU8sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3hFOztBQUVBLFFBQVEsQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzVDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0FBQzNGLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM1QixDQUFDLENBQUM7O0FBRUYsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUN0QyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDakIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUM7QUFDeEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDO0FBQ3RDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSjs7QUFFQSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFaEYsUUFBUSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQztBQUNoQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLO0FBQzNCLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdEMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2QyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSztBQUMxQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZELENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5QyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUN0RDs7QUFFQSxRQUFRLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzVCLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNEOztBQUVBLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUN4RCxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSztBQUN4RSxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN6SCxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUMxSCxDQUFDLENBQUMsTUFBTSxDQUFDO0FBQ1QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNELENBQUMsQ0FBQyxDQUFDO0FBQ0g7O0FBRUEsUUFBUSxDQUFDLHlCQUF5QixDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUs7QUFDbEUsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUNULENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEQsQ0FBQyxDQUFDLENBQUM7QUFDSDs7QUFFQSxRQUFRLENBQUMs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TyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSTtBQUN2RCxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSztBQUN0QyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQy9FLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLHlCQUF5QixDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztBQUNqRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5RyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLHlCQUF5QixDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMseUJBQXlCLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO0FBQ3hFLENBQUMsQ0FBQyxDQUFDO0FBQ0g7O0FB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Q0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RGLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztBQUM5QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDO0FBQzdFLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDckQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUs7QUFDbEIsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU87QUFDbEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDO0FBQzlDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1gsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FB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QyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTTtBQUM1RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUN0QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDdkQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztBQUMvRCxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQzs7QUFFcEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQ1osQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFSixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxD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QUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUU7QUFDdEYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNaLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDbEMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQztBQUMzRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU07QUFDMUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxZQUFZOztBQUU5QyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO0FBQzNFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQzs7QUFFdEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU87QUFDdkUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDOztBQUVsSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDdEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztBQUM1QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4RyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0RixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0UsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVmLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUM3QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxPQUFPO0FBQzdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDakIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsWUFBWTtBQUNoQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztBQUM1QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNaLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztBQUNyQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25DLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ3hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNYLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVE7QUFDdkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDZixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pDLENBQUMsQ0FBQyxDQUFDLENBQUMs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Q0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ25ELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLDBCQUEwQixDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQztBQUNuRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNULENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0FBQ3hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTO0FBQzVCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLHFDQUFxQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQzFGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNwQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ2xCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQy9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVM7QUFDMUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsMEJBQTBCLENBQUMsQ0FBQztBQUN4QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUztBQUM1QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUN6RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxzQkFBc0I7QUFDaEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDWixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDM0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNWLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFDckMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUN2QyxD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QUMsQ0FBQyxDQUFDLENBQUM7QUFDNUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsTUFBTTtBQUNwRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLElBQUk7QUFDcEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDOUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFUCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO0FBQ3RCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7QUFDM0UsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3JDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDbEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNWLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQzVGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUMzQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNaLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3JDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDbEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNWLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDdEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxPQUFPO0FBQzlFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxDQUFDLFdBQVcsQ0FBQztBQUN2RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDakIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMseUJBQXlCLENBQUMsV0FBVyxDQUFDO0FBQ2xELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ2xCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxtQ0FBbUM7QUFDL0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVc7QUFDekIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQztBQUMzRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNWLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVU7QUFDM0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDckMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUNsQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFN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LENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyw0QkFBNEI7QUFDeEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyx1QkFBdUI7QUFDaEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUNoQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0FBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7QUFDL0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUMxRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDWixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNULENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNyQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQ2xCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDLHFCQUFxQixDQUFDO0FBQ3pELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDbkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFD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QUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNyQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQ2xCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUM7QUFDckQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFDLENBQUMsV0FBVyxDQUFDO0FBQ3ZELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENB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Q0FBQztBQUNoRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJOztBQUUxQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzlDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQy9DLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUN4QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsaUJBQWlCLENBQUMsSUFBSTtBQUMxQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsaUJBQWlCLENBQUMsU0FBUztBQUNwRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsaUJBQWlCLENBQUMsVUFBVTtBQUM1QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTO0FBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsaUNBQWlDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNuRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQywwQkFBMEIsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUM7QUFDbkUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVM7QUFDdkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7QUFDdEYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDMUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSztBQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUNkLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUN0QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7QUFDbEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTO0FBQzdFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNULENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUztBQUN2QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLElBQUksQ0FBQyxDQUFDLFdBQVcsQ0FBQztBQUN4RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLHFDQUFxQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDaEcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENB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