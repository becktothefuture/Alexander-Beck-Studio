import homeContent from 'virtual:abs-content/home';
import { MainNavLink } from '../../components/MainNavLink.jsx';

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
  const aboutMeLabel = 'About Me';

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
    heroTitle: (
      <h1 id="hero-title" className="hero-title" aria-label="Alexander Beck — Creative Technologist">
        <span className="hero-title__name">Alexander Beck</span>
        <span className="hero-title__role">Creative Technologist</span>
      </h1>
    ),
    mainContent: (
      <>
        <main className="ui-center">
        </main>

        <nav id="main-links" className="ui-nav-row ui-main-nav" aria-label={homeContent.footer.navAriaLabel}>
          <MainNavLink id={footerLinks.contact.id}>{footerLinks.contact.text}</MainNavLink>
          <MainNavLink id={footerLinks.portfolio.id}>{footerLinks.portfolio.text}</MainNavLink>
          <MainNavLink id={footerLinks.cv.id}>{aboutMeLabel}</MainNavLink>
        </nav>
      </>
    )
  };
}
