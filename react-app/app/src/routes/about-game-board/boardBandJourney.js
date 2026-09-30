import * as THREE from 'three';
import { resolveBoardBallRadius } from './boardBallPresentation.js';
import { boardSocketMetrics } from './boardGrid.js';
export { boardSocketMetrics } from './boardGrid.js';
import {
  BOARD_WIDTH, GRID_START_Y, ballColourFromRoleColours,
  createBoardBallRoleAssignments, resolveBoardBallRoleColours,
} from './boardScene.js';
import {
  createRollercoasterCameraPose, sampleRollercoasterCamera,
} from '../about-rollercoaster/rollercoasterContract.js';
import { resolveRollercoasterProjection } from '../about-rollercoaster/rollercoasterProjection.js';
import { ROLLERCOASTER_COVERAGE_GLSL } from '../about-rollercoaster/rollercoasterVisibility.js';

/** The flat grid, curved band and tunnel share one camera and world. The final
 * station is the existing Blender tunnel's first gate, not a replacement asset. */
export const BOARD_BAND_JOURNEY = Object.freeze({
  authoredStart: 0.52,
  sourceStart: 0.72,
  gateProgress: 0.7465,
  length: 100,
  halfTunnelWidth: 2.55,
  foldStart: 44,
  endingRevealStart: 0.88,
  endingRevealEnd: 0.96,
});

export const smoothBandProgress = (value, start, end) => {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
};

// Circle coordinates point up in the billboard; Canvas's aperture points down.
export const BOARD_SOCKET_FRAGMENT_GLSL = `
  varying vec2 vSocketHole;
  bool insideBoardSocket(vec2 circle) {
    vec2 aperture = circle + vec2(0.0, vSocketHole.y);
    return dot(circle, circle) <= 1.0
      && dot(aperture, aperture) >= vSocketHole.x * vSocketHole.x;
  }
`;

/** The source grid becomes the ceiling of the folded passage. Its two edges
 * meet at the floor seam while the centre stays overhead. */
export function boardBandCrossSection(u, fold, halfWidth, halfTunnel = 2.55) {
  const t = ((Math.max(-1, Math.min(1, u)) + 1) * 4 * halfTunnel
    + 4 * halfTunnel) % (8 * halfTunnel);
  let x, y;
  if (t < halfTunnel) { x = -t; y = halfTunnel; }
  else if (t < 3 * halfTunnel) { x = -halfTunnel; y = 2 * halfTunnel - t; }
  else if (t < 5 * halfTunnel) { x = t - 4 * halfTunnel; y = -halfTunnel; }
  else if (t < 7 * halfTunnel) { x = halfTunnel; y = t - 6 * halfTunnel; }
  else { x = 8 * halfTunnel - t; y = halfTunnel; }
  return [u * halfWidth * (1 - fold) + x * fold,
    halfTunnel * (1 - fold) + y * fold];
}

/** A descending tower wall meets the Blender rail at its original station.
 * The drop has zero slope at each end; the camera remains scroll owned. */
export function boardBandCentre(distance) {
  const t = Math.max(0, Math.min(1, (distance - 32) / 68));
  const drop = t * t * (3 - 2 * t);
  const envelope = Math.sin(Math.PI * t) ** 2;
  return [2.7 * Math.sin(Math.PI * 2 * t) * envelope,
    18 * (1 - drop) + 0.65 * envelope, -distance];
}

export function selectBoardTunnelGeometry(geometry) {
  return { ...geometry, objects: geometry.objects.filter(object =>
    object.id.startsWith('b-') || object.id.startsWith('approach-')
      || object.id === 'final-wall') };
}

const VERTEX_SHADER = `
  precision highp float;
  attribute vec3 iCentre;
  attribute float iRadius;
  attribute float iRadiusBlend;
  attribute float iAtlasSlot;
  attribute float iVisible;
  attribute float iDistance;
  attribute vec2 iSocketHole;
  uniform float uTunnelRadius;
  uniform float uGeometryScale;
  varying vec2 vCircle;
  varying float vAtlasSlot;
  varying float vDepth;
  varying float vDistance;
  varying float vRadius;
  varying vec2 vSocketHole;
  void main() {
    vec4 centre = modelViewMatrix * vec4(iCentre, 1.0);
    vDepth = -centre.z;
    vDistance = iDistance;
    vRadius = mix(iRadius, uTunnelRadius, iRadiusBlend);
    centre.xy += position.xy * vRadius
      * iVisible * uGeometryScale;
    gl_Position = projectionMatrix * centre;
    vCircle = position.xy;
    vAtlasSlot = iAtlasSlot;
    vSocketHole = iSocketHole;
  }
`;
const SOCKET_FRAGMENT_SHADER = `
  precision highp float;
  uniform vec3 uColour;
  varying vec2 vCircle;
  varying float vDepth;
  ${BOARD_SOCKET_FRAGMENT_GLSL}
  void main() {
    if (!insideBoardSocket(vCircle) || vDepth <= 0.08) discard;
    gl_FragColor = vec4(uColour, 1.0);
    #include <colorspace_fragment>
  }
`;
const FRAGMENT_SHADER = `
  precision highp float;
  uniform sampler2D uAtlas;
  uniform vec4 uAtlasScale;
  uniform float uAtlasYScale;
  uniform float uTravel;
  uniform float uDitherVisibility;
  uniform float uTunnelRadius;
  uniform vec4 uVisibility;
  uniform float uNearBlend;
  varying vec2 vCircle;
  varying float vAtlasSlot;
  varying float vDepth;
  varying float vDistance;
  varying float vRadius;
  ${ROLLERCOASTER_COVERAGE_GLSL}
  void main() {
    if (dot(vCircle, vCircle) > 1.0 || vDepth <= 0.08) discard;
    vec2 uv = vCircle * 0.5 + 0.5;
    vec4 material = texture2D(uAtlas, vec2(
      vAtlasSlot * uAtlasScale.x + uAtlasScale.y + uv.x * uAtlasScale.z,
      uAtlasScale.w + uv.y * uAtlasYScale));
    if (material.a <= 0.025) discard;
    float visibility = 1.0 - smoothstep(uTravel + 32.0, uTravel + 62.0, vDistance);
    // Keep the source-size balls from filling the lens during the descent.
    // The same apparent-size near corridor serves both strip and tunnel.
    float materialDepth = vDepth * uTunnelRadius / max(0.0001, vRadius);
    visibility *= mix(1.0, smoothstep(uVisibility.x, uVisibility.y, materialDepth), uNearBlend);
    if (visibility <= 0.0) discard;
    material.a *= corridorCoverage(visibility);
    gl_FragColor = material;
    #include <colorspace_fragment>
  }
`;

/** Attach the route-owned connector to the authored renderer. Only positions
 * are generated here; atlas, theme, depth buffer and frame scheduling stay shared. */
export function createBoardBandJourney({ scene, track, meta, uniforms, canvas, sourceGeometry, entries,
  radiusScale = 1, sourceBalls = entries, getGridState }) {
  if (!entries?.length) throw new Error('The ball band needs the authoritative socket grid.');
  const minX = Math.min(...entries.map(entry => entry.flatX));
  const maxX = Math.max(...entries.map(entry => entry.flatX));
  const halfSourceWidth = (maxX - minX) / 2;
  const sourceMiddle = (minX + maxX) / 2;
  const worldScale = BOARD_BAND_JOURNEY.halfTunnelWidth * 4 / halfSourceWidth;
  const halfWidth = halfSourceWidth * worldScale;
  const sourceRows = [...new Set(entries.map(entry => entry.flatY))].sort((a, b) => a - b);
  const sourcePitch = (sourceRows[1] - sourceRows[0]) * worldScale;
  const finalSourceRow = (sourceRows.at(-1) - GRID_START_Y) * worldScale;
  const joinPose = createRollercoasterCameraPose();
  sampleRollercoasterCamera(track, BOARD_BAND_JOURNEY.sourceStart, joinPose);
  const joinQuaternion = new THREE.Quaternion().fromArray(joinPose.quaternion);
  const joinPoint = new THREE.Vector3().fromArray(joinPose.position);
  const origin = new THREE.Vector3(0, 0, BOARD_BAND_JOURNEY.length)
    .applyQuaternion(joinQuaternion).add(joinPoint);
  const rows = [];
  const work = new THREE.Vector3();
  const samplePose = createRollercoasterCameraPose();
  const gateQuaternion = new THREE.Quaternion();
  const gatePoint = new THREE.Vector3();
  const gateSurface = sourceGeometry.objects.find(object => object.id === 'b-climb-gate-1');
  if (!gateSurface) throw new Error('The authored tunnel entrance is missing.');
  const gateCorners = [0, 3, 6, 9].map(offset => new THREE.Vector3().fromArray(gateSurface.positions, offset));
  const gateCentre = gateCorners.reduce((sum, corner) => sum.add(corner), new THREE.Vector3()).multiplyScalar(0.25);
  const gateRight = new THREE.Vector3().subVectors(gateCorners[0], gateCorners[1]).normalize();
  const gateUp = new THREE.Vector3().subVectors(gateCorners[1], gateCorners[2]).normalize();
  const gateTarget = new THREE.Vector3();
  sampleRollercoasterCamera(track, BOARD_BAND_JOURNEY.gateProgress, samplePose);
  const gateDistance = gateCentre.distanceTo(joinPoint);

  function worldPoint(distance, u) {
    const fold = smoothBandProgress(distance, BOARD_BAND_JOURNEY.foldStart,
      BOARD_BAND_JOURNEY.length + gateDistance);
    const cross = boardBandCrossSection(u, fold, halfWidth);
    if (distance <= BOARD_BAND_JOURNEY.length) {
      const centre = boardBandCentre(distance);
      return work.set(centre[0] + cross[0], centre[1] + cross[1], centre[2])
        .applyQuaternion(joinQuaternion).add(origin).toArray();
    }
    const t = Math.min(1, (distance - BOARD_BAND_JOURNEY.length) / gateDistance);
    sampleRollercoasterCamera(track, BOARD_BAND_JOURNEY.sourceStart
      + t * (BOARD_BAND_JOURNEY.gateProgress - BOARD_BAND_JOURNEY.sourceStart), samplePose);
    gateQuaternion.fromArray(samplePose.quaternion);
    gatePoint.fromArray(samplePose.position);
    work.set(cross[0], cross[1], 0).applyQuaternion(gateQuaternion).add(gatePoint);
    const closed = boardBandCrossSection(u, 1, halfWidth);
    gateTarget.copy(gateCentre).addScaledVector(gateRight, closed[0]).addScaledVector(gateUp, closed[1]);
    return work.lerp(gateTarget, smoothBandProgress(t, 0, 1)).toArray();
  }

  // Keep every source grid point, radius and material identity verbatim. Added
  // rows continue its pitch before gradually refining into the tunnel surface.
  entries.forEach(entry => rows.push({
    point: worldPoint((entry.flatY - GRID_START_Y) * worldScale,
      (entry.flatX - sourceMiddle) / halfSourceWidth),
    radius: resolveBoardBallRadius(entry.radius, radiusScale) * worldScale,
    blend: 0, source: entry, distance: (entry.flatY - GRID_START_Y) * worldScale,
  }));
  let distance = finalSourceRow + sourcePitch;
  let rowIndex = sourceRows.length;
  while (distance < BOARD_BAND_JOURNEY.length + gateDistance - 0.32) {
    const refine = smoothBandProgress(distance, finalSourceRow + sourcePitch, 66);
    const subdivision = 6;
    const columns = 10 * subdivision + 1;
    for (let col = 0; col < columns; col += 1) {
      const source = entries[(rowIndex * 11 + Math.floor(col / subdivision)) % entries.length];
      // Refine the far surface continuously. New columns grow from zero
      // between existing columns instead of appearing as a sudden denser row.
      const visibility = col % 6 === 0 ? 1 : col % 3 === 0
        ? smoothBandProgress(refine, 0, 0.35) : smoothBandProgress(refine, 0.22, 0.85);
      rows.push({ point: worldPoint(distance, col / (columns - 1) * 2 - 1),
        radius: resolveBoardBallRadius(source.radius, radiusScale) * worldScale,
        blend: refine, source, visibility, distance });
    }
    distance += sourcePitch * (1 - refine) + 0.34 * refine;
    rowIndex += 1;
  }
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0,
  ], 3));
  geometry.setAttribute('iCentre', new THREE.InstancedBufferAttribute(new Float32Array(rows.flatMap(row => row.point)), 3));
  geometry.setAttribute('iRadius', new THREE.InstancedBufferAttribute(new Float32Array(rows.map(row => row.radius)), 1));
  geometry.setAttribute('iRadiusBlend', new THREE.InstancedBufferAttribute(new Float32Array(rows.map(row => row.blend)), 1));
  geometry.setAttribute('iAtlasSlot', new THREE.InstancedBufferAttribute(new Float32Array(rows.length), 1));
  geometry.setAttribute('iVisible', new THREE.InstancedBufferAttribute(
    new Float32Array(rows.map(row => row.visibility ?? 1)), 1));
  geometry.setAttribute('iDistance', new THREE.InstancedBufferAttribute(
    new Float32Array(rows.map(row => row.distance)), 1));
  geometry.instanceCount = rows.length;
  const material = new THREE.ShaderMaterial({ vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER, uniforms: {
      uAtlas: uniforms.uAtlas, uAtlasScale: uniforms.uAtlasScale,
      uAtlasYScale: uniforms.uAtlasYScale, uTunnelRadius: uniforms.uRadius,
      uGeometryScale: { value: 1 },
      uTravel: { value: 0 },
      uDitherVisibility: uniforms.uDitherVisibility,
      uVisibility: uniforms.uVisibility, uNearBlend: { value: 0 },
    }, alphaToCoverage: true, blending: THREE.NoBlending, depthTest: true, depthWrite: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  scene.add(mesh);
  // Empty receptacles alone cross the seam. Filled cells never retain a ring.
  // The recess shrinks away early in travel, while its occupancy remains stable
  // so reverse scrolling reconstructs the exact 2D state.
  const socketGeometry = geometry.clone();
  socketGeometry.instanceCount = entries.length;
  const socketMetrics = entries.map(entry => boardSocketMetrics(entry, radiusScale));
  socketGeometry.setAttribute('iRadius', new THREE.InstancedBufferAttribute(
    new Float32Array(socketMetrics.map(socket => socket.outerRadius * worldScale)), 1));
  socketGeometry.setAttribute('iSocketHole', new THREE.InstancedBufferAttribute(
    new Float32Array(socketMetrics.flatMap(socket => [socket.holeRadius / socket.outerRadius,
      socket.holeOffsetY / socket.outerRadius])), 2));
  socketGeometry.setAttribute('iVisible', new THREE.InstancedBufferAttribute(new Float32Array(entries.length), 1));
  const socketMaterial = new THREE.ShaderMaterial({ vertexShader: VERTEX_SHADER,
    fragmentShader: SOCKET_FRAGMENT_SHADER, uniforms: {
      uTunnelRadius: uniforms.uRadius, uGeometryScale: { value: 1 },
      uColour: { value: new THREE.Color() },
    }, depthTest: true, depthWrite: true });
  const sockets = new THREE.Mesh(socketGeometry, socketMaterial);
  sockets.frustumCulled = false;
  scene.add(sockets);
  const pointBytes = [geometry, socketGeometry].reduce((sum, shape) => sum
    + Object.values(shape.attributes).reduce((bytes, attribute) => bytes + attribute.array.byteLength, 0), 0);
  const orientation = new THREE.Quaternion();
  const bank = new THREE.Quaternion();
  const axisX = new THREE.Vector3(1, 0, 0);
  const axisZ = new THREE.Vector3(0, 0, 1);
  let progress = 0, lastWidth = 0, lastHeight = 0;
  let cameraSnapshot = null;
  let latestAtlas = null;
  let occupiedCount = entries.length;

  function setPalette(snapshot, atlas) {
    latestAtlas = atlas;
    const colours = resolveBoardBallRoleColours(snapshot);
    const roles = createBoardBallRoleAssignments(sourceBalls, snapshot);
    const slots = geometry.getAttribute('iAtlasSlot');
    let changed = false;
    rows.forEach((row, index) => {
      const slot = atlas.getSlot(ballColourFromRoleColours(row.source, colours, roles));
      if (slots.array[index] !== slot) { slots.array[index] = slot; changed = true; }
    });
    if (changed) slots.needsUpdate = true;
    const root = canvas.closest('.about-game-board') || canvas;
    socketMaterial.uniforms.uColour.value.setStyle(getComputedStyle(root)
      .getPropertyValue('--about-architecture-fixture').trim() || '#d3d3d3');
    return changed;
  }

  function syncOccupancy() {
    const occupied = getGridState?.()?.occupied;
    const visible = geometry.getAttribute('iVisible');
    const empty = socketGeometry.getAttribute('iVisible');
    const slots = geometry.getAttribute('iAtlasSlot');
    occupiedCount = 0;
    let changed = false;
    entries.forEach((entry, index) => {
      const cell = occupied instanceof Map ? occupied.get(entry.id) : true;
      const filled = cell ? 1 : 0;
      if (visible.array[index] !== filled || empty.array[index] !== 1 - filled) changed = true;
      visible.array[index] = filled;
      empty.array[index] = 1 - filled;
      if (cell) occupiedCount += 1;
      if (cell?.colour && latestAtlas) {
        const slot = latestAtlas.getSlot(cell.colour);
        if (slots.array[index] !== slot) { slots.array[index] = slot; changed = true; }
      }
    });
    if (changed) {
      visible.needsUpdate = true;
      empty.needsUpdate = true;
      slots.needsUpdate = true;
    }
    return changed;
  }

  function update({ progress: nextProgress, camera, width, height, appearance }) {
    progress = Math.max(0, Math.min(1, Number(nextProgress) || 0));
    lastWidth = width; lastHeight = height;
    material.uniforms.uNearBlend.value = smoothBandProgress(progress, 0, 0.08);
    mesh.visible = progress < 0.69;
    sockets.visible = progress < 0.08;
    socketMaterial.uniforms.uGeometryScale.value = 1 - smoothBandProgress(progress, 0.02, 0.08);
    const authoredLens = resolveRollercoasterProjection(meta.camera, width, height, {
      horizontalFov: meta.camera.horizontalFov * appearance.lensWidth,
      portraitVerticalFov: appearance.portraitFov,
    });
    if (progress >= BOARD_BAND_JOURNEY.authoredStart) {
      material.uniforms.uTravel.value = BOARD_BAND_JOURNEY.length;
      camera.fov = authoredLens.verticalFov;
      camera.updateProjectionMatrix();
      cameraSnapshot = { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(),
        verticalFov: camera.fov, travelWU: BOARD_BAND_JOURNEY.length, phase: 'authored' };
      return;
    }
    // The route chooses fixed checkpoints for reduced motion. Respect that
    // selected pose; this controller has no time input or ambient movement.
    const local = progress / BOARD_BAND_JOURNEY.authoredStart;
    const tilt = smoothBandProgress(local, 0, 0.20);
    camera.aspect = width / height;
    camera.fov = 50 + (authoredLens.verticalFov - 50) * smoothBandProgress(local, 0.38, 1);
    camera.updateProjectionMatrix();
    const viewportSpan = BOARD_WIDTH * worldScale / camera.aspect;
    const initialDistance = viewportSpan / (2 * Math.tan(THREE.MathUtils.degToRad(25)));
    const initialTravel = viewportSpan / 2;
    const travel = initialTravel + (BOARD_BAND_JOURNEY.length - initialTravel) * local;
    material.uniforms.uTravel.value = travel;
    const centre = boardBandCentre(travel);
    const heightAbovePath = (BOARD_BAND_JOURNEY.halfTunnelWidth - initialDistance) * (1 - tilt);
    // The source grid must remain exact even in a very tall viewport, whose
    // centre can already lie beyond the beginning of the curved path.
    work.set(centre[0] * tilt, centre[1] + heightAbovePath, -travel)
      .applyQuaternion(joinQuaternion).add(origin);
    camera.position.copy(work);
    const turn = (boardBandCentre(travel + 0.05)[0] - boardBandCentre(travel - 0.05)[0]) / 0.1;
    orientation.setFromAxisAngle(axisX, Math.PI / 2 * (1 - tilt)
      - 0.22 * smoothBandProgress(local, 0.23, 0.70));
    // Small authored bank follows the same S-curve in both directions. It is
    // position owned; releasing the scroll cannot keep the camera drifting.
    bank.setFromAxisAngle(axisZ, -turn * 0.12 * tilt);
    orientation.multiply(bank);
    camera.quaternion.copy(joinQuaternion).multiply(orientation);
    const railMatch = smoothBandProgress(progress, 0.43, BOARD_BAND_JOURNEY.authoredStart);
    if (railMatch > 0) {
      // Match the source rail before crossing its entry station, including its
      // tangent and banking velocity. Position/FOV agreement alone leaves a
      // perceptible stop-and-start at the boundary when scrubbing slowly.
      const sourceProgress = BOARD_BAND_JOURNEY.sourceStart
        + (progress - BOARD_BAND_JOURNEY.authoredStart)
          * (1 - BOARD_BAND_JOURNEY.sourceStart) / (1 - BOARD_BAND_JOURNEY.authoredStart);
      sampleRollercoasterCamera(track, sourceProgress, samplePose);
      work.fromArray(samplePose.position);
      camera.position.lerp(work, railMatch);
      gateQuaternion.fromArray(samplePose.quaternion);
      camera.quaternion.slerp(gateQuaternion, railMatch);
    }
    camera.updateMatrixWorld();
    cameraSnapshot = { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(),
      verticalFov: camera.fov, travelWU: travel, fold: smoothBandProgress(travel,
        BOARD_BAND_JOURNEY.foldStart, BOARD_BAND_JOURNEY.length + gateDistance) };
  }

  function inspect(camera) {
    let maximumCentreErrorPx = 0, maximumRadiusErrorPx = 0;
    let maximumSocketRadiusErrorPx = 0, maximumSocketHoleRadiusErrorPx = 0;
    let maximumSocketHoleOffsetErrorPx = 0;
    if (progress === 0 && lastWidth > 1 && lastHeight > 1) {
      entries.forEach((entry, index) => {
        work.fromArray(rows[index].point).project(camera);
        maximumCentreErrorPx = Math.max(maximumCentreErrorPx,
          Math.hypot((work.x + 1) * lastWidth / 2 - entry.flatX * lastWidth / BOARD_WIDTH,
            (1 - work.y) * lastHeight / 2 - (entry.flatY - GRID_START_Y) * lastWidth / BOARD_WIDTH));
        work.fromArray(rows[index].point).applyMatrix4(camera.matrixWorldInverse);
        const actual = rows[index].radius * lastHeight * camera.projectionMatrix.elements[5] / (-2 * work.z);
        const expected = resolveBoardBallRadius(entry.radius, radiusScale) * lastWidth / BOARD_WIDTH;
        maximumRadiusErrorPx = Math.max(maximumRadiusErrorPx, Math.abs(actual - expected));
        const projectionScale = lastHeight * camera.projectionMatrix.elements[5] / (-2 * work.z);
        const socketRadius = socketGeometry.getAttribute('iRadius').array[index] * projectionScale;
        const aperture = socketGeometry.getAttribute('iSocketHole').array;
        const cssScale = lastWidth / BOARD_WIDTH;
        const socket = socketMetrics[index];
        maximumSocketRadiusErrorPx = Math.max(maximumSocketRadiusErrorPx,
          Math.abs(socketRadius - socket.outerRadius * cssScale));
        maximumSocketHoleRadiusErrorPx = Math.max(maximumSocketHoleRadiusErrorPx,
          Math.abs(socketRadius * aperture[index * 2] - socket.holeRadius * cssScale));
        maximumSocketHoleOffsetErrorPx = Math.max(maximumSocketHoleOffsetErrorPx,
          Math.abs(socketRadius * aperture[index * 2 + 1] - socket.holeOffsetY * cssScale));
      });
    }
    return { progress, sourceCells: entries.length, continuedCells: rows.length - entries.length,
      maximumCentreErrorPx, maximumRadiusErrorPx, occupiedCells: occupiedCount,
      maximumSocketRadiusErrorPx, maximumSocketHoleRadiusErrorPx, maximumSocketHoleOffsetErrorPx,
      socketDiscs: progress < 0.08 ? entries.length - occupiedCount : 0,
      sourceJoinProgress: BOARD_BAND_JOURNEY.sourceStart,
      tunnelGateProgress: BOARD_BAND_JOURNEY.gateProgress,
      tunnelJoin: { objectId: gateSurface.id, centre: gateCentre.toArray(),
        halfWidth: BOARD_BAND_JOURNEY.halfTunnelWidth, sampledFromAuthoredVertices: true },
      path: cameraSnapshot, sameScene: true, scrollOwned: true };
  }

  function dispose() {
    scene.remove(mesh, sockets);
    geometry.dispose(); material.dispose(); socketGeometry.dispose(); socketMaterial.dispose();
  }
  return { update, syncOccupancy, setPalette, inspect, dispose, pointBytes };
}
