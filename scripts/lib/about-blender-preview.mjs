import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';
import { aboutInstanceVisibilityDiagnostics, decodeAboutInstanceVisibility } from '../../react-app/app/src/routes/about-narrative-lab/aboutBlenderInstanceVisibility.js';
import { ABOUT_BLENDER_MAX_MODELS, ABOUT_CONNECTED_WORLD_TYPE, validateAboutBlenderSceneBundle } from '../../react-app/app/src/routes/about-narrative-lab/aboutBlenderSceneContract.js';
import { resolveAboutCircleField, validateAboutCircleFieldRadii } from '../../react-app/app/src/routes/about-narrative-lab/aboutBlenderCircleField.js';

const ASSET_PREFIX = '/__about-blender-preview';
const BUNDLE_FILES = ['meta.json', 'camera-track.json', 'surfels.bin'];
const REQUIRED_MODELS = ['about.00', 'about.02', 'about.03', 'about.04', 'about.05', 'about.06'];
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const signatureOf = (file) => `${file.dev}:${file.ino}:${file.size}:${file.mtimeMs}:${file.ctimeMs}`;

export function createBlenderSourceReader({ read = readFile } = {}) {
  let cached;
  return async (path) => {
    const signature = signatureOf(await stat(path));
    if (cached?.path === path && cached.signature === signature) return cached;
    const hash = sha256(await read(path));
    if (signatureOf(await stat(path)) !== signature) {
      throw new Error('The Blender source changed while its identity was read.');
    }
    cached = Object.freeze({ path, signature, sha256: hash });
    return cached;
  };
}

export async function readAboutPreviewBundle(directory) {
  const metaSignature = signatureOf(await stat(join(directory, 'meta.json')));
  const metaBytes = await readFile(join(directory, 'meta.json'));
  const metadata = JSON.parse(metaBytes.toString('utf8'));
  const instanceDiagnostics = aboutInstanceVisibilityDiagnostics(metadata);
  if (instanceDiagnostics.length) throw new Error(instanceDiagnostics[0].message);
  const bundleFiles = metadata.files?.instanceVisibility === undefined ? BUNDLE_FILES
    : [...BUNDLE_FILES, 'instance-visibility.bin'];
  const signatures = await Promise.all(bundleFiles.map(async (file) => file === 'meta.json'
    ? metaSignature : signatureOf(await stat(join(directory, file)))));
  const buffers = Object.fromEntries(await Promise.all(bundleFiles.map(async (file) => (
    file === 'meta.json' ? [file, metaBytes] :
    [file, await readFile(join(directory, file))]
  ))));
  if (metadata.schema !== 'about-point-scene' || metadata.version !== 2
    || !metadata.source?.sha256 || metadata.source?.semanticFallbacks?.length
    || !Array.isArray(metadata.models) || metadata.layout?.strideBytes !== 32) {
    throw new Error('The export does not contain a complete compatible Blender point world.');
  }
  const connectedWorld = metadata.source.worldType === ABOUT_CONNECTED_WORLD_TYPE;
  if (metadata.source.worldType !== undefined && !connectedWorld) {
    throw new Error('The export declares an unsupported connected world type.');
  }
  const modelKeys = new Set(metadata.models.map((model) => model.key));
  if (connectedWorld) {
    if (!metadata.models.length || metadata.models.length > ABOUT_BLENDER_MAX_MODELS
      || modelKeys.size !== metadata.models.length
      || metadata.models.some((model, index) => model.id !== index || typeof model.key !== 'string'
        || !model.key || model.renderingProfile !== 'solid')) {
      throw new Error('The connected export has invalid solid models or exceeds the renderer capacity.');
    }
  } else if (modelKeys.size !== metadata.models.length
    || REQUIRED_MODELS.some((key) => !modelKeys.has(key))
    || [...modelKeys].some((key) => !/^about\.0[0-6]$/u.test(key))) {
    throw new Error('The export has missing or duplicate active scene models.');
  }
  const camera = JSON.parse(buffers['camera-track.json'].toString('utf8'));
  if (camera.schema !== 'about-camera-track' || camera.samples?.length < 2) {
    throw new Error('The export has no usable Blender camera track.');
  }
  const runtimeFiles = [['surfels', 'surfels.bin'], ['cameraTrack', 'camera-track.json']];
  if (metadata.files.instanceVisibility !== undefined) runtimeFiles.push(['instanceVisibility', 'instance-visibility.bin']);
  for (const [key, file] of runtimeFiles) {
    const record = metadata.files?.[key];
    if (record?.file !== file || record.bytes !== buffers[file].length
      || record.sha256 !== sha256(buffers[file])) {
      throw new Error(`The export failed its ${key} integrity check.`);
    }
  }
  if (connectedWorld) {
    const verified = await validateAboutBlenderSceneBundle({
      meta: metadata, cameraTrackBytes: buffers['camera-track.json'],
      surfelBytes: buffers['surfels.bin'], digestSha256: sha256,
    });
    if (verified.status !== 'compatible') {
      throw new Error(verified.diagnostics.map(item => item.message).join(' '));
    }
    if (metadata.source.geography != null || camera.stagedGatePassages?.length) {
      throw new Error('The connected export cannot contain geography or legacy gate visibility.');
    }
    const points = buffers['surfels.bin'];
    if (!Number.isSafeInteger(metadata.files.surfels.count)
      || metadata.files.surfels.count !== points.byteLength / metadata.layout.strideBytes) {
      throw new Error('The connected export surfel count does not match its packed records.');
    }
    validateAboutCircleFieldRadii(metadata,
      points.buffer.slice(points.byteOffset, points.byteOffset + points.byteLength), resolveAboutCircleField(metadata));
    let pathLengthWU = 0;
    for (let index = 1; index < camera.samples.length; index += 1) {
      const previous = camera.samples[index - 1], sample = camera.samples[index];
      pathLengthWU += Math.hypot(sample[0] - previous[0], sample[1] - previous[1], sample[2] - previous[2]);
    }
    if (!(pathLengthWU > 0) || !Number.isFinite(pathLengthWU)
      || metadata.models.some(model => model.visibilitySpace !== 'camera-distance-wu'
        || model.visibilityStartWU !== 0 || !Number.isFinite(model.visibilityEndWU)
        || !Number.isFinite(model.visibilityHandoffWU) || model.visibilityHandoffWU <= 0
        || model.visibilityEndWU - model.visibilityHandoffWU < pathLengthWU - 0.000001)) {
      throw new Error('The connected export must keep every source model fully visible through the complete rail.');
    }
  }
  const cameraInstanceDiagnostics = aboutInstanceVisibilityDiagnostics(metadata, camera);
  if (cameraInstanceDiagnostics.length) throw new Error(cameraInstanceDiagnostics[0].message);
  decodeAboutInstanceVisibility(metadata, buffers['instance-visibility.bin'], buffers['surfels.bin']);
  const controls = metadata.source?.authoring?.controlValues;
  if (!controls || Object.values(controls).some((value) => !Number.isFinite(value))) {
    throw new Error('The export has no finite Blender control mirror.');
  }
  const after = await Promise.all(bundleFiles.map(async (file) => (
    signatureOf(await stat(join(directory, file)))
  )));
  if (after.some((signature, index) => signature !== signatures[index])) {
    throw new Error('The export changed during its integrity check.');
  }
  const bundleHash = sha256([
    metadata.source.sha256, metadata.files.surfels.sha256,
    metadata.files.cameraTrack.sha256, sha256(buffers['meta.json']),
    ...(metadata.files.instanceVisibility ? [metadata.files.instanceVisibility.sha256] : []),
  ].join(':'));
  return { metadata, bundleHash, buffers, signature: after.join('|') };
}

function assertSourceIdentity(expected, actual, bundle) {
  if (expected.signature !== actual.signature || expected.sha256 !== actual.sha256
    || bundle.metadata.source.sha256 !== expected.sha256) {
    const error = new Error('The Blender source changed during export. Discarding this preview.');
    error.code = 'ABOUT_SOURCE_CHANGED';
    throw error;
  }
}

// The pointer is the only mutable publication file. Every bundle it can select
// is already complete, validated, and immutable when that pointer is renamed.
export async function publishAboutPreviewBundle({ stageDirectory, previewDirectory, sourceBefore, readSource }) {
  const bundle = await readAboutPreviewBundle(stageDirectory);
  assertSourceIdentity(sourceBefore, await readSource(), bundle);
  const bundleRoot = join(previewDirectory, 'bundles');
  await mkdir(bundleRoot, { recursive: true });
  const destination = join(bundleRoot, bundle.bundleHash);
  try {
    await rename(stageDirectory, destination);
  } catch (error) {
    if (error.code !== 'EEXIST' && error.code !== 'ENOTEMPTY') throw error;
    const existing = await readAboutPreviewBundle(destination);
    if (existing.bundleHash !== bundle.bundleHash) throw error;
  }
  assertSourceIdentity(sourceBefore, await readSource(), bundle);
  const temporary = join(previewDirectory, `.current.${process.pid}.json`);
  try {
    await writeFile(temporary, JSON.stringify({ bundleHash: bundle.bundleHash }), 'utf8');
    // Recheck immediately before the single publication operation, including
    // saves that happened while the staged bundle was being installed.
    assertSourceIdentity(sourceBefore, await readSource(), bundle);
    await rename(temporary, join(previewDirectory, 'current.json'));
  } finally {
    await rm(temporary, { force: true });
  }
  return bundle;
}

const exists = async (path) => stat(path).then(() => true, (error) => {
  if (error.code === 'ENOENT') return false;
  throw error;
});

async function activeLock(path) {
  try {
    const pid = Number((await readFile(path, 'utf8')).trim());
    if (!Number.isSafeInteger(pid) || pid < 1) return false;
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ESRCH') return false;
    if (error.code === 'EPERM') return true;
    throw error;
  }
}

export function createAboutPreviewResolver({ sourcePath, canonicalDirectory, previewDirectory, readSource = createBlenderSourceReader() }) {
  const validated = new Map();
  const snapshots = new Map();
  let pending;
  let latest;
  const remember = (bundle) => {
    snapshots.delete(bundle.bundleHash);
    snapshots.set(bundle.bundleHash, bundle);
    // Keep recent complete bundles for tabs that are finishing an earlier load.
    while (snapshots.size > 4) snapshots.delete(snapshots.keys().next().value);
    return bundle;
  };
  const load = async (directory) => {
    const previous = validated.get(directory);
    const fileNames = previous ? Object.keys(previous.bundle.buffers) : BUNDLE_FILES;
    const signature = (await Promise.all(fileNames.map(async (file) => (
      signatureOf(await stat(join(directory, file)))
    )))).join('|');
    if (previous?.signature === signature) return previous.bundle;
    const bundle = await readAboutPreviewBundle(directory);
    validated.set(directory, { signature: bundle.signature, bundle });
    while (validated.size > 4) validated.delete(validated.keys().next().value);
    return bundle;
  };
  const resolve = async () => {
    let expectedSourceSha = '';
    let sourceError = '';
    try { expectedSourceSha = (await readSource(sourcePath)).sha256; }
    catch (error) { sourceError = error.message; }
    const exporting = await activeLock(join(previewDirectory, '.exporting'));
    const updating = await activeLock(join(previewDirectory, '.updating'));
    let cached;
    let cacheError = '';
    try {
      if (updating) throw new Error('The preview is being published.');
      let directory = join(previewDirectory, 'current');
      if (await exists(join(previewDirectory, 'current.json'))) {
        const pointer = JSON.parse(await readFile(join(previewDirectory, 'current.json'), 'utf8'));
        if (!/^[a-f0-9]{64}$/u.test(pointer.bundleHash)) throw new Error('The preview pointer is invalid.');
        directory = join(previewDirectory, 'bundles', pointer.bundleHash);
      }
      cached = await load(directory);
    } catch (error) { cacheError = error.message; }
    let active = cached?.metadata.source.sha256 === expectedSourceSha ? cached : null;
    let activeSource = active ? 'preview' : 'canonical';
    if (!active) {
      try { active = await load(canonicalDirectory); }
      catch (error) { cacheError = `${cacheError} Canonical export: ${error.message}`.trim(); }
    }
    if (!active && latest && !latest.bundle.metadata.files.instanceVisibility) {
      active = latest.bundle;
      activeSource = latest.preview.activeSource;
    }
    const sourceMatches = Boolean(active && expectedSourceSha
      && active.metadata.source.sha256 === expectedSourceSha);
    const status = exporting || updating ? 'exporting'
      : !active ? 'unavailable'
      : !sourceMatches || cached && cached !== active ? 'stale' : 'ready';
    const message = sourceError || (status === 'exporting'
      ? 'Blender is exporting. The last validated scene remains visible.'
      : !sourceMatches && active
      ? 'The saved Blender source is newer than the active validated export.'
      : cached && cached !== active
      ? 'Cached preview is stale. Using the validated canonical scene.'
      : !active ? cacheError : '');
    const preview = {
      status, activeSource: active ? activeSource : '', expectedSourceSha,
      sourceMatches, bundleHash: active?.bundleHash || '', message,
      assetRoot: active ? `${ASSET_PREFIX}/${active.bundleHash}` : '',
    };
    if (active) {
      remember(active);
      latest = { bundle: active, preview };
    }
    return active ? { ...active.metadata, preview } : { preview };
  };
  return {
    resolve() {
      // Coalesce metadata polls while a source hash/bundle is being validated.
      if (!pending) pending = resolve().finally(() => { pending = null; });
      return pending;
    },
    getBundle(bundleHash) { return snapshots.get(bundleHash); },
  };
}
