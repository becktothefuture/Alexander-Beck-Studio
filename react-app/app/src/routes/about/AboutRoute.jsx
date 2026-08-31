import { lazy, Suspense } from 'react';
import { AboutComingSoon } from './AboutComingSoon.jsx';
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

function isAboutPreviewRequested(canonicalHref = '') {
  if (import.meta.env.DEV) return true;
  if (typeof window !== 'undefined') {
    return new URLSearchParams(window.location.search).get('preview') === 'about';
  }

  try {
    const url = new URL(canonicalHref, 'https://beck.fyi');
    return url.searchParams.get('preview') === 'about';
  } catch {
    return false;
  }
}

export const ABOUT_ROUTE_RUNTIME = {
  legacyRuntime: false,
  prewarm: ({ stage } = {}) => {
    if (!import.meta.env.DEV) return true;
    if (stage === 'data') return true;
    return loadAboutNarrativeExperience();
  },
};

export function getAboutRouteView(canonicalHref) {
  if (!isAboutPreviewRequested(canonicalHref)) {
    return {
      bodyClass: 'body about-page',
      mainLandmarkHeadingId: 'about-coming-soon-title',
      legacyRuntime: false,
      surfaceRouteId: 'about',
      routeRenderKey: 'about-coming-soon',
      contentRenderKey: 'about-coming-soon',
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
