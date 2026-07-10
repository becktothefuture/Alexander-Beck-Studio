import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BodyClassManager } from '../layout/BodyClassManager.jsx';
import { StudioShell } from './StudioShell.jsx';
import { getHomeRouteView, HOME_ROUTE_RUNTIME } from '../../routes/home/HomeRoute.jsx';
import { getPortfolioRouteView, PORTFOLIO_ROUTE_RUNTIME } from '../../routes/portfolio/PortfolioRoute.jsx';
import { ABOUT_ROUTE_RUNTIME, getAboutRouteView } from '../../routes/about/AboutRoute.jsx';
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
import { completeDirectBoot } from '../../legacy/modules/visual/page-orchestrator.js';
import { applyLayoutCSSVars, initState } from '../../legacy/modules/core/state.js';
import { loadRuntimeConfig } from '../../legacy/modules/utils/runtime-config.js';
import { loadShellConfig, syncShellToDocument } from '../../legacy/modules/visual/site-shell.js';
import { isDarkThemeDocument } from '../../lib/theme-state.js';

const ROUTE_VIEW_BY_ID = {
  home: getHomeRouteView,
  contact: getContactRouteView,
  portfolio: getPortfolioRouteView,
  about: getAboutRouteView,
  styleguide: getStyleguideRouteView,
  simulations: getSimulationLaunchpadRouteView,
  'palette-lab': getPaletteLabRouteView,
  'beach-ball-room': getBeachBallRoomRouteView,
  'flock-of-birds': getFlockOfBirdsRouteView,
  'repel-room': getRepelRoomRouteView,
  'mineral-growth': getMineralGrowthRouteView,
  'aperture-bloom': getApertureBloomRouteView,
  'confluence-bridges': getConfluenceBridgesRouteView,
  'napoleon-point-cloud': getNapoleonPointCloudRouteView,
  'rift-rings': getRiftRingsRouteView,
  'spatial-scan': getSpatialScanRouteView,
  'loader-playground': getLoaderPlaygroundRouteView
};

const ROUTE_RUNTIME_BY_ID = {
  home: HOME_ROUTE_RUNTIME,
  contact: CONTACT_ROUTE_RUNTIME,
  portfolio: PORTFOLIO_ROUTE_RUNTIME,
  about: ABOUT_ROUTE_RUNTIME,
  styleguide: STYLEGUIDE_ROUTE_RUNTIME,
  simulations: SIMULATION_LAUNCHPAD_ROUTE_RUNTIME,
  'palette-lab': PALETTE_LAB_ROUTE_RUNTIME,
  'beach-ball-room': BEACH_BALL_ROOM_ROUTE_RUNTIME,
  'flock-of-birds': FLOCK_OF_BIRDS_ROUTE_RUNTIME,
  'repel-room': REPEL_ROOM_ROUTE_RUNTIME,
  'mineral-growth': MINERAL_GROWTH_ROUTE_RUNTIME,
  'aperture-bloom': APERTURE_BLOOM_ROUTE_RUNTIME,
  'confluence-bridges': CONFLUENCE_BRIDGES_ROUTE_RUNTIME,
  'napoleon-point-cloud': NAPOLEON_POINT_CLOUD_ROUTE_RUNTIME,
  'rift-rings': RIFT_RINGS_ROUTE_RUNTIME,
  'spatial-scan': SPATIAL_SCAN_ROUTE_RUNTIME,
  'loader-playground': LOADER_PLAYGROUND_ROUTE_RUNTIME
};

const PAGE_TITLE_BY_ROUTE_ID = {
  home: 'Alexander Beck Studio',
  contact: 'Contact - Alexander Beck Studio',
  portfolio: 'Portfolio - Alexander Beck',
  about: 'About Me - Alexander Beck Studio',
  cv: 'About Me - Alexander Beck Studio',
};

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
  if (requestedTarget?.routeBacked) return requestedTarget.id;

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
  return (ROUTE_VIEW_BY_ID[routeId] || ROUTE_VIEW_BY_ID.home)(canonicalHref, routeState);
}

function getRouteRuntimeForId(routeId, canonicalHref, routeState, focusRevision = 0) {
  Number(focusRevision);
  if (
    routeState?.lockedGateId
    || routeState?.routeLocked
    || routeState?.dailyFocusRouteId
    || isDailyFocusRouteRequest(routeId, getSearchFromHref(canonicalHref))
    || (routeId === 'home' && getHomeDailyFocusRouteId(canonicalHref, routeState))
  ) {
    return {};
  }
  return ROUTE_RUNTIME_BY_ID[routeId] || ROUTE_RUNTIME_BY_ID.home;
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

function markDirectShellRouteReady(routeId, isStandaloneRoute, options = {}) {
  if (typeof document === 'undefined') return;
  if (isStandaloneRoute || routeId === 'home') return;

  // Non-home shell direct loads do not run the home page-orchestrator boot
  // completion path. SiteApp owns their final boot-ready marker after the
  // route view has mounted; route runtimes still dispatch abs:route-ready for
  // SPA transitions and route-specific fixtures.
  const root = document.documentElement;
  root.classList.remove(
    'fonts-loading',
    'entrance-pre-transition',
    'entrance-transitioning',
    'abs-home-post-boot-pending',
    'abs-home-post-boot-enter',
  );
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
  });
}

export function SiteApp() {
  const [simulationFocusRevision, setSimulationFocusRevision] = useState(0);
  const wallSurfaceRef = useRef(null);
  const heroSurfaceRef = useRef(null);
  const uiSurfaceRef = useRef(null);
  const chromeSurfaceRef = useRef(null);
  const secondarySurfaceRef = useRef(null);
  const footerSurfaceRef = useRef(null);
  const surfaceRefs = useMemo(() => ({
    wall: wallSurfaceRef,
    hero: heroSurfaceRef,
    ui: uiSurfaceRef,
    chrome: chromeSurfaceRef,
    secondary: secondarySurfaceRef,
    footer: footerSurfaceRef,
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
    routeRuntime,
    routeView,
    transitionCurrentRoute,
  } = useShellRouteTransition({
    getRouteView,
    getRouteRuntime,
    surfaceRefs,
  });
  const isStandaloneRoute = routeView.layout === 'standalone';
  const routeRuntimeActive = !isStandaloneRoute && routeView.legacyRuntime !== false;
  const routeRuntimeId = routeView.runtimeRouteId || routeState.route.id;
  const isDailyFocusRoute = isDailyFocusRouteRequest(
    routeState.route.id,
    getSearchFromHref(routeState.canonicalHref),
  );

  useSiteHaptics({ routeId: routeState.route.id });

  useLayoutEffect(() => {
    if (isStandaloneRoute) return undefined;
    let cancelled = false;
    syncSharedShellRuntimeState()
      .then(() => {
        if (!cancelled) {
          applyLayoutCSSVars();
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
    const nextTitle = PAGE_TITLE_BY_ROUTE_ID[routeState.route.id];
    if (nextTitle && document.title !== nextTitle) {
      document.title = nextTitle;
    }
  }, [routeState.route.id]);

  useLayoutEffect(() => {
    markDirectShellRouteReady(routeState.route.id, isStandaloneRoute, {
      deferBootState: isDailyFocusRoute,
    });
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
      <BodyClassManager className={routeView.bodyClass} htmlClassName={routeView.htmlClassName} />
      {isStandaloneRoute ? (
        routeView.mainContent
      ) : (
        <SimulationFocusProvider
          routeId={routeState.route.id}
          surfaceRouteId={routeView.surfaceRouteId || routeState.route.id}
          transitionCurrentRoute={transitionCurrentRoute}
        >
          <StudioShell
            activeRouteId={activeRouteId}
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
            simulationFocusControls={<SimulationFocusSwitcher />}
            simulationFocusModal={<SimulationFocusChooser />}
            surfaceRefs={surfaceRefs}
          />
        </SimulationFocusProvider>
      )}
    </>
  );
}
