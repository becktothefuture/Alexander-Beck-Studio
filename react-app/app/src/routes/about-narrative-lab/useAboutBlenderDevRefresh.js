import { useEffect, useState } from 'react';
import { writeAboutNarrativeHistoryProgress } from '../about/aboutNarrativeScrollRestoration.js';

const ASSET_ROOT = '/__about-blender-preview';
const META_URL = `${ASSET_ROOT}/meta.json`;
const POLL_INTERVAL_MS = 1000;
const EMPTY_PREVIEW = Object.freeze({
  status: 'inactive',
  sourceFile: '',
  sourceSha: '',
  controlCount: 0,
  assetRoot: '',
});
const INITIAL_PREVIEW = __DEV__
  ? Object.freeze({ ...EMPTY_PREVIEW, status: 'loading' })
  : EMPTY_PREVIEW;

function previewFromMetadata(metadata) {
  const sourceSha = String(metadata?.source?.sha256 || '');
  if (!sourceSha) throw new Error('The Blender preview manifest has no source hash.');
  return Object.freeze({
    status: 'ready',
    sourceFile: String(metadata?.source?.file || ''),
    sourceSha,
    controlCount: Object.keys(metadata?.source?.authoring?.controlValues || {}).length,
    assetRoot: ASSET_ROOT,
  });
}

function saveCurrentStoryPosition() {
  const scrollport = document.querySelector('.about-narrative-scrollport');
  if (!scrollport) return;
  const travel = Math.max(0, scrollport.scrollHeight - scrollport.clientHeight);
  writeAboutNarrativeHistoryProgress(travel > 0 ? scrollport.scrollTop / travel : 0);
}

export function useAboutBlenderDevRefresh() {
  const [preview, setPreview] = useState(INITIAL_PREVIEW);

  useEffect(() => {
    if (!__DEV__) return undefined;
    let active = true;
    let timer = 0;
    let baselineSha = '';
    let lastStatus = '';

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
        if (!baselineSha) {
          baselineSha = next.sourceSha;
          if (lastStatus === 'unavailable') {
            saveCurrentStoryPosition();
            window.location.reload();
            return;
          }
          lastStatus = next.status;
          setPreview(next);
        } else if (next.sourceSha !== baselineSha) {
          saveCurrentStoryPosition();
          setPreview({ ...next, status: 'refreshing' });
          window.location.reload();
          return;
        } else if (lastStatus !== next.status) {
          lastStatus = next.status;
          setPreview(next);
        }
      } catch (error) {
        if (lastStatus !== 'unavailable') {
          lastStatus = 'unavailable';
          setPreview({
            ...EMPTY_PREVIEW,
            status: 'unavailable',
            message: error.message,
          });
        }
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
