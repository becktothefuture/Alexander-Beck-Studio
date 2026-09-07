export const ABOUT_BLENDER_STAGE_IDS = Object.freeze([
  'about.00',
  'about.01',
  'about.02',
  'about.03',
  'about.04',
  'about.05',
  'about.06',
]);

const ABOUT_BLENDER_STAGE_ID_SET = new Set(ABOUT_BLENDER_STAGE_IDS);

export function isAboutBlenderStageId(value) {
  return ABOUT_BLENDER_STAGE_ID_SET.has(value);
}
