#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const DEFAULT_OUTPUT = 'react-app/app/public/models/spatial-scan';
const DEFAULT_CONVERTER = '~/.codex/skills/model-to-point-cloud/scripts/convert-model-to-point-cloud.mjs';

function printHelp() {
  console.log(`Usage:
  node scripts/spatial-scan/build-spatial-scan-assets.mjs --input <clean.glb> --camera <camera-path-source.json> [options]

Options:
  --input <path>       Clean .glb/.gltf/.obj scan export from Blender.
  --camera <path>      Camera path JSON from export-blender-spatial-scan.py.
  --output <dir>       Runtime asset directory. Default: ${DEFAULT_OUTPUT}
  --name <slug>        Output slug. Default: spatial-scan
  --low <count>        Low LOD count. Default: 8000
  --medium <count>     Medium LOD count. Default: 32000
  --high <count>       High LOD count. Default: 72000
  --scale <number>     Largest normalized axis size. Default: 7.2
  --title <text>       Source title for meta.json.
  --creator <text>     Creator attribution for meta.json.
  --license <text>     License text for meta.json.
  --source-url <url>   Optional source URL for meta.json.
  --notes <text>       Extra source notes for meta.json.
  --converter <path>   Converter script. Default: ${DEFAULT_CONVERTER}
`);
}

function parseArgs(argv) {
  const args = {
    input: '',
    camera: '',
    output: resolve(process.cwd(), DEFAULT_OUTPUT),
    name: 'spatial-scan',
    low: '8000',
    medium: '32000',
    high: '72000',
    scale: '7.2',
    title: 'Spatial Scan',
    creator: 'Alexander Beck',
    license: 'Original scan',
    sourceUrl: '',
    notes: 'Cleaned apartment scan exported through Blender; material data ignored for flat site-circle rendering.',
    converter: process.env.ABS_POINT_CLOUD_CONVERTER || DEFAULT_CONVERTER,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) throw new Error(`${arg} requires a value`);
    if (arg === '--input') args.input = resolve(process.cwd(), next);
    else if (arg === '--camera') args.camera = resolve(process.cwd(), next);
    else if (arg === '--output') args.output = resolve(process.cwd(), next);
    else if (arg === '--name') args.name = next;
    else if (arg === '--low') args.low = next;
    else if (arg === '--medium') args.medium = next;
    else if (arg === '--high') args.high = next;
    else if (arg === '--scale') args.scale = next;
    else if (arg === '--title') args.title = next;
    else if (arg === '--creator') args.creator = next;
    else if (arg === '--license') args.license = next;
    else if (arg === '--source-url') args.sourceUrl = next;
    else if (arg === '--notes') args.notes = next;
    else if (arg === '--converter') args.converter = next;
    else throw new Error(`Unknown argument: ${arg}`);
    i += 1;
  }

  if (!args.input) throw new Error('Missing --input');
  if (!args.camera) throw new Error('Missing --camera');
  args.converter = args.converter.replace(/^~(?=\/)/, homedir());
  args.converter = resolve(process.cwd(), args.converter);
  return args;
}

function normalizeQuaternion(values) {
  const [x, y, z, w] = values.map(Number);
  const length = Math.hypot(x, y, z, w) || 1;
  return [x / length, y / length, z / length, w / length];
}

function subtractVector(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function crossVector(a, b) {
  return [
    (a[1] * b[2]) - (a[2] * b[1]),
    (a[2] * b[0]) - (a[0] * b[2]),
    (a[0] * b[1]) - (a[1] * b[0]),
  ];
}

function normalizeVector(vector, fallback = [0, 0, 1]) {
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  if (length <= 1e-8) return fallback;
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function quaternionFromRotationBasis(xAxis, yAxis, zAxis) {
  const m11 = xAxis[0];
  const m12 = yAxis[0];
  const m13 = zAxis[0];
  const m21 = xAxis[1];
  const m22 = yAxis[1];
  const m23 = zAxis[1];
  const m31 = xAxis[2];
  const m32 = yAxis[2];
  const m33 = zAxis[2];
  const trace = m11 + m22 + m33;
  let x;
  let y;
  let z;
  let w;

  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1);
    w = 0.25 / s;
    x = (m32 - m23) * s;
    y = (m13 - m31) * s;
    z = (m21 - m12) * s;
  } else if (m11 > m22 && m11 > m33) {
    const s = 2 * Math.sqrt(1 + m11 - m22 - m33);
    w = (m32 - m23) / s;
    x = 0.25 * s;
    y = (m12 + m21) / s;
    z = (m13 + m31) / s;
  } else if (m22 > m33) {
    const s = 2 * Math.sqrt(1 + m22 - m11 - m33);
    w = (m13 - m31) / s;
    x = (m12 + m21) / s;
    y = 0.25 * s;
    z = (m23 + m32) / s;
  } else {
    const s = 2 * Math.sqrt(1 + m33 - m11 - m22);
    w = (m21 - m12) / s;
    x = (m13 + m31) / s;
    y = (m23 + m32) / s;
    z = 0.25 * s;
  }

  return normalizeQuaternion([x, y, z, w]);
}

function quaternionLookingAt(position, target) {
  const worldUp = [0, 1, 0];
  const zAxis = normalizeVector(subtractVector(position, target), [0, 0, 1]);
  let xAxis = crossVector(worldUp, zAxis);
  if (Math.hypot(xAxis[0], xAxis[1], xAxis[2]) <= 1e-8) {
    xAxis = crossVector([1, 0, 0], zAxis);
  }
  xAxis = normalizeVector(xAxis, [1, 0, 0]);
  const yAxis = normalizeVector(crossVector(zAxis, xAxis), worldUp);
  return quaternionFromRotationBasis(xAxis, yAxis, zAxis);
}

function chooseSpatialColorGroup(x, y, z, nx, ny, nz, seed) {
  const accentGate = (Math.sin((seed * 9187.73) + (x * 2.1) + (z * 1.7)) + 1) * 0.5;
  if (Math.abs(ny) > 0.68) return ny > 0 ? 0 : 2;
  if (accentGate > 0.95) return z > 0 ? 3 : 4;
  if (accentGate > 0.9) return 5;
  if (Math.abs(nx) > Math.abs(nz)) return x > 0 ? 1 : 0;
  if (z > 1.2) return 2;
  if (z < -1.2) return 0;
  return y > 0 ? 2 : 0;
}

async function remapSpatialColorGroups(outputDir, lods) {
  for (const lod of Object.values(lods || {})) {
    if (!lod?.file) continue;
    const filePath = resolve(outputDir, lod.file);
    const buffer = await readFile(filePath);
    const floats = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / Float32Array.BYTES_PER_ELEMENT);
    for (let offset = 0; offset < floats.length; offset += 8) {
      floats[offset + 7] = chooseSpatialColorGroup(
        floats[offset],
        floats[offset + 1],
        floats[offset + 2],
        floats[offset + 3],
        floats[offset + 4],
        floats[offset + 5],
        floats[offset + 6],
      );
    }
    await writeFile(filePath, Buffer.from(floats.buffer, floats.byteOffset, floats.byteLength));
  }
}

function normalizeCameraPath(sourcePath, normalization) {
  const frames = Array.isArray(sourcePath.frames) ? sourcePath.frames : [];
  const center = normalization?.sourceBounds?.center;
  const scaleFactor = Number(normalization?.scaleFactor);
  if (!Array.isArray(center) || center.length < 3 || !Number.isFinite(scaleFactor)) {
    throw new Error('meta.json is missing normalization.sourceBounds.center or normalization.scaleFactor');
  }

  const normalizedFrames = frames.map((frame, index) => {
    const position = Array.isArray(frame.position) ? frame.position : [0, 0, 0];
    return {
      t: Number.isFinite(Number(frame.t)) ? Number(frame.t) : index / Math.max(1, frames.length - 1),
      position: [
        (Number(position[0]) - Number(center[0])) * scaleFactor,
        (Number(position[1]) - Number(center[1])) * scaleFactor,
        (Number(position[2]) - Number(center[2])) * scaleFactor,
      ],
      quaternion: Array.isArray(frame.quaternion) ? normalizeQuaternion(frame.quaternion) : [0, 0, 0, 1],
      fov: Number.isFinite(Number(frame.fov)) ? Number(frame.fov) : 48,
    };
  });

  for (let index = 0; index < normalizedFrames.length; index += 1) {
    const current = normalizedFrames[index];
    const previous = normalizedFrames[index - 1];
    const next = normalizedFrames[index + 1];
    const target = next?.position || (
      previous?.position
        ? [
          current.position[0] + (current.position[0] - previous.position[0]),
          current.position[1] + (current.position[1] - previous.position[1]),
          current.position[2] + (current.position[2] - previous.position[2]),
        ]
        : null
    );
    if (target) current.quaternion = quaternionLookingAt(current.position, target);
  }

  return {
    version: 1,
    sourceSpace: 'point-cloud-normalized',
    durationSeconds: Number(sourcePath.durationSeconds) > 0 ? Number(sourcePath.durationSeconds) : 18,
    frames: normalizedFrames,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(args.converter)) throw new Error(`Point-cloud converter not found: ${args.converter}`);
  if (!existsSync(args.input)) throw new Error(`Input mesh not found: ${args.input}`);
  if (!existsSync(args.camera)) throw new Error(`Camera path not found: ${args.camera}`);

  const converterArgs = [
    args.converter,
    '--input', args.input,
    '--output', args.output,
    '--name', args.name,
    '--low', args.low,
    '--medium', args.medium,
    '--high', args.high,
    '--scale', args.scale,
    '--title', args.title,
    '--creator', args.creator,
    '--license', args.license,
    '--notes', args.notes,
  ];
  if (args.sourceUrl) converterArgs.push('--source-url', args.sourceUrl);

  const result = spawnSync(process.execPath, converterArgs, {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
  if (result.status !== 0) {
    throw new Error(`Point-cloud conversion failed with exit code ${result.status}`);
  }

  const metaPath = resolve(args.output, 'meta.json');
  const meta = JSON.parse(await readFile(metaPath, 'utf8'));
  await remapSpatialColorGroups(args.output, meta.lods);
  meta.source.colorMapping = 'Spatial scan color groups remapped from normalized position and surface normal so room planes remain coherent in the site-circle palette.';
  meta.source.cameraPathOrientation = 'Camera quaternions are recomputed from the normalized camera path positions during the website asset build.';
  await writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');

  const sourceCameraPath = JSON.parse(await readFile(args.camera, 'utf8'));
  const normalizedCameraPath = normalizeCameraPath(sourceCameraPath, meta.normalization);
  await writeFile(resolve(args.output, 'camera-path.json'), `${JSON.stringify(normalizedCameraPath, null, 2)}\n`, 'utf8');

  console.log(`Wrote normalized camera path to ${resolve(args.output, 'camera-path.json')}`);
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});
