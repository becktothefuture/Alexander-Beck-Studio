import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BodyClassManager } from '../layout/BodyClassManager.jsx';
import { StudioShell } from './StudioShell.jsx';
import { getHomeRouteView, HOME_ROUTE_RUNTIME } from '../../routes/home/HomeRoute.jsx';
import { getPortfolioRouteView, PORTFOLIO_ROUTE_RUNTIME } from '../../routes/portfolio/PortfolioRoute.jsx';
import { ABOUT_ROUTE_RUNTIME, getAboutRouteView } from '../../routes/about/AboutRoute.jsx';
import {
  ABOUT_NARRATIVE_LAB_ROUTE_RUNTIME,
  getAboutNarrativeLabRouteView,
} from '../../routes/about-narrative-lab/AboutNarrativeLabRoute.jsx';
import { CONTACT_ROUTE_RUNTIME, getContactRouteView } from '../../routes/contact/ContactRoute.jsx';
import { getStyleguideRouteView, STYLEGUIDE_ROUTE_RUNTIME } from '../../routes/styleguide/StyleguideRoute.jsx';
import {
  getSimulationLaunchpadRouteView,
  SIMULATION_LAUNCHPAD_ROUTE_RUNTIME,
} from '../../routes/simulation-launchpad/SimulationLaunchpadRoute.jsx';
import { getPaletteLabRouteView, PALETTE_LAB_ROUTE_RUNTIME } from '../../routes/palette-lab/PaletteLabRoute.jsx';
import { getBeachBallRoomRouteView, BEACH_BALL_ROOM_ROUTE_RUNTIME } from '../../routes/beach-ball-room/BeachBallRoomRoute.jsx';
import { getFlockOfBirdsRouteView, FLOCK_OF_BIRDS_ROUTE_RUNTIME } from '../../routes/flock-of-birds/FlockOfBirdsRoute.jsx';
import { getRepelRoomRouteView, REPEL_ROOM_ROUTE_RUNTIME } from '../../routes/repel-room/RepelRoomRoute.jsx';
import { getMineralGrowthRouteView, MINERAL_GROWTH_ROUTE_RUNTIME } from '../../routes/mineral-growth/MineralGrowthRoute.jsx';
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
import { loadShellConfig, syncShellToDocument } from '../../legacy/modules/visual/site-shell.js';
import { initializeDarkMode } from '../../legacy/modules/visual/dark-mode-v2.js';
import { initNoiseSystem } from '../../legacy/modules/visual/noise-system.js';
import { initLinkCursorHop } from '../../legacy/modules/ui/link-cursor-hop.js';
import { setupCustomCursor } from '../../legacy/modules/rendering/cursor.js';
import { applyActiveRouteCursorColor } from '../../legacy/modules/visual/colors.js';
import { isDarkThemeDocument } from '../../lib/theme-state.js';
import { getRouteById } from '../../lib/routes.js';
import { syncTimeOfDayPaletteCssVars } from '../../palette/timeOfDayPalette.js';
import { createEntranceSequence } from '../../lib/motion/entrance-sequence.js';
import { dispatchRouteEntranceStart } from '../../lib/motion/route-entrance-events.js';

syncTimeOfDayPaletteCssVars({ isDarkMode: isDarkThemeDocument() });

function defineRouteDescriptor(routeId, definition) {
  return Object.freeze({ ...getRouteById(routeId), ...definition });
}

const ROUTE_DESCRIPTORS = Object.freeze({
  home: defineRouteDescriptor('home', { title: 'Alexander Beck — Designer and Technologist', getView: getHomeRouteView, runtime: HOME_ROUTE_RUNTIME }),
  contact: defineRouteDescriptor('contact', { title: 'Contact - Alexander Beck Studio', getView: getContactRouteView, runtime: CONTACT_ROUTE_RUNTIME }),
  portfolio: defineRouteDescriptor('portfolio', { title: 'Portfolio - Alexander Beck', getView: getPortfolioRouteView, runtime: PORTFOLIO_ROUTE_RUNTIME }),
  about: defineRouteDescriptor('about', { title: 'About Me - Alexander Beck Studio', getView: getAboutRouteView, runtime: ABOUT_ROUTE_RUNTIME }),
  'about-narrative-lab': defineRouteDescriptor('about-narrative-lab', {
    title: 'About Narrative Lab - Alexander Beck Studio',
    getView: getAboutNarrativeLabRouteView,
    runtime: ABOUT_NARRATIVE_LAB_ROUTE_RUNTIME,
  }),
  styleguide: defineRouteDescriptor('styleguide', { getView: getStyleguideRouteView, runtime: STYLEGUIDE_ROUTE_RUNTIME }),
  simulations: defineRouteDescriptor('simulations', { getView: getSimulationLaunchpadRouteView, runtime: SIMULATION_LAUNCHPAD_ROUTE_RUNTIME }),
  'palette-lab': defineRouteDescriptor('palette-lab', { getView: getPaletteLabRouteView, runtime: PALETTE_LAB_ROUTE_RUNTIME }),
  'beach-ball-room': defineRouteDescriptor('beach-ball-room', { getView: getBeachBallRoomRouteView, runtime: BEACH_BALL_ROOM_ROUTE_RUNTIME }),
  'flock-of-birds': defineRouteDescriptor('flock-of-birds', { getView: getFlockOfBirdsRouteView, runtime: FLOCK_OF_BIRDS_ROUTE_RUNTIME }),
  'repel-room': defineRouteDescriptor('repel-room', { getView: getRepelRoomRouteView, runtime: REPEL_ROOM_ROUTE_RUNTIME }),
  'mineral-growth': defineRouteDescriptor('mineral-growth', { getView: getMineralGrowthRouteView, runtime: MINERAL_GROWTH_ROUTE_RUNTIME }),
  'aperture-bloom': defineRouteDescriptor('aperture-bloom', { getView: getApertureBloomRouteView, runtime: APERTURE_BLOOM_ROUTE_RUNTIME }),
  'confluence-bridges': defineRouteDescriptor('confluence-bridges', { getView: getConfluenceBridgesRouteView, runtime: CONFLUENCE_BRIDGES_ROUTE_RUNTIME }),
  'napoleon-point-cloud': defineRouteDescriptor('napoleon-point-cloud', { getView: getNapoleonPointCloudRouteView, runtime: NAPOLEON_POINT_CLOUD_ROUTE_RUNTIME }),
  'rift-rings': defineRouteDescriptor('rift-rings', { getView: getRiftRingsRouteView, runtime: RIFT_RINGS_ROUTE_RUNTIME }),
  'spatial-scan': defineRouteDescriptor('spatial-scan', { getView: getSpatialScanRouteView, runtime: SPATIAL_SCAN_ROUTE_RUNTIME }),
  'loader-playground': defineRouteDescriptor('loader-playground', { getView: getLoaderPlaygroundRouteView, runtime: LOADER_PLAYGROUND_ROUTE_RUNTIME }),
});

let sharedShellRuntimeSyncPromise = null;

function syncSharedShellRuntimeState() {
  if (!sharedShellRuntimeSyncPromise) {
    sharedShellRuntimeSyncPromise = Promise.all([
      loadRuntimeConfig(),
      loadShellConfig(),
    ]).then(([runtimeConfig, shellConfig]) => {
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
  return (ROUTE_DESCRIPTORS[routeId] || ROUTE_DESCRIPTORS.home).getView(canonicalHref, routeState);
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
  return (ROUTE_DESCRIPTORS[routeId] || ROUTE_DESCRIPTORS.home).runtime;
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

function isAboutNarrativeSceneReady() {
  return document.querySelector('[data-route-content="about"], [data-route-content="about-narrative-lab"]')
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

  const isAboutNarrativeRoute = routeId === 'about' || routeId === 'about-narrative-lab';
  if (isAboutNarrativeRoute) {
    await waitForAboutNarrativeSceneReady(options.isCancelled);
    if (options.isCancelled?.()) return;
  }

  const routeContent = document.querySelector(`[data-route-content="${routeId}"]`);
  const directEntrance = (isAboutNarrativeRoute || routeId === 'contact') && routeContent
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

  const {
    routeState,
    activeRouteId,
    pendingRouteId,
    routeRuntime,
    routeView,
    transitionState = { phase: 'idle', pendingRouteId: null },
    transitionCurrentRoute,
    prewarmRoute,
  } = useShellRouteTransition({
    getRouteView,
    getRouteRuntime,
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
  useTimeOfDayPaletteSync(shellRuntimeReady && !isStandaloneRoute);

  useEffect(() => {
    if (
      !shellRuntimeReady
      || isStandaloneRoute
      || routeState.route.id === 'portfolio'
      || transitionState.phase !== 'idle'
    ) return undefined;

    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const constrained = connection?.saveData === true
      || connection?.effectiveType === 'slow-2g'
      || connection?.effectiveType === '2g';
    if (constrained) return undefined;

    let cancelled = false;
    const warm = () => {
      if (!cancelled) void prewarmRoute('portfolio', { reason: 'idle' });
    };
    const usesIdleCallback = typeof window.requestIdleCallback === 'function';
    const idleId = usesIdleCallback
      ? window.requestIdleCallback(warm, { timeout: 1800 })
      : window.setTimeout(warm, 900);

    return () => {
      cancelled = true;
      if (usesIdleCallback && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      } else {
        window.clearTimeout(idleId);
      }
    };
  }, [isStandaloneRoute, prewarmRoute, routeState.route.id, shellRuntimeReady, transitionState.phase]);

  useLayoutEffect(() => {
    if (isStandaloneRoute) return;
    applyActiveRouteCursorColor(activeRouteId || routeState.route.id);
  }, [activeRouteId, isStandaloneRoute, routeState.route.id]);

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
    const nextTitle = ROUTE_DESCRIPTORS[routeState.route.id]?.title;
    if (nextTitle && document.title !== nextTitle) {
      document.title = nextTitle;
    }
  }, [routeState.route.id]);

  useLayoutEffect(() => {
    let cancelled = false;
    void markDirectShellRouteReady(routeState.route.id, isStandaloneRoute, {
      deferBootState: isDailyFocusRoute,
      isCancelled: () => cancelled,
    });
    return () => {
      cancelled = true;
    };
  }, [isDailyFocusRoute, isStandaloneRoute, routeState.route.id]);

  useLegacyRouteRuntime({
    active: routeRuntimeActive,
    loadModule: routeRuntime.loadModule,
    exportName: routeRuntime.exportName,
    routeId: routeRuntimeId
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
        routeId={routeState.route.id}
      />
      {isStandaloneRoute ? (
        routeView.mainContent
      ) : (
        <SimulationFocusProvider
          routeId={routeState.route.id}
          surfaceRouteId={routeView.surfaceRouteId || routeState.route.id}
          transitionCurrentRoute={transitionCurrentRoute}
        >
          <StudioShell
            activeRouteId={routeView.navigationRouteId || routeState.route.id}
            pendingRouteId={transitionState.pendingRouteId || pendingRouteId || (
              activeRouteId !== routeState.route.id ? activeRouteId : null
            )}
            transitionPhase={transitionState.phase}
            transitionState={transitionState}
            routeRenderKey={routeView.routeRenderKey || routeState.route.id}
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
    </>
  );
}
