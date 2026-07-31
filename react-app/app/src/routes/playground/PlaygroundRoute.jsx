import { PlaygroundExperience } from './PlaygroundExperience.jsx';
import { loadPlaygroundContent } from './media/playgroundContent.js';
import { loadDesignSystemConfig } from '../../legacy/modules/utils/design-config.js';

export const PLAYGROUND_ROUTE_RUNTIME = {
  legacyRuntime: false,
  prewarm: ({ signal } = {}) => Promise.all([
    loadPlaygroundContent({ signal }),
    loadDesignSystemConfig(),
  ]),
};

export function getPlaygroundRouteView(canonicalHref, routeState = {}) {
  return {
    bodyClass: 'body playground-page',
    mainLandmarkHeadingId: 'playground-route-title',
    legacyRuntime: false,
    surfaceRouteId: 'playground',
    routeRenderKey: 'playground',
    contentRenderKey: 'playground',
    studioWindowClassName: 'playground-simulation playground-route-window route-page-window w-embed',
    simulationLayer: (
      <PlaygroundExperience
        canonicalHref={canonicalHref}
        routeState={routeState}
      />
    ),
    uiLayer: {
      chrome: null,
      secondary: null,
    },
  };
}
