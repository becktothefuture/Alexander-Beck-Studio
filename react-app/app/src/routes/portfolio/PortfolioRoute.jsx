import { MainNavLink } from '../../components/MainNavLink.jsx';
import homeContent from '../../../public/config/contents-home.json';
export const PORTFOLIO_ROUTE_RUNTIME = {
  exportName: 'bootstrapPortfolio',
  loadModule: () => import('../../legacy/modules/portfolio/app.js')
};

export function getPortfolioRouteView() {
  const aboutLink = homeContent.footer.links.cv;
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
        <div className="ui-top-main route-topbar portfolio-topbar">
          <div className="route-topbar__left">
            <a
              href="index.html"
              className="gate-back abs-icon-btn"
              data-nav-transition
              data-transition
              aria-label="Back to home"
            >
              <i className="ti ti-arrow-left" aria-hidden="true" />
            </a>
          </div>
          <nav className="route-topbar__center portfolio-topnav ui-main-nav" aria-label="Portfolio navigation">
            <MainNavLink id={aboutLink.id} aria-haspopup="dialog">
              {aboutLink.text}
            </MainNavLink>
            <MainNavLink id={contactLink.id} aria-haspopup="dialog">
              {contactLink.text}
            </MainNavLink>
          </nav>
          <div className="route-topbar__right ui-top-right">
            <div id="sound-toggle-slot" className="portfolio-sound-slot" />
          </div>
        </div>

        <div id="top-elements-soundRow" className="ui-top-soundRow" />
      </header>
    ),
    mainContent: <main className="ui-center-spacer" aria-hidden="true" />
  };
}
