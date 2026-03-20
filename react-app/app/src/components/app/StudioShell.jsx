import { SiteFooter } from '../SiteFooter.jsx';

function renderDigitInputs(prefix, className, ariaPrefix) {
  return Array.from({ length: 4 }, (_, index) => (
    <input
      key={`${prefix}-${index}`}
      type="text"
      maxLength="1"
      className={className}
      inputMode="numeric"
      pattern="[0-9]"
      data-index={index}
      aria-label={`${ariaPrefix} digit ${index + 1} of 4`}
      autoComplete="off"
    />
  ));
}

export function StudioShell({
  routeRenderKey,
  wallClassName,
  wallContent,
  headerContent,
  mainContent
}) {
  return (
    <>
      <div id="abs-scene" className="abs-scene">
        <div id="bravia-balls" className={wallClassName}>
          <div id="scene-effects" className="scene-effects" aria-hidden="true">
            <div className="noise" />
          </div>
          <div id="shell-wall-slot" className="shell-wall-slot">
            <div key={`wall-${routeRenderKey}`} className="shell-wall-route-root">
              {wallContent}
            </div>
          </div>
        </div>
        <div className="frame-vignette" aria-hidden="true" />

        <div className="fade-content page-content">
          <div id="app-frame" className="ui-layer-wrapper">
            <div
              id="shell-route-slot"
              className="shell-route-slot"
            >
              <div key={`content-${routeRenderKey}`} className="shell-route-content-root">
                {headerContent}
                {mainContent}
              </div>
            </div>
            <SiteFooter />
          </div>
        </div>

        {/* Portfolio drawer: MUST stack above header/footer — see docs/reference/LAYER-STACKING.md (never mount only inside #bravia-balls). */}
        <div
          id="portfolio-sheet-host"
          className="portfolio-sheet-host"
          aria-hidden="true"
        />

        <div
          id="quote-viewport-host"
          className="quote-viewport-host"
          aria-hidden="true"
        />
      </div>

      <div id="modal-blur-layer" className="modal-blur-layer" aria-hidden="true" />

      <div id="modal-content-layer" className="modal-content-layer" aria-hidden="true">
        <div id="modal-modal-host" className="modal-modal-host">
          <div
            id="contact-modal"
            className="contact-modal hidden"
            aria-hidden="true"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-modal-title"
            aria-describedby="contact-modal-description"
          >
            <div id="contact-modal-label" className="modal-label" />
            <div id="contact-modal-inputs" className="contact-modal-inputs" />
          </div>

          <div
            id="cv-modal"
            className="cv-modal hidden"
            aria-hidden="true"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cv-modal-title"
            aria-describedby="cv-modal-description"
          >
            <div id="cv-modal-label" className="modal-label" />
            <div
              id="cv-modal-inputs"
              className="cv-modal-inputs"
              role="group"
              aria-labelledby="cv-modal-title"
              aria-describedby="cv-modal-description"
            >
              {renderDigitInputs('cv', 'cv-digit', 'CV invite code')}
            </div>
          </div>

          <div
            id="portfolio-modal"
            className="portfolio-modal hidden"
            aria-hidden="true"
            role="dialog"
            aria-modal="true"
            aria-labelledby="portfolio-modal-title"
            aria-describedby="portfolio-modal-description"
          >
            <div id="portfolio-modal-label" className="modal-label" />
            <div
              id="portfolio-modal-inputs"
              className="portfolio-modal-inputs"
              role="group"
              aria-labelledby="portfolio-modal-title"
              aria-describedby="portfolio-modal-description"
            >
              {renderDigitInputs('portfolio', 'portfolio-digit', 'Portfolio invite code')}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
