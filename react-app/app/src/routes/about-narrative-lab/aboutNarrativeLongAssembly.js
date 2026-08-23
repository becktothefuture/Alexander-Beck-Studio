import {
  ABOUT_NARRATIVE_LONG_RIDE,
  ABOUT_NARRATIVE_LONG_RIDE_BASE_ANCHORS,
  ABOUT_NARRATIVE_LONG_RIDE_BASE_DURATION_WU,
  ABOUT_NARRATIVE_LONG_RIDE_BASE_STAGES,
  compileAboutNarrativeLongRideTrack,
  sampleAboutNarrativeLongRideBank,
  sampleAboutNarrativeLongRideDeckWidth,
  sampleAboutNarrativeLongRidePositionInto,
  sampleAboutNarrativeLongRideTangentInto,
} from './aboutNarrativeLongRideTrack.js';

const TWO_PI = Math.PI * 2;
const GOLDEN_ANGLE = 2.399963229728653;

const MATERIAL = Object.freeze({
  atmosphere: 0,
  stone: 1,
  steel: 2,
  glass: 3,
  signal: 4,
  organic: 5,
});

// V2 decodes these narrow size bands as material and motion roles. The final
// portrait uses the same six roles, so the world changes state without
// changing point systems.
const MATERIAL_SIZE_CODES = Object.freeze([0.72, 0.82, 0.92, 1.02, 1.12, 1.22]);
const MIXED_MATERIAL_CYCLE = Object.freeze([
  MATERIAL.signal,
  MATERIAL.steel,
  MATERIAL.glass,
  MATERIAL.organic,
  MATERIAL.stone,
  MATERIAL.atmosphere,
]);

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const mix = (from, to, progress) => from + ((to - from) * progress);

function hash01(value) {
  const hashed = Math.sin((value * 12.9898) + 78.233) * 43758.5453123;
  return hashed - Math.floor(hashed);
}

function normalize(vector) {
  const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
  vector[0] /= length;
  vector[1] /= length;
  vector[2] /= length;
  return vector;
}

function cross(left, right) {
  return [
    (left[1] * right[2]) - (left[2] * right[1]),
    (left[2] * right[0]) - (left[0] * right[2]),
    (left[0] * right[1]) - (left[1] * right[0]),
  ];
}

function createTrackFrame(track, storyWU, bankScale = 1) {
  const trackStartWU = track.controls[0].atWU;
  const clampedStoryWU = clamp(Number(storyWU), trackStartWU, track.tailEndWU);
  const position = sampleAboutNarrativeLongRidePositionInto(track, clampedStoryWU, [0, 0, 0]);
  const forward = sampleAboutNarrativeLongRideTangentInto(
    track,
    clampedStoryWU,
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  );
  const levelRight = normalize(cross(forward, [0, 1, 0]));
  const levelUp = normalize(cross(levelRight, forward));
  const bank = sampleAboutNarrativeLongRideBank(track, clampedStoryWU)
    * bankScale
    * (Math.PI / 180);
  const cosine = Math.cos(bank);
  const sine = Math.sin(bank);
  const right = [
    (levelRight[0] * cosine) + (levelUp[0] * sine),
    (levelRight[1] * cosine) + (levelUp[1] * sine),
    (levelRight[2] * cosine) + (levelUp[2] * sine),
  ];
  const up = [
    (levelUp[0] * cosine) - (levelRight[0] * sine),
    (levelUp[1] * cosine) - (levelRight[1] * sine),
    (levelUp[2] * cosine) - (levelRight[2] * sine),
  ];
  return { position, forward, right, up };
}

function createCameraAlignedGateFrame(track, storyWU) {
  const gateWU = clamp(
    Number(storyWU),
    track.controls[0].atWU,
    track.tailEndWU,
  );
  const cameraWU = Math.max(
    track.controls[0].atWU,
    gateWU - track.lookAheadWU,
  );
  const position = sampleAboutNarrativeLongRidePositionInto(track, gateWU, [0, 0, 0]);
  const cameraPosition = sampleAboutNarrativeLongRidePositionInto(
    track,
    cameraWU,
    [0, 0, 0],
  );
  const forward = normalize([
    position[0] - cameraPosition[0],
    position[1] - cameraPosition[1],
    position[2] - cameraPosition[2],
  ]);
  const levelRight = normalize(cross(forward, [0, 1, 0]));
  const levelUp = normalize(cross(levelRight, forward));
  const bank = sampleAboutNarrativeLongRideBank(track, cameraWU) * (Math.PI / 180);
  const cosine = Math.cos(bank);
  const sine = Math.sin(bank);
  return {
    position,
    forward,
    right: [
      (levelRight[0] * cosine) - (levelUp[0] * sine),
      (levelRight[1] * cosine) - (levelUp[1] * sine),
      (levelRight[2] * cosine) - (levelUp[2] * sine),
    ],
    up: [
      (levelUp[0] * cosine) + (levelRight[0] * sine),
      (levelUp[1] * cosine) + (levelRight[1] * sine),
      (levelUp[2] * cosine) + (levelRight[2] * sine),
    ],
  };
}

function writeLocalPoint(target, frame, localX, localY, localZ) {
  target[0] = frame.position[0]
    + (frame.right[0] * localX)
    + (frame.up[0] * localY)
    + (frame.forward[0] * localZ);
  target[1] = frame.position[1]
    + (frame.right[1] * localX)
    + (frame.up[1] * localY)
    + (frame.forward[1] * localZ);
  target[2] = frame.position[2]
    + (frame.right[2] * localX)
    + (frame.up[2] * localY)
    + (frame.forward[2] * localZ);
  return target;
}

function createPrimitiveCollector(parameters = {}) {
  const primitives = [];
  const track = compileAboutNarrativeLongRideTrack(parameters);
  const mapper = track.mapper;
  const widthScale = clamp(Number(parameters.widthScale ?? 1), 0.5, 1.6);
  const heightScale = clamp(Number(parameters.heightScale ?? 1), 0.5, 1.6);
  const depthScale = clamp(Number(parameters.depthScale ?? 1), 0.65, 1.35);
  const roundScale = Math.min(widthScale, heightScale);
  const x = (value) => Number(value) * widthScale;
  const y = (value) => Number(value) * heightScale;
  const z = (value) => Number(value) * depthScale;
  const round = (value) => Number(value) * roundScale;
  const runtimeAt = (baseWU) => baseWU <= ABOUT_NARRATIVE_LONG_RIDE_BASE_DURATION_WU
    ? mapper.runtimeWUAtBaseWU(baseWU)
    : mapper.storyDurationWU + (baseWU - ABOUT_NARRATIVE_LONG_RIDE_BASE_DURATION_WU);

  const addOrientedBox = ({
    baseWU,
    center = [0, 0, 0],
    size,
    count,
    material = MATERIAL.stone,
    materialCycle = null,
    bankScale = 0,
    beat,
    role,
  }) => {
    const frame = createTrackFrame(track, runtimeAt(baseWU), bankScale);
    const worldCenter = writeLocalPoint(
      [0, 0, 0],
      frame,
      x(center[0]),
      y(center[1]),
      z(center[2]),
    );
    primitives.push({
      kind: 'oriented-box',
      center: worldCenter,
      right: frame.right,
      up: frame.up,
      forward: frame.forward,
      sx: x(size[0]),
      sy: y(size[1]),
      sz: z(size[2]),
      count,
      material,
      materialCycle,
      beat,
      role,
      baseWU,
      runtimeWU: runtimeAt(baseWU),
    });
  };

  const addBeam = ({
    baseWU,
    from,
    to,
    thickness,
    count,
    material = MATERIAL.steel,
    materialCycle = null,
    bankScale = 0,
    beat,
    role,
  }) => {
    const frame = createTrackFrame(track, runtimeAt(baseWU), bankScale);
    primitives.push({
      kind: 'beam',
      from: writeLocalPoint([0, 0, 0], frame, x(from[0]), y(from[1]), z(from[2])),
      to: writeLocalPoint([0, 0, 0], frame, x(to[0]), y(to[1]), z(to[2])),
      thickness: Math.max(0.08, x(thickness)),
      count,
      material,
      materialCycle,
      beat,
      role,
      baseWU,
      runtimeWU: runtimeAt(baseWU),
    });
  };

  const addGate = (baseWU, {
    width = 10,
    height = 8,
    depth = 1.2,
    count = 620,
    material = MATERIAL.stone,
    materialCycle = null,
    bar = 0.65,
    includeSill = false,
    bankScale = 1,
    beat,
    role,
  } = {}) => {
    const runtimeWU = runtimeAt(baseWU);
    primitives.push({
      kind: 'gate',
      frame: bankScale === 1
        ? createCameraAlignedGateFrame(track, runtimeWU)
        : createTrackFrame(track, runtimeWU, bankScale),
      width: x(width),
      height: y(height),
      depth: z(depth),
      offsetX: 0,
      floorY: y(-(height * 0.5)),
      barX: x(bar),
      barY: y(bar),
      includeSill,
      count,
      material,
      materialCycle,
      beat,
      role,
      baseWU,
      runtimeWU,
    });
  };

  const addHoop = (baseWU, {
    radius = 4.4,
    tube = 0.34,
    count = 420,
    material = MATERIAL.steel,
    materialCycle = null,
    center = [0, 0, 0],
    role = 'centered-hoop',
    bankScale = 1,
    beat = 'hoops',
  } = {}) => {
    const runtimeWU = runtimeAt(baseWU);
    const frame = createTrackFrame(track, runtimeWU, bankScale);
    frame.position = writeLocalPoint(
      [0, 0, 0],
      frame,
      round(center[0]),
      round(center[1]),
      z(center[2]),
    );
    primitives.push({
      kind: 'torus',
      frame,
      radiusX: round(radius),
      radiusY: round(radius),
      tube: round(tube),
      count,
      material,
      materialCycle,
      beat,
      role,
      baseWU,
      runtimeWU,
    });
  };

  const addSphere = (baseWU, {
    radius = 1,
    center = [0, 0, 0],
    count = 520,
    material = MATERIAL.signal,
    materialCycle = null,
    bankScale = 0,
    beat,
    role,
  } = {}) => {
    const runtimeWU = runtimeAt(baseWU);
    primitives.push({
      kind: 'sphere',
      frame: createTrackFrame(track, runtimeWU, bankScale),
      center: [x(center[0]), y(center[1]), z(center[2])],
      rx: x(radius),
      ry: y(radius),
      rz: z(radius),
      count,
      material,
      materialCycle,
      beat,
      role,
      baseWU,
      runtimeWU,
    });
  };

  const addPylon = (baseWU, side, {
    height = 8,
    spread = 2.8,
    material = MATERIAL.steel,
    living = false,
    beat = living ? 'living' : 'yard',
  } = {}) => {
    const centerX = side;
    const trunkMaterial = living ? MATERIAL.organic : material;
    addBeam({
      baseWU,
      from: [centerX - (spread * 0.42), -3.1, 0.35],
      to: [centerX, height, 0],
      thickness: living ? 0.34 : 0.42,
      count: living ? 105 : 125,
      material: trunkMaterial,
      materialCycle: living ? MIXED_MATERIAL_CYCLE : null,
      beat,
      role: living ? 'living-trunk' : 'yard-pylon',
    });
    addBeam({
      baseWU,
      from: [centerX + (spread * 0.42), -3.1, -0.35],
      to: [centerX, height, 0],
      thickness: living ? 0.34 : 0.42,
      count: living ? 105 : 125,
      material: trunkMaterial,
      materialCycle: living ? MIXED_MATERIAL_CYCLE : null,
      beat,
      role: living ? 'living-trunk' : 'yard-pylon',
    });
    if (!living) {
      addBeam({
        baseWU,
        from: [centerX - (spread * 0.35), 1.2, 0.2],
        to: [centerX + (spread * 0.35), 1.2, -0.2],
        thickness: 0.28,
        count: 85,
        material,
        beat,
        role: 'yard-pylon-brace',
      });
      return;
    }
    const branchDirection = Math.sign(side) || 1;
    [0.48, 0.72, 0.91].forEach((heightRatio, branchIndex) => {
      const branchY = height * heightRatio;
      const branchReach = spread * (1.2 - (branchIndex * 0.18));
      const branchMaterial = branchIndex === 2 ? MATERIAL.signal : MATERIAL.organic;
      addBeam({
        baseWU,
        from: [centerX, branchY, 0],
        to: [centerX - (branchDirection * branchReach), branchY + 1.3, -1.4 - branchIndex],
        thickness: 0.25,
        count: 90,
        material: branchMaterial,
        materialCycle: MIXED_MATERIAL_CYCLE,
        beat,
        role: 'living-branch',
      });
      addBeam({
        baseWU,
        from: [centerX, branchY, 0],
        to: [centerX + (branchDirection * branchReach * 0.72), branchY + 0.8, 1.2 + branchIndex],
        thickness: 0.23,
        count: 82,
        material: branchMaterial,
        materialCycle: MIXED_MATERIAL_CYCLE,
        beat,
        role: 'living-branch',
      });
    });
    addSphere(baseWU, {
      radius: 0.44,
      center: [centerX, height + 0.18, 0],
      count: 95,
      material: MATERIAL.signal,
      materialCycle: MIXED_MATERIAL_CYCLE,
      beat,
      role: 'living-node',
    });
  };

  // The ride path stays invisible in both the baked Blender world and fallback.
  // No rails, sleepers, floor line, or other bottom-track geometry is generated.
  // The opening remains clear for a future Blender-authored first moment.
  const terminalBaseWU = track.baseStages.terminal.endWU;

  // 02 — The delivered Blender source removes the earliest hoop so the opening
  // has room for a future authored first moment. Keep the fallback aligned.
  const hoopCount = Math.round(clamp(Number(parameters.hoopCount ?? 18), 10, 26));
  const hoopRadius = clamp(Number(parameters.hoopRadius ?? 4.35), 3, 6);
  for (let index = 1; index < hoopCount; index += 1) {
    const progress = index / (hoopCount - 1);
    addHoop(mix(1.34, 5.02, progress), {
      radius: hoopRadius + (Math.sin(progress * Math.PI) * 0.5),
      tube: 0.29 + ((index % 3) * 0.03),
      count: 430,
      material: MIXED_MATERIAL_CYCLE[index % MIXED_MATERIAL_CYCLE.length],
      materialCycle: MIXED_MATERIAL_CYCLE,
    });
  }

  // 03 — Three readable pass-by masses and one pylon establish scale without
  // filling every edge of the frame.
  const cargoMaterials = [MATERIAL.signal, MATERIAL.steel, MATERIAL.glass, MATERIAL.organic];
  [
    { at: 5.4, side: -7.4, levels: 2 },
    { at: 6.15, side: 7.6, levels: 3 },
    { at: 7.1, side: -7.8, levels: 2 },
  ].forEach((stack, stackIndex) => {
    for (let level = 0; level < stack.levels; level += 1) {
      addOrientedBox({
        baseWU: stack.at + (level * 0.035),
        center: [stack.side + ((level % 2) * 0.45), -2.35 + (level * 1.15), 0],
        size: [3.8 - (level * 0.18), 0.9, 5.2 - (level * 0.3)],
        count: 150,
        material: cargoMaterials[(stackIndex + level) % cargoMaterials.length],
        beat: 'yard',
        role: 'material-stack',
      });
    }
  });
  addPylon(6.55, -10, {
    height: 8.2,
    spread: 3.1,
    material: MATERIAL.steel,
  });
  // 04 — The large spatial loop advances in Z while these square frames and
  // the camera share one unwrapped 360-degree bank.
  const loopGateCount = Math.round(clamp(Number(parameters.loopGateCount ?? 22), 14, 30));
  for (let index = 0; index < loopGateCount; index += 1) {
    const progress = index / (loopGateCount - 1);
    addGate(mix(track.baseStages.loop.startWU + 0.08, track.baseStages.loop.endWU - 0.08, progress), {
      width: 6.25 + (Math.sin(progress * Math.PI) * 0.8),
      height: 6.25 + (Math.sin(progress * Math.PI) * 0.8),
      depth: 0.9,
      bar: 0.46,
      includeSill: true,
      count: 760,
      material: MIXED_MATERIAL_CYCLE[index % MIXED_MATERIAL_CYCLE.length],
      beat: 'loop',
      role: 'rotating-loop-gate',
    });
  }

  // 05 — Four sparse circuits widen after the loop. This reads as an ignition
  // sequence, then clears quickly instead of becoming another tunnel.
  const ignitionMaterials = [
    MATERIAL.stone,
    MATERIAL.signal,
    MATERIAL.organic,
    MATERIAL.glass,
  ];
  ignitionMaterials.forEach((material, index) => {
    const progress = index / (ignitionMaterials.length - 1);
    addGate(mix(track.baseStages.ignition.startWU + 0.18, 14.95, progress), {
      width: 8.8 + (progress * 3.2),
      height: 7.7 + (progress * 2.6),
      depth: 1.1,
      bar: 0.48,
      includeSill: true,
      count: 650,
      material,
      beat: 'ignition',
      role: 'ignition-circuit',
    });
  });

  // 06 — Branching pylons turn the assembled system into a living field. The
  // camera is mathematically level throughout.
  for (let index = 0; index < 7; index += 1) {
    const baseWU = 15.22 + (index * 0.42);
    const side = index % 2 === 0 ? -1 : 1;
    const sideDistance = side * (5.7 + ((index % 3) * 0.8));
    addPylon(baseWU, sideDistance, {
      height: 6.1 + ((index % 4) * 0.95),
      spread: 2.4 + ((index % 2) * 0.42),
      living: true,
    });
  }

  // 07/08 — Open fog carries the eye out of the living field toward the
  // monumental workbench finale supplied by the edited Blender scene.

  return {
    primitives,
    track,
    terminalWU: runtimeAt(terminalBaseWU),
  };
}

export function createAboutNarrativeLongAssemblyBlueprint(parameters = {}) {
  return createPrimitiveCollector(parameters);
}

function allocatePrimitiveCounts(primitives, pointCount) {
  const totalWeight = primitives.reduce(
    (sum, primitive) => sum + Math.max(1, Number(primitive.count) || 1),
    0,
  );
  const allocations = primitives.map((primitive, index) => {
    const exact = pointCount * (Math.max(1, Number(primitive.count) || 1) / totalWeight);
    return { index, count: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let remaining = pointCount - allocations.reduce((sum, allocation) => sum + allocation.count, 0);
  [...allocations]
    .sort((left, right) => right.remainder - left.remainder || left.index - right.index)
    .forEach((allocation) => {
      if (remaining <= 0) return;
      allocations[allocation.index].count += 1;
      remaining -= 1;
    });
  return allocations.map((allocation) => allocation.count);
}

function resolveBoxFace(sx, sy, sz, selector) {
  const faces = [
    { axis: 0, sign: -1, a: sy, b: sz },
    { axis: 0, sign: 1, a: sy, b: sz },
    { axis: 1, sign: -1, a: sx, b: sz },
    { axis: 1, sign: 1, a: sx, b: sz },
    { axis: 2, sign: -1, a: sx, b: sy },
    { axis: 2, sign: 1, a: sx, b: sy },
  ];
  faces.forEach((face) => { face.area = face.a * face.b; });
  const totalArea = faces.reduce((sum, face) => sum + face.area, 0);
  let cursor = selector * totalArea;
  for (const face of faces) {
    if (cursor <= face.area) {
      return { face, localRatio: cursor / Math.max(0.000001, face.area), totalArea };
    }
    cursor -= face.area;
  }
  return { face: faces.at(-1), localRatio: 1, totalArea };
}

function writeLocalBoxSurface(target, sx, sy, sz, localIndex, sampleCount) {
  const selection = resolveBoxFace(sx, sy, sz, (localIndex + 0.5) / sampleCount);
  const { face, localRatio, totalArea } = selection;
  const faceCount = Math.max(1, Math.round(sampleCount * (face.area / totalArea)));
  const gridIndex = Math.min(faceCount - 1, Math.floor(localRatio * faceCount));
  const columns = Math.max(1, Math.round(Math.sqrt(faceCount * (face.a / Math.max(0.001, face.b)))));
  const rows = Math.max(1, Math.ceil(faceCount / columns));
  const u = (((gridIndex % columns) + 0.5) / columns) - 0.5;
  const v = ((Math.floor(gridIndex / columns) + 0.5) / rows) - 0.5;
  target[0] = 0;
  target[1] = 0;
  target[2] = 0;
  if (face.axis === 0) {
    target[0] = face.sign * sx * 0.5;
    target[1] = u * sy;
    target[2] = v * sz;
  } else if (face.axis === 1) {
    target[0] = u * sx;
    target[1] = face.sign * sy * 0.5;
    target[2] = v * sz;
  } else {
    target[0] = u * sx;
    target[1] = v * sy;
    target[2] = face.sign * sz * 0.5;
  }
  return target;
}

function writeOrientedBoxPoint(target, offset, primitive, localIndex, sampleCount) {
  const local = writeLocalBoxSurface(
    [0, 0, 0],
    primitive.sx,
    primitive.sy,
    primitive.sz,
    localIndex,
    sampleCount,
  );
  target[offset] = primitive.center[0]
    + (primitive.right[0] * local[0])
    + (primitive.up[0] * local[1])
    + (primitive.forward[0] * local[2]);
  target[offset + 1] = primitive.center[1]
    + (primitive.right[1] * local[0])
    + (primitive.up[1] * local[1])
    + (primitive.forward[1] * local[2]);
  target[offset + 2] = primitive.center[2]
    + (primitive.right[2] * local[0])
    + (primitive.up[2] * local[1])
    + (primitive.forward[2] * local[2]);
}

function writeBeamPoint(target, offset, primitive, localIndex, sampleCount, sampleSeed) {
  const [fromX, fromY, fromZ] = primitive.from;
  const [toX, toY, toZ] = primitive.to;
  const deltaX = toX - fromX;
  const deltaY = toY - fromY;
  const deltaZ = toZ - fromZ;
  const length = Math.hypot(deltaX, deltaY, deltaZ) || 1;
  const direction = [deltaX / length, deltaY / length, deltaZ / length];
  const helper = Math.abs(direction[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const side = normalize(cross(direction, helper));
  const up = cross(side, direction);
  const along = (localIndex + 0.5) / sampleCount;
  const angle = (localIndex * GOLDEN_ANGLE) % TWO_PI;
  const radius = primitive.thickness * (0.35 + (hash01(sampleSeed * 47.117) * 0.15));
  target[offset] = fromX + (deltaX * along)
    + (side[0] * Math.cos(angle) * radius)
    + (up[0] * Math.sin(angle) * radius);
  target[offset + 1] = fromY + (deltaY * along)
    + (side[1] * Math.cos(angle) * radius)
    + (up[1] * Math.sin(angle) * radius);
  target[offset + 2] = fromZ + (deltaZ * along)
    + (side[2] * Math.cos(angle) * radius)
    + (up[2] * Math.sin(angle) * radius);
}

function writeGatePoint(target, offset, primitive, localIndex, sampleCount) {
  const componentCount = primitive.includeSill ? 4 : 3;
  const component = localIndex % componentCount;
  const componentIndex = Math.floor(localIndex / componentCount);
  const componentSamples = Math.max(1, Math.ceil(sampleCount / componentCount));
  const edgeProgress = (componentIndex + 0.5) / componentSamples;
  const edgeAngle = (componentIndex * GOLDEN_ANGLE) % TWO_PI;
  const depthOffset = Math.sin(edgeAngle) * primitive.depth * 0.34;
  let localX = primitive.offsetX;
  let localY = primitive.floorY;
  if (component < 2) {
    localX += ((component === 0 ? -1 : 1) * primitive.width * 0.5)
      + (Math.cos(edgeAngle) * primitive.barX * 0.28);
    localY += edgeProgress * primitive.height;
  } else {
    localX += ((edgeProgress - 0.5) * primitive.width);
    localY += (component === 2 ? primitive.height : 0)
      + (Math.cos(edgeAngle) * primitive.barY * 0.28);
  }
  const world = writeLocalPoint(
    [0, 0, 0],
    primitive.frame,
    localX,
    localY,
    depthOffset,
  );
  target[offset] = world[0];
  target[offset + 1] = world[1];
  target[offset + 2] = world[2];
}

function writeTorusPoint(target, offset, primitive, localIndex) {
  const majorAngle = (localIndex * GOLDEN_ANGLE) % TWO_PI;
  const tubeAngle = (localIndex * GOLDEN_ANGLE * 1.61803398875) % TWO_PI;
  const ringX = Math.cos(majorAngle) * primitive.radiusX;
  const ringY = Math.sin(majorAngle) * primitive.radiusY;
  const localX = ringX
    + (Math.cos(majorAngle) * Math.cos(tubeAngle) * primitive.tube);
  const localY = ringY
    + (Math.sin(majorAngle) * Math.cos(tubeAngle) * primitive.tube);
  const localZ = Math.sin(tubeAngle) * primitive.tube;
  const world = writeLocalPoint([0, 0, 0], primitive.frame, localX, localY, localZ);
  target[offset] = world[0];
  target[offset + 1] = world[1];
  target[offset + 2] = world[2];
}

function writeSpherePoint(target, offset, primitive, localIndex, sampleCount, sampleSeed) {
  const radius = Math.cbrt((localIndex + 0.5) / Math.max(1, sampleCount));
  const vertical = (hash01(sampleSeed * 0.97) * 2) - 1;
  const ring = Math.sqrt(Math.max(0, 1 - (vertical * vertical)));
  const angle = (localIndex * GOLDEN_ANGLE) % TWO_PI;
  const world = writeLocalPoint(
    [0, 0, 0],
    primitive.frame,
    primitive.center[0] + (Math.cos(angle) * ring * primitive.rx * radius),
    primitive.center[1] + (vertical * primitive.ry * radius),
    primitive.center[2] + (Math.sin(angle) * ring * primitive.rz * radius),
  );
  target[offset] = world[0];
  target[offset + 1] = world[1];
  target[offset + 2] = world[2];
}

function writeSweptTubePoint(target, offset, primitive, localIndex, sampleCount) {
  const progress = (localIndex + 0.5) / sampleCount;
  const storyWU = mix(primitive.startWU, primitive.endWU, progress);
  const frame = createTrackFrame(primitive.track, storyWU, 1);
  const angle = (localIndex * GOLDEN_ANGLE) % TWO_PI;
  const lateralOffset = mix(
    Number(primitive.lateralOffsetStart ?? primitive.lateralOffset ?? 0),
    Number(primitive.lateralOffsetEnd ?? primitive.lateralOffset ?? 0),
    progress,
  );
  const verticalOffset = mix(
    Number(primitive.verticalOffsetStart ?? primitive.verticalOffset ?? 0),
    Number(primitive.verticalOffsetEnd ?? primitive.verticalOffset ?? 0),
    progress,
  );
  const localX = lateralOffset + (Math.cos(angle) * primitive.thickness);
  const localY = verticalOffset + (Math.sin(angle) * primitive.thickness);
  const world = writeLocalPoint([0, 0, 0], frame, localX, localY, 0);
  target[offset] = world[0];
  target[offset + 1] = world[1];
  target[offset + 2] = world[2];
}

function writeSweptRibbonPoint(target, offset, primitive, localIndex, sampleCount, sampleSeed) {
  const progress = (localIndex + 0.5) / sampleCount;
  const storyWU = mix(primitive.startWU, primitive.endWU, progress);
  const frame = createTrackFrame(primitive.track, storyWU, 1);
  const width = sampleAboutNarrativeLongRideDeckWidth(primitive.track, storyWU);
  const face = localIndex % 10;
  const across = (hash01(sampleSeed * 0.719) - 0.5) * width;
  let localX = across;
  let localY = primitive.verticalOffset + (primitive.thickness * 0.5);
  if (face === 7) localY -= primitive.thickness;
  if (face === 8 || face === 9) {
    localX = (face === 8 ? -1 : 1) * width * 0.5;
    localY = primitive.verticalOffset
      + ((hash01(sampleSeed * 1.113) - 0.5) * primitive.thickness);
  }
  const world = writeLocalPoint([0, 0, 0], frame, localX, localY, 0);
  target[offset] = world[0];
  target[offset + 1] = world[1];
  target[offset + 2] = world[2];
}

function writeTrackTiePoint(target, offset, primitive, localIndex, sampleSeed) {
  const repeatIndex = localIndex % primitive.repeatCount;
  const storyWU = primitive.startWU
    + (((repeatIndex + 0.5) / primitive.repeatCount) * (primitive.endWU - primitive.startWU));
  const frame = createTrackFrame(primitive.track, storyWU, 1);
  const width = Math.min(
    5.2,
    sampleAboutNarrativeLongRideDeckWidth(primitive.track, storyWU) * 0.72,
  );
  const across = (hash01(sampleSeed * 0.877) - 0.5) * width;
  const localY = primitive.verticalOffset + ((hash01(sampleSeed * 1.271) - 0.5) * 0.16);
  const world = writeLocalPoint([0, 0, 0], frame, across, localY, 0);
  target[offset] = world[0];
  target[offset + 1] = world[1];
  target[offset + 2] = world[2];
}

/**
 * Create the permanent point-built world around the shared ride spline.
 */
export function createAboutNarrativeLongAssemblyShape(
  pointCount,
  _seeds,
  parameters = {},
) {
  const positions = new Float32Array(pointCount * 3);
  const size = new Float32Array(pointCount);
  const { primitives } = createPrimitiveCollector(parameters);
  const allocations = allocatePrimitiveCounts(primitives, pointCount);
  let pointIndex = 0;

  primitives.forEach((primitive, primitiveIndex) => {
    const sampleCount = allocations[primitiveIndex];
    for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
      const offset = pointIndex * 3;
      const sampleSeed = (sampleIndex + 1) + ((primitiveIndex + 1) * 104729);
      if (primitive.kind === 'beam') {
        writeBeamPoint(positions, offset, primitive, sampleIndex, sampleCount, sampleSeed);
      } else if (primitive.kind === 'gate') {
        writeGatePoint(positions, offset, primitive, sampleIndex, sampleCount);
      } else if (primitive.kind === 'torus') {
        writeTorusPoint(positions, offset, primitive, sampleIndex);
      } else if (primitive.kind === 'sphere') {
        writeSpherePoint(positions, offset, primitive, sampleIndex, sampleCount, sampleSeed);
      } else if (primitive.kind === 'swept-tube') {
        writeSweptTubePoint(positions, offset, primitive, sampleIndex, sampleCount);
      } else if (primitive.kind === 'swept-ribbon') {
        writeSweptRibbonPoint(positions, offset, primitive, sampleIndex, sampleCount, sampleSeed);
      } else if (primitive.kind === 'track-ties') {
        writeTrackTiePoint(positions, offset, primitive, sampleIndex, sampleSeed);
      } else {
        writeOrientedBoxPoint(positions, offset, primitive, sampleIndex, sampleCount);
      }
      const material = primitive.materialCycle?.length
        ? primitive.materialCycle[sampleIndex % primitive.materialCycle.length]
        : primitive.material;
      const materialIndex = clamp(Math.round(Number(material)), 0, 5);
      size[pointIndex] = MATERIAL_SIZE_CODES[materialIndex];
      pointIndex += 1;
    }
  });

  while (pointIndex < pointCount) {
    const sourceIndex = pointIndex % Math.max(1, pointIndex);
    positions[pointIndex * 3] = positions[sourceIndex * 3] || 0;
    positions[(pointIndex * 3) + 1] = positions[(sourceIndex * 3) + 1] || 0;
    positions[(pointIndex * 3) + 2] = positions[(sourceIndex * 3) + 2] || 0;
    size[pointIndex] = size[sourceIndex] || MATERIAL_SIZE_CODES[MATERIAL.stone];
    pointIndex += 1;
  }

  return { positions, size };
}

function calculateSourceBounds(positions) {
  const minimum = [Infinity, Infinity, Infinity];
  const maximum = [-Infinity, -Infinity, -Infinity];
  for (let index = 0; index < positions.length; index += 3) {
    minimum[0] = Math.min(minimum[0], positions[index]);
    minimum[1] = Math.min(minimum[1], positions[index + 1]);
    minimum[2] = Math.min(minimum[2], positions[index + 2]);
    maximum[0] = Math.max(maximum[0], positions[index]);
    maximum[1] = Math.max(maximum[1], positions[index + 1]);
    maximum[2] = Math.max(maximum[2], positions[index + 2]);
  }
  return { minimum, maximum };
}

/**
 * Append the existing Napoleon point asset at the open end of the ride. The
 * source is normalised here so the local procedural fallback and the binary
 * asset occupy the same authored silhouette and plinth relationship.
 */
export function combineAboutNarrativeLongAssemblyWithTerminalBust(
  assembly,
  bust,
  parameters = {},
) {
  const assemblyCount = assembly.positions.length / 3;
  const bustCount = bust.positions.length / 3;
  const pointCount = assemblyCount + bustCount;
  const positions = new Float32Array(pointCount * 3);
  const size = new Float32Array(pointCount);
  positions.set(assembly.positions);
  size.set(assembly.size || new Float32Array(assemblyCount).fill(1));

  const track = compileAboutNarrativeLongRideTrack(parameters);
  const terminalWU = track.storyDurationWU
    + (track.baseStages.terminal.endWU - ABOUT_NARRATIVE_LONG_RIDE_BASE_DURATION_WU);
  const frame = createTrackFrame(track, terminalWU, 0);
  const widthScale = clamp(Number(parameters.widthScale ?? 1), 0.5, 1.6);
  const heightScale = clamp(Number(parameters.heightScale ?? 1), 0.5, 1.6);
  const depthScale = clamp(Number(parameters.depthScale ?? 1), 0.65, 1.35);
  const bounds = calculateSourceBounds(bust.positions);
  const sourceCenter = bounds.minimum.map((value, axis) => (
    (value + bounds.maximum[axis]) * 0.5
  ));
  const sourceWidth = Math.max(0.0001, bounds.maximum[0] - bounds.minimum[0]);
  const sourceHeight = Math.max(0.0001, bounds.maximum[1] - bounds.minimum[1]);
  const sourceDepth = Math.max(0.0001, bounds.maximum[2] - bounds.minimum[2]);
  const normalization = 1 / Math.max(
    sourceWidth / 1.2,
    sourceHeight / 1.72,
    sourceDepth / 1.13,
  );
  const portraitScale = clamp(Number(parameters.bustScale ?? 5.1), 4, 10) * normalization;
  const portraitYOffset = clamp(Number(parameters.bustYOffset ?? 4.5), 0, 8);
  const yaw = -0.16;
  const yawCosine = Math.cos(yaw);
  const yawSine = Math.sin(yaw);

  for (let index = 0; index < bustCount; index += 1) {
    const sourceOffset = index * 3;
    const centeredX = (bust.positions[sourceOffset] - sourceCenter[0]) * portraitScale;
    const centeredY = (bust.positions[sourceOffset + 1] - sourceCenter[1]) * portraitScale;
    const centeredZ = (bust.positions[sourceOffset + 2] - sourceCenter[2]) * portraitScale;
    const rotatedX = (centeredX * yawCosine) - (centeredZ * yawSine);
    const rotatedZ = (centeredX * yawSine) + (centeredZ * yawCosine);
    const world = writeLocalPoint(
      [0, 0, 0],
      frame,
      rotatedX * widthScale,
      (centeredY * heightScale) + (portraitYOffset * heightScale),
      rotatedZ * depthScale,
    );
    const targetIndex = assemblyCount + index;
    const targetOffset = targetIndex * 3;
    positions[targetOffset] = world[0];
    positions[targetOffset + 1] = world[1];
    positions[targetOffset + 2] = world[2];
    const group = clamp(Math.round(Number(bust.materialGroups?.[index] ?? (index % 6))), 0, 5);
    size[targetIndex] = MATERIAL_SIZE_CODES[group];
  }

  return {
    positions,
    size,
    fallbackReason: bust.fallbackReason,
  };
}

const DEFAULT_PRIMITIVE_COUNT = createPrimitiveCollector({
  storyDurationWU: ABOUT_NARRATIVE_LONG_RIDE_BASE_DURATION_WU,
  ...Object.fromEntries(Object.entries(ABOUT_NARRATIVE_LONG_RIDE_BASE_ANCHORS).map(
    ([key, value]) => [`${key}AnchorWU`, value],
  )),
}).primitives.length;

export const ABOUT_NARRATIVE_LONG_ASSEMBLY = Object.freeze({
  id: 'long-assembly-corridor-v1',
  baseStoryDurationWU: ABOUT_NARRATIVE_LONG_RIDE_BASE_DURATION_WU,
  cameraOriginZ: ABOUT_NARRATIVE_LONG_RIDE.originZ,
  forwardUnitsPerWU: ABOUT_NARRATIVE_LONG_RIDE.forwardUnitsPerWU,
  estimatedTrackLength: ABOUT_NARRATIVE_LONG_RIDE.estimatedTrackLength,
  primitiveCount: DEFAULT_PRIMITIVE_COUNT,
  materialSizeCodes: MATERIAL_SIZE_CODES,
  baseStoryAnchors: ABOUT_NARRATIVE_LONG_RIDE_BASE_ANCHORS,
  baseStages: ABOUT_NARRATIVE_LONG_RIDE_BASE_STAGES,
});
