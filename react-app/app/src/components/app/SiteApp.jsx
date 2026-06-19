import { useEffect, useMemo, useRef } from 'react';
import { BodyClassManager } from '../layout/BodyClassManager.jsx';
import { StudioShell } from './StudioShell.jsx';
import { getHomeRouteView, HOME_ROUTE_RUNTIME } from '../../routes/home/HomeRoute.jsx';
import { getPortfolioRouteView, PORTFOLIO_ROUTE_RUNTIME } from '../../routes/portfolio/PortfolioRoute.jsx';
import { getCvRouteView, CV_ROUTE_RUNTIME } from '../../routes/cv/CvRoute.jsx';
import { getStyleguideRouteView, STYLEGUIDE_ROUTE_RUNTIME } from '../../routes/styleguide/StyleguideRoute.jsx';
import { getPaletteLabRouteView, PALETTE_LAB_ROUTE_RUNTIME } from '../../routes/palette-lab/PaletteLabRoute.jsx';
import { getBeachBallRoomRouteView, BEACH_BALL_ROOM_ROUTE_RUNTIME } from '../../routes/beach-ball-room/BeachBallRoomRoute.jsx';
import { getFlockOfBirdsRouteView, FLOCK_OF_BIRDS_ROUTE_RUNTIME } from '../../routes/flock-of-birds/FlockOfBirdsRoute.jsx';
import { getRainPrismRouteView, RAIN_PRISM_ROUTE_RUNTIME } from '../../routes/rain-prism/RainPrismRoute.jsx';
import { getWallRepelRouteView, WALL_REPEL_ROUTE_RUNTIME } from '../../routes/wall-repel/WallRepelRoute.jsx';
import { useLegacyRouteRuntime } from '../../hooks/useLegacyRouteRuntime.js';
import { useShellRouteTransition } from '../../hooks/useShellRouteTransition.js';
import { DevConfigPanelBridge } from './DevConfigPanelBridge.jsx';

const ROUTE_VIEW_BY_ID = {
  home: getHomeRouteView,
  portfolio: getPortfolioRouteView,
  cv: getCvRouteView,
  styleguide: getStyleguideRouteView,
  'palette-lab': getPaletteLabRouteView,
  'beach-ball-room': getBeachBallRoomRouteView,
  'flock-of-birds': getFlockOfBirdsRouteView,
  'rain-prism': getRainPrismRouteView,
  'wall-repel': getWallRepelRouteView
};

const ROUTE_RUNTIME_BY_ID = {
  home: HOME_ROUTE_RUNTIME,
  portfolio: PORTFOLIO_ROUTE_RUNTIME,
  cv: CV_ROUTE_RUNTIME,
  styleguide: STYLEGUIDE_ROUTE_RUNTIME,
  'palette-lab': PALETTE_LAB_ROUTE_RUNTIME,
  'beach-ball-room': BEACH_BALL_ROOM_ROUTE_RUNTIME,
  'flock-of-birds': FLOCK_OF_BIRDS_ROUTE_RUNTIME,
  'rain-prism': RAIN_PRISM_ROUTE_RUNTIME,
  'wall-repel': WALL_REPEL_ROUTE_RUNTIME
};

function getRouteViewForId(routeId) {
  return (ROUTE_VIEW_BY_ID[routeId] || ROUTE_VIEW_BY_ID.home)();
}

function getRouteRuntimeForId(routeId) {
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

export function SiteApp() {
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

  const { routeState, routeRuntime, routeView } = useShellRouteTransition({
    getRouteView: getRouteViewForId,
    getRouteRuntime: getRouteRuntimeForId,
    surfaceRefs,
  });

  useLegacyRouteRuntime({
    active: true,
    loadModule: routeRuntime.loadModule,
    exportName: routeRuntime.exportName,
    routeId: routeState.route.id
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
      <DevConfigPanelBridge />
      <BodyClassManager className={routeView.bodyClass} />
      <StudioShell
        routeRenderKey={routeState.route.id}
        wallClassName={routeView.wallClassName}
        wallContent={routeView.wallContent}
        headerContent={routeView.headerContent}
        mainContent={routeView.mainContent}
        heroTitle={routeView.heroTitle}
        surfaceRefs={surfaceRefs}
      />
    </>
  );
}
