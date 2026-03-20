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
    || 'A few projects that show how I work in practice: define the system, test the interaction, and stay close to the build.';
  const portfolioHeroLines = Array.isArray(homeContent.portfolio?.heroLines)
    ? homeContent.portfolio.heroLines
    : [
        'I understand the levers that shape behaviour: design strategy, human psychology, and aesthetic principles.',
        'Then I turn that into digital direction teams can align around and experiences people can feel their way through.'
      ];

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
        aria-label={portfolioHeroLines.join(' ')}
      >
        <span className="hero-title__line">{portfolioHeroLines[0]}</span>
        <span className="hero-title__line hero-title__line--secondary">{portfolioHeroLines[1]}</span>
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
