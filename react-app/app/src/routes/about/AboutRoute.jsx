import { lazy, Suspense } from 'react';

const AboutNarrativeLabExperience = lazy(() => (
  import('../about-narrative-lab/AboutNarrativeLabExperience.jsx')
    .then((module) => ({ default: module.AboutNarrativeLabExperience }))
));

export const ABOUT_ROUTE_RUNTIME = {
  legacyRuntime: false,
  prewarm: () => true,
};

export function getAboutRouteView() {
  if (!import.meta.env.DEV) {
    return {
      bodyClass: 'body about-page',
      legacyRuntime: false,
      surfaceRouteId: 'about',
      routeRenderKey: 'about',
      contentRenderKey: 'about',
      studioWindowClassName: 'about-simulation route-page-window w-embed',
      simulationLayer: null,
      uiLayer: {
        chrome: null,
        secondary: (
          <main className="route-centered-page" data-route-content="about">
            <section className="route-centered-page__inner" aria-labelledby="about-coming-soon-title">
              <h1
                id="about-coming-soon-title"
                className="route-centered-page__title route-bookend-title"
                data-route-enter="identity"
                data-route-enter-order="0"
                data-route-enter-variant="bookend-title"
                data-route-focus-target
                tabIndex={-1}
              >
                Coming soon.
              </h1>
            </section>
          </main>
        ),
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
