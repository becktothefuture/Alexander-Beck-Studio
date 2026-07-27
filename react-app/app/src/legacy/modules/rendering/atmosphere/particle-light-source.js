export const MAX_PARTICLE_LIGHTS_PER_BALL = 16;

const PARTICLE_PATTERN_BUCKETS = 64;
const PARTICLE_PATTERN_LENGTH = PARTICLE_PATTERN_BUCKETS * MAX_PARTICLE_LIGHTS_PER_BALL;
const TAU = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const PARTICLE_COS = new Float32Array(PARTICLE_PATTERN_LENGTH);
const PARTICLE_SIN = new Float32Array(PARTICLE_PATTERN_LENGTH);
const PARTICLE_RADIAL_JITTER = new Float32Array(PARTICLE_PATTERN_LENGTH);
const PARTICLE_SIZE = new Float32Array(PARTICLE_PATTERN_LENGTH);
const PARTICLE_PHASE = new Float32Array(PARTICLE_PATTERN_LENGTH);
const PARTICLE_SPEED = new Float32Array(PARTICLE_PATTERN_LENGTH);

function hash01(value) {
  const sine = Math.sin(value * 12.9898 + 78.233) * 43758.5453;
  return sine - Math.floor(sine);
}

for (let bucket = 0; bucket < PARTICLE_PATTERN_BUCKETS; bucket += 1) {
  const rotation = hash01(bucket + 0.17) * TAU;
  for (let particle = 0; particle < MAX_PARTICLE_LIGHTS_PER_BALL; particle += 1) {
    const index = bucket * MAX_PARTICLE_LIGHTS_PER_BALL + particle;
    const angle = rotation + particle * GOLDEN_ANGLE + hash01(index + 1.3) * 1.0;
    PARTICLE_COS[index] = Math.cos(angle);
    PARTICLE_SIN[index] = Math.sin(angle);
    PARTICLE_RADIAL_JITTER[index] = 0.55 + hash01(index + 9.1) * 0.8;
    PARTICLE_SIZE[index] = 0.6 + hash01(index + 17.7) * 0.8;
    PARTICLE_PHASE[index] = hash01(index + 29.4) * TAU;
    PARTICLE_SPEED[index] = 0.64 + hash01(index + 43.2) * 0.78;
  }
}

export function resolveParticlePatternOffset(seed) {
  const numericSeed = Number.isFinite(Number(seed)) ? Math.abs(Math.trunc(Number(seed))) : 0;
  const bucket = numericSeed % PARTICLE_PATTERN_BUCKETS;
  return bucket * MAX_PARTICLE_LIGHTS_PER_BALL;
}

export function resolveParticleLightCount(config) {
  return Math.max(1, Math.min(
    MAX_PARTICLE_LIGHTS_PER_BALL,
    Math.round(Number(config.particlesPerBall) || 1),
  ));
}

export function resolveParticleLightSample(target, patternIndex, particleIndex, particleCount, nowMs, shimmer) {
  const radial = Math.sqrt((particleIndex + 0.42) / particleCount) * PARTICLE_RADIAL_JITTER[patternIndex];
  const pulse = Math.sin(
    nowMs * 0.001 * PARTICLE_SPEED[patternIndex] + PARTICLE_PHASE[patternIndex],
  );
  const tangent = pulse * shimmer * 0.24;
  const cos = PARTICLE_COS[patternIndex];
  const sin = PARTICLE_SIN[patternIndex];
  target.x = cos * radial - sin * tangent;
  target.y = sin * radial + cos * tangent;
  target.radial = radial;
  target.size = PARTICLE_SIZE[patternIndex];
  target.intensity = 1 + pulse * shimmer * 0.42;
  return target;
}

function parseColour(value) {
  const colour = String(value || '#ffffff').trim();
  if (/^#[0-9a-f]{6}$/i.test(colour)) {
    return [
      Number.parseInt(colour.slice(1, 3), 16),
      Number.parseInt(colour.slice(3, 5), 16),
      Number.parseInt(colour.slice(5, 7), 16),
    ];
  }
  if (/^#[0-9a-f]{3}$/i.test(colour)) {
    return [1, 2, 3].map((index) => Number.parseInt(colour[index] + colour[index], 16));
  }
  const channels = colour.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  if (channels?.length === 3) return channels.map((channel) => Math.min(255, Math.max(0, channel)));
  return [255, 255, 255];
}

function createLightSprite(colour, softness, { body = false } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d', { alpha: true });
  const [red, green, blue] = parseColour(colour);
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  const coreStop = body ? 0.08 + (1 - softness) * 0.1 : 0.035 + (1 - softness) * 0.08;
  const colourStop = body ? 0.36 + softness * 0.2 : 0.18 + softness * 0.28;
  gradient.addColorStop(0, `rgba(${red}, ${green}, ${blue}, 1)`);
  gradient.addColorStop(coreStop, `rgba(${red}, ${green}, ${blue}, ${body ? 0.9 : 0.96})`);
  gradient.addColorStop(colourStop, `rgba(${red}, ${green}, ${blue}, ${body ? 0.3 : 0.42 + softness * 0.18})`);
  gradient.addColorStop(1, `rgba(${red}, ${green}, ${blue}, 0)`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  return canvas;
}

export class ParticleLightSource {
  constructor() {
    this.spriteCache = new Map();
    this.bodySpriteCache = new Map();
    this.softnessKey = Number.NaN;
    this.sample = { x: 0, y: 0, radial: 0, size: 1, intensity: 1 };
  }

  prepareSoftness(softness) {
    const nextSoftnessKey = Math.round(Math.max(0, Math.min(1, Number(softness) || 0)) * 100) / 100;
    if (nextSoftnessKey !== this.softnessKey) {
      this.softnessKey = nextSoftnessKey;
      this.spriteCache.clear();
      this.bodySpriteCache.clear();
    }
    return nextSoftnessKey;
  }

  getSprite(colour, softness) {
    const resolvedSoftness = this.prepareSoftness(softness);
    return this.getPreparedSprite(colour, resolvedSoftness);
  }

  getPreparedSprite(colour, softness) {
    const key = String(colour || '#ffffff');
    if (!this.spriteCache.has(key)) {
      this.spriteCache.set(key, createLightSprite(key, softness));
    }
    return this.spriteCache.get(key);
  }

  getBodySprite(colour, softness) {
    const resolvedSoftness = this.prepareSoftness(softness);
    return this.getPreparedBodySprite(colour, resolvedSoftness);
  }

  getPreparedBodySprite(colour, softness) {
    const key = String(colour || '#ffffff');
    if (!this.bodySpriteCache.has(key)) {
      this.bodySpriteCache.set(key, createLightSprite(key, softness, { body: true }));
    }
    return this.bodySpriteCache.get(key);
  }

  render({ context, canvas, balls, mainCanvas, config, nowMs, emitterStride = 1 }) {
    const width = canvas.width;
    const height = canvas.height;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
    context.filter = 'none';
    context.clearRect(0, 0, width, height);

    const ballCount = Array.isArray(balls) ? balls.length : 0;
    if (ballCount === 0 || width <= 0 || height <= 0) return 0;

    const sourceScaleX = width / Math.max(1, mainCanvas.width);
    const sourceScaleY = height / Math.max(1, mainCanvas.height);
    const radiusScale = Math.sqrt(sourceScaleX * sourceScaleY);
    const particleCount = resolveParticleLightCount(config);
    const shimmer = Math.max(0, Math.min(1, Number(config.particleShimmer) || 0));
    const energy = Math.max(0, Number(config.particleEnergy) || 0);
    const bodyEnergy = Math.max(0, Math.min(1, Number(config.bodyEnergy) || 0));
    const bodySize = Math.max(0.01, Number(config.bodySize) || 0.01);
    const spread = Math.max(0, Number(config.particleSpread) || 0);
    const size = Math.max(0.01, Number(config.particleSize) || 0.01);
    const softness = Math.max(0, Math.min(1, Number(config.lightSoftness) || 0));
    const resolvedSoftness = this.prepareSoftness(softness);
    let renderedLights = 0;

    const resolvedEmitterStride = Math.max(1, Math.round(Number(emitterStride) || 1));
    context.globalCompositeOperation = 'lighter';
    for (let ballIndex = 0; ballIndex < ballCount; ballIndex += resolvedEmitterStride) {
      const ball = balls[ballIndex];
      const radius = typeof ball?.getDisplayRadius === 'function'
        ? ball.getDisplayRadius()
        : Number(ball?.r || 0);
      if (!Number.isFinite(ball?.x) || !Number.isFinite(ball?.y) || !Number.isFinite(radius) || radius <= 0) continue;

      const centerX = ball.x * sourceScaleX;
      const centerY = ball.y * sourceScaleY;
      const cloudRadius = radius * radiusScale * spread;
      const baseLightRadius = Math.max(0.75, radius * radiusScale * size);
      const bodyRadius = Math.max(1, radius * radiusScale * bodySize);
      const seed = Number.isFinite(ball.pebbleSeed) ? ball.pebbleSeed : ballIndex;
      const patternOffset = resolveParticlePatternOffset(seed);
      const sprite = this.getPreparedSprite(ball.color, resolvedSoftness);
      const bodySprite = this.getPreparedBodySprite(ball.color, resolvedSoftness);

      if (bodyEnergy > 0) {
        context.globalAlpha = bodyEnergy;
        context.drawImage(
          bodySprite,
          centerX - bodyRadius,
          centerY - bodyRadius,
          bodyRadius * 2,
          bodyRadius * 2,
        );
        renderedLights += 1;
      }

      for (let particleIndex = 0; energy > 0 && particleIndex < particleCount; particleIndex += 1) {
        const patternIndex = patternOffset + particleIndex;
        const sample = resolveParticleLightSample(
          this.sample,
          patternIndex,
          particleIndex,
          particleCount,
          nowMs,
          shimmer,
        );
        const lightRadius = baseLightRadius * sample.size;
        const radialFade = Math.max(0.52, 1 - sample.radial * 0.24);
        context.globalAlpha = Math.min(1, energy * sample.intensity * radialFade);
        context.drawImage(
          sprite,
          centerX + sample.x * cloudRadius - lightRadius,
          centerY + sample.y * cloudRadius - lightRadius,
          lightRadius * 2,
          lightRadius * 2,
        );
        renderedLights += 1;
      }
    }

    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
    return renderedLights;
  }

  destroy() {
    this.spriteCache.clear();
    this.bodySpriteCache.clear();
  }
}
