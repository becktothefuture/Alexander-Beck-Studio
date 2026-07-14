import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ABOUT_NARRATIVE_STAGES } from './aboutNarrativeStages.js';

const DESKTOP_POINT_COUNT = 12000;
const MOBILE_POINT_COUNT = 5000;
const CAMERA_START_Z = 8;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

const VERTEX_SHADER = `
  attribute vec3 targetPosition;
  attribute float pointSeed;
  uniform mat4 fromTransform;
  uniform mat4 toTransform;
  uniform float morphProgress;
  uniform float elapsedTime;
  uniform float pointSize;
  uniform float pixelRatio;
  uniform float waveStrength;
  uniform float fromLiving;
  uniform float toLiving;
  uniform float fromBust;
  uniform float toBust;
  uniform float bustYaw;
  varying float pointAlpha;

  vec3 rotateY(vec3 value, float angle) {
    float sine = sin(angle);
    float cosine = cos(angle);
    return vec3(
      (cosine * value.x) + (sine * value.z),
      value.y,
      (-sine * value.x) + (cosine * value.z)
    );
  }

  void main() {
    float easedMorph = smoothstep(0.0, 1.0, morphProgress);
    vec3 fromPoint = mix(position, rotateY(position, bustYaw), fromBust);
    vec3 toPoint = mix(targetPosition, rotateY(targetPosition, bustYaw), toBust);
    vec3 fromWorld = (fromTransform * vec4(fromPoint, 1.0)).xyz;
    vec3 toWorld = (toTransform * vec4(toPoint, 1.0)).xyz;
    vec3 worldPoint = mix(fromWorld, toWorld, easedMorph);
    float livingWeight = mix(fromLiving, toLiving, easedMorph);
    float ambient = sin((elapsedTime * 0.62) + (pointSeed * 31.0));
    worldPoint.y += ambient * 0.025;
    worldPoint.y += livingWeight * waveStrength * 0.12
      * sin((worldPoint.x * 1.15) + (worldPoint.z * 0.72) + (elapsedTime * 0.42));

    vec4 viewPoint = modelViewMatrix * vec4(worldPoint, 1.0);
    gl_Position = projectionMatrix * viewPoint;
    gl_PointSize = pointSize * pixelRatio * clamp(5.0 / max(1.0, -viewPoint.z), 0.56, 3.2);
    pointAlpha = 0.56 + (0.34 * sin((pointSeed * 19.0) + 1.4));
  }
`;

const FRAGMENT_SHADER = `
  uniform vec3 pointColor;
  uniform float fieldOpacity;
  varying float pointAlpha;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float radius = length(center);
    if (radius > 0.5) discard;
    float edge = 1.0 - smoothstep(0.34, 0.5, radius);
    gl_FragColor = vec4(pointColor, fieldOpacity * pointAlpha * edge);
  }
`;

function createRandom(seed = 0x2f6e2b1) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function createSeeds(count) {
  const random = createRandom(0x1e35a7bd);
  return Float32Array.from({ length: count }, random);
}

function createCluster(count, seeds) {
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const seed = seeds[index];
    const radius = 2.7 * Math.cbrt((seed * 0.83 + ((index % 97) / 97)) % 1);
    const y = 1 - (2 * ((index + 0.5) / count));
    const ringRadius = Math.sqrt(Math.max(0, 1 - (y * y)));
    const angle = index * GOLDEN_ANGLE;
    const offset = index * 3;
    positions[offset] = Math.cos(angle) * ringRadius * radius;
    positions[offset + 1] = y * radius;
    positions[offset + 2] = Math.sin(angle) * ringRadius * radius;
  }
  return positions;
}

function createAperture(count, seeds) {
  const positions = new Float32Array(count * 3);
  const rings = 18;
  for (let index = 0; index < count; index += 1) {
    const ring = index % rings;
    const radius = 0.38 + ((ring / (rings - 1)) * 3.5);
    const angle = ((index / count) * Math.PI * 2 * rings) + (ring * 0.21);
    const offset = index * 3;
    positions[offset] = Math.cos(angle) * radius;
    positions[offset + 1] = Math.sin(angle) * radius;
    positions[offset + 2] = (seeds[index] - 0.5) * 0.34;
  }
  return positions;
}

function createTraverse(count, seeds) {
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const seed = seeds[index];
    const angle = index * GOLDEN_ANGLE;
    const radius = 2.2 + (seed * 3.2);
    const offset = index * 3;
    positions[offset] = Math.cos(angle) * radius;
    positions[offset + 1] = Math.sin(angle) * radius * 0.72;
    positions[offset + 2] = -7 + (14 * ((index % 613) / 612));
  }
  return positions;
}

function createLivingField(count, seeds) {
  const positions = new Float32Array(count * 3);
  const terrainCount = Math.floor(count * 0.86);
  const columns = Math.max(20, Math.floor(Math.sqrt(terrainCount * 1.4)));
  for (let index = 0; index < terrainCount; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const rows = Math.ceil(terrainCount / columns);
    const x = ((column / Math.max(1, columns - 1)) - 0.5) * 12;
    const z = ((row / Math.max(1, rows - 1)) - 0.5) * 15;
    const offset = index * 3;
    positions[offset] = x + ((seeds[index] - 0.5) * 0.11);
    positions[offset + 1] = -1.6 + (Math.sin(x * 0.66) * 0.34) + (Math.cos(z * 0.48) * 0.28);
    positions[offset + 2] = z;
  }
  for (let index = terrainCount; index < count; index += 1) {
    const localIndex = index - terrainCount;
    const body = localIndex % 3;
    const angle = localIndex * GOLDEN_ANGLE;
    const radius = Math.sqrt((localIndex % 311) / 311) * (0.75 + (body * 0.22));
    const centers = [[-2.7, 0.8, -1.5], [2.5, 1.6, -3.8], [1.1, 0.15, 2.1]];
    const offset = index * 3;
    positions[offset] = centers[body][0] + (Math.cos(angle) * radius);
    positions[offset + 1] = centers[body][1] + (Math.sin(angle) * radius);
    positions[offset + 2] = centers[body][2] + ((seeds[index] - 0.5) * radius);
  }
  return positions;
}

function createBustFallback(count, seeds) {
  const positions = createCluster(count, seeds);
  for (let index = 0; index < count; index += 1) {
    const offset = index * 3;
    positions[offset] *= 0.72;
    positions[offset + 1] = (positions[offset + 1] * 1.1) - 0.2;
    positions[offset + 2] *= 0.64;
  }
  return positions;
}

function normalizeBust(source, count) {
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const sourceIndex = (index % (source.length / 8)) * 8;
    const targetIndex = index * 3;
    positions[targetIndex] = source[sourceIndex];
    positions[targetIndex + 1] = source[sourceIndex + 1];
    positions[targetIndex + 2] = source[sourceIndex + 2];
  }
  return positions;
}

async function loadBust(count) {
  const quality = count <= MOBILE_POINT_COUNT ? 'low' : 'medium';
  const metaResponse = await fetch('/models/napoleon-bust/meta.json');
  if (!metaResponse.ok) throw new Error(`Bust metadata failed: ${metaResponse.status}`);
  const metadata = await metaResponse.json();
  const lod = metadata.lods[quality];
  const response = await fetch(`/models/napoleon-bust/${lod.file}`);
  if (!response.ok) throw new Error(`Bust points failed: ${response.status}`);
  return normalizeBust(new Float32Array(await response.arrayBuffer()), count);
}

function composeStageTransform(stageId, stageStartWU, cameraSpeed, settings) {
  const stage = ABOUT_NARRATIVE_STAGES[stageId];
  const transform = stage.transform;
  const scale = transform.scale * (stage.shape === 'bust' ? settings.bustScale / 0.58 : 1);
  const position = new THREE.Vector3(
    transform.x,
    transform.y,
    CAMERA_START_Z - (stageStartWU * cameraSpeed) - stage.cameraDistanceWU,
  );
  return new THREE.Matrix4().compose(position, new THREE.Quaternion(), new THREE.Vector3(scale, scale, scale));
}

function createWorldRuntime({ canvas, root, interaction, runtimeRef }) {
  const mobile = window.matchMedia('(max-width: 600px), (pointer: coarse)').matches;
  const pointCount = mobile ? MOBILE_POINT_COUNT : DESKTOP_POINT_COUNT;
  const seeds = createSeeds(pointCount);
  const shapes = {
    cluster: createCluster(pointCount, seeds),
    aperture: createAperture(pointCount, seeds),
    traverse: createTraverse(pointCount, seeds),
    'living-field': createLivingField(pointCount, seeds),
    bust: createBustFallback(pointCount, seeds),
  };
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1, 0.08, 60);
  const geometry = new THREE.BufferGeometry();
  const uniforms = {
    fromTransform: { value: new THREE.Matrix4() },
    toTransform: { value: new THREE.Matrix4() },
    morphProgress: { value: 0 },
    elapsedTime: { value: 0 },
    pointSize: { value: 3.6 },
    pixelRatio: { value: 1 },
    waveStrength: { value: 0.68 },
    fromLiving: { value: 0 },
    toLiving: { value: 0 },
    fromBust: { value: 0 },
    toBust: { value: 0 },
    bustYaw: { value: 0 },
    pointColor: { value: new THREE.Color('#ffffff') },
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
  geometry.setAttribute('position', new THREE.BufferAttribute(shapes.cluster, 3));
  geometry.setAttribute('targetPosition', new THREE.BufferAttribute(shapes.cluster, 3));
  geometry.setAttribute('pointSeed', new THREE.BufferAttribute(seeds, 1));
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);

  let width = 1;
  let height = 1;
  let currentPair = '';
  let bustYaw = 0;
  let dragStart = null;
  let dragging = false;
  let latestSnapshot = null;
  let disposed = false;

  const resize = () => {
    const rect = root.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    uniforms.pixelRatio.value = pixelRatio;
  };

  const setPair = (fromStageId, toStageId) => {
    const pair = `${fromStageId}:${toStageId}`;
    if (pair === currentPair) return;
    currentPair = pair;
    geometry.setAttribute('position', new THREE.BufferAttribute(shapes[ABOUT_NARRATIVE_STAGES[fromStageId].shape], 3));
    geometry.setAttribute('targetPosition', new THREE.BufferAttribute(shapes[ABOUT_NARRATIVE_STAGES[toStageId].shape], 3));
  };

  const render = (snapshot) => {
    latestSnapshot = snapshot;
    const { settings } = snapshot;
    setPair(snapshot.fromStageId, snapshot.stageId);
    if (!dragging && snapshot.stageId === 'bust-resolve' && !snapshot.reducedMotion) {
      bustYaw += snapshot.deltaSeconds * settings.bustRotationSpeed;
    }
    camera.position.set(0, 0, CAMERA_START_Z - snapshot.cameraPositionWU);
    camera.rotation.set(0, 0, snapshot.stageChanges ? Math.sin(snapshot.stageMorph * Math.PI) * settings.cameraRoll : 0);
    uniforms.fromTransform.value.copy(composeStageTransform(
      snapshot.fromStageId,
      snapshot.fromStageStartWU,
      settings.cameraSpeed,
      settings,
    ));
    uniforms.toTransform.value.copy(composeStageTransform(
      snapshot.stageId,
      snapshot.stageStartWU,
      settings.cameraSpeed,
      settings,
    ));
    uniforms.morphProgress.value = snapshot.stageMorph;
    uniforms.elapsedTime.value = snapshot.reducedMotion ? 0 : snapshot.elapsedSeconds;
    uniforms.pointSize.value = settings.pointSize;
    uniforms.waveStrength.value = settings.waveStrength;
    uniforms.fromLiving.value = snapshot.fromStageId === 'living-field' ? 1 : 0;
    uniforms.toLiving.value = snapshot.stageId === 'living-field' ? 1 : 0;
    uniforms.fromBust.value = snapshot.fromStageId === 'bust-resolve' ? 1 : 0;
    uniforms.toBust.value = snapshot.stageId === 'bust-resolve' ? 1 : 0;
    uniforms.bustYaw.value = bustYaw;
    uniforms.fieldOpacity.value = settings.fieldOpacity;
    uniforms.pointColor.value.setStyle(getComputedStyle(root).color || '#ffffff');
    interaction.dataset.active = snapshot.stageId === 'bust-resolve' && snapshot.stageMorph > 0.54 ? 'true' : 'false';
    interaction.tabIndex = interaction.dataset.active === 'true' ? 0 : -1;
    root.dataset.worldStage = snapshot.stageId;
    root.dataset.cameraCadence = 'linear-world-units-v1';
    root.style.setProperty('--narrative-camera-forward', snapshot.cameraPositionWU.toFixed(4));
    root.style.setProperty('--narrative-bust-yaw', bustYaw.toFixed(4));
    renderer.render(scene, camera);
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
    bustYaw = dragStart.yaw + ((deltaX / Math.max(320, width)) * Math.PI * 2 * (latestSnapshot?.settings.bustDragSensitivity || 1));
  };
  const handlePointerEnd = (event) => {
    if (dragging && interaction.hasPointerCapture(event.pointerId)) interaction.releasePointerCapture(event.pointerId);
    dragStart = null;
    dragging = false;
  };
  const handleKeyDown = (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    bustYaw += event.key === 'ArrowLeft' ? -0.16 : 0.16;
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(root);
  interaction.addEventListener('pointerdown', handlePointerDown);
  interaction.addEventListener('pointermove', handlePointerMove, { passive: false });
  interaction.addEventListener('pointerup', handlePointerEnd);
  interaction.addEventListener('pointercancel', handlePointerEnd);
  interaction.addEventListener('keydown', handleKeyDown);
  resize();
  runtimeRef.current = { render };

  loadBust(pointCount).then((positions) => {
    if (disposed) return;
    shapes.bust = positions;
    currentPair = '';
    root.dataset.pointAsset = 'napoleon-bust';
  }).catch((error) => {
    if (disposed) return;
    root.dataset.pointAsset = 'procedural-fallback';
    console.warn('[About narrative] Could not load point-cloud asset.', error);
  });

  return () => {
    disposed = true;
    runtimeRef.current = null;
    resizeObserver.disconnect();
    interaction.removeEventListener('pointerdown', handlePointerDown);
    interaction.removeEventListener('pointermove', handlePointerMove);
    interaction.removeEventListener('pointerup', handlePointerEnd);
    interaction.removeEventListener('pointercancel', handlePointerEnd);
    interaction.removeEventListener('keydown', handleKeyDown);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    delete root.dataset.worldStage;
    delete root.dataset.cameraCadence;
    delete root.dataset.pointAsset;
    root.style.removeProperty('--narrative-camera-forward');
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
    return createWorldRuntime({ canvas, root, interaction, runtimeRef });
  }, [interactionRef, rootRef, runtimeRef]);

  return <canvas ref={canvasRef} className="about-narrative-world__canvas" aria-hidden="true" />;
}
