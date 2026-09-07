import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import * as THREE from '../react-app/app/node_modules/three/build/three.module.js';
import { createAboutFinaleFraming } from '../react-app/app/src/routes/about-narrative-lab/aboutFinaleFraming.js';
import { resolveResponsiveVerticalFovFromHorizontalFov } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeCameraProjection.js';

const ASSETS = new URL('../react-app/app/public/models/about-v2-edited-world/', import.meta.url);
const [metadata, track, binary] = await Promise.all([
  readFile(new URL('meta.json', ASSETS), 'utf8').then(JSON.parse),
  readFile(new URL('camera-track.json', ASSETS), 'utf8').then(JSON.parse),
  readFile(new URL('surfels.bin', ASSETS)),
]);

function decodeFinale(profile) {
  const positions = [];
  const modelRanges = metadata.models.map((model) => {
    const start = positions.length / 3;
    const count = ['about.05', 'about.06'].includes(model.key) ? model.profileCounts[profile] : 0;
    for (let index = 0; index < count; index += 1) {
      const offset = (model.surfelRange.offset + index) * 32;
      positions.push(binary.readFloatLE(offset), binary.readFloatLE(offset + 4), binary.readFloatLE(offset + 8));
    }
    return { start, count };
  });
  return { positions: new Float32Array(positions), modelRanges };
}

function terminalCamera(width, height, sourceTrack = track) {
  const fov = resolveResponsiveVerticalFovFromHorizontalFov(
    sourceTrack.projection?.horizontalFov || 85, width / height,
    sourceTrack.projection?.portraitMaxVerticalFov || 115,
  );
  const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 20000);
  camera.position.fromArray(sourceTrack.samples.at(-1));
  camera.quaternion.fromArray(sourceTrack.samples.at(-1), 3).normalize();
  camera.updateMatrixWorld(true);
  return camera;
}

function projectedEnvelope(camera, decoded, meta, turnScale, canvas) {
  const bounds = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
  const point = new THREE.Vector3();
  const pivot = new THREE.Vector3();
  const axis = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  for (let modelIndex = 0; modelIndex < meta.models.length; modelIndex += 1) {
    const model = meta.models[modelIndex];
    const range = decoded.modelRanges[modelIndex];
    if (!range?.count) continue;
    const motion = meta.motionGroups.find((group) => group.key === model.motionKey)?.motion;
    // Verification uses every point and 33 phases, independently of fit sampling.
    const steps = motion?.behavior === 'bounded-rotation' ? 32 : 0;
    for (let step = 0; step <= steps; step += 1) {
      if (steps) {
        pivot.fromArray(motion.pivotWU); axis.fromArray(motion.axis).normalize();
        rotation.setFromAxisAngle(axis, (step / steps * 2 - 1) * motion.amplitudeRadians * turnScale);
      }
      for (let index = range.start; index < range.start + range.count; index += 1) {
        point.fromArray(decoded.positions, index * 3);
        if (steps) point.sub(pivot).applyQuaternion(rotation).add(pivot);
        point.project(camera);
        const x = canvas.left + (point.x + 1) * canvas.width * 0.5;
        const y = canvas.top + (1 - point.y) * canvas.height * 0.5;
        bounds.left = Math.min(bounds.left, x); bounds.right = Math.max(bounds.right, x);
        bounds.top = Math.min(bounds.top, y); bounds.bottom = Math.max(bounds.bottom, y);
      }
    }
  }
  return bounds;
}

function assertFits(bounds, slot) {
  const width = slot.right - slot.left;
  const height = slot.bottom - slot.top;
  assert(bounds.left >= slot.left && bounds.right <= slot.right, 'The full turning silhouette stays inside the image slot horizontally.');
  assert(bounds.top >= slot.top && bounds.bottom <= slot.bottom, 'The bust and grounded platform stay above the protected copy.');
  const coverage = Math.max((bounds.right - bounds.left) / width, (bounds.bottom - bounds.top) / height);
  assert(coverage >= 0.89 && coverage <= 0.93, `Fit should fill the limiting dimension near 90%, received ${coverage}.`);
  assert(Math.abs((bounds.left + bounds.right - slot.left - slot.right) * 0.5) < width * 0.015);
  assert(Math.abs((bounds.top + bounds.bottom - slot.top - slot.bottom) * 0.5) < height * 0.015);
}

test('a rotated grounded sculpture fills the image slot without using empty AABB corners or capping zoom', () => {
  const points = [];
  for (let angle = 0; angle < 360; angle += 1) {
    const radians = angle * Math.PI / 180;
    for (const y of [-0.15, 0]) points.push(Math.cos(radians) * 2, y, Math.sin(radians) * 2);
  }
  const baseCount = points.length / 3;
  for (let y = 0; y <= 3; y += 0.05) {
    const radius = y < 1 ? 0.85 : 0.45;
    for (let angle = 0; angle < 360; angle += 6) {
      const radians = angle * Math.PI / 180;
      points.push(Math.cos(radians) * radius, y, Math.sin(radians) * radius * 0.65);
    }
  }
  const meta = {
    models: [{ key: 'about.05' }, { key: 'about.06', motionKey: 'bust' }],
    motionGroups: [{ key: 'bust', motion: { behavior: 'bounded-rotation', pivotWU: [0, 0, 0], axis: [0, 1, 0], amplitudeRadians: Math.PI / 22.5 } }],
    source: { objects: [{ objectKey: 'director.finale-platform', bounds: { min: [-200, -100, -200], max: [200, 100, 200] } }] },
  };
  const decoded = { positions: new Float32Array(points), modelRanges: [{ start: 0, count: baseCount }, { start: baseCount, count: points.length / 3 - baseCount }] };
  const canvas = { left: 10, top: 20, width: 1440, height: 1000 };
  const slot = { left: 370, right: 1090, top: 45, bottom: 505, height: 460 };
  const camera = new THREE.PerspectiveCamera(65, 1.44, 0.1, 1000);
  camera.position.set(30, 10, 25); camera.lookAt(0, 1.4, 0); camera.updateMatrixWorld(true);
  const sourceTrack = { samples: [[...camera.position.toArray(), ...camera.quaternion.toArray()]] };
  const framing = createAboutFinaleFraming();
  framing.configure(camera, sourceTrack, meta, canvas, slot, decoded);
  const originalPosition = camera.position.clone();
  framing.apply(camera, 1, 6);
  assert(framing.snapshot().scale > 1.5, 'No arbitrary zoom cap may keep the sculpture tiny.');
  assertFits(projectedEnvelope(camera, decoded, meta, 6, canvas), slot);
  assert.deepEqual(camera.position, originalPosition, 'Only projection changes; the authored camera path stays intact.');
});

for (const [profile, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
  test(`${profile} source sculpture fits at default and maximum bounded turn without repeated measurement`, () => {
    const decoded = decodeFinale(profile);
    const canvas = { left: 24, top: 12, width, height };
    const slotWidth = Math.min(width * 0.9, 768);
    const slot = {
      left: canvas.left + (width - slotWidth) / 2,
      right: canvas.left + (width + slotWidth) / 2,
      top: canvas.top + 18,
      bottom: canvas.top + height * 0.53,
      height: height * 0.53 - 18,
    };
    const camera = terminalCamera(width, height);
    const originalProjection = camera.projectionMatrix.clone();
    const framing = createAboutFinaleFraming();
    framing.configure(camera, track, metadata, canvas, slot, decoded);
    for (const turnScale of [1, 6, 0]) {
      framing.apply(camera, 1, turnScale);
      assertFits(projectedEnvelope(camera, decoded, metadata, turnScale, canvas), slot);
      const revision = framing.snapshot().fitRevision;
      for (let index = 0; index < 120; index += 1) framing.apply(camera, index / 120, turnScale);
      assert.equal(framing.snapshot().fitRevision, revision, 'Steady controls never rescan points during animation.');
    }
    framing.apply(camera, 0, 1);
    assert.deepEqual(camera.projectionMatrix.elements, originalProjection.elements, 'Reverse travel restores the authored base projection.');
  });
}
