function pathParts(path) {
  return String(path || '')
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);
}

function indexedItem(parts, collectionName, collection) {
  const marker = parts.indexOf(collectionName);
  if (marker < 0) return null;
  const token = parts[marker + 1];
  if (/^\d+$/.test(token || '')) return collection?.[Number(token)] || null;
  return collection?.find((item) => item?.id === token) || null;
}

function getPointFieldTarget(document, parts) {
  const pointField = document?.tracks?.pointField;
  if (!pointField) return null;
  const candidates = [
    ['stateDefinitions', 'point-field-state'],
    ['keys', 'point-field-key'],
    ['segments', 'point-field-segment'],
  ];
  for (const [name, type] of candidates) {
    const item = indexedItem(parts, name, pointField[name]);
    if (item?.id) {
      const key = type === 'point-field-key' ? item : null;
      const segmentFromKey = type === 'point-field-segment'
        ? pointField.keys?.find((entry) => entry.id === item.fromKeyId)
        : null;
      return {
        selection: { type, id: item.id },
        storyWU: Number(key?.atWU ?? segmentFromKey?.atWU),
        label: item.label || item.id,
      };
    }
  }
  return null;
}

const TRACK_PATHS = Object.freeze([
  ['camera', 'moveKeys', 'camera-key'],
  ['camera', 'lookKeys', 'camera-orientation-key'],
  ['camera', 'lensKeys', 'camera-lens-key'],
  ['visibility', 'keys', 'visibility-key'],
  ['text', 'fields', 'text-field'],
  ['interactions', 'clips', 'interaction'],
  ['worlds', 'objects', 'world'],
]);

export function resolveAboutDirectorDiagnostic(document, diagnostic) {
  const parts = pathParts(diagnostic?.path);
  const pointField = getPointFieldTarget(document, parts);
  if (pointField) {
    return {
      ...pointField,
      property: parts.at(-1) || 'document',
      focusId: `diagnostic:${diagnostic.path}`,
    };
  }

  for (const [trackName, collectionName, type] of TRACK_PATHS) {
    const trackMarker = parts.indexOf(trackName);
    if (trackMarker < 0) continue;
    const collection = document?.tracks?.[trackName]?.[collectionName];
    const item = indexedItem(parts.slice(trackMarker), collectionName, collection)
      || collection?.find((entry) => entry?.id === parts[trackMarker + 1]);
    if (!item?.id) continue;
    return {
      selection: { type, id: item.id },
      storyWU: Number(type.startsWith('camera-') || type === 'camera-key' || type === 'visibility-key' ? item.atWU : item.focusWU ?? item.startWU),
      label: item.label || item.text || item.id,
      property: parts.at(-1) || 'document',
      focusId: `diagnostic:${diagnostic.path}`,
    };
  }

  return {
    selection: { type: 'track', id: parts.includes('text') ? 'text' : parts.includes('pointField') ? 'point-field' : 'camera' },
    storyWU: Number.NaN,
    label: 'Document',
    property: parts.at(-1) || 'document',
    focusId: `diagnostic:${diagnostic?.path || 'document'}`,
  };
}

export function describeAboutDirectorDiagnostic(document, diagnostic) {
  const resolved = resolveAboutDirectorDiagnostic(document, diagnostic);
  const objectType = resolved.selection.type.replace(/-/g, ' ');
  return {
    ...resolved,
    severity: diagnostic.level || 'notice',
    object: resolved.label === 'Document' ? 'Document' : `${objectType} · ${resolved.label}`,
    message: diagnostic.message || 'No message supplied.',
  };
}

export function createAnnouncementDeduper() {
  let previous = '';
  return (message) => {
    const next = String(message || '').trim();
    if (!next || next === previous) return '';
    previous = next;
    return next;
  };
}
