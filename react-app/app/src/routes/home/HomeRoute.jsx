import homeContent from 'virtual:abs-content/home';
import { MainNavLink } from '../../components/MainNavLink.jsx';
import { buildRouteHref } from '../../lib/routes.js';

export const HOME_ROUTE_RUNTIME = {
  exportName: 'bootstrapHomePage',
  loadModule: () => import('../../legacy/main.js')
};

function renderLegendItem(item) {
  return (
    <div key={item.label} className="w-layout-hflex legend__item" data-tooltip={item.tooltip}>
      <div className={`circle ${item.colorClass}`} aria-hidden="true" />
      <span>{item.label}</span>
    </div>
  );
}

export function getHomeRouteView() {
  const footerLinks = homeContent.footer.links;
  const philosophyLink = homeContent.philosophy.link;
  const contactHref = buildRouteHref('contact');

  return {
    bodyClass: 'body',
    contentRenderKey: 'home-shell',
    wallClassName: 'ball-simulation w-embed',
    simulationLayer: (
      <canvas id="c" className="ball-canvas-layer" aria-label="Bouncy balls" role="img" draggable="false" />
    ),
    heroLayer: (
      <h1
        id="hero-title"
        className="hero-title hero-title--canvas-source"
        data-canvas-title-source="home"
        aria-label="Alexander Beck. Creative. Technologist."
      >
        <span className="hero-title__name">Alexander Beck.</span>
        <span className="hero-title__role">Creative. Technologist.</span>
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
              <blockquote className="decorative-script">
                <p>
                  {homeContent.philosophy.textBeforeLink}
                  {' '}
                  <a id={philosophyLink.id} href={contactHref}>
                    {philosophyLink.text}
                  </a>
                </p>
              </blockquote>
              <div id="sound-toggle-slot" />
            </div>
          </div>

          <div id="top-elements-soundRow" className="ui-top-soundRow" />
        </header>
      ),
      secondary: (
        <>
          <main className="ui-center">
          </main>

          <nav id="main-links" className="ui-nav-row ui-main-nav" aria-label={homeContent.footer.navAriaLabel}>
            <a
              id={footerLinks.contact.id}
              href={contactHref}
              className="footer_link"
            >
              <span className="footer-link-nowrap">{footerLinks.contact.text}</span>
            </a>
            <MainNavLink id={footerLinks.portfolio.id}>{footerLinks.portfolio.text}</MainNavLink>
            <MainNavLink id={footerLinks.cv.id}>{footerLinks.cv.text}</MainNavLink>
          </nav>
        </>
      )
    }
  };
}
