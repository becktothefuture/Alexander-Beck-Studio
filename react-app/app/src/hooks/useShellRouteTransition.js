import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { hasGateAccess, requestGateOpen } from '../lib/access-gates.js';
import { buildRouteHref, getRouteById, resolveRouteFromHref, resolveRouteFromPathname } from '../lib/routes.js';
import { installSpaNavigationBridge } from '../lib/spa-navigation.js';
import { setStableTimeout } from '../lib/legacy-runtime-scope.js';

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
   Fades the inner content (simulation + UI) while the wall frame stays visible,
   swaps the route while invisible, then staggers the new content in.

   The wall (#simulations border/background) never changes opacity.
   Only #shell-wall-slot (canvas) and .fade-content (UI layer) fade.

   Invariants:
   - Every async step checks `stale()` before mutating DOM or state.
   - `finalizeTransition()` is the single cleanup path (idempotent).
   - All navigation is blocked while a transition is active.
   ═══════════════════════════════════════════════════════════════════════════════ */

const FADE_OUT_MS = 250;
const STAGGER_OFFSET_MS = 90;
const ELEMENT_REVEAL_MS = 350;
const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
const READY_FALLBACK_MS = 2500;

let transitionToken = 0;
let activeAnimations = [];

/* ── content layer references ────────────────────────────────────────────── */

function getContentLayers() {
  return {
    wall: document.getElementById('shell-wall-slot'),
    ui: document.querySelector('.fade-content'),
  };
}

/* ── backdrop cleanup (with direct-DOM fallback) ─────────────────────────── */

function forceBackdropDismiss() {
  try {
    document.documentElement.classList.remove('modal-active');
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

function dismissGateBackdrop() {
  import('../legacy/modules/ui/gate-modal-shared.js')
    .then((m) => m.dismissGateBackdrop())
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

function commitStaggerStyles() {
  collectStaggerTargets().forEach(({ el }) => {
    el.style.opacity = '1';
    el.style.transform = '';
    el.style.filter = '';
    el.style.willChange = 'auto';
  });
}

/* ── single cleanup path (idempotent, always safe to call) ───────────────── */

function finalizeTransition(isGate) {
  cancelActiveAnimations();
  commitStaggerStyles();
  if (isGate) dismissGateBackdrop();
  delete document.documentElement.dataset.absGateTransition;

  // Restore content layers.
  const { wall, ui } = getContentLayers();
  if (wall) { wall.style.opacity = '1'; wall.style.willChange = 'auto'; }
  if (ui) { ui.style.opacity = '1'; ui.style.willChange = 'auto'; }
}

/* ── fade out content layers (wall stays visible) ─────────────────────────── */

function fadeOutContent(durationMs) {
  const { wall, ui } = getContentLayers();
  const anims = [];

  [wall, ui].forEach((el) => {
    if (!el) return;
    if (typeof el.animate !== 'function') {
      el.style.opacity = '0';
      return;
    }
    const anim = el.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: durationMs, easing: 'ease-out', fill: 'forwards' }
    );
    activeAnimations.push(anim);
    anims.push(anim);
  });

  if (anims.length === 0) return Promise.resolve();

  return Promise.all(
    anims.map((a) => new Promise((r) => { a.onfinish = r; a.oncancel = r; }))
  );
}

/* ── route ready ──────────────────────────────────────────────────────────── */

function waitForRouteReady(routeId, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      window.removeEventListener('abs:route-ready', onReady);
      resolve();
    };
    const onReady = (e) => {
      if ((e?.detail?.routeId || '') === routeId) settle();
    };
    window.addEventListener('abs:route-ready', onReady);
    setStableTimeout(settle, timeoutMs);
  });
}

/* ── stagger targets ──────────────────────────────────────────────────────── */

function collectStaggerTargets() {
  const targets = [];
  const add = (el, opts) => { if (el) targets.push({ el, ...opts }); };

  // Simulation canvas (inside the wall — the wall frame itself stays visible)
  add(document.getElementById('shell-wall-slot'), { slide: false });
  // Header bar
  add(document.querySelector('#shell-route-slot .ui-top'), { slide: true });
  // Home: central logo
  add(document.getElementById('brand-logo'), { slide: true });
  // Home: nav buttons
  add(document.getElementById('main-links'), { slide: true });
  // Footer
  add(document.querySelector('.ui-bottom'), { slide: true });
  // Edge caption
  add(document.getElementById('edge-caption'), { slide: false });

  return targets;
}

/* ── staggered entrance ───────────────────────────────────────────────────── */

function staggeredEntrance() {
  return new Promise((resolve) => {
    const targets = collectStaggerTargets();
    const { wall, ui } = getContentLayers();

    // Safety: if DOM is unexpectedly empty, just restore layers.
    if (targets.length === 0) {
      cancelActiveAnimations();
      if (wall) wall.style.opacity = '1';
      if (ui) ui.style.opacity = '1';
      resolve();
      return;
    }

    // Hide every target before making the UI layer visible.
    targets.forEach(({ el }) => {
      el.style.opacity = '0';
      el.style.willChange = 'opacity, transform';
    });

    // Pin content layers to opacity 0 via inline style BEFORE cancelling WAAPI.
    // This prevents a single-frame flash where the WAAPI fill:forwards is removed
    // and the element reverts to CSS opacity 1 before the new inline value applies.
    if (wall) wall.style.opacity = '0';
    if (ui) ui.style.opacity = '0';
    cancelActiveAnimations();

    // Now restore the .fade-content container (transparent — children are hidden individually).
    if (ui) {
      ui.style.opacity = '1';
      ui.style.willChange = 'auto';
    }
    // Force reflow so children start at opacity 0 before WAAPI begins.
    void ui?.offsetHeight;

    const hasWaapi = typeof document.documentElement.animate === 'function';

    targets.forEach(({ el, slide }, i) => {
      const delay = i * STAGGER_OFFSET_MS;

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
          duration: ELEMENT_REVEAL_MS,
          delay,
          easing: EASE_OUT,
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
          el.style.transition = `opacity ${ELEMENT_REVEAL_MS}ms ${EASE_OUT}, transform ${ELEMENT_REVEAL_MS}ms ${EASE_OUT}, filter ${ELEMENT_REVEAL_MS}ms ${EASE_OUT}`;
          el.style.opacity = '1';
          el.style.transform = '';
          el.style.filter = '';
          setStableTimeout(() => {
            el.style.transition = '';
            el.style.willChange = 'auto';
          }, ELEMENT_REVEAL_MS + 50);
        }, delay);
      }
    });

    const total = (targets.length - 1) * STAGGER_OFFSET_MS + ELEMENT_REVEAL_MS;
    setStableTimeout(resolve, total + 50);
  });
}

/* ═══════════════════════════════════════════════════════════════════════════════
   HOOK
   ═══════════════════════════════════════════════════════════════════════════════ */

export function useShellRouteTransition({ getRouteView, getRouteRuntime }) {
  const [routeState, setRouteState] = useState(() => computeRouteState(window.location.href));
  const transitionActiveRef = useRef(false);

  const navigate = useCallback((href, options = {}) => {
    if (transitionActiveRef.current) return false;

    const route = resolveRouteFromHref(href, window.location.href);
    if (!route) return false;

    const targetUrl = new URL(href, window.location.href);
    const nextState = computeRouteState(targetUrl.toString());
    const isSameRoute = nextState.route.id === routeState.route.id;
    const method = options.replace ? 'replaceState' : 'pushState';
    const commit = () => {
      window.history[method](options.state || {}, '', nextState.canonicalHref);
      setRouteState(nextState);
    };

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    const nextRouteRuntime = getRouteRuntime(nextState.route.id);
    const isGate = options.transitionStyle === 'gate-success';
    const readyMs = options.readyFallbackMs ?? READY_FALLBACK_MS;

    /* ── smooth transition (gate-success OR any SPA route change) ────────── */
    if (!isSameRoute && !reduceMotion) {
      transitionActiveRef.current = true;
      if (isGate) document.documentElement.dataset.absGateTransition = 'active';

      const token = ++transitionToken;
      const stale = () => token !== transitionToken;

      Promise.resolve()
        .then(() => nextRouteRuntime?.loadModule?.()).catch(() => undefined)
        .then(() => { if (!stale()) return fadeOutContent(FADE_OUT_MS); })
        .then(() => {
          if (stale()) return;
          commit();
          return waitForRouteReady(nextState.route.id, readyMs);
        })
        .then(() => {
          if (stale()) return;
          if (isGate) dismissGateBackdrop();
          return staggeredEntrance();
        })
        .then(() => {
          if (stale()) return;
          delete document.documentElement.dataset.absGateTransition;
          activeAnimations = [];
          transitionActiveRef.current = false;
        })
        .catch(() => {
          finalizeTransition(isGate);
          transitionActiveRef.current = false;
        });

      return true;
    }

    /* ── reduced motion or same-route: instant with cleanup ──────────────── */
    if (isGate) {
      transitionActiveRef.current = true;
      document.documentElement.dataset.absGateTransition = 'active';

      Promise.resolve()
        .then(() => nextRouteRuntime?.loadModule?.()).catch(() => undefined)
        .then(() => {
          if (!isSameRoute) commit();
          return waitForRouteReady(nextState.route.id, readyMs);
        })
        .then(() => {
          finalizeTransition(true);
          transitionActiveRef.current = false;
        })
        .catch(() => {
          finalizeTransition(true);
          transitionActiveRef.current = false;
        });

      return true;
    }

    /* ── same-route or reduced-motion non-gate: instant commit ────────────── */
    commit();
    return true;
  }, [getRouteRuntime, routeState.route.id]);

  useEffect(() => installSpaNavigationBridge(navigate), [navigate]);

  useEffect(() => {
    const handlePopState = () => {
      ++transitionToken;
      finalizeTransition(true);
      transitionActiveRef.current = false;
      setRouteState(computeRouteState(window.location.href));
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (transitionActiveRef.current) {
        ++transitionToken;
        finalizeTransition(true);
        transitionActiveRef.current = false;
      }
    };
  }, []);

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
