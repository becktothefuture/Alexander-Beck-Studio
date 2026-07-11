import { withBasePath } from '../../lib/base-path.js';

const PREVIEW_ROOT = '/images/portfolio/gate-preview';

export function PortfolioGateTeaser() {
  return (
    <div
      className="portfolio-gate-teaser"
      data-portfolio-gate-teaser
      aria-hidden="true"
      inert=""
    >
      <picture className="portfolio-gate-teaser__picture">
        <source
          media="(max-width: 600px)"
          srcSet={withBasePath(`${PREVIEW_ROOT}/portfolio-gate-mobile.jpg`)}
        />
        <source
          media="(max-width: 899px)"
          srcSet={withBasePath(`${PREVIEW_ROOT}/portfolio-gate-tablet.jpg`)}
        />
        <img
          className="portfolio-gate-teaser__image"
          src={withBasePath(`${PREVIEW_ROOT}/portfolio-gate-desktop.jpg`)}
          alt=""
          draggable="false"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
      </picture>
    </div>
  );
}
