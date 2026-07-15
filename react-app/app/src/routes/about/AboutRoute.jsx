import { AboutNarrativeLabExperience } from '../about-narrative-lab/AboutNarrativeLabExperience.jsx';

export const ABOUT_ROUTE_RUNTIME = {
  legacyRuntime: false,
};

export function getAboutRouteView() {
  return {
    bodyClass: 'body about-page about-narrative-page',
    legacyRuntime: false,
    surfaceRouteId: 'about',
    routeRenderKey: 'about',
    contentRenderKey: 'about',
    studioWindowClassName: 'about-simulation route-page-window w-embed',
    simulationLayer: (
      <AboutNarrativeLabExperience
        routeContentId="about"
        showIndicator
      />
    ),
    uiLayer: {
      chrome: null,
      secondary: null,
    },
  };
}
