import { AboutNarrativeLabExperience } from '../about-narrative-lab/AboutNarrativeLabExperience.jsx';

export const ABOUT_ROUTE_RUNTIME = {
  legacyRuntime: false,
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
      <AboutNarrativeLabExperience
        routeContentId="about"
        showIndicator
      />
    ),
    uiLayer: {
      chrome: null,
      secondary: null,
    },
  };
}
