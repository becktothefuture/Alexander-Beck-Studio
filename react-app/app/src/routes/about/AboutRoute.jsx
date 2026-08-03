import { lazy, Suspense } from 'react';
import { AboutComingSoon } from './AboutComingSoon.jsx';

let aboutNarrativeExperiencePromise = null;

function loadAboutNarrativeExperience() {
  if (!aboutNarrativeExperiencePromise) {
    aboutNarrativeExperiencePromise = import('../about-narrative-lab/AboutNarrativeLabExperience.jsx')
      .then((module) => ({ default: module.AboutNarrativeLabExperience }))
      .catch((error) => {
        aboutNarrativeExperiencePromise = null;
        throw error;
      });
  }
  return aboutNarrativeExperiencePromise;
}

const AboutNarrativeExperience = lazy(loadAboutNarrativeExperience);

export const ABOUT_ROUTE_RUNTIME = {
  legacyRuntime: false,
  prewarm: ({ stage } = {}) => {
    if (!import.meta.env.DEV || stage === 'data') return true;
    return loadAboutNarrativeExperience();
  },
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
        <AboutNarrativeExperience
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
