import {
  ABOUT_NARRATIVE_CORRESPONDENCE_MODES,
} from './aboutNarrativeCorrespondenceRegistry.js';

const DISPATCH_KEYS = Object.freeze({
  'index-v1': 'identity',
  'stable-seed': 'identity',
  'spatial-nearest-v1': 'spatialV1',
  'spatial-nearest-v2': 'spatialV2',
  'radial-emergence-v1': 'radialEmergenceV1',
  'group-aware': 'groupAwareV1',
});

const dispatchIds = Object.keys(DISPATCH_KEYS).sort();
const metadataIds = [...ABOUT_NARRATIVE_CORRESPONDENCE_MODES].sort();
if (dispatchIds.length !== metadataIds.length
  || dispatchIds.some((id, index) => id !== metadataIds[index])) {
  throw new Error('Correspondence metadata and executable dispatch IDs are inconsistent.');
}
export const ABOUT_NARRATIVE_CORRESPONDENCE_DISPATCH_IDS = Object.freeze(dispatchIds);

export function getAboutNarrativeCorrespondenceDispatchKey(id) {
  const key = DISPATCH_KEYS[id];
  if (!key) throw new Error(`Unknown correspondence strategy: ${String(id)}.`);
  return key;
}
