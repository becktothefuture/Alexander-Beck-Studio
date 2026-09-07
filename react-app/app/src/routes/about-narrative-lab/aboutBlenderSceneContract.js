import { resolveAboutNarrativeJourneyMap } from './aboutNarrativeJourneyMap.js';
import { ABOUT_BLENDER_STAGE_IDS } from './aboutBlenderStages.js';

const SHA256_PATTERN = /^[a-f\d]{64}$/i;
const FILE_KEYS = Object.freeze(['cameraTrack', 'surfels']);
const EPSILON = 0.000001;

function isSha256(value) {
  return typeof value === 'string' && SHA256_PATTERN.test(value);
}

function diagnostic(code, path, message, details = {}) {
  return { code, path, message, ...details };
}

function result(status, diagnostics, values) {
  return Object.freeze({
    status,
    diagnostics: Object.freeze(diagnostics.map((item) => Object.freeze({ ...item }))),
    ...values,
  });
}

function stageRangeDiagnostics(meta) {
  const diagnostics = [];
  const ranges = meta?.source?.route?.stageRanges;
  if (!ranges || typeof ranges !== 'object' || Array.isArray(ranges)) {
    return [diagnostic(
      'scene-stage-ranges-invalid', 'meta.source.route.stageRanges',
      'The Blender route must export one normalized range for every About stage.',
    )];
  }
  const keys = Object.keys(ranges);
  if (keys.length !== ABOUT_BLENDER_STAGE_IDS.length
    || keys.some((key, index) => key !== ABOUT_BLENDER_STAGE_IDS[index])) {
    diagnostics.push(diagnostic(
      'scene-stage-sequence-invalid', 'meta.source.route.stageRanges',
      'Blender stage ranges and website stage IDs must use the same ordered identifiers.',
      { expected: ABOUT_BLENDER_STAGE_IDS, actual: keys },
    ));
    return diagnostics;
  }
  let previousEnd = 0;
  for (const [index, stageId] of ABOUT_BLENDER_STAGE_IDS.entries()) {
    const range = ranges[stageId];
    if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isFinite)
      || range[0] < 0 || range[1] > 1 || range[1] <= range[0]
      || Math.abs(range[0] - previousEnd) > EPSILON) {
      diagnostics.push(diagnostic(
        'scene-stage-range-invalid', `meta.source.route.stageRanges.${stageId}`,
        `${stageId} must be a finite, contiguous normalized Blender route range.`,
      ));
    }
    previousEnd = Array.isArray(range) ? Number(range[1]) : Number.NaN;
    if (index === ABOUT_BLENDER_STAGE_IDS.length - 1
      && Math.abs(previousEnd - 1) > EPSILON) {
      diagnostics.push(diagnostic(
        'scene-stage-range-invalid', `meta.source.route.stageRanges.${stageId}`,
        'The final Blender stage must end at normalized route distance 1.',
      ));
    }
  }
  return diagnostics;
}

function metadataDiagnostics(meta) {
  const diagnostics = [];
  if (meta?.schema !== 'about-point-scene' || meta?.version !== 2) {
    diagnostics.push(diagnostic(
      'scene-contract-unsupported', 'meta.version',
      'Only the semantic About point-scene v2 contract is supported; legacy assets require an explicit adapter.',
    ));
  }
  if (!isSha256(meta?.source?.sha256)) {
    diagnostics.push(diagnostic(
      'scene-source-hash-invalid', 'meta.source.sha256',
      'The bundle must declare its authored-source SHA-256.',
    ));
  }
  diagnostics.push(...stageRangeDiagnostics(meta));
  const cameraFog = meta?.source?.authoring?.cameraFog;
  if (meta?.source?.authoring && (!cameraFog || !Number.isFinite(cameraFog.startWU) || cameraFog.startWU < 0
    || !Number.isFinite(cameraFog.endWU) || cameraFog.endWU <= cameraFog.startWU
    || !Number.isFinite(cameraFog.curve) || cameraFog.curve < 0.45 || cameraFog.curve > 2.5
    || cameraFog.source !== 'about.controls')) {
    diagnostics.push(diagnostic(
      'scene-camera-fog-invalid', 'meta.source.authoring.cameraFog',
      'Camera draw distance must come from finite Blender-authored fog controls.',
    ));
  }
  const models = Array.isArray(meta?.models) ? meta.models : [];
  const groups = Array.isArray(meta?.motionGroups) ? meta.motionGroups : [];
  const validGroups = groups.length > 0 && groups.every((group) =>
    Number.isInteger(group?.id) && group.id >= 0 && group.id < 32
    && typeof group.key === 'string' && group.key.length > 0)
    && new Set(groups.map((group) => group.id)).size === groups.length;
  if (!validGroups) diagnostics.push(diagnostic(
    'scene-motion-groups-invalid', 'meta.motionGroups',
    'Every motion group requires a unique identifier below the 32-group shader capacity and a semantic key.',
  ));
  const finiteVector = (value) => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
  for (const group of Array.isArray(meta.motionGroups) ? meta.motionGroups : []) {
    if (!group?.motion) continue;
    const motion = group.motion;
    const common = Number.isInteger(group.id) && group.id >= 0 && group.id < 32
      && finiteVector(motion.axis) && Math.abs(Math.hypot(...motion.axis) - 1) < 0.001
      && motion.timeSource === 'ambient-seconds';
    const rotation = motion.behavior === 'continuous-rotation'
      && finiteVector(motion.pivotWU) && Number.isFinite(motion.radiansPerSecond) && motion.radiansPerSecond >= 0;
    const bounded = motion.behavior === 'bounded-rotation' && finiteVector(motion.pivotWU)
      && Number.isFinite(motion.amplitudeRadians) && motion.amplitudeRadians >= 0 && motion.amplitudeRadians <= Math.PI / 2
      && Number.isFinite(motion.periodSeconds) && motion.periodSeconds >= 1;
    const terrain = motion.behavior === 'terrain-wave'
      && Number.isFinite(motion.amplitudeWU) && motion.amplitudeWU >= 0
      && Number.isFinite(motion.wavelengthWU) && motion.wavelengthWU > 0
      && Number.isFinite(motion.secondaryScale) && motion.secondaryScale >= 0
      && Number.isFinite(motion.radiansPerSecond) && motion.radiansPerSecond >= 0;
    if (!common || !(rotation || bounded || terrain)) diagnostics.push(diagnostic(
      'scene-authored-motion-invalid', `meta.motionGroups.${group.id}.motion`,
      'Authored motion needs a supported behavior, unit axis, finite parameters, and a bounded group identifier.',
    ));
  }
  for (const [index, model] of models.entries()) {
    if (model?.renderingProfile != null && !['atmosphere', 'solid', 'bust'].includes(model.renderingProfile)) {
      diagnostics.push(diagnostic('scene-rendering-profile-invalid', `meta.models[${index}].renderingProfile`,
        'The model must use an atmospheric, solid-surface, or bust rendering profile.'));
    }
    if (model?.material == null) continue;
    const material = model.material;
    const owned = typeof model.motionKey === 'string' && model.motionKey.length > 0
      ? groups.filter((group) => typeof group?.key === 'string'
        && (group.key === model.motionKey || group.key.startsWith(`${model.motionKey}.`))) : [];
    const ids = owned.map((group) => group.id);
    const first = Math.min(...ids);
    const last = Math.max(...ids);
    if (index >= 7 || !validGroups || !Number.isFinite(material.manifestationSpreadScale)
      || material.manifestationSpreadScale < 0.001 || material.manifestationSpreadScale > 1
      || !Number.isFinite(material.detailBiasScale)
      || material.detailBiasScale < 0.2 || material.detailBiasScale > 2
      || !ids.length || ids.some((id) => !Number.isInteger(id) || id < 0 || id >= 32)
      || new Set(ids).size !== ids.length || last - first + 1 !== ids.length
      || groups.some((group) => group?.id >= first && group.id <= last && !owned.includes(group))
      || models.some((other) => other !== model && other?.motionKey
        && owned.some((group) => group.key === other.motionKey || group.key.startsWith(`${other.motionKey}.`)))) {
      diagnostics.push(diagnostic('scene-model-material-invalid', `meta.models[${index}].material`,
        'Source material scales need finite bounds and a unique contiguous model-owned motion group range.'));
    }
  }
  const response = meta?.terminalResponse;
  if (response != null) {
    const finiteBetween = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;
    const travel = response.travelXWU;
    const bounds = response.landscapeBounds;
    if (response.schema !== 'about-terminal-response/v1' || response.modelKey !== 'about.05'
      || !finiteBetween(response.periodSeconds, 6, 20)
      || !finiteBetween(response.amplitudeWU, 0, 4)
      || !finiteBetween(response.responseDelaySeconds, 0.5, 4)
      || !finiteBetween(response.pulseDurationSeconds, 0.5, 3)
      || response.periodSeconds <= response.responseDelaySeconds + response.pulseDurationSeconds
      || !Array.isArray(travel) || travel.length !== 2 || !travel.every(Number.isFinite)
      || !finiteBetween(travel[1] - travel[0], 80, 300)
      || !Array.isArray(bounds?.min) || !Array.isArray(bounds?.max)
      || bounds.min.length !== 3 || bounds.max.length !== 3
      || !bounds.min.every((value, index) => Number.isFinite(value)
        && Number.isFinite(bounds.max[index]) && bounds.max[index] > value)
      || !Number.isFinite(response.bankEndSiteZ)
      || !Array.isArray(meta.models) || !meta.models.some((model) => model?.key === response.modelKey)) {
      diagnostics.push(diagnostic(
        'scene-terminal-response-invalid', 'meta.terminalResponse',
        'The connected surface needs a bounded, finite source-authored response and landscape.',
      ));
    }
    const model = Array.isArray(meta.models)
      ? meta.models.find((entry) => entry?.key === response.modelKey) : null;
    const groups = meta.motionGroups;
    const validGroups = Array.isArray(groups) && groups.length > 0
      && groups.every((entry) => Number.isInteger(entry?.id) && entry.id >= 0 && entry.id <= 255
        && typeof entry.key === 'string' && entry.key.length > 0)
      && new Set(groups.map((entry) => entry.id)).size === groups.length;
    const motionKey = model?.motionKey;
    const matches = typeof motionKey === 'string' && motionKey.length > 0 && validGroups
      ? groups.filter((entry) => entry.key === motionKey || entry.key.startsWith(`${motionKey}.`)) : [];
    const ids = matches.map((entry) => entry.id);
    // The shader selects an inclusive range. No other model may occupy a gap.
    if (!matches.length || Math.max(...ids) - Math.min(...ids) + 1 !== matches.length
      || (Array.isArray(meta.models) && meta.models.some((entry) => entry !== model && entry?.motionKey
        && matches.some((group) => group.key === entry.motionKey
          || group.key.startsWith(`${entry.motionKey}.`))))) {
      diagnostics.push(diagnostic(
        'scene-terminal-binding-invalid', 'meta.motionGroups',
        'The terminal response needs a unique contiguous range of bounded motion groups owned by its model.',
      ));
    }
  }
  return diagnostics;
}

function cameraDiagnostics(cameraTrack) {
  const diagnostics = [];
  if (cameraTrack?.schema !== 'about-camera-track' || cameraTrack?.version !== 5) {
    diagnostics.push(diagnostic(
      'scene-camera-contract-unsupported', 'cameraTrack.version',
      'Only the exported About camera-track v5 contract is supported.',
    ));
    return diagnostics;
  }
  const projection = cameraTrack.projection;
  if (projection?.type !== 'perspective' || projection?.fovAxis !== 'horizontal'
    || !Number.isFinite(projection?.horizontalFov)
    || projection.horizontalFov <= 0 || projection.horizontalFov >= 180
    || !Number.isFinite(projection?.portraitMaxVerticalFov)
    || projection.portraitMaxVerticalFov <= 0 || projection.portraitMaxVerticalFov >= 180
    || !Number.isSafeInteger(cameraTrack.sampleCount) || cameraTrack.sampleCount < 2
    || !Array.isArray(cameraTrack.samples)
    || cameraTrack.samples.length !== cameraTrack.sampleCount
    || cameraTrack.samples.some((sample) => (
      !Array.isArray(sample) || sample.length !== 7 || !sample.every(Number.isFinite)
    ))) {
    diagnostics.push(diagnostic(
      'scene-camera-data-invalid', 'cameraTrack',
      'The camera must contain finite seven-component samples and a valid horizontal perspective projection.',
    ));
  }
  return diagnostics;
}

function byteView(value) {
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value) && value.buffer instanceof ArrayBuffer) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return null;
}

function defaultDigestCapability() {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle || typeof subtle.digest !== 'function') return null;
  return async (bytes) => {
    const digest = await subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
  };
}

/**
 * Once-per-load integrity check; no fetch, retry, renderer state or frame work.
 * digestSha256(bytes) may return a hex digest or a promise for one. Omitting it
 * uses Web Crypto (normally HTTPS/localhost); null explicitly means unavailable.
 * Keep metadata and supplied buffers unchanged until this promise resolves. Use the
 * returned cameraTrack, parsed from the verified bytes, for semantic resolution.
 * sourceHash is a declared Blender-source identity, optionally pinned by the
 * caller; this browser module cannot verify the .blend file itself.
 */
export async function validateAboutBlenderSceneBundle({
  meta,
  cameraTrackBytes,
  surfelBytes,
  digestSha256,
  expectedSourceHash,
} = {}) {
  const empty = { cameraTrack: null, sourceHash: null, files: null };
  if (meta == null) {
    return result('pending', [diagnostic('scene-input-pending', 'meta', 'Bundle metadata has not arrived.')], empty);
  }
  const diagnostics = metadataDiagnostics(meta);
  if (expectedSourceHash !== undefined
    && (!isSha256(expectedSourceHash)
      || String(meta.source?.sha256).toLowerCase() !== expectedSourceHash.toLowerCase())) {
    diagnostics.push(diagnostic(
      'scene-source-hash-mismatch', 'meta.source.sha256',
      'The bundle does not match the requested authored source.',
      { expected: expectedSourceHash, actual: meta.source?.sha256 },
    ));
  }
  const inputs = { cameraTrack: cameraTrackBytes, surfels: surfelBytes };
  const views = {};
  const files = {};
  const pending = [];
  for (const key of FILE_KEYS) {
    const record = meta.files?.[key];
    if (!record || typeof record.file !== 'string' || !record.file
      || /[/\\?#]/.test(record.file) || record.file === '.' || record.file === '..'
      || !Number.isSafeInteger(record.bytes) || record.bytes <= 0
      || !isSha256(record.sha256)) {
      diagnostics.push(diagnostic(
        'scene-file-record-invalid', `meta.files.${key}`,
        'Each bundle file must declare a portable filename, positive byte length and SHA-256.',
      ));
      continue;
    }
    files[key] = Object.freeze({
      file: record.file, bytes: record.bytes, sha256: record.sha256.toLowerCase(),
    });
    if (inputs[key] == null) {
      pending.push(diagnostic('scene-input-pending', `${key}Bytes`, `${record.file} has not arrived.`));
      continue;
    }
    views[key] = byteView(inputs[key]);
    if (!views[key] || views[key].byteLength !== record.bytes) {
      diagnostics.push(diagnostic(
        'scene-file-length-mismatch', `meta.files.${key}.bytes`,
        `${record.file} does not match its declared byte length.`,
        { expected: record.bytes, actual: views[key]?.byteLength ?? null },
      ));
    }
  }
  if (diagnostics.length) return result('incompatible', diagnostics, empty);
  if (pending.length) return result('pending', pending, empty);
  const sourceHash = meta.source.sha256.toLowerCase();

  const digest = digestSha256 === undefined ? defaultDigestCapability() : digestSha256;
  if (typeof digest !== 'function') {
    return result('incompatible', [diagnostic(
      'scene-digest-unavailable', 'digestSha256',
      'SHA-256 verification is unavailable. Use a secure context with Web Crypto or provide a trusted digest capability; integrity was not checked.',
    )], empty);
  }
  // Exactly two digest operations, after byte-length checks. Never hash in RAF.
  const hashes = await Promise.all(FILE_KEYS.map(async (key) => {
    try {
      const hash = await digest(views[key]);
      return { key, hash: typeof hash === 'string' ? hash.toLowerCase() : '' };
    } catch {
      return { key, hash: '', failed: true };
    }
  }));
  for (const { key, hash, failed } of hashes) {
    if (failed || !isSha256(hash) || hash !== files[key].sha256) {
      diagnostics.push(diagnostic(
        failed ? 'scene-digest-failed' : 'scene-file-hash-mismatch', `meta.files.${key}.sha256`,
        `${files[key].file} could not be verified against its declared SHA-256.`,
        { expected: files[key].sha256, actual: hash || null },
      ));
    }
  }
  if (diagnostics.length) return result('incompatible', diagnostics, empty);

  let cameraTrack;
  try {
    cameraTrack = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(views.cameraTrack));
  } catch {
    return result('incompatible', [diagnostic(
      'scene-camera-json-invalid', 'cameraTrackBytes',
      'The verified camera bytes are not valid UTF-8 JSON.',
    )], empty);
  }
  diagnostics.push(...cameraDiagnostics(cameraTrack));
  if (diagnostics.length) return result('incompatible', diagnostics, empty);
  return result('compatible', [], {
    cameraTrack,
    sourceHash,
    files: Object.freeze(files),
  });
}

/**
 * Pure semantic check, called only when the bundle or compiled story map changes
 * (including responsive reflow), never in RAF. It neither changes nor hides the
 * current world. Cache by bundle/map identity, not the journey's sample-count key.
 * An incompatible result has no consumable windows: never install a partial set.
 * A missing input is pending; a supplied legacy/malformed input is incompatible.
 * Bundle integrity is a separate prerequisite, not implied by this result.
 */
export function resolveAboutBlenderSceneContract({ meta, cameraTrack, storyMap } = {}) {
  const empty = { journeyMap: null, visibilityWindows: null };
  const pending = Object.entries({ meta, cameraTrack, storyMap })
    .filter(([, value]) => value == null)
    .map(([key]) => diagnostic('scene-input-pending', key, `${key} has not arrived.`));
  const diagnostics = [
    ...(meta == null ? [] : metadataDiagnostics(meta)),
    ...(cameraTrack == null ? [] : cameraDiagnostics(cameraTrack)),
  ];
  if (storyMap != null && (storyMap.valid !== true || !Array.isArray(storyMap.anchors) || !storyMap.anchors.length
    || !Number.isFinite(storyMap.durationWU) || storyMap.durationWU <= 0
    || storyMap.anchors.some((anchor) => (
      !anchor || typeof anchor.id !== 'string' || !anchor.id
      || !Number.isFinite(anchor.storyWU) || anchor.storyWU < 0
      || typeof anchor.cueName !== 'string' || !anchor.cueName
    ))
    || new Set(storyMap.anchors?.map((anchor) => anchor?.id)).size !== storyMap.anchors?.length)) {
    diagnostics.push(diagnostic(
      'scene-story-map-invalid', 'storyMap',
      'A valid compiled story map with unique, finite semantic anchors is required.',
    ));
  }
  const cues = cameraTrack?.journeyCues;
  if (cameraTrack != null && (!Array.isArray(cues) || !cues.length
    || cues.some((cue) => !cue || typeof cue.name !== 'string' || !cue.name
      || !Number.isFinite(cue.progress) || cue.progress < 0 || cue.progress > 1)
    || new Set(cues?.map((cue) => cue?.name)).size !== cues?.length)) {
    diagnostics.push(diagnostic(
      'scene-camera-cues-invalid', 'cameraTrack.journeyCues',
      'Camera cues must have unique names and finite progress within 0…1; legacy cue fallback is unsupported.',
    ));
  }
  if (meta != null && (!Array.isArray(meta.models) || !meta.models.length)) {
    diagnostics.push(diagnostic('scene-models-invalid', 'meta.models', 'The scene must declare its semantic models.'));
  }
  if (meta != null && Array.isArray(meta.models)) {
    const actualKeys = meta.models.map((model) => model?.key);
    // The archived body collection is optional in older compatible exports;
    // narrative stages remain stable even when that model is not exported.
    const expectedKeys = actualKeys.includes('about.01')
      ? ABOUT_BLENDER_STAGE_IDS
      : ABOUT_BLENDER_STAGE_IDS.filter((key) => key !== 'about.01');
    if (actualKeys.length !== expectedKeys.length
      || actualKeys.some((key, index) => key !== expectedKeys[index])) {
      diagnostics.push(diagnostic(
        'scene-model-sequence-invalid', 'meta.models',
        'The About world must declare its ordered semantic models, with the archived body model optional.',
        { expected: expectedKeys, actual: actualKeys },
      ));
    }
  }
  if (diagnostics.length) return result('incompatible', diagnostics, empty);
  if (pending.length) return result('pending', pending, empty);

  const journeyMap = resolveAboutNarrativeJourneyMap(storyMap, cameraTrack);
  if (!journeyMap.valid) {
    diagnostics.push(diagnostic(
      'scene-journey-incompatible', 'cameraTrack.journeyCues',
      'The camera and current story do not form one complete Blender-authored journey.',
    ), ...journeyMap.diagnostics);
  }
  // Scenery follows semantic camera cues. Responsive editorial reflow may move
  // story-world distances without changing the authored physical rail ranges.
  const anchors = new Map(journeyMap.anchors.map((anchor) => [anchor.id, anchor.cameraStoryWU]));
  const storyAnchors = new Map(journeyMap.anchors.map((anchor) => [anchor.id, anchor.storyWU]));
  const modelKeys = new Set();
  const windows = meta.models.map((model, index) => {
    const path = `meta.models.${index}`;
    if (!model || model.id !== index || typeof model.key !== 'string' || !model.key
      || modelKeys.has(model.key)) {
      diagnostics.push(diagnostic(
        'scene-model-id-invalid', path,
        'Models must have unique keys and contiguous IDs matching their exported order.',
      ));
      return null;
    }
    modelKeys.add(model.key);
    const startCue = model.visibilityStartCue;
    const startOffsetWU = Number(model.visibilityStartOffsetWU);
    const endCue = model.visibilityEndCue;
    const endOffsetWU = Number(model.visibilityEndOffsetWU);
    const handoffWU = Number(model.visibilityHandoffWU);
    const resolved = {};
    const resolvedStory = {};
    for (const [side, cue, offsetWU] of [
      ['Start', startCue, startOffsetWU],
      ['End', endCue, endOffsetWU],
    ]) {
      if (typeof cue !== 'string' || !cue || !anchors.has(cue) || !Number.isFinite(offsetWU)) {
        diagnostics.push(diagnostic(
          'scene-visibility-cue-unresolved', `${path}.visibility${side}Cue`,
          `${model.key} requires an existing story cue and finite Blender-authored offset.`,
        ));
      } else {
        resolved[side] = anchors.get(cue) + offsetWU;
        resolvedStory[side] = storyAnchors.get(cue) + offsetWU;
      }
    }
    const startWU = resolved.Start;
    const endWU = resolved.End;
    if (Number.isFinite(startWU) && Number.isFinite(endWU)) {
      if (startWU < 0 || endWU <= startWU) {
        diagnostics.push(diagnostic(
          'scene-resolved-window-invalid', path,
          `${model.key} resolves to an invalid visibility interval.`,
          { modelKey: model.key, startWU, endWU },
        ));
      }
    } else {
      diagnostics.push(diagnostic('scene-resolved-window-invalid', path, `${model.key} has non-finite resolved bounds.`));
    }
    // Retiming does not rehabilitate an inverted source binding from a rejected
    // bundle. Preserve the source/story compatibility check as well as distance.
    if (Number.isFinite(resolvedStory.Start) && Number.isFinite(resolvedStory.End)
      && (resolvedStory.Start < 0 || resolvedStory.End <= resolvedStory.Start)) {
      diagnostics.push(diagnostic(
        'scene-resolved-window-invalid', path, `${model.key} has invalid source/story bindings.`,
        { modelKey: model.key, startWU: resolvedStory.Start, endWU: resolvedStory.End },
      ));
    }
    if (!Number.isFinite(handoffWU) || handoffWU <= 0
      || handoffWU * (startWU > 0 ? 2 : 1) > endWU - startWU + EPSILON
      || handoffWU * (resolvedStory.Start > 0 ? 2 : 1)
        > resolvedStory.End - resolvedStory.Start + EPSILON
    ) {
      diagnostics.push(diagnostic(
        'scene-visibility-handoff-invalid', `${path}.visibilityHandoffWU`,
        `${model.key} needs a positive bounded handoff that permits full visibility.`,
      ));
    }
    return Object.freeze({
      modelId: model.id, modelKey: model.key, startWU, endWU, handoffWU,
      startCue, startOffsetWU, endCue, endOffsetWU,
      source: 'blender-authored-visibility',
    });
  });
  if (diagnostics.length) return result('incompatible', diagnostics, empty);
  return result('compatible', [], { journeyMap, visibilityWindows: Object.freeze(windows) });
}
