import {
  DEFAULT_SIMULATION_BODY_MATERIAL_CONFIG,
  SIMULATION_BODY_MATERIAL_CACHE_DEBOUNCE_MS,
  normalizeSimulationBodyMaterialConfig,
  resolveSimulationBodyMaterialThemeProfile,
} from './simulation-body-material-config.js';

const TAU = Math.PI * 2;
const MAX_SPRITE_CACHE_ENTRIES = 96;
const MAX_ATLAS_CACHE_ENTRIES = 12;
const MIN_SPHERE_CHROMA_SCALE = 0.9;
const MAX_SPHERE_CHROMA_SCALE = 1;
const MAX_SPHERE_HUE_SHIFT_DEGREES = 1.5;
const TOOTH_TILE_SIZE = 16;
const TOOTH_TILE = (() => {
  const tile = new Float32Array(TOOTH_TILE_SIZE ** 2);
  let seed = 1729;
  for (let index = 0; index < tile.length; index += 1) {
    seed = (seed * 48271) % 2147483647;
    tile[index] = (seed / 2147483647) * 2 - 1;
  }
  return tile;
})();

let materialConfig = normalizeSimulationBodyMaterialConfig(
  DEFAULT_SIMULATION_BODY_MATERIAL_CONFIG,
);
let materialRevision = 1;
let pendingConfig = null;
let pendingConfigTimer = 0;
let spriteCache = new Map();
let atlasCache = new Map();
let colourAliases = new Map();
const colourEntriesByKey = new Map();
const listeners = new Set();
const stats = {
  bakeCount: 0,
  bakeMs: 0,
  colourParseCount: 0,
  cacheHits: 0,
  cacheMisses: 0,
  atlasBuildCount: 0,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, amount) {
  return a + (b - a) * amount;
}

function smoothStep(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function createRasterCanvas(width, height) {
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  if (typeof OffscreenCanvas === 'function') return new OffscreenCanvas(width, height);
  throw new Error('Sphere material baking requires a browser Canvas implementation.');
}

function evictOldestEntries(cache, maxEntries) {
  while (cache.size > maxEntries) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
}

function parseCssColour(value) {
  const source = typeof value === 'string' ? value : String(value || '');
  const direct = colourAliases.get(source);
  if (direct) return direct;
  const alias = source.trim().toLowerCase();
  const cached = colourAliases.get(alias);
  if (cached) return cached;

  let rgb = null;
  const shortHex = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(alias);
  if (shortHex) {
    rgb = shortHex.slice(1).map((channel) => Number.parseInt(`${channel}${channel}`, 16));
  }
  const longHex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})(?:[0-9a-f]{2})?$/i.exec(alias);
  if (!rgb && longHex) rgb = longHex.slice(1, 4).map((channel) => Number.parseInt(channel, 16));
  const functional = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(alias);
  if (!rgb && functional) {
    rgb = functional.slice(1, 4).map((channel) => clamp(Math.round(Number(channel)), 0, 255));
  }
  if (!rgb) rgb = [128, 128, 128];
  const key = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
  let entry = colourEntriesByKey.get(key);
  if (!entry) {
    entry = {
      rgb: Object.freeze(rgb),
      key,
    };
    colourEntriesByKey.set(key, entry);
  }
  colourAliases.set(alias, entry);
  if (source !== alias) colourAliases.set(source, entry);
  stats.colourParseCount += 1;
  return entry;
}

function srgbToLinear(value) {
  const channel = value / 255;
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(value) {
  const channel = clamp(value, 0, 1);
  const encoded = channel <= 0.0031308
    ? channel * 12.92
    : 1.055 * (channel ** (1 / 2.4)) - 0.055;
  return Math.round(encoded * 255);
}

function srgbToOklab(rgb) {
  const red = srgbToLinear(rgb[0]);
  const green = srgbToLinear(rgb[1]);
  const blue = srgbToLinear(rgb[2]);
  const long = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
  const medium = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
  const short = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);
  return [
    0.2104542553 * long + 0.793617785 * medium - 0.0040720468 * short,
    1.9779984951 * long - 2.428592205 * medium + 0.4505937099 * short,
    0.0259040371 * long + 0.7827717662 * medium - 0.808675766 * short,
  ];
}

function oklabToSrgb(lightness, a, b, result) {
  const long = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const medium = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const short = lightness - 0.0894841775 * a - 1.291485548 * b;
  const longCubed = long ** 3;
  const mediumCubed = medium ** 3;
  const shortCubed = short ** 3;
  result[0] = linearToSrgb(4.0767416621 * longCubed - 3.3077115913 * mediumCubed + 0.2309699292 * shortCubed);
  result[1] = linearToSrgb(-1.2684380046 * longCubed + 2.6097574011 * mediumCubed - 0.3413193965 * shortCubed);
  result[2] = linearToSrgb(-0.0041960863 * longCubed - 0.7034186147 * mediumCubed + 1.707614701 * shortCubed);
  return result;
}

function getSurfaceTooth(x, y, offset) {
  return TOOTH_TILE[(y * TOOTH_TILE_SIZE + x + offset) % TOOTH_TILE.length];
}

function createLightingModel(profile) {
  const projectedLength = Math.hypot(profile.keyX, profile.keyY);
  const lightScale = projectedLength > 0.94 ? 0.94 / projectedLength : 1;
  const lightX = profile.keyX * lightScale;
  const lightY = profile.keyY * lightScale;
  const lightZ = Math.sqrt(Math.max(0.116, 1 - lightX * lightX - lightY * lightY));
  const wrap = profile.keySpread * 0.42;
  const matteExponent = lerp(2.4, 0.52, profile.matteRolloff);
  const rimExponent = lerp(8.5, 0.72, profile.rimWidth);
  const fillLength = Math.hypot(lightX * 0.85, lightY * 0.72, 0.72);
  const fillX = (-lightX * 0.85) / fillLength;
  const fillY = (-lightY * 0.72) / fillLength;
  const fillZ = 0.72 / fillLength;
  const reflectionCenterX = lightX * 0.56;
  const reflectionCenterY = lightY * 0.94;
  const result = [0, 0, 0];

  return (baseLab, nx, ny, surfaceTooth) => {
    const radiusSquared = nx * nx + ny * ny;
    const nz = Math.sqrt(Math.max(0, 1 - radiusSquared));
    const rawDiffuse = nx * lightX + ny * lightY + nz * lightZ;
    const wrappedDiffuse = clamp((rawDiffuse + wrap) / (1 + wrap), 0, 1);
    const diffuse = wrappedDiffuse ** matteExponent;
    const upper = clamp((1 - ny) * 0.5, 0, 1);
    const lower = clamp((ny + 0.08) / 1.08, 0, 1);
    const edge = 1 - nz;
    const backFacing = smoothStep((0.28 - rawDiffuse) / 1.18);
    const rim = (edge ** rimExponent)
      * (0.28 + upper * 0.72)
      * (0.62 + (1 - diffuse) * 0.38);
    const horizon = (edge ** 0.82) * ((1 - Math.abs(ny)) ** 2.1) * (0.7 + upper * 0.3);
    const skyField = lerp(upper ** (1.28 / profile.ambientReach), 1, profile.ambientCoverage);
    const skyFill = profile.skyFillStrength * upper * (0.34 + edge * 0.66);
    const ambient = profile.ambientStrength * skyField;
    const rawFill = nx * fillX + ny * fillY + nz * fillZ;
    const opposingFill = profile.fillStrength
      * (clamp((rawFill + 0.36) / 1.36, 0, 1) ** 1.42)
      * (0.72 + edge * 0.28);
    const terminatorDistance = (rawDiffuse - 0.035) / (0.31 * profile.shadowArea);
    const terminator = profile.terminatorStrength
      * Math.exp(-(terminatorDistance ** 2))
      * (0.38 + edge * 0.62)
      * (0.7 + lower * 0.3);
    const reflectionX = (nx - reflectionCenterX) / (0.82 * profile.ambientReach);
    const reflectionY = (ny - reflectionCenterY) / (0.34 * profile.ambientReach);
    const reflectionBand = profile.reflectionBandStrength
      * Math.exp(-(reflectionX ** 2 * 0.72 + reflectionY ** 2 * 1.66))
      * smoothStep((nz - 0.06) / 0.88)
      * (0.58 + upper * 0.42);
    const rimLight = profile.rimLightStrength * rim;
    const horizonFill = profile.horizonFillStrength * horizon;
    const bounceExponent = lerp(1.95, 0.9, (profile.bounceReach - 0.5));
    const bounce = profile.bounceStrength
      * (lower ** bounceExponent)
      * (0.24 + edge * 0.76)
      * (1 - diffuse * 0.18);
    const shadowRegion = clamp(
      lower * (0.58 + profile.shadowAreaBias * 0.24)
        + backFacing * (0.62 + profile.shadowAreaBias * 0.24)
        + edge * lower * (0.26 + profile.shadowAreaBias * 0.18),
      0,
      1,
    ) * (1 - ambient * 0.12);
    const edgeOcclusion = profile.edgeShadowStrength
      * (edge ** lerp(1.45, 0.72, profile.shadowArea - 0.5))
      * (0.22 + lower * 0.78)
      * (1 - rimLight * 0.42);
    const keyLight = profile.keyStrength * diffuse;
    const lightEnergy = keyLight * 0.4
      + ambient * 0.1
      + skyFill * 0.16
      + opposingFill * 0.15
      + reflectionBand * 0.18
      + rimLight * 0.3
      + horizonFill * 0.17
      + bounce * 0.17;
    const darkEnergy = profile.shadowStrength * shadowRegion * 0.38
      + terminator * 0.1
      + edgeOcclusion * 0.4;
    const signedEnergy = clamp(lightEnergy - darkEnergy, -1.2, 1.2);
    let lightness = baseLab[0]
      + (1 - baseLab[0]) * lightEnergy
      - baseLab[0] * darkEnergy;
    lightness += profile.contrast
      * signedEnergy
      * (signedEnergy >= 0 ? 1 - baseLab[0] : baseLab[0])
      * 0.22;
    lightness += surfaceTooth * profile.surfaceTooth * 0.014 * (0.42 + edge * 0.58);
    // Keep the matte ceiling for ordinary palette colours, but do not turn an
    // authored white material into light grey. Near-white inputs may retain a
    // brighter highlight while the existing shadow energy still defines form.
    const authoredWhiteWeight = smoothStep((baseLab[0] - 0.9) / 0.1);
    const highlightCeiling = lerp(0.91, 1, authoredWhiteWeight);
    lightness = clamp(lightness, 0.055, highlightCeiling);

    const highlightMask = clamp(
      diffuse * 0.72 + rim * 0.68 + skyFill * 0.24 + reflectionBand * 0.56,
      0,
      1,
    );
    const shadowMask = clamp(
      shadowRegion * 0.82 + edgeOcclusion * 0.5 + terminator * 0.72,
      0,
      1,
    );
    const baseChroma = Math.hypot(baseLab[1], baseLab[2]);
    const baseHue = Math.atan2(baseLab[2], baseLab[1]);
    // Lighting may reveal or compress the palette colour, but it must never
    // become more chromatic than the authored base. This keeps the six
    // canonical tags recognisable while preserving the full lightness form.
    const highlightChromaRetention = lerp(
      1,
      clamp(profile.highlightVibrance, MIN_SPHERE_CHROMA_SCALE, 1),
      highlightMask * 0.42,
    );
    const shadowChromaRetention = lerp(
      1,
      clamp(profile.shadowVibrance, MIN_SPHERE_CHROMA_SCALE, 1),
      shadowMask * 0.32,
    );
    const chromaScale = clamp(
      highlightChromaRetention * shadowChromaRetention,
      MIN_SPHERE_CHROMA_SCALE,
      MAX_SPHERE_CHROMA_SCALE,
    );
    const coolUpper = (ambient * upper + rimLight + horizonFill * 0.5 + reflectionBand) * 0.25;
    const warmLower = (bounce + opposingFill * lower) * 0.28;
    const hueShiftDegrees = clamp(
      (warmLower - coolUpper + profile.temperature * 0.12) * 1.5,
      -MAX_SPHERE_HUE_SHIFT_DEGREES,
      MAX_SPHERE_HUE_SHIFT_DEGREES,
    );
    const hue = baseHue + hueShiftDegrees * (Math.PI / 180);
    const chroma = baseChroma * chromaScale;
    return oklabToSrgb(lightness, Math.cos(hue) * chroma, Math.sin(hue) * chroma, result);
  };
}

function bakeSprite(rgbEntry, theme) {
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const profile = resolveSimulationBodyMaterialThemeProfile(materialConfig, theme);
  const detail = profile.cacheDetailPx;
  const canvas = createRasterCanvas(detail, detail);
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) throw new Error('Unable to create a 2D context for sphere material baking.');
  const image = context.createImageData(detail, detail);
  const pixels = image.data;
  const baseLab = srgbToOklab(rgbEntry.rgb);
  const shade = createLightingModel(profile);
  const toothOffset = Math.floor(
    (rgbEntry.rgb[0] * 0.013 + rgbEntry.rgb[1] * 0.031 + rgbEntry.rgb[2] * 0.057) * 97,
  ) % TOOTH_TILE.length;
  const coordinateScale = 2 / detail;
  const edgeWidth = Math.max(0.02, 1.5 / detail);

  for (let y = 0; y < detail; y += 1) {
    const rawY = (y + 0.5) * coordinateScale - 1;
    for (let x = 0; x < detail; x += 1) {
      const rawX = (x + 0.5) * coordinateScale - 1;
      const radius = Math.hypot(rawX, rawY);
      const pixelIndex = (y * detail + x) * 4;
      if (radius >= 1 + edgeWidth) {
        pixels[pixelIndex + 3] = 0;
        continue;
      }
      const normalScale = radius > 1 ? 1 / radius : 1;
      const colour = shade(
        baseLab,
        rawX * normalScale,
        rawY * normalScale,
        getSurfaceTooth(x, y, toothOffset),
      );
      pixels[pixelIndex] = colour[0];
      pixels[pixelIndex + 1] = colour[1];
      pixels[pixelIndex + 2] = colour[2];
      pixels[pixelIndex + 3] = Math.round(255 * (1 - smoothStep((radius - 1 + edgeWidth) / (edgeWidth * 2))));
    }
  }

  context.putImageData(image, 0, 0);
  const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  stats.bakeCount += 1;
  stats.bakeMs += endedAt - startedAt;
  return Object.freeze({
    canvas,
    detail,
    rgb: rgbEntry.rgb,
    rgbKey: rgbEntry.key,
    theme: profile.theme,
    revision: materialRevision,
  });
}

function commitConfig(input) {
  const next = normalizeSimulationBodyMaterialConfig(input);
  if (JSON.stringify(next) === JSON.stringify(materialConfig)) return materialConfig;
  materialConfig = next;
  materialRevision += 1;
  spriteCache = new Map();
  atlasCache = new Map();
  stats.bakeCount = 0;
  stats.bakeMs = 0;
  stats.cacheHits = 0;
  stats.cacheMisses = 0;
  stats.atlasBuildCount = 0;
  for (const listener of listeners) listener(materialConfig, materialRevision);
  return materialConfig;
}

export function getSimulationBodyMaterialConfig() {
  return normalizeSimulationBodyMaterialConfig(materialConfig);
}

export function setSimulationBodyMaterialConfig(input = {}) {
  if (pendingConfigTimer && typeof clearTimeout === 'function') clearTimeout(pendingConfigTimer);
  pendingConfigTimer = 0;
  pendingConfig = null;
  return commitConfig(input);
}

export function scheduleSimulationBodyMaterialConfig(input = {}) {
  pendingConfig = normalizeSimulationBodyMaterialConfig(input);
  if (pendingConfigTimer || typeof setTimeout !== 'function') return pendingConfig;
  pendingConfigTimer = setTimeout(() => {
    pendingConfigTimer = 0;
    const next = pendingConfig;
    pendingConfig = null;
    commitConfig(next);
  }, SIMULATION_BODY_MATERIAL_CACHE_DEBOUNCE_MS);
  return pendingConfig;
}

export function subscribeSimulationBodyMaterial(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSimulationBodyMaterialSprite(color, options = {}) {
  if (!materialConfig.enabled) return null;
  const theme = (options === 'dark' || options?.theme === 'dark') ? 'dark' : 'light';
  const rgbEntry = parseCssColour(color);
  const cacheKey = `${theme}:${rgbEntry.key}`;
  const cached = spriteCache.get(cacheKey);
  if (cached) {
    // Refresh insertion order so eviction is a real LRU. The bounded cache is
    // the only strong owner of sticker canvases.
    spriteCache.delete(cacheKey);
    spriteCache.set(cacheKey, cached);
    stats.cacheHits += 1;
    return cached;
  }
  stats.cacheMisses += 1;
  const sprite = bakeSprite(rgbEntry, theme);
  spriteCache.set(cacheKey, sprite);
  evictOldestEntries(spriteCache, MAX_SPRITE_CACHE_ENTRIES);
  return sprite;
}

export function prewarmSimulationBodyMaterial(colors, options = {}) {
  if (!materialConfig.enabled || !Array.isArray(colors)) return 0;
  const before = stats.bakeCount;
  for (const color of colors) getSimulationBodyMaterialSprite(color, options);
  return stats.bakeCount - before;
}

export function drawSimulationBodyMaterial(ctx, color, x, y, radius, options = {}) {
  if (!ctx || radius <= 0.05) return false;
  const sprite = getSimulationBodyMaterialSprite(color, options);
  if (!sprite) return false;
  const diameter = radius * 2;
  const inheritedSmoothing = ctx.imageSmoothingEnabled;
  if (!inheritedSmoothing) ctx.imageSmoothingEnabled = true;
  ctx.drawImage(sprite.canvas, x - radius, y - radius, diameter, diameter);
  if (!inheritedSmoothing) ctx.imageSmoothingEnabled = inheritedSmoothing;
  return true;
}

export function drawClippedSimulationBodyMaterial(
  ctx,
  color,
  x,
  y,
  radius,
  appendPath,
  options = {},
) {
  if (!ctx || typeof appendPath !== 'function') return false;
  const sprite = getSimulationBodyMaterialSprite(color, options);
  if (!sprite) return false;
  ctx.save();
  const inheritedSmoothing = ctx.imageSmoothingEnabled;
  if (!inheritedSmoothing) ctx.imageSmoothingEnabled = true;
  ctx.beginPath();
  appendPath(ctx);
  ctx.clip();
  const diameter = radius * 2;
  ctx.drawImage(sprite.canvas, x - radius, y - radius, diameter, diameter);
  ctx.restore();
  if (!inheritedSmoothing) ctx.imageSmoothingEnabled = inheritedSmoothing;
  return true;
}

export function getSimulationBodyMaterialAtlas(colors, options = {}) {
  if (!materialConfig.enabled || !Array.isArray(colors) || colors.length === 0) return null;
  const theme = (options === 'dark' || options?.theme === 'dark') ? 'dark' : 'light';
  const uniqueEntries = [];
  const slotByRgbKey = new Map();
  for (const color of colors) {
    const entry = parseCssColour(color);
    if (slotByRgbKey.has(entry.key)) continue;
    slotByRgbKey.set(entry.key, uniqueEntries.length);
    uniqueEntries.push({ color, entry });
  }
  const atlasKey = `${materialRevision}:${theme}:${materialConfig.cacheDetailPx}:${uniqueEntries.map(({ entry }) => entry.key).join(',')}`;
  const cached = atlasCache.get(atlasKey);
  if (cached) return cached;

  const detail = materialConfig.cacheDetailPx;
  const gutterPx = 1;
  const cellStridePx = detail + gutterPx * 2;
  const canvas = createRasterCanvas(cellStridePx * uniqueEntries.length, cellStridePx);
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) throw new Error('Unable to create a 2D context for sphere atlas baking.');
  const slotByColor = new Map();
  uniqueEntries.forEach(({ color, entry }, slot) => {
    const sprite = getSimulationBodyMaterialSprite(color, { theme });
    const x = slot * cellStridePx + gutterPx;
    context.drawImage(sprite.canvas, x, gutterPx, detail, detail);
    slotByColor.set(String(color), slot);
    slotByRgbKey.set(entry.key, slot);
  });
  const atlas = Object.freeze({
    key: atlasKey,
    canvas,
    slotCount: uniqueEntries.length,
    detailPx: detail,
    gutterPx,
    cellStridePx,
    widthPx: canvas.width,
    heightPx: canvas.height,
    uvInset: gutterPx / canvas.width,
    uvScale: detail / canvas.width,
    slotByColor,
    getSlot(color) {
      return slotByRgbKey.get(parseCssColour(color).key) ?? 0;
    },
  });
  atlasCache.set(atlasKey, atlas);
  evictOldestEntries(atlasCache, MAX_ATLAS_CACHE_ENTRIES);
  stats.atlasBuildCount += 1;
  return atlas;
}

export function getSimulationBodyMaterialStats() {
  return Object.freeze({
    enabled: materialConfig.enabled,
    revision: materialRevision,
    cacheDetailPx: materialConfig.cacheDetailPx,
    spriteCount: spriteCache.size,
    atlasCount: atlasCache.size,
    colourAliasCount: colourAliases.size,
    ...stats,
    lightingCalculationsPerFrame: 0,
    gradientBuildsPerFrame: 0,
    colourParsesPerFrame: 0,
  });
}

export function clearSimulationBodyMaterialCache() {
  materialRevision += 1;
  spriteCache = new Map();
  atlasCache = new Map();
  stats.bakeCount = 0;
  stats.bakeMs = 0;
  stats.cacheHits = 0;
  stats.cacheMisses = 0;
  stats.atlasBuildCount = 0;
  for (const listener of listeners) listener(materialConfig, materialRevision);
}

if (typeof window !== 'undefined') {
  window.__ABS_SIMULATION_BODY_MATERIAL__ = Object.freeze({
    getConfig: getSimulationBodyMaterialConfig,
    getStats: getSimulationBodyMaterialStats,
    clearCache: clearSimulationBodyMaterialCache,
  });
}

export const SIMULATION_BODY_MATERIAL_TAU = TAU;
