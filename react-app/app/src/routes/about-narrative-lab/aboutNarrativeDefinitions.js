import {
  ABOUT_NARRATIVE_CORRESPONDENCE_MODES,
} from './aboutNarrativeCorrespondenceRegistry.js';

export { ABOUT_NARRATIVE_CORRESPONDENCE_MODES };

export const ABOUT_NARRATIVE_SCHEMA_VERSION = 2;
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
export const ABOUT_NARRATIVE_DISCIPLINE_BALL_TOKENS = Object.freeze([
  '--ball-1',
  '--ball-4',
  '--ball-3',
  '--ball-7',
  '--ball-8',
  '--ball-6',
]);
export const ABOUT_NARRATIVE_DISCIPLINE_ANCHORS = Object.freeze([
  Object.freeze({ group: 1, x: 0.5, y: 0.918 }),
  Object.freeze({ group: 2, x: 0.56, y: 0.934 }),
  Object.freeze({ group: 3, x: 0.47, y: 0.95 }),
  Object.freeze({ group: 4, x: 0.55, y: 0.967 }),
  Object.freeze({ group: 5, x: 0.43, y: 0.984 }),
  Object.freeze({ group: 6, x: 0.54, y: 0.999 }),
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
  'linear',
  'smoothstep',
  'ease-in-out',
]);
function numberControl(id, label, min, max, step, unit = '', group = '') {
  return Object.freeze({ id, label, type: 'range', min, max, step, unit, group });
}

export const ABOUT_NARRATIVE_WORLD_CONTROL_GROUPS = Object.freeze([
  Object.freeze({ id: 'world-setup', label: 'World setup' }),
  Object.freeze({ id: 'world-placement', label: 'Placement & scale' }),
  Object.freeze({ id: 'world-transition', label: 'Transition' }),
  Object.freeze({ id: 'shape-dimensions', label: 'Shape · Dimensions' }),
  Object.freeze({ id: 'shape-distribution', label: 'Shape · Distribution' }),
  Object.freeze({ id: 'shape-surface', label: 'Shape · Surface' }),
  Object.freeze({ id: 'modifier-motion', label: 'Modifiers · Motion' }),
  Object.freeze({ id: 'modifier-appearance', label: 'Modifiers · Appearance' }),
  Object.freeze({ id: 'modifier-timing', label: 'Modifiers · Timing & input' }),
]);

export const ABOUT_NARRATIVE_TEXT_TRACK_CONTROL_GROUPS = Object.freeze([
  Object.freeze({ id: 'text-path', label: 'Titles · Travel path' }),
  Object.freeze({ id: 'text-clarity', label: 'Titles · Clarity' }),
  Object.freeze({ id: 'text-depth', label: 'Titles · Depth' }),
  Object.freeze({ id: 'text-editorial', label: 'Editorial · Reveal & layout' }),
]);

export const ABOUT_NARRATIVE_CAMERA_TRACK_CONTROL_GROUPS = Object.freeze([
  Object.freeze({ id: 'camera-travel', label: 'Camera · Travel & lens' }),
]);

export const ABOUT_NARRATIVE_CAMERA_KEY_CONTROLS = Object.freeze([
  numberControl('distanceFogStartWU', 'Fog begins', 0, 40, 0.1, 'WU'),
  numberControl('distanceFogEndWU', 'Fully faded', 0.1, 80, 0.1, 'WU'),
]);

export const ABOUT_NARRATIVE_DISCIPLINE_REVEAL_CONTROLS = Object.freeze([
  numberControl('fieldTravelStart', 'Field scroll start', 0, 3.8, 0.01, '× section'),
  numberControl('fieldTravelEnd', 'Field scroll end', 0.1, 4, 0.01, '× section'),
  numberControl('fieldTravelWU', 'Field scroll distance', 0, 12, 0.1, 'WU'),
  numberControl('fieldFogStartWU', 'Distance fog begins', 0, 20, 0.1, 'WU'),
  numberControl('fieldFogEndWU', 'Distance fog resolves', 0.5, 30, 0.1, 'WU'),
  numberControl('fieldFogStrength', 'Distance fog strength', 0, 1, 0.01),
  numberControl('start', 'Reveal start', 0, 0.8, 0.005),
  numberControl('end', 'Label exit', 0.2, 4, 0.005),
  numberControl('stagger', 'Stagger', 0.02, 0.16, 0.005),
  numberControl('backgroundFade', 'Grid fade duration', 0.02, 0.4, 0.005),
  numberControl('backgroundOpacity', 'Resting grid opacity', 0, 0.4, 0.01),
  numberControl('reconnectOpacity', 'Editorial grid opacity', 0, 0.6, 0.01),
  numberControl('pointScale', 'Active point size', 1, 8, 0.05, '×'),
  numberControl('labelOffsetPx', 'Label offset', 0, 64, 1, 'px'),
  numberControl('labelScale', 'Label size', 0.5, 2, 0.05, '×'),
  numberControl('labelDuration', 'Label reveal duration', 0.02, 0.25, 0.005),
  numberControl('hold', 'Editorial hold', 0, 2, 0.005),
]);

export const ABOUT_NARRATIVE_GLOBAL_CONTROLS = Object.freeze([
  Object.freeze({
    id: 'sequence',
    label: 'Sequence',
    controls: Object.freeze([
      numberControl('scrollSmoothing', 'Scroll smoothing', 0, 1, 0.01),
      numberControl('readingWidthRem', 'Reading width', 30, 90, 1, 'rem', 'text-editorial'),
      numberControl('editorialRevealThreshold', 'Reveal viewport line', 0.5, 0.95, 0.01, '×H', 'text-editorial'),
    ]),
  }),
  Object.freeze({
    id: 'camera',
    label: 'Camera',
    controls: Object.freeze([
      numberControl('cadence', 'Forward cadence', 0.25, 2, 0.01, 'WU', 'camera-travel'),
      numberControl('fov', 'Field of view', 25, 80, 1, '°', 'camera-travel'),
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
      numberControl('startY', 'Entry Y', -500, 500, 2, 'px', 'text-path'),
      numberControl('openerStartY', 'Opener Y', -500, 500, 2, 'px', 'text-path'),
      numberControl('endY', 'Exit Y', -500, 500, 2, 'px', 'text-path'),
      numberControl('readableStart', 'Clear-in point', 0, 1, 0.01, '', 'text-clarity'),
      numberControl('readableEnd', 'Clear-out point', 0, 1, 0.01, '', 'text-clarity'),
      numberControl('maxBlur', 'Maximum blur', 0, 100, 1, 'px', 'text-clarity'),
      numberControl('perspective', 'Perspective', 1400, 3200, 20, 'px', 'text-depth'),
      numberControl('entryDepth', 'Entry depth (−Z)', 0, 3000, 10, 'px', 'text-depth'),
      numberControl('exitDepth', 'Exit depth (+Z)', 0, 3000, 10, 'px', 'text-depth'),
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
      numberControl('radius', 'Radius', 0.1, 16, 0.05, 'WU', 'shape-dimensions'),
      numberControl('density', 'Presence', 0.02, 1, 0.01, '', 'shape-distribution'),
    ]),
  }),
  'turbulent-field-v1': Object.freeze({
    id: 'turbulent-field-v1',
    label: 'Turbulent field',
    description: 'An uneven volumetric cloud with dense organic chunks and open pockets.',
    adapterId: 'point-field-v1',
    cost: 1,
    parameters: Object.freeze([
      numberControl('width', 'Width', 1, 48, 0.1, 'WU', 'shape-dimensions'),
      numberControl('height', 'Height', 0.5, 28, 0.1, 'WU', 'shape-dimensions'),
      numberControl('depth', 'Depth', 1, 56, 0.1, 'WU', 'shape-dimensions'),
      numberControl('chunkCount', 'Cloud chunks', 3, 32, 1, '', 'shape-distribution'),
      numberControl('chunkSize', 'Chunk size', 0.1, 8, 0.05, 'WU', 'shape-distribution'),
      numberControl('scatter', 'Loose particles', 0, 1.5, 0.01, '', 'shape-distribution'),
      numberControl('density', 'Presence', 0.02, 1, 0.01, '', 'shape-distribution'),
      numberControl('turbulence', 'Organic warp', 0, 4, 0.01, 'WU', 'shape-surface'),
    ]),
  }),
  'calm-field-v1': Object.freeze({
    id: 'calm-field-v1',
    label: 'Calm field',
    description: 'A broad horizontal field that creates an open clearing.',
    adapterId: 'point-field-v1',
    cost: 1,
    parameters: Object.freeze([
      numberControl('width', 'Width', 1, 48, 0.1, 'WU', 'shape-dimensions'),
      numberControl('depth', 'Depth', 1, 56, 0.1, 'WU', 'shape-dimensions'),
      numberControl('height', 'Height', -16, 16, 0.05, 'WU', 'shape-dimensions'),
      numberControl('jitter', 'Jitter', 0, 2, 0.005, 'WU', 'shape-distribution'),
      numberControl('density', 'Presence', 0.02, 1, 0.01, '', 'shape-distribution'),
    ]),
  }),
  'discipline-grid-v1': Object.freeze({
    id: 'discipline-grid-v1',
    label: 'Discipline grid',
    description: 'A frontal field with six emphasised anchor points.',
    adapterId: 'point-field-v1',
    cost: 1,
    parameters: Object.freeze([
      numberControl('width', 'Width', 1, 48, 0.1, 'WU', 'shape-dimensions'),
      numberControl('height', 'Height', 1, 32, 0.1, 'WU', 'shape-dimensions'),
      numberControl('depthJitter', 'Depth jitter', 0, 3, 0.005, 'WU', 'shape-surface'),
      numberControl('density', 'Presence', 0.02, 1, 0.01, '', 'shape-distribution'),
    ]),
  }),
  'living-field-v1': Object.freeze({
    id: 'living-field-v1',
    label: 'Living field',
    description: 'A terrain-like field designed for waves and colour movement.',
    adapterId: 'point-field-v1',
    cost: 2,
    parameters: Object.freeze([
      numberControl('width', 'Width', 1, 48, 0.1, 'WU', 'shape-dimensions'),
      numberControl('depth', 'Depth', 1, 60, 0.1, 'WU', 'shape-dimensions'),
      numberControl('baseY', 'Base height', -16, 16, 0.05, 'WU', 'shape-dimensions'),
      numberControl('density', 'Presence', 0.02, 1, 0.01, '', 'shape-distribution'),
      numberControl('terrainX', 'X terrain', 0, 4, 0.01, '', 'shape-surface'),
      numberControl('terrainZ', 'Z terrain', 0, 4, 0.01, '', 'shape-surface'),
    ]),
  }),
  'bust-v1': Object.freeze({
    id: 'bust-v1',
    label: 'Point bust',
    description: 'The authored point-cloud bust used for the final epilogue.',
    adapterId: 'point-field-v1',
    cost: 2,
    parameters: Object.freeze([
      numberControl('density', 'Presence', 0.05, 1, 0.01, '', 'shape-distribution'),
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
      numberControl('amplitude', 'Amplitude', 0, 1.5, 0.001, 'WU', 'modifier-motion'),
      numberControl('speed', 'Speed', 0, 8, 0.01, '', 'modifier-motion'),
      Object.freeze({ id: 'timeMode', label: 'Clock', type: 'select', group: 'modifier-timing', options: Object.freeze(['story', 'ambient', 'mixed']) }),
    ]),
  }),
  'swarm-life-v1': Object.freeze({
    id: 'swarm-life-v1',
    label: 'Swarm life',
    version: 1,
    cost: 1,
    reducedMotion: 'disabled',
    parameters: Object.freeze([
      numberControl('strength', 'Local strength', 0, 4, 0.01, '', 'modifier-motion'),
    ]),
  }),
  'group-emphasis-v1': Object.freeze({
    id: 'group-emphasis-v1',
    label: 'Group emphasis',
    version: 1,
    cost: 1,
    reducedMotion: 'settled',
    parameters: Object.freeze([
      numberControl('strength', 'Strength', 0, 8, 0.05, '', 'modifier-appearance'),
    ]),
  }),
  'discipline-isolation-v1': Object.freeze({
    id: 'discipline-isolation-v1',
    label: 'Discipline isolation',
    version: 1,
    cost: 1,
    reducedMotion: 'settled',
    parameters: Object.freeze([
      numberControl('strength', 'Isolation', 0, 1, 0.01, '', 'modifier-appearance'),
      numberControl('backgroundOpacity', 'Background opacity', 0, 1, 0.01, '', 'modifier-appearance'),
      numberControl('backgroundScale', 'Background point scale', 0.02, 2.5, 0.01, '×', 'modifier-appearance'),
    ]),
  }),
  'living-wave-v1': Object.freeze({
    id: 'living-wave-v1',
    label: 'Living wave',
    version: 1,
    cost: 2,
    reducedMotion: 'settled',
    parameters: Object.freeze([
      numberControl('strength', 'Strength', 0, 3, 0.01, '', 'modifier-motion'),
      numberControl('amplitude', 'Amplitude', 0, 3, 0.01, 'WU', 'modifier-motion'),
      numberControl('speed', 'Speed', 0, 8, 0.01, '', 'modifier-motion'),
      numberControl('frequencyX', 'X frequency', 0.02, 8, 0.01, '', 'modifier-motion'),
      numberControl('frequencyZ', 'Z frequency', 0.02, 8, 0.01, '', 'modifier-motion'),
      Object.freeze({ id: 'timeMode', label: 'Clock', type: 'select', group: 'modifier-timing', options: Object.freeze(['story', 'ambient', 'mixed']) }),
    ]),
  }),
  'living-colour-v1': Object.freeze({
    id: 'living-colour-v1',
    label: 'Living colour',
    version: 1,
    cost: 1,
    reducedMotion: 'settled',
    parameters: Object.freeze([
      numberControl('strength', 'Strength', 0, 1, 0.01, '', 'modifier-appearance'),
      Object.freeze({ id: 'timeMode', label: 'Clock', type: 'select', group: 'modifier-timing', options: Object.freeze(['story', 'ambient', 'mixed']) }),
    ]),
  }),
  'bust-yaw-v1': Object.freeze({
    id: 'bust-yaw-v1',
    label: 'Bust rotation',
    version: 1,
    cost: 1,
    reducedMotion: 'manual-only',
    parameters: Object.freeze([
      numberControl('speed', 'Auto rotation', 0, 0.5, 0.001, '', 'modifier-motion'),
      numberControl('dragSensitivity', 'Drag sensitivity', 0.05, 5, 0.05, '', 'modifier-timing'),
      numberControl('resumeDelay', 'Resume delay', 0, 15, 0.1, 's', 'modifier-timing'),
      numberControl('resumeBlend', 'Resume blend', 0.05, 15, 0.05, 's', 'modifier-timing'),
      Object.freeze({ id: 'timeMode', label: 'Clock', type: 'select', group: 'modifier-timing', options: Object.freeze(['ambient']) }),
    ]),
  }),
});

export const ABOUT_NARRATIVE_INTERACTION_DEFINITIONS = Object.freeze({
  'discipline-reveal': Object.freeze({
    id: 'discipline-reveal',
    label: 'Discipline reveal',
    defaultParameters: Object.freeze({
      fieldTravelDurationWU: 3.744,
      fieldTravelWU: 9.6,
      fieldFogStartWU: 4.2,
      fieldFogEndWU: 8.4,
      fieldFogStrength: 0.12,
      labelWindowWU: 1.62,
      staggerWU: 0.135,
      backgroundFadeWU: 0.216,
      backgroundOpacity: 0.2,
      backgroundScale: 0.58,
      reconnectOpacity: 0.24,
      pointScale: 1.35,
      restoreDurationWU: 0.72,
      labelOffsetPx: 10,
      labelScale: 1,
      labelDurationWU: 0.162,
      holdWU: 0.72,
      items: Object.freeze([
        Object.freeze({ group: 1, label: 'Product Design' }),
        Object.freeze({ group: 2, label: 'Experience Design' }),
        Object.freeze({ group: 3, label: 'Art Direction' }),
        Object.freeze({ group: 4, label: 'Motion & 3D' }),
        Object.freeze({ group: 5, label: 'Creative Engineering' }),
        Object.freeze({ group: 6, label: 'Parametric Systems' }),
      ]),
    }),
    parameters: Object.freeze([
      numberControl('fieldTravelDurationWU', 'Field travel duration', 0.1, 10, 0.01, 'WU', 'modifier-timing'),
      numberControl('fieldTravelWU', 'Field travel distance', 0, 20, 0.1, 'WU', 'modifier-motion'),
      numberControl('fieldFogStartWU', 'Field fog begins', 0, 20, 0.1, 'WU', 'modifier-appearance'),
      numberControl('fieldFogEndWU', 'Field fog resolves', 0.1, 30, 0.1, 'WU', 'modifier-appearance'),
      numberControl('fieldFogStrength', 'Field fog strength', 0, 1, 0.01, '', 'modifier-appearance'),
      numberControl('labelWindowWU', 'Label window', 0.2, 6, 0.01, 'WU', 'modifier-timing'),
      numberControl('staggerWU', 'Label stagger', 0.01, 0.5, 0.005, 'WU', 'modifier-timing'),
      numberControl('backgroundFadeWU', 'Grid fade duration', 0.01, 1.5, 0.005, 'WU', 'modifier-timing'),
      numberControl('backgroundOpacity', 'Resting grid opacity', 0, 0.5, 0.01, '', 'modifier-appearance'),
      numberControl('backgroundScale', 'Resting grid size', 0.1, 1, 0.01, '×', 'modifier-appearance'),
      numberControl('reconnectOpacity', 'Editorial grid opacity', 0, 0.8, 0.01, '', 'modifier-appearance'),
      numberControl('pointScale', 'Discipline point size', 1, 8, 0.05, '×', 'modifier-appearance'),
      numberControl('restoreDurationWU', 'Grid restore duration', 0, 4, 0.01, 'WU', 'modifier-timing'),
      numberControl('labelOffsetPx', 'Label offset', 0, 64, 1, 'px', 'modifier-appearance'),
      numberControl('labelScale', 'Label size', 0.5, 2, 0.05, '×', 'modifier-appearance'),
      numberControl('labelDurationWU', 'Label reveal duration', 0.01, 1, 0.005, 'WU', 'modifier-timing'),
      numberControl('holdWU', 'Label hold', 0, 3, 0.005, 'WU', 'modifier-timing'),
    ]),
  }),
  'grid-ripple': Object.freeze({
    id: 'grid-ripple',
    label: 'Grid ripple',
    defaultParameters: Object.freeze({
      amplitude: 0.28,
      speed: 1.15,
      frequency: 1.3,
      centerX: 0,
      centerZ: -2.8,
      releaseWU: 0.65,
      timeMode: 'mixed',
    }),
    parameters: Object.freeze([
      numberControl('amplitude', 'Pulse amplitude', 0, 1.5, 0.01, '×', 'modifier-motion'),
      numberControl('speed', 'Speed', 0, 6, 0.01, '', 'modifier-motion'),
      numberControl('frequency', 'Ring frequency', 0.1, 4, 0.01, '', 'modifier-motion'),
      numberControl('centerX', 'Centre X', -12, 12, 0.1, 'WU', 'modifier-motion'),
      numberControl('centerZ', 'Centre Z', -16, 16, 0.1, 'WU', 'modifier-motion'),
      numberControl('releaseWU', 'Fade-out', 0, 2, 0.05, 'WU', 'modifier-timing'),
      Object.freeze({ id: 'timeMode', label: 'Clock', type: 'select', group: 'modifier-timing', options: Object.freeze(['story', 'ambient', 'mixed']) }),
    ]),
  }),
  'horizontal-spin': Object.freeze({
    id: 'horizontal-spin',
    label: 'Horizontal spin',
    defaultParameters: Object.freeze({}),
    parameters: Object.freeze([]),
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
