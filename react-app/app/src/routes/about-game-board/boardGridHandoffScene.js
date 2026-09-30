import * as THREE from 'three';
import {
  getSimulationBodyMaterialAtlas,
  subscribeSimulationBodyMaterial,
} from '../../legacy/modules/rendering/materials/simulation-body-material.js';
import {
  normalizeBoardBallRadiusScale,
  resolveBoardBallRadius,
} from './boardBallPresentation.js';
import {
  ballColourFromRoleColours,
  BOARD_WIDTH,
  createBoardBallRoleAssignments,
  GRID_END_Y,
  GRID_START_Y,
  resolveBoardBallRoleColours,
} from './boardScene.js';
import {
  BOARD_BAND_JOURNEY, BOARD_SOCKET_FRAGMENT_GLSL, boardSocketMetrics,
} from './boardBandJourney.js';

const GRID_HEIGHT = GRID_END_Y - GRID_START_Y;
const VERTICAL_FOV = 50;

/** The exact board grid continues as a band, then joins the Blender tunnel. */
export const BOARD_HANDOFF_PHASES = Object.freeze({
  bendStart: 0.06,
  bendEnd: 0.42,
  ceilingExitStart: 0.40,
  ceilingExitEnd: 0.54,
  authoredStart: BOARD_BAND_JOURNEY.authoredStart,
  authoredVisible: BOARD_BAND_JOURNEY.authoredStart,
  endingStart: BOARD_BAND_JOURNEY.endingRevealEnd,
  endingEnd: 1,
});

function phaseProgress(progress, start, end) {
  if (end <= start) return Number(progress >= end);
  const value = Math.max(0, Math.min(1, (progress - start) / (end - start)));
  return value * value * (3 - 2 * value);
}

export function boardHandoffPhaseState(progress) {
  const value = Math.max(0, Math.min(1, Number(progress) || 0));
  const ceilingExit = phaseProgress(value,
    BOARD_HANDOFF_PHASES.ceilingExitStart, BOARD_HANDOFF_PHASES.ceilingExitEnd);
  return Object.freeze({
    progress: value,
    ceilingVisibility: 1 - ceilingExit,
    authoredVisibility: phaseProgress(value,
      BOARD_HANDOFF_PHASES.authoredStart, BOARD_HANDOFF_PHASES.authoredVisible),
    endingVisibility: phaseProgress(value,
      BOARD_HANDOFF_PHASES.endingStart, BOARD_HANDOFF_PHASES.endingEnd),
  });
}

const VERTEX_SHADER = `
  precision highp float;
  attribute vec2 iBoardPosition;
  attribute float iRadius;
  attribute float iAtlasSlot;
  attribute vec2 iSocketHole;
  uniform float uProgress;
  varying vec2 vCircle;
  varying float vAtlasSlot;
  varying vec2 vSocketHole;

  float ease(float value) {
    float t = clamp(value, 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
  }

  void main() {
    float bend = ease((uProgress - ${BOARD_HANDOFF_PHASES.bendStart.toFixed(2)})
      / ${(BOARD_HANDOFF_PHASES.bendEnd - BOARD_HANDOFF_PHASES.bendStart).toFixed(2)});
    float leave = ease((uProgress - ${BOARD_HANDOFF_PHASES.ceilingExitStart.toFixed(2)})
      / ${(BOARD_HANDOFF_PHASES.ceilingExitEnd - BOARD_HANDOFF_PHASES.ceilingExitStart).toFixed(2)});
    float localY = iBoardPosition.y - ${GRID_START_Y.toFixed(1)};
    float row = clamp(localY / ${GRID_HEIGHT.toFixed(1)}, 0.0, 1.0);
    float radius = ${GRID_HEIGHT.toFixed(1)} / 1.38;
    float angle = row * 1.38;
    vec3 flatPosition = vec3(iBoardPosition.x - ${(BOARD_WIDTH / 2).toFixed(1)}, -localY, 0.0);
    vec3 curved = vec3(flatPosition.x, -sin(angle) * radius, -(1.0 - cos(angle)) * radius);
    vec3 centre = mix(flatPosition, curved, bend);
    // Once the occupied field has become a ceiling, clear the centre for the
    // contact passage instead of leaving geometry behind the copy.
    centre.y += leave * ${(GRID_HEIGHT * 1.28).toFixed(1)};
    centre.z -= leave * ${(GRID_HEIGHT * 0.32).toFixed(1)};
    vec4 viewCentre = modelViewMatrix * vec4(centre, 1.0);
    viewCentre.xy += position.xy * iRadius * mix(1.0, 0.88, leave);
    gl_Position = projectionMatrix * viewCentre;
    vCircle = position.xy;
    vAtlasSlot = iAtlasSlot;
    vSocketHole = iSocketHole;
  }
`;

const BALL_FRAGMENT_SHADER = `
  precision highp float;
  uniform sampler2D uAtlas;
  uniform vec4 uAtlasScale;
  uniform float uAtlasYScale;
  varying vec2 vCircle;
  varying float vAtlasSlot;
  void main() {
    if (dot(vCircle, vCircle) > 1.0) discard;
    vec2 uv = vCircle * 0.5 + 0.5;
    vec4 material = texture2D(uAtlas, vec2(
      vAtlasSlot * uAtlasScale.x + uAtlasScale.y + uv.x * uAtlasScale.z,
      uAtlasScale.w + uv.y * uAtlasYScale
    ));
    if (material.a <= 0.025) discard;
    gl_FragColor = material;
    #include <colorspace_fragment>
  }
`;

const SOCKET_FRAGMENT_SHADER = `
  precision highp float;
  uniform vec3 uColour;
  varying vec2 vCircle;
  ${BOARD_SOCKET_FRAGMENT_GLSL}
  void main() {
    if (!insideBoardSocket(vCircle)) discard;
    gl_FragColor = vec4(uColour, 1.0);
    #include <colorspace_fragment>
  }
`;

function createQuadGeometry(entries, radiusFor) {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -1, -1, 0, 1, -1, 0, 1, 1, 0,
    -1, -1, 0, 1, 1, 0, -1, 1, 0,
  ], 3));
  const positions = new Float32Array(entries.length * 2);
  const radii = new Float32Array(entries.length);
  const slots = new Float32Array(entries.length);
  entries.forEach((entry, index) => {
    positions[index * 2] = entry.flatX;
    positions[index * 2 + 1] = entry.flatY;
    radii[index] = radiusFor(entry);
  });
  geometry.setAttribute('iBoardPosition', new THREE.InstancedBufferAttribute(positions, 2));
  geometry.setAttribute('iRadius', new THREE.InstancedBufferAttribute(radii, 1));
  geometry.setAttribute('iAtlasSlot', new THREE.InstancedBufferAttribute(slots, 1));
  geometry.instanceCount = entries.length;
  return geometry;
}

function createFlatMaterialAtlas(colors, ownerDocument) {
  const unique = [...new Set(colors)];
  const detailPx = 4;
  const gutterPx = 1;
  const cellStridePx = detailPx + gutterPx * 2;
  const fallbackCanvas = ownerDocument.createElement('canvas');
  fallbackCanvas.width = Math.max(1, cellStridePx * unique.length);
  fallbackCanvas.height = cellStridePx;
  const context = fallbackCanvas.getContext('2d', { alpha: true });
  unique.forEach((colour, slot) => {
    context.fillStyle = colour;
    context.fillRect(slot * cellStridePx, 0, cellStridePx, cellStridePx);
  });
  const slots = new Map(unique.map((colour, slot) => [colour, slot]));
  return Object.freeze({
    key: `flat:${unique.join(',')}`,
    canvas: fallbackCanvas,
    detailPx,
    gutterPx,
    cellStridePx,
    widthPx: fallbackCanvas.width,
    heightPx: fallbackCanvas.height,
    getSlot: colour => slots.get(colour) ?? 0,
  });
}

function createCanvasHandoffScene(canvas, entries, palette, {
  radiusScale = 1,
  sourceBalls = entries,
  getGridState,
} = {}) {
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) throw new Error('The board handoff graphics context is unavailable.');
  const resolvedRadiusScale = normalizeBoardBallRadiusScale(radiusScale);
  const socketMetrics = entries.map(entry => boardSocketMetrics(entry, resolvedRadiusScale));
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let progress = 0;
  let paletteSnapshot = palette;
  let roleColours = resolveBoardBallRoleColours(paletteSnapshot);
  let roleAssignments = createBoardBallRoleAssignments(sourceBalls, paletteSnapshot);
  let fixtureColour = '#d2d5cf';
  let disposed = false;
  let unsubscribeMaterial = () => {};

  function circle(x, y, radius, colour, alpha = 1) {
    if (alpha <= 0.002 || radius <= 0) return;
    context.globalAlpha = alpha;
    context.fillStyle = colour;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  function resize() {
    if (disposed) return;
    const rect = canvas.getBoundingClientRect();
    const nextWidth = Math.max(1, rect.width);
    const nextHeight = Math.max(1, rect.height);
    const nextPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    if (nextWidth === width && nextHeight === height && nextPixelRatio === pixelRatio) return;
    width = nextWidth;
    height = nextHeight;
    pixelRatio = nextPixelRatio;
    canvas.width = Math.max(1, Math.round(width * pixelRatio));
    canvas.height = Math.max(1, Math.round(height * pixelRatio));
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  function drawGrid() {
    const bend = phaseProgress(progress,
      BOARD_HANDOFF_PHASES.bendStart, BOARD_HANDOFF_PHASES.bendEnd);
    const leave = phaseProgress(progress,
      BOARD_HANDOFF_PHASES.ceilingExitStart, BOARD_HANDOFF_PHASES.ceilingExitEnd);
    const scale = width / BOARD_WIDTH;
    const centreX = width / 2;
    const verticalCompression = 1 - bend * 0.28;
    const horizontalExpansion = 1 + bend * 0.08;
    const exitShift = leave * Math.max(height, GRID_HEIGHT * scale) * 1.08;
    const gridState = getGridState?.();
    const occupied = gridState?.occupied;
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (!(occupied instanceof Map) || occupied.has(entry.id)) continue;
      const localY = entry.flatY - GRID_START_Y;
      const x = centreX + (entry.flatX * scale - centreX) * horizontalExpansion;
      const y = localY * scale * verticalCompression - exitShift;
      const socket = socketMetrics[index];
      const socketScale = scale * (1 - leave * 0.12);
      context.globalAlpha = 1;
      context.fillStyle = fixtureColour;
      context.beginPath();
      context.arc(x, y, socket.outerRadius * socketScale, 0, Math.PI * 2);
      context.arc(x, y + socket.holeOffsetY * socketScale,
        socket.holeRadius * socketScale, 0, Math.PI * 2);
      context.fill('evenodd');
    }
    entries.forEach(entry => {
      const cell = occupied instanceof Map ? occupied.get(entry.id) : true;
      if (!cell) return;
      const localY = entry.flatY - GRID_START_Y;
      const x = centreX + (entry.flatX * scale - centreX) * horizontalExpansion;
      const y = localY * scale * verticalCompression - exitShift;
      const colour = cell.colour || ballColourFromRoleColours(entry, roleColours, roleAssignments);
      circle(x, y, resolveBoardBallRadius(entry.radius, resolvedRadiusScale)
        * scale * (1 - leave * 0.12), colour);
    });
  }

  function render(nextProgress = progress) {
    if (disposed) return;
    progress = Math.max(0, Math.min(1, nextProgress));
    resize();
    context.clearRect(0, 0, width, height);
    drawGrid();
    context.globalAlpha = 1;
  }

  function syncAppearance(nextPalette = paletteSnapshot) {
    paletteSnapshot = nextPalette;
    roleColours = resolveBoardBallRoleColours(paletteSnapshot);
    roleAssignments = createBoardBallRoleAssignments(sourceBalls, paletteSnapshot);
    const root = canvas.closest('.about-game-board');
    fixtureColour = getComputedStyle(root || canvas)
      .getPropertyValue('--about-architecture-fixture').trim() || '#d3d3d3';
  }

  function inspect() {
    return {
      renderer: 'canvas2d-fallback',
      cells: entries.length,
      progress,
      phase: boardHandoffPhaseState(progress),
      maximumCentreErrorPx: 0,
      maximumRadiusErrorPx: 0,
      maximumSocketRadiusErrorPx: 0,
      maximumSocketHoleRadiusErrorPx: 0,
      maximumSocketHoleOffsetErrorPx: 0,
      radiusScale: resolvedRadiusScale,
      viewport: { width, height, pixelRatio },
      ownedResources: { webglContexts: 0, geometries: 0, materials: 0, textures: 0,
        backingStoreBytes: disposed ? 0 : canvas.width * canvas.height * 4 },
    };
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    unsubscribeMaterial();
    context.clearRect(0, 0, width, height);
    canvas.width = 1;
    canvas.height = 1;
  }

  syncAppearance(paletteSnapshot);
  unsubscribeMaterial = subscribeSimulationBodyMaterial(() => {
    if (disposed) return;
    syncAppearance(paletteSnapshot);
    render(progress);
  });
  resize();
  render(0);
  return Object.freeze({ render, resize, setPalette: syncAppearance, inspect, dispose });
}

/** A lightweight loading/failure fallback. At progress zero its projection is
 * identical to the 960-unit 2D board. The continuous loaded journey is owned by
 * boardBandJourney, inside the authored renderer's shared world/depth buffer. */
export function createBoardGridHandoffScene(canvas, entries, palette, {
  radiusScale = 1,
  sourceBalls = entries,
  getGridState,
  preferCanvas = false,
} = {}) {
  if (!canvas?.getContext) throw new TypeError('The board handoff needs a canvas.');
  // The board already owns the authored WebGL renderer. Its loading/recovery
  // image uses Canvas, so preparing the seam never creates a second context.
  if (preferCanvas) return createCanvasHandoffScene(canvas, entries, palette,
    { radiusScale, sourceBalls, getGridState });
  const resolvedRadiusScale = normalizeBoardBallRadiusScale(radiusScale);
  const context = canvas.getContext('webgl2', {
    // Let the shared Studio surface show through. An opaque WebGL clear can
    // retain the previous theme while CSS interpolates between theme values.
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
    powerPreference: 'high-performance',
  });
  // Some mobile browsers, battery modes and headless Chromium sessions can
  // deny WebGL even though Canvas 2D remains available. Keep the same grid,
  // phases, colours and responsive geometry instead of collapsing the scene.
  if (!context) return createCanvasHandoffScene(canvas, entries, palette,
    { radiusScale, sourceBalls, getGridState });

  const renderer = new THREE.WebGLRenderer({
    canvas,
    context,
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(VERTICAL_FOV, 1, 1, 10000);
  const socketMetrics = entries.map(entry => boardSocketMetrics(entry, resolvedRadiusScale));
  const socketGeometry = createQuadGeometry(entries,
    entry => boardSocketMetrics(entry, resolvedRadiusScale).outerRadius);
  socketGeometry.setAttribute('iSocketHole', new THREE.InstancedBufferAttribute(
    new Float32Array(socketMetrics.flatMap(socket => [socket.holeRadius / socket.outerRadius,
      socket.holeOffsetY / socket.outerRadius])), 2));
  const ballGeometry = createQuadGeometry(entries,
    entry => resolveBoardBallRadius(entry.radius, resolvedRadiusScale));
  const sharedProgress = { value: 0 };
  const socketMaterial = new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: SOCKET_FRAGMENT_SHADER,
    uniforms: { uProgress: sharedProgress, uColour: { value: new THREE.Color() } },
    depthTest: true,
    depthWrite: true,
  });
  const ballMaterial = new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: BALL_FRAGMENT_SHADER,
    uniforms: {
      uProgress: sharedProgress,
      uAtlas: { value: null },
      uAtlasScale: { value: new THREE.Vector4() },
      uAtlasYScale: { value: 1 },
    },
    depthTest: true,
    depthWrite: true,
    transparent: false,
  });
  const sockets = new THREE.Mesh(socketGeometry, socketMaterial);
  const balls = new THREE.Mesh(ballGeometry, ballMaterial);
  sockets.frustumCulled = false;
  balls.frustumCulled = false;
  balls.position.z = 0.5;
  // Keep the source state readable while the shared authored world loads.
  scene.add(sockets, balls);

  let width = 0;
  let height = 0;
  let progress = 0;
  let atlasTexture = null;
  let materialKey = '';
  let currentAtlas = null;
  let paletteSnapshot = palette;
  let roleColours = resolveBoardBallRoleColours(paletteSnapshot);
  let roleAssignments = createBoardBallRoleAssignments(sourceBalls, paletteSnapshot);
  let disposed = false;
  let unsubscribeMaterial = () => {};

  function setCamera() {
    if (width < 2 || height < 2) return;
    camera.aspect = width / height;
    camera.fov = VERTICAL_FOV;
    const verticalSpan = BOARD_WIDTH / camera.aspect;
    const distance = verticalSpan / (2 * Math.tan(THREE.MathUtils.degToRad(VERTICAL_FOV / 2)));
    const bend = THREE.MathUtils.smoothstep(progress,
      BOARD_HANDOFF_PHASES.bendStart, BOARD_HANDOFF_PHASES.bendEnd);
    const baseY = -verticalSpan / 2;
    camera.position.set(0, baseY - GRID_HEIGHT * 0.08 * bend,
      distance - GRID_HEIGHT * 0.08 * bend);
    camera.lookAt(0, baseY - GRID_HEIGHT * 0.28 * bend, -GRID_HEIGHT * 0.18 * bend);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }

  function syncAppearance(nextPalette = paletteSnapshot) {
    paletteSnapshot = nextPalette;
    roleColours = resolveBoardBallRoleColours(paletteSnapshot);
    roleAssignments = createBoardBallRoleAssignments(sourceBalls, paletteSnapshot);
    const theme = document.documentElement.dataset.absTheme === 'dark' ? 'dark' : 'light';
    const atlas = getSimulationBodyMaterialAtlas(roleColours, { theme })
      || createFlatMaterialAtlas(roleColours, canvas.ownerDocument || document);
    currentAtlas = atlas;
    if (atlas?.key !== materialKey) {
      const texture = new THREE.CanvasTexture(atlas.canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      // WebGL2 forbids flip/premultiply unpack flags for its internal 3D
      // fallback textures. Keep this route-owned atlas in the same neutral
      // unpack state, then invert its V range explicitly below.
      texture.flipY = false;
      texture.premultiplyAlpha = false;
      const previous = atlasTexture;
      atlasTexture = texture;
      materialKey = atlas.key;
      ballMaterial.uniforms.uAtlas.value = texture;
      ballMaterial.uniforms.uAtlasScale.value.set(
        atlas.cellStridePx / atlas.widthPx,
        atlas.gutterPx / atlas.widthPx,
        atlas.detailPx / atlas.widthPx,
        (atlas.gutterPx + atlas.detailPx) / atlas.heightPx,
      );
      ballMaterial.uniforms.uAtlasYScale.value = -atlas.detailPx / atlas.heightPx;
      previous?.dispose();
    }
    const ballSlots = ballGeometry.getAttribute('iAtlasSlot');
    entries.forEach((entry, index) => {
      ballSlots.array[index] = atlas.getSlot(
        ballColourFromRoleColours(entry, roleColours, roleAssignments),
      );
    });
    ballSlots.needsUpdate = true;

    const root = canvas.closest('.about-game-board');
    const fixture = getComputedStyle(root || canvas)
      .getPropertyValue('--about-architecture-fixture').trim() || '#d3d3d3';
    socketMaterial.uniforms.uColour.value.setStyle(fixture);
  }

  function resize() {
    if (disposed) return;
    const rect = canvas.getBoundingClientRect();
    const nextWidth = Math.max(1, rect.width);
    const nextHeight = Math.max(1, rect.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    if (nextWidth === width && nextHeight === height
      && renderer.getPixelRatio() === pixelRatio) return;
    width = nextWidth;
    height = nextHeight;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    setCamera();
  }

  function render(nextProgress = progress) {
    if (disposed) return;
    progress = Math.max(0, Math.min(1, nextProgress));
    sharedProgress.value = progress;
    const gridState = getGridState?.();
    const occupied = gridState?.occupied;
    const radii = ballGeometry.getAttribute('iRadius');
    const socketRadii = socketGeometry.getAttribute('iRadius');
    const slots = ballGeometry.getAttribute('iAtlasSlot');
    entries.forEach((entry, index) => {
      const cell = occupied instanceof Map ? occupied.get(entry.id) : true;
      radii.array[index] = cell ? resolveBoardBallRadius(entry.radius, resolvedRadiusScale) : 0;
      socketRadii.array[index] = cell ? 0 : socketMetrics[index].outerRadius;
      if (cell?.colour && currentAtlas) slots.array[index] = currentAtlas.getSlot(cell.colour);
    });
    radii.needsUpdate = true;
    socketRadii.needsUpdate = true;
    slots.needsUpdate = true;
    resize();
    setCamera();
    renderer.render(scene, camera);
  }

  function inspect() {
    const vector = new THREE.Vector3();
    let maximumCentreErrorPx = 0;
    let maximumRadiusErrorPx = 0;
    let maximumSocketRadiusErrorPx = 0;
    let maximumSocketHoleRadiusErrorPx = 0;
    let maximumSocketHoleOffsetErrorPx = 0;
    if (progress === 0 && width > 1 && height > 1) {
      for (const entry of entries) {
        vector.set(entry.flatX - BOARD_WIDTH / 2, -(entry.flatY - GRID_START_Y), 0).project(camera);
        const actualX = (vector.x + 1) * width / 2;
        const actualY = (1 - vector.y) * height / 2;
        const expectedX = entry.flatX * width / BOARD_WIDTH;
        const expectedY = (entry.flatY - GRID_START_Y) * width / BOARD_WIDTH;
        maximumCentreErrorPx = Math.max(maximumCentreErrorPx,
          Math.hypot(actualX - expectedX, actualY - expectedY));
        const depth = camera.position.z;
        const focalLength = height * camera.projectionMatrix.elements[5] / 2;
        const boardRadius = resolveBoardBallRadius(entry.radius, resolvedRadiusScale);
        const actualRadius = boardRadius * focalLength / depth;
        const expectedRadius = boardRadius * width / BOARD_WIDTH;
        maximumRadiusErrorPx = Math.max(maximumRadiusErrorPx, Math.abs(actualRadius - expectedRadius));
      }
      const radii = socketGeometry.getAttribute('iRadius').array;
      const aperture = socketGeometry.getAttribute('iSocketHole').array;
      const projectionScale = height * camera.projectionMatrix.elements[5] / (2 * camera.position.z);
      const cssScale = width / BOARD_WIDTH;
      socketMetrics.forEach((socket, index) => {
        if (radii[index] === 0) return;
        const radius = radii[index] * projectionScale;
        maximumSocketRadiusErrorPx = Math.max(maximumSocketRadiusErrorPx,
          Math.abs(radius - socket.outerRadius * cssScale));
        maximumSocketHoleRadiusErrorPx = Math.max(maximumSocketHoleRadiusErrorPx,
          Math.abs(radius * aperture[index * 2] - socket.holeRadius * cssScale));
        maximumSocketHoleOffsetErrorPx = Math.max(maximumSocketHoleOffsetErrorPx,
          Math.abs(radius * aperture[index * 2 + 1] - socket.holeOffsetY * cssScale));
      });
    }
    return {
      renderer: 'three',
      cells: entries.length,
      progress,
      phase: boardHandoffPhaseState(progress),
      maximumCentreErrorPx,
      maximumRadiusErrorPx,
      maximumSocketRadiusErrorPx,
      maximumSocketHoleRadiusErrorPx,
      maximumSocketHoleOffsetErrorPx,
      radiusScale: resolvedRadiusScale,
      viewport: { width, height, pixelRatio: renderer.getPixelRatio() },
    };
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    unsubscribeMaterial();
    socketGeometry.dispose();
    ballGeometry.dispose();
    socketMaterial.dispose();
    ballMaterial.dispose();
    atlasTexture?.dispose();
    renderer.dispose();
    scene.clear();
  }

  syncAppearance(paletteSnapshot);
  unsubscribeMaterial = subscribeSimulationBodyMaterial(() => {
    if (disposed) return;
    materialKey = '';
    syncAppearance(paletteSnapshot);
    render(progress);
  });
  resize();
  render(0);
  return Object.freeze({ render, resize, setPalette: syncAppearance, inspect, dispose });
}
