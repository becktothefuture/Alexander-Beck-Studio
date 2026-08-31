import {
  ABOUT_NARRATIVE_ADAPTER_DEFINITIONS,
  ABOUT_NARRATIVE_BLOCK_KINDS,
  ABOUT_NARRATIVE_CAMERA_EASINGS,
  ABOUT_NARRATIVE_CORRESPONDENCE_MODES,
  ABOUT_NARRATIVE_DISCIPLINE_FORMATION_DEFAULTS,
  ABOUT_NARRATIVE_EASINGS,
  ABOUT_NARRATIVE_EMPHASIS_TONES,
  ABOUT_NARRATIVE_EDITORIAL_MOTION_DEFAULTS,
  ABOUT_NARRATIVE_INTERACTION_DEFINITIONS,
  ABOUT_NARRATIVE_MAX_DOCUMENT_BYTES,
  ABOUT_NARRATIVE_MODIFIER_DEFINITIONS,
  ABOUT_NARRATIVE_SHAPE_DEFINITIONS,
  ABOUT_NARRATIVE_TITLE_STYLES,
  ABOUT_NARRATIVE_TEXT_MOVEMENT_MODES,
  ABOUT_NARRATIVE_TRANSITION_TYPES,
  ABOUT_NARRATIVE_VISIBILITY_EASINGS,
} from './aboutNarrativeDefinitions.js';
import {
  applyAboutNarrativeCameraEasing,
  compileAboutNarrativeCameraEasing,
  normalizeAboutNarrativeCameraEasing,
  parseAboutNarrativeCameraEasing,
} from './aboutNarrativeCameraEasing.js';
import {
  cloneAboutNarrativeDocument,
  normalizeAboutNarrativeDocument,
  validateAboutNarrativeDocument,
} from './aboutNarrativeSchema.js';
import {
  migrateLegacyAboutNarrativeCameraPose,
  slerpAboutNarrativeCameraQuaternionInto,
  writeAboutNarrativeCameraQuaternion,
  writeAboutNarrativeCameraTargetFromRotation,
} from './aboutNarrativeCameraRig.js';
import {
  ABOUT_INTERACTIVE_STACK_CONTROLS,
  ABOUT_INTERACTIVE_STACK_FITS,
  ABOUT_INTERACTIVE_STACK_ITEM_TYPES,
  ABOUT_INTERACTIVE_STACK_KIND,
  ABOUT_INTERACTIVE_STACK_MAX_ITEMS,
  ABOUT_INTERACTIVE_STACK_MIN_ITEMS,
  ABOUT_INTERACTIVE_STACK_SEED_CONTROL,
} from './aboutInteractiveStackContract.js';
import {
  ABOUT_NARRATIVE_DISCIPLINE_MIN_SEPARATION,
  ABOUT_NARRATIVE_DISCIPLINE_POSITION_BOUNDS,
  getAboutNarrativeDisciplineMinimumSeparation,
} from './aboutNarrativeDisciplinePositions.js';

export const ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION = 5;
export const ABOUT_NARRATIVE_TRACK_LAYOUT_PROFILE_IDS = Object.freeze(['desktop', 'tablet', 'mobile']);
export const ABOUT_NARRATIVE_TRACK_PROFILE_IDS = Object.freeze([
  ...ABOUT_NARRATIVE_TRACK_LAYOUT_PROFILE_IDS,
  'reduced-motion',
]);
export const ABOUT_NARRATIVE_TRACK_TEXT_KINDS = Object.freeze([
  'title',
  'scroll-block',
  'stub',
  'discipline-reveal',
]);
export const ABOUT_NARRATIVE_CAREER_SEQUENCE_KIND = 'career-sequence';

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const WORD_PATTERN = /[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu;
const CAREER_SEQUENCE_MAX_WORDS = 56;
const UNSAFE_TEXT_PATTERN = /<\/?(?:script|style|iframe)|\bon\w+\s*=|javascript:/i;
const SECTIONLIKE_KEYS = new Set(['sections', 'groups', 'bands', 'chapters']);
const LEGACY_CAMERA_BAKE_MAX_POSITION_ERROR_WU = 0.12;
const LEGACY_CAMERA_BAKE_MAX_ROTATION_ERROR_DEGREES = 1.5;
const LEGACY_CAMERA_BAKE_MAX_SCALAR_ERROR = 0.25;
const LEGACY_CAMERA_BAKE_MAX_DEPTH = 9;
const TOP_LEVEL_KEYS = new Set(['schemaVersion', 'globals', 'profiles', 'tracks', 'library']);
const GLOBAL_KEYS = new Set(['scrollSmoothing', 'readingWidthRem', 'editorialRevealThreshold', 'editorialMotion', 'worldRail', 'camera', 'pointMaterial', 'swarmTurbulence', 'textMotion']);
const LEGACY_GLOBAL_KEYS = new Set(['scrollSmoothing', 'readingWidthRem', 'editorialRevealThreshold', 'camera', 'pointMaterial', 'swarmTurbulence', 'textMotion']);
const GLOBAL_WORLD_RAIL_KEYS = new Set(['originZ', 'unitsPerWU']);
const GLOBAL_CAMERA_KEYS = new Set([
  'distanceFogStartWU',
  'distanceFogEndWU',
  'distanceFogCurve',
  'forwardSpeedWU',
  'steadycamResponseMs',
  'pointerPanDegrees',
  'pointerPanResponseMs',
]);
const VERSION_4_GLOBAL_CAMERA_KEYS = new Set(['fov', 'distanceFogStartWU', 'distanceFogEndWU']);
const LEGACY_GLOBAL_CAMERA_KEYS = new Set([
  'startZ',
  'cadence',
  'cadenceLocked',
  'fov',
  'distanceFogStartWU',
  'distanceFogEndWU',
]);
const POINT_MATERIAL_KEYS = new Set([
  'opacity',
  'pointSize',
  'surfelCoverage',
  'backfaceRetention',
  'minPointSize',
  'perspectiveResponse',
  'edgeSoftness',
  'atmosphereStrength',
  'pointerRadiusPx',
  'pointerForcePx',
  'pointerVariation',
  'pointerResponseMs',
  'pointerReturnMs',
]);
const SWARM_TURBULENCE_KEYS = new Set(['amplitude', 'speed', 'irregularity', 'individuality', 'axisSpread']);
const TEXT_MOTION_KEYS = new Set(['preset', 'standardMaxWidthCh', 'displayMaxWidthCh', 'standardViewportY', 'bookendViewportY', 'durationScale', 'startY', 'openerStartY', 'endY', 'readableStart', 'readableEnd', 'titleShadowOpacity', 'titleShadowBlurPx', 'titleDrawDurationMs', 'titleColorCount', 'titleLineStaggerMs', 'titleExitOpacity', 'titleExitLineStagger', 'perspective', 'entryDepth', 'exitDepth', 'maxBlur']);
const EDITORIAL_MOTION_KEYS = new Set([...Object.keys(ABOUT_NARRATIVE_EDITORIAL_MOTION_DEFAULTS)]);
const PROFILE_KEYS = new Set(['storyDurationWU', 'scrollDurationWU', 'overrides']);
const REDUCED_PROFILE_KEYS = new Set(['mode', 'motionPolicy']);
const OVERRIDE_TRACK_KEYS = new Set(['camera', 'visibility', 'worlds', 'text', 'interactions']);
const LEGACY_OVERRIDE_TRACK_KEYS = new Set(['camera', 'worlds', 'text', 'interactions']);
const TRACK_KEYS = new Set(['camera', 'visibility', 'worlds', 'text', 'interactions']);
const LEGACY_TRACK_KEYS = new Set(['camera', 'worlds', 'text', 'interactions']);
const CAMERA_TRACK_KEYS = new Set(['keys', 'orientationKeys']);
const VISIBILITY_TRACK_KEYS = new Set(['keys']);
const WORLD_TRACK_KEYS = new Set(['objects']);
const TEXT_TRACK_KEYS = new Set(['fields']);
const INTERACTION_TRACK_KEYS = new Set(['clips']);
const CAMERA_KEY_KEYS = new Set(['id', 'atWU', 'position', 'rotation', 'aimEnabled', 'lookAtTarget', 'lookAtRoll', 'fov', 'easing', 'locked']);
const CAMERA_ORIENTATION_KEY_KEYS = new Set(['id', 'atWU', 'rotation', 'easing', 'locked']);
const CAMERA_ORIENTATION_OVERRIDE_KEYS = new Set(['atWU', 'rotation', 'easing']);
const VERSION_4_CAMERA_KEY_KEYS = new Set(['id', 'atWU', 'position', 'rotation', 'fov', 'distanceFogStartWU', 'distanceFogEndWU', 'easing', 'locked']);
const LEGACY_CAMERA_KEY_KEYS = new Set(['id', 'atWU', 'offset', 'lookAtOffset', 'fov', 'roll', 'distanceFogStartWU', 'distanceFogEndWU', 'easing', 'locked']);
const VISIBILITY_KEY_KEYS = new Set(['id', 'atWU', 'visibility', 'easing', 'locked']);
const WORLD_KEYS = new Set(['id', 'label', 'startWU', 'anchorWU', 'adapterId', 'shapeId', 'seed', 'entryDistanceWU', 'transform', 'transitionIn', 'shapeParameters', 'modifiers', 'protected']);
const TRANSFORM_KEYS = new Set([
  'position',
  'rotation',
  'scale',
  'pointSizeScale',
  'mobileScale',
  'mobileXScale',
  'mobileYOffset',
  'mobileZOffset',
  'mobileNarrowWidth',
  'mobileWideWidth',
  'mobileNarrowScale',
  'mobileNarrowYOffset',
  'mobileNarrowDensity',
  'mobileLandscapeScale',
  'mobileLandscapeXScale',
  'mobileLandscapeXOffset',
  'mobileLandscapeYOffset',
  'mobileLandscapeZOffset',
]);
const TRANSITION_KEYS = new Set(['startWU', 'endWU', 'type', 'easing', 'correspondence']);
const MODIFIER_KEYS = new Set(['id', 'enabled', 'parameters']);
const TEXT_BASE_KEYS = new Set(['id', 'kind', 'startWU', 'focusWU', 'endWU', 'publishable', 'presentation', 'flow', 'protected']);
const TITLE_KEYS = new Set([...TEXT_BASE_KEYS, 'movement', 'preset', 'titleStyle', 'text', 'description', 'anchor']);
const SCROLL_BLOCK_KEYS = new Set([...TEXT_BASE_KEYS, 'block', 'reveal']);
const STUB_KEYS = new Set([...TEXT_BASE_KEYS, 'label']);
const DISCIPLINE_KEYS = new Set([...TEXT_BASE_KEYS, 'choreography']);
const LEGACY_DISCIPLINE_KEYS = new Set([...TEXT_BASE_KEYS, 'fieldTravelStartWU', 'fieldTravelEndWU', 'choreography']);
const PRESENTATION_KEYS = new Set(['layout', 'viewportY']);
const STORY_FLOW_KEYS = new Set(['minScreens', 'gapAfter', 'focusMode', 'focusOffsetScreens']);
const STORY_GAP_PRESETS = new Set(['none', 'tight', 'standard', 'chapter', 'finale', 'passage', 'arrival']);
const STORY_FOCUS_MODES = new Set(['middle', 'reading-start']);
const BLOCK_KEYS = new Set(['id', 'kind', 'text', 'label', 'items', 'modules', 'moduleGapRem', 'emphasis', 'worldInfluence']);
const BLOCK_DISCIPLINE_ITEM_KEYS = new Set(['id', 'label', 'description']);
const EMPHASIS_KEYS = new Set(['text', 'tone']);
const REVEAL_KEYS = new Set(['fadeDurationWU']);
const LEGACY_REVEAL_KEYS = new Set(['fadeDelayWU', 'fadeDurationWU', 'blurDelayWU', 'blurDurationWU']);
const MODULE_KEYS = new Set(['id', 'kind', 'text', 'label', 'items', 'parameters', 'emphasis', 'independentWork']);
const MODULE_ITEM_KEYS = new Set(['id', 'label', 'src', 'alt', 'caption', 'scale', 'offsetX', 'offsetY']);
const CAREER_SEQUENCE_ITEM_KEYS = new Set(['id', 'yearLabel', 'employer', 'role']);
const CAREER_SEQUENCE_INDEPENDENT_WORK_KEYS = new Set(['label', 'text']);
const INTERACTIVE_STACK_ITEM_KEYS = new Set(['id', 'type', 'src', 'poster', 'alt', 'width', 'height', 'aspectRatio', 'fit']);
const INTERACTIVE_STACK_PARAMETER_KEYS = new Set([
  ABOUT_INTERACTIVE_STACK_SEED_CONTROL.id,
  ...ABOUT_INTERACTIVE_STACK_CONTROLS.map((control) => control.id),
]);
const MODULE_KINDS = new Set([
  'prose',
  'list',
  'logo-grid',
  'media-deck',
  ABOUT_INTERACTIVE_STACK_KIND,
  ABOUT_NARRATIVE_CAREER_SEQUENCE_KIND,
]);
const CHOREOGRAPHY_KEYS = new Set(['staggerWU', 'backgroundFadeWU', 'backgroundOpacity', 'reconnectOpacity', 'pointScale', 'labelOffsetPx', 'labelScale', 'labelDurationWU', 'holdWU', 'items']);
const LEGACY_CHOREOGRAPHY_KEYS = new Set(['fieldTravelWU', 'fieldFogStartWU', 'fieldFogEndWU', 'fieldFogStrength', ...CHOREOGRAPHY_KEYS]);
const DISCIPLINE_ITEM_KEYS = new Set(['group', 'label', 'description', 'position', 'mobilePosition']);
const INTERACTION_KEYS = new Set(['id', 'type', 'startWU', 'activationWU', 'endWU', 'targetWorldId', 'parameters', 'protected']);
const LIBRARY_KEYS = new Set(['presets']);
const PRESET_KEYS = new Set(['id', 'label', 'scope', 'protected']);
const CAMERA_OVERRIDE_KEYS = new Set(['atWU', 'position', 'rotation', 'aimEnabled', 'lookAtTarget', 'lookAtRoll', 'fov', 'easing']);
const VERSION_4_CAMERA_OVERRIDE_KEYS = new Set(['atWU', 'position', 'rotation', 'fov', 'distanceFogStartWU', 'distanceFogEndWU', 'easing']);
const LEGACY_CAMERA_OVERRIDE_KEYS = new Set(['atWU', 'offset', 'lookAtOffset', 'fov', 'roll', 'distanceFogStartWU', 'distanceFogEndWU', 'easing']);
const VISIBILITY_OVERRIDE_KEYS = new Set(['atWU', 'visibility', 'easing']);
const WORLD_OVERRIDE_KEYS = new Set(['startWU', 'anchorWU', 'transform', 'transitionIn']);
const TEXT_OVERRIDE_KEYS = new Set(['startWU', 'focusWU', 'endWU']);
const INTERACTION_OVERRIDE_KEYS = new Set(['startWU', 'activationWU', 'endWU']);

function finite(value) {
  return Number.isFinite(Number(value));
}

function cleanWU(value) {
  return Number(Number(value).toFixed(6));
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function diagnostic(diagnostics, code, path, message, level = 'error') {
  diagnostics.push({ level, code, path, message });
}

function unknownKeys(diagnostics, value, allowed, path) {
  if (!isObject(value)) {
    diagnostic(diagnostics, 'object-envelope', path, 'Expected an object.');
    return;
  }
  Object.keys(value).forEach((key) => {
    if (!allowed.has(key)) diagnostic(diagnostics, 'unknown-key', `${path}.${key}`, `Unknown field “${key}”.`);
  });
}

function rejectSectionlikeKeys(value, diagnostics, path = 'document') {
  if (!value || typeof value !== 'object') return;
  Object.entries(value).forEach(([key, child]) => {
    if (SECTIONLIKE_KEYS.has(key)) {
      diagnostic(diagnostics, 'sectionlike-key', `${path}.${key}`, `Sectionless documents cannot contain authored “${key}”.`);
    }
    rejectSectionlikeKeys(child, diagnostics, `${path}.${key}`);
  });
}

function validateId(value, seen, diagnostics, path) {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) {
    diagnostic(diagnostics, 'object-id', path, 'IDs must be non-empty lower-case slugs.');
    return false;
  }
  if (seen.has(value)) {
    diagnostic(diagnostics, 'duplicate-id', path, `Duplicate authored object ID “${value}”.`);
    return false;
  }
  seen.add(value);
  return true;
}

function validateTime(value, diagnostics, path, { min = 0, max = Number.POSITIVE_INFINITY } = {}) {
  if (!finite(value) || Number(value) < min || Number(value) > max) {
    diagnostic(diagnostics, 'time-range', path, `Timing must be finite and between ${min} and ${Number.isFinite(max) ? max : 'the story end'}.`);
    return false;
  }
  return true;
}

function validateVector(value, diagnostics, path) {
  if (!Array.isArray(value) || value.length !== 3 || value.some((item) => !finite(item))) {
    diagnostic(diagnostics, 'vector', path, 'Expected three finite numbers.');
    return false;
  }
  return true;
}

function validateDisciplinePosition(value, diagnostics, path) {
  const xBounds = ABOUT_NARRATIVE_DISCIPLINE_POSITION_BOUNDS.x;
  const yBounds = ABOUT_NARRATIVE_DISCIPLINE_POSITION_BOUNDS.y;
  if (!Array.isArray(value)
    || value.length !== 2
    || !finite(value[0])
    || Number(value[0]) < xBounds.min
    || Number(value[0]) > xBounds.max
    || !finite(value[1])
    || Number(value[1]) < yBounds.min
    || Number(value[1]) > yBounds.max) {
    diagnostic(
      diagnostics,
      'discipline-position',
      path,
      `Discipline positions require normalized X ${xBounds.min}–${xBounds.max} and Y ${yBounds.min}–${yBounds.max}.`,
    );
    return false;
  }
  return true;
}

function validateSafeText(value, diagnostics, path, { required = false, maximum = 1200 } = {}) {
  if (typeof value !== 'string' || (required && !value.trim()) || value.length > maximum || UNSAFE_TEXT_PATTERN.test(value)) {
    diagnostic(diagnostics, 'unsafe-text', path, `Text must be plain${required ? ', non-empty' : ''}, and no longer than ${maximum} characters.`);
    return false;
  }
  return true;
}

function validateControlValue(value, control, diagnostics, path) {
  if (value == null && control.defaultValue !== undefined) return;
  if (control.type === 'range') {
    if (!finite(value) || Number(value) < control.min || Number(value) > control.max) {
      diagnostic(diagnostics, 'parameter-range', path, `${control.label} must stay between ${control.min} and ${control.max}.`);
    }
  } else if (control.type === 'select' && !control.options.includes(value)) {
    diagnostic(diagnostics, 'parameter-option', path, `${control.label} has an unsupported value.`);
  }
}

function validateGlobals(globals, diagnostics, schemaVersion) {
  const legacy = schemaVersion === 3;
  unknownKeys(diagnostics, globals, legacy ? LEGACY_GLOBAL_KEYS : GLOBAL_KEYS, 'globals');
  if (!isObject(globals)) return;
  if (!legacy) unknownKeys(diagnostics, globals.worldRail, GLOBAL_WORLD_RAIL_KEYS, 'globals.worldRail');
  const cameraKeys = legacy
    ? LEGACY_GLOBAL_CAMERA_KEYS
    : schemaVersion === 4 ? VERSION_4_GLOBAL_CAMERA_KEYS : GLOBAL_CAMERA_KEYS;
  unknownKeys(diagnostics, globals.camera, cameraKeys, 'globals.camera');
  unknownKeys(diagnostics, globals.pointMaterial, POINT_MATERIAL_KEYS, 'globals.pointMaterial');
  unknownKeys(diagnostics, globals.swarmTurbulence, SWARM_TURBULENCE_KEYS, 'globals.swarmTurbulence');
  unknownKeys(diagnostics, globals.textMotion, TEXT_MOTION_KEYS, 'globals.textMotion');
  if (globals.editorialMotion != null) {
    unknownKeys(diagnostics, globals.editorialMotion, EDITORIAL_MOTION_KEYS, 'globals.editorialMotion');
    validateEditorialReveal(Object.fromEntries(
      [...REVEAL_KEYS].map((key) => [key, globals.editorialMotion[key]]),
    ), diagnostics, 'globals.editorialMotion');
    ['maxBlurPx', 'travelPx'].forEach((key) => {
      const control = key === 'maxBlurPx' ? [0, 12] : [0, 48];
      if (!finite(globals.editorialMotion?.[key]) || Number(globals.editorialMotion[key]) < control[0] || Number(globals.editorialMotion[key]) > control[1]) {
        diagnostic(diagnostics, 'editorial-motion-range', `globals.editorialMotion.${key}`, `Editorial ${key} is outside its supported range.`);
      }
    });
  }
  ['standardViewportY', 'bookendViewportY'].forEach((key) => {
    if (globals.textMotion?.[key] != null && (!finite(globals.textMotion[key]) || Number(globals.textMotion[key]) < 0 || Number(globals.textMotion[key]) > 100)) {
      diagnostic(diagnostics, 'title-viewport-y', `globals.textMotion.${key}`, 'Global title viewport Y must stay between 0 and 100 percent.');
    }
  });
  [
    ['titleShadowOpacity', 0, 1, 'Global title shadow opacity must stay between 0 and 1.'],
    ['titleShadowBlurPx', 0, 120, 'Global title shadow blur must stay between 0 and 120 pixels.'],
    ['titleDrawDurationMs', 80, 500, 'Global title colour draw duration must stay between 80 and 500 milliseconds.'],
    ['titleColorCount', 1, 8, 'Global title colour count must stay between 1 and 8.'],
    ['titleLineStaggerMs', 0, 400, 'Global title draw line stagger must stay between 0 and 400 milliseconds.'],
    ['titleExitOpacity', 0, 1, 'Global title faded opacity must stay between 0 and 1.'],
    ['titleExitLineStagger', 0, 0.4, 'Global title exit line stagger must stay between 0 and 0.4.'],
  ].forEach(([key, minimum, maximum, message]) => {
    const value = globals.textMotion?.[key];
    if (value != null && (!finite(value) || Number(value) < minimum || Number(value) > maximum)) {
      diagnostic(diagnostics, 'title-shadow-range', `globals.textMotion.${key}`, message);
    }
  });
  if (!legacy) {
    if (!finite(globals.worldRail?.originZ) || Number(globals.worldRail.originZ) < -100 || Number(globals.worldRail.originZ) > 100) {
      diagnostic(diagnostics, 'world-rail-origin', 'globals.worldRail.originZ', 'World rail origin Z must stay between -100 and 100.');
    }
    if (!finite(globals.worldRail?.unitsPerWU) || Number(globals.worldRail.unitsPerWU) < 0.01 || Number(globals.worldRail.unitsPerWU) > 24) {
      diagnostic(diagnostics, 'world-rail-cadence', 'globals.worldRail.unitsPerWU', 'World rail units per WU must stay between 0.01 and 24.');
    }
  }
  const fogStartWU = Number(globals.camera?.distanceFogStartWU);
  const fogEndWU = Number(globals.camera?.distanceFogEndWU);
  if (!finite(fogStartWU) || fogStartWU < 0 || fogStartWU > 40) {
    diagnostic(diagnostics, 'camera-fog-start', 'globals.camera.distanceFogStartWU', 'Global camera fog start must stay between 0 and 40 WU.');
  }
  if (!finite(fogEndWU) || fogEndWU < 0.1 || fogEndWU > 240) {
    diagnostic(diagnostics, 'camera-fog-end', 'globals.camera.distanceFogEndWU', 'Global camera fog end must stay between 0.1 and 240 WU.');
  }
  if (finite(fogStartWU) && finite(fogEndWU) && fogStartWU >= fogEndWU) {
    diagnostic(diagnostics, 'camera-fog-order', 'globals.camera', 'Global camera fog must begin before circles are fully faded.');
  }
  const distanceFogCurve = Number(globals.camera?.distanceFogCurve);
  if (globals.camera?.distanceFogCurve != null
    && (!finite(distanceFogCurve) || distanceFogCurve < 0.45 || distanceFogCurve > 2.5)) {
    diagnostic(diagnostics, 'camera-fog-curve', 'globals.camera.distanceFogCurve', 'Global camera fog curve must stay between 0.45 and 2.5.');
  }
  const surfelCoverage = Number(globals.pointMaterial?.surfelCoverage);
  if (globals.pointMaterial?.surfelCoverage != null
    && (!finite(surfelCoverage) || surfelCoverage < 0.6 || surfelCoverage > 1.2)) {
    diagnostic(
      diagnostics,
      'point-material-surfel-coverage',
      'globals.pointMaterial.surfelCoverage',
      'Global surfel coverage must stay between 0.6 and 1.2.',
    );
  }
  [
    ['backfaceRetention', 0, 1, 'Back surface reveal'],
    ['minPointSize', 0.75, 4, 'Minimum point size'],
    ['perspectiveResponse', 0.6, 1.2, 'Depth scaling'],
    ['edgeSoftness', 0.65, 2.4, 'Circle edge'],
    ['atmosphereStrength', 0, 2, 'Visible haze'],
  ].forEach(([key, minimum, maximum, label]) => {
    const value = globals.pointMaterial?.[key];
    if (value != null && (!finite(value) || Number(value) < minimum || Number(value) > maximum)) {
      diagnostic(
        diagnostics,
        `point-material-${key}`,
        `globals.pointMaterial.${key}`,
        `${label} must stay between ${minimum} and ${maximum}.`,
      );
    }
  });
  if (globals.camera?.forwardSpeedWU != null
    && (!finite(globals.camera.forwardSpeedWU)
      || Number(globals.camera.forwardSpeedWU) <= 0
      || Number(globals.camera.forwardSpeedWU) > 24)) {
    diagnostic(
      diagnostics,
      'camera-forward-speed',
      'globals.camera.forwardSpeedWU',
      'Global camera forward speed must be greater than 0 and at most 24 world units per Story WU.',
    );
  }
  if (globals.camera?.steadycamResponseMs != null
    && (!finite(globals.camera.steadycamResponseMs)
      || Number(globals.camera.steadycamResponseMs) < 0
      || Number(globals.camera.steadycamResponseMs) > 1200)) {
    diagnostic(
      diagnostics,
      'camera-steadycam-response',
      'globals.camera.steadycamResponseMs',
      'Global camera track settling must stay between 0 and 1200 milliseconds.',
    );
  }
  if (globals.camera?.pointerPanDegrees != null
    && (!finite(globals.camera.pointerPanDegrees)
      || Number(globals.camera.pointerPanDegrees) < 0
      || Number(globals.camera.pointerPanDegrees) > 8)) {
    diagnostic(
      diagnostics,
      'camera-pointer-pan-amount',
      'globals.camera.pointerPanDegrees',
      'Global mouse pan amount must stay between 0 and 8 degrees.',
    );
  }
  if (globals.camera?.pointerPanResponseMs != null
    && (!finite(globals.camera.pointerPanResponseMs)
      || Number(globals.camera.pointerPanResponseMs) < 80
      || Number(globals.camera.pointerPanResponseMs) > 2000)) {
    diagnostic(
      diagnostics,
      'camera-pointer-pan-response',
      'globals.camera.pointerPanResponseMs',
      'Global mouse pan response must stay between 80 and 2000 milliseconds.',
    );
  }
  const worldRail = globals.worldRail;
  const legacyCompatibleGlobals = { ...globals };
  delete legacyCompatibleGlobals.worldRail;
  delete legacyCompatibleGlobals.editorialMotion;
  const legacyCompatibleTextMotion = { ...(legacyCompatibleGlobals.textMotion || {}) };
  delete legacyCompatibleTextMotion.standardViewportY;
  delete legacyCompatibleTextMotion.bookendViewportY;
  delete legacyCompatibleTextMotion.titleShadowOpacity;
  delete legacyCompatibleTextMotion.titleShadowBlurPx;
  delete legacyCompatibleTextMotion.titleDrawDurationMs;
  delete legacyCompatibleTextMotion.titleColorCount;
  delete legacyCompatibleTextMotion.titleLineStaggerMs;
  delete legacyCompatibleTextMotion.titleExitOpacity;
  delete legacyCompatibleTextMotion.titleExitLineStagger;
  const legacyCompatibleCamera = { ...(globals.camera || {}) };
  delete legacyCompatibleCamera.forwardSpeedWU;
  delete legacyCompatibleCamera.pointerPanDegrees;
  delete legacyCompatibleCamera.pointerPanResponseMs;
  // Reuse the established v2 global contract without allowing the legacy
  // validator to see or normalize any authored track data.
  const shim = {
    schemaVersion: 2,
    globals: legacy ? globals : {
      ...legacyCompatibleGlobals,
      textMotion: legacyCompatibleTextMotion,
      camera: {
        startZ: Number(worldRail?.originZ ?? 8),
        cadence: Number(worldRail?.unitsPerWU ?? 1),
        cadenceLocked: true,
        fov: Number(globals.camera?.fov ?? 48),
        ...legacyCompatibleCamera,
      },
    },
    sections: [{
      id: 'validation-finale', label: 'Validation', type: 'finale', layout: 'center', extentWU: 1,
      mobileExtentWU: 1, text: { cues: [{ id: 'validation-copy', text: 'Validation', enter: 0, hold: 0.5, exit: 1, preset: 'travelling-title-v1', motion: { mode: 'spatial' } }] },
      camera: { keys: [{ at: 0, offset: [0, 0, 0], lookAtOffset: [0, 0, -1], fov: Number(globals?.camera?.fov ?? 48), roll: 0, easing: 'smoothstep' }, { at: 1, offset: [0, 0, 0], lookAtOffset: [0, 0, -1], fov: Number(globals?.camera?.fov ?? 48), roll: 0, easing: 'smoothstep' }] },
      world: { mode: 'set', adapterId: 'point-field-v1', shapeId: 'bust-v1', seed: 1, entryDistanceWU: 1, transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 }, transitionIn: { start: 0, end: 0, type: 'cut', easing: 'linear', correspondence: 'index-v1' }, shapeParameters: { density: 0.5 }, modifiers: [] },
      interaction: { type: 'none' },
    }],
    library: { presets: [] },
  };
  validateAboutNarrativeDocument(shim).forEach((item) => {
    if (item.level === 'error' && item.path.startsWith('globals.')) diagnostics.push(item);
  });
}

function validateProfiles(profiles, diagnostics, durationWU, objectIndexes, schemaVersion) {
  if (!isObject(profiles)) {
    diagnostic(diagnostics, 'profiles-envelope', 'profiles', 'Profiles must be an object.');
    return;
  }
  unknownKeys(diagnostics, profiles, new Set(ABOUT_NARRATIVE_TRACK_PROFILE_IDS), 'profiles');
  ABOUT_NARRATIVE_TRACK_LAYOUT_PROFILE_IDS.forEach((profileId) => {
    const profile = profiles[profileId];
    const path = `profiles.${profileId}`;
    unknownKeys(diagnostics, profile, PROFILE_KEYS, path);
    if (!isObject(profile)) return;
    validateTime(profile.storyDurationWU, diagnostics, `${path}.storyDurationWU`, { min: 0.001 });
    validateTime(profile.scrollDurationWU, diagnostics, `${path}.scrollDurationWU`, { min: 0.001 });
    if (finite(profile.storyDurationWU) && Math.abs(Number(profile.storyDurationWU) - durationWU) > 0.000001) {
      diagnostic(diagnostics, 'profile-story-duration', `${path}.storyDurationWU`, 'Layout profiles must share the canonical Story WU duration.');
    }
    validateProfileOverrides(profile.overrides, diagnostics, path, durationWU, objectIndexes, schemaVersion);
  });
  const reduced = profiles['reduced-motion'];
  unknownKeys(diagnostics, reduced, REDUCED_PROFILE_KEYS, 'profiles.reduced-motion');
  if (isObject(reduced)) {
    if (reduced.mode !== 'overlay') diagnostic(diagnostics, 'reduced-motion-mode', 'profiles.reduced-motion.mode', 'Reduced Motion must be an overlay.');
    if (reduced.motionPolicy !== 'settled') diagnostic(diagnostics, 'reduced-motion-policy', 'profiles.reduced-motion.motionPolicy', 'Reduced Motion must use the settled policy.');
  }
}

function validateOverrideObject(value, allowed, diagnostics, path) {
  unknownKeys(diagnostics, value, allowed, path);
  return isObject(value);
}

function validateProfileOverrides(overrides, diagnostics, profilePath, durationWU, indexes, schemaVersion) {
  const path = `${profilePath}.overrides`;
  const currentSchema = schemaVersion >= 5;
  unknownKeys(diagnostics, overrides, currentSchema ? OVERRIDE_TRACK_KEYS : LEGACY_OVERRIDE_TRACK_KEYS, path);
  if (!isObject(overrides)) return;
  const cameraIndex = new Map([
    ...indexes.camera.entries(),
    ...(indexes.cameraOrientation?.entries() || []),
  ]);
  const definitions = [
    ['camera', cameraIndex, schemaVersion === 3
      ? LEGACY_CAMERA_OVERRIDE_KEYS
      : schemaVersion === 4 ? VERSION_4_CAMERA_OVERRIDE_KEYS : CAMERA_OVERRIDE_KEYS],
    ...(currentSchema ? [['visibility', indexes.visibility, VISIBILITY_OVERRIDE_KEYS]] : []),
    ['worlds', indexes.worlds, WORLD_OVERRIDE_KEYS],
    ['text', indexes.text, TEXT_OVERRIDE_KEYS],
    ['interactions', indexes.interactions, INTERACTION_OVERRIDE_KEYS],
  ];
  definitions.forEach(([track, index, allowed]) => {
    const entries = overrides[track];
    const trackPath = `${path}.${track}`;
    if (!isObject(entries)) {
      diagnostic(diagnostics, 'override-envelope', trackPath, 'Profile track overrides must be ID-addressed objects.');
      return;
    }
    Object.entries(entries).forEach(([id, override]) => {
      const itemPath = `${trackPath}.${id}`;
      const base = index.get(id);
      const cameraOrientationOverride = track === 'camera' && indexes.cameraOrientation?.has(id);
      if (!base) diagnostic(diagnostics, 'override-target', itemPath, `Override target “${id}” does not exist on ${track}.`);
      if (!validateOverrideObject(
        override,
        cameraOrientationOverride ? CAMERA_ORIENTATION_OVERRIDE_KEYS : allowed,
        diagnostics,
        itemPath,
      )) return;
      Object.entries(override).forEach(([key, value]) => {
        if (key.endsWith('WU') && key !== 'distanceFogStartWU' && key !== 'distanceFogEndWU') validateTime(value, diagnostics, `${itemPath}.${key}`, { max: durationWU });
      });
      if (track === 'camera') {
        if (cameraOrientationOverride) {
          if (override.rotation != null) validateVector(override.rotation, diagnostics, `${itemPath}.rotation`);
        } else if (schemaVersion === 3) {
          if (override.offset != null) validateVector(override.offset, diagnostics, `${itemPath}.offset`);
          if (override.lookAtOffset != null) validateVector(override.lookAtOffset, diagnostics, `${itemPath}.lookAtOffset`);
          if (override.roll != null && !finite(override.roll)) diagnostic(diagnostics, 'camera-roll', `${itemPath}.roll`, 'Roll must be finite.');
        } else {
          if (override.position != null) validateVector(override.position, diagnostics, `${itemPath}.position`);
          if (override.rotation != null) validateVector(override.rotation, diagnostics, `${itemPath}.rotation`);
          if (override.aimEnabled != null && typeof override.aimEnabled !== 'boolean') diagnostic(diagnostics, 'camera-aim-enabled', `${itemPath}.aimEnabled`, 'Camera aim enabled must be boolean.');
          if (override.lookAtTarget != null) validateVector(override.lookAtTarget, diagnostics, `${itemPath}.lookAtTarget`);
          if (override.lookAtRoll != null && !finite(override.lookAtRoll)) diagnostic(diagnostics, 'camera-look-at-roll', `${itemPath}.lookAtRoll`, 'Look-at roll must be finite.');
          const position = override.position || base?.position;
          const target = override.lookAtTarget || base?.lookAtTarget;
          const aimEnabled = override.aimEnabled
            ?? (Array.isArray(override.lookAtTarget) ? true : base?.aimEnabled)
            ?? Array.isArray(target);
          if (aimEnabled && !target) diagnostic(diagnostics, 'camera-look-at-target', itemPath, 'Enabled camera aim requires a look-at target.');
          if (aimEnabled && position && target && Math.hypot(
            Number(target[0]) - Number(position[0]),
            Number(target[1]) - Number(position[1]),
            Number(target[2]) - Number(position[2]),
          ) < 0.01) diagnostic(diagnostics, 'camera-look-at-distance', itemPath, 'Camera and look-at target must be at least 0.01 WU apart.');
        }
        if (override.fov != null && (!finite(override.fov) || override.fov < 20 || override.fov > 90)) diagnostic(diagnostics, 'camera-fov', `${itemPath}.fov`, 'FOV must stay between 20 and 90.');
        if (schemaVersion <= 4) {
          if (override.distanceFogStartWU != null && (!finite(override.distanceFogStartWU) || override.distanceFogStartWU < 0 || override.distanceFogStartWU > 40)) diagnostic(diagnostics, 'camera-fog-start', `${itemPath}.distanceFogStartWU`, 'Camera fog start must stay between 0 and 40 WU.');
          if (override.distanceFogEndWU != null && (!finite(override.distanceFogEndWU) || override.distanceFogEndWU < 0.1 || override.distanceFogEndWU > 240)) diagnostic(diagnostics, 'camera-fog-end', `${itemPath}.distanceFogEndWU`, 'Camera fog end must stay between 0.1 and 240 WU.');
          const fogStartWU = Number(override.distanceFogStartWU ?? base?.distanceFogStartWU);
          const fogEndWU = Number(override.distanceFogEndWU ?? base?.distanceFogEndWU);
          if (finite(fogStartWU) && finite(fogEndWU) && fogStartWU >= fogEndWU) diagnostic(diagnostics, 'camera-fog-order', itemPath, 'Camera fog must begin before circles are fully faded.');
        }
        if (override.easing != null && !ABOUT_NARRATIVE_CAMERA_EASINGS.includes(override.easing) && !parseAboutNarrativeCameraEasing(override.easing)) diagnostic(diagnostics, 'camera-easing', `${itemPath}.easing`, 'Camera easing must be a soft cubic-bezier curve.');
      }
      if (track === 'visibility') {
        if (override.visibility != null && (!finite(override.visibility) || Number(override.visibility) < 0 || Number(override.visibility) > 1)) {
          diagnostic(diagnostics, 'visibility-range', `${itemPath}.visibility`, 'Visibility must stay between 0 and 1.');
        }
        if (override.easing != null && !ABOUT_NARRATIVE_VISIBILITY_EASINGS.includes(override.easing)) {
          diagnostic(diagnostics, 'visibility-easing', `${itemPath}.easing`, 'Visibility easing must be linear, smoothstep, or ease-in-out.');
        }
      }
      if (track === 'worlds') {
        if (override.transform != null) validateTransform(override.transform, diagnostics, `${itemPath}.transform`, true);
        if (override.transitionIn != null) validateTransition(override.transitionIn, diagnostics, `${itemPath}.transitionIn`, durationWU, true);
      }
      if (base && track === 'text') {
        const start = Number(override.startWU ?? base.startWU);
        const focus = Number(override.focusWU ?? base.focusWU);
        const end = Number(override.endWU ?? base.endWU);
        if (!(start <= focus && focus <= end)) diagnostic(diagnostics, 'override-text-order', itemPath, 'Text override timing must satisfy startWU ≤ focusWU ≤ endWU.');
      }
      if (base && track === 'interactions') {
        const start = Number(override.startWU ?? base.startWU);
        const activation = Number(override.activationWU ?? base.activationWU);
        const end = Number(override.endWU ?? base.endWU);
        if (!(start <= activation && activation <= end)) diagnostic(diagnostics, 'override-interaction-order', itemPath, 'Interaction override timing must satisfy startWU ≤ activationWU ≤ endWU.');
      }
    });
  });

  const cameraKeys = [...indexes.camera.values()];
  let previousCameraWU = -1;
  cameraKeys.forEach((key, index) => {
    const atWU = Number(overrides.camera?.[key.id]?.atWU ?? key.atWU);
    if (atWU <= previousCameraWU) diagnostic(diagnostics, 'profile-camera-order', `${path}.camera.${key.id}.atWU`, 'Profile Camera keys must remain strictly ordered.');
    previousCameraWU = atWU;
    if (index === 0 && atWU !== 0) {
      diagnostic(diagnostics, 'profile-camera-endpoint', `${path}.camera.${key.id}.atWU`, 'Profile Camera overrides must preserve the Story WU start key.');
    }
  });
  const cameraOrientationKeys = [...(indexes.cameraOrientation?.values() || [])];
  let previousCameraOrientationWU = -1;
  cameraOrientationKeys.forEach((key) => {
    const atWU = Number(overrides.camera?.[key.id]?.atWU ?? key.atWU);
    if (atWU <= previousCameraOrientationWU) {
      diagnostic(
        diagnostics,
        'profile-camera-orientation-order',
        `${path}.camera.${key.id}.atWU`,
        'Profile Camera orientation keys must remain strictly ordered.',
      );
    }
    previousCameraOrientationWU = atWU;
  });

  if (currentSchema) {
    const visibilityKeys = [...indexes.visibility.values()];
    let previousVisibilityWU = -1;
    visibilityKeys.forEach((key, index) => {
      const atWU = Number(overrides.visibility?.[key.id]?.atWU ?? key.atWU);
      if (atWU <= previousVisibilityWU) diagnostic(diagnostics, 'profile-visibility-order', `${path}.visibility.${key.id}.atWU`, 'Profile Visibility keys must remain strictly ordered.');
      previousVisibilityWU = atWU;
      if (index === 0 && atWU !== 0) {
        diagnostic(diagnostics, 'profile-visibility-endpoint', `${path}.visibility.${key.id}.atWU`, 'Profile Visibility overrides must preserve the Story WU start key.');
      }
    });
  }

  const worlds = [...indexes.worlds.values()];
  const resolvedWorlds = worlds.map((world) => ({
    ...world,
    ...overrides.worlds?.[world.id],
    transitionIn: { ...world.transitionIn, ...(overrides.worlds?.[world.id]?.transitionIn || {}) },
  }));
  let previousWorldWU = -1;
  resolvedWorlds.forEach((world, index) => {
    const itemPath = `${path}.worlds.${world.id}`;
    if (Number(world.startWU) <= previousWorldWU) diagnostic(diagnostics, 'profile-world-order', `${itemPath}.startWU`, 'Profile World Starts must remain strictly ordered.');
    previousWorldWU = Number(world.startWU);
    if (index === 0 && Number(world.startWU) !== 0) diagnostic(diagnostics, 'profile-world-origin', `${itemPath}.startWU`, 'The first profile World must still start at Story WU 0.');
    const nextStartWU = Number(resolvedWorlds[index + 1]?.startWU ?? durationWU);
    if (Number(world.transitionIn.startWU) < Number(world.startWU)
      || Number(world.transitionIn.startWU) > Number(world.transitionIn.endWU)
      || Number(world.transitionIn.endWU) > nextStartWU) {
      diagnostic(diagnostics, 'profile-transition-window', `${itemPath}.transitionIn`, 'Profile World transition must remain between its World Start and the next World Start.');
    }
  });

  indexes.interactions.forEach((clip) => {
    const override = overrides.interactions?.[clip.id] || {};
    const startWU = Number(override.startWU ?? clip.startWU);
    const activationWU = Number(override.activationWU ?? clip.activationWU);
    const endWU = Number(override.endWU ?? clip.endWU);
    const worldIndex = resolvedWorlds.findIndex((world) => world.id === clip.targetWorldId);
    const worldStartWU = Number(resolvedWorlds[worldIndex]?.startWU);
    const worldEndWU = Number(resolvedWorlds[worldIndex + 1]?.startWU ?? durationWU);
    if (!(startWU <= activationWU && activationWU <= endWU)
      || worldIndex < 0
      || startWU < worldStartWU
      || endWU > worldEndWU) {
      diagnostic(diagnostics, 'profile-interaction-window', `${path}.interactions.${clip.id}`, 'Profile interaction timing must remain ordered inside its target World window.');
    }
  });
}

function validateTransform(transform, diagnostics, path, partial = false) {
  unknownKeys(diagnostics, transform, TRANSFORM_KEYS, path);
  if (!isObject(transform)) return;
  if (!partial || transform.position != null) validateVector(transform.position, diagnostics, `${path}.position`);
  if (!partial || transform.rotation != null) validateVector(transform.rotation, diagnostics, `${path}.rotation`);
  if (!partial || transform.scale != null) {
    if (!finite(transform.scale) || Number(transform.scale) <= 0) diagnostic(diagnostics, 'world-scale', `${path}.scale`, 'World scale must be positive and finite.');
  }
  if (transform.pointSizeScale != null && (!finite(transform.pointSizeScale) || Number(transform.pointSizeScale) <= 0)) {
    diagnostic(diagnostics, 'world-point-size', `${path}.pointSizeScale`, 'Relative point size must be positive and finite.');
  }
  [
    'mobileScale',
    'mobileXScale',
    'mobileYOffset',
    'mobileZOffset',
    'mobileNarrowWidth',
    'mobileWideWidth',
    'mobileNarrowScale',
    'mobileNarrowYOffset',
    'mobileNarrowDensity',
    'mobileLandscapeScale',
    'mobileLandscapeXScale',
    'mobileLandscapeXOffset',
    'mobileLandscapeYOffset',
    'mobileLandscapeZOffset',
  ].forEach((key) => {
    if (transform[key] != null && !finite(transform[key])) diagnostic(diagnostics, 'world-transform-number', `${path}.${key}`, 'Responsive transform values must be finite.');
    if ((key === 'mobileScale'
      || key === 'mobileXScale'
      || key === 'mobileNarrowWidth'
      || key === 'mobileWideWidth'
      || key === 'mobileNarrowScale'
      || key === 'mobileLandscapeScale'
      || key === 'mobileLandscapeXScale')
      && transform[key] != null
      && finite(transform[key])
      && Number(transform[key]) <= 0) {
      diagnostic(diagnostics, 'world-scale', `${path}.${key}`, 'Responsive World scales must be positive.');
    }
  });
  if (transform.mobileNarrowDensity != null
    && (!finite(transform.mobileNarrowDensity)
      || Number(transform.mobileNarrowDensity) < 0
      || Number(transform.mobileNarrowDensity) > 1)) {
    diagnostic(diagnostics, 'world-density', `${path}.mobileNarrowDensity`, 'Narrow mobile density must stay between 0 and 1.');
  }
  if (finite(transform.mobileNarrowWidth)
    && finite(transform.mobileWideWidth)
    && Number(transform.mobileNarrowWidth) >= Number(transform.mobileWideWidth)) {
    diagnostic(diagnostics, 'world-responsive-width', path, 'Narrow mobile width must be less than wide mobile width.');
  }
}

function validateTransition(transition, diagnostics, path, maximumWU, partial = false) {
  unknownKeys(diagnostics, transition, TRANSITION_KEYS, path);
  if (!isObject(transition)) return;
  if (!partial || transition.startWU != null) validateTime(transition.startWU, diagnostics, `${path}.startWU`, { max: maximumWU });
  if (!partial || transition.endWU != null) validateTime(transition.endWU, diagnostics, `${path}.endWU`, { max: maximumWU });
  if (transition.startWU != null && transition.endWU != null && Number(transition.startWU) > Number(transition.endWU)) diagnostic(diagnostics, 'transition-order', path, 'Transition startWU must not exceed endWU.');
  if (!partial || transition.type != null) if (!ABOUT_NARRATIVE_TRANSITION_TYPES.includes(transition.type)) diagnostic(diagnostics, 'transition-type', `${path}.type`, 'Unsupported transition type.');
  if (!partial || transition.easing != null) if (!ABOUT_NARRATIVE_EASINGS.includes(transition.easing)) diagnostic(diagnostics, 'transition-easing', `${path}.easing`, 'Unsupported transition easing.');
  if (!partial || transition.correspondence != null) if (!ABOUT_NARRATIVE_CORRESPONDENCE_MODES.includes(transition.correspondence)) diagnostic(diagnostics, 'transition-correspondence', `${path}.correspondence`, 'Unsupported correspondence strategy.');
}

function validateEditorialModuleItem(item, diagnostics, path, { requireLabel = false } = {}) {
  unknownKeys(diagnostics, item, MODULE_ITEM_KEYS, path);
  if (!isObject(item)) return;
  if (!ID_PATTERN.test(item.id || '')) diagnostic(diagnostics, 'module-item-id', `${path}.id`, 'Module item ID must be a lower-case slug.');
  if (requireLabel || item.label != null) validateSafeText(item.label, diagnostics, `${path}.label`, { required: requireLabel, maximum: 120 });
  if (item.src != null) validateSafeText(item.src, diagnostics, `${path}.src`, { maximum: 320 });
  if (item.alt != null) validateSafeText(item.alt, diagnostics, `${path}.alt`, { maximum: 180 });
  if (item.caption != null) validateSafeText(item.caption, diagnostics, `${path}.caption`, { maximum: 240 });
  if (item.scale != null && (!finite(item.scale) || Number(item.scale) < 0.2 || Number(item.scale) > 1.4)) {
    diagnostic(diagnostics, 'module-item-scale', `${path}.scale`, 'Logo scale must stay between 0.2 and 1.4.');
  }
  ['offsetX', 'offsetY'].forEach((key) => {
    if (item[key] != null && (!finite(item[key]) || Number(item[key]) < -30 || Number(item[key]) > 30)) {
      diagnostic(diagnostics, 'module-item-offset', `${path}.${key}`, 'Logo offsets must stay between -30 and 30 percent.');
    }
  });
}

function validateInteractiveStackItem(item, diagnostics, path, seenIds) {
  unknownKeys(diagnostics, item, INTERACTIVE_STACK_ITEM_KEYS, path);
  if (!isObject(item)) return;
  validateId(item.id, seenIds, diagnostics, `${path}.id`);
  if (!ABOUT_INTERACTIVE_STACK_ITEM_TYPES.includes(item.type)) {
    diagnostic(diagnostics, 'interactive-stack-item-type', `${path}.type`, 'Interactive stack items must be images or videos.');
  }
  validateSafeText(item.src, diagnostics, `${path}.src`, { required: true, maximum: 400 });
  validateSafeText(item.alt, diagnostics, `${path}.alt`, { required: true, maximum: 240 });
  ['width', 'height'].forEach((key) => {
    if (!Number.isInteger(Number(item[key])) || Number(item[key]) < 1 || Number(item[key]) > 8192) {
      diagnostic(diagnostics, 'interactive-stack-item-dimensions', `${path}.${key}`, 'Media dimensions must be whole pixels between 1 and 8192.');
    }
  });
  if (!finite(item.aspectRatio) || Number(item.aspectRatio) <= 0 || Number(item.aspectRatio) > 10) {
    diagnostic(diagnostics, 'interactive-stack-item-ratio', `${path}.aspectRatio`, 'Media aspect ratio must be greater than zero and no more than 10.');
  }
  if (item.fit != null && !ABOUT_INTERACTIVE_STACK_FITS.includes(item.fit)) {
    diagnostic(diagnostics, 'interactive-stack-item-fit', `${path}.fit`, 'Media fit must be cover or contain.');
  }
  if (item.type === 'video') {
    validateSafeText(item.poster, diagnostics, `${path}.poster`, { required: true, maximum: 400 });
  } else if (item.poster != null) {
    diagnostic(diagnostics, 'interactive-stack-image-poster', `${path}.poster`, 'Image items cannot define a video poster.');
  }
}

function validateInteractiveStackParameters(parameters, diagnostics, path) {
  unknownKeys(diagnostics, parameters, INTERACTIVE_STACK_PARAMETER_KEYS, path);
  if (!isObject(parameters)) return;
  [ABOUT_INTERACTIVE_STACK_SEED_CONTROL, ...ABOUT_INTERACTIVE_STACK_CONTROLS].forEach((control) => {
    const value = parameters[control.id];
    if (!finite(value) || Number(value) < control.min || Number(value) > control.max) {
      diagnostic(diagnostics, 'interactive-stack-parameter-range', `${path}.${control.id}`, `${control.label} must stay between ${control.min} and ${control.max}.`);
    }
    if (control.id === 'seed' && !Number.isInteger(Number(value))) {
      diagnostic(diagnostics, 'interactive-stack-seed-integer', `${path}.${control.id}`, 'Seed must be a whole number.');
    }
  });
}

function validateCareerSequenceItem(item, diagnostics, path, seenIds) {
  unknownKeys(diagnostics, item, CAREER_SEQUENCE_ITEM_KEYS, path);
  if (!isObject(item)) return;
  validateId(item.id, seenIds, diagnostics, `${path}.id`);
  validateSafeText(item.yearLabel, diagnostics, `${path}.yearLabel`, { required: true, maximum: 24 });
  validateSafeText(item.employer, diagnostics, `${path}.employer`, { required: true, maximum: 80 });
  validateSafeText(item.role, diagnostics, `${path}.role`, { required: true, maximum: 100 });
}

function countCareerSequenceWords(module) {
  const items = Array.isArray(module?.items) ? module.items : [];
  const authoredValues = [
    module?.label,
    ...items.flatMap((item) => [
      item?.yearLabel,
      item?.employer,
      item?.role,
    ]),
    module?.independentWork?.label,
    module?.independentWork?.text,
  ];
  return authoredValues.reduce((total, value) => (
    total + (String(value || '').match(WORD_PATTERN)?.length || 0)
  ), 0);
}

function validateCareerSequence(module, diagnostics, path) {
  validateSafeText(module.label, diagnostics, `${path}.label`, { required: true, maximum: 48 });
  if (!Array.isArray(module.items) || module.items.length < 4 || module.items.length > 5) {
    diagnostic(
      diagnostics,
      'career-sequence-item-count',
      `${path}.items`,
      'Career sequences require four or five jobs, ordered oldest to newest.',
    );
  } else {
    const seenItemIds = new Set();
    module.items.forEach((item, index) => validateCareerSequenceItem(
      item,
      diagnostics,
      `${path}.items.${index}`,
      seenItemIds,
    ));
  }
  if (module.independentWork != null) {
    const independentPath = `${path}.independentWork`;
    unknownKeys(
      diagnostics,
      module.independentWork,
      CAREER_SEQUENCE_INDEPENDENT_WORK_KEYS,
      independentPath,
    );
    if (isObject(module.independentWork)) {
      validateSafeText(module.independentWork.label, diagnostics, `${independentPath}.label`, { required: true, maximum: 40 });
      validateSafeText(module.independentWork.text, diagnostics, `${independentPath}.text`, { required: true, maximum: 120 });
    }
  }
  ['text', 'parameters', 'emphasis'].forEach((key) => {
    if (module[key] != null) {
      diagnostic(
        diagnostics,
        'career-sequence-field',
        `${path}.${key}`,
        `Career sequences cannot define “${key}”.`,
      );
    }
  });
  if (countCareerSequenceWords(module) > CAREER_SEQUENCE_MAX_WORDS) {
    diagnostic(
      diagnostics,
      'career-sequence-word-budget',
      path,
      `Career sequence reader copy must stay within ${CAREER_SEQUENCE_MAX_WORDS} words.`,
    );
  }
}

function validateEditorialModule(module, diagnostics, path) {
  unknownKeys(diagnostics, module, MODULE_KEYS, path);
  if (!isObject(module)) return;
  if (!ID_PATTERN.test(module.id || '')) diagnostic(diagnostics, 'module-id', `${path}.id`, 'Module ID must be a lower-case slug.');
  if (!MODULE_KINDS.has(module.kind)) diagnostic(diagnostics, 'module-kind', `${path}.kind`, 'Unsupported editorial module kind.');
  if (module.kind === 'prose') validateSafeText(module.text, diagnostics, `${path}.text`, { required: true });
  if (module.kind === ABOUT_NARRATIVE_CAREER_SEQUENCE_KIND) {
    validateCareerSequence(module, diagnostics, path);
  } else if (module.label != null) {
    validateSafeText(module.label, diagnostics, `${path}.label`, { maximum: 120 });
  }
  if (module.kind === 'list') {
    if (!Array.isArray(module.items) || module.items.length === 0) {
      diagnostic(diagnostics, 'module-items-required', `${path}.items`, 'Editorial lists require at least one item.');
    } else {
      module.items.forEach((item, index) => validateSafeText(item, diagnostics, `${path}.items.${index}`, { required: true, maximum: 240 }));
    }
  }
  if (module.kind === 'logo-grid') {
    if (!Array.isArray(module.items) || module.items.length === 0) diagnostic(diagnostics, 'module-items-required', `${path}.items`, 'Logo grids require at least one item.');
    else module.items.forEach((item, index) => validateEditorialModuleItem(item, diagnostics, `${path}.items.${index}`, { requireLabel: true }));
  }
  if (module.kind === 'media-deck') {
    if (!Array.isArray(module.items)) diagnostic(diagnostics, 'module-items', `${path}.items`, 'Media deck items must be an array.');
    else module.items.forEach((item, index) => validateEditorialModuleItem(item, diagnostics, `${path}.items.${index}`));
  }
  if (module.kind === ABOUT_INTERACTIVE_STACK_KIND) {
    const itemCount = Array.isArray(module.items) ? module.items.length : 0;
    if (!Array.isArray(module.items)
      || itemCount < ABOUT_INTERACTIVE_STACK_MIN_ITEMS
      || itemCount > ABOUT_INTERACTIVE_STACK_MAX_ITEMS) {
      diagnostic(
        diagnostics,
        'interactive-stack-item-count',
        `${path}.items`,
        `Interactive stacks require ${ABOUT_INTERACTIVE_STACK_MIN_ITEMS}–${ABOUT_INTERACTIVE_STACK_MAX_ITEMS} items.`,
      );
    } else {
      const seenItemIds = new Set();
      module.items.forEach((item, index) => validateInteractiveStackItem(
        item,
        diagnostics,
        `${path}.items.${index}`,
        seenItemIds,
      ));
    }
    validateInteractiveStackParameters(module.parameters, diagnostics, `${path}.parameters`);
  } else if (module.parameters != null && module.kind !== ABOUT_NARRATIVE_CAREER_SEQUENCE_KIND) {
    diagnostic(diagnostics, 'interactive-stack-parameters-owner', `${path}.parameters`, 'Only interactive stacks may define stack parameters.');
  }
  if (module.independentWork != null && module.kind !== ABOUT_NARRATIVE_CAREER_SEQUENCE_KIND) {
    diagnostic(diagnostics, 'career-sequence-independent-work-owner', `${path}.independentWork`, 'Only career sequences may define independent work.');
  }
  if (module.emphasis != null && module.kind !== ABOUT_NARRATIVE_CAREER_SEQUENCE_KIND) {
    if (!Array.isArray(module.emphasis)) diagnostic(diagnostics, 'module-emphasis', `${path}.emphasis`, 'Module emphasis must be an array.');
    else module.emphasis.forEach((item, index) => {
      const itemPath = `${path}.emphasis.${index}`;
      unknownKeys(diagnostics, item, EMPHASIS_KEYS, itemPath);
      if (!isObject(item)) return;
      validateSafeText(item.text, diagnostics, `${itemPath}.text`, { required: true });
      if (!ABOUT_NARRATIVE_EMPHASIS_TONES.includes(item.tone)) diagnostic(diagnostics, 'emphasis-tone', `${itemPath}.tone`, 'Unsupported emphasis tone.');
    });
  }
}

function validateEditorialReveal(reveal, diagnostics, path, { legacy = false } = {}) {
  unknownKeys(diagnostics, reveal, legacy ? LEGACY_REVEAL_KEYS : REVEAL_KEYS, path);
  if (!isObject(reveal)) return;
  if (legacy) ['fadeDelayWU', 'blurDelayWU'].forEach((key) => {
    if (!finite(reveal[key]) || Number(reveal[key]) < 0 || Number(reveal[key]) > 0.8) diagnostic(diagnostics, 'editorial-reveal-delay', `${path}.${key}`, 'Editorial reveal delays must stay between 0 and 0.8 WU.');
  });
  (legacy ? ['fadeDurationWU', 'blurDurationWU'] : ['fadeDurationWU']).forEach((key) => {
    if (!finite(reveal[key]) || Number(reveal[key]) < 0.02 || Number(reveal[key]) > 0.8) diagnostic(diagnostics, 'editorial-reveal-duration', `${path}.${key}`, 'Editorial reveal durations must stay between 0.02 and 0.8 WU.');
  });
}

function validateBlock(block, diagnostics, path) {
  unknownKeys(diagnostics, block, BLOCK_KEYS, path);
  if (!isObject(block)) return;
  if (!ID_PATTERN.test(block.id || '')) diagnostic(diagnostics, 'block-id', `${path}.id`, 'Block ID must be a lower-case slug.');
  if (!ABOUT_NARRATIVE_BLOCK_KINDS.includes(block.kind)) diagnostic(diagnostics, 'block-kind', `${path}.kind`, 'Unsupported editorial block kind.');
  const itemKind = ['clients', 'disciplines', 'list'].includes(block.kind);
  const stackKind = block.kind === 'stack';
  if (itemKind && (!Array.isArray(block.items) || block.items.length === 0)) {
    diagnostic(diagnostics, 'block-items-required', `${path}.items`, `${block.kind} blocks require at least one item.`);
  }
  if (!itemKind && !stackKind && (typeof block.text !== 'string' || !block.text.trim())) {
    diagnostic(diagnostics, 'block-text-required', `${path}.text`, `${block.kind || 'Editorial'} blocks require non-empty text.`);
  }
  if (block.text != null) validateSafeText(block.text, diagnostics, `${path}.text`);
  if (block.label != null) validateSafeText(block.label, diagnostics, `${path}.label`, { maximum: 120 });
  if (block.items != null) {
    if (!Array.isArray(block.items)) diagnostic(diagnostics, 'block-items', `${path}.items`, 'Block items must be an array.');
    else block.items.forEach((item, index) => {
      const itemPath = `${path}.items.${index}`;
      // Old documents used plain strings. Canonical v7 disciplines are records
      // so the visible label and its short editorial description travel together.
      if (block.kind !== 'disciplines' || typeof item === 'string') {
        validateSafeText(item, diagnostics, itemPath, { required: true, maximum: 240 });
        return;
      }
      unknownKeys(diagnostics, item, BLOCK_DISCIPLINE_ITEM_KEYS, itemPath);
      if (!isObject(item)) return;
      if (!ID_PATTERN.test(item.id || '')) diagnostic(diagnostics, 'discipline-item-id', `${itemPath}.id`, 'Discipline item ID must be a lower-case slug.');
      validateSafeText(item.label, diagnostics, `${itemPath}.label`, { required: true, maximum: 120 });
      validateSafeText(item.description, diagnostics, `${itemPath}.description`, { required: true, maximum: 320 });
    });
  }
  if (stackKind) {
    if (!Array.isArray(block.modules) || block.modules.length === 0) diagnostic(diagnostics, 'block-modules-required', `${path}.modules`, 'Stack blocks require at least one module.');
    else {
      const seenModuleIds = new Set();
      block.modules.forEach((module, index) => {
        const modulePath = `${path}.modules.${index}`;
        if (isObject(module)) validateId(module.id, seenModuleIds, diagnostics, `${modulePath}.id`);
        validateEditorialModule(module, diagnostics, modulePath);
      });
    }
  } else if (block.modules != null) {
    diagnostic(diagnostics, 'block-modules-owner', `${path}.modules`, 'Only stack blocks may contain modules.');
  }
  if (block.moduleGapRem != null
    && (!finite(block.moduleGapRem) || Number(block.moduleGapRem) < 0.5 || Number(block.moduleGapRem) > 6)) {
    diagnostic(diagnostics, 'block-module-gap', `${path}.moduleGapRem`, 'Editorial module spacing must stay between 0.5 and 6 rem.');
  }
  if (block.emphasis != null) {
    if (!Array.isArray(block.emphasis)) diagnostic(diagnostics, 'block-emphasis', `${path}.emphasis`, 'Emphasis must be an array.');
    else block.emphasis.forEach((item, index) => {
      const itemPath = `${path}.emphasis.${index}`;
      unknownKeys(diagnostics, item, EMPHASIS_KEYS, itemPath);
      if (!isObject(item)) return;
      validateSafeText(item.text, diagnostics, `${itemPath}.text`, { required: true });
      if (!ABOUT_NARRATIVE_EMPHASIS_TONES.includes(item.tone)) diagnostic(diagnostics, 'emphasis-tone', `${itemPath}.tone`, 'Unsupported emphasis tone.');
    });
  }
  if (block.worldInfluence != null && typeof block.worldInfluence !== 'boolean') diagnostic(diagnostics, 'world-influence', `${path}.worldInfluence`, 'worldInfluence must be boolean.');
}

function validateTextField(field, index, seen, diagnostics, durationWU, schemaVersion) {
  const path = `tracks.text.fields.${index}`;
  const allowed = field?.kind === 'title' ? TITLE_KEYS
    : field?.kind === 'scroll-block' ? SCROLL_BLOCK_KEYS
      : field?.kind === 'stub' ? STUB_KEYS
        : field?.kind === 'discipline-reveal'
          ? schemaVersion >= 5 ? DISCIPLINE_KEYS : LEGACY_DISCIPLINE_KEYS
          : TEXT_BASE_KEYS;
  unknownKeys(diagnostics, field, allowed, path);
  if (!isObject(field)) return;
  validateId(field.id, seen, diagnostics, `${path}.id`);
  if (!ABOUT_NARRATIVE_TRACK_TEXT_KINDS.includes(field.kind)) diagnostic(diagnostics, 'text-kind', `${path}.kind`, 'Unsupported Text field kind.');
  ['startWU', 'focusWU', 'endWU'].forEach((key) => validateTime(field[key], diagnostics, `${path}.${key}`, { max: durationWU }));
  if (!(Number(field.startWU) <= Number(field.focusWU) && Number(field.focusWU) <= Number(field.endWU))) diagnostic(diagnostics, 'text-order', path, 'Text timing must satisfy startWU ≤ focusWU ≤ endWU.');
  if (typeof field.publishable !== 'boolean') diagnostic(diagnostics, 'text-publishable', `${path}.publishable`, 'publishable must be boolean.');
  if (field.flow != null) {
    unknownKeys(diagnostics, field.flow, STORY_FLOW_KEYS, `${path}.flow`);
    if (isObject(field.flow)) {
      const minScreens = Number(field.flow.minScreens);
      if (!Number.isFinite(minScreens) || minScreens < 0.2 || minScreens > 12) {
        diagnostic(
          diagnostics,
          'story-flow-minimum',
          `${path}.flow.minScreens`,
          'Story block minimum length must be between 0.2 and 12 screens.',
        );
      }
      if (!STORY_GAP_PRESETS.has(field.flow.gapAfter)) {
        diagnostic(
          diagnostics,
          'story-flow-gap',
          `${path}.flow.gapAfter`,
          'Story block gapAfter must be none, tight, standard, chapter, finale, passage, or arrival.',
        );
      }
      if (!STORY_FOCUS_MODES.has(field.flow.focusMode)) {
        diagnostic(
          diagnostics,
          'story-flow-focus',
          `${path}.flow.focusMode`,
          'Story block focusMode must be middle or reading-start.',
        );
      }
      if (field.flow.focusOffsetScreens != null) {
        const focusOffsetScreens = Number(field.flow.focusOffsetScreens);
        if (!Number.isFinite(focusOffsetScreens) || focusOffsetScreens < 0 || focusOffsetScreens > 6) {
          diagnostic(
            diagnostics,
            'story-flow-focus-offset',
            `${path}.flow.focusOffsetScreens`,
            'Story block focus offset must be between 0 and 6 screens.',
          );
        }
      }
    }
  }
  if (field.presentation != null) {
    unknownKeys(diagnostics, field.presentation, PRESENTATION_KEYS, `${path}.presentation`);
    if (isObject(field.presentation)) {
      validateSafeText(field.presentation.layout, diagnostics, `${path}.presentation.layout`, { required: true, maximum: 80 });
      if (field.presentation.viewportY != null) {
        const viewportY = Number(field.presentation.viewportY);
        const minimumViewportY = 0;
        const maximumViewportY = 100;
        if (!Number.isFinite(viewportY) || viewportY < minimumViewportY || viewportY > maximumViewportY) {
          diagnostic(
            diagnostics,
            'title-viewport-y',
            `${path}.presentation.viewportY`,
            'Title viewportY must be between 0 and 100 percent.',
          );
        }
        if (field.kind !== 'title') {
          diagnostic(
            diagnostics,
            'title-viewport-y-owner',
            `${path}.presentation.viewportY`,
            'viewportY is only supported by Titles.',
          );
        }
      }
    }
  }
  if (field.kind === 'title') {
    validateSafeText(field.text, diagnostics, `${path}.text`, { required: true });
    if (field.description != null) {
      validateSafeText(field.description, diagnostics, `${path}.description`, { required: true, maximum: 320 });
      if (!['opener-v1', 'finale-v1'].includes(field.preset)) diagnostic(diagnostics, 'title-description-preset', `${path}.description`, 'Only opener and finale Titles may include a description.');
    }
    if (!ABOUT_NARRATIVE_TEXT_MOVEMENT_MODES.includes(field.movement)) diagnostic(diagnostics, 'title-movement', `${path}.movement`, 'Title movement must be spatial or vertical.');
    validateSafeText(field.preset, diagnostics, `${path}.preset`, { required: true, maximum: 80 });
    if (field.titleStyle != null && !ABOUT_NARRATIVE_TITLE_STYLES.includes(field.titleStyle)) diagnostic(diagnostics, 'title-style', `${path}.titleStyle`, 'Title style must be standard or display.');
    if (field.anchor != null) validateSafeText(field.anchor, diagnostics, `${path}.anchor`, { required: true, maximum: 80 });
  } else if (field.kind === 'scroll-block') {
    validateBlock(field.block, diagnostics, `${path}.block`);
    if (field.reveal != null) validateEditorialReveal(
      field.reveal,
      diagnostics,
      `${path}.reveal`,
      { legacy: schemaVersion <= 4 },
    );
  } else if (field.kind === 'stub') {
    validateSafeText(field.label, diagnostics, `${path}.label`, { required: true, maximum: 120 });
    if (field.publishable !== false) diagnostic(diagnostics, 'stub-publishable', `${path}.publishable`, 'Stub fields cannot be published.');
  } else if (field.kind === 'discipline-reveal') {
    if (field.protected !== true) diagnostic(diagnostics, 'discipline-protected', `${path}.protected`, 'The migrated Discipline reveal must remain protected.');
    if (schemaVersion <= 4) {
      validateTime(field.fieldTravelStartWU, diagnostics, `${path}.fieldTravelStartWU`, { max: durationWU });
      validateTime(field.fieldTravelEndWU, diagnostics, `${path}.fieldTravelEndWU`, { max: durationWU });
      if (Number(field.fieldTravelStartWU) >= Number(field.fieldTravelEndWU)) diagnostic(diagnostics, 'discipline-travel-order', path, 'Discipline field travel start must precede its end.');
    }
    unknownKeys(diagnostics, field.choreography, schemaVersion >= 5 ? CHOREOGRAPHY_KEYS : LEGACY_CHOREOGRAPHY_KEYS, `${path}.choreography`);
    const choreography = field.choreography;
    if (isObject(choreography)) {
      const finiteKeys = ['backgroundOpacity', 'reconnectOpacity', 'pointScale', 'labelOffsetPx', 'labelScale'];
      if (schemaVersion <= 4) finiteKeys.push('fieldTravelWU', 'fieldFogStartWU', 'fieldFogEndWU', 'fieldFogStrength');
      finiteKeys.forEach((key) => {
        if (!finite(choreography[key])) diagnostic(diagnostics, 'discipline-number', `${path}.choreography.${key}`, 'Discipline choreography values must be finite.');
      });
      ['staggerWU', 'backgroundFadeWU', 'labelDurationWU', 'holdWU'].forEach((key) => {
        validateTime(choreography[key], diagnostics, `${path}.choreography.${key}`, { max: durationWU });
      });
      if (schemaVersion <= 4 && Number(choreography.fieldFogStartWU) >= Number(choreography.fieldFogEndWU)) diagnostic(diagnostics, 'discipline-fog-order', `${path}.choreography`, 'Discipline fog start must precede its end.');
      if (!Array.isArray(choreography.items) || choreography.items.length !== 6) diagnostic(diagnostics, 'discipline-items', `${path}.choreography.items`, 'Discipline reveal requires exactly six items.');
      else {
        const groups = new Set();
        choreography.items.forEach((item, itemIndex) => {
          const itemPath = `${path}.choreography.items.${itemIndex}`;
          unknownKeys(diagnostics, item, DISCIPLINE_ITEM_KEYS, itemPath);
          if (!Number.isInteger(item?.group) || item.group < 1 || item.group > 6 || groups.has(item.group)) diagnostic(diagnostics, 'discipline-group', `${itemPath}.group`, 'Discipline groups must uniquely cover 1 through 6.');
          groups.add(item?.group);
          validateSafeText(item?.label, diagnostics, `${itemPath}.label`, { required: true, maximum: 80 });
          if (item?.position != null) validateDisciplinePosition(item.position, diagnostics, `${itemPath}.position`);
          if (item?.mobilePosition != null) validateDisciplinePosition(item.mobilePosition, diagnostics, `${itemPath}.mobilePosition`);
        });
        const lastRevealEndWU = Number(field.startWU)
          + (Math.max(0, choreography.items.length - 1) * Number(choreography.staggerWU))
          + Number(choreography.labelDurationWU)
          + Number(choreography.holdWU);
        if (lastRevealEndWU > Number(field.endWU) + 0.000001) diagnostic(diagnostics, 'discipline-timing', `${path}.choreography`, 'Absolute stagger, label duration, and hold must fit inside the Discipline reveal field.');
      }
    }
  }
}

function validateDisciplineMotionParameters(clip, diagnostics, path, schemaVersion) {
  const parameters = clip.parameters;
  if (!isObject(parameters)) return;
  if (schemaVersion <= 4) {
    ['fieldTravelDurationWU', 'fieldTravelWU', 'fieldFogStartWU', 'fieldFogEndWU', 'fieldFogStrength', 'backgroundScale'].forEach((key) => {
      if (!finite(parameters[key])) diagnostic(diagnostics, 'discipline-motion-number', `${path}.parameters.${key}`, 'Legacy Discipline Motion values must be finite.');
    });
    if (Number(parameters.fieldTravelDurationWU) > Number(clip.endWU) - Number(clip.startWU) + 0.000001) {
      diagnostic(diagnostics, 'discipline-motion-travel', `${path}.parameters.fieldTravelDurationWU`, 'Field travel must fit inside the Discipline reveal Motion clip.');
    }
    if (Number(parameters.fieldFogStartWU) >= Number(parameters.fieldFogEndWU)) {
      diagnostic(diagnostics, 'discipline-motion-fog-order', `${path}.parameters`, 'Discipline field fog start must precede its end.');
    }
  }
  if (Number(parameters.restoreDurationWU) > Number(clip.endWU) - Number(clip.startWU) + 0.000001) {
    diagnostic(diagnostics, 'discipline-motion-restore-window', `${path}.parameters.restoreDurationWU`, 'Grid restore duration must fit inside the Discipline reveal Motion clip.');
  }
  ['backgroundFadeWU', 'reconnectOpacity', 'labelOffsetPx', 'labelScale'].forEach((key) => {
    if (parameters[key] != null && !finite(parameters[key])) {
      diagnostic(diagnostics, 'discipline-motion-number', `${path}.parameters.${key}`, 'Legacy Discipline Motion values must be finite.');
    }
  });
  const items = parameters.items;
  if (!Array.isArray(items) || items.length !== 6) {
    diagnostic(diagnostics, 'discipline-motion-items', `${path}.parameters.items`, 'Discipline reveal Motion requires exactly six labelled items.');
    return;
  }
  const groups = new Set();
  items.forEach((item, itemIndex) => {
    const itemPath = `${path}.parameters.items.${itemIndex}`;
    unknownKeys(diagnostics, item, DISCIPLINE_ITEM_KEYS, itemPath);
    if (!Number.isInteger(item?.group) || item.group < 1 || item.group > 6 || groups.has(item.group)) {
      diagnostic(diagnostics, 'discipline-motion-group', `${itemPath}.group`, 'Discipline groups must uniquely cover 1 through 6.');
    }
    groups.add(item?.group);
    validateSafeText(item?.label, diagnostics, `${itemPath}.label`, { required: true, maximum: 80 });
    if (item?.description != null) {
      validateSafeText(item.description, diagnostics, `${itemPath}.description`, { required: true, maximum: 180 });
    }
    if (item?.position != null) validateDisciplinePosition(item.position, diagnostics, `${itemPath}.position`);
    if (item?.mobilePosition != null) validateDisciplinePosition(item.mobilePosition, diagnostics, `${itemPath}.mobilePosition`);
  });
  if (schemaVersion >= 5
    && finite(parameters.settleDurationWU)
    && finite(parameters.beatDurationWU)) {
    const itemsPerBeat = Math.max(1, Math.min(
      items.length,
      Math.round(Number(parameters.itemsPerBeat) || 1),
    ));
    const beatCount = Math.ceil(items.length / itemsPerBeat);
    const sequenceDurationWU = Number(parameters.settleDurationWU)
      + (beatCount * Number(parameters.beatDurationWU))
      + Number(parameters.restoreDurationWU);
    const clipDurationWU = Number(clip.endWU) - Number(clip.startWU);
    if (sequenceDurationWU > clipDurationWU + 0.000001) {
      diagnostic(
        diagnostics,
        'discipline-sequence-window',
        `${path}.parameters`,
        'Lane settle, discipline beats, and grid restore must fit inside the Discipline reveal Motion clip.',
      );
    }
  }
  if (schemaVersion <= 4 && items.length === 6 && groups.size === 6) {
    ['desktop', 'mobile'].forEach((profile) => {
      const minimum = getAboutNarrativeDisciplineMinimumSeparation(items, profile);
      if (minimum < ABOUT_NARRATIVE_DISCIPLINE_MIN_SEPARATION - 0.000001) {
        diagnostic(
          diagnostics,
          'discipline-position-spacing',
          `${path}.parameters.items`,
          `${profile === 'mobile' ? 'Mobile' : 'Desktop'} Discipline anchors must remain at least ${ABOUT_NARRATIVE_DISCIPLINE_MIN_SEPARATION} grid units apart.`,
        );
      }
    });
  }
}

function validateLibrary(library, diagnostics) {
  unknownKeys(diagnostics, library, LIBRARY_KEYS, 'library');
  if (!isObject(library)) return;
  if (!Array.isArray(library.presets)) {
    diagnostic(diagnostics, 'library-presets', 'library.presets', 'Library presets must be an array.');
    return;
  }
  const ids = new Set();
  library.presets.forEach((preset, index) => {
    const path = `library.presets.${index}`;
    unknownKeys(diagnostics, preset, PRESET_KEYS, path);
    if (!isObject(preset)) return;
    validateId(preset.id, ids, diagnostics, `${path}.id`);
    validateSafeText(preset.label, diagnostics, `${path}.label`, { required: true, maximum: 120 });
    validateSafeText(preset.scope, diagnostics, `${path}.scope`, { required: true, maximum: 80 });
    if (preset.protected != null && typeof preset.protected !== 'boolean') diagnostic(diagnostics, 'preset-protected', `${path}.protected`, 'Preset protected must be boolean.');
  });
}

export function validateAboutNarrativeTrackDocument(input, {
  expectedSchemaVersion = ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION,
} = {}) {
  const diagnostics = [];
  if (!isObject(input)) return [{ level: 'error', code: 'document-envelope', path: 'document', message: 'Track document must be an object.' }];
  rejectSectionlikeKeys(input, diagnostics);
  unknownKeys(diagnostics, input, TOP_LEVEL_KEYS, 'document');
  if (input.schemaVersion !== expectedSchemaVersion) diagnostic(diagnostics, 'schema-version', 'schemaVersion', `Track schema version ${expectedSchemaVersion} is required.`);
  const schemaVersion = Number(input.schemaVersion);
  const legacyCamera = schemaVersion === 3;
  const currentSchema = schemaVersion >= 5;
  validateGlobals(input.globals, diagnostics, schemaVersion);

  const tracks = input.tracks;
  unknownKeys(diagnostics, tracks, currentSchema ? TRACK_KEYS : LEGACY_TRACK_KEYS, 'tracks');
  if (!isObject(tracks)) return diagnostics;
  unknownKeys(diagnostics, tracks.camera, CAMERA_TRACK_KEYS, 'tracks.camera');
  if (currentSchema) unknownKeys(diagnostics, tracks.visibility, VISIBILITY_TRACK_KEYS, 'tracks.visibility');
  unknownKeys(diagnostics, tracks.worlds, WORLD_TRACK_KEYS, 'tracks.worlds');
  unknownKeys(diagnostics, tracks.text, TEXT_TRACK_KEYS, 'tracks.text');
  unknownKeys(diagnostics, tracks.interactions, INTERACTION_TRACK_KEYS, 'tracks.interactions');

  const cameraKeys = tracks.camera?.keys;
  const cameraOrientationKeys = tracks.camera?.orientationKeys || [];
  const visibilityKeys = tracks.visibility?.keys;
  const worlds = tracks.worlds?.objects;
  const textFields = tracks.text?.fields;
  const clips = tracks.interactions?.clips;
  if (!Array.isArray(cameraKeys) || cameraKeys.length < 2) diagnostic(diagnostics, 'camera-track', 'tracks.camera.keys', 'Camera track requires at least two keys.');
  if (!Array.isArray(cameraOrientationKeys)) diagnostic(diagnostics, 'camera-orientation-track', 'tracks.camera.orientationKeys', 'Camera orientation keys must be an array.');
  if (Array.isArray(cameraOrientationKeys) && cameraOrientationKeys.length === 1) diagnostic(diagnostics, 'camera-orientation-track', 'tracks.camera.orientationKeys', 'Camera orientation track requires either zero keys or at least two keys.');
  if (currentSchema && (!Array.isArray(visibilityKeys) || visibilityKeys.length < 2)) diagnostic(diagnostics, 'visibility-track', 'tracks.visibility.keys', 'Visibility track requires at least two keys.');
  if (!Array.isArray(worlds) || worlds.length < 1) diagnostic(diagnostics, 'world-track', 'tracks.worlds.objects', 'World track requires at least one World Start.');
  if (!Array.isArray(textFields)) diagnostic(diagnostics, 'text-track', 'tracks.text.fields', 'Text fields must be an array.');
  if (!Array.isArray(clips)) diagnostic(diagnostics, 'interaction-track', 'tracks.interactions.clips', 'Interaction clips must be an array.');

  const durationWU = Number(input.profiles?.desktop?.storyDurationWU);
  const seen = new Set();
  let previousCameraWU = -1;
  (cameraKeys || []).forEach((key, index) => {
    const path = `tracks.camera.keys.${index}`;
    unknownKeys(diagnostics, key, legacyCamera
      ? LEGACY_CAMERA_KEY_KEYS
      : schemaVersion === 4 ? VERSION_4_CAMERA_KEY_KEYS : CAMERA_KEY_KEYS, path);
    if (!isObject(key)) return;
    validateId(key.id, seen, diagnostics, `${path}.id`);
    validateTime(key.atWU, diagnostics, `${path}.atWU`, { max: durationWU });
    if (Number(key.atWU) <= previousCameraWU) diagnostic(diagnostics, 'camera-order', `${path}.atWU`, 'Camera keys must be strictly ordered by atWU.');
    previousCameraWU = Number(key.atWU);
    if (legacyCamera) {
      validateVector(key.offset, diagnostics, `${path}.offset`);
      validateVector(key.lookAtOffset, diagnostics, `${path}.lookAtOffset`);
      if (!finite(key.roll)) diagnostic(diagnostics, 'camera-roll', `${path}.roll`, 'Roll must be finite.');
    } else {
      validateVector(key.position, diagnostics, `${path}.position`);
      validateVector(key.rotation, diagnostics, `${path}.rotation`);
      if (key.aimEnabled != null && typeof key.aimEnabled !== 'boolean') diagnostic(diagnostics, 'camera-aim-enabled', `${path}.aimEnabled`, 'Camera aim enabled must be boolean.');
      const aimEnabled = key.aimEnabled ?? Array.isArray(key.lookAtTarget);
      if (aimEnabled && key.lookAtTarget == null) diagnostic(diagnostics, 'camera-look-at-target', path, 'Enabled camera aim requires a look-at target.');
      if (key.lookAtTarget != null) {
        validateVector(key.lookAtTarget, diagnostics, `${path}.lookAtTarget`);
        if (aimEnabled && Math.hypot(
          Number(key.lookAtTarget?.[0]) - Number(key.position?.[0]),
          Number(key.lookAtTarget?.[1]) - Number(key.position?.[1]),
          Number(key.lookAtTarget?.[2]) - Number(key.position?.[2]),
        ) < 0.01) diagnostic(diagnostics, 'camera-look-at-distance', path, 'Camera and look-at target must be at least 0.01 WU apart.');
      }
      if (key.lookAtRoll != null && !finite(key.lookAtRoll)) diagnostic(diagnostics, 'camera-look-at-roll', `${path}.lookAtRoll`, 'Look-at roll must be finite.');
    }
    if (!finite(key.fov) || key.fov < 20 || key.fov > 90) diagnostic(diagnostics, 'camera-fov', `${path}.fov`, 'FOV must stay between 20 and 90.');
    if (schemaVersion <= 4) {
      // Per-key fog is optional for existing v3 documents. When absent, the
      // canonical global camera fog values are materialized by v4 normalization.
      if (key.distanceFogStartWU != null && (!finite(key.distanceFogStartWU) || key.distanceFogStartWU < 0 || key.distanceFogStartWU > 40)) diagnostic(diagnostics, 'camera-fog-start', `${path}.distanceFogStartWU`, 'Camera fog start must stay between 0 and 40 WU.');
      if (key.distanceFogEndWU != null && (!finite(key.distanceFogEndWU) || key.distanceFogEndWU < 0.1 || key.distanceFogEndWU > 240)) diagnostic(diagnostics, 'camera-fog-end', `${path}.distanceFogEndWU`, 'Camera fog end must stay between 0.1 and 240 WU.');
      const fogStartWU = Number(key.distanceFogStartWU ?? input.globals?.camera?.distanceFogStartWU ?? 8);
      const fogEndWU = Number(key.distanceFogEndWU ?? input.globals?.camera?.distanceFogEndWU ?? 18);
      if (finite(fogStartWU) && finite(fogEndWU) && fogStartWU >= fogEndWU) diagnostic(diagnostics, 'camera-fog-order', path, 'Camera fog must begin before circles are fully faded.');
    }
    if (!ABOUT_NARRATIVE_CAMERA_EASINGS.includes(key.easing) && !parseAboutNarrativeCameraEasing(key.easing)) diagnostic(diagnostics, 'camera-easing', `${path}.easing`, 'Camera easing must be a soft cubic-bezier curve.');
    if (typeof key.locked !== 'boolean') diagnostic(diagnostics, 'camera-locked', `${path}.locked`, 'Camera locked must be boolean.');
    if (key.locked !== (index === 0 || index === cameraKeys.length - 1)) diagnostic(diagnostics, 'camera-boundary-lock', `${path}.locked`, 'Only story start and story end Camera keys may be locked.');
  });
  if (cameraKeys?.length && Number(cameraKeys[0].atWU) !== 0) diagnostic(diagnostics, 'camera-endpoints', 'tracks.camera.keys', 'Camera keys must begin at Story WU 0.');

  let previousCameraOrientationWU = -1;
  (cameraOrientationKeys || []).forEach((key, index) => {
    const path = `tracks.camera.orientationKeys.${index}`;
    unknownKeys(diagnostics, key, CAMERA_ORIENTATION_KEY_KEYS, path);
    if (!isObject(key)) return;
    validateId(key.id, seen, diagnostics, `${path}.id`);
    validateTime(key.atWU, diagnostics, `${path}.atWU`, { max: durationWU });
    if (Number(key.atWU) <= previousCameraOrientationWU) diagnostic(diagnostics, 'camera-orientation-order', `${path}.atWU`, 'Camera orientation keys must be strictly ordered by atWU.');
    previousCameraOrientationWU = Number(key.atWU);
    validateVector(key.rotation, diagnostics, `${path}.rotation`);
    if (!ABOUT_NARRATIVE_CAMERA_EASINGS.includes(key.easing) && !parseAboutNarrativeCameraEasing(key.easing)) diagnostic(diagnostics, 'camera-orientation-easing', `${path}.easing`, 'Camera orientation easing must be a soft cubic-bezier curve.');
    if (typeof key.locked !== 'boolean') diagnostic(diagnostics, 'camera-orientation-locked', `${path}.locked`, 'Camera orientation locked must be boolean.');
  });

  if (currentSchema) {
    let previousVisibilityWU = -1;
    (visibilityKeys || []).forEach((key, index) => {
      const path = `tracks.visibility.keys.${index}`;
      unknownKeys(diagnostics, key, VISIBILITY_KEY_KEYS, path);
      if (!isObject(key)) return;
      validateId(key.id, seen, diagnostics, `${path}.id`);
      validateTime(key.atWU, diagnostics, `${path}.atWU`, { max: durationWU });
      if (Number(key.atWU) <= previousVisibilityWU) diagnostic(diagnostics, 'visibility-order', `${path}.atWU`, 'Visibility keys must be strictly ordered by atWU.');
      previousVisibilityWU = Number(key.atWU);
      if (!finite(key.visibility) || Number(key.visibility) < 0 || Number(key.visibility) > 1) diagnostic(diagnostics, 'visibility-range', `${path}.visibility`, 'Visibility must stay between 0 and 1.');
      if (!ABOUT_NARRATIVE_VISIBILITY_EASINGS.includes(key.easing)) diagnostic(diagnostics, 'visibility-easing', `${path}.easing`, 'Visibility easing must be linear, smoothstep, or ease-in-out.');
      if (typeof key.locked !== 'boolean') diagnostic(diagnostics, 'visibility-locked', `${path}.locked`, 'Visibility locked must be boolean.');
      if (key.locked !== (index === 0 || index === visibilityKeys.length - 1)) diagnostic(diagnostics, 'visibility-boundary-lock', `${path}.locked`, 'Only story start and story end Visibility keys may be locked.');
    });
    if (visibilityKeys?.length && Number(visibilityKeys[0].atWU) !== 0) diagnostic(diagnostics, 'visibility-endpoints', 'tracks.visibility.keys', 'Visibility keys must begin at Story WU 0.');
  }

  let previousWorldWU = -1;
  const worldIds = new Set();
  (worlds || []).forEach((world, index) => {
    const path = `tracks.worlds.objects.${index}`;
    unknownKeys(diagnostics, world, WORLD_KEYS, path);
    if (!isObject(world)) return;
    validateId(world.id, seen, diagnostics, `${path}.id`);
    worldIds.add(world.id);
    validateSafeText(world.label, diagnostics, `${path}.label`, { required: true, maximum: 120 });
    if (world.protected != null && typeof world.protected !== 'boolean') diagnostic(diagnostics, 'world-protected', `${path}.protected`, 'World protected must be boolean.');
    validateTime(world.startWU, diagnostics, `${path}.startWU`, { max: durationWU });
    validateTime(world.anchorWU, diagnostics, `${path}.anchorWU`, { max: durationWU });
    if (Number(world.startWU) <= previousWorldWU) diagnostic(diagnostics, 'world-order', `${path}.startWU`, 'World Starts must be strictly ordered.');
    previousWorldWU = Number(world.startWU);
    if (index === 0 && Number(world.startWU) !== 0) diagnostic(diagnostics, 'world-origin', `${path}.startWU`, 'The first World must start at Story WU 0.');
    const adapter = ABOUT_NARRATIVE_ADAPTER_DEFINITIONS[world.adapterId];
    const shape = ABOUT_NARRATIVE_SHAPE_DEFINITIONS[world.shapeId];
    if (!adapter) diagnostic(diagnostics, 'world-adapter', `${path}.adapterId`, 'Unknown World adapter.');
    if (!shape) diagnostic(diagnostics, 'world-shape', `${path}.shapeId`, 'Unknown World Shape.');
    if (adapter && shape && shape.adapterId !== adapter.id) diagnostic(diagnostics, 'world-shape-adapter', path, 'World Shape is incompatible with its adapter.');
    if (!finite(world.seed) || !Number.isInteger(Number(world.seed))) diagnostic(diagnostics, 'world-seed', `${path}.seed`, 'World seed must be a finite integer.');
    if (!finite(world.entryDistanceWU)) diagnostic(diagnostics, 'world-entry-distance', `${path}.entryDistanceWU`, 'Entry distance must be finite.');
    validateTransform(world.transform, diagnostics, `${path}.transform`);
    const nextStartWU = Number(worlds[index + 1]?.startWU ?? durationWU);
    validateTransition(world.transitionIn, diagnostics, `${path}.transitionIn`, nextStartWU);
    if (Number(world.transitionIn?.startWU) < Number(world.startWU) || Number(world.transitionIn?.endWU) > nextStartWU) diagnostic(diagnostics, 'world-transition-window', `${path}.transitionIn`, 'World transition must remain between this World Start and the next World Start.');
    if (shape && isObject(world.shapeParameters)) {
      unknownKeys(diagnostics, world.shapeParameters, new Set(shape.parameters.map((control) => control.id)), `${path}.shapeParameters`);
      shape.parameters.forEach((control) => validateControlValue(world.shapeParameters[control.id], control, diagnostics, `${path}.shapeParameters.${control.id}`));
    } else if (!isObject(world.shapeParameters)) diagnostic(diagnostics, 'shape-parameters', `${path}.shapeParameters`, 'Shape parameters must be an object.');
    if (!Array.isArray(world.modifiers)) diagnostic(diagnostics, 'world-modifiers', `${path}.modifiers`, 'World modifiers must be an array.');
    else {
      const modifierIds = new Set();
      world.modifiers.forEach((modifier, modifierIndex) => {
        const modifierPath = `${path}.modifiers.${modifierIndex}`;
        unknownKeys(diagnostics, modifier, MODIFIER_KEYS, modifierPath);
        if (!isObject(modifier)) return;
        const definition = ABOUT_NARRATIVE_MODIFIER_DEFINITIONS[modifier.id];
        if (!definition) diagnostic(diagnostics, 'modifier-id', `${modifierPath}.id`, 'Unknown modifier.');
        if (modifierIds.has(modifier.id)) diagnostic(diagnostics, 'modifier-duplicate', `${modifierPath}.id`, 'A modifier may appear only once in a World stack.');
        modifierIds.add(modifier.id);
        if (typeof modifier.enabled !== 'boolean') diagnostic(diagnostics, 'modifier-enabled', `${modifierPath}.enabled`, 'Modifier enabled must be boolean.');
        if (definition && isObject(modifier.parameters)) {
          unknownKeys(diagnostics, modifier.parameters, new Set(definition.parameters.map((control) => control.id)), `${modifierPath}.parameters`);
          definition.parameters.forEach((control) => validateControlValue(modifier.parameters[control.id], control, diagnostics, `${modifierPath}.parameters.${control.id}`));
        } else if (!isObject(modifier.parameters)) diagnostic(diagnostics, 'modifier-parameters', `${modifierPath}.parameters`, 'Modifier parameters must be an object.');
      });
    }
  });

  let previousTextWU = -1;
  (textFields || []).forEach((field, index) => {
    validateTextField(field, index, seen, diagnostics, durationWU, schemaVersion);
    if (Number(field?.startWU) < previousTextWU) diagnostic(diagnostics, 'text-track-order', `tracks.text.fields.${index}.startWU`, 'Text fields must be ordered by startWU.');
    previousTextWU = Number(field?.startWU);
  });
  const careerSequenceLocations = (textFields || []).flatMap((field, fieldIndex) => (
    (field?.block?.modules || []).flatMap((module, moduleIndex) => (
      module?.kind === ABOUT_NARRATIVE_CAREER_SEQUENCE_KIND
        ? [{ field, fieldIndex, module, moduleIndex }]
        : []
    ))
  ));
  if (careerSequenceLocations.length > 1) {
    diagnostic(
      diagnostics,
      'career-sequence-count',
      'tracks.text.fields',
      'The public About narrative can contain at most one career sequence.',
    );
  }
  if (careerSequenceLocations.length === 1) {
    const [{ field, fieldIndex, module, moduleIndex }] = careerSequenceLocations;
    const modules = field.block.modules;
    const practiceIndex = modules.findIndex((candidate) => candidate?.id === 'practice');
    const path = `tracks.text.fields.${fieldIndex}.block.modules.${moduleIndex}`;
    if (field.id !== 'text-background-unit' || practiceIndex < 0 || moduleIndex !== practiceIndex + 1) {
      diagnostic(
        diagnostics,
        'career-sequence-placement',
        path,
        'The career sequence must appear in text-background-unit immediately after practice.',
      );
    }
    if (module.id !== ABOUT_NARRATIVE_CAREER_SEQUENCE_KIND) {
      diagnostic(
        diagnostics,
        'career-sequence-id',
        `${path}.id`,
        'The canonical career sequence ID must be career-sequence.',
      );
    }
    const genericBackgroundLocation = (textFields || []).flatMap((candidateField, candidateFieldIndex) => (
      (candidateField?.block?.modules || []).map((candidateModule, candidateModuleIndex) => ({
        fieldIndex: candidateFieldIndex,
        module: candidateModule,
        moduleIndex: candidateModuleIndex,
      }))
    )).find(({ module: candidateModule }) => candidateModule?.id === 'background');
    if (genericBackgroundLocation) {
      diagnostic(
        diagnostics,
        'career-sequence-generic-background',
        `tracks.text.fields.${genericBackgroundLocation.fieldIndex}.block.modules.${genericBackgroundLocation.moduleIndex}`,
        'Remove the temporary generic career paragraph when the approved career sequence is present.',
      );
    }
  }
  let previousClipWU = -1;
  (clips || []).forEach((clip, index) => {
    const path = `tracks.interactions.clips.${index}`;
    unknownKeys(diagnostics, clip, INTERACTION_KEYS, path);
    if (!isObject(clip)) return;
    validateId(clip.id, seen, diagnostics, `${path}.id`);
    if (clip.protected != null && typeof clip.protected !== 'boolean') diagnostic(diagnostics, 'interaction-protected', `${path}.protected`, 'Interaction protected must be boolean.');
    ['startWU', 'activationWU', 'endWU'].forEach((key) => validateTime(clip[key], diagnostics, `${path}.${key}`, { max: durationWU }));
    if (!(Number(clip.startWU) <= Number(clip.activationWU) && Number(clip.activationWU) <= Number(clip.endWU))) diagnostic(diagnostics, 'interaction-order', path, 'Interaction timing must satisfy startWU ≤ activationWU ≤ endWU.');
    if (Number(clip.startWU) < previousClipWU) diagnostic(diagnostics, 'interaction-track-order', `${path}.startWU`, 'Interaction clips must be ordered by startWU.');
    previousClipWU = Number(clip.startWU);
    const worldIndex = (worlds || []).findIndex((world) => world.id === clip.targetWorldId);
    if (worldIndex < 0) diagnostic(diagnostics, 'interaction-target', `${path}.targetWorldId`, 'Interaction targetWorldId must reference a World.');
    else {
      const worldStart = Number(worlds[worldIndex].startWU);
      const worldEnd = Number(worlds[worldIndex + 1]?.startWU ?? durationWU);
      if (Number(clip.startWU) < worldStart || Number(clip.endWU) > worldEnd) diagnostic(diagnostics, 'interaction-world-window', path, 'Interaction clip must remain inside its target World active window.');
    }
    const interactionDefinition = ABOUT_NARRATIVE_INTERACTION_DEFINITIONS[clip.type];
    if (!interactionDefinition) {
      diagnostic(diagnostics, 'interaction-type', `${path}.type`, 'Unsupported interaction type.');
    } else if (interactionDefinition.parameters.length && !isObject(clip.parameters)) {
      diagnostic(diagnostics, 'interaction-parameters', `${path}.parameters`, 'Interaction parameters must be an object.');
    } else if (isObject(clip.parameters)) {
      const allowedParameterIds = new Set(interactionDefinition.parameters.map((control) => control.id));
      if (clip.type === 'discipline-reveal') {
        allowedParameterIds.add('items');
        RETIRED_DISCIPLINE_MOTION_PARAMETER_KEYS.forEach((key) => allowedParameterIds.add(key));
        ['backgroundFadeWU', 'reconnectOpacity', 'labelOffsetPx', 'labelScale'].forEach((key) => allowedParameterIds.add(key));
      }
      if (clip.type === 'grid-ripple' && schemaVersion <= 4) {
        REMOVED_GRID_RIPPLE_PARAMETER_KEYS.forEach((key) => allowedParameterIds.add(key));
      }
      unknownKeys(
        diagnostics,
        clip.parameters,
        allowedParameterIds,
        `${path}.parameters`,
      );
      interactionDefinition.parameters.forEach((control) => {
        if (clip.type === 'discipline-reveal' && clip.parameters[control.id] == null) return;
        validateControlValue(
          clip.parameters[control.id],
          control,
          diagnostics,
          `${path}.parameters.${control.id}`,
        );
      });
      if (clip.type === 'discipline-reveal') {
        validateDisciplineMotionParameters(clip, diagnostics, path, schemaVersion);
        if (worldIndex >= 0 && worlds[worldIndex].shapeId !== 'calm-field-v1') {
          diagnostic(diagnostics, 'discipline-motion-world', `${path}.targetWorldId`, 'Discipline reveal Motion must target the unchanged calm-field World.');
        }
      }
    }
  });

  const disciplineMotionCount = (clips || []).filter((clip) => clip.type === 'discipline-reveal').length;
  const legacyDisciplineFieldCount = (textFields || []).filter((field) => field.kind === 'discipline-reveal').length;
  if (disciplineMotionCount > 1 || (disciplineMotionCount && legacyDisciplineFieldCount)) {
    diagnostic(diagnostics, 'discipline-motion-owner', 'tracks', 'Discipline reveal choreography must have exactly one owner: Motion or legacy Text, never both.');
  }

  const indexes = {
    camera: new Map((cameraKeys || []).map((item) => [item.id, item])),
    cameraOrientation: new Map((cameraOrientationKeys || []).map((item) => [item.id, item])),
    visibility: new Map((visibilityKeys || []).map((item) => [item.id, item])),
    worlds: new Map((worlds || []).map((item) => [item.id, item])),
    text: new Map((textFields || []).map((item) => [item.id, item])),
    interactions: new Map((clips || []).map((item) => [item.id, item])),
  };
  validateProfiles(input.profiles, diagnostics, durationWU, indexes, schemaVersion);
  validateLibrary(input.library, diagnostics);

  const finale = worlds?.at(-1);
  if (!finale || finale.protected !== true) diagnostic(diagnostics, 'finale-world', 'tracks.worlds.objects', 'The final World must remain protected.');
  if (finale && !(textFields || []).some((field) => field.publishable && field.startWU <= durationWU && field.endWU >= finale.startWU)) diagnostic(diagnostics, 'finale-text', 'tracks.text.fields', 'The final World requires publishable Text.');

  const byteLength = new TextEncoder().encode(JSON.stringify(input)).byteLength;
  if (byteLength > ABOUT_NARRATIVE_MAX_DOCUMENT_BYTES) diagnostic(diagnostics, 'document-size', 'document', 'The About document exceeds the 1MiB safety limit.');
  return diagnostics;
}

export function assertValidAboutNarrativeTrackDocument(document) {
  const diagnostics = validateAboutNarrativeTrackDocument(document);
  const errors = diagnostics.filter((item) => item.level === 'error');
  if (errors.length) {
    const error = new Error(errors.map((item) => `${item.path}: ${item.message}`).join('\n'));
    error.name = 'AboutNarrativeTrackValidationError';
    error.diagnostics = diagnostics;
    error.original = cloneAboutNarrativeDocument(document);
    throw error;
  }
  return diagnostics;
}

function sortObjectKeys(value) {
  return Object.fromEntries(Object.entries(value || {}).sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => [key, cloneAboutNarrativeDocument(child)]));
}

function normalizeOverrides(overrides = {}, { includeVisibility = true } = {}) {
  return {
    camera: Object.fromEntries(Object.entries(overrides.camera || {}).sort(([left], [right]) => left.localeCompare(right)).map(([id, override]) => [id, {
      ...cloneAboutNarrativeDocument(override),
      ...(override.easing == null ? {} : { easing: normalizeAboutNarrativeCameraEasing(override.easing) }),
    }])),
    ...(includeVisibility ? { visibility: sortObjectKeys(overrides.visibility) } : {}),
    worlds: sortObjectKeys(overrides.worlds),
    text: sortObjectKeys(overrides.text),
    interactions: sortObjectKeys(overrides.interactions),
  };
}

function normalizeCameraAimKey(key) {
  const aimEnabled = key.aimEnabled ?? Array.isArray(key.lookAtTarget);
  const lookAtTarget = Array.isArray(key.lookAtTarget)
    ? [...key.lookAtTarget]
    : writeAboutNarrativeCameraTargetFromRotation([0, 0, 0], key.position, key.rotation, 1);
  return {
    ...key,
    aimEnabled,
    lookAtTarget,
    lookAtRoll: Number(key.lookAtRoll || 0),
  };
}

export function normalizeAboutNarrativeTrackDocument(input) {
  const source = cloneAboutNarrativeDocument(input);
  const textFields = [...source.tracks.text.fields];
  const firstEditorialReveal = textFields.find((field) => field.kind === 'scroll-block' && field.reveal)?.reveal;
  const openerViewportY = textFields.find((field) => field.kind === 'title' && ['opener-v1', 'finale-v1'].includes(field.preset) && field.presentation?.viewportY != null)?.presentation?.viewportY;
  const standardViewportY = textFields.find((field) => field.kind === 'title' && !['opener-v1', 'finale-v1'].includes(field.preset) && field.presentation?.viewportY != null)?.presentation?.viewportY;
  const editorialMotion = {
    ...firstEditorialReveal,
    ...source.globals.editorialMotion,
  };
  const globals = {
    ...source.globals,
    editorialMotion: {
      fadeDurationWU: Number(
        editorialMotion.fadeDurationWU
        ?? ABOUT_NARRATIVE_EDITORIAL_MOTION_DEFAULTS.fadeDurationWU,
      ),
      maxBlurPx: Number(
        editorialMotion.maxBlurPx
        ?? ABOUT_NARRATIVE_EDITORIAL_MOTION_DEFAULTS.maxBlurPx,
      ),
      travelPx: Number(
        editorialMotion.travelPx
        ?? ABOUT_NARRATIVE_EDITORIAL_MOTION_DEFAULTS.travelPx,
      ),
    },
    textMotion: {
      ...source.globals.textMotion,
      standardViewportY: Number(source.globals.textMotion?.standardViewportY ?? standardViewportY ?? 50),
      bookendViewportY: Number(source.globals.textMotion?.bookendViewportY ?? openerViewportY ?? 70),
      titleShadowOpacity: Number(source.globals.textMotion?.titleShadowOpacity ?? 0.3),
      titleShadowBlurPx: Number(source.globals.textMotion?.titleShadowBlurPx ?? 28),
      titleDrawDurationMs: Number(source.globals.textMotion?.titleDrawDurationMs ?? 220),
      titleColorCount: Number(source.globals.textMotion?.titleColorCount ?? 5),
      titleLineStaggerMs: Number(source.globals.textMotion?.titleLineStaggerMs ?? 140),
      titleExitOpacity: Number(source.globals.textMotion?.titleExitOpacity ?? 0.2),
      titleExitLineStagger: Number(source.globals.textMotion?.titleExitLineStagger ?? 0.16),
    },
  };
  return {
    schemaVersion: ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION,
    globals,
    profiles: {
      desktop: { ...source.profiles.desktop, overrides: normalizeOverrides(source.profiles.desktop.overrides) },
      tablet: { ...source.profiles.tablet, overrides: normalizeOverrides(source.profiles.tablet.overrides) },
      mobile: { ...source.profiles.mobile, overrides: normalizeOverrides(source.profiles.mobile.overrides) },
      'reduced-motion': { mode: 'overlay', motionPolicy: 'settled' },
    },
    tracks: {
      camera: {
        keys: [...source.tracks.camera.keys]
          .map((inputKey) => {
            const key = normalizeCameraAimKey(inputKey);
            return {
              ...key,
              easing: normalizeAboutNarrativeCameraEasing(key.easing),
            };
          })
          .sort((left, right) => left.atWU - right.atWU || left.id.localeCompare(right.id)),
        ...(Array.isArray(source.tracks.camera.orientationKeys) ? {
          orientationKeys: [...source.tracks.camera.orientationKeys]
            .map((key) => ({
              ...cloneAboutNarrativeDocument(key),
              easing: normalizeAboutNarrativeCameraEasing(key.easing),
            }))
            .sort((left, right) => left.atWU - right.atWU || left.id.localeCompare(right.id)),
        } : {}),
      },
      visibility: { keys: [...source.tracks.visibility.keys]
        .sort((left, right) => left.atWU - right.atWU || left.id.localeCompare(right.id)) },
      worlds: { objects: [...source.tracks.worlds.objects].sort((left, right) => left.startWU - right.startWU || left.id.localeCompare(right.id)) },
      text: { fields: textFields.map((field) => {
        const normalizedField = cloneAboutNarrativeDocument(field);
        if (normalizedField.kind === 'scroll-block') delete normalizedField.reveal;
        if (normalizedField.kind === 'title' && normalizedField.presentation) delete normalizedField.presentation.viewportY;
        return normalizedField;
      }).sort((left, right) => left.startWU - right.startWU || left.focusWU - right.focusWU || left.id.localeCompare(right.id)) },
      interactions: { clips: [...source.tracks.interactions.clips].sort((left, right) => left.startWU - right.startWU || left.id.localeCompare(right.id)) },
    },
    library: { presets: [...source.library.presets].sort((left, right) => left.id.localeCompare(right.id)) },
  };
}

function normalizeAboutNarrativeVersion4TrackDocument(input) {
  const source = cloneAboutNarrativeDocument(input);
  return {
    schemaVersion: 4,
    globals: source.globals,
    profiles: {
      desktop: { ...source.profiles.desktop, overrides: normalizeOverrides(source.profiles.desktop.overrides, { includeVisibility: false }) },
      tablet: { ...source.profiles.tablet, overrides: normalizeOverrides(source.profiles.tablet.overrides, { includeVisibility: false }) },
      mobile: { ...source.profiles.mobile, overrides: normalizeOverrides(source.profiles.mobile.overrides, { includeVisibility: false }) },
      'reduced-motion': { mode: 'overlay', motionPolicy: 'settled' },
    },
    tracks: {
      camera: { keys: [...source.tracks.camera.keys]
        .map((key) => ({
          ...key,
          distanceFogStartWU: Number(key.distanceFogStartWU ?? source.globals.camera?.distanceFogStartWU ?? 8),
          distanceFogEndWU: Number(key.distanceFogEndWU ?? source.globals.camera?.distanceFogEndWU ?? 18),
          easing: normalizeAboutNarrativeCameraEasing(key.easing),
        }))
        .sort((left, right) => left.atWU - right.atWU || left.id.localeCompare(right.id)) },
      worlds: { objects: [...source.tracks.worlds.objects].sort((left, right) => left.startWU - right.startWU || left.id.localeCompare(right.id)) },
      text: { fields: [...source.tracks.text.fields].sort((left, right) => left.startWU - right.startWU || left.focusWU - right.focusWU || left.id.localeCompare(right.id)) },
      interactions: { clips: [...source.tracks.interactions.clips].sort((left, right) => left.startWU - right.startWU || left.id.localeCompare(right.id)) },
    },
    library: { presets: [...source.library.presets].sort((left, right) => left.id.localeCompare(right.id)) },
  };
}

export function serializeAboutNarrativeTrackDocument(input) {
  assertValidAboutNarrativeTrackDocument(input);
  const normalized = normalizeAboutNarrativeTrackDocument(input);
  assertValidAboutNarrativeTrackDocument(normalized);
  return `${JSON.stringify(normalized, null, 2)}\n`;
}

function legacySpans(document, profile = 'desktop') {
  let startWU = 0;
  return document.sections.map((section) => {
    const extentWU = Number(profile === 'mobile' ? section.mobileExtentWU : section.extentWU);
    const span = { startWU: cleanWU(startWU), travelWU: cleanWU(Math.max(0.001, extentWU - 1)), extentWU };
    startWU += extentWU;
    return [section.id, span];
  });
}

function globalWU(span, local) {
  return cleanWU(span.startWU + (Number(local || 0) * span.travelWU));
}

function migrateCameraKeys(document, spans, durationWU) {
  const keys = [];
  let previousEnd = null;
  document.sections.forEach((section) => {
    const span = spans.get(section.id);
    const localKeys = cloneAboutNarrativeDocument(section.camera.keys);
    if (previousEnd && localKeys[0]) {
      localKeys[0] = { ...localKeys[0], offset: [...previousEnd.offset], lookAtOffset: [...previousEnd.lookAtOffset], fov: previousEnd.fov, roll: previousEnd.roll };
    }
    localKeys.forEach((key, index) => keys.push({
      id: `camera-${section.id}-${index}`,
      atWU: globalWU(span, key.at),
      offset: [...key.offset],
      lookAtOffset: [...key.lookAtOffset],
      fov: Number(key.fov),
      roll: Number(key.roll),
      distanceFogStartWU: Number(document.globals.camera.distanceFogStartWU ?? 8),
      distanceFogEndWU: Number(document.globals.camera.distanceFogEndWU ?? 18),
      easing: key.easing,
      locked: false,
    }));
    previousEnd = localKeys.at(-1) || previousEnd;
  });
  keys.sort((left, right) => left.atWU - right.atWU || left.id.localeCompare(right.id));
  keys.forEach((key, index) => { key.locked = index === 0 || index === keys.length - 1; });
  if (keys.at(-1)) keys.at(-1).atWU = durationWU;
  return keys;
}

function migrateWorlds(document, spans) {
  const worlds = document.sections.filter((section) => section.world.mode === 'set').map((section) => {
    const span = spans.get(section.id);
    return {
      id: `world-${section.id}`,
      label: section.label,
      startWU: span.startWU,
      anchorWU: span.startWU,
      adapterId: section.world.adapterId,
      shapeId: section.world.shapeId,
      seed: section.world.seed,
      entryDistanceWU: section.world.entryDistanceWU,
      transform: cloneAboutNarrativeDocument(section.world.transform),
      transitionIn: {
        startWU: globalWU(span, section.world.transitionIn.start),
        endWU: globalWU(span, section.world.transitionIn.end),
        type: section.world.transitionIn.type,
        easing: section.world.transitionIn.easing,
        correspondence: section.world.transitionIn.correspondence,
      },
      shapeParameters: cloneAboutNarrativeDocument(section.world.shapeParameters),
      modifiers: cloneAboutNarrativeDocument(section.world.modifiers || []),
      ...(section.type === 'finale' ? { protected: true } : {}),
    };
  });
  return worlds.sort((left, right) => left.startWU - right.startWU || left.id.localeCompare(right.id));
}

function presentation(section) {
  return { layout: section.layout };
}

function legacyCueMotionInterval(cue, textMotion, movement) {
  const enter = Number(cue.enter ?? 0);
  const focus = Number(cue.hold ?? ((enter + Number(cue.exit ?? 1)) * 0.5));
  const exit = Number(cue.exit ?? 1);
  if (movement === 'vertical') return { start: enter, focus, end: exit };
  const durationScale = Math.max(0.01, Number(textMotion?.durationScale ?? 1));
  return {
    start: Math.max(0, focus - ((focus - enter) * durationScale)),
    focus,
    end: Math.min(1, focus + ((exit - focus) * durationScale)),
  };
}

function migrateText(document, spans) {
  return document.sections.flatMap((section) => {
    const span = spans.get(section.id);
    const fields = (section.text.cues || []).map((cue) => {
      const movement = cue.motion?.mode === 'vertical' ? 'vertical' : 'spatial';
      const interval = legacyCueMotionInterval(cue, document.globals.textMotion, movement);
      return {
        id: `text-${cue.id}`,
        kind: 'title',
        startWU: globalWU(span, interval.start),
        focusWU: globalWU(span, interval.focus),
        endWU: globalWU(span, interval.end),
        publishable: true,
        presentation: presentation(section),
        movement,
        preset: cue.preset,
        text: cue.text,
        ...(cue.anchor ? { anchor: cue.anchor } : {}),
      };
    });
    const blocks = section.text.blocks || [];
    const segmentWU = span.travelWU / Math.max(1, blocks.length);
    blocks.forEach((block, index) => {
      const startWU = cleanWU(span.startWU + (segmentWU * index));
      const endWU = cleanWU(index === blocks.length - 1 ? span.startWU + span.travelWU : startWU + segmentWU);
      fields.push({ id: `text-${block.id}`, kind: 'scroll-block', startWU, focusWU: cleanWU(startWU + ((endWU - startWU) * 0.5)), endWU, publishable: true, presentation: presentation(section), block: cloneAboutNarrativeDocument(block) });
    });
    const reveal = section.text.disciplineReveal;
    if (reveal) {
      fields.push({
        id: `text-${reveal.id}`,
        kind: 'discipline-reveal',
        startWU: globalWU(span, reveal.start),
        focusWU: globalWU(span, (Number(reveal.start) + Number(reveal.end)) * 0.5),
        endWU: globalWU(span, reveal.end),
        publishable: true,
        protected: true,
        presentation: presentation(section),
        fieldTravelStartWU: globalWU(span, reveal.fieldTravelStart),
        fieldTravelEndWU: globalWU(span, reveal.fieldTravelEnd),
        choreography: {
          fieldTravelWU: reveal.fieldTravelWU,
          fieldFogStartWU: reveal.fieldFogStartWU,
          fieldFogEndWU: reveal.fieldFogEndWU,
          fieldFogStrength: reveal.fieldFogStrength,
          staggerWU: cleanWU(reveal.stagger * span.travelWU),
          backgroundFadeWU: cleanWU(reveal.backgroundFade * span.travelWU),
          backgroundOpacity: reveal.backgroundOpacity,
          reconnectOpacity: reveal.reconnectOpacity,
          pointScale: reveal.pointScale,
          labelOffsetPx: reveal.labelOffsetPx,
          labelScale: reveal.labelScale ?? 1,
          labelDurationWU: cleanWU(reveal.labelDuration * span.travelWU),
          holdWU: cleanWU(reveal.hold * span.travelWU),
          items: cloneAboutNarrativeDocument(reveal.items),
        },
      });
    }
    if (section.text.profile) fields.push({ id: `text-${section.id}-profile`, kind: 'scroll-block', startWU: globalWU(span, 0.62), focusWU: globalWU(span, 0.72), endWU: globalWU(span, 0.9), publishable: true, presentation: presentation(section), block: { id: `${section.id}-profile`, kind: 'prose', text: section.text.profile } });
    if (section.text.prompt) fields.push({ id: `text-${section.id}-prompt`, kind: 'scroll-block', startWU: globalWU(span, 0.72), focusWU: globalWU(span, 0.82), endWU: globalWU(span, 1), publishable: true, presentation: presentation(section), block: { id: `${section.id}-prompt`, kind: 'detail', text: section.text.prompt } });
    return fields;
  }).sort((left, right) => left.startWU - right.startWU || left.focusWU - right.focusWU || left.id.localeCompare(right.id));
}

function activeWorldAt(worlds, storyWU) {
  let active = worlds[0];
  worlds.forEach((world) => { if (world.startWU <= storyWU) active = world; });
  return active;
}

function migrateInteractions(document, spans, worlds, durationWU) {
  return document.sections.flatMap((section) => {
    if (!section.interaction || section.interaction.type === 'none') return [];
    const activationWU = globalWU(spans.get(section.id), section.interaction.activationStart ?? 0);
    const target = activeWorldAt(worlds, activationWU);
    const targetIndex = worlds.findIndex((world) => world.id === target?.id);
    return [{
      id: `interaction-${section.id}`,
      type: section.interaction.type,
      startWU: target.startWU,
      activationWU,
      endWU: cleanWU(worlds[targetIndex + 1]?.startWU ?? durationWU),
      targetWorldId: target.id,
      ...(section.type === 'finale' ? { protected: true } : {}),
    }];
  }).sort((left, right) => left.startWU - right.startWU || left.id.localeCompare(right.id));
}

export function migrateAboutNarrativeVersion2To3(input) {
  const raw = cloneAboutNarrativeDocument(input);
  const sourceErrors = validateAboutNarrativeDocument(raw, { expectedSchemaVersion: 2 }).filter((item) => item.level === 'error');
  if (sourceErrors.length) {
    const error = new Error(sourceErrors.map((item) => `${item.path}: ${item.message}`).join('\n'));
    error.name = 'AboutNarrativeTrackMigrationError';
    error.diagnostics = sourceErrors;
    error.original = raw;
    throw error;
  }
  const document = normalizeAboutNarrativeDocument(raw);
  const spans = new Map(legacySpans(document));
  const desktopDurationWU = cleanWU(document.sections.reduce((sum, section) => sum + section.extentWU, 0) - 1);
  const mobileDurationWU = cleanWU(document.sections.reduce((sum, section) => sum + section.mobileExtentWU, 0) - 1);
  const worlds = migrateWorlds(document, spans);
  const emptyOverrides = () => ({ camera: {}, worlds: {}, text: {}, interactions: {} });
  const migrated = {
    schemaVersion: 3,
    globals: cloneAboutNarrativeDocument(document.globals),
    profiles: {
      desktop: { storyDurationWU: desktopDurationWU, scrollDurationWU: desktopDurationWU, overrides: emptyOverrides() },
      tablet: { storyDurationWU: desktopDurationWU, scrollDurationWU: desktopDurationWU, overrides: emptyOverrides() },
      mobile: { storyDurationWU: desktopDurationWU, scrollDurationWU: mobileDurationWU, overrides: emptyOverrides() },
      'reduced-motion': { mode: 'overlay', motionPolicy: 'settled' },
    },
    tracks: {
      camera: { keys: migrateCameraKeys(document, spans, desktopDurationWU) },
      worlds: { objects: worlds },
      text: { fields: migrateText(document, spans) },
      interactions: { clips: migrateInteractions(document, spans, worlds, desktopDurationWU) },
    },
    library: cloneAboutNarrativeDocument(document.library || { presets: [] }),
  };
  return {
    ...migrated,
    profiles: {
      desktop: { ...migrated.profiles.desktop, overrides: normalizeOverrides(migrated.profiles.desktop.overrides, { includeVisibility: false }) },
      tablet: { ...migrated.profiles.tablet, overrides: normalizeOverrides(migrated.profiles.tablet.overrides, { includeVisibility: false }) },
      mobile: { ...migrated.profiles.mobile, overrides: normalizeOverrides(migrated.profiles.mobile.overrides, { includeVisibility: false }) },
      'reduced-motion': { mode: 'overlay', motionPolicy: 'settled' },
    },
    tracks: {
      camera: { keys: migrated.tracks.camera.keys.map((key) => ({
        ...key,
        distanceFogStartWU: Number(key.distanceFogStartWU ?? migrated.globals.camera?.distanceFogStartWU ?? 8),
        distanceFogEndWU: Number(key.distanceFogEndWU ?? migrated.globals.camera?.distanceFogEndWU ?? 18),
        easing: normalizeAboutNarrativeCameraEasing(key.easing),
      })).sort((left, right) => left.atWU - right.atWU || left.id.localeCompare(right.id)) },
      worlds: { objects: migrated.tracks.worlds.objects.sort((left, right) => left.startWU - right.startWU || left.id.localeCompare(right.id)) },
      text: { fields: migrated.tracks.text.fields.sort((left, right) => left.startWU - right.startWU || left.focusWU - right.focusWU || left.id.localeCompare(right.id)) },
      interactions: { clips: migrated.tracks.interactions.clips.sort((left, right) => left.startWU - right.startWU || left.id.localeCompare(right.id)) },
    },
    library: { presets: [...migrated.library.presets].sort((left, right) => left.id.localeCompare(right.id)) },
  };
}

function migrateLegacyCameraOverride(override, baseKey, globals) {
  const merged = {
    ...baseKey,
    ...override,
    offset: [...(override.offset || baseKey.offset)],
    lookAtOffset: [...(override.lookAtOffset || baseKey.lookAtOffset)],
  };
  const pose = migrateLegacyAboutNarrativeCameraPose(merged, globals);
  return {
    ...(override.atWU == null ? {} : { atWU: Number(override.atWU) }),
    position: pose.position,
    rotation: pose.rotation,
    ...(override.fov == null ? {} : { fov: Number(override.fov) }),
    ...(override.distanceFogStartWU == null ? {} : { distanceFogStartWU: Number(override.distanceFogStartWU) }),
    ...(override.distanceFogEndWU == null ? {} : { distanceFogEndWU: Number(override.distanceFogEndWU) }),
    ...(override.easing == null ? {} : { easing: normalizeAboutNarrativeCameraEasing(override.easing) }),
  };
}

function mixLegacyCameraValue(from, to, progress) {
  return Number(from) + ((Number(to) - Number(from)) * progress);
}

function sampleLegacyCameraSegment(from, to, progress, globals, easingCurve) {
  const eased = progress <= 0
    ? 0
    : progress >= 1
      ? 1
      : applyAboutNarrativeCameraEasing(easingCurve, progress);
  const atWU = cleanWU(mixLegacyCameraValue(from.atWU, to.atWU, progress));
  const legacyKey = {
    atWU,
    offset: from.offset.map((value, index) => mixLegacyCameraValue(value, to.offset[index], eased)),
    lookAtOffset: from.lookAtOffset.map((value, index) => mixLegacyCameraValue(value, to.lookAtOffset[index], eased)),
    roll: mixLegacyCameraValue(from.roll, to.roll, eased),
  };
  const pose = migrateLegacyAboutNarrativeCameraPose(legacyKey, globals);
  return {
    progress,
    atWU,
    position: pose.position,
    rotation: pose.rotation,
    quaternion: writeAboutNarrativeCameraQuaternion([0, 0, 0, 1], pose.rotation),
    fov: mixLegacyCameraValue(from.fov, to.fov, eased),
    distanceFogStartWU: mixLegacyCameraValue(
      from.distanceFogStartWU ?? globals.camera.distanceFogStartWU ?? 8,
      to.distanceFogStartWU ?? globals.camera.distanceFogStartWU ?? 8,
      eased,
    ),
    distanceFogEndWU: mixLegacyCameraValue(
      from.distanceFogEndWU ?? globals.camera.distanceFogEndWU ?? 18,
      to.distanceFogEndWU ?? globals.camera.distanceFogEndWU ?? 18,
      eased,
    ),
  };
}

function legacyCameraQuaternionErrorDegrees(actual, expected) {
  const dot = Math.min(1, Math.abs(
    (actual[0] * expected[0])
    + (actual[1] * expected[1])
    + (actual[2] * expected[2])
    + (actual[3] * expected[3]),
  ));
  return (2 * Math.acos(dot) * 180) / Math.PI;
}

function legacyCameraBakeNeedsSplit(from, midpoint, to) {
  const localProgress = (midpoint.progress - from.progress) / (to.progress - from.progress);
  const interpolatedPosition = from.position.map((value, index) => (
    mixLegacyCameraValue(value, to.position[index], localProgress)
  ));
  const positionError = Math.hypot(
    midpoint.position[0] - interpolatedPosition[0],
    midpoint.position[1] - interpolatedPosition[1],
    midpoint.position[2] - interpolatedPosition[2],
  );
  const interpolatedQuaternion = slerpAboutNarrativeCameraQuaternionInto(
    [0, 0, 0, 1],
    from.quaternion,
    to.quaternion,
    localProgress,
  );
  const rotationError = legacyCameraQuaternionErrorDegrees(midpoint.quaternion, interpolatedQuaternion);
  const scalarError = Math.max(
    Math.abs(midpoint.fov - mixLegacyCameraValue(from.fov, to.fov, localProgress)),
    Math.abs(midpoint.distanceFogStartWU - mixLegacyCameraValue(from.distanceFogStartWU, to.distanceFogStartWU, localProgress)),
    Math.abs(midpoint.distanceFogEndWU - mixLegacyCameraValue(from.distanceFogEndWU, to.distanceFogEndWU, localProgress)),
  );
  return positionError > LEGACY_CAMERA_BAKE_MAX_POSITION_ERROR_WU
    || rotationError > LEGACY_CAMERA_BAKE_MAX_ROTATION_ERROR_DEGREES
    || scalarError > LEGACY_CAMERA_BAKE_MAX_SCALAR_ERROR;
}

function bakeLegacyCameraKeys(keys, globals) {
  if (keys.length < 2) {
    return keys.map((key) => {
      const pose = migrateLegacyAboutNarrativeCameraPose(key, globals);
      return {
        id: key.id,
        atWU: Number(key.atWU),
        position: pose.position,
        rotation: pose.rotation,
        fov: Number(key.fov),
        distanceFogStartWU: Number(key.distanceFogStartWU ?? globals.camera.distanceFogStartWU ?? 8),
        distanceFogEndWU: Number(key.distanceFogEndWU ?? globals.camera.distanceFogEndWU ?? 18),
        easing: 'linear',
        locked: key.locked === true,
      };
    });
  }

  const baked = [];
  const usedIds = new Set(keys.map((key) => key.id));
  keys.slice(0, -1).forEach((from, segmentIndex) => {
    const to = keys[segmentIndex + 1];
    const easingCurve = compileAboutNarrativeCameraEasing(from.easing);
    const samples = [sampleLegacyCameraSegment(from, to, 0, globals, easingCurve)];
    const appendAdaptiveSamples = (left, right, depth) => {
      const midpoint = sampleLegacyCameraSegment(
        from,
        to,
        (left.progress + right.progress) * 0.5,
        globals,
        easingCurve,
      );
      const quarter = sampleLegacyCameraSegment(
        from,
        to,
        left.progress + ((right.progress - left.progress) * 0.25),
        globals,
        easingCurve,
      );
      const threeQuarter = sampleLegacyCameraSegment(
        from,
        to,
        left.progress + ((right.progress - left.progress) * 0.75),
        globals,
        easingCurve,
      );
      const needsSplit = legacyCameraBakeNeedsSplit(left, quarter, right)
        || legacyCameraBakeNeedsSplit(left, midpoint, right)
        || legacyCameraBakeNeedsSplit(left, threeQuarter, right);
      if (depth < LEGACY_CAMERA_BAKE_MAX_DEPTH && needsSplit) {
        appendAdaptiveSamples(left, midpoint, depth + 1);
        appendAdaptiveSamples(midpoint, right, depth + 1);
        return;
      }
      samples.push(right);
    };
    appendAdaptiveSamples(
      samples[0],
      sampleLegacyCameraSegment(from, to, 1, globals, easingCurve),
      0,
    );

    if (segmentIndex === 0) {
      const first = samples[0];
      baked.push({
        id: from.id,
        atWU: first.atWU,
        position: first.position,
        rotation: first.rotation,
        fov: Number(first.fov.toFixed(6)),
        distanceFogStartWU: Number(first.distanceFogStartWU.toFixed(6)),
        distanceFogEndWU: Number(first.distanceFogEndWU.toFixed(6)),
        easing: 'linear',
        locked: from.locked === true,
      });
    }

    samples.slice(1).forEach((sample, sampleIndex) => {
      const endpoint = sampleIndex === samples.length - 2;
      let id = endpoint ? to.id : `${from.id}-path-${sampleIndex + 1}`;
      let suffix = sampleIndex + 1;
      while (!endpoint && usedIds.has(id)) {
        suffix += 1;
        id = `${from.id}-path-${suffix}`;
      }
      usedIds.add(id);
      baked.push({
        id,
        atWU: sample.atWU,
        position: sample.position,
        rotation: sample.rotation,
        fov: Number(sample.fov.toFixed(6)),
        distanceFogStartWU: Number(sample.distanceFogStartWU.toFixed(6)),
        distanceFogEndWU: Number(sample.distanceFogEndWU.toFixed(6)),
        easing: 'linear',
        locked: endpoint ? to.locked === true : false,
      });
    });
  });
  return baked;
}

export function migrateAboutNarrativeVersion3To4(input) {
  const raw = cloneAboutNarrativeDocument(input);
  const sourceErrors = validateAboutNarrativeTrackDocument(raw, { expectedSchemaVersion: 3 })
    .filter((item) => item.level === 'error');
  if (sourceErrors.length) {
    const error = new Error(sourceErrors.map((item) => `${item.path}: ${item.message}`).join('\n'));
    error.name = 'AboutNarrativeTrackMigrationError';
    error.diagnostics = sourceErrors;
    error.original = raw;
    throw error;
  }

  const legacyGlobals = raw.globals;
  const baseKeys = new Map(raw.tracks.camera.keys.map((key) => [key.id, key]));
  const camera = {
    fov: Number(legacyGlobals.camera.fov),
    distanceFogStartWU: Number(legacyGlobals.camera.distanceFogStartWU ?? 8),
    distanceFogEndWU: Number(legacyGlobals.camera.distanceFogEndWU ?? 18),
  };
  const migrateOverrides = (overrides) => ({
    camera: Object.fromEntries(Object.entries(overrides.camera || {}).map(([id, override]) => [
      id,
      migrateLegacyCameraOverride(override, baseKeys.get(id), legacyGlobals),
    ])),
    worlds: cloneAboutNarrativeDocument(overrides.worlds || {}),
    text: cloneAboutNarrativeDocument(overrides.text || {}),
    interactions: cloneAboutNarrativeDocument(overrides.interactions || {}),
  });
  const migrated = {
    schemaVersion: 4,
    globals: {
      scrollSmoothing: legacyGlobals.scrollSmoothing,
      readingWidthRem: legacyGlobals.readingWidthRem,
      editorialRevealThreshold: legacyGlobals.editorialRevealThreshold,
      worldRail: {
        originZ: Number(legacyGlobals.camera.startZ),
        unitsPerWU: Number(legacyGlobals.camera.cadence),
      },
      camera,
      pointMaterial: cloneAboutNarrativeDocument(legacyGlobals.pointMaterial),
      swarmTurbulence: cloneAboutNarrativeDocument(legacyGlobals.swarmTurbulence),
      textMotion: cloneAboutNarrativeDocument(legacyGlobals.textMotion),
    },
    profiles: {
      desktop: { ...raw.profiles.desktop, overrides: migrateOverrides(raw.profiles.desktop.overrides) },
      tablet: { ...raw.profiles.tablet, overrides: migrateOverrides(raw.profiles.tablet.overrides) },
      mobile: { ...raw.profiles.mobile, overrides: migrateOverrides(raw.profiles.mobile.overrides) },
      'reduced-motion': { mode: 'overlay', motionPolicy: 'settled' },
    },
    tracks: {
      camera: { keys: bakeLegacyCameraKeys(raw.tracks.camera.keys, legacyGlobals) },
      worlds: cloneAboutNarrativeDocument(raw.tracks.worlds),
      text: cloneAboutNarrativeDocument(raw.tracks.text),
      interactions: cloneAboutNarrativeDocument(raw.tracks.interactions),
    },
    library: cloneAboutNarrativeDocument(raw.library),
  };
  const normalized = normalizeAboutNarrativeVersion4TrackDocument(migrated);
  const diagnostics = validateAboutNarrativeTrackDocument(normalized, { expectedSchemaVersion: 4 });
  const errors = diagnostics.filter((item) => item.level === 'error');
  if (errors.length) {
    const error = new Error(errors.map((item) => `${item.path}: ${item.message}`).join('\n'));
    error.name = 'AboutNarrativeTrackMigrationError';
    error.diagnostics = diagnostics;
    error.original = raw;
    throw error;
  }
  return normalized;
}

export function migrateAboutNarrativeVersion2To4(input) {
  return migrateAboutNarrativeVersion3To4(migrateAboutNarrativeVersion2To3(input));
}

const REMOVED_DISCIPLINE_PARAMETER_KEYS = Object.freeze([
  'fieldTravelDurationWU',
  'fieldTravelWU',
  'fieldFogStartWU',
  'fieldFogEndWU',
  'fieldFogStrength',
  'backgroundScale',
]);
const RETIRED_DISCIPLINE_MOTION_PARAMETER_KEYS = Object.freeze([
  ...REMOVED_DISCIPLINE_PARAMETER_KEYS,
  'labelWindowWU',
  'staggerWU',
  'labelDurationWU',
  'holdWU',
  'readingLineY',
  'mobileReadingLineY',
  'approachBandY',
  'exitLineY',
]);
const REMOVED_GRID_RIPPLE_PARAMETER_KEYS = Object.freeze(['centerX', 'centerZ']);

function stripRemovedDisciplineParameters(parameters) {
  const next = cloneAboutNarrativeDocument(parameters || {});
  REMOVED_DISCIPLINE_PARAMETER_KEYS.forEach((key) => delete next[key]);
  return next;
}

function upgradeDisciplineMotionParameters(parameters) {
  const next = cloneAboutNarrativeDocument(parameters || {});
  RETIRED_DISCIPLINE_MOTION_PARAMETER_KEYS.forEach((key) => delete next[key]);
  ['backgroundFadeWU', 'reconnectOpacity', 'labelOffsetPx', 'labelScale'].forEach((key) => delete next[key]);
  if (!finite(next.settleDurationWU)) next.settleDurationWU = 0.3;
  if (!finite(next.beatDurationWU)) next.beatDurationWU = 0.7;
  if (!finite(next.formationColumn)) {
    next.formationColumn = ABOUT_NARRATIVE_DISCIPLINE_FORMATION_DEFAULTS.formationColumn;
  }
  if (!finite(next.formationRow)) {
    next.formationRow = ABOUT_NARRATIVE_DISCIPLINE_FORMATION_DEFAULTS.formationRow;
  }
  next.items = (next.items || []).map((item) => {
    const migrated = cloneAboutNarrativeDocument(item);
    delete migrated.position;
    delete migrated.mobilePosition;
    return migrated;
  });
  return next;
}

function stripRemovedGridRippleParameters(parameters) {
  const next = cloneAboutNarrativeDocument(parameters || {});
  REMOVED_GRID_RIPPLE_PARAMETER_KEYS.forEach((key) => delete next[key]);
  return next;
}

function stripLegacyDisciplineField(field) {
  const next = cloneAboutNarrativeDocument(field);
  delete next.fieldTravelStartWU;
  delete next.fieldTravelEndWU;
  next.choreography = stripRemovedDisciplineParameters(next.choreography);
  return next;
}

function filterOverrideTargets(overrides, targetIds, transform = cloneAboutNarrativeDocument) {
  return Object.fromEntries(Object.entries(overrides || {})
    .filter(([id]) => targetIds.has(id))
    .map(([id, override]) => [id, transform(override)]));
}

/**
 * Repairs the one known transitional schema-v5 shape produced while the v4→v5
 * editor migration was in flight. This is deliberately narrower than normal
 * normalization: it removes only retired v4 fields, restores the required
 * Visibility endpoints, and discards overrides whose target was deleted.
 */
export function repairAboutNarrativeVersion5Hybrid(input) {
  const raw = cloneAboutNarrativeDocument(input);
  if (Number(raw?.schemaVersion) !== ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION) {
    const error = new Error(`Hybrid repair requires schema v${ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION}.`);
    error.name = 'AboutNarrativeTrackMigrationError';
    error.original = raw;
    throw error;
  }

  const durationWU = Number(raw.profiles?.desktop?.storyDurationWU);
  const visibilityKeys = Array.isArray(raw.tracks?.visibility?.keys)
    && raw.tracks.visibility.keys.length >= 2
    ? cloneAboutNarrativeDocument(raw.tracks.visibility.keys)
    : [
      { id: 'visibility-start', atWU: 0, visibility: 1, easing: 'linear', locked: true },
      { id: 'visibility-end', atWU: durationWU, visibility: 1, easing: 'linear', locked: true },
    ];
  const cameraKeys = (raw.tracks?.camera?.keys || []).map((key) => {
    const next = cloneAboutNarrativeDocument(key);
    delete next.distanceFogStartWU;
    delete next.distanceFogEndWU;
    return next;
  });
  const cameraOrientationKeys = cloneAboutNarrativeDocument(
    raw.tracks?.camera?.orientationKeys || [],
  );
  const textFields = (raw.tracks?.text?.fields || []).map((field) => (
    field.kind === 'discipline-reveal'
      ? stripLegacyDisciplineField(field)
      : cloneAboutNarrativeDocument(field)
  ));
  const interactionClips = (raw.tracks?.interactions?.clips || []).map((clip) => {
    if (clip.type === 'discipline-reveal') {
      return { ...cloneAboutNarrativeDocument(clip), parameters: upgradeDisciplineMotionParameters(clip.parameters) };
    }
    if (clip.type === 'grid-ripple') {
      return { ...cloneAboutNarrativeDocument(clip), parameters: stripRemovedGridRippleParameters(clip.parameters) };
    }
    return cloneAboutNarrativeDocument(clip);
  });
  const worldObjects = cloneAboutNarrativeDocument(raw.tracks?.worlds?.objects || []);
  const targetIds = {
    camera: new Set([
      ...cameraKeys.map((item) => item.id),
      ...cameraOrientationKeys.map((item) => item.id),
    ]),
    visibility: new Set(visibilityKeys.map((item) => item.id)),
    worlds: new Set(worldObjects.map((item) => item.id)),
    text: new Set(textFields.map((item) => item.id)),
    interactions: new Set(interactionClips.map((item) => item.id)),
  };
  const repairOverrides = (overrides = {}) => ({
    camera: filterOverrideTargets(overrides.camera, targetIds.camera, (override) => {
      const next = cloneAboutNarrativeDocument(override);
      delete next.distanceFogStartWU;
      delete next.distanceFogEndWU;
      return next;
    }),
    visibility: filterOverrideTargets(overrides.visibility, targetIds.visibility),
    worlds: filterOverrideTargets(overrides.worlds, targetIds.worlds),
    text: filterOverrideTargets(overrides.text, targetIds.text),
    interactions: filterOverrideTargets(overrides.interactions, targetIds.interactions),
  });
  const fogStartWU = Number(raw.globals?.camera?.distanceFogStartWU
    ?? raw.tracks?.camera?.keys?.[0]?.distanceFogStartWU
    ?? 8);
  const fogEndWU = Number(raw.globals?.camera?.distanceFogEndWU
    ?? raw.tracks?.camera?.keys?.[0]?.distanceFogEndWU
    ?? 18);
  const repaired = {
    schemaVersion: ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION,
    globals: {
      ...cloneAboutNarrativeDocument(raw.globals),
      camera: { distanceFogStartWU: fogStartWU, distanceFogEndWU: fogEndWU },
    },
    profiles: {
      desktop: { ...cloneAboutNarrativeDocument(raw.profiles.desktop), overrides: repairOverrides(raw.profiles.desktop.overrides) },
      tablet: { ...cloneAboutNarrativeDocument(raw.profiles.tablet), overrides: repairOverrides(raw.profiles.tablet.overrides) },
      mobile: { ...cloneAboutNarrativeDocument(raw.profiles.mobile), overrides: repairOverrides(raw.profiles.mobile.overrides) },
      'reduced-motion': { mode: 'overlay', motionPolicy: 'settled' },
    },
    tracks: {
      camera: {
        keys: cameraKeys,
        ...(cameraOrientationKeys.length ? { orientationKeys: cameraOrientationKeys } : {}),
      },
      visibility: { keys: visibilityKeys },
      worlds: { objects: worldObjects },
      text: { fields: textFields },
      interactions: { clips: interactionClips },
    },
    library: cloneAboutNarrativeDocument(raw.library),
  };
  const normalized = normalizeAboutNarrativeTrackDocument(repaired);
  assertValidAboutNarrativeTrackDocument(normalized);
  return normalized;
}

function migrationDiagnostic(path, commonStartWU, commonEndWU) {
  return {
    level: 'error',
    code: 'camera-fog-migration-divergence',
    path,
    message: `Schema v4 camera fog must be constant at ${commonStartWU}/${commonEndWU} WU before migrating to the single schema v5 global fog contract.`,
  };
}

export function migrateAboutNarrativeVersion4To5(input) {
  const raw = cloneAboutNarrativeDocument(input);
  const sourceErrors = validateAboutNarrativeTrackDocument(raw, { expectedSchemaVersion: 4 })
    .filter((item) => item.level === 'error');
  if (sourceErrors.length) {
    const error = new Error(sourceErrors.map((item) => `${item.path}: ${item.message}`).join('\n'));
    error.name = 'AboutNarrativeTrackMigrationError';
    error.diagnostics = sourceErrors;
    error.original = raw;
    throw error;
  }

  const commonStartWU = Number(raw.globals.camera?.distanceFogStartWU ?? 8);
  const commonEndWU = Number(raw.globals.camera?.distanceFogEndWU ?? 18);
  const fogDiagnostics = [];
  const differs = (value, expected) => value != null && Math.abs(Number(value) - expected) > 0.000001;
  raw.tracks.camera.keys.forEach((key, index) => {
    if (differs(key.distanceFogStartWU, commonStartWU)) fogDiagnostics.push(migrationDiagnostic(`tracks.camera.keys.${index}.distanceFogStartWU`, commonStartWU, commonEndWU));
    if (differs(key.distanceFogEndWU, commonEndWU)) fogDiagnostics.push(migrationDiagnostic(`tracks.camera.keys.${index}.distanceFogEndWU`, commonStartWU, commonEndWU));
  });
  ABOUT_NARRATIVE_TRACK_LAYOUT_PROFILE_IDS.forEach((profileId) => {
    Object.entries(raw.profiles[profileId].overrides.camera || {}).forEach(([id, override]) => {
      if (differs(override.distanceFogStartWU, commonStartWU)) fogDiagnostics.push(migrationDiagnostic(`profiles.${profileId}.overrides.camera.${id}.distanceFogStartWU`, commonStartWU, commonEndWU));
      if (differs(override.distanceFogEndWU, commonEndWU)) fogDiagnostics.push(migrationDiagnostic(`profiles.${profileId}.overrides.camera.${id}.distanceFogEndWU`, commonStartWU, commonEndWU));
    });
  });
  if (fogDiagnostics.length) {
    const error = new Error(fogDiagnostics.map((item) => `${item.path}: ${item.message}`).join('\n'));
    error.name = 'AboutNarrativeTrackMigrationError';
    error.diagnostics = fogDiagnostics;
    error.original = raw;
    throw error;
  }

  const durationWU = Number(raw.profiles.desktop.storyDurationWU);
  const migrateOverrides = (overrides = {}) => ({
    camera: Object.fromEntries(Object.entries(overrides.camera || {}).map(([id, override]) => {
      const next = cloneAboutNarrativeDocument(override);
      delete next.distanceFogStartWU;
      delete next.distanceFogEndWU;
      return [id, next];
    })),
    visibility: {},
    worlds: cloneAboutNarrativeDocument(overrides.worlds || {}),
    text: cloneAboutNarrativeDocument(overrides.text || {}),
    interactions: cloneAboutNarrativeDocument(overrides.interactions || {}),
  });
  const cameraKeys = raw.tracks.camera.keys.map((key) => {
    const next = cloneAboutNarrativeDocument(key);
    delete next.distanceFogStartWU;
    delete next.distanceFogEndWU;
    return next;
  });
  const migrated = {
    schemaVersion: ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION,
    globals: {
      ...cloneAboutNarrativeDocument(raw.globals),
      camera: {
        distanceFogStartWU: commonStartWU,
        distanceFogEndWU: commonEndWU,
      },
    },
    profiles: {
      desktop: { ...cloneAboutNarrativeDocument(raw.profiles.desktop), overrides: migrateOverrides(raw.profiles.desktop.overrides) },
      tablet: { ...cloneAboutNarrativeDocument(raw.profiles.tablet), overrides: migrateOverrides(raw.profiles.tablet.overrides) },
      mobile: { ...cloneAboutNarrativeDocument(raw.profiles.mobile), overrides: migrateOverrides(raw.profiles.mobile.overrides) },
      'reduced-motion': { mode: 'overlay', motionPolicy: 'settled' },
    },
    tracks: {
      camera: { keys: cameraKeys },
      visibility: {
        keys: [
          { id: 'visibility-start', atWU: 0, visibility: 1, easing: 'linear', locked: true },
          { id: 'visibility-end', atWU: durationWU, visibility: 1, easing: 'linear', locked: true },
        ],
      },
      worlds: cloneAboutNarrativeDocument(raw.tracks.worlds),
      text: {
        fields: raw.tracks.text.fields.map((field) => (
          field.kind === 'discipline-reveal' ? stripLegacyDisciplineField(field) : cloneAboutNarrativeDocument(field)
        )),
      },
      interactions: {
        clips: raw.tracks.interactions.clips.map((clip) => {
          if (clip.type === 'discipline-reveal') {
            return { ...cloneAboutNarrativeDocument(clip), parameters: upgradeDisciplineMotionParameters(clip.parameters) };
          }
          if (clip.type === 'grid-ripple') {
            return { ...cloneAboutNarrativeDocument(clip), parameters: stripRemovedGridRippleParameters(clip.parameters) };
          }
          return cloneAboutNarrativeDocument(clip);
        }),
      },
    },
    library: cloneAboutNarrativeDocument(raw.library),
  };
  const normalized = normalizeAboutNarrativeTrackDocument(migrated);
  assertValidAboutNarrativeTrackDocument(normalized);
  return normalized;
}

export function migrateAboutNarrativeVersion3To5(input) {
  return migrateAboutNarrativeVersion4To5(migrateAboutNarrativeVersion3To4(input));
}

export function migrateAboutNarrativeVersion2To5(input) {
  return migrateAboutNarrativeVersion3To5(migrateAboutNarrativeVersion2To3(input));
}
