import {
  normalizeAboutNarrativeWorldTransitionProgress,
} from './aboutNarrativeMotionMath.js';

export const ABOUT_NARRATIVE_ANCHOR_SAMPLING_EXACT = 'exact';
export const ABOUT_NARRATIVE_ANCHOR_SAMPLING_UNSUPPORTED = 'unsupported';

export const ABOUT_NARRATIVE_ANCHOR_SAMPLING_CAPABILITIES = Object.freeze({
  'ambient-drift-v1': ABOUT_NARRATIVE_ANCHOR_SAMPLING_EXACT,
  'swarm-life-v1': ABOUT_NARRATIVE_ANCHOR_SAMPLING_EXACT,
  'living-wave-v1': ABOUT_NARRATIVE_ANCHOR_SAMPLING_EXACT,
  'group-emphasis-v1': ABOUT_NARRATIVE_ANCHOR_SAMPLING_EXACT,
  'discipline-isolation-v1': ABOUT_NARRATIVE_ANCHOR_SAMPLING_EXACT,
  'living-colour-v1': ABOUT_NARRATIVE_ANCHOR_SAMPLING_EXACT,
  'bust-yaw-v1': ABOUT_NARRATIVE_ANCHOR_SAMPLING_EXACT,
  'bust-assembly-v1': ABOUT_NARRATIVE_ANCHOR_SAMPLING_EXACT,
});

const IDENTITY_MATRIX = Object.freeze([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
]);

function numberOr(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function mix(from, to, progress) {
  return from + ((to - from) * progress);
}

function fract(value) {
  return value - Math.floor(value);
}

function smoothstep01(value) {
  const progress = Math.min(1, Math.max(0, numberOr(value)));
  return progress * progress * (3 - (2 * progress));
}

function coordinate(value, index) {
  if (Array.isArray(value) || ArrayBuffer.isView(value)) return numberOr(value[index]);
  return numberOr(index === 0 ? value?.x : index === 1 ? value?.y : value?.z);
}

function matrixElements(matrix) {
  return matrix?.elements || matrix || IDENTITY_MATRIX;
}

function writeTransformedPoint(target, matrix, x, y, z) {
  const elements = matrixElements(matrix);
  target.x = (elements[0] * x) + (elements[4] * y) + (elements[8] * z) + elements[12];
  target.y = (elements[1] * x) + (elements[5] * y) + (elements[9] * z) + elements[13];
  target.z = (elements[2] * x) + (elements[6] * y) + (elements[10] * z) + elements[14];
}

export function getAboutNarrativeAnchorSamplingCapability(modifierId) {
  return ABOUT_NARRATIVE_ANCHOR_SAMPLING_CAPABILITIES[modifierId]
    || ABOUT_NARRATIVE_ANCHOR_SAMPLING_UNSUPPORTED;
}

/**
 * Checks modifier capability at compile/install time. The optional target is
 * caller-owned and receives unsupported IDs without hot-path allocations.
 */
export function inspectAboutNarrativeAnchorSampling(modifiers, target = null) {
  let unsupportedCount = 0;
  const unsupported = target?.unsupported;
  if (unsupported) unsupported.length = 0;
  for (let index = 0; index < (modifiers?.length || 0); index += 1) {
    const modifier = modifiers[index];
    if (modifier?.enabled === false) continue;
    if (getAboutNarrativeAnchorSamplingCapability(modifier?.id)
      === ABOUT_NARRATIVE_ANCHOR_SAMPLING_UNSUPPORTED) {
      unsupportedCount += 1;
      if (unsupported) unsupported.push(modifier?.id || 'unknown');
    }
  }
  if (target) {
    target.capability = unsupportedCount === 0
      ? ABOUT_NARRATIVE_ANCHOR_SAMPLING_EXACT
      : ABOUT_NARRATIVE_ANCHOR_SAMPLING_UNSUPPORTED;
    target.unsupportedCount = unsupportedCount;
    return target;
  }
  return unsupportedCount === 0
    ? ABOUT_NARRATIVE_ANCHOR_SAMPLING_EXACT
    : ABOUT_NARRATIVE_ANCHOR_SAMPLING_UNSUPPORTED;
}

/**
 * Writes the exact vertex-shader position, including the height ripple, into a
 * caller-owned { x, y, z } target. Colour, alpha, and point-size operations are
 * intentionally excluded.
 */
export function sampleAboutNarrativeAnchorPosition(input, target) {
  if (!target) throw new TypeError('A caller-owned target is required.');

  const fromPosition = input?.fromPosition;
  const toPosition = input?.toPosition || fromPosition;
  // Runtime frames now provide the fully composed visual progress. Keep the
  // previous raw-progress behavior for direct v5 sampler callers until their
  // persisted/test contract crosses the next schema boundary.
  const globalMorph = input?.morphProgressIsVisual === true
    ? normalizeAboutNarrativeWorldTransitionProgress(input?.morphProgress)
    : smoothstep01(input?.morphProgress);
  const yaw = numberOr(input?.bustYaw);
  const sine = Math.sin(yaw);
  const cosine = Math.cos(yaw);

  const rawFromX = coordinate(fromPosition, 0);
  const rawFromY = coordinate(fromPosition, 1);
  const rawFromZ = coordinate(fromPosition, 2);
  const rotatedFromX = (cosine * rawFromX) + (sine * rawFromZ);
  const rotatedFromZ = (-sine * rawFromX) + (cosine * rawFromZ);
  const fromBust = numberOr(input?.fromBust);
  const fromX = mix(rawFromX, rotatedFromX, fromBust);
  const fromY = rawFromY;
  const fromZ = mix(rawFromZ, rotatedFromZ, fromBust);

  const rawToX = coordinate(toPosition, 0);
  const rawToY = coordinate(toPosition, 1);
  const rawToZ = coordinate(toPosition, 2);
  const rotatedToX = (cosine * rawToX) + (sine * rawToZ);
  const rotatedToZ = (-sine * rawToX) + (cosine * rawToZ);
  const toBust = numberOr(input?.toBust);
  const bustHeight = Math.min(1, Math.max(0, (rawToY + 0.86) / 1.72));
  const bustAssembly = input?.bustAssembly || {};
  const surfaceRiseWeight = Math.min(1, Math.max(0, numberOr(bustAssembly.surfaceRiseWeight)));
  const bustFormationSoftness = Math.max(0.001, numberOr(bustAssembly.layerSoftness, 0.42));
  const bustBuildThreshold = mix(
    numberOr(bustAssembly.baseStart, 0.04),
    numberOr(bustAssembly.headStart, 0.62),
    bustHeight,
  );
  const bustBuildEnd = Math.min(1, Math.max(
    bustBuildThreshold + 0.001,
    bustBuildThreshold + bustFormationSoftness,
  ));
  const bustBuildProgress = smoothstep01(
    (globalMorph - bustBuildThreshold)
      / Math.max(0.001, bustBuildEnd - bustBuildThreshold),
  );
  const layeredMorph = mix(
    globalMorph,
    bustBuildProgress,
    toBust * (1 - fromBust) * numberOr(bustAssembly.weight, 1),
  );
  const morph = mix(layeredMorph, globalMorph, surfaceRiseWeight);
  const toX = mix(rawToX, rotatedToX, toBust);
  const toY = rawToY;
  const toZ = mix(rawToZ, rotatedToZ, toBust);

  const fromWorld = input?.fromWorldScratch;
  const toWorld = input?.toWorldScratch;
  if (!fromWorld || !toWorld) {
    throw new TypeError('Caller-owned fromWorldScratch and toWorldScratch targets are required.');
  }
  writeTransformedPoint(fromWorld, input?.fromTransform, fromX, fromY, fromZ);
  writeTransformedPoint(toWorld, input?.toTransform, toX, toY, toZ);

  const bustTransitionWeight = toBust
    * (1 - fromBust)
    * numberOr(bustAssembly.weight, 1);
  const platformProgress = smoothstep01(
    globalMorph / Math.max(0.001, numberOr(bustAssembly.platformSettle, 0.24)),
  ) * bustTransitionWeight * (1 - surfaceRiseWeight);
  const platformScale = numberOr(bustAssembly.platformScale, 0.95);
  const platformCenterX = numberOr(input?.gridRipple?.centerX);
  const platformCenterZ = numberOr(input?.gridRipple?.centerZ);
  fromWorld.x = mix(
    fromWorld.x,
    platformCenterX + ((toWorld.x - platformCenterX) * platformScale),
    platformProgress,
  );
  fromWorld.z = mix(
    fromWorld.z,
    platformCenterZ + ((toWorld.z - platformCenterZ) * platformScale),
    platformProgress,
  );

  const gatheredX = mix(fromWorld.x, toWorld.x, morph);
  const gatheredY = mix(fromWorld.y, toWorld.y, morph);
  const gatheredZ = mix(fromWorld.z, toWorld.z, morph);
  const riseProgress = smoothstep01((globalMorph - 0.02) / 0.96);
  const submergedY = toWorld.y
    - (Math.max(0, numberOr(bustAssembly.submergeDepth, 3.2)) * (1 - riseProgress));
  const surfaceHeight = numberOr(bustAssembly.surfaceHeight, -1.52);
  const waterlineSoftness = Math.max(0.001, numberOr(bustAssembly.waterlineSoftness, 0.22));
  const surfaceDeparture = riseProgress * smoothstep01(
    (submergedY - (surfaceHeight - (waterlineSoftness * 3)))
      / (waterlineSoftness * 1.85),
  );
  target.x = mix(gatheredX, mix(fromWorld.x, toWorld.x, surfaceDeparture), surfaceRiseWeight);
  target.y = mix(gatheredY, mix(fromWorld.y, submergedY, surfaceDeparture), surfaceRiseWeight);
  target.z = mix(gatheredZ, mix(fromWorld.z, toWorld.z, surfaceDeparture), surfaceRiseWeight);
  const pointSeed = numberOr(input?.pointSeed);
  const bustInfluence = mix(fromBust, toBust, morph);
  const bustFragmentHeight = numberOr(bustAssembly.fragmentHeight, 0.62);
  const bustFragmentFade = Math.max(0.001, numberOr(bustAssembly.fragmentFade, 0.38));
  const bustFragmentReveal = Math.min(0.99, numberOr(bustAssembly.fragmentReveal, 0.55));
  const bustFragmentBand = 1 - smoothstep01(
    (bustHeight - (bustFragmentHeight - bustFragmentFade)) / bustFragmentFade,
  );
  const bustFragmentProgress = smoothstep01(
    (morph - bustFragmentReveal) / Math.max(0.001, 1 - bustFragmentReveal),
  );
  const bustFragment = bustInfluence
    * bustFragmentBand
    * bustFragmentProgress
    * numberOr(bustAssembly.weight, 1);
  const bustFragmentSpread = numberOr(bustAssembly.fragmentSpread, 1);
  const bustFragmentFall = numberOr(bustAssembly.fragmentFall, 0.5);
  target.x += (fract((pointSeed * 91.17) + 0.13) - 0.5) * 1.25 * bustFragmentSpread * bustFragment;
  target.y -= fract((pointSeed * 57.41) + 0.37) * bustFragmentFall * bustFragment;
  target.z += (fract((pointSeed * 73.93) + 0.61) - 0.5) * 0.9 * bustFragmentSpread * bustFragment;

  const fromDrift = input?.fromDrift || {};
  const toDrift = input?.toDrift || {};
  const driftAmplitude = mix(numberOr(fromDrift.amplitude), numberOr(toDrift.amplitude), morph);
  const driftSpeed = mix(numberOr(fromDrift.speed), numberOr(toDrift.speed), morph);
  const driftIrregularity = mix(
    numberOr(fromDrift.irregularity),
    numberOr(toDrift.irregularity),
    morph,
  );
  const driftIndividuality = mix(
    numberOr(fromDrift.individuality),
    numberOr(toDrift.individuality),
    morph,
  );
  const driftAxisSpread = mix(
    numberOr(fromDrift.axisSpread),
    numberOr(toDrift.axisSpread),
    morph,
  );
  const driftStoryMix = mix(numberOr(fromDrift.storyMix), numberOr(toDrift.storyMix), morph);
  const driftClock = mix(numberOr(input?.ambientTime), numberOr(input?.storyTime), driftStoryMix);
  const phase = pointSeed * 127.31;
  const speedVariance = mix(
    1,
    0.58 + (fract((pointSeed * 43.17) + 0.19) * 0.88),
    driftIndividuality,
  );
  const driftTime = driftClock * driftSpeed * speedVariance;
  const irregularWeight = driftIrregularity * 0.58;
  const smoothX = Math.sin((driftTime * 1.07) + (phase * 1.31));
  const smoothY = Math.sin((driftTime * 0.83) + (phase * 1.73));
  const smoothZ = Math.cos((driftTime * 0.97) + (phase * 2.11));
  const erraticX = Math.sin((driftTime * 2.43) + (phase * 0.37));
  const erraticY = Math.cos((driftTime * 2.07) + (phase * 0.61));
  const erraticZ = Math.sin((driftTime * 2.81) + (phase * 0.83));
  target.x += mix(smoothX, erraticX, irregularWeight) * driftAxisSpread * driftAmplitude;
  target.y += mix(smoothY, erraticY, irregularWeight) * driftAmplitude;
  target.z += mix(smoothZ, erraticZ, irregularWeight) * driftAxisSpread * driftAmplitude;

  const fromWave = input?.fromWave || {};
  const toWave = input?.toWave || {};
  const waveWeight = mix(numberOr(fromWave.weight), numberOr(toWave.weight), morph);
  const waveAmplitude = mix(numberOr(fromWave.amplitude), numberOr(toWave.amplitude), morph);
  const waveSpeed = mix(numberOr(fromWave.speed), numberOr(toWave.speed), morph);
  const waveFrequencyX = mix(
    numberOr(fromWave.frequencyX, 1),
    numberOr(toWave.frequencyX, 1),
    morph,
  );
  const waveFrequencyZ = mix(
    numberOr(fromWave.frequencyZ, 1),
    numberOr(toWave.frequencyZ, 1),
    morph,
  );
  const waveStoryMix = mix(
    numberOr(fromWave.storyMix),
    numberOr(toWave.storyMix),
    morph,
  );
  const waveClock = mix(
    numberOr(input?.ambientTime),
    numberOr(input?.storyTime),
    waveStoryMix,
  );
  target.y += waveWeight * waveAmplitude * Math.sin(
    (target.x * waveFrequencyX)
    + (target.z * waveFrequencyZ)
    + (waveClock * waveSpeed),
  );

  const rippleClock = mix(
    numberOr(input?.ambientTime),
    numberOr(input?.storyTime),
    numberOr(input?.gridRipple?.storyMix),
  );
  const rippleFrequency = numberOr(input?.gridRipple?.frequency, 1);
  const ripplePhase = rippleClock * numberOr(input?.gridRipple?.speed) * 6.2831853;
  const ripplePointX = target.x - numberOr(input?.gridRipple?.centerX);
  const ripplePointZ = target.z - numberOr(input?.gridRipple?.centerZ);
  const rippleDistance = Math.hypot(ripplePointX, ripplePointZ);
  const rippleAngle = Math.atan2(ripplePointZ, ripplePointX);
  const phaseVariation = Math.sin((rippleAngle * 3) + (ripplePhase * 0.18)) * 0.24;
  const radialRipple = Math.sin(
    (rippleDistance * rippleFrequency) - ripplePhase + phaseVariation,
  );
  const harmonicRipple = Math.sin(
    (rippleDistance * rippleFrequency * 0.52) - (ripplePhase * 0.72),
  );
  const undertowRipple = Math.cos(
    (rippleDistance * rippleFrequency * 1.72)
      - (ripplePhase * 0.46)
      + (rippleAngle * 0.5),
  );
  const centerPulse = Math.cos(
    (ripplePhase * 0.82) - (rippleDistance * rippleFrequency * 0.35),
  ) * Math.exp(-rippleDistance * 0.38);
  const rippleFalloff = 1 / (1 + (rippleDistance * 0.08));
  const ripple = (
    (radialRipple * 0.58)
      + (harmonicRipple * 0.22)
      + (undertowRipple * 0.12)
      + (centerPulse * 0.26)
  )
    * rippleFalloff;
  const surfaceRippleMix = 1 - (toBust * smoothstep01((globalMorph - 0.08) / 0.84));
  const rippleStrength = numberOr(input?.gridRipple?.weight)
    * numberOr(input?.gridRipple?.amplitude)
    * surfaceRippleMix;
  target.y += rippleStrength * ripple;
  if (rippleDistance > 0.0001) {
    const radialDisplacement = rippleStrength * radialRipple * rippleFalloff * 0.18;
    target.x += (ripplePointX / rippleDistance) * radialDisplacement;
    target.z += (ripplePointZ / rippleDistance) * radialDisplacement;
  }

  return target;
}
