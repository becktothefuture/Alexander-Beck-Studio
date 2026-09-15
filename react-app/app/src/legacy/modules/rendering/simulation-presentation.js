// Optional, document-local presentation for isolated labs. No lab code is loaded
// by the production renderers, and normal rendering has no active presentation.
let presentation = null;

export function getSimulationPresentation(includeDisabled = false) {
  return presentation && (includeDisabled || presentation.enabled) ? presentation : null;
}

export function setSimulationPresentation(next) {
  presentation = next;
  return () => {
    if (presentation === next) presentation = null;
  };
}
