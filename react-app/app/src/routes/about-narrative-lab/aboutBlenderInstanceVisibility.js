// Optional source component bindings. The original 32-byte surfels stay intact.
export const ABOUT_INSTANCE_VISIBILITY_UNBOUND = 65535;
const WINDOW_KEYS = ['startWU', 'endWU', 'entranceHandoffWU', 'exitHandoffWU'];
const INSTANCE_VISIBILITY_MODELS = ['about.01', 'about.03', 'about.05'];

const bytesView = (bytes) => bytes instanceof ArrayBuffer ? new Uint8Array(bytes)
  : ArrayBuffer.isView(bytes) ? new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength) : null;

export function aboutInstanceVisibilityDiagnostics(meta, cameraTrack = null) {
  const table = meta?.instanceVisibility;
  const file = meta?.files?.instanceVisibility;
  const sources = (Array.isArray(meta?.source?.objects) ? meta.source.objects : [])
    .filter((object) => object?.stagedGate?.instanceVisibility !== undefined);
  const passages = (Array.isArray(cameraTrack?.stagedGatePassages) ? cameraTrack.stagedGatePassages : [])
    .filter((passage) => passage?.instanceVisibility !== undefined);
  if (table === undefined && file === undefined && !sources.length && !passages.length) return [];
  const fail = (message) => [{ code: 'scene-instance-visibility-invalid', path: 'meta.instanceVisibility', message }];
  if (!table || !file || table.schema !== 'about-gate-instance-visibility/v1'
    || table.visibilitySpace !== 'camera-distance-wu' || table.unboundValue !== ABOUT_INSTANCE_VISIBILITY_UNBOUND
    || !Array.isArray(table.bindings) || !table.bindings.length || table.bindings.length >= ABOUT_INSTANCE_VISIBILITY_UNBOUND
    || file.file !== 'instance-visibility.bin' || file.encoding !== 'uint16-le'
    || !Number.isSafeInteger(file.count) || file.count <= 0 || file.count !== meta?.files?.surfels?.count
    || file.bytes !== file.count * 2 || !/^[a-f\d]{64}$/i.test(file.sha256 || '')) {
    return fail('Instance visibility needs a complete versioned table and matching uint16 point-binding file.');
  }
  if (!sources.length || sources.some((source) => !INSTANCE_VISIBILITY_MODELS.includes(source.modelKey)
    || typeof source.objectKey !== 'string' || !source.objectKey)
    || new Set(sources.map((source) => source.objectKey)).size !== sources.length) {
    return fail('Only recovered prose gate hosts may declare instance visibility.');
  }
  if (!Array.isArray(meta.models) || meta.models.length !== 7
    || meta.models.some((item, index) => item?.id !== index || item.key !== `about.0${index}`)) {
    return fail('Instance visibility requires the seven canonical scene models.');
  }
  if (cameraTrack !== null && passages.length !== sources.length) {
    return fail('Every declaring source host needs exactly one matching camera aperture census.');
  }
  let bindingIndex = 0;
  // Global binding IDs follow canonical model order. Aperture IDs restart at
  // one within each source host; source object array order is not authoritative.
  for (const model of meta.models) {
    const modelSources = sources.filter((source) => source.modelKey === model.key);
    if (!modelSources.length) continue;
    const source = modelSources[0];
    const authored = source.stagedGate.instanceVisibility;
    if (modelSources.length !== 1 || model.visibilitySpace !== 'camera-distance-wu'
      || !Number.isFinite(model.visibilityStartWU) || !Number.isFinite(model.visibilityEndWU)
      || !Array.isArray(model.objectKeys) || model.objectKeys.length !== 1 || model.objectKeys[0] !== source.objectKey
      || meta.source.objects.filter((object) => object?.modelKey === model.key).length !== 1
      || !Array.isArray(authored) || !authored.length
      || source.stagedGate.objectKey !== source.objectKey || source.stagedGate.modelKey !== model.key
      || source.stagedGate.measurement !== 'evaluated-component-apertures') {
      return fail('Instance visibility must bind all measured components of its physical parent host.');
    }
    for (const [apertureIndex, original] of authored.entries()) {
      const binding = table.bindings[bindingIndex];
      if (!binding || binding.id !== bindingIndex || binding.modelId !== model.id || binding.modelKey !== model.key
        || binding.objectKey !== source.objectKey || binding.apertureId !== apertureIndex + 1
        || original?.apertureId !== binding.apertureId
        || WINDOW_KEYS.some((key) => !Number.isFinite(binding[key]) || binding[key] !== original[key])
        || binding.startWU < 0 || binding.startWU < model.visibilityStartWU
        || binding.endWU > model.visibilityEndWU || binding.endWU <= binding.startWU
        || binding.entranceHandoffWU <= 0 || binding.exitHandoffWU <= 0
        || binding.entranceHandoffWU + binding.exitHandoffWU > binding.endWU - binding.startWU) {
        return fail('Every child needs its exact component ID, finite enclosed physical bounds, and independent positive fades.');
      }
      bindingIndex += 1;
    }
    if (cameraTrack !== null) {
      const modelPassages = passages.filter((passage) => passage.modelKey === model.key);
      const passage = modelPassages[0];
      if (modelPassages.length !== 1 || passage.objectKey !== source.objectKey
        || passage.evaluatedMeshSha256 !== source.stagedGate.evaluatedMeshSha256
        || !Array.isArray(passage.apertures) || passage.apertures.length !== authored.length
        || passage.apertures.some((aperture, index) => aperture?.id !== index + 1)
        || !Array.isArray(passage.instanceVisibility) || passage.instanceVisibility.length !== authored.length
        || authored.some((window, index) => window.apertureId !== passage.instanceVisibility[index]?.apertureId
          || WINDOW_KEYS.some((key) => window[key] !== passage.instanceVisibility[index]?.[key]))) {
        return fail('The verified camera aperture census and source instance windows must match the binding table.');
      }
    }
  }
  if (bindingIndex !== table.bindings.length) return fail('The binding table contains an undeclared source component.');
  return [];
}

// Call only after the supplied files have passed their declared SHA-256 checks.
// The returned array follows master source order; selection/reordering happens once at decode.
export function decodeAboutInstanceVisibility(meta, bindingBytes, surfelBytes) {
  if (meta?.instanceVisibility === undefined && meta?.files?.instanceVisibility === undefined) {
    if (bindingBytes != null) throw new Error('An undeclared instance visibility file was supplied.');
    return null;
  }
  const diagnostics = aboutInstanceVisibilityDiagnostics(meta);
  if (diagnostics.length) throw new Error(diagnostics[0].message);
  const bytes = bytesView(bindingBytes);
  const surfels = bytesView(surfelBytes);
  const count = meta.files.instanceVisibility.count;
  if (!bytes || bytes.byteLength !== count * 2 || !surfels || surfels.byteLength !== count * 32) {
    throw new Error('Instance visibility and surfel byte lengths do not match their point count.');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const points = new DataView(surfels.buffer, surfels.byteOffset, surfels.byteLength);
  const bindings = meta.instanceVisibility.bindings;
  const boundModelIds = new Set(bindings.map((binding) => binding.modelId));
  const partIds = bindings.map((binding) => meta.models[binding.modelId].objectKeys.indexOf(binding.objectKey));
  const counts = new Uint32Array(bindings.length);
  const ids = new Uint16Array(count);
  for (let index = 0; index < count; index += 1) {
    const id = view.getUint16(index * 2, true);
    const pointModelId = points.getUint16(index * 32 + 20, true);
    if (id === ABOUT_INSTANCE_VISIBILITY_UNBOUND) {
      if (boundModelIds.has(pointModelId)) throw new Error('A declaring host point has no authored component visibility binding.');
    } else {
      if (id >= bindings.length || pointModelId !== bindings[id].modelId
        || points.getUint16(index * 32 + 22, true) !== partIds[id]) {
        throw new Error('A point has an unknown or foreign-host visibility binding.');
      }
      counts[id] += 1;
    }
    ids[index] = id;
  }
  if (counts.some((countForBinding) => countForBinding === 0)) throw new Error('An authored gate component has no bound source points.');
  return ids;
}

export function resolveAboutInstanceVisibilityWindows(meta, journeyMap) {
  const convert = (distanceWU) => distanceWU / journeyMap.pathLengthWU * journeyMap.durationWU;
  return Object.freeze((meta?.instanceVisibility?.bindings || []).map((binding) => Object.freeze({
    ...binding,
    cameraStartWU: binding.startWU, cameraEndWU: binding.endWU,
    cameraEntranceHandoffWU: binding.entranceHandoffWU, cameraExitHandoffWU: binding.exitHandoffWU,
    startWU: convert(binding.startWU), endWU: convert(binding.endWU),
    entranceHandoffWU: convert(binding.entranceHandoffWU), exitHandoffWU: convert(binding.exitHandoffWU),
    visibilitySpace: 'camera-distance-wu', source: 'blender-authored-instance-camera-distance',
  })));
}
