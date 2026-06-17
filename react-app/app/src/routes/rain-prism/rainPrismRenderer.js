const DEFAULT_THEME = {
  light: '#efefef',
  dark: '#202020',
  active: '#202020',
};

const RGB_STOPS = [
  { r: 255, g: 42, b: 68 },
  { r: 20, g: 235, b: 104 },
  { r: 0, g: 172, b: 255 },
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toByte(value) {
  return Math.round(clamp(value, 0, 255));
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function parseHexColor(value, fallback = '#202020') {
  const source = String(value || fallback).trim();
  const match = /^#?([0-9a-f]{6})$/i.exec(source);
  const hex = match ? match[1] : fallback.replace('#', '');
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function rgbString(color, alpha = 1) {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

function mixColor(a, b, amount) {
  const t = clamp(amount, 0, 1);
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function boostRgb(color, config) {
  return {
    r: toByte(color.r * (config.redStrength ?? 1)),
    g: toByte(color.g * (config.greenStrength ?? 1)),
    b: toByte(color.b * (config.blueStrength ?? 1)),
  };
}

function isLightTheme(themeColor) {
  return themeColor.active === themeColor.light;
}

function resolveOverlayBlendMode(config, themeColor) {
  const mode = config.blendMode || 'auto';
  if (mode === 'auto') return isLightTheme(themeColor) ? 'normal' : 'screen';
  return mode;
}

function resolveRenderDpr(config) {
  const deviceDpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  const maxDpr = clamp(Number(config.maxDpr) || 1.5, 0.75, 2.5);
  return clamp(Math.min(deviceDpr, maxDpr), 0.75, 2.5);
}

function resolveTargetFps(config) {
  return Math.round(clamp(Number(config.targetFps) || 30, 1, 60));
}

function shouldPauseForVisibility(config) {
  return config.pauseWhenHidden !== false
    && typeof document !== 'undefined'
    && document.hidden;
}

function resolvePixelCount(config, metrics) {
  const count = Math.round(clamp(Number(config.dropDensity) || 0, 100, 20000));
  if (config.adaptiveDensity === false) return count;

  const referenceArea = 1440 * 900;
  const area = Math.max(1, metrics.cssWidth * metrics.cssHeight);
  const areaScale = clamp(area / referenceArea, 0.18, 1);
  const dprScale = clamp(1.5 / Math.max(metrics.dpr, 0.75), 0.7, 1.15);
  return Math.max(80, Math.round(count * areaScale * dprScale));
}

function smoothStep(value) {
  return value * value * (3 - 2 * value);
}

function cycleRgbColor(phase) {
  const wrapped = ((phase % 1) + 1) % 1;
  const scaled = wrapped * RGB_STOPS.length;
  const index = Math.floor(scaled) % RGB_STOPS.length;
  const nextIndex = (index + 1) % RGB_STOPS.length;
  const mix = smoothStep(scaled - Math.floor(scaled));
  return mixColor(RGB_STOPS[index], RGB_STOPS[nextIndex], mix);
}

function resizeCanvasToDisplaySize(canvas, dpr) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  const changed = canvas.width !== width || canvas.height !== height;
  if (changed) {
    canvas.width = width;
    canvas.height = height;
  }
  return {
    changed,
    cssWidth: Math.max(1, rect.width),
    cssHeight: Math.max(1, rect.height),
    width,
    height,
  };
}

function getThemeKey(themeColor) {
  return `${themeColor.active || ''}:${themeColor.light || ''}:${themeColor.dark || ''}`;
}

function drawBaseField(ctx, width, height, themeColor, config) {
  const base = parseHexColor(themeColor.active || DEFAULT_THEME.active);
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };
  const isLight = isLightTheme(themeColor);
  const lift = isLight ? black : white;
  const displayColor = clamp(config.displayColor ?? 0.24, 0, 2);
  const displayContrast = clamp(config.displayContrast ?? 1, 0, 3);
  const neutralWash = displayColor * 0.006;
  const liftLow = 0.025 + displayContrast * 0.018 + neutralWash;
  const liftHigh = 0.05 + displayContrast * 0.025 + neutralWash * 1.5;

  ctx.fillStyle = rgbString(base, 1);
  ctx.fillRect(0, 0, width, height);

  const wash = ctx.createLinearGradient(0, 0, width, height);
  wash.addColorStop(0, rgbString(mixColor(base, lift, liftLow), 0.9));
  wash.addColorStop(0.5, rgbString(base, 0.96));
  wash.addColorStop(1, rgbString(mixColor(base, lift, liftHigh), 0.88));
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);
}

function createPixel(rand) {
  return {
    x: rand(),
    y: rand(),
    phase: rand(),
    speed: 0.72 + rand() * 0.72,
    alpha: 0.72 + rand() * 0.28,
  };
}

function syncPixelList(pixels, count, seed) {
  const rand = mulberry32(seed);
  while (pixels.length < count) pixels.push(createPixel(rand));
  if (pixels.length > count) pixels.length = count;
}

function drawRgbPixel(ctx, pixel, config, metrics, time, reducedMotion, themeColor) {
  const cycleSpread = config.cycleSpread ?? 1;
  const phaseJitter = config.phaseJitter ?? 1;
  const pixelSpeed = 1 + (pixel.speed - 1) * cycleSpread;
  const cycleSpeed = reducedMotion ? 0 : (0.028 + config.motion * 0.22) * pixelSpeed;
  const phase = pixel.phase * phaseJitter + (pixel.x * 0.05 + pixel.y * 0.07) * phaseJitter + time * 0.001 * cycleSpeed;
  const color = boostRgb(cycleRgbColor(phase), config);
  const isLight = isLightTheme(themeColor);
  const themeBoost = isLight ? config.lightBoost : config.darkBoost;
  const brightness = clamp(config.spectrumBoost ?? 1.15, 0.05, 5);
  const pixelAlpha = clamp(config.pixelAlpha ?? 1, 0.05, 2.5);
  const alpha = clamp((0.1 + brightness * 0.17) * pixelAlpha * themeBoost, 0.04, 1) * pixel.alpha;
  const size = Math.max(1, Math.round(config.pixelSize || 1));
  const x = Math.round(pixel.x * metrics.cssWidth);
  const y = Math.round(pixel.y * metrics.cssHeight);

  ctx.fillStyle = rgbString(color, alpha);
  ctx.fillRect(x, y, size, size);
}

export function createRainPrismRenderer({
  baseCanvas = null,
  overlayCanvas,
  getConfig,
  getTheme,
  reducedMotion = false,
} = {}) {
  const baseCtx = baseCanvas ? baseCanvas.getContext('2d', { alpha: false }) : null;
  const overlayCtx = overlayCanvas.getContext('2d', { alpha: true });
  const pixels = [];
  let rafId = 0;
  let timeoutId = 0;
  let destroyed = false;
  const hasVisibilityEvents = typeof document !== 'undefined'
    && typeof document.addEventListener === 'function';
  let lastPixelSignature = '';
  let lastBaseSignature = '';
  let metrics = {
    dpr: 1,
    cssWidth: 1,
    cssHeight: 1,
    width: 1,
    height: 1,
    pixelCount: 0,
  };

  function cancelScheduledFrame() {
    if (rafId) window.cancelAnimationFrame(rafId);
    if (timeoutId) window.clearTimeout(timeoutId);
    rafId = 0;
    timeoutId = 0;
  }

  function shouldAnimate(config) {
    return config.enabled !== false
      && !reducedMotion
      && (config.motion ?? 0) > 0.001
      && !shouldPauseForVisibility(config);
  }

  function scheduleNextFrame(config) {
    if (destroyed || !shouldAnimate(config)) return;
    const frameInterval = 1000 / resolveTargetFps(config);
    const timeoutDelay = Math.max(0, frameInterval - (1000 / 60));
    timeoutId = window.setTimeout(() => {
      timeoutId = 0;
      rafId = window.requestAnimationFrame(drawFrame);
    }, timeoutDelay);
  }

  function syncMetrics(dpr) {
    const overlayMetrics = resizeCanvasToDisplaySize(overlayCanvas, dpr);
    const baseMetrics = baseCanvas ? resizeCanvasToDisplaySize(baseCanvas, dpr) : overlayMetrics;
    metrics = {
      ...baseMetrics,
      dpr,
      pixelCount: metrics.pixelCount,
    };
    baseCtx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawFrame(time = performance.now(), force = false) {
    rafId = 0;
    if (destroyed) return;
    const config = getConfig();
    if (!force && shouldPauseForVisibility(config)) return;

    const theme = getTheme() || DEFAULT_THEME;
    const dpr = resolveRenderDpr(config);
    syncMetrics(dpr);
    const pixelCount = resolvePixelCount(config, metrics);
    metrics.pixelCount = pixelCount;

    const baseSignature = [
      Math.round(metrics.cssWidth),
      Math.round(metrics.cssHeight),
      dpr,
      getThemeKey(theme),
      config.displayColor,
      config.displayContrast,
      config.redStrength,
      config.greenStrength,
      config.blueStrength,
    ].join(':');
    if (baseCtx && baseSignature !== lastBaseSignature) {
      drawBaseField(baseCtx, metrics.cssWidth, metrics.cssHeight, theme, config);
      lastBaseSignature = baseSignature;
    }

    overlayCtx.clearRect(0, 0, metrics.cssWidth, metrics.cssHeight);
    overlayCanvas.style.mixBlendMode = resolveOverlayBlendMode(config, theme);
    overlayCanvas.style.opacity = config.enabled ? '1' : '0';

    const pixelSignature = `${pixelCount}:${Math.round(metrics.cssWidth)}:${Math.round(metrics.cssHeight)}:${dpr}`;
    if (pixelSignature !== lastPixelSignature) {
      syncPixelList(pixels, pixelCount, 0x5f3759df);
      lastPixelSignature = pixelSignature;
    }

    if (config.enabled) {
      overlayCtx.globalCompositeOperation = 'source-over';
      for (let index = 0; index < pixels.length; index += 1) {
        drawRgbPixel(overlayCtx, pixels[index], config, metrics, time, reducedMotion, theme);
      }
    }

    scheduleNextFrame(config);
  }

  function start() {
    if (destroyed) return;
    cancelScheduledFrame();
    if (shouldPauseForVisibility(getConfig())) return;
    rafId = window.requestAnimationFrame(drawFrame);
  }

  function renderOnce() {
    if (destroyed) return;
    cancelScheduledFrame();
    drawFrame(performance.now(), true);
  }

  function destroy() {
    destroyed = true;
    cancelScheduledFrame();
    if (hasVisibilityEvents) {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }

  function handleVisibilityChange() {
    if (typeof document === 'undefined' || !document.hidden) start();
  }

  if (hasVisibilityEvents) {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }
  start();

  return {
    start,
    renderOnce,
    destroy,
    getMetrics: () => ({ ...metrics }),
  };
}
