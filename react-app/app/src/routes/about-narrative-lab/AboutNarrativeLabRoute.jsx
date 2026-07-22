import { lazy, Suspense } from 'react';

const AboutNarrativeLabExperience = lazy(() => (
  import('./AboutNarrativeLabExperience.jsx')
    .then((module) => ({ default: module.AboutNarrativeLabExperience }))
));

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
    simulationLayer: (
      <Suspense fallback={null}>
        <AboutNarrativeLabExperience />
      </Suspense>
    ),
    uiLayer: {
      chrome: null,
      secondary: null,
    },
  };
}
