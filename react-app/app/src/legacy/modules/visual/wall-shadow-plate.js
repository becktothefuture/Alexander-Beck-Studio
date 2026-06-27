// Static wall shadow plate.
// Bakes broad wall shadow/rim ramps into one decoded PNG so dark gradients do not
// depend on browser CSS shadow quantization.

let initialized = false;
let current = null;
let activeObjectUrl = null;
let pendingGenerateId = 0;
let regenTimer = 0;
let lastPlateKey = '';
let resizeListenersBound = false;

const MAX_TEXTURE_PIXELS = 2200000;
const MAX_TEXTURE_SCALE = 1.5;
const DEFAULT_DITHER_STRENGTH = 1.2;
const WALL_SHADOW_SEED = 0x4B1D2C7A;

const WALL_SHADOW_PLATE_KEYS = [
  'wallShadowPlateEnabled',
  'wallShadowDitherStrength',
];

function clampNumber(v, min, max, fallback) {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function clampByte(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function clamp01(v, fallback = 0) {
  return clampNumber(v, 0, 1, fallback);
}

function smoothstep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / Math.max(0.0001, edge1 - edge0));
  return t * t * (3 - (2 * t));
}

function pickPlateKeys(input) {
  const out = {};
  if (!input || typeof input !== 'object') return out;
  for (const key of WALL_SHADOW_PLATE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) out[key] = input[key];
  }
  return out;
}

function sanitizeConfig(input = {}) {
  return {
    wallShadowPlateEnabled: input.wallShadowPlateEnabled !== undefined
      ? Boolean(input.wallShadowPlateEnabled)
      : true,
    wallShadowDitherStrength: clampNumber(
      input.wallShadowDitherStrength,
      0,
      3,
      DEFAULT_DITHER_STRENGTH
    ),
  };
}

function mergeConfig(nextPartial = {}) {
  const base = current || sanitizeConfig({});
  return sanitizeConfig({ ...base, ...pickPlateKeys(nextPartial) });
}

function readRootVar(name) {
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  } catch {
    return '';
  }
}

function readRootNumber(name, fallback) {
  const raw = readRootVar(name);
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

function readRootPx(name, fallback) {
  return readRootNumber(name, fallback);
}

function readRootRgb(name, fallback) {
  const raw = readRootVar(name);
  const parts = raw.split(',').map((part) => Number.parseFloat(part.trim()));
  if (parts.length >= 3 && parts.every(Number.isFinite)) {
    return {
      r: clampByte(parts[0]),
      g: clampByte(parts[1]),
      b: clampByte(parts[2]),
    };
  }
  return fallback;
}

function getFrameRect() {
  const frame = document.querySelector('.frame-vignette');
  if (!frame) return null;
  const rect = frame.getBoundingClientRect();
  if (!rect || rect.width < 32 || rect.height < 32) return null;
  return {
    width: rect.width,
    height: rect.height,
  };
}

function resolveTextureScale(width, height) {
  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
  const budgetScale = Math.sqrt(MAX_TEXTURE_PIXELS / Math.max(1, width * height));
  return Math.max(1, Math.min(dpr, MAX_TEXTURE_SCALE, budgetScale));
}

function createPlateCanvas(width, height) {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

async function canvasToBlob(canvas) {
  if (typeof canvas.convertToBlob === 'function') {
    try {
      return await canvas.convertToBlob({ type: 'image/png' });
    } catch {
      return null;
    }
  }

  return await new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    } catch {
      resolve(null);
    }
  });
}

function hash01(x, y, seed = WALL_SHADOW_SEED) {
  let n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + seed) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function triangularDither(x, y) {
  return hash01(x, y) - hash01(x + 131, y + 197, WALL_SHADOW_SEED ^ 0x9E3779B9);
}

function roundedRectDistanceToEdge(x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, width * 0.5, height * 0.5));
  const dx = Math.min(x, Math.max(0, width - x));
  const dy = Math.min(y, Math.max(0, height - y));

  if (r > 0 && x < r && y < r) return Math.max(0, r - Math.hypot(r - x, r - y));
  if (r > 0 && x > width - r && y < r) return Math.max(0, r - Math.hypot(x - (width - r), r - y));
  if (r > 0 && x < r && y > height - r) return Math.max(0, r - Math.hypot(r - x, y - (height - r)));
  if (r > 0 && x > width - r && y > height - r) {
    return Math.max(0, r - Math.hypot(x - (width - r), y - (height - r)));
  }

  return Math.max(0, Math.min(dx, dy));
}

function getPlateParams(cfg, rect, scale) {
  const isDark = document.body?.classList?.contains('dark-mode');
  const radius = readRootPx('--frame-inner-radius', Math.min(rect.width, rect.height) * 0.04);
  const edgeWidth = Math.max(0.75, readRootPx('--inner-wall-gradient-edge-width', 3));
  const pitOpacity = readRootNumber('--inner-wall-pit-inset-shadow-opacity', isDark ? 0.24 : 0.12);
  const pitBlur = Math.max(1, readRootPx('--inner-wall-pit-inset-shadow-blur', 28));
  const pitSpread = readRootPx('--inner-wall-pit-inset-shadow-spread', -6);
  const pitOffsetY = readRootPx('--inner-wall-pit-inset-shadow-offset-y', 4);
  const frameEdgeOpacity = readRootNumber('--frame-vignette-edge-opacity', 0.14);
  const frameEdgeBlur = Math.max(1, readRootPx('--frame-vignette-edge-blur', 42));
  const frameEdgeOffsetY = readRootPx('--frame-vignette-edge-offset-y', 5);
  const ambientOpacity = readRootNumber('--frame-vignette-ambient-opacity', 0.09);
  const ambientBlur = Math.max(1, readRootPx('--frame-vignette-ambient-blur', 197));
  const rimBottomOpacity = readRootNumber('--inner-wall-gradient-edge-bottom-opacity', 0.22);
  const rimSideOpacity = readRootNumber('--inner-wall-gradient-edge-side-opacity', 0.16);
  const rimRightOpacity = readRootNumber('--inner-wall-gradient-edge-side-shadow-opacity', rimSideOpacity);
  const rimTopShadowOpacity = readRootNumber('--inner-wall-gradient-edge-top-shadow-opacity', 0.3);
  const sceneDepth = readRootNumber('--abs-scene-depth', frameEdgeOpacity);
  const sceneSoftness = readRootNumber('--abs-scene-softness', 0.45);

  return {
    width: rect.width,
    height: rect.height,
    scale,
    radius,
    shadowRgb: readRootRgb('--inner-wall-bottom-shadow-rgb', { r: 0, g: 0, b: 0 }),
    lightRgb: readRootRgb('--inner-wall-top-light-rgb', { r: 255, g: 255, b: 255 }),
    pitOpacity,
    pitBlur,
    pitSpread,
    pitOffsetY,
    frameEdgeOpacity,
    frameEdgeBlur,
    frameEdgeOffsetY,
    ambientOpacity,
    ambientBlur,
    rimBottomOpacity,
    rimSideOpacity,
    rimRightOpacity,
    rimTopShadowOpacity,
    edgeWidth,
    sceneDepth,
    sceneSoftness,
    ditherStrength: cfg.wallShadowDitherStrength,
    isDark,
  };
}

function buildPlateKey(params) {
  return JSON.stringify({
    w: Math.round(params.width),
    h: Math.round(params.height),
    s: Number(params.scale).toFixed(3),
    r: Math.round(params.radius),
    dark: params.isDark,
    shadow: params.shadowRgb,
    light: params.lightRgb,
    pitO: Number(params.pitOpacity).toFixed(4),
    pitB: Math.round(params.pitBlur),
    pitS: Math.round(params.pitSpread),
    pitY: Math.round(params.pitOffsetY),
    edgeO: Number(params.frameEdgeOpacity).toFixed(4),
    edgeB: Math.round(params.frameEdgeBlur),
    ambientO: Number(params.ambientOpacity).toFixed(4),
    ambientB: Math.round(params.ambientBlur),
    rimB: Number(params.rimBottomOpacity).toFixed(4),
    rimS: Number(params.rimSideOpacity).toFixed(4),
    rimR: Number(params.rimRightOpacity).toFixed(4),
    rimT: Number(params.rimTopShadowOpacity).toFixed(4),
    edgeW: Number(params.edgeWidth).toFixed(2),
    depth: Number(params.sceneDepth).toFixed(4),
    soft: Number(params.sceneSoftness).toFixed(4),
    dither: Number(params.ditherStrength).toFixed(3),
  });
}

function samplePlateSignedAlpha(params, x, y, ix, iy) {
  const {
    width,
    height,
    radius,
    pitOpacity,
    pitBlur,
    pitSpread,
    pitOffsetY,
    frameEdgeOpacity,
    frameEdgeBlur,
    frameEdgeOffsetY,
    ambientOpacity,
    ambientBlur,
    rimBottomOpacity,
    rimSideOpacity,
    rimRightOpacity,
    rimTopShadowOpacity,
    edgeWidth,
    sceneDepth,
    sceneSoftness,
    ditherStrength,
  } = params;

  const dist = roundedRectDistanceToEdge(x, y, width, height, radius);
  const centerX = 1 - Math.min(1, Math.abs((x / Math.max(1, width)) * 2 - 1));
  const centerY = 1 - Math.min(1, Math.abs((y / Math.max(1, height)) * 2 - 1));
  const topDist = Math.max(0, y);
  const bottomDist = Math.max(0, height - y);
  const leftDist = Math.max(0, x);
  const rightDist = Math.max(0, width - x);

  const softnessLift = 0.9 + (clamp01(sceneSoftness, 0.45) * 0.24);
  const depthLift = 0.86 + (clamp01(sceneDepth / 0.28, 0.5) * 0.22);
  const contactDist = Math.max(0, dist + pitSpread);
  const contact = pitOpacity * 0.72 * depthLift * Math.exp(-contactDist / Math.max(1, pitBlur * softnessLift));
  const contactTopBias = 1 + Math.min(0.18, Math.max(0, pitOffsetY) / 28) * (1 - Math.min(1, topDist / Math.max(1, pitBlur)));
  const ambient = ambientOpacity * 0.9 * Math.exp(-dist / Math.max(1, ambientBlur * (0.78 + sceneSoftness * 0.18)));
  const frameTop = frameEdgeOpacity * 0.88
    * Math.exp(-Math.max(0, topDist - frameEdgeOffsetY) / Math.max(1, frameEdgeBlur))
    * (0.68 + centerX * 0.32);
  const topLip = rimTopShadowOpacity * 0.86
    * Math.exp(-topDist / Math.max(0.75, edgeWidth * 2.25))
    * (0.22 + centerX * 0.78);

  const bottomRim = rimBottomOpacity * 0.78
    * Math.exp(-bottomDist / Math.max(0.75, edgeWidth * 2.45))
    * (0.18 + centerX * 0.82);
  const leftRim = rimSideOpacity * 0.64
    * Math.exp(-leftDist / Math.max(0.75, edgeWidth * 2.65))
    * (0.18 + centerY * 0.82);
  const rightRim = rimRightOpacity * 0.64
    * Math.exp(-rightDist / Math.max(0.75, edgeWidth * 2.65))
    * (0.18 + centerY * 0.82);

  const dark = Math.min(0.82, contact * contactTopBias + ambient + frameTop + topLip);
  const light = Math.min(0.52, bottomRim + leftRim + rightRim);
  let signed = light - dark;
  const mag = Math.abs(signed);

  if (mag > 0.002 && ditherStrength > 0) {
    const rampMask = smoothstep(0.003, 0.08, mag) * (1 - smoothstep(0.5, 0.72, mag));
    signed += triangularDither(ix, iy) * (ditherStrength / 255) * rampMask;
  }

  return clampNumber(signed, -0.88, 0.62, 0);
}

async function generateWallShadowPlateUrl(params) {
  const canvasWidth = Math.max(1, Math.round(params.width * params.scale));
  const canvasHeight = Math.max(1, Math.round(params.height * params.scale));
  const canvas = createPlateCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const imageData = ctx.createImageData(canvasWidth, canvasHeight);
  const data = imageData.data;
  const scale = params.scale;
  const dark = params.shadowRgb;
  const light = params.lightRgb;

  for (let py = 0, i = 0; py < canvasHeight; py++) {
    for (let px = 0; px < canvasWidth; px++, i += 4) {
      const x = (px + 0.5) / scale;
      const y = (py + 0.5) / scale;
      const signedAlpha = samplePlateSignedAlpha(params, x, y, px, py);
      const alpha = Math.abs(signedAlpha);
      const color = signedAlpha >= 0 ? light : dark;

      data[i] = color.r;
      data[i + 1] = color.g;
      data[i + 2] = color.b;
      data[i + 3] = clampByte(alpha * 255);
    }
  }

  ctx.putImageData(imageData, 0, 0);
  const blob = await canvasToBlob(canvas);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

function waitForNextFrame() {
  return new Promise((resolve) => {
    try {
      window.requestAnimationFrame(() => resolve());
    } catch {
      resolve();
    }
  });
}

async function decodeTextureUrl(url) {
  if (!url || typeof Image === 'undefined') return;
  await new Promise((resolve) => {
    const img = new Image();
    let settled = false;
    let timeoutId = 0;
    const settle = () => {
      if (settled) return;
      settled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      resolve();
    };
    img.onload = settle;
    img.onerror = settle;
    timeoutId = window.setTimeout(settle, 900);
    img.src = url;
    if (typeof img.decode === 'function') {
      img.decode().then(settle).catch(() => {});
    }
  });
}

async function commitPlateUrl(url, genId) {
  await decodeTextureUrl(url);
  if (genId !== pendingGenerateId) {
    try { URL.revokeObjectURL(url); } catch {}
    return false;
  }

  try {
    const root = document.documentElement;
    const previousObjectUrl = activeObjectUrl;
    root.style.setProperty('--abs-wall-shadow-plate', `url("${url}")`);
    activeObjectUrl = url;
    if (previousObjectUrl && previousObjectUrl !== url) {
      try { URL.revokeObjectURL(previousObjectUrl); } catch {}
    }
    await waitForNextFrame();
    if (genId !== pendingGenerateId) return false;
    document.body?.classList.add('wall-shadow-plate-ready');
    return true;
  } catch {
    try { URL.revokeObjectURL(url); } catch {}
    return false;
  }
}

function clearPlate({ disableFallback = false } = {}) {
  pendingGenerateId++;
  if (regenTimer) window.clearTimeout(regenTimer);
  regenTimer = 0;
  lastPlateKey = '';
  try {
    document.documentElement.style.removeProperty('--abs-wall-shadow-plate');
    if (disableFallback) document.body?.classList.remove('wall-shadow-plate-ready');
  } catch {}
  if (activeObjectUrl) {
    try { URL.revokeObjectURL(activeObjectUrl); } catch {}
  }
  activeObjectUrl = null;
}

function schedulePlateRegeneration(cfg, { force = false } = {}) {
  if (!cfg.wallShadowPlateEnabled) {
    clearPlate({ disableFallback: true });
    return;
  }

  const rect = getFrameRect();
  if (!rect) return;
  const scale = resolveTextureScale(rect.width, rect.height);
  const params = getPlateParams(cfg, rect, scale);
  const plateKey = buildPlateKey(params);
  if (!force && plateKey === lastPlateKey) return;
  lastPlateKey = plateKey;

  if (regenTimer) window.clearTimeout(regenTimer);
  regenTimer = window.setTimeout(async () => {
    regenTimer = 0;
    const genId = ++pendingGenerateId;
    const url = await generateWallShadowPlateUrl(params);
    if (!url) return;
    await commitPlateUrl(url, genId);
  }, 120);
}

function bindResizeListeners() {
  if (resizeListenersBound || typeof window === 'undefined') return;
  resizeListenersBound = true;
  let resizeTimer = 0;
  const handleResize = () => {
    if (!initialized || !current?.wallShadowPlateEnabled) return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      schedulePlateRegeneration(current, { force: true });
    }, 160);
  };
  window.addEventListener('resize', handleResize, { passive: true });
  window.visualViewport?.addEventListener('resize', handleResize, { passive: true });
}

export function initWallShadowPlateSystem(initialConfig = {}) {
  current = mergeConfig(initialConfig);
  initialized = true;
  bindResizeListeners();
  schedulePlateRegeneration(current, { force: true });
}

export function applyWallShadowPlateSystem(nextConfig = {}) {
  if (!initialized) initWallShadowPlateSystem(nextConfig);
  current = mergeConfig(nextConfig);
  schedulePlateRegeneration(current);
}

export function getWallShadowPlateConfig() {
  return current ? { ...current } : null;
}

export function destroyWallShadowPlateSystem() {
  clearPlate({ disableFallback: true });
  current = null;
  initialized = false;
}
