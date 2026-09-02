import { lazy, Suspense } from 'react';
import { AboutNarrativeLoadingFrame } from './AboutNarrativeLoadingFrame.jsx';

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
