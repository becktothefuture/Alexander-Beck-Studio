import { lazy, Suspense } from 'react';
import { AboutComingSoon } from './AboutComingSoon.jsx';
import { AboutNarrativeLoadingFrame } from './AboutNarrativeLoadingFrame.jsx';
import { PortfolioGateRoute } from '../portfolio/PortfolioGateRoute.jsx';

// A separate local build exercises the complete journey without changing the
// production publication decision or adding a URL/storage bypass.
const FULL_JOURNEY = import.meta.env.DEV || import.meta.env.MODE === 'certification';
let aboutNarrativeExperiencePromise = null;

function loadAboutNarrativeExperience() {
  if (!FULL_JOURNEY) return Promise.resolve();
  if (!aboutNarrativeExperiencePromise) {
    aboutNarrativeExperiencePromise = import('../about-game-board/AboutGameBoardExperience.jsx')
      .then((module) => ({ default: module.AboutGameBoardExperience }))
      .catch((error) => {
        aboutNarrativeExperiencePromise = null;
        throw error;
      });
  }
  return aboutNarrativeExperiencePromise;
}

const AboutNarrativeExperience = FULL_JOURNEY ? lazy(loadAboutNarrativeExperience) : null;

export const ABOUT_ROUTE_RUNTIME = {
  legacyRuntime: false,
  prewarm: ({ stage } = {}) => {
    if (!FULL_JOURNEY) return Promise.resolve();
    if (stage === 'data') return true;
    return loadAboutNarrativeExperience();
  },
};

export function getAboutRouteView() {
  // Like Work, publication is decided at build time. No URL or storage bypass.
  if (!FULL_JOURNEY) {
    return {
      bodyClass: 'body about-page',
      mainLandmarkHeadingId: 'about-coming-soon-title',
      legacyRuntime: false,
      surfaceRouteId: 'about',
      routeRenderKey: 'about',
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
    // The purpose key discards an unfinished Work prompt on a route change.
    windowOverlayContent: <PortfolioGateRoute key="cv" purpose="cv" />,
    simulationLayer: (
      <Suspense fallback={<AboutNarrativeLoadingFrame />}>
        <AboutNarrativeExperience
          routeContentId="about"
        />
      </Suspense>
    ),
    uiLayer: {
      chrome: null,
      secondary: null,
    },
  };
}
