import { useEffect, useState } from 'react';
import homeContent from 'virtual:abs-content/home';

/**
 * SiteFooter – Home-only footer and edge caption.
 * StudioShell keeps the footer surface stable but mounts this content only for Home.
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

function LondonClock() {
  const [londonTime, setLondonTime] = useState(getLondonTime);
  const hasTwoDigitHour = /^\d{2}:/.test(londonTime);

  useEffect(() => {
    const update = () => setLondonTime(getLondonTime());
    update();
    const intervalId = window.setInterval(update, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <time
      id="time-display"
      className={hasTwoDigitHour ? 'time-display--wide' : undefined}
    >
      {londonTime}
    </time>
  );
}

export function SiteFooter() {
  return (
    <>
      <footer className="ui-bottom home-footer">
        <div className="ui-meta-row">
          <div className="ui-meta-left">
            <div
              id="social-links"
              className="footer_icon-group"
              role="group"
              aria-label={homeContent.socials.ariaLabel}
            >
              {SOCIAL_LINKS.map(({ href, label, screenReaderText, icon }, index) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer_icon-link w-inline-block abs-icon-btn abs-circular-utility"
                  aria-label={label}
                  data-route-enter="footer"
                  data-route-enter-order={index}
                  data-sound-action="press"
                  data-sound-source={`footer-social-${label.toLowerCase().replaceAll(' ', '-')}`}
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
              data-route-enter="footer"
              data-route-enter-order="2"
            >
              <span className="meta-stack">
                <span className="meta-location">
                  <strong
                    className="location-name location-name--ldn-26"
                    aria-hidden="true"
                  />
                  <span className="meta-separator" aria-hidden="true">·</span>
                </span>
                <LondonClock />
              </span>
            </div>
          </div>
        </div>
      </footer>
      <div
        id="edge-caption"
        className="edge-caption"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-route-enter="footer"
        data-route-enter-order="3"
      >
        <span
          id="edge-caption-tagline"
          className="edge-caption__line edge-caption__line--tagline"
        >
          {EDGE_CAPTION}
        </span>
      </div>
    </>
  );
}
