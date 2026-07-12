import { useEffect, useState } from 'react';
import homeContent from 'virtual:abs-content/home';

/**
 * SiteFooter – shared footer + edge caption for home, portfolio, and CV.
 * Rendered by StudioShell as the shared site footer.
 */

const SOCIAL_ICON_BY_KEY = Object.freeze({
  appleMusic: 'ti-brand-apple',
  linkedin: 'ti-brand-linkedin',
});
const SOCIAL_LINKS = Object.entries(homeContent.socials.items)
  .filter(([key, item]) => SOCIAL_ICON_BY_KEY[key] && item?.url)
  .map(([key, item]) => ({
    href: item.url,
    label: item.ariaLabel || item.screenReaderText || key,
    screenReaderText: item.screenReaderText || item.ariaLabel || key,
    icon: SOCIAL_ICON_BY_KEY[key],
  }));
const EDGE_CAPTION = [homeContent.edge.tagline, homeContent.edge.copyright]
  .filter(Boolean)
  .join(' ');
const LONDON_TIME_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
});

function getLondonTime() {
  return LONDON_TIME_FORMAT.format(new Date()).toUpperCase();
}

export function SiteFooter({ variant = 'standard' }) {
  const showsEdgeCaption = variant !== 'portfolio';
  const [londonTime, setLondonTime] = useState(getLondonTime);

  useEffect(() => {
    const update = () => setLondonTime(getLondonTime());
    update();
    const intervalId = window.setInterval(update, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

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
              aria-label={homeContent.socials.ariaLabel}
            >
              {SOCIAL_LINKS.map(({ href, label, screenReaderText, icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer_icon-link w-inline-block abs-icon-btn"
                  aria-label={label}
                >
                  <i className={`ti ${icon}`} aria-hidden="true" />
                  <span className="screen-reader">{screenReaderText}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="ui-meta-right">
            <div
              id="site-year"
              className="caption meta-caption abs-meta-btn"
              aria-label="London local time"
            >
              <span className="meta-stack">
                <span className="meta-location">
                  <strong className="location-name">London</strong>
                  <span className="meta-separator" aria-hidden="true">·</span>
                </span>
                <time id="time-display">{londonTime}</time>
              </span>
            </div>
          </div>
        </div>
      </footer>
      {showsEdgeCaption ? (
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
            {EDGE_CAPTION}
          </span>
        </div>
      ) : null}
    </>
  );
}
