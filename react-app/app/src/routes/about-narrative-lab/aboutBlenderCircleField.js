// Blender owns this optional contract. Legacy bundles retain their original
// per-object radius scaling and website point-material controls.
import { getAboutSceneControlValue } from './aboutSceneControlRegistry.js';

const RADIUS_STEP_WU = 0.0001;
const PROFILE_KEYS = ['master', 'desktop', 'mobile'];
export const ABOUT_CIRCLE_FIELD_CONTROLS = Object.freeze({
  owner: 'globals.pointMaterial',
  units: 'CSS-pixel-radius',
  radiusOwner: 'source.circleField.radiusWU',
  qualityScaleOwner: 'source.circleField.qualitySpacingScale',
});

export function resolveAboutCircleField(meta) {
  const field = meta?.source?.circleField;
  if (field === undefined) return null;
  const finitePositive = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0;
  const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
  if (!exactKeys(field, ['version', 'spacingWU', 'radiusWU', 'qualitySpacingScale'])
    || field.version !== 1 || !finitePositive(field.spacingWU) || !finitePositive(field.radiusWU)
    || field.radiusWU < RADIUS_STEP_WU || field.radiusWU * 2 >= field.spacingWU
    || field.radiusWU > 65535 * RADIUS_STEP_WU
    || Math.abs(field.radiusWU - Math.round(field.radiusWU / RADIUS_STEP_WU) * RADIUS_STEP_WU) > 1e-9
    || !exactKeys(field.qualitySpacingScale, PROFILE_KEYS)
    || !PROFILE_KEYS.every((key) => finitePositive(field.qualitySpacingScale[key]))
    || !PROFILE_KEYS.every((key) => Number.isFinite(Math.fround(field.radiusWU * field.qualitySpacingScale[key]))
      && Number.isFinite(field.spacingWU * field.qualitySpacingScale[key]))
    || field.qualitySpacingScale.master !== 1
    || field.qualitySpacingScale.desktop < 1
    || field.qualitySpacingScale.mobile < field.qualitySpacingScale.desktop) {
    throw new Error('Invalid source.circleField v1 radius, nominal spacing or quality scales.');
  }
  return Object.freeze({ ...field, qualitySpacingScale: Object.freeze({ ...field.qualitySpacingScale }) });
}

export function validateAboutCircleFieldRadii(meta, buffer, field) {
  if (!field) return;
  // This version has one exact packed display radius, including records outside
  // the selected shipping prefix. Raw survey radii remain source provenance.
  if (meta?.quantization?.radiusWU?.step !== RADIUS_STEP_WU || buffer.byteLength % 32 !== 0) {
    throw new Error('source.circleField requires the 32-byte, 0.0001 WU radius encoding.');
  }
  const expected = Math.round(field.radiusWU / RADIUS_STEP_WU);
  const view = new DataView(buffer);
  for (let offset = 0; offset < buffer.byteLength; offset += 32) {
    if (view.getUint16(offset + 16, true) !== expected) {
      throw new Error(`Surfel ${offset / 32} differs from source.circleField.radiusWU.`);
    }
  }
}

// Called after the ordinary look writer and at resize. Mutates its existing
// target; no objects or buffers are created in the frame loop.
export function applyAboutCircleFieldControls(target, field, pixelRatio, globals) {
  target.circleFieldMode = Boolean(field);
  if (!field) return target;
  // Read the authoritative values so repeated resize calls cannot compound DPR.
  // Live edits, canonical save and reload continue to use the existing controls.
  target.minPointSizePx = getAboutSceneControlValue(globals, 'pointMaterial', 'minPointSize') * pixelRatio;
  target.maxPointSizePx = getAboutSceneControlValue(globals, 'pointMaterial', 'pointSize') * pixelRatio;
  target.backfaceRetention = getAboutSceneControlValue(globals, 'pointMaterial', 'backfaceRetention');
  return target;
}
