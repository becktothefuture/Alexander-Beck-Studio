import { SiteFooter } from '../SiteFooter.jsx';
import { getGateCodeLength } from '../../lib/access-gates.js';

function RouteSceneMount({ routeRenderKey, children }) {
  switch (routeRenderKey) {
    case 'portfolio':
      return <div data-sfid="sfid:shell/portfolio">{children}</div>;
    case 'cv':
      return <div data-sfid="sfid:shell/cv">{children}</div>;
    case 'styleguide':
      return <div data-sfid="sfid:shell/styleguide">{children}</div>;
    case 'palette-lab':
      return <div data-sfid="sfid:shell/palette-lab">{children}</div>;
    case 'beach-ball-room':
      return <div data-sfid="sfid:shell/beach-ball-room">{children}</div>;
    case 'flock-of-birds':
      return <div data-sfid="sfid:shell/flock-of-birds">{children}</div>;
    case 'rain-prism':
      return <div data-sfid="sfid:shell/rain-prism">{children}</div>;
    case 'wall-repel':
      return <div data-sfid="sfid:shell/wall-repel">{children}</div>;
    case 'mineral-growth':
      return <div data-sfid="sfid:shell/mineral-growth">{children}</div>;
    case 'aperture-bloom':
      return <div data-sfid="sfid:shell/aperture-bloom">{children}</div>;
    case 'pressure-mosaic':
      return <div data-sfid="sfid:shell/pressure-mosaic">{children}</div>;
    case 'napoleon-point-cloud':
      return <div data-sfid="sfid:shell/napoleon-point-cloud">{children}</div>;
    case 'home':
    default:
      return <div data-sfid="sfid:shell/home">{children}</div>;
  }
}

function renderDigitInputs(prefix, className, ariaPrefix, length) {
  return Array.from({ length }, (_, index) => (
    <input
      key={`${prefix}-${index}`}
      type="text"
      maxLength="1"
      className={className}
      inputMode="numeric"
      pattern="[0-9]"
      data-index={index}
      aria-label={`${ariaPrefix} digit ${index + 1} of ${length}`}
      autoComplete="off"
    />
  ));
}

export function StudioShell({
  routeRenderKey,
  wallClassName,
  wallContent,
  headerContent,
  mainContent,
  heroTitle,
  surfaceRefs,
}) {
  return (
    <>
      <RouteSceneMount routeRenderKey={routeRenderKey}>
        <div id="abs-scene" className="abs-scene">
          <div id="simulations" className={wallClassName}>
            <div id="scene-effects" className="scene-effects" aria-hidden="true">
              <div className="noise" />
            </div>
            <div className="inner-wall-gradient-edge" aria-hidden="true" />
            <div
              id="shell-wall-slot"
              ref={surfaceRefs?.wall}
              className="shell-wall-slot shell-transition-surface shell-transition-surface--wall"
            >
              <div key={`wall-${routeRenderKey}`} className="shell-wall-route-root">
                {wallContent}
              </div>
            </div>
            <div
              id="shell-hero-slot"
              ref={surfaceRefs?.hero}
              className="shell-hero-slot shell-transition-surface shell-transition-surface--hero"
            >
              <div className="shell-hero-surface">
                {heroTitle}
              </div>
            </div>
          </div>
          <div className="frame-vignette" aria-hidden="true" />

          <div
            ref={surfaceRefs?.ui}
            className="fade-content page-content"
          >
            <div id="app-frame" className="ui-layer-wrapper">
                <div
                  id="shell-route-slot"
                  className="shell-route-slot"
                >
                  <div key={`content-${routeRenderKey}`} className="shell-route-content-root">
                    <div
                      ref={surfaceRefs?.chrome}
                      className="shell-transition-surface shell-transition-surface--chrome"
                    >
                      {headerContent}
                    </div>
                    <div
                      ref={surfaceRefs?.secondary}
                      className="shell-transition-surface shell-transition-surface--secondary"
                    >
                      {mainContent}
                    </div>
                  </div>
                </div>
                <div
                  ref={surfaceRefs?.footer}
                  className="shell-transition-surface shell-transition-surface--footer"
                >
                  <SiteFooter />
                </div>
              </div>
            </div>
          {/* Portfolio drawer: MUST stack above header/footer — see docs/reference/LAYER-STACKING.md (never mount only inside #simulations). */}
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
      </RouteSceneMount>

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
              {renderDigitInputs('cv', 'cv-digit', 'CV invite code', getGateCodeLength('cv'))}
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
              {renderDigitInputs('portfolio', 'portfolio-digit', 'Portfolio invite code', getGateCodeLength('portfolio'))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
