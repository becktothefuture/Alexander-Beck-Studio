import { buildRouteHref } from '../../lib/routes.js';

export const STYLEGUIDE_ROUTE_RUNTIME = {
  exportName: 'bootstrapStyleguide',
  loadModule: () => import('./styleguide-bootstrap.js'),
};

const homeHref = buildRouteHref('home');

export function getStyleguideRouteView() {
  return {
    bodyClass: 'body styleguide-page',
    wallClassName: 'styleguide-wall w-embed',
    wallContent: <div className="styleguide-backdrop" aria-hidden="true" />,
    headerContent: (
      <header className="ui-top">
        <div className="ui-top-main route-topbar">
          <div className="route-topbar__left">
            <a href={homeHref} className="gate-back abs-icon-btn" aria-label="Back to home">
              <i className="ti ti-arrow-left" aria-hidden="true" />
            </a>
          </div>
          <div className="route-topbar__center" />
          <div className="route-topbar__right ui-top-right" />
        </div>
      </header>
    ),
    mainContent: (
      <main className="ui-center-spacer styleguide-main" aria-label="Component library">
        <div className="styleguide-doc">
          <h1 className="styleguide-doc__title">Component library</h1>
          <p className="styleguide-doc__lede">
            Canonical patterns used across the site. Prefer these over one-off duplicates. Master main actions use{' '}
            <code className="styleguide-doc__code">.ui-main-nav .footer_link</code> (same as home{' '}
            <code className="styleguide-doc__code">#main-links</code>).
          </p>

          <section className="styleguide-section" aria-labelledby="sg-main-nav">
            <h2 id="sg-main-nav">Main navigation text buttons</h2>
            <p className="styleguide-section__hint">Class <code className="styleguide-doc__code">ui-main-nav</code> on the nav + <code className="styleguide-doc__code">footer_link</code> on each control.</p>
            <nav className="ui-main-nav styleguide-sample-row" aria-label="Sample main nav">
              <button type="button" className="footer_link">
                Contact
              </button>
              <button type="button" className="footer_link">
                Portfolio
              </button>
              <button type="button" className="footer_link">
                About me
              </button>
            </nav>
          </section>

          <section className="styleguide-section" aria-labelledby="sg-route-topbar">
            <h2 id="sg-route-topbar">Route top bar (full strip — canonical)</h2>
            <p className="styleguide-section__hint">
              Same contract as portfolio/CV: treat this like the footer—copy the structure, do not restyle. Optional inset: portfolio uses{' '}
              <code className="styleguide-doc__code">--portfolio-nav-top</code> on top of <code className="styleguide-doc__code">--gap-xs</code>.
            </p>
            <div className="styleguide-topbar-frame">
              <header className="ui-top">
                <div className="ui-top-main route-topbar">
                  <div className="route-topbar__left">
                    <span className="gate-back abs-icon-btn styleguide-fake-icon" aria-hidden="true">
                      <i className="ti ti-arrow-left" aria-hidden="true" />
                    </span>
                  </div>
                  <nav className="route-topbar__center ui-main-nav" aria-label="Sample route top nav">
                    <button type="button" className="footer_link">
                      About me
                    </button>
                    <button type="button" className="footer_link">
                      Contact
                    </button>
                  </nav>
                  <div className="route-topbar__right ui-top-right">
                    <button type="button" className="sound-toggle abs-icon-btn" aria-label="Sample mute" disabled>
                      <i className="ti ti-volume-off" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </header>
            </div>
          </section>

          <section className="styleguide-section" aria-labelledby="sg-icon">
            <h2 id="sg-icon">Icon frame buttons</h2>
            <p className="styleguide-section__hint">
              <code className="styleguide-doc__code">.abs-icon-btn</code> — sound toggle, gate back, socials.
            </p>
            <div className="styleguide-sample-row">
              <button type="button" className="sound-toggle abs-icon-btn" aria-label="Sample mute" disabled>
                <i className="ti ti-volume-off" aria-hidden="true" />
              </button>
              <a href={homeHref} className="gate-back abs-icon-btn" aria-label="Sample back">
                <i className="ti ti-arrow-left" aria-hidden="true" />
              </a>
            </div>
          </section>

          <section className="styleguide-section" aria-labelledby="sg-legend">
            <h2 id="sg-legend">Expertise legend row</h2>
            <nav className="legend styleguide-legend-demo" aria-label="Sample legend">
              <div className="legend__item">
                <div className="circle bg-ball-1" aria-hidden="true" />
                <span>Strategy</span>
              </div>
              <div className="legend__item">
                <div className="circle bg-ball-2" aria-hidden="true" />
                <span>Product</span>
              </div>
              <div className="legend__item">
                <div className="circle bg-ball-3" aria-hidden="true" />
                <span>Motion</span>
              </div>
            </nav>
          </section>

          <section className="styleguide-section" aria-labelledby="sg-script">
            <h2 id="sg-script">Decorative script (intro blurb)</h2>
            <blockquote className="decorative-script styleguide-script-demo">
              <p>
                Sample philosophy line with a{' '}
                <a href={homeHref}>text link</a>.
              </p>
            </blockquote>
          </section>

          <section className="styleguide-section" aria-labelledby="sg-cv-link">
            <h2 id="sg-cv-link">CV sidebar / stacked text links</h2>
            <p className="styleguide-section__hint">
              <code className="styleguide-doc__code">.portfolio-cv-link</code> where a slimmer text control is needed (e.g. CV column). Top route bars use <code className="styleguide-doc__code">footer_link</code> instead.
            </p>
            <div className="styleguide-sample-col">
              <button type="button" className="portfolio-cv-link">
                Portfolio
              </button>
              <button type="button" className="portfolio-cv-link">
                Contact
              </button>
            </div>
          </section>

          <section className="styleguide-section" aria-labelledby="sg-meta">
            <h2 id="sg-meta">Meta / time chip</h2>
            <div className="styleguide-sample-row styleguide-meta-demo">
              <button type="button" className="abs-meta-btn" disabled>
                London · 12:00
              </button>
            </div>
          </section>

          <p className="styleguide-doc__footer">
            Source: <code className="styleguide-doc__code">docs/reference/COMPONENT-LIBRARY.md</code>
          </p>
        </div>
      </main>
    ),
  };
}
