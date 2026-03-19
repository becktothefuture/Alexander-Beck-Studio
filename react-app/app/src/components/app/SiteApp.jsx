import { BodyClassManager } from '../layout/BodyClassManager.jsx';
import { StudioShell } from './StudioShell.jsx';
import { getHomeRouteView, HOME_ROUTE_RUNTIME } from '../../routes/home/HomeRoute.jsx';
import { getPortfolioRouteView, PORTFOLIO_ROUTE_RUNTIME } from '../../routes/portfolio/PortfolioRoute.jsx';
import { getCvRouteView, CV_ROUTE_RUNTIME } from '../../routes/cv/CvRoute.jsx';
import { getStyleguideRouteView, STYLEGUIDE_ROUTE_RUNTIME } from '../../routes/styleguide/StyleguideRoute.jsx';
import { useLegacyRouteRuntime } from '../../hooks/useLegacyRouteRuntime.js';
import { useShellRouteTransition } from '../../hooks/useShellRouteTransition.js';
import { DevConfigPanelBridge } from './DevConfigPanelBridge.jsx';

const ROUTE_VIEW_BY_ID = {
  home: getHomeRouteView,
  portfolio: getPortfolioRouteView,
  cv: getCvRouteView,
  styleguide: getStyleguideRouteView
};

const ROUTE_RUNTIME_BY_ID = {
  home: HOME_ROUTE_RUNTIME,
  portfolio: PORTFOLIO_ROUTE_RUNTIME,
  cv: CV_ROUTE_RUNTIME,
  styleguide: STYLEGUIDE_ROUTE_RUNTIME
};

function getRouteViewForId(routeId) {
  return (ROUTE_VIEW_BY_ID[routeId] || ROUTE_VIEW_BY_ID.home)();
}

function getRouteRuntimeForId(routeId) {
  return ROUTE_RUNTIME_BY_ID[routeId] || ROUTE_RUNTIME_BY_ID.home;
}

export function SiteApp() {
  const {
    routeState,
    routeRuntime,
    routeView,
    wallSlotTransitionClassName,
    contentSlotTransitionClassName
  } = useShellRouteTransition({
    getRouteView: getRouteViewForId,
    getRouteRuntime: getRouteRuntimeForId
  });

  useLegacyRouteRuntime({
    active: true,
    loadModule: routeRuntime.loadModule,
    exportName: routeRuntime.exportName,
    routeId: routeState.route.id
  });

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
        wallSlotTransitionClassName={wallSlotTransitionClassName}
        contentSlotTransitionClassName={contentSlotTransitionClassName}
      />
    </>
  );
}
