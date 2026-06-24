#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import {
  basename,
  dirname,
  extname,
  join,
  resolve,
} from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_INPUT = resolve(ROOT_DIR, 'source-assets/napoleon-bust');
const DEFAULT_OUTPUT = resolve(ROOT_DIR, 'react-app/app/public/models/napoleon-bust');
const DEFAULT_COUNTS = Object.freeze({ low: 5000, medium: 12000, high: 24000 });
const MODEL_EXTENSIONS = new Set(['.glb', '.gltf', '.obj']);
const SOURCE_ATTRIBUTION = Object.freeze({
  title: 'The bust of Napoleon Bonaparte',
  creator: 'Virtual Museums of Małopolska',
  institution: 'National Museum in Kraków',
  license: 'Creative Commons Attribution 4.0 International',
  licenseShort: 'CC BY 4.0',
  sketchfabUrl: 'https://sketchfab.com/3d-models/the-bust-of-napoleon-bonaparte-a177bf0e121641bea6cf1d58ad3efc5b',
  sourceObjectUrl: 'https://muzea.malopolska.pl/en/objects-list/1869',
  inventoryNumber: 'MNK XII-A-810',
});

function parseArgs(argv) {
  const args = {
    input: DEFAULT_INPUT,
    output: DEFAULT_OUTPUT,
    seed: 1776,
    counts: { ...DEFAULT_COUNTS },
    fallback: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--input' && next) {
      args.input = resolve(process.cwd(), next);
      i += 1;
    } else if (arg === '--output' && next) {
      args.output = resolve(process.cwd(), next);
      i += 1;
    } else if (arg === '--seed' && next) {
      args.seed = Number.parseInt(next, 10);
      i += 1;
    } else if (arg === '--low' && next) {
      args.counts.low = Number.parseInt(next, 10);
      i += 1;
    } else if (arg === '--medium' && next) {
      args.counts.medium = Number.parseInt(next, 10);
      i += 1;
    } else if (arg === '--high' && next) {
      args.counts.high = Number.parseInt(next, 10);
      i += 1;
    } else if (arg === '--fallback') {
      args.fallback = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  for (const [quality, count] of Object.entries(args.counts)) {
    if (!Number.isInteger(count) || count <= 0) {
      throw new Error(`Invalid ${quality} count: ${count}`);
    }
  }

  if (!Number.isInteger(args.seed)) args.seed = 1776;
  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/process-napoleon-bust.mjs [--input <file-or-dir-or-zip>] [--output <dir>]

Options:
  --input <path>    Sketchfab/Fab downloaded .zip, extracted folder, .glb, .gltf, or .obj.
                   Default: source-assets/napoleon-bust
  --output <dir>   Output public point-cloud asset directory.
                   Default: react-app/app/public/models/napoleon-bust
  --low <count>    Low LOD point count. Default: 5000
  --medium <count> Medium LOD point count. Default: 12000
  --high <count>   High LOD point count. Default: 24000
  --seed <int>     Deterministic sampling seed. Default: 1776
  --fallback       Generate a procedural preview bust if the source mesh is unavailable.
`);
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scale(v, amount) {
  return [v[0] * amount, v[1] * amount, v[2] * amount];
}

function cross(a, b) {
  return [
    (a[1] * b[2]) - (a[2] * b[1]),
    (a[2] * b[0]) - (a[0] * b[2]),
    (a[0] * b[1]) - (a[1] * b[0]),
  ];
}

function dot(a, b) {
  return (a[0] * b[0]) + (a[1] * b[1]) + (a[2] * b[2]);
}

function length(v) {
  return Math.hypot(v[0], v[1], v[2]);
}

function normalize(v) {
  const len = length(v);
  if (len <= 1e-8) return [0, 1, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

function triangleArea(v0, v1, v2) {
  return length(cross(sub(v1, v0), sub(v2, v0))) * 0.5;
}

function faceNormal(v0, v1, v2) {
  return normalize(cross(sub(v1, v0), sub(v2, v0)));
}

function makeTriangle(v0, v1, v2, n0 = null, n1 = null, n2 = null) {
  const fallbackNormal = faceNormal(v0, v1, v2);
  return {
    v0,
    v1,
    v2,
    n0: n0 ? normalize(n0) : fallbackNormal,
    n1: n1 ? normalize(n1) : fallbackNormal,
    n2: n2 ? normalize(n2) : fallbackNormal,
    area: triangleArea(v0, v1, v2),
  };
}

async function pathKind(path) {
  try {
    const info = await stat(path);
    if (info.isDirectory()) return 'directory';
    if (info.isFile()) return 'file';
  } catch {
    return null;
  }
  return null;
}

async function findModelFile(searchRoot) {
  const matches = [];

  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && MODEL_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
        matches.push(fullPath);
      }
    }
  }

  await walk(searchRoot);
  matches.sort((a, b) => {
    const rank = (file) => ['.glb', '.gltf', '.obj'].indexOf(extname(file).toLowerCase());
    return rank(a) - rank(b);
  });
  return matches[0] || null;
}

async function extractZip(zipPath) {
  const tempDir = await mkdtemp(join(tmpdir(), 'abs-napoleon-'));
  const unzip = spawnSync('unzip', ['-q', zipPath, '-d', tempDir], { stdio: 'pipe' });
  if (unzip.status !== 0) {
    await rm(tempDir, { recursive: true, force: true });
    const message = unzip.stderr?.toString('utf8') || unzip.stdout?.toString('utf8') || 'unzip failed';
    throw new Error(`Could not extract ${basename(zipPath)}: ${message.trim()}`);
  }
  return tempDir;
}

async function resolveSourceModel(inputPath) {
  const kind = await pathKind(inputPath);
  if (!kind) return { modelPath: null, cleanupDir: null };

  if (kind === 'directory') {
    return { modelPath: await findModelFile(inputPath), cleanupDir: null };
  }

  const extension = extname(inputPath).toLowerCase();
  if (MODEL_EXTENSIONS.has(extension)) {
    return { modelPath: inputPath, cleanupDir: null };
  }

  if (extension === '.zip') {
    const cleanupDir = await extractZip(inputPath);
    return { modelPath: await findModelFile(cleanupDir), cleanupDir };
  }

  return { modelPath: null, cleanupDir: null };
}

function identityMatrix() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function multiplyMatrices(a, b) {
  const out = new Array(16).fill(0);
  for (let col = 0; col < 4; col += 1) {
    for (let row = 0; row < 4; row += 1) {
      out[(col * 4) + row] =
        (a[row] * b[col * 4])
        + (a[4 + row] * b[(col * 4) + 1])
        + (a[8 + row] * b[(col * 4) + 2])
        + (a[12 + row] * b[(col * 4) + 3]);
    }
  }
  return out;
}

function matrixFromTrs(translation = [0, 0, 0], rotation = [0, 0, 0, 1], scaleVec = [1, 1, 1]) {
  const [x, y, z, w] = rotation;
  const x2 = x + x;
  const y2 = y + y;
  const z2 = z + z;
  const xx = x * x2;
  const xy = x * y2;
  const xz = x * z2;
  const yy = y * y2;
  const yz = y * z2;
  const zz = z * z2;
  const wx = w * x2;
  const wy = w * y2;
  const wz = w * z2;
  const [sx, sy, sz] = scaleVec;

  return [
    (1 - (yy + zz)) * sx,
    (xy + wz) * sx,
    (xz - wy) * sx,
    0,
    (xy - wz) * sy,
    (1 - (xx + zz)) * sy,
    (yz + wx) * sy,
    0,
    (xz + wy) * sz,
    (yz - wx) * sz,
    (1 - (xx + yy)) * sz,
    0,
    translation[0],
    translation[1],
    translation[2],
    1,
  ];
}

function getNodeMatrix(node) {
  if (Array.isArray(node.matrix) && node.matrix.length === 16) return node.matrix.slice();
  return matrixFromTrs(node.translation, node.rotation, node.scale);
}

function transformPoint(matrix, point) {
  const [x, y, z] = point;
  return [
    (matrix[0] * x) + (matrix[4] * y) + (matrix[8] * z) + matrix[12],
    (matrix[1] * x) + (matrix[5] * y) + (matrix[9] * z) + matrix[13],
    (matrix[2] * x) + (matrix[6] * y) + (matrix[10] * z) + matrix[14],
  ];
}

function transformNormal(matrix, normal) {
  const [x, y, z] = normal;
  return normalize([
    (matrix[0] * x) + (matrix[4] * y) + (matrix[8] * z),
    (matrix[1] * x) + (matrix[5] * y) + (matrix[9] * z),
    (matrix[2] * x) + (matrix[6] * y) + (matrix[10] * z),
  ]);
}

function parseGlb(buffer) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  if (view.getUint32(0, true) !== 0x46546c67) throw new Error('Invalid GLB magic');
  const version = view.getUint32(4, true);
  if (version !== 2) throw new Error(`Unsupported GLB version ${version}`);
  const lengthBytes = view.getUint32(8, true);
  let offset = 12;
  let json = null;
  let binary = null;

  while (offset < lengthBytes) {
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    const chunk = buffer.subarray(offset + 8, offset + 8 + chunkLength);
    if (chunkType === 0x4e4f534a) {
      json = JSON.parse(Buffer.from(chunk).toString('utf8'));
    } else if (chunkType === 0x004e4942) {
      binary = chunk;
    }
    offset += 8 + chunkLength;
  }

  if (!json) throw new Error('GLB is missing its JSON chunk');
  return { json, buffers: binary ? [binary] : [] };
}

async function readGltfBuffer(uri, baseDir) {
  if (!uri) throw new Error('External glTF buffer URI is missing');
  if (uri.startsWith('data:')) {
    const base64 = uri.slice(uri.indexOf(',') + 1);
    return Buffer.from(base64, 'base64');
  }
  return readFile(resolve(baseDir, decodeURIComponent(uri)));
}

async function loadGltf(modelPath) {
  const extension = extname(modelPath).toLowerCase();
  if (extension === '.glb') {
    return parseGlb(await readFile(modelPath));
  }

  const json = JSON.parse(await readFile(modelPath, 'utf8'));
  const buffers = [];
  for (const bufferDef of json.buffers || []) {
    buffers.push(await readGltfBuffer(bufferDef.uri, dirname(modelPath)));
  }
  return { json, buffers };
}

function componentReader(view, componentType, byteOffset) {
  switch (componentType) {
    case 5120: return view.getInt8(byteOffset);
    case 5121: return view.getUint8(byteOffset);
    case 5122: return view.getInt16(byteOffset, true);
    case 5123: return view.getUint16(byteOffset, true);
    case 5125: return view.getUint32(byteOffset, true);
    case 5126: return view.getFloat32(byteOffset, true);
    default: throw new Error(`Unsupported glTF component type ${componentType}`);
  }
}

function componentByteSize(componentType) {
  switch (componentType) {
    case 5120:
    case 5121:
      return 1;
    case 5122:
    case 5123:
      return 2;
    case 5125:
    case 5126:
      return 4;
    default:
      throw new Error(`Unsupported glTF component type ${componentType}`);
  }
}

function typeSize(type) {
  switch (type) {
    case 'SCALAR': return 1;
    case 'VEC2': return 2;
    case 'VEC3': return 3;
    case 'VEC4': return 4;
    case 'MAT4': return 16;
    default: throw new Error(`Unsupported glTF accessor type ${type}`);
  }
}

function readAccessor(json, buffers, accessorIndex) {
  const accessor = json.accessors?.[accessorIndex];
  if (!accessor) throw new Error(`Missing glTF accessor ${accessorIndex}`);
  if (accessor.sparse) throw new Error('Sparse glTF accessors are not supported by this processor');
  const bufferView = json.bufferViews?.[accessor.bufferView];
  if (!bufferView) throw new Error(`Missing glTF bufferView ${accessor.bufferView}`);
  const buffer = buffers[bufferView.buffer || 0];
  if (!buffer) throw new Error(`Missing glTF buffer ${bufferView.buffer || 0}`);

  const itemSize = typeSize(accessor.type);
  const byteSize = componentByteSize(accessor.componentType);
  const stride = bufferView.byteStride || (byteSize * itemSize);
  const byteOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const values = new Array(accessor.count);

  for (let i = 0; i < accessor.count; i += 1) {
    const item = new Array(itemSize);
    for (let j = 0; j < itemSize; j += 1) {
      item[j] = componentReader(view, accessor.componentType, byteOffset + (i * stride) + (j * byteSize));
    }
    values[i] = itemSize === 1 ? item[0] : item;
  }

  return { values, itemSize, componentType: accessor.componentType };
}

async function parseGltfTriangles(modelPath) {
  const { json, buffers } = await loadGltf(modelPath);
  const triangles = [];
  const scene = json.scenes?.[json.scene || 0] || json.scenes?.[0];
  const rootNodes = scene?.nodes || json.nodes?.map((_, index) => index) || [];

  function visitNode(nodeIndex, parentMatrix) {
    const node = json.nodes?.[nodeIndex];
    if (!node) return;
    const matrix = multiplyMatrices(parentMatrix, getNodeMatrix(node));

    if (Number.isInteger(node.mesh)) {
      const mesh = json.meshes?.[node.mesh];
      for (const primitive of mesh?.primitives || []) {
        if (primitive.mode !== undefined && primitive.mode !== 4) continue;
        if (primitive.extensions?.KHR_draco_mesh_compression) {
          throw new Error('This glTF uses Draco compression. Use Blender to export an uncompressed GLB/glTF first.');
        }

        const positionAccessor = primitive.attributes?.POSITION;
        if (!Number.isInteger(positionAccessor)) continue;
        const positions = readAccessor(json, buffers, positionAccessor).values;
        const normals = Number.isInteger(primitive.attributes?.NORMAL)
          ? readAccessor(json, buffers, primitive.attributes.NORMAL).values
          : null;
        const indices = Number.isInteger(primitive.indices)
          ? readAccessor(json, buffers, primitive.indices).values
          : positions.map((_, index) => index);

        for (let i = 0; i < indices.length - 2; i += 3) {
          const a = indices[i];
          const b = indices[i + 1];
          const c = indices[i + 2];
          const v0 = transformPoint(matrix, positions[a]);
          const v1 = transformPoint(matrix, positions[b]);
          const v2 = transformPoint(matrix, positions[c]);
          const n0 = normals?.[a] ? transformNormal(matrix, normals[a]) : null;
          const n1 = normals?.[b] ? transformNormal(matrix, normals[b]) : null;
          const n2 = normals?.[c] ? transformNormal(matrix, normals[c]) : null;
          const triangle = makeTriangle(v0, v1, v2, n0, n1, n2);
          if (triangle.area > 1e-10) triangles.push(triangle);
        }
      }
    }

    for (const childIndex of node.children || []) {
      visitNode(childIndex, matrix);
    }
  }

  for (const nodeIndex of rootNodes) visitNode(nodeIndex, identityMatrix());
  return triangles;
}

function parseObjIndex(token, lengthValue) {
  if (!token) return null;
  const parsed = Number.parseInt(token, 10);
  if (!Number.isInteger(parsed)) return null;
  return parsed < 0 ? lengthValue + parsed : parsed - 1;
}

async function parseObjTriangles(modelPath) {
  const raw = await readFile(modelPath, 'utf8');
  const vertices = [];
  const normals = [];
  const triangles = [];

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split(/\s+/);
    if (parts[0] === 'v') {
      vertices.push(parts.slice(1, 4).map(Number));
    } else if (parts[0] === 'vn') {
      normals.push(parts.slice(1, 4).map(Number));
    } else if (parts[0] === 'f') {
      const refs = parts.slice(1).map((part) => {
        const [v, , n] = part.split('/');
        return {
          v: parseObjIndex(v, vertices.length),
          n: parseObjIndex(n, normals.length),
        };
      }).filter((ref) => Number.isInteger(ref.v) && vertices[ref.v]);

      for (let i = 1; i < refs.length - 1; i += 1) {
        const a = refs[0];
        const b = refs[i];
        const c = refs[i + 1];
        const triangle = makeTriangle(
          vertices[a.v],
          vertices[b.v],
          vertices[c.v],
          normals[a.n] || null,
          normals[b.n] || null,
          normals[c.n] || null,
        );
        if (triangle.area > 1e-10) triangles.push(triangle);
      }
    }
  }

  return triangles;
}

async function parseSourceTriangles(modelPath) {
  const extension = extname(modelPath).toLowerCase();
  if (extension === '.obj') return parseObjTriangles(modelPath);
  if (extension === '.glb' || extension === '.gltf') return parseGltfTriangles(modelPath);
  throw new Error(`Unsupported model extension: ${extension}`);
}

function normalizeTriangles(triangles) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];

  for (const triangle of triangles) {
    for (const vertex of [triangle.v0, triangle.v1, triangle.v2]) {
      for (let axis = 0; axis < 3; axis += 1) {
        min[axis] = Math.min(min[axis], vertex[axis]);
        max[axis] = Math.max(max[axis], vertex[axis]);
      }
    }
  }

  const center = [
    (min[0] + max[0]) * 0.5,
    (min[1] + max[1]) * 0.5,
    (min[2] + max[2]) * 0.5,
  ];
  const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const largest = Math.max(size[0], size[1], size[2], 1);
  const scaleFactor = 1.72 / largest;

  return triangles.map((triangle) => makeTriangle(
    scale(sub(triangle.v0, center), scaleFactor),
    scale(sub(triangle.v1, center), scaleFactor),
    scale(sub(triangle.v2, center), scaleFactor),
    triangle.n0,
    triangle.n1,
    triangle.n2,
  )).filter((triangle) => triangle.area > 1e-10);
}

function sampleEllipsoid(random, center, radius) {
  const u = random();
  const v = random();
  const theta = Math.PI * 2 * u;
  const phi = Math.acos((2 * v) - 1);
  const sinPhi = Math.sin(phi);
  const normal = [
    Math.cos(theta) * sinPhi,
    Math.cos(phi),
    Math.sin(theta) * sinPhi,
  ];
  const position = [
    center[0] + (normal[0] * radius[0]),
    center[1] + (normal[1] * radius[1]),
    center[2] + (normal[2] * radius[2]),
  ];
  return { position, normal: normalize([normal[0] / radius[0], normal[1] / radius[1], normal[2] / radius[2]]) };
}

function sampleFallbackBust(count, seed) {
  const random = mulberry32(seed);
  const floats = new Float32Array(count * 8);
  const lobes = [
    { weight: 42, center: [0, 0.37, 0], radius: [0.36, 0.52, 0.31] },
    { weight: 9, center: [0, -0.11, 0.02], radius: [0.2, 0.25, 0.16] },
    { weight: 31, center: [0, -0.55, -0.02], radius: [0.74, 0.28, 0.34] },
    { weight: 7, center: [0.02, 0.45, 0.31], radius: [0.09, 0.18, 0.08] },
    { weight: 11, center: [-0.03, 0.79, 0.01], radius: [0.32, 0.16, 0.29] },
  ];
  const total = lobes.reduce((sum, lobe) => sum + lobe.weight, 0);

  for (let i = 0; i < count; i += 1) {
    let pick = random() * total;
    let lobe = lobes[0];
    for (const candidate of lobes) {
      pick -= candidate.weight;
      if (pick <= 0) {
        lobe = candidate;
        break;
      }
    }

    let { position, normal } = sampleEllipsoid(random, lobe.center, lobe.radius);
    if (lobe === lobes[0]) {
      position[0] += 0.04;
      position[2] += Math.max(0, 0.08 - Math.abs(position[0]) * 0.1);
    }
    if (lobe === lobes[4]) {
      const curl = Math.sin((position[0] * 19) + (position[2] * 13)) * 0.035;
      position = add(position, scale(normal, curl));
    }
    const seedValue = random();
    const group = pickColorGroup(position, normal, seedValue);
    const offset = i * 8;
    floats[offset] = position[0];
    floats[offset + 1] = position[1];
    floats[offset + 2] = position[2];
    floats[offset + 3] = normal[0];
    floats[offset + 4] = normal[1];
    floats[offset + 5] = normal[2];
    floats[offset + 6] = seedValue;
    floats[offset + 7] = group;
  }

  return floats;
}

function pickColorGroup(position, normal, seedValue) {
  const baseWeights = [44, 14, 17, 11, 7, 7];
  const weights = baseWeights.slice();
  if (position[1] > 0.34) {
    weights[0] += 9;
    weights[2] += 7;
  }
  if (position[1] < -0.38) {
    weights[0] += 15;
    weights[1] += 4;
  }
  if (Math.abs(position[0]) > 0.42) {
    weights[0] += 9;
  }
  if (normal[2] > 0.5 && seedValue > 0.82) {
    weights[3] += 8;
  }
  if (seedValue > 0.94) {
    weights[4] += 5;
    weights[5] += 5;
  }

  let total = 0;
  for (const weight of weights) total += weight;
  let sample = ((seedValue * 997.3) % 1) * total;
  for (let i = 0; i < weights.length; i += 1) {
    sample -= weights[i];
    if (sample <= 0) return i;
  }
  return 0;
}

function sampleTriangles(triangles, count, seed) {
  const random = mulberry32(seed);
  const cdf = new Float64Array(triangles.length);
  let totalArea = 0;
  for (let i = 0; i < triangles.length; i += 1) {
    totalArea += triangles[i].area;
    cdf[i] = totalArea;
  }
  if (totalArea <= 0) throw new Error('Source mesh has no sampleable triangle area');

  const floats = new Float32Array(count * 8);
  for (let i = 0; i < count; i += 1) {
    const areaPick = random() * totalArea;
    let low = 0;
    let high = cdf.length - 1;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (cdf[mid] < areaPick) low = mid + 1;
      else high = mid;
    }
    const triangle = triangles[low];
    const r1 = Math.sqrt(random());
    const r2 = random();
    const a = 1 - r1;
    const b = r1 * (1 - r2);
    const c = r1 * r2;
    const position = add(add(scale(triangle.v0, a), scale(triangle.v1, b)), scale(triangle.v2, c));
    const normal = normalize(add(add(scale(triangle.n0, a), scale(triangle.n1, b)), scale(triangle.n2, c)));
    const seedValue = random();
    const group = pickColorGroup(position, normal, seedValue);
    const offset = i * 8;
    floats[offset] = position[0];
    floats[offset + 1] = position[1];
    floats[offset + 2] = position[2];
    floats[offset + 3] = normal[0];
    floats[offset + 4] = normal[1];
    floats[offset + 5] = normal[2];
    floats[offset + 6] = seedValue;
    floats[offset + 7] = group;
  }

  return floats;
}

async function writePointCloud(outputDir, quality, floats) {
  const file = `napoleon-points-${quality}.bin`;
  await writeFile(join(outputDir, file), Buffer.from(floats.buffer));
  return {
    file,
    count: floats.length / 8,
    bytes: floats.byteLength,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let cleanupDir = null;
  let sourceStatus = 'mesh-sampled';
  let sourceFile = null;
  let triangles = null;

  try {
    if (!args.fallback) {
      const resolvedSource = await resolveSourceModel(args.input);
      cleanupDir = resolvedSource.cleanupDir;
      sourceFile = resolvedSource.modelPath;
    }

    if (sourceFile) {
      triangles = normalizeTriangles(await parseSourceTriangles(sourceFile));
      if (!triangles.length) throw new Error(`No sampleable triangles found in ${sourceFile}`);
    } else {
      sourceStatus = 'procedural-fallback';
      console.warn(`No supported source mesh found at ${args.input}. Generating procedural fallback preview assets.`);
    }

    await mkdir(args.output, { recursive: true });
    const lods = {};
    for (const [quality, count] of Object.entries(args.counts)) {
      const floats = triangles
        ? sampleTriangles(triangles, count, args.seed + count)
        : sampleFallbackBust(count, args.seed + count);
      lods[quality] = await writePointCloud(args.output, quality, floats);
    }

    const meta = {
      version: 1,
      generatedAt: new Date().toISOString(),
      generator: 'scripts/process-napoleon-bust.mjs',
      source: {
        ...SOURCE_ATTRIBUTION,
        status: sourceStatus,
        sourceFile: sourceFile ? basename(sourceFile) : null,
        transformation: sourceStatus === 'mesh-sampled'
          ? 'Original mesh normalized, material data ignored, and surface area sampled into flat coloured point data for beck.fyi.'
          : 'Procedural preview data. Replace by rerunning this script with the licensed Sketchfab/Fab model download before production use.',
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

    await writeFile(join(args.output, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
    console.log(`Wrote Napoleon point-cloud assets to ${args.output}`);
    console.log(`Source status: ${sourceStatus}`);
  } finally {
    if (cleanupDir && existsSync(cleanupDir)) {
      await rm(cleanupDir, { recursive: true, force: true });
    }
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});
