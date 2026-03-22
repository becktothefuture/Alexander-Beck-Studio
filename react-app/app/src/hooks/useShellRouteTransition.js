import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { hasGateAccess, requestGateOpen } from '../lib/access-gates.js';
import { buildRouteHref, getRouteById, resolveRouteFromHref, resolveRouteFromPathname } from '../lib/routes.js';
import { installSpaNavigationBridge } from '../lib/spa-navigation.js';
import { clearStableTimeout, setStableTimeout } from '../lib/legacy-runtime-scope.js';

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
const READY_FALLBACK_MS = 1200;

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

function getContentLayers() {
  return {
    wall: document.getElementById('shell-wall-slot'),
    hero: document.getElementById('shell-hero-slot'),
    ui: document.querySelector('.fade-content'),
  };
}

function setRouteLayerVisibility(visible) {
  const { wall, hero, ui } = getContentLayers();
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

/* ── backdrop cleanup (with direct-DOM fallback) ─────────────────────────── */

function forceBackdropDismiss() {
  try {
    document.documentElement.classList.remove('modal-active');
    document.documentElement.classList.remove('modal-returning');
    const blur = document.getElementById('modal-blur-layer');
    const content = document.getElementById('modal-content-layer');
    if (blur) blur.classList.remove('active');
    if (content) content.classList.remove('active');
    const scene = document.getElementById('abs-scene');
    if (scene) scene.classList.remove('gate-depth-active');
    document.querySelectorAll('main.ui-center, main.ui-center-spacer').forEach((el) => {
      el.classList.remove('center-stage--modal-hidden');
    });
    const cv = document.querySelector('.cv-scroll-container');
    if (cv) cv.classList.remove('fade-out-up');
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

function commitStaggerStyles() {
  collectStaggerTargets().forEach(({ el }) => {
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
  {
    suppressReturnAnimation = false,
    gateBackdropDismissed = false,
  } = {}
) {
  cancelActiveAnimations();
  commitStaggerStyles();
  setRouteLayerVisibility(true);
  if (isGate && !gateBackdropDismissed) {
    dismissGateBackdrop({ suppressReturnAnimation });
  }
  delete document.documentElement.dataset.absGateTransition;
  delete document.documentElement.dataset.absRouteTransition;

  // Restore content layers.
  const { wall, hero, ui } = getContentLayers();
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

function interruptTransitionForPopstate(isGate) {
  cancelActiveAnimations();
  commitStaggerStyles();
  if (isGate) {
    dismissGateBackdrop({ suppressReturnAnimation: true });
  }
  delete document.documentElement.dataset.absGateTransition;
  delete document.documentElement.dataset.absRouteTransition;
  setRouteLayerVisibility(false);

  const { wall, hero, ui } = getContentLayers();
  if (wall) wall.style.willChange = 'auto';
  if (hero) hero.style.willChange = 'auto';
  if (ui) ui.style.willChange = 'auto';
}

/* ── fade out content layers (wall stays visible) ─────────────────────────── */

function fadeOutContent(durationMs, easing = EASE_OUT) {
  const { wall, hero, ui } = getContentLayers();
  const anims = [];

  [wall, hero, ui].forEach((el) => {
    if (!el) return;
    if (typeof el.animate !== 'function') {
      el.style.opacity = '0';
      return;
    }
    const anim = el.animate(
      [{ opacity: 1 }, { opacity: 0 }],
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

function isRouteBaselineReady(routeId) {
  const body = document.body;
  if (!body) return false;

  if (routeId === 'home') {
    const isHomeRoute = !body.classList.contains('portfolio-page') && !body.classList.contains('cv-page');
    const hero = document.getElementById('hero-title');
    const navButtons = document.querySelectorAll('#main-links .footer_link');
    return Boolean(isHomeRoute && hero && navButtons.length >= 3 && hasCanvasBufferReady());
  }

  if (routeId === 'portfolio') {
    return Boolean(
      body.classList.contains('portfolio-page')
      && document.getElementById('portfolioProjectMount')
      && document.querySelector('.ui-top-main.route-topbar')
      && hasCanvasBufferReady()
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
    const POLL_MS = 16;
    settle = () => {
      if (settled) return;
      settled = true;
      window.removeEventListener('abs:route-ready', onReady);
      if (pollId) clearStableTimeout(pollId);
      if (timeoutId) clearStableTimeout(timeoutId);
      resolve();
    };
    const onReady = (e) => {
      if ((e?.detail?.routeId || '') === routeId) settle();
    };
    window.addEventListener('abs:route-ready', onReady);
    timeoutId = setStableTimeout(settle, timeoutMs);

    if (isRouteBaselineReady(routeId)) {
      settle();
      return;
    }

    const tick = () => {
      if (settled) return;
      if (isRouteBaselineReady(routeId)) {
        settle();
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

/* ── stagger targets ──────────────────────────────────────────────────────── */

function collectStaggerTargets() {
  const targets = [];
  const add = (el, opts) => { if (el) targets.push({ el, ...opts }); };

  // Simulation canvas (inside the wall — the wall frame itself stays visible)
  add(document.getElementById('shell-wall-slot'), { slide: false });
  // Header bar
  add(document.querySelector('#shell-route-slot .ui-top'), { slide: true });
  // Central hero title slot (animate as one surface to avoid phased line pops)
  add(document.getElementById('shell-hero-slot'), { slide: true });
  // Nav pills. Animate the individual links so route-row layout transforms are
  // never clobbered.
  document.querySelectorAll('.ui-main-nav .footer_link').forEach((el) => {
    add(el, { slide: true });
  });
  // Footer
  add(document.querySelector('.ui-bottom'), { slide: true });
  // Edge caption
  add(document.getElementById('edge-caption'), { slide: false });

  return targets;
}

/* ── staggered entrance ───────────────────────────────────────────────────── */

function staggeredEntrance({
  enterMs = ELEMENT_REVEAL_MS,
  staggerMs = STAGGER_OFFSET_MS,
  revealEasing = EASE_OUT,
  onPrepared,
} = {}) {
  return new Promise((resolve) => {
    const targets = collectStaggerTargets();
    const { wall, hero, ui } = getContentLayers();
    const isRouteTransition = document.documentElement.dataset.absRouteTransition === 'active';

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

    targets.forEach(({ el, slide }, i) => {
      const delay = isRouteTransition ? 0 : i * staggerMs;

      if (hasWaapi) {
        const keyframes = slide
          ? [
              { opacity: 0, transform: 'translateY(10px)', filter: 'blur(4px)' },
              { opacity: 1, transform: 'translateY(0)',    filter: 'blur(0)' },
            ]
          : [
              { opacity: 0, filter: 'blur(4px)' },
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

    const total = (isRouteTransition ? 0 : (targets.length - 1) * staggerMs) + enterMs;
    setStableTimeout(resolve, total + 50);
  });
}

/* ═══════════════════════════════════════════════════════════════════════════════
   HOOK
   ═══════════════════════════════════════════════════════════════════════════════ */

export function useShellRouteTransition({ getRouteView, getRouteRuntime }) {
  const [routeState, setRouteState] = useState(() => computeRouteState(window.location.href));
  const transitionActiveRef = useRef(false);
  const queuedNavigationRef = useRef(null);
  const activeRouteIdRef = useRef(routeState.route.id);
  const activeGateTransitionRef = useRef(false);
  const activeRouteReadyCancelRef = useRef(null);

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
      ?? (isGate ? READY_FALLBACK_MS : (nextRouteId === 'home' ? 700 : 900));
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
      finalizeTransition(isGateTransition, {
        suppressReturnAnimation: isGateTransition,
        gateBackdropDismissed,
      });
      processQueuedNavigation();
    };

    /* ── smooth transition (gate-success OR any SPA route change) ────────── */
    if (!isSameRoute && !reduceMotion) {
      transitionActiveRef.current = true;
      activeGateTransitionRef.current = isGate;
      document.documentElement.dataset.absRouteTransition = 'active';
      if (isGate) document.documentElement.dataset.absGateTransition = 'active';

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
          return fadeOutContent(routeTimings.fadeOut, routeTimings.fadeEasing);
        })
        .then(() => {
          if (stale()) {
            routeReadyWaiter.cancel();
            return;
          }
          commit();
          setRouteLayerVisibility(false);
          return routeReady;
        })
        .then(() => {
          if (stale()) {
            routeReadyWaiter.cancel();
            return;
          }
          setRouteLayerVisibility(true);
          return staggeredEntrance({
            enterMs: routeTimings.reveal,
            staggerMs: routeTimings.stagger,
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
      document.documentElement.dataset.absRouteTransition = 'active';
      document.documentElement.dataset.absGateTransition = 'active';
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
            commit();
            setRouteLayerVisibility(false);
          }
          return routeReady;
        })
        .then(() => {
          if (stale()) {
            routeReadyWaiter.cancel();
            return;
          }
          setRouteLayerVisibility(true);
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
    return true;
  }, [getRouteRuntime]);

  useEffect(() => installSpaNavigationBridge(navigate), [navigate]);

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
        interruptTransitionForPopstate(wasGateTransition);
      }
      activeRouteReadyCancelRef.current?.();
      activeRouteReadyCancelRef.current = null;
      transitionActiveRef.current = false;
      activeGateTransitionRef.current = false;
      if (isSameRoute) {
        setRouteLayerVisibility(true);
        setRouteState(nextState);
        activeRouteIdRef.current = nextState.route.id;
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
        finalizeTransition(activeGateTransitionRef.current);
        transitionActiveRef.current = false;
        activeGateTransitionRef.current = false;
      }
    };
  }, []);

  useLayoutEffect(() => {
    activeRouteIdRef.current = routeState.route.id;
  }, [routeState.route.id]);

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
