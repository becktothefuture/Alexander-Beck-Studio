import { lazy, Suspense } from 'react';
import { PlaygroundComingSoon } from './PlaygroundComingSoon.jsx';
import { loadPlaygroundContent } from './media/playgroundContent.js';
import { loadDesignSystemConfig } from '../../legacy/modules/utils/design-config.js';

const PlaygroundExperience = lazy(() => (
  import('./PlaygroundExperience.jsx')
    .then((module) => ({ default: module.PlaygroundExperience }))
));

export const PLAYGROUND_ROUTE_RUNTIME = {
  legacyRuntime: false,
  prewarm: ({ signal } = {}) => (
    import.meta.env.DEV
      ? Promise.all([
        loadPlaygroundContent({ signal }),
        loadDesignSystemConfig(),
      ])
      : true
  ),
};

export function getPlaygroundRouteView(canonicalHref, routeState = {}) {
  if (!import.meta.env.DEV) {
    return {
      bodyClass: 'body playground-page',
      mainLandmarkHeadingId: 'playground-coming-soon-title',
      legacyRuntime: false,
      surfaceRouteId: 'playground',
      routeRenderKey: 'playground',
      contentRenderKey: 'playground',
      studioWindowClassName: 'playground-simulation playground-route-window route-page-window w-embed',
      simulationLayer: null,
      uiLayer: {
        chrome: null,
        secondary: <PlaygroundComingSoon />,
      },
    };
  }

  return {
    bodyClass: 'body playground-page',
    mainLandmarkHeadingId: 'playground-route-title',
    legacyRuntime: false,
    surfaceRouteId: 'playground',
    routeRenderKey: 'playground',
    contentRenderKey: 'playground',
    studioWindowClassName: 'playground-simulation playground-route-window route-page-window w-embed',
    simulationLayer: (
      <Suspense fallback={null}>
        <PlaygroundExperience
          canonicalHref={canonicalHref}
          routeState={routeState}
        />
      </Suspense>
    ),
    uiLayer: {
      chrome: null,
      secondary: null,
    },
  };
}
