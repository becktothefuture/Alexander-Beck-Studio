import { AboutNarrativeLabExperience } from './AboutNarrativeLabExperience.jsx';

export const ABOUT_NARRATIVE_LAB_ROUTE_RUNTIME = {
  legacyRuntime: false,
};

export function getAboutNarrativeLabRouteView() {
  return {
    bodyClass: 'body about-narrative-lab-page about-narrative-page',
    legacyRuntime: false,
    navigationRouteId: 'about',
    surfaceRouteId: 'about',
    routeRenderKey: 'about-narrative-lab',
    contentRenderKey: 'about-narrative-lab',
    studioWindowClassName: 'about-narrative-lab-window route-page-window w-embed',
    simulationLayer: <AboutNarrativeLabExperience />,
    uiLayer: {
      chrome: null,
      secondary: null,
    },
  };
}
