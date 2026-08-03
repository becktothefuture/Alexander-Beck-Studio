import { lazy, Suspense } from 'react';
import { AboutComingSoon } from './AboutComingSoon.jsx';

const AboutNarrativeLabExperience = lazy(() => (
  import('../about-narrative-lab/AboutNarrativeLabExperience.jsx')
    .then((module) => ({ default: module.AboutNarrativeLabExperience }))
));

export const ABOUT_ROUTE_RUNTIME = {
  legacyRuntime: false,
  prewarm: () => true,
};

export function getAboutRouteView() {
  if (!import.meta.env.DEV && !__CERTIFY__) {
    return {
      bodyClass: 'body about-page',
      mainLandmarkHeadingId: 'about-coming-soon-title',
      legacyRuntime: false,
      surfaceRouteId: 'about',
      routeRenderKey: 'about',
      contentRenderKey: 'about',
      studioWindowClassName: 'about-simulation route-page-window w-embed',
      simulationLayer: null,
      uiLayer: {
        chrome: null,
        secondary: <AboutComingSoon />,
      },
    };
  }

  return {
    bodyClass: 'body about-page about-narrative-page',
    legacyRuntime: false,
    surfaceRouteId: 'about',
    routeRenderKey: 'about',
    contentRenderKey: 'about',
    studioWindowClassName: 'about-simulation route-page-window w-embed',
    simulationLayer: (
      <Suspense fallback={null}>
        <AboutNarrativeLabExperience
          routeContentId="about"
          showIndicator
        />
      </Suspense>
    ),
    uiLayer: {
      chrome: null,
      secondary: null,
    },
  };
}
