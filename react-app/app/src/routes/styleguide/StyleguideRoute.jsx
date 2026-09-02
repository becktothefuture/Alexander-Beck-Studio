import { ShellButtonBar } from '../../components/app/ShellButtonBar.jsx';
import { buildRouteHref } from '../../lib/routes.js';
import { StyleguideTypographySection } from './StyleguideTypography.jsx';

export const STYLEGUIDE_ROUTE_RUNTIME = {
  exportName: 'bootstrapStyleguide',
  loadModule: () => import('./styleguide-bootstrap.js'),
};

const homeHref = buildRouteHref('home');

function renderButtonBarSpecimen() {
  return (
    <ShellButtonBar
      activeRouteId="portfolio"
      className="styleguide-button-bar"
      materialVariant="dominant-tab"
      onRouteSelect={() => {}}
      preview
      previewTheme="dark"
      onPreviewThemeChange={() => {}}
    />
  );
}

function renderSoundOnIcon() {
  return (
    <svg className="sound-toggle__icon sound-toggle__icon--on" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 9.25v5.5h3.6l4.6 3.55V5.7L8.6 9.25H5z" />
      <path d="M16.15 8.6c1.4 1.55 1.4 5.25 0 6.8" />
      <path d="M18.75 6.2c2.25 2.65 2.25 8.95 0 11.6" />
    </svg>
  );
}

export function getStyleguideRouteView() {
  return {
    bodyClass: 'body styleguide-page',
    studioWindowClassName: 'styleguide-wall w-embed',
    studioWindowContent: <div className="styleguide-backdrop" aria-hidden="true" />,
    headerContent: (
      <header className="ui-top">
        <div className="ui-top-main route-topbar">
          <div className="route-topbar__left">
            <a href={homeHref} className="gate-back abs-icon-btn abs-circular-utility" aria-label="Back to home">
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
            The persistent Button Bar owns primary navigation. Route top bars are optional utility strips; icon actions use{' '}
            <code className="styleguide-doc__code">.abs-icon-btn</code>. Use the concise About label.
          </p>

          <StyleguideTypographySection />

          <section className="styleguide-section" aria-labelledby="sg-button-bar">
            <h2 id="sg-button-bar">Button Bar navigation</h2>
            <p className="styleguide-section__hint">
              The production component keeps five icon-and-label routes in one group. One shared active key moves between them; theme and sound live in the separate global Utility Rail.
            </p>
            {renderButtonBarSpecimen()}
          </section>

          <section className="styleguide-section" aria-labelledby="sg-route-topbar">
            <h2 id="sg-route-topbar">Route utility top bar</h2>
            <p className="styleguide-section__hint">
              Use only when a route needs a back or utility action. Primary route switching remains in the Button Bar.
            </p>
            <div className="styleguide-topbar-frame">
              <header className="ui-top">
                <div className="ui-top-main route-topbar">
                  <div className="route-topbar__left">
                    <span className="gate-back abs-icon-btn abs-circular-utility styleguide-fake-icon" aria-hidden="true">
                      <i className="ti ti-arrow-left" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="route-topbar__center" aria-hidden="true" />
                  <div className="route-topbar__right ui-top-right">
                    <button type="button" className="sound-toggle abs-icon-btn" aria-label="Sample sound on" data-enabled="true" aria-pressed="true" disabled>
                      {renderSoundOnIcon()}
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
              <button type="button" className="sound-toggle abs-icon-btn" aria-label="Sample sound on" data-enabled="true" aria-pressed="true" disabled>
                {renderSoundOnIcon()}
              </button>
              <a href={homeHref} className="gate-back abs-icon-btn abs-circular-utility" aria-label="Sample back">
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
            <h2 id="sg-script">Supporting description copy</h2>
            <blockquote className="decorative-script styleguide-script-demo">
              <p>
                Sample philosophy line with a{' '}
                <a href={homeHref}>text link</a>.
              </p>
            </blockquote>
          </section>

          <section className="styleguide-section" aria-labelledby="sg-meta">
            <h2 id="sg-meta">Meta / time chip</h2>
            <div className="styleguide-sample-row styleguide-meta-demo">
              <div
                id="site-year"
                className="caption meta-caption abs-meta-btn"
                aria-label="London local time, 12:00 PM"
              >
                <span className="meta-stack">
                  <span className="location-name">
                    London<span className="location-punctuation" aria-hidden="true">,</span>
                  </span>
                  <time id="time-display">12:00:00 PM</time>
                </span>
              </div>
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
