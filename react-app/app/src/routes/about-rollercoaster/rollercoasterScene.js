import * as THREE from 'three';
import samplingWorkerFactory from 'virtual:about-rollercoaster-sampling-worker';
import { withBasePath } from '../../lib/base-path.js';
import { THEME_CHANGE_EVENT, isDarkThemeDocument } from '../../lib/theme-state.js';
import { getThemeBackgroundColour } from '../../lib/theme-transition.js';
import { getSimulationPaletteSnapshot, subscribeSimulationPalette } from '../../palette/simulationPaletteController.js';
import { getSimulationBodyMaterialAtlas, subscribeSimulationBodyMaterial } from '../../legacy/modules/rendering/materials/simulation-body-material.js';
import { resolveAboutSurfelPaletteColors } from '../about-narrative-lab/aboutSurfelPalette.js';
import {
  ROLLERCOASTER_MAX_MOTION_GROUPS,
  createRollercoasterCameraPose,
  loadRollercoasterBundle,
  resolveRollercoasterProgress,
  sampleRollercoasterCamera,
} from './rollercoasterContract.js';
import { ROLLERCOASTER_MOTION_GLSL, rollercoasterMotionPhase, sampleRollercoasterMotion } from './rollercoasterMotion.js';
import { ROLLERCOASTER_FIELD } from './rollercoasterField.js';
import { createRollercoasterSampler } from './rollercoasterSampler.js';
import { createRollercoasterSurfaceBatches } from './rollercoasterSurfaceBatches.js';
import { resolveRollercoasterProjection, resolveRollercoasterSamplingSpacing } from './rollercoasterProjection.js';
import { ROLLERCOASTER_OPENING_GLSL } from './rollercoasterEnding.js';
import { applyRollercoasterLean, createRollercoasterLeanState } from './rollercoasterCameraLean.js';
import {
  ROLLERCOASTER_DOT_STYLE_GLSL, createRollercoasterDotSeeds, createRollercoasterDotDrift,
  advanceRollercoasterDotDrift, sampleRollercoasterDotOffset, resolveRollercoasterDotPalette,
} from './rollercoasterDotStyle.js';
import {
  createRollercoasterParticles, PARTICLE_MAX_COUNT, PARTICLE_STRIDE, PARTICLE_VERTEX_SHADER, PARTICLE_VISIBILITY,
  resolveParticleCount, sampleFloatingParticle,
} from './rollercoasterParticles.js';

import {
  loadRollercoasterAppearance, getRollercoasterAppearance, subscribeRollercoasterAppearance,
} from './rollercoasterAppearance.js';
import {
  ABOUT_HOME_BODY_SCALE, HOME_SIZE_REFERENCE_DEPTH_WU, ROLLERCOASTER_VISIBILITY_GLSL, ROLLERCOASTER_COVERAGE_GLSL,
  resolveRollercoasterBodySize, sampleRollercoasterVisibility,
} from './rollercoasterVisibility.js';

const ASSET_ROOT = '/models/about-rollercoaster-world';
const VERTEX_SHADER = `
  precision highp float;
  attribute vec3 iPosition;
  uniform float uRadius;
  attribute float iPalette;
  attribute float iMotionGroup;
  uniform vec4 uMotionA[${ROLLERCOASTER_MAX_MOTION_GROUPS}];
  uniform vec4 uMotionB[${ROLLERCOASTER_MAX_MOTION_GROUPS}];
  uniform vec4 uMotionC[${ROLLERCOASTER_MAX_MOTION_GROUPS}];
  uniform vec4 uMotionD[${ROLLERCOASTER_MAX_MOTION_GROUPS}];
  uniform vec4 uMotionE[${ROLLERCOASTER_MAX_MOTION_GROUPS}];
  uniform vec4 uEndingOpeningWorld;
  uniform vec2 uEndingOpeningWorldSize;
  uniform vec3 uEndingOpeningNormal;
  uniform float uEndingGridGroup;
  uniform float uEndingScatterClearance;
  uniform float uEndingScaleReveal;
  varying vec2 vCircle;
  varying float vPalette;
  varying float vDepth;
  varying float vOpeningClearance;
  ${ROLLERCOASTER_MOTION_GLSL}
  ${ROLLERCOASTER_DOT_STYLE_GLSL}
  ${ROLLERCOASTER_OPENING_GLSL}
  void main() {
    vec3 point = applyAuthoredMotion(iPosition, int(iMotionGroup + 0.5));
    vOpeningClearance = 1.0;
    float openingScale = 1.0;
    if (abs(iMotionGroup - uEndingGridGroup) < 0.5 && uEndingOpeningWorld.w > 0.0) {
      vec3 delta = point - uEndingOpeningWorld.xyz;
      delta -= uEndingOpeningNormal * dot(delta, uEndingOpeningNormal);
      // Omit whole circles in the final plane. Its analytic depth wave keeps
      // moving around a real empty opening, with no faded dots or colour plate.
      // Membership uses the authored anchor and a conservative scatter margin,
      // so drifting dots cannot enter the opening or flicker across its edge.
      vOpeningClearance = length(delta) - uEndingOpeningWorld.w - uRadius - uEndingScatterClearance;
      if (uEndingScaleReveal > 0.0) {
        if (uEndingOpeningWorldSize.x > 0.0) {
          vec2 halfSize = uEndingOpeningWorldSize + vec2(uRadius + uEndingScatterClearance);
          float distance = openingOrganicDistance(delta.xy, halfSize, iDotSeed.w);
          openingScale = openingOrganicScale(distance, uEndingScaleReveal, iDotSeed.w);
        } else {
          float radius = uEndingOpeningWorld.w * openingRadiusFactor(delta.xy)
            + uRadius + uEndingScatterClearance;
          openingScale = openingCircleScale(length(delta) / radius, uEndingScaleReveal);
        }
        vOpeningClearance = 1.0;
      }
    }
    point += surfaceDotOffset();
    vec4 center = modelViewMatrix * vec4(point, 1.0);
    vDepth = -center.z;
    // Expand in camera space, so even a moving surface retains the Home face.
    center.xy += position.xy * uRadius * openingScale;
    gl_Position = projectionMatrix * center;
    vCircle = position.xy;
    vPalette = surfaceDotPalette(iPalette);
  }
`;
const FRAGMENT_SHADER = `
  precision highp float;
  uniform sampler2D uAtlas;
  uniform vec4 uAtlasScale;
  uniform float uAtlasYScale;
  uniform float uPaletteSlots[6];
  uniform vec4 uVisibility;
  uniform float uDitherVisibility;
  uniform vec3 uFogColor;
  uniform vec4 uTitleBox;
  uniform float uTitleQuiet;
  uniform float uTitleFeather;
  uniform float uPixelRatio;
  uniform float uOpacity;
  uniform vec4 uReadingBox;
  uniform float uReadingQuiet;
  varying vec2 vCircle;
  varying float vPalette;
  varying float vDepth;
  varying float vOpeningClearance;
  ${ROLLERCOASTER_VISIBILITY_GLSL}
  ${ROLLERCOASTER_COVERAGE_GLSL}
  void main() {
    if (dot(vCircle, vCircle) > 1.0 || vDepth <= 0.0 || vOpeningClearance < 0.0) discard;
    vec2 uv = vCircle * 0.5 + 0.5;
    float slot = uPaletteSlots[int(vPalette + 0.5)];
    vec4 material = texture2D(uAtlas, vec2(
      slot * uAtlasScale.x + uAtlasScale.y + uv.x * uAtlasScale.z,
      uAtlasScale.w + uv.y * uAtlasYScale
    ));
    if (material.a <= 0.025) discard;
    float visibility = corridorVisibility(vDepth);
    visibility *= uOpacity;
    // Fully hidden circles must not write depth over visible circles behind them.
    if (visibility <= 0.0) discard;
    // Titles share contrast protection. Prose protection is enabled only for
    // floating particles; authored surface coverage stays intact.
    vec2 edge = max(abs(gl_FragCoord.xy / uPixelRatio - uTitleBox.xy) - uTitleBox.zw, 0.0);
    float quiet = uTitleQuiet * (1.0 - smoothstep(0.0, uTitleFeather, length(edge)));
    vec2 readingEdge = max(abs(gl_FragCoord.xy / uPixelRatio - uReadingBox.xy) - uReadingBox.zw, 0.0);
    quiet = max(quiet, uReadingQuiet * (1.0 - smoothstep(0.0, uTitleFeather, length(readingEdge))));
    material.rgb = mix(material.rgb, uFogColor, quiet);
    gl_FragColor = vec4(material.rgb, material.a * corridorCoverage(visibility));
    #include <colorspace_fragment>
  }
`;

function createGeometry(points) {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0,
  ], 3));
  const source = new THREE.InstancedInterleavedBuffer(points, 6);
  geometry.setAttribute('iPosition', new THREE.InterleavedBufferAttribute(source, 3, 0));
  geometry.setAttribute('iPalette', new THREE.InterleavedBufferAttribute(source, 1, 4));
  geometry.setAttribute('iMotionGroup', new THREE.InterleavedBufferAttribute(source, 1, 5));
  geometry.setAttribute('iDotSeed', new THREE.InstancedBufferAttribute(createRollercoasterDotSeeds(points), 4, true));
  geometry.instanceCount = points.length / 6;
  return geometry;
}

function createParticleGeometry(points) {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0,
  ], 3));
  const source = new THREE.InstancedInterleavedBuffer(points, PARTICLE_STRIDE);
  geometry.setAttribute('iPosition', new THREE.InterleavedBufferAttribute(source, 3, 0));
  geometry.setAttribute('iSize', new THREE.InterleavedBufferAttribute(source, 1, 3));
  geometry.setAttribute('iPalette', new THREE.InterleavedBufferAttribute(source, 1, 4));
  geometry.setAttribute('iFloat', new THREE.InterleavedBufferAttribute(source, 4, 5));
  return geometry;
}

function createMotionUniforms(groups) {
  const result = {};
  for (const name of ['A', 'B', 'C', 'D', 'E']) result[`uMotion${name}`] = { value: new Float32Array(ROLLERCOASTER_MAX_MOTION_GROUPS * 4) };
  for (const group of groups) {
    if (group.kind === 'static') continue;
    const offset = group.id * 4;
    result.uMotionA.value.set(group.axis, offset);
    result.uMotionA.value[offset + 3] = group.kind === 'rotate' ? 1 : 2;
    result.uMotionB.value.set(group.kind === 'rotate' ? group.pivot : group.origin, offset);
    result.uMotionB.value[offset + 3] = group.amplitude;
    if (group.kind === 'rotate') result.uMotionE.value[offset + 2] = group.continuous ? 1 : 0;
    else {
      result.uMotionC.value.set(group.uAxis, offset);
      result.uMotionD.value.set(group.vAxis, offset);
      result.uMotionD.value[offset + 3] = group.wavelength;
      result.uMotionE.value[offset] = group.quietRadius;
      result.uMotionE.value[offset + 1] = group.quietFeather;
    }
  }
  return result;
}

function cameraFarPlane(points, track, meta) {
  let pointRadius = 0, cameraRadius = 0, motionExtent = 0;
  for (let i = 0; i < points.length; i += 6) pointRadius = Math.max(pointRadius, Math.hypot(points[i], points[i + 1], points[i + 2]) + points[i + 3]);
  for (const row of track.samples) cameraRadius = Math.max(cameraRadius, Math.hypot(row[1], row[2], row[3]));
  for (const group of meta.motionGroups) {
    if (group.kind === 'rotate') motionExtent = Math.max(motionExtent, 2 * Math.hypot(...group.pivot));
    if (group.kind === 'wave') motionExtent = Math.max(motionExtent, group.amplitude);
  }
  return Math.max(240, pointRadius + cameraRadius + motionExtent + 10);
}

/** Owns GPU resources and subscriptions; the caller owns the sole animation loop. */
export async function createRollercoasterScene({ canvas, onReady, onError, signal, samplingSettings,
  surfaceBatching = false, scrollOwnedCamera = false, boardJourney = null } = {}) {
  if (!canvas?.getContext) throw new TypeError('About rollercoaster needs a canvas.');
  const ownerDocument = canvas.ownerDocument;
  const ownerWindow = ownerDocument.defaultView;
  const abortController = new AbortController();
  const sampler = createRollercoasterSampler({ workerFactory: samplingWorkerFactory });
  let renderer, geometry, material, atlasTexture, backgroundObserver, mesh, sourceGeometry;
  let surfaceBatches = null;
  let entryJourney = null;
  let particlePoints, particleGeometry, particleMaterial, particleMesh, particleUniforms;
  let unsubscribePalette, unsubscribeMaterial, unsubscribeAppearance;
  let appearance = getRollercoasterAppearance();
  let bodyRadiusPx = 0;
  let disposed = false, contextLost = false, hasFrame = false, shaderError = null, appearanceError = null;
  let width = 0, height = 0, pixelRatio = 1, contextGeneration = 1;
  let materialKey = '', materialRevision = 0, paletteId = '', paletteGeneration = 0;
  let slotColors = [], theme = '', backgroundSignature = '';
  let api, meta, track, points, field, camera, scene, uniforms, loadAttempts, lastReportedError;
  let samplingTimer = 0, samplingRevision = 0, requestedSpacing = 0;
  let samplingRequest = 0, samplingInFlight = 0;
  let renderRevision = 0, renderedRevision = -1, renderedProgress = -1, renderedTime = -1;
  let drawCount = 0, skippedDrawCount = 0, samplingMs = 0;
  const pose = createRollercoasterCameraPose();
  const endingPose = createRollercoasterCameraPose();
  const endingRight = new THREE.Vector3(), endingUp = new THREE.Vector3(), endingForward = new THREE.Vector3();
  const endingCenter = new THREE.Vector3(), projectedOpening = new THREE.Vector3();
  const lean = createRollercoasterLeanState();
  const dotDrift = createRollercoasterDotDrift();
  const lastFrame = { progress: 0, ambientSeconds: 0, reducedMotion: false, titleWidth: 0, titleTop: 0, titleBottom: 0, titleOpacity: 0,
    readingWidth: 0, readingTop: 0, readingBottom: 0, cameraTimeSeconds: 0, resetCameraMotion: true,
    endingOpening: null, endingTitleActive: false, boardJourneyProgress: 0 };
  const fogTarget = new THREE.Color();
  const renderedBackground = new THREE.Color();
  const inspectionIndices = [];
  const samplingOptions = { ...ROLLERCOASTER_FIELD, ...samplingSettings };
  const invalidate = () => { renderRevision += 1; };

  const abort = () => { abortController.abort(); dispose(); };
  const reportError = error => {
    if (!disposed && error !== lastReportedError) { lastReportedError = error; onError?.(error); }
  };
  const contextLoss = (event) => {
    event.preventDefault();
    contextLost = true;
    const error = new Error('The About graphics context was interrupted. Waiting for recovery.');
    error.recoverable = true;
    reportError(error);
  };
  const contextRestore = () => {
    if (disposed) return;
    contextLost = false;
    lean.timeSeconds = NaN;
    dotDrift.timeSeconds = NaN;
    contextGeneration += 1;
    material.needsUpdate = true;
    particleMaterial.needsUpdate = true;
    if (atlasTexture) atlasTexture.needsUpdate = true;
    resize(width, height, true);
    render(lastFrame);
    if (!shaderError && !appearanceError) onReady?.(api);
  };

  function readBackground(force = false) {
    const root = ownerDocument.documentElement;
    const nextTheme = isDarkThemeDocument(ownerDocument) ? 'dark' : 'light';
    const signature = `${Boolean(root.style.getPropertyValue('--abs-theme-window-bg'))}:${nextTheme}:${root.style.getPropertyValue('--studio-window-bg')}:${root.style.getPropertyValue(`--studio-window-bg-${nextTheme}`)}:${root.style.getPropertyValue(`--bg-${nextTheme}`)}`;
    if (!force && signature === backgroundSignature) return;
    backgroundSignature = signature;
    invalidate();
    const style = ownerWindow.getComputedStyle(canvas);
    const color = style.getPropertyValue('--studio-window-bg').trim()
      || style.getPropertyValue('--frame-inner-surface').trim() || '#000000';
    fogTarget.setStyle(color);
  }

  function syncMaterial(snapshot = getSimulationPaletteSnapshot()) {
    if (disposed) return;
    paletteId = snapshot.paletteId;
    paletteGeneration = Number(snapshot.generation) || 0;
    const colors = resolveAboutSurfelPaletteColors(snapshot);
    const nextTheme = isDarkThemeDocument(ownerDocument) ? 'dark' : 'light';
    const atlas = getSimulationBodyMaterialAtlas(colors, { theme: nextTheme });
    if (!atlas) throw new Error('The shared Home circle material is unavailable.');
    if (entryJourney?.setPalette(snapshot, atlas)) invalidate();
    slotColors = colors;
    theme = nextTheme;
    if (atlas.key === materialKey) return;
    const nextTexture = new THREE.CanvasTexture(atlas.canvas);
    nextTexture.colorSpace = THREE.SRGBColorSpace;
    nextTexture.minFilter = THREE.LinearFilter;
    nextTexture.magFilter = THREE.LinearFilter;
    nextTexture.generateMipmaps = false;
    nextTexture.premultiplyAlpha = false;
    const previous = atlasTexture;
    atlasTexture = nextTexture;
    materialKey = atlas.key;
    materialRevision += 1;
    invalidate();
    uniforms.uAtlas.value = nextTexture;
    uniforms.uAtlasScale.value.set(atlas.cellStridePx / atlas.widthPx, atlas.gutterPx / atlas.widthPx,
      atlas.detailPx / atlas.widthPx, atlas.gutterPx / atlas.heightPx);
    uniforms.uAtlasYScale.value = atlas.detailPx / atlas.heightPx;
    for (let role = 0; role < 6; role += 1) uniforms.uPaletteSlots.value[role] = atlas.getSlot(colors[role]);
    previous?.dispose();
  }

  function appearanceChanged(snapshot) {
    if (disposed) return;
    try {
      const wasUnavailable = Boolean(appearanceError);
      syncMaterial(snapshot?.colors ? snapshot : undefined);
      appearanceError = null;
      readBackground(true);
      if (hasFrame) render(lastFrame);
      if (wasUnavailable && api) onReady?.(api);
    } catch (error) { appearanceError = error; reportError(error); }
  }

  function resize(nextWidth, nextHeight, force = false) {
    if (disposed || !renderer) return;
    const nextW = Number.isFinite(nextWidth) ? Math.max(0, nextWidth) : 0;
    const nextH = Number.isFinite(nextHeight) ? Math.max(0, nextHeight) : 0;
    const nextPixelRatio = Math.min(ownerWindow.devicePixelRatio || 1, 2);
    const changed = nextW !== width || nextH !== height || nextPixelRatio !== pixelRatio;
    width = nextW;
    height = nextH;
    if (width < 2 || height < 2 || contextLost) return;
    if (!changed && !force) return;
    pixelRatio = nextPixelRatio;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    invalidate();
    updateAppearance();
  }

  function updateAppearance() {
    if (disposed || !uniforms) return;
    appearance = getRollercoasterAppearance();
    if (width >= 2 && height >= 2) {
      const projection = resolveRollercoasterProjection(meta.camera, width, height, {
        horizontalFov: meta.camera.horizontalFov * appearance.lensWidth,
        portraitVerticalFov: appearance.portraitFov,
      });
      camera.aspect = projection.aspect;
      camera.fov = projection.verticalFov;
      camera.updateProjectionMatrix();
    }
    uniforms.uTitleFeather.value = appearance.titleFeather;
    uniforms.uViewportPx.value.set(width, height);
    uniforms.uPixelRatio.value = pixelRatio;
    uniforms.uVisibility.value.set(appearance.nearHidden, appearance.nearClear,
      appearance.farClear, appearance.farHidden);
    const size = resolveRollercoasterBodySize(appearance, width, height,
      width * camera.projectionMatrix.elements[0] / 2);
    bodyRadiusPx = size.radiusPx;
    uniforms.uRadius.value = size.radiusWU;
    uniforms.uDotStyle.value.set(appearance.colorMix, field.spacing * appearance.scatter, appearance.dotDrift);
    updateSurfacePadding();
    particleUniforms.uRadius.value = size.radiusWU / appearance.circleScale * 0.6 * appearance.particleSize;
    particleUniforms.uOpacity.value = appearance.particleOpacity;
    particleGeometry.instanceCount = resolveParticleCount(appearance.particleDensity);
    particleMesh.visible = particleGeometry.instanceCount > 0;
    invalidate();
    // Size and density are independent. Sampling uses the fixed half-Home
    // calibration; the visible radius can change without moving every circle.
    scheduleField(size.radiusWU * ABOUT_HOME_BODY_SCALE / appearance.circleScale);
  }

  function updateInspectionIndices() {
    inspectionIndices.length = 0;
    const seenGroups = new Set();
    for (let i = 0; i < points.length; i += 6) {
      if (!seenGroups.has(points[i + 5])) { seenGroups.add(points[i + 5]); inspectionIndices.push(i / 6); }
    }
  }

  function updateSurfacePadding() {
    // Dot drift and scatter are bounded in world units. Keep the same authored
    // spheres visible across live appearance changes and camera movement.
    surfaceBatches?.setPadding(uniforms.uRadius.value
      + field.spacing * appearance.scatter * (2 + appearance.dotDrift * 2));
  }

  function rebuildSurfaceBatches() {
    if (!surfaceBatching) return;
    surfaceBatches?.dispose();
    surfaceBatches = createRollercoasterSurfaceBatches(points, field, meta.motionGroups,
      material, createGeometry);
    mesh.visible = false;
    scene.add(surfaceBatches.root);
    updateSurfacePadding();
  }

  async function rebuildField() {
    samplingTimer = 0;
    if (disposed || !sourceGeometry || requestedSpacing === field.spacing) return;
    const spacing = requestedSpacing, request = ++samplingRequest;
    samplingInFlight = request;
    try {
      // The sampler checks all point/candidate budgets before allocating. The
      // previous complete field stays live until its replacement is ready.
      const next = await sampler.sample(sourceGeometry, { ...samplingOptions, spacing });
      if (disposed || request !== samplingRequest || spacing !== requestedSpacing) return;
      samplingMs = next.samplingMs;
      const nextGeometry = createGeometry(next.points);
      const previous = geometry;
      points = next.points;
      field = next.field;
      geometry = nextGeometry;
      mesh.geometry = nextGeometry;
      uniforms.uDotStyle.value.y = field.spacing * appearance.scatter;
      rebuildSurfaceBatches();
      previous.dispose();
      samplingRevision += 1;
      updateInspectionIndices();
      invalidate();
      if (hasFrame) render(lastFrame);
    } catch (error) { if (error.name !== 'AbortError') reportError(error); }
    finally { if (samplingInFlight === request) samplingInFlight = 0; }
  }

  function scheduleField(radiusWU) {
    if (!sourceGeometry || !field || !mesh) return;
    const nextSpacing = resolveRollercoasterSamplingSpacing(radiusWU, {
      baseSpacing: samplingOptions.spacing, currentSpacing: field.spacing, density: appearance.density,
    });
    if (nextSpacing === requestedSpacing && (samplingTimer || samplingInFlight)) return;
    requestedSpacing = nextSpacing;
    ownerWindow.clearTimeout(samplingTimer);
    samplingTimer = 0;
    if (requestedSpacing === field.spacing) return;
    if (!hasFrame) rebuildField();
    else samplingTimer = ownerWindow.setTimeout(rebuildField, 140);
  }

  function visibilityChanged() {
    updateAppearance();
    if (hasFrame) render(lastFrame);
  }

  function render({ progress = 0, ambientSeconds = 0, reducedMotion = false, titleWidth = 0, titleTop = 0, titleBottom = 0, titleOpacity = 0,
    readingWidth = 0, readingTop = 0, readingBottom = 0, cameraTimeSeconds = 0, resetCameraMotion = false,
    endingOpening = null, endingTitleActive = false, boardJourneyProgress = 0 } = lastFrame) {
    if (disposed || !renderer || contextLost || shaderError || appearanceError) return false;
    const motionChanged = lastFrame.reducedMotion !== Boolean(reducedMotion);
    lastFrame.progress = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
    lastFrame.ambientSeconds = Number.isFinite(ambientSeconds) ? Math.max(0, ambientSeconds) : 0;
    lastFrame.reducedMotion = Boolean(reducedMotion);
    lastFrame.cameraTimeSeconds = cameraTimeSeconds;
    lastFrame.resetCameraMotion = resetCameraMotion;
    if (lastFrame.boardJourneyProgress !== boardJourneyProgress) invalidate();
    lastFrame.boardJourneyProgress = boardJourneyProgress;
    const openingReveal = boardJourney ? boardJourney.openingReveal(boardJourneyProgress) : -1;
    uniforms.uEndingScaleReveal.value = lastFrame.reducedMotion && openingReveal >= 0
      ? Number(openingReveal >= 1) : openingReveal;
    if (lastFrame.endingOpening !== endingOpening || lastFrame.endingTitleActive !== endingTitleActive) invalidate();
    lastFrame.endingOpening = endingOpening;
    lastFrame.endingTitleActive = endingTitleActive;
    if (lastFrame.titleWidth !== titleWidth || lastFrame.titleTop !== titleTop
      || lastFrame.titleBottom !== titleBottom || lastFrame.titleOpacity !== titleOpacity
      || lastFrame.readingWidth !== readingWidth || lastFrame.readingTop !== readingTop || lastFrame.readingBottom !== readingBottom) invalidate();
    lastFrame.titleWidth = titleWidth;
    lastFrame.titleTop = titleTop;
    lastFrame.titleBottom = titleBottom;
    lastFrame.titleOpacity = titleOpacity;
    lastFrame.readingWidth = readingWidth;
    lastFrame.readingTop = readingTop;
    lastFrame.readingBottom = readingBottom;
    uniforms.uReadingBox.value.set(width / 2, height - (readingTop + readingBottom) / 2,
      readingWidth / 2 + appearance.titlePadding, (readingBottom - readingTop) / 2 + appearance.titlePadding);
    particleUniforms.uReadingQuiet.value = readingWidth > 0 ? 0.72 : 0;
    uniforms.uTitleQuiet.value = endingTitleActive ? 0 : appearance.titleQuiet * titleOpacity;
    uniforms.uTitleBox.value.set(width / 2, height / 2 - (titleTop + titleBottom) / 2,
      titleWidth / 2 + appearance.titlePadding, (titleBottom - titleTop) / 2 + appearance.titlePadding);
    const resolvedProgress = resolveRollercoasterProgress(meta, lastFrame.progress, lastFrame.reducedMotion);
    const time = lastFrame.reducedMotion ? 0 : lastFrame.ambientSeconds;
    particleUniforms.uFloatTime.value = time * appearance.particleDrift;
    if (boardJourney) particleMesh.visible = boardJourneyProgress >= 0.2
      && particleGeometry.instanceCount > 0;
    advanceRollercoasterDotDrift(dotDrift, lastFrame.ambientSeconds, appearance.dotDriftSpeed, lastFrame.reducedMotion);
    if (width < 2 || height < 2) return false;
    if (pixelRatio !== Math.min(ownerWindow.devicePixelRatio || 1, 2)) resize(width, height);
    const background = getThemeBackgroundColour();
    if (background) uniforms.uFogColor.value.setRGB(background[0] / 255, background[1] / 255, background[2] / 255, THREE.SRGBColorSpace);
    else uniforms.uFogColor.value.copy(fogTarget);
    sampleRollercoasterCamera(track, resolvedProgress, pose, lastFrame.reducedMotion);
    const previousLean = lean.degrees;
    // The board uses the authored camera pose directly in both scroll
    // directions. The standalone narrative retains its inertial lean.
    if (!scrollOwnedCamera) applyRollercoasterLean(lean, pose, cameraTimeSeconds, appearance,
      resetCameraMotion || motionChanged || lastFrame.reducedMotion);
    // A capture can complete while the scroll and Reduced Motion clock are
    // stopped. Occupancy is independent from the camera's cached frame.
    if (entryJourney?.syncOccupancy()) invalidate();
    if (hasFrame && renderedProgress === resolvedProgress && renderedTime === time && previousLean === lean.degrees
      && renderedRevision === renderRevision && renderedBackground.equals(uniforms.uFogColor.value)) {
      skippedDrawCount += 1;
      return true;
    }
    camera.position.fromArray(pose.position);
    camera.quaternion.fromArray(pose.quaternion);
    // The board's continuous entry band uses this same renderer, atlas and
    // depth buffer, then hands the camera to the unchanged Blender rail.
    entryJourney?.update({ progress: boardJourneyProgress, camera, width, height,
      appearance, reducedMotion: lastFrame.reducedMotion });
    uniforms.uEndingOpeningWorld.value.w = 0;
    uniforms.uEndingOpeningWorldSize.value.set(0, 0);
    uniforms.uEndingOpeningScreen.value.z = 0;
    uniforms.uEndingOpeningScreenSize.value.set(0, 0);
    if (endingOpening && meta.finalGrid) {
      const focalLength = height * camera.projectionMatrix.elements[5] / 2;
      const distance = meta.finalGrid.stoppingDistance;
      const worldPerPixel = distance / focalLength;
      endingCenter.fromArray(endingPose.position).addScaledVector(endingForward, distance)
        .addScaledVector(endingRight, (endingOpening.x - width / 2) * worldPerPixel)
        .addScaledVector(endingUp, (height / 2 - endingOpening.y) * worldPerPixel);
      const radius = (endingOpening.radius + appearance.titlePadding) * worldPerPixel;
      // Include depth scatter's perspective change as well as planar scatter.
      uniforms.uEndingScatterClearance.value = uniforms.uDotStyle.value.y * (1 + radius / distance);
      uniforms.uEndingOpeningWorld.value.set(endingCenter.x, endingCenter.y, endingCenter.z, radius);
      if (endingOpening.halfWidth > 0 && endingOpening.halfHeight > 0) {
        uniforms.uEndingOpeningWorldSize.value.set(
          (endingOpening.halfWidth + appearance.titlePadding) * worldPerPixel,
          (endingOpening.halfHeight + appearance.titlePadding) * worldPerPixel);
      }
      // Keep floating particles out of the same projected opening on arrival.
      // Before the final plane comes into view, the particle volume stays intact.
      camera.updateMatrixWorld();
      const depth = -projectedOpening.copy(endingCenter).applyMatrix4(camera.matrixWorldInverse).z;
      if (depth > 0 && depth < PARTICLE_VISIBILITY.farHidden) {
        projectedOpening.copy(endingCenter).project(camera);
        const arrival = Math.min(1, Math.max(0, (PARTICLE_VISIBILITY.farHidden - depth)
          / (PARTICLE_VISIBILITY.farHidden - PARTICLE_VISIBILITY.farClear)));
        uniforms.uEndingOpeningScreen.value.set((projectedOpening.x + 1) * width / 2,
          (projectedOpening.y + 1) * height / 2, radius * focalLength / depth * arrival);
        if (endingOpening.halfWidth > 0 && endingOpening.halfHeight > 0) {
          const scale = focalLength / depth * worldPerPixel * arrival;
          uniforms.uEndingOpeningScreenSize.value.set(
            (endingOpening.halfWidth + appearance.titlePadding) * scale,
            (endingOpening.halfHeight + appearance.titlePadding) * scale);
        }
      }
    }
    for (const group of meta.motionGroups) uniforms.uMotionC.value[group.id * 4 + 3] = rollercoasterMotionPhase(group, time);
    renderer.setClearColor(uniforms.uFogColor.value, 1);
    renderer.render(scene, camera);
    drawCount += 1;
    renderedProgress = resolvedProgress;
    renderedTime = time;
    renderedRevision = renderRevision;
    renderedBackground.copy(uniforms.uFogColor.value);
    hasFrame = true;
    return !shaderError;
  }

  function inspect({ pointIndices = inspectionIndices } = {}) {
    if (disposed) return { status: 'disposed', source: meta ? { ...meta.source } : null, sampling: sampler.inspect(),
      ownedResources: { geometries: 0, materials: 0, textures: 0, pointBytes: 0 }, frameLoopOwner: 'caller' };
    const samples = [];
    const vector = new THREE.Vector3();
    camera.updateMatrixWorld();
    for (const id of pointIndices.slice(0, 64)) {
      if (!Number.isInteger(id) || id < 0 || id >= field.count) continue;
      const offset = id * 6;
      const rest = [points[offset], points[offset + 1], points[offset + 2]];
      const group = points[offset + 5];
      const anchor = sampleRollercoasterMotion(rest, meta.motionGroups[group], lastFrame.reducedMotion ? 0 : lastFrame.ambientSeconds);
      const seeds = geometry.getAttribute('iDotSeed').array;
      const dotOffset = sampleRollercoasterDotOffset(seeds, id, uniforms.uDotStyle.value.y, appearance.dotDrift, dotDrift.waves);
      const position = anchor.map((value, axis) => value + dotOffset[axis]);
      vector.fromArray(position).applyMatrix4(camera.matrixWorldInverse);
      const depth = -vector.z;
      vector.fromArray(position).project(camera);
      samples.push({ id, group, authoredPaletteIndex: points[offset + 4],
        paletteIndex: resolveRollercoasterDotPalette(seeds[id * 4 + 3], points[offset + 4], appearance.colorMix),
        radius: uniforms.uRadius.value, rest, anchor, dotOffset, position,
        depth, visibility: sampleRollercoasterVisibility(depth, appearance),
        ndc: vector.toArray(), pixels: [(vector.x + 1) * width / 2, (1 - vector.y) * height / 2] });
    }
    return {
      status: contextLost ? 'context-lost' : shaderError || appearanceError ? 'error' : 'ready',
      source: { ...meta.source }, sourceSha256: meta.source.sha256,
      progress: lastFrame.progress, renderedProgress: pose.progress,
      ambientSeconds: lastFrame.ambientSeconds, effectiveAmbientSeconds: lastFrame.reducedMotion ? 0 : lastFrame.ambientSeconds,
      reducedMotion: lastFrame.reducedMotion,
      camera: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), rollDegrees: pose.rollDegrees,
        bankDegrees: pose.bankDegrees, turnDegrees: pose.turnDegrees, aspect: camera.aspect,
        lean: { authoredDegrees: lean.authoredDegrees, targetDegrees: lean.targetDegrees,
          velocityDegreesPerSecond: lean.velocity, travelSpeedWU: lean.speedWU },
        verticalFov: camera.fov, sourceHorizontalFov: meta.camera.horizontalFov, near: camera.near, far: camera.far },
      viewport: { width, height, pixelRatio },
      bandJourney: entryJourney?.inspect(camera) || null,
      visibilityMode: uniforms.uDitherVisibility.value ? 'screen-door' : 'multisample-coverage',
      canvasAlpha: renderer.getContext().getContextAttributes()?.alpha,
      appearance: { ...appearance },
      titleProtection: { strength: uniforms.uTitleQuiet.value, box: uniforms.uTitleBox.value.toArray(), feather: appearance.titleFeather },
      endingOpening: { world: uniforms.uEndingOpeningWorld.value.toArray(),
        screen: uniforms.uEndingOpeningScreen.value.toArray(), clearancePx: appearance.titlePadding,
        scatterClearanceWU: uniforms.uEndingScatterClearance.value,
        scaleReveal: uniforms.uEndingScaleReveal.value,
        gridMotionGroup: uniforms.uEndingGridGroup.value },
      visibilityCorridor: { nearHidden: appearance.nearHidden, nearClear: appearance.nearClear,
        farClear: appearance.farClear, farHidden: appearance.farHidden },
      circleField: { spacing: field.spacing, radius: uniforms.uRadius.value,
        diameterPxAtReference: bodyRadiusPx * 2, homeSizeScale: appearance.circleScale, density: appearance.density, referenceDepthWU: HOME_SIZE_REFERENCE_DEPTH_WU,
        diameterToPitch: uniforms.uRadius.value * 2 / field.spacing, samplingRevision, samplingMs,
        colorMix: appearance.colorMix, scatterWU: uniforms.uDotStyle.value.y, drift: appearance.dotDrift,
        driftSpeed: appearance.dotDriftSpeed, driftPhases: [dotDrift.phaseA, dotDrift.phaseB],
        seedBytes: geometry.getAttribute('iDotSeed').array.byteLength }, sampling: sampler.inspect(), pointCount: field.count,
      particles: { count: particleGeometry.instanceCount, capacity: PARTICLE_MAX_COUNT, worldSpace: true,
        density: appearance.particleDensity, size: appearance.particleSize, drift: appearance.particleDrift,
        opacity: particleUniforms.uOpacity.value, radius: particleUniforms.uRadius.value, time: particleUniforms.uFloatTime.value,
        visibility: { ...PARTICLE_VISIBILITY }, readingQuiet: particleUniforms.uReadingQuiet.value,
        samples: [0, 1, 2, 3].map(index => sampleFloatingParticle(particlePoints, index, particleUniforms.uFloatTime.value)) },
      field: { ...field, surfaceCounts: { ...field.surfaceCounts }, objectRanges: field.objectRanges.map(range => ({ ...range })) },
      slotColors: [...slotColors], slotIndices: [...uniforms.uPaletteSlots.value], paletteId, paletteGeneration,
      materialAtlasKey: materialKey, materialRevision, theme, sharedHomeMaterial: Boolean(atlasTexture),
      contextGeneration, loadAttempts, frameLoopOwner: 'caller',
      ownedResources: { geometries: 2 + (surfaceBatches?.count || 0) + (entryJourney ? 2 : 0),
        materials: 2 + (entryJourney ? 2 : 0), textures: atlasTexture ? 1 : 0,
        pointBytes: points.byteLength + particlePoints.byteLength + geometry.getAttribute('iDotSeed').array.byteLength
          + (entryJourney?.pointBytes || 0) },
      gpu: { calls: renderer.info.render.calls, geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures, drawCount, skippedDrawCount },
      pointSamples: samples,
    };
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    sampler.dispose();
    entryJourney?.dispose();
    entryJourney = null;
    ownerWindow.clearTimeout(samplingTimer);
    abortController.abort();
    signal?.removeEventListener('abort', abort);
    unsubscribePalette?.();
    unsubscribeMaterial?.();
    unsubscribeAppearance?.();
    backgroundObserver?.disconnect();
    ownerWindow.removeEventListener(THEME_CHANGE_EVENT, appearanceChanged);
    canvas.removeEventListener('webglcontextlost', contextLoss);
    canvas.removeEventListener('webglcontextrestored', contextRestore);
    geometry?.dispose();
    surfaceBatches?.dispose();
    surfaceBatches = null;
    material?.dispose();
    particleGeometry?.dispose();
    particleMaterial?.dispose();
    atlasTexture?.dispose();
    renderer?.dispose();
    // React effects and HMR reuse attached canvases; only retire a removed surface.
    if (!canvas.isConnected) renderer?.forceContextLoss();
    scene?.clear();
    points = field = track = scene = camera = uniforms = sourceGeometry = mesh = null;
    renderer = geometry = material = atlasTexture = null;
    particlePoints = particleGeometry = particleMaterial = particleMesh = particleUniforms = null;
    backgroundObserver = unsubscribePalette = unsubscribeMaterial = null;
    inspectionIndices.length = 0;
    slotColors = [];
  }

  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) abort();
  try {
    await loadRollercoasterAppearance();
    abortController.signal.throwIfAborted();
    appearance = getRollercoasterAppearance();
    const bounds = canvas.getBoundingClientRect();
    const bundle = await loadRollercoasterBundle({ assetRoot: withBasePath(ASSET_ROOT), signal: abortController.signal,
      sampleField: (geometry, settings) => sampler.sample(
        boardJourney ? boardJourney.selectGeometry(geometry) : geometry, settings),
      samplingSettings: sourceMeta => {
        if (bounds.width < 2 || bounds.height < 2) return samplingOptions;
        const projection = resolveRollercoasterProjection(sourceMeta.camera, bounds.width, bounds.height, {
          horizontalFov: sourceMeta.camera.horizontalFov * appearance.lensWidth,
          portraitVerticalFov: appearance.portraitFov,
        });
        const size = resolveRollercoasterBodySize(appearance, bounds.width, bounds.height, projection.focalLengthPx);
        return { ...samplingOptions, spacing: resolveRollercoasterSamplingSpacing(size.radiusWU * ABOUT_HOME_BODY_SCALE / appearance.circleScale, {
          baseSpacing: samplingOptions.spacing, currentSpacing: samplingOptions.spacing, density: appearance.density,
        }) };
      },
    });
    abortController.signal.throwIfAborted();
    meta = bundle.meta;
    loadAttempts = bundle.loadAttempts;
    track = bundle.camera;
    sampleRollercoasterCamera(track, 1, endingPose);
    const endingOrientation = new THREE.Quaternion().fromArray(endingPose.quaternion);
    endingRight.set(1, 0, 0).applyQuaternion(endingOrientation);
    endingUp.set(0, 1, 0).applyQuaternion(endingOrientation);
    endingForward.set(0, 0, -1).applyQuaternion(endingOrientation);
    points = bundle.points;
    field = bundle.field;
    samplingMs = bundle.samplingMs;
    sourceGeometry = boardJourney ? boardJourney.selectGeometry(bundle.geometry) : bundle.geometry;
    requestedSpacing = field.spacing;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, 1, 0.01, cameraFarPlane(points, track, meta));
    geometry = createGeometry(points);
    uniforms = { ...createMotionUniforms(meta.motionGroups),
      uAtlas: { value: null }, uAtlasScale: { value: new THREE.Vector4() }, uAtlasYScale: { value: 1 },
      uPaletteSlots: { value: new Float32Array(6) }, uFogColor: { value: new THREE.Color() },
      uVisibility: { value: new THREE.Vector4() }, uRadius: { value: 0 }, uDitherVisibility: { value: 0 },
      uTitleBox: { value: new THREE.Vector4() }, uTitleQuiet: { value: 0 },
      uTitleFeather: { value: 80 }, uPixelRatio: { value: 1 },
      uOpacity: { value: 1 }, uReadingBox: { value: new THREE.Vector4() }, uReadingQuiet: { value: 0 },
      uEndingOpeningWorld: { value: new THREE.Vector4() },
      uEndingOpeningWorldSize: { value: new THREE.Vector2() },
      uEndingOpeningNormal: { value: new THREE.Vector3().fromArray(meta.finalGrid?.normal || [0, 0, 1]).normalize() },
      uEndingGridGroup: { value: meta.finalGrid?.motionGroup ?? -1 },
      uEndingScatterClearance: { value: 0 },
      uEndingScaleReveal: { value: -1 },
      uEndingOpeningScreen: { value: new THREE.Vector3() },
      uEndingOpeningScreenSize: { value: new THREE.Vector2() }, uViewportPx: { value: new THREE.Vector2() },
      uDotStyle: { value: new THREE.Vector3() }, uDotDriftWaves: { value: dotDrift.waves },
    };
    material = new THREE.ShaderMaterial({ vertexShader: VERTEX_SHADER, fragmentShader: FRAGMENT_SHADER, uniforms,
      transparent: false, alphaToCoverage: true, depthTest: true, depthWrite: true, blending: THREE.NoBlending });
    mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false; // Moving parts retain their complete source population.
    scene.add(mesh);
    rebuildSurfaceBatches();
    particlePoints = createRollercoasterParticles(track);
    particleGeometry = createParticleGeometry(particlePoints);
    // Share atlas, palette, title protection and theme uniforms by reference.
    particleUniforms = { ...uniforms, uRadius: { value: 0 }, uFloatTime: { value: 0 },
      uOpacity: { value: appearance.particleOpacity }, uReadingQuiet: { value: 0 },
      uDitherVisibility: { value: 0 },
      uVisibility: { value: new THREE.Vector4(PARTICLE_VISIBILITY.nearHidden, PARTICLE_VISIBILITY.nearClear,
        PARTICLE_VISIBILITY.farClear, PARTICLE_VISIBILITY.farHidden) } };
    particleMaterial = new THREE.ShaderMaterial({ vertexShader: PARTICLE_VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER, uniforms: particleUniforms,
      transparent: true, depthTest: true, depthWrite: false, blending: THREE.NormalBlending });
    particleMesh = new THREE.Mesh(particleGeometry, particleMaterial);
    particleMesh.frustumCulled = false;
    scene.add(particleMesh);
    // Coverage already mixes each circle with this theme-tracked ground. An
    // opaque canvas prevents the page compositor from applying its fade again.
    // The route already owns an opaque CSS ground; shell finish layers retain
    // their existing placement outside this canvas.
    // Three requests an alpha context internally even with alpha:false. Supply
    // the actual opaque context so coverage cannot acquire a second alpha fade.
    const context = canvas.getContext('webgl2', {
      alpha: false, antialias: true, premultipliedAlpha: false, powerPreference: 'high-performance',
    });
    if (!context) throw new Error('The About graphics context is unavailable.');
    if (context.getContextAttributes()?.alpha !== false) {
      throw new Error('The About graphics context could not use an opaque surface. Reload the page to retry.');
    }
    renderer = new THREE.WebGLRenderer({ canvas, context, alpha: false, antialias: true,
      premultipliedAlpha: false, powerPreference: 'high-performance' });
    uniforms.uDitherVisibility.value = renderer.getContext().getContextAttributes()?.antialias ? 0 : 1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.debug.onShaderError = (gl, program) => {
      shaderError = new Error(`About circle shader could not compile: ${gl.getProgramInfoLog(program)}`);
      reportError(shaderError);
    };
    canvas.addEventListener('webglcontextlost', contextLoss);
    canvas.addEventListener('webglcontextrestored', contextRestore);
    if (boardJourney) entryJourney = boardJourney.create({ scene, track, meta, uniforms, canvas, sourceGeometry });
    syncMaterial();
    readBackground(true);
    renderer.compile(scene, camera);
    if (shaderError) throw shaderError;
    updateInspectionIndices();
    api = Object.freeze({ render, resize, dispose, inspect, meta });
    unsubscribePalette = subscribeSimulationPalette(appearanceChanged);
    unsubscribeMaterial = subscribeSimulationBodyMaterial(appearanceChanged);
    unsubscribeAppearance = subscribeRollercoasterAppearance(visibilityChanged);
    ownerWindow.addEventListener(THEME_CHANGE_EVENT, appearanceChanged);
    backgroundObserver = new MutationObserver(() => { if (!disposed) readBackground(); });
    backgroundObserver.observe(ownerDocument.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
    const currentBounds = canvas.getBoundingClientRect();
    resize(currentBounds.width, currentBounds.height);
    render(lastFrame);
    onReady?.(api);
    return api;
  } catch (error) {
    if (error?.name !== 'AbortError' && !disposed) reportError(error);
    dispose();
    throw error;
  }
}
