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
import { ROLLERCOASTER_COVERAGE_GLSL, ROLLERCOASTER_RADIUS_LIMIT_GLSL } from '../about-rollercoaster/rollercoasterVisibility.js';

/** The flat grid, curved band and tunnel share one camera and world. The final
 * station is the existing Blender tunnel's first gate, not a replacement asset. */
export const BOARD_BAND_JOURNEY = Object.freeze({
  authoredStart: 0.74,
  authoredEnd: 0.94,
  sourceStart: 0.72,
  gateProgress: 0.7465,
  length: 220,
  halfTunnelWidth: 2.55,
  foldStart: 205,
  flatEnd: 0.23,
  tiltEnd: 0.37,
  endingRevealStart: 0.93,
  endingRevealEnd: 0.98,
});

export const smoothBandProgress = (value, start, end) => {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
};

function smootherFlightProgress(value, start, end) {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/** Broad, unequal flight arcs add a little drift without an ambient camera
 * clock. The same scroll position always returns the same pose. */
export function sampleBoardDroneMotion(progress, reducedMotion = false, out = {}) {
  const p = Math.max(0, Math.min(1, Number(progress) || 0));
  const envelope = reducedMotion ? 0
    : smootherFlightProgress(p, BOARD_BAND_JOURNEY.flatEnd, .42)
      * (1 - smootherFlightProgress(p, .82, 1));
  const phase = (p - BOARD_BAND_JOURNEY.flatEnd) * Math.PI * 5;
  out.sway = (.24 * Math.sin(phase) + .08 * Math.sin(phase * .43 + .7)) * envelope;
  out.lift = (.1 * Math.sin(phase * .73 + .5) + .04 * Math.sin(phase * 1.31)) * envelope;
  out.bank = (-.032 * Math.sin(phase + .65) + .014 * Math.sin(phase * .37)) * envelope;
  out.pitch = .012 * Math.sin(phase * .47 + .4) * envelope;
  out.yaw = .009 * Math.sin(phase * .61 - 1) * envelope;
  out.lookAhead = 5 + .6 * Math.sin(phase * .53) * envelope;
  return out;
}

// Circle coordinates point up in the billboard; Canvas's aperture points down.
export const BOARD_SOCKET_FRAGMENT_GLSL = `
  varying vec2 vSocketHole;
  bool insideBoardSocket(vec2 circle) {
    vec2 aperture = circle + vec2(0.0, vSocketHole.y);
    return dot(circle, circle) <= 1.0
      && dot(aperture, aperture) >= vSocketHole.x * vSocketHole.x;
  }
`;

/** A smooth circular fold has a continuous tangent at every lane. */
export function boardBandCrossSection(u, fold, halfWidth, halfTunnel = 2.55) {
  const angle = Math.max(-1, Math.min(1, u)) * Math.PI;
  return [u * halfWidth * (1 - fold) + Math.sin(angle) * halfTunnel * fold,
    halfTunnel * (1 - fold) + Math.cos(angle) * halfTunnel * fold];
}

/** A gently descending S-curve meets the Blender rail at its original station.
 * The drop has zero slope at each end; the camera remains scroll owned. */
export function boardBandCentre(distance, out = [0, 0, 0]) {
  const t = Math.max(0, Math.min(1, (distance - 88) / (BOARD_BAND_JOURNEY.length - 88)));
  const drop = t * t * (3 - 2 * t);
  const envelope = Math.sin(Math.PI * t) ** 2;
  out[0] = 4.2 * Math.sin(Math.PI * 2 * t) * envelope;
  out[1] = 18 * (1 - drop) + 1.1 * Math.sin(Math.PI * 3 * t) * envelope;
  out[2] = -distance;
  return out;
}

/** Move the road around the flight, without rolling the visitor upside down. */
export function boardBandRibbonPose(distance) {
  // Give the downward pitch a clear overhead view before the road banks aside.
  const orbit = Math.PI * 2 * smoothBandProgress(distance, 120, 205);
  const bend = smoothBandProgress(distance, 76, 104)
    * (1 - smoothBandProgress(distance, 196, BOARD_BAND_JOURNEY.length));
  return { orbit, clearance: 2.55 + bend * .35, widthScale: 1 - bend * .48,
    camber: bend ? .065 * Math.sin(distance * .11) * bend : 0 };
}

/** The exported entrance is banked with the original camera. Follow that
 * orientation so the connector cannot turn its lanes through the opening. */
export function boardBandGateFrame(object) {
  const corners = [0, 3, 6, 9].map(offset => new THREE.Vector3().fromArray(object.positions, offset));
  return {
    centre: corners.reduce((sum, corner) => sum.add(corner), new THREE.Vector3()).multiplyScalar(.25),
    right: new THREE.Vector3().subVectors(corners[0], corners[1]).normalize(),
    up: new THREE.Vector3().subVectors(corners[1], corners[2]).normalize(),
    halfWidth: corners[0].distanceTo(corners[1]) * .5,
    halfHeight: corners[1].distanceTo(corners[2]) * .5,
  };
}

export function selectBoardTunnelGeometry(geometry) {
  return { ...geometry, objects: geometry.objects.filter(object =>
    object.id.startsWith('b-') || object.id === 'final-wall') };
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
  uniform vec2 uViewportPx;
  uniform vec4 uReadingBox;
  uniform float uReadingActive;
  varying vec2 vCircle;
  varying float vAtlasSlot;
  varying float vDepth;
  varying float vDistance;
  varying float vRadius;
  varying vec2 vSocketHole;
  varying float vReadingHole;
  ${ROLLERCOASTER_RADIUS_LIMIT_GLSL}
  void main() {
    vec4 centre = modelViewMatrix * vec4(iCentre, 1.0);
    vDepth = -centre.z;
    vDistance = iDistance;
    vRadius = mix(iRadius, uTunnelRadius, iRadiusBlend);
    float radius = screenLimitedRadius(vRadius, vDepth);
    vec4 projectedCentre = projectionMatrix * centre;
    vec2 screenCentre = (projectedCentre.xy / projectedCentre.w * 0.5 + 0.5) * uViewportPx;
    float screenRadius = radius * uViewportPx.y * projectionMatrix[1][1] / max(0.001, 2.0 * vDepth);
    vReadingHole = uReadingActive > 0.5
      && all(lessThan(abs(screenCentre - uReadingBox.xy), uReadingBox.zw + screenRadius)) ? 1.0 : 0.0;
    centre.xy += position.xy * radius
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
  varying float vReadingHole;
  ${ROLLERCOASTER_COVERAGE_GLSL}
  void main() {
    if (dot(vCircle, vCircle) > 1.0 || vDepth <= 0.08) discard;
    if (vReadingHole > 0.5) discard;
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
  const sourceColumns = entries.filter(entry => entry.flatY === sourceRows[0]).sort((a, b) => a.flatX - b.flatX);
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
  const gateFrame = boardBandGateFrame(gateSurface);
  const gateCentre = gateFrame.centre, gateRight = gateFrame.right, gateUp = gateFrame.up;
  const gateTarget = new THREE.Vector3();
  sampleRollercoasterCamera(track, BOARD_BAND_JOURNEY.gateProgress, samplePose);
  const gateDistance = gateCentre.distanceTo(joinPoint);

  function worldPoint(distance, u) {
    const fold = smoothBandProgress(distance, BOARD_BAND_JOURNEY.foldStart,
      BOARD_BAND_JOURNEY.length + gateDistance);
    const ribbon = boardBandRibbonPose(distance);
    const cross = boardBandCrossSection(u, fold, halfWidth * ribbon.widthScale,
      ribbon.clearance);
    if (distance <= BOARD_BAND_JOURNEY.length) {
      const centre = boardBandCentre(distance);
      const y = cross[1] + ribbon.camber * u * u;
      return work.set(centre[0] + cross[0] * Math.cos(ribbon.orbit) - y * Math.sin(ribbon.orbit),
        centre[1] + cross[0] * Math.sin(ribbon.orbit) + y * Math.cos(ribbon.orbit), centre[2])
        .applyQuaternion(joinQuaternion).add(origin).toArray();
    }
    const t = Math.min(1, (distance - BOARD_BAND_JOURNEY.length) / gateDistance);
    sampleRollercoasterCamera(track, BOARD_BAND_JOURNEY.sourceStart
      + t * (BOARD_BAND_JOURNEY.gateProgress - BOARD_BAND_JOURNEY.sourceStart), samplePose);
    gateQuaternion.fromArray(samplePose.quaternion);
    gatePoint.fromArray(samplePose.position);
    work.set(cross[0], cross[1], 0).applyQuaternion(gateQuaternion).add(gatePoint);
    const closed = boardBandCrossSection(u, 1, halfWidth);
    // A rounded square meets the existing lintels without replacing the gate
    // or introducing sharp corners into the travelling ribbon itself.
    const x = closed[0] / BOARD_BAND_JOURNEY.halfTunnelWidth;
    const y = closed[1] / BOARD_BAND_JOURNEY.halfTunnelWidth;
    const extent = (x ** 12 + y ** 12) ** (-1 / 12);
    gateTarget.copy(gateCentre).addScaledVector(gateRight, x * extent * gateFrame.halfWidth)
      .addScaledVector(gateUp, y * extent * gateFrame.halfHeight);
    return work.lerp(gateTarget, smoothBandProgress(t, 0, 1)).toArray();
  }

  // Keep every source grid point, radius and material identity verbatim. Added
  // rows continue its pitch before gradually refining into the tunnel surface.
  entries.forEach(entry => rows.push({
    point: worldPoint((entry.flatY - GRID_START_Y) * worldScale,
      (entry.flatX - sourceMiddle) / halfSourceWidth),
    radius: resolveBoardBallRadius(entry.radius, radiusScale) * worldScale,
    blend: 0, source: entry, roleIndex: entry.laneIndex, distance: (entry.flatY - GRID_START_Y) * worldScale,
  }));
  let distance = finalSourceRow + sourcePitch;
  let rowIndex = sourceRows.length;
  while (distance < BOARD_BAND_JOURNEY.length + gateDistance - 0.32) {
    const refine = smoothBandProgress(distance, 74, 114);
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
        blend: refine, source, roleIndex: sourceColumns[Math.min(sourceColumns.length - 1, Math.floor(col / subdivision))].laneIndex,
        visibility, distance });
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
      uMaximumRadiusPx: uniforms.uMaximumRadiusPx,
      uGeometryScale: { value: 1 },
      uTravel: { value: 0 },
      uDitherVisibility: uniforms.uDitherVisibility,
      uVisibility: uniforms.uVisibility, uNearBlend: { value: 0 },
      uReadingBox: uniforms.uReadingBox, uReadingActive: { value: 0 }, uViewportPx: uniforms.uViewportPx,
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
      uMaximumRadiusPx: uniforms.uMaximumRadiusPx, uViewportPx: uniforms.uViewportPx,
      uColour: { value: new THREE.Color() },
    }, depthTest: true, depthWrite: true });
  const sockets = new THREE.Mesh(socketGeometry, socketMaterial);
  sockets.frustumCulled = false;
  scene.add(sockets);
  const pointBytes = [geometry, socketGeometry].reduce((sum, shape) => sum
    + Object.values(shape.attributes).reduce((bytes, attribute) => bytes + attribute.array.byteLength, 0), 0);
  const orientation = new THREE.Quaternion();
  const flatOrientation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
  const droneOrientation = new THREE.Quaternion();
  const steering = new THREE.Matrix4();
  const localPosition = new THREE.Vector3();
  const lookAhead = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const bank = new THREE.Quaternion();
  const flightRotation = new THREE.Euler(0, 0, 0, 'YXZ');
  const flightQuaternion = new THREE.Quaternion();
  const flightMotion = {};
  const axisZ = new THREE.Vector3(0, 0, 1);
  let progress = 0, lastWidth = 0, lastHeight = 0;
  const centreSample = [0, 0, 0], aheadSample = [0, 0, 0];
  const beforeSample = [0, 0, 0], afterSample = [0, 0, 0];
  const cameraSnapshot = { position: [0, 0, 0], quaternion: [0, 0, 0, 1] };
  let latestAtlas = null;
  let occupiedCount = entries.length;

  function setPalette(snapshot, atlas) {
    latestAtlas = atlas;
    const colours = resolveBoardBallRoleColours(snapshot);
    const roles = createBoardBallRoleAssignments(sourceBalls, snapshot);
    const slots = geometry.getAttribute('iAtlasSlot');
    let changed = false;
    rows.forEach((row, index) => {
      const slot = atlas.getSlot(row.roleIndex === undefined
        ? ballColourFromRoleColours(row.source, colours, roles) : colours[row.roleIndex]);
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

  function applyDroneMotion(camera) {
    // Camera-space drift stays within 0.35 world units of the close rail.
    // The fade has zero velocity and acceleration at the final station.
    work.set(flightMotion.sway, flightMotion.lift, 0).applyQuaternion(camera.quaternion);
    camera.position.add(work);
    flightRotation.set(flightMotion.pitch, flightMotion.yaw, flightMotion.bank);
    flightQuaternion.setFromEuler(flightRotation);
    camera.quaternion.multiply(flightQuaternion);
    camera.updateMatrixWorld();
  }

  function update({ progress: nextProgress, camera, width, height, appearance, reducedMotion = false }) {
    progress = Math.max(0, Math.min(1, Number(nextProgress) || 0));
    sampleBoardDroneMotion(progress, reducedMotion, flightMotion);
    lastWidth = width; lastHeight = height;
    material.uniforms.uNearBlend.value = smoothBandProgress(progress, BOARD_BAND_JOURNEY.flatEnd, BOARD_BAND_JOURNEY.tiltEnd);
    material.uniforms.uReadingActive.value = progress > .075 && progress < BOARD_BAND_JOURNEY.flatEnd ? 1 : 0;
    mesh.visible = progress < 0.82;
    sockets.visible = progress < BOARD_BAND_JOURNEY.tiltEnd;
    socketMaterial.uniforms.uGeometryScale.value = 1 - smoothBandProgress(progress, .07, .16);
    const authoredLens = resolveRollercoasterProjection(meta.camera, width, height, {
      horizontalFov: meta.camera.horizontalFov * appearance.lensWidth,
      portraitVerticalFov: appearance.portraitFov,
    });
    if (progress >= BOARD_BAND_JOURNEY.authoredStart) {
      material.uniforms.uTravel.value = BOARD_BAND_JOURNEY.length;
      camera.fov = authoredLens.verticalFov;
      camera.updateProjectionMatrix();
      applyDroneMotion(camera);
      camera.position.toArray(cameraSnapshot.position);
      camera.quaternion.toArray(cameraSnapshot.quaternion);
      cameraSnapshot.verticalFov = camera.fov;
      cameraSnapshot.travelWU = BOARD_BAND_JOURNEY.length;
      cameraSnapshot.phase = 'authored';
      return;
    }
    // The route chooses fixed checkpoints for reduced motion. Respect that
    // selected pose; this controller has no time input or ambient movement.
    const local = progress / BOARD_BAND_JOURNEY.authoredStart;
    const tilt = smoothBandProgress(progress, BOARD_BAND_JOURNEY.flatEnd, BOARD_BAND_JOURNEY.tiltEnd);
    camera.aspect = width / height;
    camera.fov = 50 + (authoredLens.verticalFov - 50) * smoothBandProgress(local, 0.38, 1);
    camera.updateProjectionMatrix();
    const viewportSpan = BOARD_WIDTH * worldScale / camera.aspect;
    const initialDistance = viewportSpan / (2 * Math.tan(THREE.MathUtils.degToRad(25)));
    const initialTravel = viewportSpan / 2;
    const travel = initialTravel + (BOARD_BAND_JOURNEY.length - initialTravel) * local;
    material.uniforms.uTravel.value = travel;
    const centre = boardBandCentre(travel, centreSample);
    const heightAbovePath = (BOARD_BAND_JOURNEY.halfTunnelWidth - initialDistance) * (1 - tilt);
    // The source grid must remain exact even in a very tall viewport, whose
    // centre can already lie beyond the beginning of the curved path.
    localPosition.set(centre[0], centre[1] + heightAbovePath, -travel);
    work.copy(localPosition).applyQuaternion(joinQuaternion).add(origin);
    camera.position.copy(work);
    const turn = (boardBandCentre(travel + 0.05, afterSample)[0]
      - boardBandCentre(travel - 0.05, beforeSample)[0]) / 0.1;
    const ahead = boardBandCentre(travel + flightMotion.lookAhead, aheadSample);
    lookAhead.set(ahead[0], ahead[1], ahead[2]);
    steering.lookAt(localPosition, lookAhead, up);
    droneOrientation.setFromRotationMatrix(steering);
    orientation.copy(flatOrientation).slerp(droneOrientation, tilt);
    // Small authored bank follows the same S-curve in both directions. It is
    // position owned; releasing the scroll cannot keep the camera drifting.
    bank.setFromAxisAngle(axisZ, Math.max(-.14, Math.min(.14, -turn * .2)) * tilt);
    orientation.multiply(bank);
    camera.quaternion.copy(joinQuaternion).multiply(orientation);
    const railMatch = smoothBandProgress(progress, 0.68, BOARD_BAND_JOURNEY.authoredStart);
    if (railMatch > 0) {
      // Match the source rail before crossing its entry station, including its
      // tangent and banking velocity. Position/FOV agreement alone leaves a
      // perceptible stop-and-start at the boundary when scrubbing slowly.
      const sourceProgress = BOARD_BAND_JOURNEY.sourceStart
        + (progress - BOARD_BAND_JOURNEY.authoredStart)
          * (1 - BOARD_BAND_JOURNEY.sourceStart)
            / (BOARD_BAND_JOURNEY.authoredEnd - BOARD_BAND_JOURNEY.authoredStart);
      sampleRollercoasterCamera(track, sourceProgress, samplePose);
      work.fromArray(samplePose.position);
      camera.position.lerp(work, railMatch);
      gateQuaternion.fromArray(samplePose.quaternion);
      camera.quaternion.slerp(gateQuaternion, railMatch);
    }
    applyDroneMotion(camera);
    camera.position.toArray(cameraSnapshot.position);
    camera.quaternion.toArray(cameraSnapshot.quaternion);
    cameraSnapshot.phase = progress <= BOARD_BAND_JOURNEY.flatEnd ? 'flat'
      : tilt < 1 ? 'ceiling-tilt' : 'ribbon-flight';
    cameraSnapshot.tilt = tilt;
    cameraSnapshot.verticalFov = camera.fov;
    cameraSnapshot.travelWU = travel;
    cameraSnapshot.fold = smoothBandProgress(travel,
      BOARD_BAND_JOURNEY.foldStart, BOARD_BAND_JOURNEY.length + gateDistance);
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
      socketDiscs: progress < .16 ? entries.length - occupiedCount : 0,
      colourLanes: new Set(entries.map(entry => entry.laneIndex)).size,
      maximumBallRadiusPx: uniforms.uMaximumRadiusPx.value,
      approachFloor: false,
      authoredGates: sourceGeometry.objects.filter(object => object.id.startsWith('b-')).length,
      roadClearanceWU: boardBandRibbonPose(cameraSnapshot.travelWU).clearance,
      droneMotion: { ...flightMotion },
      sourceJoinProgress: BOARD_BAND_JOURNEY.sourceStart,
      tunnelGateProgress: BOARD_BAND_JOURNEY.gateProgress,
      tunnelJoin: { objectId: gateSurface.id, centre: gateCentre.toArray(),
        halfWidth: gateFrame.halfWidth, halfHeight: gateFrame.halfHeight,
        sampledFromAuthoredVertices: true },
      path: cameraSnapshot, sameScene: true, scrollOwned: true };
  }

  function dispose() {
    scene.remove(mesh, sockets);
    geometry.dispose(); material.dispose(); socketGeometry.dispose(); socketMaterial.dispose();
  }
  return { update, syncOccupancy, setPalette, inspect, dispose, pointBytes };
}
