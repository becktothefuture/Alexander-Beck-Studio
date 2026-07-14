import { useEffect, useRef } from 'react';

const POINT_COUNT = 960;
const GRID_COLUMNS = 40;
const GRID_ROWS = 24;

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const mix = (from, to, progress) => from + ((to - from) * progress);
const smoothstep = (from, to, value) => {
  const progress = clamp01((value - from) / Math.max(0.0001, to - from));
  return progress * progress * (3 - (2 * progress));
};

function createRandom(seed = 0x2f6e2b1) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function createFieldPoints() {
  const random = createRandom();
  const points = new Float32Array(POINT_COUNT * 5);
  for (let index = 0; index < POINT_COUNT; index += 1) {
    const offset = index * 5;
    const angle = random() * Math.PI * 2;
    const radius = Math.pow(random(), 0.58);
    const polar = Math.acos((random() * 2) - 1);
    points[offset] = Math.sin(polar) * Math.cos(angle) * radius;
    points[offset + 1] = Math.cos(polar) * radius;
    points[offset + 2] = Math.sin(polar) * Math.sin(angle) * radius;
    points[offset + 3] = random();
    points[offset + 4] = 0.55 + (random() * 1.25);
  }
  return points;
}

function createAiTargets() {
  const glyphs = [
    [
      '01110',
      '10001',
      '10001',
      '11111',
      '10001',
      '10001',
      '10001',
    ],
    [
      '11111',
      '00100',
      '00100',
      '00100',
      '00100',
      '00100',
      '11111',
    ],
  ];
  const targets = [];
  glyphs.forEach((rows, glyphIndex) => {
    rows.forEach((row, rowIndex) => {
      [...row].forEach((cell, columnIndex) => {
        if (cell !== '1') return;
        for (let subY = 0; subY < 2; subY += 1) {
          for (let subX = 0; subX < 2; subX += 1) {
            targets.push({
              x: ((glyphIndex * 7) + columnIndex + (subX * 0.34) - 5.9) / 8.5,
              y: (rowIndex + (subY * 0.34) - 3.1) / 5.4,
            });
          }
        }
      });
    });
  });
  return targets;
}

const FIELD_POINTS = createFieldPoints();
const AI_TARGETS = createAiTargets();

function drawDot(context, x, y, radius, opacity) {
  if (opacity <= 0.002 || radius <= 0.05) return;
  context.globalAlpha = opacity;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

function drawCluster(context, width, height, progress, time, settings) {
  const approach = smoothstep(0.12, 0.34, progress);
  const farSignal = 1 - smoothstep(0.13, 0.23, progress);
  const aiIn = smoothstep(0.37, 0.43, progress);
  const aiOut = smoothstep(0.49, 0.55, progress);
  const aiAmount = aiIn * (1 - aiOut);
  const travel = smoothstep(0.51, 0.66, progress);
  const roll = Math.sin(travel * Math.PI) * settings.cameraRoll;
  const clusterScale = mix(0.15, 1.08, approach);
  const centerY = mix(-height * 0.24, height * 0.03, approach);
  const visibleCount = Math.floor(POINT_COUNT * mix(0.38, 1, settings.fieldOpacity));

  context.save();
  context.translate(width * 0.5, height * 0.5);
  context.rotate(roll);

  for (let index = 0; index < visibleCount; index += 1) {
    const offset = index * 5;
    const baseX = FIELD_POINTS[offset];
    const baseY = FIELD_POINTS[offset + 1];
    const baseZ = FIELD_POINTS[offset + 2];
    const seed = FIELD_POINTS[offset + 3];
    const size = FIELD_POINTS[offset + 4];
    const activity = Math.sin((time * 0.00055) + (seed * 18)) * 0.025 * approach;
    const depth = 1 / Math.max(0.34, 1.22 + (baseZ * 0.62) - (travel * 0.72));
    const cloudX = baseX * width * 0.34 * clusterScale * depth;
    const cloudY = (baseY * height * 0.31 * clusterScale * depth) + centerY + (activity * height);
    const target = AI_TARGETS[index];
    const targetX = target ? target.x * width * 0.5 : cloudX;
    const targetY = target ? target.y * height * 0.42 : cloudY;
    const x = mix(cloudX, targetX, aiAmount);
    const y = mix(cloudY, targetY, aiAmount);
    const targetWeight = target ? 1 : 0.08;
    const cloudOpacity = 0.055 + (depth * 0.1) + (farSignal * 0.58);
    const opacity = settings.fieldOpacity * mix(cloudOpacity, targetWeight, aiAmount) * (1 - smoothstep(0.62, 0.69, progress));
    const radius = mix(size * (0.48 + (depth * 0.7) + (farSignal * 0.82)), target ? 4.8 : 1.2, aiAmount);
    drawDot(context, x, y, radius, opacity);
  }

  context.restore();
}

function drawFloatingBody(context, centerX, centerY, radius, seed, opacity, time) {
  const count = 42;
  for (let index = 0; index < count; index += 1) {
    const angle = index * 2.399963;
    const radial = Math.sqrt(index / count) * radius;
    const pulse = Math.sin((time * 0.00045) + seed + (index * 0.4)) * 1.6;
    drawDot(
      context,
      centerX + (Math.cos(angle) * radial),
      centerY + (Math.sin(angle) * radial * 0.74) + pulse,
      1.1 + ((index % 5) * 0.22),
      opacity * (0.46 + ((index % 7) * 0.06)),
    );
  }
}

function drawLivingField(context, width, height, progress, time, settings) {
  const fieldIn = smoothstep(0.57, 0.68, progress);
  const life = smoothstep(0.68, 0.84, progress);
  const fieldOut = 1 - smoothstep(0.87, 0.94, progress);
  const opacity = settings.fieldOpacity * fieldIn * fieldOut;
  if (opacity <= 0.002) return;

  for (let row = 0; row < GRID_ROWS; row += 1) {
    const depth = row / Math.max(1, GRID_ROWS - 1);
    const perspective = 0.2 + (depth * 1.14);
    for (let column = 0; column < GRID_COLUMNS; column += 1) {
      const index = (row * GRID_COLUMNS) + column;
      const pointOffset = index * 5;
      const seed = FIELD_POINTS[pointOffset + 3];
      const horizontal = (column / Math.max(1, GRID_COLUMNS - 1)) - 0.5;
      const wave = (
        Math.sin((horizontal * 10) + (depth * 7) + (time * 0.00048))
        + Math.cos((horizontal * 5) - (depth * 11) - (time * 0.00031))
      ) * 0.5 * life * settings.waveStrength;
      const x = (width * 0.5) + (horizontal * width * perspective * 1.18);
      const y = (height * (0.35 + (depth * 0.58))) - (wave * height * 0.045);
      const radius = 0.72 + (depth * 2.55) + (seed * 0.5);
      drawDot(context, x, y, radius, opacity * (0.2 + (depth * 0.72)));
    }
  }

  const bodyOpacity = opacity * smoothstep(0.18, 0.62, life);
  drawFloatingBody(context, width * 0.23, height * 0.42, width * 0.048, 1.2, bodyOpacity, time);
  drawFloatingBody(context, width * 0.72, height * 0.32, width * 0.065, 3.7, bodyOpacity * 0.82, time);
  drawFloatingBody(context, width * 0.58, height * 0.58, width * 0.032, 5.4, bodyOpacity * 0.7, time);
}

function getWorldStage(progress) {
  if (progress < 0.16) return 'far-signal';
  if (progress < 0.37) return 'approach';
  if (progress < 0.52) return 'ai-constellation';
  if (progress < 0.68) return 'traverse';
  if (progress < 0.87) return 'living-field';
  return 'bust-reveal';
}

export function AboutNarrativePointField({ rootRef, scrollportRef, settings }) {
  const canvasRef = useRef(null);
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    const scrollport = scrollportRef.current;
    if (!canvas || !root || !scrollport) return undefined;

    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return undefined;

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      const rect = root.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    const render = (time) => {
      const travel = Math.max(1, scrollport.scrollHeight - scrollport.clientHeight);
      const progress = clamp01(scrollport.scrollTop / travel);
      const currentSettings = settingsRef.current;
      const bustOpacity = smoothstep(0.87, 0.96, progress);
      const bustScale = mix(0.46, currentSettings.bustScale, bustOpacity);
      const computedColor = getComputedStyle(root).color;

      root.dataset.worldStage = getWorldStage(progress);
      root.style.setProperty('--narrative-bust-opacity', bustOpacity.toFixed(4));
      root.style.setProperty('--narrative-bust-scale', bustScale.toFixed(4));
      root.style.setProperty('--narrative-field-opacity', (1 - (bustOpacity * 0.88)).toFixed(4));

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      context.fillStyle = computedColor || '#ffffff';
      drawCluster(context, width, height, progress, reducedMotionQuery.matches ? 0 : time, currentSettings);
      drawLivingField(context, width, height, progress, reducedMotionQuery.matches ? 0 : time, currentSettings);
      context.globalAlpha = 1;

      frame = window.requestAnimationFrame(render);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(root);
    resize();
    frame = window.requestAnimationFrame(render);

    return () => {
      resizeObserver.disconnect();
      window.cancelAnimationFrame(frame);
      delete root.dataset.worldStage;
      root.style.removeProperty('--narrative-bust-opacity');
      root.style.removeProperty('--narrative-bust-scale');
      root.style.removeProperty('--narrative-field-opacity');
    };
  }, [rootRef, scrollportRef]);

  return <canvas ref={canvasRef} className="about-narrative-point-field" aria-hidden="true" />;
}
