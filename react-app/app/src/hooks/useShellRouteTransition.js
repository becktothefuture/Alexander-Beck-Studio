import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { hasGateAccess, requestGateOpen } from '../lib/access-gates.js';
import { buildRouteHref, getRouteById, resolveRouteFromHref, resolveRouteFromPathname } from '../lib/routes.js';
import { installSpaNavigationBridge } from '../lib/spa-navigation.js';
import { clearStableTimeout, setStableTimeout } from '../lib/legacy-runtime-scope.js';

function computeRouteState(href) {
  const url = new URL(href, window.location.href);
  const requestedRoute = resolveRouteFromPathname(url.pathname);

  if (requestedRoute.gated && !hasGateAccess(requestedRoute.id)) {
    const homeHref = buildRouteHref('home', {
      searchParams: {
        gate: requestedRoute.id,
      },
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

function captureRouteGhost() {
  const host = document.getElementById('shell-route-ghost');
  const source = document.querySelector('#shell-route-slot > .shell-route-content-root');
  if (!host || !source) return;

  host.innerHTML = '';
  const clone = source.cloneNode(true);
  if (clone instanceof HTMLElement) {
    clone.querySelectorAll('[id]').forEach((node) => {
      node.removeAttribute('id');
    });
    clone.removeAttribute('id');
    clone.setAttribute('aria-hidden', 'true');
    clone.classList.add('shell-route-ghost-copy');
  }
  host.appendChild(clone);
}

function clearRouteGhost() {
  const host = document.getElementById('shell-route-ghost');
  if (host) {
    host.innerHTML = '';
  }
}

function getTransitionClassName(style, phase) {
  if (style !== 'gate-success' || phase === 'idle') {
    return '';
  }

  return `abs-gate-transition-${phase}`;
}

export function useShellRouteTransition({ getRouteView, getRouteRuntime }) {
  const [routeState, setRouteState] = useState(() => computeRouteState(window.location.href));
  const [transitionPhase, setTransitionPhase] = useState('idle');
  const [transitionStyle, setTransitionStyle] = useState('');
  const enterClearTimerRef = useRef(null);
  const readyFallbackTimerRef = useRef(null);
  const pendingReadyRouteIdRef = useRef('');

  const clearTransitionTimers = useCallback(() => {
    if (enterClearTimerRef.current) {
      clearStableTimeout(enterClearTimerRef.current);
      enterClearTimerRef.current = null;
    }
    if (readyFallbackTimerRef.current) {
      clearStableTimeout(readyFallbackTimerRef.current);
      readyFallbackTimerRef.current = null;
    }
  }, []);

  const finishGateTransition = useCallback((enterMs = 320) => {
    clearTransitionTimers();
    setTransitionPhase('enter');
    enterClearTimerRef.current = setStableTimeout(() => {
      clearRouteGhost();
      setTransitionPhase('idle');
      setTransitionStyle('');
      enterClearTimerRef.current = null;
    }, enterMs);
  }, [clearTransitionTimers]);

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

    if (options.transitionStyle === 'gate-success' && !reduceMotion) {
      setTransitionStyle('gate-success');

      return Promise.resolve()
        .then(() => nextRouteRuntime?.loadModule?.())
        .catch(() => undefined)
        .then(() => new Promise((resolve) => {
          setTransitionPhase('exit');
          setStableTimeout(resolve, options.exitMs ?? 180);
        }))
        .then(() => {
          captureRouteGhost();
          pendingReadyRouteIdRef.current = nextState.route.id;
          setTransitionPhase('pre-enter');
          commit();

          readyFallbackTimerRef.current = setStableTimeout(() => {
            if (pendingReadyRouteIdRef.current === nextState.route.id) {
              pendingReadyRouteIdRef.current = '';
              finishGateTransition(options.enterMs ?? 320);
            }
          }, options.readyFallbackMs ?? 650);

          return true;
        });
    }

    if (typeof document.startViewTransition === 'function' && !reduceMotion) {
      document.startViewTransition(commit);
    } else {
      commit();
    }

    return true;
  }, [finishGateTransition, getRouteRuntime]);

  useEffect(() => installSpaNavigationBridge(navigate), [navigate]);

  useEffect(() => {
    const handlePopState = () => {
      pendingReadyRouteIdRef.current = '';
      clearTransitionTimers();
      clearRouteGhost();
      setTransitionPhase('idle');
      setTransitionStyle('');
      setRouteState(computeRouteState(window.location.href));
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [clearTransitionTimers]);

  useEffect(() => {
    const handleRouteReady = (event) => {
      const routeId = event?.detail?.routeId || '';
      if (!routeId || pendingReadyRouteIdRef.current !== routeId) return;
      pendingReadyRouteIdRef.current = '';
      finishGateTransition(320);
    };

    window.addEventListener('abs:route-ready', handleRouteReady);
    return () => {
      window.removeEventListener('abs:route-ready', handleRouteReady);
    };
  }, [finishGateTransition]);

  useLayoutEffect(() => {
    const gateId = routeState.redirectGateId || '';
    if (!gateId) return;

    requestGateOpen(gateId);
    window.history.replaceState({}, '', routeState.canonicalHref);
  }, [routeState.canonicalHref, routeState.redirectGateId]);

  const routeView = useMemo(() => getRouteView(routeState.route.id), [getRouteView, routeState.route.id]);
  const routeRuntime = useMemo(() => getRouteRuntime(routeState.route.id), [getRouteRuntime, routeState.route.id]);
  const transitionClassName = useMemo(
    () => getTransitionClassName(transitionStyle, transitionPhase),
    [transitionPhase, transitionStyle]
  );

  return {
    routeState,
    routeRuntime,
    routeView,
    wallSlotTransitionClassName: transitionClassName,
    contentSlotTransitionClassName: transitionClassName,
  };
}
