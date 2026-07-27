import { useLayoutEffect, useRef } from 'react';

import { SiteFooter } from '../SiteFooter.jsx';
import { RouteTransitionLoader } from './RouteTransitionLoader.jsx';
import { ShellButtonBar } from './ShellButtonBar.jsx';
import { ShellWindowOverlay } from './ShellWindowOverlay.jsx';
import { trySpaNavigate } from '../../lib/spa-navigation.js';
import {
  attachSimulationAtmosphereHost,
  setSimulationAtmosphereTransitionState,
} from '../../legacy/modules/rendering/atmosphere/simulation-atmosphere.js';

function disposeRouteDepthTitleCanvas() {
  if (typeof document === 'undefined') return;
  document.getElementById('simulation-front-depth-canvas')?.remove();
  document.getElementById('simulations')?.classList?.remove('simulation-depth-title-layer-active');
}

function RouteSceneMount({ routeRenderKey, children }) {
  switch (routeRenderKey) {
    case 'portfolio':
      return <div data-sfid="sfid:shell/portfolio" data-shell-route-view="portfolio">{children}</div>;
    case 'contact':
      return <div data-sfid="sfid:shell/contact" data-shell-route-view="contact">{children}</div>;
    case 'about':
      return <div data-sfid="sfid:shell/about" data-shell-route-view="about">{children}</div>;
    case 'about-narrative-lab':
      return <div data-sfid="sfid:shell/about-narrative-lab">{children}</div>;
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
      return <div data-sfid="sfid:shell/home" data-shell-route-view={routeRenderKey || 'home'}>{children}</div>;
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
  pendingRouteId,
  transitionPhase = 'idle',
  transitionState,
  atmosphereHostScope = null,
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
  showFooter = false,
  windowOverlayContent,
  simulationFocusControls,
  simulationFocusModal,
  surfaceRefs,
  onRoutePrewarm,
}) {
  const atmosphereGlowCanvasRef = useRef(null);
  const atmosphereEdgeCanvasRef = useRef(null);
  const routeWindowClassName = studioWindowClassName ?? wallClassName;
  const windowLayerClassName = ['studio-window-layer', 'simulation-wall-layer', routeWindowClassName].filter(Boolean).join(' ');
  // Route scenes and optional hero material stay below the shared veil.
  // Visible interface copy and controls belong in uiLayer above it.
  const routeSimulationLayer = simulationLayer ?? studioWindowContent ?? wallContent;
  const routeHeroLayer = heroLayer ?? heroTitle;
  const routeUiLayer = normalizeRouteUiLayer(uiLayer, headerContent, mainContent);

  useLayoutEffect(() => {
    if (!atmosphereHostScope) return undefined;
    try {
      return attachSimulationAtmosphereHost({
        root: document.getElementById('simulations'),
        glowCanvas: atmosphereGlowCanvasRef.current,
        edgeCanvas: atmosphereEdgeCanvasRef.current,
        scope: atmosphereHostScope,
      });
    } catch (error) {
      console.warn('[simulation-atmosphere] Compositor unavailable; preserving crisp route material.', error);
      return undefined;
    }
  }, [atmosphereHostScope]);

  useLayoutEffect(() => {
    setSimulationAtmosphereTransitionState(transitionPhase);
  }, [transitionPhase]);

  useLayoutEffect(() => {
    if (routeRenderKey === 'home') return undefined;

    let firstFrame = 0;
    let secondFrame = 0;
    disposeRouteDepthTitleCanvas();
    firstFrame = window.requestAnimationFrame(() => {
      disposeRouteDepthTitleCanvas();
      secondFrame = window.requestAnimationFrame(disposeRouteDepthTitleCanvas);
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [routeRenderKey]);

  return (
    <>
      <RouteSceneMount routeRenderKey={routeRenderKey}>
        <div id="abs-scene" className="app-scene abs-scene">
          <div
            id="simulations"
            className={windowLayerClassName}
            aria-busy={transitionPhase !== 'idle' ? 'true' : 'false'}
          >
            <div id="scene-effects" className="scene-effects" aria-hidden="true">
              <div className="noise" />
            </div>
            <div className="inner-wall-gradient-edge" aria-hidden="true" />
            <div
              id="shell-wall-slot"
              ref={surfaceRefs?.wall}
              className="studio-window-slot shell-wall-slot shell-transition-surface shell-transition-surface--wall"
              data-route-surface="wall"
            >
              {atmosphereHostScope ? (
                <canvas
                  id="simulation-atmosphere-glow-canvas"
                  ref={atmosphereGlowCanvasRef}
                  className="simulation-atmosphere-glow-canvas"
                  data-atmosphere-layer="glow"
                  data-simulation-snapshot-id="atmosphere-glow"
                  data-simulation-snapshot-order="10"
                  aria-hidden="true"
                />
              ) : null}
              <div
                key={`window-${routeRenderKey}`}
                className="studio-window-route-root shell-wall-route-root route-simulation-layer"
                data-route-view={routeRenderKey}
              >
                {routeSimulationLayer}
              </div>
            </div>
            <div
              id="shell-hero-slot"
              ref={surfaceRefs?.hero}
              className="shell-hero-slot shell-transition-surface shell-transition-surface--hero"
              data-route-surface="hero"
            >
              <div key={`hero-${routeRenderKey}`} className="shell-hero-surface" data-route-view={routeRenderKey}>
                {routeHeroLayer}
              </div>
            </div>
            <div
              ref={surfaceRefs?.controls}
              className="shell-transition-surface shell-transition-surface--controls"
              data-route-surface="controls"
            >
              <div key={`controls-${routeRenderKey}`} data-route-view={routeRenderKey}>
                {simulationFocusControls}
              </div>
            </div>
            {atmosphereHostScope ? (
              <canvas
                id="simulation-atmosphere-edge-light-canvas"
                ref={atmosphereEdgeCanvasRef}
                className="simulation-atmosphere-edge-light-canvas"
                data-atmosphere-layer="edge-light"
                data-simulation-snapshot-id="atmosphere-edge-light"
                data-simulation-snapshot-order="40"
                aria-hidden="true"
              />
            ) : null}
          </div>
          <div id="simulation-transaction-snapshot-host" aria-hidden="true" />
          <div className="frame-vignette" aria-hidden="true" />
          <div className="simulation-contrast-veil" aria-hidden="true" />

          <RouteTransitionLoader
            transitionState={transitionState || {
              phase: transitionPhase,
              pendingRouteId,
            }}
          />

          <div
            ref={surfaceRefs?.ui}
            className="fade-content page-content ui-layer"
            data-route-surface="ui"
            aria-busy={transitionPhase !== 'idle' ? 'true' : 'false'}
          >
            <div id="app-frame" className="ui-layer-wrapper">
                <div
                  id="shell-route-slot"
                  className="shell-route-slot"
                >
                  <div
                    key={`content-${contentRenderKey}`}
                    className="shell-route-content-root route-ui-layer"
                    data-route-view={routeRenderKey}
                  >
                    <div
                      ref={surfaceRefs?.chrome}
                      className="shell-transition-surface shell-transition-surface--chrome"
                      data-route-surface="chrome"
                    >
                      {routeUiLayer.chrome}
                    </div>
                    <div
                      ref={surfaceRefs?.secondary}
                      className="shell-transition-surface shell-transition-surface--secondary"
                      data-route-surface="secondary"
                    >
                      {routeUiLayer.secondary}
                    </div>
                  </div>
                </div>
                <div
                  ref={surfaceRefs?.footer}
                  className="shell-transition-surface shell-transition-surface--footer"
                  data-route-surface="footer"
                >
                  <div key={`footer-${routeRenderKey}`} data-route-view={routeRenderKey}>
                    {showFooter ? <SiteFooter /> : null}
                  </div>
                </div>
              </div>
            </div>
          <ShellWindowOverlay>
            {windowOverlayContent ?? simulationFocusModal}
          </ShellWindowOverlay>
          <ShellButtonBar
            activeRouteId={activeRouteId || routeRenderKey}
            pendingRouteId={pendingRouteId}
            materialVariant="dominant-tab"
            onRouteNavigate={(href, tab, options) => trySpaNavigate(href, options)}
            onRouteIntent={(routeId, tab, reason) => onRoutePrewarm?.(routeId, {
              href: tab.href,
              reason,
            })}
          />
          {/* Portfolio drawer: keep its route content and scroll cue above the window UI but below the Button Bar. */}
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

      <div
        id="shell-persistent-route-ui-host"
        className="shell-persistent-route-ui-host"
      />

      <div id="modal-blur-layer" className="modal-layer modal-blur-layer" aria-hidden="true" />

      <div id="modal-content-layer" className="modal-layer modal-content-layer" aria-hidden="true">
        <div id="modal-modal-host" className="modal-modal-host" />
      </div>
    </>
  );
}
