const DISABLED_RESOURCES = Object.freeze({
  context: null,
  resourceLedger: null,
  webglTracker: null,
});

export function createAboutNarrativeRuntimeResources() {
  return DISABLED_RESOURCES;
}
