import { lazy, Suspense } from 'react';
import { AboutNarrativeLoadingFrame } from './AboutNarrativeLoadingFrame.jsx';

let aboutExperiencePromise = null;

function loadAboutNarrativeExperience() {
  if (!aboutExperiencePromise) {
    aboutExperiencePromise = import('../about-simple/AboutSimpleExperience.jsx')
      .then((module) => ({ default: module.AboutSimpleExperience }))
      .catch((error) => {
        aboutExperiencePromise = null;
        throw error;
      });
  }
  return aboutExperiencePromise;
}

const AboutExperience = lazy(loadAboutNarrativeExperience);

export const ABOUT_ROUTE_RUNTIME = {
  legacyRuntime: false,
  prewarm: ({ stage } = {}) => {
    if (stage === 'data') return true;
    return loadAboutNarrativeExperience();
  },
};

export function getAboutRouteView() {
  return {
    bodyClass: 'body about-page about-narrative-page',
    mainLandmarkHeadingId: 'about-route-title',
    legacyRuntime: false,
    surfaceRouteId: 'about',
    routeRenderKey: 'about-narrative',
    contentRenderKey: 'about-narrative',
    studioWindowClassName: 'about-simulation route-page-window w-embed',
    simulationLayer: (
      <Suspense fallback={<AboutNarrativeLoadingFrame />}>
        <AboutExperience
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
