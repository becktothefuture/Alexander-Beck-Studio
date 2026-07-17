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

const NOISE_STRUCTURE_SCALE_DEFAULT = 0.38;
const NOISE_STRUCTURE_SEED_OFFSET = 0x6C8E9CF5;
const NOISE_INK_COLOR_FALLBACK = '#050505';
const NOISE_INK_MAX_LUMA = 32;
const NOISE_INK_ALPHA_THRESHOLD = 0.68;
const NOISE_INK_ALPHA_GAIN = 1.2;

function setNoiseReady(ready) {
  document.documentElement.classList.toggle('noise-ready', ready);
  document.body?.classList.toggle('noise-ready', ready);
}

const NOISE_KEYS = [
  'noiseEnabled',
  'noiseSeed',
  'noiseTextureSize',
  'noiseSvgEnabled',
  'noiseSvgBaseFrequency',
  'noiseSvgOctaves',
  'noiseSvgSeed',
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
  'noiseStructureStrength',
  'noiseStructureScale',
  'noiseSize',
  'noiseOpacity',
  'noiseOpacityLight',
  'noiseOpacityDark',
  'noiseOffsetY',
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

function clampByte(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
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

function sampleNoise01(rng, useGaussian) {
  return useGaussian ? gaussian01(rng) : rng();
}

function lerp(a, b, t) {
  return a + ((b - a) * t);
}

function smoothstep(t) {
  return t * t * (3 - (2 * t));
}

function getStructureBlendWeights(strength) {
  const safeStrength = clampNumber(strength, 0, 0.45, 0.22);
  return {
    strength: safeStrength,
    primaryWeight: 1 - (safeStrength * 0.35),
    offset: 0.5 * (safeStrength * -0.65),
  };
}

function sanitizeStructureScale(value) {
  return clampNumber(value, 0.18, 0.75, NOISE_STRUCTURE_SCALE_DEFAULT);
}

function buildStructureField({ size, seed, useGaussian, scale }) {
  const gridSize = Math.max(4, Math.round(size * sanitizeStructureScale(scale)));
  const rng = mulberry32((seed ^ NOISE_STRUCTURE_SEED_OFFSET) >>> 0);
  const values = new Float32Array(gridSize * gridSize);

  for (let i = 0; i < values.length; i++) {
    values[i] = sampleNoise01(rng, useGaussian);
  }

  return { gridSize, values };
}

function sampleStructureField(field, x, y, size) {
  const { gridSize, values } = field;
  const gx = (x * gridSize) / size;
  const gy = (y * gridSize) / size;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const x1 = (x0 + 1) % gridSize;
  const y1 = (y0 + 1) % gridSize;
  const tx = smoothstep(gx - x0);
  const ty = smoothstep(gy - y0);
  const ix0 = x0 % gridSize;
  const iy0 = y0 % gridSize;

  const v00 = values[(iy0 * gridSize) + ix0];
  const v10 = values[(iy0 * gridSize) + x1];
  const v01 = values[(y1 * gridSize) + ix0];
  const v11 = values[(y1 * gridSize) + x1];

  return lerp(lerp(v00, v10, tx), lerp(v01, v11, tx), ty);
}

function mixStructure(primary, structure, weights) {
  return Math.max(0, Math.min(1, (primary * weights.primaryWeight) + (structure * weights.strength) + weights.offset));
}

function parseHexColor(value) {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  const shortMatch = raw.match(/^#([0-9a-f]{3})$/i);
  if (shortMatch) {
    const [r, g, b] = shortMatch[1].split('').map((c) => Number.parseInt(`${c}${c}`, 16));
    return { r, g, b };
  }
  const longMatch = raw.match(/^#([0-9a-f]{6})$/i);
  if (!longMatch) return null;
  return {
    r: Number.parseInt(longMatch[1].slice(0, 2), 16),
    g: Number.parseInt(longMatch[1].slice(2, 4), 16),
    b: Number.parseInt(longMatch[1].slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((v) => clampByte(v).toString(16).padStart(2, '0')).join('')}`;
}

function getDarkInkRgb(value) {
  const rgb = parseHexColor(value) || parseHexColor(NOISE_INK_COLOR_FALLBACK);
  const luma = (rgb.r * 0.213) + (rgb.g * 0.715) + (rgb.b * 0.072);
  if (luma <= NOISE_INK_MAX_LUMA) return rgb;
  const scale = NOISE_INK_MAX_LUMA / Math.max(1, luma);
  return {
    r: clampByte(rgb.r * scale),
    g: clampByte(rgb.g * scale),
    b: clampByte(rgb.b * scale),
  };
}

function getDarkInkHex(value) {
  return rgbToHex(getDarkInkRgb(value));
}

function getInkAlphaConfig({ contrast = 1.35, brightness = 1 } = {}) {
  const safeContrast = clampNumber(contrast, 0.25, 5, 1.35);
  const safeBrightness = clampNumber(brightness, 0.25, 3, 1);
  return {
    threshold: NOISE_INK_ALPHA_THRESHOLD,
    gain: clampNumber(NOISE_INK_ALPHA_GAIN * (safeContrast / 1.35) / Math.max(0.75, safeBrightness), 0.55, 3.6, NOISE_INK_ALPHA_GAIN),
  };
}

function getInkAlpha(luma, config) {
  return clamp01((config.threshold - clamp01(luma, 0.5)) * config.gain, 0);
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

function waitForNextFrame() {
  return new Promise((resolve) => {
    try {
      window.requestAnimationFrame(() => resolve());
    } catch (e) {
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
    timeoutId = window.setTimeout(settle, 600);
    img.src = url;

    if (typeof img.decode === 'function') {
      img.decode().then(settle).catch(() => {});
    }
  });
}

async function commitNoiseTextureUrl(url, { genId, objectUrl = false } = {}) {
  await decodeTextureUrl(url);
  if (genId !== pendingGenerateId) {
    if (objectUrl && url) {
      try { URL.revokeObjectURL(url); } catch (e) {}
    }
    return false;
  }

  try {
    const root = document.documentElement;
    const previousObjectUrl = activeObjectUrl;

    root.style.setProperty('--abs-noise-texture', `url("${url}")`);
    activeObjectUrl = objectUrl ? url : null;

    if (previousObjectUrl && previousObjectUrl !== url) {
      try { URL.revokeObjectURL(previousObjectUrl); } catch (e) {}
    }

    await waitForNextFrame();
    if (genId !== pendingGenerateId) return false;
    setNoiseReady(true);
    return true;
  } catch (e) {
    if (objectUrl && url) {
      try { URL.revokeObjectURL(url); } catch (err) {}
    }
    return false;
  }
}

async function generateNoiseTextureUrl({
  size,
  seed,
  inkColor,
  distribution,
  monochrome,
  chroma,
  contrast,
  brightness,
  saturation,
  hue,
  structureStrength,
  structureScale,
}) {
  const ctx = ensureTextureCanvas(size);
  if (!ctx) return null;

  if (!cachedImageData) {
    cachedImageData = ctx.createImageData(size, size);
    cachedData32 = new Uint32Array(cachedImageData.data.buffer);
  }

  const data32 = cachedData32;
  const rng = mulberry32(seed);
  const inkRgb = getDarkInkRgb(inkColor);

  const useGaussian = distribution === 'gaussian';
  const structureWeights = getStructureBlendWeights(structureStrength);
  const structureField = structureWeights.strength > 0
    ? buildStructureField({ size, seed, useGaussian, scale: structureScale })
    : null;
  const colorMix = clamp01(chroma, 0);
  const invColorMix = 1 - colorMix;

  const c = clampNumber(contrast, 0.25, 5, 1);
  const bMul = clampNumber(brightness, 0.25, 3, 1);
  const sat = clampNumber(saturation, 0, 3, 1);
  const hueDeg = clampNumber(hue, 0, 360, 0);
  const alphaConfig = getInkAlphaConfig();

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

  for (let y = 0, i = 0; y < size; y++) {
    for (let x = 0; x < size; x++, i++) {
      const structure = structureField ? sampleStructureField(structureField, x, y, size) : 0.5;
      const base = mixStructure(sampleNoise01(rng, useGaussian), structure, structureWeights);

      let r = base;
      let g = base;
      let b = base;

      if (!monochrome) {
        const r2 = mixStructure(sampleNoise01(rng, useGaussian), structure, structureWeights);
        const g2 = mixStructure(sampleNoise01(rng, useGaussian), structure, structureWeights);
        const b2 = mixStructure(sampleNoise01(rng, useGaussian), structure, structureWeights);
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

      const luma = r * lumR + g * lumG + b * lumB;
      const alpha = clampByte(getInkAlpha(luma, alphaConfig) * 255);
      data32[i] = (alpha << 24) | (inkRgb.b << 16) | (inkRgb.g << 8) | inkRgb.r;
    }
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
  const opacityLight = clampNumber(cfg.noiseOpacityLight ?? cfg.noiseOpacity ?? 0.04, 0, 1, 0.04);
  const opacityDark = clampNumber(cfg.noiseOpacityDark ?? cfg.noiseOpacity ?? 0.04, 0, 1, 0.04);
  root.style.setProperty('--noise-opacity-light', String(opacityLight));
  root.style.setProperty('--noise-opacity-dark', String(opacityDark));
  root.style.setProperty('--abs-noise-offset-y', `${Math.round(cfg.noiseOffsetY ?? 0)}px`);
  
  // Color controls (separate for light/dark)
  const colorLight = cfg.noiseColorLight ?? "var(--color-detected-2a2a2e)";
  const colorDark = cfg.noiseColorDark ?? "var(--color-detected-d4d4d8)";
  root.style.setProperty('--noise-color-light', colorLight);
  root.style.setProperty('--noise-color-dark', colorDark);
  
  root.style.setProperty('--detail-noise-opacity', String(cfg.detailNoiseOpacity ?? 1));
}

function sanitizeConfig(input = {}) {
  const cssNoiseSize = readRootVarNumber('--noise-size', 85);
  const cssOpacityLight = readRootVarNumber('--noise-opacity-light', 0.04);
  const cssOpacityDark = readRootVarNumber('--noise-opacity-dark', 0.04);

  const out = {
    // Texture
    noiseSeed: clampInt(input.noiseSeed, 0, 999999, 1337),
    noiseTextureSize: clampInt(input.noiseTextureSize, 64, 512, 256),
    noiseSvgEnabled: input.noiseSvgEnabled !== undefined ? Boolean(input.noiseSvgEnabled) : false,
    noiseSvgBaseFrequency: clampNumber(input.noiseSvgBaseFrequency, 0.01, 2, 0.8),
    noiseSvgOctaves: clampInt(input.noiseSvgOctaves, 1, 6, 2),
    noiseSvgSeed: clampInt(input.noiseSvgSeed, 0, 999999, input.noiseSeed ?? 1337),
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
    noiseStructureStrength: clampNumber(input.noiseStructureStrength, 0, 0.45, 0.22),
    noiseStructureScale: sanitizeStructureScale(input.noiseStructureScale),

    // Single layer controls
    noiseSize: clampNumber(input.noiseSize, 20, 600, cssNoiseSize),
    noiseOpacity: clampNumber(input.noiseOpacity, 0, 1, 0.04),
    noiseOpacityLight: clampNumber(input.noiseOpacityLight, 0, 1, cssOpacityLight),
    noiseOpacityDark: clampNumber(input.noiseOpacityDark, 0, 1, cssOpacityDark),
    noiseOffsetY: clampNumber(input.noiseOffsetY, -50, 50, 0),
    noiseColorLight: typeof input.noiseColorLight === 'string' ? input.noiseColorLight : "var(--color-detected-2a2a2e)",
    noiseColorDark: typeof input.noiseColorDark === 'string' ? input.noiseColorDark : "var(--color-detected-d4d4d8)",
    detailNoiseOpacity: clampNumber(input.detailNoiseOpacity, 0, 1, 1),
  };

  // If monochrome is on, chroma does nothing but keep a stable number.
  if (out.noiseMonochrome) out.noiseChroma = clamp01(out.noiseChroma, 0.9);

  return out;
}

function encodeSvgDataUri(svg) {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function buildSvgNoiseDataUri({
  size,
  baseFrequency,
  octaves,
  seed,
  color,
  contrast,
  brightness,
  structureStrength,
  structureScale,
}) {
  const safeSize = Math.max(8, Math.round(size || 128));
  const safeFreq = Number.isFinite(baseFrequency) ? baseFrequency : 0.8;
  const safeOctaves = Math.max(1, Math.round(octaves || 2));
  const safeSeed = Math.max(0, Math.round(seed || 0));
  const safeColor = getDarkInkHex(color);
  const weights = getStructureBlendWeights(structureStrength);
  const alphaConfig = getInkAlphaConfig({ contrast, brightness });
  const alphaChannel = (alphaConfig.gain / 3).toFixed(4);
  const alphaBias = (alphaConfig.threshold * alphaConfig.gain).toFixed(4);
  const structureFreq = Math.max(0.01, safeFreq * sanitizeStructureScale(structureScale));
  const structureSeed = (safeSeed + (NOISE_STRUCTURE_SEED_OFFSET % 999999)) % 999999;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${safeSize}" height="${safeSize}" viewBox="0 0 ${safeSize} ${safeSize}" preserveAspectRatio="none">` +
    `<filter id="n" x="0" y="0" width="100%" height="100%">` +
    `<feTurbulence type="fractalNoise" baseFrequency="${safeFreq}" numOctaves="${safeOctaves}" seed="${safeSeed}" stitchTiles="stitch" result="primary"/>` +
    `<feTurbulence type="fractalNoise" baseFrequency="${structureFreq.toFixed(4)}" numOctaves="${Math.max(1, safeOctaves - 1)}" seed="${structureSeed}" stitchTiles="stitch" result="structure"/>` +
    `<feComposite in="primary" in2="structure" operator="arithmetic" k1="0" k2="${weights.primaryWeight.toFixed(4)}" k3="${weights.strength.toFixed(4)}" k4="${weights.offset.toFixed(4)}" result="noise"/>` +
    `<feColorMatrix in="noise" type="saturate" values="0" result="mono"/>` +
    `<feColorMatrix in="mono" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -${alphaChannel} -${alphaChannel} -${alphaChannel} 0 ${alphaBias}" result="inkAlpha"/>` +
    `<feFlood flood-color="${safeColor}" result="inkColor"/>` +
    `<feComposite in="inkColor" in2="inkAlpha" operator="in" result="ink"/>` +
    `</filter>` +
    `<rect width="100%" height="100%" fill="transparent" filter="url(#n)"/>` +
    `</svg>`;

  return encodeSvgDataUri(svg);
}

function scheduleTextureRegeneration(cfg, { force = false } = {}) {
  const isDark = document.body?.classList?.contains('dark-mode');
  const inkColor = isDark ? (cfg.noiseColorDark ?? '#050505') : (cfg.noiseColorLight ?? '#050505');

  const textureKey = JSON.stringify({
    seed: cfg.noiseSeed,
    size: cfg.noiseTextureSize,
    svgEnabled: cfg.noiseSvgEnabled,
    svgFrequency: cfg.noiseSvgBaseFrequency,
    svgOctaves: cfg.noiseSvgOctaves,
    svgSeed: cfg.noiseSvgSeed,
    inkColor: getDarkInkHex(inkColor),
    distribution: cfg.noiseDistribution,
    monochrome: cfg.noiseMonochrome,
    chroma: cfg.noiseChroma,
    contrast: Number(cfg.noiseContrast).toFixed(3),
    brightness: Number(cfg.noiseBrightness).toFixed(3),
    saturation: Number(cfg.noiseSaturation).toFixed(3),
    hue: Number(cfg.noiseHue).toFixed(1),
    structureStrength: Number(cfg.noiseStructureStrength).toFixed(3),
    structureScale: Number(cfg.noiseStructureScale).toFixed(3),
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
      setNoiseReady(false);
    } catch (e) {}
    if (activeObjectUrl) {
      try { URL.revokeObjectURL(activeObjectUrl); } catch (e) {}
    }
    activeObjectUrl = null;
    return;
  }

  if (!force && textureKey === lastTextureKey) {
    // Texture already exists, ensure noise-ready class is present
    if ((activeObjectUrl || cfg.noiseSvgEnabled) && cfg.noiseEnabled) {
      setNoiseReady(true);
    }
    return;
  }
  lastTextureKey = textureKey;

  if (regenTimer) window.clearTimeout(regenTimer);

  // Debounce heavy work (sliders fire rapidly).
  regenTimer = window.setTimeout(async () => {
    regenTimer = null;
    const genId = ++pendingGenerateId;

    if (cfg.noiseSvgEnabled) {
      const svgUrl = buildSvgNoiseDataUri({
        size: cfg.noiseTextureSize,
        baseFrequency: cfg.noiseSvgBaseFrequency,
        octaves: cfg.noiseSvgOctaves,
        seed: cfg.noiseSvgSeed,
        color: inkColor,
        contrast: cfg.noiseContrast,
        brightness: cfg.noiseBrightness,
        structureStrength: cfg.noiseStructureStrength,
        structureScale: cfg.noiseStructureScale,
      });

      if (genId !== pendingGenerateId) return;
      await commitNoiseTextureUrl(svgUrl, { genId, objectUrl: false });
      return;
    }

    const url = await generateNoiseTextureUrl({
      size: cfg.noiseTextureSize,
      seed: cfg.noiseSeed,
      inkColor,
      distribution: cfg.noiseDistribution,
      monochrome: cfg.noiseMonochrome,
      chroma: cfg.noiseChroma,
      contrast: cfg.noiseContrast,
      brightness: cfg.noiseBrightness,
      saturation: cfg.noiseSaturation,
      hue: cfg.noiseHue,
      structureStrength: cfg.noiseStructureStrength,
      structureScale: cfg.noiseStructureScale,
    });

    // Discard if a newer request is in-flight.
    if (genId !== pendingGenerateId) {
      if (url) URL.revokeObjectURL(url);
      return;
    }

    if (!url) return;

    await commitNoiseTextureUrl(url, { genId, objectUrl: true });
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
  if (current.noiseEnabled && (activeObjectUrl || current.noiseSvgEnabled)) {
    setNoiseReady(true);
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
  setNoiseReady(false);
  current = null;
  initialized = false;
  lastTextureKey = '';
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vaXNlLXN5c3RlbS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBQcm9jZWR1cmFsIGZpbG0tZ3JhaW4gLyBub2lzZSBzeXN0ZW0gKG5vIGV4dGVybmFsIEdJRikuXG4vLyBHZW5lcmF0ZXMgYSBzbWFsbCBub2lzZSB0ZXh0dXJlIGF0IHJ1bnRpbWUgYW5kIGRyaXZlcyBtb3Rpb24gdmlhIENTUy1vbmx5IGFuaW1hdGlvbnMuXG5cbmxldCBpbml0aWFsaXplZCA9IGZhbHNlO1xubGV0IGN1cnJlbnQgPSBudWxsO1xuXG5sZXQgdGV4dHVyZUNhbnZhcyA9IG51bGw7XG5sZXQgdGV4dHVyZUN0eCA9IG51bGw7XG5sZXQgY2FjaGVkSW1hZ2VEYXRhID0gbnVsbDtcbmxldCBjYWNoZWREYXRhMzIgPSBudWxsO1xubGV0IGNhY2hlZFNpemUgPSAwO1xuXG5sZXQgYWN0aXZlT2JqZWN0VXJsID0gbnVsbDtcbmxldCBwZW5kaW5nR2VuZXJhdGVJZCA9IDA7XG5sZXQgcmVnZW5UaW1lciA9IG51bGw7XG5sZXQgbGFzdFRleHR1cmVLZXkgPSAnJztcblxuY29uc3QgTk9JU0VfU1RSVUNUVVJFX1NDQUxFX0RFRkFVTFQgPSAwLjM4O1xuY29uc3QgTk9JU0VfU1RSVUNUVVJFX1NFRURfT0ZGU0VUID0gMHg2QzhFOUNGNTtcbmNvbnN0IE5PSVNFX0lOS19DT0xPUl9GQUxMQkFDSyA9ICcjMDUwNTA1JztcbmNvbnN0IE5PSVNFX0lOS19NQVhfTFVNQSA9IDMyO1xuY29uc3QgTk9JU0VfSU5LX0FMUEhBX1RIUkVTSE9MRCA9IDAuNjg7XG5jb25zdCBOT0lTRV9JTktfQUxQSEFfR0FJTiA9IDEuMjtcblxuZnVuY3Rpb24gc2V0Tm9pc2VSZWFkeShyZWFkeSkge1xuICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xhc3NMaXN0LnRvZ2dsZSgnbm9pc2UtcmVhZHknLCByZWFkeSk7XG4gIGRvY3VtZW50LmJvZHk/LmNsYXNzTGlzdC50b2dnbGUoJ25vaXNlLXJlYWR5JywgcmVhZHkpO1xufVxuXG5jb25zdCBOT0lTRV9LRVlTID0gW1xuICAnbm9pc2VFbmFibGVkJyxcbiAgJ25vaXNlU2VlZCcsXG4gICdub2lzZVRleHR1cmVTaXplJyxcbiAgJ25vaXNlU3ZnRW5hYmxlZCcsXG4gICdub2lzZVN2Z0Jhc2VGcmVxdWVuY3knLFxuICAnbm9pc2VTdmdPY3RhdmVzJyxcbiAgJ25vaXNlU3ZnU2VlZCcsXG4gICdub2lzZURpc3RyaWJ1dGlvbicsXG4gICdub2lzZU1vbm9jaHJvbWUnLFxuICAnbm9pc2VDaHJvbWEnLFxuICAnbm9pc2VNb3Rpb24nLFxuICAnbm9pc2VNb3Rpb25BbW91bnQnLFxuICAnbm9pc2VTcGVlZE1zJyxcbiAgJ25vaXNlU3BlZWRWYXJpYW5jZScsXG4gICdub2lzZUZsaWNrZXInLFxuICAnbm9pc2VGbGlja2VyU3BlZWRNcycsXG4gICdub2lzZUJsdXJQeCcsXG4gICdub2lzZUNvbnRyYXN0JyxcbiAgJ25vaXNlQnJpZ2h0bmVzcycsXG4gICdub2lzZVNhdHVyYXRpb24nLFxuICAnbm9pc2VIdWUnLFxuICAnbm9pc2VTdHJ1Y3R1cmVTdHJlbmd0aCcsXG4gICdub2lzZVN0cnVjdHVyZVNjYWxlJyxcbiAgJ25vaXNlU2l6ZScsXG4gICdub2lzZU9wYWNpdHknLFxuICAnbm9pc2VPcGFjaXR5TGlnaHQnLFxuICAnbm9pc2VPcGFjaXR5RGFyaycsXG4gICdub2lzZU9mZnNldFknLFxuICAnbm9pc2VDb2xvckxpZ2h0JyxcbiAgJ25vaXNlQ29sb3JEYXJrJyxcbiAgJ2RldGFpbE5vaXNlT3BhY2l0eScsXG5dO1xuXG5mdW5jdGlvbiBwaWNrTm9pc2VLZXlzKGlucHV0KSB7XG4gIGNvbnN0IG91dCA9IHt9O1xuICBpZiAoIWlucHV0IHx8IHR5cGVvZiBpbnB1dCAhPT0gJ29iamVjdCcpIHJldHVybiBvdXQ7XG4gIGZvciAoY29uc3Qga2V5IG9mIE5PSVNFX0tFWVMpIHtcbiAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGlucHV0LCBrZXkpKSBvdXRba2V5XSA9IGlucHV0W2tleV07XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cblxuZnVuY3Rpb24gY2xhbXBOdW1iZXIodiwgbWluLCBtYXgsIGZhbGxiYWNrKSB7XG4gIGNvbnN0IG4gPSB0eXBlb2YgdiA9PT0gJ251bWJlcicgPyB2IDogTnVtYmVyKHYpO1xuICBpZiAoIU51bWJlci5pc0Zpbml0ZShuKSkgcmV0dXJuIGZhbGxiYWNrO1xuICByZXR1cm4gTWF0aC5taW4obWF4LCBNYXRoLm1heChtaW4sIG4pKTtcbn1cblxuZnVuY3Rpb24gY2xhbXBJbnQodiwgbWluLCBtYXgsIGZhbGxiYWNrKSB7XG4gIGNvbnN0IG4gPSB0eXBlb2YgdiA9PT0gJ251bWJlcicgPyB2IDogTnVtYmVyKHYpO1xuICBpZiAoIU51bWJlci5pc0Zpbml0ZShuKSkgcmV0dXJuIGZhbGxiYWNrO1xuICByZXR1cm4gTWF0aC5taW4obWF4LCBNYXRoLm1heChtaW4sIE1hdGgucm91bmQobikpKTtcbn1cblxuZnVuY3Rpb24gY2xhbXAwMSh2LCBmYWxsYmFjayA9IDApIHtcbiAgcmV0dXJuIGNsYW1wTnVtYmVyKHYsIDAsIDEsIGZhbGxiYWNrKTtcbn1cblxuZnVuY3Rpb24gY2xhbXBCeXRlKHYpIHtcbiAgcmV0dXJuIE1hdGgubWF4KDAsIE1hdGgubWluKDI1NSwgTWF0aC5yb3VuZCh2KSkpO1xufVxuXG5mdW5jdGlvbiBwaWNrRW51bSh2LCBhbGxvd2VkLCBmYWxsYmFjaykge1xuICByZXR1cm4gYWxsb3dlZC5pbmNsdWRlcyh2KSA/IHYgOiBmYWxsYmFjaztcbn1cblxuZnVuY3Rpb24gcmVhZFJvb3RWYXJOdW1iZXIobmFtZSwgZmFsbGJhY2spIHtcbiAgdHJ5IHtcbiAgICBjb25zdCByYXcgPSBnZXRDb21wdXRlZFN0eWxlKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCkuZ2V0UHJvcGVydHlWYWx1ZShuYW1lKS50cmltKCk7XG4gICAgY29uc3QgbiA9IE51bWJlci5wYXJzZUZsb2F0KHJhdyk7XG4gICAgcmV0dXJuIE51bWJlci5pc0Zpbml0ZShuKSA/IG4gOiBmYWxsYmFjaztcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGZhbGxiYWNrO1xuICB9XG59XG5cbmZ1bmN0aW9uIG11bGJlcnJ5MzIoc2VlZCkge1xuICBsZXQgdCA9IHNlZWQgPj4+IDA7XG4gIHJldHVybiBmdW5jdGlvbiBuZXh0KCkge1xuICAgIHQgKz0gMHg2RDJCNzlGNTtcbiAgICBsZXQgeCA9IHQ7XG4gICAgeCA9IE1hdGguaW11bCh4IF4gKHggPj4+IDE1KSwgeCB8IDEpO1xuICAgIHggXj0geCArIE1hdGguaW11bCh4IF4gKHggPj4+IDcpLCB4IHwgNjEpO1xuICAgIHJldHVybiAoKHggXiAoeCA+Pj4gMTQpKSA+Pj4gMCkgLyA0Mjk0OTY3Mjk2O1xuICB9O1xufVxuXG5mdW5jdGlvbiBnYXVzc2lhbjAxKHJuZykge1xuICAvLyBGYXN0LWlzaCBHYXVzc2lhbi1pc2ggc2FtcGxlciAobm8gdHJpZy9sb2cpOlxuICAvLyBJcndpbuKAk0hhbGwgYXBwcm94aW1hdGlvbiB2aWEgYXZlcmFnaW5nIDMgdW5pZm9ybXMgKHRyaWFuZ3VsYXItaXNoIOKGkiBuZWFyLW5vcm1hbCkuXG4gIGNvbnN0IHYgPSAocm5nKCkgKyBybmcoKSArIHJuZygpKSAvIDM7XG4gIC8vIFNsaWdodGx5IHdpZGVuIHRoZSBtaWQtdG9uZXMgdG8gZmVlbCBtb3JlIFwiZmlsbWljXCIgYWZ0ZXIgY29udHJhc3QgaXMgYXBwbGllZC5cbiAgcmV0dXJuIE1hdGgubWF4KDAsIE1hdGgubWluKDEsIDAuNSArICh2IC0gMC41KSAqIDEuMTUpKTtcbn1cblxuZnVuY3Rpb24gc2FtcGxlTm9pc2UwMShybmcsIHVzZUdhdXNzaWFuKSB7XG4gIHJldHVybiB1c2VHYXVzc2lhbiA/IGdhdXNzaWFuMDEocm5nKSA6IHJuZygpO1xufVxuXG5mdW5jdGlvbiBsZXJwKGEsIGIsIHQpIHtcbiAgcmV0dXJuIGEgKyAoKGIgLSBhKSAqIHQpO1xufVxuXG5mdW5jdGlvbiBzbW9vdGhzdGVwKHQpIHtcbiAgcmV0dXJuIHQgKiB0ICogKDMgLSAoMiAqIHQpKTtcbn1cblxuZnVuY3Rpb24gZ2V0U3RydWN0dXJlQmxlbmRXZWlnaHRzKHN0cmVuZ3RoKSB7XG4gIGNvbnN0IHNhZmVTdHJlbmd0aCA9IGNsYW1wTnVtYmVyKHN0cmVuZ3RoLCAwLCAwLjQ1LCAwLjIyKTtcbiAgcmV0dXJuIHtcbiAgICBzdHJlbmd0aDogc2FmZVN0cmVuZ3RoLFxuICAgIHByaW1hcnlXZWlnaHQ6IDEgLSAoc2FmZVN0cmVuZ3RoICogMC4zNSksXG4gICAgb2Zmc2V0OiAwLjUgKiAoc2FmZVN0cmVuZ3RoICogLTAuNjUpLFxuICB9O1xufVxuXG5mdW5jdGlvbiBzYW5pdGl6ZVN0cnVjdHVyZVNjYWxlKHZhbHVlKSB7XG4gIHJldHVybiBjbGFtcE51bWJlcih2YWx1ZSwgMC4xOCwgMC43NSwgTk9JU0VfU1RSVUNUVVJFX1NDQUxFX0RFRkFVTFQpO1xufVxuXG5mdW5jdGlvbiBidWlsZFN0cnVjdHVyZUZpZWxkKHsgc2l6ZSwgc2VlZCwgdXNlR2F1c3NpYW4sIHNjYWxlIH0pIHtcbiAgY29uc3QgZ3JpZFNpemUgPSBNYXRoLm1heCg0LCBNYXRoLnJvdW5kKHNpemUgKiBzYW5pdGl6ZVN0cnVjdHVyZVNjYWxlKHNjYWxlKSkpO1xuICBjb25zdCBybmcgPSBtdWxiZXJyeTMyKChzZWVkIF4gTk9JU0VfU1RSVUNUVVJFX1NFRURfT0ZGU0VUKSA+Pj4gMCk7XG4gIGNvbnN0IHZhbHVlcyA9IG5ldyBGbG9hdDMyQXJyYXkoZ3JpZFNpemUgKiBncmlkU2l6ZSk7XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB2YWx1ZXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YWx1ZXNbaV0gPSBzYW1wbGVOb2lzZTAxKHJuZywgdXNlR2F1c3NpYW4pO1xuICB9XG5cbiAgcmV0dXJuIHsgZ3JpZFNpemUsIHZhbHVlcyB9O1xufVxuXG5mdW5jdGlvbiBzYW1wbGVTdHJ1Y3R1cmVGaWVsZChmaWVsZCwgeCwgeSwgc2l6ZSkge1xuICBjb25zdCB7IGdyaWRTaXplLCB2YWx1ZXMgfSA9IGZpZWxkO1xuICBjb25zdCBneCA9ICh4ICogZ3JpZFNpemUpIC8gc2l6ZTtcbiAgY29uc3QgZ3kgPSAoeSAqIGdyaWRTaXplKSAvIHNpemU7XG4gIGNvbnN0IHgwID0gTWF0aC5mbG9vcihneCk7XG4gIGNvbnN0IHkwID0gTWF0aC5mbG9vcihneSk7XG4gIGNvbnN0IHgxID0gKHgwICsgMSkgJSBncmlkU2l6ZTtcbiAgY29uc3QgeTEgPSAoeTAgKyAxKSAlIGdyaWRTaXplO1xuICBjb25zdCB0eCA9IHNtb290aHN0ZXAoZ3ggLSB4MCk7XG4gIGNvbnN0IHR5ID0gc21vb3Roc3RlcChneSAtIHkwKTtcbiAgY29uc3QgaXgwID0geDAgJSBncmlkU2l6ZTtcbiAgY29uc3QgaXkwID0geTAgJSBncmlkU2l6ZTtcblxuICBjb25zdCB2MDAgPSB2YWx1ZXNbKGl5MCAqIGdyaWRTaXplKSArIGl4MF07XG4gIGNvbnN0IHYxMCA9IHZhbHVlc1soaXkwICogZ3JpZFNpemUpICsgeDFdO1xuICBjb25zdCB2MDEgPSB2YWx1ZXNbKHkxICogZ3JpZFNpemUpICsgaXgwXTtcbiAgY29uc3QgdjExID0gdmFsdWVzWyh5MSAqIGdyaWRTaXplKSArIHgxXTtcblxuICByZXR1cm4gbGVycChsZXJwKHYwMCwgdjEwLCB0eCksIGxlcnAodjAxLCB2MTEsIHR4KSwgdHkpO1xufVxuXG5mdW5jdGlvbiBtaXhTdHJ1Y3R1cmUocHJpbWFyeSwgc3RydWN0dXJlLCB3ZWlnaHRzKSB7XG4gIHJldHVybiBNYXRoLm1heCgwLCBNYXRoLm1pbigxLCAocHJpbWFyeSAqIHdlaWdodHMucHJpbWFyeVdlaWdodCkgKyAoc3RydWN0dXJlICogd2VpZ2h0cy5zdHJlbmd0aCkgKyB3ZWlnaHRzLm9mZnNldCkpO1xufVxuXG5mdW5jdGlvbiBwYXJzZUhleENvbG9yKHZhbHVlKSB7XG4gIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgcmF3ID0gdmFsdWUudHJpbSgpO1xuICBjb25zdCBzaG9ydE1hdGNoID0gcmF3Lm1hdGNoKC9eIyhbMC05YS1mXXszfSkkL2kpO1xuICBpZiAoc2hvcnRNYXRjaCkge1xuICAgIGNvbnN0IFtyLCBnLCBiXSA9IHNob3J0TWF0Y2hbMV0uc3BsaXQoJycpLm1hcCgoYykgPT4gTnVtYmVyLnBhcnNlSW50KGAke2N9JHtjfWAsIDE2KSk7XG4gICAgcmV0dXJuIHsgciwgZywgYiB9O1xuICB9XG4gIGNvbnN0IGxvbmdNYXRjaCA9IHJhdy5tYXRjaCgvXiMoWzAtOWEtZl17Nn0pJC9pKTtcbiAgaWYgKCFsb25nTWF0Y2gpIHJldHVybiBudWxsO1xuICByZXR1cm4ge1xuICAgIHI6IE51bWJlci5wYXJzZUludChsb25nTWF0Y2hbMV0uc2xpY2UoMCwgMiksIDE2KSxcbiAgICBnOiBOdW1iZXIucGFyc2VJbnQobG9uZ01hdGNoWzFdLnNsaWNlKDIsIDQpLCAxNiksXG4gICAgYjogTnVtYmVyLnBhcnNlSW50KGxvbmdNYXRjaFsxXS5zbGljZSg0LCA2KSwgMTYpLFxuICB9O1xufVxuXG5mdW5jdGlvbiByZ2JUb0hleCh7IHIsIGcsIGIgfSkge1xuICByZXR1cm4gYCMke1tyLCBnLCBiXS5tYXAoKHYpID0+IGNsYW1wQnl0ZSh2KS50b1N0cmluZygxNikucGFkU3RhcnQoMiwgJzAnKSkuam9pbignJyl9YDtcbn1cblxuZnVuY3Rpb24gZ2V0RGFya0lua1JnYih2YWx1ZSkge1xuICBjb25zdCByZ2IgPSBwYXJzZUhleENvbG9yKHZhbHVlKSB8fCBwYXJzZUhleENvbG9yKE5PSVNFX0lOS19DT0xPUl9GQUxMQkFDSyk7XG4gIGNvbnN0IGx1bWEgPSAocmdiLnIgKiAwLjIxMykgKyAocmdiLmcgKiAwLjcxNSkgKyAocmdiLmIgKiAwLjA3Mik7XG4gIGlmIChsdW1hIDw9IE5PSVNFX0lOS19NQVhfTFVNQSkgcmV0dXJuIHJnYjtcbiAgY29uc3Qgc2NhbGUgPSBOT0lTRV9JTktfTUFYX0xVTUEgLyBNYXRoLm1heCgxLCBsdW1hKTtcbiAgcmV0dXJuIHtcbiAgICByOiBjbGFtcEJ5dGUocmdiLnIgKiBzY2FsZSksXG4gICAgZzogY2xhbXBCeXRlKHJnYi5nICogc2NhbGUpLFxuICAgIGI6IGNsYW1wQnl0ZShyZ2IuYiAqIHNjYWxlKSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0RGFya0lua0hleCh2YWx1ZSkge1xuICByZXR1cm4gcmdiVG9IZXgoZ2V0RGFya0lua1JnYih2YWx1ZSkpO1xufVxuXG5mdW5jdGlvbiBnZXRJbmtBbHBoYUNvbmZpZyh7IGNvbnRyYXN0ID0gMS4zNSwgYnJpZ2h0bmVzcyA9IDEgfSA9IHt9KSB7XG4gIGNvbnN0IHNhZmVDb250cmFzdCA9IGNsYW1wTnVtYmVyKGNvbnRyYXN0LCAwLjI1LCA1LCAxLjM1KTtcbiAgY29uc3Qgc2FmZUJyaWdodG5lc3MgPSBjbGFtcE51bWJlcihicmlnaHRuZXNzLCAwLjI1LCAzLCAxKTtcbiAgcmV0dXJuIHtcbiAgICB0aHJlc2hvbGQ6IE5PSVNFX0lOS19BTFBIQV9USFJFU0hPTEQsXG4gICAgZ2FpbjogY2xhbXBOdW1iZXIoTk9JU0VfSU5LX0FMUEhBX0dBSU4gKiAoc2FmZUNvbnRyYXN0IC8gMS4zNSkgLyBNYXRoLm1heCgwLjc1LCBzYWZlQnJpZ2h0bmVzcyksIDAuNTUsIDMuNiwgTk9JU0VfSU5LX0FMUEhBX0dBSU4pLFxuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRJbmtBbHBoYShsdW1hLCBjb25maWcpIHtcbiAgcmV0dXJuIGNsYW1wMDEoKGNvbmZpZy50aHJlc2hvbGQgLSBjbGFtcDAxKGx1bWEsIDAuNSkpICogY29uZmlnLmdhaW4sIDApO1xufVxuXG5mdW5jdGlvbiBlbnN1cmVUZXh0dXJlQ2FudmFzKHNpemUpIHtcbiAgaWYgKCF0ZXh0dXJlQ2FudmFzKSB7XG4gICAgdGV4dHVyZUNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgIHRleHR1cmVDdHggPSB0ZXh0dXJlQ2FudmFzLmdldENvbnRleHQoJzJkJywgeyB3aWxsUmVhZEZyZXF1ZW50bHk6IHRydWUgfSk7XG4gIH1cbiAgaWYgKCF0ZXh0dXJlQ3R4KSByZXR1cm4gbnVsbDtcbiAgaWYgKHRleHR1cmVDYW52YXMud2lkdGggIT09IHNpemUpIHRleHR1cmVDYW52YXMud2lkdGggPSBzaXplO1xuICBpZiAodGV4dHVyZUNhbnZhcy5oZWlnaHQgIT09IHNpemUpIHRleHR1cmVDYW52YXMuaGVpZ2h0ID0gc2l6ZTtcbiAgaWYgKGNhY2hlZFNpemUgIT09IHNpemUpIHtcbiAgICBjYWNoZWRTaXplID0gc2l6ZTtcbiAgICBjYWNoZWRJbWFnZURhdGEgPSBudWxsO1xuICAgIGNhY2hlZERhdGEzMiA9IG51bGw7XG4gIH1cbiAgcmV0dXJuIHRleHR1cmVDdHg7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGNhbnZhc1RvQmxvYihjYW52YXMpIHtcbiAgcmV0dXJuIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNhbnZhcy50b0Jsb2IoKGJsb2IpID0+IHJlc29sdmUoYmxvYiksICdpbWFnZS9wbmcnKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICByZXNvbHZlKG51bGwpO1xuICAgIH1cbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHdhaXRGb3JOZXh0RnJhbWUoKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIHRyeSB7XG4gICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHJlc29sdmUoKSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgcmVzb2x2ZSgpO1xuICAgIH1cbiAgfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGRlY29kZVRleHR1cmVVcmwodXJsKSB7XG4gIGlmICghdXJsIHx8IHR5cGVvZiBJbWFnZSA9PT0gJ3VuZGVmaW5lZCcpIHJldHVybjtcblxuICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGNvbnN0IGltZyA9IG5ldyBJbWFnZSgpO1xuICAgIGxldCBzZXR0bGVkID0gZmFsc2U7XG4gICAgbGV0IHRpbWVvdXRJZCA9IDA7XG4gICAgY29uc3Qgc2V0dGxlID0gKCkgPT4ge1xuICAgICAgaWYgKHNldHRsZWQpIHJldHVybjtcbiAgICAgIHNldHRsZWQgPSB0cnVlO1xuICAgICAgaWYgKHRpbWVvdXRJZCkgd2luZG93LmNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuICAgICAgcmVzb2x2ZSgpO1xuICAgIH07XG5cbiAgICBpbWcub25sb2FkID0gc2V0dGxlO1xuICAgIGltZy5vbmVycm9yID0gc2V0dGxlO1xuICAgIHRpbWVvdXRJZCA9IHdpbmRvdy5zZXRUaW1lb3V0KHNldHRsZSwgNjAwKTtcbiAgICBpbWcuc3JjID0gdXJsO1xuXG4gICAgaWYgKHR5cGVvZiBpbWcuZGVjb2RlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBpbWcuZGVjb2RlKCkudGhlbihzZXR0bGUpLmNhdGNoKCgpID0+IHt9KTtcbiAgICB9XG4gIH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBjb21taXROb2lzZVRleHR1cmVVcmwodXJsLCB7IGdlbklkLCBvYmplY3RVcmwgPSBmYWxzZSB9ID0ge30pIHtcbiAgYXdhaXQgZGVjb2RlVGV4dHVyZVVybCh1cmwpO1xuICBpZiAoZ2VuSWQgIT09IHBlbmRpbmdHZW5lcmF0ZUlkKSB7XG4gICAgaWYgKG9iamVjdFVybCAmJiB1cmwpIHtcbiAgICAgIHRyeSB7IFVSTC5yZXZva2VPYmplY3RVUkwodXJsKTsgfSBjYXRjaCAoZSkge31cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCByb290ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICAgIGNvbnN0IHByZXZpb3VzT2JqZWN0VXJsID0gYWN0aXZlT2JqZWN0VXJsO1xuXG4gICAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1hYnMtbm9pc2UtdGV4dHVyZScsIGB1cmwoXCIke3VybH1cIilgKTtcbiAgICBhY3RpdmVPYmplY3RVcmwgPSBvYmplY3RVcmwgPyB1cmwgOiBudWxsO1xuXG4gICAgaWYgKHByZXZpb3VzT2JqZWN0VXJsICYmIHByZXZpb3VzT2JqZWN0VXJsICE9PSB1cmwpIHtcbiAgICAgIHRyeSB7IFVSTC5yZXZva2VPYmplY3RVUkwocHJldmlvdXNPYmplY3RVcmwpOyB9IGNhdGNoIChlKSB7fVxuICAgIH1cblxuICAgIGF3YWl0IHdhaXRGb3JOZXh0RnJhbWUoKTtcbiAgICBpZiAoZ2VuSWQgIT09IHBlbmRpbmdHZW5lcmF0ZUlkKSByZXR1cm4gZmFsc2U7XG4gICAgc2V0Tm9pc2VSZWFkeSh0cnVlKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGlmIChvYmplY3RVcmwgJiYgdXJsKSB7XG4gICAgICB0cnkgeyBVUkwucmV2b2tlT2JqZWN0VVJMKHVybCk7IH0gY2F0Y2ggKGVycikge31cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGdlbmVyYXRlTm9pc2VUZXh0dXJlVXJsKHtcbiAgc2l6ZSxcbiAgc2VlZCxcbiAgaW5rQ29sb3IsXG4gIGRpc3RyaWJ1dGlvbixcbiAgbW9ub2Nocm9tZSxcbiAgY2hyb21hLFxuICBjb250cmFzdCxcbiAgYnJpZ2h0bmVzcyxcbiAgc2F0dXJhdGlvbixcbiAgaHVlLFxuICBzdHJ1Y3R1cmVTdHJlbmd0aCxcbiAgc3RydWN0dXJlU2NhbGUsXG59KSB7XG4gIGNvbnN0IGN0eCA9IGVuc3VyZVRleHR1cmVDYW52YXMoc2l6ZSk7XG4gIGlmICghY3R4KSByZXR1cm4gbnVsbDtcblxuICBpZiAoIWNhY2hlZEltYWdlRGF0YSkge1xuICAgIGNhY2hlZEltYWdlRGF0YSA9IGN0eC5jcmVhdGVJbWFnZURhdGEoc2l6ZSwgc2l6ZSk7XG4gICAgY2FjaGVkRGF0YTMyID0gbmV3IFVpbnQzMkFycmF5KGNhY2hlZEltYWdlRGF0YS5kYXRhLmJ1ZmZlcik7XG4gIH1cblxuICBjb25zdCBkYXRhMzIgPSBjYWNoZWREYXRhMzI7XG4gIGNvbnN0IHJuZyA9IG11bGJlcnJ5MzIoc2VlZCk7XG4gIGNvbnN0IGlua1JnYiA9IGdldERhcmtJbmtSZ2IoaW5rQ29sb3IpO1xuXG4gIGNvbnN0IHVzZUdhdXNzaWFuID0gZGlzdHJpYnV0aW9uID09PSAnZ2F1c3NpYW4nO1xuICBjb25zdCBzdHJ1Y3R1cmVXZWlnaHRzID0gZ2V0U3RydWN0dXJlQmxlbmRXZWlnaHRzKHN0cnVjdHVyZVN0cmVuZ3RoKTtcbiAgY29uc3Qgc3RydWN0dXJlRmllbGQgPSBzdHJ1Y3R1cmVXZWlnaHRzLnN0cmVuZ3RoID4gMFxuICAgID8gYnVpbGRTdHJ1Y3R1cmVGaWVsZCh7IHNpemUsIHNlZWQsIHVzZUdhdXNzaWFuLCBzY2FsZTogc3RydWN0dXJlU2NhbGUgfSlcbiAgICA6IG51bGw7XG4gIGNvbnN0IGNvbG9yTWl4ID0gY2xhbXAwMShjaHJvbWEsIDApO1xuICBjb25zdCBpbnZDb2xvck1peCA9IDEgLSBjb2xvck1peDtcblxuICBjb25zdCBjID0gY2xhbXBOdW1iZXIoY29udHJhc3QsIDAuMjUsIDUsIDEpO1xuICBjb25zdCBiTXVsID0gY2xhbXBOdW1iZXIoYnJpZ2h0bmVzcywgMC4yNSwgMywgMSk7XG4gIGNvbnN0IHNhdCA9IGNsYW1wTnVtYmVyKHNhdHVyYXRpb24sIDAsIDMsIDEpO1xuICBjb25zdCBodWVEZWcgPSBjbGFtcE51bWJlcihodWUsIDAsIDM2MCwgMCk7XG4gIGNvbnN0IGFscGhhQ29uZmlnID0gZ2V0SW5rQWxwaGFDb25maWcoKTtcblxuICBjb25zdCBkb0NvbnRyYXN0QnJpZ2h0bmVzcyA9IGMgIT09IDEgfHwgYk11bCAhPT0gMTtcbiAgY29uc3QgZG9TYXR1cmF0aW9uID0gc2F0ICE9PSAxO1xuICBjb25zdCBkb0h1ZSA9IGh1ZURlZyAhPT0gMDtcblxuICAvLyBMdW1hIGNvbnN0YW50cyAobWF0Y2ggQ1NTIGZpbHRlciBjb252ZW50aW9ucykuXG4gIGNvbnN0IGx1bVIgPSAwLjIxMztcbiAgY29uc3QgbHVtRyA9IDAuNzE1O1xuICBjb25zdCBsdW1CID0gMC4wNzI7XG5cbiAgLy8gSHVlIHJvdGF0aW9uIG1hdHJpeCAoQ1NTIGh1ZS1yb3RhdGUpIOKAlCBjb21wdXRlZCBvbmNlIHBlciByZWdlbmVyYXRpb24uXG4gIGxldCBocjAwID0gMSwgaHIwMSA9IDAsIGhyMDIgPSAwO1xuICBsZXQgaHIxMCA9IDAsIGhyMTEgPSAxLCBocjEyID0gMDtcbiAgbGV0IGhyMjAgPSAwLCBocjIxID0gMCwgaHIyMiA9IDE7XG4gIGlmIChkb0h1ZSkge1xuICAgIGNvbnN0IGEgPSAoaHVlRGVnICogTWF0aC5QSSkgLyAxODA7XG4gICAgY29uc3QgY29zQSA9IE1hdGguY29zKGEpO1xuICAgIGNvbnN0IHNpbkEgPSBNYXRoLnNpbihhKTtcbiAgICBocjAwID0gbHVtUiArIGNvc0EgKiAoMSAtIGx1bVIpIC0gc2luQSAqIGx1bVI7XG4gICAgaHIwMSA9IGx1bUcgLSBjb3NBICogbHVtRyAtIHNpbkEgKiBsdW1HO1xuICAgIGhyMDIgPSBsdW1CIC0gY29zQSAqIGx1bUIgKyBzaW5BICogKDEgLSBsdW1CKTtcbiAgICBocjEwID0gbHVtUiAtIGNvc0EgKiBsdW1SICsgc2luQSAqIDAuMTQzO1xuICAgIGhyMTEgPSBsdW1HICsgY29zQSAqICgxIC0gbHVtRykgKyBzaW5BICogMC4xNDA7XG4gICAgaHIxMiA9IGx1bUIgLSBjb3NBICogbHVtQiAtIHNpbkEgKiAwLjI4MztcbiAgICBocjIwID0gbHVtUiAtIGNvc0EgKiBsdW1SIC0gc2luQSAqICgxIC0gbHVtUik7XG4gICAgaHIyMSA9IGx1bUcgLSBjb3NBICogbHVtRyArIHNpbkEgKiBsdW1HO1xuICAgIGhyMjIgPSBsdW1CICsgY29zQSAqICgxIC0gbHVtQikgKyBzaW5BICogbHVtQjtcbiAgfVxuXG4gIGZvciAobGV0IHkgPSAwLCBpID0gMDsgeSA8IHNpemU7IHkrKykge1xuICAgIGZvciAobGV0IHggPSAwOyB4IDwgc2l6ZTsgeCsrLCBpKyspIHtcbiAgICAgIGNvbnN0IHN0cnVjdHVyZSA9IHN0cnVjdHVyZUZpZWxkID8gc2FtcGxlU3RydWN0dXJlRmllbGQoc3RydWN0dXJlRmllbGQsIHgsIHksIHNpemUpIDogMC41O1xuICAgICAgY29uc3QgYmFzZSA9IG1peFN0cnVjdHVyZShzYW1wbGVOb2lzZTAxKHJuZywgdXNlR2F1c3NpYW4pLCBzdHJ1Y3R1cmUsIHN0cnVjdHVyZVdlaWdodHMpO1xuXG4gICAgICBsZXQgciA9IGJhc2U7XG4gICAgICBsZXQgZyA9IGJhc2U7XG4gICAgICBsZXQgYiA9IGJhc2U7XG5cbiAgICAgIGlmICghbW9ub2Nocm9tZSkge1xuICAgICAgICBjb25zdCByMiA9IG1peFN0cnVjdHVyZShzYW1wbGVOb2lzZTAxKHJuZywgdXNlR2F1c3NpYW4pLCBzdHJ1Y3R1cmUsIHN0cnVjdHVyZVdlaWdodHMpO1xuICAgICAgICBjb25zdCBnMiA9IG1peFN0cnVjdHVyZShzYW1wbGVOb2lzZTAxKHJuZywgdXNlR2F1c3NpYW4pLCBzdHJ1Y3R1cmUsIHN0cnVjdHVyZVdlaWdodHMpO1xuICAgICAgICBjb25zdCBiMiA9IG1peFN0cnVjdHVyZShzYW1wbGVOb2lzZTAxKHJuZywgdXNlR2F1c3NpYW4pLCBzdHJ1Y3R1cmUsIHN0cnVjdHVyZVdlaWdodHMpO1xuICAgICAgICByID0gYmFzZSAqIGludkNvbG9yTWl4ICsgcjIgKiBjb2xvck1peDtcbiAgICAgICAgZyA9IGJhc2UgKiBpbnZDb2xvck1peCArIGcyICogY29sb3JNaXg7XG4gICAgICAgIGIgPSBiYXNlICogaW52Q29sb3JNaXggKyBiMiAqIGNvbG9yTWl4O1xuICAgICAgfVxuXG4gICAgICAvLyBDb250cmFzdCArIGJyaWdodG5lc3MgKHBvaW50LXdpc2UsIHRpbGUtc2FmZSkuXG4gICAgICBpZiAoZG9Db250cmFzdEJyaWdodG5lc3MpIHtcbiAgICAgICAgciA9IChyIC0gMC41KSAqIGMgKyAwLjU7XG4gICAgICAgIGcgPSAoZyAtIDAuNSkgKiBjICsgMC41O1xuICAgICAgICBiID0gKGIgLSAwLjUpICogYyArIDAuNTtcbiAgICAgICAgciAqPSBiTXVsO1xuICAgICAgICBnICo9IGJNdWw7XG4gICAgICAgIGIgKj0gYk11bDtcbiAgICAgIH1cblxuICAgICAgLy8gU2F0dXJhdGlvbiAobGVycCB0byBsdW1hKSDigJQgcG9pbnQtd2lzZSwgdGlsZS1zYWZlLlxuICAgICAgaWYgKGRvU2F0dXJhdGlvbikge1xuICAgICAgICBjb25zdCBsID0gciAqIGx1bVIgKyBnICogbHVtRyArIGIgKiBsdW1CO1xuICAgICAgICByID0gbCAqICgxIC0gc2F0KSArIHIgKiBzYXQ7XG4gICAgICAgIGcgPSBsICogKDEgLSBzYXQpICsgZyAqIHNhdDtcbiAgICAgICAgYiA9IGwgKiAoMSAtIHNhdCkgKyBiICogc2F0O1xuICAgICAgfVxuXG4gICAgICAvLyBIdWUgcm90YXRlIOKAlCBwb2ludC13aXNlLCB0aWxlLXNhZmUuXG4gICAgICBpZiAoZG9IdWUpIHtcbiAgICAgICAgY29uc3QgbnIgPSByICogaHIwMCArIGcgKiBocjAxICsgYiAqIGhyMDI7XG4gICAgICAgIGNvbnN0IG5nID0gciAqIGhyMTAgKyBnICogaHIxMSArIGIgKiBocjEyO1xuICAgICAgICBjb25zdCBuYiA9IHIgKiBocjIwICsgZyAqIGhyMjEgKyBiICogaHIyMjtcbiAgICAgICAgciA9IG5yOyBnID0gbmc7IGIgPSBuYjtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbHVtYSA9IHIgKiBsdW1SICsgZyAqIGx1bUcgKyBiICogbHVtQjtcbiAgICAgIGNvbnN0IGFscGhhID0gY2xhbXBCeXRlKGdldElua0FscGhhKGx1bWEsIGFscGhhQ29uZmlnKSAqIDI1NSk7XG4gICAgICBkYXRhMzJbaV0gPSAoYWxwaGEgPDwgMjQpIHwgKGlua1JnYi5iIDw8IDE2KSB8IChpbmtSZ2IuZyA8PCA4KSB8IGlua1JnYi5yO1xuICAgIH1cbiAgfVxuXG4gIGN0eC5wdXRJbWFnZURhdGEoY2FjaGVkSW1hZ2VEYXRhLCAwLCAwKTtcblxuICBjb25zdCBibG9iID0gYXdhaXQgY2FudmFzVG9CbG9iKHRleHR1cmVDYW52YXMpO1xuICBpZiAoIWJsb2IpIHJldHVybiBudWxsO1xuICByZXR1cm4gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcbn1cblxuZnVuY3Rpb24gYXBwbHlDc3NWYXJzKGNmZykge1xuICBjb25zdCByb290ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuXG4gIC8vIEVuYWJsZS9kaXNhYmxlIHdpdGhvdXQgcmVtb3ZpbmcgRE9NIG5vZGVzIChrZWVwcyBsYXlvdXQgc3RhYmxlKS5cbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1hYnMtbm9pc2UtZW5hYmxlZCcsIGNmZy5ub2lzZUVuYWJsZWQgPyAnMScgOiAnMCcpO1xuXG4gIC8vIEFuaW1hdGlvbiBzZWxlY3Rpb24gKyB0aW1pbmcuXG4gIGNvbnN0IG1vdGlvbiA9IGNmZy5ub2lzZU1vdGlvbjtcbiAgY29uc3Qga2V5ZnJhbWVzID0gbW90aW9uID09PSAnc3RhdGljJ1xuICAgID8gJ25vbmUnXG4gICAgOiAobW90aW9uID09PSAnZHJpZnQnID8gJ2Ficy1ub2lzZS1kcmlmdCcgOiAnYWJzLW5vaXNlLWppdHRlcicpO1xuICAvLyBVc2Ugc3RlcHMoMSkgZm9yIGluc3RhbnQganVtcHMgLSBubyBzbW9vdGggdHJhbnNpdGlvbnMsIG1vcmUgcmVhbGlzdGljIG5vaXNlXG4gIGNvbnN0IHRpbWluZyA9IG1vdGlvbiA9PT0gJ2RyaWZ0JyA/ICdsaW5lYXInIDogJ3N0ZXBzKDEsIGVuZCknO1xuXG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tYWJzLW5vaXNlLWtleWZyYW1lcycsIGtleWZyYW1lcyk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tYWJzLW5vaXNlLXRpbWluZycsIHRpbWluZyk7XG5cbiAgLy8gU2luZ2xlIHNwZWVkIHdpdGggdmFyaWFuY2UgYXBwbGllZCB2aWEgYW5pbWF0aW9uLWR1cmF0aW9uIGNhbGN1bGF0aW9uXG4gIGNvbnN0IGJhc2VTcGVlZE1zID0gY2xhbXBOdW1iZXIoY2ZnLm5vaXNlU3BlZWRNcyA/PyAxMTAwLCAwLCAxMDAwMCwgMTEwMCk7XG4gIGNvbnN0IHZhcmlhbmNlID0gY2xhbXBOdW1iZXIoY2ZnLm5vaXNlU3BlZWRWYXJpYW5jZSA/PyAwLCAwLCAxLCAwKTtcbiAgLy8gVmFyaWFuY2UgY3JlYXRlcyB0aW1pbmcgdmFyaWF0aW9uOiB1c2Ugc2VlZGVkIHJhbmRvbSB0byBjcmVhdGUgYSBzdGFibGUgYnV0IHZhcmllZCBkdXJhdGlvblxuICAvLyBHZW5lcmF0ZSBhIHRpbWluZyBtdWx0aXBsaWVyIGJhc2VkIG9uIHNlZWQgYW5kIHZhcmlhbmNlXG4gIGNvbnN0IHBybmdUaW1pbmcgPSBtdWxiZXJyeTMyKChjZmcubm9pc2VTZWVkIF4gMHg3RjNBMkIxQykgPj4+IDApO1xuICBjb25zdCB0aW1pbmdSYW5kID0gdmFyaWFuY2UgPiAwID8gKHBybmdUaW1pbmcoKSAqIDIgLSAxKSAqIHZhcmlhbmNlIDogMDsgLy8gLXZhcmlhbmNlIHRvICt2YXJpYW5jZVxuICBjb25zdCBzcGVlZE1zID0gYmFzZVNwZWVkTXMgKiAoMSArIHRpbWluZ1JhbmQpO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWFicy1ub2lzZS1zcGVlZCcsIGAke01hdGgubWF4KDAsIE1hdGgucm91bmQoc3BlZWRNcykpfW1zYCk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tYWJzLW5vaXNlLXNwZWVkLXZhcmlhbmNlJywgU3RyaW5nKHZhcmlhbmNlKSk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tYWJzLW5vaXNlLW1vdGlvbi1hbW91bnQnLCBTdHJpbmcoY2ZnLm5vaXNlTW90aW9uQW1vdW50KSk7XG5cbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1hYnMtbm9pc2UtZmxpY2tlcicsIFN0cmluZyhjZmcubm9pc2VGbGlja2VyKSk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tYWJzLW5vaXNlLWZsaWNrZXItc3BlZWQnLCBgJHtNYXRoLm1heCgwLCBNYXRoLnJvdW5kKGNmZy5ub2lzZUZsaWNrZXJTcGVlZE1zKSl9bXNgKTtcblxuICAvLyBMb3dlc3QgcnVudGltZSBjb3N0OiBrZWVwIGhlYXZ5IGxvb2sgYWRqdXN0bWVudHMgYmFrZWQgaW50byB0aGUgZ2VuZXJhdGVkIHRpbGUuXG4gIC8vIE9ubHkga2VlcCBibHVyIGFzIGFuIG9wdGlvbmFsIENTUyBmaWx0ZXIgKGJsdXIgY2FuJ3QgYmUgYmFrZWQgc2VhbWxlc3NseSB3aXRob3V0IHdyYXAtYXdhcmUgZmlsdGVyaW5nKS5cbiAgY29uc3QgYmx1clB4ID0gY2xhbXBOdW1iZXIoY2ZnLm5vaXNlQmx1clB4LCAwLCA2LCAwKTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1hYnMtbm9pc2UtYmx1cicsIGAke2JsdXJQeC50b0ZpeGVkKDIpfXB4YCk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tYWJzLW5vaXNlLWZpbHRlcicsIGJsdXJQeCA+IDAgPyBgYmx1cigke2JsdXJQeC50b0ZpeGVkKDIpfXB4KWAgOiAnbm9uZScpO1xuXG4gIC8vIE1vdGlvbiBvdmVyc2NhbiArIGRldGVybWluaXN0aWMgaml0dGVyIHBhdGggKHB4LWJhc2VkIHNvIGl0IG5ldmVyIHJldmVhbHMgZWRnZXMgb24gbGFyZ2Ugdmlld3BvcnRzKS5cbiAgY29uc3QgbW90aW9uQW1vdW50ID0gY2xhbXBOdW1iZXIoY2ZnLm5vaXNlTW90aW9uQW1vdW50LCAwLCAyLjUsIDEpO1xuICBjb25zdCBoYXNNb3Rpb24gPSBjZmcubm9pc2VNb3Rpb24gIT09ICdzdGF0aWMnICYmIG1vdGlvbkFtb3VudCA+IDA7XG4gIC8vIEtlZXAgbW90aW9uIGFtcGxpdHVkZSBib3VuZGVkIHNvIGdyYWluIHN0YXlzIHN1YnRsZSBhbmQgR1BVIHN1cmZhY2VzIHN0YXkgc21hbGwsXG4gIC8vIGV2ZW4gaWYgdGhlIHVzZXIgY3JhbmtzIG5vaXNlIHNjYWxlLlxuICBjb25zdCBub2lzZVNpemUgPSBjbGFtcE51bWJlcihjZmcubm9pc2VTaXplID8/IDg1LCAyMCwgNjAwLCA4NSk7XG4gIGNvbnN0IGJhc2VNb3Rpb25QeCA9IGNsYW1wTnVtYmVyKG5vaXNlU2l6ZSAqIDAuNTUsIDI0LCAxMjAsIDgyKTtcbiAgY29uc3QgYW1wID0gaGFzTW90aW9uID8gYmFzZU1vdGlvblB4ICogbW90aW9uQW1vdW50IDogMDtcbiAgY29uc3QgcGFkID0gTWF0aC5jZWlsKGFtcCArIChibHVyUHggPiAwID8gYmx1clB4ICogNiA6IDApICsgMzIpO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWFicy1ub2lzZS1vdmVyc2NhbicsIGAtJHtwYWR9cHhgKTtcblxuICAvLyBTZWVkZWQgcGF0aDogc3RhYmxlIGZvciBhIGdpdmVuIHNlZWQsIGRpZmZlcmVudCBiZXR3ZWVuIGxheWVycyB2aWEgZGlmZmVyaW5nIHNwZWVkcy5cbiAgLy8gR2VuZXJhdGUgbWFueSBtb3JlIGppdHRlciBwb3NpdGlvbnMgKDQwKSBmb3IgbW9yZSBhbGl2ZSwgY2hhb3RpYyBub2lzZVxuICBjb25zdCBwcm5nID0gbXVsYmVycnkzMigoY2ZnLm5vaXNlU2VlZCBeIDB4QTUzQTlFMzcpID4+PiAwKTtcbiAgY29uc3QgbWF4Tm9ybSA9IDAuOTtcbiAgY29uc3Qgaml0dGVyQ291bnQgPSA0MDsgLy8gTWFueSBtb3JlIHBvc2l0aW9ucyA9IG1vcmUgYWxpdmUsIHJlYWxpc3RpYyBub2lzZVxuICBmb3IgKGxldCBpID0gMTsgaSA8PSBqaXR0ZXJDb3VudDsgaSsrKSB7XG4gICAgY29uc3QgeCA9IChwcm5nKCkgKiAyIC0gMSkgKiBtYXhOb3JtICogYW1wO1xuICAgIGNvbnN0IHkgPSAocHJuZygpICogMiAtIDEpICogbWF4Tm9ybSAqIGFtcDtcbiAgICByb290LnN0eWxlLnNldFByb3BlcnR5KGAtLWFicy1ub2lzZS1qJHtpfS14YCwgYCR7TWF0aC5yb3VuZCh4KX1weGApO1xuICAgIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoYC0tYWJzLW5vaXNlLWoke2l9LXlgLCBgJHtNYXRoLnJvdW5kKHkpfXB4YCk7XG4gIH1cblxuICBjb25zdCBhbmdsZSA9IHBybmcoKSAqIE1hdGguUEkgKiAyO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWFicy1ub2lzZS1kcmlmdC14JywgYCR7TWF0aC5yb3VuZChNYXRoLmNvcyhhbmdsZSkgKiBhbXApfXB4YCk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tYWJzLW5vaXNlLWRyaWZ0LXknLCBgJHtNYXRoLnJvdW5kKE1hdGguc2luKGFuZ2xlKSAqIGFtcCl9cHhgKTtcblxuICAvLyBTaW5nbGUgbGF5ZXIgY29udHJvbHNcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1ub2lzZS1zaXplJywgYCR7TWF0aC5yb3VuZChub2lzZVNpemUpfXB4YCk7XG4gIFxuICAvLyBPcGFjaXR5ICh0aGVtZS1hd2FyZSlcbiAgY29uc3Qgb3BhY2l0eUxpZ2h0ID0gY2xhbXBOdW1iZXIoY2ZnLm5vaXNlT3BhY2l0eUxpZ2h0ID8/IGNmZy5ub2lzZU9wYWNpdHkgPz8gMC4wNCwgMCwgMSwgMC4wNCk7XG4gIGNvbnN0IG9wYWNpdHlEYXJrID0gY2xhbXBOdW1iZXIoY2ZnLm5vaXNlT3BhY2l0eURhcmsgPz8gY2ZnLm5vaXNlT3BhY2l0eSA/PyAwLjA0LCAwLCAxLCAwLjA0KTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1ub2lzZS1vcGFjaXR5LWxpZ2h0JywgU3RyaW5nKG9wYWNpdHlMaWdodCkpO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLW5vaXNlLW9wYWNpdHktZGFyaycsIFN0cmluZyhvcGFjaXR5RGFyaykpO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWFicy1ub2lzZS1vZmZzZXQteScsIGAke01hdGgucm91bmQoY2ZnLm5vaXNlT2Zmc2V0WSA/PyAwKX1weGApO1xuICBcbiAgLy8gQ29sb3IgY29udHJvbHMgKHNlcGFyYXRlIGZvciBsaWdodC9kYXJrKVxuICBjb25zdCBjb2xvckxpZ2h0ID0gY2ZnLm5vaXNlQ29sb3JMaWdodCA/PyBcInZhcigtLWNvbG9yLWRldGVjdGVkLTJhMmEyZSlcIjtcbiAgY29uc3QgY29sb3JEYXJrID0gY2ZnLm5vaXNlQ29sb3JEYXJrID8/IFwidmFyKC0tY29sb3ItZGV0ZWN0ZWQtZDRkNGQ4KVwiO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLW5vaXNlLWNvbG9yLWxpZ2h0JywgY29sb3JMaWdodCk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tbm9pc2UtY29sb3ItZGFyaycsIGNvbG9yRGFyayk7XG4gIFxuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWRldGFpbC1ub2lzZS1vcGFjaXR5JywgU3RyaW5nKGNmZy5kZXRhaWxOb2lzZU9wYWNpdHkgPz8gMSkpO1xufVxuXG5mdW5jdGlvbiBzYW5pdGl6ZUNvbmZpZyhpbnB1dCA9IHt9KSB7XG4gIGNvbnN0IGNzc05vaXNlU2l6ZSA9IHJlYWRSb290VmFyTnVtYmVyKCctLW5vaXNlLXNpemUnLCA4NSk7XG4gIGNvbnN0IGNzc09wYWNpdHlMaWdodCA9IHJlYWRSb290VmFyTnVtYmVyKCctLW5vaXNlLW9wYWNpdHktbGlnaHQnLCAwLjA0KTtcbiAgY29uc3QgY3NzT3BhY2l0eURhcmsgPSByZWFkUm9vdFZhck51bWJlcignLS1ub2lzZS1vcGFjaXR5LWRhcmsnLCAwLjA0KTtcblxuICBjb25zdCBvdXQgPSB7XG4gICAgLy8gVGV4dHVyZVxuICAgIG5vaXNlU2VlZDogY2xhbXBJbnQoaW5wdXQubm9pc2VTZWVkLCAwLCA5OTk5OTksIDEzMzcpLFxuICAgIG5vaXNlVGV4dHVyZVNpemU6IGNsYW1wSW50KGlucHV0Lm5vaXNlVGV4dHVyZVNpemUsIDY0LCA1MTIsIDI1NiksXG4gICAgbm9pc2VTdmdFbmFibGVkOiBpbnB1dC5ub2lzZVN2Z0VuYWJsZWQgIT09IHVuZGVmaW5lZCA/IEJvb2xlYW4oaW5wdXQubm9pc2VTdmdFbmFibGVkKSA6IGZhbHNlLFxuICAgIG5vaXNlU3ZnQmFzZUZyZXF1ZW5jeTogY2xhbXBOdW1iZXIoaW5wdXQubm9pc2VTdmdCYXNlRnJlcXVlbmN5LCAwLjAxLCAyLCAwLjgpLFxuICAgIG5vaXNlU3ZnT2N0YXZlczogY2xhbXBJbnQoaW5wdXQubm9pc2VTdmdPY3RhdmVzLCAxLCA2LCAyKSxcbiAgICBub2lzZVN2Z1NlZWQ6IGNsYW1wSW50KGlucHV0Lm5vaXNlU3ZnU2VlZCwgMCwgOTk5OTk5LCBpbnB1dC5ub2lzZVNlZWQgPz8gMTMzNyksXG4gICAgbm9pc2VEaXN0cmlidXRpb246IHBpY2tFbnVtKGlucHV0Lm5vaXNlRGlzdHJpYnV0aW9uLCBbJ3VuaWZvcm0nLCAnZ2F1c3NpYW4nXSwgJ2dhdXNzaWFuJyksXG4gICAgbm9pc2VNb25vY2hyb21lOiBpbnB1dC5ub2lzZU1vbm9jaHJvbWUgIT09IHVuZGVmaW5lZCA/IEJvb2xlYW4oaW5wdXQubm9pc2VNb25vY2hyb21lKSA6IGZhbHNlLFxuICAgIG5vaXNlQ2hyb21hOiBjbGFtcDAxKGlucHV0Lm5vaXNlQ2hyb21hLCAwLjkpLFxuXG4gICAgLy8gTW90aW9uXG4gICAgbm9pc2VFbmFibGVkOiBpbnB1dC5ub2lzZUVuYWJsZWQgIT09IHVuZGVmaW5lZCA/IEJvb2xlYW4oaW5wdXQubm9pc2VFbmFibGVkKSA6IHRydWUsXG4gICAgbm9pc2VNb3Rpb246IHBpY2tFbnVtKGlucHV0Lm5vaXNlTW90aW9uLCBbJ2ppdHRlcicsICdkcmlmdCcsICdzdGF0aWMnXSwgJ2ppdHRlcicpLFxuICAgIG5vaXNlTW90aW9uQW1vdW50OiBjbGFtcE51bWJlcihpbnB1dC5ub2lzZU1vdGlvbkFtb3VudCwgMCwgMi41LCAxLjApLFxuICAgIG5vaXNlU3BlZWRNczogY2xhbXBJbnQoaW5wdXQubm9pc2VTcGVlZE1zLCAwLCAxMDAwMCwgMTEwMCksXG4gICAgbm9pc2VTcGVlZFZhcmlhbmNlOiBjbGFtcE51bWJlcihpbnB1dC5ub2lzZVNwZWVkVmFyaWFuY2UsIDAsIDEsIDApLFxuICAgIG5vaXNlRmxpY2tlcjogY2xhbXBOdW1iZXIoaW5wdXQubm9pc2VGbGlja2VyLCAwLCAxLCAwLjEyKSxcbiAgICBub2lzZUZsaWNrZXJTcGVlZE1zOiBjbGFtcEludChpbnB1dC5ub2lzZUZsaWNrZXJTcGVlZE1zLCAwLCA1MDAwLCAyMjApLFxuXG4gICAgLy8gTG9vayAoYmFrZWQgaW50byB0aWxlIGZvciBtaW5pbWFsIHJ1bnRpbWUgY29zdDsgYmx1ciByZW1haW5zIG9wdGlvbmFsIENTUyBmaWx0ZXIpXG4gICAgbm9pc2VCbHVyUHg6IGNsYW1wTnVtYmVyKGlucHV0Lm5vaXNlQmx1clB4LCAwLCA2LCAwKSxcbiAgICBub2lzZUNvbnRyYXN0OiBjbGFtcE51bWJlcihpbnB1dC5ub2lzZUNvbnRyYXN0LCAwLjI1LCA1LCAxLjM1KSxcbiAgICBub2lzZUJyaWdodG5lc3M6IGNsYW1wTnVtYmVyKGlucHV0Lm5vaXNlQnJpZ2h0bmVzcywgMC4yNSwgMywgMS4wKSxcbiAgICBub2lzZVNhdHVyYXRpb246IGNsYW1wTnVtYmVyKGlucHV0Lm5vaXNlU2F0dXJhdGlvbiwgMCwgMywgMS4wKSxcbiAgICBub2lzZUh1ZTogY2xhbXBOdW1iZXIoaW5wdXQubm9pc2VIdWUsIDAsIDM2MCwgMCksXG4gICAgbm9pc2VTdHJ1Y3R1cmVTdHJlbmd0aDogY2xhbXBOdW1iZXIoaW5wdXQubm9pc2VTdHJ1Y3R1cmVTdHJlbmd0aCwgMCwgMC40NSwgMC4yMiksXG4gICAgbm9pc2VTdHJ1Y3R1cmVTY2FsZTogc2FuaXRpemVTdHJ1Y3R1cmVTY2FsZShpbnB1dC5ub2lzZVN0cnVjdHVyZVNjYWxlKSxcblxuICAgIC8vIFNpbmdsZSBsYXllciBjb250cm9sc1xuICAgIG5vaXNlU2l6ZTogY2xhbXBOdW1iZXIoaW5wdXQubm9pc2VTaXplLCAyMCwgNjAwLCBjc3NOb2lzZVNpemUpLFxuICAgIG5vaXNlT3BhY2l0eTogY2xhbXBOdW1iZXIoaW5wdXQubm9pc2VPcGFjaXR5LCAwLCAxLCAwLjA0KSxcbiAgICBub2lzZU9wYWNpdHlMaWdodDogY2xhbXBOdW1iZXIoaW5wdXQubm9pc2VPcGFjaXR5TGlnaHQsIDAsIDEsIGNzc09wYWNpdHlMaWdodCksXG4gICAgbm9pc2VPcGFjaXR5RGFyazogY2xhbXBOdW1iZXIoaW5wdXQubm9pc2VPcGFjaXR5RGFyaywgMCwgMSwgY3NzT3BhY2l0eURhcmspLFxuICAgIG5vaXNlT2Zmc2V0WTogY2xhbXBOdW1iZXIoaW5wdXQubm9pc2VPZmZzZXRZLCAtNTAsIDUwLCAwKSxcbiAgICBub2lzZUNvbG9yTGlnaHQ6IHR5cGVvZiBpbnB1dC5ub2lzZUNvbG9yTGlnaHQgPT09ICdzdHJpbmcnID8gaW5wdXQubm9pc2VDb2xvckxpZ2h0IDogXCJ2YXIoLS1jb2xvci1kZXRlY3RlZC0yYTJhMmUpXCIsXG4gICAgbm9pc2VDb2xvckRhcms6IHR5cGVvZiBpbnB1dC5ub2lzZUNvbG9yRGFyayA9PT0gJ3N0cmluZycgPyBpbnB1dC5ub2lzZUNvbG9yRGFyayA6IFwidmFyKC0tY29sb3ItZGV0ZWN0ZWQtZDRkNGQ4KVwiLFxuICAgIGRldGFpbE5vaXNlT3BhY2l0eTogY2xhbXBOdW1iZXIoaW5wdXQuZGV0YWlsTm9pc2VPcGFjaXR5LCAwLCAxLCAxKSxcbiAgfTtcblxuICAvLyBJZiBtb25vY2hyb21lIGlzIG9uLCBjaHJvbWEgZG9lcyBub3RoaW5nIGJ1dCBrZWVwIGEgc3RhYmxlIG51bWJlci5cbiAgaWYgKG91dC5ub2lzZU1vbm9jaHJvbWUpIG91dC5ub2lzZUNocm9tYSA9IGNsYW1wMDEob3V0Lm5vaXNlQ2hyb21hLCAwLjkpO1xuXG4gIHJldHVybiBvdXQ7XG59XG5cbmZ1bmN0aW9uIGVuY29kZVN2Z0RhdGFVcmkoc3ZnKSB7XG4gIHJldHVybiBgZGF0YTppbWFnZS9zdmcreG1sLCR7ZW5jb2RlVVJJQ29tcG9uZW50KHN2Zyl9YDtcbn1cblxuZnVuY3Rpb24gYnVpbGRTdmdOb2lzZURhdGFVcmkoe1xuICBzaXplLFxuICBiYXNlRnJlcXVlbmN5LFxuICBvY3RhdmVzLFxuICBzZWVkLFxuICBjb2xvcixcbiAgY29udHJhc3QsXG4gIGJyaWdodG5lc3MsXG4gIHN0cnVjdHVyZVN0cmVuZ3RoLFxuICBzdHJ1Y3R1cmVTY2FsZSxcbn0pIHtcbiAgY29uc3Qgc2FmZVNpemUgPSBNYXRoLm1heCg4LCBNYXRoLnJvdW5kKHNpemUgfHwgMTI4KSk7XG4gIGNvbnN0IHNhZmVGcmVxID0gTnVtYmVyLmlzRmluaXRlKGJhc2VGcmVxdWVuY3kpID8gYmFzZUZyZXF1ZW5jeSA6IDAuODtcbiAgY29uc3Qgc2FmZU9jdGF2ZXMgPSBNYXRoLm1heCgxLCBNYXRoLnJvdW5kKG9jdGF2ZXMgfHwgMikpO1xuICBjb25zdCBzYWZlU2VlZCA9IE1hdGgubWF4KDAsIE1hdGgucm91bmQoc2VlZCB8fCAwKSk7XG4gIGNvbnN0IHNhZmVDb2xvciA9IGdldERhcmtJbmtIZXgoY29sb3IpO1xuICBjb25zdCB3ZWlnaHRzID0gZ2V0U3RydWN0dXJlQmxlbmRXZWlnaHRzKHN0cnVjdHVyZVN0cmVuZ3RoKTtcbiAgY29uc3QgYWxwaGFDb25maWcgPSBnZXRJbmtBbHBoYUNvbmZpZyh7IGNvbnRyYXN0LCBicmlnaHRuZXNzIH0pO1xuICBjb25zdCBhbHBoYUNoYW5uZWwgPSAoYWxwaGFDb25maWcuZ2FpbiAvIDMpLnRvRml4ZWQoNCk7XG4gIGNvbnN0IGFscGhhQmlhcyA9IChhbHBoYUNvbmZpZy50aHJlc2hvbGQgKiBhbHBoYUNvbmZpZy5nYWluKS50b0ZpeGVkKDQpO1xuICBjb25zdCBzdHJ1Y3R1cmVGcmVxID0gTWF0aC5tYXgoMC4wMSwgc2FmZUZyZXEgKiBzYW5pdGl6ZVN0cnVjdHVyZVNjYWxlKHN0cnVjdHVyZVNjYWxlKSk7XG4gIGNvbnN0IHN0cnVjdHVyZVNlZWQgPSAoc2FmZVNlZWQgKyAoTk9JU0VfU1RSVUNUVVJFX1NFRURfT0ZGU0VUICUgOTk5OTk5KSkgJSA5OTk5OTk7XG5cbiAgY29uc3Qgc3ZnID0gYDw/eG1sIHZlcnNpb249XCIxLjBcIiBlbmNvZGluZz1cIlVURi04XCI/PlxcbmAgK1xuICAgIGA8c3ZnIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiB3aWR0aD1cIiR7c2FmZVNpemV9XCIgaGVpZ2h0PVwiJHtzYWZlU2l6ZX1cIiB2aWV3Qm94PVwiMCAwICR7c2FmZVNpemV9ICR7c2FmZVNpemV9XCIgcHJlc2VydmVBc3BlY3RSYXRpbz1cIm5vbmVcIj5gICtcbiAgICBgPGZpbHRlciBpZD1cIm5cIiB4PVwiMFwiIHk9XCIwXCIgd2lkdGg9XCIxMDAlXCIgaGVpZ2h0PVwiMTAwJVwiPmAgK1xuICAgIGA8ZmVUdXJidWxlbmNlIHR5cGU9XCJmcmFjdGFsTm9pc2VcIiBiYXNlRnJlcXVlbmN5PVwiJHtzYWZlRnJlcX1cIiBudW1PY3RhdmVzPVwiJHtzYWZlT2N0YXZlc31cIiBzZWVkPVwiJHtzYWZlU2VlZH1cIiBzdGl0Y2hUaWxlcz1cInN0aXRjaFwiIHJlc3VsdD1cInByaW1hcnlcIi8+YCArXG4gICAgYDxmZVR1cmJ1bGVuY2UgdHlwZT1cImZyYWN0YWxOb2lzZVwiIGJhc2VGcmVxdWVuY3k9XCIke3N0cnVjdHVyZUZyZXEudG9GaXhlZCg0KX1cIiBudW1PY3RhdmVzPVwiJHtNYXRoLm1heCgxLCBzYWZlT2N0YXZlcyAtIDEpfVwiIHNlZWQ9XCIke3N0cnVjdHVyZVNlZWR9XCIgc3RpdGNoVGlsZXM9XCJzdGl0Y2hcIiByZXN1bHQ9XCJzdHJ1Y3R1cmVcIi8+YCArXG4gICAgYDxmZUNvbXBvc2l0ZSBpbj1cInByaW1hcnlcIiBpbjI9XCJzdHJ1Y3R1cmVcIiBvcGVyYXRvcj1cImFyaXRobWV0aWNcIiBrMT1cIjBcIiBrMj1cIiR7d2VpZ2h0cy5wcmltYXJ5V2VpZ2h0LnRvRml4ZWQoNCl9XCIgazM9XCIke3dlaWdodHMuc3RyZW5ndGgudG9GaXhlZCg0KX1cIiBrND1cIiR7d2VpZ2h0cy5vZmZzZXQudG9GaXhlZCg0KX1cIiByZXN1bHQ9XCJub2lzZVwiLz5gICtcbiAgICBgPGZlQ29sb3JNYXRyaXggaW49XCJub2lzZVwiIHR5cGU9XCJzYXR1cmF0ZVwiIHZhbHVlcz1cIjBcIiByZXN1bHQ9XCJtb25vXCIvPmAgK1xuICAgIGA8ZmVDb2xvck1hdHJpeCBpbj1cIm1vbm9cIiB0eXBlPVwibWF0cml4XCIgdmFsdWVzPVwiMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgLSR7YWxwaGFDaGFubmVsfSAtJHthbHBoYUNoYW5uZWx9IC0ke2FscGhhQ2hhbm5lbH0gMCAke2FscGhhQmlhc31cIiByZXN1bHQ9XCJpbmtBbHBoYVwiLz5gICtcbiAgICBgPGZlRmxvb2QgZmxvb2QtY29sb3I9XCIke3NhZmVDb2xvcn1cIiByZXN1bHQ9XCJpbmtDb2xvclwiLz5gICtcbiAgICBgPGZlQ29tcG9zaXRlIGluPVwiaW5rQ29sb3JcIiBpbjI9XCJpbmtBbHBoYVwiIG9wZXJhdG9yPVwiaW5cIiByZXN1bHQ9XCJpbmtcIi8+YCArXG4gICAgYDwvZmlsdGVyPmAgK1xuICAgIGA8cmVjdCB3aWR0aD1cIjEwMCVcIiBoZWlnaHQ9XCIxMDAlXCIgZmlsbD1cInRyYW5zcGFyZW50XCIgZmlsdGVyPVwidXJsKCNuKVwiLz5gICtcbiAgICBgPC9zdmc+YDtcblxuICByZXR1cm4gZW5jb2RlU3ZnRGF0YVVyaShzdmcpO1xufVxuXG5mdW5jdGlvbiBzY2hlZHVsZVRleHR1cmVSZWdlbmVyYXRpb24oY2ZnLCB7IGZvcmNlID0gZmFsc2UgfSA9IHt9KSB7XG4gIGNvbnN0IGlzRGFyayA9IGRvY3VtZW50LmJvZHk/LmNsYXNzTGlzdD8uY29udGFpbnMoJ2RhcmstbW9kZScpO1xuICBjb25zdCBpbmtDb2xvciA9IGlzRGFyayA/IChjZmcubm9pc2VDb2xvckRhcmsgPz8gJyMwNTA1MDUnKSA6IChjZmcubm9pc2VDb2xvckxpZ2h0ID8/ICcjMDUwNTA1Jyk7XG5cbiAgY29uc3QgdGV4dHVyZUtleSA9IEpTT04uc3RyaW5naWZ5KHtcbiAgICBzZWVkOiBjZmcubm9pc2VTZWVkLFxuICAgIHNpemU6IGNmZy5ub2lzZVRleHR1cmVTaXplLFxuICAgIHN2Z0VuYWJsZWQ6IGNmZy5ub2lzZVN2Z0VuYWJsZWQsXG4gICAgc3ZnRnJlcXVlbmN5OiBjZmcubm9pc2VTdmdCYXNlRnJlcXVlbmN5LFxuICAgIHN2Z09jdGF2ZXM6IGNmZy5ub2lzZVN2Z09jdGF2ZXMsXG4gICAgc3ZnU2VlZDogY2ZnLm5vaXNlU3ZnU2VlZCxcbiAgICBpbmtDb2xvcjogZ2V0RGFya0lua0hleChpbmtDb2xvciksXG4gICAgZGlzdHJpYnV0aW9uOiBjZmcubm9pc2VEaXN0cmlidXRpb24sXG4gICAgbW9ub2Nocm9tZTogY2ZnLm5vaXNlTW9ub2Nocm9tZSxcbiAgICBjaHJvbWE6IGNmZy5ub2lzZUNocm9tYSxcbiAgICBjb250cmFzdDogTnVtYmVyKGNmZy5ub2lzZUNvbnRyYXN0KS50b0ZpeGVkKDMpLFxuICAgIGJyaWdodG5lc3M6IE51bWJlcihjZmcubm9pc2VCcmlnaHRuZXNzKS50b0ZpeGVkKDMpLFxuICAgIHNhdHVyYXRpb246IE51bWJlcihjZmcubm9pc2VTYXR1cmF0aW9uKS50b0ZpeGVkKDMpLFxuICAgIGh1ZTogTnVtYmVyKGNmZy5ub2lzZUh1ZSkudG9GaXhlZCgxKSxcbiAgICBzdHJ1Y3R1cmVTdHJlbmd0aDogTnVtYmVyKGNmZy5ub2lzZVN0cnVjdHVyZVN0cmVuZ3RoKS50b0ZpeGVkKDMpLFxuICAgIHN0cnVjdHVyZVNjYWxlOiBOdW1iZXIoY2ZnLm5vaXNlU3RydWN0dXJlU2NhbGUpLnRvRml4ZWQoMyksXG4gIH0pO1xuXG4gIC8vIElmIGRpc2FibGVkLCBza2lwIGdlbmVyYXRpb24gYW5kIGNsZWFyIGFueSBleGlzdGluZyB0ZXh0dXJlIHRvIGF2b2lkIHdvcmsuXG4gIGlmICghY2ZnLm5vaXNlRW5hYmxlZCkge1xuICAgIGlmIChyZWdlblRpbWVyKSB3aW5kb3cuY2xlYXJUaW1lb3V0KHJlZ2VuVGltZXIpO1xuICAgIHJlZ2VuVGltZXIgPSBudWxsO1xuICAgIHBlbmRpbmdHZW5lcmF0ZUlkKys7XG4gICAgbGFzdFRleHR1cmVLZXkgPSAnJztcbiAgICB0cnkge1xuICAgICAgY29uc3Qgcm9vdCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgICAgIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tYWJzLW5vaXNlLXRleHR1cmUnLCAnbm9uZScpO1xuICAgICAgLy8gUmVtb3ZlIG5vaXNlLXJlYWR5IGNsYXNzIHdoZW4gZGlzYWJsZWRcbiAgICAgIHNldE5vaXNlUmVhZHkoZmFsc2UpO1xuICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgaWYgKGFjdGl2ZU9iamVjdFVybCkge1xuICAgICAgdHJ5IHsgVVJMLnJldm9rZU9iamVjdFVSTChhY3RpdmVPYmplY3RVcmwpOyB9IGNhdGNoIChlKSB7fVxuICAgIH1cbiAgICBhY3RpdmVPYmplY3RVcmwgPSBudWxsO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmICghZm9yY2UgJiYgdGV4dHVyZUtleSA9PT0gbGFzdFRleHR1cmVLZXkpIHtcbiAgICAvLyBUZXh0dXJlIGFscmVhZHkgZXhpc3RzLCBlbnN1cmUgbm9pc2UtcmVhZHkgY2xhc3MgaXMgcHJlc2VudFxuICAgIGlmICgoYWN0aXZlT2JqZWN0VXJsIHx8IGNmZy5ub2lzZVN2Z0VuYWJsZWQpICYmIGNmZy5ub2lzZUVuYWJsZWQpIHtcbiAgICAgIHNldE5vaXNlUmVhZHkodHJ1ZSk7XG4gICAgfVxuICAgIHJldHVybjtcbiAgfVxuICBsYXN0VGV4dHVyZUtleSA9IHRleHR1cmVLZXk7XG5cbiAgaWYgKHJlZ2VuVGltZXIpIHdpbmRvdy5jbGVhclRpbWVvdXQocmVnZW5UaW1lcik7XG5cbiAgLy8gRGVib3VuY2UgaGVhdnkgd29yayAoc2xpZGVycyBmaXJlIHJhcGlkbHkpLlxuICByZWdlblRpbWVyID0gd2luZG93LnNldFRpbWVvdXQoYXN5bmMgKCkgPT4ge1xuICAgIHJlZ2VuVGltZXIgPSBudWxsO1xuICAgIGNvbnN0IGdlbklkID0gKytwZW5kaW5nR2VuZXJhdGVJZDtcblxuICAgIGlmIChjZmcubm9pc2VTdmdFbmFibGVkKSB7XG4gICAgICBjb25zdCBzdmdVcmwgPSBidWlsZFN2Z05vaXNlRGF0YVVyaSh7XG4gICAgICAgIHNpemU6IGNmZy5ub2lzZVRleHR1cmVTaXplLFxuICAgICAgICBiYXNlRnJlcXVlbmN5OiBjZmcubm9pc2VTdmdCYXNlRnJlcXVlbmN5LFxuICAgICAgICBvY3RhdmVzOiBjZmcubm9pc2VTdmdPY3RhdmVzLFxuICAgICAgICBzZWVkOiBjZmcubm9pc2VTdmdTZWVkLFxuICAgICAgICBjb2xvcjogaW5rQ29sb3IsXG4gICAgICAgIGNvbnRyYXN0OiBjZmcubm9pc2VDb250cmFzdCxcbiAgICAgICAgYnJpZ2h0bmVzczogY2ZnLm5vaXNlQnJpZ2h0bmVzcyxcbiAgICAgICAgc3RydWN0dXJlU3RyZW5ndGg6IGNmZy5ub2lzZVN0cnVjdHVyZVN0cmVuZ3RoLFxuICAgICAgICBzdHJ1Y3R1cmVTY2FsZTogY2ZnLm5vaXNlU3RydWN0dXJlU2NhbGUsXG4gICAgICB9KTtcblxuICAgICAgaWYgKGdlbklkICE9PSBwZW5kaW5nR2VuZXJhdGVJZCkgcmV0dXJuO1xuICAgICAgYXdhaXQgY29tbWl0Tm9pc2VUZXh0dXJlVXJsKHN2Z1VybCwgeyBnZW5JZCwgb2JqZWN0VXJsOiBmYWxzZSB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCB1cmwgPSBhd2FpdCBnZW5lcmF0ZU5vaXNlVGV4dHVyZVVybCh7XG4gICAgICBzaXplOiBjZmcubm9pc2VUZXh0dXJlU2l6ZSxcbiAgICAgIHNlZWQ6IGNmZy5ub2lzZVNlZWQsXG4gICAgICBpbmtDb2xvcixcbiAgICAgIGRpc3RyaWJ1dGlvbjogY2ZnLm5vaXNlRGlzdHJpYnV0aW9uLFxuICAgICAgbW9ub2Nocm9tZTogY2ZnLm5vaXNlTW9ub2Nocm9tZSxcbiAgICAgIGNocm9tYTogY2ZnLm5vaXNlQ2hyb21hLFxuICAgICAgY29udHJhc3Q6IGNmZy5ub2lzZUNvbnRyYXN0LFxuICAgICAgYnJpZ2h0bmVzczogY2ZnLm5vaXNlQnJpZ2h0bmVzcyxcbiAgICAgIHNhdHVyYXRpb246IGNmZy5ub2lzZVNhdHVyYXRpb24sXG4gICAgICBodWU6IGNmZy5ub2lzZUh1ZSxcbiAgICAgIHN0cnVjdHVyZVN0cmVuZ3RoOiBjZmcubm9pc2VTdHJ1Y3R1cmVTdHJlbmd0aCxcbiAgICAgIHN0cnVjdHVyZVNjYWxlOiBjZmcubm9pc2VTdHJ1Y3R1cmVTY2FsZSxcbiAgICB9KTtcblxuICAgIC8vIERpc2NhcmQgaWYgYSBuZXdlciByZXF1ZXN0IGlzIGluLWZsaWdodC5cbiAgICBpZiAoZ2VuSWQgIT09IHBlbmRpbmdHZW5lcmF0ZUlkKSB7XG4gICAgICBpZiAodXJsKSBVUkwucmV2b2tlT2JqZWN0VVJMKHVybCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCF1cmwpIHJldHVybjtcblxuICAgIGF3YWl0IGNvbW1pdE5vaXNlVGV4dHVyZVVybCh1cmwsIHsgZ2VuSWQsIG9iamVjdFVybDogdHJ1ZSB9KTtcbiAgfSwgMTQwKTtcbn1cblxuZnVuY3Rpb24gbWVyZ2VDb25maWcobmV4dFBhcnRpYWwgPSB7fSkge1xuICBjb25zdCBiYXNlID0gY3VycmVudCB8fCBzYW5pdGl6ZUNvbmZpZyh7fSk7XG4gIGNvbnN0IG1lcmdlZCA9IHsgLi4uYmFzZSwgLi4ucGlja05vaXNlS2V5cyhuZXh0UGFydGlhbCkgfTtcbiAgcmV0dXJuIHNhbml0aXplQ29uZmlnKG1lcmdlZCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbml0Tm9pc2VTeXN0ZW0oaW5pdGlhbENvbmZpZyA9IHt9KSB7XG4gIC8vIFNhZmUgdG8gY2FsbCBtdWx0aXBsZSB0aW1lcyAoaWRlbXBvdGVudCkuXG4gIGN1cnJlbnQgPSBtZXJnZUNvbmZpZyhpbml0aWFsQ29uZmlnKTtcbiAgaW5pdGlhbGl6ZWQgPSB0cnVlO1xuXG4gIGFwcGx5Q3NzVmFycyhjdXJyZW50KTtcbiAgc2NoZWR1bGVUZXh0dXJlUmVnZW5lcmF0aW9uKGN1cnJlbnQsIHsgZm9yY2U6IHRydWUgfSk7XG4gIFxuICAvLyBJZiBub2lzZSBpcyBlbmFibGVkIGFuZCB0ZXh0dXJlIGFscmVhZHkgZXhpc3RzLCBlbnN1cmUgbm9pc2UtcmVhZHkgY2xhc3MgaXMgcHJlc2VudFxuICBpZiAoY3VycmVudC5ub2lzZUVuYWJsZWQgJiYgKGFjdGl2ZU9iamVjdFVybCB8fCBjdXJyZW50Lm5vaXNlU3ZnRW5hYmxlZCkpIHtcbiAgICBzZXROb2lzZVJlYWR5KHRydWUpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhcHBseU5vaXNlU3lzdGVtKG5leHRDb25maWcgPSB7fSkge1xuICBpZiAoIWluaXRpYWxpemVkKSBpbml0Tm9pc2VTeXN0ZW0obmV4dENvbmZpZyk7XG5cbiAgY3VycmVudCA9IG1lcmdlQ29uZmlnKG5leHRDb25maWcpO1xuICBhcHBseUNzc1ZhcnMoY3VycmVudCk7XG5cbiAgLy8gT25seSByZWdlbmVyYXRlIHRoZSB0ZXh0dXJlIGlmIHRleHR1cmUtcmVsYXRlZCBrbm9icyBjaGFuZ2VkLlxuICBzY2hlZHVsZVRleHR1cmVSZWdlbmVyYXRpb24oY3VycmVudCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXROb2lzZVN5c3RlbUNvbmZpZygpIHtcbiAgcmV0dXJuIGN1cnJlbnQgPyB7IC4uLmN1cnJlbnQgfSA6IG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXN0cm95Tm9pc2VTeXN0ZW0oKSB7XG4gIGlmIChyZWdlblRpbWVyKSB3aW5kb3cuY2xlYXJUaW1lb3V0KHJlZ2VuVGltZXIpO1xuICByZWdlblRpbWVyID0gbnVsbDtcbiAgcGVuZGluZ0dlbmVyYXRlSWQrKztcblxuICB0cnkge1xuICAgIGNvbnN0IHJvb3QgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gICAgcm9vdC5zdHlsZS5yZW1vdmVQcm9wZXJ0eSgnLS1hYnMtbm9pc2UtdGV4dHVyZScpO1xuICB9IGNhdGNoIChlKSB7fVxuXG4gIGlmIChhY3RpdmVPYmplY3RVcmwpIHtcbiAgICB0cnkge1xuICAgICAgVVJMLnJldm9rZU9iamVjdFVSTChhY3RpdmVPYmplY3RVcmwpO1xuICAgIH0gY2F0Y2ggKGUpIHt9XG4gIH1cblxuICBhY3RpdmVPYmplY3RVcmwgPSBudWxsO1xuICBzZXROb2lzZVJlYWR5KGZhbHNlKTtcbiAgY3VycmVudCA9IG51bGw7XG4gIGluaXRp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QUNoQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQztBQUMvRSxDQUFDLENBQUM7QUFDRixDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUc7QUFDWjs7QUFFQSxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQzVDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBQ2pELENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUTtBQUMxQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4Qzs7QUFFQSxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ3pDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBQ2pELENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUTtBQUMxQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEQ7O0FBRUEsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xDLENBQUMsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztBQUN2Qzs7QUFFQSxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RCLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsRDs7QUFFQSxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ3hDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRO0FBQzNDOztBQUVBLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMzQyxDQUFDLENBQUMsR0FBRyxDQUFDO0FBQ04sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDeEYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztBQUNwQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVE7QUFDNUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7QUFDVixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRO0FBQ25CLENBQUMsQ0FBQztBQUNGOztBQUVBLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDMUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUN6QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVO0FBQ25CLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNiLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUM3QyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVTtBQUNoRCxDQUFDLENBQUMsQ0FBQztBQUNIOztBQUVBLFFBQVEsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDekIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztBQUNoRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztBQUNyRixDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxPQUFPO0FBQ2pGLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUN6RDs7QUFFQSxRQUFRLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ3pDLENBQUMsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzlDOztBQUVBLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUI7O0FBRUEsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2QixDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlCOztBQUVBLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUM1QyxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQzNELENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFlBQVk7QUFDMUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQzVDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUN4QyxDQUFDLENBQUMsQ0FBQztBQUNIOztBQUVBLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN2QyxDQUFDLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLDZCQUE2QixDQUFDO0FBQ3RFOztBQUVBLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pFLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQ2hGLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7O0FBRXRELENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUM7QUFDL0MsQ0FBQyxDQUFDOztBQUVGLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzdCOztBQUVBLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNqRCxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLO0FBQ3BDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUk7QUFDbEMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUNsQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7QUFDM0IsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO0FBQzNCLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVE7QUFDaEMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUTtBQUNoQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQ2hDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDaEMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUTtBQUMzQixDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFROztBQUUzQixDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0FBQzVDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDM0MsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUMzQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDOztBQUUxQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDekQ7O0FBRUEsUUFBUSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUNuRCxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDdEg7O0FBRUEsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUM5QixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSTtBQUM1QyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzFCLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkQsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2xCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3pGLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0QixDQUFDLENBQUM7QUFDRixDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xELENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJO0FBQzdCLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUNwRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUNwRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUNwRCxDQUFDLENBQUMsQ0FBQztBQUNIOztBQUVBLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMvQixDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3hGOztBQUVBLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDOUIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMs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QUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1QyxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQzs7QUFFekMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRTVCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDO0FBQ2xELENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRztBQUNwQixDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7QUFDcEIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHOztBQUVwQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZO0FBQzFFLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNiLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRztBQUN0QyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQzVCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDNUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUNqRCxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQzNDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDakQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7QUFDNUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7QUFDbEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7QUFDNUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUNqRCxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQzNDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUk7QUFDakQsQ0FBQyxDQUFDOztBQUVGLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3hDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQy9GLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQzs7QUFFN0YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUNsQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQ2xCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUk7O0FBRWxCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDdkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQztBQUM3RixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDO0FBQzdGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsZ0JBQWdCLENBQUM7QUFDN0YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUTtBQUM5QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRO0FBQzlDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVE7QUFDOUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRU4sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztBQUN0RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0FBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMvQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQy9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUNqQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUk7QUFDakIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQ2pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVOLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSTtBQUMxRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUN4QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUk7QUFDaEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRztBQUNuQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO0FBQ25DLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7QUFDbkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRU4sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJO0FBQzNDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ2pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUNqRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUk7QUFDakQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQ2pELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQzlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVOLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQ2pELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUNuRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDL0UsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQzs7QUFFRixDQUFDLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRXpDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQztBQUNoRCxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSTtBQUN4QixDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDO0FBQ2xDOztBQUVBLFFBQVEsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDM0IsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxlQUFlOztBQUV2QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztBQUNwRSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRTdFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQ2pDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsV0FBVztBQUNoQyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQ3RDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUNYLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDbkUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQztBQUM1RSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7O0FBRWhFLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO0FBQzVELENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDOztBQUV0RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQztBQUMvRCxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQzNFLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUM7QUFDeEYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7QUFDcEQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25FLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQzVGLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUM7QUFDaEQsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUN0RixDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDeEUsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDOztBQUVwRixDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDekUsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7O0FBRTlHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSTtBQUNuRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQztBQUMzRyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdEQsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3RFLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7O0FBRXBHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQztBQUN4RyxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSztBQUNwRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSztBQUN4QyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQ2pFLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQ2pFLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pELENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDakUsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQzs7QUFFN0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxNQUFNO0FBQ3hGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDdEUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdELENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNyQixDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxTQUFTLENBQUM7QUFDekUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRztBQUM5QyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHO0FBQzlDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDdkUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUN2RSxDQUFDLENBQUM7O0FBRUYsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUN6RixDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDOztBQUV6RixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztBQUNsQixDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUN0RSxDQUFDO0FBQ0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLO0FBQ3pCLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDakcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUMvRixDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUN2RSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUNyRSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDMUYsQ0FBQztBQUNELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSTtBQUM1QyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUMxRSxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUN4RSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFVBQVUs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LENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTs7QUFFcEYsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekosQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDN0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNKLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbk0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUNoQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDN0UsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQzs7QUFFWixDQUFDLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQztBQUM5Qjs7QUFFQSxRQUFRLENBQUMsMkJBQTJCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsRSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNoRSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENB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