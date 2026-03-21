import { MainNavLink } from '../../components/MainNavLink.jsx';
import homeContent from '../../../public/config/contents-home.json';
export const PORTFOLIO_ROUTE_RUNTIME = {
  exportName: 'bootstrapPortfolio',
  loadModule: () => import('../../legacy/modules/portfolio/app.js')
};

export function getPortfolioRouteView() {
  const aboutLink = homeContent.footer.links.cv;
  const contactLink = homeContent.footer.links.contact;
  const aboutMeLabel = 'About Me';
  const portfolioBlurb = homeContent.portfolio?.blurb
    || 'A curated selection of product projects across several industries—finance, mobility, digital ventures, and more. Each case shows how I partner with teams to clarify the proposition, shape the interaction, and carry the work through to what actually ships.';
  const portfolioHeroEyebrow = homeContent.portfolio?.heroEyebrow || 'Alexander Beck';
  const portfolioHeroLines = Array.isArray(homeContent.portfolio?.heroLines)
    ? homeContent.portfolio.heroLines
    : [
        'Psychology first: perception, motivation, choice. Structure, interaction, writing, and build until it delivers.'
      ];
  const portfolioHeroAria = [portfolioHeroEyebrow, ...portfolioHeroLines].filter(Boolean).join(' ');
  const portfolioHeroSecondary = portfolioHeroLines[1] || '';

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
    heroTitle: (
      <h2
        id="hero-title"
        className="hero-title hero-title--portfolio"
        aria-label={portfolioHeroAria}
      >
        <span className="hero-title__eyebrow">{portfolioHeroEyebrow}</span>
        <span className="hero-title__line">{portfolioHeroLines[0]}</span>
        {portfolioHeroSecondary ? (
          <span className="hero-title__line hero-title__line--secondary">{portfolioHeroSecondary}</span>
        ) : null}
      </h2>
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
            <nav className="portfolio-topnav ui-main-nav" aria-label="Portfolio navigation">
              <MainNavLink id={aboutLink.id} aria-haspopup="dialog">
                {aboutMeLabel}
              </MainNavLink>
              <MainNavLink id={contactLink.id} aria-haspopup="dialog">
                {contactLink.text}
              </MainNavLink>
            </nav>
          </div>
          <div className="route-topbar__center" aria-hidden="true" />
          <div className="route-topbar__right ui-top-right">
            <blockquote className="decorative-script portfolio-topline">
              <p>{portfolioBlurb}</p>
            </blockquote>
            <div id="sound-toggle-slot" className="portfolio-sound-slot" />
          </div>
        </div>

        <div id="top-elements-soundRow" className="ui-top-soundRow" />
      </header>
    ),
    mainContent: <main className="ui-center-spacer" aria-hidden="true" />
  };
}
