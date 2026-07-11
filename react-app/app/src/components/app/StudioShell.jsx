import { SiteFooter } from '../SiteFooter.jsx';
import { ShellButtonBar } from './ShellButtonBar.jsx';
import { trySpaNavigate } from '../../lib/spa-navigation.js';

function RouteSceneMount({ routeRenderKey, children }) {
  switch (routeRenderKey) {
    case 'portfolio':
      return <div data-sfid="sfid:shell/portfolio">{children}</div>;
    case 'contact':
      return <div data-sfid="sfid:shell/contact">{children}</div>;
    case 'about':
      return <div data-sfid="sfid:shell/about">{children}</div>;
    case 'styleguide':
      return <div data-sfid="sfid:shell/styleguide">{children}</div>;
    case 'simulations':
      return <div data-sfid="sfid:shell/simulations">{children}</div>;
    case 'palette-lab':
      return <div data-sfid="sfid:shell/palette-lab">{children}</div>;
    case 'beach-ball-room':
      return <div data-sfid="sfid:shell/beach-ball-room">{children}</div>;
    case 'flock-of-birds':
      return <div data-sfid="sfid:shell/flock-of-birds">{children}</div>;
    case 'repel-room':
      return <div data-sfid="sfid:shell/repel-room">{children}</div>;
    case 'mineral-growth':
      return <div data-sfid="sfid:shell/mineral-growth">{children}</div>;
    case 'aperture-bloom':
      return <div data-sfid="sfid:shell/aperture-bloom">{children}</div>;
    case 'confluence-bridges':
      return <div data-sfid="sfid:shell/confluence-bridges">{children}</div>;
    case 'napoleon-point-cloud':
      return <div data-sfid="sfid:shell/napoleon-point-cloud">{children}</div>;
    case 'spatial-scan':
      return <div data-sfid="sfid:shell/spatial-scan">{children}</div>;
    case 'home':
    default:
      return <div data-sfid="sfid:shell/home">{children}</div>;
  }
}

function normalizeRouteUiLayer(uiLayer, headerContent, mainContent) {
  const isStructuredLayer = uiLayer
    && typeof uiLayer === 'object'
    && !Array.isArray(uiLayer)
    && (
      Object.prototype.hasOwnProperty.call(uiLayer, 'chrome')
      || Object.prototype.hasOwnProperty.call(uiLayer, 'secondary')
    );

  if (isStructuredLayer) {
    return {
      chrome: uiLayer.chrome ?? null,
      secondary: uiLayer.secondary ?? null,
    };
  }

  if (uiLayer !== undefined) {
    return {
      chrome: uiLayer,
      secondary: null,
    };
  }

  return {
    chrome: headerContent,
    secondary: mainContent,
  };
}

export function StudioShell({
  activeRouteId,
  routeRenderKey,
  contentRenderKey = routeRenderKey,
  studioWindowClassName,
  wallClassName,
  simulationLayer,
  studioWindowContent,
  wallContent,
  heroLayer,
  uiLayer,
  headerContent,
  mainContent,
  heroTitle,
  simulationFocusControls,
  simulationFocusModal,
  surfaceRefs,
}) {
  const routeWindowClassName = studioWindowClassName ?? wallClassName;
  const windowLayerClassName = ['studio-window-layer', 'simulation-wall-layer', routeWindowClassName].filter(Boolean).join(' ');
  const routeSimulationLayer = simulationLayer ?? studioWindowContent ?? wallContent;
  const routeHeroLayer = heroLayer ?? heroTitle;
  const routeUiLayer = normalizeRouteUiLayer(uiLayer, headerContent, mainContent);

  return (
    <>
      <RouteSceneMount routeRenderKey={routeRenderKey}>
        <div id="abs-scene" className="app-scene abs-scene">
          <div id="simulations" className={windowLayerClassName}>
            <div id="scene-effects" className="scene-effects" aria-hidden="true">
              <div className="noise" />
            </div>
            <div className="inner-wall-gradient-edge" aria-hidden="true" />
            <div
              id="shell-wall-slot"
              ref={surfaceRefs?.wall}
              className="studio-window-slot shell-wall-slot shell-transition-surface shell-transition-surface--wall"
            >
              <div key={`window-${routeRenderKey}`} className="studio-window-route-root shell-wall-route-root route-simulation-layer">
                {routeSimulationLayer}
              </div>
            </div>
            <div
              id="shell-hero-slot"
              ref={surfaceRefs?.hero}
              className="shell-hero-slot shell-transition-surface shell-transition-surface--hero"
            >
              <div className="shell-hero-surface">
                {routeHeroLayer}
              </div>
            </div>
            {simulationFocusControls}
          </div>
          <div className="frame-vignette" aria-hidden="true" />
          <div className="simulation-contrast-veil" aria-hidden="true" />

          <div
            ref={surfaceRefs?.ui}
            className="fade-content page-content ui-layer"
          >
            <div id="app-frame" className="ui-layer-wrapper">
                <div
                  id="shell-route-slot"
                  className="shell-route-slot"
                >
                  <div key={`content-${contentRenderKey}`} className="shell-route-content-root route-ui-layer">
                    <div
                      ref={surfaceRefs?.chrome}
                      className="shell-transition-surface shell-transition-surface--chrome"
                    >
                      {routeUiLayer.chrome}
                    </div>
                    <div
                      ref={surfaceRefs?.secondary}
                      className="shell-transition-surface shell-transition-surface--secondary"
                    >
                      {routeUiLayer.secondary}
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
          <ShellButtonBar
            activeRouteId={activeRouteId || routeRenderKey}
            onRouteNavigate={(href, tab, options) => trySpaNavigate(href, options)}
          />
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

      <div id="modal-blur-layer" className="modal-layer modal-blur-layer" aria-hidden="true" />

      <div id="modal-content-layer" className="modal-layer modal-content-layer" aria-hidden="true">
        <div id="modal-modal-host" className="modal-modal-host">
          {simulationFocusModal}
        </div>
      </div>
    </>
  );
}
