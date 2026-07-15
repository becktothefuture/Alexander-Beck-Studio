import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  createAboutNarrativeSeeds,
  generateAboutNarrativeShape,
} from './aboutNarrativePointShapes.js';
import { applyAboutNarrativeCorrespondence } from './aboutNarrativeCorrespondence.js';

const DESKTOP_POINT_COUNT = 12000;
const MOBILE_POINT_COUNT = 5000;

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
  uniform float pixelRatio;
  uniform float fromDriftAmplitude;
  uniform float toDriftAmplitude;
  uniform float fromDriftSpeed;
  uniform float toDriftSpeed;
  uniform float fromWaveWeight;
  uniform float toWaveWeight;
  uniform float fromWaveAmplitude;
  uniform float toWaveAmplitude;
  uniform float fromWaveSpeed;
  uniform float toWaveSpeed;
  uniform vec2 fromWaveFrequency;
  uniform vec2 toWaveFrequency;
  uniform float fromGroupStrength;
  uniform float toGroupStrength;
  uniform float disciplineFocus;
  uniform float gridInfluence;
  uniform float fromLivingColour;
  uniform float toLivingColour;
  uniform float fromBust;
  uniform float toBust;
  uniform float bustYaw;
  uniform vec3 pointColor;
  uniform vec3 disciplineColor1;
  uniform vec3 disciplineColor2;
  uniform vec3 disciplineColor3;
  uniform vec3 disciplineColor4;
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

  vec3 groupColor(float index) {
    if (index < 1.5) return disciplineColor1;
    if (index < 2.5) return disciplineColor2;
    if (index < 3.5) return disciplineColor3;
    if (index < 4.5) return disciplineColor4;
    if (index < 5.5) return disciplineColor1;
    return disciplineColor2;
  }

  void main() {
    float morph = smoothstep(0.0, 1.0, morphProgress);
    vec3 fromPoint = mix(position, rotateY(position, bustYaw), fromBust);
    vec3 toPoint = mix(targetPosition, rotateY(targetPosition, bustYaw), toBust);
    vec3 fromWorld = (fromTransform * vec4(fromPoint, 1.0)).xyz;
    vec3 toWorld = (toTransform * vec4(toPoint, 1.0)).xyz;
    vec3 worldPoint = mix(fromWorld, toWorld, morph);

    float driftAmplitude = mix(fromDriftAmplitude, toDriftAmplitude, morph);
    float driftSpeed = mix(fromDriftSpeed, toDriftSpeed, morph);
    float driftClock = ambientTime + (storyTime * 0.08);
    worldPoint.y += sin((driftClock * driftSpeed) + (pointSeed * 31.0)) * driftAmplitude;

    float waveWeight = mix(fromWaveWeight, toWaveWeight, morph);
    float waveAmplitude = mix(fromWaveAmplitude, toWaveAmplitude, morph);
    float waveSpeed = mix(fromWaveSpeed, toWaveSpeed, morph);
    vec2 waveFrequency = mix(fromWaveFrequency, toWaveFrequency, morph);
    worldPoint.y += waveWeight * waveAmplitude * sin(
      (worldPoint.x * waveFrequency.x)
      + (worldPoint.z * waveFrequency.y)
      + (ambientTime * waveSpeed)
    );

    float group = mix(fromGroup, toGroup, morph);
    float groupStrength = mix(fromGroupStrength, toGroupStrength, morph);
    float groupExists = step(0.5, group) * step(0.001, groupStrength);
    float focusActive = step(0.5, disciplineFocus);
    float focusMatch = 1.0 - step(0.45, abs(group - disciplineFocus));
    float groupWeight = groupExists * mix(1.0, mix(0.28, 1.0, focusMatch), focusActive);
    worldPoint.z += gridInfluence * step(0.001, groupStrength) * 0.22 * sin(
      (worldPoint.x * 0.82) + (worldPoint.y * 0.54) - (ambientTime * 0.45)
    );
    float colourWeight = mix(fromLivingColour, toLivingColour, morph);
    float livingBand = 0.5 + (0.5 * sin(
      (worldPoint.x * 0.72) + (worldPoint.z * 0.38) + (ambientTime * 0.18)
    ));
    vec3 livingColor = mix(
      disciplineColor1,
      disciplineColor2,
      0.5 + (0.5 * sin(pointSeed * 18.0))
    );
    pointTint = mix(pointColor, livingColor, colourWeight * smoothstep(0.72, 0.98, livingBand));
    pointTint = mix(pointTint, groupColor(group), groupWeight);

    vec4 viewPoint = modelViewMatrix * vec4(worldPoint, 1.0);
    gl_Position = projectionMatrix * viewPoint;
    float presence = mix(fromPresence, toPresence, morph);
    float sizeWeight = mix(fromPointSize, toPointSize, morph);
    float emphasis = 1.0 + (groupWeight * groupStrength) + (waveWeight * 0.18);
    gl_PointSize = pointSize * sizeWeight * emphasis * pixelRatio
      * clamp(5.0 / max(1.0, -viewPoint.z), 0.56, 3.2);
    pointAlpha = presence * (0.56 + (0.34 * sin((pointSeed * 19.0) + 1.4)));
  }
`;

const FRAGMENT_SHADER = `
  uniform float fieldOpacity;
  varying float pointAlpha;
  varying vec3 pointTint;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float radius = length(center);
    if (radius > 0.5 || pointAlpha <= 0.001) discard;
    float edge = 1.0 - smoothstep(0.34, 0.5, radius);
    gl_FragColor = vec4(pointTint, fieldOpacity * pointAlpha * edge);
  }
`;

function modifier(world, id) {
  return world?.modifiers?.find((item) => item.id === id && item.enabled !== false)?.parameters || null;
}

function readColorToken(styles, token, fallback) {
  return styles.getPropertyValue(token).trim() || fallback;
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

function writeWorldTransform(target, world, globals, compact, scratch) {
  if (!world) return target.identity();
  const transform = world.transform || {};
  const position = transform.position || [0, 0, 0];
  const rotation = transform.rotation || [0, 0, 0];
  const baseScale = Number(transform.scale ?? 1);
  const scale = compact && Number.isFinite(transform.mobileScale)
    ? Number(transform.mobileScale)
    : baseScale;
  const entryCameraZ = globals.camera.startZ - (world.startWU * globals.camera.cadence);
  scratch.position.set(
    position[0],
    position[1] + (compact ? Number(transform.mobileYOffset || 0) : 0),
    entryCameraZ - Number(world.entryDistanceWU || 0) + position[2],
  );
  scratch.euler.set(
    rotation[0],
    rotation[1],
    rotation[2],
    'YXZ',
  );
  scratch.quaternion.setFromEuler(scratch.euler);
  scratch.scale.set(scale, scale, scale);
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

function createPointFieldAdapter({ canvas, root, interaction, runtimeRef }) {
  const compact = window.matchMedia('(max-width: 600px), (pointer: coarse)').matches;
  const quality = compact ? 'mobile' : 'desktop';
  const pointCount = compact ? MOBILE_POINT_COUNT : DESKTOP_POINT_COUNT;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: 'high-performance',
  });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1, 0.08, 80);
  const geometry = new THREE.BufferGeometry();
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
    pointSize: { value: 3.6 },
    pixelRatio: { value: 1 },
    fromDriftAmplitude: { value: 0 },
    toDriftAmplitude: { value: 0 },
    fromDriftSpeed: { value: 0 },
    toDriftSpeed: { value: 0 },
    fromWaveWeight: { value: 0 },
    toWaveWeight: { value: 0 },
    fromWaveAmplitude: { value: 0 },
    toWaveAmplitude: { value: 0 },
    fromWaveSpeed: { value: 0 },
    toWaveSpeed: { value: 0 },
    fromWaveFrequency: { value: new THREE.Vector2(1, 1) },
    toWaveFrequency: { value: new THREE.Vector2(1, 1) },
    fromGroupStrength: { value: 0 },
    toGroupStrength: { value: 0 },
    disciplineFocus: { value: 0 },
    gridInfluence: { value: 0 },
    fromLivingColour: { value: 0 },
    toLivingColour: { value: 0 },
    fromBust: { value: 0 },
    toBust: { value: 0 },
    bustYaw: { value: 0 },
    pointColor: { value: new THREE.Color('#ffffff') },
    disciplineColor1: { value: new THREE.Color('#0d5cb6') },
    disciplineColor2: { value: new THREE.Color('#00695c') },
    disciplineColor3: { value: new THREE.Color('#ffa000') },
    disciplineColor4: { value: new THREE.Color('#d7ff2f') },
    fieldOpacity: { value: 0.82 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
  geometry.setAttribute('position', new THREE.BufferAttribute(emptyPositions, 3));
  geometry.setAttribute('targetPosition', new THREE.BufferAttribute(emptyPositions.slice(), 3));
  geometry.setAttribute('pointSeed', new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute('fromPresence', new THREE.BufferAttribute(emptyPresence, 1));
  geometry.setAttribute('toPresence', new THREE.BufferAttribute(emptyPresence.slice(), 1));
  geometry.setAttribute('fromPointSize', new THREE.BufferAttribute(emptySize, 1));
  geometry.setAttribute('toPointSize', new THREE.BufferAttribute(emptySize.slice(), 1));
  geometry.setAttribute('fromGroup', new THREE.BufferAttribute(emptyGroup, 1));
  geometry.setAttribute('toGroup', new THREE.BufferAttribute(emptyGroup.slice(), 1));
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);

  const shapeCache = new Map();
  let pairKey = '';
  let pendingKey = '';
  let generationController = null;
  let disposed = false;
  let contextAvailable = true;
  let width = 1;
  let latestFrame = null;
  let bustYaw = 0;
  let dragging = false;
  let dragStart = null;
  let resumeAt = 0;
  let bufferRebuilds = 0;
  let frameStartedAt = performance.now();
  let lastFrameTime = 0;
  const director = { active: false, yaw: 0, pitch: 0, distance: 0 };
  const directorTarget = new THREE.Vector3();
  const directorOffset = new THREE.Vector3();
  const directorEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  const fromTransformScratch = createTransformScratch();
  const toTransformScratch = createTransformScratch();

  const updateTheme = () => {
    const styles = getComputedStyle(root);
    uniforms.pointColor.value.setStyle(styles.color || '#ffffff');
    uniforms.disciplineColor1.value.setStyle(readColorToken(styles, '--ball-7', '#0d5cb6'));
    uniforms.disciplineColor2.value.setStyle(readColorToken(styles, '--ball-4', '#00695c'));
    uniforms.disciplineColor3.value.setStyle(readColorToken(styles, '--ball-8', '#ffa000'));
    uniforms.disciplineColor4.value.setStyle(readColorToken(styles, '--ball-6', '#d7ff2f'));
  };

  const resize = () => {
    const rect = root.getBoundingClientRect();
    width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const ratio = Math.min(window.devicePixelRatio || 1, compact ? 1.25 : 1.5);
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    uniforms.pixelRatio.value = ratio;
  };

  const getShape = async (world, signal) => {
    const key = shapeCacheKey(world, quality);
    if (shapeCache.has(key)) return shapeCache.get(key);
    const worldSeeds = createAboutNarrativeSeeds(pointCount, world.seed);
    const promise = generateAboutNarrativeShape({
      shapeId: world.shapeId,
      pointCount,
      seeds: worldSeeds,
      quality,
      parameters: world.shapeParameters,
      signal,
    }).catch((error) => {
      shapeCache.delete(key);
      throw error;
    });
    shapeCache.set(key, promise);
    return promise;
  };

  const installPair = (fromOutput, toOutput, fromWorld, toWorld, nextKey) => {
    if (disposed || pendingKey !== nextKey) return;
    const correspondence = toWorld.transitionIn?.correspondence || 'index-v1';
    const mappedTarget = applyAboutNarrativeCorrespondence(fromOutput, toOutput, correspondence);
    geometry.setAttribute('position', new THREE.BufferAttribute(fromOutput.positions, 3));
    geometry.setAttribute('targetPosition', new THREE.BufferAttribute(mappedTarget.positions, 3));
    geometry.setAttribute('fromPresence', new THREE.BufferAttribute(fromOutput.presence, 1));
    geometry.setAttribute('toPresence', new THREE.BufferAttribute(mappedTarget.presence, 1));
    geometry.setAttribute('fromPointSize', new THREE.BufferAttribute(fromOutput.size, 1));
    geometry.setAttribute('toPointSize', new THREE.BufferAttribute(mappedTarget.size, 1));
    geometry.setAttribute('fromGroup', new THREE.BufferAttribute(
      fromOutput.attributes.disciplineGroup || emptyGroup,
      1,
    ));
    geometry.setAttribute('toGroup', new THREE.BufferAttribute(
      mappedTarget.attributes.disciplineGroup || emptyGroup,
      1,
    ));
    pairKey = nextKey;
    bufferRebuilds += 1;
    root.dataset.pointAsset = toOutput.fallbackReason ? 'procedural-fallback' : toWorld.shapeId;
    root.dataset.worldPrepare = 'ready';
    root.dataset.worldFrom = fromWorld.shapeId;
    root.dataset.worldTo = toWorld.shapeId;
  };

  const preparePair = (fromWorld, toWorld) => {
    if (!fromWorld || !toWorld) return;
    const nextKey = `${shapeCacheKey(fromWorld, quality)}:${shapeCacheKey(toWorld, quality)}`;
    if (nextKey === pairKey || nextKey === pendingKey) return;
    pendingKey = nextKey;
    generationController?.abort();
    generationController = new AbortController();
    root.dataset.worldPrepare = 'loading';
    Promise.all([
      getShape(fromWorld, generationController.signal),
      getShape(toWorld, generationController.signal),
    ]).then(([fromOutput, toOutput]) => {
      installPair(fromOutput, toOutput, fromWorld, toWorld, nextKey);
    }).catch((error) => {
      if (error?.name === 'AbortError' || disposed) return;
      root.dataset.worldPrepare = 'failed';
      root.dataset.worldError = error.message;
      console.warn('[About narrative] Shape preparation failed; retaining the last valid field.', error);
    });
  };

  const setModifierUniforms = (prefix, world) => {
    const drift = modifier(world, 'ambient-drift-v1');
    const wave = modifier(world, 'living-wave-v1');
    const group = modifier(world, 'group-emphasis-v1');
    const colour = modifier(world, 'living-colour-v1');
    uniforms[`${prefix}DriftAmplitude`].value = Number(drift?.amplitude || 0);
    uniforms[`${prefix}DriftSpeed`].value = Number(drift?.speed || 0);
    uniforms[`${prefix}WaveWeight`].value = wave ? Number(wave.strength ?? 1) : 0;
    uniforms[`${prefix}WaveAmplitude`].value = Number(wave?.amplitude || 0);
    uniforms[`${prefix}WaveSpeed`].value = Number(wave?.speed || 0);
    uniforms[`${prefix}WaveFrequency`].value.set(
      Number(wave?.frequencyX || 1),
      Number(wave?.frequencyZ || 1),
    );
    uniforms[`${prefix}GroupStrength`].value = Number(group?.strength || 0);
    uniforms[`${prefix}LivingColour`].value = Number(colour?.strength || 0);
  };

  const render = (frame) => {
    latestFrame = frame;
    if (!frame || !contextAvailable || document.hidden) return;
    const fromWorld = frame.world.from || frame.world.to;
    const toWorld = frame.world.to || fromWorld;
    if (!fromWorld || !toWorld) return;
    preparePair(fromWorld, toWorld);
    const bust = modifier(toWorld, 'bust-yaw-v1');
    const now = performance.now() / 1000;
    if (!dragging && bust && !frame.reducedMotion && now >= resumeAt) {
      bustYaw += frame.deltaSeconds * Number(bust.speed || 0);
    }

    camera.position.fromArray(frame.camera.position);
    camera.up.set(Math.sin(frame.camera.roll), Math.cos(frame.camera.roll), 0);
    camera.lookAt(...frame.camera.target);
    if (director.active) {
      directorTarget.fromArray(frame.camera.target);
      directorOffset.copy(camera.position).sub(directorTarget);
      directorEuler.set(director.pitch, director.yaw, 0);
      directorOffset.applyEuler(directorEuler);
      directorOffset.setLength(Math.max(0.2, directorOffset.length() + director.distance));
      camera.position.copy(directorTarget).add(directorOffset);
      camera.up.set(0, 1, 0);
      camera.lookAt(directorTarget);
    }
    if (camera.fov !== frame.camera.fov) {
      camera.fov = frame.camera.fov;
      camera.updateProjectionMatrix();
    }
    writeWorldTransform(uniforms.fromTransform.value, fromWorld, frame.globals, compact, fromTransformScratch);
    writeWorldTransform(uniforms.toTransform.value, toWorld, frame.globals, compact, toTransformScratch);
    uniforms.morphProgress.value = frame.world.transitionProgress;
    uniforms.storyTime.value = frame.storyTime;
    uniforms.ambientTime.value = frame.ambientTime;
    uniforms.pointSize.value = frame.globals.pointMaterial.pointSize;
    uniforms.fieldOpacity.value = frame.globals.pointMaterial.opacity;
    setModifierUniforms('from', fromWorld);
    setModifierUniforms('to', toWorld);
    if (frame.reducedMotion) {
      uniforms.fromDriftAmplitude.value = 0;
      uniforms.toDriftAmplitude.value = 0;
      uniforms.fromWaveSpeed.value = 0;
      uniforms.toWaveSpeed.value = 0;
    }
    uniforms.fromBust.value = fromWorld.shapeId === 'bust-v1' ? 1 : 0;
    uniforms.toBust.value = toWorld.shapeId === 'bust-v1' ? 1 : 0;
    uniforms.bustYaw.value = bustYaw;
    uniforms.disciplineFocus.value = Number(frame.editorialSignals?.disciplineFocus || 0);
    uniforms.gridInfluence.value = frame.reducedMotion
      ? 0
      : Number(frame.editorialSignals?.gridInfluence || 0);
    root.dataset.worldGroupFocus = String(uniforms.disciplineFocus.value);
    root.dataset.worldGridInfluence = uniforms.gridInfluence.value.toFixed(4);

    const interactionEnabled = frame.section.interaction?.type === 'horizontal-spin'
      && frame.localProgress >= Number(frame.section.interaction.activationStart || 0);
    interaction.dataset.active = interactionEnabled ? 'true' : 'false';
    interaction.tabIndex = interactionEnabled ? 0 : -1;
    root.dataset.worldStage = toWorld.shapeId;
    root.dataset.cameraCadence = frame.globals.camera.cadenceLocked ? 'locked-world-units-v1' : 'editable-world-units-v1';
    root.style.setProperty('--narrative-camera-forward', (frame.globals.camera.startZ - frame.camera.position[2]).toFixed(4));
    root.style.setProperty('--narrative-camera-roll', frame.camera.roll.toFixed(4));
    root.style.setProperty('--narrative-camera-fov', frame.camera.fov.toFixed(2));
    root.style.setProperty('--narrative-bust-yaw', bustYaw.toFixed(4));
    frameStartedAt = performance.now();
    renderer.render(scene, camera);
    lastFrameTime = performance.now() - frameStartedAt;
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
      dragging = true;
      interaction.setPointerCapture(event.pointerId);
    }
    if (!dragging) return;
    event.preventDefault();
    const bust = modifier(latestFrame?.world?.to, 'bust-yaw-v1');
    bustYaw = dragStart.yaw + ((deltaX / Math.max(320, width)) * Math.PI * 2 * Number(bust?.dragSensitivity || 1));
  };
  const handlePointerEnd = (event) => {
    if (dragging && interaction.hasPointerCapture(event.pointerId)) interaction.releasePointerCapture(event.pointerId);
    const bust = modifier(latestFrame?.world?.to, 'bust-yaw-v1');
    resumeAt = (performance.now() / 1000) + Number(bust?.resumeDelay || 0);
    dragStart = null;
    dragging = false;
  };
  const handleKeyDown = (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    bustYaw += event.key === 'ArrowLeft' ? -0.16 : 0.16;
  };
  const handleContextLost = (event) => {
    event.preventDefault();
    contextAvailable = false;
    root.dataset.pointWorldState = 'context-lost';
  };
  const handleContextRestored = () => {
    contextAvailable = true;
    root.dataset.pointWorldState = 'ready';
    resize();
    updateTheme();
  };

  const resizeObserver = new ResizeObserver(resize);
  const themeObserver = new MutationObserver(updateTheme);
  resizeObserver.observe(root);
  themeObserver.observe(root, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
  interaction.addEventListener('pointerdown', handlePointerDown);
  interaction.addEventListener('pointermove', handlePointerMove, { passive: false });
  interaction.addEventListener('pointerup', handlePointerEnd);
  interaction.addEventListener('pointercancel', handlePointerEnd);
  interaction.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('webglcontextlost', handleContextLost);
  canvas.addEventListener('webglcontextrestored', handleContextRestored);
  resize();
  updateTheme();
  root.dataset.pointWorldState = 'ready';
  runtimeRef.current = {
    render,
    getMetrics: () => ({
      adapterId: 'point-field-v1',
      pointCount,
      drawCalls: renderer.info.render.calls,
      frameTimeMs: lastFrameTime,
      bufferRebuilds,
      cacheEntries: shapeCache.size,
      activeModifiers: latestFrame?.world?.to?.modifiers?.filter((item) => item.enabled).length || 0,
    }),
    frameSelectedWorld: () => null,
    setDirectorView: (active) => { director.active = Boolean(active); },
    nudgeDirector: ({ yaw = 0, pitch = 0, distance = 0 }) => {
      director.yaw += yaw;
      director.pitch = Math.max(-1.2, Math.min(1.2, director.pitch + pitch));
      director.distance += distance;
    },
    resetDirector: () => { director.yaw = 0; director.pitch = 0; director.distance = 0; },
  };

  return () => {
    disposed = true;
    generationController?.abort();
    runtimeRef.current = null;
    resizeObserver.disconnect();
    themeObserver.disconnect();
    interaction.removeEventListener('pointerdown', handlePointerDown);
    interaction.removeEventListener('pointermove', handlePointerMove);
    interaction.removeEventListener('pointerup', handlePointerEnd);
    interaction.removeEventListener('pointercancel', handlePointerEnd);
    interaction.removeEventListener('keydown', handleKeyDown);
    canvas.removeEventListener('webglcontextlost', handleContextLost);
    canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    delete root.dataset.worldStage;
    delete root.dataset.cameraCadence;
    delete root.dataset.pointAsset;
    delete root.dataset.pointWorldState;
    delete root.dataset.worldPrepare;
    delete root.dataset.worldError;
    root.style.removeProperty('--narrative-camera-forward');
    root.style.removeProperty('--narrative-camera-roll');
    root.style.removeProperty('--narrative-camera-fov');
    root.style.removeProperty('--narrative-bust-yaw');
  };
}

export function AboutNarrativePointWorld3D({ rootRef, interactionRef, runtimeRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    const interaction = interactionRef.current;
    if (!canvas || !root || !interaction) return undefined;
    try {
      return createPointFieldAdapter({ canvas, root, interaction, runtimeRef });
    } catch (error) {
      root.dataset.pointWorldState = 'unavailable';
      console.warn('[About narrative] Point world unavailable; continuing with editorial content.', error);
      return () => { delete root.dataset.pointWorldState; };
    }
  }, [interactionRef, rootRef, runtimeRef]);

  return <canvas ref={canvasRef} className="about-narrative-world__canvas" aria-hidden="true" />;
}
