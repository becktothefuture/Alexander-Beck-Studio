#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUTPUT_DIR = resolve(process.cwd(), 'react-app/app/public/models/spatial-scan');
const COUNTS = Object.freeze({ low: 8000, medium: 32000, high: 72000 });
const STRIDE_FLOATS = 8;

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickSurface(random) {
  const surfaces = [
    { room: [-2.15, -0.55], size: [2.8, 2.2], weight: 0.33 },
    { room: [1.15, -0.65], size: [2.4, 2.05], weight: 0.28 },
    { room: [0, 1.65], size: [1.45, 2.2], weight: 0.2 },
    { room: [-0.35, 0.4], size: [4.4, 0.85], weight: 0.19 },
  ];
  let sample = random();
  for (const surface of surfaces) {
    sample -= surface.weight;
    if (sample <= 0) return surface;
  }
  return surfaces[surfaces.length - 1];
}

function sampleRoomPoint(random) {
  const surface = pickSurface(random);
  const [cx, cz] = surface.room;
  const [sx, sz] = surface.size;
  const floorY = -0.74;
  const ceilingY = 0.74;
  const wallChoice = random();
  const xNoise = (random() - 0.5) * 0.018;
  const yNoise = (random() - 0.5) * 0.018;
  const zNoise = (random() - 0.5) * 0.018;

  if (wallChoice < 0.24) {
    return {
      position: [cx + ((random() - 0.5) * sx), floorY + random() * (ceilingY - floorY), cz - (sz * 0.5) + zNoise],
      normal: [0, 0, -1],
    };
  }
  if (wallChoice < 0.48) {
    return {
      position: [cx + ((random() - 0.5) * sx), floorY + random() * (ceilingY - floorY), cz + (sz * 0.5) + zNoise],
      normal: [0, 0, 1],
    };
  }
  if (wallChoice < 0.66) {
    return {
      position: [cx - (sx * 0.5) + xNoise, floorY + random() * (ceilingY - floorY), cz + ((random() - 0.5) * sz)],
      normal: [-1, 0, 0],
    };
  }
  if (wallChoice < 0.84) {
    return {
      position: [cx + (sx * 0.5) + xNoise, floorY + random() * (ceilingY - floorY), cz + ((random() - 0.5) * sz)],
      normal: [1, 0, 0],
    };
  }
  if (wallChoice < 0.93) {
    return {
      position: [cx + ((random() - 0.5) * sx), floorY + yNoise, cz + ((random() - 0.5) * sz)],
      normal: [0, -1, 0],
    };
  }
  return {
    position: [cx + ((random() - 0.5) * sx), ceilingY + yNoise, cz + ((random() - 0.5) * sz)],
    normal: [0, 1, 0],
  };
}

function addScanArtifact(point, random) {
  const gap = Math.sin(point.position[0] * 4.2) * Math.cos(point.position[2] * 3.6);
  const amount = gap > 0.55 ? 0.055 : 0.012;
  point.position[0] += (random() - 0.5) * amount;
  point.position[1] += (random() - 0.5) * amount;
  point.position[2] += (random() - 0.5) * amount;
  return point;
}

function writeLod(count, seed) {
  const random = mulberry32(seed);
  const floats = new Float32Array(count * STRIDE_FLOATS);
  for (let i = 0; i < count; i += 1) {
    const point = addScanArtifact(sampleRoomPoint(random), random);
    const offset = i * STRIDE_FLOATS;
    const seedValue = random();
    floats[offset] = point.position[0];
    floats[offset + 1] = point.position[1];
    floats[offset + 2] = point.position[2];
    floats[offset + 3] = point.normal[0];
    floats[offset + 4] = point.normal[1];
    floats[offset + 5] = point.normal[2];
    floats[offset + 6] = seedValue;
    floats[offset + 7] = Math.floor((seedValue * 997 + point.position[1] * 3 + point.position[0]) % 6 + 6) % 6;
  }
  return Buffer.from(floats.buffer);
}

function buildCameraPath() {
  return {
    version: 1,
    sourceSpace: 'point-cloud-normalized',
    durationSeconds: 18,
    frames: [
      { t: 0, position: [-2.2, 0.12, -1.28], quaternion: [0, -0.24, 0, 0.971], fov: 52 },
      { t: 0.18, position: [-1.25, 0.1, -0.45], quaternion: [0, -0.08, 0, 0.997], fov: 50 },
      { t: 0.38, position: [-0.25, 0.12, 0.25], quaternion: [0, 0.18, 0, 0.984], fov: 49 },
      { t: 0.58, position: [0.65, 0.1, 0.92], quaternion: [0, 0.46, 0, 0.888], fov: 50 },
      { t: 0.78, position: [1.3, 0.12, 0.18], quaternion: [0, 0.72, 0, 0.694], fov: 52 },
      { t: 1, position: [1.62, 0.12, -1.12], quaternion: [0, 0.91, 0, 0.414], fov: 52 },
    ],
  };
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const lods = {};
  for (const [quality, count] of Object.entries(COUNTS)) {
    const file = `spatial-scan-points-${quality}.bin`;
    const buffer = writeLod(count, 1901 + count);
    await writeFile(resolve(OUTPUT_DIR, file), buffer);
    lods[quality] = {
      file,
      count,
      bytes: buffer.byteLength,
    };
  }

  const meta = {
    version: 1,
    generatedAt: new Date().toISOString(),
    generator: 'scripts/spatial-scan/generate-spatial-scan-placeholder.mjs',
    asset: {
      name: 'Spatial Scan Placeholder',
      slug: 'spatial-scan',
    },
    source: {
      status: 'procedural-placeholder',
      title: 'Procedural apartment scan placeholder',
      creator: 'Alexander Beck Studio Website tooling',
      license: 'Internal placeholder',
      attribution: 'Procedural spatial scan placeholder. Replace with a cleaned original apartment scan before production review.',
      transformation: 'Procedural multi-room surface points generated in the runtime binary point-cloud contract.',
    },
    layout: {
      format: 'float32-little-endian',
      strideBytes: 32,
      attributes: [
        { name: 'position', offsetFloats: 0, components: 3 },
        { name: 'normal', offsetFloats: 3, components: 3, usage: 'displacement and interaction only' },
        { name: 'seed', offsetFloats: 6, components: 1 },
        { name: 'colorGroup', offsetFloats: 7, components: 1 },
      ],
    },
    lods,
  };

  await writeFile(resolve(OUTPUT_DIR, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
  await writeFile(resolve(OUTPUT_DIR, 'camera-path.json'), `${JSON.stringify(buildCameraPath(), null, 2)}\n`, 'utf8');
  console.log(`Wrote spatial scan placeholder assets to ${OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});
