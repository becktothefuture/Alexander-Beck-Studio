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
   GATE-SUCCESS TRANSITION
   Fade the entire scene out as one unit, swap the route while invisible,
   wait for the new route to be ready, then stagger-reveal its elements.

   Invariants:
   - Every async step checks `stale()` before mutating DOM or state.
   - `finalizeGateTransition()` is the single cleanup path used by success,
     catch, popstate, and unmount — it is always safe to call repeatedly.
   - All navigation is blocked while a gate transition is active.
   ═══════════════════════════════════════════════════════════════════════════════ */

const FADE_OUT_MS = 400;
const STAGGER_OFFSET_MS = 140;
const ELEMENT_REVEAL_MS = 500;
const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
const READY_FALLBACK_MS = 2500;

let gateToken = 0;
let activeAnimations = [];

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
  } catch {}
}

function dismissGateBackdrop() {
  import('../legacy/modules/ui/gate-modal-shared.js')
    .then((m) => m.dismissGateBackdrop())
    .catch(() => forceBackdropDismiss());
}

/* ── animation tracking ──────────────────────────────────────────────────── */

function cancelActiveAnimations() {
  activeAnimations.forEach((a) => { try { a.cancel(); } catch {} });
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

function finalizeGateTransition(scene) {
  cancelActiveAnimations();
  commitStaggerStyles();
  dismissGateBackdrop();
  delete document.documentElement.dataset.absGateTransition;
  if (scene) {
    scene.style.opacity = '1';
    scene.style.visibility = 'visible';
    scene.style.willChange = 'auto';
  }
}

/* ── fade out ─────────────────────────────────────────────────────────────── */

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
  activeAnimations.push(anim);
  return new Promise((resolve) => {
    anim.onfinish = () => resolve(anim);
    anim.oncancel = () => resolve(anim);
  });
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

  // Wall: #bravia-balls covers the simulation canvas AND the noise overlay
  add(document.getElementById('bravia-balls'), { slide: false });
  // Vignette overlay (sibling of wall, inside #abs-scene)
  add(document.querySelector('.frame-vignette'), { slide: false });
  // Header bar (inside route slot)
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

function staggeredEntrance(scene, fadeOutAnim) {
  return new Promise((resolve) => {
    const targets = collectStaggerTargets();

    // Safety: if DOM is unexpectedly empty, just reveal the scene.
    if (targets.length === 0) {
      if (fadeOutAnim) { try { fadeOutAnim.cancel(); } catch {} }
      scene.style.opacity = '1';
      scene.style.visibility = 'visible';
      resolve();
      return;
    }

    // Hide every target before making the scene visible.
    targets.forEach(({ el }) => {
      el.style.opacity = '0';
      el.style.willChange = 'opacity, transform';
    });

    // Cancel fade-out WAAPI so its fill:forwards stops overriding inline styles.
    if (fadeOutAnim) { try { fadeOutAnim.cancel(); } catch {} }
    scene.style.opacity = '1';
    scene.style.visibility = 'visible';
    scene.style.willChange = 'auto';
    scene.offsetHeight; // force reflow

    const hasWaapi = typeof scene.animate === 'function';

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
        // CSS-transition fallback for browsers without WAAPI.
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
  const gateActiveRef = useRef(false);

  const navigate = useCallback((href, options = {}) => {
    // Block ALL navigation while a gate transition is in progress.
    if (gateActiveRef.current) return false;

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

    /* ── gate-success ────────────────────────────────────────────────────── */
    if (options.transitionStyle === 'gate-success') {
      gateActiveRef.current = true;
      document.documentElement.dataset.absGateTransition = 'active';

      const scene = document.getElementById('abs-scene');
      const readyMs = options.readyFallbackMs ?? READY_FALLBACK_MS;
      const token = ++gateToken;
      const stale = () => token !== gateToken;

      /* Reduced motion: skip animations, keep orchestration semantics. */
      if (reduceMotion) {
        Promise.resolve()
          .then(() => nextRouteRuntime?.loadModule?.()).catch(() => undefined)
          .then(() => {
            if (stale()) return;
            if (scene) scene.style.opacity = '0';
            commit();
            return waitForRouteReady(nextState.route.id, readyMs);
          })
          .then(() => {
            if (stale()) return;
            finalizeGateTransition(scene);
            gateActiveRef.current = false;
          })
          .catch(() => {
            finalizeGateTransition(scene);
            gateActiveRef.current = false;
          });
        return true;
      }

      /* Full animated path. */
      let fadeOutAnim = null;

      Promise.resolve()
        .then(() => nextRouteRuntime?.loadModule?.()).catch(() => undefined)
        .then(() => { if (!stale()) return fadeOutScene(scene); })
        .then((anim) => {
          fadeOutAnim = anim;
          if (stale()) return;
          commit();
          return waitForRouteReady(nextState.route.id, readyMs);
        })
        .then(() => {
          if (stale()) return;
          dismissGateBackdrop();
          return staggeredEntrance(scene, fadeOutAnim);
        })
        .then(() => {
          if (stale()) return;
          delete document.documentElement.dataset.absGateTransition;
          activeAnimations = [];
          gateActiveRef.current = false;
        })
        .catch(() => {
          finalizeGateTransition(scene);
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

  /* Bridge legacy JS navigate calls into the React router. */
  useEffect(() => installSpaNavigationBridge(navigate), [navigate]);

  /* Handle browser back/forward — invalidate token, finalize, restore. */
  useEffect(() => {
    const handlePopState = () => {
      const scene = document.getElementById('abs-scene');
      ++gateToken;
      finalizeGateTransition(scene);
      gateActiveRef.current = false;
      setRouteState(computeRouteState(window.location.href));
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      // Unmount cleanup: finalize any in-flight gate transition.
      if (gateActiveRef.current) {
        ++gateToken;
        finalizeGateTransition(document.getElementById('abs-scene'));
        gateActiveRef.current = false;
      }
    };
  }, []);

  /* Auto-open gate modal when redirected to home with ?gate=… */
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
