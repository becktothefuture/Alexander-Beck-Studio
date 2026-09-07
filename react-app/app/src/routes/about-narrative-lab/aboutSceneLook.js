import { getAboutSceneControlValue } from './aboutSceneControlRegistry.js';

const EMPTY = Object.freeze({});
const clamp = (value, minimum, maximum, fallback = minimum) => {
  const number = Number(value);
  return Math.max(minimum, Math.min(maximum, Number.isFinite(number) ? number : fallback));
};

// The optional target keeps the render path allocation-free. One owner applies
// through the entire journey; scene progress never changes an explicit override.
export function resolveAboutCameraFog(camera = EMPTY, authoredCameraFog = null, target = {}) {
  const fromBlender = Number(camera.distanceFogOverride) <= 0.5 && authoredCameraFog;
  target.source = fromBlender ? 'blender' : 'website';
  target.startWU = clamp(fromBlender ? authoredCameraFog.startWU : camera.distanceFogStartWU, 0, 200, 14);
  target.endWU = Math.max(target.startWU + 0.001,
    clamp(fromBlender ? authoredCameraFog.endWU : camera.distanceFogEndWU, 1, 560, 150));
  target.curve = clamp(fromBlender ? authoredCameraFog.curve : camera.distanceFogCurve, 0.2, 5, 1.2);
  return target;
}

export function writeAboutSceneLook(target, frame, entranceScale = 1, journeySample = null, authoredCameraFog = null) {
  const output = target || {};
  const globals = frame?.globals || EMPTY;
  const camera = globals.camera || EMPTY;
  resolveAboutCameraFog(camera, authoredCameraFog, output);
  output.fogSource = output.source;
  output.fogStartWU = output.startWU;
  output.fogEndWU = output.endWU;
  output.fogCurve = output.curve;
  output.fogProgress = 0;
  output.finaleProgress = clamp(journeySample?.finaleProgress, 0, 1);
  output.runwayProgress = clamp(journeySample?.runwayProgress, 0, 1);
  output.runwayApproachProgress = clamp(journeySample?.runwayApproachProgress, 0, 1);
  output.pointDensity = getAboutSceneControlValue(globals, 'pointMaterial', 'pointDensity');
  output.detailBias = 1;
  output.solidCoverage = getAboutSceneControlValue(globals, 'pointMaterial', 'solidCoverage');
  output.bustCoverage = getAboutSceneControlValue(globals, 'pointMaterial', 'bustCoverage');
  output.surfelCoverage = getAboutSceneControlValue(globals, 'pointMaterial', 'surfelCoverage');
  output.backfaceRetention = getAboutSceneControlValue(globals, 'pointMaterial', 'backfaceRetention');
  output.minPointSizePx = getAboutSceneControlValue(globals, 'pointMaterial', 'minPointSize');
  output.maxPointSizePx = getAboutSceneControlValue(globals, 'pointMaterial', 'pointSize');
  output.perspectiveResponse = getAboutSceneControlValue(globals, 'pointMaterial', 'perspectiveResponse');
  output.edgeSoftness = getAboutSceneControlValue(globals, 'pointMaterial', 'edgeSoftness');
  output.atmosphereStrength = getAboutSceneControlValue(globals, 'pointMaterial', 'atmosphereStrength');
  output.pixelRatioCap = getAboutSceneControlValue(globals, 'pointMaterial', 'pixelRatioCap');
  output.opacity = getAboutSceneControlValue(globals, 'pointMaterial', 'opacity');
  output.manifestationSpread = 0.24;
  output.masterMotionIntensity = getAboutSceneControlValue(globals, 'sceneMotion', 'masterIntensity');
  output.masterMotionSpeed = getAboutSceneControlValue(globals, 'sceneMotion', 'masterSpeed');
  output.bodyRotationSpeed = getAboutSceneControlValue(globals, 'sceneMotion', 'bodyRotationSpeed');
  output.terrainAmplitude = getAboutSceneControlValue(globals, 'sceneMotion', 'terrainAmplitude');
  output.terrainSpeed = getAboutSceneControlValue(globals, 'sceneMotion', 'terrainSpeed');
  output.bustTurnAmount = getAboutSceneControlValue(globals, 'sceneMotion', 'bustTurnAmount');
  output.bustTurnSpeed = getAboutSceneControlValue(globals, 'sceneMotion', 'bustTurnSpeed');
  output.motionAmountWU = frame?.reducedMotion ? 0 : 0.05 * output.masterMotionIntensity;
  output.motionSpeed = 0.36 * output.masterMotionSpeed;
  output.motionScaleWU = 20;
  output.motionCoherence = 0.72;
  output.sceneVisibility = clamp(frame?.simulation?.visibility, 0, 1, 1);
  output.entranceScale = clamp(entranceScale, 0, 1, 1);
  return output;
}
