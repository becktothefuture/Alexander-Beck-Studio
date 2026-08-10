import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BodyClassManager } from '../layout/BodyClassManager.jsx';
import { StudioShell } from './StudioShell.jsx';
import { getHomeRouteView, HOME_ROUTE_RUNTIME } from '../../routes/home/HomeRoute.jsx';
import { getPortfolioRouteView, PORTFOLIO_ROUTE_RUNTIME } from '../../routes/portfolio/PortfolioRoute.jsx';
import { ABOUT_ROUTE_RUNTIME, getAboutRouteView } from '../../routes/about/AboutRoute.jsx';
import { CONTACT_ROUTE_RUNTIME, getContactRouteView } from '../../routes/contact/ContactRoute.jsx';
import {
  getPlaygroundRouteView,
  PLAYGROUND_ROUTE_RUNTIME,
} from '../../routes/playground/PlaygroundRoute.jsx';
import { getStyleguideRouteView, STYLEGUIDE_ROUTE_RUNTIME } from '../../routes/styleguide/StyleguideRoute.jsx';
import {
  getSimulationLaunchpadRouteView,
  SIMULATION_LAUNCHPAD_ROUTE_RUNTIME,
} from '../../routes/simulation-launchpad/SimulationLaunchpadRoute.jsx';
import { getPaletteLabRouteView, PALETTE_LAB_ROUTE_RUNTIME } from '../../routes/palette-lab/PaletteLabRoute.jsx';
import { getBeachBallRoomRouteView, BEACH_BALL_ROOM_ROUTE_RUNTIME } from '../../routes/beach-ball-room/BeachBallRoomRoute.jsx';
import { getFlockOfBirdsRouteView, FLOCK_OF_BIRDS_ROUTE_RUNTIME } from '../../routes/flock-of-birds/FlockOfBirdsRoute.jsx';
import { getRepelRoomRouteView, REPEL_ROOM_ROUTE_RUNTIME } from '../../routes/repel-room/RepelRoomRoute.jsx';
import { getLoaderPlaygroundRouteView, LOADER_PLAYGROUND_ROUTE_RUNTIME } from '../../routes/loader-playground/LoaderPlaygroundRoute.jsx';
import {
  getDailyFocusRouteView,
  isDailyFocusRouteRequest,
} from '../../routes/daily-focus/DailyFocusRoute.jsx';
import { preloadDailyFocusRuntime } from '../../routes/daily-focus/dailyFocusRuntimeLoader.js';
import {
  APERTURE_BLOOM_ROUTE_RUNTIME,
  CONFLUENCE_BRIDGES_ROUTE_RUNTIME,
  getApertureBloomRouteView,
  getConfluenceBridgesRouteView,
  getNapoleonPointCloudRouteView,
  getRiftRingsRouteView,
  getSpatialScanRouteView,
  NAPOLEON_POINT_CLOUD_ROUTE_RUNTIME,
  RIFT_RINGS_ROUTE_RUNTIME,
  SPATIAL_SCAN_ROUTE_RUNTIME,
} from '../../routes/concept-simulations/ConceptSimulationRoute.jsx';
import { useLegacyRouteRuntime } from '../../hooks/useLegacyRouteRuntime.js';
import { useShellRouteTransition } from '../../hooks/useShellRouteTransition.js';
import { useSiteHaptics } from '../../hooks/useSiteHaptics.js';
import { useTimeOfDayPaletteSync } from '../../hooks/useTimeOfDayPaletteSync.js';
import { DevConfigPanelBridge } from './DevConfigPanelBridge.jsx';
import { ViewportCover } from './ViewportCover.jsx';
import {
  SimulationFocusChooser,
  SimulationFocusProvider,
  SimulationFocusSwitcher,
} from '../simulation-focus/SimulationFocusProvider.jsx';
import {
  getResolvedSimulationFocus,
  normalizeSimulationId,
  getSimulationLaunchTarget,
  SIMULATION_FOCUS_CHANGED_EVENT,
  SIMULATION_FOCUS_STORAGE_KEY,
} from '../../data/simulationCatalog.js';
import { completeDirectBoot, failDirectBoot } from '../../legacy/modules/visual/page-orchestrator.js';
import { applyLayoutCSSVars, initState } from '../../legacy/modules/core/state.js';
import { waitForFonts } from '../../legacy/modules/utils/font-loader.js';
import { loadRuntimeConfig } from '../../legacy/modules/utils/runtime-config.js';
import { loadDesignSystemConfig } from '../../legacy/modules/utils/design-config.js';
import { loadShellConfig, syncShellToDocument } from '../../legacy/modules/visual/site-shell.js';
import { initializeDarkMode } from '../../legacy/modules/visual/dark-mode-v2.js';
import { initNoiseSystem } from '../../legacy/modules/visual/noise-system.js';
import { initLinkCursorHop } from '../../legacy/modules/ui/link-cursor-hop.js';
import { setupCustomCursor } from '../../legacy/modules/rendering/cursor.js';
import { setSimulationAtmosphereConfig } from '../../legacy/modules/rendering/atmosphere/simulation-atmosphere.js';
import { setSimulationBodyMaterialConfig } from '../../legacy/modules/rendering/materials/simulation-body-material.js';
import { applyActiveRouteCursorColor } from '../../legacy/modules/visual/colors.js';
import { isDarkThemeDocument } from '../../lib/theme-state.js';
import { getRouteById, SHELL_ROUTE_TABS } from '../../lib/routes.js';
import { createEntranceSequence } from '../../lib/motion/entrance-sequence.js';
import { dispatchRouteEntranceStart } from '../../lib/motion/route-entrance-events.js';
import { waitForObservedRouteReady } from '../../lib/motion/route-transition-readiness.js';

function defineRouteDescriptor(routeId, definition) {
  const route = getRouteById(routeId);
  if (!route) throw new Error(`SiteApp descriptor references unknown route "${routeId}".`);
  return Object.freeze({ ...route, ...definition });
}

function getAtmosphereLabHomeView(canonicalHref) {
  return {
    ...getHomeRouteView(canonicalHref),
    navigationRouteId: 'home',
    routeRenderKey: 'home',
    contentRenderKey: 'home-shell',
    runtimeRouteId: 'home',
    shellRouteId: 'home',
    surfaceRouteId: 'home',
    providerRouteId: 'home',
    homeModeHrefBase: new URL(canonicalHref, window.location.origin).pathname,
  };
}

const ROUTE_DESCRIPTORS = Object.freeze({
  home: defineRouteDescriptor('home', { getView: getHomeRouteView, runtime: HOME_ROUTE_RUNTIME }),
  'atmosphere-webgl-post': defineRouteDescriptor('atmosphere-webgl-post', {
    getView: getAtmosphereLabHomeView,
    runtime: HOME_ROUTE_RUNTIME,
  }),
  'atmosphere-density': defineRouteDescriptor('atmosphere-density', {
    getView: getAtmosphereLabHomeView,
    runtime: HOME_ROUTE_RUNTIME,
  }),
  'atmosphere-feedback': defineRouteDescriptor('atmosphere-feedback', {
    getView: getAtmosphereLabHomeView,
    runtime: HOME_ROUTE_RUNTIME,
  }),
  'atmosphere-crisp-glow': defineRouteDescriptor('atmosphere-crisp-glow', {
    getView: getAtmosphereLabHomeView,
    runtime: HOME_ROUTE_RUNTIME,
  }),
  'atmosphere-hybrid-glow': defineRouteDescriptor('atmosphere-hybrid-glow', {
    getView: getAtmosphereLabHomeView,
    runtime: HOME_ROUTE_RUNTIME,
  }),
  contact: defineRouteDescriptor('contact', { getView: getContactRouteView, runtime: CONTACT_ROUTE_RUNTIME }),
  portfolio: defineRouteDescriptor('portfolio', { getView: getPortfolioRouteView, runtime: PORTFOLIO_ROUTE_RUNTIME }),
  about: defineRouteDescriptor('about', { getView: getAboutRouteView, runtime: ABOUT_ROUTE_RUNTIME }),
  playground: defineRouteDescriptor('playground', {
    getView: getPlaygroundRouteView,
    runtime: PLAYGROUND_ROUTE_RUNTIME,
  }),
  styleguide: defineRouteDescriptor('styleguide', { getView: getStyleguideRouteView, runtime: STYLEGUIDE_ROUTE_RUNTIME }),
  simulations: defineRouteDescriptor('simulations', { getView: getSimulationLaunchpadRouteView, runtime: SIMULATION_LAUNCHPAD_ROUTE_RUNTIME }),
  'palette-lab': defineRouteDescriptor('palette-lab', { getView: getPaletteLabRouteView, runtime: PALETTE_LAB_ROUTE_RUNTIME }),
  'beach-ball-room': defineRouteDescriptor('beach-ball-room', { getView: getBeachBallRoomRouteView, runtime: BEACH_BALL_ROOM_ROUTE_RUNTIME }),
  'flock-of-birds': defineRouteDescriptor('flock-of-birds', { getView: getFlockOfBirdsRouteView, runtime: FLOCK_OF_BIRDS_ROUTE_RUNTIME }),
  'repel-room': defineRouteDescriptor('repel-room', { getView: getRepelRoomRouteView, runtime: REPEL_ROOM_ROUTE_RUNTIME }),
  'aperture-bloom': defineRouteDescriptor('aperture-bloom', { getView: getApertureBloomRouteView, runtime: APERTURE_BLOOM_ROUTE_RUNTIME }),
  'confluence-bridges': defineRouteDescriptor('confluence-bridges', { getView: getConfluenceBridgesRouteView, runtime: CONFLUENCE_BRIDGES_ROUTE_RUNTIME }),
  'napoleon-point-cloud': defineRouteDescriptor('napoleon-point-cloud', { getView: getNapoleonPointCloudRouteView, runtime: NAPOLEON_POINT_CLOUD_ROUTE_RUNTIME }),
  'rift-rings': defineRouteDescriptor('rift-rings', { getView: getRiftRingsRouteView, runtime: RIFT_RINGS_ROUTE_RUNTIME }),
  'spatial-scan': defineRouteDescriptor('spatial-scan', { getView: getSpatialScanRouteView, runtime: SPATIAL_SCAN_ROUTE_RUNTIME }),
  'loader-playground': defineRouteDescriptor('loader-playground', { getView: getLoaderPlaygroundRouteView, runtime: LOADER_PLAYGROUND_ROUTE_RUNTIME }),
});

function getRouteDescriptor(routeId) {
  const descriptor = ROUTE_DESCRIPTORS[routeId];
  if (!descriptor) throw new Error(`No SiteApp descriptor exists for route "${routeId}".`);
  return descriptor;
}

const PRIMARY_ROUTE_IDS = Object.freeze(SHELL_ROUTE_TABS.map((tab) => tab.routeId));
const PRODUCTION_ATMOSPHERE_ROUTE_IDS = new Set([
  ...PRIMARY_ROUTE_IDS,
  'repel-room',
  'flock-of-birds',
  'rift-rings',
]);

function resolveAtmosphereHostScope(routeId, routeView) {
  if (routeId === 'atmosphere-crisp-glow') return 'lab';
  if (String(routeId || '').startsWith('atmosphere-')) return null;
  if (PRIMARY_ROUTE_IDS.includes(routeId)) return 'production';
  const dailyRuntimeRouteId = routeView?.runtimeRouteId || '';
  return PRODUCTION_ATMOSPHERE_ROUTE_IDS.has(dailyRuntimeRouteId) ? 'production' : null;
}

let sharedShellRuntimeSyncPromise = null;

function syncSharedShellRuntimeState() {
  if (!sharedShellRuntimeSyncPromise) {
    sharedShellRuntimeSyncPromise = Promise.all([
      loadRuntimeConfig(),
      loadShellConfig(),
      loadDesignSystemConfig(),
    ]).then(([runtimeConfig, shellConfig, designSystem]) => {
      document.documentElement.dataset.absDesignConfigRevision = String(designSystem?.version || 1);
      setSimulationAtmosphereConfig(designSystem?.shell?.surface?.simulationAtmosphere);
      setSimulationBodyMaterialConfig(designSystem?.shell?.surface?.simulationBodyMaterial);
      initState(runtimeConfig);
      applyLayoutCSSVars();
      syncShellToDocument({
        config: shellConfig,
        isDark: isDarkThemeDocument(),
      });
      initNoiseSystem(runtimeConfig);
      initializeDarkMode();
      initLinkCursorHop();
      setupCustomCursor();
    });
  }
  return sharedShellRuntimeSyncPromise;
}

function getSearchFromHref(href) {
  if (!href) return '';
  try {
    return new URL(href, window.location.origin).search;
  } catch {
    return window.location.search;
  }
}

function getRequestedFocusIdFromHref(href) {
  const search = getSearchFromHref(href);
  if (!search) return null;
  const params = new URLSearchParams(search);
  const requestedId = params.get('mode') || params.get('focus') || params.get('simulation') || null;
  return requestedId ? normalizeSimulationId(requestedId) : null;
}

function getHomeDailyFocusRouteId(canonicalHref, routeState) {
  if (routeState?.dailyFocusRouteId) return routeState.dailyFocusRouteId;

  const routeFocusId = routeState?.focusSimulationId || null;
  const routeFocusTarget = routeFocusId ? getSimulationLaunchTarget(routeFocusId) : null;
  if (routeFocusTarget) return routeFocusTarget.routeBacked ? routeFocusTarget.id : null;

  const requestedFocusId = getRequestedFocusIdFromHref(canonicalHref);
  const requestedTarget = requestedFocusId ? getSimulationLaunchTarget(requestedFocusId) : null;
  if (requestedTarget) return requestedTarget.routeBacked ? requestedTarget.id : null;

  const focusState = getResolvedSimulationFocus();
  const activeTarget = focusState.activeId ? getSimulationLaunchTarget(focusState.activeId) : null;
  return activeTarget?.routeBacked ? activeTarget.id : null;
}

function getRouteViewForId(routeId, canonicalHref, routeState, focusRevision = 0) {
  Number(focusRevision);
  if (isDailyFocusRouteRequest(routeId, getSearchFromHref(canonicalHref))) {
    return getDailyFocusRouteView(routeId);
  }
  if (routeId === 'home') {
    const dailyFocusRouteId = getHomeDailyFocusRouteId(canonicalHref, routeState);
    if (dailyFocusRouteId) return getDailyFocusRouteView(dailyFocusRouteId);
  }
  return getRouteDescriptor(routeId).getView(canonicalHref, routeState);
}

function getRouteRuntimeForId(routeId, canonicalHref, routeState, focusRevision = 0) {
  Number(focusRevision);
  const dailyFocusRouteId = routeState?.dailyFocusRouteId
    || (isDailyFocusRouteRequest(routeId, getSearchFromHref(canonicalHref)) ? routeId : null)
    || (routeId === 'home' ? getHomeDailyFocusRouteId(canonicalHref, routeState) : null);
  if (dailyFocusRouteId) {
    return {
      loadModule: () => preloadDailyFocusRuntime(dailyFocusRouteId),
    };
  }
  if (
    routeState?.lockedGateId
    || routeState?.routeLocked
  ) {
    return {};
  }
  return getRouteDescriptor(routeId).runtime;
}

function readProjectFixture(routeId) {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const fixture = params.get('fixture');
  if (!fixture) return null;

  if (routeId === 'portfolio' && fixture === 'portfolio-drawer') {
    const projectIndex = Number.parseInt(params.get('project') || '0', 10);
    return {
      type: fixture,
      projectIndex: Number.isInteger(projectIndex) && projectIndex >= 0 ? projectIndex : 0,
    };
  }

  return null;
}

function shouldDeferBootStateForHold() {
  if (typeof window === 'undefined') return false;

  const host = window.location.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1' && host !== '::1') return false;

  try {
    return new URLSearchParams(window.location.search).get('absBootHold') === '1';
  } catch {
    return false;
  }
}

const ABOUT_SCENE_READY_EVENT = 'abs:about-scene-ready';
const ABOUT_SCENE_READY_TIMEOUT_MS = 3200;
const PLAYGROUND_ROUTE_READY_TIMEOUT_MS = 3200;

function isAboutNarrativeSceneReady() {
  return document.querySelector('.about-narrative-lab[data-route-content="about"]')
    ?.dataset.aboutSceneReady === 'true';
}

function waitForAboutNarrativeSceneReady(isCancelled) {
  if (isAboutNarrativeSceneReady()) return Promise.resolve(true);
  return new Promise((resolve) => {
    let settled = false;
    let timeoutId = 0;
    const finish = (ready) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      window.removeEventListener(ABOUT_SCENE_READY_EVENT, handleReady);
      resolve(ready);
    };
    const handleReady = () => finish(!isCancelled?.());
    timeoutId = window.setTimeout(() => finish(false), ABOUT_SCENE_READY_TIMEOUT_MS);
    window.addEventListener(ABOUT_SCENE_READY_EVENT, handleReady);
  });
}

async function waitForPlaygroundRouteReady() {
  const waiter = waitForObservedRouteReady(
    'playground',
    PLAYGROUND_ROUTE_READY_TIMEOUT_MS,
    {},
    () => ({ generation: 0 }),
  );
  return waiter.promise;
}

async function markDirectShellRouteReady(routeId, isStandaloneRoute, options = {}) {
  if (typeof document === 'undefined') return;
  if (isStandaloneRoute || routeId === 'home') return;

  const fontsReady = await waitForFonts();
  if (options.isCancelled?.()) return;
  if (!fontsReady) {
    console.warn('[shell] Critical fonts unavailable; revealing the route with fallback fonts');
    await failDirectBoot({
      detail: 'critical-fonts-unavailable',
      selectors: ['#abs-scene', '#app-frame'],
    });
    return;
  }

  const root = document.documentElement;
  root.classList.remove(
    'fonts-loading',
    'entrance-pre-transition',
    'entrance-transitioning',
    'abs-home-post-boot-pending',
    'abs-home-post-boot-enter',
  );

  // Portfolio owns its direct-load release because its measured card geometry
  // and authored entrance must be ready before the boot overlay leaves.
  if (routeId === 'portfolio') {
    root.dataset.absBootDetail = 'portfolio-preparing';
    return;
  }

  const isAboutRoute = routeId === 'about';
  const waitsForAboutNarrativeScene = routeId === 'about';
  if (waitsForAboutNarrativeScene) {
    await waitForAboutNarrativeSceneReady(options.isCancelled);
    if (options.isCancelled?.()) return;
  }
  if (routeId === 'playground' && import.meta.env.DEV) {
    await waitForPlaygroundRouteReady();
    if (options.isCancelled?.()) return;
  }

  const routeContent = document.querySelector(`[data-route-content="${routeId}"]`);
  const directEntrance = (
    isAboutRoute
    || routeId === 'contact'
    || routeId === 'playground'
  ) && routeContent
    ? createEntranceSequence({ scopes: routeContent, profile: 'direct' })
    : null;
  directEntrance?.stage();

  root.classList.add('abs-direct-boot-ready', 'entrance-complete', 'ui-entered');

  if (options.deferBootState === true) return;

  if (!root.dataset.absBootState || root.dataset.absBootState === 'booting') {
    root.dataset.absBootState = 'ready';
  }
  if (!root.dataset.absBootDetail || root.dataset.absBootDetail === 'held') {
    root.dataset.absBootDetail = 'shell-route-ready';
  }
  void completeDirectBoot({
    detail: shouldDeferBootStateForHold() ? 'held' : 'shell-route-ready',
    selectors: ['#abs-scene', '#app-frame'],
    onOverlayHidden: async () => {
      dispatchRouteEntranceStart(routeId, 'direct');
      await directEntrance?.play();
    },
  });
}

export function SiteApp() {
  const [simulationFocusRevision, setSimulationFocusRevision] = useState(0);
  const [shellRuntimeReady, setShellRuntimeReady] = useState(false);
  const wallSurfaceRef = useRef(null);
  const heroSurfaceRef = useRef(null);
  const uiSurfaceRef = useRef(null);
  const chromeSurfaceRef = useRef(null);
  const secondarySurfaceRef = useRef(null);
  const footerSurfaceRef = useRef(null);
  const controlsSurfaceRef = useRef(null);
  const surfaceRefs = useMemo(() => ({
    wall: wallSurfaceRef,
    hero: heroSurfaceRef,
    ui: uiSurfaceRef,
    chrome: chromeSurfaceRef,
    secondary: secondarySurfaceRef,
    footer: footerSurfaceRef,
    controls: controlsSurfaceRef,
  }), []);

  useEffect(() => {
    const refreshSimulationFocus = () => {
      setSimulationFocusRevision((revision) => revision + 1);
    };
    const handleStorage = (event) => {
      if (!event || event.key === SIMULATION_FOCUS_STORAGE_KEY) {
        refreshSimulationFocus();
      }
    };

    window.addEventListener(SIMULATION_FOCUS_CHANGED_EVENT, refreshSimulationFocus);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(SIMULATION_FOCUS_CHANGED_EVENT, refreshSimulationFocus);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const getRouteView = useCallback((routeId, canonicalHref, routeStateSnapshot) => (
    getRouteViewForId(routeId, canonicalHref, routeStateSnapshot, simulationFocusRevision)
  ), [simulationFocusRevision]);

  const getRouteRuntime = useCallback((routeId, canonicalHref, routeStateSnapshot) => (
    getRouteRuntimeForId(routeId, canonicalHref, routeStateSnapshot, simulationFocusRevision)
  ), [simulationFocusRevision]);

  const getRouteReadinessId = useCallback((routeId, canonicalHref, routeStateSnapshot) => {
    const resolvedView = getRouteViewForId(
      routeId,
      canonicalHref,
      routeStateSnapshot,
      simulationFocusRevision,
    );
    return resolvedView.readinessRouteId || resolvedView.runtimeRouteId || routeId;
  }, [simulationFocusRevision]);

  const {
    routeState,
    activeRouteId,
    pendingRouteId,
    routeRuntime,
    routeView,
    transitionState = { phase: 'idle', pendingRouteId: null },
    prewarmRoute,
    requestSimulationSwitch,
    simulationSwitchSnapshot,
  } = useShellRouteTransition({
    getRouteView,
    getRouteRuntime,
    getRouteReadinessId,
    surfaceRefs,
  });
  const isStandaloneRoute = routeView.layout === 'standalone';
  const routeRuntimeActive = shellRuntimeReady
    && !isStandaloneRoute
    && routeView.legacyRuntime !== false;
  const routeRuntimeId = routeView.runtimeRouteId || routeState.route.id;
  const isDailyFocusRoute = isDailyFocusRouteRequest(
    routeState.route.id,
    getSearchFromHref(routeState.canonicalHref),
  );

  useSiteHaptics({ routeId: routeState.route.id });
  useTimeOfDayPaletteSync(!isStandaloneRoute);

  useEffect(() => {
    if (isStandaloneRoute) return undefined;

    const controller = new AbortController();
    PRIMARY_ROUTE_IDS.forEach((routeId) => {
      void prewarmRoute(routeId, {
        reason: 'initial-boot',
        priority: 'data',
        signal: controller.signal,
      });
    });
    return () => controller.abort('site-app-unmounted');
  }, [isStandaloneRoute, prewarmRoute]);

  useEffect(() => {
    if (!shellRuntimeReady || isStandaloneRoute || transitionState.phase !== 'idle') return undefined;

    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const constrained = connection?.saveData === true
      || connection?.effectiveType === 'slow-2g'
      || connection?.effectiveType === '2g';
    if (constrained) return undefined;

    let cancelled = false;
    let scheduledWithIdleCallback = typeof window.requestIdleCallback === 'function';
    const warm = () => {
      if (cancelled) return;
      const overlay = document.getElementById('abs-boot-overlay');
      const bootStillCovered = document.documentElement.dataset.absBootState === 'booting'
        || (overlay && Number.parseFloat(getComputedStyle(overlay).opacity || '1') > 0.02);
      if (bootStillCovered) {
        scheduledWithIdleCallback = false;
        idleId = window.setTimeout(warm, 120);
        return;
      }
      PRIMARY_ROUTE_IDS.forEach((routeId) => {
        void prewarmRoute(routeId, { reason: 'idle', priority: 'media' });
      });
    };
    let idleId = scheduledWithIdleCallback
      ? window.requestIdleCallback(warm, { timeout: 1800 })
      : window.setTimeout(warm, 900);

    return () => {
      cancelled = true;
      if (scheduledWithIdleCallback && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      } else {
        window.clearTimeout(idleId);
      }
    };
  }, [isStandaloneRoute, prewarmRoute, shellRuntimeReady, transitionState.phase]);

  useLayoutEffect(() => {
    if (isStandaloneRoute) return;
    applyActiveRouteCursorColor(routeView.navigationRouteId || activeRouteId || routeState.route.id);
  }, [activeRouteId, isStandaloneRoute, routeState.route.id, routeView.navigationRouteId]);

  useLayoutEffect(() => {
    if (isStandaloneRoute) return undefined;
    let cancelled = false;
    syncSharedShellRuntimeState()
      .then(() => {
        if (!cancelled) {
          setShellRuntimeReady(true);
        }
      })
      .catch((error) => {
        console.error('[shell] Failed to sync shared runtime layout', error);
      });
    return () => {
      cancelled = true;
    };
  }, [isStandaloneRoute]);

  useEffect(() => {
    const nextTitle = getRouteDescriptor(routeState.route.id).title;
    if (nextTitle && document.title !== nextTitle) {
      document.title = nextTitle;
    }
  }, [routeState.route.id]);

  useLayoutEffect(() => {
    let cancelled = false;
    void markDirectShellRouteReady(routeView.runtimeRouteId || routeState.route.id, isStandaloneRoute, {
      deferBootState: isDailyFocusRoute,
      isCancelled: () => cancelled,
    });
    return () => {
      cancelled = true;
    };
  }, [isDailyFocusRoute, isStandaloneRoute, routeState.route.id, routeView.runtimeRouteId]);

  useLegacyRouteRuntime({
    active: routeRuntimeActive,
    loadModule: routeRuntime.loadModule,
    exportName: routeRuntime.exportName,
    routeId: routeRuntimeId,
    runtimeContext: routeState.simulationSwitchContext || null,
  });

  useEffect(() => {
    const fixture = readProjectFixture(routeState.route.id);
    if (!fixture || fixture.type !== 'portfolio-drawer') {
      return undefined;
    }

    let cancelled = false;
    let fallbackTimer = null;

    const dispatchFixture = () => {
      if (cancelled) return;
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (cancelled) return;
          document.dispatchEvent(new CustomEvent('abs:portfolio:open-project', {
            detail: { index: fixture.projectIndex },
          }));
        });
      });
    };

    const handleRouteReady = (event) => {
      if (event?.detail?.routeId === 'portfolio') {
        dispatchFixture();
      }
    };

    window.addEventListener('abs:route-ready', handleRouteReady);
    fallbackTimer = window.setTimeout(dispatchFixture, 1500);

    return () => {
      cancelled = true;
      if (fallbackTimer !== null) {
        window.clearTimeout(fallbackTimer);
      }
      window.removeEventListener('abs:route-ready', handleRouteReady);
    };
  }, [routeState.route.id]);

  return (
    <>
      {!isStandaloneRoute ? <DevConfigPanelBridge /> : null}
      <BodyClassManager
        className={routeView.bodyClass}
        htmlClassName={routeView.htmlClassName}
        routeId={routeView.shellRouteId || routeState.route.id}
      />
      {isStandaloneRoute ? (
        routeView.mainContent
      ) : (
        <SimulationFocusProvider
          routeId={routeView.providerRouteId || routeState.route.id}
          surfaceRouteId={routeView.surfaceRouteId || routeState.route.id}
          requestSimulationSwitch={requestSimulationSwitch}
          simulationSwitchSnapshot={simulationSwitchSnapshot}
        >
          <StudioShell
            activeRouteId={routeView.navigationRouteId || routeState.route.id}
            pendingRouteId={transitionState.pendingRouteId || pendingRouteId || (
              activeRouteId !== routeState.route.id ? activeRouteId : null
            )}
            transitionPhase={transitionState.phase}
            transitionState={transitionState}
            atmosphereHostScope={resolveAtmosphereHostScope(routeState.route.id, routeView)}
            routeRenderKey={routeView.routeRenderKey || routeState.route.id}
            mainLandmarkHeadingId={routeView.mainLandmarkHeadingId}
            contentRenderKey={routeView.contentRenderKey || routeState.route.id}
            studioWindowClassName={routeView.studioWindowClassName || routeView.wallClassName}
            simulationLayer={routeView.simulationLayer}
            studioWindowContent={routeView.studioWindowContent || routeView.wallContent}
            heroLayer={routeView.heroLayer}
            uiLayer={routeView.uiLayer}
            headerContent={routeView.headerContent}
            mainContent={routeView.mainContent}
            heroTitle={routeView.heroTitle}
            showFooter={routeView.showFooter}
            windowOverlayContent={routeView.windowOverlayContent}
            simulationFocusControls={<SimulationFocusSwitcher />}
            simulationFocusModal={<SimulationFocusChooser />}
            surfaceRefs={surfaceRefs}
            onRoutePrewarm={prewarmRoute}
          />
        </SimulationFocusProvider>
      )}
      <ViewportCover />
    </>
  );
}
