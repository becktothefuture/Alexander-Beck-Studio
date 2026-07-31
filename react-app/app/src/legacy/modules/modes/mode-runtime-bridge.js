// Runtime-hook bridge between mode loading and the frame-frequency physics owner.
// The mode controller publishes loaded runtimes; physics reads hooks without
// importing the controller or participating in mode selection.

const modeRuntimeCache = new Map();
let missingRuntimeLoader = null;
let currentModeReader = null;

export function registerModeRuntimeLoader(loader) {
  const nextLoader = typeof loader === 'function' ? loader : null;
  missingRuntimeLoader = nextLoader;
  return () => {
    if (missingRuntimeLoader === nextLoader) missingRuntimeLoader = null;
  };
}

export function registerCurrentModeReader(reader) {
  const nextReader = typeof reader === 'function' ? reader : null;
  currentModeReader = nextReader;
  return () => {
    if (currentModeReader === nextReader) currentModeReader = null;
  };
}

export function hasModeRuntime(mode) {
  return modeRuntimeCache.has(mode);
}

export function readModeRuntime(mode) {
  return modeRuntimeCache.get(mode) || null;
}

export function writeModeRuntime(mode, runtime) {
  if (!mode || !runtime) return null;
  modeRuntimeCache.set(mode, runtime);
  return runtime;
}

export function removeModeRuntime(mode) {
  modeRuntimeCache.delete(mode);
}

export function getRuntimeForCurrentMode() {
  const mode = currentModeReader?.() || null;
  const runtime = readModeRuntime(mode);
  if (runtime) return runtime;
  missingRuntimeLoader?.(mode);
  return null;
}

export function getForceApplicator() {
  return getRuntimeForCurrentMode()?.force || null;
}

export function getModeUpdater() {
  return getRuntimeForCurrentMode()?.update || null;
}

export function getModeRenderer() {
  const runtime = getRuntimeForCurrentMode();
  if (!runtime?.preRender && !runtime?.postRender) return null;
  return {
    preRender: runtime.preRender || null,
    postRender: runtime.postRender || null,
  };
}

export function getModeCustomRenderer() {
  return getRuntimeForCurrentMode()?.customRender || null;
}

export function getModeDepthRenderer() {
  return getRuntimeForCurrentMode()?.depthRender || null;
}

export function getModeCustomStep() {
  return getRuntimeForCurrentMode()?.customStep || null;
}

export function getModeBoundsHandler() {
  return getRuntimeForCurrentMode()?.bounds || null;
}
