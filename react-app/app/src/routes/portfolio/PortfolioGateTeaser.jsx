import { withBasePath } from '../../lib/base-path.js';
import { useRenderedThemeIsDark } from '../../hooks/useRenderedTheme.js';

const PREVIEW_ROOT = '/images/portfolio/gate-preview';

export function PortfolioGateTeaser() {
  const theme = useRenderedThemeIsDark() ? 'dark' : 'light';
  const previewUrl = (viewport) => withBasePath(`${PREVIEW_ROOT}/portfolio-gate-${viewport}-${theme}.jpg`);

  return (
    <div
      className="portfolio-gate-teaser"
      data-portfolio-gate-teaser
      data-portfolio-gate-theme={theme}
      aria-hidden="true"
      inert=""
    >
      <picture className="portfolio-gate-teaser__picture">
        <source
          media="(max-width: 600px)"
          srcSet={previewUrl('mobile')}
        />
        <source
          media="(max-width: 899px)"
          srcSet={previewUrl('tablet')}
        />
        <img
          className="portfolio-gate-teaser__image"
          src={previewUrl('desktop')}
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
