import homeContent from 'virtual:abs-content/home';
import { HOME_IDENTITY } from '../../lib/home-identity.js';
import { trySpaNavigate } from '../../lib/spa-navigation.js';

export const HOME_ROUTE_RUNTIME = {
  exportName: 'bootstrapHomePage',
  loadModule: () => import('../../legacy/main.js')
};

function renderLegendItem(item) {
  return (
    <div key={item.label} className="w-layout-hflex legend__item" data-tooltip={item.tooltip} data-route-enter="legend">
      <div className={`circle ${item.colorClass}`} aria-hidden="true" />
      <span>{item.label}</span>
    </div>
  );
}

export function getHomeRouteView() {
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
    bodyClass: 'body',
    contentRenderKey: 'home-shell',
    studioWindowClassName: 'ball-simulation w-embed',
    simulationLayer: (
      <canvas id="c" className="ball-canvas-layer" aria-label="Bouncy balls" role="img" draggable="false" />
    ),
    heroLayer: (
      <h1
        id="hero-title"
        className="hero-title hero-title--canvas-source"
        data-canvas-title-source="home"
        aria-label={HOME_IDENTITY.ariaLabel}
      >
        <span className="hero-title__name" data-route-enter="identity" data-route-enter-order="0">{HOME_IDENTITY.name}</span>
        <span className="hero-title__role" data-route-enter="identity" data-route-enter-order="1">{HOME_IDENTITY.role}</span>
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
      secondary: (
        <>
          <main className="ui-center">
          </main>
        </>
      )
    }
  };
}
