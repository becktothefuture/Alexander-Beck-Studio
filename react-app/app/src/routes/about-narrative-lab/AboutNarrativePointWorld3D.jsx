import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  createAboutNarrativeSeeds,
  generateAboutNarrativeShape,
} from './aboutNarrativePointShapes.js';
import {
  resolveAboutNarrativeSwarmMotion,
} from './aboutNarrativeDefinitions.js';
import {
  ABOUT_NARRATIVE_BUST_STATES,
  createAboutNarrativeBustController,
} from './aboutNarrativeBustController.js';
import { createAboutNarrativePersistentCacheLease } from './aboutNarrativePersistentCaches.js';
import { createAboutNarrativePreparationController } from './aboutNarrativePreparationController.js';
import {
  ABOUT_NARRATIVE_POINT_PROFILES,
} from './aboutNarrativeRuntimeConstants.js';
import {
  classifyAboutNarrativeLayoutProfile,
  resolveAboutNarrativePointProfile,
} from './aboutNarrativeProfileResolver.js';
import { createAboutNarrativeRuntimeDiagnostics } from './aboutNarrativeRuntimeDiagnostics.js';
import {
  ABOUT_NARRATIVE_WORKER_PROTOCOL_VERSION,
} from './aboutNarrativeWorkerProtocol.js';
import { validateAboutNarrativeWorkerPublication } from './aboutNarrativeWorkerPublicationValidator.js';
import {
  isAboutNarrativeShortLandscape,
} from './aboutNarrativeMotionMath.js';
import {
  createAboutNarrativeWorldTransformSample,
  resolveAboutNarrativeWorldTransformInto,
} from './aboutNarrativeWorldTransform.js';
import {
  writeAboutNarrativePointFieldSeedPhases,
  writeAboutNarrativePointFieldSpatialPhases,
} from './aboutNarrativePointFieldMotion.js';
import {
  createAboutNarrativePointerPressureController,
  createAboutNarrativePointerPressureSample,
} from './aboutNarrativePointerPressure.js';
import {
  createAboutNarrativeCameraPointerPanController,
  createAboutNarrativeCameraPointerPanSample,
} from './aboutNarrativeCameraPointerPan.js';
import {
  createAboutNarrativeCameraSteadycamController,
  createAboutNarrativeCameraSteadycamSample,
} from './aboutNarrativeCameraSteadycam.js';
import {
  ABOUT_NARRATIVE_LONG_RIDE_BASE_DURATION_WU,
} from './aboutNarrativeLongRideTrack.js';
import {
  findAboutNarrativeWorldById,
  getAboutNarrativeWorldId,
  getAboutNarrativeWorldPairId,
  requireAboutNarrativeWorldId,
  resolveAboutNarrativeWorldAnchorRailZ,
} from './aboutNarrativeWorldIdentity.js';
import { getGlobals } from '../../legacy/modules/core/state.js';
import {
  invalidateSimulationAtmosphereGeometry,
  registerSimulationAtmosphereSource,
  tickSimulationAtmosphere,
} from '../../legacy/modules/rendering/atmosphere/simulation-atmosphere.js';
import {
  getSimulationBodyMaterialAtlas,
  subscribeSimulationBodyMaterial,
} from '../../legacy/modules/rendering/materials/simulation-body-material.js';
import { resolveMobileSimulationBodyScale } from '../../lib/mobileSimulationSizing.js';
import { createRouteMaterialEntranceController } from '../../lib/motion/route-material-entrance.js';
import { ROUTE_ENTRANCE_START_EVENT } from '../../lib/motion/route-entrance-events.js';
import { registerRouteTransitionParticipant } from '../../lib/motion/route-transition-participants.js';
import { isDarkThemeDocument } from '../../lib/theme-state.js';
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
const MATERIAL_POINT_THRESHOLD_PX = 10;
const OCEAN_IMPULSE_AMPLITUDE_WU = 5.8;
const OCEAN_IMPULSE_DURATION_MS = 5200;
const OCEAN_IMPULSE_NEAR_Z = -395.5;
const OCEAN_IMPULSE_DEPTH_WU = 1800;
const OCEAN_DENSITY_RAMP_DEPTH_WU = 140;
const OCEAN_REVEAL_DEPTH_WU = 1100;
const OCEAN_REVEAL_FEATHER_WU = 300;
const POINT_WORLD_CAMERA_FAR_WU = 2400;
const RUNTIME_DIAGNOSTICS_ENABLED = import.meta.env.DEV || __CERTIFY__;
let nextRuntimeInstanceId = 1;
let nextGeometryInstanceId = 1;
const pendingContextLossByCanvas = new WeakMap();

function cancelPendingContextLoss(canvas) {
  const pending = pendingContextLossByCanvas.get(canvas);
  if (!pending) return;
  window.clearTimeout(pending.timeoutId);
  pendingContextLossByCanvas.delete(canvas);
}

function scheduleContextLoss(canvas, renderer) {
  cancelPendingContextLoss(canvas);
  const pending = {
    renderer,
    timeoutId: window.setTimeout(() => {
      if (pendingContextLossByCanvas.get(canvas) !== pending) return;
      pendingContextLossByCanvas.delete(canvas);
      renderer.forceContextLoss();
      canvas.width = 1;
      canvas.height = 1;
    }, 0),
  };
  pendingContextLossByCanvas.set(canvas, pending);
}

function isAboutRouteEntering(root) {
  const documentRoot = root?.ownerDocument?.documentElement;
  const pendingRoute = root?.ownerDocument
    ?.querySelector?.('[data-route-tabs]')
    ?.dataset?.pendingRoute || '';
  return documentRoot?.dataset?.absTransitionPhase === 'route-in'
    && (pendingRoute === 'about' || Boolean(root?.closest?.('[data-shell-route-view="about"]')));
}
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
const pointMotionAxisValue = (axis) => (axis === 'x' ? 0 : axis === 'z' ? 2 : 1);
const pointMotionStaggerModeValue = (mode) => (
  mode === 'random' ? 1 : mode === 'radial' ? 2 : mode === 'axis' ? 3 : 0
);
const pointMotionPathModeValue = (mode) => (
  mode === 'arc' ? 1
    : mode === 'curl' ? 2
      : mode === 'noise' ? 3
        : mode === 'flow' ? 4 : 0
);
const pointMotionFlattenModeValue = (mode) => (
  mode === 'toward-plane' ? 1 : mode === 'from-plane' ? 2 : 0
);
const VERTEX_SHADER = `
  attribute vec3 targetPosition;
  attribute float pointSeed;
  attribute float fromPresence;
  attribute float toPresence;
  attribute float fromPointSize;
  attribute float toPointSize;
  attribute vec2 motionSeedPhases;
  attribute vec4 motionSpatialPhases;
  uniform mat4 fromTransform;
  uniform mat4 toTransform;
  uniform float morphProgress;
  uniform float parametricMotionEnabled;
  uniform float motionStaggerMode;
  uniform float motionStaggerAmount;
  uniform float motionStaggerAxis;
  uniform float motionPathMode;
  uniform float motionPathAmount;
  uniform float motionPathAxis;
  uniform float motionPathFrequency;
  uniform float motionFlattenMode;
  uniform float motionFlattenAmount;
  uniform float motionFlattenAxis;
  uniform float motionFlattenOffset;
  uniform float storyTime;
  uniform float oceanTime;
  uniform float oceanBaseY;
  uniform float oceanDensity;
  uniform float oceanAmplitude;
  uniform float oceanSpeed;
  uniform float oceanChop;
  uniform float oceanPointScale;
  uniform float oceanFogDistanceScale;
  uniform float oceanRevealProgress;
  uniform float oceanStoryOffsetZ;
  uniform float oceanSplashAmount;
  uniform float oceanSplashHeight;
  uniform float oceanImpulseProgress;
  uniform float oceanImpulseAmplitude;
  uniform float structureManifestationAmount;
  uniform float structureAmbientAmount;
  uniform float structureAmbientSpeed;
  uniform float pointSize;
  uniform float fromPointSizeScale;
  uniform float toPointSizeScale;
  uniform float fromResponsivePresence;
  uniform float toResponsivePresence;
  uniform float fromLongAssembly;
  uniform float toLongAssembly;
  uniform float themeDark;
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
  uniform float fromOrbitalWeight;
  uniform float toOrbitalWeight;
  uniform float fromOrbitalSpeed;
  uniform float toOrbitalSpeed;
  uniform float fromOrbitalStoryMix;
  uniform float toOrbitalStoryMix;
  uniform float fromOrbitalRadius;
  uniform float toOrbitalRadius;
  uniform float gridRippleWeight;
  uniform float gridRippleAmplitude;
  uniform float gridRippleSpeed;
  uniform float gridRippleFrequency;
  uniform float gridRippleStoryMix;
  uniform float gridRippleProgress;
  uniform vec2 gridRippleCenter;
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
  uniform vec3 assemblyOrganicColor;
  uniform float materialSlot1;
  uniform float materialSlot2;
  uniform float materialSlot3;
  uniform float materialSlot4;
  uniform float materialSlot5;
  uniform float materialSlot6;
  uniform float materialThreshold1;
  uniform float materialThreshold2;
  uniform float materialThreshold3;
  uniform float materialThreshold4;
  uniform float materialThreshold5;
  uniform float uMaterialPointThresholdPx;
  uniform vec2 pointerPressureNdc;
  uniform vec2 pointerPressureTrailNdc;
  uniform vec2 pointerPressureViewport;
  uniform vec2 pointerPressureVelocityPx;
  uniform vec2 pointerPressureReleaseVelocityPx;
  uniform float pointerPressureRadiusPx;
  uniform float pointerPressureForcePx;
  uniform float pointerPressureVariation;
  uniform float pointerPressureStrength;
  uniform float pointerPressureReleaseProgress;
  uniform float pointerPressureReleaseStrength;
  varying float pointAlpha;
  varying float pointMaterialWeight;
  varying vec3 pointTint;
  varying vec3 pointMaterialBaseColor;
  varying float pointMaterialSlot;
  varying float pointLongAssembly;

  float pointerPressureOrganicField(vec2 pointNdc) {
    float fieldA = sin(dot(pointNdc, vec2(4.1, 3.2)) + 0.7);
    float fieldB = sin(dot(pointNdc, vec2(-2.8, 5.3)) + 2.1);
    return clamp(0.5 + (fieldA * 0.27) + (fieldB * 0.23), 0.0, 1.0);
  }

  float pointerPressureEnvelope(vec2 pointNdc) {
    float organicAmount = clamp(pointerPressureVariation, 0.0, 5.0);
    float organicDrive = organicAmount * (
      1.0 + (max(0.0, organicAmount - 1.0) * 0.35)
    );
    float coherentMaterial = pointerPressureOrganicField(pointNdc);
    float individualMaterial = sin((pointSeed * 131.731) + 0.41);
    float localMass = clamp(
      1.0
        + ((coherentMaterial - 0.5) * organicDrive * 0.28)
        + (individualMaterial * organicAmount * 0.025),
      0.55,
      1.55
    );
    float activeEnvelope = pow(
      clamp(pointerPressureStrength, 0.0, 1.0),
      localMass
    );
    float releaseProgress = clamp(pointerPressureReleaseProgress, 0.0, 1.0);
    float settleStart = clamp(0.72 + ((localMass - 1.0) * 0.18), 0.68, 0.76);
    float settlePhase = smoothstep(settleStart, 1.0, releaseProgress);
    // A very small elastic crossing stops the field from returning as a rigid disc.
    float settleOffset = -sin(settlePhase * 3.14159265)
      * 0.07
      * organicAmount
      * pointerPressureReleaseStrength;
    return activeEnvelope + settleOffset;
  }

  vec2 pointerPressureOffset(
    vec2 pointNdc,
    vec2 pointerNdc,
    float sourceWeight,
    float trailSource
  ) {
    float releaseMix = smoothstep(
      0.0,
      0.18,
      clamp(pointerPressureReleaseProgress, 0.0, 1.0)
    );
    vec2 velocityPx = mix(
      pointerPressureVelocityPx,
      pointerPressureReleaseVelocityPx,
      releaseMix
    );
    float speedPx = length(velocityPx);
    float speedAmount = clamp(speedPx / 1200.0, 0.0, 1.0);
    vec2 velocityDirection = speedPx > 0.001 ? velocityPx / speedPx : vec2(0.0);
    vec2 deltaPx = (
      (pointNdc - pointerNdc) * 0.5 * pointerPressureViewport
    ) + (velocityPx * 0.024 * (1.0 + (trailSource * 0.45)));
    float organicAmount = clamp(pointerPressureVariation, 0.0, 5.0);
    float organicDrive = organicAmount * (
      1.0 + (max(0.0, organicAmount - 1.0) * 0.35)
    );
    float coherentMaterial = pointerPressureOrganicField(pointNdc);
    float materialDirection = (coherentMaterial - 0.5) * 2.0;
    float individualMaterial = sin((pointSeed * 137.17) + 0.41);
    float radiusScale = clamp(
      1.0
        + (materialDirection * organicDrive * 0.12)
        + (individualMaterial * organicAmount * 0.015),
      0.3,
      1.8
    );
    // Shear the influence field itself before measuring distance. This avoids
    // a mathematically circular pressure boundary even while the mouse rests.
    vec2 shearedDeltaPx = vec2(
      deltaPx.x + (deltaPx.y * organicAmount * (0.18 + (materialDirection * 0.08))),
      deltaPx.y * (1.0 + (materialDirection * organicAmount * 0.12))
    );
    float shapedRadius = max(1.0, pointerPressureRadiusPx) * radiusScale;
    float distancePx = length(shearedDeltaPx);
    float influence = 1.0 - smoothstep(0.0, shapedRadius, distancePx);
    float coreSoftnessPx = max(5.0, shapedRadius * 0.05);
    vec2 radialFlow = shearedDeltaPx / sqrt(
      (distancePx * distancePx) + (coreSoftnessPx * coreSoftnessPx)
    );
    vec2 radialDirection = distancePx > 0.001
      ? shearedDeltaPx / distancePx
      : velocityDirection;
    vec2 tangentDirection = vec2(-radialDirection.y, radialDirection.x);
    // Coherent shear and the lagging sample break the perfect circular hole.
    vec2 materialFlow = radialFlow
      + (tangentDirection * materialDirection * organicDrive * 0.24)
      + (velocityDirection * speedAmount * 0.18);
    float forceVariation = 1.0 + (individualMaterial * organicAmount * 0.035);
    return materialFlow
      * pointerPressureForcePx
      * influence
      * forceVariation
      * sourceWeight
      * pointerPressureEnvelope(pointNdc);
  }

  vec4 applyPointerPressure(vec4 clipPoint) {
    if (
      pointerPressureStrength <= 0.000001
      && pointerPressureReleaseStrength <= 0.000001
    ) return clipPoint;
    float safeW = max(abs(clipPoint.w), 0.0001);
    vec2 pointNdc = clipPoint.xy / safeW;
    float trailWeight = 0.32;
    vec2 offsetPx = pointerPressureOffset(
      pointNdc,
      pointerPressureNdc,
      1.0 - trailWeight,
      0.0
    );
    offsetPx += pointerPressureOffset(
      pointNdc,
      pointerPressureTrailNdc,
      trailWeight,
      1.0
    );
    vec2 viewport = max(pointerPressureViewport, vec2(1.0));
    clipPoint.xy += ((offsetPx * 2.0) / viewport) * clipPoint.w;
    return clipPoint;
  }

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

  vec3 rotateZ(vec3 value, float angle) {
    float sine = sin(angle);
    float cosine = cos(angle);
    return vec3(
      (cosine * value.x) - (sine * value.y),
      (sine * value.x) + (cosine * value.y),
      value.z
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
    float clock = storyTime;
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

  vec3 materialColor(float seed) {
    if (seed < materialThreshold1) return materialColor1;
    if (seed < materialThreshold2) return materialColor2;
    if (seed < materialThreshold3) return materialColor3;
    if (seed < materialThreshold4) return materialColor4;
    if (seed < materialThreshold5) return materialColor5;
    return materialColor6;
  }

  float materialSlot(float seed) {
    if (seed < materialThreshold1) return materialSlot1;
    if (seed < materialThreshold2) return materialSlot2;
    if (seed < materialThreshold3) return materialSlot3;
    if (seed < materialThreshold4) return materialSlot4;
    if (seed < materialThreshold5) return materialSlot5;
    return materialSlot6;
  }

  float longAssemblyMaterialClass(float sizeCode) {
    return clamp(floor(((sizeCode - 0.67) / 0.10) + 0.0001), 0.0, 5.0);
  }

  float materialClassMask(float materialClass, float targetClass) {
    return 1.0 - step(0.49, abs(materialClass - targetClass));
  }

  vec3 longAssemblyAtlasBaseColor(float materialClass) {
    if (materialClass < 0.5) return materialColor1;
    if (materialClass < 1.5) return materialColor2;
    if (materialClass < 2.5) return materialColor3;
    if (materialClass < 3.5) return materialColor5;
    if (materialClass < 4.5) return materialColor4;
    return materialColor6;
  }

  float longAssemblyMaterialSlot(float materialClass) {
    if (materialClass < 0.5) return materialSlot1;
    if (materialClass < 1.5) return materialSlot2;
    if (materialClass < 2.5) return materialSlot3;
    if (materialClass < 3.5) return materialSlot5;
    if (materialClass < 4.5) return materialSlot4;
    return materialSlot6;
  }

  vec3 longAssemblyMaterialColor(float materialClass) {
    if (materialClass < 0.5) return materialColor1;
    if (materialClass < 1.5) return materialColor2;
    if (materialClass < 2.5) return materialColor3;
    if (materialClass < 3.5) return materialColor5;
    if (materialClass < 4.5) return materialColor4;
    // Preserve all six authored material colours through the structural ride.
    // Organic points still blend toward the living green through waveWeight
    // below, but their settled colour must match the sixth discipline marker.
    return materialColor6;
  }

  float motionAxisPhase(float axis) {
    if (axis < 0.5) return motionSpatialPhases.y;
    if (axis > 1.5) return motionSpatialPhases.w;
    return motionSpatialPhases.z;
  }

  float resolveParametricProgress(float progress) {
    if (parametricMotionEnabled < 0.5 || progress >= 1.0) return progress;
    float phase = 0.0;
    if (motionStaggerMode > 0.5 && motionStaggerMode < 1.5) {
      phase = motionSeedPhases.x;
    } else if (motionStaggerMode > 1.5 && motionStaggerMode < 2.5) {
      phase = motionSpatialPhases.x;
    } else if (motionStaggerMode > 2.5) {
      phase = motionAxisPhase(motionStaggerAxis);
    }
    float delay = phase * motionStaggerAmount;
    return clamp(
      (progress - delay) / max(0.000001, 1.0 - motionStaggerAmount),
      0.0,
      1.0
    );
  }

  vec3 resolveParametricPath(float progress) {
    if (parametricMotionEnabled < 0.5 || motionPathMode < 0.5
      || motionPathAmount <= 0.0 || progress <= 0.0 || progress >= 1.0) {
      return vec3(0.0);
    }
    float envelope = sin(3.14159265359 * progress) * motionPathAmount;
    if (motionPathMode < 1.5) {
      if (motionPathAxis < 0.5) return vec3(envelope, 0.0, 0.0);
      if (motionPathAxis > 1.5) return vec3(0.0, 0.0, envelope);
      return vec3(0.0, envelope, 0.0);
    }
    float angle = (motionSeedPhases.y * 6.28318530718)
      + (progress * motionPathFrequency * 6.28318530718);
    if (motionPathMode < 2.5) {
      if (motionPathAxis < 0.5) {
        return vec3(0.0, cos(angle) * envelope, sin(angle) * envelope);
      }
      if (motionPathAxis > 1.5) {
        return vec3(cos(angle) * envelope, sin(angle) * envelope, 0.0);
      }
      return vec3(cos(angle) * envelope, 0.0, sin(angle) * envelope);
    }
    if (motionPathMode < 3.5) {
      float primary = sin(angle) * envelope;
      float secondary = sin((angle * 1.37) + 2.1) * envelope;
      float tertiary = cos((angle * 0.83) + 4.2) * envelope;
      if (motionPathAxis < 0.5) return vec3(primary, secondary, tertiary);
      if (motionPathAxis > 1.5) return vec3(secondary, tertiary, primary);
      return vec3(tertiary, primary, secondary);
    }

    // Flow bends spatial neighbours together. It gives each point a curved
    // route without the flicker that independent noise creates at field scale.
    float coherentPhase = mix(
      motionSpatialPhases.x,
      motionAxisPhase(motionPathAxis),
      0.38
    );
    float flowAngle = (coherentPhase * 6.28318530718)
      + (motionSeedPhases.y * 1.38230077)
      + (progress * motionPathFrequency * 3.14159265359);
    float flowPrimary = cos(flowAngle) * envelope;
    float flowSecondary = sin(flowAngle * 0.63) * envelope * 0.42;
    if (motionPathAxis < 0.5) return vec3(0.0, flowPrimary, flowSecondary);
    if (motionPathAxis > 1.5) return vec3(flowPrimary, flowSecondary, 0.0);
    return vec3(flowPrimary, 0.0, flowSecondary);
  }

  float resolvePlaneProgress(float progress) {
    if (parametricMotionEnabled < 0.5 || motionFlattenMode < 0.5
      || motionFlattenAmount <= 0.0) return progress;
    if (motionFlattenMode < 1.5) {
      return progress + (
        (1.0 - pow(1.0 - progress, 3.0) - progress) * motionFlattenAmount
      );
    }
    return progress + ((pow(progress, 3.0) - progress) * motionFlattenAmount);
  }

  vec4 sampleOceanSplash(
    vec2 coordinate,
    vec2 center,
    float cycleOffset,
    float pointHash
  ) {
    float cycle = fract((oceanTime * 0.11) + cycleOffset);
    float eventProgress = clamp(cycle / 0.30, 0.0, 1.0);
    float eventPresence = 1.0 - smoothstep(0.20, 0.32, cycle);
    float distanceFromImpact = length(coordinate - center);
    float ringRadius = mix(0.25, 6.4, eventProgress);
    float ring = (
      1.0 - smoothstep(0.0, 0.62, abs(distanceFromImpact - ringRadius))
    ) * eventPresence;
    float impactCore = 1.0 - smoothstep(0.65, 4.2, distanceFromImpact);
    float dropletGate = step(
      0.76,
      fract((pointHash * 37.17) + (cycleOffset * 13.71))
    );
    float dropletArc = sin(
      clamp(cycle / 0.24, 0.0, 1.0) * 3.14159265359
    ) * (1.0 - smoothstep(0.20, 0.30, cycle));
    float spray = impactCore * dropletGate * dropletArc;
    vec2 radialDirection = (coordinate - center) / max(0.001, distanceFromImpact);
    vec2 radialPush = radialDirection * ring * 0.22;
    float verticalLift = (ring * 0.16) + (spray * oceanSplashHeight);
    return vec4(radialPush.x, verticalLift, radialPush.y, max(ring, spray));
  }

  vec4 sampleOceanImpulse(vec2 coordinate) {
    float depthProgress = clamp(
      (${OCEAN_IMPULSE_NEAR_Z.toFixed(1)} - coordinate.y)
        / ${OCEAN_IMPULSE_DEPTH_WU.toFixed(1)},
      0.0,
      1.0
    );
    float distanceFromFront = depthProgress - oceanImpulseProgress;
    float crest = exp(-pow(distanceFromFront / 0.022, 2.0));
    float wakeDistance = max(0.0, -distanceFromFront);
    float behindFront = 1.0 - smoothstep(-0.006, 0.026, distanceFromFront);
    float wake = sin(wakeDistance * 92.0)
      * exp(-wakeDistance * 11.0)
      * behindFront;
    float lateralVariation = 0.88 + (cos(coordinate.x * 0.035) * 0.12);
    float height = ((crest * 1.0) + (wake * 0.38))
      * oceanImpulseAmplitude
      * lateralVariation;
    float forwardPush = (crest + (abs(wake) * 0.22))
      * oceanImpulseAmplitude
      * 0.18;
    return vec4(0.0, height, -forwardPush, max(crest, abs(wake) * 0.45));
  }

  void main() {
    float authoritativeMorph = clamp(morphProgress, 0.0, 1.0);
    float globalMorph = resolveParametricProgress(authoritativeMorph);
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
    float longAssemblyWeight = mix(fromLongAssembly, toLongAssembly, morph);
    float fromOceanPoint = step(1.5, fromPointSize) * fromLongAssembly;
    float toOceanPoint = step(1.5, toPointSize) * toLongAssembly;
    float oceanWeight = mix(fromOceanPoint, toOceanPoint, morph);
    float oceanSplashEnergy = 0.0;
    float semanticFromSize = fromPointSize - fromOceanPoint;
    float semanticToSize = toPointSize - toOceanPoint;
    float semanticSizeCode = mix(semanticFromSize, semanticToSize, morph);
    float assemblyMaterialClass = longAssemblyMaterialClass(semanticSizeCode);
    float atmosphereMaterial = materialClassMask(assemblyMaterialClass, 0.0);
    float stoneMaterial = materialClassMask(assemblyMaterialClass, 1.0);
    float steelMaterial = materialClassMask(assemblyMaterialClass, 2.0);
    float glassMaterial = materialClassMask(assemblyMaterialClass, 3.0);
    float signalMaterial = materialClassMask(assemblyMaterialClass, 4.0);
    float organicMaterial = materialClassMask(assemblyMaterialClass, 5.0);
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
    float surfaceDeparture = bustRiseProgress * smoothstep(
      bustSurfaceHeight - (waterlineSoftness * 3.0),
      bustSurfaceHeight - (waterlineSoftness * 1.15),
      submergedBust.y
    );
    float surfaceArrival = bustRiseProgress * smoothstep(
      bustSurfaceHeight - (waterlineSoftness * 0.55),
      bustSurfaceHeight + waterlineSoftness,
      submergedBust.y
    );
    vec3 risingWorldPoint = mix(fromWorld, submergedBust, surfaceDeparture);
    vec3 worldPoint = mix(gatheredWorldPoint, risingWorldPoint, bustSurfaceRiseWeight);
    worldPoint.z += oceanStoryOffsetZ * oceanWeight;
    float oceanClock = oceanTime * oceanSpeed;
    vec2 oceanCoordinate = worldPoint.xz;
    float oceanPrimaryPhase = dot(oceanCoordinate, vec2(0.125, 0.058))
      + (oceanClock * 0.68);
    float oceanCrossPhase = dot(oceanCoordinate, vec2(-0.18, 0.115))
      + (oceanClock * 0.94);
    float oceanBreakerPhase = dot(oceanCoordinate, vec2(0.41, 0.255))
      + (oceanClock * 1.48)
      + (sin(oceanPrimaryPhase) * 0.58);
    float oceanBackwashPhase = dot(oceanCoordinate, vec2(-0.32, -0.27))
      - (oceanClock * 1.16)
      + (sin(oceanCrossPhase) * 0.26);
    float oceanRipplePhase = dot(oceanCoordinate, vec2(0.82, 0.54))
      + (oceanClock * 2.36);
    float oceanSwellPhase = dot(oceanCoordinate, vec2(0.029, 0.016))
      + (oceanClock * 0.27)
      + (sin(oceanPrimaryPhase * 0.42) * 0.16);
    float oceanGust = 0.78 + (
      sin(dot(oceanCoordinate, vec2(0.011, -0.017)) + (oceanClock * 0.19))
      * 0.22
    );
    float oceanBreakerShape = sin(oceanBreakerPhase)
      + (sin(oceanBreakerPhase * 2.0) * 0.32)
      + (sin(oceanBreakerPhase * 3.0) * 0.10);
    float oceanBackwashShape = sin(oceanBackwashPhase)
      + (sin(oceanBackwashPhase * 2.0) * 0.18);
    float oceanSurface = (
      (sin(oceanSwellPhase) * 0.52)
      + (sin(oceanPrimaryPhase) * 0.62)
      + (sin(oceanCrossPhase) * 0.34)
      + (oceanBreakerShape * 0.28)
      + (oceanBackwashShape * 0.16)
      + (sin(oceanRipplePhase) * 0.06)
    ) * oceanAmplitude * oceanGust;
    vec2 oceanHorizontal = (
      (vec2(0.89, 0.46) * cos(oceanPrimaryPhase) * 0.64)
      + (vec2(-0.84, 0.54) * cos(oceanCrossPhase) * 0.44)
      + (vec2(0.85, 0.53) * cos(oceanBreakerPhase) * 0.32)
      + (vec2(-0.76, -0.65) * cos(oceanBackwashPhase) * 0.18)
    ) * oceanChop * oceanGust;
    float oceanCrestEnergy = smoothstep(
      oceanAmplitude * 0.34,
      oceanAmplitude * 0.82,
      oceanSurface
    );
    worldPoint.y = mix(worldPoint.y, oceanBaseY + oceanSurface, oceanWeight);
    worldPoint.xz += oceanHorizontal * oceanWeight;
    vec2 oceanLocalCoordinate = vec2(
      worldPoint.x,
      worldPoint.z - oceanStoryOffsetZ
    );
    float oceanLocalDepthWU = max(
      0.0,
      ${OCEAN_IMPULSE_NEAR_Z.toFixed(1)} - oceanLocalCoordinate.y
    );
    float oceanDepthProgress = smoothstep(
      0.0,
      1.0,
      clamp(
        oceanLocalDepthWU / ${OCEAN_DENSITY_RAMP_DEPTH_WU.toFixed(1)},
        0.0,
        1.0
      )
    );
    float oceanDepthDensity = mix(
      clamp(oceanDensity * 0.22, 0.0, 1.0),
      clamp(oceanDensity, 0.0, 1.0),
      oceanDepthProgress
    );
    float oceanDensityPresence = step(
      fract((pointSeed * 197.39) + 0.41),
      oceanDepthDensity
    );
    float oceanRevealFrontWU = mix(
      -${OCEAN_REVEAL_FEATHER_WU.toFixed(1)},
      ${OCEAN_REVEAL_DEPTH_WU.toFixed(1)},
      oceanRevealProgress
    );
    float oceanSpatialReveal = 1.0 - smoothstep(
      oceanRevealFrontWU - ${OCEAN_REVEAL_FEATHER_WU.toFixed(1)},
      oceanRevealFrontWU + (${OCEAN_REVEAL_FEATHER_WU.toFixed(1)} * 0.22),
      oceanLocalDepthWU
    );
    vec4 nearSplash = sampleOceanSplash(
      oceanLocalCoordinate,
      vec2(-5.6, -409.0),
      0.08,
      pointSeed
    );
    vec4 farSplash = sampleOceanSplash(
      oceanLocalCoordinate,
      vec2(6.8, -413.0),
      0.58,
      pointSeed
    );
    vec4 oceanSplash = (nearSplash + farSplash) * oceanSplashAmount;
    worldPoint += oceanSplash.xyz * oceanWeight;
    oceanSplashEnergy = oceanSplash.w * oceanWeight;
    vec4 oceanImpulse = sampleOceanImpulse(oceanLocalCoordinate);
    worldPoint += oceanImpulse.xyz * oceanWeight;
    oceanSplashEnergy = max(oceanSplashEnergy, oceanImpulse.w * oceanWeight);
    oceanSplashEnergy = max(
      oceanSplashEnergy,
      oceanCrestEnergy * oceanWeight * 0.55
    );
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
    // The edited corridor shares one restrained motion field. It keeps every
    // authored structure alive without adding geometry, draw calls, or CPU
    // animation. Ocean points opt out and retain their dedicated wave field.
    driftAmplitude = mix(driftAmplitude, structureAmbientAmount, longAssemblyWeight);
    driftSpeed = mix(driftSpeed, structureAmbientSpeed, longAssemblyWeight);
    driftIrregularity = mix(driftIrregularity, 0.08, longAssemblyWeight);
    driftIndividuality = mix(driftIndividuality, 0.34, longAssemblyWeight);
    driftAxisSpread = mix(driftAxisSpread, 0.82, longAssemblyWeight);
    float driftClock = mix(storyTime, oceanTime, longAssemblyWeight);
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
    float assemblyDriftMask = 1.0 - oceanWeight;
    worldPoint += driftVector
      * driftAmplitude
      * mix(1.0, assemblyDriftMask, longAssemblyWeight);

    float waveWeight = mix(fromWaveWeight, toWaveWeight, morph);
    float waveAmplitude = mix(fromWaveAmplitude, toWaveAmplitude, morph);
    float waveSpeed = mix(fromWaveSpeed, toWaveSpeed, morph);
    float waveStoryMix = mix(fromWaveStoryMix, toWaveStoryMix, morph);
    vec2 waveFrequency = mix(fromWaveFrequency, toWaveFrequency, morph);
    float waveClock = storyTime;
    float waveValue = sin(
      (worldPoint.x * waveFrequency.x)
      + (worldPoint.z * waveFrequency.y)
      + (waveClock * waveSpeed)
    );
    float anchoredStructure = smoothstep(-2.8, 0.8, worldPoint.y);
    float organicHeight = smoothstep(-2.7, 2.6, worldPoint.y);
    float assemblyWaveMask = (atmosphereMaterial * 0.10)
      + (stoneMaterial * 0.055 * anchoredStructure)
      + (steelMaterial * 0.11 * anchoredStructure)
      + (glassMaterial * 0.17 * anchoredStructure)
      + (signalMaterial * 0.34)
      + (organicMaterial * organicHeight);
    float resolvedWaveMask = mix(1.0, assemblyWaveMask, longAssemblyWeight);
    worldPoint.y += waveWeight * waveAmplitude * waveValue * resolvedWaveMask;
    worldPoint.x += waveWeight
      * waveAmplitude
      * 0.28
      * cos((worldPoint.z * waveFrequency.y) + (waveClock * waveSpeed * 0.73))
      * organicMaterial
      * longAssemblyWeight;

    vec2 ripplePoint = worldPoint.xz - gridRippleCenter;
    float rippleDistance = length(ripplePoint);
    vec2 rippleDirection = rippleDistance > 0.0001
      ? ripplePoint / rippleDistance
      : vec2(0.0);
    float rippleClock = storyTime;
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

    float colourWeight = mix(fromLivingColour, toLivingColour, morph);
    float livingBand = 0.5 + (0.5 * sin(
      (worldPoint.x * 0.72) + (worldPoint.z * 0.38) + (storyTime * 0.18)
    ));
    float materialSeed = fract((pointSeed * 43.713) + 0.271);
    vec3 baseColor = materialColor(materialSeed);
    vec3 livingColor = materialColor(fract((materialSeed * 3.17) + 0.37));
    vec3 resolvedMaterialBaseColor = mix(
      baseColor,
      longAssemblyAtlasBaseColor(assemblyMaterialClass),
      longAssemblyWeight
    );
    vec3 resolvedMaterialColor = mix(
      baseColor,
      longAssemblyMaterialColor(assemblyMaterialClass),
      longAssemblyWeight
    );
    pointMaterialBaseColor = resolvedMaterialBaseColor;
    pointLongAssembly = longAssemblyWeight;
    pointMaterialSlot = mix(
      materialSlot(materialSeed),
      longAssemblyMaterialSlot(assemblyMaterialClass),
      longAssemblyWeight
    );
    pointTint = mix(
      resolvedMaterialColor,
      livingColor,
      colourWeight
        * smoothstep(0.72, 0.98, livingBand)
        * mix(0.48, (signalMaterial * 0.34) + (organicMaterial * 0.56), longAssemblyWeight)
    );
    pointTint = mix(
      pointTint,
      assemblyOrganicColor,
      organicMaterial * longAssemblyWeight * smoothstep(0.06, 0.78, waveWeight)
    );
    worldPoint += resolveParametricPath(globalMorph);
    float planeProgress = resolvePlaneProgress(globalMorph);
    float planeWeight = clamp(abs(planeProgress - globalMorph) * 4.0, 0.0, 1.0);
    if (motionFlattenAxis < 0.5) {
      worldPoint.x = mix(worldPoint.x, motionFlattenOffset, planeWeight);
    } else if (motionFlattenAxis > 1.5) {
      worldPoint.z = mix(worldPoint.z, motionFlattenOffset, planeWeight);
    } else {
      worldPoint.y = mix(worldPoint.y, motionFlattenOffset, planeWeight);
    }
    vec4 viewPoint = modelViewMatrix * vec4(worldPoint, 1.0);
    float settledCameraDepth = max(0.0, -viewPoint.z);
    float structureMotionMask = longAssemblyWeight * (1.0 - oceanWeight);
    float manifestationStart = distanceFogStartWU * 0.92;
    float manifestationEnd = max(
      manifestationStart + 0.001,
      distanceFogEndWU * 0.96
    );
    float manifestationWeight = smoothstep(
      manifestationStart,
      manifestationEnd,
      settledCameraDepth
    );
    // Reuse precomputed per-point phases so emergence adds no extra trigonometry.
    vec3 manifestationDirection = vec3(
      (motionSeedPhases.x * 2.0) - 1.0,
      (motionSeedPhases.y * 1.36) - 0.68,
      (fract((motionSeedPhases.x * 1.618) + (motionSeedPhases.y * 0.73)) * 0.84) - 0.42
    );
    // Scatter is strongest where the form first becomes visible through fog,
    // then resolves exactly onto the Blender-authored geometry near camera.
    viewPoint.xyz += manifestationDirection
      * manifestationWeight
      * structureManifestationAmount
      * structureMotionMask;
    float responsiveSeed = fract((pointSeed * 43.17) + 0.23);
    float resolvedFromPresence = fromPresence * step(
      responsiveSeed,
      clamp(fromResponsivePresence, 0.0, 1.0)
    );
    float resolvedToPresence = toPresence * step(
      responsiveSeed,
      clamp(toResponsivePresence, 0.0, 1.0)
    );
    float enteringPoint = (1.0 - step(0.5, resolvedFromPresence))
      * step(0.5, resolvedToPresence);
    float leavingPoint = step(0.5, resolvedFromPresence)
      * (1.0 - step(0.5, resolvedToPresence));
    float entryOrder = fract((pointSeed * 53.37) + 0.11);
    float entryStart = entryOrder * 0.58;
    float entryProgress = smoothstep(entryStart, entryStart + 0.32, globalMorph);
    float exitOrder = fract((pointSeed * 71.83) + 0.29);
    float exitStart = 0.28 + (exitOrder * 0.42);
    float exitProgress = 1.0 - smoothstep(exitStart, exitStart + 0.30, globalMorph);
    gl_Position = applyPointerPressure(projectionMatrix * viewPoint);
    // Density changes are physical size handoffs, not opacity crossfades.
    // Entering points grow from their matched source and leaving points shrink
    // into their matched destination while every continuing point stays solid.
    gl_Position.z += enteringPoint
      * (1.0 - entryProgress)
      * 0.06
      * gl_Position.w;
    float presence = max(resolvedFromPresence, resolvedToPresence);
    presence = mix(
      presence,
      resolvedToPresence * step(0.001, entryProgress),
      enteringPoint
    );
    presence = mix(
      presence,
      resolvedFromPresence * step(0.001, exitProgress),
      leavingPoint
    );
    float materialSizePresence = mix(
      1.0,
      clamp(bustSurfaceCarry, 0.0, 1.0),
      surfaceTransit
    );
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
    materialSizePresence *= mix(1.0, bustFragmentKeep, bustFragment);
    float cameraDepth = max(0.0, -viewPoint.z);
    float distanceFog = smoothstep(
      distanceFogStartWU,
      max(distanceFogStartWU + 0.001, distanceFogEndWU),
      cameraDepth
    );
    float oceanFogEndWU = max(
      distanceFogEndWU,
      distanceFogEndWU * oceanFogDistanceScale
    );
    float oceanDistanceFog = smoothstep(
      distanceFogStartWU * 1.25,
      max(
        (distanceFogStartWU * 1.25) + 0.001,
        oceanFogEndWU
      ),
      cameraDepth
    );
    distanceFog = mix(distanceFog, oceanDistanceFog, oceanWeight);
    // The permanent corridor uses stronger depth concealment than the legacy
    // worlds. Nearby landmarks stay tangible while the next chapter is only a
    // silhouette in the fog.
    float fogFloor = mix(0.38, 0.0, longAssemblyWeight);
    presence *= mix(1.0, fogFloor, distanceFog);
    // Reveal timing and horizon depth are intentionally separate. The ocean
    // stays absent until the closing approach, then opens into a much deeper
    // fog interval so the final frame reads as a vista instead of a thin band.
    presence *= mix(1.0, oceanSpatialReveal, oceanWeight);
    // The near water is deliberately the sparsest part of the field. Density
    // rises toward the horizon, preserving a broad ocean without a foreground
    // wall of particles or any additional geometry and draw calls.
    presence *= mix(1.0, oceanDensityPresence, oceanWeight);
    float assemblyMaterialPresence = (atmosphereMaterial * 0.12)
      + stoneMaterial
      + steelMaterial
      + (glassMaterial * 0.72)
      + signalMaterial
      + organicMaterial;
    assemblyMaterialPresence = mix(assemblyMaterialPresence, 1.0, oceanWeight);
    presence *= mix(1.0, assemblyMaterialPresence, longAssemblyWeight);
    presence *= clamp(simulationVisibility, 0.0, 1.0);
    float sizeWeight = semanticSizeCode
      * mix(1.0, oceanPointScale, oceanWeight)
      * (1.0 + (oceanSplashEnergy * 0.34));
    float assemblyPulse = max(0.0, waveValue)
      * ((signalMaterial * 0.26) + (organicMaterial * 0.38) + (glassMaterial * 0.08));
    float emphasis = 1.0 + (
      waveWeight * mix(0.18, assemblyPulse, longAssemblyWeight)
    );
    // Keep one material-size reference for the complete story. Retain a quiet
    // depth cue without letting distant corridor points become dust.
    float rawPerspectiveScale = 5.5 / max(1.0, -viewPoint.z);
    float perspectiveScale = clamp(mix(1.0, rawPerspectiveScale, 0.42), 0.72, 1.5);
    float worldPointSizeScale = mix(fromPointSizeScale, toPointSizeScale, morph);
    float cssPointSize = pointSize
      * worldPointSizeScale
      * sizeWeight
      * emphasis
      * gridRippleEmphasis
      * perspectiveScale;
    float entranceScale = clamp(sceneEntranceScale, 0.0, 1.0);
    float clampedPointSize = clamp(cssPointSize, mix(6.5, 3.8, longAssemblyWeight), 21.6);
    float centralLight = exp(-abs(viewPoint.x) * 0.075);
    float depthLight = 0.64 + (0.36 * smoothstep(1.8, 9.5, cameraDepth));
    pointTint *= mix(1.0, depthLight * (0.76 + (centralLight * 0.24)), longAssemblyWeight);
    float structuralMaterial = min(1.0, stoneMaterial + steelMaterial + (glassMaterial * 0.45));
    float foregroundOcclusion = (1.0 - smoothstep(1.5, 5.8, cameraDepth))
      * structuralMaterial
      * longAssemblyWeight;
    vec3 foregroundInk = mix(pointTint, materialColor1, 0.28);
    pointTint = mix(pointTint, foregroundInk, foregroundOcclusion * 0.16);
    gl_PointSize = max(0.01, clampedPointSize * entranceScale) * pixelRatio;
    gl_PointSize *= mix(1.0, max(0.01, entryProgress), enteringPoint);
    gl_PointSize *= mix(1.0, max(0.01, exitProgress), leavingPoint);
    gl_PointSize *= max(0.01, materialSizePresence);
    pointAlpha = presence;
    float readableMaterialWeight = smoothstep(
      max(0.0, uMaterialPointThresholdPx - 1.0),
      uMaterialPointThresholdPx + 1.0,
      clampedPointSize
    );
    pointMaterialWeight = readableMaterialWeight;
  }
`;

const FRAGMENT_SHADER = `
  uniform float fieldOpacity;
  uniform float uUseMaterialAtlas;
  uniform sampler2D uMaterialAtlas;
  uniform float uMaterialAtlasCellScale;
  uniform vec2 uMaterialAtlasInset;
  uniform vec2 uMaterialAtlasSpriteScale;
  varying float pointAlpha;
  varying float pointMaterialWeight;
  varying vec3 pointTint;
  varying vec3 pointMaterialBaseColor;
  varying float pointMaterialSlot;
  varying float pointLongAssembly;

  vec3 transferMaterialDepth(vec3 materialSample, vec3 baseColor, vec3 tint) {
    const vec3 lightnessWeights = vec3(0.2126, 0.7152, 0.0722);
    float materialLightness = dot(materialSample, lightnessWeights);
    float baseLightness = dot(baseColor, lightnessWeights);
    vec3 materialChroma = materialSample - vec3(materialLightness);
    vec3 baseChroma = baseColor - vec3(baseLightness);
    return clamp(
      tint
        + vec3(materialLightness - baseLightness)
        + materialChroma
        - baseChroma,
      0.0,
      1.0
    );
  }

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float radius = length(center);
    if (radius > 0.5 || pointAlpha <= 0.001 || fieldOpacity <= 0.001) discard;
    float edge = 1.0 - smoothstep(0.44, 0.5, radius);
    if (uUseMaterialAtlas > 0.5 && pointMaterialWeight > 0.001) {
      vec2 atlasUv = vec2(
        pointMaterialSlot * uMaterialAtlasCellScale
          + uMaterialAtlasInset.x
          + gl_PointCoord.x * uMaterialAtlasSpriteScale.x,
        uMaterialAtlasInset.y + gl_PointCoord.y * uMaterialAtlasSpriteScale.y
      );
      vec4 materialSample = texture2D(uMaterialAtlas, atlasUv);
      if (materialSample.a <= 0.0) discard;
      float sphereWeight = clamp(pointMaterialWeight, 0.0, 1.0);
      vec3 chromaticSphereColor = transferMaterialDepth(
        materialSample.rgb,
        pointMaterialBaseColor,
        pointTint
      );
      const vec3 lightnessWeights = vec3(0.2126, 0.7152, 0.0722);
      float atlasLightness = dot(materialSample.rgb, lightnessWeights);
      float atlasBaseLightness = dot(pointMaterialBaseColor, lightnessWeights);
      vec3 neutralSphereColor = clamp(
        pointTint + vec3(atlasLightness - atlasBaseLightness),
        0.0,
        1.0
      );
      vec3 sphereColor = mix(
        chromaticSphereColor,
        neutralSphereColor,
        clamp(pointLongAssembly, 0.0, 1.0)
      );
      gl_FragColor = vec4(
        mix(pointTint, sphereColor, sphereWeight),
        fieldOpacity * pointAlpha * mix(edge, materialSample.a, sphereWeight)
      );
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      return;
    }
    gl_FragColor = vec4(pointTint, fieldOpacity * pointAlpha * edge);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function getMaterialDistribution(snapshot = getSimulationPaletteSnapshot()) {
  return resolveSimulationColorDistribution(snapshot.distribution)
    .slice(0, MATERIAL_SLOT_COUNT);
}

function syncMaterialPalette(uniforms, snapshot = getSimulationPaletteSnapshot()) {
  const distribution = getMaterialDistribution(snapshot);
  const palette = snapshot.colors;
  const materialColors = [];
  const weights = distribution.map((row) => Number(row.weight));
  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  let cumulative = 0;
  distribution.forEach((row, index) => {
    const colorIndex = Math.max(0, Math.min(7, Math.floor(Number(row.colorIndex) || 0)));
    const color = palette[colorIndex] || palette[0] || '#ffffff';
    materialColors.push(color);
    uniforms[`materialColor${index + 1}`].value.setStyle(color);
    cumulative += weights[index] / total;
    if (index < MATERIAL_SLOT_COUNT - 1) {
      uniforms[`materialThreshold${index + 1}`].value = cumulative;
    }
  });
  return materialColors;
}

function createSimulationBodyAtlasTexture(atlas) {
  const texture = new THREE.CanvasTexture(atlas.canvas);
  // gl_PointCoord.y already runs from the top of each point sprite. Preserve
  // the Canvas atlas orientation so its authored top light stays on top.
  texture.flipY = false;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.premultiplyAlpha = false;
  if ('colorSpace' in texture) texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function syncSimulationBodyAtlasSlots(uniforms, atlas, colors) {
  for (let index = 0; index < MATERIAL_SLOT_COUNT; index += 1) {
    uniforms[`materialSlot${index + 1}`].value = atlas?.getSlot(colors[index]) ?? 0;
  }
}

function applySimulationBodyAtlas(material, atlas, texture) {
  material.uniforms.uUseMaterialAtlas.value = atlas && texture ? 1 : 0;
  material.uniforms.uMaterialAtlas.value = texture;
  if (!atlas) return;
  material.uniforms.uMaterialAtlasCellScale.value = atlas.cellStridePx / atlas.widthPx;
  material.uniforms.uMaterialAtlasInset.value.set(
    atlas.gutterPx / atlas.widthPx,
    atlas.gutterPx / atlas.heightPx,
  );
  material.uniforms.uMaterialAtlasSpriteScale.value.set(
    atlas.detailPx / atlas.widthPx,
    atlas.detailPx / atlas.heightPx,
  );
}

function createEmptyAttribute(count, value = 0) {
  return new Float32Array(count).fill(value);
}

function shapeCacheKey(world, quality, layoutProfile) {
  return JSON.stringify([
    world?.shapeId,
    world?.seed,
    quality,
    layoutProfile,
    world?.shapeParameters || {},
  ]);
}

function writeWorldTransform(
  target,
  world,
  globals,
  compact,
  shortLandscape,
  inlineSize,
  scratch,
) {
  if (!world) return target.identity();
  const resolved = resolveAboutNarrativeWorldTransformInto(
    world,
    {
      inlineSize,
      compact,
      shortLandscape,
      anchorRailZ: resolveAboutNarrativeWorldAnchorRailZ(world, globals),
    },
    scratch.worldTransform,
  );
  scratch.position.set(
    resolved.position[0],
    resolved.position[1],
    resolved.position[2],
  );
  scratch.euler.set(
    resolved.rotation[0],
    resolved.rotation[1],
    resolved.rotation[2],
    'YXZ',
  );
  scratch.quaternion.setFromEuler(scratch.euler);
  scratch.scale.set(resolved.xScale, resolved.scale, resolved.scale);
  return target.compose(scratch.position, scratch.quaternion, scratch.scale);
}

function createTransformScratch() {
  return {
    position: new THREE.Vector3(),
    quaternion: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    euler: new THREE.Euler(0, 0, 0, 'YXZ'),
    worldTransform: createAboutNarrativeWorldTransformSample(),
  };
}

function createPointFieldAdapter({
  canvas,
  root,
  interaction,
  runtimeRef,
  pointProfile: explicitPointProfile,
  layoutProfile: explicitLayoutProfile,
}) {
  // React can recreate this effect synchronously when the measured point
  // profile changes. Reuse that canvas context instead of destroying it
  // between the cleanup and replacement setup.
  cancelPendingContextLoss(canvas);
  const runtimeInstanceId = nextRuntimeInstanceId;
  nextRuntimeInstanceId += 1;
  const initialBounds = root.getBoundingClientRect();
  const layoutProfile = explicitLayoutProfile || classifyAboutNarrativeLayoutProfile({
    inlineSize: initialBounds.width || window.innerWidth,
    blockSize: initialBounds.height || window.innerHeight,
  });
  const quality = explicitPointProfile || resolveAboutNarrativePointProfile(layoutProfile);
  const compact = quality === 'mobile';
  const responsiveLayoutProfile = layoutProfile;
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
  // The camera frustum must end beyond the complete ocean reserve. Visible
  // depth is owned by the smooth shader fog; a short geometric far plane
  // makes animated wave points pop as they cross that hard boundary.
  const camera = new THREE.PerspectiveCamera(48, 1, 0.08, POINT_WORLD_CAMERA_FAR_WU);
  const geometry = new THREE.BufferGeometry();
  const geometryInstanceId = nextGeometryInstanceId;
  nextGeometryInstanceId += 1;
  const seeds = createAboutNarrativeSeeds(pointCount, 0x1e35a7bd);
  const emptyPositions = new Float32Array(pointCount * 3);
  const emptyPresence = createEmptyAttribute(pointCount, 1);
  const emptySize = createEmptyAttribute(pointCount, 1);
  const uniforms = {
    fromTransform: { value: new THREE.Matrix4() },
    toTransform: { value: new THREE.Matrix4() },
    morphProgress: { value: 0 },
    parametricMotionEnabled: { value: 0 },
    motionStaggerMode: { value: 0 },
    motionStaggerAmount: { value: 0 },
    motionStaggerAxis: { value: 1 },
    motionPathMode: { value: 0 },
    motionPathAmount: { value: 0 },
    motionPathAxis: { value: 1 },
    motionPathFrequency: { value: 1 },
    motionFlattenMode: { value: 0 },
    motionFlattenAmount: { value: 0 },
    motionFlattenAxis: { value: 1 },
    motionFlattenOffset: { value: 0 },
    storyTime: { value: 0 },
    oceanTime: { value: 0 },
    oceanBaseY: { value: -6.2 },
    oceanDensity: { value: 0.9 },
    oceanAmplitude: { value: 2.05 },
    oceanSpeed: { value: 1.04 },
    oceanChop: { value: 1.08 },
    oceanPointScale: { value: 1.18 },
    oceanFogDistanceScale: { value: 24 },
    oceanRevealProgress: { value: 0 },
    oceanStoryOffsetZ: { value: 0 },
    oceanSplashAmount: { value: 1.2 },
    oceanSplashHeight: { value: 4.4 },
    oceanImpulseProgress: { value: 0 },
    oceanImpulseAmplitude: { value: 0 },
    structureManifestationAmount: { value: 0.72 },
    structureAmbientAmount: { value: 0.055 },
    structureAmbientSpeed: { value: 0.28 },
    pointSize: { value: 5.4 },
    fromPointSizeScale: { value: 1 },
    toPointSizeScale: { value: 1 },
    fromResponsivePresence: { value: 1 },
    toResponsivePresence: { value: 1 },
    fromLongAssembly: { value: 0 },
    toLongAssembly: { value: 0 },
    themeDark: { value: 0 },
    pixelRatio: { value: 1 },
    simulationVisibility: { value: 1 },
    sceneEntranceScale: {
      value: entranceAlreadyComplete ? 1 : 0,
    },
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
    fromOrbitalWeight: { value: 0 },
    toOrbitalWeight: { value: 0 },
    fromOrbitalSpeed: { value: 0 },
    toOrbitalSpeed: { value: 0 },
    fromOrbitalStoryMix: { value: 1 },
    toOrbitalStoryMix: { value: 1 },
    fromOrbitalRadius: { value: 5.8 },
    toOrbitalRadius: { value: 5.8 },
    gridRippleWeight: { value: 0 },
    gridRippleAmplitude: { value: 0 },
    gridRippleSpeed: { value: 0 },
    gridRippleFrequency: { value: 1 },
    gridRippleStoryMix: { value: 0 },
    gridRippleProgress: { value: 0 },
    gridRippleCenter: { value: new THREE.Vector2() },
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
    assemblyOrganicColor: { value: new THREE.Color('#00866b') },
    materialSlot1: { value: 0 },
    materialSlot2: { value: 0 },
    materialSlot3: { value: 0 },
    materialSlot4: { value: 0 },
    materialSlot5: { value: 0 },
    materialSlot6: { value: 0 },
    materialThreshold1: { value: 0.31 },
    materialThreshold2: { value: 0.44 },
    materialThreshold3: { value: 0.60 },
    materialThreshold4: { value: 0.80 },
    materialThreshold5: { value: 0.90 },
    uMaterialPointThresholdPx: { value: MATERIAL_POINT_THRESHOLD_PX },
    pointerPressureNdc: { value: new THREE.Vector2() },
    pointerPressureTrailNdc: { value: new THREE.Vector2() },
    pointerPressureViewport: { value: new THREE.Vector2(1, 1) },
    pointerPressureVelocityPx: { value: new THREE.Vector2() },
    pointerPressureReleaseVelocityPx: { value: new THREE.Vector2() },
    pointerPressureRadiusPx: { value: 0 },
    pointerPressureForcePx: { value: 0 },
    pointerPressureVariation: { value: 0 },
    pointerPressureStrength: { value: 0 },
    pointerPressureReleaseProgress: { value: 1 },
    pointerPressureReleaseStrength: { value: 0 },
    fieldOpacity: { value: 0.96 },
    uUseMaterialAtlas: { value: 0 },
    uMaterialAtlas: { value: null },
    uMaterialAtlasCellScale: { value: 1 },
    uMaterialAtlasInset: { value: new THREE.Vector2() },
    uMaterialAtlasSpriteScale: { value: new THREE.Vector2(1, 1) },
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
    motionSeedPhases: new THREE.BufferAttribute(new Float32Array(pointCount * 2), 2).setUsage(THREE.DynamicDrawUsage),
    motionSpatialPhases: new THREE.BufferAttribute(new Float32Array(pointCount * 4), 4).setUsage(THREE.DynamicDrawUsage),
  });
  Object.entries(fixedAttributes).forEach(([name, attribute]) => geometry.setAttribute(name, attribute));
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);

  resourceLedger?.retain('fixed-attributes', fixedAttributes);
  if (resourceLedger) diagnostics.recordLifecycle('resource-ledger-ready');
  const persistentCache = createAboutNarrativePersistentCacheLease();
  const shapeCache = persistentCache.shapeDiagnostics;
  const sequenceCache = persistentCache.sequenceDiagnostics;
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
  let rendererPrepared = false;
  let width = 1;
  let height = 1;
  let latestFrame = null;
  let oceanImpulseStartedAt = Number.NEGATIVE_INFINITY;
  let oceanImpulseGeneration = 0;
  const finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
  const pointerPressure = createAboutNarrativePointerPressureController({
    initialNowMs: performance.now(),
  });
  const pointerPressureSample = createAboutNarrativePointerPressureSample();
  const cameraPointerPan = createAboutNarrativeCameraPointerPanController({
    initialNowMs: performance.now(),
  });
  const cameraPointerPanSample = createAboutNarrativeCameraPointerPanSample();
  const cameraPointerPanEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  const cameraPointerPanQuaternion = new THREE.Quaternion();
  const cameraSteadycam = createAboutNarrativeCameraSteadycamController({
    initialNowMs: performance.now(),
  });
  const cameraSteadycamSample = createAboutNarrativeCameraSteadycamSample();
  let routeMaterialOnly = false;
  let materialAtlasKey = '';
  let materialAtlasTexture = null;
  const atmosphereEligible = Boolean(document.getElementById('simulation-atmosphere-glow-canvas'));
  let atmosphereSourceCleanup = null;
  let atmosphereSourceKind = '';
  const syncAtmosphereSource = () => {
    if (!atmosphereEligible || disposed) return;
    const visibility = Number(latestFrame?.simulation?.visibility ?? 0);
    const nextKind = !contextAvailable
      ? 'ambient'
      : visibility > 0.001 ? 'canvas' : 'none';
    if (nextKind === atmosphereSourceKind) return;
    atmosphereSourceCleanup?.();
    atmosphereSourceCleanup = null;
    atmosphereSourceKind = nextKind;
    // Visibility is authoritative for the complete point material. Unregister
    // once it reaches zero even though the compatibility ambient source is
    // transparent, so diagnostics still reflect the authored material state.
    if (nextKind === 'none') return;
    const canvasSource = nextKind === 'canvas';
    atmosphereSourceCleanup = registerSimulationAtmosphereSource({
      id: canvasSource ? 'about:narrative-world' : 'about:ambient',
      routeId: 'about',
      kind: canvasSource ? 'canvas' : 'ambient',
      canvas: canvasSource ? canvas : null,
      viewportElement: canvasSource ? canvas : null,
      scheduler: canvasSource ? 'renderer-coupled' : 'internal',
      opacityElement: canvasSource ? canvas : null,
    });
  };
  syncAtmosphereSource();
  root.dataset.aboutEntranceState = entranceAlreadyComplete ? 'complete' : 'staged';
  root.dataset.aboutEntranceScale = entranceAlreadyComplete ? '1.0000' : '0.0000';
  delete root.dataset.aboutSceneReady;

  const routeMaterialTarget = Object.freeze({ kind: 'about-point-field' });
  const routeMaterial = createRouteMaterialEntranceController({
    id: 'about-point-field-material',
    routeId: 'about',
    diagnosticRoot: root,
    getTargets: () => [routeMaterialTarget],
    setTargetScale: (target, scale, index, detail) => {
      uniforms.sceneEntranceScale.value = scale;
      root.dataset.aboutEntranceScale = scale.toFixed(4);
      root.dataset.aboutEntranceState = detail?.phase === 'exiting'
        ? 'exiting'
        : (scale >= 0.999 ? 'complete' : detail?.phase || 'staged');
    },
    requestRender: () => {
      if (!contextAvailable || !sceneReady || document.hidden) return;
      renderer.render(scene, camera);
      if (atmosphereSourceKind === 'canvas') {
        tickSimulationAtmosphere(performance.now(), 'about:narrative-world');
      }
    },
    getReducedMotion: () => Boolean(latestFrame?.reducedMotion),
  });
  const resumeRouteEntrance = !entranceAlreadyComplete && isAboutRouteEntering(root);
  if (entranceAlreadyComplete) routeMaterial.settle('adapter-restored');
  else routeMaterial.prepare();
  const unregisterRouteMaterialParticipant = registerRouteTransitionParticipant({
    id: `about-point-field-material-${runtimeInstanceId}`,
    routeId: 'about',
    prepare: ({ signal }) => {
      routeMaterialOnly = false;
      return routeMaterial.prepare({
        signal,
        reducedMotion: Boolean(latestFrame?.reducedMotion),
      });
    },
    exit: ({ signal }) => {
      // During route-out the shared material controller is the only visual
      // owner. Suspending the full narrative hot frame keeps its short shrink
      // animation responsive even after a long About session.
      routeMaterialOnly = true;
      return routeMaterial.exit({
        signal,
        reducedMotion: Boolean(latestFrame?.reducedMotion),
      });
    },
    enter: ({ signal }) => {
      routeMaterialOnly = false;
      return routeMaterial.enter({
        signal,
        reducedMotion: Boolean(latestFrame?.reducedMotion),
      });
    },
    restore: () => {
      routeMaterialOnly = false;
      return routeMaterial.settle('route-restored');
    },
    cancel: ({ reason }) => {
      routeMaterialOnly = false;
      return routeMaterial.cancel(reason);
    },
  });
  if (resumeRouteEntrance) {
    void routeMaterial.enter({ reducedMotion: Boolean(latestFrame?.reducedMotion) });
  }

  const handleRouteEntranceStart = (event) => {
    const routeId = event?.detail?.routeId || '';
    if (routeId !== 'about') return;
    if (event?.detail?.mode !== 'direct') return;
    routeMaterialOnly = false;
    void routeMaterial.enter({ reducedMotion: Boolean(latestFrame?.reducedMotion) });
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
  let dragging = false;
  let dragStart = null;
  const fromTransformScratch = createTransformScratch();
  const toTransformScratch = createTransformScratch();
  const correspondenceFromTransform = new THREE.Matrix4();
  const correspondenceToTransform = new THREE.Matrix4();
  const correspondenceFromScratch = createTransformScratch();
  const correspondenceToScratch = createTransformScratch();
  let lastMotionSegmentId = '';
  let lastMotionStaggerSeed = Number.NaN;
  let lastMotionPathSeed = Number.NaN;
  let lastSimulationVisibility = Number.NaN;
  let lastBustShaderYaw = Number.NaN;
  let lastInteractionEnabled = null;
  let lastWorldStage = '';
  let lastBustStyleYaw = Number.NaN;
  const getComposerEffectIndex = (frame, world, effectId) => {
    const stateId = getAboutNarrativeWorldId(world);
    const active = frame?.composerEffects?.active || [];
    for (let index = 0; index < active.length; index += 1) {
      const clip = active[index];
      if (clip.targetStateId === stateId && clip.parameters?.effectId === effectId) return index;
    }
    return -1;
  };
  const getComposerEffect = (frame, world, effectId) => {
    const index = getComposerEffectIndex(frame, world, effectId);
    return index < 0 ? null : frame.composerEffects.active[index].parameters;
  };
  const getComposerEffectWeight = (frame, world, effectId) => {
    const index = getComposerEffectIndex(frame, world, effectId);
    return index < 0 ? 0 : Number(frame.composerEffects.weight[index] || 0);
  };

  const updateTheme = () => {
    const snapshot = getSimulationPaletteSnapshot();
    const materialColors = syncMaterialPalette(uniforms, snapshot);
    const organicColorIndex = String(snapshot.paletteId || '').startsWith('rye') ? 1 : 3;
    uniforms.assemblyOrganicColor.value.setStyle(
      snapshot.colors[organicColorIndex] || '#00866b',
    );
    const materialTheme = isDarkThemeDocument(root.ownerDocument) ? 'dark' : 'light';
    uniforms.themeDark.value = materialTheme === 'dark' ? 1 : 0;
    const nextAtlas = getSimulationBodyMaterialAtlas(materialColors, { theme: materialTheme });
    const nextAtlasKey = nextAtlas?.key || 'flat';
    syncSimulationBodyAtlasSlots(uniforms, nextAtlas, materialColors);
    if (nextAtlasKey !== materialAtlasKey) {
      const previousTexture = materialAtlasTexture;
      const nextTexture = nextAtlas ? createSimulationBodyAtlasTexture(nextAtlas) : null;
      materialAtlasKey = nextAtlasKey;
      materialAtlasTexture = nextTexture;
      applySimulationBodyAtlas(material, nextAtlas, nextTexture);
      previousTexture?.dispose();
    }
    root.dataset.aboutPointMaterialFinish = nextAtlas
      ? 'cached-sphere-sticker'
      : 'flat-fill';
    root.dataset.aboutPointMaterialPolicy = nextAtlas
      ? 'meaningful-size-threshold'
      : 'flat-fill';
    root.dataset.aboutPointMaterialThresholdPx = String(MATERIAL_POINT_THRESHOLD_PX);
    root.dataset.simulationPaletteGeneration = String(snapshot.generation);
    root.dataset.simulationPaletteId = snapshot.paletteId;
  };

  const resize = () => {
    const canvasRect = canvas.getBoundingClientRect();
    width = Math.max(1, canvasRect.width);
    height = Math.max(1, canvasRect.height);
    // Pointer coordinates use this cached geometry. Pointermove never forces a
    // layout read, which keeps the input path independent from the render path.
    pointerPressure.setViewport(canvasRect.left, canvasRect.top, width, height);
    cameraPointerPan.setViewport(canvasRect.left, canvasRect.top, width, height);
    const wasShortLandscape = shortLandscape;
    shortLandscape = isAboutNarrativeShortLandscape({
      layoutProfile: responsiveLayoutProfile,
      width,
      height,
    });
    const ratio = Math.min(window.devicePixelRatio || 1, pointProfile.maximumPixelRatio);
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    invalidateSimulationAtmosphereGeometry();
    uniforms.pixelRatio.value = ratio;
    if (wasShortLandscape !== shortLandscape && lastPreparationRequest) {
      preparePlan(lastPreparationRequest);
    }
  };

  const pendingShapePreparations = new Map();
  const getShape = async (world, signal) => {
    const key = shapeCacheKey(world, quality, responsiveLayoutProfile);
    const cached = persistentCache.getShape(key);
    if (cached) return cached;
    const pending = pendingShapePreparations.get(key);
    if (pending) return pending;
    const worldSeeds = createAboutNarrativeSeeds(pointCount, world.seed);
    const promise = generateAboutNarrativeShape({
      shapeId: world.shapeId,
      pointCount,
      seeds: worldSeeds,
      quality,
      layoutProfile: responsiveLayoutProfile,
      parameters: world.shapeParameters,
      signal,
    });
    const tracked = promise.then((output) => (
      disposed ? output : persistentCache.storeShape(key, output)
    )).finally(() => {
      if (pendingShapePreparations.get(key) === tracked) {
        pendingShapePreparations.delete(key);
      }
    });
    pendingShapePreparations.set(key, tracked);
    return tracked;
  };

  const assertInstallOutput = (output, label) => {
    const expectedPositionLength = pointCount * 3;
    if (!(output?.positions instanceof Float32Array) || output.positions.length !== expectedPositionLength
      || !(output?.presence instanceof Float32Array) || output.presence.length !== pointCount
      || !(output?.size instanceof Float32Array) || output.size.length !== pointCount) {
      throw new Error(`${label} has invalid fixed point buffers.`);
    }
    const arrays = [output.positions, output.presence, output.size];
    arrays.forEach((array) => {
      for (let index = 0; index < array.length; index += 1) {
        if (!Number.isFinite(array[index])) throw new Error(`${label} contains a non-finite point value.`);
      }
    });
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
    writeAboutNarrativePointFieldSpatialPhases(
      fixedAttributes.targetPosition.array,
      fixedAttributes.motionSpatialPhases.array,
    );
    Object.entries(fixedAttributes).forEach(([name, attribute]) => {
      if (name !== 'pointSeed') attribute.needsUpdate = true;
    });
    resourceLedger?.releaseOwner('installed-pair');
    resourceLedger?.retain('installed-pair', [pair.fromOutput, pair.toOutput]);
    installedPair = { ...pair, progress: 0 };
    root.dataset.pointAsset = pair.toOutput.fallbackReason
      ? 'procedural-fallback'
      : pair.toOutput.assetId || pair.toWorld.shapeId;
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

  const updatePointTransitionMotion = (frame) => {
    const enabled = frame.world?.parametricMotion === true && !frame.reducedMotion;
    const transition = frame.world?.transition;
    const stagger = transition?.stagger;
    const path = transition?.path;
    const flatten = transition?.flatten;
    uniforms.parametricMotionEnabled.value = enabled ? 1 : 0;
    uniforms.motionStaggerMode.value = pointMotionStaggerModeValue(stagger?.mode);
    uniforms.motionStaggerAmount.value = Number(stagger?.amount || 0);
    uniforms.motionStaggerAxis.value = pointMotionAxisValue(stagger?.axis);
    uniforms.motionPathMode.value = pointMotionPathModeValue(path?.mode);
    uniforms.motionPathAmount.value = Number(path?.amount || 0);
    uniforms.motionPathAxis.value = pointMotionAxisValue(path?.axis);
    uniforms.motionPathFrequency.value = Number(path?.frequency || 1);
    uniforms.motionFlattenMode.value = pointMotionFlattenModeValue(flatten?.mode);
    uniforms.motionFlattenAmount.value = Number(flatten?.amount || 0);
    uniforms.motionFlattenAxis.value = pointMotionAxisValue(flatten?.axis);
    uniforms.motionFlattenOffset.value = Number(flatten?.offset || 0);
    const staggerSeed = Number(stagger?.seed || 0);
    const pathSeed = Number(path?.seed || 0);
    const segmentId = frame.world?.segmentId || '';
    if (segmentId === lastMotionSegmentId
      && staggerSeed === lastMotionStaggerSeed
      && pathSeed === lastMotionPathSeed) return;
    lastMotionSegmentId = segmentId;
    lastMotionStaggerSeed = staggerSeed;
    lastMotionPathSeed = pathSeed;
    writeAboutNarrativePointFieldSeedPhases(
      fixedAttributes.pointSeed.array,
      staggerSeed,
      pathSeed,
      fixedAttributes.motionSeedPhases.array,
    );
    fixedAttributes.motionSeedPhases.needsUpdate = true;
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
        readySequence = persistentCache.storeSequence(request.sequenceKey, prepared);
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
    const cached = persistentCache.getSequence(responsiveSequenceKey);
    if (cached) {
      readySequence = cached;
      preparationController.adoptReady({
        sequenceKey: responsiveSequenceKey,
        pairId: `sequence:${responsiveSequenceKey}`,
        inputFingerprint: responsiveInputFingerprint,
        input: null,
      }, null, { trigger: 'document-cache' });
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
        width,
        index === 0 ? correspondenceFromScratch : correspondenceToScratch,
      ).elements.slice(),
      shapeId: world.shapeId,
      seed: world.seed,
      // Workers prepare the lasting sequence after the synchronous bootstrap.
      // Carry the responsive profile inside their JSON-safe Shape parameters
      // so both paths produce identical compact gate geometry.
      parameters: {
        ...(world.shapeParameters || {}),
        responsiveLayoutProfile,
      },
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

  const setModifierUniforms = (target, world, globals, frame) => {
    const authoredSwarm = getComposerEffect(frame, world, 'swarm-life-v1');
    const authoredSwarmWeight = getComposerEffectWeight(frame, world, 'swarm-life-v1');
    const sharedSwarm = authoredSwarm
      ? resolveAboutNarrativeSwarmMotion(authoredSwarm, globals.swarmTurbulence)
      : null;
    const drift = sharedSwarm
      || getComposerEffect(frame, world, 'ambient-drift-v1');
    const driftWeight = sharedSwarm
      ? authoredSwarmWeight
      : getComposerEffectWeight(frame, world, 'ambient-drift-v1');
    const wave = getComposerEffect(frame, world, 'living-wave-v1');
    const waveWeight = getComposerEffectWeight(frame, world, 'living-wave-v1');
    const orbital = getComposerEffect(frame, world, 'orbital-life-v1');
    const orbitalWeight = getComposerEffectWeight(frame, world, 'orbital-life-v1');
    const colour = getComposerEffect(frame, world, 'living-colour-v1');
    const colourWeight = getComposerEffectWeight(frame, world, 'living-colour-v1');
    // Effect attack/release envelopes are sampled once by the Composer. Apply
    // that weight here so adjacent Form motion eases to zero instead of
    // snapping when ownership changes.
    target.driftAmplitude.value = drift
      ? Number(drift.amplitude || 0) * driftWeight
      : 0;
    target.driftSpeed.value = Number(drift?.speed ?? 0);
    target.driftIrregularity.value = Number(sharedSwarm?.irregularity || 0);
    target.driftIndividuality.value = Number(sharedSwarm?.individuality || 0);
    target.driftAxisSpread.value = Number(sharedSwarm?.axisSpread || 0);
    target.driftStoryMix.value = drift ? 1 : 0;
    target.waveWeight.value = wave ? Number(wave.strength ?? 1) * waveWeight : 0;
    target.waveAmplitude.value = Number(wave?.amplitude || 0);
    target.waveSpeed.value = Number(wave?.speed || 0);
    target.waveStoryMix.value = wave ? 1 : 0;
    target.waveFrequency.value.set(
      Number(wave?.frequencyX || 1),
      Number(wave?.frequencyZ || 1),
    );
    target.orbitalWeight.value = Number(orbital?.strength || 0) * orbitalWeight;
    target.orbitalSpeed.value = Number(orbital?.speed || 0);
    target.orbitalStoryMix.value = orbital ? 1 : 0;
    target.orbitalRadius.value = Number(world?.shapeParameters?.orbitRadius ?? 5.8);
    target.livingColour.value = Number(colour?.strength || 0) * colourWeight;
  };

  const updatePointerPressure = (frame, nowMs) => {
    const pointMaterial = frame?.globals?.pointMaterial;
    pointerPressure.configure(pointMaterial);
    const requestedVisibility = Number(frame?.simulation?.visibility ?? 0);
    const materialVisible = Boolean(frame)
      && Number.isFinite(requestedVisibility)
      && requestedVisibility > 0.001;
    pointerPressure.sampleInto(
      pointerPressureSample,
      nowMs,
      Boolean(frame?.reducedMotion),
      materialVisible,
      document.hidden,
      finePointerQuery.matches,
    );
    uniforms.pointerPressureNdc.value.set(
      pointerPressureSample.x,
      pointerPressureSample.y,
    );
    uniforms.pointerPressureTrailNdc.value.set(
      pointerPressureSample.trailX,
      pointerPressureSample.trailY,
    );
    uniforms.pointerPressureViewport.value.set(width, height);
    uniforms.pointerPressureVelocityPx.value.set(
      pointerPressureSample.velocityX,
      pointerPressureSample.velocityY,
    );
    uniforms.pointerPressureReleaseVelocityPx.value.set(
      pointerPressureSample.releaseVelocityX,
      pointerPressureSample.releaseVelocityY,
    );
    uniforms.pointerPressureRadiusPx.value = pointerPressureSample.radiusPx;
    uniforms.pointerPressureForcePx.value = pointerPressureSample.forcePx;
    uniforms.pointerPressureVariation.value = pointerPressureSample.variation;
    uniforms.pointerPressureStrength.value = pointerPressureSample.strength;
    uniforms.pointerPressureReleaseProgress.value = pointerPressureSample.releaseProgress;
    uniforms.pointerPressureReleaseStrength.value = pointerPressureSample.releaseStrength;
  };

  const render = (frame) => {
    latestFrame = frame;
    const renderNowMs = performance.now();
    // Sample before any visibility return. This guarantees the finite release
    // reaches exact zero even if the authored field fades out mid-settle.
    updatePointerPressure(frame, renderNowMs);
    cameraPointerPan.configure(frame?.globals?.camera);
    cameraPointerPan.sampleInto(
      cameraPointerPanSample,
      renderNowMs,
      Boolean(frame?.reducedMotion),
      document.hidden,
      finePointerQuery.matches,
    );
    syncAtmosphereSource();
    if (routeMaterialOnly) return;
    if (!frame || !contextAvailable || document.hidden) return;
    if (!rendererPrepared) return;
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
    const transitionProgress = pairMatchesRequest
      ? frame.world.transitionProgress
      : installedPair.progress;
    if (pairMatchesRequest) installedPair.progress = transitionProgress;
    const bustEffectIndex = getComposerEffectIndex(frame, toWorld, 'bust-yaw-v1');
    const bust = bustEffectIndex < 0
      ? null
      : frame.composerEffects.active[bustEffectIndex].parameters;
    const formingBust = toWorld.shapeId === 'bust-v1' && transitionProgress < 0.9999;
    bustSampleInput.active = toWorld.shapeId === 'bust-v1';
    bustSampleInput.transitionProgress = transitionProgress;
    bustSampleInput.deltaSeconds = 0;
    bustSampleInput.speed = 0;
    bustSampleInput.resumeDelay = Number(bust?.resumeDelay || 0);
    bustSampleInput.liveAmbient = false;
    bustSampleInput.deterministicScrub = true;
    bustSampleInput.reducedMotion = frame.reducedMotion;
    bustSampleInput.hidden = document.hidden;
    const bustState = bustController.sample(bustSampleInput);
    const authoredBustYaw = bust && !frame.reducedMotion
      ? Number(frame.composerEffects.elapsedWU[bustEffectIndex] || 0)
        * Math.max(0, Number(bust.speed || 0))
      : 0;
    bustYaw = Math.abs(bustState.yaw) > 0.000001 ? bustState.yaw : authoredBustYaw;
    if (toWorld.shapeId !== 'bust-v1' && dragStart) {
      if (interaction.hasPointerCapture(dragStart.pointerId)) {
        interaction.releasePointerCapture(dragStart.pointerId);
      }
      dragStart = null;
      dragging = false;
    }

    cameraSteadycam.configure(frame.globals?.camera);
    cameraSteadycam.sampleInto(
      cameraSteadycamSample,
      frame.camera.position,
      frame.camera.quaternion,
      renderNowMs,
      Boolean(frame.reducedMotion) || document.hidden,
    );
    camera.position.fromArray(cameraSteadycamSample.position);
    camera.quaternion.fromArray(cameraSteadycamSample.quaternion);
    if (cameraPointerPanSample.active) {
      cameraPointerPanEuler.set(
        THREE.MathUtils.degToRad(cameraPointerPanSample.pitchDegrees),
        THREE.MathUtils.degToRad(cameraPointerPanSample.yawDegrees),
        0,
        'YXZ',
      );
      cameraPointerPanQuaternion.setFromEuler(cameraPointerPanEuler);
      camera.quaternion.multiply(cameraPointerPanQuaternion);
    }
    if (camera.fov !== frame.camera.fov) {
      camera.fov = frame.camera.fov;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld(true);
    writeWorldTransform(
      uniforms.fromTransform.value,
      fromWorld,
      frame.globals,
      compact,
      shortLandscape,
      width,
      fromTransformScratch,
    );
    writeWorldTransform(
      uniforms.toTransform.value,
      toWorld,
      frame.globals,
      compact,
      shortLandscape,
      width,
      toTransformScratch,
    );
    updatePointTransitionMotion(frame);
    uniforms.morphProgress.value = transitionProgress;
    uniforms.storyTime.value = frame.storyTime;
    const assemblyWorld = toWorld.shapeId === 'long-assembly-corridor-v1'
      ? toWorld
      : fromWorld;
    const assemblyParameters = assemblyWorld.shapeParameters || {};
    const assemblyTransform = toWorld.shapeId === 'long-assembly-corridor-v1'
      ? toTransformScratch.worldTransform
      : fromTransformScratch.worldTransform;
    uniforms.oceanTime.value = frame.reducedMotion ? 0 : performance.now() * 0.001;
    uniforms.oceanBaseY.value = Number(assemblyParameters.oceanHeight ?? -6.2);
    uniforms.oceanDensity.value = Number(assemblyParameters.oceanDensity ?? 0.9);
    uniforms.oceanAmplitude.value = Number(assemblyParameters.oceanAmplitude ?? 2.05);
    uniforms.oceanSpeed.value = Number(assemblyParameters.oceanSpeed ?? 1.04);
    uniforms.oceanChop.value = Number(assemblyParameters.oceanChop ?? 1.08);
    uniforms.oceanPointScale.value = Number(assemblyParameters.oceanPointScale ?? 1.18);
    uniforms.oceanFogDistanceScale.value = Number(assemblyParameters.oceanFogDistanceScale ?? 24);
    uniforms.oceanSplashAmount.value = frame.reducedMotion
      ? 0
      : Number(assemblyParameters.oceanSplashAmount ?? 1.2);
    uniforms.oceanSplashHeight.value = Number(assemblyParameters.oceanSplashHeight ?? 4.4);
    const oceanImpulseElapsedMs = renderNowMs - oceanImpulseStartedAt;
    const oceanImpulseActive = !frame.reducedMotion
      && Number.isFinite(oceanImpulseElapsedMs)
      && oceanImpulseElapsedMs >= 0
      && oceanImpulseElapsedMs <= OCEAN_IMPULSE_DURATION_MS;
    uniforms.oceanImpulseProgress.value = oceanImpulseActive
      ? Math.min(1, oceanImpulseElapsedMs / OCEAN_IMPULSE_DURATION_MS)
      : 0;
    uniforms.oceanImpulseAmplitude.value = oceanImpulseActive
      ? OCEAN_IMPULSE_AMPLITUDE_WU
      : 0;
    const oceanStoryEndWU = Number(
      assemblyParameters.storyDurationWU
        ?? ABOUT_NARRATIVE_LONG_RIDE_BASE_DURATION_WU,
    );
    const oceanRevealLeadWU = Math.max(
      3.2,
      Number(assemblyParameters.terminalDistanceWU ?? 1.25) + 1.95,
    );
    const oceanRevealStartWU = oceanStoryEndWU - oceanRevealLeadWU;
    const oceanRevealProgress = Math.min(1, Math.max(
      0,
      (Number(frame.storyTime) - oceanRevealStartWU)
        / Math.max(0.001, oceanRevealLeadWU - 0.1),
    ));
    uniforms.oceanRevealProgress.value = oceanRevealProgress
      * oceanRevealProgress
      * (3 - (2 * oceanRevealProgress));
    uniforms.oceanStoryOffsetZ.value = Math.max(
      0,
      ABOUT_NARRATIVE_LONG_RIDE_BASE_DURATION_WU - oceanStoryEndWU,
    ) * Number(frame.globals.worldRail?.unitsPerWU ?? 18.5)
      * Number(assemblyParameters.depthScale ?? 1)
      * Number(assemblyTransform.scale ?? 1);
    uniforms.structureManifestationAmount.value = frame.reducedMotion
      ? 0
      : Number(assemblyParameters.structureManifestationAmount ?? 0.72);
    uniforms.structureAmbientAmount.value = frame.reducedMotion
      ? 0
      : Number(assemblyParameters.structureAmbientAmount ?? 0.055);
    uniforms.structureAmbientSpeed.value = Number(
      assemblyParameters.structureAmbientSpeed ?? 0.28,
    );
    uniforms.pointSize.value = frame.globals.pointMaterial.pointSize * mobileBodyScale;
    uniforms.fromPointSizeScale.value = Number(fromWorld.transform?.pointSizeScale ?? 1);
    uniforms.toPointSizeScale.value = Number(toWorld.transform?.pointSizeScale ?? 1);
    uniforms.fromResponsivePresence.value = fromTransformScratch.worldTransform.presenceRatio;
    uniforms.toResponsivePresence.value = toTransformScratch.worldTransform.presenceRatio;
    uniforms.fromLongAssembly.value = fromWorld.shapeId === 'long-assembly-corridor-v1' ? 1 : 0;
    uniforms.toLongAssembly.value = toWorld.shapeId === 'long-assembly-corridor-v1' ? 1 : 0;
    uniforms.fieldOpacity.value = frame.globals.pointMaterial.opacity;
    const requestedVisibility = Number(frame.simulation?.visibility ?? 1);
    const simulationVisibility = Number.isFinite(requestedVisibility)
      ? Math.min(1, Math.max(0, requestedVisibility))
      : 1;
    uniforms.simulationVisibility.value = simulationVisibility;
    points.visible = simulationVisibility > 0.001;
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
    setModifierUniforms(modifierUniformTargets.from, fromWorld, frame.globals, frame);
    setModifierUniforms(modifierUniformTargets.to, toWorld, frame.globals, frame);
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
    const bustAssemblyIndex = getComposerEffectIndex(
      frame,
      bustAssemblyWorld,
      'bust-assembly-v1',
    );
    const bustAssemblySlot = getComposerEffect(frame, bustAssemblyWorld, 'bust-assembly-v1');
    const bustAssembly = bustAssemblySlot && typeof bustAssemblySlot === 'object'
      ? bustAssemblySlot
      : DEFAULT_BUST_ASSEMBLY;
    uniforms.bustAssemblyWeight.value = bustAssemblyIndex < 0
      ? 1
      : Number(frame.composerEffects.weight[bustAssemblyIndex] || 0);
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
    const activeInteraction = frame.interactions?.activeInteraction;
    const activeInteractionTargetId = activeInteraction?.targetStateId
      || activeInteraction?.targetWorldId
      || '';
    const interactionTargetParticipates = activeInteractionTargetId === requestedFromWorldId
      || activeInteractionTargetId === requestedToWorldId;
    const installedFromWorldId = getAboutNarrativeWorldId(installedPair.fromWorld);
    const installedToWorldId = getAboutNarrativeWorldId(installedPair.toWorld);
    const interactionPairReady = pairMatchesRequest
      || activeInteractionTargetId === installedFromWorldId
      || activeInteractionTargetId === installedToWorldId;
    const rippleParameters = interactionPairReady
      && interactionTargetParticipates
      && activeInteraction?.type === 'grid-ripple'
      ? activeInteraction.parameters
      : null;
    uniforms.gridRippleWeight.value = frame.reducedMotion || !rippleParameters
      ? 0
      : Number(frame.interactions.effectWeight || 0);
    uniforms.gridRippleAmplitude.value = Number(rippleParameters?.amplitude || 0);
    uniforms.gridRippleSpeed.value = Number(rippleParameters?.speed || 0);
    uniforms.gridRippleFrequency.value = Number(rippleParameters?.frequency || 1);
    uniforms.gridRippleStoryMix.value = rippleParameters ? 1 : 0;
    uniforms.gridRippleProgress.value = frame.reducedMotion || !rippleParameters
      ? 0
      : Number(frame.interactions.effectProgress || 0);
    const targetTransformElements = uniforms.toTransform.value.elements;
    uniforms.gridRippleCenter.value.set(
      targetTransformElements[12],
      targetTransformElements[14],
    );
    const interactionEnabled = interactionPairReady
      && interactionTargetParticipates
      && bustController.interactive
      && !formingBust
      && simulationVisibility > 0.001
      && activeInteraction?.type === 'horizontal-spin'
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
      const bust = getComposerEffect(latestFrame, latestFrame?.world?.to, 'bust-yaw-v1');
      bustController.setYaw(bustYaw);
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
  const handlePressurePointerMove = (event) => {
    pointerPressure.setPointerFromClient(
      event.clientX,
      event.clientY,
      event.pointerType || 'mouse',
      event.buttons,
      performance.now(),
    );
    cameraPointerPan.setPointerFromClient(
      event.clientX,
      event.clientY,
      event.pointerType || 'mouse',
      event.buttons,
    );
  };
  const handlePressurePointerDown = (event) => {
    if (event.pointerType && event.pointerType !== 'mouse') return;
    pointerPressure.setDirectManipulation(true);
    cameraPointerPan.setPointerFromClient(
      event.clientX,
      event.clientY,
      event.pointerType || 'mouse',
      event.buttons || 1,
    );
  };
  const handlePressurePointerEnd = (event) => {
    pointerPressure.setDirectManipulation(false);
    if (!event?.pointerType || event.pointerType === 'mouse') {
      cameraPointerPan.setPointerFromClient(
        event?.clientX,
        event?.clientY,
        event?.pointerType || 'mouse',
        0,
      );
    }
  };
  const handlePressurePointerLeave = (event) => {
    pointerPressure.setPointerOutside(event.pointerType || 'mouse');
    cameraPointerPan.setPointerOutside(event.pointerType || 'mouse');
  };
  const handlePressureWindowBlur = () => {
    pointerPressure.setPointerOutside();
    cameraPointerPan.setPointerOutside();
  };
  const handlePressureVisibilityChange = () => {
    if (document.hidden) {
      pointerPressure.clear(pointerPressureSample);
      cameraPointerPan.clear(cameraPointerPanSample);
      cameraSteadycamSample.initialized = false;
    }
  };
  const handleFinePointerChange = () => {
    if (!finePointerQuery.matches) {
      pointerPressure.clear(pointerPressureSample);
      cameraPointerPan.clear(cameraPointerPanSample);
    }
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
    if (materialAtlasTexture) materialAtlasTexture.needsUpdate = true;
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
  root.addEventListener('pointermove', handlePressurePointerMove, { passive: true });
  root.addEventListener('pointerdown', handlePressurePointerDown, { passive: true });
  root.addEventListener('pointerleave', handlePressurePointerLeave, { passive: true });
  window.addEventListener('pointerup', handlePressurePointerEnd, { passive: true });
  window.addEventListener('pointercancel', handlePressurePointerEnd, { passive: true });
  window.addEventListener('blur', handlePressureWindowBlur);
  document.addEventListener('visibilitychange', handlePressureVisibilityChange);
  finePointerQuery.addEventListener('change', handleFinePointerChange);
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
  resize();
  updateTheme();
  const unsubscribeSimulationBodyMaterial = subscribeSimulationBodyMaterial(updateTheme);
  const rendererPreparationStartedAt = performance.now();
  const markRendererPrepared = () => {
    if (disposed || !contextAvailable || rendererPrepared) return;
    renderer.render(scene, camera);
    rendererPrepared = true;
    root.dataset.pointWorldState = 'ready';
    root.dataset.worldRendererPrepareMs = (
      performance.now() - rendererPreparationStartedAt
    ).toFixed(2);
    if (latestFrame) render(latestFrame);
  };
  const markRendererUnavailable = (error) => {
    if (disposed) return;
    contextAvailable = false;
    syncAtmosphereSource();
    root.dataset.pointWorldState = 'unavailable';
    root.dataset.aboutSceneReady = 'true';
    window.dispatchEvent(new CustomEvent('abs:about-scene-ready'));
    console.warn('[About narrative] Point-world shader preparation failed; using the clear background fallback.', error);
  };
  const prepareRendererSynchronously = () => {
    renderer.compile(scene, camera);
    markRendererPrepared();
  };
  root.dataset.pointWorldState = 'preparing';
  if (typeof renderer.compileAsync === 'function') {
    root.dataset.worldRendererPreparation = 'async';
    try {
      void renderer.compileAsync(scene, camera).then(markRendererPrepared).catch((error) => {
        if (disposed) return;
        try {
          root.dataset.worldRendererPreparation = 'sync-fallback';
          prepareRendererSynchronously();
        } catch (fallbackError) {
          markRendererUnavailable(fallbackError || error);
        }
      });
    } catch (error) {
      try {
        root.dataset.worldRendererPreparation = 'sync-fallback';
        prepareRendererSynchronously();
      } catch (fallbackError) {
        markRendererUnavailable(fallbackError || error);
      }
    }
  } else {
    root.dataset.worldRendererPreparation = 'sync';
    try {
      prepareRendererSynchronously();
    } catch (error) {
      markRendererUnavailable(error);
    }
  }
  root.dataset.worldAnchorSampling = 'native-grid-cell';
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
    getPointerPressureSnapshot: pointerPressure.getSnapshot,
    getCameraPointerPanSnapshot: cameraPointerPan.getSnapshot,
    getCameraSteadycamSnapshot: () => cameraSteadycam.getSnapshot(cameraSteadycamSample),
    getOceanImpulseSnapshot: () => {
      const elapsedMs = performance.now() - oceanImpulseStartedAt;
      const active = Number.isFinite(elapsedMs)
        && elapsedMs >= 0
        && elapsedMs <= OCEAN_IMPULSE_DURATION_MS;
      return {
        active,
        generation: oceanImpulseGeneration,
        progress: active ? Math.min(1, elapsedMs / OCEAN_IMPULSE_DURATION_MS) : 0,
      };
    },
    triggerOceanImpulse: () => {
      oceanImpulseStartedAt = performance.now();
      oceanImpulseGeneration += 1;
      root.dataset.oceanImpulseGeneration = String(oceanImpulseGeneration);
      return oceanImpulseGeneration;
    },
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
    pendingShapePreparations.clear();
    persistentCache.release();
    diagnostics.dispose({ emit: false });
    runtimeRef.current = null;
    if (RUNTIME_DIAGNOSTICS_ENABLED && window.__aboutNarrativeRuntime === runtimeApi) {
      delete window.__aboutNarrativeRuntime;
    }
    resizeObserver.disconnect();
    responsivePreviewObserver.disconnect();
    themeObserver.disconnect();
    window.removeEventListener('resize', resize);
    root.removeEventListener('pointermove', handlePressurePointerMove);
    root.removeEventListener('pointerdown', handlePressurePointerDown);
    root.removeEventListener('pointerleave', handlePressurePointerLeave);
    window.removeEventListener('pointerup', handlePressurePointerEnd);
    window.removeEventListener('pointercancel', handlePressurePointerEnd);
    window.removeEventListener('blur', handlePressureWindowBlur);
    document.removeEventListener('visibilitychange', handlePressureVisibilityChange);
    finePointerQuery.removeEventListener('change', handleFinePointerChange);
    interaction.removeEventListener('pointerdown', handlePointerDown);
    interaction.removeEventListener('pointermove', handlePointerMove);
    interaction.removeEventListener('pointerup', handlePointerEnd);
    interaction.removeEventListener('pointercancel', handlePointerEnd);
    interaction.removeEventListener('keydown', handleKeyDown);
    canvas.removeEventListener('webglcontextlost', handleContextLost);
    canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    unsubscribePalette();
    unsubscribeSimulationBodyMaterial();
    window.removeEventListener('abs:theme-changed', updateTheme);
    window.removeEventListener(ROUTE_ENTRANCE_START_EVENT, handleRouteEntranceStart);
    unregisterRouteMaterialParticipant();
    routeMaterial.destroy({ settleTargets: false });
    geometry.dispose();
    material.dispose();
    materialAtlasTexture?.dispose();
    materialAtlasTexture = null;
    renderer.dispose();
    webglTracker?.dispose();
    // Route views remount this renderer. Release a genuinely detached browser
    // context on the next task, while allowing a synchronous React effect
    // replacement to cancel the loss and reuse the same canvas safely.
    scheduleContextLoss(canvas, renderer);
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
    delete root.dataset.worldRendererPreparation;
    delete root.dataset.worldRendererPrepareMs;
    delete root.dataset.worldBufferRebuilds;
    delete root.dataset.worldBustShaderYaw;
    delete root.dataset.worldVisibility;
    delete root.dataset.aboutPointMaterialFinish;
    delete root.dataset.aboutPointMaterialPolicy;
    delete root.dataset.aboutPointMaterialThresholdPx;
    root.style.removeProperty('--narrative-bust-yaw');
  };
}

export function AboutNarrativePointWorld3D({
  rootRef,
  interactionRef,
  runtimeRef,
  pointProfile = '',
  layoutProfile = '',
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    const interaction = interactionRef?.current || canvas;
    if (!canvas || !root) return undefined;
    // A point-profile change replaces this adapter on the same canvas. Cancel
    // the previous adapter's deferred context loss before this setup is itself
    // deferred, otherwise the old timer can invalidate the shared canvas first.
    cancelPendingContextLoss(canvas);
    let active = true;
    let disposeAdapter = null;
    // Defer one task so React Strict Mode's development setup probe can cancel
    // before allocating and compiling a duplicate WebGL world.
    const setupTimer = window.setTimeout(() => {
      if (!active) return;
      try {
        disposeAdapter = createPointFieldAdapter({
          canvas,
          root,
          interaction,
          runtimeRef,
          pointProfile,
          layoutProfile,
        });
      } catch (error) {
        // The fallback can be rebuilt when the measured point profile changes.
        // Preserve a completed route entrance across that renderer handoff; a
        // fresh route mount has no marker and still starts from scale zero.
        const entranceAlreadyComplete = root.dataset.aboutEntranceState === 'complete'
          || Number(root.dataset.aboutEntranceScale) >= 0.999;
        root.dataset.pointWorldState = 'unavailable';
        root.dataset.aboutSceneReady = 'true';
        root.dataset.aboutEntranceState = entranceAlreadyComplete ? 'complete' : 'staged';
        root.dataset.aboutEntranceScale = entranceAlreadyComplete ? '1.0000' : '0.0000';
        const ambientTarget = Object.freeze({ kind: 'about-ambient-field' });
        let ambientScale = 0;
        const routeMaterial = createRouteMaterialEntranceController({
          id: 'about-point-field-material',
          routeId: 'about',
          diagnosticRoot: root,
          getTargets: () => [ambientTarget],
          setTargetScale: (target, scale, index, detail) => {
            ambientScale = scale;
            root.dataset.aboutEntranceScale = scale.toFixed(4);
            root.dataset.aboutEntranceState = detail?.phase === 'exiting'
              ? 'exiting'
              : (scale >= 0.999 ? 'complete' : detail?.phase || 'staged');
          },
        });
        const resumeRouteEntrance = !entranceAlreadyComplete && isAboutRouteEntering(root);
        if (entranceAlreadyComplete) routeMaterial.settle('adapter-restored');
        else routeMaterial.prepare();
        const unregisterRouteMaterialParticipant = registerRouteTransitionParticipant({
          id: 'about-point-field-fallback-material',
          routeId: 'about',
          prepare: ({ signal }) => routeMaterial.prepare({ signal }),
          exit: ({ signal }) => routeMaterial.exit({ signal }),
          enter: ({ signal }) => routeMaterial.enter({ signal }),
          restore: () => routeMaterial.settle('route-restored'),
          cancel: ({ reason }) => routeMaterial.cancel(reason),
        });
        if (resumeRouteEntrance) void routeMaterial.enter();
        const handleRouteEntranceStart = (event) => {
          const routeId = event?.detail?.routeId || '';
          if (routeId !== 'about') return;
          if (event?.detail?.mode !== 'direct') return;
          void routeMaterial.enter();
        };
        window.addEventListener(ROUTE_ENTRANCE_START_EVENT, handleRouteEntranceStart);
        let atmosphereCleanup = null;
        if (document.getElementById('simulation-atmosphere-glow-canvas')) {
          try {
            atmosphereCleanup = registerSimulationAtmosphereSource({
              id: 'about:ambient',
              routeId: 'about',
              kind: 'ambient',
              scheduler: 'internal',
              getVisualScale: () => ambientScale,
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
        disposeAdapter = () => {
          window.clearTimeout(readyTimer);
          window.removeEventListener(ROUTE_ENTRANCE_START_EVENT, handleRouteEntranceStart);
          unregisterRouteMaterialParticipant();
          routeMaterial.destroy({ settleTargets: false });
          atmosphereCleanup?.();
          delete root.dataset.pointWorldState;
          delete root.dataset.aboutSceneReady;
        };
      }
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(setupTimer);
      disposeAdapter?.();
    };
  }, [interactionRef, layoutProfile, pointProfile, rootRef, runtimeRef]);

  return <canvas ref={canvasRef} className="about-narrative-world__canvas" aria-hidden="true" />;
}
