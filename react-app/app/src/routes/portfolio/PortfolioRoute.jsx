import homeContent from 'virtual:abs-content/home';
import { PortfolioGateRoute } from './PortfolioGateRoute.jsx';

const loadPortfolioRouteModule = () => import('../../legacy/modules/portfolio/app.js');

export const PORTFOLIO_ROUTE_RUNTIME = {
  exportName: 'bootstrapPortfolio',
  loadModule: () => loadPortfolioRouteModule().then(async (module) => {
    await module.preloadPortfolioRoute?.();
    return module;
  }),
  prewarm: async ({ signal, priority } = {}) => {
    const module = await loadPortfolioRouteModule();
    if (signal?.aborted) throw new DOMException('Portfolio prewarm aborted.', 'AbortError');
    const includeMedia = priority !== 'data';
    const ready = await module.preloadPortfolioRoute?.({
      signal,
      includeMedia,
      waitForMedia: includeMedia,
    });
    if (ready === false) throw new Error('Portfolio prewarm failed.');
    return module;
  },
};

export function getPortfolioRouteView(canonicalHref, routeState = {}) {
  void canonicalHref;
  void routeState;

  const portfolioBlurb = homeContent.portfolio?.blurb
    || 'Projects from early concepts to shipped websites, apps, tools, and platforms.';
  const portfolioHeroEyebrow = homeContent.portfolio?.heroEyebrow || 'Alexander Beck';
  const portfolioHeroLines = Array.isArray(homeContent.portfolio?.heroLines)
    ? homeContent.portfolio.heroLines
    : [
        'Selected Work'
      ];
  const portfolioHeroAria = [portfolioHeroEyebrow, ...portfolioHeroLines].filter(Boolean).join(' ');
  const portfolioHeroSecondary = portfolioHeroLines[1] || '';

  return {
    bodyClass: 'body portfolio-page',
    studioWindowClassName: 'portfolio-simulation w-embed',
    windowOverlayContent: <PortfolioGateRoute />,
    simulationLayer: (
      <div className="portfolio-slider-layer">
        <canvas
          className="portfolio-speed-field-canvas"
          aria-hidden="true"
          draggable="false"
        />
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
    uiLayer: {
      chrome: (
        <header className="ui-top" data-portfolio-ui>
            <div className="ui-top-main route-topbar portfolio-topbar">
            <div className="route-topbar__left" aria-hidden="true" />
            <div className="route-topbar__center" aria-hidden="true" />
            <div className="route-topbar__right ui-top-right" aria-hidden="true" />
          </div>

          <div id="top-elements-soundRow" className="ui-top-soundRow" />
        </header>
      ),
      secondary: (
        <>
          <div className="portfolio-route-title-ui">
            <h2
              id="hero-title"
              className="hero-title hero-title--portfolio"
              aria-label={portfolioHeroAria}
            >
              <span className="hero-title__eyebrow" data-route-enter="identity" data-route-enter-order="0">{portfolioHeroEyebrow}</span>
              <span className="hero-title__line" data-route-enter="identity" data-route-enter-order="1">{portfolioHeroLines[0]}</span>
              {portfolioHeroSecondary ? (
                <span className="hero-title__line hero-title__line--secondary" data-route-enter="identity" data-route-enter-order="2">{portfolioHeroSecondary}</span>
              ) : null}
            </h2>
          </div>
          <main className="ui-center-spacer" aria-hidden="true" />
        </>
      )
    }
  };
}
