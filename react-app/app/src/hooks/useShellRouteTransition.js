import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { hasGateAccess, requestGateOpen } from '../lib/access-gates.js';
import { buildRouteHref, getRouteById, resolveRouteFromHref, resolveRouteFromPathname } from '../lib/routes.js';
import { installSpaNavigationBridge } from '../lib/spa-navigation.js';
import { clearStableTimeout, setStableTimeout } from '../lib/legacy-runtime-scope.js';
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

function computeRouteState(href) {
  const url = new URL(href, window.location.href);
  const requestedRoute = resolveRouteFromPathname(url.pathname);

  if (requestedRoute.gated && !hasGateAccess(requestedRoute.id)) {
    const homeHref = buildRouteHref('home', {
      searchParams: { gate: requestedRoute.id },
    });
    return {
      route: getRouteById('home'),
      requestedRouteId: requestedRoute.id,
      canonicalHref: homeHref,
      redirectGateId: requestedRoute.id,
    };
  }

  return {
    route: requestedRoute,
    requestedRouteId: requestedRoute.id,
    canonicalHref: `${url.pathname}${url.search}${url.hash}`,
    redirectGateId: null,
  };
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

function rectContains(innerRect, outerRect, tolerancePx = 2) {
  if (!isRectUsable(innerRect) || !isRectUsable(outerRect)) return false;
  return (
    innerRect.left >= outerRect.left - tolerancePx
    && innerRect.right <= outerRect.right + tolerancePx
    && innerRect.top >= outerRect.top - tolerancePx
    && innerRect.bottom <= outerRect.bottom + tolerancePx
  );
}

function isCenteredWithin(innerRect, outerRect, tolerancePx = 12) {
  if (!isRectUsable(innerRect) || !isRectUsable(outerRect)) return false;
  const innerMidY = innerRect.top + (innerRect.height / 2);
  const outerMidY = outerRect.top + (outerRect.height / 2);
  return Math.abs(innerMidY - outerMidY) <= tolerancePx;
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

function isHeroSettledInsideWall() {
  const wall = document.getElementById('simulations');
  const hero = document.getElementById('hero-title');
  if (!wall || !hero) return false;
  const wallRect = wall.getBoundingClientRect();
  const heroRect = hero.getBoundingClientRect();
  return (
    rectContains(heroRect, wallRect, 4)
    && isCenteredWithin(heroRect, wallRect, Math.max(12, wallRect.height * 0.05))
  );
}

function readRouteReadySnapshot(routeId) {
  if (routeId === 'portfolio') {
    return {
      wallRect: document.getElementById('simulations')?.getBoundingClientRect() || null,
      heroRect: document.getElementById('hero-title')?.getBoundingClientRect() || null,
      topbarRect: document.querySelector('.ui-top-main.route-topbar')?.getBoundingClientRect() || null,
    };
  }

  return null;
}

function isRouteReadySnapshotStable(routeId, previous, next) {
  if (routeId !== 'portfolio') return true;
  if (!previous || !next) return false;
  return (
    rectsMatchWithinThreshold(previous.wallRect, next.wallRect, 2)
    && rectsMatchWithinThreshold(previous.heroRect, next.heroRect, 2)
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
    return Boolean(
      isHomeRoute
      && hero
      && navButtons.length >= 3
    );
  }

  if (routeId === 'portfolio') {
    return Boolean(
      body.classList.contains('portfolio-page')
      && document.getElementById('portfolioProjectMount')
      && document.querySelector('.ui-top-main.route-topbar')
      && hasCanvasBufferReady()
      && isHeroSettledInsideWall()
    );
  }

  if (routeId === 'cv') {
    return Boolean(
      body.classList.contains('cv-page')
      && document.querySelector('.ui-top-main.route-topbar')
      && document.querySelector('.cv-scroll-container')
    );
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
  const activeGateTransitionRef = useRef(false);
  const activeRouteReadyCancelRef = useRef(null);
  const syncSteadyTransitionPhase = useCallback(() => {
    syncTransitionPhaseFromDom(document.documentElement);
  }, []);

  const navigate = useCallback((href, options = {}) => {
    const route = resolveRouteFromHref(href, window.location.href);
    if (!route) return false;

    const targetUrl = new URL(href, window.location.href);
    const nextState = computeRouteState(targetUrl.toString());
    const nextRouteId = nextState.route.id;
    const isSameRoute = nextRouteId === activeRouteIdRef.current;
    const method = options.replace ? 'replaceState' : 'pushState';
    const commit = () => {
      window.history[method](options.state || {}, '', nextState.canonicalHref);
      setRouteState(nextState);
      activeRouteIdRef.current = nextRouteId;
    };

    if (transitionActiveRef.current) {
      if (!isSameRoute) {
        queuedNavigationRef.current = {
          href: targetUrl.toString(),
          options,
          routeId: nextRouteId,
        };
      }
      return true;
    }

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    const nextRouteRuntime = getRouteRuntime(nextRouteId);
    const isGate = options.transitionStyle === 'gate-success';
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
      if (queued.routeId === activeRouteIdRef.current) {
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
      syncSteadyTransitionPhase();
      processQueuedNavigation();
    };

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
  }, [getRouteRuntime, surfaceRefs, syncSteadyTransitionPhase]);

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
        transitionActiveRef.current = false;
        activeGateTransitionRef.current = false;
        syncSteadyTransitionPhase();
      }
    };
  }, [navigate, surfaceRefs, syncSteadyTransitionPhase]);

  useLayoutEffect(() => {
    activeRouteIdRef.current = routeState.route.id;
  }, [routeState.route.id]);

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

  const routeView = useMemo(() => getRouteView(routeState.route.id), [getRouteView, routeState.route.id]);
  const routeRuntime = useMemo(() => getRouteRuntime(routeState.route.id), [getRouteRuntime, routeState.route.id]);

  return { routeState, routeRuntime, routeView };
}
