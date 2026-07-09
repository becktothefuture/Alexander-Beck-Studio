import homeContent from 'virtual:abs-content/home';
export const PORTFOLIO_ROUTE_RUNTIME = {
  exportName: 'bootstrapPortfolio',
  loadModule: () => import('../../legacy/modules/portfolio/app.js')
};

export function getPortfolioRouteView() {
  const portfolioBlurb = homeContent.portfolio?.blurb
    || 'A curated selection of product projects across several industries—finance, mobility, digital ventures, and more. Each case shows how I partner with teams to clarify the proposition, shape the interaction, and carry the work through to what actually ships.';
  const portfolioHeroEyebrow = homeContent.portfolio?.heroEyebrow || 'Alexander Beck';
  const portfolioHeroLines = Array.isArray(homeContent.portfolio?.heroLines)
    ? homeContent.portfolio.heroLines
    : [
        'I design digital experiences around human response.'
      ];
  const portfolioHeroAria = [portfolioHeroEyebrow, ...portfolioHeroLines].filter(Boolean).join(' ');
  const portfolioHeroSecondary = portfolioHeroLines[1] || '';

  return {
    bodyClass: 'body portfolio-page',
    wallClassName: 'portfolio-simulation w-embed',
    simulationLayer: (
      <div className="portfolio-slider-layer">
        <canvas
          id="c"
          className="portfolio-pit-canvas portfolio-scroll-canvas"
          aria-hidden="true"
          draggable="false"
        />
        <div
          id="portfolioProjectMount"
          className="portfolio-project-mount portfolio-deck-mount"
          aria-label="Portfolio projects"
          data-intro-title={portfolioHeroLines[0]}
          data-intro-body={portfolioBlurb}
        />
      </div>
    ),
    heroLayer: (
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
    uiLayer: {
      chrome: (
        <header className="ui-top" data-portfolio-ui>
          <div className="ui-top-main route-topbar portfolio-topbar">
            <div className="route-topbar__left">
              <a
                href="index.html"
                className="gate-back abs-icon-btn"
                data-nav-transition
                aria-label="Back to home"
              >
                <i className="ti ti-arrow-left" aria-hidden="true" />
              </a>
            </div>
            <div className="route-topbar__center" aria-hidden="true" />
            <div className="route-topbar__right ui-top-right">
              <div id="sound-toggle-slot" className="portfolio-sound-slot" />
            </div>
          </div>

          <div id="top-elements-soundRow" className="ui-top-soundRow" />
        </header>
      ),
      secondary: <main className="ui-center-spacer" aria-hidden="true" />
    }
  };
}
