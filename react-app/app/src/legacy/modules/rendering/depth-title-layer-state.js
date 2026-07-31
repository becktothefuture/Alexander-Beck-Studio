export const DEPTH_TITLE_LAYER_ACTIVE_CLASS = 'simulation-depth-title-layer-active';

export function removeDepthTitleLayerClass(container) {
  const classList = container?.classList;
  if (!classList?.contains?.(DEPTH_TITLE_LAYER_ACTIVE_CLASS)) return false;
  classList.remove(DEPTH_TITLE_LAYER_ACTIVE_CLASS);
  return true;
}
