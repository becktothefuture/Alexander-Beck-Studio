// Offline geometry checks. These do not run in the renderer or its RAF loop.
import assert from 'node:assert/strict';

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const dot = (first, second) => first.reduce((sum, value, index) => sum + value * second[index], 0);
const subtract = (first, second) => first.map((value, index) => value - second[index]);
const mix = (first, second, amount) => first.map((value, index) => value + (second[index] - value) * amount);
const normalise = (vector) => vector.map((value) => value / Math.hypot(...vector));

function rotate(quaternion, vector) {
  const [x, y, z, w] = quaternion;
  const [vx, vy, vz] = vector;
  const tx = 2 * (y * vz - z * vy);
  const ty = 2 * (z * vx - x * vz);
  const tz = 2 * (x * vy - y * vx);
  return [vx + w * tx + y * tz - z * ty,
    vy + w * ty + z * tx - x * tz, vz + w * tz + x * ty - y * tx];
}

function slerp(first, second, amount) {
  let target = second;
  let cosine = dot(first, target);
  if (cosine < 0) {
    target = target.map((value) => -value);
    cosine = -cosine;
  }
  if (cosine > 0.9995) return normalise(mix(first, target, amount));
  const angle = Math.acos(clamp(cosine, -1, 1));
  const a = Math.sin((1 - amount) * angle) / Math.sin(angle);
  const b = Math.sin(amount * angle) / Math.sin(angle);
  return normalise(first.map((value, index) => value * a + target[index] * b));
}

export function measureCameraGatePassage(track) {
  assert.equal(track.gatePassage?.schema, 'about-square-gate-apertures/v1');
  assert.equal(track.gatePassage.coordinateSystem, 'website-world');
  const { samples } = track;
  const distances = [0];
  let maximumAngularDegreesPerWU = 0;
  let maximumAngularStepDegrees = 0;
  let maximumStationaryAngularStepDegrees = 0;
  for (let index = 1; index < samples.length; index += 1) {
    const distance = Math.hypot(...subtract(samples[index].slice(0, 3), samples[index - 1].slice(0, 3)));
    distances.push(distances[index - 1] + distance);
    const angle = 2 * Math.acos(clamp(Math.abs(dot(
      normalise(samples[index].slice(3)), normalise(samples[index - 1].slice(3)),
    )), 0, 1)) * 180 / Math.PI;
    maximumAngularStepDegrees = Math.max(maximumAngularStepDegrees, angle);
    if (distance > 0.0001) maximumAngularDegreesPerWU = Math.max(maximumAngularDegreesPerWU, angle / distance);
    else maximumStationaryAngularStepDegrees = Math.max(maximumStationaryAngularStepDegrees, angle);
  }
  const sampleAtDistance = (distance) => {
    let low = 1;
    let high = distances.length - 1;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (distances[mid] < distance) low = mid + 1;
      else high = mid;
    }
    const length = distances[low] - distances[low - 1];
    const amount = length > 0 ? clamp((distance - distances[low - 1]) / length, 0, 1) : 0;
    return {
      position: mix(samples[low - 1].slice(0, 3), samples[low].slice(0, 3), amount),
      quaternion: slerp(normalise(samples[low - 1].slice(3)), normalise(samples[low].slice(3)), amount),
      progress: (low - 1 + amount) / (samples.length - 1),
    };
  };
  const gates = track.gatePassage.apertures.map((aperture, gateIndex) => {
    const { centre, right, up, normal, innerHalfSize, halfDepth } = aperture;
    assert.equal(aperture.id, gateIndex + 1);
    for (const axis of [right, up, normal]) assert.ok(Math.abs(Math.hypot(...axis) - 1) < 0.00001);
    for (const [first, second] of [[right, up], [right, normal], [up, normal]]) {
      assert.ok(Math.abs(dot(first, second)) < 0.0001, 'The aperture frame must be orthogonal.');
    }
    assert.ok(centre.every(Number.isFinite) && innerHalfSize.every((value) => value > 0) && halfDepth > 0);
    const intersections = [];
    // Check both faces as well as the middle plane. A centre-plane crossing
    // alone can accept a camera that clips the rim of a thick gate.
    for (const planeOffset of [-halfDepth, 0, halfDepth]) {
      const crossings = [];
      for (let index = 1; index < samples.length; index += 1) {
        const a = samples[index - 1].slice(0, 3);
        const b = samples[index].slice(0, 3);
        const first = dot(subtract(a, centre), normal) - planeOffset;
        const second = dot(subtract(b, centre), normal) - planeOffset;
        if (first * second > 0 || Math.abs(first - second) < 0.000001) continue;
        const amount = first / (first - second);
        const point = mix(a, b, amount);
        const offset = subtract(point, centre);
        const clearance = Math.min(innerHalfSize[0] - Math.abs(dot(offset, right)),
          innerHalfSize[1] - Math.abs(dot(offset, up)));
        if (clearance <= 0) continue;
        crossings.push({
          distanceWU: distances[index - 1] + (distances[index] - distances[index - 1]) * amount,
          progress: (index - 1 + amount) / (samples.length - 1),
          position: point, clearanceWU: clearance, planeOffset,
        });
      }
      intersections.push(crossings);
    }
    const crossing = intersections[1][0];
    const approaches = crossing ? [16, 12, 8, 6, 4, 2, 1].map((leadWU) => {
      const distanceWU = crossing.distanceWU - leadWU;
      const pose = sampleAtDistance(distanceWU);
      return {
        leadWU,
        distanceWU,
        ...pose,
        ...measureGateView(
          aperture,
          pose,
          1.9,
          track.projection?.horizontalFov,
        ),
      };
    }) : [];
    return { id: aperture.id, aperture, intersections, crossing, approaches };
  });
  return { gates, distances, pathLengthWU: distances.at(-1), sampleAtDistance,
    maximumAngularDegreesPerWU, maximumAngularStepDegrees, maximumStationaryAngularStepDegrees };
}

export function measureGateView(aperture, pose, aspect, horizontalFov) {
  const forward = rotate(pose.quaternion, [0, 0, -1]);
  const right = rotate(pose.quaternion, [1, 0, 0]);
  const up = rotate(pose.quaternion, [0, 1, 0]);
  const offset = subtract(aperture.centre, pose.position);
  const depth = dot(offset, forward);
  const tanHalfFov = Math.tan(horizontalFov * Math.PI / 360);
  const denominator = dot(forward, aperture.normal);
  const rayLength = Math.abs(denominator) > 0.000001 ? dot(offset, aperture.normal) / denominator : Infinity;
  const aimOffset = subtract(pose.position.map((value, index) => value + forward[index] * rayLength), aperture.centre);
  return {
    depthWU: depth,
    centreNDC: [dot(offset, right) / depth / tanHalfFov, dot(offset, up) / depth / tanHalfFov * aspect],
    aimClearanceWU: rayLength > 0 ? Math.min(
      aperture.innerHalfSize[0] - Math.abs(dot(aimOffset, aperture.right)),
      aperture.innerHalfSize[1] - Math.abs(dot(aimOffset, aperture.up)),
    ) : -Infinity,
  };
}

export function assertCameraGatePassage(measurement, expectedCount = 16) {
  assert.equal(measurement.gates.length, expectedCount, 'Every source gate needs an aperture check.');
  let previousDistance = -Infinity;
  for (const gate of measurement.gates) {
    for (const intersections of gate.intersections) {
      assert.equal(intersections.length, 1, `Gate ${gate.id}: camera must pass through each face once.`);
      assert.ok(intersections[0].clearanceWU >= Math.min(...gate.aperture.innerHalfSize) * 0.75,
        `Gate ${gate.id}: camera clips the rim instead of travelling through the opening.`);
    }
    assert.ok(gate.crossing.distanceWU > previousDistance, 'The camera must traverse the gates in source order.');
    previousDistance = gate.crossing.distanceWU;
    for (const approach of gate.approaches) {
      assert.ok(approach.depthWU > 0 && approach.centreNDC.every((value) => Math.abs(value) < 0.95),
        `Gate ${gate.id}: opening leaves the view ${approach.leadWU} WU before passage.`);
      if (approach.leadWU <= 8) {
        assert.ok(approach.aimClearanceWU > 0.75,
          `Gate ${gate.id}: camera looks past its opening on the close approach.`);
      }
    }
  }
  // Include roll in the check. Forward-vector tests alone admitted the old
  // world-up spin even though the camera's horizon turned almost 180 degrees.
  assert.ok(measurement.maximumStationaryAngularStepDegrees < 0.001,
    'The camera rotates without advancing along its rail.');
  // Source frames cover different distances after the gate exit. The website
  // samples by distance, so angular continuity must use that same unit.
  assert.ok(measurement.maximumAngularDegreesPerWU < 3.5,
    `Camera orientation spikes to ${measurement.maximumAngularDegreesPerWU.toFixed(3)} degrees/WU.`);
}

export function measureCameraRoundTunnelPassage(track) {
  assert.equal(track.roundTunnelPassage?.schema, 'about-round-tunnel-apertures/v1');
  assert.equal(track.roundTunnelPassage.coordinateSystem, 'website-world');
  const base = measureCameraGatePassage(track);
  const { distances, sampleAtDistance, pathLengthWU } = base;
  const { samples } = track;
  const apertures = track.roundTunnelPassage.apertures.map((aperture, index) => {
    const {
      centre, right, up, normal, innerRadius, halfDepth,
    } = aperture;
    assert.equal(aperture.id, index + 1);
    for (const axis of [right, up, normal]) {
      assert.ok(Math.abs(Math.hypot(...axis) - 1) < 0.00001,
        `Round aperture ${aperture.id} has a non-unit basis.`);
    }
    for (const [first, second] of [[right, up], [right, normal], [up, normal]]) {
      assert.ok(Math.abs(dot(first, second)) < 0.0001,
        `Round aperture ${aperture.id} frame must be orthogonal.`);
    }
    assert.ok(centre.every(Number.isFinite) && innerRadius > 0 && halfDepth > 0);
    const intersections = [];
    for (const planeOffset of [-halfDepth, 0, halfDepth]) {
      const crossings = [];
      for (let sampleIndex = 1; sampleIndex < samples.length; sampleIndex += 1) {
        const firstPosition = samples[sampleIndex - 1].slice(0, 3);
        const secondPosition = samples[sampleIndex].slice(0, 3);
        const first = dot(subtract(firstPosition, centre), normal) - planeOffset;
        const second = dot(subtract(secondPosition, centre), normal) - planeOffset;
        if (first * second > 0 || Math.abs(first - second) < 0.000001) continue;
        const amount = first / (first - second);
        const position = mix(firstPosition, secondPosition, amount);
        const offset = subtract(position, centre);
        const radialDistance = Math.hypot(dot(offset, right), dot(offset, up));
        const clearanceWU = innerRadius - radialDistance;
        if (clearanceWU <= 0) continue;
        crossings.push({
          distanceWU: distances[sampleIndex - 1]
            + (distances[sampleIndex] - distances[sampleIndex - 1]) * amount,
          progress: (sampleIndex - 1 + amount) / (samples.length - 1),
          position,
          radialDistanceWU: radialDistance,
          clearanceWU,
          planeOffset,
        });
      }
      intersections.push(crossings);
    }
    const crossing = intersections[1][0];
    const approaches = crossing ? [16, 12, 8, 6, 4, 2, 1]
      .filter((leadWU) => crossing.distanceWU - leadWU >= 0)
      .map((leadWU) => {
        const distanceWU = crossing.distanceWU - leadWU;
        const pose = sampleAtDistance(distanceWU);
        return {
          leadWU,
          distanceWU,
          ...pose,
          ...measureRoundTunnelView(
            aperture,
            pose,
            1.9,
            track.projection?.horizontalFov,
          ),
        };
      }) : [];
    return { id: aperture.id, aperture, intersections, crossing, approaches };
  });
  return {
    apertures,
    distances,
    pathLengthWU,
    sampleAtDistance,
    maximumAngularDegreesPerWU: base.maximumAngularDegreesPerWU,
    maximumAngularStepDegrees: base.maximumAngularStepDegrees,
    maximumStationaryAngularStepDegrees: base.maximumStationaryAngularStepDegrees,
  };
}

export function measureRoundTunnelView(aperture, pose, aspect, horizontalFov) {
  const forward = rotate(pose.quaternion, [0, 0, -1]);
  const cameraRight = rotate(pose.quaternion, [1, 0, 0]);
  const cameraUp = rotate(pose.quaternion, [0, 1, 0]);
  const offset = subtract(aperture.centre, pose.position);
  const depthWU = dot(offset, forward);
  const tanHalfFov = Math.tan(horizontalFov * Math.PI / 360);
  const denominator = dot(forward, aperture.normal);
  const rayLength = Math.abs(denominator) > 0.000001
    ? dot(offset, aperture.normal) / denominator
    : Infinity;
  const aimOffset = subtract(
    pose.position.map((value, index) => value + forward[index] * rayLength),
    aperture.centre,
  );
  return {
    depthWU,
    centreNDC: [
      dot(offset, cameraRight) / depthWU / tanHalfFov,
      dot(offset, cameraUp) / depthWU / tanHalfFov * aspect,
    ],
    aimClearanceWU: rayLength > 0
      ? aperture.innerRadius - Math.hypot(
        dot(aimOffset, aperture.right),
        dot(aimOffset, aperture.up),
      )
      : -Infinity,
  };
}

export function assertCameraRoundTunnelPassage(measurement, minimumCount = 8) {
  assert.ok(measurement.apertures.length >= minimumCount,
    `The round tunnel needs at least ${minimumCount} certified apertures.`);
  let previousDistance = -Infinity;
  for (const aperture of measurement.apertures) {
    for (const intersections of aperture.intersections) {
      assert.equal(intersections.length, 1,
        `Round aperture ${aperture.id}: camera must pass through each face once.`);
      assert.ok(
        intersections[0].clearanceWU >= aperture.aperture.innerRadius * 0.75,
        `Round aperture ${aperture.id}: camera clips the tunnel rim.`,
      );
    }
    assert.ok(aperture.crossing.distanceWU > previousDistance,
      'The camera must traverse round apertures in source order.');
    previousDistance = aperture.crossing.distanceWU;
    for (const approach of aperture.approaches) {
      assert.ok(
        approach.depthWU > 0 && approach.centreNDC.every((value) => Math.abs(value) < 0.95),
        `Round aperture ${aperture.id}: opening leaves the view ${approach.leadWU} WU before passage.`,
      );
      if (approach.leadWU <= 8) {
        assert.ok(approach.aimClearanceWU > aperture.aperture.innerRadius * 0.2,
          `Round aperture ${aperture.id}: camera looks past its opening on close approach.`);
      }
    }
  }
  assert.ok(measurement.maximumStationaryAngularStepDegrees < 0.001,
    'The camera rotates without advancing along its round-tunnel rail.');
  assert.ok(measurement.maximumAngularDegreesPerWU < 3.5,
    `Round-tunnel orientation spikes to ${measurement.maximumAngularDegreesPerWU.toFixed(3)} degrees/WU.`);
}
