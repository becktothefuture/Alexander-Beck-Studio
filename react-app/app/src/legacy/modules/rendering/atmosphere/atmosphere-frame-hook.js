import {
  notifySimulationAtmosphereSourceFrame,
  tickSimulationAtmosphere,
} from './simulation-atmosphere.js';

let frameRenderer = null;
let framePolicy = null;
export function setAtmosphereFrameRenderer(renderer, policy = null) {
  frameRenderer = typeof renderer === 'function' ? renderer : null;
  framePolicy = frameRenderer && policy && typeof policy === 'object' ? policy : null;
}

export function renderActiveAtmosphereFrame(globals) {
  // The physics renderer calls this only after its target canvas has been
  // painted. Keep this handshake allocation-free on the steady-state path.
  notifySimulationAtmosphereSourceFrame('home');
  if (frameRenderer) {
    frameRenderer(globals);
    return;
  }
  tickSimulationAtmosphere(performance.now());
}

export function isAtmosphereFrameRendererActive() {
  return frameRenderer !== null;
}

export function doesAtmosphereEngineOwnTitle() {
  return frameRenderer !== null && framePolicy?.titleOwner === 'engine';
}

export function resolveAtmosphereTitlePlacementOverride(mode) {
  const override = framePolicy?.titlePlacementOverride;
  const resolved = typeof override === 'function' ? override(mode) : override || null;
  if (resolved) return resolved;
  return null;
}

export function resolveAtmosphereDepthProfile(mode) {
  const resolver = framePolicy?.depthProfile;
  const resolved = typeof resolver === 'function' ? resolver(mode) : resolver || null;
  if (resolved) return resolved;
  return null;
}

export function getAtmosphereFramePolicySnapshot() {
  if (!frameRenderer) return null;
  return {
    titleOwner: framePolicy?.titleOwner || 'shell',
  };
}
