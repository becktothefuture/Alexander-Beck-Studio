import { ROLLERCOASTER_SURFACE_LIMITS, sampleRollercoasterField, validateRollercoasterGeometry } from './rollercoasterField.js';
import { withAboutLoadDeadline } from './rollercoasterLoading.js';
export { validateRollercoasterGeometry } from './rollercoasterField.js';

export const ROLLERCOASTER_SCHEMA = 'about-rollercoaster-world/v2';
export const ROLLERCOASTER_SOURCE_FILE = 'source-assets/about-surface-world/about-surface-world.blend';
export const ROLLERCOASTER_MAX_MOTION_GROUPS = 32;
export const ROLLERCOASTER_BEAT_IDS = Object.freeze([
  'departure', 'background', 'curiosity', 'tunnel-a', 'release', 'disciplines',
  'statements', 'method', 'tunnel-b', 'approach', 'ending',
]);
const SHA256 = /^[a-f\d]{64}$/i;
const EPSILON = 1e-6;
const ensure = (condition, message) => {
  if (!condition) throw new Error(`About rollercoaster: ${message}`);
};
const finite = value => typeof value === 'number' && Number.isFinite(value);
const vector = value => Array.isArray(value) && value.length === 3 && value.every(finite);
const unit = value => vector(value) && Math.abs(Math.hypot(...value) - 1) < 1e-5;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const clampProgress = value => Math.max(0, Math.min(1, finite(value) ? value : 0));

/** Shared by story layout and publication; source timing remains editable. */
export function validateRollercoasterStoryBeats(beats) {
  if (!Array.isArray(beats) || beats.length !== ROLLERCOASTER_BEAT_IDS.length) {
    throw new TypeError('About scene metadata must contain the complete editorial beat sequence.');
  }
  let previousEnd = 0;
  for (let index = 0; index < beats.length; index += 1) {
    const beat = beats[index];
    if (beat?.id !== ROLLERCOASTER_BEAT_IDS[index]
      || !finite(beat.start) || !finite(beat.end)
      || beat.start < 0 || beat.end > 1 || beat.end <= beat.start
      || Math.abs(beat.start - previousEnd) > 1e-7
      || !finite(beat.scrollScreens) || beat.scrollScreens <= 0) {
      throw new TypeError(`Invalid About scene beat ${beat?.id || index}.`);
    }
    previousEnd = beat.end;
  }
  if (Math.abs(previousEnd - 1) > 1e-7) {
    throw new TypeError('The About scene must end at source progress 1.');
  }
  return beats;
}

export function validateRollercoasterMeta(meta) {
  ensure(meta?.schema === ROLLERCOASTER_SCHEMA, 'unsupported scene schema.');
  ensure(meta.source?.file === ROLLERCOASTER_SOURCE_FILE && SHA256.test(meta.source?.sha256), 'invalid authored source identity.');
  ensure(meta.camera?.file === 'camera.json' && SHA256.test(meta.cameraSha256), 'invalid camera file identity.');
  ensure(finite(meta.camera.horizontalFov) && meta.camera.horizontalFov > 0 && meta.camera.horizontalFov < 180
    && finite(meta.camera.portraitVerticalFov) && meta.camera.portraitVerticalFov > 0 && meta.camera.portraitVerticalFov < 180,
  'invalid source lens.');
  ensure(meta.geometry?.file === 'geometry.json' && SHA256.test(meta.geometry.sha256)
    && Number.isSafeInteger(meta.geometry.objectCount) && meta.geometry.objectCount > 0
    && meta.geometry.objectCount <= ROLLERCOASTER_SURFACE_LIMITS.objects, 'invalid geometry file contract.');
  ensure(meta.points === undefined && meta.circleField === undefined && meta.pointObjects === undefined
    && meta.pointRanges === undefined, 'exported points or density are not supported by the surface contract.');
  if (meta.finalGrid) ensure(typeof meta.finalGrid.objectId === 'string' && meta.finalGrid.objectId.trim()
    && meta.finalGrid.rows === undefined && meta.finalGrid.columns === undefined && meta.finalGrid.pointRanges === undefined,
  'the final grid must reference a surface without exported rows, columns or point ranges.');
  ensure(meta.controls === undefined || Array.isArray(meta.controls), 'invalid source controls.');
  const retiredFogKeys = new Set(['fogNear', 'fogFar', 'finalFogNear', 'finalFogFar']);
  const retiredVisibility = value => retiredFogKeys.has(value) || value === 'fog'
    || (typeof value === 'string' && value.startsWith('fog.'));
  ensure(meta.fog === undefined && !(meta.controls || []).some(control =>
    retiredVisibility(control.key) || retiredVisibility(control.binding)),
  'visibility is browser-owned; source fog and final-wall exceptions are not supported.');
  ensure(Array.isArray(meta.motionGroups) && meta.motionGroups.length > 0
    && meta.motionGroups.length <= ROLLERCOASTER_MAX_MOTION_GROUPS, 'motion group capacity exceeded or missing.');
  meta.motionGroups.forEach((group, index) => {
    ensure(group?.id === index, 'motion group IDs must be contiguous and stable.');
    ensure(['static', 'rotate', 'wave'].includes(group.kind), `unsupported motion kind at group ${index}.`);
    ensure(group.clock === undefined || group.clock === 'ambient', `unsupported motion clock at group ${index}.`);
    if (group.kind === 'static') return;
    ensure(unit(group.axis) && finite(group.amplitude) && group.amplitude >= 0
      && finite(group.period) && group.period > 0 && finite(group.phase), `invalid motion parameters at group ${index}.`);
    if (group.kind === 'rotate') {
      ensure(vector(group.pivot) && typeof group.continuous === 'boolean', `invalid rotation at group ${index}.`);
    } else {
      ensure(vector(group.origin) && unit(group.uAxis) && unit(group.vAxis)
        && Math.abs(dot(group.axis, group.uAxis)) < 1e-5
        && Math.abs(dot(group.axis, group.vAxis)) < 1e-5 && Math.abs(dot(group.uAxis, group.vAxis)) < 1e-5
        && finite(group.wavelength) && group.wavelength > 0
        && finite(group.quietRadius) && group.quietRadius >= 0
        && finite(group.quietFeather) && group.quietFeather > 0, `invalid wave basis or bounds at group ${index}.`);
    }
  });
  ensure(Array.isArray(meta.beats) && meta.beats.length > 0, 'missing source beats.');
  const ids = new Set();
  meta.beats.forEach((beat, index) => {
    ensure(typeof beat?.id === 'string' && beat.id.length > 0 && !ids.has(beat.id), 'invalid or duplicate beat ID.');
    ids.add(beat.id);
    ensure(['title', 'prose', 'reading', 'travel', 'ending'].includes(beat.kind), `invalid beat kind: ${beat.id}.`);
    ensure(finite(beat.start) && finite(beat.end) && beat.start >= 0 && beat.end <= 1 && beat.end > beat.start
      && Math.abs(beat.start - (index ? meta.beats[index - 1].end : 0)) < EPSILON
      && finite(beat.scrollScreens) && beat.scrollScreens > 0, `invalid beat interval: ${beat.id}.`);
  });
  ensure(Math.abs(meta.beats.at(-1).end - 1) < EPSILON && meta.beats.at(-1).kind === 'ending', 'beats must end at the authored ending.');
  return meta;
}

export function validateRollercoasterCamera(camera) {
  ensure(Array.isArray(camera?.samples) && camera.samples.length >= 2, 'camera needs at least two samples.');
  let previous = -1;
  camera.samples.forEach((sample) => {
    ensure(Array.isArray(sample) && sample.length === 8 && sample.every(finite), 'invalid camera sample.');
    ensure(sample[0] >= 0 && sample[0] <= 1 && sample[0] > previous, 'camera progress must be strictly increasing.');
    ensure(Math.abs(Math.hypot(sample[4], sample[5], sample[6], sample[7]) - 1) < 1e-5, 'camera quaternion must be normalized.');
    previous = sample[0];
  });
  ensure(camera.samples[0][0] === 0 && camera.samples.at(-1)[0] === 1, 'camera must cover progress 0 to 1.');
  return camera;
}

function bytes(value) {
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  throw new Error('About rollercoaster: missing binary bytes.');
}

export async function sha256RollercoasterBytes(value) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function validateRollercoasterBundle({ meta, cameraBytes, geometryBytes, digestSha256 = sha256RollercoasterBytes }) {
  validateRollercoasterMeta(meta);
  const geometryView = bytes(geometryBytes), cameraView = bytes(cameraBytes);
  ensure(geometryView.byteLength <= ROLLERCOASTER_SURFACE_LIMITS.geometryBytes
    && cameraView.byteLength <= 8 * 1024 * 1024, 'surface or camera byte allocation limit exceeded.');
  const [cameraHash, geometryHash] = await Promise.all([digestSha256(cameraView), digestSha256(geometryView)]);
  ensure(cameraHash.toLowerCase() === meta.cameraSha256.toLowerCase(), 'camera hash mismatch.');
  ensure(geometryHash.toLowerCase() === meta.geometry.sha256.toLowerCase(), 'geometry hash mismatch.');
  const camera = validateRollercoasterCamera(JSON.parse(new TextDecoder().decode(cameraView)));
  const geometry = validateRollercoasterGeometry(JSON.parse(new TextDecoder().decode(geometryView)), meta);
  return { meta, camera, geometry };
}

function waitForExport(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    const cancel = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      reject(signal.reason || new DOMException('Loading cancelled.', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', cancel);
      resolve();
    }, milliseconds);
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) cancel();
  });
}

/** A source save may replace data before the manifest; retry only transient reads. */
export async function loadRollercoasterBundle({ assetRoot, signal, fetchImpl = globalThis.fetch, retryDelayMs = 150, samplingSettings, timeoutMs }) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    signal?.throwIfAborted();
    let failure;
    try {
      const bundle = await withAboutLoadDeadline(async (requestSignal) => {
        const read = async (file, json = false) => {
          try {
            requestSignal.throwIfAborted();
            const response = await fetchImpl(`${assetRoot}/${file}`, { signal: requestSignal, cache: 'no-store' });
            requestSignal.throwIfAborted();
            if (!response.ok) {
              const error = new Error(`Could not load About ${file} (${response.status}).`);
              error.retryable = true;
              throw error;
            }
            const result = await (json ? response.json() : response.arrayBuffer());
            requestSignal.throwIfAborted();
            return result;
          }
          catch (error) {
            if (error.name !== 'AbortError' && error.name !== 'SyntaxError') error.retryable = true;
            throw error;
          }
        };
        const meta = validateRollercoasterMeta(await read('meta.json', true));
        const [cameraBytes, geometryBytes] = await Promise.all([read(meta.camera.file), read(meta.geometry.file)]);
        return validateRollercoasterBundle({ meta, cameraBytes, geometryBytes });
      }, { signal, timeoutMs });
      signal?.throwIfAborted();
      const sampled = sampleRollercoasterField(bundle.geometry,
        typeof samplingSettings === 'function' ? samplingSettings(bundle.meta) : samplingSettings);
      return { ...bundle, ...sampled, loadAttempts: attempt + 1 };
    } catch (error) {
      failure = error;
    }
    signal?.throwIfAborted();
    if (attempt === 2 || (!failure.retryable && !/hash mismatch/.test(failure.message))) throw failure;
    await waitForExport(Math.min(500, Math.max(0, retryDelayMs)) * (attempt + 1), signal);
  }
  throw new Error('About rollercoaster could not load a consistent bundle.');
}

export function createRollercoasterCameraPose() {
  return { progress: 0, position: [0, 0, 0], quaternion: [0, 0, 0, 1] };
}

export function sampleRollercoasterCamera(track, progress, target = createRollercoasterCameraPose()) {
  const samples = track.samples, p = clampProgress(progress);
  let low = 0, high = samples.length - 1;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (samples[middle][0] <= p) low = middle; else high = middle;
  }
  const a = samples[low], b = samples[high];
  const t = Math.max(0, Math.min(1, (p - a[0]) / (b[0] - a[0])));
  target.progress = p;
  for (let axis = 0; axis < 3; axis += 1) target.position[axis] = a[axis + 1] + (b[axis + 1] - a[axis + 1]) * t;
  let cosine = a[4] * b[4] + a[5] * b[5] + a[6] * b[6] + a[7] * b[7];
  const sign = cosine < 0 ? -1 : 1;
  cosine = Math.min(1, Math.abs(cosine));
  let from = 1 - t, to = t;
  if (cosine < 0.9995) {
    const angle = Math.acos(cosine), inverseSine = 1 / Math.sin(angle);
    from = Math.sin((1 - t) * angle) * inverseSine;
    to = Math.sin(t * angle) * inverseSine;
  }
  const q = target.quaternion;
  for (let axis = 0; axis < 4; axis += 1) q[axis] = a[axis + 4] * from + b[axis + 4] * to * sign;
  const length = Math.hypot(q[0], q[1], q[2], q[3]);
  for (let axis = 0; axis < 4; axis += 1) q[axis] /= length;
  return target;
}

export function resolveRollercoasterProgress(meta, progress, reducedMotion = false) {
  const p = clampProgress(progress);
  if (!reducedMotion) return p;
  let checkpoint = 0;
  for (const beat of meta.beats) {
    if (beat.start > p) break;
    checkpoint = beat.kind === 'travel' ? (beat.start + beat.end) / 2 : beat.start;
  }
  return checkpoint;
}
