export const ABOUT_NARRATIVE_SCHEMA_VERSION = 1;
export const ABOUT_NARRATIVE_EDITOR_HEADER = 'about-narrative-v1';
export const ABOUT_NARRATIVE_MAX_DOCUMENT_BYTES = 1024 * 1024;
export const ABOUT_NARRATIVE_MAX_TRANSITION_LOCAL = 16;

export const ABOUT_NARRATIVE_SECTION_TYPES = Object.freeze(['spatial', 'editorial', 'finale']);
export const ABOUT_NARRATIVE_TEXT_MOVEMENT_MODES = Object.freeze(['spatial', 'vertical']);
export const ABOUT_NARRATIVE_BLOCK_KINDS = Object.freeze([
  'prose',
  'highlight',
  'detail',
  'list',
  'clients',
  'disciplines',
]);
export const ABOUT_NARRATIVE_EMPHASIS_TONES = Object.freeze(['blue', 'green', 'orange']);
export const ABOUT_NARRATIVE_DISCIPLINE_TONES = Object.freeze(['green', 'blue', 'neutral', 'acid', 'orange']);
export const ABOUT_NARRATIVE_DISCIPLINE_ANCHORS = Object.freeze([
  Object.freeze({ group: 1, x: 0.14, y: 0.12 }),
  Object.freeze({ group: 2, x: 0.43, y: 0.27 }),
  Object.freeze({ group: 3, x: 0.69, y: 0.42 }),
  Object.freeze({ group: 4, x: 0.2, y: 0.58 }),
  Object.freeze({ group: 5, x: 0.49, y: 0.73 }),
  Object.freeze({ group: 6, x: 0.66, y: 0.88 }),
]);
export const ABOUT_NARRATIVE_TRANSITION_TYPES = Object.freeze([
  'morph',
  'dissolve-morph',
  'crossfade',
  'hold',
  'cut',
]);
export const ABOUT_NARRATIVE_EASINGS = Object.freeze([
  'linear',
  'smoothstep',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'hold',
]);
export const ABOUT_NARRATIVE_CAMERA_EASINGS = Object.freeze([
  'smoothstep',
  'ease-in-out',
]);
export const ABOUT_NARRATIVE_CORRESPONDENCE_MODES = Object.freeze([
  'index-v1',
  'stable-seed',
  'spatial-nearest-v1',
  'group-aware',
]);

function numberControl(id, label, min, max, step, unit = '') {
  return Object.freeze({ id, label, type: 'range', min, max, step, unit });
}

export const ABOUT_NARRATIVE_DISCIPLINE_REVEAL_CONTROLS = Object.freeze([
  numberControl('start', 'Reveal start', 0, 0.8, 0.005),
  numberControl('end', 'Label exit', 0.2, 4, 0.005),
  numberControl('stagger', 'Stagger', 0.02, 0.16, 0.005),
  numberControl('backgroundFade', 'Grid fade duration', 0.02, 0.4, 0.005),
  numberControl('backgroundOpacity', 'Resting grid opacity', 0, 0.4, 0.01),
  numberControl('pointScale', 'Active point size', 1, 8, 0.05, '×'),
  numberControl('labelOffsetPx', 'Label offset', 0, 64, 1, 'px'),
  numberControl('labelDuration', 'Label reveal duration', 0.02, 0.25, 0.005),
  numberControl('hold', 'Editorial hold', 0, 2, 0.005),
]);

export const ABOUT_NARRATIVE_GLOBAL_CONTROLS = Object.freeze([
  Object.freeze({
    id: 'sequence',
    label: 'Sequence',
    controls: Object.freeze([
      numberControl('scrollSmoothing', 'Scroll smoothing', 0, 1, 0.01),
      numberControl('readingWidthRem', 'Reading width', 42, 72, 1, 'rem'),
      numberControl('editorialRevealThreshold', 'Text reveal', 0.6, 0.9, 0.01),
    ]),
  }),
  Object.freeze({
    id: 'camera',
    label: 'Camera',
    controls: Object.freeze([
      numberControl('cadence', 'Forward cadence', 0.25, 2, 0.01, 'WU'),
      numberControl('fov', 'Field of view', 25, 80, 1, '°'),
    ]),
  }),
  Object.freeze({
    id: 'material',
    label: 'Point material',
    controls: Object.freeze([
      numberControl('opacity', 'Opacity', 0.2, 1, 0.01),
      numberControl('pointSize', 'Point size', 1.5, 7, 0.1, 'px'),
    ]),
  }),
  Object.freeze({
    id: 'swarmTurbulence',
    label: 'Shared turbulence',
    controls: Object.freeze([
      numberControl('amplitude', 'Movement range', 0, 0.25, 0.001, 'WU'),
      numberControl('speed', 'Speed', 0, 2, 0.01),
      numberControl('irregularity', 'Erratic motion', 0, 1, 0.01),
      numberControl('individuality', 'Individuality', 0, 1, 0.01),
      numberControl('axisSpread', '3D spread', 0, 1, 0.01),
    ]),
  }),
  Object.freeze({
    id: 'textMotion',
    label: 'Spatial titles',
    controls: Object.freeze([
      numberControl('durationScale', 'Travel duration', 0.75, 2.5, 0.05, '×'),
      numberControl('startY', 'Start Y', -240, 240, 2, 'px'),
      numberControl('openerStartY', 'Opener start Y', -120, 180, 2, 'px'),
      numberControl('endY', 'End Y', -240, 240, 2, 'px'),
      numberControl('readableStart', 'Clear window start', 0, 1, 0.01),
      numberControl('readableEnd', 'Clear window end', 0, 1, 0.01),
      numberControl('perspective', 'Perspective', 1400, 3200, 20, 'px'),
      numberControl('entryDepth', 'Entry depth (−Z)', 0, 1200, 10, 'px'),
      numberControl('exitDepth', 'Exit depth (+Z)', 0, 1200, 10, 'px'),
      numberControl('maxBlur', 'Maximum blur', 0, 40, 1, 'px'),
    ]),
  }),
]);

export const ABOUT_NARRATIVE_SHAPE_DEFINITIONS = Object.freeze({
  'cluster-v1': Object.freeze({
    id: 'cluster-v1',
    label: 'Cluster',
    description: 'A distant spherical cloud with a dense centre.',
    adapterId: 'point-field-v1',
    cost: 1,
    parameters: Object.freeze([
      numberControl('radius', 'Radius', 0.8, 6, 0.05, 'WU'),
      numberControl('density', 'Presence', 0.1, 1, 0.01),
    ]),
  }),
  'turbulent-field-v1': Object.freeze({
    id: 'turbulent-field-v1',
    label: 'Turbulent field',
    description: 'An uneven volumetric cloud with dense organic chunks and open pockets.',
    adapterId: 'point-field-v1',
    cost: 1,
    parameters: Object.freeze([
      numberControl('width', 'Width', 4, 24, 0.1, 'WU'),
      numberControl('height', 'Height', 2, 14, 0.1, 'WU'),
      numberControl('depth', 'Depth', 4, 28, 0.1, 'WU'),
      numberControl('chunkCount', 'Cloud chunks', 3, 14, 1),
      numberControl('chunkSize', 'Chunk size', 0.4, 4, 0.05, 'WU'),
      numberControl('scatter', 'Loose particles', 0, 0.6, 0.01),
      numberControl('turbulence', 'Organic warp', 0, 1.5, 0.01, 'WU'),
      numberControl('density', 'Presence', 0.1, 1, 0.01),
    ]),
  }),
  'calm-field-v1': Object.freeze({
    id: 'calm-field-v1',
    label: 'Calm field',
    description: 'A broad horizontal field that creates an open clearing.',
    adapterId: 'point-field-v1',
    cost: 1,
    parameters: Object.freeze([
      numberControl('width', 'Width', 4, 24, 0.1, 'WU'),
      numberControl('depth', 'Depth', 4, 28, 0.1, 'WU'),
      numberControl('height', 'Height', -5, 4, 0.05, 'WU'),
      numberControl('jitter', 'Jitter', 0, 0.4, 0.005, 'WU'),
      numberControl('density', 'Presence', 0.1, 1, 0.01),
    ]),
  }),
  'discipline-grid-v1': Object.freeze({
    id: 'discipline-grid-v1',
    label: 'Discipline grid',
    description: 'A frontal field with six emphasised anchor points.',
    adapterId: 'point-field-v1',
    cost: 1,
    parameters: Object.freeze([
      numberControl('width', 'Width', 4, 24, 0.1, 'WU'),
      numberControl('height', 'Height', 3, 16, 0.1, 'WU'),
      numberControl('depthJitter', 'Depth jitter', 0, 0.5, 0.005, 'WU'),
      numberControl('density', 'Presence', 0.1, 1, 0.01),
    ]),
  }),
  'living-field-v1': Object.freeze({
    id: 'living-field-v1',
    label: 'Living field',
    description: 'A terrain-like field designed for waves and colour movement.',
    adapterId: 'point-field-v1',
    cost: 2,
    parameters: Object.freeze([
      numberControl('width', 'Width', 4, 24, 0.1, 'WU'),
      numberControl('depth', 'Depth', 4, 30, 0.1, 'WU'),
      numberControl('baseY', 'Base height', -5, 3, 0.05, 'WU'),
      numberControl('terrainX', 'X terrain', 0, 1.2, 0.01),
      numberControl('terrainZ', 'Z terrain', 0, 1.2, 0.01),
      numberControl('density', 'Presence', 0.1, 1, 0.01),
    ]),
  }),
  'bust-v1': Object.freeze({
    id: 'bust-v1',
    label: 'Point bust',
    description: 'The authored point-cloud bust used for the final epilogue.',
    adapterId: 'point-field-v1',
    cost: 2,
    parameters: Object.freeze([
      numberControl('density', 'Presence', 0.2, 1, 0.01),
    ]),
  }),
});

export const ABOUT_NARRATIVE_MODIFIER_DEFINITIONS = Object.freeze({
  'ambient-drift-v1': Object.freeze({
    id: 'ambient-drift-v1',
    label: 'Ambient drift',
    version: 1,
    cost: 1,
    reducedMotion: 'disabled',
    parameters: Object.freeze([
      numberControl('amplitude', 'Amplitude', 0, 0.2, 0.001, 'WU'),
      numberControl('speed', 'Speed', 0, 2, 0.01),
      Object.freeze({ id: 'timeMode', label: 'Clock', type: 'select', options: Object.freeze(['story', 'ambient', 'mixed']) }),
    ]),
  }),
  'swarm-life-v1': Object.freeze({
    id: 'swarm-life-v1',
    label: 'Swarm life',
    version: 1,
    cost: 1,
    reducedMotion: 'disabled',
    parameters: Object.freeze([
      numberControl('strength', 'Local strength', 0, 1.5, 0.01),
    ]),
  }),
  'group-emphasis-v1': Object.freeze({
    id: 'group-emphasis-v1',
    label: 'Group emphasis',
    version: 1,
    cost: 1,
    reducedMotion: 'settled',
    parameters: Object.freeze([
      numberControl('strength', 'Strength', 0, 4, 0.05),
    ]),
  }),
  'living-wave-v1': Object.freeze({
    id: 'living-wave-v1',
    label: 'Living wave',
    version: 1,
    cost: 2,
    reducedMotion: 'settled',
    parameters: Object.freeze([
      numberControl('strength', 'Strength', 0, 1.4, 0.01),
      numberControl('amplitude', 'Amplitude', 0, 0.6, 0.01, 'WU'),
      numberControl('speed', 'Speed', 0, 2, 0.01),
      numberControl('frequencyX', 'X frequency', 0.1, 3, 0.01),
      numberControl('frequencyZ', 'Z frequency', 0.1, 3, 0.01),
      Object.freeze({ id: 'timeMode', label: 'Clock', type: 'select', options: Object.freeze(['story', 'ambient', 'mixed']) }),
    ]),
  }),
  'living-colour-v1': Object.freeze({
    id: 'living-colour-v1',
    label: 'Living colour',
    version: 1,
    cost: 1,
    reducedMotion: 'settled',
    parameters: Object.freeze([
      numberControl('strength', 'Strength', 0, 1, 0.01),
      Object.freeze({ id: 'timeMode', label: 'Clock', type: 'select', options: Object.freeze(['story', 'ambient', 'mixed']) }),
    ]),
  }),
  'bust-yaw-v1': Object.freeze({
    id: 'bust-yaw-v1',
    label: 'Bust rotation',
    version: 1,
    cost: 1,
    reducedMotion: 'manual-only',
    parameters: Object.freeze([
      numberControl('speed', 'Auto rotation', 0, 0.12, 0.001),
      numberControl('dragSensitivity', 'Drag sensitivity', 0.3, 1.8, 0.05),
      numberControl('resumeDelay', 'Resume delay', 0, 5, 0.1, 's'),
      numberControl('resumeBlend', 'Resume blend', 0.1, 5, 0.1, 's'),
      Object.freeze({ id: 'timeMode', label: 'Clock', type: 'select', options: Object.freeze(['ambient']) }),
    ]),
  }),
});

export const ABOUT_NARRATIVE_ADAPTER_DEFINITIONS = Object.freeze({
  'point-field-v1': Object.freeze({
    id: 'point-field-v1',
    label: 'Point field',
    version: 1,
    capabilities: Object.freeze({
      morph: true,
      crossfade: false,
      interaction: true,
      reducedMotion: true,
      shapeKinds: Object.freeze(Object.keys(ABOUT_NARRATIVE_SHAPE_DEFINITIONS)),
    }),
  }),
});

export function getAboutNarrativeShapeDefinition(shapeId) {
  return ABOUT_NARRATIVE_SHAPE_DEFINITIONS[shapeId] || null;
}

export function getAboutNarrativeModifierDefinition(modifierId) {
  return ABOUT_NARRATIVE_MODIFIER_DEFINITIONS[modifierId] || null;
}

export function resolveAboutNarrativeSwarmMotion(parameters = {}, profile = {}) {
  const numberOr = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const strength = Math.max(0, numberOr(parameters.strength, 1));
  return {
    strength,
    amplitude: numberOr(profile.amplitude, 0.05) * strength,
    speed: numberOr(profile.speed, 0.52),
    irregularity: numberOr(profile.irregularity, 0.74),
    individuality: numberOr(profile.individuality, 0.92),
    axisSpread: numberOr(profile.axisSpread, 0.9),
    storyMix: 0,
  };
}

export function getAboutNarrativeAdapterDefinition(adapterId) {
  return ABOUT_NARRATIVE_ADAPTER_DEFINITIONS[adapterId] || null;
}
