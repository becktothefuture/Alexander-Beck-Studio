import {
  ABOUT_NARRATIVE_CORRESPONDENCE_MODES,
} from './aboutNarrativeCorrespondenceRegistry.js';
import {
  ABOUT_NARRATIVE_DISCIPLINE_LAYOUT_DEFAULTS,
  getAboutNarrativeDisciplinePosition,
} from './aboutNarrativeDisciplinePositions.js';
export { ABOUT_NARRATIVE_CORRESPONDENCE_MODES };

export const ABOUT_NARRATIVE_SCHEMA_VERSION = 2;
export const ABOUT_NARRATIVE_EDITOR_HEADER = 'about-narrative-v1';
export const ABOUT_NARRATIVE_MAX_DOCUMENT_BYTES = 1024 * 1024;
export const ABOUT_NARRATIVE_MAX_TRANSITION_LOCAL = 16;

export const ABOUT_NARRATIVE_SECTION_TYPES = Object.freeze(['spatial', 'editorial', 'finale']);
export const ABOUT_NARRATIVE_TEXT_MOVEMENT_MODES = Object.freeze(['spatial', 'vertical']);
export const ABOUT_NARRATIVE_TITLE_STYLES = Object.freeze(['standard', 'display']);
export const ABOUT_NARRATIVE_BLOCK_KINDS = Object.freeze([
  'prose',
  'highlight',
  'detail',
  'list',
  'clients',
  'disciplines',
  'stack',
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
const DISCIPLINE_DESKTOP_COLUMNS = 127;
const DISCIPLINE_DESKTOP_ROWS = 95;
const DISCIPLINE_DESKTOP_CELLS = Object.freeze([
  Object.freeze([43, 58]),
  Object.freeze([52, 58]),
  Object.freeze([43, 59]),
  Object.freeze([52, 59]),
  Object.freeze([43, 60]),
  Object.freeze([52, 60]),
]);

export const ABOUT_NARRATIVE_DISCIPLINE_FORMATION_DEFAULTS = Object.freeze({
  formationColumn: 43,
  formationRow: 54,
});

function createDisciplineAnchorGrid(cells, columns, gridRows) {
  return Object.freeze(cells.map(([column, row], index) => Object.freeze({
    group: index + 1,
    x: column / Math.max(1, columns - 1),
    y: row / Math.max(1, gridRows - 1),
  })));
}

// Desktop uses two columns by three rows in the lower reading corridor. Every
// label is still projected from its exact semantic point in the floor grid.
export const ABOUT_NARRATIVE_DISCIPLINE_ANCHORS = createDisciplineAnchorGrid(
  DISCIPLINE_DESKTOP_CELLS,
  DISCIPLINE_DESKTOP_COLUMNS,
  DISCIPLINE_DESKTOP_ROWS,
);
// The compact renderer keeps both members of each reveal pair inside the
// portrait camera corridor.
export const ABOUT_NARRATIVE_DISCIPLINE_MOBILE_ANCHORS = createDisciplineAnchorGrid(
  [[31, 38], [34, 38], [31, 39], [34, 39], [31, 40], [34, 40]],
  82,
  61,
);

export function getAboutNarrativeDisciplineAnchors(pointProfile = 'desktop', parameters = null) {
  const layoutProfile = parameters?.layoutProfile
    || (pointProfile === 'mobile' ? 'mobile' : 'desktop');
  if (Array.isArray(parameters?.items) && parameters.items.length === 6) {
    return Object.freeze([...parameters.items]
      .sort((left, right) => Number(left.group) - Number(right.group))
      .map((item) => {
        const [x, y] = getAboutNarrativeDisciplinePosition(item, layoutProfile, parameters);
        return Object.freeze({ group: Number(item.group), x, y });
      }));
  }
  if (pointProfile === 'mobile') return ABOUT_NARRATIVE_DISCIPLINE_MOBILE_ANCHORS;
  const requestedColumn = Math.round(Number(
    parameters?.formationColumn
      ?? ABOUT_NARRATIVE_DISCIPLINE_FORMATION_DEFAULTS.formationColumn,
  ));
  const requestedRow = Math.round(Number(
    parameters?.formationRow
      ?? ABOUT_NARRATIVE_DISCIPLINE_FORMATION_DEFAULTS.formationRow,
  ));
  const formationColumn = Math.min(117, Math.max(0, Number.isFinite(requestedColumn)
    ? requestedColumn
    : ABOUT_NARRATIVE_DISCIPLINE_FORMATION_DEFAULTS.formationColumn));
  const formationRow = Math.min(90, Math.max(0, Number.isFinite(requestedRow)
    ? requestedRow
    : ABOUT_NARRATIVE_DISCIPLINE_FORMATION_DEFAULTS.formationRow));
  if (formationColumn === ABOUT_NARRATIVE_DISCIPLINE_FORMATION_DEFAULTS.formationColumn
    && formationRow === ABOUT_NARRATIVE_DISCIPLINE_FORMATION_DEFAULTS.formationRow) {
    return ABOUT_NARRATIVE_DISCIPLINE_ANCHORS;
  }
  return createDisciplineAnchorGrid(
    DISCIPLINE_DESKTOP_CELLS.map(([column, row]) => [
      formationColumn + column - ABOUT_NARRATIVE_DISCIPLINE_FORMATION_DEFAULTS.formationColumn,
      formationRow + row - ABOUT_NARRATIVE_DISCIPLINE_FORMATION_DEFAULTS.formationRow,
    ]),
    DISCIPLINE_DESKTOP_COLUMNS,
    DISCIPLINE_DESKTOP_ROWS,
  );
}
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
export const ABOUT_NARRATIVE_VISIBILITY_EASINGS = Object.freeze([
  'linear',
  'smoothstep',
  'ease-in-out',
]);
function numberControl(id, label, min, max, step, unit = '', group = '', defaultValue) {
  return Object.freeze({
    id,
    label,
    type: 'range',
    min,
    max,
    step,
    unit,
    group,
    ...(defaultValue === undefined ? {} : { defaultValue }),
  });
}

function selectControl(id, label, options, defaultValue) {
  return Object.freeze({
    id,
    label,
    type: 'select',
    options: Object.freeze(options.map((option) => Object.freeze({ ...option }))),
    defaultValue,
  });
}

function derivedNumberControl(id, label, min, max, step, unit = '', group = '') {
  return Object.freeze({
    id,
    label,
    type: 'range',
    min,
    max,
    step,
    unit,
    group,
    derived: true,
  });
}

export const ABOUT_NARRATIVE_WORLD_CONTROL_GROUPS = Object.freeze([
  Object.freeze({ id: 'world-setup', label: 'World setup' }),
  Object.freeze({ id: 'world-placement', label: 'Placement & scale' }),
  Object.freeze({ id: 'world-transition', label: 'Transition' }),
  Object.freeze({ id: 'shape-dimensions', label: 'Shape · Dimensions' }),
  Object.freeze({ id: 'shape-distribution', label: 'Shape · Distribution' }),
  Object.freeze({ id: 'shape-surface', label: 'Shape · Surface' }),
  Object.freeze({ id: 'shape-hoops', label: 'Ride · Round hoops' }),
  Object.freeze({ id: 'shape-camera', label: 'Ride · Camera' }),
  Object.freeze({ id: 'shape-loop', label: 'Ride · Long loop' }),
  Object.freeze({ id: 'shape-finale', label: 'Ride · Workbench finale' }),
  Object.freeze({ id: 'modifier-formation', label: 'Bust · Assembly' }),
  Object.freeze({ id: 'modifier-fragmentation', label: 'Bust · Fragmentation' }),
  Object.freeze({ id: 'modifier-motion', label: 'Modifiers · Motion' }),
  Object.freeze({ id: 'modifier-appearance', label: 'Modifiers · Appearance' }),
  Object.freeze({ id: 'modifier-timing', label: 'Modifiers · Timing & input' }),
]);

export const ABOUT_NARRATIVE_TEXT_TRACK_CONTROL_GROUPS = Object.freeze([
  Object.freeze({ id: 'text-widths', label: 'Text · Widths' }),
  Object.freeze({ id: 'text-layout', label: 'Titles · Layout' }),
  Object.freeze({ id: 'text-path', label: 'Titles · Travel path' }),
  Object.freeze({ id: 'text-clarity', label: 'Titles · Clarity' }),
  Object.freeze({ id: 'text-draw', label: 'Titles · Draw and fade' }),
  Object.freeze({ id: 'text-shadow', label: 'Titles · Background shadow' }),
  Object.freeze({ id: 'text-depth', label: 'Titles · Depth' }),
  Object.freeze({ id: 'text-editorial', label: 'Content · Shared reveal' }),
]);

export const ABOUT_NARRATIVE_EDITORIAL_MOTION_DEFAULTS = Object.freeze({
  fadeDurationWU: 0.2,
  maxBlurPx: 0,
  travelPx: 0,
});

export const ABOUT_NARRATIVE_CAMERA_TRACK_CONTROL_GROUPS = Object.freeze([
  Object.freeze({ id: 'camera-steadicam', label: 'Camera · Steadicam response' }),
  Object.freeze({ id: 'camera-fog', label: 'Camera · Distance fog' }),
]);

export const ABOUT_NARRATIVE_SCROLL_SMOOTHING_CONTROL = numberControl(
  'scrollSmoothing',
  'Track glide',
  0,
  1,
  0.01,
);

export const ABOUT_NARRATIVE_CAMERA_STEADICAM_CONTROLS = Object.freeze([
  numberControl('steadycamResponseMs', 'Track settling', 0, 1200, 20, 'ms'),
  numberControl('pointerPanDegrees', 'Mouse pan amount', 0, 8, 0.05, '°'),
  numberControl('pointerPanResponseMs', 'Mouse pan response', 80, 2000, 20, 'ms'),
]);

export const ABOUT_NARRATIVE_LONG_RIDE_LOOK_AHEAD_CONTROL = numberControl(
  'cameraLookAheadWU',
  'Rotation look-ahead',
  0.35,
  1.4,
  0.01,
  'WU',
  'shape-camera',
);

export const ABOUT_NARRATIVE_VISIBILITY_TRACK_CONTROL_GROUPS = Object.freeze([
  Object.freeze({ id: 'visibility-material', label: 'Visibility · Point material' }),
]);

export const ABOUT_NARRATIVE_CAMERA_FOG_CONTROLS = Object.freeze([
  numberControl('distanceFogStartWU', 'Fog begins', 0, 40, 0.1, 'WU'),
  numberControl('distanceFogEndWU', 'Fully faded', 0.1, 80, 0.1, 'WU'),
  numberControl('distanceFogCurve', 'Fog curve', 0.45, 2.5, 0.05, '×', '', 1),
]);

// Compatibility export for older contract checks. Camera keys no longer use
// these controls; schema v5 owns fog once at globals.camera.
export const ABOUT_NARRATIVE_CAMERA_KEY_CONTROLS = ABOUT_NARRATIVE_CAMERA_FOG_CONTROLS;

export const ABOUT_NARRATIVE_CAMERA_RIG_CONTROLS = Object.freeze([
  numberControl('position.0', 'Position X', -40, 40, 0.01, 'WU', 'position'),
  numberControl('position.1', 'Position Y', -40, 40, 0.01, 'WU', 'position'),
  numberControl('position.2', 'Position Z', -40, 40, 0.01, 'WU', 'position'),
  numberControl('rotation.0', 'Rotation X', -90, 90, 0.1, '°', 'rotation'),
  numberControl('rotation.1', 'Rotation Y', -180, 180, 0.1, '°', 'rotation'),
  numberControl('rotation.2', 'Rotation Z', -180, 180, 0.1, '°', 'rotation'),
  numberControl('rollOffset', 'Additional camera roll', -360, 360, 1, '°', 'ride-roll'),
  numberControl('lookAtTarget.0', 'Anchor X', -40, 40, 0.01, 'WU', 'target'),
  numberControl('lookAtTarget.1', 'Anchor Y', -40, 40, 0.01, 'WU', 'target'),
  numberControl('lookAtTarget.2', 'Anchor Z', -40, 40, 0.01, 'WU', 'target'),
  numberControl('lookAtRoll', 'Horizon roll', -180, 180, 0.1, '°', 'target'),
  numberControl('fov', 'Field of view', 25, 80, 1, '°', 'lens'),
]);

export const ABOUT_NARRATIVE_WORLD_POINT_SIZE_CONTROL = numberControl(
  'pointSizeScale',
  'Relative point size',
  0.5,
  2.5,
  0.05,
  '×',
  'world-placement',
);

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
      ABOUT_NARRATIVE_SCROLL_SMOOTHING_CONTROL,
      numberControl('readingWidthRem', 'Text corridor width', 30, 90, 1, 'rem', 'text-widths'),
      numberControl('editorialRevealThreshold', 'Reveal starts', 0.8, 1, 0.01, '×H', 'text-editorial'),
    ]),
  }),
  Object.freeze({
    id: 'editorialMotion',
    label: 'Shared content reveal',
    controls: Object.freeze([
      numberControl('fadeDurationWU', 'Reveal band', 0.05, 0.4, 0.01, '×H', 'text-editorial'),
    ]),
  }),
  Object.freeze({
    id: 'camera',
    label: 'Camera',
    controls: Object.freeze([
      ...ABOUT_NARRATIVE_CAMERA_STEADICAM_CONTROLS.map((control) => Object.freeze({
        ...control,
        group: 'camera-steadicam',
      })),
      ...ABOUT_NARRATIVE_CAMERA_FOG_CONTROLS.map((control) => Object.freeze({
        ...control,
        group: 'camera-fog',
      })),
    ]),
  }),
  Object.freeze({
    id: 'material',
    label: 'Point material and pointer pressure',
    controls: Object.freeze([
      numberControl('opacity', 'Circle population', 0.2, 1, 0.01),
      numberControl('pointSize', 'Global point size', 2, 18, 0.1, 'px', '', 6),
      numberControl('surfelCoverage', 'Surfel coverage', 0.6, 1.2, 0.01, '×', '', 0.7),
      numberControl('backfaceRetention', 'Back surface reveal', 0, 1, 0.01, '×', '', 0),
      numberControl('minPointSize', 'Minimum point size', 0.75, 4, 0.05, 'px', '', 1.15),
      numberControl('perspectiveResponse', 'Depth scaling', 0.6, 1.2, 0.01, '×', '', 1),
      numberControl('edgeSoftness', 'Circle edge', 0.65, 2.4, 0.05, '×', '', 1.35),
      numberControl('atmosphereStrength', 'Visible haze', 0, 2, 0.05, '×', '', 1),
      numberControl('pointerRadiusPx', 'Pointer pressure radius', 40, 308, 2, 'px'),
      numberControl('pointerForcePx', 'Pointer pressure force', 0, 152, 1, 'px'),
      numberControl('pointerVariation', 'Pointer organic variation', 0, 1.04, 0.01),
      numberControl('pointerResponseMs', 'Pointer response', 20, 120, 5, 'ms'),
      numberControl('pointerReturnMs', 'Pointer return', 80, 1200, 10, 'ms'),
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
      numberControl('standardMaxWidthCh', 'Standard title width', 8, 60, 1, 'ch', 'text-widths'),
      numberControl('displayMaxWidthCh', 'Display title width', 8, 60, 1, 'ch', 'text-widths'),
      numberControl('standardViewportY', 'Travelling title Y', 0, 100, 1, '%', 'text-layout'),
      numberControl('bookendViewportY', 'Opener and finale Y', 0, 100, 1, '%', 'text-layout'),
      numberControl('durationScale', 'Travel duration', 0.75, 2.5, 0.05, '×'),
      numberControl('startY', 'Entry Y', -500, 500, 2, 'px', 'text-path'),
      numberControl('openerStartY', 'Opener Y', -500, 500, 2, 'px', 'text-path'),
      numberControl('endY', 'Exit Y', -500, 500, 2, 'px', 'text-path'),
      numberControl('readableStart', 'Clear-in point', 0, 1, 0.01, '', 'text-clarity'),
      numberControl('readableEnd', 'Clear-out point', 0, 1, 0.01, '', 'text-clarity'),
      numberControl('maxBlur', 'Maximum blur', 0, 100, 1, 'px', 'text-clarity'),
      numberControl('titleDrawDurationMs', 'Line colour flash', 80, 500, 10, 'ms', 'text-draw'),
      numberControl('titleColorCount', 'Draw colour count', 1, 8, 1, '', 'text-draw'),
      numberControl('titleLineStaggerMs', 'Next-line delay', 0, 400, 10, 'ms', 'text-draw'),
      numberControl('titleExitOpacity', 'Faded text opacity', 0, 1, 0.01, '', 'text-draw'),
      numberControl('titleExitLineStagger', 'Fade line stagger', 0, 0.4, 0.01, '', 'text-draw'),
      numberControl('titleShadowOpacity', 'Background shadow opacity', 0, 1, 0.01, '', 'text-shadow'),
      numberControl('titleShadowBlurPx', 'Background shadow blur', 0, 120, 1, 'px', 'text-shadow'),
      numberControl('perspective', 'Perspective', 1400, 3200, 20, 'px', 'text-depth'),
      numberControl('entryDepth', 'Entry depth (−Z)', 0, 3000, 10, 'px', 'text-depth'),
      numberControl('exitDepth', 'Exit depth (+Z)', 0, 3000, 10, 'px', 'text-depth'),
    ]),
  }),
]);

export const ABOUT_NARRATIVE_SHAPE_DEFINITIONS = Object.freeze({
  'long-assembly-corridor-v1': Object.freeze({
    id: 'long-assembly-corridor-v1',
    label: 'Blender World + Workbench',
    description: 'The edited Blender ride passes through the parametric forest and stops at a monumental workshop finale.',
    adapterId: 'point-field-v1',
    cost: 1,
    parameters: Object.freeze([
      numberControl('storyDurationWU', 'Story depth', 8, 48, 0.05, 'WU', 'shape-dimensions'),
      numberControl('widthScale', 'Corridor width', 0.5, 1.6, 0.01, '×', 'shape-dimensions'),
      numberControl('heightScale', 'Corridor height', 0.5, 1.6, 0.01, '×', 'shape-dimensions'),
      numberControl('depthScale', 'Landmark spacing', 0.65, 1.35, 0.01, '×', 'shape-dimensions'),
      ABOUT_NARRATIVE_LONG_RIDE_LOOK_AHEAD_CONTROL,
      numberControl('density', 'Surface detail', 0.2, 2, 0.01, '×', 'shape-distribution', 1),
      numberControl('structureManifestationAmount', 'Fog emergence spread', 0, 1.8, 0.01, 'WU', 'shape-distribution'),
      numberControl('structureAmbientAmount', 'Particle drift amount', 0, 0.3, 0.005, 'WU', 'shape-distribution'),
      numberControl('structureAmbientScaleWU', 'Motion scale', 2, 40, 0.1, 'WU', 'shape-distribution', 20),
      numberControl('structureAmbientSpeed', 'Particle drift speed', 0, 1.5, 0.01, '×', 'shape-distribution'),
      numberControl('structureMotionCoherence', 'Model variation', 0, 1, 0.01, '', 'shape-distribution', 0.72),
      numberControl('finaleMotionGain', 'Finale motion gain', 0, 2, 0.05, '×', 'shape-finale', 1.4),
      numberControl('hoopRadius', 'Hoop radius', 3, 6, 0.05, 'WU', 'shape-hoops'),
      numberControl('hoopCount', 'Hoop count', 10, 26, 1, '', 'shape-hoops'),
      numberControl('loopStartWU', 'Loop begins', 7.6, 9, 0.05, 'WU', 'shape-loop'),
      numberControl('loopEndWU', 'Loop completes', 12.8, 14.3, 0.05, 'WU', 'shape-loop'),
      numberControl('loopRadiusX', 'Loop width radius', 6, 14, 0.1, 'WU', 'shape-loop'),
      numberControl('loopRadiusY', 'Loop height radius', 5, 12, 0.1, 'WU', 'shape-loop'),
      numberControl('loopRollDegrees', 'Physical loop roll', -720, 720, 5, '°', 'shape-loop'),
      numberControl('loopGateCount', 'Loop gate count', 14, 30, 1, '', 'shape-loop'),
      numberControl('terminalDistanceWU', 'Finale tail distance', 0.6, 2.4, 0.05, 'WU', 'shape-finale'),
      numberControl('finaleFogClearStartWU', 'Workbench reveal begins', 12, 22, 0.05, 'WU', 'shape-finale', 21),
      numberControl('finaleFogClearEndWU', 'Workbench clear by', 12, 22, 0.05, 'WU', 'shape-finale', 21.8),
      numberControl('finaleFogStartWU', 'Clear fog begins', 20, 400, 5, 'WU', 'shape-finale', 220),
      numberControl('finaleFogEndWU', 'Clear fog fully faded', 80, 560, 5, 'WU', 'shape-finale', 560),
      derivedNumberControl('backgroundAnchorWU', 'Background anchor', 0, 48, 0.01, 'WU', 'shape-dimensions'),
      derivedNumberControl('intersectionAnchorWU', 'Intersection anchor', 0, 48, 0.01, 'WU', 'shape-dimensions'),
      derivedNumberControl('disciplinesAnchorWU', 'Disciplines anchor', 0, 48, 0.01, 'WU', 'shape-dimensions'),
      derivedNumberControl('cityAnchorWU', 'City anchor', 0, 48, 0.01, 'WU', 'shape-dimensions'),
      derivedNumberControl('finaleAnchorWU', 'Finale anchor', 0, 48, 0.01, 'WU', 'shape-dimensions'),
    ]),
  }),
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
      numberControl('depth', 'Depth', 1, 96, 0.1, 'WU', 'shape-dimensions'),
      numberControl('chunkCount', 'Cloud chunks', 3, 32, 1, '', 'shape-distribution'),
      numberControl('chunkSize', 'Chunk size', 0.1, 8, 0.05, 'WU', 'shape-distribution'),
      numberControl('scatter', 'Loose particles', 0, 1.5, 0.01, '', 'shape-distribution'),
      numberControl('density', 'Presence', 0.02, 1, 0.01, '', 'shape-distribution'),
      numberControl('corridorRadius', 'Reading corridor', 0, 8, 0.05, 'WU', 'shape-distribution'),
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
      numberControl('depth', 'Depth', 1, 96, 0.1, 'WU', 'shape-dimensions'),
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
  'emergent-form-v1': Object.freeze({
    id: 'emergent-form-v1',
    label: 'Emergent form',
    description: 'Six woven currents resolving into one suspended spatial form.',
    adapterId: 'point-field-v1',
    cost: 2,
    parameters: Object.freeze([
      numberControl('radius', 'Outer radius', 0.5, 8, 0.05, 'WU', 'shape-dimensions'),
      numberControl('coreRadius', 'Core radius', 0.05, 2, 0.01, 'WU', 'shape-dimensions'),
      numberControl('height', 'Height', 0.5, 12, 0.05, 'WU', 'shape-dimensions'),
      numberControl('twist', 'Weave turns', 0.25, 3, 0.01, '', 'shape-surface'),
      numberControl('thickness', 'Current thickness', 0.01, 1, 0.01, 'WU', 'shape-surface'),
      numberControl('density', 'Presence', 0.05, 1, 0.01, '', 'shape-distribution'),
    ]),
  }),
  'orbital-system-v1': Object.freeze({
    id: 'orbital-system-v1',
    label: 'Orbital system',
    description: 'A central point mass with four dimensional bodies moving around it.',
    adapterId: 'point-field-v1',
    cost: 2,
    parameters: Object.freeze([
      numberControl('orbitRadius', 'Orbit radius', 2, 12, 0.05, 'WU', 'shape-dimensions'),
      numberControl('coreRadius', 'Core radius', 0.2, 3, 0.01, 'WU', 'shape-dimensions'),
      numberControl('bodyRadius', 'Body radius', 0.1, 2, 0.01, 'WU', 'shape-dimensions'),
      numberControl('density', 'Presence', 0.05, 1, 0.01, '', 'shape-distribution'),
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

function findGlobalControl(ownerId, controlId) {
  return ABOUT_NARRATIVE_GLOBAL_CONTROLS
    .find((owner) => owner.id === ownerId)
    ?.controls.find((control) => control.id === controlId);
}

function findLongAssemblyControl(controlId) {
  return ABOUT_NARRATIVE_SHAPE_DEFINITIONS['long-assembly-corridor-v1']
    .parameters.find((control) => control.id === controlId);
}

function pageParameter(scope, control, path = null, controlOverrides = null) {
  if (!control) throw new Error('About V2 page parameter references an unknown control.');
  return Object.freeze({
    scope,
    control: controlOverrides ? Object.freeze({ ...control, ...controlOverrides }) : control,
    path: Object.freeze(path || [control.id]),
  });
}

const globalParameter = (ownerId, controlId, path, controlOverrides = null) => pageParameter(
  'globals',
  findGlobalControl(ownerId, controlId),
  path,
  controlOverrides,
);
const rideParameter = (controlId, controlOverrides = null) => pageParameter(
  'long-assembly',
  findLongAssemblyControl(controlId),
  null,
  controlOverrides,
);
const sessionParameter = (control) => pageParameter('session', control);

/**
 * One page-wide V2 tuning surface assembled from the existing canonical
 * control definitions. These entries do not create a second schema: they
 * provide a designer-facing view over the same persisted global and Long
 * Assembly values used by the timeline inspectors and runtime.
 */
export const ABOUT_NARRATIVE_V2_PAGE_PARAMETER_GROUPS = Object.freeze([
  Object.freeze({
    id: 'page-point-cloud',
    label: 'Point cloud',
    controls: Object.freeze([
      sessionParameter(selectControl('qualityTier', 'Quality', [
        { value: 'auto', label: 'Auto' },
        { value: 'desktop', label: 'High · desktop' },
        { value: 'mobile', label: 'Low · mobile' },
        { value: 'master', label: 'Maximum · preview' },
      ], 'auto')),
      rideParameter('density'),
      globalParameter('material', 'surfelCoverage', ['pointMaterial', 'surfelCoverage'], {
        label: 'Surface fill',
      }),
      globalParameter('material', 'backfaceRetention', ['pointMaterial', 'backfaceRetention'], {
        label: 'Back surface reveal',
      }),
      globalParameter('material', 'minPointSize', ['pointMaterial', 'minPointSize'], {
        label: 'Min circle size',
      }),
      globalParameter('material', 'pointSize', ['pointMaterial', 'pointSize'], {
        label: 'Max circle size',
        min: 4,
        max: 18,
      }),
      globalParameter('material', 'perspectiveResponse', ['pointMaterial', 'perspectiveResponse']),
      globalParameter('material', 'edgeSoftness', ['pointMaterial', 'edgeSoftness']),
    ]),
  }),
  Object.freeze({
    id: 'page-atmosphere',
    label: 'Atmosphere',
    controls: Object.freeze([
      globalParameter('material', 'atmosphereStrength', ['pointMaterial', 'atmosphereStrength']),
      globalParameter('camera', 'distanceFogStartWU', ['camera', 'distanceFogStartWU']),
      globalParameter('camera', 'distanceFogEndWU', ['camera', 'distanceFogEndWU']),
      globalParameter('camera', 'distanceFogCurve', ['camera', 'distanceFogCurve']),
      rideParameter('finaleFogClearStartWU', { label: 'Finale reveal begins' }),
      rideParameter('finaleFogClearEndWU', { label: 'Finale clear by' }),
    ]),
  }),
  Object.freeze({
    id: 'page-motion',
    label: 'Living motion',
    controls: Object.freeze([
      rideParameter('structureAmbientAmount', { label: 'Motion amount' }),
      rideParameter('structureAmbientSpeed', { label: 'Motion speed' }),
      rideParameter('structureMotionCoherence'),
      rideParameter('finaleMotionGain'),
    ]),
  }),
]);

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
    ]),
  }),
  'orbital-life-v1': Object.freeze({
    id: 'orbital-life-v1',
    label: 'Orbital life',
    version: 1,
    cost: 2,
    reducedMotion: 'settled',
    parameters: Object.freeze([
      numberControl('strength', 'Strength', 0, 1, 0.01, '', 'modifier-motion'),
      numberControl('speed', 'Speed', 0, 1, 0.005, '', 'modifier-motion'),
    ]),
  }),
  'bust-yaw-v1': Object.freeze({
    id: 'bust-yaw-v1',
    label: 'Whole-bust rotation',
    version: 1,
    cost: 1,
    reducedMotion: 'manual-only',
    parameters: Object.freeze([
      numberControl('speed', 'Platform spin', 0, 0.5, 0.001, 'rad/s', 'modifier-motion'),
      numberControl('dragSensitivity', 'Drag sensitivity', 0.05, 5, 0.05, '', 'modifier-timing'),
      numberControl('resumeDelay', 'Resume delay', 0, 15, 0.1, 's', 'modifier-timing'),
      numberControl('resumeBlend', 'Resume blend', 0.05, 15, 0.05, 's', 'modifier-timing'),
    ]),
  }),
  'bust-assembly-v1': Object.freeze({
    id: 'bust-assembly-v1',
    label: 'Bust assembly',
    version: 1,
    cost: 1,
    reducedMotion: 'settled',
    parameters: Object.freeze([
      Object.freeze({ id: 'formationMode', label: 'Formation', type: 'select', group: 'modifier-formation', options: Object.freeze(['gather', 'surface-rise']) }),
      numberControl('baseStart', 'Base starts', 0, 0.8, 0.01, '× morph', 'modifier-formation'),
      numberControl('headStart', 'Head starts', 0, 0.95, 0.01, '× morph', 'modifier-formation'),
      numberControl('layerSoftness', 'Layer softness', 0.05, 0.9, 0.01, '× morph', 'modifier-formation'),
      numberControl('platformScale', 'Platform width', 0.1, 4, 0.01, '×', 'modifier-formation'),
      numberControl('platformSettle', 'Platform gather', 0.05, 0.8, 0.01, '× morph', 'modifier-formation'),
      numberControl('surfaceHeight', 'Waterline', -4, 4, 0.01, 'WU', 'modifier-formation'),
      numberControl('submergeDepth', 'Submerged depth', 0.2, 8, 0.05, 'WU', 'modifier-formation'),
      numberControl('waterlineSoftness', 'Waterline softness', 0.02, 1, 0.01, 'WU', 'modifier-formation'),
      numberControl('surfaceCarry', 'Surface continuity', 0, 1, 0.01, '', 'modifier-formation'),
      numberControl('fragmentHeight', 'Fragment height', 0.08, 0.95, 0.01, '× height', 'modifier-fragmentation'),
      numberControl('fragmentFade', 'Fragment fade', 0.02, 0.8, 0.01, '× height', 'modifier-fragmentation'),
      numberControl('fragmentReveal', 'Fragment reveal', 0, 0.95, 0.01, '× morph', 'modifier-fragmentation'),
      numberControl('fragmentSpread', 'Side scatter', 0, 3, 0.01, '×', 'modifier-fragmentation'),
      numberControl('fragmentFall', 'Downward fall', 0, 2, 0.01, 'WU', 'modifier-fragmentation'),
      numberControl('fragmentPresence', 'Base presence', 0.05, 1, 0.01, '', 'modifier-fragmentation'),
    ]),
  }),
});

export const ABOUT_NARRATIVE_INTERACTION_DEFINITIONS = Object.freeze({
  'discipline-reveal': Object.freeze({
    id: 'discipline-reveal',
    label: 'Discipline reveal',
    defaultParameters: Object.freeze({
      entryStartRatio: 0.95,
      entryCompleteRatio: 0.92,
      backgroundOpacity: 0.28,
      pointScale: 4.4,
      restoreDurationWU: 0.8,
      ...ABOUT_NARRATIVE_DISCIPLINE_LAYOUT_DEFAULTS,
      items: Object.freeze([
        Object.freeze({ group: 1, label: 'Product Design', description: 'I turn ambiguous product problems into interfaces teams can build, test, and improve.' }),
        Object.freeze({ group: 2, label: 'Experience Design', description: 'I connect user needs, product priorities, and the decisions that shape the journey.' }),
        Object.freeze({ group: 3, label: 'Art Direction', description: 'I define the visual point of view that gives the work character, clarity, and intent.' }),
        Object.freeze({ group: 4, label: 'Motion & 3D', description: 'I use motion and spatial prototypes to clarify ideas, interactions, and product stories.' }),
        Object.freeze({ group: 5, label: 'Creative Engineering', description: 'I prototype with code and AI to move decisions from discussion into working form.' }),
        Object.freeze({ group: 6, label: 'Parametric Systems', description: 'I build systems of tokens, rules, and patterns that scale without losing character.' }),
      ]),
    }),
    parameters: Object.freeze([
      numberControl('entryStartRatio', 'Reveal band starts', 0.5, 1, 0.01, 'view', 'modifier-placement'),
      numberControl('entryCompleteRatio', 'Reveal band completes', 0.4, 0.95, 0.01, 'view', 'modifier-placement'),
      numberControl('backgroundOpacity', 'Resting grid opacity', 0, 0.5, 0.01, '', 'modifier-appearance'),
      numberControl('pointScale', 'Discipline point size', 1, 8, 0.05, '×', 'modifier-appearance'),
      numberControl('restoreDurationWU', 'Grid restore duration', 0, 4, 0.01, 'WU', 'modifier-timing'),
    ]),
  }),
  'grid-ripple': Object.freeze({
    id: 'grid-ripple',
    label: 'Wave generator',
    defaultParameters: Object.freeze({
      amplitude: 2,
      speed: 0.72,
      frequency: 1.25,
      releaseWU: 0,
    }),
    parameters: Object.freeze([
      numberControl('amplitude', 'Wave strength', 0, 3, 0.01, 'WU', 'modifier-motion'),
      numberControl('speed', 'Wave speed', 0, 6, 0.01, '', 'modifier-motion'),
      numberControl('frequency', 'Ring density', 0.1, 4, 0.01, '', 'modifier-motion'),
      numberControl('releaseWU', 'Fade-out', 0, 2, 0.05, 'WU', 'modifier-timing'),
    ]),
  }),
  'state-effect': Object.freeze({
    id: 'state-effect',
    label: 'State effect',
    defaultParameters: Object.freeze({ effectId: 'ambient-drift-v1', releaseWU: 0 }),
    parameters: Object.freeze([]),
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
