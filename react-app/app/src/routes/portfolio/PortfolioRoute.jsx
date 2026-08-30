import { lazy, Suspense } from 'react';
import { loadDesignSystemConfig } from '../../legacy/modules/utils/design-config.js';
import { PortfolioGateRoute } from './PortfolioGateRoute.jsx';
import { PortfolioComingSoon } from './PortfolioComingSoon.jsx';
import { loadWorkCatalog } from './work/workCatalog.js';

const WorkExperience = import.meta.env.DEV ? lazy(() => (
  import('../playground/PlaygroundExperience.jsx')
    .then((module) => ({ default: module.PlaygroundExperience }))
)) : null;

export const PORTFOLIO_ROUTE_RUNTIME = {
  legacyRuntime: false,
  prewarm: ({ signal } = {}) => {
    if (!import.meta.env.DEV) return Promise.resolve();
    return Promise.all([
      loadWorkCatalog({ signal }),
      loadDesignSystemConfig(),
    ]);
  },
};

export function getPortfolioRouteView(canonicalHref, routeState = {}) {
  // Publication is a build-time decision. URLs, access grants, and browser
  // storage must never reveal the development canvas in a production build.
  if (!import.meta.env.DEV) {
    return {
      bodyClass: 'body portfolio-page',
      mainLandmarkHeadingId: 'portfolio-coming-soon-title',
      legacyRuntime: false,
      surfaceRouteId: 'portfolio',
      routeRenderKey: 'portfolio',
      contentRenderKey: 'portfolio-coming-soon',
      studioWindowClassName: 'portfolio-simulation route-page-window w-embed',
      simulationLayer: null,
      uiLayer: { chrome: null, secondary: <PortfolioComingSoon /> },
    };
  }

  return {
    bodyClass: 'body portfolio-page work-canvas-page',
    mainLandmarkHeadingId: 'playground-route-title',
    legacyRuntime: false,
    surfaceRouteId: 'portfolio',
    routeRenderKey: 'portfolio',
    contentRenderKey: 'portfolio-work-canvas',
    studioWindowClassName: 'playground-simulation work-canvas-window route-page-window w-embed',
    windowOverlayContent: <PortfolioGateRoute />,
    simulationLayer: (
      <Suspense fallback={null}>
        <WorkExperience
          canonicalHref={canonicalHref}
          routeState={routeState}
          experience="work"
        />
      </Suspense>
    ),
    uiLayer: {
      chrome: null,
      secondary: null,
    },
  };
}
