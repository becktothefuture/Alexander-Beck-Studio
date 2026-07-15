export const ABOUT_ROUTE_RUNTIME = {
  legacyRuntime: false,
};

export function getAboutRouteView() {
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
        <div className="route-centered-page about-route" data-route-content="about">
          <section className="route-centered-page__inner" aria-labelledby="about-route-title">
            <p className="route-kicker" data-route-enter="identity" data-route-enter-order="0">About Me</p>
            <h1 id="about-route-title" className="route-centered-page__title" data-route-enter="identity" data-route-enter-order="1">Coming soon</h1>
          </section>
        </div>
      ),
    },
  };
}
