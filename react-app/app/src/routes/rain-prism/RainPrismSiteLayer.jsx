import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_RAIN_PRISM_CONFIG, normalizeRainPrismConfig } from './rainPrismControls.js';
import { createRainPrismRenderer } from './rainPrismRenderer.js';
import './rain-prism-site-layer.css';

const CONFIG_URL = '/config/rain-prism-demo.json';
const INITIAL_RAIN_PRISM_CONFIG = normalizeRainPrismConfig(DEFAULT_RAIN_PRISM_CONFIG);
const SITE_LAYER_ROUTE_SETS = {
  home: new Set(['home']),
  core: new Set(['home', 'portfolio', 'cv']),
};

function isSiteLayerRoute(routeRenderKey, siteScope = 'home') {
  if (siteScope === 'all') return routeRenderKey !== 'rain-prism';
  return SITE_LAYER_ROUTE_SETS[siteScope]?.has(routeRenderKey) || false;
}

function resolveSiteLayerConfig(config) {
  return {
    ...config,
    blendMode: config.siteBlendMode || config.blendMode,
  };
}

function readCssColor(name, fallback) {
  if (typeof window === 'undefined') return fallback;
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function readSiteThemeColors() {
  const light = readCssColor('--abs-wall-base-light', '#efefef');
  const dark = readCssColor('--abs-wall-base-dark', '#202020');
  const isDark = document.documentElement.classList.contains('dark-mode')
    || document.body.classList.contains('dark-mode');

  return {
    light,
    dark,
    active: isDark ? dark : light,
  };
}

async function loadRainPrismConfig() {
  try {
    const response = await fetch(CONFIG_URL, { cache: 'no-store' });
    if (!response.ok) return DEFAULT_RAIN_PRISM_CONFIG;
    return await response.json();
  } catch {
    return DEFAULT_RAIN_PRISM_CONFIG;
  }
}

export function RainPrismSiteLayer({ routeRenderKey }) {
  const overlayCanvasRef = useRef(null);
  const rendererRef = useRef(null);
  const siteConfigRef = useRef(resolveSiteLayerConfig(INITIAL_RAIN_PRISM_CONFIG));
  const [config, setConfig] = useState(INITIAL_RAIN_PRISM_CONFIG);
  const [configReady, setConfigReady] = useState(false);

  const reducedMotion = useMemo(() => (
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  ), []);

  const enabledForRoute = import.meta.env.PROD
    && config.enabled
    && isSiteLayerRoute(routeRenderKey, config.siteScope);

  useEffect(() => {
    if (!import.meta.env.PROD) return undefined;
    let cancelled = false;

    async function loadConfig() {
      const nextConfig = normalizeRainPrismConfig(await loadRainPrismConfig());
      if (cancelled) return;
      siteConfigRef.current = resolveSiteLayerConfig(nextConfig);
      setConfig(nextConfig);
      setConfigReady(true);
      rendererRef.current?.start();
    }

    loadConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const overlayCanvas = overlayCanvasRef.current;
    if (!enabledForRoute || !configReady || !overlayCanvas) return undefined;

    rendererRef.current = createRainPrismRenderer({
      overlayCanvas,
      reducedMotion,
      getConfig: () => siteConfigRef.current,
      getTheme: readSiteThemeColors,
    });

    const handleResize = () => rendererRef.current?.start();
    const handleThemeChange = () => rendererRef.current?.renderOnce();
    const themeObserver = new MutationObserver(handleThemeChange);
    window.addEventListener('resize', handleResize);
    document.addEventListener('abs:theme-change', handleThemeChange);
    window.addEventListener('abs:theme-changed', handleThemeChange);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('abs:theme-change', handleThemeChange);
      window.removeEventListener('abs:theme-changed', handleThemeChange);
      themeObserver.disconnect();
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, [configReady, enabledForRoute, reducedMotion]);

  if (!enabledForRoute) return null;

  const visibleSiteConfig = resolveSiteLayerConfig(config);

  return (
    <div
      className="rain-prism-site-layer"
      data-rain-prism-site-layer="true"
      data-ready={String(configReady)}
      data-site-scope={config.siteScope}
      data-blend-mode={visibleSiteConfig.blendMode}
      data-target-fps={String(config.targetFps)}
      data-max-dpr={String(config.maxDpr)}
      data-adaptive-density={String(config.adaptiveDensity)}
      data-pause-when-hidden={String(config.pauseWhenHidden)}
      aria-hidden="true"
    >
      <canvas
        ref={overlayCanvasRef}
        id="rain-prism-site-overlay"
        className="rain-prism-site-layer__canvas"
      />
    </div>
  );
}
