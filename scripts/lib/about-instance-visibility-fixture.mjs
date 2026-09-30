import { createHash } from 'node:crypto';

const sha256 = (bytes) => createHash('sha256').update(new Uint8Array(bytes.buffer ?? bytes, bytes.byteOffset ?? 0, bytes.byteLength)).digest('hex');

// Synthetic binding fixture only: this does not certify source gate geometry.
export function attachInstanceVisibility(fixture, { windows, startWU, endWU, hosts } = {}) {
  const { meta, surfelBytes } = fixture;
  const camera = JSON.parse(new TextDecoder().decode(fixture.cameraTrackBytes));
  const declarations = [...(hosts || [{ modelKey: 'about.05', windows, startWU, endWU }])]
    .sort((a, b) => a.modelKey.localeCompare(b.modelKey));
  const bindings = [];
  const byModel = new Map();
  const passages = [];
  meta.source.objects ||= [];
  for (const host of declarations) {
    const model = meta.models.find((item) => item.key === host.modelKey);
    Object.assign(model, { visibilitySpace: 'camera-distance-wu', visibilityStartWU: host.startWU,
      visibilityEndWU: host.endWU, visibilityHandoffWU: Math.min(0.3, (host.endWU - host.startWU) / 4) });
    model.objectKeys ||= [model.key === 'about.05' ? 'fixture.method' : `fixture.${model.key}`];
    const objectKey = model.objectKeys[0];
    let source = meta.source.objects.find((item) => item.objectKey === objectKey);
    if (!source) { source = { objectKey }; meta.source.objects.push(source); }
    source.modelKey = model.key;
    const passage = { objectKey, modelKey: model.key, measurement: 'evaluated-component-apertures',
      evaluatedMeshSha256: 'd'.repeat(64), instanceVisibility: structuredClone(host.windows),
      apertures: host.windows.map((window) => ({ id: window.apertureId })) };
    source.stagedGate = { ...passage };
    delete source.stagedGate.apertures;
    passages.push(passage);
    byModel.set(model.id, { start: bindings.length, count: host.windows.length, ordinal: 0 });
    for (const window of host.windows) bindings.push({
      id: bindings.length, modelId: model.id, modelKey: model.key, objectKey, ...window,
    });
  }
  camera.stagedGatePassages = passages;
  fixture.cameraTrackBytes = new TextEncoder().encode(JSON.stringify(camera)).buffer;
  meta.files.cameraTrack = { file: 'camera-track.json', bytes: fixture.cameraTrackBytes.byteLength, sha256: sha256(fixture.cameraTrackBytes) };
  const count = surfelBytes.byteLength / 32;
  meta.files.surfels.count = count;
  const points = new DataView(surfelBytes.buffer ?? surfelBytes, surfelBytes.byteOffset ?? 0, surfelBytes.byteLength);
  fixture.instanceVisibilityBytes = new ArrayBuffer(count * 2);
  const view = new DataView(fixture.instanceVisibilityBytes);
  for (let index = 0; index < count; index += 1) {
    const host = byModel.get(points.getUint16(index * 32 + 20, true));
    view.setUint16(index * 2, host ? host.start + host.ordinal++ % host.count : 65535, true);
  }
  meta.instanceVisibility = { schema: 'about-gate-instance-visibility/v1', visibilitySpace: 'camera-distance-wu',
    unboundValue: 65535, bindings };
  meta.files.instanceVisibility = { file: 'instance-visibility.bin', encoding: 'uint16-le', count,
    bytes: count * 2, sha256: sha256(fixture.instanceVisibilityBytes) };
  return fixture;
}
