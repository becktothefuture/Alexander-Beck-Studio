// Procedural film-grain / noise system (no external GIF).
// Generates a small noise texture at runtime and drives motion via CSS-only animations.

let initialized = false;
let current = null;

let textureCanvas = null;
let textureCtx = null;
let cachedImageData = null;
let cachedData32 = null;
let cachedSize = 0;

let activeObjectUrl = null;
let pendingGenerateId = 0;
let regenTimer = null;
let lastTextureKey = '';

const NOISE_KEYS = [
  'noiseEnabled',
  'noiseSeed',
  'noiseTextureSize',
  'noiseDistribution',
  'noiseMonochrome',
  'noiseChroma',
  'noiseMotion',
  'noiseMotionAmount',
  'noiseSpeedMs',
  'noiseSpeedVariance',
  'noiseFlicker',
  'noiseFlickerSpeedMs',
  'noiseBlurPx',
  'noiseContrast',
  'noiseBrightness',
  'noiseSaturation',
  'noiseHue',
  'noiseSize',
  'noiseOpacity',
  'noiseOpacityLight',
  'noiseOpacityDark',
  'noiseColorLight',
  'noiseColorDark',
  'detailNoiseOpacity',
];

function pickNoiseKeys(input) {
  const out = {};
  if (!input || typeof input !== 'object') return out;
  for (const key of NOISE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) out[key] = input[key];
  }
  return out;
}

function clampNumber(v, min, max, fallback) {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function clampInt(v, min, max, fallback) {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function clamp01(v, fallback = 0) {
  return clampNumber(v, 0, 1, fallback);
}

function pickEnum(v, allowed, fallback) {
  return allowed.includes(v) ? v : fallback;
}

function readRootVarNumber(name, fallback) {
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function next() {
    t += 0x6D2B79F5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian01(rng) {
  // Fast-ish Gaussian-ish sampler (no trig/log):
  // Irwin–Hall approximation via averaging 3 uniforms (triangular-ish → near-normal).
  const v = (rng() + rng() + rng()) / 3;
  // Slightly widen the mid-tones to feel more "filmic" after contrast is applied.
  return Math.max(0, Math.min(1, 0.5 + (v - 0.5) * 1.15));
}

function ensureTextureCanvas(size) {
  if (!textureCanvas) {
    textureCanvas = document.createElement('canvas');
    textureCtx = textureCanvas.getContext('2d', { willReadFrequently: true });
  }
  if (!textureCtx) return null;
  if (textureCanvas.width !== size) textureCanvas.width = size;
  if (textureCanvas.height !== size) textureCanvas.height = size;
  if (cachedSize !== size) {
    cachedSize = size;
    cachedImageData = null;
    cachedData32 = null;
  }
  return textureCtx;
}

async function canvasToBlob(canvas) {
  return await new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    } catch (e) {
      resolve(null);
    }
  });
}

async function generateNoiseTextureUrl({
  size,
  seed,
  distribution,
  monochrome,
  chroma,
  contrast,
  brightness,
  saturation,
  hue,
}) {
  const ctx = ensureTextureCanvas(size);
  if (!ctx) return null;

  if (!cachedImageData) {
    cachedImageData = ctx.createImageData(size, size);
    cachedData32 = new Uint32Array(cachedImageData.data.buffer);
  }

  const data32 = cachedData32;
  const rng = mulberry32(seed);

  const useGaussian = distribution === 'gaussian';
  const colorMix = clamp01(chroma, 0);
  const invColorMix = 1 - colorMix;

  const c = clampNumber(contrast, 0.25, 5, 1);
  const bMul = clampNumber(brightness, 0.25, 3, 1);
  const sat = clampNumber(saturation, 0, 3, 1);
  const hueDeg = clampNumber(hue, 0, 360, 0);

  const doContrastBrightness = c !== 1 || bMul !== 1;
  const doSaturation = sat !== 1;
  const doHue = hueDeg !== 0;

  // Luma constants (match CSS filter conventions).
  const lumR = 0.213;
  const lumG = 0.715;
  const lumB = 0.072;

  // Hue rotation matrix (CSS hue-rotate) — computed once per regeneration.
  let hr00 = 1, hr01 = 0, hr02 = 0;
  let hr10 = 0, hr11 = 1, hr12 = 0;
  let hr20 = 0, hr21 = 0, hr22 = 1;
  if (doHue) {
    const a = (hueDeg * Math.PI) / 180;
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);
    hr00 = lumR + cosA * (1 - lumR) - sinA * lumR;
    hr01 = lumG - cosA * lumG - sinA * lumG;
    hr02 = lumB - cosA * lumB + sinA * (1 - lumB);
    hr10 = lumR - cosA * lumR + sinA * 0.143;
    hr11 = lumG + cosA * (1 - lumG) + sinA * 0.140;
    hr12 = lumB - cosA * lumB - sinA * 0.283;
    hr20 = lumR - cosA * lumR - sinA * (1 - lumR);
    hr21 = lumG - cosA * lumG + sinA * lumG;
    hr22 = lumB + cosA * (1 - lumB) + sinA * lumB;
  }

  for (let i = 0; i < data32.length; i++) {
    const base = useGaussian ? gaussian01(rng) : rng();

    let r = base;
    let g = base;
    let b = base;

    if (!monochrome) {
      const r2 = useGaussian ? gaussian01(rng) : rng();
      const g2 = useGaussian ? gaussian01(rng) : rng();
      const b2 = useGaussian ? gaussian01(rng) : rng();
      r = base * invColorMix + r2 * colorMix;
      g = base * invColorMix + g2 * colorMix;
      b = base * invColorMix + b2 * colorMix;
    }

    // Contrast + brightness (point-wise, tile-safe).
    if (doContrastBrightness) {
      r = (r - 0.5) * c + 0.5;
      g = (g - 0.5) * c + 0.5;
      b = (b - 0.5) * c + 0.5;
      r *= bMul;
      g *= bMul;
      b *= bMul;
    }

    // Saturation (lerp to luma) — point-wise, tile-safe.
    if (doSaturation) {
      const l = r * lumR + g * lumG + b * lumB;
      r = l * (1 - sat) + r * sat;
      g = l * (1 - sat) + g * sat;
      b = l * (1 - sat) + b * sat;
    }

    // Hue rotate — point-wise, tile-safe.
    if (doHue) {
      const nr = r * hr00 + g * hr01 + b * hr02;
      const ng = r * hr10 + g * hr11 + b * hr12;
      const nb = r * hr20 + g * hr21 + b * hr22;
      r = nr; g = ng; b = nb;
    }

    // Clamp + pack into RGBA (uint32) for fewer writes.
    const rr = Math.max(0, Math.min(255, Math.round(r * 255)));
    const gg = Math.max(0, Math.min(255, Math.round(g * 255)));
    const bb = Math.max(0, Math.min(255, Math.round(b * 255)));
    data32[i] = (255 << 24) | (bb << 16) | (gg << 8) | rr;
  }

  ctx.putImageData(cachedImageData, 0, 0);

  const blob = await canvasToBlob(textureCanvas);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

function applyCssVars(cfg) {
  const root = document.documentElement;

  // Enable/disable without removing DOM nodes (keeps layout stable).
  root.style.setProperty('--abs-noise-enabled', cfg.noiseEnabled ? '1' : '0');

  // Animation selection + timing.
  const motion = cfg.noiseMotion;
  const keyframes = motion === 'static'
    ? 'none'
    : (motion === 'drift' ? 'abs-noise-drift' : 'abs-noise-jitter');
  // Use steps(1) for instant jumps - no smooth transitions, more realistic noise
  const timing = motion === 'drift' ? 'linear' : 'steps(1, end)';

  root.style.setProperty('--abs-noise-keyframes', keyframes);
  root.style.setProperty('--abs-noise-timing', timing);

  // Single speed with variance applied via animation-duration calculation
  const baseSpeedMs = clampNumber(cfg.noiseSpeedMs ?? 1100, 0, 10000, 1100);
  const variance = clampNumber(cfg.noiseSpeedVariance ?? 0, 0, 1, 0);
  // Variance creates timing variation: use seeded random to create a stable but varied duration
  // Generate a timing multiplier based on seed and variance
  const prngTiming = mulberry32((cfg.noiseSeed ^ 0x7F3A2B1C) >>> 0);
  const timingRand = variance > 0 ? (prngTiming() * 2 - 1) * variance : 0; // -variance to +variance
  const speedMs = baseSpeedMs * (1 + timingRand);
  root.style.setProperty('--abs-noise-speed', `${Math.max(0, Math.round(speedMs))}ms`);
  root.style.setProperty('--abs-noise-speed-variance', String(variance));
  root.style.setProperty('--abs-noise-motion-amount', String(cfg.noiseMotionAmount));

  root.style.setProperty('--abs-noise-flicker', String(cfg.noiseFlicker));
  root.style.setProperty('--abs-noise-flicker-speed', `${Math.max(0, Math.round(cfg.noiseFlickerSpeedMs))}ms`);

  // Lowest runtime cost: keep heavy look adjustments baked into the generated tile.
  // Only keep blur as an optional CSS filter (blur can't be baked seamlessly without wrap-aware filtering).
  const blurPx = clampNumber(cfg.noiseBlurPx, 0, 6, 0);
  root.style.setProperty('--abs-noise-blur', `${blurPx.toFixed(2)}px`);
  root.style.setProperty('--abs-noise-filter', blurPx > 0 ? `blur(${blurPx.toFixed(2)}px)` : 'none');

  // Motion overscan + deterministic jitter path (px-based so it never reveals edges on large viewports).
  const motionAmount = clampNumber(cfg.noiseMotionAmount, 0, 2.5, 1);
  const hasMotion = cfg.noiseMotion !== 'static' && motionAmount > 0;
  // Keep motion amplitude bounded so grain stays subtle and GPU surfaces stay small,
  // even if the user cranks noise scale.
  const noiseSize = clampNumber(cfg.noiseSize ?? 85, 20, 600, 85);
  const baseMotionPx = clampNumber(noiseSize * 0.55, 24, 120, 82);
  const amp = hasMotion ? baseMotionPx * motionAmount : 0;
  const pad = Math.ceil(amp + (blurPx > 0 ? blurPx * 6 : 0) + 32);
  root.style.setProperty('--abs-noise-overscan', `-${pad}px`);

  // Seeded path: stable for a given seed, different between layers via differing speeds.
  // Generate many more jitter positions (40) for more alive, chaotic noise
  const prng = mulberry32((cfg.noiseSeed ^ 0xA53A9E37) >>> 0);
  const maxNorm = 0.9;
  const jitterCount = 40; // Many more positions = more alive, realistic noise
  for (let i = 1; i <= jitterCount; i++) {
    const x = (prng() * 2 - 1) * maxNorm * amp;
    const y = (prng() * 2 - 1) * maxNorm * amp;
    root.style.setProperty(`--abs-noise-j${i}-x`, `${Math.round(x)}px`);
    root.style.setProperty(`--abs-noise-j${i}-y`, `${Math.round(y)}px`);
  }

  const angle = prng() * Math.PI * 2;
  root.style.setProperty('--abs-noise-drift-x', `${Math.round(Math.cos(angle) * amp)}px`);
  root.style.setProperty('--abs-noise-drift-y', `${Math.round(Math.sin(angle) * amp)}px`);

  // Single layer controls
  root.style.setProperty('--noise-size', `${Math.round(noiseSize)}px`);
  
  // Opacity (theme-aware)
  const opacityLight = clampNumber(cfg.noiseOpacityLight ?? cfg.noiseOpacity ?? 0.03, 0, 1, 0.03);
  const opacityDark = clampNumber(cfg.noiseOpacityDark ?? cfg.noiseOpacity ?? 0.03, 0, 1, 0.03);
  root.style.setProperty('--noise-opacity-light', String(opacityLight));
  root.style.setProperty('--noise-opacity-dark', String(opacityDark));
  
  // Color controls (separate for light/dark)
  const colorLight = cfg.noiseColorLight ?? '#ffffff';
  const colorDark = cfg.noiseColorDark ?? '#ffffff';
  root.style.setProperty('--noise-color-light', colorLight);
  root.style.setProperty('--noise-color-dark', colorDark);
  
  root.style.setProperty('--detail-noise-opacity', String(cfg.detailNoiseOpacity ?? 1));
}

function sanitizeConfig(input = {}) {
  const cssNoiseSize = readRootVarNumber('--noise-size', 85);
  const cssOpacityLight = readRootVarNumber('--noise-opacity-light', 0.03);
  const cssOpacityDark = readRootVarNumber('--noise-opacity-dark', 0.03);

  const out = {
    // Texture
    noiseSeed: clampInt(input.noiseSeed, 0, 999999, 1337),
    noiseTextureSize: clampInt(input.noiseTextureSize, 64, 512, 256),
    noiseDistribution: pickEnum(input.noiseDistribution, ['uniform', 'gaussian'], 'gaussian'),
    noiseMonochrome: input.noiseMonochrome !== undefined ? Boolean(input.noiseMonochrome) : false,
    noiseChroma: clamp01(input.noiseChroma, 0.9),

    // Motion
    noiseEnabled: input.noiseEnabled !== undefined ? Boolean(input.noiseEnabled) : true,
    noiseMotion: pickEnum(input.noiseMotion, ['jitter', 'drift', 'static'], 'jitter'),
    noiseMotionAmount: clampNumber(input.noiseMotionAmount, 0, 2.5, 1.0),
    noiseSpeedMs: clampInt(input.noiseSpeedMs, 0, 10000, 1100),
    noiseSpeedVariance: clampNumber(input.noiseSpeedVariance, 0, 1, 0),
    noiseFlicker: clampNumber(input.noiseFlicker, 0, 1, 0.12),
    noiseFlickerSpeedMs: clampInt(input.noiseFlickerSpeedMs, 0, 5000, 220),

    // Look (baked into tile for minimal runtime cost; blur remains optional CSS filter)
    noiseBlurPx: clampNumber(input.noiseBlurPx, 0, 6, 0),
    noiseContrast: clampNumber(input.noiseContrast, 0.25, 5, 1.35),
    noiseBrightness: clampNumber(input.noiseBrightness, 0.25, 3, 1.0),
    noiseSaturation: clampNumber(input.noiseSaturation, 0, 3, 1.0),
    noiseHue: clampNumber(input.noiseHue, 0, 360, 0),

    // Single layer controls
    noiseSize: clampNumber(input.noiseSize, 20, 600, cssNoiseSize),
    noiseOpacity: clampNumber(input.noiseOpacity, 0, 1, 0.03),
    noiseOpacityLight: clampNumber(input.noiseOpacityLight, 0, 1, cssOpacityLight),
    noiseOpacityDark: clampNumber(input.noiseOpacityDark, 0, 1, cssOpacityDark),
    noiseColorLight: typeof input.noiseColorLight === 'string' ? input.noiseColorLight : '#ffffff',
    noiseColorDark: typeof input.noiseColorDark === 'string' ? input.noiseColorDark : '#ffffff',
    detailNoiseOpacity: clampNumber(input.detailNoiseOpacity, 0, 1, 1),
  };

  // If monochrome is on, chroma does nothing but keep a stable number.
  if (out.noiseMonochrome) out.noiseChroma = clamp01(out.noiseChroma, 0.9);

  return out;
}

function scheduleTextureRegeneration(cfg, { force = false } = {}) {
  const textureKey = JSON.stringify({
    seed: cfg.noiseSeed,
    size: cfg.noiseTextureSize,
    distribution: cfg.noiseDistribution,
    monochrome: cfg.noiseMonochrome,
    chroma: cfg.noiseChroma,
    contrast: Number(cfg.noiseContrast).toFixed(3),
    brightness: Number(cfg.noiseBrightness).toFixed(3),
    saturation: Number(cfg.noiseSaturation).toFixed(3),
    hue: Number(cfg.noiseHue).toFixed(1),
  });

  // If disabled, skip generation and clear any existing texture to avoid work.
  if (!cfg.noiseEnabled) {
    if (regenTimer) window.clearTimeout(regenTimer);
    regenTimer = null;
    pendingGenerateId++;
    lastTextureKey = '';
    try {
      const root = document.documentElement;
      root.style.setProperty('--abs-noise-texture', 'none');
      // Remove noise-ready class when disabled
      document.body?.classList.remove('noise-ready');
    } catch (e) {}
    if (activeObjectUrl) {
      try { URL.revokeObjectURL(activeObjectUrl); } catch (e) {}
    }
    activeObjectUrl = null;
    return;
  }

  if (!force && textureKey === lastTextureKey) {
    // Texture already exists, ensure noise-ready class is present
    if (activeObjectUrl && cfg.noiseEnabled) {
      document.body?.classList.add('noise-ready');
    }
    return;
  }
  lastTextureKey = textureKey;

  if (regenTimer) window.clearTimeout(regenTimer);

  // Debounce heavy work (sliders fire rapidly).
  regenTimer = window.setTimeout(async () => {
    regenTimer = null;
    const genId = ++pendingGenerateId;

    const url = await generateNoiseTextureUrl({
      size: cfg.noiseTextureSize,
      seed: cfg.noiseSeed,
      distribution: cfg.noiseDistribution,
      monochrome: cfg.noiseMonochrome,
      chroma: cfg.noiseChroma,
      contrast: cfg.noiseContrast,
      brightness: cfg.noiseBrightness,
      saturation: cfg.noiseSaturation,
      hue: cfg.noiseHue,
    });

    // Discard if a newer request is in-flight.
    if (genId !== pendingGenerateId) {
      if (url) URL.revokeObjectURL(url);
      return;
    }

    if (!url) return;

    try {
      const root = document.documentElement;
      root.style.setProperty('--abs-noise-texture', `url("${url}")`);
      if (activeObjectUrl) URL.revokeObjectURL(activeObjectUrl);
      activeObjectUrl = url;
      // Add noise-ready class to enable noise visibility
      document.body?.classList.add('noise-ready');
    } catch (e) {
      URL.revokeObjectURL(url);
    }
  }, 140);
}

function mergeConfig(nextPartial = {}) {
  const base = current || sanitizeConfig({});
  const merged = { ...base, ...pickNoiseKeys(nextPartial) };
  return sanitizeConfig(merged);
}

export function initNoiseSystem(initialConfig = {}) {
  // Safe to call multiple times (idempotent).
  current = mergeConfig(initialConfig);
  initialized = true;

  applyCssVars(current);
  scheduleTextureRegeneration(current, { force: true });
  
  // If noise is enabled and texture already exists, ensure noise-ready class is present
  if (current.noiseEnabled && activeObjectUrl) {
    document.body?.classList.add('noise-ready');
  }
}

export function applyNoiseSystem(nextConfig = {}) {
  if (!initialized) initNoiseSystem(nextConfig);

  current = mergeConfig(nextConfig);
  applyCssVars(current);

  // Only regenerate the texture if texture-related knobs changed.
  scheduleTextureRegeneration(current);
}

export function getNoiseSystemConfig() {
  return current ? { ...current } : null;
}

export function destroyNoiseSystem() {
  if (regenTimer) window.clearTimeout(regenTimer);
  regenTimer = null;
  pendingGenerateId++;

  try {
    const root = document.documentElement;
    root.style.removeProperty('--abs-noise-texture');
  } catch (e) {}

  if (activeObjectUrl) {
    try {
      URL.revokeObjectURL(activeObjectUrl);
    } catch (e) {}
  }

  activeObjectUrl = null;
  current = null;
  initialized = false;
  lastTextureKey = '';
}
