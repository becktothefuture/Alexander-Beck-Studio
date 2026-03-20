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
   GATE-SUCCESS TRANSITION — whole-scene approach
   Fade the entire scene out as one unit, swap the route while invisible,
   wait for the new route to be ready, then stagger-reveal its elements.
   ═══════════════════════════════════════════════════════════════════════════════ */

const FADE_OUT_MS = 400;
const STAGGER_OFFSET_MS = 140;
const ELEMENT_REVEAL_MS = 500;
const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
const READY_FALLBACK_MS = 2500;

function fadeOutScene(scene) {
  if (!scene) return Promise.resolve(null);
  if (typeof scene.animate !== 'function') {
    scene.style.opacity = '0';
    return Promise.resolve(null);
  }
  const anim = scene.animate(
    [{ opacity: 1 }, { opacity: 0 }],
    { duration: FADE_OUT_MS, easing: 'ease-out', fill: 'forwards' }
  );
  return new Promise((resolve) => {
    anim.onfinish = () => resolve(anim);
    anim.oncancel = () => resolve(anim);
  });
}

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

function dismissGateBackdrop() {
  import('../legacy/modules/ui/gate-modal-shared.js')
    .then((m) => m.dismissGateBackdrop())
    .catch(() => {});
}

function collectStaggerTargets() {
  const targets = [];
  const add = (el, opts) => { if (el) targets.push({ el, ...opts }); };

  add(document.getElementById('shell-wall-slot'), { slide: false });
  add(document.querySelector('#shell-route-slot .ui-top'), { slide: true });
  add(document.getElementById('brand-logo'), { slide: true });
  add(document.getElementById('main-links'), { slide: true });
  add(document.querySelector('.ui-bottom'), { slide: true });
  add(document.getElementById('edge-caption'), { slide: false });

  return targets;
}

function staggeredEntrance(scene, fadeOutAnim) {
  return new Promise((resolve) => {
    const targets = collectStaggerTargets();

    targets.forEach(({ el }) => {
      el.style.opacity = '0';
      el.style.willChange = 'opacity, transform';
    });

    if (fadeOutAnim) {
      try { fadeOutAnim.cancel(); } catch {}
    }
    scene.style.opacity = '1';
    scene.style.visibility = 'visible';
    scene.style.willChange = 'auto';
    scene.offsetHeight; // eslint-disable-line no-unused-expressions

    targets.forEach(({ el, slide }, i) => {
      const delay = i * STAGGER_OFFSET_MS;
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

      anim.onfinish = () => {
        el.style.opacity = '1';
        el.style.transform = '';
        el.style.filter = '';
        el.style.willChange = 'auto';
      };
      anim.oncancel = anim.onfinish;
    });

    const total = targets.length * STAGGER_OFFSET_MS + ELEMENT_REVEAL_MS;
    setStableTimeout(resolve, total);
  });
}

/* ═══════════════════════════════════════════════════════════════════════════════
   HOOK
   ═══════════════════════════════════════════════════════════════════════════════ */

export function useShellRouteTransition({ getRouteView, getRouteRuntime }) {
  const [routeState, setRouteState] = useState(() => computeRouteState(window.location.href));
  const gateActiveRef = useRef(false);

  const navigate = useCallback((href, options = {}) => {
    const route = resolveRouteFromHref(href, window.location.href);
    if (!route) return false;

    const targetUrl = new URL(href, window.location.href);
    const nextState = computeRouteState(targetUrl.toString());
    const method = options.replace ? 'replaceState' : 'pushState';
    const commit = () => {
      window.history[method](options.state || {}, '', nextState.canonicalHref);
      setRouteState(nextState);
    };

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    const nextRouteRuntime = getRouteRuntime(nextState.route.id);

    /* ── gate-success: whole-scene fade ──────────────────────────────────── */
    if (options.transitionStyle === 'gate-success' && !reduceMotion) {
      if (gateActiveRef.current) return false;
      gateActiveRef.current = true;
      document.documentElement.dataset.absGateTransition = 'active';

      const scene = document.getElementById('abs-scene');
      const readyMs = options.readyFallbackMs ?? READY_FALLBACK_MS;
      let fadeOutAnim = null;

      Promise.resolve()
        .then(() => nextRouteRuntime?.loadModule?.())
        .catch(() => undefined)
        .then(() => fadeOutScene(scene))
        .then((anim) => { fadeOutAnim = anim; })
        .then(() => {
          commit();
          return waitForRouteReady(nextState.route.id, readyMs);
        })
        .then(() => {
          dismissGateBackdrop();
          return staggeredEntrance(scene, fadeOutAnim);
        })
        .then(() => {
          delete document.documentElement.dataset.absGateTransition;
          gateActiveRef.current = false;
        })
        .catch(() => {
          if (scene) {
            scene.style.opacity = '1';
            scene.style.visibility = 'visible';
          }
          dismissGateBackdrop();
          delete document.documentElement.dataset.absGateTransition;
          gateActiveRef.current = false;
        });

      return true;
    }

    /* ── normal navigation (View Transitions / instant) ──────────────────── */
    if (typeof document.startViewTransition === 'function' && !reduceMotion) {
      document.startViewTransition(commit);
    } else {
      commit();
    }
    return true;
  }, [getRouteRuntime]);

  useEffect(() => installSpaNavigationBridge(navigate), [navigate]);

  useEffect(() => {
    const handlePopState = () => {
      delete document.documentElement.dataset.absGateTransition;
      gateActiveRef.current = false;
      setRouteState(computeRouteState(window.location.href));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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
