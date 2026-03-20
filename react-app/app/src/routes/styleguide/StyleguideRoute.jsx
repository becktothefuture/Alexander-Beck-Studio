import { MainNavLink } from '../../components/MainNavLink.jsx';
import { buildRouteHref } from '../../lib/routes.js';
import { StyleguideTypographySection } from './StyleguideTypography.jsx';

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
            Primary chrome: text actions via <code className="styleguide-doc__code">MainNavLink</code> (renders{' '}
            <code className="styleguide-doc__code">.footer_link</code> inside <code className="styleguide-doc__code">.ui-main-nav</code>),
            and icon actions via <code className="styleguide-doc__code">.abs-icon-btn</code>. Do not add alternate text-button classes.
          </p>

          <StyleguideTypographySection />

          <section className="styleguide-section" aria-labelledby="sg-main-nav">
            <h2 id="sg-main-nav">Main navigation text buttons</h2>
            <p className="styleguide-section__hint">
              <code className="styleguide-doc__code">ui-main-nav</code> on the nav +{' '}
              <code className="styleguide-doc__code">MainNavLink</code> (renders <code className="styleguide-doc__code">footer_link</code> + label span).
            </p>
            <nav className="ui-main-nav styleguide-sample-row" aria-label="Sample main nav">
              <MainNavLink>Contact</MainNavLink>
              <MainNavLink>Portfolio</MainNavLink>
              <MainNavLink>About me</MainNavLink>
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
                <div className="ui-top-main route-topbar portfolio-topbar">
                  <div className="route-topbar__left">
                    <span className="gate-back abs-icon-btn styleguide-fake-icon" aria-hidden="true">
                      <i className="ti ti-arrow-left" aria-hidden="true" />
                    </span>
                  </div>
                  <nav className="route-topbar__center portfolio-topnav ui-main-nav" aria-label="Sample route top nav">
                    <MainNavLink>About me</MainNavLink>
                    <MainNavLink>Contact</MainNavLink>
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

          <section className="styleguide-section" aria-labelledby="sg-text-stack">
            <h2 id="sg-text-stack">Text buttons (stacked layout)</h2>
            <p className="styleguide-section__hint">
              Same component as the horizontal strip — <code className="styleguide-doc__code">MainNavLink</code> +{' '}
              <code className="styleguide-doc__code">nav.ui-main-nav</code>. Use a column wrapper class for demos or tight columns; do not use a different button class.
            </p>
            <nav
              className="ui-main-nav styleguide-main-nav--stack"
              aria-label="Sample stacked text buttons"
            >
              <MainNavLink>Portfolio</MainNavLink>
              <MainNavLink>Contact</MainNavLink>
            </nav>
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
