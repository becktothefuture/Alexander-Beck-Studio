/** Canonical metadata for durable About look controls; no second config store. */
function numberControl(id, label, min, max, step, unit = '', group = '', defaultValue) {
  return Object.freeze({ id, label, type: 'range', min, max, step, unit, group,
    ...(defaultValue === undefined ? {} : { defaultValue }),
  });
}

export const ABOUT_SCENE_CONTROL_REGISTRY = Object.freeze({
  typography: Object.freeze([
    numberControl('bodySizeScale', 'Body size', 0.6, 1.8, 0.01, '×', 'text-size', 1),
    numberControl('smallBodySizeScale', 'Small body size', 0.6, 1.8, 0.01, '×', 'text-size', 1),
    numberControl('eyebrowSizeScale', 'Eyebrow size', 0.6, 1.8, 0.01, '×', 'text-size', 1),
    numberControl('mainTitleSizeScale', 'Main title size', 0.5, 2, 0.01, '×', 'text-size', 1),
    numberControl('inbetweenTitleSizeScale', 'In-between title size', 0.5, 2, 0.01, '×', 'text-size', 1),
    numberControl('bodyLineHeightScale', 'Body line height', 0.75, 1.5, 0.01, '×', 'text-leading', 1),
    numberControl('smallBodyLineHeightScale', 'Small body line height', 0.75, 1.5, 0.01, '×', 'text-leading', 1),
    numberControl('eyebrowLineHeightScale', 'Eyebrow line height', 0.75, 1.5, 0.01, '×', 'text-leading', 1),
    numberControl('mainTitleLineHeightScale', 'Main title line height', 0.75, 1.5, 0.01, '×', 'text-leading', 1),
    numberControl('inbetweenTitleLineHeightScale', 'In-between title line height', 0.75, 1.5, 0.01, '×', 'text-leading', 1),
    numberControl('paragraphSpacingScale', 'Paragraph spacing', 0.25, 2.5, 0.01, '×', 'text-spacing', 1),
    numberControl('listingSeparationScale', 'Listing separation', 0.25, 2.5, 0.01, '×', 'text-spacing', 1),
    numberControl('rowSpacingScale', 'List row spacing', 0.5, 2.5, 0.01, '×', 'text-spacing', 1),
    numberControl('clientRowGapScale', 'Client row spacing', 0.5, 2.5, 0.01, '×', 'text-spacing', 1),
    numberControl('clientColumnGapScale', 'Client column spacing', 0.5, 2.5, 0.01, '×', 'text-spacing', 1),
  ]),
  pointMaterial: Object.freeze([
    numberControl('opacity', 'Circle population', 0.2, 1, 0.01),
    numberControl('pointSize', 'Global point size', 2, 32, 0.1, 'px', '', 6),
    numberControl('surfelCoverage', 'Atmospheric point coverage', 0.25, 2.5, 0.01, '×', '', 0.7),
    numberControl('backfaceRetention', 'Back surface reveal', 0, 1, 0.01, '×', '', 0),
    numberControl('minPointSize', 'Distant size target', 0.25, 8, 0.05, 'px', '', 1.15),
    numberControl('perspectiveResponse', 'Depth scaling', 0.25, 2, 0.01, '×', '', 1),
    numberControl('edgeSoftness', 'Circle edge', 0.5, 4, 0.05, '×', '', 1.35),
    numberControl('atmosphereStrength', 'Visible haze', 0, 4, 0.05, '×', '', 1),
    numberControl('pixelRatioCap', 'Render resolution', 1, 3, 0.05, '×', '', 2),
    numberControl('pointerRadiusPx', 'Pointer pressure radius', 40, 308, 2, 'px'),
    numberControl('pointerForcePx', 'Pointer pressure force', 0, 152, 1, 'px'),
    numberControl('pointerVariation', 'Pointer organic variation', 0, 1.04, 0.01),
    numberControl('pointerResponseMs', 'Pointer response', 20, 120, 5, 'ms'),
    numberControl('pointerReturnMs', 'Pointer return', 80, 1200, 10, 'ms'),
    numberControl('pointDensity', 'Point population', 0.25, 1, 0.01, '× budget', '', 1),
    numberControl('solidCoverage', 'Solid surface coverage', 0.7, 2, 0.01, '×', '', 1.5),
    numberControl('bustCoverage', 'Bust coverage', 0.5, 1.5, 0.01, '×', '', 1.35),
  ]),
  textMotion: Object.freeze([
    numberControl('standardMaxWidthCh', 'Standard title width', 8, 60, 1, 'ch', 'text-widths', 12),
    numberControl('displayMaxWidthCh', 'Display title width', 8, 60, 1, 'ch', 'text-widths', 17),
    numberControl('standardViewportY', 'Travelling title Y', 0, 100, 1, '%', 'text-layout', 50),
    numberControl('bookendViewportY', 'Opening title Y', 0, 100, 1, '%', 'text-layout', 50),
    numberControl('durationScale', 'Travel duration', 0.75, 2.5, 0.05, '×', '', 1),
    numberControl('exitFraction', 'Exit portion', 0.05, 0.4, 0.01, '×', 'text-draw', 0.18),
    numberControl('startY', 'Entry Y', -500, 500, 2, 'px', 'text-path', 30),
    numberControl('openerStartY', 'Opener Y', -500, 500, 2, 'px', 'text-path', 0),
    numberControl('endY', 'Exit Y', -500, 500, 2, 'px', 'text-path', -24),
    numberControl('titleDrawDurationMs', 'Line colour flash', 80, 500, 10, 'ms', 'text-draw', 90),
    numberControl('titleColorCount', 'Draw colour count', 1, 8, 1, '', 'text-draw', 5),
    numberControl('titleLineStaggerMs', 'Next-line delay', 0, 400, 10, 'ms', 'text-draw', 70),
    numberControl('titleExitOpacity', 'Faded text opacity', 0, 1, 0.01, '', 'text-draw', 0.2),
    numberControl('perspective', 'Perspective', 1400, 3200, 20, 'px', 'text-depth', 1600),
    numberControl('entryDepth', 'Entry depth (−Z)', 0, 3000, 10, 'px', 'text-depth', 280),
    numberControl('exitDepth', 'Exit depth (+Z)', 0, 3000, 10, 'px', 'text-depth', 180),
  ]),
  storyPacing: Object.freeze([
    numberControl('titleToProseGapScreens', 'Title-to-prose clearance', 0.5, 2, 0.05, '×H', '', 0.5),
    numberControl('readingSpaceScale', 'Reading space', 0.75, 1.5, 0.05, '×', '', 1),
    numberControl('passageScale', 'Passage distance', 0.5, 2, 0.05, '×', '', 1),
  ]),
  sceneMotion: Object.freeze([
    numberControl('masterIntensity', 'Motion intensity', 0, 3, 0.05, '×', '', 1),
    numberControl('masterSpeed', 'Motion speed', 0, 3, 0.05, '×', '', 1),
    numberControl('bodyRotationSpeed', 'Body rotation speed', 0, 3, 0.05, '×', '', 1),
    numberControl('terrainAmplitude', 'Terrain deformation', 0, 3, 0.05, '×', '', 1),
    numberControl('terrainSpeed', 'Terrain speed', 0, 3, 0.05, '×', '', 1),
    numberControl('bustTurnAmount', 'Bust turn amount', 0, 2, 0.05, '× 8°', '', 1),
    numberControl('bustTurnSpeed', 'Bust turn speed', 0, 3, 0.05, '×', '', 1),
  ]),
});

export const ABOUT_SCENE_CONTROL_DEFAULTS = Object.freeze(Object.fromEntries(
  Object.entries(ABOUT_SCENE_CONTROL_REGISTRY).map(([owner, controls]) => [owner, Object.freeze(
    Object.fromEntries(controls.filter((control) => control.defaultValue !== undefined)
      .map((control) => [control.id, control.defaultValue])),
  )]),
));

const CONTROLS_BY_OWNER = Object.freeze(Object.fromEntries(
  Object.entries(ABOUT_SCENE_CONTROL_REGISTRY).map(([owner, controls]) => [
    owner, Object.freeze(Object.fromEntries(controls.map((control) => [control.id, control]))),
  ]),
));

export function getAboutSceneControlValue(globals, owner, id) {
  const control = CONTROLS_BY_OWNER[owner]?.[id];
  if (!control) throw new Error(`Unknown About scene control: ${owner}.${id}`);
  const value = Number(globals?.[owner]?.[id] ?? control.defaultValue);
  return Math.min(control.max, Math.max(control.min,
    Number.isFinite(value) ? value : control.defaultValue ?? control.min));
}

export function normalizeAboutSceneControls(globals) {
  return Object.fromEntries(Object.entries(ABOUT_SCENE_CONTROL_REGISTRY).map(([owner, controls]) => [
    owner,
    {
      ...globals?.[owner],
      ...Object.fromEntries(controls
        .filter((control) => globals?.[owner]?.[control.id] != null || control.defaultValue !== undefined)
        .map((control) => [control.id, Number(globals?.[owner]?.[control.id] ?? control.defaultValue)])),
    },
  ]));
}


/** Pure document operations shared by the panel and persistence verification. */
export function writeAboutSceneParameter(document, entry, value, sourceFog = null) {
  if (entry.scope !== 'globals') return;
  const leaf = entry.path.at(-1);
  const camera = document.globals.camera;
  const editsFog = entry.path[0] === 'camera'
    && ['distanceFogStartWU', 'distanceFogEndWU', 'distanceFogCurve'].includes(leaf);
  if (editsFog && sourceFog && !Number(camera.distanceFogOverride)) {
    camera.distanceFogStartWU = sourceFog.startWU;
    camera.distanceFogEndWU = sourceFog.endWU;
    camera.distanceFogCurve = sourceFog.curve;
  }
  const target = entry.path.slice(0, -1).reduce((owner, key) => {
    owner[key] ||= {};
    return owner[key];
  }, document.globals);
  target[leaf] = value;
  if (editsFog) camera.distanceFogOverride = 1;
}

export function resetAboutSceneParameterGroup(document, group) {
  if (group.id === 'page-viewing-distance') {
    document.globals.camera.distanceFogOverride = 0;
    return;
  }
  for (const entry of group.controls) {
    if (entry.scope === 'globals' && entry.control.defaultValue !== undefined) {
      writeAboutSceneParameter(document, entry, entry.control.defaultValue);
    }
  }
}

const CONTROL_MOTION_BEHAVIOR = Object.freeze({
  bodyRotationSpeed: 'continuous-rotation',
  terrainAmplitude: 'terrain-wave',
  terrainSpeed: 'terrain-wave',
  bustTurnAmount: 'bounded-rotation',
  bustTurnSpeed: 'bounded-rotation',
});

export function getAboutSceneControlAvailability(entry, motionBehaviors) {
  const required = entry.path[0] === 'sceneMotion' && CONTROL_MOTION_BEHAVIOR[entry.control.id];
  if (!required) return '';
  if (motionBehaviors === undefined) return 'Scene metadata unavailable';
  if (!Array.isArray(motionBehaviors)) return 'Checking the active scene';
  if (motionBehaviors.includes(required)) return '';
  if (required === 'continuous-rotation') return 'No rotating bodies in this scene';
  if (required === 'terrain-wave') return 'No deforming terrain in this scene';
  return 'No turning bust in this scene';
}
