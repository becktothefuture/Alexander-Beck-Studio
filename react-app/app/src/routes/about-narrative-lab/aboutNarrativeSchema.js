import {
  ABOUT_NARRATIVE_ADAPTER_DEFINITIONS,
  ABOUT_NARRATIVE_BLOCK_KINDS,
  ABOUT_NARRATIVE_CAMERA_EASINGS,
  ABOUT_NARRATIVE_CORRESPONDENCE_MODES,
  ABOUT_NARRATIVE_DISCIPLINE_REVEAL_CONTROLS,
  ABOUT_NARRATIVE_EASINGS,
  ABOUT_NARRATIVE_EMPHASIS_TONES,
  ABOUT_NARRATIVE_MAX_DOCUMENT_BYTES,
  ABOUT_NARRATIVE_MAX_TRANSITION_LOCAL,
  ABOUT_NARRATIVE_MODIFIER_DEFINITIONS,
  ABOUT_NARRATIVE_SCHEMA_VERSION,
  ABOUT_NARRATIVE_SECTION_TYPES,
  ABOUT_NARRATIVE_SHAPE_DEFINITIONS,
  ABOUT_NARRATIVE_TEXT_MOVEMENT_MODES,
  ABOUT_NARRATIVE_TRANSITION_TYPES,
} from './aboutNarrativeDefinitions.js';

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UNSAFE_TEXT_PATTERN = /<\/?(?:script|style|iframe)|\bon\w+\s*=|javascript:/i;
const TOP_LEVEL_KEYS = new Set(['schemaVersion', 'globals', 'sections', 'library']);
const GLOBAL_KEYS = new Set(['scrollSmoothing', 'readingWidthRem', 'editorialRevealThreshold', 'camera', 'pointMaterial', 'swarmTurbulence', 'textMotion']);
const SECTION_KEYS = new Set(['id', 'label', 'type', 'layout', 'extentWU', 'mobileExtentWU', 'text', 'camera', 'world', 'interaction', 'locked']);
const TEXT_KEYS = new Set(['cues', 'blocks', 'profile', 'prompt', 'disciplineReveal']);
const WORLD_KEYS = new Set(['mode', 'adapterId', 'shapeId', 'seed', 'entryDistanceWU', 'transform', 'transitionIn', 'shapeParameters', 'modifiers']);
const CAMERA_KEYS = new Set(['keys', 'pathMode', 'cadenceOverride']);
const CAMERA_KEY_KEYS = new Set(['at', 'offset', 'lookAtOffset', 'fov', 'roll', 'easing']);
const TRANSITION_KEYS = new Set(['start', 'end', 'type', 'easing', 'correspondence']);
const CUE_KEYS = new Set(['id', 'text', 'enter', 'hold', 'exit', 'preset', 'anchor', 'motion']);
const CUE_MOTION_KEYS = new Set(['mode']);
const BLOCK_KEYS = new Set(['id', 'kind', 'text', 'label', 'items', 'emphasis', 'worldInfluence']);
const EMPHASIS_KEYS = new Set(['text', 'tone']);
const DISCIPLINE_REVEAL_KEYS = new Set(['id', 'start', 'end', 'stagger', 'backgroundFade', 'backgroundOpacity', 'reconnectOpacity', 'pointScale', 'labelOffsetPx', 'labelDuration', 'hold', 'items']);
const DISCIPLINE_REVEAL_ITEM_KEYS = new Set(['group', 'label']);
const TRANSFORM_KEYS = new Set(['position', 'rotation', 'scale', 'mobileScale', 'mobileYOffset']);
const MODIFIER_KEYS = new Set(['id', 'enabled', 'parameters']);
const INTERACTION_KEYS = new Set(['type', 'activationStart']);

export function cloneAboutNarrativeDocument(value) {
  return JSON.parse(JSON.stringify(value));
}

function finite(value) {
  return Number.isFinite(Number(value));
}

function cloneVector(value, fallback) {
  if (!Array.isArray(value) || value.length !== fallback.length || value.some((item) => !finite(item))) {
    return [...fallback];
  }
  return value.map(Number);
}

function pushUnknownKeys(target, value, allowed, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  Object.keys(value).forEach((key) => {
    if (!allowed.has(key)) target.push({ level: 'error', code: 'unknown-key', path: `${path}.${key}`, message: `Unknown field “${key}”.` });
  });
}

function normalizeCameraKey(key = {}, fallbackFov = 48) {
  return {
    at: Number(key.at ?? 0),
    offset: cloneVector(key.offset, [0, 0, 0]),
    lookAtOffset: cloneVector(key.lookAtOffset, [0, 0, -1]),
    fov: Number(key.fov ?? fallbackFov),
    roll: Number(key.roll ?? 0),
    easing: ABOUT_NARRATIVE_CAMERA_EASINGS.includes(key.easing) ? key.easing : 'smoothstep',
  };
}

function normalizeCameraKeys(keys, fallbackFov) {
  const normalized = Array.isArray(keys)
    ? keys.map((key) => normalizeCameraKey(key, fallbackFov))
    : [];
  const defaultKey = normalizeCameraKey({}, fallbackFov);
  if (!normalized.length) {
    return [defaultKey, { ...defaultKey, at: 1 }];
  }
  if (normalized[0].at > 0) normalized.unshift({ ...normalized[0], at: 0 });
  if (normalized.at(-1).at < 1) normalized.push({ ...normalized.at(-1), at: 1 });
  return normalized;
}

function normalizeCue(cue = {}, index = 0) {
  return {
    id: String(cue.id || `cue-${index + 1}`),
    text: String(cue.text || ''),
    enter: Number(cue.enter ?? 0),
    hold: Number(cue.hold ?? 0.5),
    exit: Number(cue.exit ?? 1),
    preset: String(cue.preset || 'travelling-title-v1'),
    ...(cue.anchor ? { anchor: String(cue.anchor) } : {}),
    motion: {
      mode: ABOUT_NARRATIVE_TEXT_MOVEMENT_MODES.includes(cue.motion?.mode)
        ? cue.motion.mode
        : 'spatial',
    },
  };
}

function normalizeBlock(block = {}, index = 0) {
  const kind = ABOUT_NARRATIVE_BLOCK_KINDS.includes(block.kind) ? block.kind : 'prose';
  return {
    id: String(block.id || `block-${index + 1}`),
    kind,
    ...(block.label ? { label: String(block.label) } : {}),
    ...(Array.isArray(block.items) ? { items: block.items.map(String) } : {}),
    ...(typeof block.text === 'string' ? { text: block.text } : {}),
    ...(Array.isArray(block.emphasis) ? {
      emphasis: block.emphasis.map((item) => ({
        text: String(item?.text || ''),
        tone: ABOUT_NARRATIVE_EMPHASIS_TONES.includes(item?.tone) ? item.tone : 'blue',
      })),
    } : {}),
    ...(block.worldInfluence === true ? { worldInfluence: true } : {}),
  };
}

function normalizeDisciplineReveal(reveal = {}) {
  return {
    id: String(reveal.id || 'discipline-reveal'),
    start: Number(reveal.start ?? 0.32),
    end: Number(reveal.end ?? 0.98),
    stagger: Number(reveal.stagger ?? 0.085),
    backgroundFade: Number(reveal.backgroundFade ?? 0.12),
    backgroundOpacity: Number(reveal.backgroundOpacity ?? 0.06),
    reconnectOpacity: Number(reveal.reconnectOpacity ?? 0.24),
    pointScale: Number(reveal.pointScale ?? 3.6),
    labelOffsetPx: Number(reveal.labelOffsetPx ?? 18),
    labelDuration: Number(reveal.labelDuration ?? 0.07),
    hold: Number(reveal.hold ?? 0.08),
    items: Array.isArray(reveal.items) ? reveal.items.map((item, index) => ({
      group: Math.round(Number(item?.group ?? index + 1)),
      label: String(item?.label || ''),
    })) : [],
  };
}

function normalizeModifier(modifier = {}) {
  const id = String(modifier.id || '');
  const parameters = modifier.parameters && typeof modifier.parameters === 'object'
    ? cloneAboutNarrativeDocument(modifier.parameters)
    : {};
  return {
    id,
    enabled: modifier.enabled !== false,
    parameters: id === 'swarm-life-v1'
      ? { strength: Number(parameters.strength ?? 1) }
      : parameters,
  };
}

function normalizeWorld(world = {}) {
  if (world.mode === 'continue') return { mode: 'continue' };
  const transform = world.transform && typeof world.transform === 'object' ? world.transform : {};
  const transition = world.transitionIn && typeof world.transitionIn === 'object' ? world.transitionIn : {};
  return {
    mode: 'set',
    adapterId: String(world.adapterId || 'point-field-v1'),
    shapeId: String(world.shapeId || 'cluster-v1'),
    seed: Math.round(Number(world.seed ?? 506832829)),
    entryDistanceWU: Number(world.entryDistanceWU ?? 4),
    transform: {
      position: cloneVector(transform.position, [0, 0, 0]),
      rotation: cloneVector(transform.rotation, [0, 0, 0]),
      scale: Number(transform.scale ?? 1),
      ...(finite(transform.mobileScale) ? { mobileScale: Number(transform.mobileScale) } : {}),
      ...(finite(transform.mobileYOffset) ? { mobileYOffset: Number(transform.mobileYOffset) } : {}),
    },
    transitionIn: {
      start: Number(transition.start ?? 0.08),
      end: Number(transition.end ?? 0.68),
      type: ABOUT_NARRATIVE_TRANSITION_TYPES.includes(transition.type) ? transition.type : 'morph',
      easing: ABOUT_NARRATIVE_EASINGS.includes(transition.easing) ? transition.easing : 'smoothstep',
      correspondence: ABOUT_NARRATIVE_CORRESPONDENCE_MODES.includes(transition.correspondence)
        ? transition.correspondence
        : 'index-v1',
    },
    shapeParameters: world.shapeParameters && typeof world.shapeParameters === 'object'
      ? cloneAboutNarrativeDocument(world.shapeParameters)
      : {},
    modifiers: Array.isArray(world.modifiers) ? world.modifiers.map(normalizeModifier) : [],
  };
}

export function normalizeAboutNarrativeDocument(input = {}) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const globals = source.globals && typeof source.globals === 'object' ? source.globals : {};
  const camera = globals.camera && typeof globals.camera === 'object' ? globals.camera : {};
  const pointMaterial = globals.pointMaterial && typeof globals.pointMaterial === 'object' ? globals.pointMaterial : {};
  const swarmTurbulence = globals.swarmTurbulence && typeof globals.swarmTurbulence === 'object' ? globals.swarmTurbulence : {};
  const textMotion = globals.textMotion && typeof globals.textMotion === 'object' ? globals.textMotion : {};
  const fallbackFov = Number(camera.fov ?? 48);

  return {
    schemaVersion: Number(source.schemaVersion ?? ABOUT_NARRATIVE_SCHEMA_VERSION),
    globals: {
      scrollSmoothing: Number(globals.scrollSmoothing ?? 0.82),
      readingWidthRem: Number(globals.readingWidthRem ?? 58),
      editorialRevealThreshold: Number(globals.editorialRevealThreshold ?? 0.74),
      camera: {
        startZ: Number(camera.startZ ?? 8),
        cadence: Number(camera.cadence ?? 1),
        cadenceLocked: camera.cadenceLocked !== false,
        fov: fallbackFov,
      },
      pointMaterial: {
        opacity: Number(pointMaterial.opacity ?? 0.96),
        pointSize: Number(pointMaterial.pointSize ?? 5.4),
      },
      swarmTurbulence: {
        amplitude: Number(swarmTurbulence.amplitude ?? 0.05),
        speed: Number(swarmTurbulence.speed ?? 0.52),
        irregularity: Number(swarmTurbulence.irregularity ?? 0.74),
        individuality: Number(swarmTurbulence.individuality ?? 0.92),
        axisSpread: Number(swarmTurbulence.axisSpread ?? 0.9),
      },
      textMotion: {
        preset: String(textMotion.preset || 'travelling-title-v1'),
        durationScale: Number(textMotion.durationScale ?? 1.6),
        startY: Number(textMotion.startY ?? -110),
        openerStartY: Number(textMotion.openerStartY ?? 36),
        endY: Number(textMotion.endY ?? 130),
        readableStart: Number(textMotion.readableStart ?? 0.24),
        readableEnd: Number(textMotion.readableEnd ?? 0.76),
        perspective: Number(textMotion.perspective ?? 1600),
        entryDepth: Number(textMotion.entryDepth ?? 360),
        exitDepth: Number(textMotion.exitDepth ?? 220),
        maxBlur: Number(textMotion.maxBlur ?? 22),
      },
    },
    sections: Array.isArray(source.sections) ? source.sections.map((section, index) => ({
      id: String(section.id || `section-${index + 1}`),
      label: String(section.label || `Section ${index + 1}`),
      type: ABOUT_NARRATIVE_SECTION_TYPES.includes(section.type) ? section.type : 'spatial',
      layout: String(section.layout || 'center'),
      extentWU: Number(section.extentWU ?? 1),
      mobileExtentWU: Number(section.mobileExtentWU ?? section.extentWU ?? 1),
      text: section.text && typeof section.text === 'object'
        ? {
          ...(Array.isArray(section.text.cues) ? { cues: section.text.cues.map(normalizeCue) } : {}),
          ...(Array.isArray(section.text.blocks) ? { blocks: section.text.blocks.map(normalizeBlock) } : {}),
          ...(section.text.disciplineReveal ? { disciplineReveal: normalizeDisciplineReveal(section.text.disciplineReveal) } : {}),
          ...(typeof section.text.profile === 'string' ? { profile: section.text.profile } : {}),
          ...(typeof section.text.prompt === 'string' ? { prompt: section.text.prompt } : {}),
        }
        : {},
      camera: {
        keys: normalizeCameraKeys(section.camera?.keys, fallbackFov),
        ...(section.camera?.pathMode ? { pathMode: String(section.camera.pathMode) } : {}),
        ...(finite(section.camera?.cadenceOverride) ? { cadenceOverride: Number(section.camera.cadenceOverride) } : {}),
      },
      world: normalizeWorld(section.world),
      interaction: section.interaction && typeof section.interaction === 'object'
        ? cloneAboutNarrativeDocument(section.interaction)
        : { type: 'none' },
      ...(section.locked ? { locked: true } : {}),
    })) : [],
    library: source.library && typeof source.library === 'object'
      ? cloneAboutNarrativeDocument(source.library)
      : { presets: [] },
  };
}

function validateControlValue(diagnostics, path, value, control) {
  if (control.type === 'range') {
    if (!finite(value)) {
      diagnostics.push({ level: 'error', code: 'non-finite', path, message: `${control.label} must be a finite number.` });
      return;
    }
    if (Number(value) < control.min || Number(value) > control.max) {
      diagnostics.push({ level: 'error', code: 'out-of-range', path, message: `${control.label} must stay between ${control.min} and ${control.max}${control.unit || ''}.` });
    }
  } else if (control.type === 'select' && !control.options.includes(value)) {
    diagnostics.push({ level: 'error', code: 'unknown-option', path, message: `${control.label} has an unsupported value.` });
  }
}

export function validateAboutNarrativeDocument(input, { strictUnknownKeys = true } = {}) {
  const diagnostics = [];
  const document = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  if (strictUnknownKeys) pushUnknownKeys(diagnostics, document, TOP_LEVEL_KEYS, 'document');
  if (Number(document.schemaVersion) !== ABOUT_NARRATIVE_SCHEMA_VERSION) {
    diagnostics.push({
      level: 'error',
      code: 'schema-version',
      path: 'schemaVersion',
      message: Number(document.schemaVersion) > ABOUT_NARRATIVE_SCHEMA_VERSION
        ? 'This document was created by a newer editor and is read-only here.'
        : `Schema version ${ABOUT_NARRATIVE_SCHEMA_VERSION} is required.`,
    });
  }
  if (strictUnknownKeys) pushUnknownKeys(diagnostics, document.globals, GLOBAL_KEYS, 'globals');
  const globals = document.globals || {};
  const globalRanges = [
    ['scrollSmoothing', globals.scrollSmoothing, 0, 1],
    ['readingWidthRem', globals.readingWidthRem, 30, 90],
    ['editorialRevealThreshold', globals.editorialRevealThreshold, 0, 1],
    ['camera.startZ', globals.camera?.startZ, -100, 100],
    ['camera.cadence', globals.camera?.cadence, 0.01, 5],
    ['camera.fov', globals.camera?.fov, 20, 90],
    ['pointMaterial.opacity', globals.pointMaterial?.opacity, 0, 1],
    ['pointMaterial.pointSize', globals.pointMaterial?.pointSize, 0.1, 20],
    ['swarmTurbulence.amplitude', globals.swarmTurbulence?.amplitude, 0, 0.25],
    ['swarmTurbulence.speed', globals.swarmTurbulence?.speed, 0, 2],
    ['swarmTurbulence.irregularity', globals.swarmTurbulence?.irregularity, 0, 1],
    ['swarmTurbulence.individuality', globals.swarmTurbulence?.individuality, 0, 1],
    ['swarmTurbulence.axisSpread', globals.swarmTurbulence?.axisSpread, 0, 1],
    ['textMotion.durationScale', globals.textMotion?.durationScale, 0.25, 4],
    ['textMotion.startY', globals.textMotion?.startY, -500, 500],
    ['textMotion.openerStartY', globals.textMotion?.openerStartY, -500, 500],
    ['textMotion.endY', globals.textMotion?.endY, -500, 500],
    ['textMotion.readableStart', globals.textMotion?.readableStart, 0, 1],
    ['textMotion.readableEnd', globals.textMotion?.readableEnd, 0, 1],
    ['textMotion.perspective', globals.textMotion?.perspective, 1400, 3200],
    ['textMotion.entryDepth', globals.textMotion?.entryDepth, 0, 3000],
    ['textMotion.exitDepth', globals.textMotion?.exitDepth, 0, 3000],
    ['textMotion.maxBlur', globals.textMotion?.maxBlur, 0, 100],
  ];
  globalRanges.forEach(([path, value, min, max]) => {
    if (!finite(value) || Number(value) < min || Number(value) > max) {
      diagnostics.push({ level: 'error', code: 'global-range', path: `globals.${path}`, message: `Value must be finite and between ${min} and ${max}.` });
    }
  });
  if (typeof globals.camera?.cadenceLocked !== 'boolean') {
    diagnostics.push({ level: 'error', code: 'global-camera-lock', path: 'globals.camera.cadenceLocked', message: 'Camera cadence lock must be true or false.' });
  }
  if (Number(globals.textMotion?.readableStart) >= Number(globals.textMotion?.readableEnd)) {
    diagnostics.push({ level: 'error', code: 'text-readable-window', path: 'globals.textMotion', message: 'The Clear window start must come before its end.' });
  }
  if (
    Number(globals.textMotion?.startY) === Number(globals.textMotion?.endY)
    && Number(globals.textMotion?.entryDepth) === 0
    && Number(globals.textMotion?.exitDepth) === 0
  ) {
    diagnostics.push({ level: 'warning', code: 'text-static-path', path: 'globals.textMotion', message: 'The spatial-title path has no movement on Y or Z.' });
  }
  if (!Array.isArray(document.sections) || document.sections.length === 0) {
    diagnostics.push({ level: 'error', code: 'missing-sections', path: 'sections', message: 'At least one Section is required.' });
  }

  const seenSectionIds = new Set();
  const seenContentIds = new Set();
  let finaleCount = 0;

  (document.sections || []).forEach((section, sectionIndex) => {
    const path = `sections.${sectionIndex}`;
    if (strictUnknownKeys) pushUnknownKeys(diagnostics, section, SECTION_KEYS, path);
    if (!ID_PATTERN.test(section.id || '') || seenSectionIds.has(section.id)) {
      diagnostics.push({ level: 'error', code: 'section-id', path: `${path}.id`, message: 'Section IDs must be unique lower-case slugs.' });
    }
    seenSectionIds.add(section.id);
    if (!ABOUT_NARRATIVE_SECTION_TYPES.includes(section.type)) {
      diagnostics.push({ level: 'error', code: 'section-type', path: `${path}.type`, message: 'Unknown Section type.' });
    }
    if (!finite(section.extentWU) || Number(section.extentWU) <= 0 || !finite(section.mobileExtentWU) || Number(section.mobileExtentWU) <= 0) {
      diagnostics.push({ level: 'error', code: 'extent', path, message: 'Desktop and mobile extents must be positive finite values.' });
    }
    if (section.type === 'finale') finaleCount += 1;
    if (strictUnknownKeys) pushUnknownKeys(diagnostics, section.interaction, INTERACTION_KEYS, `${path}.interaction`);
    if (!['none', 'horizontal-spin'].includes(section.interaction?.type)) {
      diagnostics.push({ level: 'error', code: 'interaction-type', path: `${path}.interaction.type`, message: 'Unknown Interaction type.' });
    }
    if (section.interaction?.type === 'horizontal-spin'
      && (!finite(section.interaction.activationStart) || section.interaction.activationStart < 0 || section.interaction.activationStart > 1)) {
      diagnostics.push({ level: 'error', code: 'interaction-window', path: `${path}.interaction.activationStart`, message: 'Interaction activation must be between 0 and 1.' });
    }

    const keys = section.camera?.keys || [];
    if (strictUnknownKeys) pushUnknownKeys(diagnostics, section.camera, CAMERA_KEYS, `${path}.camera`);
    let previousAt = -1;
    keys.forEach((key, keyIndex) => {
      const keyPath = `${path}.camera.keys.${keyIndex}`;
      if (strictUnknownKeys) pushUnknownKeys(diagnostics, key, CAMERA_KEY_KEYS, keyPath);
      if (!finite(key.at) || key.at < 0 || key.at > 1 || key.at <= previousAt) {
        diagnostics.push({ level: 'error', code: 'key-time', path: `${keyPath}.at`, message: 'Camera key times must be unique, sorted, and between 0 and 1.' });
      }
      previousAt = Number(key.at);
      ['offset', 'lookAtOffset'].forEach((field) => {
        if (!Array.isArray(key[field]) || key[field].length !== 3 || key[field].some((item) => !finite(item))) {
          diagnostics.push({ level: 'error', code: 'camera-vector', path: `${keyPath}.${field}`, message: `${field} must contain three finite values.` });
        }
      });
      if (!finite(key.fov) || key.fov < 20 || key.fov > 90 || !finite(key.roll)) {
        diagnostics.push({ level: 'error', code: 'camera-value', path: keyPath, message: 'Camera FOV and roll must remain finite and within safe bounds.' });
      }
      if (!ABOUT_NARRATIVE_CAMERA_EASINGS.includes(key.easing)) {
        diagnostics.push({ level: 'error', code: 'camera-easing', path: `${keyPath}.easing`, message: 'Camera easing must be Smoothstep or Ease in out so movement settles smoothly at each key.' });
      }
    });

    const cues = section.text?.cues || [];
    if (strictUnknownKeys) pushUnknownKeys(diagnostics, section.text, TEXT_KEYS, `${path}.text`);
    const disciplineReveal = section.text?.disciplineReveal;
    if (disciplineReveal) {
      const revealPath = `${path}.text.disciplineReveal`;
      if (strictUnknownKeys) pushUnknownKeys(diagnostics, disciplineReveal, DISCIPLINE_REVEAL_KEYS, revealPath);
      if (!ID_PATTERN.test(disciplineReveal.id || '') || seenContentIds.has(disciplineReveal.id)) {
        diagnostics.push({ level: 'error', code: 'discipline-reveal-id', path: `${revealPath}.id`, message: 'The Discipline reveal ID must be a unique lower-case slug.' });
      }
      seenContentIds.add(disciplineReveal.id);
      ABOUT_NARRATIVE_DISCIPLINE_REVEAL_CONTROLS.forEach((control) => validateControlValue(
        diagnostics,
        `${revealPath}.${control.id}`,
        disciplineReveal[control.id],
        control,
      ));
      const items = disciplineReveal.items || [];
      const groups = new Set();
      if (items.length !== 6) {
        diagnostics.push({ level: 'error', code: 'discipline-reveal-count', path: `${revealPath}.items`, message: 'A Discipline reveal must contain exactly six labelled points.' });
      }
      items.forEach((item, itemIndex) => {
        const itemPath = `${revealPath}.items.${itemIndex}`;
        if (strictUnknownKeys) pushUnknownKeys(diagnostics, item, DISCIPLINE_REVEAL_ITEM_KEYS, itemPath);
        if (!Number.isInteger(item.group) || item.group < 1 || item.group > 6 || groups.has(item.group)) {
          diagnostics.push({ level: 'error', code: 'discipline-reveal-group', path: `${itemPath}.group`, message: 'Discipline groups must uniquely cover 1 through 6.' });
        }
        groups.add(item.group);
        if (!item.label?.trim() || item.label.length > 80 || UNSAFE_TEXT_PATTERN.test(item.label)) {
          diagnostics.push({ level: 'error', code: 'discipline-reveal-label', path: `${itemPath}.label`, message: 'Discipline labels must be safe, concise, and non-empty.' });
        }
      });
      const lastRevealEnd = Number(disciplineReveal.start)
        + (Math.max(0, items.length - 1) * Number(disciplineReveal.stagger))
        + Number(disciplineReveal.labelDuration);
      if (Number(disciplineReveal.start) >= Number(disciplineReveal.end)
        || lastRevealEnd + Number(disciplineReveal.hold) > Number(disciplineReveal.end) + 0.00001) {
        diagnostics.push({ level: 'error', code: 'discipline-reveal-timing', path: revealPath, message: 'Reveal start, stagger, duration, hold, and label exit must fit inside the clip.' });
      }
    }
    const previousCueExit = { spatial: -1, vertical: -1 };
    cues.forEach((cue, cueIndex) => {
      const cuePath = `${path}.text.cues.${cueIndex}`;
      if (strictUnknownKeys) pushUnknownKeys(diagnostics, cue, CUE_KEYS, cuePath);
      if (!ID_PATTERN.test(cue.id || '') || seenContentIds.has(cue.id)) {
        diagnostics.push({ level: 'error', code: 'cue-id', path: `${cuePath}.id`, message: 'Cue IDs must be unique lower-case slugs.' });
      }
      seenContentIds.add(cue.id);
      if (!cue.text?.trim() || cue.text.length > 1200 || UNSAFE_TEXT_PATTERN.test(cue.text)) {
        diagnostics.push({ level: 'error', code: 'cue-text', path: `${cuePath}.text`, message: 'Cue text must be plain, safe, and non-empty.' });
      }
      if (![cue.enter, cue.hold, cue.exit].every(finite)
        || cue.enter < -1
        || cue.hold < 0
        || cue.hold > 1
        || cue.exit > 2
        || cue.enter > cue.hold
        || cue.hold > cue.exit) {
        diagnostics.push({ level: 'error', code: 'cue-timing', path: cuePath, message: 'Cue focus must stay inside its Section. Its preserved travel envelope may extend up to one Section-length beyond either edge.' });
      }
      if (strictUnknownKeys) pushUnknownKeys(diagnostics, cue.motion, CUE_MOTION_KEYS, `${cuePath}.motion`);
      if (!ABOUT_NARRATIVE_TEXT_MOVEMENT_MODES.includes(cue.motion?.mode)) {
        diagnostics.push({ level: 'error', code: 'cue-motion-mode', path: `${cuePath}.motion.mode`, message: 'Cue movement must be spatial or vertical.' });
      }
      const durationScale = Math.max(0.01, Number(globals.textMotion?.durationScale) || 1);
      const movement = ABOUT_NARRATIVE_TEXT_MOVEMENT_MODES.includes(cue.motion?.mode) ? cue.motion.mode : 'spatial';
      const effectiveEnter = movement === 'spatial'
        ? Math.max(0, cue.hold - ((cue.hold - cue.enter) * durationScale))
        : cue.enter;
      const effectiveExit = movement === 'spatial'
        ? Math.min(1, cue.hold + ((cue.exit - cue.hold) * durationScale))
        : cue.exit;
      if (previousCueExit[movement] >= 0 && effectiveEnter < previousCueExit[movement] - 0.12) {
        diagnostics.push({ level: 'warning', code: 'cue-overlap', path: cuePath, message: 'Large text cues overlap substantially.' });
      }
      if (previousCueExit[movement] >= 0 && effectiveEnter - previousCueExit[movement] > 0.08) {
        diagnostics.push({ level: 'warning', code: 'cue-gap', path: cuePath, message: 'The visible gap before this Cue may interrupt the narrative rhythm.' });
      }
      if (movement === 'spatial' && effectiveExit - effectiveEnter < 0.16) {
        diagnostics.push({ level: 'warning', code: 'cue-short', path: cuePath, message: 'This Cue may pass too quickly to read.' });
      }
      previousCueExit[movement] = effectiveExit;
    });

    (section.text?.blocks || []).forEach((block, blockIndex) => {
      const blockPath = `${path}.text.blocks.${blockIndex}`;
      if (strictUnknownKeys) pushUnknownKeys(diagnostics, block, BLOCK_KEYS, blockPath);
      if (!ID_PATTERN.test(block.id || '') || seenContentIds.has(block.id)) {
        diagnostics.push({ level: 'error', code: 'block-id', path: `${blockPath}.id`, message: 'Editorial block IDs must be unique lower-case slugs.' });
      }
      seenContentIds.add(block.id);
      if (!ABOUT_NARRATIVE_BLOCK_KINDS.includes(block.kind)) {
        diagnostics.push({ level: 'error', code: 'block-kind', path: `${blockPath}.kind`, message: 'Unknown editorial block type.' });
      }
      const strings = [...(block.items || []), block.text || '', block.label || ''];
      (block.emphasis || []).forEach((item, emphasisIndex) => {
        const emphasisPath = `${blockPath}.emphasis.${emphasisIndex}`;
        if (strictUnknownKeys) pushUnknownKeys(diagnostics, item, EMPHASIS_KEYS, emphasisPath);
        if (!item.text?.trim() || UNSAFE_TEXT_PATTERN.test(item.text)) {
          diagnostics.push({ level: 'error', code: 'emphasis-text', path: `${emphasisPath}.text`, message: 'Highlighted text must be safe and non-empty.' });
        }
        if (!ABOUT_NARRATIVE_EMPHASIS_TONES.includes(item.tone)) {
          diagnostics.push({ level: 'error', code: 'emphasis-tone', path: `${emphasisPath}.tone`, message: 'Highlight tone must be blue, green, or orange.' });
        }
        if (block.text && item.text && !block.text.includes(item.text)) {
          diagnostics.push({ level: 'warning', code: 'emphasis-missing', path: emphasisPath, message: `Highlighted phrase “${item.text}” is not present in this block.` });
        }
      });
      strings.push(...(block.emphasis || []).map((item) => item.text || ''));
      if (strings.some((value) => UNSAFE_TEXT_PATTERN.test(value))) {
        diagnostics.push({ level: 'error', code: 'unsafe-text', path: blockPath, message: 'Editorial content must be plain text.' });
      }
      if (block.worldInfluence != null && typeof block.worldInfluence !== 'boolean') {
        diagnostics.push({ level: 'error', code: 'world-influence', path: `${blockPath}.worldInfluence`, message: 'World influence must be true or false.' });
      }
    });

    if (section.world?.mode === 'set') {
      if (strictUnknownKeys) pushUnknownKeys(diagnostics, section.world, WORLD_KEYS, `${path}.world`);
      const adapter = ABOUT_NARRATIVE_ADAPTER_DEFINITIONS[section.world.adapterId];
      const shape = ABOUT_NARRATIVE_SHAPE_DEFINITIONS[section.world.shapeId];
      if (!adapter) diagnostics.push({ level: 'error', code: 'adapter', path: `${path}.world.adapterId`, message: 'Unknown World adapter.' });
      if (!shape) diagnostics.push({ level: 'error', code: 'shape', path: `${path}.world.shapeId`, message: 'Unknown Shape.' });
      if (adapter && shape && shape.adapterId !== adapter.id) {
        diagnostics.push({ level: 'error', code: 'shape-adapter', path: `${path}.world`, message: 'The selected Shape is incompatible with this World adapter.' });
      }
      if (!finite(section.world.seed) || !finite(section.world.entryDistanceWU)) {
        diagnostics.push({ level: 'error', code: 'world-number', path: `${path}.world`, message: 'World seed and entry distance must be finite.' });
      }
      const transform = section.world.transform || {};
      if (strictUnknownKeys) pushUnknownKeys(diagnostics, transform, TRANSFORM_KEYS, `${path}.world.transform`);
      if (!Array.isArray(transform.position) || transform.position.length !== 3 || transform.position.some((value) => !finite(value))
        || !Array.isArray(transform.rotation) || transform.rotation.length !== 3 || transform.rotation.some((value) => !finite(value))
        || !finite(transform.scale) || transform.scale <= 0) {
        diagnostics.push({ level: 'error', code: 'world-transform', path: `${path}.world.transform`, message: 'World transforms require finite position, rotation, and positive scale values.' });
      }
      if (shape) {
        if (strictUnknownKeys) pushUnknownKeys(
          diagnostics,
          section.world.shapeParameters,
          new Set(shape.parameters.map((control) => control.id)),
          `${path}.world.shapeParameters`,
        );
        shape.parameters.forEach((control) => validateControlValue(
          diagnostics,
          `${path}.world.shapeParameters.${control.id}`,
          section.world.shapeParameters?.[control.id],
          control,
        ));
      }
      const transition = section.world.transitionIn || {};
      if (strictUnknownKeys) pushUnknownKeys(diagnostics, transition, TRANSITION_KEYS, `${path}.world.transitionIn`);
      if (![transition.start, transition.end].every(finite) || transition.start < 0 || transition.end > ABOUT_NARRATIVE_MAX_TRANSITION_LOCAL || transition.start > transition.end) {
        diagnostics.push({ level: 'error', code: 'transition-window', path: `${path}.world.transitionIn`, message: `Transition timing must satisfy 0 ≤ Start ≤ End ≤ ${ABOUT_NARRATIVE_MAX_TRANSITION_LOCAL}. Values above 1 continue through inherited World Sections.` });
      }
      if (!ABOUT_NARRATIVE_TRANSITION_TYPES.includes(transition.type)
        || !ABOUT_NARRATIVE_EASINGS.includes(transition.easing)
        || !ABOUT_NARRATIVE_CORRESPONDENCE_MODES.includes(transition.correspondence)) {
        diagnostics.push({ level: 'error', code: 'transition-mode', path: `${path}.world.transitionIn`, message: 'Unknown transition setting.' });
      }
      if (adapter && ['morph', 'dissolve-morph'].includes(transition.type) && !adapter.capabilities.morph) {
        diagnostics.push({ level: 'error', code: 'transition-capability', path: `${path}.world.transitionIn.type`, message: 'This World adapter cannot morph Shapes.' });
      }
      if (adapter && transition.type === 'crossfade' && !adapter.capabilities.crossfade) {
        diagnostics.push({ level: 'error', code: 'transition-capability', path: `${path}.world.transitionIn.type`, message: 'This World adapter cannot crossfade in the shared renderer.' });
      }
      const modifierIds = new Set();
      (section.world.modifiers || []).forEach((modifier, modifierIndex) => {
        const modifierDefinition = ABOUT_NARRATIVE_MODIFIER_DEFINITIONS[modifier.id];
        const modifierPath = `${path}.world.modifiers.${modifierIndex}`;
        if (strictUnknownKeys) pushUnknownKeys(diagnostics, modifier, MODIFIER_KEYS, modifierPath);
        if (!modifierDefinition) {
          diagnostics.push({ level: 'error', code: 'modifier', path: `${modifierPath}.id`, message: 'Unknown modifier.' });
          return;
        }
        if (modifierIds.has(modifier.id)) {
          diagnostics.push({ level: 'error', code: 'duplicate-modifier', path: `${modifierPath}.id`, message: 'A modifier may appear only once in a World stack.' });
        }
        modifierIds.add(modifier.id);
        if (strictUnknownKeys) pushUnknownKeys(
          diagnostics,
          modifier.parameters,
          new Set(modifierDefinition.parameters.map((control) => control.id)),
          `${modifierPath}.parameters`,
        );
        modifierDefinition.parameters.forEach((control) => validateControlValue(
          diagnostics,
          `${modifierPath}.parameters.${control.id}`,
          modifier.parameters?.[control.id],
          control,
        ));
      });
    } else if (section.world?.mode !== 'continue') {
      diagnostics.push({ level: 'error', code: 'world-mode', path: `${path}.world.mode`, message: 'World mode must be set or continue.' });
    }
  });

  if (finaleCount !== 1 || document.sections?.at(-1)?.type !== 'finale') {
    diagnostics.push({ level: 'error', code: 'finale', path: 'sections', message: 'Exactly one finale is required and it must remain last.' });
  }
  const finale = document.sections?.at(-1);
  if (finale?.type === 'finale' && (finale.world?.mode !== 'set' || finale.world?.shapeId !== 'bust-v1')) {
    diagnostics.push({ level: 'error', code: 'finale-contract', path: `sections.${Math.max(0, (document.sections?.length || 1) - 1)}.world`, message: 'The protected finale must resolve to the registered bust Shape.' });
  }

  const serialized = JSON.stringify(document);
  if (new TextEncoder().encode(serialized).byteLength > ABOUT_NARRATIVE_MAX_DOCUMENT_BYTES) {
    diagnostics.push({ level: 'error', code: 'document-size', path: 'document', message: 'The About document exceeds the 1MiB safety limit.' });
  }

  return diagnostics;
}

export function assertValidAboutNarrativeDocument(document, options) {
  const diagnostics = validateAboutNarrativeDocument(document, options);
  const errors = diagnostics.filter((item) => item.level === 'error');
  if (errors.length) {
    const error = new Error(errors.map((item) => `${item.path}: ${item.message}`).join('\n'));
    error.name = 'AboutNarrativeValidationError';
    error.diagnostics = diagnostics;
    throw error;
  }
  return diagnostics;
}

export function serializeAboutNarrativeDocument(input) {
  assertValidAboutNarrativeDocument(input);
  const document = normalizeAboutNarrativeDocument(input);
  return `${JSON.stringify(document, null, 2)}\n`;
}

export function migrateAboutNarrativeDocument(input) {
  const source = cloneAboutNarrativeDocument(input || {});
  if (Number(source.schemaVersion ?? 1) > ABOUT_NARRATIVE_SCHEMA_VERSION) {
    return { document: source, readOnly: true, migrations: [] };
  }
  const document = normalizeAboutNarrativeDocument(source);
  return { document, readOnly: false, migrations: [] };
}

export function applyLegacyAboutNarrativeSettings(document, legacy = {}) {
  const next = cloneAboutNarrativeDocument(document);
  const globals = next.globals;
  if (finite(legacy.scrollSmoothing)) globals.scrollSmoothing = Number(legacy.scrollSmoothing);
  if (finite(legacy.readingWidth)) globals.readingWidthRem = Number(legacy.readingWidth);
  if (finite(legacy.editorialRevealThreshold)) globals.editorialRevealThreshold = Number(legacy.editorialRevealThreshold);
  if (finite(legacy.cameraSpeed)) globals.camera.cadence = Number(legacy.cameraSpeed);
  if (finite(legacy.pointSize)) globals.pointMaterial.pointSize = Number(legacy.pointSize);
  if (finite(legacy.fieldOpacity)) globals.pointMaterial.opacity = Number(legacy.fieldOpacity);
  if (finite(legacy.entryDepth)) globals.textMotion.entryDepth = Number(legacy.entryDepth);
  if (finite(legacy.exitDepth)) globals.textMotion.exitDepth = Number(legacy.exitDepth);
  if (finite(legacy.exitDrift)) globals.textMotion.endY = -Number(legacy.exitDrift);
  if (finite(legacy.maxBlur)) globals.textMotion.maxBlur = Number(legacy.maxBlur);
  next.sections.forEach((section) => {
    section.world.modifiers?.forEach((modifier) => {
      if (modifier.id === 'living-wave-v1' && finite(legacy.waveStrength)) modifier.parameters.strength = Number(legacy.waveStrength);
      if (modifier.id === 'bust-yaw-v1') {
        if (finite(legacy.bustRotationSpeed)) modifier.parameters.speed = Number(legacy.bustRotationSpeed);
        if (finite(legacy.bustDragSensitivity)) modifier.parameters.dragSensitivity = Number(legacy.bustDragSensitivity);
      }
    });
  });
  return next;
}
