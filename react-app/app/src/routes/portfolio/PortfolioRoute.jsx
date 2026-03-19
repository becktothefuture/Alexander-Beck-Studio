import homeContent from '../../../public/config/contents-home.json';
export const PORTFOLIO_ROUTE_RUNTIME = {
  exportName: 'bootstrapPortfolio',
  loadModule: () => import('../../legacy/modules/portfolio/app.js')
};

export function getPortfolioRouteView() {
  const portfolioLink = homeContent.footer.links.cv;
  const contactLink = homeContent.footer.links.contact;

  return {
    bodyClass: 'body portfolio-page',
    wallClassName: 'portfolio-simulation w-embed',
    wallContent: (
      <>
        <canvas
          id="c"
          className="portfolio-pit-canvas"
          aria-label="Portfolio projects simulation"
          role="img"
          draggable="false"
        />
        <div id="portfolioProjectMount" className="portfolio-project-mount" aria-live="polite" />
      </>
    ),
    headerContent: (
      <header className="ui-top" data-portfolio-ui>
        <div className="ui-top-main portfolio-topbar">
          <nav className="portfolio-topnav" aria-label="Portfolio navigation">
            <a
              href="index.html"
              className="gate-back abs-icon-btn"
              data-nav-transition
              data-transition
              aria-label="Back to home"
            >
              <i className="ti ti-arrow-left" aria-hidden="true" />
            </a>
            <button id={portfolioLink.id} type="button" className="footer_link" aria-haspopup="dialog">
              {portfolioLink.text}
            </button>
            <button id={contactLink.id} type="button" className="footer_link" aria-haspopup="dialog">
              {contactLink.text}
            </button>
          </nav>
          <div className="ui-top-right">
            <div id="sound-toggle-slot" className="portfolio-sound-slot" />
          </div>
        </div>

        <div id="top-elements-soundRow" className="ui-top-soundRow" />
      </header>
    ),
    mainContent: <main className="ui-center-spacer" aria-hidden="true" />
  };
}
