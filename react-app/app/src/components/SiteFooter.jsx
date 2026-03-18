/**
 * SiteFooter – shared footer + edge caption for home, portfolio, and CV.
 * Mounted as a real React component via SharedFrame’s footer slot (createPortal into #footer-mount).
 */

const SOCIAL_LINKS = [
  {
    href: 'https://music.apple.com/profile/beckandeggs',
    label: 'Apple Music',
    icon: 'ti-brand-apple',
  },
  {
    href: 'https://www.linkedin.com/in/thisisbeck/',
    label: 'LinkedIn',
    icon: 'ti-brand-linkedin',
  },
];

const EDGE_TAGLINE = 'BUILT WITH LOVE TO BE SATISFYING.';
const EDGE_COPYRIGHT = '© 2026 Alexander Beck';

export function SiteFooter() {
  return (
    <>
      <footer
        className="ui-bottom portfolio-footer"
        data-portfolio-ui
      >
        <div className="ui-meta-row">
          <div className="ui-meta-left">
            <div
              id="social-links"
              className="footer_icon-group"
              role="group"
              aria-label="Social media links"
            >
              {SOCIAL_LINKS.map(({ href, label, icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer_icon-link w-inline-block abs-icon-btn"
                  aria-label={label}
                >
                  <i className={`ti ${icon}`} aria-hidden="true" />
                  <span className="screen-reader">{label}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="ui-meta-right">
            {/* Sound toggle injected here by legacy JS on home */}
            <button
              id="site-year"
              type="button"
              className="caption abs-meta-btn abs-hover-target abs-hover-target--index"
              aria-label="Toggle theme"
            >
              <span>
                <strong className="location-name">London</strong>
                {' · '}
                <span id="time-display">0:00:00 AM</span>
              </span>
            </button>
          </div>
        </div>
      </footer>
      <div
        id="edge-caption"
        className="edge-caption"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <span
          id="edge-caption-tagline"
          className="edge-caption__line edge-caption__line--tagline"
        >
          {EDGE_TAGLINE}
        </span>
        <span
          id="edge-caption-copyright"
          className="edge-caption__line edge-caption__line--copyright"
        >
          {EDGE_COPYRIGHT}
        </span>
      </div>
    </>
  );
}
