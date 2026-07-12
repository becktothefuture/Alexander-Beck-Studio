export function PortfolioGateScene() {
  return (
    <div
      className="portfolio-gate-scene"
      data-portfolio-gate-scene
      aria-hidden="true"
      inert=""
    >
      <div className="portfolio-gate-scene__field" />
      <p className="portfolio-gate-scene__intercept">Ah, ah, ah. You didn&apos;t say the magic word.</p>
      <div className="portfolio-gate-scene__deck">
        <div className="portfolio-gate-scene__card portfolio-gate-scene__card--far-left">
          <span className="portfolio-gate-scene__card-art" />
        </div>
        <div className="portfolio-gate-scene__card portfolio-gate-scene__card--left">
          <span className="portfolio-gate-scene__card-art" />
        </div>
        <div className="portfolio-gate-scene__card portfolio-gate-scene__card--center">
          <span className="portfolio-gate-scene__card-art" />
        </div>
        <div className="portfolio-gate-scene__card portfolio-gate-scene__card--right">
          <span className="portfolio-gate-scene__card-art" />
        </div>
        <div className="portfolio-gate-scene__card portfolio-gate-scene__card--far-right">
          <span className="portfolio-gate-scene__card-art" />
        </div>
      </div>
      <div className="portfolio-gate-scene__dot-dial">
        {Array.from({ length: 13 }, (_, index) => (
          <span key={`portfolio-gate-dot-${index}`} className="portfolio-gate-scene__dot" />
        ))}
      </div>
    </div>
  );
}
