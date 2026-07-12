export function PortfolioGateScene() {
  return (
    <div
      className="portfolio-gate-scene"
      data-portfolio-gate-scene
      aria-hidden="true"
      inert=""
    >
      <div className="portfolio-gate-scene__field" />
      <div className="portfolio-gate-scene__intro">
        <span className="portfolio-gate-scene__intro-line portfolio-gate-scene__intro-line--long" />
        <span className="portfolio-gate-scene__intro-line portfolio-gate-scene__intro-line--short" />
      </div>
      <div className="portfolio-gate-scene__deck">
        <div className="portfolio-gate-scene__card portfolio-gate-scene__card--far-left">
          <span className="portfolio-gate-scene__card-art" />
          <span className="portfolio-gate-scene__card-copy">
            <i className="portfolio-gate-scene__eyebrow" />
            <i className="portfolio-gate-scene__line portfolio-gate-scene__line--short" />
            <i className="portfolio-gate-scene__line" />
          </span>
        </div>
        <div className="portfolio-gate-scene__card portfolio-gate-scene__card--left">
          <span className="portfolio-gate-scene__card-art" />
          <span className="portfolio-gate-scene__card-copy">
            <i className="portfolio-gate-scene__eyebrow" />
            <i className="portfolio-gate-scene__line portfolio-gate-scene__line--short" />
            <i className="portfolio-gate-scene__line" />
          </span>
        </div>
        <div className="portfolio-gate-scene__card portfolio-gate-scene__card--center">
          <span className="portfolio-gate-scene__card-art" />
          <span className="portfolio-gate-scene__card-copy">
            <i className="portfolio-gate-scene__eyebrow" />
            <i className="portfolio-gate-scene__line" />
            <i className="portfolio-gate-scene__line portfolio-gate-scene__line--medium" />
          </span>
        </div>
        <div className="portfolio-gate-scene__card portfolio-gate-scene__card--right">
          <span className="portfolio-gate-scene__card-art" />
          <span className="portfolio-gate-scene__card-copy">
            <i className="portfolio-gate-scene__eyebrow" />
            <i className="portfolio-gate-scene__line portfolio-gate-scene__line--medium" />
            <i className="portfolio-gate-scene__line" />
          </span>
        </div>
        <div className="portfolio-gate-scene__card portfolio-gate-scene__card--far-right">
          <span className="portfolio-gate-scene__card-art" />
          <span className="portfolio-gate-scene__card-copy">
            <i className="portfolio-gate-scene__eyebrow" />
            <i className="portfolio-gate-scene__line portfolio-gate-scene__line--medium" />
            <i className="portfolio-gate-scene__line" />
          </span>
        </div>
      </div>
      <div className="portfolio-gate-scene__dot-dial">
        {Array.from({ length: 13 }, (_, index) => (
          <span key={`portfolio-gate-dot-${index}`} className="portfolio-gate-scene__dot" />
        ))}
      </div>
      <p className="portfolio-gate-scene__easter-egg">Cheeky. You found the scenery, not the work.</p>
    </div>
  );
}
