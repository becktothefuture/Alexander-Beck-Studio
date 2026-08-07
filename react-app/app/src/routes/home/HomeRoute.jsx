import homeContent from 'virtual:abs-content/home';
import { HOME_IDENTITY } from '../../lib/home-identity.js';
import { trySpaNavigate } from '../../lib/spa-navigation.js';
import { getAtmosphereLabVariant } from '../atmosphere-lab/atmosphereLabRoutes.js';

const loadHomeRouteModule = () => import('../../legacy/main.js');

export const HOME_ROUTE_RUNTIME = {
  exportName: 'bootstrapHomePage',
  loadModule: loadHomeRouteModule,
  prewarm: async ({ signal } = {}) => {
    const routeModule = await loadHomeRouteModule();
    return routeModule.prewarmHomeRoute?.({ signal });
  },
};

function renderLegendItem(item) {
  return (
    <button
      key={item.label}
      type="button"
      className="w-layout-hflex legend__item"
      data-tooltip={item.tooltip}
      data-route-enter="legend"
      aria-pressed="false"
      aria-controls="legend-details-status"
    >
      <div className={`circle ${item.colorClass}`} aria-hidden="true" />
      <span>{item.label}</span>
    </button>
  );
}

export function getHomeRouteView(canonicalHref = '') {
  const atmospherePathname = typeof window === 'undefined'
    ? canonicalHref
    : new URL(canonicalHref || window.location.href, window.location.origin).pathname;
  const atmosphereVariant = getAtmosphereLabVariant(atmospherePathname);
  const philosophyLink = homeContent.philosophy.link;
  const handleContactClick = (event) => {
    if (
      event.defaultPrevented
      || event.button !== 0
      || event.metaKey
      || event.altKey
      || event.ctrlKey
      || event.shiftKey
    ) {
      return;
    }
    event.preventDefault();
    if (!trySpaNavigate('/contact.html')) {
      window.location.assign('/contact.html');
    }
  };

  return {
    bodyClass: atmosphereVariant ? `body atmosphere-lab-page atmosphere-lab-page--${atmosphereVariant}` : 'body',
    mainLandmarkHeadingId: 'hero-title',
    contentRenderKey: 'home-shell',
    showFooter: true,
    studioWindowClassName: 'ball-simulation w-embed',
    simulationLayer: (
      <canvas id="c" className="ball-canvas-layer" aria-label="Bouncy balls" role="img" draggable="false" />
    ),
    heroLayer: (
      <h1
        id="hero-title"
        className="hero-title hero-title--canvas-source"
        data-canvas-title-source="home"
        data-route-focus-target
        tabIndex={-1}
        aria-label={HOME_IDENTITY.ariaLabel}
      >
        <span className="hero-title__name" data-route-enter="identity" data-route-enter-order="0" data-route-enter-variant="bookend-title">{HOME_IDENTITY.name}</span>
        {HOME_IDENTITY.roleLines.map((line, index) => (
          <span
            key={line}
            className="hero-title__role"
            data-route-enter="identity"
            data-route-enter-order={index + 1}
            data-route-enter-variant="bookend-title"
          >
            {line}
          </span>
        ))}
      </h1>
    ),
    uiLayer: {
      chrome: (
        <header className="ui-top">
          <div className="ui-top-main">
            <div className="ui-top-left">
              <nav id="expertise-legend" className="legend" aria-label={homeContent.legend.ariaLabel}>
                {homeContent.legend.items.map(renderLegendItem)}
              </nav>
              <div id="legend-tooltip-output" className="legend-tooltip-output" aria-hidden="true" />
              <div
                id="legend-details-status"
                className="screen-reader"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              />
            </div>

            <div className="ui-top-right">
              <blockquote className="decorative-script" data-route-enter="context">
                <p>
                  <span className="home-philosophy-copy home-philosophy-copy--full">
                    {homeContent.philosophy.textBeforeLink}
                  </span>
                  <span className="home-philosophy-copy home-philosophy-copy--mobile">
                    {homeContent.philosophy.mobileTextBeforeLink || homeContent.philosophy.textBeforeLink}
                  </span>
                  {' '}
                  <a
                    id="contact-route-inline"
                    className="home-philosophy-link"
                    href="/contact.html"
                    onClick={handleContactClick}
                  >
                    {philosophyLink.text}
                  </a>
                </p>
              </blockquote>
            </div>
          </div>

          <div id="top-elements-soundRow" className="ui-top-soundRow" />
        </header>
      ),
      secondary: null,
    }
  };
}
