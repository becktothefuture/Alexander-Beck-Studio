import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  createAboutNarrativeColourMatchedDisciplineGroups,
  createAboutNarrativeSeeds,
  generateAboutNarrativeShape,
} from './aboutNarrativePointShapes.js';
import {
  resolveAboutNarrativeSwarmMotion,
} from './aboutNarrativeDefinitions.js';
import { createAboutNarrativeBufferLru } from './aboutNarrativeBufferLru.js';
import {
  ABOUT_NARRATIVE_BUST_STATES,
  createAboutNarrativeBustController,
} from './aboutNarrativeBustController.js';
import { createAboutNarrativePreparationController } from './aboutNarrativePreparationController.js';
import {
  ABOUT_NARRATIVE_CACHE_LIMITS,
  ABOUT_NARRATIVE_POINT_PROFILES,
} from './aboutNarrativeRuntimeConstants.js';
import {
  classifyAboutNarrativeLayoutProfile,
  resolveAboutNarrativePointProfile,
} from './aboutNarrativeProfileResolver.js';
import { createAboutNarrativeRuntimeDiagnostics } from './aboutNarrativeRuntimeDiagnostics.js';
import { getAboutNarrativeSharedRevealProgress } from './aboutNarrativeReveal.js';
import {
  ABOUT_NARRATIVE_WORKER_PROTOCOL_VERSION,
} from './aboutNarrativeWorkerProtocol.js';
import { validateAboutNarrativeWorkerPublication } from './aboutNarrativeWorkerPublicationValidator.js';
import {
  ABOUT_NARRATIVE_ANCHOR_SAMPLING_EXACT,
  inspectAboutNarrativeAnchorSampling,
  sampleAboutNarrativeAnchorPosition,
} from './aboutNarrativeModifierSampling.js';
import {
  isAboutNarrativeShortLandscape,
  resolveAboutNarrativeMotionTimeMix,
} from './aboutNarrativeMotionMath.js';
import {
  findAboutNarrativeWorldById,
  getAboutNarrativeWorldId,
  getAboutNarrativeWorldPairId,
  requireAboutNarrativeWorldId,
  resolveAboutNarrativeWorldAnchorRailZ,
} from './aboutNarrativeWorldIdentity.js';
import { getGlobals } from '../../legacy/modules/core/state.js';
import {
  registerSimulationAtmosphereSource,
  tickSimulationAtmosphere,
} from '../../legacy/modules/rendering/atmosphere/simulation-atmosphere.js';
import { resolveMobileSimulationBodyScale } from '../../lib/mobileSimulationSizing.js';
import { easeSimulationVisualProgress } from '../../lib/simulationVisualTransition.js';
import { ROUTE_ENTRANCE_START_EVENT } from '../../lib/motion/route-entrance-events.js';
import {
  resolveSimulationColorDistribution,
} from '../../palette/simulationPaletteContract.js';
import {
  getSimulationPaletteSnapshot,
  subscribeSimulationPalette,
} from '../../palette/simulationPaletteController.js';
import { createAboutNarrativeRuntimeResources } from 'virtual:about-narrative-resource-tools';
import { createAboutNarrativeRuntimeObserver } from 'virtual:about-narrative-runtime-observer';

const MATERIAL_SLOT_COUNT = 6;
const RUNTIME_DIAGNOSTICS_ENABLED = import.meta.env.DEV || __CERTIFY__;
let nextRuntimeInstanceId = 1;
let nextGeometryInstanceId = 1;
const DEFAULT_BUST_ASSEMBLY = Object.freeze({
  formationMode: 'gather',
  baseStart: 0.04,
  headStart: 0.62,
  layerSoftness: 0.42,
  platformScale: 0.95,
  platformSettle: 0.24,
  surfaceHeight: -1.52,
  submergeDepth: 3.2,
  waterlineSoftness: 0.22,
  surfaceCarry: 0.14,
  fragmentHeight: 0.62,
  fragmentFade: 0.38,
  fragmentReveal: 0.55,
  fragmentSpread: 1,
  fragmentFall: 0.5,
  fragmentPresence: 0.42,
});
const DISCIPLINE_LABEL_SELECTORS = Object.freeze([
  '[data-discipline-group="1"]',
  '[data-discipline-group="2"]',
  '[data-discipline-group="3"]',
  '[data-discipline-group="4"]',
  '[data-discipline-group="5"]',
  '[data-discipline-group="6"]',
]);
const VERTEX_SHADER = `
  attribute vec3 targetPosition;
  attribute float pointSeed;
  attribute float fromPresence;
  attribute float toPresence;
  attribute float fromPointSize;
  attribute float toPointSize;
  attribute float fromGroup;
  attribute float toGroup;
  uniform mat4 fromTransform;
  uniform mat4 toTransform;
  uniform float morphProgress;
  uniform float storyTime;
  uniform float ambientTime;
  uniform float pointSize;
  uniform float fromPointSizeScale;
  uniform float toPointSizeScale;
  uniform float pixelRatio;
  uniform float simulationVisibility;
  uniform float sceneEntranceScale;
  uniform float distanceFogStartWU;
  uniform float distanceFogEndWU;
  uniform float fromDriftAmplitude;
  uniform float toDriftAmplitude;
  uniform float fromDriftSpeed;
  uniform float toDriftSpeed;
  uniform float fromDriftIrregularity;
  uniform float toDriftIrregularity;
  uniform float fromDriftIndividuality;
  uniform float toDriftIndividuality;
  uniform float fromDriftAxisSpread;
  uniform float toDriftAxisSpread;
  uniform float fromDriftStoryMix;
  uniform float toDriftStoryMix;
  uniform float fromWaveWeight;
  uniform float toWaveWeight;
  uniform float fromWaveAmplitude;
  uniform float toWaveAmplitude;
  uniform float fromWaveSpeed;
  uniform float toWaveSpeed;
  uniform float fromWaveStoryMix;
  uniform float toWaveStoryMix;
  uniform vec2 fromWaveFrequency;
  uniform vec2 toWaveFrequency;
  uniform float fromGroupStrength;
  uniform float toGroupStrength;
  uniform float fromDisciplineIsolation;
  uniform float toDisciplineIsolation;
  uniform float fromDisciplineBackgroundOpacity;
  uniform float toDisciplineBackgroundOpacity;
  uniform float fromOrbitalWeight;
  uniform float toOrbitalWeight;
  uniform float fromOrbitalSpeed;
  uniform float toOrbitalSpeed;
  uniform float fromOrbitalStoryMix;
  uniform float toOrbitalStoryMix;
  uniform float fromOrbitalRadius;
  uniform float toOrbitalRadius;
  uniform float disciplineFocus;
  uniform float gridInfluence;
  uniform float gridRippleWeight;
  uniform float gridRippleAmplitude;
  uniform float gridRippleSpeed;
  uniform float gridRippleFrequency;
  uniform float gridRippleStoryMix;
  uniform float gridRippleProgress;
  uniform vec2 gridRippleCenter;
  uniform vec3 disciplineRevealA;
  uniform vec3 disciplineRevealB;
  uniform float disciplineRevealActive;
  uniform float disciplineBackgroundWeight;
  uniform float disciplineBackgroundOpacity;
  uniform float disciplineReconnectOpacity;
  uniform float disciplinePointScale;
  uniform float fromLivingColour;
  uniform float toLivingColour;
  uniform float fromBust;
  uniform float toBust;
  uniform float bustYaw;
  uniform float bustAssemblyWeight;
  uniform float bustSurfaceRiseWeight;
  uniform float bustBuildBaseStart;
  uniform float bustBuildHeadStart;
  uniform float bustBuildSoftness;
  uniform float bustPlatformScale;
  uniform float bustPlatformSettle;
  uniform float bustSurfaceHeight;
  uniform float bustSubmergeDepth;
  uniform float bustWaterlineSoftness;
  uniform float bustSurfaceCarry;
  uniform float bustFragmentHeight;
  uniform float bustFragmentFade;
  uniform float bustFragmentReveal;
  uniform float bustFragmentSpread;
  uniform float bustFragmentFall;
  uniform float bustFragmentPresence;
  uniform vec3 materialColor1;
  uniform vec3 materialColor2;
  uniform vec3 materialColor3;
  uniform vec3 materialColor4;
  uniform vec3 materialColor5;
  uniform vec3 materialColor6;
  uniform vec3 disciplineBackgroundColor;
  uniform float materialThreshold1;
  uniform float materialThreshold2;
  uniform float materialThreshold3;
  uniform float materialThreshold4;
  uniform float materialThreshold5;
  varying float pointAlpha;
  varying vec3 pointTint;

  vec3 rotateY(vec3 value, float angle) {
    float sine = sin(angle);
    float cosine = cos(angle);
    return vec3(
      (cosine * value.x) + (sine * value.z),
      value.y,
      (-sine * value.x) + (cosine * value.z)
    );
  }

  vec3 rotateX(vec3 value, float angle) {
    float sine = sin(angle);
    float cosine = cos(angle);
    return vec3(
      value.x,
      (cosine * value.y) - (sine * value.z),
      (sine * value.y) + (cosine * value.z)
    );
  }

  vec3 orbitalCenter(float radius, float angle, float inclination) {
    return rotateX(vec3(cos(angle) * radius, 0.0, sin(angle) * radius), inclination);
  }

  vec3 applyOrbitalLife(
    vec3 value,
    float seed,
    float weight,
    float speed,
    float storyMix,
    float orbitRadius
  ) {
    float amount = clamp(weight, 0.0, 1.0);
    if (amount <= 0.0001) return value;
    float clock = mix(ambientTime, storyTime, clamp(storyMix, 0.0, 1.0));
    float orbitDelta = clock * speed * 6.2831853;
    // Membership uses a seed decorrelated from density, mirroring the CPU
    // generator so a sparse field still contains the core and every body.
    float orbitalSeed = fract((seed * 7.31) + 0.17);
    if (orbitalSeed < 0.30) {
      return mix(value, rotateY(value, orbitDelta * 0.16), amount);
    }

    float basePhase = 0.0;
    float inclination = 0.0;
    float radiusScale = 1.0;
    float speedScale = 1.0;
    if (orbitalSeed < 0.50) {
      basePhase = 0.166;
      inclination = 0.22;
      radiusScale = 0.45;
      speedScale = 1.0;
    } else if (orbitalSeed < 0.68) {
      basePhase = 3.364;
      inclination = -0.38;
      radiusScale = 0.68;
      speedScale = 0.78;
    } else if (orbitalSeed < 0.84) {
      basePhase = 0.414;
      inclination = 0.52;
      radiusScale = 0.85;
      speedScale = 0.61;
    } else {
      basePhase = 4.849;
      inclination = -0.28;
      speedScale = 0.48;
    }

    vec3 baseCenter = orbitalCenter(orbitRadius * radiusScale, basePhase, inclination);
    vec3 movingCenter = orbitalCenter(
      orbitRadius * radiusScale,
      basePhase + (orbitDelta * speedScale),
      inclination
    );
    vec3 localPoint = value - baseCenter;
    vec3 movingPoint = movingCenter
      + rotateY(localPoint, orbitDelta * (1.35 + speedScale));
    return mix(value, movingPoint, amount);
  }

  float disciplineRevealForGroup(float index) {
    if (index < 1.5) return disciplineRevealA.x;
    if (index < 2.5) return disciplineRevealA.y;
    if (index < 3.5) return disciplineRevealA.z;
    if (index < 4.5) return disciplineRevealB.x;
    if (index < 5.5) return disciplineRevealB.y;
    return disciplineRevealB.z;
  }

  vec3 materialColor(float seed) {
    if (seed < materialThreshold1) return materialColor1;
    if (seed < materialThreshold2) return materialColor2;
    if (seed < materialThreshold3) return materialColor3;
    if (seed < materialThreshold4) return materialColor4;
    if (seed < materialThreshold5) return materialColor5;
    return materialColor6;
  }

  void main() {
    float globalMorph = clamp(morphProgress, 0.0, 1.0);
    float bustHeight = clamp((targetPosition.y + 0.86) / 1.72, 0.0, 1.0);
    // Let the fragmented base gather and settle before the head resolves. The
    // wider band makes formation legible across the complete scroll interval
    // instead of allowing the low points to snap into place at its start.
    float bustFormationSoftness = max(0.001, bustBuildSoftness);
    float bustBuildThreshold = mix(bustBuildBaseStart, bustBuildHeadStart, bustHeight);
    float bustBuildEnd = min(
      1.0,
      max(bustBuildThreshold + 0.001, bustBuildThreshold + bustFormationSoftness)
    );
    float bustBuildProgress = smoothstep(
      bustBuildThreshold,
      bustBuildEnd,
      globalMorph
    );
    float layeredMorph = mix(
      globalMorph,
      bustBuildProgress,
      toBust * (1.0 - fromBust) * bustAssemblyWeight
    );
    float morph = mix(layeredMorph, globalMorph, bustSurfaceRiseWeight);
    vec3 fromPoint = applyOrbitalLife(
      position,
      pointSeed,
      fromOrbitalWeight,
      fromOrbitalSpeed,
      fromOrbitalStoryMix,
      fromOrbitalRadius
    );
    vec3 toPoint = applyOrbitalLife(
      targetPosition,
      pointSeed,
      toOrbitalWeight,
      toOrbitalSpeed,
      toOrbitalStoryMix,
      toOrbitalRadius
    );
    fromPoint = mix(fromPoint, rotateY(fromPoint, bustYaw), fromBust);
    toPoint = mix(toPoint, rotateY(toPoint, bustYaw), toBust);
    vec3 fromWorld = (fromTransform * vec4(fromPoint, 1.0)).xyz;
    vec3 toWorld = (toTransform * vec4(toPoint, 1.0)).xyz;
    float bustTransitionWeight = toBust * (1.0 - fromBust) * bustAssemblyWeight;
    float platformProgress = smoothstep(
      0.0,
      max(0.001, bustPlatformSettle),
      globalMorph
    ) * bustTransitionWeight * (1.0 - bustSurfaceRiseWeight);
    vec2 gatheredPlatform = gridRippleCenter
      + ((toWorld.xz - gridRippleCenter) * bustPlatformScale);
    fromWorld.xz = mix(fromWorld.xz, gatheredPlatform, platformProgress);
    vec3 gatheredWorldPoint = mix(fromWorld, toWorld, morph);
    float bustRiseProgress = smoothstep(0.02, 0.98, globalMorph);
    vec3 submergedBust = toWorld;
    submergedBust.y -= max(0.0, bustSubmergeDepth) * (1.0 - bustRiseProgress);
    float waterlineSoftness = max(0.001, bustWaterlineSoftness);
    float surfaceDeparture = smoothstep(
      bustSurfaceHeight - (waterlineSoftness * 3.0),
      bustSurfaceHeight - (waterlineSoftness * 1.15),
      submergedBust.y
    );
    float surfaceArrival = smoothstep(
      bustSurfaceHeight - (waterlineSoftness * 0.55),
      bustSurfaceHeight + waterlineSoftness,
      submergedBust.y
    );
    vec3 risingWorldPoint = mix(fromWorld, submergedBust, surfaceDeparture);
    vec3 worldPoint = mix(gatheredWorldPoint, risingWorldPoint, bustSurfaceRiseWeight);
    float surfaceTransit = max(0.0, surfaceDeparture - surfaceArrival)
      * bustSurfaceRiseWeight;
    float bustInfluence = mix(fromBust, toBust, morph);
    float bustFragmentBand = 1.0 - smoothstep(
      bustFragmentHeight - bustFragmentFade,
      bustFragmentHeight,
      bustHeight
    );
    float bustFragmentProgress = smoothstep(bustFragmentReveal, 1.0, morph);
    float bustFragment = bustInfluence
      * bustFragmentBand
      * bustFragmentProgress
      * bustAssemblyWeight;
    vec3 bustScatter = vec3(
      (fract((pointSeed * 91.17) + 0.13) - 0.5) * 1.25 * bustFragmentSpread,
      -fract((pointSeed * 57.41) + 0.37) * bustFragmentFall,
      (fract((pointSeed * 73.93) + 0.61) - 0.5) * 0.90 * bustFragmentSpread
    );
    worldPoint += bustScatter * bustFragment;

    float driftAmplitude = mix(fromDriftAmplitude, toDriftAmplitude, morph);
    float driftSpeed = mix(fromDriftSpeed, toDriftSpeed, morph);
    float driftIrregularity = mix(fromDriftIrregularity, toDriftIrregularity, morph);
    float driftIndividuality = mix(fromDriftIndividuality, toDriftIndividuality, morph);
    float driftAxisSpread = mix(fromDriftAxisSpread, toDriftAxisSpread, morph);
    float driftStoryMix = mix(fromDriftStoryMix, toDriftStoryMix, morph);
    float driftClock = mix(ambientTime, storyTime, driftStoryMix);
    float phase = pointSeed * 127.31;
    float speedVariance = mix(
      1.0,
      0.58 + (fract((pointSeed * 43.17) + 0.19) * 0.88),
      driftIndividuality
    );
    float driftTime = driftClock * driftSpeed * speedVariance;
    vec3 smoothDrift = vec3(
      sin((driftTime * 1.07) + (phase * 1.31)),
      sin((driftTime * 0.83) + (phase * 1.73)),
      cos((driftTime * 0.97) + (phase * 2.11))
    );
    vec3 erraticDrift = vec3(
      sin((driftTime * 2.43) + (phase * 0.37)),
      cos((driftTime * 2.07) + (phase * 0.61)),
      sin((driftTime * 2.81) + (phase * 0.83))
    );
    vec3 driftVector = mix(smoothDrift, erraticDrift, driftIrregularity * 0.58);
    driftVector.xz *= driftAxisSpread;
    worldPoint += driftVector * driftAmplitude;

    float waveWeight = mix(fromWaveWeight, toWaveWeight, morph);
    float waveAmplitude = mix(fromWaveAmplitude, toWaveAmplitude, morph);
    float waveSpeed = mix(fromWaveSpeed, toWaveSpeed, morph);
    float waveStoryMix = mix(fromWaveStoryMix, toWaveStoryMix, morph);
    vec2 waveFrequency = mix(fromWaveFrequency, toWaveFrequency, morph);
    float waveClock = mix(ambientTime, storyTime, clamp(waveStoryMix, 0.0, 1.0));
    worldPoint.y += waveWeight * waveAmplitude * sin(
      (worldPoint.x * waveFrequency.x)
      + (worldPoint.z * waveFrequency.y)
      + (waveClock * waveSpeed)
    );

    vec2 ripplePoint = worldPoint.xz - gridRippleCenter;
    float rippleDistance = length(ripplePoint);
    vec2 rippleDirection = rippleDistance > 0.0001
      ? ripplePoint / rippleDistance
      : vec2(0.0);
    float rippleClock = mix(
      ambientTime,
      storyTime,
      clamp(gridRippleStoryMix, 0.0, 1.0)
    );
    float ripplePhase = rippleClock * gridRippleSpeed * 6.2831853;
    float rippleAngle = atan(ripplePoint.y, ripplePoint.x);
    float phaseVariation = sin((rippleAngle * 3.0) + (ripplePhase * 0.18)) * 0.24;
    float radialRipple = sin(
      (rippleDistance * gridRippleFrequency) - ripplePhase + phaseVariation
    );
    float harmonicRipple = sin(
      (rippleDistance * gridRippleFrequency * 0.52) - (ripplePhase * 0.72)
    );
    float undertowRipple = cos(
      (rippleDistance * gridRippleFrequency * 1.72)
      - (ripplePhase * 0.46)
      + (rippleAngle * 0.5)
    );
    float centerPulse = cos(
      (ripplePhase * 0.82) - (rippleDistance * gridRippleFrequency * 0.35)
    ) * exp(-rippleDistance * 0.38);
    float rippleFalloff = 1.0 / (1.0 + (rippleDistance * 0.08));
    float perpetualRipple = (
      (radialRipple * 0.58)
      + (harmonicRipple * 0.22)
      + (undertowRipple * 0.12)
      + (centerPulse * 0.26)
    ) * rippleFalloff;
    // Hand the same particles continuously from the ripple into the bust. The
    // surface motion eases away across the full rise instead of stopping early.
    float surfaceRippleMix = 1.0 - (
      toBust * smoothstep(0.08, 0.92, globalMorph)
    );
    float gatheringWeight = gridRippleWeight * gridRippleAmplitude * surfaceRippleMix;
    worldPoint.y += gatheringWeight * perpetualRipple;
    worldPoint.xz += rippleDirection
      * gatheringWeight
      * radialRipple
      * rippleFalloff
      * 0.18;
    float gridRippleEmphasis = 1.0
      + (abs(perpetualRipple) * gridRippleWeight * surfaceRippleMix * 0.22);

    float group = mix(fromGroup, toGroup, morph);
    float groupStrength = mix(fromGroupStrength, toGroupStrength, morph);
    float groupExists = step(0.5, group);
    float disciplineIsolation = mix(fromDisciplineIsolation, toDisciplineIsolation, morph);
    float isolatedBackgroundOpacity = mix(
      fromDisciplineBackgroundOpacity,
      toDisciplineBackgroundOpacity,
      morph
    );
    float focusActive = step(0.5, disciplineFocus);
    float focusMatch = 1.0 - step(0.45, abs(group - disciplineFocus));
    float legacyGroupWeight = groupExists * step(0.001, groupStrength)
      * mix(1.0, mix(0.28, 1.0, focusMatch), focusActive);
    float revealedGroupWeight = groupExists * disciplineRevealForGroup(group);
    float groupWeight = mix(legacyGroupWeight, revealedGroupWeight, disciplineRevealActive);
    float disciplineMonochrome = disciplineIsolation * (1.0 - revealedGroupWeight);
    float colourWeight = mix(fromLivingColour, toLivingColour, morph);
    float livingBand = 0.5 + (0.5 * sin(
      (worldPoint.x * 0.72) + (worldPoint.z * 0.38) + (ambientTime * 0.18)
    ));
    float materialSeed = fract((pointSeed * 43.713) + 0.271);
    vec3 baseColor = materialColor(materialSeed);
    vec3 livingColor = materialColor(fract((materialSeed * 3.17) + 0.37));
    pointTint = mix(
      baseColor,
      livingColor,
      colourWeight * smoothstep(0.72, 0.98, livingBand) * 0.48
    );
    // During the camera pass every point is monochrome until its exact semantic
    // anchor enters the scroll-authored reveal. The selected anchor then regains
    // the material colour it already owned; no colour is reassigned at reveal time.
    pointTint = mix(pointTint, disciplineBackgroundColor, disciplineMonochrome);

    vec4 viewPoint = modelViewMatrix * vec4(worldPoint, 1.0);
    float enteringPoint = (1.0 - step(0.5, fromPresence)) * step(0.5, toPresence);
    float entryOrder = fract((pointSeed * 53.37) + 0.11);
    float entryStart = entryOrder * 0.58;
    float entryProgress = smoothstep(entryStart, entryStart + 0.32, globalMorph);
    gl_Position = projectionMatrix * viewPoint;
    // Incoming density grows behind established material at its final colour.
    // Size, rather than dim alpha, authors the reversible reveal so new points
    // never read as a dark foreground layer while scrolling in either direction.
    gl_Position.z += enteringPoint
      * (1.0 - entryProgress)
      * 0.06
      * gl_Position.w;
    float presence = mix(fromPresence, toPresence, morph);
    presence = mix(
      presence,
      toPresence * step(0.001, entryProgress),
      enteringPoint
    );
    presence *= mix(1.0, clamp(bustSurfaceCarry, 0.0, 1.0), surfaceTransit);
    float bustFragmentKeep = step(
      fract((pointSeed * 131.71) + 0.27),
      mix(
        bustFragmentPresence,
        1.0,
        smoothstep(
          max(0.0, bustFragmentHeight - bustFragmentFade - 0.12),
          bustFragmentHeight,
          bustHeight
        )
      )
    );
    presence *= mix(1.0, bustFragmentKeep, bustFragment);
    float reconnect = clamp(gridInfluence, 0.0, 1.0);
    float textBackgroundWeight = disciplineBackgroundWeight * (1.0 - disciplineIsolation);
    float backgroundVisibility = mix(
      1.0,
      mix(disciplineBackgroundOpacity, disciplineReconnectOpacity, reconnect),
      textBackgroundWeight
    );
    float revealVisibility = mix(backgroundVisibility, 1.0, revealedGroupWeight);
    presence *= mix(1.0, revealVisibility, disciplineRevealActive);
    presence *= mix(1.0, isolatedBackgroundOpacity, disciplineMonochrome);
    float cameraDepth = max(0.0, -viewPoint.z);
    float distanceFog = smoothstep(
      distanceFogStartWU,
      max(distanceFogStartWU + 0.001, distanceFogEndWU),
      cameraDepth
    );
    presence *= 1.0 - distanceFog;
    presence *= clamp(simulationVisibility, 0.0, 1.0);
    float sizeWeight = mix(fromPointSize, toPointSize, morph);
    float groupScale = mix(groupStrength, max(0.0, disciplinePointScale - 1.0), disciplineRevealActive);
    float emphasis = 1.0 + (groupWeight * groupScale) + (waveWeight * 0.18);
    float perspectiveScale = clamp(5.5 / max(1.0, -viewPoint.z), 0.68, 2.2);
    float worldPointSizeScale = mix(fromPointSizeScale, toPointSizeScale, morph);
    float cssPointSize = pointSize
      * worldPointSizeScale
      * sizeWeight
      * emphasis
      * gridRippleEmphasis
      * perspectiveScale;
    float entranceScale = clamp(sceneEntranceScale, 0.0, 1.0);
    gl_PointSize = max(0.01, clamp(cssPointSize, 5.25, 18.0) * entranceScale) * pixelRatio;
    gl_PointSize *= mix(1.0, max(0.01, entryProgress), enteringPoint);
    pointAlpha = presence * entranceScale;
  }
`;

const FRAGMENT_SHADER = `
  uniform float fieldOpacity;
  varying float pointAlpha;
  varying vec3 pointTint;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float radius = length(center);
    if (radius > 0.5 || pointAlpha <= 0.001 || fieldOpacity <= 0.001) discard;
    float edge = 1.0 - smoothstep(0.44, 0.5, radius);
    gl_FragColor = vec4(pointTint, fieldOpacity * pointAlpha * edge);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function modifier(world, id) {
  return world?.modifiers?.find((item) => item.id === id && item.enabled !== false)?.parameters || null;
}

function optionalModifier(world, id) {
  const entry = world?.modifiers?.find((item) => item.id === id);
  if (!entry) return null;
  return entry.enabled === false ? false : entry.parameters;
}

function readColorToken(styles, token, fallback) {
  return styles.getPropertyValue(token).trim() || fallback;
}

function getMaterialDistribution(snapshot = getSimulationPaletteSnapshot()) {
  return resolveSimulationColorDistribution(snapshot.distribution)
    .slice(0, MATERIAL_SLOT_COUNT);
}

function syncMaterialPalette(uniforms, styles, snapshot = getSimulationPaletteSnapshot()) {
  const distribution = getMaterialDistribution(snapshot);
  const palette = snapshot.colors;
  const weights = distribution.map((row) => Number(row.weight));
  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  let cumulative = 0;
  distribution.forEach((row, index) => {
    const colorIndex = Math.max(0, Math.min(7, Math.floor(Number(row.colorIndex) || 0)));
    const color = palette[colorIndex] || palette[0] || '#ffffff';
    uniforms[`materialColor${index + 1}`].value.setStyle(color);
    cumulative += weights[index] / total;
    if (index < MATERIAL_SLOT_COUNT - 1) {
      uniforms[`materialThreshold${index + 1}`].value = cumulative;
    }
  });
  uniforms.disciplineBackgroundColor.value.setStyle(
    readColorToken(styles, '--text-muted', '#8b8f92'),
  );
}

function createEmptyAttribute(count, value = 0) {
  return new Float32Array(count).fill(value);
}

function shapeCacheKey(world, quality) {
  return JSON.stringify([
    world?.shapeId,
    world?.seed,
    quality,
    world?.shapeParameters || {},
  ]);
}

function writeWorldTransform(target, world, globals, compact, shortLandscape, scratch) {
  if (!world) return target.identity();
  const transform = world.transform || {};
  const position = transform.position || [0, 0, 0];
  const rotation = transform.rotation || [0, 0, 0];
  const baseScale = Number(transform.scale ?? 1);
  const responsiveScale = shortLandscape && Number.isFinite(transform.mobileLandscapeScale)
    ? Number(transform.mobileLandscapeScale)
    : transform.mobileScale;
  const scale = compact && Number.isFinite(responsiveScale)
    ? Number(responsiveScale)
    : baseScale;
  const responsiveXScale = shortLandscape && Number.isFinite(transform.mobileLandscapeXScale)
    ? Number(transform.mobileLandscapeXScale)
    : transform.mobileXScale;
  const xScale = compact && Number.isFinite(responsiveXScale)
    ? Number(responsiveXScale)
    : scale;
  const anchorRailZ = resolveAboutNarrativeWorldAnchorRailZ(world, globals);
  scratch.position.set(
    position[0] + (shortLandscape ? Number(transform.mobileLandscapeXOffset || 0) : 0),
    position[1] + (compact ? Number(transform.mobileYOffset || 0) : 0)
      + (shortLandscape ? Number(transform.mobileLandscapeYOffset || 0) : 0),
    anchorRailZ - Number(world.entryDistanceWU || 0) + position[2]
      + (compact ? Number(transform.mobileZOffset || 0) : 0)
      + (shortLandscape ? Number(transform.mobileLandscapeZOffset || 0) : 0),
  );
  scratch.euler.set(
    rotation[0],
    rotation[1],
    rotation[2],
    'YXZ',
  );
  scratch.quaternion.setFromEuler(scratch.euler);
  scratch.scale.set(xScale, scale, scale);
  return target.compose(scratch.position, scratch.quaternion, scratch.scale);
}

function createTransformScratch() {
  return {
    position: new THREE.Vector3(),
    quaternion: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    euler: new THREE.Euler(0, 0, 0, 'YXZ'),
  };
}

function captureDisciplinePositions(output, target, indices = null, groups = null) {
  target.fill(Number.NaN);
  indices?.fill(-1);
  const disciplineGroups = groups || output.attributes?.disciplineGroup;
  if (!disciplineGroups) return;
  for (let index = 0; index < disciplineGroups.length; index += 1) {
    const group = Math.round(disciplineGroups[index]);
    if (group < 1 || group > 6) continue;
    const sourceOffset = index * 3;
    const targetOffset = (group - 1) * 3;
    target[targetOffset] = output.positions[sourceOffset];
    target[targetOffset + 1] = output.positions[sourceOffset + 1];
    target[targetOffset + 2] = output.positions[sourceOffset + 2];
    if (indices) indices[group - 1] = index;
  }
}

function hasAllDisciplineAnchors(indices) {
  for (let index = 0; index < indices.length; index += 1) {
    if (indices[index] < 0) return false;
  }
  return true;
}

function createCameraFocusAnchor() {
  const radius = 0.28;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    -radius, 0, 0, radius, 0, 0,
    0, -radius, 0, 0, radius, 0,
    0, 0, -radius, 0, 0, radius,
  ]), 3));
  const material = new THREE.LineBasicMaterial({
    color: 0xff0000,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    opacity: 1,
  });
  const object = new THREE.LineSegments(geometry, material);
  object.name = 'about-narrative-camera-focus-anchor';
  object.frustumCulled = false;
  object.renderOrder = 1000;
  return { geometry, material, object };
}

function createPointFieldAdapter({
  canvas,
  root,
  interaction,
  disciplineOverlayRef,
  runtimeRef,
  pointProfile: explicitPointProfile,
  showCameraFocusAnchor = false,
}) {
  const runtimeInstanceId = nextRuntimeInstanceId;
  nextRuntimeInstanceId += 1;
  const initialBounds = root.getBoundingClientRect();
  const layoutProfile = classifyAboutNarrativeLayoutProfile({
    inlineSize: initialBounds.width || window.innerWidth,
    blockSize: initialBounds.height || window.innerHeight,
  });
  const quality = explicitPointProfile || resolveAboutNarrativePointProfile(layoutProfile);
  const compact = quality === 'mobile';
  const responsiveLayoutProfile = compact ? 'mobile' : layoutProfile;
  let shortLandscape = isAboutNarrativeShortLandscape({
    layoutProfile: responsiveLayoutProfile,
    width: initialBounds.width,
    height: initialBounds.height,
  });
  const getResponsiveSequenceKey = (sequenceKey) => {
    const variant = compact
      ? (shortLandscape ? 'mobile-short-landscape' : 'mobile-default')
      : 'standard';
    return `${sequenceKey}:responsive:${variant}`;
  };
  const mobileBodyScale = resolveMobileSimulationBodyScale(
    getGlobals().mobileSimulationBodyScale,
    {
      width: initialBounds.width || window.innerWidth,
      height: initialBounds.height || window.innerHeight,
      isMobileDevice: layoutProfile === 'mobile' ? true : undefined,
    },
  );
  root.dataset.mobileSimulationBodyScale = mobileBodyScale.toFixed(2);
  const pointProfile = ABOUT_NARRATIVE_POINT_PROFILES[quality];
  if (!pointProfile) throw new RangeError(`Unknown About Narrative point profile: ${quality}.`);
  const pointCount = pointProfile.pointCount;
  const entranceAlreadyComplete = root.dataset.aboutEntranceState === 'complete';
  const diagnostics = createAboutNarrativeRuntimeDiagnostics({
    initial: { state: 'idle', generation: 0, attemptCount: 0 },
  });
  const rendererAttributes = {
    alpha: true,
    antialias: false,
    powerPreference: 'high-performance',
  };
  const runtimeResources = createAboutNarrativeRuntimeResources({ canvas, rendererAttributes });
  const {
    context: instrumentedContext,
    resourceLedger,
    webglTracker,
  } = runtimeResources;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    ...rendererAttributes,
    ...(instrumentedContext ? { context: instrumentedContext } : {}),
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1, 0.08, 80);
  const cameraFocusAnchor = showCameraFocusAnchor ? createCameraFocusAnchor() : null;
  if (cameraFocusAnchor) scene.add(cameraFocusAnchor.object);
  const geometry = new THREE.BufferGeometry();
  const geometryInstanceId = nextGeometryInstanceId;
  nextGeometryInstanceId += 1;
  const seeds = createAboutNarrativeSeeds(pointCount, 0x1e35a7bd);
  const emptyPositions = new Float32Array(pointCount * 3);
  const emptyPresence = createEmptyAttribute(pointCount, 1);
  const emptySize = createEmptyAttribute(pointCount, 1);
  const emptyGroup = createEmptyAttribute(pointCount);
  const uniforms = {
    fromTransform: { value: new THREE.Matrix4() },
    toTransform: { value: new THREE.Matrix4() },
    morphProgress: { value: 0 },
    storyTime: { value: 0 },
    ambientTime: { value: 0 },
    pointSize: { value: 5.4 },
    fromPointSizeScale: { value: 1 },
    toPointSizeScale: { value: 1 },
    pixelRatio: { value: 1 },
    simulationVisibility: { value: 1 },
    sceneEntranceScale: { value: entranceAlreadyComplete ? 1 : 0 },
    distanceFogStartWU: { value: 8 },
    distanceFogEndWU: { value: 18 },
    fromDriftAmplitude: { value: 0 },
    toDriftAmplitude: { value: 0 },
    fromDriftSpeed: { value: 0 },
    toDriftSpeed: { value: 0 },
    fromDriftIrregularity: { value: 0 },
    toDriftIrregularity: { value: 0 },
    fromDriftIndividuality: { value: 0 },
    toDriftIndividuality: { value: 0 },
    fromDriftAxisSpread: { value: 0 },
    toDriftAxisSpread: { value: 0 },
    fromDriftStoryMix: { value: 0 },
    toDriftStoryMix: { value: 0 },
    fromWaveWeight: { value: 0 },
    toWaveWeight: { value: 0 },
    fromWaveAmplitude: { value: 0 },
    toWaveAmplitude: { value: 0 },
    fromWaveSpeed: { value: 0 },
    toWaveSpeed: { value: 0 },
    fromWaveStoryMix: { value: 0 },
    toWaveStoryMix: { value: 0 },
    fromWaveFrequency: { value: new THREE.Vector2(1, 1) },
    toWaveFrequency: { value: new THREE.Vector2(1, 1) },
    fromGroupStrength: { value: 0 },
    toGroupStrength: { value: 0 },
    fromDisciplineIsolation: { value: 0 },
    toDisciplineIsolation: { value: 0 },
    fromDisciplineBackgroundOpacity: { value: 1 },
    toDisciplineBackgroundOpacity: { value: 1 },
    fromOrbitalWeight: { value: 0 },
    toOrbitalWeight: { value: 0 },
    fromOrbitalSpeed: { value: 0 },
    toOrbitalSpeed: { value: 0 },
    fromOrbitalStoryMix: { value: 1 },
    toOrbitalStoryMix: { value: 1 },
    fromOrbitalRadius: { value: 5.8 },
    toOrbitalRadius: { value: 5.8 },
    disciplineFocus: { value: 0 },
    gridInfluence: { value: 0 },
    gridRippleWeight: { value: 0 },
    gridRippleAmplitude: { value: 0 },
    gridRippleSpeed: { value: 0 },
    gridRippleFrequency: { value: 1 },
    gridRippleStoryMix: { value: 0 },
    gridRippleProgress: { value: 0 },
    gridRippleCenter: { value: new THREE.Vector2() },
    disciplineRevealA: { value: new THREE.Vector3() },
    disciplineRevealB: { value: new THREE.Vector3() },
    disciplineRevealActive: { value: 0 },
    disciplineBackgroundWeight: { value: 0 },
    disciplineBackgroundOpacity: { value: 0.06 },
    disciplineReconnectOpacity: { value: 0.24 },
    disciplinePointScale: { value: 3.6 },
    fromLivingColour: { value: 0 },
    toLivingColour: { value: 0 },
    fromBust: { value: 0 },
    toBust: { value: 0 },
    bustYaw: { value: 0 },
    bustAssemblyWeight: { value: 1 },
    bustSurfaceRiseWeight: { value: 0 },
    bustBuildBaseStart: { value: 0.04 },
    bustBuildHeadStart: { value: 0.62 },
    bustBuildSoftness: { value: 0.42 },
    bustPlatformScale: { value: 0.95 },
    bustPlatformSettle: { value: 0.24 },
    bustSurfaceHeight: { value: -1.52 },
    bustSubmergeDepth: { value: 3.2 },
    bustWaterlineSoftness: { value: 0.22 },
    bustSurfaceCarry: { value: 0.14 },
    bustFragmentHeight: { value: 0.62 },
    bustFragmentFade: { value: 0.38 },
    bustFragmentReveal: { value: 0.55 },
    bustFragmentSpread: { value: 1 },
    bustFragmentFall: { value: 0.5 },
    bustFragmentPresence: { value: 0.42 },
    materialColor1: { value: new THREE.Color() },
    materialColor2: { value: new THREE.Color() },
    materialColor3: { value: new THREE.Color() },
    materialColor4: { value: new THREE.Color() },
    materialColor5: { value: new THREE.Color() },
    materialColor6: { value: new THREE.Color() },
    disciplineBackgroundColor: { value: new THREE.Color('#8b8f92') },
    materialThreshold1: { value: 0.31 },
    materialThreshold2: { value: 0.44 },
    materialThreshold3: { value: 0.60 },
    materialThreshold4: { value: 0.80 },
    materialThreshold5: { value: 0.90 },
    fieldOpacity: { value: 0.96 },
  };
  const modifierUniformTargets = Object.freeze({
    from: Object.freeze({
      driftAmplitude: uniforms.fromDriftAmplitude,
      driftSpeed: uniforms.fromDriftSpeed,
      driftIrregularity: uniforms.fromDriftIrregularity,
      driftIndividuality: uniforms.fromDriftIndividuality,
      driftAxisSpread: uniforms.fromDriftAxisSpread,
      driftStoryMix: uniforms.fromDriftStoryMix,
      waveWeight: uniforms.fromWaveWeight,
      waveAmplitude: uniforms.fromWaveAmplitude,
      waveSpeed: uniforms.fromWaveSpeed,
      waveStoryMix: uniforms.fromWaveStoryMix,
      waveFrequency: uniforms.fromWaveFrequency,
      groupStrength: uniforms.fromGroupStrength,
      disciplineIsolation: uniforms.fromDisciplineIsolation,
      disciplineBackgroundOpacity: uniforms.fromDisciplineBackgroundOpacity,
      orbitalWeight: uniforms.fromOrbitalWeight,
      orbitalSpeed: uniforms.fromOrbitalSpeed,
      orbitalStoryMix: uniforms.fromOrbitalStoryMix,
      orbitalRadius: uniforms.fromOrbitalRadius,
      livingColour: uniforms.fromLivingColour,
    }),
    to: Object.freeze({
      driftAmplitude: uniforms.toDriftAmplitude,
      driftSpeed: uniforms.toDriftSpeed,
      driftIrregularity: uniforms.toDriftIrregularity,
      driftIndividuality: uniforms.toDriftIndividuality,
      driftAxisSpread: uniforms.toDriftAxisSpread,
      driftStoryMix: uniforms.toDriftStoryMix,
      waveWeight: uniforms.toWaveWeight,
      waveAmplitude: uniforms.toWaveAmplitude,
      waveSpeed: uniforms.toWaveSpeed,
      waveStoryMix: uniforms.toWaveStoryMix,
      waveFrequency: uniforms.toWaveFrequency,
      groupStrength: uniforms.toGroupStrength,
      disciplineIsolation: uniforms.toDisciplineIsolation,
      disciplineBackgroundOpacity: uniforms.toDisciplineBackgroundOpacity,
      orbitalWeight: uniforms.toOrbitalWeight,
      orbitalSpeed: uniforms.toOrbitalSpeed,
      orbitalStoryMix: uniforms.toOrbitalStoryMix,
      orbitalRadius: uniforms.toOrbitalRadius,
      livingColour: uniforms.toLivingColour,
    }),
  });
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthWrite: true,
    blending: THREE.NormalBlending,
  });
  const fixedAttributes = Object.freeze({
    position: new THREE.BufferAttribute(emptyPositions, 3).setUsage(THREE.DynamicDrawUsage),
    targetPosition: new THREE.BufferAttribute(emptyPositions.slice(), 3).setUsage(THREE.DynamicDrawUsage),
    pointSeed: new THREE.BufferAttribute(seeds, 1),
    fromPresence: new THREE.BufferAttribute(emptyPresence, 1).setUsage(THREE.DynamicDrawUsage),
    toPresence: new THREE.BufferAttribute(emptyPresence.slice(), 1).setUsage(THREE.DynamicDrawUsage),
    fromPointSize: new THREE.BufferAttribute(emptySize, 1).setUsage(THREE.DynamicDrawUsage),
    toPointSize: new THREE.BufferAttribute(emptySize.slice(), 1).setUsage(THREE.DynamicDrawUsage),
    fromGroup: new THREE.BufferAttribute(emptyGroup.slice(), 1).setUsage(THREE.DynamicDrawUsage),
    toGroup: new THREE.BufferAttribute(emptyGroup.slice(), 1).setUsage(THREE.DynamicDrawUsage),
  });
  Object.entries(fixedAttributes).forEach(([name, attribute]) => geometry.setAttribute(name, attribute));
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);

  resourceLedger?.retain('fixed-attributes', fixedAttributes);
  if (resourceLedger) diagnostics.recordLifecycle('resource-ledger-ready');
  const recordCacheEvent = () => {};
  const shapeCache = createAboutNarrativeBufferLru({
    name: 'about-shapes',
    ...ABOUT_NARRATIVE_CACHE_LIMITS.shape,
    onEvent: recordCacheEvent,
  });
  const sequenceCache = createAboutNarrativeBufferLru({
    name: 'about-sequences',
    ...ABOUT_NARRATIVE_CACHE_LIMITS.sequence,
    onEvent: recordCacheEvent,
  });
  const runtimeObserver = createAboutNarrativeRuntimeObserver({
    root,
    diagnostics,
    renderer,
    scene,
    camera,
    geometry,
    fixedAttributes,
    pointCount,
    shapeCache,
    sequenceCache,
    resourceLedger,
    webglTracker,
  });
  let installedPair = null;
  let readySequence = null;
  let activePreparation = null;
  let lastPreparationRequest = null;
  let bootstrapController = null;
  let bootstrapRequestId = 0;
  let correspondenceWorker = null;
  let sequenceState = 'idle';
  let disposed = false;
  let contextAvailable = true;
  let sceneReady = false;
  // The editor can change point quality after the direct route entrance has
  // started, which recreates this adapter. Keep the one-shot entrance request
  // on the route root so the replacement renderer does not return to scale 0.
  let entranceRequested = entranceAlreadyComplete
    || root.dataset.aboutEntranceRequested === 'true';
  let entranceStartedAt = -1;
  let entranceComplete = entranceAlreadyComplete;
  let width = 1;
  let height = 1;
  let viewportOffsetX = 0;
  let viewportOffsetY = 0;
  let latestFrame = null;
  const atmosphereEligible = Boolean(document.getElementById('simulation-atmosphere-glow-canvas'));
  let atmosphereSourceCleanup = null;
  let atmosphereSourceKind = '';
  const syncAtmosphereSource = () => {
    if (!atmosphereEligible || disposed) return;
    const visibility = Number(latestFrame?.simulation?.visibility ?? 0);
    const nextKind = contextAvailable && visibility > 0.001
      ? 'canvas'
      : 'ambient';
    if (nextKind === atmosphereSourceKind) return;
    atmosphereSourceCleanup?.();
    atmosphereSourceCleanup = null;
    atmosphereSourceKind = nextKind;
    const canvasSource = nextKind === 'canvas';
    atmosphereSourceCleanup = registerSimulationAtmosphereSource({
      id: canvasSource ? 'about:narrative-world' : 'about:ambient',
      routeId: 'about',
      kind: canvasSource ? 'canvas' : 'ambient',
      canvas: canvasSource ? canvas : null,
      scheduler: canvasSource ? 'renderer-coupled' : 'internal',
      opacityElement: canvasSource ? canvas : null,
    });
  };
  syncAtmosphereSource();
  root.dataset.aboutEntranceState = entranceComplete ? 'complete' : 'staged';
  delete root.dataset.aboutSceneReady;

  const completeSceneEntrance = () => {
    uniforms.sceneEntranceScale.value = 1;
    if (entranceComplete) return;
    entranceComplete = true;
    root.dataset.aboutEntranceState = 'complete';
  };

  const handleRouteEntranceStart = (event) => {
    const routeId = event?.detail?.routeId || '';
    if (routeId !== 'about' && routeId !== 'about-narrative-lab') return;
    entranceRequested = true;
    root.dataset.aboutEntranceRequested = 'true';
    if (sceneReady && latestFrame?.reducedMotion) completeSceneEntrance();
  };

  const updateSceneEntrance = (frame) => {
    if (entranceComplete) {
      uniforms.sceneEntranceScale.value = 1;
      return;
    }
    if (!entranceRequested || !sceneReady) {
      uniforms.sceneEntranceScale.value = 0;
      return;
    }
    if (frame.reducedMotion) {
      completeSceneEntrance();
      return;
    }
    const now = performance.now();
    if (entranceStartedAt < 0) {
      entranceStartedAt = now;
      root.dataset.aboutEntranceState = 'entering';
    }
    const progress = Math.min(1, Math.max(0, (now - entranceStartedAt) / 480));
    uniforms.sceneEntranceScale.value = easeSimulationVisualProgress(
      'cubic-bezier(0.22, 0, 0.16, 1)',
      progress,
      'in',
    );
    if (progress >= 1) completeSceneEntrance();
  };

  const markSceneReady = () => {
    if (sceneReady) return;
    sceneReady = true;
    root.dataset.aboutSceneReady = 'true';
    window.dispatchEvent(new CustomEvent('abs:about-scene-ready'));
  };
  const bustController = createAboutNarrativeBustController();
  const bustSampleInput = {
    active: false,
    transitionProgress: 0,
    deltaSeconds: 0,
    speed: 0,
    resumeDelay: 0,
    liveAmbient: false,
    deterministicScrub: true,
    reducedMotion: false,
    hidden: false,
  };
  let bustYaw = 0;
  let lastBustAmbientTime = 0;
  let dragging = false;
  let dragStart = null;
  const modifierSlotsCache = new WeakMap();
  const fromTransformScratch = createTransformScratch();
  const toTransformScratch = createTransformScratch();
  const correspondenceFromTransform = new THREE.Matrix4();
  const correspondenceToTransform = new THREE.Matrix4();
  const correspondenceFromScratch = createTransformScratch();
  const correspondenceToScratch = createTransformScratch();
  const disciplinePointScratch = new THREE.Vector3();
  const disciplineViewPointScratch = new THREE.Vector3();
  const disciplineWeights = new Float32Array(6);
  const fromDisciplinePositions = new Float32Array(18).fill(Number.NaN);
  const toDisciplinePositions = new Float32Array(18).fill(Number.NaN);
  const fromDisciplineIndices = new Int32Array(6).fill(-1);
  const toDisciplineIndices = new Int32Array(6).fill(-1);
  const anchorSampleTarget = { x: 0, y: 0, z: 0 };
  const anchorFromWorldScratch = { x: 0, y: 0, z: 0 };
  const anchorToWorldScratch = { x: 0, y: 0, z: 0 };
  const anchorFromPosition = { x: 0, y: 0, z: 0 };
  const anchorToPosition = { x: 0, y: 0, z: 0 };
  const anchorSampleInput = {
    fromPosition: anchorFromPosition,
    toPosition: anchorToPosition,
    fromTransform: null,
    toTransform: null,
    fromWorldScratch: anchorFromWorldScratch,
    toWorldScratch: anchorToWorldScratch,
    fromDrift: {},
    toDrift: {},
    fromWave: {},
    toWave: {},
    gridRipple: {},
    bustAssembly: {},
    morphProgressIsVisual: true,
  };
  const anchorCapability = { capability: ABOUT_NARRATIVE_ANCHOR_SAMPLING_EXACT, unsupportedCount: 0, unsupported: [] };
  const anchorCapabilityTarget = { capability: ABOUT_NARRATIVE_ANCHOR_SAMPLING_EXACT, unsupportedCount: 0, unsupported: [] };
  let anchorSamplingExact = true;
  let lastAnchorFromWorld = null;
  let lastAnchorToWorld = null;
  const disciplineLabels = new Array(6).fill(null);
  const disciplineLabelReveal = new Float64Array(6).fill(Number.NaN);
  const disciplineLabelX = new Float64Array(6).fill(Number.NaN);
  const disciplineLabelY = new Float64Array(6).fill(Number.NaN);
  const disciplineLabelPositionUnit = new Uint8Array(6);
  const disciplineLabelNudge = new Float64Array(6).fill(Number.NaN);
  const disciplineLabelWidth = new Float64Array(6);
  const disciplineProjectedX = new Float64Array(6).fill(Number.NaN);
  const disciplineProjectedY = new Float64Array(6).fill(Number.NaN);
  let cachedDisciplineOverlay = null;
  let cachedDisciplineChildCount = -1;
  let lastDisciplineVisibleCount = Number.NaN;
  let lastDisciplineLabelCount = Number.NaN;
  let lastGridBackground = Number.NaN;
  let lastSimulationVisibility = Number.NaN;
  let lastBustShaderYaw = Number.NaN;
  let lastGroupFocus = Number.NaN;
  let lastGridInfluence = Number.NaN;
  let lastInteractionEnabled = null;
  let lastWorldStage = '';
  let lastBustStyleYaw = Number.NaN;
  let lastDisciplineConfig = null;
  let lastDisciplineLayoutProfile = '';
  let resolvedDisciplineAnchors = null;

  const measureDisciplineLabels = () => {
    for (let index = 0; index < disciplineLabels.length; index += 1) {
      const label = disciplineLabels[index];
      disciplineLabelWidth[index] = label?.offsetWidth || 0;
    }
  };
  const disciplineLabelResizeObserver = new ResizeObserver(measureDisciplineLabels);
  const getModifierSlots = (world, globals) => {
    if (!world) return null;
    const cached = modifierSlotsCache.get(world);
    if (cached) return cached;
    const swarm = modifier(world, 'swarm-life-v1');
    runtimeObserver.hotFrameOwnedAllocation();
    const slots = {
      swarm: swarm ? resolveAboutNarrativeSwarmMotion(swarm, globals.swarmTurbulence) : null,
      drift: modifier(world, 'ambient-drift-v1'),
      wave: modifier(world, 'living-wave-v1'),
      group: modifier(world, 'group-emphasis-v1'),
      isolation: modifier(world, 'discipline-isolation-v1'),
      orbital: modifier(world, 'orbital-life-v1'),
      colour: modifier(world, 'living-colour-v1'),
      bust: modifier(world, 'bust-yaw-v1'),
      bustAssembly: optionalModifier(world, 'bust-assembly-v1'),
    };
    modifierSlotsCache.set(world, slots);
    return slots;
  };

  const syncDisciplineLabels = (overlay) => {
    const childCount = overlay?.childElementCount ?? -1;
    if (overlay === cachedDisciplineOverlay && childCount === cachedDisciplineChildCount) return;
    cachedDisciplineOverlay = overlay || null;
    cachedDisciplineChildCount = childCount;
    disciplineLabelResizeObserver.disconnect();
    runtimeObserver.hotFrameOwnedAllocation();
    for (let index = 0; index < disciplineLabels.length; index += 1) {
      disciplineLabels[index] = overlay?.querySelector(DISCIPLINE_LABEL_SELECTORS[index]) || null;
      if (overlay) runtimeObserver.hotFrameDomQuery();
      disciplineLabelReveal[index] = Number.NaN;
      disciplineLabelX[index] = Number.NaN;
      disciplineLabelY[index] = Number.NaN;
      disciplineLabelPositionUnit[index] = 0;
      disciplineLabelNudge[index] = Number.NaN;
      if (disciplineLabels[index]) disciplineLabelResizeObserver.observe(disciplineLabels[index]);
    }
    measureDisciplineLabels();
  };

  const writeDisciplineRevealStyles = (index, value) => {
    if (disciplineLabelReveal[index] === value) return;
    const label = disciplineLabels[index];
    disciplineLabelReveal[index] = value;
    if (!label) return;
    label.style.setProperty('--discipline-reveal', value.toFixed(4));
    runtimeObserver.hotFrameDomWrite();
  };

  const writeDisciplinePosition = (index, x, y, unit) => {
    if (
      disciplineLabelPositionUnit[index] === unit
      && disciplineLabelX[index] === x
      && disciplineLabelY[index] === y
    ) return;
    const label = disciplineLabels[index];
    disciplineLabelPositionUnit[index] = unit;
    disciplineLabelX[index] = x;
    disciplineLabelY[index] = y;
    if (!label) return;
    if (unit === 1) {
      label.style.setProperty('--discipline-x', `${x}px`);
      label.style.setProperty('--discipline-y', `${y}px`);
    } else {
      label.style.setProperty('--discipline-x', `${x}%`);
      label.style.setProperty('--discipline-y', `${y}%`);
    }
    runtimeObserver.hotFrameDomWrite(2);
  };

  const writeDisciplineNudge = (index, value) => {
    if (disciplineLabelNudge[index] === value) return;
    const label = disciplineLabels[index];
    disciplineLabelNudge[index] = value;
    if (!label) return;
    label.style.setProperty('--discipline-label-nudge', `${value}px`);
    runtimeObserver.hotFrameDomWrite();
  };

  const placeDisciplineLabels = (offset) => {
    // On a phone the travelling labels need the same composed reading column
    // as editorial copy, rather than hugging whichever edge their projected
    // point reaches first.
    const safeInset = layoutProfile === 'mobile' ? 48 : compact ? 12 : 16;
    for (let index = 0; index < disciplineLabels.length; index += 1) {
      if (!Number.isFinite(disciplineProjectedX[index])) continue;
      const labelWidth = disciplineLabelWidth[index];
      const localX = disciplineProjectedX[index] - viewportOffsetX;
      const proposedLeft = localX + offset;
      const proposedRight = localX + offset + labelWidth;
      const maximumNudge = Math.min(0, (width - safeInset) - proposedRight);
      const nudge = proposedLeft < safeInset
        ? safeInset - proposedLeft
        : maximumNudge;
      writeDisciplineNudge(index, Math.round(nudge * 100) / 100);
      writeDisciplinePosition(
        index,
        disciplineProjectedX[index],
        disciplineProjectedY[index],
        1,
      );
    }
  };

  const updateTheme = () => {
    const styles = getComputedStyle(root);
    const snapshot = getSimulationPaletteSnapshot();
    syncMaterialPalette(uniforms, styles, snapshot);
    root.dataset.simulationPaletteGeneration = String(snapshot.generation);
    root.dataset.simulationPaletteId = snapshot.paletteId;
  };

  const resize = () => {
    const canvasRect = canvas.getBoundingClientRect();
    width = Math.max(1, canvasRect.width);
    height = Math.max(1, canvasRect.height);
    const wasShortLandscape = shortLandscape;
    shortLandscape = isAboutNarrativeShortLandscape({
      layoutProfile: responsiveLayoutProfile,
      width,
      height,
    });
    viewportOffsetX = 0;
    viewportOffsetY = 0;
    const ratio = Math.min(window.devicePixelRatio || 1, pointProfile.maximumPixelRatio);
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    uniforms.pixelRatio.value = ratio;
    measureDisciplineLabels();
    if (wasShortLandscape !== shortLandscape && lastPreparationRequest) {
      preparePlan(lastPreparationRequest);
    }
  };

  const getShape = async (world, signal) => {
    const key = shapeCacheKey(world, quality);
    const cached = shapeCache.get(key);
    if (cached) return cached;
    const worldSeeds = createAboutNarrativeSeeds(pointCount, world.seed);
    const promise = generateAboutNarrativeShape({
      shapeId: world.shapeId,
      pointCount,
      seeds: worldSeeds,
      quality,
      parameters: world.shapeParameters,
      signal,
    });
    return shapeCache.trackPromise(key, promise, {
      owner: 'shape-cache',
      pinOwner: 'bootstrap-pending',
      dispose: (value) => resourceLedger?.release('shape-cache', value),
    }).then((output) => {
      if (!disposed) resourceLedger?.retain('shape-cache', output);
      return output;
    });
  };

  const assertInstallOutput = (output, label) => {
    const expectedPositionLength = pointCount * 3;
    const group = output?.attributes?.disciplineGroup;
    if (!(output?.positions instanceof Float32Array) || output.positions.length !== expectedPositionLength
      || !(output?.presence instanceof Float32Array) || output.presence.length !== pointCount
      || !(output?.size instanceof Float32Array) || output.size.length !== pointCount
      || (group && (!(group instanceof Float32Array) || group.length !== pointCount))) {
      throw new Error(`${label} has invalid fixed point buffers.`);
    }
    const arrays = [output.positions, output.presence, output.size, ...(group ? [group] : [])];
    arrays.forEach((array) => {
      for (let index = 0; index < array.length; index += 1) {
        if (!Number.isFinite(array[index])) throw new Error(`${label} contains a non-finite point value.`);
      }
    });
  };

  const refreshInstalledDisciplineGroups = (pair, anchors = resolvedDisciplineAnchors) => {
    const materialThresholds = [
      uniforms.materialThreshold1.value,
      uniforms.materialThreshold2.value,
      uniforms.materialThreshold3.value,
      uniforms.materialThreshold4.value,
      uniforms.materialThreshold5.value,
    ];
    const fromGroup = createAboutNarrativeColourMatchedDisciplineGroups({
      output: pair.fromOutput,
      pointSeeds: seeds,
      materialThresholds,
      anchors,
    }) || emptyGroup;
    const toGroup = createAboutNarrativeColourMatchedDisciplineGroups({
      output: pair.toOutput,
      pointSeeds: seeds,
      materialThresholds,
      anchors,
    }) || emptyGroup;
    fixedAttributes.fromGroup.array.set(fromGroup);
    fixedAttributes.toGroup.array.set(toGroup);
    fixedAttributes.fromGroup.needsUpdate = true;
    fixedAttributes.toGroup.needsUpdate = true;
    captureDisciplinePositions(
      pair.fromOutput,
      fromDisciplinePositions,
      fromDisciplineIndices,
      fromGroup,
    );
    captureDisciplinePositions(
      pair.toOutput,
      toDisciplinePositions,
      toDisciplineIndices,
      toGroup,
    );
  };

  const installPreparedPair = (pair) => {
    if (disposed || !pair || installedPair?.key === pair.key) return;
    const installStartedAt = performance.now();
    if (!pair.validated) {
      assertInstallOutput(pair.fromOutput, 'Source Shape');
      assertInstallOutput(pair.toOutput, 'Target Shape');
    }
    fixedAttributes.position.array.set(pair.fromOutput.positions);
    fixedAttributes.targetPosition.array.set(pair.toOutput.positions);
    fixedAttributes.fromPresence.array.set(pair.fromOutput.presence);
    fixedAttributes.toPresence.array.set(pair.toOutput.presence);
    fixedAttributes.fromPointSize.array.set(pair.fromOutput.size);
    fixedAttributes.toPointSize.array.set(pair.toOutput.size);
    refreshInstalledDisciplineGroups(pair);
    Object.entries(fixedAttributes).forEach(([name, attribute]) => {
      if (name !== 'pointSeed') attribute.needsUpdate = true;
    });
    resourceLedger?.releaseOwner('installed-pair');
    resourceLedger?.retain('installed-pair', [pair.fromOutput, pair.toOutput]);
    installedPair = { ...pair, progress: 0 };
    root.dataset.pointAsset = pair.toOutput.fallbackReason ? 'procedural-fallback' : pair.toWorld.shapeId;
    if (sequenceState !== 'loading') root.dataset.worldPrepare = 'ready';
    root.dataset.worldFrom = pair.fromWorld.shapeId;
    root.dataset.worldTo = pair.toWorld.shapeId;
    root.dataset.worldCorrespondence = pair.installedStrategy;
    root.dataset.worldCorrespondenceRequested = pair.requestedStrategy;
    root.dataset.worldCorrespondenceImprovement = Number(pair.metrics.improvement || 0).toFixed(4);
    root.dataset.worldCorrespondenceP95 = Number(pair.metrics.p95Distance || 0).toFixed(4);
    root.dataset.worldCorrespondenceMax = Number(pair.metrics.maxDistance || 0).toFixed(4);
    root.dataset.worldCorrespondenceFallback = pair.fallbackReason || '';
    root.dataset.worldCorrespondencePair = pair.key;
    runtimeObserver.pairInstalled(performance.now() - installStartedAt);
    diagnostics.recordLifecycle('pair-installed', {
      installedPairId: installedPair.key,
      installedWorldId: getAboutNarrativeWorldId(installedPair.toWorld),
      requestedStrategy: installedPair.requestedStrategy,
      installedStrategy: installedPair.installedStrategy,
      fallbackReason: installedPair.fallbackReason,
    });
  };

  const createPreparedSequence = (
    key,
    descriptor,
    sequence,
    outputs,
    workerPairs,
    timings,
    startedAt,
  ) => {
    const pairs = new Map();
    workerPairs.forEach((workerPair, index) => {
      const toOutput = outputs[index].output;
      const fromOutput = outputs[Math.max(0, index - 1)].output;
      const fromWorld = sequence[Math.max(0, index - 1)];
      const toWorld = sequence[index];
      const fromWorldId = requireAboutNarrativeWorldId(fromWorld, 'Prepared source World');
      const toWorldId = requireAboutNarrativeWorldId(toWorld, 'Prepared target World');
      const pairDescriptor = descriptor.pairs[index];
      if (pairDescriptor?.fromWorldId !== fromWorldId
        || pairDescriptor?.toWorldId !== toWorldId
        || !pairDescriptor.inputFingerprint) {
        throw new Error(`Prepared pair ${fromWorldId}->${toWorldId} has no exact descriptor fingerprint.`);
      }
      pairs.set(toWorldId, {
        key: `${key}:${toWorldId}`,
        inputFingerprint: pairDescriptor.inputFingerprint,
        fromWorld,
        toWorld,
        fromOutput,
        toOutput,
        requestedStrategy: workerPair.requestedStrategy,
        installedStrategy: workerPair.installedStrategy,
        fallbackReason: workerPair.fallbackReason,
        metrics: workerPair.metrics,
        validated: true,
      });
    });
    return {
      key,
      pairs,
      worldIds: sequence.map((world) => requireAboutNarrativeWorldId(world, 'Prepared World')),
      preparationDurationMs: performance.now() - startedAt,
      mainThreadApplicationMs: 0,
      generationDurationMs: Number(timings?.generationMs || 0),
      correspondenceDurationMs: Number(timings?.correspondenceMs || 0),
    };
  };

  const prepareWithWorker = ({ sequenceKey, input, generation, signal }) => new Promise((resolve, reject) => {
    const { entries } = input;
    let worker;
    try {
      worker = new Worker(
        new URL('./aboutNarrativeCorrespondence.worker.js', import.meta.url),
        { type: 'module', name: 'about-narrative-correspondence' },
      );
    } catch (error) {
      error.category = 'workerConstruction';
      reject(error);
      return;
    }
    runtimeObserver.workerStarted();
    correspondenceWorker = worker;
    let released = false;
    const publicationController = new AbortController();
    const timeout = window.setTimeout(() => {
      runtimeObserver.workerTimedOut();
      const error = new Error('The correspondence Worker timed out.');
      error.category = 'workerTimeout';
      release();
      reject(error);
    }, 15_000);
    const release = ({ abortPublication = true } = {}) => {
      if (released) return;
      released = true;
      if (abortPublication) publicationController.abort();
      window.clearTimeout(timeout);
      if (correspondenceWorker === worker) correspondenceWorker = null;
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
      runtimeObserver.workerTerminated();
      signal.removeEventListener('abort', handleAbort);
    };
    const handleAbort = () => {
      release();
      reject(new DOMException('Preparation was aborted.', 'AbortError'));
    };
    signal.addEventListener('abort', handleAbort, { once: true });
    worker.onmessage = async (event) => {
      const messageStartedAt = performance.now();
      let maximumPublicationTaskMs = 0;
      let ownsPendingPublication = false;
      const releasePendingPublication = () => {
        if (!ownsPendingPublication) return;
        ownsPendingPublication = false;
        if (!disposed) resourceLedger?.releaseOwner('pending-publication');
      };
      try {
        if (disposed || signal.aborted) {
          throw new DOMException('Preparation was aborted.', 'AbortError');
        }
        if (resourceLedger) {
          resourceLedger.retain('pending-publication', event.data);
          ownsPendingPublication = true;
        }
        const publication = await validateAboutNarrativeWorkerPublication(event.data, {
          generation, sequenceKey, pointCount, entries,
        }, {
          signal: publicationController.signal,
          onChunk: (chunk) => {
            maximumPublicationTaskMs = Math.max(
              maximumPublicationTaskMs,
              chunk.chunk === 1 ? performance.now() - messageStartedAt : chunk.durationMs,
            );
          },
        });
        if (disposed || signal.aborted || correspondenceWorker !== worker
          || activePreparation?.sequenceKey !== sequenceKey) {
          throw new DOMException('Preparation was superseded during validation.', 'AbortError');
        }
        const { response } = publication;
        if (response.status === 'failure') {
          const error = new Error(response.error.message);
          error.category = response.error.category;
          error.code = response.error.code;
          throw error;
        }
        release({ abortPublication: false });
        const publicationValidationTotalMs = performance.now() - messageStartedAt;
        const messageDurationMs = Math.max(maximumPublicationTaskMs, publication.chunks ? 0 : publicationValidationTotalMs);
        runtimeObserver.workerMessage({
          messageDurationMs,
          publicationValidationTotalMs,
          publicationValidationDurationMs: publication.durationMs,
          publicationValuesScanned: publication.valuesScanned,
          publicationValidationChunks: publication.chunks,
        });
        resolve(Object.freeze({ response, releasePendingPublication }));
      } catch (error) {
        releasePendingPublication();
        release();
        reject(error);
      }
    };
    worker.onerror = (event) => {
      const error = new Error(event.message || 'The correspondence Worker crashed.');
      error.category = 'workerCrash';
      release();
      reject(error);
    };
    worker.onmessageerror = () => {
      const error = new Error('The correspondence Worker returned an unreadable message.');
      error.category = 'workerProtocol';
      release();
      reject(error);
    };
    try {
      worker.postMessage({
        protocolVersion: ABOUT_NARRATIVE_WORKER_PROTOCOL_VERSION,
        generation,
        sequenceKey,
        pointCount,
        quality,
        entries,
      });
    } catch (error) {
      error.category = 'transfer';
      release();
      reject(error);
    }
  });

  const preparationController = createAboutNarrativePreparationController({
    diagnostics,
    retainReadyCandidate: false,
    startPreparation: prepareWithWorker,
    validateCandidate: (candidate) => candidate,
    publishReady: (candidate, identity) => {
      try {
        if (disposed) throw new DOMException('Preparation was aborted.', 'AbortError');
        const request = activePreparation;
        if (!request || request.sequenceKey !== identity.sequenceKey) throw new Error('Preparation intent became stale.');
        const response = candidate.response;
        const prepared = createPreparedSequence(
          request.sequenceKey,
          request.descriptor,
          request.sequence,
          response.outputs,
          response.pairs,
          response.timings,
          request.startedAt,
        );
        if (readySequence?.key && readySequence.key !== request.sequenceKey) {
          sequenceCache.unpin(readySequence.key, 'ready-sequence');
        }
        resourceLedger?.retain('sequence-cache', prepared);
        sequenceCache.set(request.sequenceKey, prepared, {
          owner: 'sequence-cache',
          pins: ['ready-sequence'],
          active: true,
          dispose: (value) => resourceLedger?.release('sequence-cache', value),
        });
        readySequence = prepared;
        sequenceState = 'ready';
        root.dataset.worldPrepare = 'ready';
        root.dataset.worldShapeGenerationMs = prepared.generationDurationMs.toFixed(2);
        root.dataset.worldCorrespondenceWorkerMs = prepared.correspondenceDurationMs.toFixed(2);
        root.dataset.worldCorrespondencePrepareMs = prepared.preparationDurationMs.toFixed(2);
        root.dataset.worldCorrespondenceApplyMs = '0.00';
        delete root.dataset.worldError;
        diagnostics.recordMetrics({
          preparationDurationMs: prepared.preparationDurationMs,
          workerDurationMs: prepared.correspondenceDurationMs,
        });
      } finally {
        candidate.releasePendingPublication();
      }
    },
    classifyFailure: (error) => ({ category: error?.category || (error?.name === 'AbortError' ? 'aborted' : 'validation') }),
  });
  let warnedFailureRecordId = 0;
  const unsubscribePreparation = preparationController.subscribe(() => {
    const snapshot = preparationController.getSnapshot();
    sequenceState = snapshot.state === 'preparing' ? 'loading' : snapshot.state;
    root.dataset.worldPrepare = sequenceState;
    if (snapshot.lastFailure) {
      root.dataset.worldError = snapshot.lastFailure.message;
      const failureRecord = [...snapshot.records].reverse().find((record) => record.type === 'preparation-failed');
      if (failureRecord && failureRecord.id !== warnedFailureRecordId) {
        warnedFailureRecordId = failureRecord.id;
        console.warn('[About narrative] Sequence preparation failed; retaining the last valid field.', snapshot.lastFailure);
      }
    }
  });

  const bootstrapTarget = (sequenceKey, targetWorld) => {
    if (installedPair || !targetWorld) return;
    bootstrapRequestId += 1;
    const requestId = bootstrapRequestId;
    bootstrapController?.abort();
    bootstrapController = new AbortController();
    const startedAt = performance.now();
    const targetPromise = getShape(targetWorld, bootstrapController.signal);
    root.dataset.worldBootstrapGenerationMs = (performance.now() - startedAt).toFixed(2);
    targetPromise.then((output) => {
      if (disposed || installedPair || requestId !== bootstrapRequestId
        || activePreparation?.sequenceKey !== sequenceKey) return;
      installPreparedPair({
        key: `${sequenceKey}:${requireAboutNarrativeWorldId(targetWorld, 'Bootstrap World')}:bootstrap`,
        fromWorld: targetWorld,
        toWorld: targetWorld,
        fromOutput: output,
        toOutput: output,
        requestedStrategy: 'index-v1',
        installedStrategy: 'index-v1',
        fallbackReason: output.fallbackReason || '',
        metrics: { improvement: 0, p95Distance: 0, maxDistance: 0, weightedRmsDistance: 0 },
        validated: true,
      });
      root.dataset.worldBootstrapReadyMs = (performance.now() - startedAt).toFixed(2);
    }).catch((error) => {
      if (error?.name !== 'AbortError') root.dataset.worldError = error?.message || String(error);
    });
  };

  const preparePlan = ({ sequenceKey, descriptor, targetWorldId = '' } = {}) => {
    lastPreparationRequest = { sequenceKey, descriptor, targetWorldId };
    const responsiveSequenceKey = getResponsiveSequenceKey(sequenceKey);
    const responsiveInputFingerprint = `${descriptor?.inputFingerprint || sequenceKey}:${responsiveSequenceKey}`;
    const sequence = descriptor?.runtimeWorlds || descriptor?.worlds;
    const globals = descriptor?.globals
      || (descriptor?.worldRail ? { worldRail: descriptor.worldRail } : { camera: descriptor?.camera });
    if (!sequenceKey || !Array.isArray(sequence) || !sequence.length
      || (!globals?.worldRail && !globals?.camera)) return false;
    if (descriptor?.profile && descriptor.profile !== quality) {
      root.dataset.worldError = `Point profile ${descriptor.profile} requires a renderer remount.`;
      return false;
    }
    if (readySequence?.key === responsiveSequenceKey) return true;
    const cached = sequenceCache.get(responsiveSequenceKey);
    if (cached) {
      if (readySequence?.key && readySequence.key !== responsiveSequenceKey) {
        sequenceCache.unpin(readySequence.key, 'ready-sequence');
      }
      readySequence = cached;
      sequenceCache.pin(responsiveSequenceKey, 'ready-sequence');
      sequenceCache.activate(responsiveSequenceKey);
      sequenceState = 'ready';
      root.dataset.worldPrepare = 'ready';
      return true;
    }
    if (activePreparation?.sequenceKey === responsiveSequenceKey && sequenceState === 'loading') {
      const nextTarget = findAboutNarrativeWorldById(sequence, targetWorldId) || sequence[0];
      bootstrapTarget(responsiveSequenceKey, nextTarget);
      return true;
    }
    const entries = sequence.map((world, index) => ({
      id: requireAboutNarrativeWorldId(world, 'Worker World'),
      mode: index === 0
        ? 'index-v1'
        : world.transitionIn?.correspondence || world.correspondence || 'index-v1',
      matrix: writeWorldTransform(
        index === 0 ? correspondenceFromTransform : correspondenceToTransform,
        world,
        globals,
        compact,
        shortLandscape,
        index === 0 ? correspondenceFromScratch : correspondenceToScratch,
      ).elements.slice(),
      shapeId: world.shapeId,
      seed: world.seed,
      parameters: world.shapeParameters || {},
    }));
    const previousPreparation = activePreparation;
    const nextPreparation = {
      sequenceKey: responsiveSequenceKey,
      inputFingerprint: responsiveInputFingerprint,
      descriptor,
      sequence,
      entries,
      startedAt: performance.now(),
    };
    activePreparation = nextPreparation;
    const request = preparationController.requestPreparation({
      sequenceKey: responsiveSequenceKey,
      // Preparation ownership follows the immutable sequence. The current
      // target World is only a bootstrap hint and must not reset a failed
      // sequence's retry latch as the playhead moves.
      pairId: `sequence:${responsiveSequenceKey}`,
      inputFingerprint: responsiveInputFingerprint,
      input: nextPreparation,
    }, { trigger: 'compiled-plan' });
    if (!request.accepted) {
      activePreparation = previousPreparation;
      sequenceState = request.reason === 'failed-latched' ? 'failed' : 'idle';
      root.dataset.worldPrepare = sequenceState;
      return false;
    }
    sequenceState = 'loading';
    root.dataset.worldPrepare = 'loading';
    const targetWorld = findAboutNarrativeWorldById(sequence, targetWorldId) || sequence[0];
    bootstrapTarget(responsiveSequenceKey, targetWorld);
    return true;
  };

  const setModifierUniforms = (target, world, globals) => {
    const slots = getModifierSlots(world, globals);
    const sharedSwarm = slots?.swarm;
    const drift = sharedSwarm || slots?.drift;
    const wave = slots?.wave;
    const group = slots?.group;
    const isolation = slots?.isolation;
    const orbital = slots?.orbital;
    const colour = slots?.colour;
    target.driftAmplitude.value = Number(drift?.amplitude || 0);
    target.driftSpeed.value = Number(drift?.speed || 0);
    target.driftIrregularity.value = Number(sharedSwarm?.irregularity || 0);
    target.driftIndividuality.value = Number(sharedSwarm?.individuality || 0);
    target.driftAxisSpread.value = Number(sharedSwarm?.axisSpread || 0);
    target.driftStoryMix.value = sharedSwarm
      ? sharedSwarm.storyMix
      : drift?.timeMode === 'story' ? 1 : drift?.timeMode === 'mixed' ? 0.08 : 0;
    target.waveWeight.value = wave ? Number(wave.strength ?? 1) : 0;
    target.waveAmplitude.value = Number(wave?.amplitude || 0);
    target.waveSpeed.value = Number(wave?.speed || 0);
    target.waveStoryMix.value = resolveAboutNarrativeMotionTimeMix(wave?.timeMode);
    target.waveFrequency.value.set(
      Number(wave?.frequencyX || 1),
      Number(wave?.frequencyZ || 1),
    );
    target.groupStrength.value = Number(group?.strength || 0);
    target.disciplineIsolation.value = Number(isolation?.strength || 0);
    target.disciplineBackgroundOpacity.value = Number(isolation?.backgroundOpacity ?? 1);
    target.orbitalWeight.value = Number(orbital?.strength || 0);
    target.orbitalSpeed.value = Number(orbital?.speed || 0);
    target.orbitalStoryMix.value = orbital?.timeMode === 'ambient'
      ? 0
      : orbital?.timeMode === 'mixed' ? 0.5 : 1;
    target.orbitalRadius.value = Number(world?.shapeParameters?.orbitRadius ?? 5.8);
    target.livingColour.value = Number(colour?.strength || 0);
  };

  const updateDisciplineReveal = (frame, fromWorld, toWorld) => {
    const revealState = frame.disciplineReveal;
    const reveal = revealState?.config;
    const overlay = disciplineOverlayRef?.current;
    syncDisciplineLabels(overlay);
    if (reveal !== lastDisciplineConfig || frame.layoutProfile !== lastDisciplineLayoutProfile) {
      const mobile = frame.layoutProfile === 'mobile';
      resolvedDisciplineAnchors = reveal?.items?.map((item) => {
        const fallback = item.position || [0.5, 0.5];
        const position = mobile ? item.mobilePosition || fallback : fallback;
        return { group: item.group, x: position[0], y: position[1] };
      }) || null;
      lastDisciplineConfig = reveal || null;
      lastDisciplineLayoutProfile = frame.layoutProfile || '';
      if (installedPair) refreshInstalledDisciplineGroups(installedPair, resolvedDisciplineAnchors);
    }
    const toWorldHasDisciplineAnchors = hasAllDisciplineAnchors(toDisciplineIndices);
    const fromWorldHasDisciplineAnchors = hasAllDisciplineAnchors(fromDisciplineIndices);
    const disciplineWorld = toWorldHasDisciplineAnchors
      ? toWorld
      : fromWorldHasDisciplineAnchors ? fromWorld : null;
    const gridDisciplinePositions = disciplineWorld === toWorld
      ? toDisciplinePositions
      : fromDisciplinePositions;
    const gridDisciplineIndices = disciplineWorld === toWorld
      ? toDisciplineIndices
      : fromDisciplineIndices;
    // Background isolation follows the full effect clock. Labels remain on the
    // activation clock so a split-clock clip can prepare the field before copy
    // enters the shared viewport reveal band.
    const effectAvailable = Boolean(
      reveal
      && disciplineWorld
      && frame.storyWU >= reveal.effectStartWU
      && frame.storyWU < revealState.endWU,
    );
    const revealAvailable = effectAvailable
      && frame.storyWU >= revealState.startWU;
    disciplineWeights.fill(0);

    let backgroundWeight = 0;
    let visibleLabels = 0;
    if (effectAvailable) {
      const restoreWeight = 1 - Number(revealState.restoreProgress || 0);
      backgroundWeight = Number(revealState.backgroundProgress || 0) * restoreWeight;
    }

    if (effectAvailable) {
      const isolationWeight = Number(revealState.backgroundProgress || 0)
        * (1 - Number(revealState.restoreProgress || 0));
      const backgroundOpacity = Number(reveal.backgroundOpacity ?? 0.2);
      uniforms.fromDisciplineIsolation.value = isolationWeight;
      uniforms.toDisciplineIsolation.value = isolationWeight;
      uniforms.fromDisciplineBackgroundOpacity.value = backgroundOpacity;
      uniforms.toDisciplineBackgroundOpacity.value = backgroundOpacity;
    } else {
      // Do not let the discipline monochrome pass tint later worlds, especially
      // the ripple-to-bust morph where the original material colours must return.
      uniforms.fromDisciplineIsolation.value = 0;
      uniforms.toDisciplineIsolation.value = 0;
    }
    uniforms.disciplineRevealActive.value = revealAvailable ? 1 : 0;
    uniforms.disciplineBackgroundWeight.value = backgroundWeight;
    uniforms.disciplineBackgroundOpacity.value = Number(reveal?.backgroundOpacity ?? 0.06);
    uniforms.disciplineReconnectOpacity.value = Number(reveal?.reconnectOpacity ?? 0.24);
    uniforms.disciplinePointScale.value = Number(reveal?.pointScale ?? 3.6);

    if (overlay) {
      disciplineProjectedX.fill(Number.NaN);
      disciplineProjectedY.fill(Number.NaN);
      if (revealAvailable && anchorSamplingExact) {
        camera.updateMatrixWorld(true);
        anchorSampleInput.fromTransform = uniforms.fromTransform.value;
        anchorSampleInput.toTransform = uniforms.toTransform.value;
        anchorSampleInput.morphProgress = uniforms.morphProgress.value;
        anchorSampleInput.bustYaw = uniforms.bustYaw.value;
        anchorSampleInput.fromBust = uniforms.fromBust.value;
        anchorSampleInput.toBust = uniforms.toBust.value;
        anchorSampleInput.bustAssembly.weight = uniforms.bustAssemblyWeight.value;
        anchorSampleInput.bustAssembly.surfaceRiseWeight = uniforms.bustSurfaceRiseWeight.value;
        anchorSampleInput.bustAssembly.baseStart = uniforms.bustBuildBaseStart.value;
        anchorSampleInput.bustAssembly.headStart = uniforms.bustBuildHeadStart.value;
        anchorSampleInput.bustAssembly.layerSoftness = uniforms.bustBuildSoftness.value;
        anchorSampleInput.bustAssembly.platformScale = uniforms.bustPlatformScale.value;
        anchorSampleInput.bustAssembly.platformSettle = uniforms.bustPlatformSettle.value;
        anchorSampleInput.bustAssembly.surfaceHeight = uniforms.bustSurfaceHeight.value;
        anchorSampleInput.bustAssembly.submergeDepth = uniforms.bustSubmergeDepth.value;
        anchorSampleInput.bustAssembly.waterlineSoftness = uniforms.bustWaterlineSoftness.value;
        anchorSampleInput.bustAssembly.surfaceCarry = uniforms.bustSurfaceCarry.value;
        anchorSampleInput.bustAssembly.fragmentHeight = uniforms.bustFragmentHeight.value;
        anchorSampleInput.bustAssembly.fragmentFade = uniforms.bustFragmentFade.value;
        anchorSampleInput.bustAssembly.fragmentReveal = uniforms.bustFragmentReveal.value;
        anchorSampleInput.bustAssembly.fragmentSpread = uniforms.bustFragmentSpread.value;
        anchorSampleInput.bustAssembly.fragmentFall = uniforms.bustFragmentFall.value;
        anchorSampleInput.bustAssembly.fragmentPresence = uniforms.bustFragmentPresence.value;
        anchorSampleInput.storyTime = uniforms.storyTime.value;
        anchorSampleInput.ambientTime = uniforms.ambientTime.value;
        anchorSampleInput.gridInfluence = uniforms.gridInfluence.value;
        anchorSampleInput.fromGroupStrength = uniforms.fromGroupStrength.value;
        anchorSampleInput.toGroupStrength = uniforms.toGroupStrength.value;
        anchorSampleInput.fromDrift.amplitude = uniforms.fromDriftAmplitude.value;
        anchorSampleInput.fromDrift.speed = uniforms.fromDriftSpeed.value;
        anchorSampleInput.fromDrift.irregularity = uniforms.fromDriftIrregularity.value;
        anchorSampleInput.fromDrift.individuality = uniforms.fromDriftIndividuality.value;
        anchorSampleInput.fromDrift.axisSpread = uniforms.fromDriftAxisSpread.value;
        anchorSampleInput.fromDrift.storyMix = uniforms.fromDriftStoryMix.value;
        anchorSampleInput.toDrift.amplitude = uniforms.toDriftAmplitude.value;
        anchorSampleInput.toDrift.speed = uniforms.toDriftSpeed.value;
        anchorSampleInput.toDrift.irregularity = uniforms.toDriftIrregularity.value;
        anchorSampleInput.toDrift.individuality = uniforms.toDriftIndividuality.value;
        anchorSampleInput.toDrift.axisSpread = uniforms.toDriftAxisSpread.value;
        anchorSampleInput.toDrift.storyMix = uniforms.toDriftStoryMix.value;
        anchorSampleInput.fromWave.weight = uniforms.fromWaveWeight.value;
        anchorSampleInput.fromWave.amplitude = uniforms.fromWaveAmplitude.value;
        anchorSampleInput.fromWave.speed = uniforms.fromWaveSpeed.value;
        anchorSampleInput.fromWave.storyMix = uniforms.fromWaveStoryMix.value;
        anchorSampleInput.fromWave.frequencyX = uniforms.fromWaveFrequency.value.x;
        anchorSampleInput.fromWave.frequencyZ = uniforms.fromWaveFrequency.value.y;
        anchorSampleInput.toWave.weight = uniforms.toWaveWeight.value;
        anchorSampleInput.toWave.amplitude = uniforms.toWaveAmplitude.value;
        anchorSampleInput.toWave.speed = uniforms.toWaveSpeed.value;
        anchorSampleInput.toWave.storyMix = uniforms.toWaveStoryMix.value;
        anchorSampleInput.toWave.frequencyX = uniforms.toWaveFrequency.value.x;
        anchorSampleInput.toWave.frequencyZ = uniforms.toWaveFrequency.value.y;
        anchorSampleInput.gridRipple.weight = uniforms.gridRippleWeight.value;
        anchorSampleInput.gridRipple.amplitude = uniforms.gridRippleAmplitude.value;
        anchorSampleInput.gridRipple.speed = uniforms.gridRippleSpeed.value;
        anchorSampleInput.gridRipple.frequency = uniforms.gridRippleFrequency.value;
        anchorSampleInput.gridRipple.storyMix = uniforms.gridRippleStoryMix.value;
        anchorSampleInput.gridRipple.progress = uniforms.gridRippleProgress.value;
        anchorSampleInput.gridRipple.centerX = uniforms.gridRippleCenter.value.x;
        anchorSampleInput.gridRipple.centerZ = uniforms.gridRippleCenter.value.y;
        const revealThreshold = Number(frame.globals.editorialRevealThreshold ?? 1);
        const revealDuration = Number(frame.globals.editorialMotion?.fadeDurationWU ?? 0.2);
        // Use the editorial reading line as the only reveal clock. Each anchor
        // accumulates independently; forward travel never clears an earlier one.
        for (let group = 1; group <= 6; group += 1) {
          const label = disciplineLabels[group - 1];
          if (!label) continue;
          const offset = (group - 1) * 3;
          if (!Number.isFinite(gridDisciplinePositions[offset])) continue;
          const pointIndex = gridDisciplineIndices[group - 1];
          if (pointIndex < 0) continue;
          const pointOffset = pointIndex * 3;
          anchorFromPosition.x = fixedAttributes.position.array[pointOffset];
          anchorFromPosition.y = fixedAttributes.position.array[pointOffset + 1];
          anchorFromPosition.z = fixedAttributes.position.array[pointOffset + 2];
          anchorToPosition.x = fixedAttributes.targetPosition.array[pointOffset];
          anchorToPosition.y = fixedAttributes.targetPosition.array[pointOffset + 1];
          anchorToPosition.z = fixedAttributes.targetPosition.array[pointOffset + 2];
          anchorSampleInput.pointSeed = fixedAttributes.pointSeed.array[pointIndex];
          sampleAboutNarrativeAnchorPosition(anchorSampleInput, anchorSampleTarget);
          disciplinePointScratch.set(
            anchorSampleTarget.x,
            anchorSampleTarget.y,
            anchorSampleTarget.z,
          );
          const anchorInFrontOfCamera = disciplineViewPointScratch
            .copy(disciplinePointScratch)
            .applyMatrix4(camera.matrixWorldInverse).z < 0;
          disciplinePointScratch.project(camera);
          disciplineProjectedX[group - 1] = viewportOffsetX
            + (((disciplinePointScratch.x * 0.5) + 0.5) * width);
          disciplineProjectedY[group - 1] = viewportOffsetY
            + (((-disciplinePointScratch.y * 0.5) + 0.5) * height);
          const viewportY = (disciplineProjectedY[group - 1] - viewportOffsetY) / height;
          const revealProgress = !anchorInFrontOfCamera
            ? 0
            : getAboutNarrativeSharedRevealProgress(
              viewportY,
              revealThreshold,
              revealDuration,
              frame.reducedMotion,
            );
          disciplineWeights[group - 1] = revealProgress;
          writeDisciplineRevealStyles(
            group - 1,
            revealProgress * uniforms.simulationVisibility.value,
          );
          if (revealProgress > 0.05) visibleLabels += 1;
        }
        placeDisciplineLabels(Number(reveal.labelOffsetPx ?? 18));
      } else if (revealAvailable) {
        for (let group = 1; group <= 6; group += 1) {
          const labelReveal = uniforms.simulationVisibility.value;
          disciplineWeights[group - 1] = 1;
          writeDisciplineRevealStyles(group - 1, labelReveal);
          if (labelReveal > 0.05) visibleLabels += 1;
          disciplineProjectedX[group - 1] = viewportOffsetX
            + (width * (group % 2 === 0 ? 0.62 : 0.26));
          disciplineProjectedY[group - 1] = viewportOffsetY
            + (height * ((14 + (group * 11)) / 100));
        }
        placeDisciplineLabels(Number(reveal.labelOffsetPx ?? 18));
      } else {
        for (let group = 1; group <= 6; group += 1) {
          writeDisciplineRevealStyles(group - 1, 0);
        }
      }
    }
    uniforms.disciplineRevealA.value.set(
      disciplineWeights[0],
      disciplineWeights[1],
      disciplineWeights[2],
    );
    uniforms.disciplineRevealB.value.set(
      disciplineWeights[3],
      disciplineWeights[4],
      disciplineWeights[5],
    );
    let visibleDisciplineCount = 0;
    for (let index = 0; index < disciplineWeights.length; index += 1) {
      if (disciplineWeights[index] > 0.95) visibleDisciplineCount += 1;
    }
    if (visibleDisciplineCount !== lastDisciplineVisibleCount) {
      root.dataset.worldDisciplineVisible = String(visibleDisciplineCount);
      lastDisciplineVisibleCount = visibleDisciplineCount;
      runtimeObserver.hotFrameDomWrite();
    }
    if (visibleLabels !== lastDisciplineLabelCount) {
      root.dataset.worldDisciplineLabels = String(visibleLabels);
      lastDisciplineLabelCount = visibleLabels;
      runtimeObserver.hotFrameDomWrite();
    }
    if (backgroundWeight !== lastGridBackground) {
      root.dataset.worldGridBackground = backgroundWeight.toFixed(4);
      lastGridBackground = backgroundWeight;
      runtimeObserver.hotFrameDomWrite();
    }
  };

  const render = (frame) => {
    latestFrame = frame;
    syncAtmosphereSource();
    if (!frame || !contextAvailable || document.hidden) return;
    if (frame.pointProfile && frame.pointProfile !== quality) {
      if (lastInteractionEnabled !== false) {
        interaction.dataset.active = 'false';
        interaction.tabIndex = -1;
        lastInteractionEnabled = false;
        runtimeObserver.hotFrameDomWrite(2);
      }
      return;
    }
    const requestedFromWorld = frame.world.from || frame.world.to;
    const requestedToWorld = frame.world.to || requestedFromWorld;
    if (!requestedFromWorld || !requestedToWorld) return;
    const requestedFromWorldId = getAboutNarrativeWorldId(requestedFromWorld);
    const requestedToWorldId = getAboutNarrativeWorldId(requestedToWorld);
    if (!requestedFromWorldId || !requestedToWorldId) return;
    const requestedSequenceKey = getResponsiveSequenceKey(frame.world.sequenceKey);
    const preparedPair = readySequence?.key === requestedSequenceKey
      ? readySequence.pairs.get(requestedToWorldId)
      : null;
    if (preparedPair
      && getAboutNarrativeWorldId(preparedPair.fromWorld) === requestedFromWorldId
      && getAboutNarrativeWorldId(preparedPair.toWorld) === requestedToWorldId) {
      preparedPair.fromWorld = requestedFromWorld;
      preparedPair.toWorld = requestedToWorld;
      installPreparedPair(preparedPair);
    }
    if (!installedPair) return;
    runtimeObserver.hotFrameStarted();
    const pairMatchesRequest = getAboutNarrativeWorldId(installedPair.fromWorld) === requestedFromWorldId
      && getAboutNarrativeWorldId(installedPair.toWorld) === requestedToWorldId;
    if (pairMatchesRequest) {
      installedPair.fromWorld = requestedFromWorld;
      installedPair.toWorld = requestedToWorld;
    }
    const fromWorld = installedPair.fromWorld;
    const toWorld = installedPair.toWorld;
    if (fromWorld !== lastAnchorFromWorld || toWorld !== lastAnchorToWorld) {
      inspectAboutNarrativeAnchorSampling(fromWorld.modifiers, anchorCapability);
      inspectAboutNarrativeAnchorSampling(toWorld.modifiers, anchorCapabilityTarget);
      anchorSamplingExact = anchorCapability.capability === ABOUT_NARRATIVE_ANCHOR_SAMPLING_EXACT
        && anchorCapabilityTarget.capability === ABOUT_NARRATIVE_ANCHOR_SAMPLING_EXACT;
      lastAnchorFromWorld = fromWorld;
      lastAnchorToWorld = toWorld;
      root.dataset.worldAnchorSampling = anchorSamplingExact ? 'exact' : 'editorial-fallback';
      if (!anchorSamplingExact) {
        diagnostics.recordLifecycle('anchor-sampling-unsupported', {
          unsupportedModifierCount: anchorCapability.unsupportedCount + anchorCapabilityTarget.unsupportedCount,
        });
      }
    }
    const transitionProgress = pairMatchesRequest
      ? frame.world.transitionProgress
      : installedPair.progress;
    if (pairMatchesRequest) installedPair.progress = transitionProgress;
    const bust = getModifierSlots(toWorld, frame.globals)?.bust;
    const formingBust = toWorld.shapeId === 'bust-v1' && transitionProgress < 0.9999;
    const bustDeltaSeconds = frame.ambientTime > 0 && lastBustAmbientTime > 0
      ? Math.min(0.5, Math.max(0, frame.ambientTime - lastBustAmbientTime))
      : 0;
    lastBustAmbientTime = frame.ambientTime;
    bustSampleInput.active = toWorld.shapeId === 'bust-v1';
    bustSampleInput.transitionProgress = transitionProgress;
    bustSampleInput.deltaSeconds = bustDeltaSeconds;
    bustSampleInput.speed = Math.max(0, Number(bust?.speed || 0));
    bustSampleInput.resumeDelay = Number(bust?.resumeDelay || 0);
    bustSampleInput.liveAmbient = frame.ambientTime > 0;
    bustSampleInput.deterministicScrub = frame.ambientTime === 0;
    bustSampleInput.reducedMotion = frame.reducedMotion;
    bustSampleInput.hidden = document.hidden;
    const bustState = bustController.sample(bustSampleInput);
    bustYaw = bustState.yaw;
    if (toWorld.shapeId !== 'bust-v1' && dragStart) {
      if (interaction.hasPointerCapture(dragStart.pointerId)) {
        interaction.releasePointerCapture(dragStart.pointerId);
      }
      dragStart = null;
      dragging = false;
    }

    camera.position.fromArray(frame.camera.position);
    camera.quaternion.fromArray(frame.camera.quaternion);
    if (camera.fov !== frame.camera.fov) {
      camera.fov = frame.camera.fov;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld(true);
    if (cameraFocusAnchor) {
      const aimWeight = Number(frame.camera.aimWeight || 0);
      cameraFocusAnchor.object.position.fromArray(frame.camera.lookAtTarget);
      cameraFocusAnchor.material.opacity = 0.32 + (Math.min(1, Math.max(0, aimWeight)) * 0.68);
    }
    writeWorldTransform(
      uniforms.fromTransform.value,
      fromWorld,
      frame.globals,
      compact,
      shortLandscape,
      fromTransformScratch,
    );
    writeWorldTransform(
      uniforms.toTransform.value,
      toWorld,
      frame.globals,
      compact,
      shortLandscape,
      toTransformScratch,
    );
    uniforms.morphProgress.value = transitionProgress;
    uniforms.storyTime.value = frame.storyTime;
    uniforms.ambientTime.value = frame.ambientTime;
    uniforms.pointSize.value = frame.globals.pointMaterial.pointSize * mobileBodyScale;
    uniforms.fromPointSizeScale.value = Number(fromWorld.transform?.pointSizeScale ?? 1);
    uniforms.toPointSizeScale.value = Number(toWorld.transform?.pointSizeScale ?? 1);
    uniforms.fieldOpacity.value = frame.globals.pointMaterial.opacity;
    const requestedVisibility = Number(frame.simulation?.visibility ?? 1);
    const simulationVisibility = Number.isFinite(requestedVisibility)
      ? Math.min(1, Math.max(0, requestedVisibility))
      : 1;
    uniforms.simulationVisibility.value = simulationVisibility;
    points.visible = simulationVisibility > 0.001;
    updateSceneEntrance(frame);
    const globalCamera = frame.globals?.camera;
    uniforms.distanceFogStartWU.value = Number(
      globalCamera?.distanceFogStartWU ?? 8,
    );
    uniforms.distanceFogEndWU.value = Number(
      globalCamera?.distanceFogEndWU ?? 18,
    );
    if (simulationVisibility !== lastSimulationVisibility) {
      root.dataset.worldVisibility = simulationVisibility.toFixed(4);
      lastSimulationVisibility = simulationVisibility;
      runtimeObserver.hotFrameDomWrite();
    }
    setModifierUniforms(modifierUniformTargets.from, fromWorld, frame.globals);
    setModifierUniforms(modifierUniformTargets.to, toWorld, frame.globals);
    if (frame.reducedMotion) {
      uniforms.fromDriftAmplitude.value = 0;
      uniforms.toDriftAmplitude.value = 0;
      uniforms.fromWaveSpeed.value = 0;
      uniforms.toWaveSpeed.value = 0;
      uniforms.fromOrbitalWeight.value = 0;
      uniforms.toOrbitalWeight.value = 0;
    }
    uniforms.fromBust.value = fromWorld.shapeId === 'bust-v1' ? 1 : 0;
    uniforms.toBust.value = toWorld.shapeId === 'bust-v1' ? 1 : 0;
    uniforms.bustYaw.value = bustYaw;
    const bustAssemblyWorld = toWorld.shapeId === 'bust-v1' ? toWorld : fromWorld;
    const bustAssemblySlot = getModifierSlots(bustAssemblyWorld, frame.globals)?.bustAssembly;
    const bustAssembly = bustAssemblySlot && typeof bustAssemblySlot === 'object'
      ? bustAssemblySlot
      : DEFAULT_BUST_ASSEMBLY;
    uniforms.bustAssemblyWeight.value = bustAssemblySlot === false ? 0 : 1;
    uniforms.bustSurfaceRiseWeight.value = bustAssembly.formationMode === 'surface-rise' ? 1 : 0;
    uniforms.bustBuildBaseStart.value = Number(bustAssembly.baseStart ?? DEFAULT_BUST_ASSEMBLY.baseStart);
    uniforms.bustBuildHeadStart.value = Number(bustAssembly.headStart ?? DEFAULT_BUST_ASSEMBLY.headStart);
    uniforms.bustBuildSoftness.value = Number(bustAssembly.layerSoftness ?? DEFAULT_BUST_ASSEMBLY.layerSoftness);
    uniforms.bustPlatformScale.value = Number(bustAssembly.platformScale ?? DEFAULT_BUST_ASSEMBLY.platformScale);
    uniforms.bustPlatformSettle.value = Number(bustAssembly.platformSettle ?? DEFAULT_BUST_ASSEMBLY.platformSettle);
    uniforms.bustSurfaceHeight.value = Number(bustAssembly.surfaceHeight ?? DEFAULT_BUST_ASSEMBLY.surfaceHeight);
    uniforms.bustSubmergeDepth.value = Number(bustAssembly.submergeDepth ?? DEFAULT_BUST_ASSEMBLY.submergeDepth);
    uniforms.bustWaterlineSoftness.value = Number(bustAssembly.waterlineSoftness ?? DEFAULT_BUST_ASSEMBLY.waterlineSoftness);
    uniforms.bustSurfaceCarry.value = Number(bustAssembly.surfaceCarry ?? DEFAULT_BUST_ASSEMBLY.surfaceCarry);
    uniforms.bustFragmentHeight.value = Number(bustAssembly.fragmentHeight ?? DEFAULT_BUST_ASSEMBLY.fragmentHeight);
    uniforms.bustFragmentFade.value = Number(bustAssembly.fragmentFade ?? DEFAULT_BUST_ASSEMBLY.fragmentFade);
    uniforms.bustFragmentReveal.value = Number(bustAssembly.fragmentReveal ?? DEFAULT_BUST_ASSEMBLY.fragmentReveal);
    uniforms.bustFragmentSpread.value = Number(bustAssembly.fragmentSpread ?? DEFAULT_BUST_ASSEMBLY.fragmentSpread);
    uniforms.bustFragmentFall.value = Number(bustAssembly.fragmentFall ?? DEFAULT_BUST_ASSEMBLY.fragmentFall);
    uniforms.bustFragmentPresence.value = Number(bustAssembly.fragmentPresence ?? DEFAULT_BUST_ASSEMBLY.fragmentPresence);
    if (bustYaw !== lastBustShaderYaw) {
      root.dataset.worldBustShaderYaw = bustYaw.toFixed(5);
      lastBustShaderYaw = bustYaw;
      runtimeObserver.hotFrameDomWrite();
    }
    uniforms.disciplineFocus.value = Number(frame.editorialSignals?.disciplineFocus || 0);
    uniforms.gridInfluence.value = frame.reducedMotion
      ? 0
      : Number(frame.editorialSignals?.gridInfluence || 0);
    if (uniforms.disciplineFocus.value !== lastGroupFocus) {
      root.dataset.worldGroupFocus = String(uniforms.disciplineFocus.value);
      lastGroupFocus = uniforms.disciplineFocus.value;
      runtimeObserver.hotFrameDomWrite();
    }
    if (uniforms.gridInfluence.value !== lastGridInfluence) {
      root.dataset.worldGridInfluence = uniforms.gridInfluence.value.toFixed(4);
      lastGridInfluence = uniforms.gridInfluence.value;
      runtimeObserver.hotFrameDomWrite();
    }
    const activeInteraction = frame.interactions?.activeInteraction;
    const rippleParameters = pairMatchesRequest
      && activeInteraction?.type === 'grid-ripple'
      && activeInteraction.targetWorldId === requestedToWorldId
      ? activeInteraction.parameters
      : null;
    uniforms.gridRippleWeight.value = frame.reducedMotion || !rippleParameters
      ? 0
      : Number(frame.interactions.effectWeight || 0);
    uniforms.gridRippleAmplitude.value = Number(rippleParameters?.amplitude || 0);
    uniforms.gridRippleSpeed.value = Number(rippleParameters?.speed || 0);
    uniforms.gridRippleFrequency.value = Number(rippleParameters?.frequency || 1);
    uniforms.gridRippleStoryMix.value = rippleParameters?.timeMode === 'story'
      ? 1
      : rippleParameters?.timeMode === 'mixed' ? 0.12 : 0;
    const rippleActivationWU = Number(activeInteraction?.activationWU || 0);
    const rippleDurationWU = Math.max(
      0.0001,
      Number(activeInteraction?.endWU || 0) - rippleActivationWU,
    );
    uniforms.gridRippleProgress.value = frame.reducedMotion || !rippleParameters
      ? 0
      : Math.min(1, Math.max(0, (Number(frame.storyWU || 0) - rippleActivationWU)
        / rippleDurationWU));
    const targetTransformElements = uniforms.toTransform.value.elements;
    uniforms.gridRippleCenter.value.set(
      targetTransformElements[12],
      targetTransformElements[14],
    );
    updateDisciplineReveal(frame, fromWorld, toWorld);

    const interactionEnabled = pairMatchesRequest
      && bustController.interactive
      && !formingBust
      && simulationVisibility > 0.001
      && activeInteraction?.type === 'horizontal-spin'
      && activeInteraction.targetWorldId === requestedToWorldId
      && frame.interactions.interactionActivated;
    if (interactionEnabled !== lastInteractionEnabled) {
      interaction.dataset.active = interactionEnabled ? 'true' : 'false';
      interaction.tabIndex = interactionEnabled ? 0 : -1;
      lastInteractionEnabled = interactionEnabled;
      runtimeObserver.hotFrameDomWrite(2);
    }
    if (toWorld.shapeId !== lastWorldStage) {
      root.dataset.worldStage = toWorld.shapeId;
      lastWorldStage = toWorld.shapeId;
      runtimeObserver.hotFrameDomWrite();
    }
    if (bustYaw !== lastBustStyleYaw) {
      root.style.setProperty('--narrative-bust-yaw', bustYaw.toFixed(4));
      lastBustStyleYaw = bustYaw;
      runtimeObserver.hotFrameDomWrite();
    }
    runtimeObserver.render();
    if (atmosphereSourceKind === 'canvas') {
      tickSimulationAtmosphere(performance.now(), 'about:narrative-world');
    }
    markSceneReady();
  };

  const handlePointerDown = (event) => {
    if (interaction.dataset.active !== 'true') return;
    dragStart = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, yaw: bustYaw };
    dragging = false;
  };
  const handlePointerMove = (event) => {
    if (!dragStart || dragStart.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - dragStart.x;
    const deltaY = event.clientY - dragStart.y;
    if (!dragging && Math.abs(deltaX) > 6 && Math.abs(deltaX) > Math.abs(deltaY)) {
      const bust = getModifierSlots(latestFrame?.world?.to, latestFrame?.globals)?.bust;
      dragging = bustController.beginDrag({
        pointerId: event.pointerId,
        x: dragStart.x,
        width,
        sensitivity: Number(bust?.dragSensitivity || 1),
      });
      if (dragging) interaction.setPointerCapture(event.pointerId);
    }
    if (!dragging) return;
    event.preventDefault();
    bustController.dragTo({ pointerId: event.pointerId, x: event.clientX });
    bustYaw = bustController.yaw;
  };
  const handlePointerEnd = (event) => {
    if (dragging && interaction.hasPointerCapture(event.pointerId)) interaction.releasePointerCapture(event.pointerId);
    bustController.endDrag({ pointerId: event.pointerId });
    bustYaw = bustController.yaw;
    dragStart = null;
    dragging = false;
  };
  const handleKeyDown = (event) => {
    if (interaction.dataset.active !== 'true') return;
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    bustController.rotateByKeyboard(event.key === 'ArrowLeft' ? 'left' : 'right');
    bustYaw = bustController.yaw;
  };
  const handleContextLost = (event) => {
    event.preventDefault();
    contextAvailable = false;
    syncAtmosphereSource();
    preparationController.setVisible(false);
    bootstrapController?.abort();
    bootstrapRequestId += 1;
    bustController.cancelInteraction();
    root.dataset.pointWorldState = 'context-lost';
    sceneReady = false;
    delete root.dataset.aboutSceneReady;
    diagnostics.recordLifecycle('context-lost', { contextAvailable: false });
  };
  const handleContextRestored = () => {
    contextAvailable = true;
    syncAtmosphereSource();
    root.dataset.pointWorldState = 'ready';
    resize();
    updateTheme();
    Object.entries(fixedAttributes).forEach(([name, attribute]) => {
      if (name !== 'pointSeed') attribute.needsUpdate = true;
    });
    preparationController.setVisible(true);
    if (lastPreparationRequest) preparePlan(lastPreparationRequest);
    diagnostics.recordLifecycle('context-restored', { contextAvailable: true, lastFailure: null });
  };

  const resizeObserver = new ResizeObserver(resize);
  const responsivePreviewObserver = new MutationObserver(resize);
  const themeObserver = new MutationObserver(updateTheme);
  resizeObserver.observe(root);
  resizeObserver.observe(canvas);
  responsivePreviewObserver.observe(root, {
    attributes: true,
    attributeFilter: ['data-editor-preview-layout', 'data-editor-preview-orientation'],
  });
  themeObserver.observe(root, { attributes: true, attributeFilter: ['class', 'data-theme'] });
  window.addEventListener('resize', resize, { passive: true });
  interaction.addEventListener('pointerdown', handlePointerDown);
  interaction.addEventListener('pointermove', handlePointerMove, { passive: false });
  interaction.addEventListener('pointerup', handlePointerEnd);
  interaction.addEventListener('pointercancel', handlePointerEnd);
  interaction.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('webglcontextlost', handleContextLost);
  canvas.addEventListener('webglcontextrestored', handleContextRestored);
  const unsubscribePalette = subscribeSimulationPalette(updateTheme);
  window.addEventListener('abs:theme-changed', updateTheme);
  window.addEventListener(ROUTE_ENTRANCE_START_EVENT, handleRouteEntranceStart);
  document.fonts?.ready.then(() => {
    if (!disposed) measureDisciplineLabels();
  });
  resize();
  updateTheme();
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  root.dataset.pointWorldState = 'ready';
  let cachedRuntimeDiagnosticsSnapshot = null;
  let cachedRuntimeLifecycle = null;
  const getRuntimeDiagnosticsSnapshot = () => {
    const lifecycle = diagnostics.getSnapshot();
    const paletteSnapshot = getSimulationPaletteSnapshot();
    // `subscribeDiagnostics` is lifecycle-only. A snapshot therefore remains
    // identical until that store emits, even while pull-only performance
    // counters continue changing.
    if (
      cachedRuntimeDiagnosticsSnapshot
      && cachedRuntimeLifecycle === lifecycle
      && cachedRuntimeDiagnosticsSnapshot.paletteGeneration === paletteSnapshot.generation
    ) {
      return cachedRuntimeDiagnosticsSnapshot;
    }
    const shapeCacheSnapshot = shapeCache.getSnapshot();
    const sequenceCacheSnapshot = sequenceCache.getSnapshot();
    const resourceSnapshot = resourceLedger?.getSnapshot('diagnostics');
    const webglSnapshot = webglTracker?.getSnapshot();
    const pairs = readySequence
      ? [...readySequence.pairs.values()].map((pair) => Object.freeze({
        pairId: getAboutNarrativeWorldPairId(pair.fromWorld, pair.toWorld),
        inputFingerprint: pair.inputFingerprint,
        state: 'ready',
        source: 'worker',
        requestedStrategy: pair.requestedStrategy,
        installedStrategy: pair.installedStrategy,
        fallbackReason: pair.fallbackReason,
      }))
      : [];
    cachedRuntimeLifecycle = lifecycle;
    cachedRuntimeDiagnosticsSnapshot = Object.freeze({
      ...lifecycle,
      activeSequenceKey: readySequence?.key || '',
      pendingSequenceKey: lifecycle.state === 'preparing' ? lifecycle.sequenceKey || '' : '',
      failedSequenceKey: lifecycle.state === 'failed' ? lifecycle.sequenceKey || '' : '',
      installedPairId: installedPair?.key || '',
      installedWorldId: getAboutNarrativeWorldId(installedPair?.toWorld),
      runtimeInstanceId,
      geometryInstanceId,
      paletteId: paletteSnapshot.paletteId,
      paletteGeneration: paletteSnapshot.generation,
      paletteColors: paletteSnapshot.colors,
      materialRoles: paletteSnapshot.distribution,
      materialSrgbColors: Object.freeze(Array.from({ length: MATERIAL_SLOT_COUNT }, (_, index) => (
        `#${uniforms[`materialColor${index + 1}`].value.getHexString(THREE.SRGBColorSpace)}`
      ))),
      materialThresholds: Object.freeze([
        uniforms.materialThreshold1.value,
        uniforms.materialThreshold2.value,
        uniforms.materialThreshold3.value,
        uniforms.materialThreshold4.value,
        uniforms.materialThreshold5.value,
        1,
      ]),
      ...runtimeObserver.getLifecycleFields(),
      shapeCache: shapeCacheSnapshot,
      sequenceCache: sequenceCacheSnapshot,
      resources: resourceSnapshot || null,
      webgl: webglSnapshot || null,
      pairs: Object.freeze(pairs),
    });
    return cachedRuntimeDiagnosticsSnapshot;
  };
  const runtimeApi = {
    preparePlan,
    retryPreparation: preparationController.retryPreparation,
    setVisible: preparationController.setVisible,
    getDiagnosticsSnapshot: getRuntimeDiagnosticsSnapshot,
    subscribeDiagnostics: diagnostics.subscribe,
    resetPerformanceMetrics: runtimeObserver.reset,
    resetHotFrameMetrics: runtimeObserver.resetHotFrameMetrics,
    render,
    getMetrics: () => runtimeObserver.getMetrics({
      sequenceState,
      installedPair,
      readySequence,
      latestFrame,
    }),
  };
  runtimeRef.current = runtimeApi;
  if (RUNTIME_DIAGNOSTICS_ENABLED) window.__aboutNarrativeRuntime = runtimeApi;
  const runtimeReadyTimer = window.setTimeout(() => {
    if (!disposed) root.dispatchEvent(new CustomEvent('about:world-runtime-ready'));
  }, 0);

  return () => {
    disposed = true;
    atmosphereSourceCleanup?.();
    atmosphereSourceCleanup = null;
    window.clearTimeout(runtimeReadyTimer);
    unsubscribePreparation();
    preparationController.dispose();
    correspondenceWorker?.terminate();
    correspondenceWorker = null;
    bootstrapController?.abort();
    bootstrapRequestId += 1;
    bustController.cancelInteraction();
    shapeCache.dispose();
    sequenceCache.dispose();
    diagnostics.dispose({ emit: false });
    runtimeRef.current = null;
    if (RUNTIME_DIAGNOSTICS_ENABLED && window.__aboutNarrativeRuntime === runtimeApi) {
      delete window.__aboutNarrativeRuntime;
    }
    resizeObserver.disconnect();
    responsivePreviewObserver.disconnect();
    disciplineLabelResizeObserver.disconnect();
    themeObserver.disconnect();
    window.removeEventListener('resize', resize);
    interaction.removeEventListener('pointerdown', handlePointerDown);
    interaction.removeEventListener('pointermove', handlePointerMove);
    interaction.removeEventListener('pointerup', handlePointerEnd);
    interaction.removeEventListener('pointercancel', handlePointerEnd);
    interaction.removeEventListener('keydown', handleKeyDown);
    canvas.removeEventListener('webglcontextlost', handleContextLost);
    canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    unsubscribePalette();
    window.removeEventListener('abs:theme-changed', updateTheme);
    window.removeEventListener(ROUTE_ENTRANCE_START_EVENT, handleRouteEntranceStart);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    if (cameraFocusAnchor) {
      scene.remove(cameraFocusAnchor.object);
      cameraFocusAnchor.geometry.dispose();
      cameraFocusAnchor.material.dispose();
    }
    webglTracker?.dispose();
    if (resourceLedger) {
      resourceLedger.releaseOwner('installed-pair');
      resourceLedger.releaseOwner('fixed-attributes');
      resourceLedger.dispose();
    }
    runtimeObserver.dispose();
    delete root.dataset.worldStage;
    delete root.dataset.pointAsset;
    delete root.dataset.pointWorldState;
    delete root.dataset.aboutSceneReady;
    delete root.dataset.mobileSimulationBodyScale;
    delete root.dataset.worldPrepare;
    delete root.dataset.worldError;
    delete root.dataset.worldCorrespondence;
    delete root.dataset.worldCorrespondenceRequested;
    delete root.dataset.worldCorrespondenceImprovement;
    delete root.dataset.worldCorrespondenceP95;
    delete root.dataset.worldCorrespondenceMax;
    delete root.dataset.worldCorrespondenceFallback;
    delete root.dataset.worldCorrespondencePair;
    delete root.dataset.worldBootstrapGenerationMs;
    delete root.dataset.worldShapeGenerationMs;
    delete root.dataset.worldCorrespondenceWorkerMs;
    delete root.dataset.worldCorrespondencePrepareMs;
    delete root.dataset.worldCorrespondenceApplyMs;
    delete root.dataset.worldBufferRebuilds;
    delete root.dataset.worldBustShaderYaw;
    delete root.dataset.worldDisciplineVisible;
    delete root.dataset.worldDisciplineLabels;
    delete root.dataset.worldGridBackground;
    delete root.dataset.worldVisibility;
    root.style.removeProperty('--narrative-bust-yaw');
  };
}

export function AboutNarrativePointWorld3D({
  rootRef,
  interactionRef,
  disciplineOverlayRef,
  runtimeRef,
  pointProfile = '',
  showCameraFocusAnchor = false,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    const interaction = interactionRef?.current || canvas;
    if (!canvas || !root) return undefined;
    try {
      return createPointFieldAdapter({
        canvas,
        root,
        interaction,
        disciplineOverlayRef,
        runtimeRef,
        pointProfile,
        showCameraFocusAnchor,
      });
    } catch (error) {
      root.dataset.pointWorldState = 'unavailable';
      root.dataset.aboutSceneReady = 'true';
      let atmosphereCleanup = null;
      if (document.getElementById('simulation-atmosphere-glow-canvas')) {
        try {
          atmosphereCleanup = registerSimulationAtmosphereSource({
            id: 'about:ambient',
            routeId: 'about',
            kind: 'ambient',
            scheduler: 'internal',
          });
        } catch {
          // The route remains usable even when both renderers are unavailable.
        }
      }
      const readyTimer = window.setTimeout(() => {
        root.dispatchEvent(new CustomEvent('about:world-runtime-ready'));
        window.dispatchEvent(new CustomEvent('abs:about-scene-ready'));
      }, 0);
      console.warn('[About narrative] Point world unavailable; continuing with editorial content.', error);
      return () => {
        window.clearTimeout(readyTimer);
        atmosphereCleanup?.();
        delete root.dataset.pointWorldState;
        delete root.dataset.aboutSceneReady;
      };
    }
  }, [disciplineOverlayRef, interactionRef, pointProfile, rootRef, runtimeRef, showCameraFocusAnchor]);

  return <canvas ref={canvasRef} className="about-narrative-world__canvas" aria-hidden="true" />;
}
