import.meta.env = {"BASE_URL": "/", "DEV": true, "MODE": "development", "PROD": false, "SSR": false};import __vite__cjsImport0_react from "/node_modules/.vite/deps/react.js?v=6e8fde4d"; const useCallback = __vite__cjsImport0_react["useCallback"]; const useEffect = __vite__cjsImport0_react["useEffect"]; const useLayoutEffect = __vite__cjsImport0_react["useLayoutEffect"]; const useMemo = __vite__cjsImport0_react["useMemo"]; const useRef = __vite__cjsImport0_react["useRef"]; const useState = __vite__cjsImport0_react["useState"];
import { hasGateAccess } from "/src/lib/access-gates.js?t=1784282071061";
import { buildRouteHref, getRouteById, resolveRouteFromHref, resolveRouteFromPathname } from "/src/lib/routes.js?t=1784282071059";
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInVzZVNoZWxsUm91dGVUcmFuc2l0aW9uLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydC5tZXRhLmVudiA9IHtcIkJBU0VfVVJMXCI6IFwiL1wiLCBcIkRFVlwiOiB0cnVlLCBcIk1PREVcIjogXCJkZXZlbG9wbWVudFwiLCBcIlBST0RcIjogZmFsc2UsIFwiU1NSXCI6IGZhbHNlfTtpbXBvcnQgX192aXRlX19janNJbXBvcnQwX3JlYWN0IGZyb20gXCIvbm9kZV9tb2R1bGVzLy52aXRlL2RlcHMvcmVhY3QuanM/dj02ZThmZGU0ZFwiOyBjb25zdCB1c2VDYWxsYmFjayA9IF9fdml0ZV9fY2pzSW1wb3J0MF9yZWFjdFtcInVzZUNhbGxiYWNrXCJdOyBjb25zdCB1c2VFZmZlY3QgPSBfX3ZpdGVfX2Nqc0ltcG9ydDBfcmVhY3RbXCJ1c2VFZmZlY3RcIl07IGNvbnN0IHVzZUxheW91dEVmZmVjdCA9IF9fdml0ZV9fY2pzSW1wb3J0MF9yZWFjdFtcInVzZUxheW91dEVmZmVjdFwiXTsgY29uc3QgdXNlTWVtbyA9IF9fdml0ZV9fY2pzSW1wb3J0MF9yZWFjdFtcInVzZU1lbW9cIl07IGNvbnN0IHVzZVJlZiA9IF9fdml0ZV9fY2pzSW1wb3J0MF9yZWFjdFtcInVzZVJlZlwiXTsgY29uc3QgdXNlU3RhdGUgPSBfX3ZpdGVfX2Nqc0ltcG9ydDBfcmVhY3RbXCJ1c2VTdGF0ZVwiXTtcbmltcG9ydCB7IGhhc0dhdGVBY2Nlc3MgfSBmcm9tIFwiL3NyYy9saWIvYWNjZXNzLWdhdGVzLmpzP3Q9MTc4NDI4MjA3MTA2MVwiO1xuaW1wb3J0IHsgYnVpbGRSb3V0ZUhyZWYsIGdldFJvdXRlQnlJZCwgcmVzb2x2ZVJvdXRlRnJvbUhyZWYsIHJlc29sdmVSb3V0ZUZyb21QYXRobmFtZSB9IGZyb20gXCIvc3JjL2xpYi9yb3V0ZXMuanM/dD0xNzg0MjgyMDcxMDU5XCI7XG5pbXBvcnQgeyBpbnN0YWxsU3BhTmF2aWdhdGlvbkJyaWRnZSB9IGZyb20gXCIvc3JjL2xpYi9zcGEtbmF2aWdhdGlvbi5qc1wiO1xuaW1wb3J0IHsgbm9ybWFsaXplU2ltdWxhdGlvbklkLCB3cml0ZU1hbnVhbFNpbXVsYXRpb25Gb2N1cyB9IGZyb20gXCIvc3JjL2RhdGEvc2ltdWxhdGlvbkNhdGFsb2cuanNcIjtcbmltcG9ydCB7IGNsZWFyU3RhYmxlVGltZW91dCwgc2V0U3RhYmxlVGltZW91dCB9IGZyb20gXCIvc3JjL2xpYi9sZWdhY3ktcnVudGltZS1zY29wZS5qc1wiO1xuaW1wb3J0IHsgZ2V0QWN0aXZlTGVnYWN5UnVudGltZVNuYXBzaG90IH0gZnJvbSBcIi9zcmMvaG9va3MvdXNlTGVnYWN5Um91dGVSdW50aW1lLmpzXCI7XG5pbXBvcnQge1xuICBpc1NpbXVsYXRpb25WaXN1YWxUcmFuc2l0aW9uU291cmNlQWN0aXZlLFxuICByZWNvcmRTaW11bGF0aW9uVmlzdWFsVHJhbnNpdGlvbkV2ZW50LFxuICBydW5TaW11bGF0aW9uVmlzdWFsVHJhbnNpdGlvbixcbn0gZnJvbSBcIi9zcmMvbGliL3NpbXVsYXRpb25WaXN1YWxUcmFuc2l0aW9uLmpzXCI7XG5pbXBvcnQge1xuICBjbGVhckxlZ2FjeVJvdXRlVHJhbnNpdGlvbkZsYWdzLFxuICBjbGVhclRyYW5zaXRpb25SZXR1cm5pbmdTdGF0ZSxcbiAgZ2V0VHJhbnNpdGlvblBoYXNlLFxuICBpbnN0YWxsVHJhbnNpdGlvbk93bmVyc2hpcEd1YXJkLFxuICBpbnN0YWxsVHJhbnNpdGlvblBoYXNlT2JzZXJ2ZXIsXG4gIGlzUm91dGVUcmFuc2l0aW9uUGhhc2UsXG4gIHNldExlZ2FjeVJvdXRlVHJhbnNpdGlvbkFjdGl2ZSxcbiAgc2V0VHJhbnNpdGlvblBoYXNlLFxuICBzeW5jVHJhbnNpdGlvblBoYXNlRnJvbURvbSxcbiAgVFJBTlNJVElPTl9QSEFTRVNcbn0gZnJvbSBcIi9zcmMvbGliL3RyYW5zaXRpb24tcGhhc2UuanNcIjtcblxuLyog4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG4gICBST1VURSBTVEFURVxuICAg4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQICovXG5cbmZ1bmN0aW9uIHJlYWRIb21lRm9jdXNTaW11bGF0aW9uSWQoc2VhcmNoUGFyYW1zKSB7XG4gIGNvbnN0IHJlcXVlc3RlZElkID0gc2VhcmNoUGFyYW1zLmdldCgnbW9kZScpIHx8IHNlYXJjaFBhcmFtcy5nZXQoJ2ZvY3VzJykgfHwgc2VhcmNoUGFyYW1zLmdldCgnc2ltdWxhdGlvbicpIHx8IG51bGw7XG4gIHJldHVybiByZXF1ZXN0ZWRJZCA/IG5vcm1hbGl6ZVNpbXVsYXRpb25JZChyZXF1ZXN0ZWRJZCkgOiBudWxsO1xufVxuXG5jb25zdCBTSU1VTEFUSU9OX1VSTF9TVEFURV9QQVJBTVMgPSBuZXcgU2V0KFsnZGFpbHknLCAnZm9jdXMnLCAnbW9kZScsICdzaW11bGF0aW9uJ10pO1xuXG5mdW5jdGlvbiBidWlsZENsZWFuSG9tZUhyZWYodXJsKSB7XG4gIGNvbnN0IGNsZWFuVXJsID0gbmV3IFVSTChidWlsZFJvdXRlSHJlZignaG9tZScpLCB3aW5kb3cubG9jYXRpb24ub3JpZ2luKTtcbiAgdXJsLnNlYXJjaFBhcmFtcy5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG4gICAgaWYgKCFTSU1VTEFUSU9OX1VSTF9TVEFURV9QQVJBTVMuaGFzKGtleSkpIHtcbiAgICAgIGNsZWFuVXJsLnNlYXJjaFBhcmFtcy5hcHBlbmQoa2V5LCB2YWx1ZSk7XG4gICAgfVxuICB9KTtcbiAgY2xlYW5VcmwuaGFzaCA9IHVybC5oYXNoO1xuICByZXR1cm4gYCR7Y2xlYW5VcmwucGF0aG5hbWV9JHtjbGVhblVybC5zZWFyY2h9JHtjbGVhblVybC5oYXNofWA7XG59XG5cbmZ1bmN0aW9uIGNvbXB1dGVSb3V0ZVN0YXRlKGhyZWYpIHtcbiAgY29uc3QgdXJsID0gbmV3IFVSTChocmVmLCB3aW5kb3cubG9jYXRpb24uaHJlZik7XG4gIGNvbnN0IHN0YWxlUm91dGVUYXJnZXQgPSBjb25zdW1lU3RhbGVSb3V0ZVJlcXVlc3RzKHVybCk7XG4gIGlmIChzdGFsZVJvdXRlVGFyZ2V0KSB7XG4gICAgcmV0dXJuIGNvbXB1dGVSb3V0ZVN0YXRlKG5ldyBVUkwoc3RhbGVSb3V0ZVRhcmdldCwgd2luZG93LmxvY2F0aW9uLm9yaWdpbikudG9TdHJpbmcoKSk7XG4gIH1cblxuICBjb25zdCByZXF1ZXN0ZWRSb3V0ZSA9IHJlc29sdmVSb3V0ZUZyb21QYXRobmFtZSh1cmwucGF0aG5hbWUpO1xuICBjb25zdCBob21lRm9jdXNTaW11bGF0aW9uSWQgPSByZXF1ZXN0ZWRSb3V0ZS5pZCA9PT0gJ2hvbWUnXG4gICAgPyByZWFkSG9tZUZvY3VzU2ltdWxhdGlvbklkKHVybC5zZWFyY2hQYXJhbXMpXG4gICAgOiBudWxsO1xuICBjb25zdCBob21lUm91dGVCYWNrZWRGb2N1c0lkID0gREFJTFlfTEFCX1JPVVRFX0lEUy5oYXMoaG9tZUZvY3VzU2ltdWxhdGlvbklkKVxuICAgID8gaG9tZUZvY3VzU2ltdWxhdGlvbklkXG4gICAgOiBudWxsO1xuICBjb25zdCBsYWJEYWlseUZvY3VzUm91dGVJZCA9IERBSUxZX0xBQl9ST1VURV9JRFMuaGFzKHJlcXVlc3RlZFJvdXRlLmlkKVxuICAgICYmIHVybC5zZWFyY2hQYXJhbXMuZ2V0KCdkYWlseScpID09PSAnMSdcbiAgICA/IHJlcXVlc3RlZFJvdXRlLmlkXG4gICAgOiBudWxsO1xuICBjb25zdCBkYWlseUZvY3VzUm91dGVJZCA9IGhvbWVSb3V0ZUJhY2tlZEZvY3VzSWQgfHwgbGFiRGFpbHlGb2N1c1JvdXRlSWQ7XG5cbiAgaWYgKGhvbWVGb2N1c1NpbXVsYXRpb25JZCB8fCBkYWlseUZvY3VzUm91dGVJZCkge1xuICAgIHJldHVybiB7XG4gICAgICByb3V0ZTogZ2V0Um91dGVCeUlkKCdob21lJyksXG4gICAgICByZXF1ZXN0ZWRSb3V0ZUlkOiByZXF1ZXN0ZWRSb3V0ZS5pZCxcbiAgICAgIGNhbm9uaWNhbEhyZWY6IGJ1aWxkQ2xlYW5Ib21lSHJlZih1cmwpLFxuICAgICAgcmVkaXJlY3RHYXRlSWQ6IG51bGwsXG4gICAgICBkYWlseUZvY3VzUm91dGVJZCxcbiAgICAgIGZvY3VzU2ltdWxhdGlvbklkOiBob21lRm9jdXNTaW11bGF0aW9uSWQgfHwgZGFpbHlGb2N1c1JvdXRlSWQsXG4gICAgfTtcbiAgfVxuXG4gIGNvbnN0IGxvY2tlZEdhdGVJZCA9IHJlcXVlc3RlZFJvdXRlLmdhdGVkICYmICFoYXNHYXRlQWNjZXNzKHJlcXVlc3RlZFJvdXRlLmlkKSA/IHJlcXVlc3RlZFJvdXRlLmlkIDogbnVsbDtcbiAgaWYgKCFsb2NrZWRHYXRlSWQgJiYgcmVxdWVzdGVkUm91dGUuaWQgPT09ICdwb3J0Zm9saW8nKSB7XG4gICAgaGFzR2F0ZUFjY2VzcygncG9ydGZvbGlvJyk7XG4gICAgWydwb3J0Zm9saW8nLCAncG9ydGZvbGlvQ29kZScsICdhY2Nlc3MnXS5mb3JFYWNoKChrZXkpID0+IHVybC5zZWFyY2hQYXJhbXMuZGVsZXRlKGtleSkpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICByb3V0ZTogcmVxdWVzdGVkUm91dGUsXG4gICAgcmVxdWVzdGVkUm91dGVJZDogcmVxdWVzdGVkUm91dGUuaWQsXG4gICAgY2Fub25pY2FsSHJlZjogYnVpbGRDYW5vbmljYWxSb3V0ZUhyZWYocmVxdWVzdGVkUm91dGUsIHVybCksXG4gICAgcmVkaXJlY3RHYXRlSWQ6IG51bGwsXG4gICAgZGFpbHlGb2N1c1JvdXRlSWQ6IG51bGwsXG4gICAgZm9jdXNTaW11bGF0aW9uSWQ6IG51bGwsXG4gICAgbG9ja2VkR2F0ZUlkLFxuICB9O1xufVxuXG5mdW5jdGlvbiBjb25zdW1lU3RhbGVSb3V0ZVJlcXVlc3RzKHVybCkge1xuICB0cnkge1xuICAgIGNvbnN0IGdhdGUgPSB1cmwuc2VhcmNoUGFyYW1zLmdldCgnZ2F0ZScpO1xuICAgIGlmIChnYXRlID09PSAncG9ydGZvbGlvJykge1xuICAgICAgdXJsLnNlYXJjaFBhcmFtcy5kZWxldGUoJ2dhdGUnKTtcbiAgICAgIHJldHVybiBgJHtnZXRSb3V0ZUJ5SWQoJ3BvcnRmb2xpbycpLnBhdGh9JHt1cmwuc2VhcmNofSR7dXJsLmhhc2h9YDtcbiAgICB9XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIGJ1aWxkQ2Fub25pY2FsUm91dGVIcmVmKHJvdXRlLCB1cmwpIHtcbiAgY29uc3QgY2Fub25pY2FsID0gbmV3IFVSTChidWlsZFJvdXRlSHJlZihyb3V0ZS5pZCksIHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4pO1xuICBpZiAocm91dGUuaWQgPT09ICdwb3J0Zm9saW8nKSB7XG4gICAgWydwb3J0Zm9saW8nLCAncG9ydGZvbGlvQ29kZScsICdhY2Nlc3MnXS5mb3JFYWNoKChrZXkpID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlID0gdXJsLnNlYXJjaFBhcmFtcy5nZXQoa2V5KTtcbiAgICAgIGlmICh2YWx1ZSkgY2Fub25pY2FsLnNlYXJjaFBhcmFtcy5zZXQoa2V5LCB2YWx1ZSk7XG4gICAgfSk7XG4gIH1cbiAgaWYgKF9fREVWX18gJiYgcm91dGUuaWQgPT09ICdhYm91dC1uYXJyYXRpdmUtbGFiJyAmJiB1cmwuc2VhcmNoUGFyYW1zLmdldCgnZWRpdCcpID09PSAnMScpIHtcbiAgICBjYW5vbmljYWwuc2VhcmNoUGFyYW1zLnNldCgnZWRpdCcsICcxJyk7XG4gIH1cbiAgY2Fub25pY2FsLmhhc2ggPSB1cmwuaGFzaDtcbiAgcmV0dXJuIGAke2Nhbm9uaWNhbC5wYXRobmFtZX0ke2Nhbm9uaWNhbC5zZWFyY2h9JHtjYW5vbmljYWwuaGFzaH1gO1xufVxuXG5mdW5jdGlvbiByZWFkUm91dGVTdGF0ZVNpbXVsYXRpb25Gb2N1c0lkKHJvdXRlU3RhdGUpIHtcbiAgcmV0dXJuIHJvdXRlU3RhdGU/LmZvY3VzU2ltdWxhdGlvbklkIHx8IHJvdXRlU3RhdGU/LmRhaWx5Rm9jdXNSb3V0ZUlkIHx8ICcnO1xufVxuXG5mdW5jdGlvbiByZWFkUm91dGVDb250ZW50U2lnbmF0dXJlKHJvdXRlU3RhdGUpIHtcbiAgcmV0dXJuIFtcbiAgICByb3V0ZVN0YXRlPy5yb3V0ZT8uaWQgfHwgJycsXG4gICAgcm91dGVTdGF0ZT8ubG9ja2VkR2F0ZUlkIHx8ICcnLFxuICAgIHJvdXRlU3RhdGU/LmRhaWx5Rm9jdXNSb3V0ZUlkIHx8ICcnLFxuICAgIHJvdXRlU3RhdGU/LmZvY3VzU2ltdWxhdGlvbklkIHx8ICcnLFxuICBdLmpvaW4oJzonKTtcbn1cblxuLyog4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG4gICBTTU9PVEggVFJBTlNJVElPTiBFTkdJTkVcbiAgIEZhZGVzIHJvdXRlLW93bmVkIHN1cmZhY2VzICh3YWxsICsgdGl0bGUgKyBVSSkgd2hpbGUgdGhlIHdhbGwgZnJhbWUgc3RheXMgdmlzaWJsZSxcbiAgIHN3YXBzIHRoZSByb3V0ZSB3aGlsZSBpbnZpc2libGUsIHRoZW4gc3RhZ2dlcnMgdGhlIG5ldyBjb250ZW50IGluLlxuXG4gICBUaGUgd2FsbCAoI3NpbXVsYXRpb25zIGJvcmRlci9iYWNrZ3JvdW5kKSBuZXZlciBjaGFuZ2VzIG9wYWNpdHkuXG4gICAjc2hlbGwtd2FsbC1zbG90IChjYW52YXMpLCAjc2hlbGwtaGVyby1zbG90ICh0aXRsZSBzbG90KSwgYW5kIC5mYWRlLWNvbnRlbnQgKFVJIGxheWVyKSBmYWRlLlxuXG4gICBJbnZhcmlhbnRzOlxuICAgLSBFdmVyeSBhc3luYyBzdGVwIGNoZWNrcyBgc3RhbGUoKWAgYmVmb3JlIG11dGF0aW5nIERPTSBvciBzdGF0ZS5cbiAgIC0gYGZpbmFsaXplVHJhbnNpdGlvbigpYCBpcyB0aGUgc2luZ2xlIGNsZWFudXAgcGF0aCAoaWRlbXBvdGVudCkuXG4gICAtIFJhcGlkIHJvdXRlIHJlcXVlc3RzIGFyZSBxdWV1ZWQgd2hpbGUgYSB0cmFuc2l0aW9uIGlzIGFjdGl2ZSBhbmQgZmx1c2hlZCBhZnRlcndhcmQuXG4gICDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZAgKi9cblxuY29uc3QgRkFERV9PVVRfTVMgPSAxMTA7XG5jb25zdCBTVEFHR0VSX09GRlNFVF9NUyA9IDA7XG5jb25zdCBFTEVNRU5UX1JFVkVBTF9NUyA9IDE2NTtcbmNvbnN0IEVBU0VfT1VUID0gJ2N1YmljLWJlemllcigwLjIsIDAuOCwgMC4yLCAxKSc7XG5jb25zdCBSRUFEWV9GQUxMQkFDS19NUyA9IDkwMDtcbmNvbnN0IEdST1VQRURfUk9VVEVfT0ZGU0VUX01TID0gODA7XG5jb25zdCBST1VURV9FTlRFUl9TRUxFQ1RPUiA9ICdbZGF0YS1yb3V0ZS1lbnRlcl0nO1xuY29uc3QgUk9VVEVfRU5URVJfVE9UQUxfTVMgPSA3MjA7XG5jb25zdCBQT1JURk9MSU9fR0FURV9TQ0VORV9GQURFX01TID0gNDgwO1xuY29uc3QgUk9VVEVfRU5URVJfR1JPVVBTID0ge1xuICBpZGVudGl0eToge1xuICAgIHN0YXJ0TXM6IDAsXG4gICAgc3RlcE1zOiA1OCxcbiAgICBkdXJhdGlvbk1zOiA0MjAsXG4gICAgc2xpZGU6IHRydWUsXG4gIH0sXG4gIGxlZ2VuZDoge1xuICAgIHN0YXJ0TXM6IDkwLFxuICAgIHN0ZXBNczogMzYsXG4gICAgZHVyYXRpb25NczogNDYwLFxuICAgIHNsaWRlOiB0cnVlLFxuICB9LFxuICBjb250ZXh0OiB7XG4gICAgc3RhcnRNczogMjEwLFxuICAgIHN0ZXBNczogNTQsXG4gICAgZHVyYXRpb25NczogNDgwLFxuICAgIHNsaWRlOiB0cnVlLFxuICB9LFxuICBhY3Rpb246IHtcbiAgICBzdGFydE1zOiAzMDAsXG4gICAgc3RlcE1zOiA1NCxcbiAgICBkdXJhdGlvbk1zOiA0NDAsXG4gICAgc2xpZGU6IGZhbHNlLFxuICB9LFxuICBmb290ZXI6IHtcbiAgICBzdGFydE1zOiAzNjAsXG4gICAgc3RlcE1zOiA0OCxcbiAgICBkdXJhdGlvbk1zOiA0MjAsXG4gICAgc2xpZGU6IHRydWUsXG4gIH0sXG59O1xuY29uc3QgU0lNVUxBVElPTl9GT0NVU19FWElUX01TID0gNTIwO1xuY29uc3QgU0lNVUxBVElPTl9GT0NVU19FTlRFUl9NUyA9IDUwMDtcbmNvbnN0IFNJTVVMQVRJT05fRk9DVVNfWkVST19IT0xEX01TID0gNDg7XG5jb25zdCBTSU1VTEFUSU9OX0ZPQ1VTX0VYSVRfTE9DQUxfTVMgPSAyNDA7XG5jb25zdCBTSU1VTEFUSU9OX0ZPQ1VTX0VOVEVSX0xPQ0FMX01TID0gMjgwO1xuY29uc3QgU0lNVUxBVElPTl9GT0NVU19FQVNFX09VVCA9ICdjdWJpYy1iZXppZXIoMC43MiwgMCwgMC44NiwgMC4zMiknO1xuY29uc3QgU0lNVUxBVElPTl9GT0NVU19FQVNFX0lOID0gJ2N1YmljLWJlemllcigwLjE2LCAxLCAwLjMsIDEpJztcbmNvbnN0IERBSUxZX0xBQl9ST1VURV9JRFMgPSBuZXcgU2V0KFtcbiAgJ3JlcGVsLXJvb20nLFxuICAnZmxvY2stb2YtYmlyZHMnLFxuICAnbWluZXJhbC1ncm93dGgnLFxuICAncmlmdC1yaW5ncycsXG5dKTtcblxubGV0IHRyYW5zaXRpb25Ub2tlbiA9IDA7XG5sZXQgYWN0aXZlQW5pbWF0aW9ucyA9IFtdO1xuXG5mdW5jdGlvbiByZWFkUm9vdE1zKG5hbWUsIGZhbGxiYWNrKSB7XG4gIHRyeSB7XG4gICAgY29uc3QgcmF3ID0gZ2V0Q29tcHV0ZWRTdHlsZShkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQpLmdldFByb3BlcnR5VmFsdWUobmFtZSkudHJpbSgpO1xuICAgIGNvbnN0IHZhbHVlID0gTnVtYmVyLnBhcnNlRmxvYXQocmF3KTtcbiAgICBpZiAoIU51bWJlci5pc0Zpbml0ZSh2YWx1ZSkpIHJldHVybiBmYWxsYmFjaztcbiAgICBpZiAoL21zJC9pLnRlc3QocmF3KSkgcmV0dXJuIHZhbHVlO1xuICAgIGlmICgvcyQvaS50ZXN0KHJhdykpIHJldHVybiB2YWx1ZSAqIDEwMDA7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gZmFsbGJhY2s7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVhZFJvb3RFYXNpbmcobmFtZSwgZmFsbGJhY2spIHtcbiAgdHJ5IHtcbiAgICBjb25zdCByYXcgPSBnZXRDb21wdXRlZFN0eWxlKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCkuZ2V0UHJvcGVydHlWYWx1ZShuYW1lKS50cmltKCk7XG4gICAgcmV0dXJuIHJhdyB8fCBmYWxsYmFjaztcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGZhbGxiYWNrO1xuICB9XG59XG5cbmZ1bmN0aW9uIHBhcnNlVHJhbnNpdGlvbk1zKHZhbHVlLCBmYWxsYmFjaykge1xuICBjb25zdCBwYXJzZWQgPSBOdW1iZXIucGFyc2VGbG9hdCh2YWx1ZSk7XG4gIHJldHVybiBOdW1iZXIuaXNGaW5pdGUocGFyc2VkKSA/IHBhcnNlZCA6IGZhbGxiYWNrO1xufVxuXG5mdW5jdGlvbiBnZXRSb3V0ZVRyYW5zaXRpb25UaW1pbmdzKHtcbiAgZmFkZU1zLFxuICBzdGFnZ2VyTXMsXG4gIHJldmVhbE1zLFxuICByZWFkeU1zLFxuICByZWR1Y2VNb3Rpb24sXG59KSB7XG4gIGNvbnN0IGZhbGxiYWNrRmFkZSA9IHJlYWRSb290TXMoJy0tdWktcm91dGUtZHVyYXRpb24tb3V0JywgcmVhZFJvb3RNcygnLS11aS1kdXJhdGlvbi1vdXQnLCBGQURFX09VVF9NUykpO1xuICBjb25zdCBmYWxsYmFja1N0YWdnZXIgPSByZWFkUm9vdE1zKCctLXVpLXJvdXRlLXN0YWdnZXInLCByZWFkUm9vdE1zKCctLXVpLXN0YWdnZXInLCBTVEFHR0VSX09GRlNFVF9NUykpO1xuICBjb25zdCBmYWxsYmFja1JldmVhbCA9IHJlYWRSb290TXMoJy0tdWktcm91dGUtZHVyYXRpb24taW4nLCByZWFkUm9vdE1zKCctLXVpLWR1cmF0aW9uLWluJywgRUxFTUVOVF9SRVZFQUxfTVMpKTtcbiAgY29uc3QgZmFsbGJhY2tSZWFkeSA9IHBhcnNlVHJhbnNpdGlvbk1zKHJlYWR5TXMsIFJFQURZX0ZBTExCQUNLX01TKTtcbiAgY29uc3QgcmV2ZWFsRWFzaW5nID0gcmVhZFJvb3RFYXNpbmcoJy0tdWktZWFzZS1pbicsIEVBU0VfT1VUKTtcbiAgY29uc3QgZmFkZUVhc2luZyA9IHJlYWRSb290RWFzaW5nKCctLXVpLWVhc2Utb3V0JywgRUFTRV9PVVQpO1xuXG4gIGlmIChyZWR1Y2VNb3Rpb24pIHtcbiAgICByZXR1cm4ge1xuICAgICAgZmFkZU91dDogMTUwLFxuICAgICAgc3RhZ2dlcjogMCxcbiAgICAgIHJldmVhbDogMTUwLFxuICAgICAgcmVhZHk6IGZhbGxiYWNrUmVhZHksXG4gICAgICByZXZlYWxFYXNpbmcsXG4gICAgICBmYWRlRWFzaW5nLFxuICAgIH07XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGZhZGVPdXQ6IHBhcnNlVHJhbnNpdGlvbk1zKGZhZGVNcywgZmFsbGJhY2tGYWRlKSxcbiAgICBzdGFnZ2VyOiBwYXJzZVRyYW5zaXRpb25NcyhzdGFnZ2VyTXMsIGZhbGxiYWNrU3RhZ2dlciksXG4gICAgcmV2ZWFsOiBwYXJzZVRyYW5zaXRpb25NcyhyZXZlYWxNcywgZmFsbGJhY2tSZXZlYWwpLFxuICAgIHJlYWR5OiBmYWxsYmFja1JlYWR5LFxuICAgIHJldmVhbEVhc2luZyxcbiAgICBmYWRlRWFzaW5nLFxuICB9O1xufVxuXG4vKiDilIDilIAgY29udGVudCBsYXllciByZWZlcmVuY2VzIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgCAqL1xuXG5mdW5jdGlvbiBnZXRTdXJmYWNlTm9kZShzdXJmYWNlUmVmLCBmYWxsYmFja1NlbGVjdG9yKSB7XG4gIGlmIChzdXJmYWNlUmVmPy5jdXJyZW50KSByZXR1cm4gc3VyZmFjZVJlZi5jdXJyZW50O1xuICBpZiAoIWZhbGxiYWNrU2VsZWN0b3IpIHJldHVybiBudWxsO1xuICBpZiAoZmFsbGJhY2tTZWxlY3Rvci5zdGFydHNXaXRoKCcjJykpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZmFsbGJhY2tTZWxlY3Rvci5zbGljZSgxKSk7XG4gIH1cbiAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoZmFsbGJhY2tTZWxlY3Rvcik7XG59XG5cbmZ1bmN0aW9uIGdldENvbnRlbnRMYXllcnMoc3VyZmFjZVJlZnMpIHtcbiAgcmV0dXJuIHtcbiAgICB3YWxsOiBnZXRTdXJmYWNlTm9kZShzdXJmYWNlUmVmcz8ud2FsbCwgJyNzaGVsbC13YWxsLXNsb3QnKSxcbiAgICBoZXJvOiBnZXRTdXJmYWNlTm9kZShzdXJmYWNlUmVmcz8uaGVybywgJyNzaGVsbC1oZXJvLXNsb3QnKSxcbiAgICB1aTogZ2V0U3VyZmFjZU5vZGUoc3VyZmFjZVJlZnM/LnVpLCAnLmZhZGUtY29udGVudCcpLFxuICAgIGNocm9tZTogZ2V0U3VyZmFjZU5vZGUoc3VyZmFjZVJlZnM/LmNocm9tZSwgJy5zaGVsbC10cmFuc2l0aW9uLXN1cmZhY2UtLWNocm9tZScpLFxuICAgIHNlY29uZGFyeTogZ2V0U3VyZmFjZU5vZGUoc3VyZmFjZVJlZnM/LnNlY29uZGFyeSwgJy5zaGVsbC10cmFuc2l0aW9uLXN1cmZhY2UtLXNlY29uZGFyeScpLFxuICAgIGZvb3RlcjogZ2V0U3VyZmFjZU5vZGUoc3VyZmFjZVJlZnM/LmZvb3RlciwgJy5zaGVsbC10cmFuc2l0aW9uLXN1cmZhY2UtLWZvb3RlcicpLFxuICB9O1xufVxuXG5mdW5jdGlvbiBzZXRJbnN0cnVtZW50V2FrZVN0YXRlKHN0YXRlKSB7XG4gIGNvbnN0IHJvb3QgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gIGlmIChzdGF0ZSkge1xuICAgIHJvb3QuZGF0YXNldC5hYnNJbnN0cnVtZW50V2FrZSA9IHN0YXRlO1xuICAgIHJldHVybjtcbiAgfVxuICBkZWxldGUgcm9vdC5kYXRhc2V0LmFic0luc3RydW1lbnRXYWtlO1xufVxuXG5mdW5jdGlvbiBzZXRSb3V0ZUxheWVyVmlzaWJpbGl0eSh2aXNpYmxlLCBzdXJmYWNlUmVmcykge1xuICBjb25zdCB7IHdhbGwsIGhlcm8sIGNocm9tZSwgc2Vjb25kYXJ5IH0gPSBnZXRDb250ZW50TGF5ZXJzKHN1cmZhY2VSZWZzKTtcbiAgY29uc3QgaGlkZGVuID0gIXZpc2libGU7XG4gIGNvbnN0IG9wYWNpdHkgPSBoaWRkZW4gPyAnMCcgOiAnJztcbiAgY29uc3QgdmlzaWJpbGl0eSA9IGhpZGRlbiA/ICdoaWRkZW4nIDogJyc7XG4gIGNvbnN0IHBvaW50ZXJFdmVudHMgPSBoaWRkZW4gPyAnbm9uZScgOiAnJztcblxuICBbd2FsbCwgaGVybywgY2hyb21lLCBzZWNvbmRhcnldLmZvckVhY2goKGVsKSA9PiB7XG4gICAgaWYgKCFlbCkgcmV0dXJuO1xuICAgIGlmIChoaWRkZW4pIHtcbiAgICAgIGVsLnN0eWxlLm9wYWNpdHkgPSBvcGFjaXR5O1xuICAgICAgZWwuc3R5bGUudmlzaWJpbGl0eSA9IHZpc2liaWxpdHk7XG4gICAgICBlbC5zdHlsZS5wb2ludGVyRXZlbnRzID0gcG9pbnRlckV2ZW50cztcbiAgICB9IGVsc2Uge1xuICAgICAgZWwuc3R5bGUucmVtb3ZlUHJvcGVydHkoJ29wYWNpdHknKTtcbiAgICAgIGVsLnN0eWxlLnJlbW92ZVByb3BlcnR5KCd2aXNpYmlsaXR5Jyk7XG4gICAgICBlbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eSgncG9pbnRlci1ldmVudHMnKTtcbiAgICB9XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBwaW5Sb3V0ZVN1cmZhY2VzRm9yQ29tbWl0KHN1cmZhY2VSZWZzKSB7XG4gIGNvbnN0IHsgd2FsbCwgaGVybywgY2hyb21lLCBzZWNvbmRhcnkgfSA9IGdldENvbnRlbnRMYXllcnMoc3VyZmFjZVJlZnMpO1xuXG4gIFt3YWxsLCBoZXJvLCBjaHJvbWUsIHNlY29uZGFyeV0uZm9yRWFjaCgoZWwpID0+IHtcbiAgICBpZiAoIWVsKSByZXR1cm47XG4gICAgZWwuc3R5bGUub3BhY2l0eSA9ICcwJztcbiAgICBlbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eSgndmlzaWJpbGl0eScpO1xuICAgIGVsLnN0eWxlLnBvaW50ZXJFdmVudHMgPSAnbm9uZSc7XG4gICAgZWwuc3R5bGUud2lsbENoYW5nZSA9ICdvcGFjaXR5LCB0cmFuc2Zvcm0sIGZpbHRlcic7XG4gIH0pO1xuXG4gIGNhbmNlbEFjdGl2ZUFuaW1hdGlvbnMoKTtcbn1cblxuZnVuY3Rpb24gaG9sZFBpbm5lZFJvdXRlU3VyZmFjZXNVbnRpbFJvdXRlSW4oc3VyZmFjZVJlZnMsIHNob3VsZENvbnRpbnVlKSB7XG4gIGNvbnN0IHRpY2sgPSAoKSA9PiB7XG4gICAgaWYgKCFzaG91bGRDb250aW51ZSgpKSByZXR1cm47XG4gICAgcGluUm91dGVTdXJmYWNlc0ZvckNvbW1pdChzdXJmYWNlUmVmcyk7XG4gICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSh0aWNrKTtcbiAgfTtcblxuICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRpY2spO1xufVxuXG5mdW5jdGlvbiBidWlsZFJvdXRlVHJhbnNpdGlvbkdyb3Vwcyhyb3V0ZUlkLCBzdXJmYWNlUmVmcykge1xuICBjb25zdCBzdXJmYWNlcyA9IGdldENvbnRlbnRMYXllcnMoc3VyZmFjZVJlZnMpO1xuICBjb25zdCBhZGRHcm91cCA9IChkZWxheU1zLCBpdGVtcykgPT4gKHtcbiAgICBkZWxheU1zLFxuICAgIGl0ZW1zOiBpdGVtcy5maWx0ZXIoKGl0ZW0pID0+IGl0ZW0/LmVsKSxcbiAgfSk7XG5cbiAgaWYgKHJvdXRlSWQgPT09ICdwb3J0Zm9saW8nKSB7XG4gICAgcmV0dXJuIFtcbiAgICAgIGFkZEdyb3VwKDAsIFtcbiAgICAgICAgeyBlbDogc3VyZmFjZXMuaGVybywgc2xpZGU6IHRydWUgfSxcbiAgICAgICAgeyBlbDogc3VyZmFjZXMuY2hyb21lLCBzbGlkZTogdHJ1ZSB9LFxuICAgICAgXSksXG4gICAgICBhZGRHcm91cChHUk9VUEVEX1JPVVRFX09GRlNFVF9NUywgW1xuICAgICAgICB7IGVsOiBzdXJmYWNlcy53YWxsLCBzbGlkZTogZmFsc2UgfSxcbiAgICAgICAgeyBlbDogc3VyZmFjZXMuc2Vjb25kYXJ5LCBzbGlkZTogZmFsc2UgfSxcbiAgICAgIF0pLFxuICAgIF07XG4gIH1cblxuICBpZiAocm91dGVJZCA9PT0gJ2hvbWUnKSB7XG4gICAgcmV0dXJuIFtcbiAgICAgIGFkZEdyb3VwKDAsIFtcbiAgICAgICAgeyBlbDogc3VyZmFjZXMuaGVybywgc2xpZGU6IHRydWUgfSxcbiAgICAgICAgeyBlbDogc3VyZmFjZXMuY2hyb21lLCBzbGlkZTogdHJ1ZSB9LFxuICAgICAgICB7IGVsOiBzdXJmYWNlcy5zZWNvbmRhcnksIHNsaWRlOiB0cnVlIH0sXG4gICAgICBdKSxcbiAgICAgIGFkZEdyb3VwKEdST1VQRURfUk9VVEVfT0ZGU0VUX01TLCBbXG4gICAgICAgIHsgZWw6IHN1cmZhY2VzLndhbGwsIHNsaWRlOiBmYWxzZSB9LFxuICAgICAgXSksXG4gICAgXTtcbiAgfVxuXG4gIHJldHVybiBbXG4gICAgYWRkR3JvdXAoMCwgW1xuICAgICAgeyBlbDogc3VyZmFjZXMuY2hyb21lLCBzbGlkZTogdHJ1ZSB9LFxuICAgICAgeyBlbDogc3VyZmFjZXMuc2Vjb25kYXJ5LCBzbGlkZTogdHJ1ZSB9LFxuICAgIF0pLFxuICAgIGFkZEdyb3VwKEdST1VQRURfUk9VVEVfT0ZGU0VUX01TLCBbXG4gICAgICB7IGVsOiBzdXJmYWNlcy53YWxsLCBzbGlkZTogZmFsc2UgfSxcbiAgICAgIHsgZWw6IHN1cmZhY2VzLmhlcm8sIHNsaWRlOiB0cnVlIH0sXG4gICAgXSksXG4gIF07XG59XG5cbmZ1bmN0aW9uIGdldEdyb3VwZWRUcmFuc2l0aW9uSXRlbXMocm91dGVJZCwgc3VyZmFjZVJlZnMpIHtcbiAgY29uc3QgZ3JvdXBzID0gYnVpbGRSb3V0ZVRyYW5zaXRpb25Hcm91cHMocm91dGVJZCwgc3VyZmFjZVJlZnMpO1xuICBjb25zdCBzZWVuID0gbmV3IFNldCgpO1xuICBjb25zdCBpdGVtcyA9IFtdO1xuICBncm91cHMuZm9yRWFjaCgoZ3JvdXApID0+IHtcbiAgICBncm91cC5pdGVtcy5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICBpZiAoIWl0ZW0/LmVsIHx8IHNlZW4uaGFzKGl0ZW0uZWwpKSByZXR1cm47XG4gICAgICBzZWVuLmFkZChpdGVtLmVsKTtcbiAgICAgIGl0ZW1zLnB1c2goaXRlbSk7XG4gICAgfSk7XG4gIH0pO1xuICByZXR1cm4gaXRlbXM7XG59XG5cbmZ1bmN0aW9uIHJlYWRSb3V0ZUVudGVyTW90aW9uKCkge1xuICByZXR1cm4ge1xuICAgIHk6IGdldENvbXB1dGVkU3R5bGUoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50KS5nZXRQcm9wZXJ0eVZhbHVlKCctLXJvdXRlLWVudGVyLXR5JykudHJpbSgpIHx8ICczcHgnLFxuICAgIGJsdXI6IGdldENvbXB1dGVkU3R5bGUoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50KS5nZXRQcm9wZXJ0eVZhbHVlKCctLXJvdXRlLWVudGVyLWJsdXInKS50cmltKCkgfHwgJzEuNXB4JyxcbiAgICBzY2FsZTogZ2V0Q29tcHV0ZWRTdHlsZShkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQpLmdldFByb3BlcnR5VmFsdWUoJy0tcm91dGUtZW50ZXItc2NhbGUnKS50cmltKCkgfHwgJzAuOTk0JyxcbiAgICBlYXNpbmc6IHJlYWRSb290RWFzaW5nKCctLXJvdXRlLWVudGVyLWVhc2UnLCAnY3ViaWMtYmV6aWVyKDAuMjIsIDAsIDAuMTYsIDEpJyksXG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldFJvdXRlRW50ZXJHcm91cENvbmZpZyhncm91cE5hbWUpIHtcbiAgcmV0dXJuIFJPVVRFX0VOVEVSX0dST1VQU1tncm91cE5hbWVdIHx8IFJPVVRFX0VOVEVSX0dST1VQUy5jb250ZXh0O1xufVxuXG5mdW5jdGlvbiBwYXJzZVJvdXRlRW50ZXJPcmRlcihlbCwgZmFsbGJhY2spIHtcbiAgY29uc3QgcmF3ID0gZWw/LmRhdGFzZXQ/LnJvdXRlRW50ZXJPcmRlciA/PyBlbD8uc3R5bGU/LmdldFByb3BlcnR5VmFsdWUoJy0taScpID8/ICcnO1xuICBjb25zdCBwYXJzZWQgPSBOdW1iZXIucGFyc2VJbnQoU3RyaW5nKHJhdyksIDEwKTtcbiAgcmV0dXJuIE51bWJlci5pc0Zpbml0ZShwYXJzZWQpID8gcGFyc2VkIDogZmFsbGJhY2s7XG59XG5cbmZ1bmN0aW9uIGdldFJvdXRlRW50ZXJUYXJnZXRzKHN1cmZhY2VSZWZzKSB7XG4gIGNvbnN0IHsgd2FsbCwgaGVybywgY2hyb21lLCBzZWNvbmRhcnkgfSA9IGdldENvbnRlbnRMYXllcnMoc3VyZmFjZVJlZnMpO1xuICBjb25zdCBzY29wZU5vZGVzID0gW3dhbGwsIGhlcm8sIGNocm9tZSwgc2Vjb25kYXJ5XS5maWx0ZXIoQm9vbGVhbik7XG4gIGNvbnN0IHNlZW4gPSBuZXcgU2V0KCk7XG4gIGNvbnN0IHRhcmdldHMgPSBbXTtcbiAgY29uc3QgZ3JvdXBDb3VudHMgPSBuZXcgTWFwKCk7XG5cbiAgc2NvcGVOb2Rlcy5mb3JFYWNoKChzY29wZSkgPT4ge1xuICAgIGNvbnN0IGNhbmRpZGF0ZXMgPSBbXG4gICAgICAuLi4oc2NvcGUubWF0Y2hlcz8uKFJPVVRFX0VOVEVSX1NFTEVDVE9SKSA/IFtzY29wZV0gOiBbXSksXG4gICAgICAuLi5BcnJheS5mcm9tKHNjb3BlLnF1ZXJ5U2VsZWN0b3JBbGw/LihST1VURV9FTlRFUl9TRUxFQ1RPUikgfHwgW10pLFxuICAgIF07XG5cbiAgICBjYW5kaWRhdGVzLmZvckVhY2goKGVsKSA9PiB7XG4gICAgICBpZiAoIWVsIHx8IHNlZW4uaGFzKGVsKSkgcmV0dXJuO1xuICAgICAgc2Vlbi5hZGQoZWwpO1xuICAgICAgY29uc3QgZ3JvdXAgPSBlbC5kYXRhc2V0LnJvdXRlRW50ZXIgfHwgJ2NvbnRleHQnO1xuICAgICAgY29uc3QgZmFsbGJhY2tPcmRlciA9IGdyb3VwQ291bnRzLmdldChncm91cCkgfHwgMDtcbiAgICAgIGNvbnN0IG9yZGVyID0gcGFyc2VSb3V0ZUVudGVyT3JkZXIoZWwsIGZhbGxiYWNrT3JkZXIpO1xuICAgICAgZ3JvdXBDb3VudHMuc2V0KGdyb3VwLCBNYXRoLm1heChmYWxsYmFja09yZGVyICsgMSwgb3JkZXIgKyAxKSk7XG4gICAgICBjb25zdCBjb25maWcgPSBnZXRSb3V0ZUVudGVyR3JvdXBDb25maWcoZ3JvdXApO1xuICAgICAgY29uc3QgZmluYWxPcGFjaXR5ID0gZ2V0Q29tcHV0ZWRTdHlsZShlbCkub3BhY2l0eSB8fCAnMSc7XG4gICAgICB0YXJnZXRzLnB1c2goe1xuICAgICAgICBlbCxcbiAgICAgICAgZ3JvdXAsXG4gICAgICAgIG9yZGVyLFxuICAgICAgICBkZWxheU1zOiBjb25maWcuc3RhcnRNcyArIChjb25maWcuc3RlcE1zICogb3JkZXIpLFxuICAgICAgICBkdXJhdGlvbk1zOiBjb25maWcuZHVyYXRpb25NcyxcbiAgICAgICAgZmluYWxPcGFjaXR5LFxuICAgICAgICBzbGlkZTogZWwuZGF0YXNldC5yb3V0ZUVudGVyU2xpZGUgPT09ICdmYWxzZScgPyBmYWxzZSA6IGNvbmZpZy5zbGlkZSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICByZXR1cm4gdGFyZ2V0cy5zb3J0KChhLCBiKSA9PiAoXG4gICAgYS5kZWxheU1zIC0gYi5kZWxheU1zXG4gICAgfHwgYS5ncm91cC5sb2NhbGVDb21wYXJlKGIuZ3JvdXApXG4gICAgfHwgYS5vcmRlciAtIGIub3JkZXJcbiAgKSk7XG59XG5cbmZ1bmN0aW9uIHNldFJvdXRlRW50ZXJJbml0aWFsU3RhdGUodGFyZ2V0cywgcm91dGVFbnRlck1vdGlvbikge1xuICB0YXJnZXRzLmZvckVhY2goKHsgZWwsIHNsaWRlIH0pID0+IHtcbiAgICBlbC5zdHlsZS50cmFuc2l0aW9uID0gJ25vbmUnO1xuICAgIGVsLnN0eWxlLm9wYWNpdHkgPSAnMCc7XG4gICAgZWwuc3R5bGUuZmlsdGVyID0gYGJsdXIoJHtyb3V0ZUVudGVyTW90aW9uLmJsdXJ9KWA7XG4gICAgZWwuc3R5bGUudHJhbnNmb3JtID0gc2xpZGVcbiAgICAgID8gYHRyYW5zbGF0ZVkoJHtyb3V0ZUVudGVyTW90aW9uLnl9KSBzY2FsZSgke3JvdXRlRW50ZXJNb3Rpb24uc2NhbGV9KWBcbiAgICAgIDogJ3RyYW5zbGF0ZVkoMCkgc2NhbGUoMSknO1xuICAgIGVsLnN0eWxlLnBvaW50ZXJFdmVudHMgPSAnbm9uZSc7XG4gICAgZWwuc3R5bGUud2lsbENoYW5nZSA9ICdvcGFjaXR5LCB0cmFuc2Zvcm0sIGZpbHRlcic7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBwbGF5Um91dGVFbnRlclRhcmdldHModGFyZ2V0cywgcm91dGVFbnRlck1vdGlvbikge1xuICB0YXJnZXRzLmZvckVhY2goKHsgZWwsIGRlbGF5TXMsIGR1cmF0aW9uTXMsIGZpbmFsT3BhY2l0eSB9KSA9PiB7XG4gICAgZWwuc3R5bGUudHJhbnNpdGlvbiA9IFtcbiAgICAgIGBvcGFjaXR5ICR7ZHVyYXRpb25Nc31tcyAke3JvdXRlRW50ZXJNb3Rpb24uZWFzaW5nfSAke2RlbGF5TXN9bXNgLFxuICAgICAgYHRyYW5zZm9ybSAke2R1cmF0aW9uTXN9bXMgJHtyb3V0ZUVudGVyTW90aW9uLmVhc2luZ30gJHtkZWxheU1zfW1zYCxcbiAgICAgIGBmaWx0ZXIgJHtkdXJhdGlvbk1zfW1zICR7cm91dGVFbnRlck1vdGlvbi5lYXNpbmd9ICR7ZGVsYXlNc31tc2AsXG4gICAgXS5qb2luKCcsICcpO1xuICAgIGVsLnN0eWxlLm9wYWNpdHkgPSBmaW5hbE9wYWNpdHkgfHwgJzEnO1xuICAgIGVsLnN0eWxlLmZpbHRlciA9ICdibHVyKDApJztcbiAgICBlbC5zdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlWSgwKSBzY2FsZSgxKSc7XG4gICAgc2V0U3RhYmxlVGltZW91dCgoKSA9PiB7XG4gICAgICBlbC5zdHlsZS5vcGFjaXR5ID0gJyc7XG4gICAgICBlbC5zdHlsZS50cmFuc2Zvcm0gPSAnJztcbiAgICAgIGVsLnN0eWxlLmZpbHRlciA9ICcnO1xuICAgICAgZWwuc3R5bGUudHJhbnNpdGlvbiA9ICcnO1xuICAgICAgZWwuc3R5bGUudHJhbnNpdGlvbkRlbGF5ID0gJyc7XG4gICAgICBlbC5zdHlsZS5wb2ludGVyRXZlbnRzID0gJyc7XG4gICAgICBlbC5zdHlsZS53aWxsQ2hhbmdlID0gJyc7XG4gICAgfSwgZGVsYXlNcyArIGR1cmF0aW9uTXMgKyA4MCk7XG4gIH0pO1xufVxuXG4vKiDilIDilIAgYmFja2Ryb3AgY2xlYW51cCAod2l0aCBkaXJlY3QtRE9NIGZhbGxiYWNrKSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAgKi9cblxuZnVuY3Rpb24gZm9yY2VCYWNrZHJvcERpc21pc3MoeyBpbnN0YW50ID0gZmFsc2UgfSA9IHt9KSB7XG4gIHRyeSB7XG4gICAgc2V0VHJhbnNpdGlvblBoYXNlKFRSQU5TSVRJT05fUEhBU0VTLklETEUpO1xuICAgIGNsZWFyVHJhbnNpdGlvblJldHVybmluZ1N0YXRlKCk7XG4gICAgY29uc3QgYmx1ciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtb2RhbC1ibHVyLWxheWVyJyk7XG4gICAgY29uc3QgY29udGVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtb2RhbC1jb250ZW50LWxheWVyJyk7XG4gICAgaWYgKGluc3RhbnQpIHtcbiAgICAgIFtibHVyLCBjb250ZW50XS5mb3JFYWNoKChsYXllcikgPT4ge1xuICAgICAgICBpZiAobGF5ZXIpIGxheWVyLnN0eWxlLnRyYW5zaXRpb24gPSAnbm9uZSc7XG4gICAgICB9KTtcbiAgICB9XG4gICAgaWYgKGJsdXIpIGJsdXIuY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJyk7XG4gICAgaWYgKGNvbnRlbnQpIGNvbnRlbnQuY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJyk7XG4gICAgYmx1cj8uc2V0QXR0cmlidXRlKCdhcmlhLWhpZGRlbicsICd0cnVlJyk7XG4gICAgY29udGVudD8uc2V0QXR0cmlidXRlKCdhcmlhLWhpZGRlbicsICd0cnVlJyk7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2N1c3RvbS1jdXJzb3InKT8uY2xhc3NMaXN0LnJlbW92ZSgnbW9kYWwtYWN0aXZlJyk7XG4gICAgaWYgKGluc3RhbnQgJiYgYmx1cikge1xuICAgICAgdm9pZCBibHVyLm9mZnNldFdpZHRoO1xuICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgICAgW2JsdXIsIGNvbnRlbnRdLmZvckVhY2goKGxheWVyKSA9PiBsYXllcj8uc3R5bGUucmVtb3ZlUHJvcGVydHkoJ3RyYW5zaXRpb24nKSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgY29uc3Qgc2NlbmUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYWJzLXNjZW5lJyk7XG4gICAgaWYgKHNjZW5lKSBzY2VuZS5jbGFzc0xpc3QucmVtb3ZlKCdnYXRlLWRlcHRoLWFjdGl2ZScpO1xuICB9IGNhdGNoIHtcbiAgICAvKiBuby1vcCAqL1xuICB9XG59XG5cbmZ1bmN0aW9uIGRpc21pc3NHYXRlQmFja2Ryb3Aob3B0aW9ucyA9IHt9KSB7XG4gIGlmIChvcHRpb25zLmluc3RhbnQpIHtcbiAgICBmb3JjZUJhY2tkcm9wRGlzbWlzcyhvcHRpb25zKTtcbiAgfVxuICBpbXBvcnQoXCIvc3JjL2xlZ2FjeS9tb2R1bGVzL3VpL2dhdGUtbW9kYWwtc2hhcmVkLmpzXCIpXG4gICAgLnRoZW4oKG0pID0+IG0uZGlzbWlzc0dhdGVCYWNrZHJvcChvcHRpb25zKSlcbiAgICAuY2F0Y2goKCkgPT4gZm9yY2VCYWNrZHJvcERpc21pc3Mob3B0aW9ucykpO1xufVxuXG4vKiDilIDilIAgYW5pbWF0aW9uIHRyYWNraW5nIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgCAqL1xuXG5mdW5jdGlvbiBjYW5jZWxBY3RpdmVBbmltYXRpb25zKCkge1xuICBhY3RpdmVBbmltYXRpb25zLmZvckVhY2goKGEpID0+IHtcbiAgICB0cnkge1xuICAgICAgYS5jYW5jZWwoKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8qIG5vLW9wICovXG4gICAgfVxuICB9KTtcbiAgYWN0aXZlQW5pbWF0aW9ucyA9IFtdO1xufVxuXG5mdW5jdGlvbiBjb21taXRTdGFnZ2VyU3R5bGVzKHJvdXRlSWQsIHN1cmZhY2VSZWZzKSB7XG4gIGdldEdyb3VwZWRUcmFuc2l0aW9uSXRlbXMocm91dGVJZCwgc3VyZmFjZVJlZnMpLmZvckVhY2goKHsgZWwgfSkgPT4ge1xuICAgIGVsLnN0eWxlLm9wYWNpdHkgPSAnMSc7XG4gICAgZWwuc3R5bGUudHJhbnNmb3JtID0gJyc7XG4gICAgZWwuc3R5bGUuZmlsdGVyID0gJyc7XG4gICAgZWwuc3R5bGUud2lsbENoYW5nZSA9ICdhdXRvJztcbiAgfSk7XG4gIGdldFJvdXRlRW50ZXJUYXJnZXRzKHN1cmZhY2VSZWZzKS5mb3JFYWNoKCh7IGVsIH0pID0+IHtcbiAgICBlbC5zdHlsZS5vcGFjaXR5ID0gJyc7XG4gICAgZWwuc3R5bGUudHJhbnNmb3JtID0gJyc7XG4gICAgZWwuc3R5bGUuZmlsdGVyID0gJyc7XG4gICAgZWwuc3R5bGUudHJhbnNpdGlvbiA9ICcnO1xuICAgIGVsLnN0eWxlLnRyYW5zaXRpb25EZWxheSA9ICcnO1xuICAgIGVsLnN0eWxlLnBvaW50ZXJFdmVudHMgPSAnJztcbiAgICBlbC5zdHlsZS53aWxsQ2hhbmdlID0gJyc7XG4gIH0pO1xufVxuXG4vKiDilIDilIAgc2luZ2xlIGNsZWFudXAgcGF0aCAoaWRlbXBvdGVudCwgYWx3YXlzIHNhZmUgdG8gY2FsbCkg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAICovXG5cbmZ1bmN0aW9uIGZpbmFsaXplVHJhbnNpdGlvbihcbiAgaXNHYXRlLFxuICByb3V0ZUlkLFxuICBzdXJmYWNlUmVmcyxcbiAge1xuICAgIHN1cHByZXNzUmV0dXJuQW5pbWF0aW9uID0gZmFsc2UsXG4gICAgZ2F0ZUJhY2tkcm9wRGlzbWlzc2VkID0gZmFsc2UsXG4gICAgcHJlc2VydmVUcmFuc2l0aW9uUGhhc2UgPSBmYWxzZSxcbiAgfSA9IHt9XG4pIHtcbiAgY2FuY2VsQWN0aXZlQW5pbWF0aW9ucygpO1xuICBjb21taXRTdGFnZ2VyU3R5bGVzKHJvdXRlSWQsIHN1cmZhY2VSZWZzKTtcbiAgc2V0Um91dGVMYXllclZpc2liaWxpdHkodHJ1ZSwgc3VyZmFjZVJlZnMpO1xuICBpZiAoaXNHYXRlICYmICFnYXRlQmFja2Ryb3BEaXNtaXNzZWQpIHtcbiAgICBkaXNtaXNzR2F0ZUJhY2tkcm9wKHsgc3VwcHJlc3NSZXR1cm5BbmltYXRpb24gfSk7XG4gIH1cbiAgY2xlYXJMZWdhY3lSb3V0ZVRyYW5zaXRpb25GbGFncygpO1xuICBpZiAoIXByZXNlcnZlVHJhbnNpdGlvblBoYXNlKSB7XG4gICAgc2V0VHJhbnNpdGlvblBoYXNlKFRSQU5TSVRJT05fUEhBU0VTLklETEUpO1xuICB9XG4gIHNldEluc3RydW1lbnRXYWtlU3RhdGUobnVsbCk7XG5cbiAgLy8gUmVzdG9yZSBjb250ZW50IGxheWVycy5cbiAgY29uc3QgeyB3YWxsLCBoZXJvLCB1aSwgY2hyb21lLCBzZWNvbmRhcnkgfSA9IGdldENvbnRlbnRMYXllcnMoc3VyZmFjZVJlZnMpO1xuICBpZiAod2FsbCkgeyB3YWxsLnN0eWxlLm9wYWNpdHkgPSAnMSc7IHdhbGwuc3R5bGUud2lsbENoYW5nZSA9ICdhdXRvJzsgfVxuICBpZiAoaGVybykgeyBoZXJvLnN0eWxlLm9wYWNpdHkgPSAnMSc7IGhlcm8uc3R5bGUud2lsbENoYW5nZSA9ICdhdXRvJzsgfVxuICBpZiAodWkpIHsgdWkuc3R5bGUub3BhY2l0eSA9ICcxJzsgdWkuc3R5bGUud2lsbENoYW5nZSA9ICdhdXRvJzsgfVxuICBpZiAoY2hyb21lKSB7IGNocm9tZS5zdHlsZS5vcGFjaXR5ID0gJzEnOyBjaHJvbWUuc3R5bGUud2lsbENoYW5nZSA9ICdhdXRvJzsgfVxuICBpZiAoc2Vjb25kYXJ5KSB7IHNlY29uZGFyeS5zdHlsZS5vcGFjaXR5ID0gJzEnOyBzZWNvbmRhcnkuc3R5bGUud2lsbENoYW5nZSA9ICdhdXRvJzsgfVxuICBbd2FsbCwgaGVybywgdWksIGNocm9tZSwgc2Vjb25kYXJ5XS5mb3JFYWNoKChlbCkgPT4ge1xuICAgIGlmICghZWwpIHJldHVybjtcbiAgICBlbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eSgndmlzaWJpbGl0eScpO1xuICAgIGVsLnN0eWxlLnJlbW92ZVByb3BlcnR5KCdwb2ludGVyLWV2ZW50cycpO1xuICAgIGVsLnN0eWxlLnJlbW92ZVByb3BlcnR5KCd0cmFuc2Zvcm0nKTtcbiAgICBlbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eSgnZmlsdGVyJyk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBpbnRlcnJ1cHRUcmFuc2l0aW9uRm9yUG9wc3RhdGUoaXNHYXRlLCByb3V0ZUlkLCBzdXJmYWNlUmVmcykge1xuICBjYW5jZWxBY3RpdmVBbmltYXRpb25zKCk7XG4gIGNvbW1pdFN0YWdnZXJTdHlsZXMocm91dGVJZCwgc3VyZmFjZVJlZnMpO1xuICBpZiAoaXNHYXRlKSB7XG4gICAgZGlzbWlzc0dhdGVCYWNrZHJvcCh7IHN1cHByZXNzUmV0dXJuQW5pbWF0aW9uOiB0cnVlIH0pO1xuICB9XG4gIGNsZWFyTGVnYWN5Um91dGVUcmFuc2l0aW9uRmxhZ3MoKTtcbiAgc2V0Um91dGVMYXllclZpc2liaWxpdHkoZmFsc2UsIHN1cmZhY2VSZWZzKTtcbiAgc2V0VHJhbnNpdGlvblBoYXNlKFRSQU5TSVRJT05fUEhBU0VTLklETEUpO1xuXG4gIGNvbnN0IHsgd2FsbCwgaGVybywgdWkgfSA9IGdldENvbnRlbnRMYXllcnMoc3VyZmFjZVJlZnMpO1xuICBpZiAod2FsbCkgd2FsbC5zdHlsZS53aWxsQ2hhbmdlID0gJ2F1dG8nO1xuICBpZiAoaGVybykgaGVyby5zdHlsZS53aWxsQ2hhbmdlID0gJ2F1dG8nO1xuICBpZiAodWkpIHVpLnN0eWxlLndpbGxDaGFuZ2UgPSAnYXV0byc7XG4gIHNldEluc3RydW1lbnRXYWtlU3RhdGUobnVsbCk7XG59XG5cbi8qIOKUgOKUgCBmYWRlIG91dCBjb250ZW50IGxheWVycyAod2FsbCBzdGF5cyB2aXNpYmxlKSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAgKi9cblxuZnVuY3Rpb24gZmFkZU91dENvbnRlbnQoZHVyYXRpb25NcywgZWFzaW5nID0gRUFTRV9PVVQsIHN1cmZhY2VSZWZzLCBvcHRpb25zID0ge30pIHtcbiAgY29uc3QgeyB3YWxsLCBoZXJvLCBjaHJvbWUsIHNlY29uZGFyeSB9ID0gZ2V0Q29udGVudExheWVycyhzdXJmYWNlUmVmcyk7XG4gIGNvbnN0IGZpbmFsT3BhY2l0eSA9IE51bWJlci5pc0Zpbml0ZShvcHRpb25zPy5maW5hbE9wYWNpdHkpID8gb3B0aW9ucy5maW5hbE9wYWNpdHkgOiAwO1xuICBjb25zdCBhbmltcyA9IFtdO1xuICBjb25zdCBzZWVuID0gbmV3IFNldCgpO1xuXG4gIHNldEluc3RydW1lbnRXYWtlU3RhdGUoJ291dCcpO1xuXG4gIFt3YWxsLCBoZXJvLCBjaHJvbWUsIHNlY29uZGFyeV0uZm9yRWFjaCgoZWwpID0+IHtcbiAgICBpZiAoIWVsKSByZXR1cm47XG4gICAgaWYgKHNlZW4uaGFzKGVsKSkgcmV0dXJuO1xuICAgIHNlZW4uYWRkKGVsKTtcbiAgICBpZiAodHlwZW9mIGVsLmFuaW1hdGUgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGVsLnN0eWxlLm9wYWNpdHkgPSBTdHJpbmcoZmluYWxPcGFjaXR5KTtcbiAgICAgIGVsLnN0eWxlLmZpbHRlciA9ICdibHVyKHZhcigtLWluc3RydW1lbnQtd2FrZS1ibHVyKSknO1xuICAgICAgZWwuc3R5bGUudHJhbnNmb3JtID0gJ3NjYWxlKHZhcigtLWluc3RydW1lbnQtd2FrZS1yZWNlZGUtc2NhbGUpKSc7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGFuaW0gPSBlbC5hbmltYXRlKFxuICAgICAgW1xuICAgICAgICB7IG9wYWNpdHk6IDEsIGZpbHRlcjogJ2JsdXIoMCknLCB0cmFuc2Zvcm06ICdzY2FsZSgxKScgfSxcbiAgICAgICAge1xuICAgICAgICAgIG9wYWNpdHk6IGZpbmFsT3BhY2l0eSxcbiAgICAgICAgICBmaWx0ZXI6ICdibHVyKHZhcigtLWluc3RydW1lbnQtd2FrZS1ibHVyKSknLFxuICAgICAgICAgIHRyYW5zZm9ybTogJ3NjYWxlKHZhcigtLWluc3RydW1lbnQtd2FrZS1yZWNlZGUtc2NhbGUpKScsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgeyBkdXJhdGlvbjogZHVyYXRpb25NcywgZWFzaW5nLCBmaWxsOiAnZm9yd2FyZHMnIH1cbiAgICApO1xuICAgIGFjdGl2ZUFuaW1hdGlvbnMucHVzaChhbmltKTtcbiAgICBhbmltcy5wdXNoKGFuaW0pO1xuICB9KTtcblxuICBpZiAoYW5pbXMubGVuZ3RoID09PSAwKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG5cbiAgcmV0dXJuIFByb21pc2UuYWxsKFxuICAgIGFuaW1zLm1hcCgoYSkgPT4gbmV3IFByb21pc2UoKHIpID0+IHtcbiAgICAgIGxldCBzZXR0bGVkID0gZmFsc2U7XG4gICAgICBjb25zdCBmaW5pc2ggPSAoKSA9PiB7XG4gICAgICAgIGlmIChzZXR0bGVkKSByZXR1cm47XG4gICAgICAgIHNldHRsZWQgPSB0cnVlO1xuICAgICAgICByKCk7XG4gICAgICB9O1xuICAgICAgYS5vbmZpbmlzaCA9IGZpbmlzaDtcbiAgICAgIGEub25jYW5jZWwgPSBmaW5pc2g7XG4gICAgICBzZXRTdGFibGVUaW1lb3V0KGZpbmlzaCwgZHVyYXRpb25NcyArIDgwKTtcbiAgICB9KSlcbiAgKTtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlUG9ydGZvbGlvR2F0ZVNjZW5lQnJpZGdlKCkge1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1wb3J0Zm9saW8tZ2F0ZS1zY2VuZS1icmlkZ2VdJyk/LnJlbW92ZSgpO1xufVxuXG5mdW5jdGlvbiBkaXNtaXNzUG9ydGZvbGlvR2F0ZVNjZW5lQnJpZGdlKHtcbiAgZHVyYXRpb25NcyA9IEVMRU1FTlRfUkVWRUFMX01TLFxuICBkZWxheU1zID0gMCxcbiAgZWFzaW5nID0gRUFTRV9PVVQsXG4gIGluc3RhbnQgPSBmYWxzZSxcbn0gPSB7fSkge1xuICBjb25zdCBicmlkZ2UgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1wb3J0Zm9saW8tZ2F0ZS1zY2VuZS1icmlkZ2VdJyk7XG4gIGlmICghYnJpZGdlKSByZXR1cm47XG4gIGlmIChpbnN0YW50IHx8IHR5cGVvZiBicmlkZ2UuYW5pbWF0ZSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIGJyaWRnZS5yZW1vdmUoKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCByZXNvbHZlZE9wYWNpdHkgPSBOdW1iZXIucGFyc2VGbG9hdChnZXRDb21wdXRlZFN0eWxlKGJyaWRnZSkub3BhY2l0eSk7XG4gIGNvbnN0IHN0YXJ0T3BhY2l0eSA9IE51bWJlci5pc0Zpbml0ZShyZXNvbHZlZE9wYWNpdHkpID8gcmVzb2x2ZWRPcGFjaXR5IDogMC41O1xuICBjb25zdCB0b3RhbE1zID0gTWF0aC5tYXgoMSwgZGVsYXlNcyArIGR1cmF0aW9uTXMpO1xuICBjb25zdCBob2xkT2Zmc2V0ID0gTWF0aC5taW4oMSwgTWF0aC5tYXgoMCwgZGVsYXlNcyAvIHRvdGFsTXMpKTtcbiAgY29uc3Qga2V5ZnJhbWVzID0gaG9sZE9mZnNldCA+IDBcbiAgICA/IFt7IG9wYWNpdHk6IHN0YXJ0T3BhY2l0eSwgb2Zmc2V0OiAwIH0sIHsgb3BhY2l0eTogc3RhcnRPcGFjaXR5LCBvZmZzZXQ6IGhvbGRPZmZzZXQgfSwgeyBvcGFjaXR5OiAwLCBvZmZzZXQ6IDEgfV1cbiAgICA6IFt7IG9wYWNpdHk6IHN0YXJ0T3BhY2l0eSB9LCB7IG9wYWNpdHk6IDAgfV07XG4gIGNvbnN0IGFuaW1hdGlvbiA9IGJyaWRnZS5hbmltYXRlKGtleWZyYW1lcywgeyBkdXJhdGlvbjogdG90YWxNcywgZWFzaW5nLCBmaWxsOiAnZm9yd2FyZHMnIH0pO1xuICBhY3RpdmVBbmltYXRpb25zLnB1c2goYW5pbWF0aW9uKTtcbiAgbGV0IHNldHRsZWQgPSBmYWxzZTtcbiAgY29uc3QgcmVtb3ZlID0gKCkgPT4ge1xuICAgIGlmIChzZXR0bGVkKSByZXR1cm47XG4gICAgc2V0dGxlZCA9IHRydWU7XG4gICAgYnJpZGdlLnJlbW92ZSgpO1xuICB9O1xuICBhbmltYXRpb24ub25maW5pc2ggPSByZW1vdmU7XG4gIGFuaW1hdGlvbi5vbmNhbmNlbCA9IHJlbW92ZTtcbiAgc2V0U3RhYmxlVGltZW91dChyZW1vdmUsIHRvdGFsTXMgKyA4MCk7XG59XG5cbmZ1bmN0aW9uIHJlbGVhc2VQb3J0Zm9saW9EZWNrKHJlYXNvbiA9ICdyb3V0ZS1pbicpIHtcbiAgY29uc3Qgcm9vdCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgcm9vdC5kYXRhc2V0LmFic1BvcnRmb2xpb1JldmVhbCA9IHJlYXNvbjtcbiAgY29uc3QgZ2VuZXJhdGlvbiA9IGdldEFjdGl2ZUxlZ2FjeVJ1bnRpbWVTbmFwc2hvdCgpLmdlbmVyYXRpb247XG4gIHdpbmRvdy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnYWJzOnBvcnRmb2xpbzpyZXZlYWwnLCB7XG4gICAgZGV0YWlsOiB7IGdlbmVyYXRpb24sIHJlYXNvbiB9LFxuICB9KSk7XG59XG5cbmZ1bmN0aW9uIGNsZWFyUG9ydGZvbGlvRGVja1JlbGVhc2UoKSB7XG4gIGRlbGV0ZSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuZGF0YXNldC5hYnNQb3J0Zm9saW9SZXZlYWw7XG59XG5cbmZ1bmN0aW9uIHNldFNpbXVsYXRpb25Gb2N1c1RyYW5zaXRpb25TdGF0ZShzdGF0ZSkge1xuICBjb25zdCByb290ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICBpZiAoc3RhdGUpIHtcbiAgICByb290LmRhdGFzZXQuYWJzU2ltdWxhdGlvbkZvY3VzVHJhbnNpdGlvbiA9IHN0YXRlO1xuICAgIHdpbmRvdy5fX0FCU19TSU1VTEFUSU9OX0ZPQ1VTX1RSQU5TSVRJT05fXyA9IHtcbiAgICAgIHBoYXNlOiBzdGF0ZSxcbiAgICAgIHN0YXJ0ZWRBdDogcGVyZm9ybWFuY2Uubm93KCksXG4gICAgfTtcbiAgICByZXR1cm47XG4gIH1cblxuICBkZWxldGUgcm9vdC5kYXRhc2V0LmFic1NpbXVsYXRpb25Gb2N1c1RyYW5zaXRpb247XG4gIHdpbmRvdy5fX0FCU19TSU1VTEFUSU9OX0ZPQ1VTX1RSQU5TSVRJT05fXyA9IHtcbiAgICBwaGFzZTogJ2lkbGUnLFxuICAgIHN0YXJ0ZWRBdDogcGVyZm9ybWFuY2Uubm93KCksXG4gIH07XG59XG5cbmZ1bmN0aW9uIHNldFNpbXVsYXRpb25TaGVsbFN0YWJpbGl0eShhY3RpdmUsIHN1cmZhY2VSZWZzLCBvcHRpb25zID0ge30pIHtcbiAgY29uc3Qgcm9vdCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgY29uc3QgeyBoZXJvLCB1aSwgY2hyb21lLCBzZWNvbmRhcnksIGZvb3RlciB9ID0gZ2V0Q29udGVudExheWVycyhzdXJmYWNlUmVmcyk7XG4gIGNvbnN0IHRpdGxlU3VyZmFjZSA9IG9wdGlvbnMudGl0bGVTdXJmYWNlIHx8ICcnO1xuICBjb25zdCBzdGFibGVTdXJmYWNlcyA9IFtoZXJvLCB1aSwgY2hyb21lLCBzZWNvbmRhcnksIGZvb3Rlcl07XG5cbiAgaWYgKCFhY3RpdmUpIHtcbiAgICBkZWxldGUgcm9vdC5kYXRhc2V0LmFic1NpbXVsYXRpb25TaGVsbFN0YWJsZTtcbiAgICBkZWxldGUgcm9vdC5kYXRhc2V0LmFic1NpbXVsYXRpb25UaXRsZVN1cmZhY2U7XG4gICAgc3RhYmxlU3VyZmFjZXMuZm9yRWFjaCgoZWwpID0+IHtcbiAgICAgIGlmICghZWwpIHJldHVybjtcbiAgICAgIGVsLnN0eWxlLnJlbW92ZVByb3BlcnR5KCdvcGFjaXR5Jyk7XG4gICAgICBlbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eSgndmlzaWJpbGl0eScpO1xuICAgICAgZWwuc3R5bGUucmVtb3ZlUHJvcGVydHkoJ3BvaW50ZXItZXZlbnRzJyk7XG4gICAgICBlbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eSgnZmlsdGVyJyk7XG4gICAgICBlbC5zdHlsZS53aWxsQ2hhbmdlID0gJ2F1dG8nO1xuICAgIH0pO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHJvb3QuZGF0YXNldC5hYnNTaW11bGF0aW9uU2hlbGxTdGFibGUgPSAndHJ1ZSc7XG4gIGlmICh0aXRsZVN1cmZhY2UpIHtcbiAgICByb290LmRhdGFzZXQuYWJzU2ltdWxhdGlvblRpdGxlU3VyZmFjZSA9IHRpdGxlU3VyZmFjZTtcbiAgfSBlbHNlIHtcbiAgICBkZWxldGUgcm9vdC5kYXRhc2V0LmFic1NpbXVsYXRpb25UaXRsZVN1cmZhY2U7XG4gIH1cblxuICBzdGFibGVTdXJmYWNlcy5mb3JFYWNoKChlbCkgPT4ge1xuICAgIGlmICghZWwpIHJldHVybjtcbiAgICBlbC5zdHlsZS5vcGFjaXR5ID0gJzEnO1xuICAgIGVsLnN0eWxlLnJlbW92ZVByb3BlcnR5KCd2aXNpYmlsaXR5Jyk7XG4gICAgZWwuc3R5bGUucmVtb3ZlUHJvcGVydHkoJ3BvaW50ZXItZXZlbnRzJyk7XG4gICAgZWwuc3R5bGUucmVtb3ZlUHJvcGVydHkoJ2ZpbHRlcicpO1xuICAgIGVsLnN0eWxlLndpbGxDaGFuZ2UgPSAnYXV0byc7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBnZXRTaW11bGF0aW9uVGl0bGVTdXJmYWNlRm9yUm91dGVDaGFuZ2UoY3VycmVudFJvdXRlSWQsIG5leHRSb3V0ZUlkKSB7XG4gIGlmIChjdXJyZW50Um91dGVJZCAhPT0gJ2hvbWUnICYmIG5leHRSb3V0ZUlkID09PSAnaG9tZScpIHJldHVybiAnZG9tLWhhbmRvZmYnO1xuICByZXR1cm4gJyc7XG59XG5cbmZ1bmN0aW9uIGdldFNpbXVsYXRpb25Gb2N1c0xheWVyKHN1cmZhY2VSZWZzKSB7XG4gIHJldHVybiBnZXRDb250ZW50TGF5ZXJzKHN1cmZhY2VSZWZzKS53YWxsO1xufVxuXG5mdW5jdGlvbiBjbGVhbnVwU2ltdWxhdGlvbkZvY3VzTGF5ZXIoc3VyZmFjZVJlZnMpIHtcbiAgY29uc3QgbGF5ZXIgPSBnZXRTaW11bGF0aW9uRm9jdXNMYXllcihzdXJmYWNlUmVmcyk7XG4gIGlmICghbGF5ZXIpIHJldHVybjtcbiAgbGF5ZXIuc3R5bGUucmVtb3ZlUHJvcGVydHkoJ3RyYW5zZm9ybScpO1xuICBsYXllci5zdHlsZS5yZW1vdmVQcm9wZXJ0eSgndHJhbnNmb3JtLW9yaWdpbicpO1xuICBsYXllci5zdHlsZS5yZW1vdmVQcm9wZXJ0eSgnd2lsbC1jaGFuZ2UnKTtcbiAgbGF5ZXIuc3R5bGUucmVtb3ZlUHJvcGVydHkoJ29wYWNpdHknKTtcbiAgbGF5ZXIuc3R5bGUucmVtb3ZlUHJvcGVydHkoJ2ZpbHRlcicpO1xuICBsYXllci5zdHlsZS5yZW1vdmVQcm9wZXJ0eSgncG9pbnRlci1ldmVudHMnKTtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlU2ltdWxhdGlvblRyYW5zYWN0aW9uU25hcHNob3RzKCkge1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuc2ltdWxhdGlvbi10cmFuc2FjdGlvbi1zbmFwc2hvdCcpLmZvckVhY2goKG5vZGUpID0+IG5vZGUucmVtb3ZlKCkpO1xufVxuXG5mdW5jdGlvbiByZXNldFNpbXVsYXRpb25Gb2N1c1RyYW5zaXRpb24oc3VyZmFjZVJlZnMsIHsgZGlzY2FyZFNuYXBzaG90cyA9IGZhbHNlIH0gPSB7fSkge1xuICBjbGVhbnVwU2ltdWxhdGlvbkZvY3VzTGF5ZXIoc3VyZmFjZVJlZnMpO1xuICBpZiAoZGlzY2FyZFNuYXBzaG90cykge1xuICAgIHJlbW92ZVNpbXVsYXRpb25UcmFuc2FjdGlvblNuYXBzaG90cygpO1xuICB9XG4gIHNldFNpbXVsYXRpb25TaGVsbFN0YWJpbGl0eShmYWxzZSwgc3VyZmFjZVJlZnMpO1xuICBzZXRTaW11bGF0aW9uRm9jdXNUcmFuc2l0aW9uU3RhdGUobnVsbCk7XG59XG5cbmZ1bmN0aW9uIGNhcHR1cmVTaW11bGF0aW9uVHJhbnNhY3Rpb25TbmFwc2hvdCgpIHtcbiAgY29uc3QgaG9zdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzaW11bGF0aW9ucycpO1xuICBjb25zdCBob3N0UmVjdCA9IGhvc3Q/LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICBpZiAoIWhvc3QgfHwgIWhvc3RSZWN0IHx8IGhvc3RSZWN0LndpZHRoIDwgMSB8fCBob3N0UmVjdC5oZWlnaHQgPCAxKSByZXR1cm4gbnVsbDtcblxuICByZW1vdmVTaW11bGF0aW9uVHJhbnNhY3Rpb25TbmFwc2hvdHMoKTtcbiAgY29uc3QgcGl4ZWxSYXRpbyA9IE1hdGgubWluKDIsIE1hdGgubWF4KDEsIHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvIHx8IDEpKTtcbiAgY29uc3Qgc25hcHNob3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgc25hcHNob3QuY2xhc3NOYW1lID0gJ3NpbXVsYXRpb24tdHJhbnNhY3Rpb24tc25hcHNob3QnO1xuICBzbmFwc2hvdC5kYXRhc2V0LnN0YXRlID0gJ2NhcHR1cmVkJztcbiAgc25hcHNob3Qud2lkdGggPSBNYXRoLm1heCgxLCBNYXRoLnJvdW5kKGhvc3RSZWN0LndpZHRoICogcGl4ZWxSYXRpbykpO1xuICBzbmFwc2hvdC5oZWlnaHQgPSBNYXRoLm1heCgxLCBNYXRoLnJvdW5kKGhvc3RSZWN0LmhlaWdodCAqIHBpeGVsUmF0aW8pKTtcbiAgc25hcHNob3Quc3R5bGUubGVmdCA9IGAke2hvc3RSZWN0LmxlZnR9cHhgO1xuICBzbmFwc2hvdC5zdHlsZS50b3AgPSBgJHtob3N0UmVjdC50b3B9cHhgO1xuICBzbmFwc2hvdC5zdHlsZS53aWR0aCA9IGAke2hvc3RSZWN0LndpZHRofXB4YDtcbiAgc25hcHNob3Quc3R5bGUuaGVpZ2h0ID0gYCR7aG9zdFJlY3QuaGVpZ2h0fXB4YDtcblxuICBjb25zdCBjb250ZXh0ID0gc25hcHNob3QuZ2V0Q29udGV4dCgnMmQnKTtcbiAgY29uc3Qgc291cmNlQ2FudmFzZXMgPSBBcnJheS5mcm9tKGhvc3QucXVlcnlTZWxlY3RvckFsbCgnY2FudmFzJykpXG4gICAgLmZpbHRlcigoY2FudmFzKSA9PiBjYW52YXMgIT09IHNuYXBzaG90ICYmIGNhbnZhcy53aWR0aCA+IDAgJiYgY2FudmFzLmhlaWdodCA+IDApXG4gICAgLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiB7XG4gICAgICBjb25zdCBsZWZ0WiA9IE51bWJlci5wYXJzZUZsb2F0KGdldENvbXB1dGVkU3R5bGUobGVmdCkuekluZGV4KSB8fCAwO1xuICAgICAgY29uc3QgcmlnaHRaID0gTnVtYmVyLnBhcnNlRmxvYXQoZ2V0Q29tcHV0ZWRTdHlsZShyaWdodCkuekluZGV4KSB8fCAwO1xuICAgICAgcmV0dXJuIGxlZnRaIC0gcmlnaHRaO1xuICAgIH0pO1xuICBsZXQgY2FwdHVyZWRMYXllcnMgPSAwO1xuICBzb3VyY2VDYW52YXNlcy5mb3JFYWNoKChjYW52YXMpID0+IHtcbiAgICBjb25zdCBzdHlsZSA9IGdldENvbXB1dGVkU3R5bGUoY2FudmFzKTtcbiAgICBjb25zdCByZWN0ID0gY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIGlmIChzdHlsZS5kaXNwbGF5ID09PSAnbm9uZScgfHwgc3R5bGUudmlzaWJpbGl0eSA9PT0gJ2hpZGRlbicgfHwgTnVtYmVyKHN0eWxlLm9wYWNpdHkpID09PSAwKSByZXR1cm47XG4gICAgaWYgKHJlY3Qud2lkdGggPCAxIHx8IHJlY3QuaGVpZ2h0IDwgMSkgcmV0dXJuO1xuICAgIHRyeSB7XG4gICAgICBjb250ZXh0Lmdsb2JhbEFscGhhID0gTnVtYmVyLnBhcnNlRmxvYXQoc3R5bGUub3BhY2l0eSkgfHwgMTtcbiAgICAgIGNvbnRleHQuZHJhd0ltYWdlKFxuICAgICAgICBjYW52YXMsXG4gICAgICAgIChyZWN0LmxlZnQgLSBob3N0UmVjdC5sZWZ0KSAqIHBpeGVsUmF0aW8sXG4gICAgICAgIChyZWN0LnRvcCAtIGhvc3RSZWN0LnRvcCkgKiBwaXhlbFJhdGlvLFxuICAgICAgICByZWN0LndpZHRoICogcGl4ZWxSYXRpbyxcbiAgICAgICAgcmVjdC5oZWlnaHQgKiBwaXhlbFJhdGlvLFxuICAgICAgKTtcbiAgICAgIGNhcHR1cmVkTGF5ZXJzICs9IDE7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBBIGZhaWxlZCBsYXllciBjYXB0dXJlIG11c3QgbmV2ZXIgYmxvY2sgdGhlIHJvdXRlIHN3aXRjaC5cbiAgICB9XG4gIH0pO1xuICBjb250ZXh0Lmdsb2JhbEFscGhhID0gMTtcbiAgaWYgKGNhcHR1cmVkTGF5ZXJzID09PSAwKSByZXR1cm4gbnVsbDtcblxuICBzbmFwc2hvdC5kYXRhc2V0LmNhcHR1cmVkTGF5ZXJzID0gU3RyaW5nKGNhcHR1cmVkTGF5ZXJzKTtcbiAgZG9jdW1lbnQuYm9keS5hcHBlbmQoc25hcHNob3QpO1xuICBsZXQgcmVsZWFzZWQgPSBmYWxzZTtcbiAgcmV0dXJuIHtcbiAgICBub2RlOiBzbmFwc2hvdCxcbiAgICBzaG93KCkge1xuICAgICAgaWYgKHJlbGVhc2VkIHx8ICFzbmFwc2hvdC5pc0Nvbm5lY3RlZCkgcmV0dXJuO1xuICAgICAgc25hcHNob3QuZGF0YXNldC5zdGF0ZSA9ICd2aXNpYmxlJztcbiAgICB9LFxuICAgIHJlbGVhc2UoeyBpbW1lZGlhdGUgPSBmYWxzZSB9ID0ge30pIHtcbiAgICAgIGlmIChyZWxlYXNlZCkgcmV0dXJuO1xuICAgICAgcmVsZWFzZWQgPSB0cnVlO1xuICAgICAgaWYgKGltbWVkaWF0ZSB8fCAhc25hcHNob3QuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgc25hcHNob3QucmVtb3ZlKCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHNuYXBzaG90LmRhdGFzZXQuc3RhdGUgPSAncmVsZWFzaW5nJztcbiAgICAgIHNldFN0YWJsZVRpbWVvdXQoKCkgPT4gc25hcHNob3QucmVtb3ZlKCksIDIwMCk7XG4gICAgfSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gYW5pbWF0ZVNpbXVsYXRpb25Gb2N1c0xheWVyKHN1cmZhY2VSZWZzLCB7XG4gIGRpcmVjdGlvbixcbiAgZHVyYXRpb25NcyxcbiAgbG9jYWxEdXJhdGlvbk1zLFxuICBlYXNpbmcsXG59KSB7XG4gIGNvbnN0IGxheWVyID0gZ2V0U2ltdWxhdGlvbkZvY3VzTGF5ZXIoc3VyZmFjZVJlZnMpO1xuICBpZiAobGF5ZXIpIHtcbiAgICBsYXllci5zdHlsZS5vcGFjaXR5ID0gJzEnO1xuICAgIGxheWVyLnN0eWxlLmZpbHRlciA9ICdub25lJztcbiAgICBsYXllci5zdHlsZS50cmFuc2Zvcm0gPSAnbm9uZSc7XG4gICAgbGF5ZXIuc3R5bGUudHJhbnNmb3JtT3JpZ2luID0gJzUwJSA1MCUnO1xuICAgIGxheWVyLnN0eWxlLndpbGxDaGFuZ2UgPSAnYXV0byc7XG4gICAgbGF5ZXIuc3R5bGUucG9pbnRlckV2ZW50cyA9IGRpcmVjdGlvbiA9PT0gJ291dCcgPyAnbm9uZScgOiAnJztcbiAgfVxuXG4gIHJldHVybiBydW5TaW11bGF0aW9uVmlzdWFsVHJhbnNpdGlvbihkaXJlY3Rpb24sIHtcbiAgICBkdXJhdGlvbk1zLFxuICAgIGxvY2FsRHVyYXRpb25NcyxcbiAgICBlYXNpbmcsXG4gICAgcmVhc29uOiAnc2hlbGwtcm91dGUtdHJhbnNpdGlvbicsXG4gIH0pO1xufVxuXG5mdW5jdGlvbiBnZXRTaW11bGF0aW9uRm9jdXNUaW1pbmdzKG9wdGlvbnMsIHJlZHVjZU1vdGlvbikge1xuICBpZiAocmVkdWNlTW90aW9uKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGV4aXQ6IDAsXG4gICAgICBlbnRlcjogMCxcbiAgICAgIGhvbGQ6IDAsXG4gICAgICBleGl0TG9jYWw6IDAsXG4gICAgICBlbnRlckxvY2FsOiAwLFxuICAgICAgZXhpdEVhc2luZzogU0lNVUxBVElPTl9GT0NVU19FQVNFX09VVCxcbiAgICAgIGVudGVyRWFzaW5nOiBTSU1VTEFUSU9OX0ZPQ1VTX0VBU0VfSU4sXG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgZXhpdDogcGFyc2VUcmFuc2l0aW9uTXMob3B0aW9ucy5leGl0TXMsIFNJTVVMQVRJT05fRk9DVVNfRVhJVF9NUyksXG4gICAgZW50ZXI6IHBhcnNlVHJhbnNpdGlvbk1zKG9wdGlvbnMuZW50ZXJNcywgU0lNVUxBVElPTl9GT0NVU19FTlRFUl9NUyksXG4gICAgaG9sZDogcGFyc2VUcmFuc2l0aW9uTXMob3B0aW9ucy5ob2xkTXMsIFNJTVVMQVRJT05fRk9DVVNfWkVST19IT0xEX01TKSxcbiAgICBleGl0TG9jYWw6IHBhcnNlVHJhbnNpdGlvbk1zKG9wdGlvbnMuZXhpdExvY2FsTXMsIFNJTVVMQVRJT05fRk9DVVNfRVhJVF9MT0NBTF9NUyksXG4gICAgZW50ZXJMb2NhbDogcGFyc2VUcmFuc2l0aW9uTXMob3B0aW9ucy5lbnRlckxvY2FsTXMsIFNJTVVMQVRJT05fRk9DVVNfRU5URVJfTE9DQUxfTVMpLFxuICAgIGV4aXRFYXNpbmc6IG9wdGlvbnMuZXhpdEVhc2luZyB8fCBTSU1VTEFUSU9OX0ZPQ1VTX0VBU0VfT1VULFxuICAgIGVudGVyRWFzaW5nOiBvcHRpb25zLmVudGVyRWFzaW5nIHx8IFNJTVVMQVRJT05fRk9DVVNfRUFTRV9JTixcbiAgfTtcbn1cblxuZnVuY3Rpb24gd2FpdEZvclNpbXVsYXRpb25Gb2N1c0hvbGQoZHVyYXRpb25Ncykge1xuICBpZiAoIWR1cmF0aW9uTXMpIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiBzZXRTdGFibGVUaW1lb3V0KHJlc29sdmUsIGR1cmF0aW9uTXMpKTtcbn1cblxuZnVuY3Rpb24gd2FpdEZvclJvdXRlUGFpbnRGcmFtZXMoY291bnQgPSAyKSB7XG4gIGlmICh0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJyB8fCB0eXBlb2Ygd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgfVxuXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGxldCByZW1haW5pbmcgPSBNYXRoLm1heCgxLCBjb3VudCk7XG4gICAgY29uc3QgdGljayA9ICgpID0+IHtcbiAgICAgIHJlbWFpbmluZyAtPSAxO1xuICAgICAgaWYgKHJlbWFpbmluZyA8PSAwKSB7XG4gICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSh0aWNrKTtcbiAgICB9O1xuICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGljayk7XG4gIH0pO1xufVxuXG4vKiDilIDilIAgcm91dGUgcmVhZHkg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAICovXG5cbmZ1bmN0aW9uIGhhc0NhbnZhc0J1ZmZlclJlYWR5KCkge1xuICBjb25zdCBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYycpO1xuICBpZiAoIWNhbnZhcykgcmV0dXJuIGZhbHNlO1xuICBjb25zdCBjc3NXID0gY2FudmFzLmNsaWVudFdpZHRoIHx8IDA7XG4gIGNvbnN0IGNzc0ggPSBjYW52YXMuY2xpZW50SGVpZ2h0IHx8IDA7XG4gIGlmIChjc3NXIDwgNjQgfHwgY3NzSCA8IDY0KSByZXR1cm4gZmFsc2U7XG4gIGNvbnN0IGRwciA9IE1hdGgubWluKHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvIHx8IDEsIDIpO1xuICBjb25zdCBtaW5XID0gTWF0aC5jZWlsKChjc3NXICsgMikgKiBkcHIpIC0gMjtcbiAgY29uc3QgbWluSCA9IE1hdGguY2VpbCgoY3NzSCArIDIpICogZHByKSAtIDI7XG4gIHJldHVybiBjYW52YXMud2lkdGggPj0gbWluVyAmJiBjYW52YXMuaGVpZ2h0ID49IG1pbkg7XG59XG5cbmZ1bmN0aW9uIGlzUmVjdFVzYWJsZShyZWN0KSB7XG4gIHJldHVybiBCb29sZWFuKHJlY3QgJiYgcmVjdC53aWR0aCA+IDAgJiYgcmVjdC5oZWlnaHQgPiAwKTtcbn1cblxuZnVuY3Rpb24gcmVjdEhhc1VzYWJsZVZpc2libGVBcmVhKGlubmVyUmVjdCwgb3V0ZXJSZWN0KSB7XG4gIGlmICghaXNSZWN0VXNhYmxlKGlubmVyUmVjdCkgfHwgIWlzUmVjdFVzYWJsZShvdXRlclJlY3QpKSByZXR1cm4gZmFsc2U7XG4gIGNvbnN0IHZpc2libGVXaWR0aCA9IE1hdGgubWF4KDAsIE1hdGgubWluKGlubmVyUmVjdC5yaWdodCwgb3V0ZXJSZWN0LnJpZ2h0KSAtIE1hdGgubWF4KGlubmVyUmVjdC5sZWZ0LCBvdXRlclJlY3QubGVmdCkpO1xuICBjb25zdCB2aXNpYmxlSGVpZ2h0ID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oaW5uZXJSZWN0LmJvdHRvbSwgb3V0ZXJSZWN0LmJvdHRvbSkgLSBNYXRoLm1heChpbm5lclJlY3QudG9wLCBvdXRlclJlY3QudG9wKSk7XG4gIHJldHVybiAoXG4gICAgdmlzaWJsZVdpZHRoID49IE1hdGgubWluKDI0MCwgb3V0ZXJSZWN0LndpZHRoICogMC41KVxuICAgICYmIHZpc2libGVIZWlnaHQgPj0gTWF0aC5taW4oOTYsIGlubmVyUmVjdC5oZWlnaHQgKiAwLjUpXG4gICk7XG59XG5cbmZ1bmN0aW9uIHJlY3RzTWF0Y2hXaXRoaW5UaHJlc2hvbGQocHJldmlvdXMsIG5leHQsIHRocmVzaG9sZFB4ID0gMikge1xuICBpZiAoIWlzUmVjdFVzYWJsZShwcmV2aW91cykgfHwgIWlzUmVjdFVzYWJsZShuZXh0KSkgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gKFxuICAgIE1hdGguYWJzKHByZXZpb3VzLnRvcCAtIG5leHQudG9wKSA8PSB0aHJlc2hvbGRQeFxuICAgICYmIE1hdGguYWJzKHByZXZpb3VzLmxlZnQgLSBuZXh0LmxlZnQpIDw9IHRocmVzaG9sZFB4XG4gICAgJiYgTWF0aC5hYnMocHJldmlvdXMud2lkdGggLSBuZXh0LndpZHRoKSA8PSB0aHJlc2hvbGRQeFxuICAgICYmIE1hdGguYWJzKHByZXZpb3VzLmhlaWdodCAtIG5leHQuaGVpZ2h0KSA8PSB0aHJlc2hvbGRQeFxuICApO1xufVxuXG5mdW5jdGlvbiBpc0VsZW1lbnRWaXNpYmx5UmV2ZWFsZWQoZWxlbWVudCkge1xuICBpZiAoIWVsZW1lbnQpIHJldHVybiBmYWxzZTtcbiAgY29uc3Qgc3R5bGVzID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUoZWxlbWVudCk7XG4gIHJldHVybiAoXG4gICAgc3R5bGVzLmRpc3BsYXkgIT09ICdub25lJ1xuICAgICYmIHN0eWxlcy52aXNpYmlsaXR5ICE9PSAnaGlkZGVuJ1xuICAgICYmIE51bWJlcihzdHlsZXMub3BhY2l0eSkgPiAwLjlcbiAgKTtcbn1cblxuZnVuY3Rpb24gaXNFbGVtZW50U3VyZmFjZVJlYWR5KGVsZW1lbnQpIHtcbiAgaWYgKCFpc0VsZW1lbnRWaXNpYmx5UmV2ZWFsZWQoZWxlbWVudCkpIHJldHVybiBmYWxzZTtcbiAgY29uc3QgcmVjdCA9IGVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gIHJldHVybiByZWN0LndpZHRoID49IDY0ICYmIHJlY3QuaGVpZ2h0ID49IDY0O1xufVxuXG5mdW5jdGlvbiBpc0NhbnZhc1N1cmZhY2VSZWFkeShzZWxlY3Rvcikge1xuICBjb25zdCBjYW52YXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgaWYgKCFpc0VsZW1lbnRTdXJmYWNlUmVhZHkoY2FudmFzKSkgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gY2FudmFzLndpZHRoID49IDY0ICYmIGNhbnZhcy5oZWlnaHQgPj0gNjQ7XG59XG5cbmZ1bmN0aW9uIGlzUG9ydGZvbGlvU2Nyb2xsUmFpbFJlYWR5KCkge1xuICBjb25zdCB3YWxsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NpbXVsYXRpb25zJyk7XG4gIGNvbnN0IG1vdW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BvcnRmb2xpb1Byb2plY3RNb3VudCcpO1xuICBjb25zdCBmaXJzdENhcmQgPSBtb3VudD8ucXVlcnlTZWxlY3RvcignLnBvcnRmb2xpby1kZWNrLWNhcmQuaXMtYWN0aXZlLCAucG9ydGZvbGlvLXByb2plY3QtbGFiZWwnKTtcbiAgaWYgKCF3YWxsIHx8ICFtb3VudCB8fCAhZmlyc3RDYXJkKSByZXR1cm4gZmFsc2U7XG4gIGNvbnN0IHdhbGxSZWN0ID0gd2FsbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgY29uc3QgY2FyZFJlY3QgPSBmaXJzdENhcmQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gIGNvbnN0IGRlY2tQcmVwYXJlZCA9IG1vdW50LmNsYXNzTGlzdC5jb250YWlucygnaXMtcG9ydGZvbGlvLWJvb3QtcHJlcGFyaW5nJyk7XG4gIGNvbnN0IGhhc1VzYWJsZUdlb21ldHJ5ID0gKFxuICAgIGlzUmVjdFVzYWJsZSh3YWxsUmVjdClcbiAgICAmJiBpc1JlY3RVc2FibGUoY2FyZFJlY3QpXG4gICAgJiYgY2FyZFJlY3Qud2lkdGggPj0gTWF0aC5taW4oMjQwLCB3YWxsUmVjdC53aWR0aCAqIDAuNSlcbiAgICAmJiBjYXJkUmVjdC5oZWlnaHQgPj0gOTZcbiAgICAmJiByZWN0SGFzVXNhYmxlVmlzaWJsZUFyZWEoY2FyZFJlY3QsIHdhbGxSZWN0KVxuICApO1xuICByZXR1cm4gKFxuICAgIGhhc1VzYWJsZUdlb21ldHJ5XG4gICAgJiYgKFxuICAgICAgZGVja1ByZXBhcmVkXG4gICAgICB8fCAoaXNFbGVtZW50VmlzaWJseVJldmVhbGVkKG1vdW50KSAmJiBpc0VsZW1lbnRWaXNpYmx5UmV2ZWFsZWQoZmlyc3RDYXJkKSlcbiAgICApXG4gICk7XG59XG5cbmZ1bmN0aW9uIGlzRGFpbHlMYWJSb3V0ZVJlYWR5KHJvdXRlSWQpIHtcbiAgY29uc3QgaXNMb2NhbEF1ZGl0SG9zdCA9IHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZSA9PT0gJ2xvY2FsaG9zdCcgfHwgd2luZG93LmxvY2F0aW9uLmhvc3RuYW1lID09PSAnMTI3LjAuMC4xJztcbiAgaWYgKGlzTG9jYWxBdWRpdEhvc3QgJiYgd2luZG93Ll9fQUJTX0FVRElUX0ZPUkNFX0RBSUxZX05PVF9SRUFEWV9fID09PSByb3V0ZUlkKSByZXR1cm4gZmFsc2U7XG4gIHN3aXRjaCAocm91dGVJZCkge1xuICAgIGNhc2UgJ3JlcGVsLXJvb20nOlxuICAgICAgcmV0dXJuIGlzQ2FudmFzU3VyZmFjZVJlYWR5KCcjcmVwZWwtcm9vbS1jYW52YXMnKVxuICAgICAgICAmJiBpc1NpbXVsYXRpb25WaXN1YWxUcmFuc2l0aW9uU291cmNlQWN0aXZlKHJvdXRlSWQpO1xuICAgIGNhc2UgJ2Zsb2NrLW9mLWJpcmRzJzpcbiAgICAgIHJldHVybiBpc0NhbnZhc1N1cmZhY2VSZWFkeSgnI2Zsb2NrLW9mLWJpcmRzLWNhbnZhcycpXG4gICAgICAgICYmIGlzU2ltdWxhdGlvblZpc3VhbFRyYW5zaXRpb25Tb3VyY2VBY3RpdmUocm91dGVJZCk7XG4gICAgY2FzZSAnbWluZXJhbC1ncm93dGgnOlxuICAgICAgcmV0dXJuIGlzQ2FudmFzU3VyZmFjZVJlYWR5KCcjbWluZXJhbC1ncm93dGgtY2FudmFzJylcbiAgICAgICAgJiYgaXNTaW11bGF0aW9uVmlzdWFsVHJhbnNpdGlvblNvdXJjZUFjdGl2ZShyb3V0ZUlkKTtcbiAgICBjYXNlICdyaWZ0LXJpbmdzJzpcbiAgICAgIHJldHVybiBpc0NhbnZhc1N1cmZhY2VSZWFkeSgnI3JpZnQtcmluZ3MtY2FudmFzJylcbiAgICAgICAgJiYgaXNTaW11bGF0aW9uVmlzdWFsVHJhbnNpdGlvblNvdXJjZUFjdGl2ZShyb3V0ZUlkKTtcbiAgICBjYXNlICdiZWFjaC1iYWxsLXJvb20nOiB7XG4gICAgICBjb25zdCBjb250YWluZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYmVhY2gtYmFsbC1yb29tLXNpbXVsYXRpb24nKTtcbiAgICAgIGNvbnN0IGxvYWRTdGF0ZSA9IGNvbnRhaW5lcj8uZGF0YXNldD8uYmVhY2hCYWxsUm9vbUxvYWRTdGF0ZTtcbiAgICAgIHJldHVybiBCb29sZWFuKFxuICAgICAgICBsb2FkU3RhdGUgPT09ICdyZWFkeSdcbiAgICAgICAgICAmJiBpc0NhbnZhc1N1cmZhY2VSZWFkeSgnLmJlYWNoLWJhbGwtcm9vbS1jYW52YXMnKVxuICAgICAgICAgICYmIGlzU2ltdWxhdGlvblZpc3VhbFRyYW5zaXRpb25Tb3VyY2VBY3RpdmUocm91dGVJZClcbiAgICAgICk7XG4gICAgfVxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNEYWlseUxhYlJvdXRlSWQocm91dGVJZCkge1xuICByZXR1cm4gREFJTFlfTEFCX1JPVVRFX0lEUy5oYXMocm91dGVJZCk7XG59XG5cbmZ1bmN0aW9uIHJlYWRSb3V0ZVJlYWR5U25hcHNob3Qocm91dGVJZCkge1xuICBpZiAocm91dGVJZCA9PT0gJ3BvcnRmb2xpbycpIHtcbiAgICByZXR1cm4ge1xuICAgICAgd2FsbFJlY3Q6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzaW11bGF0aW9ucycpPy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSB8fCBudWxsLFxuICAgICAgaGVyb1JlY3Q6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdoZXJvLXRpdGxlJyk/LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpIHx8IG51bGwsXG4gICAgICBjYXJkUmVjdDogZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnBvcnRmb2xpby1kZWNrLWNhcmQuaXMtYWN0aXZlLCAucG9ydGZvbGlvLXByb2plY3QtbGFiZWwnKT8uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkgfHwgbnVsbCxcbiAgICAgIHRvcGJhclJlY3Q6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy51aS10b3AtbWFpbi5yb3V0ZS10b3BiYXInKT8uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkgfHwgbnVsbCxcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzUm91dGVSZWFkeVNuYXBzaG90U3RhYmxlKHJvdXRlSWQsIHByZXZpb3VzLCBuZXh0LCBvcHRpb25zID0ge30pIHtcbiAgaWYgKHJvdXRlSWQgIT09ICdwb3J0Zm9saW8nKSByZXR1cm4gdHJ1ZTtcbiAgaWYgKG9wdGlvbnMubG9ja2VkR2F0ZUlkID09PSAncG9ydGZvbGlvJykgcmV0dXJuIHRydWU7XG4gIGlmICghcHJldmlvdXMgfHwgIW5leHQpIHJldHVybiBmYWxzZTtcbiAgY29uc3QgZGVja0ZhaWxlZCA9IGRvY3VtZW50LmJvZHk/LmNsYXNzTGlzdC5jb250YWlucygncG9ydGZvbGlvLWRlY2stZmFpbGVkJyk7XG4gIHJldHVybiAoXG4gICAgcmVjdHNNYXRjaFdpdGhpblRocmVzaG9sZChwcmV2aW91cy53YWxsUmVjdCwgbmV4dC53YWxsUmVjdCwgMilcbiAgICAmJiAoIXByZXZpb3VzLmhlcm9SZWN0IHx8ICFuZXh0Lmhlcm9SZWN0IHx8IHJlY3RzTWF0Y2hXaXRoaW5UaHJlc2hvbGQocHJldmlvdXMuaGVyb1JlY3QsIG5leHQuaGVyb1JlY3QsIDIpKVxuICAgICYmIChkZWNrRmFpbGVkIHx8IHJlY3RzTWF0Y2hXaXRoaW5UaHJlc2hvbGQocHJldmlvdXMuY2FyZFJlY3QsIG5leHQuY2FyZFJlY3QsIDIpKVxuICAgICYmIHJlY3RzTWF0Y2hXaXRoaW5UaHJlc2hvbGQocHJldmlvdXMudG9wYmFyUmVjdCwgbmV4dC50b3BiYXJSZWN0LCAyKVxuICApO1xufVxuXG5mdW5jdGlvbiBpc1JvdXRlQmFzZWxpbmVSZWFkeShyb3V0ZUlkLCBvcHRpb25zID0ge30pIHtcbiAgY29uc3QgYm9keSA9IGRvY3VtZW50LmJvZHk7XG4gIGlmICghYm9keSkgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChyb3V0ZUlkID09PSAnaG9tZScpIHtcbiAgICBjb25zdCBpc0hvbWVSb3V0ZSA9ICFib2R5LmNsYXNzTGlzdC5jb250YWlucygncG9ydGZvbGlvLXBhZ2UnKSAmJiAhYm9keS5jbGFzc0xpc3QuY29udGFpbnMoJ2N2LXBhZ2UnKTtcbiAgICBjb25zdCByb290ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICAgIGNvbnN0IGhlcm8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaGVyby10aXRsZScpO1xuICAgIGNvbnN0IHJvdXRlVGFicyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ1tkYXRhLXJvdXRlLXRhYl0nKTtcbiAgICBjb25zdCBib290T3ZlcmxheSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhYnMtYm9vdC1vdmVybGF5Jyk7XG4gICAgY29uc3QgYm9vdFN0YXRlID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmRhdGFzZXQuYWJzQm9vdFN0YXRlIHx8ICcnO1xuICAgIGNvbnN0IHJ1bnRpbWUgPSBnZXRBY3RpdmVMZWdhY3lSdW50aW1lU25hcHNob3QoKTtcbiAgICBjb25zdCBzZW1hbnRpY1RpdGxlUmVhZHkgPSBCb29sZWFuKFxuICAgICAgaGVybz8ucXVlcnlTZWxlY3RvcignLmhlcm8tdGl0bGVfX25hbWUnKT8udGV4dENvbnRlbnQ/LnRyaW0oKVxuICAgICAgJiYgaGVybz8ucXVlcnlTZWxlY3RvcignLmhlcm8tdGl0bGVfX3JvbGUnKT8udGV4dENvbnRlbnQ/LnRyaW0oKVxuICAgICk7XG4gICAgcmV0dXJuIEJvb2xlYW4oXG4gICAgICBpc0hvbWVSb3V0ZVxuICAgICAgJiYgaGVyb1xuICAgICAgJiYgcm91dGVUYWJzLmxlbmd0aCA+PSA0XG4gICAgICAmJiBoYXNDYW52YXNCdWZmZXJSZWFkeSgpXG4gICAgICAmJiAhYm9vdE92ZXJsYXlcbiAgICAgICYmIGJvb3RTdGF0ZSAhPT0gJ2Jvb3RpbmcnXG4gICAgICAmJiBydW50aW1lLnJvdXRlSWQgPT09ICdob21lJ1xuICAgICAgJiYgcnVudGltZS5zdGF0dXMgPT09ICdyZWFkeSdcbiAgICAgICYmIHJvb3QuZGF0YXNldC5hYnNIb21lUm91dGVSZWFkeSA9PT0gJ3RydWUnXG4gICAgICAmJiAocm9vdC5kYXRhc2V0LmFic0hvbWVDYW52YXNUaXRsZVJlYWR5ID09PSAndHJ1ZScgfHwgc2VtYW50aWNUaXRsZVJlYWR5KVxuICAgICk7XG4gIH1cblxuICBpZiAocm91dGVJZCA9PT0gJ3BvcnRmb2xpbycpIHtcbiAgICBjb25zdCBkZWNrRmFpbGVkID0gYm9keS5jbGFzc0xpc3QuY29udGFpbnMoJ3BvcnRmb2xpby1kZWNrLWZhaWxlZCcpO1xuICAgIGNvbnN0IGxvY2tlZEdhdGUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1yb3V0ZS1jb250ZW50PVwicG9ydGZvbGlvLWdhdGVcIl0nKTtcbiAgICBpZiAob3B0aW9ucy5sb2NrZWRHYXRlSWQgPT09ICdwb3J0Zm9saW8nKSB7XG4gICAgICByZXR1cm4gQm9vbGVhbihib2R5LmNsYXNzTGlzdC5jb250YWlucygncG9ydGZvbGlvLXBhZ2UnKSAmJiBsb2NrZWRHYXRlKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMubG9ja2VkR2F0ZUlkID09PSBudWxsICYmIGxvY2tlZEdhdGUpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIEJvb2xlYW4oXG4gICAgICBib2R5LmNsYXNzTGlzdC5jb250YWlucygncG9ydGZvbGlvLXBhZ2UnKVxuICAgICAgJiYgKFxuICAgICAgICBsb2NrZWRHYXRlXG4gICAgICAgIHx8IChcbiAgICAgICAgICBoYXNDYW52YXNCdWZmZXJSZWFkeSgpXG4gICAgICAgICAgJiYgKFxuICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwb3J0Zm9saW9Qcm9qZWN0TW91bnQnKVxuICAgICAgICAgICYmIChkZWNrRmFpbGVkIHx8IGlzUG9ydGZvbGlvU2Nyb2xsUmFpbFJlYWR5KCkpXG4gICAgICAgICAgKVxuICAgICAgICApXG4gICAgICApXG4gICAgKTtcbiAgfVxuXG4gIGlmIChyb3V0ZUlkID09PSAnYWJvdXQnKSB7XG4gICAgcmV0dXJuIEJvb2xlYW4oXG4gICAgICBib2R5LmNsYXNzTGlzdC5jb250YWlucygnYWJvdXQtcGFnZScpXG4gICAgICAmJiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1yb3V0ZS1jb250ZW50PVwiYWJvdXRcIl0nKVxuICAgICk7XG4gIH1cblxuICBpZiAocm91dGVJZCA9PT0gJ2NvbnRhY3QnKSB7XG4gICAgcmV0dXJuIEJvb2xlYW4oXG4gICAgICBib2R5LmNsYXNzTGlzdC5jb250YWlucygnY29udGFjdC1wYWdlJylcbiAgICAgICYmIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLXJvdXRlLWNvbnRlbnQ9XCJjb250YWN0XCJdJylcbiAgICApO1xuICB9XG5cbiAgaWYgKGlzRGFpbHlMYWJSb3V0ZUlkKHJvdXRlSWQpKSB7XG4gICAgcmV0dXJuIGlzRGFpbHlMYWJSb3V0ZVJlYWR5KHJvdXRlSWQpO1xuICB9XG5cbiAgcmV0dXJuIEJvb2xlYW4oZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FwcC1mcmFtZScpKTtcbn1cblxuZnVuY3Rpb24gd2FpdEZvclJvdXRlUmVhZHkocm91dGVJZCwgdGltZW91dE1zLCBvcHRpb25zID0ge30pIHtcbiAgbGV0IHNldHRsZSA9ICgpID0+IHt9O1xuICBjb25zdCBwcm9taXNlID0gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBsZXQgc2V0dGxlZCA9IGZhbHNlO1xuICAgIGxldCBwb2xsSWQgPSAwO1xuICAgIGxldCB0aW1lb3V0SWQgPSAwO1xuICAgIGxldCBwcmV2aW91c1NuYXBzaG90ID0gbnVsbDtcbiAgICBsZXQgc3RhYmxlUmVhZHlGcmFtZXMgPSAwO1xuICAgIGNvbnN0IFBPTExfTVMgPSAxNjtcbiAgICBjb25zdCBSRVFVSVJFRF9TVEFCTEVfRlJBTUVTID0gcm91dGVJZCA9PT0gJ3BvcnRmb2xpbycgPyAyIDogMDtcbiAgICBjb25zdCBtYXliZVNldHRsZVJlYWR5ID0gKCkgPT4ge1xuICAgICAgaWYgKCFpc1JvdXRlQmFzZWxpbmVSZWFkeShyb3V0ZUlkLCBvcHRpb25zKSkge1xuICAgICAgICBzdGFibGVSZWFkeUZyYW1lcyA9IDA7XG4gICAgICAgIHByZXZpb3VzU25hcHNob3QgPSBudWxsO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoUkVRVUlSRURfU1RBQkxFX0ZSQU1FUyA9PT0gMCkge1xuICAgICAgICBzZXR0bGUoJ3JlYWR5Jyk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBzbmFwc2hvdCA9IHJlYWRSb3V0ZVJlYWR5U25hcHNob3Qocm91dGVJZCk7XG4gICAgICBpZiAoc25hcHNob3QgJiYgcHJldmlvdXNTbmFwc2hvdCAmJiBpc1JvdXRlUmVhZHlTbmFwc2hvdFN0YWJsZShyb3V0ZUlkLCBwcmV2aW91c1NuYXBzaG90LCBzbmFwc2hvdCwgb3B0aW9ucykpIHtcbiAgICAgICAgc3RhYmxlUmVhZHlGcmFtZXMgKz0gMTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0YWJsZVJlYWR5RnJhbWVzID0gMDtcbiAgICAgIH1cbiAgICAgIHByZXZpb3VzU25hcHNob3QgPSBzbmFwc2hvdDtcblxuICAgICAgaWYgKHN0YWJsZVJlYWR5RnJhbWVzID49IFJFUVVJUkVEX1NUQUJMRV9GUkFNRVMpIHtcbiAgICAgICAgc2V0dGxlKCdyZWFkeScpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuXG4gICAgc2V0dGxlID0gKHN0YXR1cyA9ICdjYW5jZWxsZWQnKSA9PiB7XG4gICAgICBpZiAoc2V0dGxlZCkgcmV0dXJuO1xuICAgICAgc2V0dGxlZCA9IHRydWU7XG4gICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignYWJzOnJvdXRlLXJlYWR5Jywgb25SZWFkeSk7XG4gICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignYWJzOmRhaWx5LWZvY3VzLWZhaWxlZCcsIG9uRmFpbGVkKTtcbiAgICAgIGlmIChwb2xsSWQpIGNsZWFyU3RhYmxlVGltZW91dChwb2xsSWQpO1xuICAgICAgaWYgKHRpbWVvdXRJZCkgY2xlYXJTdGFibGVUaW1lb3V0KHRpbWVvdXRJZCk7XG4gICAgICByZXNvbHZlKHN0YXR1cyk7XG4gICAgfTtcbiAgICBjb25zdCBvblJlYWR5ID0gKGUpID0+IHtcbiAgICAgIGlmICgoZT8uZGV0YWlsPy5yb3V0ZUlkIHx8ICcnKSAhPT0gcm91dGVJZCkgcmV0dXJuO1xuICAgICAgY29uc3QgZXZlbnRHZW5lcmF0aW9uID0gTnVtYmVyKGU/LmRldGFpbD8uZ2VuZXJhdGlvbiB8fCAwKTtcbiAgICAgIGNvbnN0IGN1cnJlbnRHZW5lcmF0aW9uID0gZ2V0QWN0aXZlTGVnYWN5UnVudGltZVNuYXBzaG90KCkuZ2VuZXJhdGlvbjtcbiAgICAgIGlmIChldmVudEdlbmVyYXRpb24gJiYgZXZlbnRHZW5lcmF0aW9uICE9PSBjdXJyZW50R2VuZXJhdGlvbikgcmV0dXJuO1xuICAgICAgbWF5YmVTZXR0bGVSZWFkeSgpO1xuICAgIH07XG4gICAgY29uc3Qgb25GYWlsZWQgPSAoZXZlbnQpID0+IHtcbiAgICAgIGlmICgoZXZlbnQ/LmRldGFpbD8ucm91dGVJZCB8fCAnJykgIT09IHJvdXRlSWQpIHJldHVybjtcbiAgICAgIHNldHRsZSgnZmFpbGVkJyk7XG4gICAgfTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignYWJzOnJvdXRlLXJlYWR5Jywgb25SZWFkeSk7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2FiczpkYWlseS1mb2N1cy1mYWlsZWQnLCBvbkZhaWxlZCk7XG4gICAgdGltZW91dElkID0gc2V0U3RhYmxlVGltZW91dCgoKSA9PiBzZXR0bGUoJ3RpbWVvdXQnKSwgdGltZW91dE1zKTtcblxuICAgIGlmIChtYXliZVNldHRsZVJlYWR5KCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCB0aWNrID0gKCkgPT4ge1xuICAgICAgaWYgKHNldHRsZWQpIHJldHVybjtcbiAgICAgIGlmIChtYXliZVNldHRsZVJlYWR5KCkpIHJldHVybjtcbiAgICAgIHBvbGxJZCA9IHNldFN0YWJsZVRpbWVvdXQodGljaywgUE9MTF9NUyk7XG4gICAgfTtcbiAgICBwb2xsSWQgPSBzZXRTdGFibGVUaW1lb3V0KHRpY2ssIFBPTExfTVMpO1xuICB9KTtcbiAgcmV0dXJuIHtcbiAgICBwcm9taXNlLFxuICAgIGNhbmNlbDogc2V0dGxlLFxuICB9O1xufVxuXG4vKiDilIDilIAgc3RhZ2dlcmVkIGVudHJhbmNlIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgCAqL1xuXG5mdW5jdGlvbiBzdGFnZ2VyZWRFbnRyYW5jZSh7XG4gIHJvdXRlSWQsXG4gIHN1cmZhY2VSZWZzLFxuICBlbnRlck1zID0gRUxFTUVOVF9SRVZFQUxfTVMsXG4gIHJldmVhbEVhc2luZyA9IEVBU0VfT1VULFxuICBvblByZXBhcmVkLFxufSA9IHt9KSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGNvbnN0IGdyb3VwcyA9IGJ1aWxkUm91dGVUcmFuc2l0aW9uR3JvdXBzKHJvdXRlSWQsIHN1cmZhY2VSZWZzKTtcbiAgICBjb25zdCB0YXJnZXRzID0gZ2V0R3JvdXBlZFRyYW5zaXRpb25JdGVtcyhyb3V0ZUlkLCBzdXJmYWNlUmVmcyk7XG4gICAgY29uc3Qgcm91dGVFbnRlclRhcmdldHMgPSBnZXRSb3V0ZUVudGVyVGFyZ2V0cyhzdXJmYWNlUmVmcyk7XG4gICAgY29uc3QgeyB3YWxsLCBoZXJvLCB1aSB9ID0gZ2V0Q29udGVudExheWVycyhzdXJmYWNlUmVmcyk7XG4gICAgY29uc3QgaXNSb3V0ZVRyYW5zaXRpb24gPSBpc1JvdXRlVHJhbnNpdGlvblBoYXNlKGdldFRyYW5zaXRpb25QaGFzZSgpKTtcbiAgICBjb25zdCByb3V0ZUVudGVyTW90aW9uID0gcmVhZFJvdXRlRW50ZXJNb3Rpb24oKTtcblxuICAgIC8vIFNhZmV0eTogaWYgRE9NIGlzIHVuZXhwZWN0ZWRseSBlbXB0eSwganVzdCByZXN0b3JlIGxheWVycy5cbiAgICBpZiAodGFyZ2V0cy5sZW5ndGggPT09IDApIHtcbiAgICAgIGNhbmNlbEFjdGl2ZUFuaW1hdGlvbnMoKTtcbiAgICAgIGlmICh3YWxsKSB3YWxsLnN0eWxlLm9wYWNpdHkgPSAnMSc7XG4gICAgICBpZiAoaGVybykgaGVyby5zdHlsZS5vcGFjaXR5ID0gJzEnO1xuICAgICAgaWYgKHVpKSB1aS5zdHlsZS5vcGFjaXR5ID0gJzEnO1xuICAgICAgaWYgKHR5cGVvZiBvblByZXBhcmVkID09PSAnZnVuY3Rpb24nKSBvblByZXBhcmVkKCk7XG4gICAgICByZXNvbHZlKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgc2V0SW5zdHJ1bWVudFdha2VTdGF0ZSgnaW4nKTtcblxuICAgIC8vIEhpZGUgZXZlcnkgb3duZWQgdHJhbnNpdGlvbiB0YXJnZXQgYmVmb3JlIG1ha2luZyBpdCB2aXNpYmxlLlxuICAgIHRhcmdldHMuZm9yRWFjaCgoeyBlbCB9KSA9PiB7XG4gICAgICBlbC5zdHlsZS5vcGFjaXR5ID0gJzAnO1xuICAgICAgZWwuc3R5bGUud2lsbENoYW5nZSA9ICdvcGFjaXR5LCB0cmFuc2Zvcm0nO1xuICAgIH0pO1xuICAgIHNldFJvdXRlRW50ZXJJbml0aWFsU3RhdGUocm91dGVFbnRlclRhcmdldHMsIHJvdXRlRW50ZXJNb3Rpb24pO1xuXG4gICAgLy8gUGluIHdpbmRvdyBjb250ZW50IGxheWVycyB0byBvcGFjaXR5IDAgdmlhIGlubGluZSBzdHlsZSBCRUZPUkUgY2FuY2VsbGluZyBXQUFQSS5cbiAgICAvLyBUaGlzIHByZXZlbnRzIGEgc2luZ2xlLWZyYW1lIGZsYXNoIHdoZXJlIHRoZSBXQUFQSSBmaWxsOmZvcndhcmRzIGlzIHJlbW92ZWRcbiAgICAvLyBhbmQgdGhlIGVsZW1lbnQgcmV2ZXJ0cyB0byBDU1Mgb3BhY2l0eSAxIGJlZm9yZSB0aGUgbmV3IGlubGluZSB2YWx1ZSBhcHBsaWVzLlxuICAgIGlmICh3YWxsKSB3YWxsLnN0eWxlLm9wYWNpdHkgPSAnMCc7XG4gICAgaWYgKGhlcm8pIGhlcm8uc3R5bGUub3BhY2l0eSA9ICcwJztcbiAgICBpZiAod2FsbCkgd2FsbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eSgndmlzaWJpbGl0eScpO1xuICAgIGlmIChoZXJvKSBoZXJvLnN0eWxlLnJlbW92ZVByb3BlcnR5KCd2aXNpYmlsaXR5Jyk7XG4gICAgaWYgKHdhbGwpIHdhbGwuc3R5bGUucmVtb3ZlUHJvcGVydHkoJ3BvaW50ZXItZXZlbnRzJyk7XG4gICAgaWYgKGhlcm8pIGhlcm8uc3R5bGUucmVtb3ZlUHJvcGVydHkoJ3BvaW50ZXItZXZlbnRzJyk7XG4gICAgY2FuY2VsQWN0aXZlQW5pbWF0aW9ucygpO1xuXG4gICAgLy8gS2VlcCB0aGUgLmZhZGUtY29udGVudCBjb250YWluZXIgdmlzaWJsZTogZm9vdGVyIGFuZCBib3R0b20gdGFicyBsaXZlIGluc2lkZSBpdC5cbiAgICBpZiAodWkpIHtcbiAgICAgIHVpLnN0eWxlLm9wYWNpdHkgPSAnMSc7XG4gICAgICB1aS5zdHlsZS53aWxsQ2hhbmdlID0gJ2F1dG8nO1xuICAgIH1cbiAgICAvLyBGb3JjZSByZWZsb3cgc28gcm91dGUtb3duZWQgY2hpbGRyZW4gYXJlIHBhaW50LWNvbW1pdHRlZCBhdCBvcGFjaXR5IDBcbiAgICAvLyBiZWZvcmUgdGhlaXIgY29tcGFjdCBob21lcGFnZS1zdHlsZSBlbnRyYW5jZSBiZWdpbnMuXG4gICAgdm9pZCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQub2Zmc2V0SGVpZ2h0O1xuXG4gICAgY29uc3QgaGFzV2FhcGkgPSB0eXBlb2YgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmFuaW1hdGUgPT09ICdmdW5jdGlvbic7XG4gICAgaWYgKHR5cGVvZiBvblByZXBhcmVkID09PSAnZnVuY3Rpb24nKSBvblByZXBhcmVkKCk7XG5cbiAgICBncm91cHMuZm9yRWFjaCgoZ3JvdXApID0+IHtcbiAgICAgIGdyb3VwLml0ZW1zLmZvckVhY2goKHsgZWwsIHNsaWRlIH0pID0+IHtcbiAgICAgICAgY29uc3QgZGVsYXkgPSBpc1JvdXRlVHJhbnNpdGlvbiA/IGdyb3VwLmRlbGF5TXMgOiBncm91cC5kZWxheU1zO1xuICAgICAgICBjb25zdCByb3V0ZVNsaWRlT2Zmc2V0ID0gaXNSb3V0ZVRyYW5zaXRpb24gPyAnc2NhbGUodmFyKC0taW5zdHJ1bWVudC13YWtlLXJlc29sdmUtc2NhbGUpKScgOiAndHJhbnNsYXRlWSh2YXIoLS1zcGFjZS1zbSkpJztcblxuICAgICAgICBpZiAoaGFzV2FhcGkpIHtcbiAgICAgICAgICBjb25zdCBrZXlmcmFtZXMgPSBzbGlkZVxuICAgICAgICAgICAgPyBbXG4gICAgICAgICAgICAgICAgeyBvcGFjaXR5OiAwLCB0cmFuc2Zvcm06IHJvdXRlU2xpZGVPZmZzZXQsIGZpbHRlcjogJ2JsdXIodmFyKC0taW5zdHJ1bWVudC13YWtlLWJsdXIpKScgfSxcbiAgICAgICAgICAgICAgICB7IG9wYWNpdHk6IDEsIHRyYW5zZm9ybTogJ3RyYW5zbGF0ZVkoMCkgc2NhbGUoMSknLCBmaWx0ZXI6ICdibHVyKDApJyB9LFxuICAgICAgICAgICAgICBdXG4gICAgICAgICAgICA6IFtcbiAgICAgICAgICAgICAgICB7IG9wYWNpdHk6IDAsIGZpbHRlcjogJ2JsdXIodmFyKC0taW5zdHJ1bWVudC13YWtlLWJsdXIpKScgfSxcbiAgICAgICAgICAgICAgICB7IG9wYWNpdHk6IDEsIGZpbHRlcjogJ2JsdXIoMCknIH0sXG4gICAgICAgICAgICAgIF07XG5cbiAgICAgICAgICBjb25zdCBhbmltID0gZWwuYW5pbWF0ZShrZXlmcmFtZXMsIHtcbiAgICAgICAgICAgIGR1cmF0aW9uOiBlbnRlck1zLFxuICAgICAgICAgICAgZGVsYXksXG4gICAgICAgICAgICBlYXNpbmc6IHJldmVhbEVhc2luZyxcbiAgICAgICAgICAgIGZpbGw6ICdmb3J3YXJkcycsXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgYWN0aXZlQW5pbWF0aW9ucy5wdXNoKGFuaW0pO1xuICAgICAgICAgIGFuaW0ub25maW5pc2ggPSAoKSA9PiB7XG4gICAgICAgICAgICBlbC5zdHlsZS5vcGFjaXR5ID0gJzEnO1xuICAgICAgICAgICAgZWwuc3R5bGUudHJhbnNmb3JtID0gJyc7XG4gICAgICAgICAgICBlbC5zdHlsZS5maWx0ZXIgPSAnJztcbiAgICAgICAgICAgIGVsLnN0eWxlLndpbGxDaGFuZ2UgPSAnYXV0byc7XG4gICAgICAgICAgfTtcbiAgICAgICAgICBhbmltLm9uY2FuY2VsID0gYW5pbS5vbmZpbmlzaDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzZXRTdGFibGVUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIGVsLnN0eWxlLnRyYW5zaXRpb24gPSBgb3BhY2l0eSAke2VudGVyTXN9bXMgJHtyZXZlYWxFYXNpbmd9LCB0cmFuc2Zvcm0gJHtlbnRlck1zfW1zICR7cmV2ZWFsRWFzaW5nfSwgZmlsdGVyICR7ZW50ZXJNc31tcyAke3JldmVhbEVhc2luZ31gO1xuICAgICAgICAgICAgZWwuc3R5bGUub3BhY2l0eSA9ICcxJztcbiAgICAgICAgICAgIGVsLnN0eWxlLnRyYW5zZm9ybSA9ICcnO1xuICAgICAgICAgICAgZWwuc3R5bGUuZmlsdGVyID0gJyc7XG4gICAgICAgICAgICBzZXRTdGFibGVUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgZWwuc3R5bGUudHJhbnNpdGlvbiA9ICcnO1xuICAgICAgICAgICAgICBlbC5zdHlsZS53aWxsQ2hhbmdlID0gJ2F1dG8nO1xuICAgICAgICAgICAgfSwgZW50ZXJNcyArIDUwKTtcbiAgICAgICAgICB9LCBkZWxheSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICBwbGF5Um91dGVFbnRlclRhcmdldHMocm91dGVFbnRlclRhcmdldHMsIHJvdXRlRW50ZXJNb3Rpb24pO1xuICAgIH0pO1xuXG4gICAgY29uc3Qgc3VyZmFjZVRvdGFsID0gTWF0aC5tYXgoMCwgLi4uZ3JvdXBzLm1hcCgoZ3JvdXApID0+IGdyb3VwLmRlbGF5TXMpKSArIGVudGVyTXM7XG4gICAgY29uc3Qgcm91dGVFbnRlclRvdGFsID0gcm91dGVFbnRlclRhcmdldHMubGVuZ3RoID4gMFxuICAgICAgPyBNYXRoLm1heChST1VURV9FTlRFUl9UT1RBTF9NUywgLi4ucm91dGVFbnRlclRhcmdldHMubWFwKCh0YXJnZXQpID0+IHRhcmdldC5kZWxheU1zICsgdGFyZ2V0LmR1cmF0aW9uTXMpKVxuICAgICAgOiAwO1xuICAgIHNldFN0YWJsZVRpbWVvdXQocmVzb2x2ZSwgTWF0aC5tYXgoc3VyZmFjZVRvdGFsLCByb3V0ZUVudGVyVG90YWwpICsgNTApO1xuICB9KTtcbn1cblxuLyog4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG4gICBIT09LXG4gICDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZAgKi9cblxuZXhwb3J0IGZ1bmN0aW9uIHVzZVNoZWxsUm91dGVUcmFuc2l0aW9uKHsgZ2V0Um91dGVWaWV3LCBnZXRSb3V0ZVJ1bnRpbWUsIHN1cmZhY2VSZWZzIH0pIHtcbiAgY29uc3QgW3JvdXRlU3RhdGUsIHNldFJvdXRlU3RhdGVdID0gdXNlU3RhdGUoKCkgPT4gY29tcHV0ZVJvdXRlU3RhdGUod2luZG93LmxvY2F0aW9uLmhyZWYpKTtcbiAgY29uc3QgW3BlbmRpbmdBY3RpdmVSb3V0ZUlkLCBzZXRQZW5kaW5nQWN0aXZlUm91dGVJZF0gPSB1c2VTdGF0ZShudWxsKTtcbiAgY29uc3QgdHJhbnNpdGlvbkFjdGl2ZVJlZiA9IHVzZVJlZihmYWxzZSk7XG4gIGNvbnN0IHF1ZXVlZE5hdmlnYXRpb25SZWYgPSB1c2VSZWYobnVsbCk7XG4gIGNvbnN0IGFjdGl2ZVJvdXRlSWRSZWYgPSB1c2VSZWYocm91dGVTdGF0ZS5yb3V0ZS5pZCk7XG4gIGNvbnN0IGFjdGl2ZVJvdXRlU3RhdGVSZWYgPSB1c2VSZWYocm91dGVTdGF0ZSk7XG4gIGNvbnN0IGFjdGl2ZVJvdXRlQ29udGVudFNpZ25hdHVyZVJlZiA9IHVzZVJlZihyZWFkUm91dGVDb250ZW50U2lnbmF0dXJlKHJvdXRlU3RhdGUpKTtcbiAgY29uc3QgYWN0aXZlRm9jdXNTaW11bGF0aW9uSWRSZWYgPSB1c2VSZWYocmVhZFJvdXRlU3RhdGVTaW11bGF0aW9uRm9jdXNJZChyb3V0ZVN0YXRlKSk7XG4gIGNvbnN0IGFjdGl2ZUdhdGVUcmFuc2l0aW9uUmVmID0gdXNlUmVmKGZhbHNlKTtcbiAgY29uc3QgYWN0aXZlVHJhbnNpdGlvbkNvbW1pdHRlZFJlZiA9IHVzZVJlZihmYWxzZSk7XG4gIGNvbnN0IGFjdGl2ZVJvdXRlUmVhZHlDYW5jZWxSZWYgPSB1c2VSZWYobnVsbCk7XG4gIGNvbnN0IGdldFJvdXRlUnVudGltZVJlZiA9IHVzZVJlZihnZXRSb3V0ZVJ1bnRpbWUpO1xuICBjb25zdCBzeW5jU3RlYWR5VHJhbnNpdGlvblBoYXNlID0gdXNlQ2FsbGJhY2soKCkgPT4ge1xuICAgIHN5bmNUcmFuc2l0aW9uUGhhc2VGcm9tRG9tKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCk7XG4gIH0sIFtdKTtcblxuICBjb25zdCBuYXZpZ2F0ZSA9IHVzZUNhbGxiYWNrKChocmVmLCBvcHRpb25zID0ge30pID0+IHtcbiAgICBjb25zdCByb3V0ZSA9IHJlc29sdmVSb3V0ZUZyb21IcmVmKGhyZWYsIHdpbmRvdy5sb2NhdGlvbi5ocmVmKTtcbiAgICBpZiAoIXJvdXRlKSByZXR1cm4gZmFsc2U7XG5cbiAgICBjb25zdCB0YXJnZXRVcmwgPSBuZXcgVVJMKGhyZWYsIHdpbmRvdy5sb2NhdGlvbi5ocmVmKTtcbiAgICBjb25zdCBuZXh0U3RhdGUgPSBjb21wdXRlUm91dGVTdGF0ZSh0YXJnZXRVcmwudG9TdHJpbmcoKSk7XG4gICAgY29uc3QgbmV4dFJvdXRlSWQgPSBuZXh0U3RhdGUucm91dGUuaWQ7XG4gICAgY29uc3QgbmV4dFJvdXRlQ29udGVudFNpZ25hdHVyZSA9IHJlYWRSb3V0ZUNvbnRlbnRTaWduYXR1cmUobmV4dFN0YXRlKTtcbiAgICBjb25zdCBuZXh0Rm9jdXNTaW11bGF0aW9uSWQgPSByZWFkUm91dGVTdGF0ZVNpbXVsYXRpb25Gb2N1c0lkKG5leHRTdGF0ZSk7XG4gICAgY29uc3QgaXNTYW1lUm91dGUgPSBuZXh0Um91dGVJZCA9PT0gYWN0aXZlUm91dGVJZFJlZi5jdXJyZW50O1xuICAgIGNvbnN0IGhhc1JvdXRlQ29udGVudENoYW5nZSA9IG5leHRSb3V0ZUNvbnRlbnRTaWduYXR1cmUgIT09IGFjdGl2ZVJvdXRlQ29udGVudFNpZ25hdHVyZVJlZi5jdXJyZW50O1xuICAgIGNvbnN0IGhhc1NpbXVsYXRpb25Gb2N1c0NoYW5nZSA9IG5leHRGb2N1c1NpbXVsYXRpb25JZCAhPT0gYWN0aXZlRm9jdXNTaW11bGF0aW9uSWRSZWYuY3VycmVudDtcbiAgICBjb25zdCBtZXRob2QgPSBvcHRpb25zLnJlcGxhY2UgPyAncmVwbGFjZVN0YXRlJyA6ICdwdXNoU3RhdGUnO1xuICAgIGNvbnN0IHByZXZpb3VzU3RhdGUgPSBhY3RpdmVSb3V0ZVN0YXRlUmVmLmN1cnJlbnQ7XG4gICAgY29uc3QgcHJldmlvdXNSb3V0ZUlkID0gYWN0aXZlUm91dGVJZFJlZi5jdXJyZW50O1xuICAgIGNvbnN0IHByZXZpb3VzUm91dGVDb250ZW50U2lnbmF0dXJlID0gYWN0aXZlUm91dGVDb250ZW50U2lnbmF0dXJlUmVmLmN1cnJlbnQ7XG4gICAgY29uc3QgcHJldmlvdXNGb2N1c1NpbXVsYXRpb25JZCA9IGFjdGl2ZUZvY3VzU2ltdWxhdGlvbklkUmVmLmN1cnJlbnQ7XG4gICAgbGV0IGhpc3RvcnlDb21taXR0ZWQgPSBmYWxzZTtcbiAgICBjb25zdCBjb21taXRIaXN0b3J5ID0gKGhpc3RvcnlNZXRob2QgPSBtZXRob2QpID0+IHtcbiAgICAgIHdpbmRvdy5oaXN0b3J5W2hpc3RvcnlNZXRob2RdKG9wdGlvbnMuc3RhdGUgfHwge30sICcnLCBuZXh0U3RhdGUuY2Fub25pY2FsSHJlZik7XG4gICAgICBoaXN0b3J5Q29tbWl0dGVkID0gdHJ1ZTtcbiAgICAgIGFjdGl2ZVRyYW5zaXRpb25Db21taXR0ZWRSZWYuY3VycmVudCA9IHRydWU7XG4gICAgfTtcbiAgICBjb25zdCBjb21taXQgPSAoKSA9PiB7XG4gICAgICBpZiAoIWhpc3RvcnlDb21taXR0ZWQpIHtcbiAgICAgICAgY29tbWl0SGlzdG9yeSgpO1xuICAgICAgfVxuICAgICAgc2V0Um91dGVTdGF0ZShuZXh0U3RhdGUpO1xuICAgICAgYWN0aXZlUm91dGVTdGF0ZVJlZi5jdXJyZW50ID0gbmV4dFN0YXRlO1xuICAgICAgYWN0aXZlUm91dGVJZFJlZi5jdXJyZW50ID0gbmV4dFJvdXRlSWQ7XG4gICAgICBhY3RpdmVSb3V0ZUNvbnRlbnRTaWduYXR1cmVSZWYuY3VycmVudCA9IG5leHRSb3V0ZUNvbnRlbnRTaWduYXR1cmU7XG4gICAgICBhY3RpdmVGb2N1c1NpbXVsYXRpb25JZFJlZi5jdXJyZW50ID0gbmV4dEZvY3VzU2ltdWxhdGlvbklkO1xuICAgIH07XG4gICAgY29uc3Qgcm9sbGJhY2sgPSAoZXJyb3IpID0+IHtcbiAgICAgIHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZSh3aW5kb3cuaGlzdG9yeS5zdGF0ZSB8fCB7fSwgJycsIHByZXZpb3VzU3RhdGUuY2Fub25pY2FsSHJlZik7XG4gICAgICBzZXRSb3V0ZVN0YXRlKHByZXZpb3VzU3RhdGUpO1xuICAgICAgYWN0aXZlUm91dGVTdGF0ZVJlZi5jdXJyZW50ID0gcHJldmlvdXNTdGF0ZTtcbiAgICAgIGFjdGl2ZVJvdXRlSWRSZWYuY3VycmVudCA9IHByZXZpb3VzUm91dGVJZDtcbiAgICAgIGFjdGl2ZVJvdXRlQ29udGVudFNpZ25hdHVyZVJlZi5jdXJyZW50ID0gcHJldmlvdXNSb3V0ZUNvbnRlbnRTaWduYXR1cmU7XG4gICAgICBhY3RpdmVGb2N1c1NpbXVsYXRpb25JZFJlZi5jdXJyZW50ID0gcHJldmlvdXNGb2N1c1NpbXVsYXRpb25JZDtcbiAgICAgIHRyeSB7XG4gICAgICAgIG9wdGlvbnMub25GYWlsdXJlPy4oZXJyb3IsIHByZXZpb3VzU3RhdGUpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIC8vIEZhaWx1cmUgcmVwb3J0aW5nIG11c3Qgbm90IHByZXZlbnQgcm91dGUgcmVzdG9yYXRpb24uXG4gICAgICB9XG4gICAgfTtcbiAgICBjb25zdCBjYW5QcmVlbXB0QWN0aXZlVHJhbnNpdGlvbiA9IEJvb2xlYW4oXG4gICAgICBvcHRpb25zLnByZWVtcHRUcmFuc2l0aW9uXG4gICAgICAmJiAhYWN0aXZlR2F0ZVRyYW5zaXRpb25SZWYuY3VycmVudFxuICAgICAgJiYgaXNSb3V0ZVRyYW5zaXRpb25QaGFzZShnZXRUcmFuc2l0aW9uUGhhc2UoKSlcbiAgICApO1xuICAgIGNvbnN0IHByZWVtcHRBY3RpdmVUcmFuc2l0aW9uID0gKCkgPT4ge1xuICAgICAgY29uc3Qgd2FzU2ltdWxhdGlvbkZvY3VzVHJhbnNpdGlvbiA9IEJvb2xlYW4oXG4gICAgICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5kYXRhc2V0LmFic1NpbXVsYXRpb25Gb2N1c1RyYW5zaXRpb25cbiAgICAgICk7XG4gICAgICArK3RyYW5zaXRpb25Ub2tlbjtcbiAgICAgIHF1ZXVlZE5hdmlnYXRpb25SZWYuY3VycmVudCA9IG51bGw7XG4gICAgICBhY3RpdmVSb3V0ZVJlYWR5Q2FuY2VsUmVmLmN1cnJlbnQ/LigpO1xuICAgICAgYWN0aXZlUm91dGVSZWFkeUNhbmNlbFJlZi5jdXJyZW50ID0gbnVsbDtcbiAgICAgIHRyYW5zaXRpb25BY3RpdmVSZWYuY3VycmVudCA9IGZhbHNlO1xuICAgICAgYWN0aXZlR2F0ZVRyYW5zaXRpb25SZWYuY3VycmVudCA9IGZhbHNlO1xuICAgICAgZmluYWxpemVUcmFuc2l0aW9uKGZhbHNlLCBhY3RpdmVSb3V0ZUlkUmVmLmN1cnJlbnQsIHN1cmZhY2VSZWZzKTtcbiAgICAgIHJlc2V0U2ltdWxhdGlvbkZvY3VzVHJhbnNpdGlvbihzdXJmYWNlUmVmcywgeyBkaXNjYXJkU25hcHNob3RzOiB0cnVlIH0pO1xuICAgICAgaWYgKHdhc1NpbXVsYXRpb25Gb2N1c1RyYW5zaXRpb24pIHtcbiAgICAgICAgZGlzbWlzc0dhdGVCYWNrZHJvcCh7IHN1cHByZXNzUmV0dXJuQW5pbWF0aW9uOiB0cnVlLCBpbnN0YW50OiB0cnVlIH0pO1xuICAgICAgfVxuICAgICAgc2V0UGVuZGluZ0FjdGl2ZVJvdXRlSWQobnVsbCk7XG4gICAgICBzeW5jU3RlYWR5VHJhbnNpdGlvblBoYXNlKCk7XG4gICAgICBjb21taXRIaXN0b3J5KGFjdGl2ZVRyYW5zaXRpb25Db21taXR0ZWRSZWYuY3VycmVudCA/ICdyZXBsYWNlU3RhdGUnIDogbWV0aG9kKTtcbiAgICB9O1xuXG4gICAgaWYgKHRyYW5zaXRpb25BY3RpdmVSZWYuY3VycmVudCAmJiBjYW5QcmVlbXB0QWN0aXZlVHJhbnNpdGlvbikge1xuICAgICAgcHJlZW1wdEFjdGl2ZVRyYW5zaXRpb24oKTtcbiAgICB9IGVsc2UgaWYgKHRyYW5zaXRpb25BY3RpdmVSZWYuY3VycmVudCkge1xuICAgICAgaWYgKCFpc1NhbWVSb3V0ZSB8fCBoYXNSb3V0ZUNvbnRlbnRDaGFuZ2UgfHwgaGFzU2ltdWxhdGlvbkZvY3VzQ2hhbmdlKSB7XG4gICAgICAgIHF1ZXVlZE5hdmlnYXRpb25SZWYuY3VycmVudCA9IHtcbiAgICAgICAgICBocmVmOiB0YXJnZXRVcmwudG9TdHJpbmcoKSxcbiAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgIHJvdXRlSWQ6IG5leHRSb3V0ZUlkLFxuICAgICAgICAgIHJvdXRlQ29udGVudFNpZ25hdHVyZTogbmV4dFJvdXRlQ29udGVudFNpZ25hdHVyZSxcbiAgICAgICAgICBmb2N1c1NpbXVsYXRpb25JZDogbmV4dEZvY3VzU2ltdWxhdGlvbklkLFxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgY29uc3QgcmVkdWNlTW90aW9uID0gd2luZG93Lm1hdGNoTWVkaWE/LignKHByZWZlcnMtcmVkdWNlZC1tb3Rpb246IHJlZHVjZSknKT8ubWF0Y2hlcyA/PyBmYWxzZTtcbiAgICBjb25zdCBuZXh0Um91dGVSdW50aW1lID0gZ2V0Um91dGVSdW50aW1lUmVmLmN1cnJlbnQobmV4dFJvdXRlSWQsIG5leHRTdGF0ZS5jYW5vbmljYWxIcmVmLCBuZXh0U3RhdGUpO1xuICAgIGNvbnN0IGlzR2F0ZSA9IG9wdGlvbnMudHJhbnNpdGlvblN0eWxlID09PSAnZ2F0ZS1zdWNjZXNzJztcbiAgICBjb25zdCBpc1NpbXVsYXRpb25Gb2N1cyA9IG9wdGlvbnMudHJhbnNpdGlvblN0eWxlID09PSAnc2ltdWxhdGlvbi1mb2N1cyc7XG4gICAgaWYgKCFpc1NpbXVsYXRpb25Gb2N1cyAmJiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuZGF0YXNldC5hYnNTaW11bGF0aW9uRm9jdXNUcmFuc2l0aW9uKSB7XG4gICAgICByZXNldFNpbXVsYXRpb25Gb2N1c1RyYW5zaXRpb24oc3VyZmFjZVJlZnMsIHsgZGlzY2FyZFNuYXBzaG90czogdHJ1ZSB9KTtcbiAgICAgIGRpc21pc3NHYXRlQmFja2Ryb3AoeyBzdXBwcmVzc1JldHVybkFuaW1hdGlvbjogdHJ1ZSwgaW5zdGFudDogdHJ1ZSB9KTtcbiAgICB9XG4gICAgY29uc3QgcmVhZHlNcyA9IG9wdGlvbnMucmVhZHlGYWxsYmFja01zXG4gICAgICA/PyAoaXNHYXRlID8gODUwIDogKG5leHRSb3V0ZUlkID09PSAnaG9tZScgPyA1MDAgOiA3MDApKTtcbiAgICBjb25zdCByb3V0ZVRpbWluZ3MgPSBnZXRSb3V0ZVRyYW5zaXRpb25UaW1pbmdzKHtcbiAgICAgIGZhZGVNczogb3B0aW9ucy5leGl0TXMsXG4gICAgICBzdGFnZ2VyTXM6IG9wdGlvbnMuc3RhZ2dlck1zLFxuICAgICAgcmV2ZWFsTXM6IG9wdGlvbnMuZW50ZXJNcyxcbiAgICAgIHJlYWR5TXMsXG4gICAgICByZWR1Y2VNb3Rpb24sXG4gICAgfSk7XG5cbiAgICBjb25zdCBwcm9jZXNzUXVldWVkTmF2aWdhdGlvbiA9ICgpID0+IHtcbiAgICAgIGNvbnN0IHF1ZXVlZCA9IHF1ZXVlZE5hdmlnYXRpb25SZWYuY3VycmVudDtcbiAgICAgIGlmICghcXVldWVkIHx8IHRyYW5zaXRpb25BY3RpdmVSZWYuY3VycmVudCkgcmV0dXJuO1xuICAgICAgaWYgKFxuICAgICAgICBxdWV1ZWQucm91dGVJZCA9PT0gYWN0aXZlUm91dGVJZFJlZi5jdXJyZW50XG4gICAgICAgICYmIHF1ZXVlZC5yb3V0ZUNvbnRlbnRTaWduYXR1cmUgPT09IGFjdGl2ZVJvdXRlQ29udGVudFNpZ25hdHVyZVJlZi5jdXJyZW50XG4gICAgICAgICYmIChxdWV1ZWQuZm9jdXNTaW11bGF0aW9uSWQgfHwgJycpID09PSBhY3RpdmVGb2N1c1NpbXVsYXRpb25JZFJlZi5jdXJyZW50XG4gICAgICApIHtcbiAgICAgICAgcXVldWVkTmF2aWdhdGlvblJlZi5jdXJyZW50ID0gbnVsbDtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgcXVldWVkTmF2aWdhdGlvblJlZi5jdXJyZW50ID0gbnVsbDtcbiAgICAgIHNldFN0YWJsZVRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBpZiAoIXRyYW5zaXRpb25BY3RpdmVSZWYuY3VycmVudCkgbmF2aWdhdGUocXVldWVkLmhyZWYsIHF1ZXVlZC5vcHRpb25zKTtcbiAgICAgIH0sIDApO1xuICAgIH07XG5cbiAgICBjb25zdCBmaW5pc2hUcmFuc2l0aW9uID0gKGlzR2F0ZVRyYW5zaXRpb24sIGdhdGVCYWNrZHJvcERpc21pc3NlZCA9IGZhbHNlKSA9PiB7XG4gICAgICB0cmFuc2l0aW9uQWN0aXZlUmVmLmN1cnJlbnQgPSBmYWxzZTtcbiAgICAgIGFjdGl2ZUdhdGVUcmFuc2l0aW9uUmVmLmN1cnJlbnQgPSBmYWxzZTtcbiAgICAgIHNldFBlbmRpbmdBY3RpdmVSb3V0ZUlkKG51bGwpO1xuICAgICAgYWN0aXZlUm91dGVSZWFkeUNhbmNlbFJlZi5jdXJyZW50Py4oKTtcbiAgICAgIGFjdGl2ZVJvdXRlUmVhZHlDYW5jZWxSZWYuY3VycmVudCA9IG51bGw7XG4gICAgICBjb25zdCByZWxlYXNlR2F0ZUJhY2tkcm9wID0gQm9vbGVhbihvcHRpb25zLnJlbGVhc2VHYXRlQmFja2Ryb3BPbkNvbXBsZXRlKTtcbiAgICAgIGZpbmFsaXplVHJhbnNpdGlvbihpc0dhdGVUcmFuc2l0aW9uLCBhY3RpdmVSb3V0ZUlkUmVmLmN1cnJlbnQsIHN1cmZhY2VSZWZzLCB7XG4gICAgICAgIHN1cHByZXNzUmV0dXJuQW5pbWF0aW9uOiBpc0dhdGVUcmFuc2l0aW9uLFxuICAgICAgICBnYXRlQmFja2Ryb3BEaXNtaXNzZWQsXG4gICAgICAgIHByZXNlcnZlVHJhbnNpdGlvblBoYXNlOiByZWxlYXNlR2F0ZUJhY2tkcm9wLFxuICAgICAgfSk7XG4gICAgICByZXNldFNpbXVsYXRpb25Gb2N1c1RyYW5zaXRpb24oc3VyZmFjZVJlZnMpO1xuICAgICAgaWYgKHJlbGVhc2VHYXRlQmFja2Ryb3ApIHtcbiAgICAgICAgZGlzbWlzc0dhdGVCYWNrZHJvcCh7IGluc3RhbnQ6IGlzU2ltdWxhdGlvbkZvY3VzIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3luY1N0ZWFkeVRyYW5zaXRpb25QaGFzZSgpO1xuICAgICAgfVxuICAgICAgY2xlYXJQb3J0Zm9saW9EZWNrUmVsZWFzZSgpO1xuICAgICAgaWYgKGlzR2F0ZVRyYW5zaXRpb24pIHtcbiAgICAgICAgcmVtb3ZlUG9ydGZvbGlvR2F0ZVNjZW5lQnJpZGdlKCk7XG4gICAgICB9XG4gICAgICB0cnkge1xuICAgICAgICBvcHRpb25zLm9uQ29tcGxldGU/LihhY3RpdmVSb3V0ZVN0YXRlUmVmLmN1cnJlbnQpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIC8vIENvbXBsZXRpb24gbGlzdGVuZXJzIGFyZSBjb3NtZXRpYyBjbGVhbnVwOyB0cmFuc2l0aW9uIHN0YXRlIGlzIGFscmVhZHkgc2V0dGxlZC5cbiAgICAgIH1cbiAgICAgIHByb2Nlc3NRdWV1ZWROYXZpZ2F0aW9uKCk7XG4gICAgfTtcblxuICAgIGlmIChpc1NpbXVsYXRpb25Gb2N1cykge1xuICAgICAgdHJhbnNpdGlvbkFjdGl2ZVJlZi5jdXJyZW50ID0gdHJ1ZTtcbiAgICAgIGFjdGl2ZUdhdGVUcmFuc2l0aW9uUmVmLmN1cnJlbnQgPSBmYWxzZTtcbiAgICAgIGFjdGl2ZVRyYW5zaXRpb25Db21taXR0ZWRSZWYuY3VycmVudCA9IGhpc3RvcnlDb21taXR0ZWQ7XG4gICAgICBzZXRMZWdhY3lSb3V0ZVRyYW5zaXRpb25BY3RpdmUodHJ1ZSwgeyBnYXRlOiBmYWxzZSB9KTtcbiAgICAgIHNldFNpbXVsYXRpb25Gb2N1c1RyYW5zaXRpb25TdGF0ZSgncHJlcGFyZScpO1xuICAgICAgY29uc3Qgc2ltdWxhdGlvblRpdGxlU3VyZmFjZSA9IGdldFNpbXVsYXRpb25UaXRsZVN1cmZhY2VGb3JSb3V0ZUNoYW5nZShhY3RpdmVSb3V0ZUlkUmVmLmN1cnJlbnQsIG5leHRSb3V0ZUlkKTtcbiAgICAgIHNldFNpbXVsYXRpb25TaGVsbFN0YWJpbGl0eSh0cnVlLCBzdXJmYWNlUmVmcywge1xuICAgICAgICB0aXRsZVN1cmZhY2U6IHNpbXVsYXRpb25UaXRsZVN1cmZhY2UsXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgdG9rZW4gPSArK3RyYW5zaXRpb25Ub2tlbjtcbiAgICAgIGNvbnN0IHN0YWxlID0gKCkgPT4gdG9rZW4gIT09IHRyYW5zaXRpb25Ub2tlbjtcbiAgICAgIGNvbnN0IHNpbXVsYXRpb25UaW1pbmdzID0gZ2V0U2ltdWxhdGlvbkZvY3VzVGltaW5ncyhvcHRpb25zLCByZWR1Y2VNb3Rpb24pO1xuICAgICAgY29uc3QgcmV0YWluZWRTaW11bGF0aW9uID0gY2FwdHVyZVNpbXVsYXRpb25UcmFuc2FjdGlvblNuYXBzaG90KCk7XG4gICAgICBjb25zdCByZWFkaW5lc3NSb3V0ZUlkID0gbmV4dFN0YXRlLmRhaWx5Rm9jdXNSb3V0ZUlkIHx8IG5leHRTdGF0ZS5yb3V0ZS5pZDtcbiAgICAgIGNvbnN0IHNob3VsZFdhaXRGb3JSb3V0ZVJlYWR5ID0gIWlzU2FtZVJvdXRlXG4gICAgICAgIHx8IEJvb2xlYW4obmV4dFN0YXRlLmRhaWx5Rm9jdXNSb3V0ZUlkKVxuICAgICAgICB8fCBoYXNTaW11bGF0aW9uRm9jdXNDaGFuZ2VcbiAgICAgICAgfHwgdHlwZW9mIG9wdGlvbnMuYWZ0ZXJSb3V0ZVJlYWR5ID09PSAnZnVuY3Rpb24nO1xuICAgICAgbGV0IHJvdXRlUmVhZHlXYWl0ZXIgPSBudWxsO1xuICAgICAgY29uc3Qgd2FpdEZvckNvbW1pdHRlZFJvdXRlUmVhZHkgPSAoKSA9PiB7XG4gICAgICAgIGlmICghc2hvdWxkV2FpdEZvclJvdXRlUmVhZHkpIHJldHVybiBQcm9taXNlLnJlc29sdmUoJ3JlYWR5Jyk7XG4gICAgICAgIHJvdXRlUmVhZHlXYWl0ZXIgPSB3YWl0Rm9yUm91dGVSZWFkeShyZWFkaW5lc3NSb3V0ZUlkLCByb3V0ZVRpbWluZ3MucmVhZHksIHtcbiAgICAgICAgICBsb2NrZWRHYXRlSWQ6IG5leHRTdGF0ZS5sb2NrZWRHYXRlSWQgfHwgbnVsbCxcbiAgICAgICAgfSk7XG4gICAgICAgIGFjdGl2ZVJvdXRlUmVhZHlDYW5jZWxSZWYuY3VycmVudCA9IHJvdXRlUmVhZHlXYWl0ZXIuY2FuY2VsO1xuICAgICAgICByZXR1cm4gcm91dGVSZWFkeVdhaXRlci5wcm9taXNlO1xuICAgICAgfTtcbiAgICAgIGxldCByb3V0ZUNvbW1pdHRlZCA9IGZhbHNlO1xuICAgICAgbGV0IHRyYW5zaXRpb25GaW5pc2hlZCA9IGZhbHNlO1xuICAgICAgY29uc3QgcnVuQ29tbWl0Q2FsbGJhY2sgPSAoKSA9PiBQcm9taXNlLnJlc29sdmUoKVxuICAgICAgICAudGhlbigoKSA9PiAodHlwZW9mIG9wdGlvbnMub25Db21taXQgPT09ICdmdW5jdGlvbicgPyBvcHRpb25zLm9uQ29tbWl0KG5leHRTdGF0ZSkgOiB1bmRlZmluZWQpKTtcbiAgICAgIGNvbnN0IHJ1bkFmdGVyUm91dGVSZWFkeSA9ICgpID0+IFByb21pc2UucmVzb2x2ZSgpXG4gICAgICAgIC50aGVuKCgpID0+ICh0eXBlb2Ygb3B0aW9ucy5hZnRlclJvdXRlUmVhZHkgPT09ICdmdW5jdGlvbicgPyBvcHRpb25zLmFmdGVyUm91dGVSZWFkeShuZXh0U3RhdGUpIDogdW5kZWZpbmVkKSk7XG4gICAgICBjb25zdCBmaW5pc2hTaW11bGF0aW9uRm9jdXNUcmFuc2l0aW9uID0gKCkgPT4ge1xuICAgICAgICBpZiAodHJhbnNpdGlvbkZpbmlzaGVkKSByZXR1cm47XG4gICAgICAgIHRyYW5zaXRpb25GaW5pc2hlZCA9IHRydWU7XG4gICAgICAgIHJldGFpbmVkU2ltdWxhdGlvbj8ucmVsZWFzZSgpO1xuICAgICAgICBmaW5pc2hUcmFuc2l0aW9uKGZhbHNlKTtcbiAgICAgIH07XG4gICAgICBjb25zdCBydW5TaW11bGF0aW9uRm9jdXNFbnRlciA9ICgpID0+IHtcbiAgICAgICAgc2V0U2ltdWxhdGlvbkZvY3VzVHJhbnNpdGlvblN0YXRlKCdpbicpO1xuICAgICAgICBpZiAobmV4dFJvdXRlSWQgPT09ICdob21lJyAmJiAhbmV4dFN0YXRlLmRhaWx5Rm9jdXNSb3V0ZUlkKSB7XG4gICAgICAgICAgZmluaXNoU2ltdWxhdGlvbkZvY3VzVHJhbnNpdGlvbigpO1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYW5pbWF0ZVNpbXVsYXRpb25Gb2N1c0xheWVyKHN1cmZhY2VSZWZzLCB7XG4gICAgICAgICAgZGlyZWN0aW9uOiAnaW4nLFxuICAgICAgICAgIGR1cmF0aW9uTXM6IHNpbXVsYXRpb25UaW1pbmdzLmVudGVyLFxuICAgICAgICAgIGxvY2FsRHVyYXRpb25Nczogc2ltdWxhdGlvblRpbWluZ3MuZW50ZXJMb2NhbCxcbiAgICAgICAgICBlYXNpbmc6IHNpbXVsYXRpb25UaW1pbmdzLmVudGVyRWFzaW5nLFxuICAgICAgICB9KS5maW5hbGx5KCgpID0+IHtcbiAgICAgICAgICBpZiAodHJhbnNpdGlvbkFjdGl2ZVJlZi5jdXJyZW50ICYmIGFjdGl2ZVJvdXRlSWRSZWYuY3VycmVudCA9PT0gbmV4dFJvdXRlSWQpIHtcbiAgICAgICAgICAgIGZpbmlzaFNpbXVsYXRpb25Gb2N1c1RyYW5zaXRpb24oKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICAgIGNvbnN0IGNhbmNlbFN0YWxlU2ltdWxhdGlvbkZvY3VzID0gKCkgPT4ge1xuICAgICAgICByb3V0ZVJlYWR5V2FpdGVyPy5jYW5jZWwoKTtcbiAgICAgICAgcmV0YWluZWRTaW11bGF0aW9uPy5yZWxlYXNlKHsgaW1tZWRpYXRlOiB0cnVlIH0pO1xuICAgICAgICBpZiAocm91dGVDb21taXR0ZWQgJiYgdHJhbnNpdGlvbkFjdGl2ZVJlZi5jdXJyZW50ICYmIGFjdGl2ZVJvdXRlSWRSZWYuY3VycmVudCA9PT0gbmV4dFJvdXRlSWQpIHtcbiAgICAgICAgICBmaW5pc2hTaW11bGF0aW9uRm9jdXNUcmFuc2l0aW9uKCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIFByb21pc2UucmVzb2x2ZSgpXG4gICAgICAgIC50aGVuKCgpID0+IG5leHRSb3V0ZVJ1bnRpbWU/LmxvYWRNb2R1bGU/LigpKVxuICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgaWYgKHN0YWxlKCkpIHtcbiAgICAgICAgICAgIGNhbmNlbFN0YWxlU2ltdWxhdGlvbkZvY3VzKCk7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzZXRTaW11bGF0aW9uU2hlbGxTdGFiaWxpdHkodHJ1ZSwgc3VyZmFjZVJlZnMsIHtcbiAgICAgICAgICAgIHRpdGxlU3VyZmFjZTogc2ltdWxhdGlvblRpdGxlU3VyZmFjZSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBzZXRTaW11bGF0aW9uRm9jdXNUcmFuc2l0aW9uU3RhdGUoJ291dCcpO1xuICAgICAgICAgIHJldHVybiBhbmltYXRlU2ltdWxhdGlvbkZvY3VzTGF5ZXIoc3VyZmFjZVJlZnMsIHtcbiAgICAgICAgICAgIGRpcmVjdGlvbjogJ291dCcsXG4gICAgICAgICAgICBkdXJhdGlvbk1zOiBzaW11bGF0aW9uVGltaW5ncy5leGl0LFxuICAgICAgICAgICAgbG9jYWxEdXJhdGlvbk1zOiBzaW11bGF0aW9uVGltaW5ncy5leGl0TG9jYWwsXG4gICAgICAgICAgICBlYXNpbmc6IHNpbXVsYXRpb25UaW1pbmdzLmV4aXRFYXNpbmcsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICBpZiAoc3RhbGUoKSkge1xuICAgICAgICAgICAgY2FuY2VsU3RhbGVTaW11bGF0aW9uRm9jdXMoKTtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIHNldFNpbXVsYXRpb25Gb2N1c1RyYW5zaXRpb25TdGF0ZSgnaG9sZCcpO1xuICAgICAgICAgIHJldHVybiB3YWl0Rm9yU2ltdWxhdGlvbkZvY3VzSG9sZChzaW11bGF0aW9uVGltaW5ncy5ob2xkKTtcbiAgICAgICAgfSlcbiAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIGlmIChzdGFsZSgpKSB7XG4gICAgICAgICAgICBjYW5jZWxTdGFsZVNpbXVsYXRpb25Gb2N1cygpO1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVjb3JkU2ltdWxhdGlvblZpc3VhbFRyYW5zaXRpb25FdmVudCgnY29tbWl0JywgeyByb3V0ZUlkOiBuZXh0U3RhdGUucm91dGUuaWQgfSk7XG4gICAgICAgICAgcmV0YWluZWRTaW11bGF0aW9uPy5zaG93KCk7XG4gICAgICAgICAgY29tbWl0KCk7XG4gICAgICAgICAgcm91dGVDb21taXR0ZWQgPSB0cnVlO1xuICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH0pXG4gICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICBpZiAoc3RhbGUoKSkge1xuICAgICAgICAgICAgY2FuY2VsU3RhbGVTaW11bGF0aW9uRm9jdXMoKTtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIHNldFNpbXVsYXRpb25TaGVsbFN0YWJpbGl0eSh0cnVlLCBzdXJmYWNlUmVmcywge1xuICAgICAgICAgICAgdGl0bGVTdXJmYWNlOiBzaW11bGF0aW9uVGl0bGVTdXJmYWNlLFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiB3YWl0Rm9yQ29tbWl0dGVkUm91dGVSZWFkeSgpO1xuICAgICAgICB9KVxuICAgICAgICAudGhlbigocmVhZGluZXNzU3RhdHVzKSA9PiB7XG4gICAgICAgICAgaWYgKHJlYWRpbmVzc1N0YXR1cyAhPT0gJ3JlYWR5Jykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBSb3V0ZSBcIiR7cmVhZGluZXNzUm91dGVJZH1cIiBkaWQgbm90IGJlY29tZSByZWFkeSAoJHtyZWFkaW5lc3NTdGF0dXN9KWApO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gcnVuQWZ0ZXJSb3V0ZVJlYWR5KCk7XG4gICAgICAgIH0pXG4gICAgICAgIC50aGVuKCgpID0+IHJ1bkNvbW1pdENhbGxiYWNrKCkpXG4gICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICBpZiAoc3RhbGUoKSkge1xuICAgICAgICAgICAgY2FuY2VsU3RhbGVTaW11bGF0aW9uRm9jdXMoKTtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIHNldFNpbXVsYXRpb25TaGVsbFN0YWJpbGl0eSh0cnVlLCBzdXJmYWNlUmVmcywge1xuICAgICAgICAgICAgdGl0bGVTdXJmYWNlOiBzaW11bGF0aW9uVGl0bGVTdXJmYWNlLFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJlY29yZFNpbXVsYXRpb25WaXN1YWxUcmFuc2l0aW9uRXZlbnQoJ3J1bnRpbWUtcmVhZHknLCB7IHJvdXRlSWQ6IG5leHRTdGF0ZS5yb3V0ZS5pZCB9KTtcbiAgICAgICAgICByZXRhaW5lZFNpbXVsYXRpb24/LnJlbGVhc2UoKTtcbiAgICAgICAgICByZXR1cm4gcnVuU2ltdWxhdGlvbkZvY3VzRW50ZXIoKTtcbiAgICAgICAgfSlcbiAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIGlmIChzdGFsZSgpKSB7XG4gICAgICAgICAgICBjYW5jZWxTdGFsZVNpbXVsYXRpb25Gb2N1cygpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBmaW5pc2hTaW11bGF0aW9uRm9jdXNUcmFuc2l0aW9uKCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChhc3luYyAoZXJyb3IpID0+IHtcbiAgICAgICAgICByb3V0ZVJlYWR5V2FpdGVyPy5jYW5jZWwoKTtcbiAgICAgICAgICBpZiAoc3RhbGUoKSkge1xuICAgICAgICAgICAgY2FuY2VsU3RhbGVTaW11bGF0aW9uRm9jdXMoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHJvdXRlQ29tbWl0dGVkKSB7XG4gICAgICAgICAgICByb2xsYmFjayhlcnJvcik7XG4gICAgICAgICAgICBjb25zdCBwcmV2aW91c1JlYWRpbmVzc1JvdXRlSWQgPSBwcmV2aW91c1N0YXRlLmRhaWx5Rm9jdXNSb3V0ZUlkIHx8IHByZXZpb3VzU3RhdGUucm91dGUuaWQ7XG4gICAgICAgICAgICBjb25zdCByZXN0b3JlZFJvdXRlV2FpdGVyID0gd2FpdEZvclJvdXRlUmVhZHkocHJldmlvdXNSZWFkaW5lc3NSb3V0ZUlkLCByb3V0ZVRpbWluZ3MucmVhZHksIHtcbiAgICAgICAgICAgICAgbG9ja2VkR2F0ZUlkOiBwcmV2aW91c1N0YXRlLmxvY2tlZEdhdGVJZCB8fCBudWxsLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBhd2FpdCByZXN0b3JlZFJvdXRlV2FpdGVyLnByb21pc2U7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIG9wdGlvbnMub25GYWlsdXJlPy4oZXJyb3IsIHByZXZpb3VzU3RhdGUpO1xuICAgICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAgIC8vIEZhaWx1cmUgcmVwb3J0aW5nIG11c3Qgbm90IHByZXZlbnQgdHJhbnNpdGlvbiBjbGVhbnVwLlxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXRhaW5lZFNpbXVsYXRpb24/LnJlbGVhc2UoKTtcbiAgICAgICAgICBmaW5pc2hTaW11bGF0aW9uRm9jdXNUcmFuc2l0aW9uKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKiDilIDilIAgc21vb3RoIHRyYW5zaXRpb24gKGdhdGUtc3VjY2VzcyBPUiBhbnkgU1BBIHJvdXRlIGNoYW5nZSkg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAICovXG4gICAgaWYgKCghaXNTYW1lUm91dGUgfHwgaGFzUm91dGVDb250ZW50Q2hhbmdlKSAmJiAhcmVkdWNlTW90aW9uKSB7XG4gICAgICB0cmFuc2l0aW9uQWN0aXZlUmVmLmN1cnJlbnQgPSB0cnVlO1xuICAgICAgYWN0aXZlR2F0ZVRyYW5zaXRpb25SZWYuY3VycmVudCA9IGlzR2F0ZTtcbiAgICAgIGFjdGl2ZVRyYW5zaXRpb25Db21taXR0ZWRSZWYuY3VycmVudCA9IGhpc3RvcnlDb21taXR0ZWQ7XG4gICAgICBzZXRQZW5kaW5nQWN0aXZlUm91dGVJZChuZXh0Um91dGVJZCk7XG4gICAgICBzZXRMZWdhY3lSb3V0ZVRyYW5zaXRpb25BY3RpdmUodHJ1ZSwgeyBnYXRlOiBpc0dhdGUgfSk7XG4gICAgICBzZXRUcmFuc2l0aW9uUGhhc2UoVFJBTlNJVElPTl9QSEFTRVMuUk9VVEVfT1VUKTtcblxuICAgICAgY29uc3QgdG9rZW4gPSArK3RyYW5zaXRpb25Ub2tlbjtcbiAgICAgIGNvbnN0IHN0YWxlID0gKCkgPT4gdG9rZW4gIT09IHRyYW5zaXRpb25Ub2tlbjtcbiAgICAgIGNvbnN0IHJvdXRlUmVhZHlXYWl0ZXIgPSB3YWl0Rm9yUm91dGVSZWFkeShuZXh0U3RhdGUucm91dGUuaWQsIHJvdXRlVGltaW5ncy5yZWFkeSwge1xuICAgICAgICBsb2NrZWRHYXRlSWQ6IG5leHRTdGF0ZS5sb2NrZWRHYXRlSWQgfHwgbnVsbCxcbiAgICAgIH0pO1xuICAgICAgY29uc3Qgcm91dGVSZWFkeSA9IHJvdXRlUmVhZHlXYWl0ZXIucHJvbWlzZTtcbiAgICAgIGFjdGl2ZVJvdXRlUmVhZHlDYW5jZWxSZWYuY3VycmVudCA9IHJvdXRlUmVhZHlXYWl0ZXIuY2FuY2VsO1xuICAgICAgbGV0IGdhdGVCYWNrZHJvcERpc21pc3NlZCA9IGZhbHNlO1xuICAgICAgY29uc3QgZGlzbWlzc0dhdGVCYWNrZHJvcE9uY2UgPSAoKSA9PiB7XG4gICAgICAgIGlmICghaXNHYXRlIHx8IGdhdGVCYWNrZHJvcERpc21pc3NlZCkgcmV0dXJuO1xuICAgICAgICBnYXRlQmFja2Ryb3BEaXNtaXNzZWQgPSB0cnVlO1xuICAgICAgICBkaXNtaXNzR2F0ZUJhY2tkcm9wKHsgc3VwcHJlc3NSZXR1cm5BbmltYXRpb246IHRydWUgfSk7XG4gICAgICB9O1xuXG4gICAgICBQcm9taXNlLnJlc29sdmUoKVxuICAgICAgICAudGhlbigoKSA9PiBuZXh0Um91dGVSdW50aW1lPy5sb2FkTW9kdWxlPy4oKSkuY2F0Y2goKCkgPT4gdW5kZWZpbmVkKVxuICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgaWYgKHN0YWxlKCkpIHtcbiAgICAgICAgICAgIHJvdXRlUmVhZHlXYWl0ZXIuY2FuY2VsKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBmYWRlT3V0Q29udGVudChyb3V0ZVRpbWluZ3MuZmFkZU91dCwgcm91dGVUaW1pbmdzLmZhZGVFYXNpbmcsIHN1cmZhY2VSZWZzLCB7XG4gICAgICAgICAgICBmaW5hbE9wYWNpdHk6IGlzR2F0ZSA/IDAgOiAwLjA4LFxuICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgaWYgKHN0YWxlKCkpIHtcbiAgICAgICAgICAgIHJvdXRlUmVhZHlXYWl0ZXIuY2FuY2VsKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChpc0dhdGUpIHtcbiAgICAgICAgICAgIC8vIEdhdGUtc3VjY2VzcyBoYW5kb2ZmcyBzdGF5IGhpZGRlbiB3aGlsZSB0aGUgZGVzdGluYXRpb24gc2V0dGxlcy5cbiAgICAgICAgICAgIHNldFJvdXRlTGF5ZXJWaXNpYmlsaXR5KGZhbHNlLCBzdXJmYWNlUmVmcyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBpblJvdXRlU3VyZmFjZXNGb3JDb21taXQoc3VyZmFjZVJlZnMpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb21taXQoKTtcbiAgICAgICAgICBpZiAoIWlzR2F0ZSkge1xuICAgICAgICAgICAgaG9sZFBpbm5lZFJvdXRlU3VyZmFjZXNVbnRpbFJvdXRlSW4oXG4gICAgICAgICAgICAgIHN1cmZhY2VSZWZzLFxuICAgICAgICAgICAgICAoKSA9PiAhc3RhbGUoKSAmJiBnZXRUcmFuc2l0aW9uUGhhc2UoKSA9PT0gVFJBTlNJVElPTl9QSEFTRVMuUk9VVEVfT1VUXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gcm91dGVSZWFkeTtcbiAgICAgICAgfSlcbiAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIGlmIChzdGFsZSgpKSB7XG4gICAgICAgICAgICByb3V0ZVJlYWR5V2FpdGVyLmNhbmNlbCgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gd2FpdEZvclJvdXRlUGFpbnRGcmFtZXMoMik7XG4gICAgICAgIH0pXG4gICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICBpZiAoc3RhbGUoKSkge1xuICAgICAgICAgICAgcm91dGVSZWFkeVdhaXRlci5jYW5jZWwoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgc2V0VHJhbnNpdGlvblBoYXNlKFRSQU5TSVRJT05fUEhBU0VTLlJPVVRFX0lOKTtcbiAgICAgICAgICAvLyBLZWVwIHJvdXRlIGxheWVycyBoaWRkZW4gdW50aWwgc3RhZ2dlcmVkRW50cmFuY2UgaGFzIGFscmVhZHkgcGlubmVkXG4gICAgICAgICAgLy8gdGhlIG5ldyByb3V0ZSBzdXJmYWNlcyB0byBvcGFjaXR5IDAuIFJlc3RvcmluZyB2aXNpYmlsaXR5IGZpcnN0IGNhblxuICAgICAgICAgIC8vIGV4cG9zZSBwb3J0Zm9saW8gdGV4dCBmb3IgYSBmcmFtZSBiZWZvcmUgdGhlIHN0YWdnZXIgcHJlcCBydW5zLlxuICAgICAgICAgIHJldHVybiBzdGFnZ2VyZWRFbnRyYW5jZSh7XG4gICAgICAgICAgICByb3V0ZUlkOiBuZXh0U3RhdGUucm91dGUuaWQsXG4gICAgICAgICAgICBzdXJmYWNlUmVmcyxcbiAgICAgICAgICAgIGVudGVyTXM6IHJvdXRlVGltaW5ncy5yZXZlYWwsXG4gICAgICAgICAgICByZXZlYWxFYXNpbmc6IHJvdXRlVGltaW5ncy5yZXZlYWxFYXNpbmcsXG4gICAgICAgICAgICBvblByZXBhcmVkOiAoKSA9PiB7XG4gICAgICAgICAgICAgIGRpc21pc3NQb3J0Zm9saW9HYXRlU2NlbmVCcmlkZ2Uoe1xuICAgICAgICAgICAgICAgIGR1cmF0aW9uTXM6IFBPUlRGT0xJT19HQVRFX1NDRU5FX0ZBREVfTVMsXG4gICAgICAgICAgICAgICAgZGVsYXlNczogR1JPVVBFRF9ST1VURV9PRkZTRVRfTVMsXG4gICAgICAgICAgICAgICAgZWFzaW5nOiAnbGluZWFyJyxcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIGRpc21pc3NHYXRlQmFja2Ryb3BPbmNlKCk7XG4gICAgICAgICAgICAgIGlmIChuZXh0Um91dGVJZCA9PT0gJ3BvcnRmb2xpbycpIHtcbiAgICAgICAgICAgICAgICByZWxlYXNlUG9ydGZvbGlvRGVjayhpc0dhdGUgPyAnZ2F0ZS1zdWNjZXNzJyA6ICdyb3V0ZS1pbicpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgaWYgKHN0YWxlKCkpIHtcbiAgICAgICAgICAgIHJvdXRlUmVhZHlXYWl0ZXIuY2FuY2VsKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGZpbmlzaFRyYW5zaXRpb24oaXNHYXRlLCBnYXRlQmFja2Ryb3BEaXNtaXNzZWQpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goKCkgPT4ge1xuICAgICAgICAgIHJvdXRlUmVhZHlXYWl0ZXIuY2FuY2VsKCk7XG4gICAgICAgICAgaWYgKCFzdGFsZSgpKSB7XG4gICAgICAgICAgICBmaW5pc2hUcmFuc2l0aW9uKGlzR2F0ZSwgZ2F0ZUJhY2tkcm9wRGlzbWlzc2VkKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKiDilIDilIAgcmVkdWNlZCBtb3Rpb24gb3Igc2FtZS1yb3V0ZTogaW5zdGFudCB3aXRoIGNsZWFudXAg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAICovXG4gICAgaWYgKGlzR2F0ZSkge1xuICAgICAgdHJhbnNpdGlvbkFjdGl2ZVJlZi5jdXJyZW50ID0gdHJ1ZTtcbiAgICAgIGFjdGl2ZUdhdGVUcmFuc2l0aW9uUmVmLmN1cnJlbnQgPSB0cnVlO1xuICAgICAgYWN0aXZlVHJhbnNpdGlvbkNvbW1pdHRlZFJlZi5jdXJyZW50ID0gaGlzdG9yeUNvbW1pdHRlZDtcbiAgICAgIHNldFBlbmRpbmdBY3RpdmVSb3V0ZUlkKG5leHRSb3V0ZUlkKTtcbiAgICAgIHNldExlZ2FjeVJvdXRlVHJhbnNpdGlvbkFjdGl2ZSh0cnVlLCB7IGdhdGU6IHRydWUgfSk7XG4gICAgICBzZXRUcmFuc2l0aW9uUGhhc2UoVFJBTlNJVElPTl9QSEFTRVMuUk9VVEVfT1VUKTtcbiAgICAgIGNvbnN0IHRva2VuID0gKyt0cmFuc2l0aW9uVG9rZW47XG4gICAgICBjb25zdCBzdGFsZSA9ICgpID0+IHRva2VuICE9PSB0cmFuc2l0aW9uVG9rZW47XG4gICAgICBjb25zdCByb3V0ZVJlYWR5V2FpdGVyID0gd2FpdEZvclJvdXRlUmVhZHkobmV4dFN0YXRlLnJvdXRlLmlkLCByb3V0ZVRpbWluZ3MucmVhZHksIHtcbiAgICAgICAgbG9ja2VkR2F0ZUlkOiBuZXh0U3RhdGUubG9ja2VkR2F0ZUlkIHx8IG51bGwsXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHJvdXRlUmVhZHkgPSByb3V0ZVJlYWR5V2FpdGVyLnByb21pc2U7XG4gICAgICBhY3RpdmVSb3V0ZVJlYWR5Q2FuY2VsUmVmLmN1cnJlbnQgPSByb3V0ZVJlYWR5V2FpdGVyLmNhbmNlbDtcbiAgICAgIGxldCBnYXRlQmFja2Ryb3BEaXNtaXNzZWQgPSBmYWxzZTtcbiAgICAgIGNvbnN0IGRpc21pc3NHYXRlQmFja2Ryb3BPbmNlID0gKCkgPT4ge1xuICAgICAgICBpZiAoZ2F0ZUJhY2tkcm9wRGlzbWlzc2VkKSByZXR1cm47XG4gICAgICAgIGdhdGVCYWNrZHJvcERpc21pc3NlZCA9IHRydWU7XG4gICAgICAgIGRpc21pc3NHYXRlQmFja2Ryb3AoeyBzdXBwcmVzc1JldHVybkFuaW1hdGlvbjogdHJ1ZSB9KTtcbiAgICAgIH07XG5cbiAgICAgIFByb21pc2UucmVzb2x2ZSgpXG4gICAgICAgIC50aGVuKCgpID0+IG5leHRSb3V0ZVJ1bnRpbWU/LmxvYWRNb2R1bGU/LigpKS5jYXRjaCgoKSA9PiB1bmRlZmluZWQpXG4gICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICBpZiAoc3RhbGUoKSkge1xuICAgICAgICAgICAgcm91dGVSZWFkeVdhaXRlci5jYW5jZWwoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFpc1NhbWVSb3V0ZSB8fCBoYXNSb3V0ZUNvbnRlbnRDaGFuZ2UpIHtcbiAgICAgICAgICAgIHNldFJvdXRlTGF5ZXJWaXNpYmlsaXR5KGZhbHNlLCBzdXJmYWNlUmVmcyk7XG4gICAgICAgICAgICBjb21taXQoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHJvdXRlUmVhZHk7XG4gICAgICAgIH0pXG4gICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICBpZiAoc3RhbGUoKSkge1xuICAgICAgICAgICAgcm91dGVSZWFkeVdhaXRlci5jYW5jZWwoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgc2V0VHJhbnNpdGlvblBoYXNlKFRSQU5TSVRJT05fUEhBU0VTLlJPVVRFX0lOKTtcbiAgICAgICAgICBzZXRSb3V0ZUxheWVyVmlzaWJpbGl0eSh0cnVlLCBzdXJmYWNlUmVmcyk7XG4gICAgICAgICAgcmVsZWFzZVBvcnRmb2xpb0RlY2soJ3JlZHVjZWQtbW90aW9uJyk7XG4gICAgICAgICAgZGlzbWlzc1BvcnRmb2xpb0dhdGVTY2VuZUJyaWRnZSh7IGluc3RhbnQ6IHRydWUgfSk7XG4gICAgICAgICAgZGlzbWlzc0dhdGVCYWNrZHJvcE9uY2UoKTtcbiAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9KVxuICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgaWYgKHN0YWxlKCkpIHtcbiAgICAgICAgICAgIHJvdXRlUmVhZHlXYWl0ZXIuY2FuY2VsKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGZpbmlzaFRyYW5zaXRpb24odHJ1ZSwgZ2F0ZUJhY2tkcm9wRGlzbWlzc2VkKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKCgpID0+IHtcbiAgICAgICAgICByb3V0ZVJlYWR5V2FpdGVyLmNhbmNlbCgpO1xuICAgICAgICAgIGlmICghc3RhbGUoKSkge1xuICAgICAgICAgICAgZmluaXNoVHJhbnNpdGlvbih0cnVlLCBnYXRlQmFja2Ryb3BEaXNtaXNzZWQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8qIOKUgOKUgCBzYW1lLXJvdXRlIG9yIHJlZHVjZWQtbW90aW9uIG5vbi1nYXRlOiBpbnN0YW50IGNvbW1pdCDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAgKi9cbiAgICBjb21taXQoKTtcbiAgICBzZXRQZW5kaW5nQWN0aXZlUm91dGVJZChudWxsKTtcbiAgICBzeW5jU3RlYWR5VHJhbnNpdGlvblBoYXNlKCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0sIFtzdXJmYWNlUmVmcywgc3luY1N0ZWFkeVRyYW5zaXRpb25QaGFzZV0pO1xuXG4gIGNvbnN0IHRyYW5zaXRpb25DdXJyZW50Um91dGUgPSB1c2VDYWxsYmFjaygodGFzaywgb3B0aW9ucyA9IHt9KSA9PiB7XG4gICAgaWYgKHRyYW5zaXRpb25BY3RpdmVSZWYuY3VycmVudCkgcmV0dXJuIGZhbHNlO1xuXG4gICAgY29uc3QgY3VycmVudFJvdXRlSWQgPSBhY3RpdmVSb3V0ZUlkUmVmLmN1cnJlbnQ7XG4gICAgY29uc3QgcmVkdWNlTW90aW9uID0gd2luZG93Lm1hdGNoTWVkaWE/LignKHByZWZlcnMtcmVkdWNlZC1tb3Rpb246IHJlZHVjZSknKT8ubWF0Y2hlcyA/PyBmYWxzZTtcbiAgICBjb25zdCByb3V0ZVRpbWluZ3MgPSBnZXRSb3V0ZVRyYW5zaXRpb25UaW1pbmdzKHtcbiAgICAgIGZhZGVNczogb3B0aW9ucy5leGl0TXMsXG4gICAgICBzdGFnZ2VyTXM6IG9wdGlvbnMuc3RhZ2dlck1zLFxuICAgICAgcmV2ZWFsTXM6IG9wdGlvbnMuZW50ZXJNcyxcbiAgICAgIHJlYWR5TXM6IG9wdGlvbnMucmVhZHlGYWxsYmFja01zLFxuICAgICAgcmVkdWNlTW90aW9uLFxuICAgIH0pO1xuICAgIGNvbnN0IGlzU2ltdWxhdGlvbkZvY3VzID0gb3B0aW9ucy50cmFuc2l0aW9uU3R5bGUgPT09ICdzaW11bGF0aW9uLWZvY3VzJztcblxuICAgIGNvbnN0IGZpbmlzaFRyYW5zaXRpb24gPSAoKSA9PiB7XG4gICAgICB0cmFuc2l0aW9uQWN0aXZlUmVmLmN1cnJlbnQgPSBmYWxzZTtcbiAgICAgIGFjdGl2ZUdhdGVUcmFuc2l0aW9uUmVmLmN1cnJlbnQgPSBmYWxzZTtcbiAgICAgIGNvbnN0IHJlbGVhc2VHYXRlQmFja2Ryb3AgPSBCb29sZWFuKG9wdGlvbnMucmVsZWFzZUdhdGVCYWNrZHJvcE9uQ29tcGxldGUpO1xuICAgICAgZmluYWxpemVUcmFuc2l0aW9uKGZhbHNlLCBjdXJyZW50Um91dGVJZCwgc3VyZmFjZVJlZnMsIHtcbiAgICAgICAgcHJlc2VydmVUcmFuc2l0aW9uUGhhc2U6IHJlbGVhc2VHYXRlQmFja2Ryb3AsXG4gICAgICB9KTtcbiAgICAgIHJlc2V0U2ltdWxhdGlvbkZvY3VzVHJhbnNpdGlvbihzdXJmYWNlUmVmcyk7XG4gICAgICBpZiAocmVsZWFzZUdhdGVCYWNrZHJvcCkge1xuICAgICAgICBkaXNtaXNzR2F0ZUJhY2tkcm9wKHsgaW5zdGFudDogaXNTaW11bGF0aW9uRm9jdXMgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzeW5jU3RlYWR5VHJhbnNpdGlvblBoYXNlKCk7XG4gICAgICB9XG4gICAgICBjb25zdCBxdWV1ZWQgPSBxdWV1ZWROYXZpZ2F0aW9uUmVmLmN1cnJlbnQ7XG4gICAgICBpZiAoIXF1ZXVlZCkgcmV0dXJuO1xuICAgICAgcXVldWVkTmF2aWdhdGlvblJlZi5jdXJyZW50ID0gbnVsbDtcbiAgICAgIGlmIChcbiAgICAgICAgcXVldWVkLnJvdXRlSWQgPT09IGFjdGl2ZVJvdXRlSWRSZWYuY3VycmVudFxuICAgICAgICAmJiBxdWV1ZWQucm91dGVDb250ZW50U2lnbmF0dXJlID09PSBhY3RpdmVSb3V0ZUNvbnRlbnRTaWduYXR1cmVSZWYuY3VycmVudFxuICAgICAgICAmJiAocXVldWVkLmZvY3VzU2ltdWxhdGlvbklkIHx8ICcnKSA9PT0gYWN0aXZlRm9jdXNTaW11bGF0aW9uSWRSZWYuY3VycmVudFxuICAgICAgKSByZXR1cm47XG4gICAgICBzZXRTdGFibGVUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgaWYgKCF0cmFuc2l0aW9uQWN0aXZlUmVmLmN1cnJlbnQpIG5hdmlnYXRlKHF1ZXVlZC5ocmVmLCBxdWV1ZWQub3B0aW9ucyk7XG4gICAgICB9LCAwKTtcbiAgICB9O1xuXG4gICAgY29uc3QgcnVuVGFzayA9ICgpID0+IFByb21pc2UucmVzb2x2ZSgpXG4gICAgICAudGhlbigoKSA9PiAodHlwZW9mIHRhc2sgPT09ICdmdW5jdGlvbicgPyB0YXNrKCkgOiB1bmRlZmluZWQpKTtcblxuICAgIGlmIChpc1NpbXVsYXRpb25Gb2N1cykge1xuICAgICAgdHJhbnNpdGlvbkFjdGl2ZVJlZi5jdXJyZW50ID0gdHJ1ZTtcbiAgICAgIGFjdGl2ZVRyYW5zaXRpb25Db21taXR0ZWRSZWYuY3VycmVudCA9IGZhbHNlO1xuICAgICAgc2V0TGVnYWN5Um91dGVUcmFuc2l0aW9uQWN0aXZlKHRydWUsIHsgZ2F0ZTogZmFsc2UgfSk7XG4gICAgICBzZXRTaW11bGF0aW9uU2hlbGxTdGFiaWxpdHkodHJ1ZSwgc3VyZmFjZVJlZnMpO1xuICAgICAgY29uc3QgdG9rZW4gPSArK3RyYW5zaXRpb25Ub2tlbjtcbiAgICAgIGNvbnN0IHN0YWxlID0gKCkgPT4gdG9rZW4gIT09IHRyYW5zaXRpb25Ub2tlbjtcbiAgICAgIGNvbnN0IHNpbXVsYXRpb25UaW1pbmdzID0gZ2V0U2ltdWxhdGlvbkZvY3VzVGltaW5ncyhvcHRpb25zLCByZWR1Y2VNb3Rpb24pO1xuICAgICAgbGV0IHRhc2tFcnJvciA9IG51bGw7XG5cbiAgICAgIHNldFNpbXVsYXRpb25Gb2N1c1RyYW5zaXRpb25TdGF0ZSgnb3V0Jyk7XG4gICAgICBhbmltYXRlU2ltdWxhdGlvbkZvY3VzTGF5ZXIoc3VyZmFjZVJlZnMsIHtcbiAgICAgICAgZGlyZWN0aW9uOiAnb3V0JyxcbiAgICAgICAgZHVyYXRpb25Nczogc2ltdWxhdGlvblRpbWluZ3MuZXhpdCxcbiAgICAgICAgbG9jYWxEdXJhdGlvbk1zOiBzaW11bGF0aW9uVGltaW5ncy5leGl0TG9jYWwsXG4gICAgICAgIGVhc2luZzogc2ltdWxhdGlvblRpbWluZ3MuZXhpdEVhc2luZyxcbiAgICAgIH0pXG4gICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICBpZiAoc3RhbGUoKSkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICBzZXRTaW11bGF0aW9uRm9jdXNUcmFuc2l0aW9uU3RhdGUoJ2hvbGQnKTtcbiAgICAgICAgICByZXR1cm4gd2FpdEZvclNpbXVsYXRpb25Gb2N1c0hvbGQoc2ltdWxhdGlvblRpbWluZ3MuaG9sZCk7XG4gICAgICAgIH0pXG4gICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICBpZiAoc3RhbGUoKSkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICByZWNvcmRTaW11bGF0aW9uVmlzdWFsVHJhbnNpdGlvbkV2ZW50KCdjb21taXQnLCB7IHJvdXRlSWQ6IGN1cnJlbnRSb3V0ZUlkIH0pO1xuICAgICAgICAgIHJldHVybiBydW5UYXNrKCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgICB0YXNrRXJyb3IgPSBlcnJvcjtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgb3B0aW9ucy5vbkZhaWx1cmU/LihlcnJvcik7XG4gICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAvLyBGYWlsdXJlIHJlcG9ydGluZyBtdXN0IG5vdCBwcmV2ZW50IHRoZSBjdXJyZW50IHNjZW5lIHJldHVybmluZy5cbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICBpZiAoc3RhbGUoKSkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICBzZXRTaW11bGF0aW9uU2hlbGxTdGFiaWxpdHkodHJ1ZSwgc3VyZmFjZVJlZnMpO1xuICAgICAgICAgIHJlY29yZFNpbXVsYXRpb25WaXN1YWxUcmFuc2l0aW9uRXZlbnQodGFza0Vycm9yID8gJ3J1bnRpbWUtZmFpbGVkJyA6ICdydW50aW1lLXJlYWR5Jywge1xuICAgICAgICAgICAgcm91dGVJZDogY3VycmVudFJvdXRlSWQsXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgc2V0U2ltdWxhdGlvbkZvY3VzVHJhbnNpdGlvblN0YXRlKCdpbicpO1xuICAgICAgICAgIHJldHVybiBhbmltYXRlU2ltdWxhdGlvbkZvY3VzTGF5ZXIoc3VyZmFjZVJlZnMsIHtcbiAgICAgICAgICAgIGRpcmVjdGlvbjogJ2luJyxcbiAgICAgICAgICAgIGR1cmF0aW9uTXM6IHNpbXVsYXRpb25UaW1pbmdzLmVudGVyLFxuICAgICAgICAgICAgbG9jYWxEdXJhdGlvbk1zOiBzaW11bGF0aW9uVGltaW5ncy5lbnRlckxvY2FsLFxuICAgICAgICAgICAgZWFzaW5nOiBzaW11bGF0aW9uVGltaW5ncy5lbnRlckVhc2luZyxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIGlmICghc3RhbGUoKSkge1xuICAgICAgICAgICAgZmluaXNoVHJhbnNpdGlvbigpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKCgpID0+IHtcbiAgICAgICAgICBpZiAoIXN0YWxlKCkpIHtcbiAgICAgICAgICAgIGZpbmlzaFRyYW5zaXRpb24oKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAocmVkdWNlTW90aW9uKSB7XG4gICAgICB0cmFuc2l0aW9uQWN0aXZlUmVmLmN1cnJlbnQgPSB0cnVlO1xuICAgICAgYWN0aXZlVHJhbnNpdGlvbkNvbW1pdHRlZFJlZi5jdXJyZW50ID0gZmFsc2U7XG4gICAgICBzZXRMZWdhY3lSb3V0ZVRyYW5zaXRpb25BY3RpdmUodHJ1ZSwgeyBnYXRlOiBmYWxzZSB9KTtcbiAgICAgIHNldFRyYW5zaXRpb25QaGFzZShUUkFOU0lUSU9OX1BIQVNFUy5ST1VURV9PVVQpO1xuICAgICAgcnVuVGFzaygpXG4gICAgICAgIC5jYXRjaCgoKSA9PiB1bmRlZmluZWQpXG4gICAgICAgIC50aGVuKGZpbmlzaFRyYW5zaXRpb24pO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgdHJhbnNpdGlvbkFjdGl2ZVJlZi5jdXJyZW50ID0gdHJ1ZTtcbiAgICBhY3RpdmVUcmFuc2l0aW9uQ29tbWl0dGVkUmVmLmN1cnJlbnQgPSBmYWxzZTtcbiAgICBzZXRMZWdhY3lSb3V0ZVRyYW5zaXRpb25BY3RpdmUodHJ1ZSwgeyBnYXRlOiBmYWxzZSB9KTtcbiAgICBzZXRUcmFuc2l0aW9uUGhhc2UoVFJBTlNJVElPTl9QSEFTRVMuUk9VVEVfT1VUKTtcblxuICAgIGNvbnN0IHRva2VuID0gKyt0cmFuc2l0aW9uVG9rZW47XG4gICAgY29uc3Qgc3RhbGUgPSAoKSA9PiB0b2tlbiAhPT0gdHJhbnNpdGlvblRva2VuO1xuXG4gICAgZmFkZU91dENvbnRlbnQocm91dGVUaW1pbmdzLmZhZGVPdXQsIHJvdXRlVGltaW5ncy5mYWRlRWFzaW5nLCBzdXJmYWNlUmVmcywgeyBmaW5hbE9wYWNpdHk6IDAuMDggfSlcbiAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgaWYgKHN0YWxlKCkpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIHNldFJvdXRlTGF5ZXJWaXNpYmlsaXR5KGZhbHNlLCBzdXJmYWNlUmVmcyk7XG4gICAgICAgIHJldHVybiBydW5UYXNrKCk7XG4gICAgICB9KVxuICAgICAgLmNhdGNoKCgpID0+IHVuZGVmaW5lZClcbiAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgaWYgKHN0YWxlKCkpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIHNldFRyYW5zaXRpb25QaGFzZShUUkFOU0lUSU9OX1BIQVNFUy5ST1VURV9JTik7XG4gICAgICAgIHJldHVybiBzdGFnZ2VyZWRFbnRyYW5jZSh7XG4gICAgICAgICAgcm91dGVJZDogY3VycmVudFJvdXRlSWQsXG4gICAgICAgICAgc3VyZmFjZVJlZnMsXG4gICAgICAgICAgZW50ZXJNczogcm91dGVUaW1pbmdzLnJldmVhbCxcbiAgICAgICAgICByZXZlYWxFYXNpbmc6IHJvdXRlVGltaW5ncy5yZXZlYWxFYXNpbmcsXG4gICAgICAgIH0pO1xuICAgICAgfSlcbiAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgaWYgKCFzdGFsZSgpKSB7XG4gICAgICAgICAgZmluaXNoVHJhbnNpdGlvbigpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLmNhdGNoKCgpID0+IHtcbiAgICAgICAgaWYgKCFzdGFsZSgpKSB7XG4gICAgICAgICAgZmluaXNoVHJhbnNpdGlvbigpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgIHJldHVybiB0cnVlO1xuICB9LCBbbmF2aWdhdGUsIHN1cmZhY2VSZWZzLCBzeW5jU3RlYWR5VHJhbnNpdGlvblBoYXNlXSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IGluc3RhbGxTcGFOYXZpZ2F0aW9uQnJpZGdlKG5hdmlnYXRlKSwgW25hdmlnYXRlXSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IGluc3RhbGxUcmFuc2l0aW9uUGhhc2VPYnNlcnZlcih7XG4gICAgcm9vdDogZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LFxuICAgIGlzUm91dGVUcmFuc2l0aW9uQWN0aXZlOiAoKSA9PiB0cmFuc2l0aW9uQWN0aXZlUmVmLmN1cnJlbnQsXG4gIH0pLCBbXSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBpZiAoIWltcG9ydC5tZXRhLmVudj8uREVWKSByZXR1cm4gKCkgPT4ge307XG4gICAgcmV0dXJuIGluc3RhbGxUcmFuc2l0aW9uT3duZXJzaGlwR3VhcmQoe1xuICAgICAgcm9vdDogZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LFxuICAgIH0pO1xuICB9LCBbXSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCBvbk1vZGFsT3BlbiA9ICgpID0+IHtcbiAgICAgIGlmICh0cmFuc2l0aW9uQWN0aXZlUmVmLmN1cnJlbnQpIHJldHVybjtcbiAgICAgIHNldFRyYW5zaXRpb25QaGFzZShUUkFOU0lUSU9OX1BIQVNFUy5NT0RBTF9PUEVOKTtcbiAgICB9O1xuICAgIGNvbnN0IG9uTW9kYWxDbG9zZSA9IChldmVudCkgPT4ge1xuICAgICAgaWYgKHRyYW5zaXRpb25BY3RpdmVSZWYuY3VycmVudCkgcmV0dXJuO1xuICAgICAgc2V0VHJhbnNpdGlvblBoYXNlKFRSQU5TSVRJT05fUEhBU0VTLklETEUsIHtcbiAgICAgICAgcmV0dXJuaW5nOiAhZXZlbnQ/LmRldGFpbD8uc3VwcHJlc3NSZXR1cm5BbmltYXRpb24sXG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2Ficzp0cmFuc2l0aW9uLW1vZGFsLW9wZW4nLCBvbk1vZGFsT3Blbik7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2Ficzp0cmFuc2l0aW9uLW1vZGFsLWNsb3NlJywgb25Nb2RhbENsb3NlKTtcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Ficzp0cmFuc2l0aW9uLW1vZGFsLW9wZW4nLCBvbk1vZGFsT3Blbik7XG4gICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignYWJzOnRyYW5zaXRpb24tbW9kYWwtY2xvc2UnLCBvbk1vZGFsQ2xvc2UpO1xuICAgIH07XG4gIH0sIFtdKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IGhhbmRsZVBvcFN0YXRlID0gKCkgPT4ge1xuICAgICAgY29uc3QgbmV4dEhyZWYgPSB3aW5kb3cubG9jYXRpb24uaHJlZjtcbiAgICAgIGNvbnN0IG5leHRTdGF0ZSA9IGNvbXB1dGVSb3V0ZVN0YXRlKG5leHRIcmVmKTtcbiAgICAgIGNvbnN0IGlzU2FtZVJvdXRlID0gbmV4dFN0YXRlLnJvdXRlLmlkID09PSBhY3RpdmVSb3V0ZUlkUmVmLmN1cnJlbnQ7XG4gICAgICBjb25zdCB3YXNHYXRlVHJhbnNpdGlvbiA9IGFjdGl2ZUdhdGVUcmFuc2l0aW9uUmVmLmN1cnJlbnQ7XG4gICAgICBjb25zdCB3YXNUcmFuc2l0aW9uQWN0aXZlID0gdHJhbnNpdGlvbkFjdGl2ZVJlZi5jdXJyZW50O1xuICAgICAgY29uc3Qgd2FzU2ltdWxhdGlvbkZvY3VzVHJhbnNpdGlvbiA9IEJvb2xlYW4oXG4gICAgICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5kYXRhc2V0LmFic1NpbXVsYXRpb25Gb2N1c1RyYW5zaXRpb25cbiAgICAgICk7XG5cbiAgICAgICsrdHJhbnNpdGlvblRva2VuO1xuICAgICAgcXVldWVkTmF2aWdhdGlvblJlZi5jdXJyZW50ID0gbnVsbDtcbiAgICAgIGlmICh3YXNUcmFuc2l0aW9uQWN0aXZlIHx8IHdhc0dhdGVUcmFuc2l0aW9uKSB7XG4gICAgICAgIGludGVycnVwdFRyYW5zaXRpb25Gb3JQb3BzdGF0ZSh3YXNHYXRlVHJhbnNpdGlvbiwgYWN0aXZlUm91dGVJZFJlZi5jdXJyZW50LCBzdXJmYWNlUmVmcyk7XG4gICAgICB9XG4gICAgICBhY3RpdmVSb3V0ZVJlYWR5Q2FuY2VsUmVmLmN1cnJlbnQ/LigpO1xuICAgICAgYWN0aXZlUm91dGVSZWFkeUNhbmNlbFJlZi5jdXJyZW50ID0gbnVsbDtcbiAgICAgIHRyYW5zaXRpb25BY3RpdmVSZWYuY3VycmVudCA9IGZhbHNlO1xuICAgICAgYWN0aXZlR2F0ZVRyYW5zaXRpb25SZWYuY3VycmVudCA9IGZhbHNlO1xuICAgICAgc2V0UGVuZGluZ0FjdGl2ZVJvdXRlSWQobnVsbCk7XG4gICAgICBpZiAod2FzU2ltdWxhdGlvbkZvY3VzVHJhbnNpdGlvbikge1xuICAgICAgICByZXNldFNpbXVsYXRpb25Gb2N1c1RyYW5zaXRpb24oc3VyZmFjZVJlZnMsIHsgZGlzY2FyZFNuYXBzaG90czogdHJ1ZSB9KTtcbiAgICAgICAgZGlzbWlzc0dhdGVCYWNrZHJvcCh7IHN1cHByZXNzUmV0dXJuQW5pbWF0aW9uOiB0cnVlLCBpbnN0YW50OiB0cnVlIH0pO1xuICAgICAgfVxuICAgICAgaWYgKGlzU2FtZVJvdXRlKSB7XG4gICAgICAgIHNldFJvdXRlTGF5ZXJWaXNpYmlsaXR5KHRydWUsIHN1cmZhY2VSZWZzKTtcbiAgICAgICAgc2V0Um91dGVTdGF0ZShuZXh0U3RhdGUpO1xuICAgICAgICBhY3RpdmVSb3V0ZVN0YXRlUmVmLmN1cnJlbnQgPSBuZXh0U3RhdGU7XG4gICAgICAgIGFjdGl2ZVJvdXRlSWRSZWYuY3VycmVudCA9IG5leHRTdGF0ZS5yb3V0ZS5pZDtcbiAgICAgICAgYWN0aXZlUm91dGVDb250ZW50U2lnbmF0dXJlUmVmLmN1cnJlbnQgPSByZWFkUm91dGVDb250ZW50U2lnbmF0dXJlKG5leHRTdGF0ZSk7XG4gICAgICAgIGFjdGl2ZUZvY3VzU2ltdWxhdGlvbklkUmVmLmN1cnJlbnQgPSByZWFkUm91dGVTdGF0ZVNpbXVsYXRpb25Gb2N1c0lkKG5leHRTdGF0ZSk7XG4gICAgICAgIHN5bmNTdGVhZHlUcmFuc2l0aW9uUGhhc2UoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgc2V0U3RhYmxlVGltZW91dCgoKSA9PiB7XG4gICAgICAgIG5hdmlnYXRlKG5leHRIcmVmLCB7IHJlcGxhY2U6IHRydWUgfSk7XG4gICAgICB9LCAwKTtcbiAgICB9O1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIGhhbmRsZVBvcFN0YXRlKTtcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgaGFuZGxlUG9wU3RhdGUpO1xuICAgICAgY29uc3Qgd2FzU2ltdWxhdGlvbkZvY3VzVHJhbnNpdGlvbiA9IEJvb2xlYW4oXG4gICAgICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5kYXRhc2V0LmFic1NpbXVsYXRpb25Gb2N1c1RyYW5zaXRpb25cbiAgICAgICk7XG4gICAgICBpZiAodHJhbnNpdGlvbkFjdGl2ZVJlZi5jdXJyZW50KSB7XG4gICAgICAgICsrdHJhbnNpdGlvblRva2VuO1xuICAgICAgICBxdWV1ZWROYXZpZ2F0aW9uUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgICAgICBhY3RpdmVSb3V0ZVJlYWR5Q2FuY2VsUmVmLmN1cnJlbnQ/LigpO1xuICAgICAgICBhY3RpdmVSb3V0ZVJlYWR5Q2FuY2VsUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgICAgICBmaW5hbGl6ZVRyYW5zaXRpb24oYWN0aXZlR2F0ZVRyYW5zaXRpb25SZWYuY3VycmVudCwgYWN0aXZlUm91dGVJZFJlZi5jdXJyZW50LCBzdXJmYWNlUmVmcyk7XG4gICAgICAgIHRyYW5zaXRpb25BY3RpdmVSZWYuY3VycmVudCA9IGZhbHNlO1xuICAgICAgICBhY3RpdmVHYXRlVHJhbnNpdGlvblJlZi5jdXJyZW50ID0gZmFsc2U7XG4gICAgICAgIHNldFBlbmRpbmdBY3RpdmVSb3V0ZUlkKG51bGwpO1xuICAgICAgICBzeW5jU3RlYWR5VHJhbnNpdGlvblBoYXNlKCk7XG4gICAgICB9XG4gICAgICBpZiAod2FzU2ltdWxhdGlvbkZvY3VzVHJhbnNpdGlvbikge1xuICAgICAgICByZXNldFNpbXVsYXRpb25Gb2N1c1RyYW5zaXRpb24oc3VyZmFjZVJlZnMsIHsgZGlzY2FyZFNuYXBzaG90czogdHJ1ZSB9KTtcbiAgICAgICAgZGlzbWlzc0dhdGVCYWNrZHJvcCh7IHN1cHByZXNzUmV0dXJuQW5pbWF0aW9uOiB0cnVlLCBpbnN0YW50OiB0cnVlIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0sIFtuYXZpZ2F0ZSwgc3VyZmFjZVJlZnMsIHN5bmNTdGVhZHlUcmFuc2l0aW9uUGhhc2VdKTtcblxuICB1c2VMYXlvdXRFZmZlY3QoKCkgPT4ge1xuICAgIGdldFJvdXRlUnVudGltZVJlZi5jdXJyZW50ID0gZ2V0Um91dGVSdW50aW1lO1xuICB9LCBbZ2V0Um91dGVSdW50aW1lXSk7XG5cbiAgdXNlTGF5b3V0RWZmZWN0KCgpID0+IHtcbiAgICBhY3RpdmVSb3V0ZUlkUmVmLmN1cnJlbnQgPSByb3V0ZVN0YXRlLnJvdXRlLmlkO1xuICAgIGFjdGl2ZVJvdXRlQ29udGVudFNpZ25hdHVyZVJlZi5jdXJyZW50ID0gcmVhZFJvdXRlQ29udGVudFNpZ25hdHVyZShyb3V0ZVN0YXRlKTtcbiAgICBhY3RpdmVGb2N1c1NpbXVsYXRpb25JZFJlZi5jdXJyZW50ID0gcmVhZFJvdXRlU3RhdGVTaW11bGF0aW9uRm9jdXNJZChyb3V0ZVN0YXRlKTtcbiAgfSwgW3JvdXRlU3RhdGVdKTtcblxuICB1c2VMYXlvdXRFZmZlY3QoKCkgPT4ge1xuICAgIGlmICghdHJhbnNpdGlvbkFjdGl2ZVJlZi5jdXJyZW50KSB7XG4gICAgICBzeW5jU3RlYWR5VHJhbnNpdGlvblBoYXNlKCk7XG4gICAgfVxuICB9LCBbcm91dGVTdGF0ZS5yb3V0ZS5pZCwgc3luY1N0ZWFkeVRyYW5zaXRpb25QaGFzZV0pO1xuXG4gIHVzZUxheW91dEVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKGdsb2JhbFRoaXMuX19BQlNfUk9VVEVfUEVSRl9BVURJVF9fID09PSB0cnVlKSByZXR1cm47XG4gICAgY29uc3Qgc2ltdWxhdGlvbklkID0gcm91dGVTdGF0ZS5mb2N1c1NpbXVsYXRpb25JZCB8fCByb3V0ZVN0YXRlLmRhaWx5Rm9jdXNSb3V0ZUlkIHx8ICcnO1xuICAgIGNvbnN0IGN1cnJlbnRIcmVmID0gYCR7d2luZG93LmxvY2F0aW9uLnBhdGhuYW1lfSR7d2luZG93LmxvY2F0aW9uLnNlYXJjaH0ke3dpbmRvdy5sb2NhdGlvbi5oYXNofWA7XG4gICAgaWYgKGN1cnJlbnRIcmVmICE9PSByb3V0ZVN0YXRlLmNhbm9uaWNhbEhyZWYpIHtcbiAgICAgIHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZSh3aW5kb3cuaGlzdG9yeS5zdGF0ZSB8fCB7fSwgJycsIHJvdXRlU3RhdGUuY2Fub25pY2FsSHJlZik7XG4gICAgfVxuICAgIGlmICghc2ltdWxhdGlvbklkKSByZXR1cm47XG4gICAgd3JpdGVNYW51YWxTaW11bGF0aW9uRm9jdXMoc2ltdWxhdGlvbklkKTtcbiAgfSwgW3JvdXRlU3RhdGUuY2Fub25pY2FsSHJlZiwgcm91dGVTdGF0ZS5kYWlseUZvY3VzUm91dGVJZCwgcm91dGVTdGF0ZS5mb2N1c1NpbXVsYXRpb25JZF0pO1xuXG4gIGNvbnN0IHJvdXRlVmlldyA9IHVzZU1lbW8oKCkgPT4gZ2V0Um91dGVWaWV3KHJvdXRlU3RhdGUucm91dGUuaWQsIHJvdXRlU3RhdGUuY2Fub25pY2FsSHJlZiwgcm91dGVTdGF0ZSksIFtcbiAgICBnZXRSb3V0ZVZpZXcsXG4gICAgcm91dGVTdGF0ZSxcbiAgXSk7XG4gIGNvbnN0IHJvdXRlUnVudGltZSA9IHVzZU1lbW8oKCkgPT4gZ2V0Um91dGVSdW50aW1lKHJvdXRlU3RhdGUucm91dGUuaWQsIHJvdXRlU3RhdGUuY2Fub25pY2FsSHJlZiwgcm91dGVTdGF0ZSksIFtcbiAgICBnZXRSb3V0ZVJ1bnRpbWUsXG4gICAgcm91dGVTdGF0ZSxcbiAgXSk7XG5cbiAgcmV0dXJuIHtcbiAgICByb3V0ZVN0YXRlLFxuICAgIGFjdGl2ZVJvdXRlSWQ6IHBlbmRpbmdBY3RpdmVSb3V0ZUlkIHx8IHJvdXRlU3RhdGUucm91dGUuaWQsXG4gICAgcm91dGVSdW50aW1lLFxuICAgIHJvdXRlVmlldyxcbiAgICB0cmFuc2l0aW9uQ3VycmVudFJvdXRlLFxuICB9O1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFD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QyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7O0FBRXJDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pGLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUNULENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMs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QUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDYjs7QUFFQSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqRixDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO0FBQ3JCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQU87QUFDcEYsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRTs7QUFFcEUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU87QUFDbEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSTs7QUFFOUYsQ0FBQyxDQUFDLENBQUMsVUFBVTtBQUNiLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEtBQUs7QUFDbkUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQztBQUNuRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMs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QUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUM1QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDUixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLENBQUMsQ0FBQztBQUN4QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMzQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNoRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDUixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUM7O0FBRUYsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUMxQixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUNYLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMxQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUM1QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMvQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDUixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLENBQUMsQ0FBQztBQUN4QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMzQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDUixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUM7O0FBRUYsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUNULENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDMUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUM3QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLHVCQUF1QixDQUFDLENBQUM7QUFDdEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN6QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ04sQ0FBQyxDQUFDLENBQUM7QUFDSDs7QUFFQSxRQUFRLENBQUMseUJBQXlCLENBQUMsT0FBTyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDekQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLDBCQUEwQixDQUFDLE9BQU8sQ0FBQyxDQUFDLFdBQVcsQ0FBQztBQUNqRSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3hCLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1QixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQ2hELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztBQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztBQUN0QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUs7QUFDZDs7QUFFQSxRQUFRLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDO0FBQ2hDLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUN0RyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7QUFDN0csQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMs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Q0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztBQUN6RSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7QUFDdEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoQixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pELENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdCLENBQUMsQ0FBQyxDQUFDLENBQUMs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QUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxQixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3hCLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4RCxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4QixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMvQixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FB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LENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ2xFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQzlFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3ZGLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RELENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNO0FBQ25CLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUN6QyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUN4QyxD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QUMsQ0FBQztBQUN2RSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQ1osQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU87QUFDM0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxZQUFZO0FBQy9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDckQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDakUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxD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QUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUN2RSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3pFLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7QUFDNUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztBQUMxQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO0FBQzlDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7O0FBRWhELENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDM0MsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDbkUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ04sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDeEIsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNyQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQztBQUMxQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0FBQy9DLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDeEcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUNqRCxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUNSLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVM7QUFDdkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVU7QUFDaEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVO0FBQzlDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxVQUFVO0FBQy9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxVQUFVO0FBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7QUFDWixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNO0FBQ2pFLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJOztBQUV2QyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUM7QUFDMUQsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztBQUNoQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSztBQUN0QixDQUFDLENBQUMsTUFBTSxDQUFDO0FBQ1QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRO0FBQ2xCLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUNYLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxNQUFNO0FBQ25ELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUN4QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU07QUFDMUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQ3JCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUM5QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQ2QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMs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QUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3hFOztBQUVBLFFBQVEsQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzVDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0FBQzNGLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM1QixDQUFDLENBQUM7O0FBRUYsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUN0QyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDakIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUM7QUFDeEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDO0FBQ3RDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSjs7QUFFQSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFaEYsUUFBUSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQztBQUNoQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLO0FBQzNCLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdEMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2QyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSztBQUMxQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZELENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5QyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUN0RDs7QUFFQSxRQUFRLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzVCLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNEOztBQUVBLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUN4RCxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSztBQUN4RSxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN6SCxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUMxSCxDQUFDLENBQUMsTUFBTSxDQUFDO0FBQ1QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNELENBQUMsQ0FBQyxDQUFDO0FBQ0g7O0FBRUEsUUFBUSxDQUFDLHlCQUF5QixDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUs7QUFDbEUsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUNULENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMs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QUFDLENBQUM7QUFDL0MsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0FBQ3BELENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQzlFLENBQUMsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO0FBQzVCLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLFFBQVE7QUFDekIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsUUFBUTtBQUM1QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFRO0FBQ2xELENBQUMsQ0FBQyxDQUFDO0FBQ0gsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUNULENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFD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QUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSTtBQUMxQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSTtBQUN2RCxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSztBQUN0QyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQy9FLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLHlCQUF5QixDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztBQUNqRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5RyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLHlCQUF5QixDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMseUJBQXlCLENBQUMsUUFBUSxDQUFDLFVB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O0FBQ3ZFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RGLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztBQUM5QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDO0FBQzdFLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDckQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUs7QUFDbEIsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU87QUFDbEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDO0FBQzlDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1gsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQztBQUMvQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLENBQUMscUJBQXFCLENBQUM7QUFDekQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0FBQ3hELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDUixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQzs7QUFFRixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU87QUFDbEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO0FBQzFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUM5RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUM7O0FBRUYsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUM3QixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPO0FBQ2xCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztBQUM1QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFDaEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDOztBQUVGLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQ2xDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQztBQUN4QyxDQUFDLENBQUM7O0FBRUYsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQ3REOztBQUVBLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDN0QsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2QixDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSztBQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JCLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQy9CLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUN0QixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNuQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFDbkQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUMvQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUs7QUFDcEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUk7QUFDbkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRU4sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsT0FBTyxDQUFDO0FBQ3RELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFDcEgsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUNiLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM3QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxRQUFROztBQUVqQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0FBQ3ZELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUk7QUFDbkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSztBQUNsQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRUwsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTTtBQUN6QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUk7QUFDcEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUM1RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztBQUNwRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUM7QUFDNUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDO0FBQ2xELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUM7QUFDckIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNO0FBQ3hELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLFVBQVU7QUFDM0UsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsTUFBTTtBQUMxRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTTtBQUM1RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUN0QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDdkQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztBQUMvRCxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQzs7QUFFcEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQ1osQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFSixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU07QUFDekIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUNwQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUM5QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQzVDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsTUFBTSxDQUFDO0FBQ1QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPO0FBQ1gsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNO0FBQ2xCLENBQUMsQ0FBQyxDQUFDO0FBQ0g7O0FBRUEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVoRixRQUFRLENBQUMsaUJBQWlCLENBQUM7QUFDM0IsQ0FBQyxDQUFDLE9BQU87QUFDVCxDQUFDLENBQUMsV0FBVztBQUNiLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGlCQUFpQjtBQUM3QixDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxRQUFRO0FBQ3pCLENBQUMsQ0FBQyxVQUFVO0FBQ1osQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1IsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxXQUFXLENBQUM7QUFDbkUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxXQUFXLENBQUM7QUFDbkUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQztBQUMvRCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDO0FBQzVELENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7QUFDMUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUM7O0FBRW5ELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTTtBQUNoRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0FBQzlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDeEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDeEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDZixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQ1osQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFSixDQUFDLENBQUMsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7O0FBRWhDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPO0FBQ2xFLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzVCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQztBQUNoRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUMseUJBQXlCLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQzs7QUFFbEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxLQUFLO0FBQ3RGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7QUFDM0UsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTztBQUNuRixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0QyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0QyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDckQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3JELENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDekQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUN6RCxDQUFDLENBQUMsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLENBQUM7O0FBRTVCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUU7QUFDdEYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNaLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDbEMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQztBQUMzRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU07QUFDMUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxZQUFZOztBQUU5QyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO0FBQzNFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQzs7QUFFdEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU87QUFDdkUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDOztBQUVsSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDdEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztBQUM1QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4RyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0RixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0UsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVmLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUM3QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxPQUFPO0FBQzdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDakIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsWUFBWTtBQUNoQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztBQUM1QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNaLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztBQUNyQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25DLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ3hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNYLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVE7QUFDdkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDZixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxD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QUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLDJCQUEyQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQzFELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0FBQzVCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLElBQUk7QUFDOUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsaUJBQWlCLENBQUMsU0FBUztBQUN4RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVO0FBQ2hELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1osQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsMEJBQTBCLENBQUMsQ0FBQztBQUN4QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUztBQUM1QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ25ELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLDBCQUEwQixDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQztBQUNuRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNULENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0FBQ3hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTO0FBQzVCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLHFDQUFxQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQzFGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNwQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ2xCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQy9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVM7QUFDMUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsMEJBQTBCLENBQUMsQ0FBQztBQUN4QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUztBQUM1QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUN6RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxzQkFBc0I7QUFDaEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDWixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDM0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNWLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFDckMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENB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QUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsTUFBTTtBQUNwRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLElBQUk7QUFDcEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDOUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFUCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO0FBQ3RCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7QUFDM0UsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3JDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDbEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNWLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQzVGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUMzQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNaLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3JDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDbEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNWLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDdEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxPQUFPO0FBQzlFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxDQUFDLFdBQVcsQ0FBQztBQUN2RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDakIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMseUJBQXlCLENBQUMsV0FBVyxDQUFDO0FBQ2xELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ2xCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxtQ0FBbUM7QUFDL0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVc7QUFDekIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQztBQUMzRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNWLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVU7QUFDM0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDckMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUNsQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENB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OUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyw0QkFBNEI7QUFDeEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyx1QkFBdUI7QUFDaEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUNoQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0FBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7QUFDL0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUMxRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDWixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNULENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNyQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQ2xCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDLHFCQUFxQixDQUFDO0FBQ3pELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMs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Q0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNyQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQ2xCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUM7QUFDckQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFDLENBQUMsV0FBVyxDQUFDO0FBQ3ZELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxD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Q0FBQyxJQUFJLENBQUMsQ0FBQztBQUNuRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQywwQkFBMEIsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUM7QUFDbkUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVM7QUFDdkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7QUFDdEYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDMUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSztBQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUNkLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUN0QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7QUFDbEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTO0FBQzdFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNULENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUztBQUN2QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLElBQUksQ0FBQyxDQUFDLFdBQVcsQ0FBQztBQUN4RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLHFDQUFxQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDaEcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsY0FBYztBQUNuQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNaLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsaUNBQWlDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNqRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQywyQkFBMkIsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUMxRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLO0FBQy9DLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLFVBQVU7QUFDekQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsaUJBQWlCLENBQUMsV0FBVztBQUNqRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNaLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FB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