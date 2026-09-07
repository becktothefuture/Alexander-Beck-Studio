import { useEffect, useState } from 'react';

const ASSET_ROOT = '/__about-blender-preview';
const META_URL = `${ASSET_ROOT}/meta.json`;
const POLL_INTERVAL_MS = 1000;
const EMPTY_PREVIEW = Object.freeze({
  status: 'inactive',
  sourceFile: '',
  sourceSha: '',
  expectedSourceSha: '',
  bundleHash: '',
  activeSource: '',
  sourceMatches: false,
  controlCount: 0,
  assetRoot: '',
  cameraFog: null,
});
const INITIAL_PREVIEW = __DEV__
  ? Object.freeze({ ...EMPTY_PREVIEW, status: 'loading' })
  : EMPTY_PREVIEW;

function previewFromMetadata(metadata) {
  const selection = metadata?.preview || {};
  const sourceSha = String(metadata?.source?.sha256 || '');
  if (!sourceSha) throw new Error(selection.message || 'The Blender preview has no validated scene.');
  if (!selection.bundleHash || !selection.assetRoot) {
    throw new Error('The Blender preview has no verified bundle identity.');
  }
  const sourceFog = metadata?.source?.authoring?.cameraFog;
  const cameraFog = sourceFog
    && Number.isFinite(Number(sourceFog.startWU))
    && Number.isFinite(Number(sourceFog.endWU))
    && Number.isFinite(Number(sourceFog.curve))
    ? Object.freeze({
      startWU: Number(sourceFog.startWU),
      endWU: Number(sourceFog.endWU),
      curve: Number(sourceFog.curve),
    })
    : null;
  return Object.freeze({
    status: selection.status || 'ready',
    sourceFile: String(metadata?.source?.file || ''),
    sourceSha,
    expectedSourceSha: String(selection.expectedSourceSha || ''),
    bundleHash: String(selection.bundleHash),
    activeSource: String(selection.activeSource || ''),
    sourceMatches: selection.sourceMatches === true,
    message: String(selection.message || ''),
    controlCount: Object.keys(metadata?.source?.authoring?.controlValues || {}).length,
    assetRoot: String(selection.assetRoot),
    cameraFog,
  });
}

export function useAboutBlenderDevRefresh() {
  const [preview, setPreview] = useState(INITIAL_PREVIEW);

  useEffect(() => {
    if (!__DEV__) return undefined;
    let active = true;
    let timer = 0;
    let current = INITIAL_PREVIEW;

    const update = (next) => {
      if (!active) return;
      const changed = next.status !== current.status
        || next.sourceSha !== current.sourceSha
        || next.bundleHash !== current.bundleHash
        || next.activeSource !== current.activeSource
        || next.expectedSourceSha !== current.expectedSourceSha
        || next.cameraFog?.startWU !== current.cameraFog?.startWU
        || next.cameraFog?.endWU !== current.cameraFog?.endWU
        || next.cameraFog?.curve !== current.cameraFog?.curve
        || next.message !== current.message;
      current = next;
      if (changed) setPreview(next);
    };

    const schedule = () => {
      if (active) timer = window.setTimeout(checkSource, POLL_INTERVAL_MS);
    };
    const checkSource = async () => {
      if (!active) return;
      if (document.hidden) {
        schedule();
        return;
      }
      try {
        const response = await fetch(`${META_URL}?blender-preview=${Date.now()}`, {
          cache: 'no-store',
        });
        if (!response.ok) throw new Error(`Preview manifest returned ${response.status}.`);
        const next = previewFromMetadata(await response.json());
        update(next);
      } catch (error) {
        update(current.sourceSha ? {
          ...current,
          status: 'stale',
          message: error.message,
        } : {
          ...EMPTY_PREVIEW,
          status: 'unavailable',
          message: error.message,
        });
      }
      schedule();
    };

    void checkSource();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  return preview;
}
