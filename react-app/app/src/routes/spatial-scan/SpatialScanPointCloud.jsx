import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { withBasePath } from '../../lib/base-path.js';
import './spatial-scan.css';

const ASSET_BASE_URL = withBasePath('/models/spatial-scan');
const POINT_CLOUD_META_URL = `${ASSET_BASE_URL}/meta.json`;
const CAMERA_PATH_URL = `${ASSET_BASE_URL}/camera-path.json`;
const QUALITY_ORDER = ['low', 'medium', 'high'];
const ATTRIBUTE_STRIDE_FLOATS = 8;
const DEFAULT_CAMERA_FRAME = Object.freeze({
  t: 0,
  position: [0, 0.08, 2.25],
  quaternion: [0, 0, 0, 1],
  fov: 48,
});
const DEFAULT_THEME = {
  palette: ['#b5b7b6', '#bbbdbd', '#ffffff', '#00695c', '#000000', '#d7ff2f', '#0d5cb6', '#ffa000'],
  colorDistribution: [
    { label: 'Product Systems', colorIndex: 0, weight: 44 },
    { label: 'Experience Strategy', colorIndex: 3, weight: 14 },
    { label: 'Art Direction', colorIndex: 2, weight: 17 },
    { label: 'Generative R&D', colorIndex: 6, weight: 11 },
    { label: 'Creative Engineering', colorIndex: 7, weight: 7 },
    { label: 'Parametric Systems', colorIndex: 5, weight: 7 },
  ],
};

function isHexColor(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value || '').trim());
}

function hexToRgbUnit(hex) {
  const clean = String(hex || '').replace('#', '');
  const value = Number.parseInt(clean, 16);
  if (!Number.isFinite(value)) return [0.72, 0.72, 0.72];
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ];
}

function readCssBallPalette() {
  if (typeof window === 'undefined') return [];
  const styles = window.getComputedStyle(document.documentElement);
  return Array.from({ length: 8 }, (_, index) => styles.getPropertyValue(`--ball-${index + 1}`).trim())
    .filter(isHexColor);
}

function resolvePalette(theme) {
  const cssPalette = readCssBallPalette();
  if (cssPalette.length === 8) return cssPalette;
  const source = Array.isArray(theme?.palette) ? theme.palette : DEFAULT_THEME.palette;
  const palette = source.filter(isHexColor);
  return palette.length ? palette : DEFAULT_THEME.palette;
}

function resolveColorDistribution(theme, paletteLength) {
  const source = Array.isArray(theme?.colorDistribution)
    ? theme.colorDistribution
    : DEFAULT_THEME.colorDistribution;
  const distribution = [];

  for (const row of source) {
    const colorIndex = Math.round(Number(row?.colorIndex));
    const weight = Number(row?.weight);
    if (
      Number.isFinite(colorIndex)
      && colorIndex >= 0
      && colorIndex < paletteLength
      && Number.isFinite(weight)
      && weight > 0
    ) {
      distribution.push({ colorIndex, weight });
    }
  }

  return distribution.length ? distribution : DEFAULT_THEME.colorDistribution;
}

function buildGroupColors(theme, colourMode) {
  const palette = resolvePalette(theme);
  const distribution = resolveColorDistribution(theme, palette.length);
  const dominant = palette[distribution[0]?.colorIndex] || palette[0];

  return Array.from({ length: 8 }, (_, index) => {
    if (colourMode === 'dominant') return hexToRgbUnit(dominant);
    const row = distribution[index % distribution.length] || distribution[0];
    return hexToRgbUnit(palette[row?.colorIndex] || dominant);
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function resolveQuality(quality, mobileQuality) {
  const requested = QUALITY_ORDER.includes(quality) ? quality : 'medium';
  if (typeof window === 'undefined') return requested;
  const isMobile = (window.innerWidth || 1024) < 680;
  if (!isMobile) return requested;
  return QUALITY_ORDER.includes(mobileQuality) ? mobileQuality : 'low';
}

function resolveDpr(maxDpr) {
  const deviceDpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  const viewportWidth = typeof window === 'undefined' ? 1024 : window.innerWidth || 1024;
  const configuredMax = clamp(Number(maxDpr) || 1.4, 0.75, 2);
  const mobileMax = viewportWidth < 520 ? 1.1 : (viewportWidth < 820 ? 1.25 : configuredMax);
  return clamp(Math.min(deviceDpr, configuredMax, mobileMax), 0.75, 2);
}

function resolvePointDensity(pointDensity) {
  return clamp(Number(pointDensity) || 1, 0.08, 1);
}

function getVisiblePointCount(pointCount, pointDensity) {
  if (!pointCount) return 0;
  return Math.max(1, Math.round(pointCount * resolvePointDensity(pointDensity)));
}

function parsePointCloudBuffer(buffer) {
  const source = new Float32Array(buffer);
  const pointCount = Math.floor(source.length / ATTRIBUTE_STRIDE_FLOATS);
  const positions = new Float32Array(pointCount * 3);
  const normals = new Float32Array(pointCount * 3);
  const seeds = new Float32Array(pointCount);
  const groups = new Float32Array(pointCount);

  for (let i = 0; i < pointCount; i += 1) {
    const src = i * ATTRIBUTE_STRIDE_FLOATS;
    const vec = i * 3;
    positions[vec] = source[src];
    positions[vec + 1] = source[src + 1];
    positions[vec + 2] = source[src + 2];
    normals[vec] = source[src + 3];
    normals[vec + 1] = source[src + 4];
    normals[vec + 2] = source[src + 5];
    seeds[i] = source[src + 6];
    groups[i] = source[src + 7];
  }

  return { positions, normals, seeds, groups, pointCount };
}

function normalizeCameraPath(path) {
  const frames = Array.isArray(path?.frames)
    ? path.frames
      .map((frame) => ({
        t: Number(frame?.t),
        position: Array.isArray(frame?.position) && frame.position.length >= 3
          ? frame.position.slice(0, 3).map(Number)
          : null,
        quaternion: Array.isArray(frame?.quaternion) && frame.quaternion.length >= 4
          ? frame.quaternion.slice(0, 4).map(Number)
          : null,
        fov: Number(frame?.fov),
      }))
      .filter((frame) => (
        Number.isFinite(frame.t)
        && frame.position?.every(Number.isFinite)
        && frame.quaternion?.every(Number.isFinite)
      ))
      .sort((a, b) => a.t - b.t)
    : [];

  if (!frames.length) return { version: 1, durationSeconds: 18, frames: [DEFAULT_CAMERA_FRAME] };
  const durationSeconds = Number(path?.durationSeconds);
  return {
    version: 1,
    durationSeconds: Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : 18,
    frames,
  };
}

function sampleCameraFrame(path, progress, state) {
  const frames = path.frames;
  if (frames.length === 1) return frames[0];
  const lastFrame = frames[frames.length - 1];
  const maxT = lastFrame.t > 0 ? lastFrame.t : 1;
  const sampleT = clamp(progress, 0, 1) * maxT;
  let endIndex = frames.findIndex((frame) => frame.t >= sampleT);
  if (endIndex <= 0) endIndex = 1;
  const start = frames[endIndex - 1] || frames[0];
  const end = frames[endIndex] || lastFrame;
  const span = Math.max(1e-6, end.t - start.t);
  const amount = clamp((sampleT - start.t) / span, 0, 1);

  state.position.fromArray(start.position).lerp(state.nextPosition.fromArray(end.position), amount);
  state.quaternion
    .fromArray(start.quaternion)
    .slerp(state.nextQuaternion.fromArray(end.quaternion), amount);

  return {
    position: state.position.toArray(state.positionArray),
    quaternion: state.quaternion.toArray(state.quaternionArray),
    fov: Number.isFinite(start.fov) && Number.isFinite(end.fov)
      ? start.fov + ((end.fov - start.fov) * amount)
      : DEFAULT_CAMERA_FRAME.fov,
  };
}

function easeValue(current, target, rate, deltaSeconds) {
  const amount = 1 - Math.exp(-rate * deltaSeconds);
  return current + ((target - current) * amount);
}

function makePointMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthTest: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uPointSize: { value: 5 },
      uPixelRatio: { value: 1 },
      uOpacity: { value: 0.9 },
      uSpread: { value: 0 },
      uBreathing: { value: 0.02 },
      uErosion: { value: 0.18 },
    },
    vertexShader: `
      attribute vec3 color;
      attribute vec3 normalOffset;
      attribute float pointSeed;
      varying vec3 vColor;
      varying float vSeed;

      uniform float uTime;
      uniform float uPointSize;
      uniform float uPixelRatio;
      uniform float uSpread;
      uniform float uBreathing;

      void main() {
        vColor = color;
        vSeed = pointSeed;
        vec3 displaced = position;
        float breath = sin((uTime * 0.74) + (pointSeed * 6.28318530718)) * uBreathing * 0.018;
        displaced += normalOffset * ((uSpread * 0.2) + breath);

        vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        float perspectiveScale = 1.65 / max(0.72, -mvPosition.z);
        gl_PointSize = max(1.4, uPointSize * uPixelRatio * perspectiveScale);
      }
    `,
    fragmentShader: `
      precision mediump float;
      varying vec3 vColor;
      varying float vSeed;
      uniform float uOpacity;
      uniform float uErosion;

      void main() {
        float gate = fract(sin(vSeed * 43758.5453123) * 138.172);
        if (gate < uErosion) discard;
        vec2 coord = gl_PointCoord - vec2(0.5);
        float distanceFromCenter = length(coord);
        if (distanceFromCenter > 0.5) discard;
        float edgeAlpha = 1.0 - smoothstep(0.46, 0.5, distanceFromCenter);
        gl_FragColor = vec4(vColor, edgeAlpha * uOpacity);
      }
    `,
  });
}

function disposeRuntime(runtime) {
  runtime?.scene?.clear();
  runtime?.geometry?.dispose();
  runtime?.material?.dispose();
  runtime?.renderer?.dispose();
}

export function SpatialScanPointCloud({
  quality = 'low',
  mobileQuality = 'low',
  pointDensity = 0.42,
  dotSize = 17.2,
  dotOpacity = 0.9,
  colourMode = 'surface-bands',
  cameraMode = 'loop',
  loopDuration = 18,
  scrollSmoothing = 0.12,
  interactionStrength = 0.42,
  erosionStrength = 0.18,
  spread = 0.055,
  breathingMotion = 0.28,
  maxDpr = 1.4,
  reducedMotion = false,
  className = '',
  ariaLabel = 'A flat-circle point-cloud scan route with a baked camera path',
  decorative = false,
  theme = DEFAULT_THEME,
}) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const runtimeRef = useRef(null);
  const dragRef = useRef({ active: false, pointerId: null, x: 0, y: 0 });
  const rotationRef = useRef({ x: -0.05, y: -0.24, z: 0 });
  const targetRotationRef = useRef({ x: -0.05, y: -0.24, z: 0 });
  const settingsRef = useRef({
    breathingMotion,
    cameraMode,
    dotOpacity,
    dotSize,
    erosionStrength,
    interactionStrength,
    loopDuration,
    pointDensity,
    scrollSmoothing,
    spread,
  });
  const [meta, setMeta] = useState(null);
  const [cameraPath, setCameraPath] = useState(null);
  const [error, setError] = useState('');
  const resolvedQuality = resolveQuality(quality, mobileQuality);
  const groupColors = useMemo(() => buildGroupColors(theme, colourMode), [theme, colourMode]);

  useEffect(() => {
    settingsRef.current = {
      breathingMotion,
      cameraMode,
      dotOpacity,
      dotSize,
      erosionStrength,
      interactionStrength,
      loopDuration,
      pointDensity,
      scrollSmoothing,
      spread,
    };
  }, [
    breathingMotion,
    cameraMode,
    dotOpacity,
    dotSize,
    erosionStrength,
    interactionStrength,
    loopDuration,
    pointDensity,
    scrollSmoothing,
    spread,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadManifest() {
      try {
        const [metaResponse, pathResponse] = await Promise.all([
          fetch(POINT_CLOUD_META_URL, { cache: 'no-store' }),
          fetch(CAMERA_PATH_URL, { cache: 'no-store' }),
        ]);
        if (!metaResponse.ok) throw new Error(`Spatial scan metadata request failed with ${metaResponse.status}`);
        if (!pathResponse.ok) throw new Error(`Spatial scan camera path request failed with ${pathResponse.status}`);
        const [nextMeta, nextCameraPath] = await Promise.all([
          metaResponse.json(),
          pathResponse.json(),
        ]);
        if (!cancelled) {
          setMeta(nextMeta);
          setCameraPath(normalizeCameraPath(nextCameraPath));
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError?.message || 'Spatial scan metadata failed to load');
      }
    }

    loadManifest();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime?.geometry) return;
    const colors = new Float32Array(runtime.groups.length * 3);
    for (let i = 0; i < runtime.groups.length; i += 1) {
      const color = groupColors[Math.round(runtime.groups[i]) % groupColors.length] || groupColors[0];
      const offset = i * 3;
      colors[offset] = color[0];
      colors[offset + 1] = color[1];
      colors[offset + 2] = color[2];
    }
    runtime.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    runtime.geometry.attributes.color.needsUpdate = true;
  }, [groupColors]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime?.geometry || !runtime.pointCount) return;
    const visiblePointCount = getVisiblePointCount(runtime.pointCount, pointDensity);
    runtime.pointDensity = resolvePointDensity(pointDensity);
    runtime.visiblePointCount = visiblePointCount;
    runtime.geometry.setDrawRange(0, visiblePointCount);
  }, [pointDensity]);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas || !meta || !cameraPath) return undefined;

    const asset = meta.lods?.[resolvedQuality] || meta.lods?.medium || meta.lods?.low;
    if (!asset?.file) {
      setError(`No ${resolvedQuality} spatial scan point-cloud asset is defined`);
      return undefined;
    }

    const abort = new AbortController();
    let frame = 0;
    let resizeObserver = null;
    let intersectionObserver = null;
    let destroyed = false;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, 1, 0.05, 80);
    const group = new THREE.Group();
    scene.add(group);
    let renderer = null;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
      });
    } catch {
      renderer?.dispose();
      setError('WebGL is unavailable, so the spatial scan cannot render in this browser.');
      return undefined;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const material = makePointMaterial();
    const geometry = new THREE.BufferGeometry();
    const points = new THREE.Points(geometry, material);
    group.add(points);

    const runtime = {
      scene,
      camera,
      group,
      renderer,
      geometry,
      material,
      points,
      groups: new Float32Array(0),
      visible: true,
      pageVisible: document.visibilityState !== 'hidden',
      startedAt: performance.now(),
      renderedFrames: 0,
      lastFrameAt: performance.now(),
      pointCount: 0,
      visiblePointCount: 0,
      quality: resolvedQuality,
      loadState: 'initializing',
      scrollProgress: 0,
      targetScrollProgress: 0,
      cameraSampleState: {
        position: new THREE.Vector3(),
        nextPosition: new THREE.Vector3(),
        quaternion: new THREE.Quaternion(),
        nextQuaternion: new THREE.Quaternion(),
        positionArray: [0, 0, 0],
        quaternionArray: [0, 0, 0, 1],
      },
    };
    runtimeRef.current = runtime;

    function publishMetricsHook() {
      root.dataset.spatialScanLoadState = runtime.loadState;
      root.dataset.spatialScanPointCount = String(runtime.pointCount);
      root.dataset.spatialScanVisiblePointCount = String(runtime.visiblePointCount);
      window.__ABS_SPATIAL_SCAN_POINT_CLOUD__ = {
        getMetrics: () => ({
          quality: runtime.quality,
          loadState: runtime.loadState,
          pointCount: runtime.pointCount,
          visiblePointCount: runtime.visiblePointCount,
          pointDensity: runtime.pointDensity,
          renderedFrames: runtime.renderedFrames,
          dpr: renderer.getPixelRatio(),
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          sourceStatus: meta?.source?.status,
          cameraMode: settingsRef.current.cameraMode,
          cameraPosition: camera.position.toArray(),
        }),
        renderOnce: () => renderer.render(scene, camera),
      };
    }

    function resize() {
      const rect = root.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      const dpr = resolveDpr(maxDpr);
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      material.uniforms.uPixelRatio.value = dpr;
      const fitScale = width < 680 ? 0.92 : 1;
      points.scale.setScalar(fitScale);
    }

    function updateScrollProgress(settings, deltaSeconds) {
      const documentElement = document.documentElement;
      const body = document.body;
      const scrollRoot = document.scrollingElement || documentElement;
      const scrollTop = window.scrollY || scrollRoot.scrollTop || documentElement.scrollTop || body?.scrollTop || 0;
      const scrollHeight = scrollRoot.scrollHeight || documentElement.scrollHeight || body?.scrollHeight || 0;
      const viewportHeight = scrollRoot.clientHeight || window.innerHeight;
      const maxScroll = Math.max(1, scrollHeight - viewportHeight);
      runtime.targetScrollProgress = clamp(scrollTop / maxScroll, 0, 1);
      runtime.scrollProgress = easeValue(
        runtime.scrollProgress,
        runtime.targetScrollProgress,
        1 / Math.max(0.02, settings.scrollSmoothing),
        deltaSeconds,
      );
    }

    function applyPathCamera(progress) {
      const frameSample = sampleCameraFrame(cameraPath, progress, runtime.cameraSampleState);
      camera.position.fromArray(frameSample.position);
      camera.quaternion.fromArray(frameSample.quaternion);
      const nextFov = Number.isFinite(frameSample.fov) ? clamp(frameSample.fov, 30, 75) : 48;
      if (Math.abs(camera.fov - nextFov) > 0.01) {
        camera.fov = nextFov;
        camera.updateProjectionMatrix();
      }
    }

    function applyOrbitCamera() {
      const largestAxisSize = Number(meta?.normalization?.largestAxisSize) || 7.2;
      camera.position.set(0, largestAxisSize * 0.26, largestAxisSize * 1.08);
      camera.lookAt(0, 0, 0);
      if (Math.abs(camera.fov - 46) > 0.01) {
        camera.fov = 46;
        camera.updateProjectionMatrix();
      }
    }

    function renderFrame(now) {
      if (destroyed) return;
      const settings = settingsRef.current;
      const shouldAnimate = runtime.pageVisible && (settings.cameraMode === 'scroll' || runtime.visible);
      if (!shouldAnimate) {
        frame = window.requestAnimationFrame(renderFrame);
        return;
      }

      const elapsed = (now - runtime.startedAt) / 1000;
      const deltaSeconds = clamp((now - runtime.lastFrameAt) / 1000, 0.001, 0.05);
      runtime.lastFrameAt = now;
      const motionScale = reducedMotion ? 0 : 1;
      material.uniforms.uTime.value = elapsed * motionScale;
      material.uniforms.uPointSize.value = settings.dotSize;
      material.uniforms.uOpacity.value = clamp(settings.dotOpacity, 0.18, 1);
      material.uniforms.uSpread.value = reducedMotion ? 0 : settings.spread;
      material.uniforms.uBreathing.value = reducedMotion ? 0 : settings.breathingMotion;
      material.uniforms.uErosion.value = clamp(settings.erosionStrength, 0, 0.72);

      if (settings.cameraMode === 'scroll') {
        updateScrollProgress(settings, deltaSeconds);
        applyPathCamera(runtime.scrollProgress);
      } else if (settings.cameraMode === 'loop' && !reducedMotion) {
        const duration = Math.max(0.1, settings.loopDuration);
        applyPathCamera((elapsed % duration) / duration);
      } else if (settings.cameraMode === 'orbit') {
        applyOrbitCamera();
      } else {
        applyPathCamera(0);
      }

      const targetRotation = targetRotationRef.current;
      const rotation = rotationRef.current;
      const easeRate = dragRef.current.active ? 22 : 14;
      if (settings.cameraMode === 'orbit') {
        rotation.x = reducedMotion ? targetRotation.x : easeValue(rotation.x, targetRotation.x, easeRate, deltaSeconds);
        rotation.y = reducedMotion ? targetRotation.y : easeValue(rotation.y, targetRotation.y, easeRate, deltaSeconds);
        rotation.z = reducedMotion ? targetRotation.z : easeValue(rotation.z, targetRotation.z, easeRate, deltaSeconds);
      } else {
        rotation.x = easeValue(rotation.x, 0, 10, deltaSeconds);
        rotation.y = easeValue(rotation.y, 0, 10, deltaSeconds);
        rotation.z = easeValue(rotation.z, 0, 10, deltaSeconds);
      }
      group.rotation.set(rotation.x, rotation.y, rotation.z);

      renderer.render(scene, camera);
      runtime.renderedFrames += 1;
      frame = window.requestAnimationFrame(renderFrame);
    }

    async function loadPoints() {
      try {
        runtime.loadState = 'loading';
        publishMetricsHook();
        const response = await fetch(`${ASSET_BASE_URL}/${asset.file}`, {
          cache: 'force-cache',
          signal: abort.signal,
        });
        if (!response.ok) throw new Error(`Spatial scan point asset request failed with ${response.status}`);
        const parsed = parsePointCloudBuffer(await response.arrayBuffer());
        if (destroyed) return;

        const colors = new Float32Array(parsed.pointCount * 3);
        for (let i = 0; i < parsed.pointCount; i += 1) {
          const color = groupColors[Math.round(parsed.groups[i]) % groupColors.length] || groupColors[0];
          const offset = i * 3;
          colors[offset] = color[0];
          colors[offset + 1] = color[1];
          colors[offset + 2] = color[2];
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(parsed.positions, 3));
        geometry.setAttribute('normalOffset', new THREE.BufferAttribute(parsed.normals, 3));
        geometry.setAttribute('pointSeed', new THREE.BufferAttribute(parsed.seeds, 1));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        const visiblePointCount = getVisiblePointCount(parsed.pointCount, settingsRef.current.pointDensity);
        geometry.setDrawRange(0, visiblePointCount);
        geometry.computeBoundingSphere();

        runtime.groups = parsed.groups;
        runtime.pointCount = parsed.pointCount;
        runtime.pointDensity = resolvePointDensity(settingsRef.current.pointDensity);
        runtime.visiblePointCount = visiblePointCount;
        runtime.loadState = 'ready';
        publishMetricsHook();
        setError('');
        resize();
        applyPathCamera(0);
        renderer.render(scene, camera);
      } catch (loadError) {
        if (loadError?.name !== 'AbortError') {
          runtime.loadState = 'error';
          publishMetricsHook();
          setError(loadError?.message || 'Spatial scan point asset failed to load');
        }
      }
    }

    const handlePointerDown = (event) => {
      if (settingsRef.current.cameraMode === 'scroll') return;
      if (event.button !== undefined && event.button !== 0) return;
      dragRef.current = {
        active: true,
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };
      targetRotationRef.current = { ...rotationRef.current };
      root.dataset.dragging = 'true';
      root.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    };
    const handlePointerMove = (event) => {
      const drag = dragRef.current;
      if (!drag.active || drag.pointerId !== event.pointerId) return;
      const influence = clamp(settingsRef.current.interactionStrength, 0, 1.4);
      const targetRotation = targetRotationRef.current;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      targetRotation.y += dx * 0.0048 * influence;
      targetRotation.x = clamp(targetRotation.x + (dy * 0.0032 * influence), -0.58, 0.58);
      drag.x = event.clientX;
      drag.y = event.clientY;
      event.preventDefault();
    };
    const endDrag = (event) => {
      const drag = dragRef.current;
      if (!drag.active || drag.pointerId !== event.pointerId) return;
      dragRef.current = { active: false, pointerId: null, x: event.clientX, y: event.clientY };
      root.dataset.dragging = 'false';
      root.releasePointerCapture?.(event.pointerId);
    };
    const handleVisibility = () => {
      runtime.pageVisible = document.visibilityState !== 'hidden';
    };

    root.addEventListener('pointerdown', handlePointerDown);
    root.addEventListener('pointermove', handlePointerMove);
    root.addEventListener('pointerup', endDrag);
    root.addEventListener('pointercancel', endDrag);
    document.addEventListener('visibilitychange', handleVisibility);
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(root);
    intersectionObserver = new IntersectionObserver(([entry]) => {
      runtime.visible = Boolean(entry?.isIntersecting);
    });
    intersectionObserver.observe(root);

    loadPoints();
    resize();
    frame = window.requestAnimationFrame(renderFrame);

    return () => {
      destroyed = true;
      abort.abort();
      window.cancelAnimationFrame(frame);
      root.removeEventListener('pointerdown', handlePointerDown);
      root.removeEventListener('pointermove', handlePointerMove);
      root.removeEventListener('pointerup', endDrag);
      root.removeEventListener('pointercancel', endDrag);
      document.removeEventListener('visibilitychange', handleVisibility);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      delete window.__ABS_SPATIAL_SCAN_POINT_CLOUD__;
      disposeRuntime(runtime);
      runtimeRef.current = null;
    };
  }, [
    meta,
    cameraPath,
    resolvedQuality,
    groupColors,
    maxDpr,
    reducedMotion,
  ]);

  const attribution = meta?.source?.status === 'procedural-placeholder'
    ? 'Procedural spatial scan placeholder. Replace with a cleaned original apartment scan before production review.'
    : (meta?.source?.attribution || 'Original spatial scan transformed into flat point-cloud data for beck.fyi.');

  return (
    <figure ref={rootRef} className={`spatial-scan-point-cloud ${className}`.trim()}>
      <canvas
        ref={canvasRef}
        className="spatial-scan-point-cloud__canvas"
        role={decorative ? undefined : 'img'}
        aria-hidden={decorative ? 'true' : undefined}
        aria-label={decorative ? undefined : ariaLabel}
      />
      <figcaption className="spatial-scan-point-cloud__credit">
        {attribution}
      </figcaption>
      {error ? (
        <p className="spatial-scan-point-cloud__status" role="status">
          {error}
        </p>
      ) : null}
    </figure>
  );
}
