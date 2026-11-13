import { lazy, Suspense } from 'react';
import { AboutNarrativeLoadingFrame } from './AboutNarrativeLoadingFrame.jsx';
import { PortfolioGateRoute } from '../portfolio/PortfolioGateRoute.jsx';

let aboutNarrativeExperiencePromise = null;
let aboutPhysicsPrewarmPromise = null;

function prewarmAboutPhysics() {
  if (!aboutPhysicsPrewarmPromise) {
    aboutPhysicsPrewarmPromise = import('../about-game-board/boardRigidBodyWorld.js')
      .then((module) => module.loadBoardRigidBodyBackend())
      .catch((error) => {
        aboutPhysicsPrewarmPromise = null;
        throw error;
      });
  }
  return aboutPhysicsPrewarmPromise;
}

function loadAboutNarrativeExperience() {
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

function loadAboutNarrativeForRender() {
  const experience = loadAboutNarrativeExperience();
  void prewarmAboutPhysics().catch(() => {});
  return experience;
}

const AboutNarrativeExperience = lazy(loadAboutNarrativeForRender);

export const ABOUT_ROUTE_RUNTIME = {
  legacyRuntime: false,
  prewarm: ({ stage, reason } = {}) => {
    if (stage === 'data') return true;
    const experience = loadAboutNarrativeExperience();
    if (reason === 'idle') return experience;
    return Promise.all([experience, prewarmAboutPhysics()]);
  },
};

export function getAboutRouteView() {
  return {
    bodyClass: 'body about-page about-narrative-page',
    mainLandmarkHeadingId: 'about-route-title',
    legacyRuntime: false,
    surfaceRouteId: 'about',
    routeRenderKey: 'about',
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
