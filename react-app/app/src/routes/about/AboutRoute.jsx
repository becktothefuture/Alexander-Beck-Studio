import { lazy, Suspense } from 'react';
import { AboutNarrativeLoadingFrame } from './AboutNarrativeLoadingFrame.jsx';
import { AboutComingSoon } from './AboutComingSoon.jsx';

let aboutNarrativeExperiencePromise = null;

function loadAboutNarrativeExperience() {
  if (!import.meta.env.DEV) return Promise.resolve();
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

const AboutNarrativeExperience = import.meta.env.DEV ? lazy(loadAboutNarrativeExperience) : null;

export const ABOUT_ROUTE_RUNTIME = {
  legacyRuntime: false,
  prewarm: ({ stage } = {}) => {
    if (!import.meta.env.DEV) return Promise.resolve();
    if (stage === 'data') return true;
    return loadAboutNarrativeExperience();
  },
};

export function getAboutRouteView() {
  // Like Work, publication is decided at build time. No URL or storage bypass.
  if (!import.meta.env.DEV) {
    return {
      bodyClass: 'body about-page',
      mainLandmarkHeadingId: 'about-coming-soon-title',
      legacyRuntime: false,
      surfaceRouteId: 'about',
      routeRenderKey: 'about',
      contentRenderKey: 'about-coming-soon',
      studioWindowClassName: 'about-simulation route-page-window w-embed',
      simulationLayer: null,
      uiLayer: { chrome: null, secondary: <AboutComingSoon /> },
    };
  }
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
