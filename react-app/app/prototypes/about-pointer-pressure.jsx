// PROTOTYPE — throwaway Wayfinder evidence for issue 31.
// Three GPU material responses, switchable via ?variant=, on the real About runtime.
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';

const VARIANT_ORDER = Object.freeze(['A', 'B', 'C']);
const DEFAULT_PROFILE = Object.freeze({
  radius: 304,
  force: 10,
  variation: 1,
  responseMs: 420,
  returnMs: 2600,
});
const RESPONSIVE_PROFILE = Object.freeze({
  referenceWidth: 1024,
  referenceHeight: 700,
  minimumSpatialScale: 0.5,
  minimumForceScale: 0.85,
});
const POINTER_MOTION = Object.freeze({
  maximumSpeedPxPerSecond: 1600,
  sampleExpiryMs: 90,
  velocityResponseMs: 140,
});
const VARIANTS = Object.freeze({
  A: Object.freeze({
    name: 'Viscous flow',
    description: 'A restrained sideways glide with no elastic overshoot.',
    mode: 0,
  }),
  B: Object.freeze({
    name: 'Soft elastic',
    description: 'Locally shared mass, velocity-led motion, and one gentle settle.',
    mode: 1,
  }),
  C: Object.freeze({
    name: 'Inertial wake',
    description: 'A stronger directional wake that carries mouse momentum forward.',
    mode: 2,
  }),
});

const STAGES = Object.freeze({
  cluster: Object.freeze({ label: 'Opening cluster', storyWU: 0.35 }),
  turbulent: Object.freeze({ label: 'Turbulent field', storyWU: 3.4 }),
  grid: Object.freeze({ label: 'Calm grid', storyWU: 7.2 }),
  ripple: Object.freeze({ label: 'Ripple surface', storyWU: 18.6 }),
  bust: Object.freeze({ label: 'Settled bust', storyWU: 22.45 }),
});

const SHADER_SIGNATURE = 'attribute vec3 targetPosition;';
const SHADER_UNIFORM_MARKER = '  varying float pointAlpha;';
const SHADER_HELPER_MARKER = '  vec3 rotateY(vec3 value, float angle) {';
const SHADER_PROJECTION_MARKER = '    gl_Position = projectionMatrix * viewPoint;';

const PRESSURE_UNIFORMS = `
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
  uniform float pointerPressureMode;
`;

const PRESSURE_SHADER_HELPERS = `
  float pointerPressureCoherentMaterial(vec2 pointNdc) {
    float fieldA = sin(dot(pointNdc, vec2(4.1, 3.2)) + 0.7);
    float fieldB = sin(dot(pointNdc, vec2(-2.8, 5.3)) + 2.1);
    return clamp(0.5 + (fieldA * 0.27) + (fieldB * 0.23), 0.0, 1.0);
  }

  float pointerPressureMaterialEnvelope(vec2 pointNdc) {
    float organicAmount = clamp(pointerPressureVariation, 0.0, 2.0);
    float coherentMaterial = pointerPressureCoherentMaterial(pointNdc);
    float individualMaterial = sin((pointSeed * 131.731) + 0.41);
    float localMass = clamp(
      1.0
        + ((coherentMaterial - 0.5) * organicAmount * 0.28)
        + (individualMaterial * organicAmount * 0.025),
      0.82,
      1.18
    );
    float activeEnvelope = pow(
      clamp(pointerPressureStrength, 0.0, 1.0),
      localMass
    );
    float viscousMode = 1.0 - step(0.5, pointerPressureMode);
    float elasticMode = step(0.5, pointerPressureMode)
      * (1.0 - step(1.5, pointerPressureMode));
    float wakeMode = step(1.5, pointerPressureMode);
    float releaseProgress = clamp(pointerPressureReleaseProgress, 0.0, 1.0);
    float settleStart = clamp(0.72 + ((localMass - 1.0) * 0.18), 0.68, 0.76);
    float settlePhase = smoothstep(settleStart, 1.0, releaseProgress);
    float settleAmount = (
      (viscousMode * 0.0)
      + (elasticMode * 0.07)
      + (wakeMode * 0.1)
    ) * organicAmount;
    float settleOffset = -sin(settlePhase * 3.14159265)
      * settleAmount
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
    vec2 velocityDirection = speedPx > 0.001
      ? velocityPx / speedPx
      : vec2(0.0);
    float viscousMode = 1.0 - step(0.5, pointerPressureMode);
    float elasticMode = step(0.5, pointerPressureMode)
      * (1.0 - step(1.5, pointerPressureMode));
    float wakeMode = step(1.5, pointerPressureMode);
    float velocityLagSeconds = (
      (viscousMode * 0.04)
      + (elasticMode * 0.024)
      + (wakeMode * 0.065)
    ) * (1.0 + (trailSource * 0.45));
    vec2 deltaPx = (
      (pointNdc - pointerNdc) * 0.5 * pointerPressureViewport
    ) + (velocityPx * velocityLagSeconds);
    float safeRadius = max(1.0, pointerPressureRadiusPx);
    float organicAmount = clamp(pointerPressureVariation, 0.0, 2.0);
    float coherentMaterial = pointerPressureCoherentMaterial(pointNdc);
    float materialDirection = (coherentMaterial - 0.5) * 2.0;
    float individualMaterial = sin((pointSeed * 137.17) + 0.41);
    float radiusScale = clamp(
      1.0
        + (materialDirection * organicAmount * 0.12)
        + (individualMaterial * organicAmount * 0.015),
      0.76,
      1.24
    );
    float shapedRadius = safeRadius * radiusScale;
    float distancePx = length(deltaPx);
    float influence = 1.0 - smoothstep(
      0.0,
      shapedRadius,
      distancePx
    );
    float coreSoftnessPx = max(5.0, shapedRadius * 0.05);
    vec2 radialFlow = deltaPx / sqrt(
      (distancePx * distancePx) + (coreSoftnessPx * coreSoftnessPx)
    );
    vec2 radialDirection = distancePx > 0.001
      ? deltaPx / distancePx
      : velocityDirection;
    vec2 tangentDirection = vec2(-radialDirection.y, radialDirection.x);
    float tangentWeight = materialDirection
      * organicAmount
      * (
        (viscousMode * 0.42)
        + (elasticMode * 0.16)
        + (wakeMode * 0.26)
      );
    vec2 velocityFlow = velocityDirection
      * speedAmount
      * (
        (viscousMode * 0.24)
        + (elasticMode * 0.18)
        + (wakeMode * 0.45)
      );
    vec2 materialFlow = radialFlow
      + (tangentDirection * tangentWeight)
      + velocityFlow;
    float forceVariation = 1.0 + (
      individualMaterial * organicAmount * 0.035
    );
    float envelope = pointerPressureMaterialEnvelope(pointNdc);
    return materialFlow
      * pointerPressureForcePx
      * influence
      * forceVariation
      * sourceWeight
      * envelope;
  }

  vec4 applyPointerPressure(vec4 clipPoint) {
    if (
      pointerPressureStrength <= 0.000001
      && pointerPressureReleaseStrength <= 0.000001
    ) return clipPoint;
    float safeW = max(abs(clipPoint.w), 0.0001);
    vec2 pointNdc = clipPoint.xy / safeW;
    vec2 offsetPx = pointerPressureOffset(
      pointNdc,
      pointerPressureNdc,
      pointerPressureMode > 1.5 ? 0.34 : 1.0,
      0.0
    );
    if (pointerPressureMode > 1.5) {
      offsetPx += pointerPressureOffset(
        pointNdc,
        pointerPressureTrailNdc,
        1.0,
        1.0
      );
    }
    vec2 viewport = max(pointerPressureViewport, vec2(1.0));
    vec2 offsetNdc = (offsetPx * 2.0) / viewport;
    clipPoint.xy += offsetNdc * clipPoint.w;
    return clipPoint;
  }
`;

const state = {
  currentX: 0,
  currentY: 0,
  directManipulation: false,
  enabled: true,
  effectiveForce: DEFAULT_PROFILE.force,
  effectiveRadius: DEFAULT_PROFILE.radius,
  frameReducedMotion: false,
  frameVisible: true,
  frameUpdates: 0,
  hadPointer: false,
  injectionCount: 0,
  lastPointerSampleMs: 0,
  lastPointerSampleX: 0,
  lastPointerSampleY: 0,
  lastUpdateMs: performance.now(),
  patchedRuntime: null,
  pointerInside: false,
  pointerType: '',
  pointerVelocityX: 0,
  pointerVelocityY: 0,
  pressureActive: false,
  pressureStrength: 0,
  radius: DEFAULT_PROFILE.radius,
  releaseActive: false,
  releaseProgress: 1,
  releaseStartedAtMs: 0,
  releaseStartStrength: 0,
  releaseVelocityX: 0,
  releaseVelocityY: 0,
  responsiveForceScale: 1,
  responsiveSpatialScale: 1,
  force: DEFAULT_PROFILE.force,
  variation: DEFAULT_PROFILE.variation,
  responseMs: DEFAULT_PROFILE.responseMs,
  restoreRuntimeRender: null,
  returnMs: DEFAULT_PROFILE.returnMs,
  root: null,
  scrollport: null,
  stage: 'cluster',
  targetX: 0,
  targetY: 0,
  targetVelocityX: 0,
  targetVelocityY: 0,
  trailX: 0,
  trailY: 0,
  uniforms: null,
  variant: 'A',
  viewportHeight: window.innerHeight,
  viewportWidth: window.innerWidth,
  wasEligible: false,
};

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const coarsePointerQuery = window.matchMedia('(pointer: coarse)');

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function syncResponsiveProfile() {
  const widthScale = state.viewportWidth / RESPONSIVE_PROFILE.referenceWidth;
  const heightScale = state.viewportHeight / RESPONSIVE_PROFILE.referenceHeight;
  state.responsiveSpatialScale = clamp(
    Math.min(widthScale, heightScale),
    RESPONSIVE_PROFILE.minimumSpatialScale,
    1,
  );
  const forceProgress = (
    state.responsiveSpatialScale - RESPONSIVE_PROFILE.minimumSpatialScale
  ) / (1 - RESPONSIVE_PROFILE.minimumSpatialScale);
  state.responsiveForceScale = RESPONSIVE_PROFILE.minimumForceScale
    + ((1 - RESPONSIVE_PROFILE.minimumForceScale) * forceProgress);
  state.effectiveRadius = state.radius * state.responsiveSpatialScale;
  state.effectiveForce = state.force * state.responsiveForceScale;
}

function damp(current, target, deltaSeconds, durationMs) {
  if (durationMs <= 0) return target;
  // Live pointer tracking uses a perceptual 99% duration. Release uses the
  // separate finite curve so its displayed duration is its actual endpoint.
  const alpha = 1 - Math.exp((-4.60517 * deltaSeconds) / (durationMs / 1000));
  return current + ((target - current) * alpha);
}

function smoothstep01(value) {
  const progress = clamp(value, 0, 1);
  return progress * progress * (3 - (2 * progress));
}

function injectPointerPressure(vertexShader) {
  if (!vertexShader.includes(SHADER_SIGNATURE)) return vertexShader;
  if (
    !vertexShader.includes(SHADER_UNIFORM_MARKER)
    || !vertexShader.includes(SHADER_HELPER_MARKER)
    || !vertexShader.includes(SHADER_PROJECTION_MARKER)
  ) {
    throw new Error('The About Point Field shader seam changed; the disposable prototype will not patch an unknown program.');
  }
  return vertexShader
    .replace(SHADER_UNIFORM_MARKER, `${PRESSURE_UNIFORMS}\n${SHADER_UNIFORM_MARKER}`)
    .replace(SHADER_HELPER_MARKER, `${PRESSURE_SHADER_HELPERS}\n${SHADER_HELPER_MARKER}`)
    .replace(
      SHADER_PROJECTION_MARKER,
      '    gl_Position = applyPointerPressure(projectionMatrix * viewPoint);',
    );
}

function createPressureUniforms() {
  return {
    pointerPressureNdc: { value: new THREE.Vector2(0, 0) },
    pointerPressureTrailNdc: { value: new THREE.Vector2(0, 0) },
    pointerPressureViewport: {
      value: new THREE.Vector2(state.viewportWidth, state.viewportHeight),
    },
    pointerPressureVelocityPx: { value: new THREE.Vector2(0, 0) },
    pointerPressureReleaseVelocityPx: { value: new THREE.Vector2(0, 0) },
    pointerPressureRadiusPx: { value: state.effectiveRadius },
    pointerPressureForcePx: { value: state.effectiveForce },
    pointerPressureVariation: { value: state.variation },
    pointerPressureStrength: { value: 0 },
    pointerPressureReleaseProgress: { value: 1 },
    pointerPressureReleaseStrength: { value: 0 },
    pointerPressureMode: { value: VARIANTS[state.variant].mode },
  };
}

function isMaterialVisible() {
  if (typeof state.frameVisible === 'boolean') return state.frameVisible;
  const visibility = Number(state.root?.dataset.worldVisibility ?? 1);
  return Number.isFinite(visibility) && visibility > 0.001;
}

function resetPressureState() {
  state.pointerVelocityX = 0;
  state.pointerVelocityY = 0;
  state.pressureActive = false;
  state.pressureStrength = 0;
  state.releaseActive = false;
  state.releaseProgress = 1;
  state.releaseStartedAtMs = 0;
  state.releaseStartStrength = 0;
  state.releaseVelocityX = 0;
  state.releaseVelocityY = 0;
  state.targetVelocityX = 0;
  state.targetVelocityY = 0;
  state.wasEligible = false;
}

function updatePressure(nowMs, frame = null) {
  const uniforms = state.uniforms;
  if (!uniforms) return;
  if (frame) {
    const visibility = Number(frame.simulation?.visibility ?? 1);
    state.frameVisible = Number.isFinite(visibility) && visibility > 0.001;
    state.frameReducedMotion = Boolean(frame.reducedMotion);
  }
  const deltaSeconds = clamp((nowMs - state.lastUpdateMs) / 1000, 0, 0.1);
  state.lastUpdateMs = nowMs;

  state.currentX = damp(state.currentX, state.targetX, deltaSeconds, state.responseMs);
  state.currentY = damp(state.currentY, state.targetY, deltaSeconds, state.responseMs);
  const trailDuration = Math.max(170, state.responseMs * 4.8);
  state.trailX = damp(state.trailX, state.currentX, deltaSeconds, trailDuration);
  state.trailY = damp(state.trailY, state.currentY, deltaSeconds, trailDuration);

  const velocitySampleIsFresh = state.pointerInside
    && nowMs - state.lastPointerSampleMs <= POINTER_MOTION.sampleExpiryMs;
  const targetVelocityX = velocitySampleIsFresh ? state.targetVelocityX : 0;
  const targetVelocityY = velocitySampleIsFresh ? state.targetVelocityY : 0;
  state.pointerVelocityX = damp(
    state.pointerVelocityX,
    targetVelocityX,
    deltaSeconds,
    POINTER_MOTION.velocityResponseMs,
  );
  state.pointerVelocityY = damp(
    state.pointerVelocityY,
    targetVelocityY,
    deltaSeconds,
    POINTER_MOTION.velocityResponseMs,
  );

  const hardDisabled = document.hidden
    || state.frameReducedMotion
    || reducedMotionQuery.matches
    || coarsePointerQuery.matches
    || !isMaterialVisible();
  const eligible = state.enabled
    && state.pointerInside
    && state.pointerType === 'mouse'
    && !state.directManipulation
    && !hardDisabled;
  state.pressureActive = eligible;

  if (hardDisabled) {
    resetPressureState();
  } else if (eligible) {
    state.releaseActive = false;
    state.releaseProgress = 0;
    state.releaseStartStrength = 0;
    state.pressureStrength = damp(
      state.pressureStrength,
      1,
      deltaSeconds,
      state.responseMs,
    );
    if (state.pressureStrength > 0.9995) state.pressureStrength = 1;
  } else if (state.wasEligible) {
    state.releaseActive = true;
    state.releaseProgress = 0;
    state.releaseStartedAtMs = nowMs;
    state.releaseStartStrength = state.pressureStrength;
    state.releaseVelocityX = state.pointerVelocityX;
    state.releaseVelocityY = state.pointerVelocityY;
  } else if (state.releaseActive) {
    state.releaseProgress = clamp(
      (nowMs - state.releaseStartedAtMs) / Math.max(1, state.returnMs),
      0,
      1,
    );
    state.pressureStrength = state.releaseStartStrength
      * (1 - smoothstep01(state.releaseProgress));
    if (state.releaseProgress >= 1) {
      state.releaseActive = false;
      state.releaseStartStrength = 0;
      state.releaseVelocityX = 0;
      state.releaseVelocityY = 0;
      state.pressureStrength = 0;
    }
  } else {
    state.pressureStrength = 0;
    state.releaseProgress = 1;
  }
  state.wasEligible = eligible;

  uniforms.pointerPressureNdc.value.set(state.currentX, state.currentY);
  uniforms.pointerPressureTrailNdc.value.set(state.trailX, state.trailY);
  uniforms.pointerPressureViewport.value.set(state.viewportWidth, state.viewportHeight);
  uniforms.pointerPressureVelocityPx.value.set(
    state.pointerVelocityX,
    state.pointerVelocityY,
  );
  uniforms.pointerPressureReleaseVelocityPx.value.set(
    state.releaseVelocityX,
    state.releaseVelocityY,
  );
  uniforms.pointerPressureRadiusPx.value = state.effectiveRadius;
  uniforms.pointerPressureForcePx.value = state.effectiveForce;
  uniforms.pointerPressureVariation.value = state.variation;
  uniforms.pointerPressureStrength.value = state.pressureStrength;
  uniforms.pointerPressureReleaseProgress.value = state.releaseProgress;
  uniforms.pointerPressureReleaseStrength.value = state.releaseStartStrength;
  uniforms.pointerPressureMode.value = VARIANTS[state.variant].mode;
  state.frameUpdates += 1;
}

const previousPatch = window.__aboutPointerPressurePatch;
previousPatch?.restore?.();

const originalSetValues = THREE.ShaderMaterial.prototype.setValues;

THREE.ShaderMaterial.prototype.setValues = function setPrototypeShaderValues(values) {
  if (values?.vertexShader?.includes(SHADER_SIGNATURE)) {
    const pressureUniforms = createPressureUniforms();
    const patchedValues = {
      ...values,
      uniforms: {
        ...values.uniforms,
        ...pressureUniforms,
      },
      vertexShader: injectPointerPressure(values.vertexShader),
    };
    state.uniforms = patchedValues.uniforms;
    state.injectionCount += 1;
    return originalSetValues.call(this, patchedValues);
  }
  return originalSetValues.call(this, values);
};

function patchRuntimeFrame(runtime) {
  if (!runtime || runtime === state.patchedRuntime) return;
  state.restoreRuntimeRender?.();
  const originalRuntimeRender = runtime.render;
  const prototypeRuntimeRender = function renderWithPointerPressure(frame) {
    updatePressure(performance.now(), frame);
    return originalRuntimeRender.call(runtime, frame);
  };
  runtime.render = prototypeRuntimeRender;
  state.patchedRuntime = runtime;
  state.restoreRuntimeRender = () => {
    if (runtime.render === prototypeRuntimeRender) runtime.render = originalRuntimeRender;
    if (state.patchedRuntime === runtime) state.patchedRuntime = null;
    state.restoreRuntimeRender = null;
  };
}

function handleRuntimeReady() {
  patchRuntimeFrame(window.__aboutNarrativeRuntime);
}

function restorePrototypePatch() {
  state.restoreRuntimeRender?.();
  state.root?.removeEventListener('about:world-runtime-ready', handleRuntimeReady);
  if (THREE.ShaderMaterial.prototype.setValues !== originalSetValues) {
    THREE.ShaderMaterial.prototype.setValues = originalSetValues;
  }
}

function clearPressureImmediately() {
  resetPressureState();
  if (!state.uniforms) return;
  state.uniforms.pointerPressureStrength.value = 0;
  state.uniforms.pointerPressureReleaseProgress.value = 1;
  state.uniforms.pointerPressureReleaseStrength.value = 0;
  state.uniforms.pointerPressureVelocityPx.value.set(0, 0);
  state.uniforms.pointerPressureReleaseVelocityPx.value.set(0, 0);
}

window.__aboutPointerPressurePatch = { restore: restorePrototypePatch };
window.addEventListener('pagehide', restorePrototypePatch, { once: true });

const ui = {
  controls: Object.freeze({
    radius: document.getElementById('pressure-radius'),
    force: document.getElementById('pressure-force'),
    variation: document.getElementById('pressure-variation'),
    responseMs: document.getElementById('pressure-response'),
    returnMs: document.getElementById('pressure-return'),
  }),
  outputs: Object.freeze({
    radius: document.querySelector('[data-output="radius"]'),
    force: document.querySelector('[data-output="force"]'),
    variation: document.querySelector('[data-output="variation"]'),
    responseMs: document.querySelector('[data-output="responseMs"]'),
    returnMs: document.querySelector('[data-output="returnMs"]'),
  }),
  failure: document.querySelector('[data-prototype-failure]'),
  effectiveForce: document.querySelector('[data-state="effectiveForce"]'),
  effectiveRadius: document.querySelector('[data-state="effectiveRadius"]'),
  fixedBuffers: document.querySelector('[data-state="fixedBuffers"]'),
  form: document.querySelector('[data-state="form"]'),
  motion: document.querySelector('[data-state="motion"]'),
  parity: document.querySelector('[data-state="parity"]'),
  drawCalls: document.querySelector('[data-state="drawCalls"]'),
  pressureToggle: document.querySelector('[data-pressure-toggle]'),
  stageButtons: Object.freeze([...document.querySelectorAll('[data-stage]')]),
  strength: document.querySelector('[data-state="strength"]'),
  speed: document.querySelector('[data-state="speed"]'),
  viewportScale: document.querySelector('[data-state="viewportScale"]'),
  variantDescription: document.querySelector('[data-variant-description]'),
  variantKey: document.querySelector('[data-variant-key]'),
  variantName: document.querySelector('[data-variant-name]'),
};

function readVariantFromUrl() {
  const requested = new URLSearchParams(window.location.search).get('variant')?.toUpperCase();
  return VARIANTS[requested] ? requested : 'A';
}

function readStageFromUrl() {
  const requested = new URLSearchParams(window.location.search).get('stage');
  return STAGES[requested] ? requested : 'cluster';
}

function formatControlValue(key, value) {
  if (key === 'radius' || key === 'force') return `${Math.round(value)} px`;
  if (key === 'variation') return `${Math.round(value * 100)}%`;
  return `${Math.round(value)} ms`;
}

function syncControlUi() {
  Object.entries(ui.controls).forEach(([key, input]) => {
    input.value = String(state[key]);
    ui.outputs[key].textContent = formatControlValue(key, state[key]);
  });
  ui.pressureToggle.textContent = state.enabled ? 'Pressure on' : 'Pressure off';
  ui.pressureToggle.setAttribute('aria-pressed', String(state.enabled));
}

function writeUrlState() {
  const url = new URL(window.location.href);
  url.searchParams.set('variant', state.variant);
  url.searchParams.set('stage', state.stage);
  window.history.replaceState(null, '', url);
}

function applyVariant(variant, { resetControls = false } = {}) {
  const nextVariant = VARIANTS[variant] ? variant : 'A';
  const profile = VARIANTS[nextVariant];
  state.variant = nextVariant;
  if (resetControls) {
    state.radius = DEFAULT_PROFILE.radius;
    state.force = DEFAULT_PROFILE.force;
    state.variation = DEFAULT_PROFILE.variation;
    state.responseMs = DEFAULT_PROFILE.responseMs;
    state.returnMs = DEFAULT_PROFILE.returnMs;
  }
  syncResponsiveProfile();
  ui.variantKey.textContent = `Variant ${nextVariant}`;
  ui.variantName.textContent = profile.name;
  ui.variantDescription.textContent = profile.description;
  syncControlUi();
  writeUrlState();
}

function cycleVariant(direction) {
  const currentIndex = VARIANT_ORDER.indexOf(state.variant);
  const nextIndex = (currentIndex + direction + VARIANT_ORDER.length) % VARIANT_ORDER.length;
  applyVariant(VARIANT_ORDER[nextIndex]);
}

function syncStageUi() {
  ui.stageButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.stage === state.stage));
  });
}

function applyStage(stage) {
  if (!STAGES[stage]) return;
  state.stage = stage;
  syncStageUi();
  writeUrlState();
  if (!state.scrollport) return;
  state.scrollport.scrollTop = STAGES[stage].storyWU * Math.max(1, state.scrollport.clientHeight);
}

function cacheViewportBounds() {
  const bounds = state.root?.getBoundingClientRect();
  state.viewportWidth = Math.max(1, bounds?.width || window.innerWidth);
  state.viewportHeight = Math.max(1, bounds?.height || window.innerHeight);
  syncResponsiveProfile();
}

function setPointerFromClient(clientX, clientY) {
  const bounds = state.root?.getBoundingClientRect();
  if (!bounds) return false;
  const inside = clientX >= bounds.left
    && clientX <= bounds.right
    && clientY >= bounds.top
    && clientY <= bounds.bottom;
  if (!inside) return false;
  const nextX = (((clientX - bounds.left) / Math.max(1, bounds.width)) * 2) - 1;
  const nextY = 1 - (((clientY - bounds.top) / Math.max(1, bounds.height)) * 2);
  const sampleNowMs = performance.now();
  const sampleAgeMs = sampleNowMs - state.lastPointerSampleMs;
  if (
    state.hadPointer
    && sampleAgeMs > 0
    && sampleAgeMs <= POINTER_MOTION.sampleExpiryMs * 2
  ) {
    const sampleSeconds = Math.max(1 / 240, sampleAgeMs / 1000);
    const rawVelocityX = (
      (nextX - state.lastPointerSampleX) * 0.5 * state.viewportWidth
    ) / sampleSeconds;
    const rawVelocityY = (
      (nextY - state.lastPointerSampleY) * 0.5 * state.viewportHeight
    ) / sampleSeconds;
    const rawSpeed = Math.hypot(rawVelocityX, rawVelocityY);
    const velocityScale = rawSpeed > POINTER_MOTION.maximumSpeedPxPerSecond
      ? POINTER_MOTION.maximumSpeedPxPerSecond / rawSpeed
      : 1;
    state.targetVelocityX = rawVelocityX * velocityScale;
    state.targetVelocityY = rawVelocityY * velocityScale;
  } else {
    state.targetVelocityX = 0;
    state.targetVelocityY = 0;
  }
  state.targetX = clamp(nextX, -1, 1);
  state.targetY = clamp(nextY, -1, 1);
  state.lastPointerSampleMs = sampleNowMs;
  state.lastPointerSampleX = state.targetX;
  state.lastPointerSampleY = state.targetY;
  if (!state.hadPointer) {
    state.currentX = state.targetX;
    state.currentY = state.targetY;
    state.trailX = state.targetX;
    state.trailY = state.targetY;
    state.hadPointer = true;
  }
  return true;
}

function handlePointerMove(event) {
  const overPrototypeChrome = event.target instanceof Element
    && Boolean(event.target.closest('[data-prototype-chrome]'));
  state.pointerType = event.pointerType;
  state.pointerInside = !overPrototypeChrome && setPointerFromClient(event.clientX, event.clientY);
  state.directManipulation = event.buttons !== 0;
}

function handlePointerEnd(event) {
  if (event.pointerType) state.pointerType = event.pointerType;
  state.directManipulation = false;
}

function handleWindowPointerOut(event) {
  if (event.relatedTarget == null) {
    state.pointerInside = false;
    state.targetVelocityX = 0;
    state.targetVelocityY = 0;
  }
}

function updateStatus() {
  const metrics = window.__aboutNarrativeRuntime?.getMetrics?.();
  ui.form.textContent = state.root?.dataset.worldStage || 'Preparing';
  ui.strength.textContent = state.pressureStrength.toFixed(3);
  ui.motion.textContent = state.releaseActive
    ? `Settling ${Math.round(state.releaseProgress * 100)}%`
    : state.pressureActive ? 'Following' : 'Rest';
  ui.speed.textContent = `${Math.round(Math.hypot(
    state.pointerVelocityX,
    state.pointerVelocityY,
  ))} px/s`;
  ui.viewportScale.textContent = `${Math.round(state.responsiveSpatialScale * 100)}%`;
  ui.effectiveRadius.textContent = `${Math.round(state.effectiveRadius)} px`;
  ui.effectiveForce.textContent = `${state.effectiveForce.toFixed(1).replace(/\.0$/, '')} px`;
  ui.parity.textContent = state.pressureStrength === 0
    && state.releaseStartStrength === 0
    ? 'Exact at 0'
    : 'Additive offset';
  ui.drawCalls.textContent = Number.isFinite(metrics?.drawCalls) ? String(metrics.drawCalls) : '—';
  ui.fixedBuffers.textContent = metrics?.fixedAttributeIdentityStable === true ? 'Stable' : '—';
}

Object.entries(ui.controls).forEach(([key, input]) => {
  input.addEventListener('input', () => {
    state[key] = Number(input.value);
    syncResponsiveProfile();
    ui.outputs[key].textContent = formatControlValue(key, state[key]);
  });
});

ui.stageButtons.forEach((button) => {
  button.addEventListener('click', () => applyStage(button.dataset.stage));
});

ui.pressureToggle.addEventListener('click', () => {
  state.enabled = !state.enabled;
  syncControlUi();
});

document.querySelector('[data-pressure-reset]').addEventListener('click', () => {
  applyVariant(state.variant, { resetControls: true });
});
document.querySelector('[data-variant-previous]').addEventListener('click', () => cycleVariant(-1));
document.querySelector('[data-variant-next]').addEventListener('click', () => cycleVariant(1));

document.addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  if (event.target instanceof Element && event.target.closest('input, textarea, button, [contenteditable]')) return;
  event.preventDefault();
  cycleVariant(event.key === 'ArrowLeft' ? -1 : 1);
});

document.addEventListener('pointermove', handlePointerMove, { passive: true });
document.addEventListener('pointerup', handlePointerEnd, { passive: true });
document.addEventListener('pointercancel', handlePointerEnd, { passive: true });
window.addEventListener('pointerout', handleWindowPointerOut, { passive: true });
window.addEventListener('blur', () => {
  state.pointerInside = false;
  state.targetVelocityX = 0;
  state.targetVelocityY = 0;
});
window.addEventListener('resize', cacheViewportBounds, { passive: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    state.pointerInside = false;
    clearPressureImmediately();
  }
});
reducedMotionQuery.addEventListener('change', () => {
  if (reducedMotionQuery.matches) clearPressureImmediately();
});

state.variant = readVariantFromUrl();
state.stage = readStageFromUrl();
applyVariant(state.variant, { resetControls: true });
syncStageUi();

window.__aboutPointerPressurePrototype = {
  getSnapshot: () => ({
    drawCalls: window.__aboutNarrativeRuntime?.getMetrics?.()?.drawCalls ?? null,
    fixedAttributeIdentityStable:
      window.__aboutNarrativeRuntime?.getMetrics?.()?.fixedAttributeIdentityStable ?? null,
    directManipulation: state.directManipulation,
    frameReducedMotion: state.frameReducedMotion,
    frameVisible: state.frameVisible,
    form: state.root?.dataset.worldStage || '',
    frameUpdates: state.frameUpdates,
    injectionCount: state.injectionCount,
    mode: state.uniforms?.pointerPressureMode.value ?? null,
    motion: {
      active: state.pressureActive,
      releaseActive: state.releaseActive,
      releaseProgress: state.releaseProgress,
      releaseVelocityX: state.releaseVelocityX,
      releaseVelocityY: state.releaseVelocityY,
      speedPxPerSecond: Math.hypot(state.pointerVelocityX, state.pointerVelocityY),
      velocityX: state.pointerVelocityX,
      velocityY: state.pointerVelocityY,
    },
    effectiveProfile: {
      force: state.effectiveForce,
      forceScale: state.responsiveForceScale,
      radius: state.effectiveRadius,
      spatialScale: state.responsiveSpatialScale,
    },
    profile: {
      force: state.force,
      radius: state.radius,
      responseMs: state.responseMs,
      returnMs: state.returnMs,
      variation: state.variation,
    },
    pressureStrength: state.pressureStrength,
    pointerInside: state.pointerInside,
    pointerType: state.pointerType,
    stage: state.stage,
    uniformsReady: Boolean(state.uniforms),
    variant: state.variant,
  }),
  setEnabled: (enabled) => {
    state.enabled = Boolean(enabled);
    syncControlUi();
  },
  setPointerNdc: (x, y, inside = true, velocityX = 0, velocityY = 0) => {
    state.pointerType = 'mouse';
    state.pointerInside = Boolean(inside);
    state.targetX = clamp(Number(x) || 0, -1, 1);
    state.targetY = clamp(Number(y) || 0, -1, 1);
    const rawVelocityX = state.pointerInside ? Number(velocityX) || 0 : 0;
    const rawVelocityY = state.pointerInside ? Number(velocityY) || 0 : 0;
    const rawSpeed = Math.hypot(rawVelocityX, rawVelocityY);
    const velocityScale = rawSpeed > POINTER_MOTION.maximumSpeedPxPerSecond
      ? POINTER_MOTION.maximumSpeedPxPerSecond / rawSpeed
      : 1;
    state.targetVelocityX = rawVelocityX * velocityScale;
    state.targetVelocityY = rawVelocityY * velocityScale;
    state.lastPointerSampleMs = performance.now();
    state.lastPointerSampleX = state.targetX;
    state.lastPointerSampleY = state.targetY;
    if (!state.hadPointer) {
      state.currentX = state.targetX;
      state.currentY = state.targetY;
      state.trailX = state.targetX;
      state.trailY = state.targetY;
      state.hadPointer = true;
    }
  },
  setStage: applyStage,
  setVariant: applyVariant,
};

try {
  const [experienceModule, routeEventModule] = await Promise.all([
    import('../src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx'),
    import('../src/lib/motion/route-entrance-events.js'),
  ]);
  const root = createRoot(document.getElementById('prototype-root'));
  root.render(createElement(experienceModule.AboutNarrativeLabExperience, {
    routeContentId: 'about-prototype',
    showIndicator: false,
  }));

  const startedAt = performance.now();
  const preparePrototype = () => {
    state.root = document.querySelector('.about-narrative-lab');
    state.scrollport = document.querySelector('.about-narrative-scrollport');
    if (state.root && state.scrollport && window.__aboutNarrativeRuntime) {
      patchRuntimeFrame(window.__aboutNarrativeRuntime);
      state.root.addEventListener('about:world-runtime-ready', handleRuntimeReady);
      cacheViewportBounds();
      routeEventModule.dispatchRouteEntranceStart('about', 'direct');
      applyStage(state.stage);
      window.setInterval(updateStatus, 180);
      updateStatus();
      return;
    }
    if (performance.now() - startedAt > 60_000) {
      ui.failure.dataset.visible = 'true';
      console.error('[About pointer-pressure prototype] Timed out while preparing the real About narrative runtime.');
      return;
    }
    window.setTimeout(preparePrototype, 50);
  };
  preparePrototype();
} catch (error) {
  ui.failure.dataset.visible = 'true';
  console.error('[About pointer-pressure prototype]', error);
}
