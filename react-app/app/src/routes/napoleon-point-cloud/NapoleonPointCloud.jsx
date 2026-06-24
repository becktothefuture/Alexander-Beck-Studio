import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { withBasePath } from '../../lib/base-path.js';
import './napoleon-point-cloud.css';

const POINT_CLOUD_META_URL = withBasePath('/models/napoleon-bust/meta.json');
const INITIAL_ROTATION = Object.freeze({ x: -0.05, y: -0.42, z: 0.02 });
const DRAG_ROTATION_X_FACTOR = 0.0038;
const DRAG_ROTATION_Y_FACTOR = 0.0062;
const DRAG_ROTATION_EASE = 22;
const IDLE_ROTATION_EASE = 14;
const AUTO_ROTATION_SECONDS_FACTOR = 0.36;
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

const QUALITY_ORDER = ['low', 'medium', 'high'];
const ATTRIBUTE_STRIDE_FLOATS = 8;

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
  const configuredMax = clamp(Number(maxDpr) || 1.5, 0.75, 2);
  const mobileMax = viewportWidth < 520 ? 1.15 : (viewportWidth < 820 ? 1.3 : configuredMax);
  return clamp(Math.min(deviceDpr, configuredMax, mobileMax), 0.75, 2);
}

function resolvePointDensity(pointDensity) {
  return clamp(Number(pointDensity) || 1, 0.12, 1);
}

function getVisiblePointCount(pointCount, pointDensity) {
  if (!pointCount) return 0;
  return Math.max(1, Math.round(pointCount * resolvePointDensity(pointDensity)));
}

function easeValue(current, target, rate, deltaSeconds) {
  const amount = 1 - Math.exp(-rate * deltaSeconds);
  return current + ((target - current) * amount);
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

function makePointMaterial(depthLayer) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthTest: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uPointSize: { value: 5 },
      uPixelRatio: { value: 1 },
      uOpacity: { value: 0.92 },
      uSpread: { value: 0 },
      uFocus: { value: 1 },
      uBreathing: { value: 0.02 },
      uDepthLayer: { value: depthLayer },
    },
    vertexShader: `
      attribute vec3 color;
      attribute vec3 normalOffset;
      attribute float pointSeed;
      varying vec3 vColor;
      varying float vDepthDelta;

      uniform float uTime;
      uniform float uPointSize;
      uniform float uPixelRatio;
      uniform float uSpread;
      uniform float uFocus;
      uniform float uBreathing;

      void main() {
        vColor = color;
        vec3 displaced = position;
        float breath = sin((uTime * 0.72) + (pointSeed * 6.28318530718)) * uBreathing * 0.018;
        displaced += normalOffset * ((uSpread * 0.16) + breath);

        vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
        vec4 centerPosition = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        vDepthDelta = mvPosition.z - centerPosition.z;
        gl_Position = projectionMatrix * mvPosition;

        float perspectiveScale = 1.35 / max(0.38, -mvPosition.z);
        gl_PointSize = max(1.0, uPointSize * uPixelRatio * perspectiveScale * uFocus);
      }
    `,
    fragmentShader: `
      precision mediump float;
      varying vec3 vColor;
      varying float vDepthDelta;
      uniform float uOpacity;
      uniform float uDepthLayer;

      void main() {
        if (uDepthLayer < 0.5 && vDepthDelta > 0.0) discard;
        if (uDepthLayer > 0.5 && vDepthDelta <= 0.0) discard;
        vec2 coord = gl_PointCoord - vec2(0.5);
        float distanceFromCenter = length(coord);
        if (distanceFromCenter > 0.5) discard;
        float edgeAlpha = 1.0 - smoothstep(0.46, 0.5, distanceFromCenter);
        gl_FragColor = vec4(vColor, edgeAlpha * uOpacity);
      }
    `,
  });
}

function disposePointCloudRuntime(runtime) {
  runtime?.backScene?.clear();
  runtime?.frontScene?.clear();
  runtime?.geometry?.dispose();
  runtime?.backMaterial?.dispose();
  runtime?.frontMaterial?.dispose();
  runtime?.backRenderer?.dispose();
  runtime?.frontRenderer?.dispose();
}

function renderPointCloudLayers(runtime) {
  runtime.backRenderer.render(runtime.backScene, runtime.camera);
  runtime.frontRenderer.render(runtime.frontScene, runtime.camera);
}

function forEachPointCloudMaterial(runtime, callback) {
  callback(runtime.backMaterial);
  callback(runtime.frontMaterial);
}

export function NapoleonPointCloud({
  quality = 'low',
  mobileQuality = 'low',
  pointDensity = 0.28,
  dotSize = 23.4,
  dotOpacity = 0.94,
  colourMode = 'surface-bands',
  autoRotate = true,
  rotationSpeed = 0.085,
  interactionStrength = 0.72,
  spread = 0.045,
  focus = 1,
  breathingMotion = 0.42,
  maxDpr = 1.5,
  reducedMotion = false,
  className = '',
  ariaLabel = 'Surface-sampled point cloud of The bust of Napoleon Bonaparte',
  decorative = false,
  theme = DEFAULT_THEME,
}) {
  const figureRef = useRef(null);
  const backCanvasRef = useRef(null);
  const frontCanvasRef = useRef(null);
  const runtimeRef = useRef(null);
  const dragRef = useRef({ active: false, pointerId: null, x: 0, y: 0 });
  const rotationRef = useRef({ ...INITIAL_ROTATION });
  const targetRotationRef = useRef({ ...INITIAL_ROTATION });
  const settingsRef = useRef({
    autoRotate,
    breathingMotion,
    dotOpacity,
    dotSize,
    focus,
    interactionStrength,
    pointDensity,
    rotationSpeed,
    spread,
  });
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState('');
  const resolvedQuality = resolveQuality(quality, mobileQuality);
  const groupColors = useMemo(() => buildGroupColors(theme, colourMode), [theme, colourMode]);

  useEffect(() => {
    settingsRef.current = {
      autoRotate,
      breathingMotion,
      dotOpacity,
      dotSize,
      focus,
      interactionStrength,
      pointDensity,
      rotationSpeed,
      spread,
    };
  }, [
    autoRotate,
    breathingMotion,
    dotOpacity,
    dotSize,
    focus,
    interactionStrength,
    pointDensity,
    rotationSpeed,
    spread,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadMeta() {
      try {
        const response = await fetch(POINT_CLOUD_META_URL, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Point metadata request failed with ${response.status}`);
        const nextMeta = await response.json();
        if (!cancelled) setMeta(nextMeta);
      } catch (loadError) {
        if (!cancelled) setError(loadError?.message || 'Point metadata failed to load');
      }
    }

    loadMeta();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime?.geometry) return;
    const { geometry, groups } = runtime;
    const colors = new Float32Array(groups.length * 3);
    for (let i = 0; i < groups.length; i += 1) {
      const color = groupColors[Math.round(groups[i]) % groupColors.length] || groupColors[0];
      const offset = i * 3;
      colors[offset] = color[0];
      colors[offset + 1] = color[1];
      colors[offset + 2] = color[2];
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.attributes.color.needsUpdate = true;
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
    const root = figureRef.current;
    const backCanvas = backCanvasRef.current;
    const frontCanvas = frontCanvasRef.current;
    if (!root || !backCanvas || !frontCanvas || !meta) return undefined;

    const asset = meta.lods?.[resolvedQuality] || meta.lods?.medium || meta.lods?.low;
    if (!asset?.file) {
      setError(`No ${resolvedQuality} point-cloud asset is defined`);
      return undefined;
    }

    const abort = new AbortController();
    let frame = 0;
    let resizeObserver = null;
    let intersectionObserver = null;
    let destroyed = false;

    const backScene = new THREE.Scene();
    const frontScene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0.02, 3.45);
    let backRenderer = null;
    let frontRenderer = null;
    try {
      backRenderer = new THREE.WebGLRenderer({
        canvas: backCanvas,
        alpha: true,
        antialias: false,
      });
      frontRenderer = new THREE.WebGLRenderer({
        canvas: frontCanvas,
        alpha: true,
        antialias: false,
      });
    } catch {
      backRenderer?.dispose();
      frontRenderer?.dispose();
      setError('WebGL is unavailable, so the Napoleon point cloud cannot render in this browser.');
      return undefined;
    }
    backRenderer.setClearColor(0x000000, 0);
    frontRenderer.setClearColor(0x000000, 0);
    backRenderer.outputColorSpace = THREE.SRGBColorSpace;
    frontRenderer.outputColorSpace = THREE.SRGBColorSpace;

    const backMaterial = makePointMaterial(0);
    const frontMaterial = makePointMaterial(1);
    const geometry = new THREE.BufferGeometry();
    const backPoints = new THREE.Points(geometry, backMaterial);
    const frontPoints = new THREE.Points(geometry, frontMaterial);
    backPoints.rotation.set(rotationRef.current.x, rotationRef.current.y, rotationRef.current.z);
    frontPoints.rotation.set(rotationRef.current.x, rotationRef.current.y, rotationRef.current.z);
    backScene.add(backPoints);
    frontScene.add(frontPoints);

    const runtime = {
      backScene,
      frontScene,
      camera,
      backRenderer,
      frontRenderer,
      geometry,
      backMaterial,
      frontMaterial,
      backPoints,
      frontPoints,
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
    };
    runtimeRef.current = runtime;

    function publishMetricsHook() {
      root.dataset.pointCloudLoadState = runtime.loadState;
      root.dataset.pointCloudPointCount = String(runtime.pointCount);
      root.dataset.pointCloudVisiblePointCount = String(runtime.visiblePointCount);
      window.__ABS_NAPOLEON_POINT_CLOUD__ = {
        getMetrics: () => ({
          quality: runtime.quality,
          loadState: runtime.loadState,
          pointCount: runtime.pointCount,
          visiblePointCount: runtime.visiblePointCount,
          pointDensity: runtime.pointDensity,
          renderedFrames: runtime.renderedFrames,
          dpr: backRenderer.getPixelRatio(),
          canvasWidth: backCanvas.width,
          canvasHeight: backCanvas.height,
          sourceStatus: meta?.source?.status,
          rotation: {
            x: backPoints.rotation.x,
            y: backPoints.rotation.y,
            z: backPoints.rotation.z,
          },
        }),
        renderOnce: () => renderPointCloudLayers(runtime),
      };
    }

    publishMetricsHook();

    function resize() {
      const rect = root.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      const dpr = resolveDpr(maxDpr);
      backRenderer.setPixelRatio(dpr);
      frontRenderer.setPixelRatio(dpr);
      backRenderer.setSize(width, height, false);
      frontRenderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      forEachPointCloudMaterial(runtime, (material) => {
        material.uniforms.uPixelRatio.value = dpr;
      });
      const fitScale = width < 680 ? 0.82 : 1;
      backPoints.scale.setScalar(fitScale);
      frontPoints.scale.setScalar(fitScale);
      backPoints.position.y = width < 680 ? 0.1 : 0;
      frontPoints.position.y = width < 680 ? 0.1 : 0;
    }

    function renderFrame(now) {
      if (destroyed) return;
      const shouldAnimate = runtime.visible && runtime.pageVisible;
      if (!shouldAnimate) {
        frame = window.requestAnimationFrame(renderFrame);
        return;
      }

      const elapsed = (now - runtime.startedAt) / 1000;
      const deltaSeconds = clamp((now - runtime.lastFrameAt) / 1000, 0.001, 0.05);
      runtime.lastFrameAt = now;
      const settings = settingsRef.current;
      const motionScale = reducedMotion ? 0 : 1;
      forEachPointCloudMaterial(runtime, (material) => {
        material.uniforms.uTime.value = elapsed * motionScale;
        material.uniforms.uPointSize.value = settings.dotSize;
        material.uniforms.uOpacity.value = clamp(settings.dotOpacity, 0.2, 1);
        material.uniforms.uSpread.value = reducedMotion ? 0 : settings.spread;
        material.uniforms.uFocus.value = clamp(settings.focus, 0.72, 1.35);
        material.uniforms.uBreathing.value = reducedMotion ? 0 : settings.breathingMotion;
      });

      if (settings.autoRotate && !reducedMotion && !dragRef.current.active) {
        targetRotationRef.current.y += settings.rotationSpeed * AUTO_ROTATION_SECONDS_FACTOR * deltaSeconds;
      }
      const targetRotation = targetRotationRef.current;
      const rotation = rotationRef.current;
      const easeRate = dragRef.current.active ? DRAG_ROTATION_EASE : IDLE_ROTATION_EASE;
      if (reducedMotion) {
        rotation.x = targetRotation.x;
        rotation.y = targetRotation.y;
        rotation.z = targetRotation.z;
      } else {
        rotation.x = easeValue(rotation.x, targetRotation.x, easeRate, deltaSeconds);
        rotation.y = easeValue(rotation.y, targetRotation.y, easeRate, deltaSeconds);
        rotation.z = easeValue(rotation.z, targetRotation.z, easeRate, deltaSeconds);
      }
      backPoints.rotation.set(rotationRef.current.x, rotationRef.current.y, rotationRef.current.z);
      frontPoints.rotation.set(rotationRef.current.x, rotationRef.current.y, rotationRef.current.z);

      renderPointCloudLayers(runtime);
      runtime.renderedFrames += 1;
      frame = window.requestAnimationFrame(renderFrame);
    }

    async function loadPoints() {
      try {
        runtime.loadState = 'loading';
        publishMetricsHook();
        const response = await fetch(withBasePath(`/models/napoleon-bust/${asset.file}`), {
          cache: 'force-cache',
          signal: abort.signal,
        });
        if (!response.ok) throw new Error(`Point asset request failed with ${response.status}`);
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
        renderPointCloudLayers(runtime);
      } catch (loadError) {
        if (loadError?.name !== 'AbortError') {
          runtime.loadState = 'error';
          publishMetricsHook();
          setError(loadError?.message || 'Point asset failed to load');
        }
      }
    }

    const handlePointerDown = (event) => {
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
      const samples = typeof event.getCoalescedEvents === 'function'
        ? event.getCoalescedEvents()
        : null;
      const moves = samples?.length ? samples : [event];
      const targetRotation = targetRotationRef.current;
      let nextX = drag.x;
      let nextY = drag.y;

      for (const move of moves) {
        const dx = move.clientX - nextX;
        const dy = move.clientY - nextY;
        targetRotation.y += dx * DRAG_ROTATION_Y_FACTOR * influence;
        targetRotation.x = clamp(targetRotation.x + (dy * DRAG_ROTATION_X_FACTOR * influence), -0.78, 0.78);
        nextX = move.clientX;
        nextY = move.clientY;
      }

      drag.x = nextX;
      drag.y = nextY;
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
      delete window.__ABS_NAPOLEON_POINT_CLOUD__;
      disposePointCloudRuntime(runtime);
      runtimeRef.current = null;
    };
  }, [
    meta,
    resolvedQuality,
    groupColors,
    maxDpr,
    reducedMotion,
  ]);

  const attribution = meta?.source?.status === 'mesh-sampled'
    ? 'The bust of Napoleon Bonaparte, Virtual Museums of Małopolska / National Museum in Kraków, CC BY 4.0. Transformed into a surface-sampled point cloud for beck.fyi.'
    : 'Preview point cloud for The bust of Napoleon Bonaparte, Virtual Museums of Małopolska / National Museum in Kraków, CC BY 4.0. Regenerate from the Sketchfab source before production use.';

  return (
    <figure ref={figureRef} className={`napoleon-point-cloud ${className}`.trim()}>
      <canvas
        ref={backCanvasRef}
        className="napoleon-point-cloud__canvas napoleon-point-cloud__canvas--back"
        role={decorative ? undefined : 'img'}
        aria-hidden={decorative ? 'true' : undefined}
        aria-label={decorative ? undefined : ariaLabel}
      />
      <h1 className="hero-title napoleon-point-cloud__title" aria-label="Alexander Beck. Creative. Technologist.">
        <span className="hero-title__name">Alexander Beck.</span>
        <span className="hero-title__role">Creative. Technologist.</span>
      </h1>
      <canvas
        ref={frontCanvasRef}
        className="napoleon-point-cloud__canvas napoleon-point-cloud__canvas--front"
        aria-hidden="true"
      />
      <figcaption className="napoleon-point-cloud__credit">
        {attribution}
      </figcaption>
      {error ? (
        <p className="napoleon-point-cloud__status" role="status">
          {error}
        </p>
      ) : null}
    </figure>
  );
}
