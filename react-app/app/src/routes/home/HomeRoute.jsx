import homeContent from '../../../public/config/contents-home.json';
import { BRAND_LOGO_SVG } from '../shared/brandLogo.js';

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

  return {
    bodyClass: 'body',
    wallClassName: 'ball-simulation w-embed',
    wallContent: (
      <canvas id="c" aria-label="Bouncy balls" role="img" draggable="false" />
    ),
    headerContent: (
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
                <a id={philosophyLink.id} href={philosophyLink.href}>
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
    mainContent: (
      <>
        <main className="ui-center">
          <div
            id="brand-logo"
            className="brand-logo-layer brand-logo-in-grid"
            dangerouslySetInnerHTML={{ __html: BRAND_LOGO_SVG }}
          />
        </main>

        <nav id="main-links" className="ui-nav-row ui-main-nav" aria-label={homeContent.footer.navAriaLabel}>
          <button id={footerLinks.contact.id} type="button" className="footer_link">
            {footerLinks.contact.text}
          </button>
          <button id={footerLinks.portfolio.id} type="button" className="footer_link">
            {footerLinks.portfolio.text}
          </button>
          <button id={footerLinks.cv.id} type="button" className="footer_link">
            {footerLinks.cv.text}
          </button>
        </nav>
      </>
    )
  };
}
