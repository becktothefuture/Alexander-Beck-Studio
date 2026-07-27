import {
  isSimulationAtmosphereActive,
  tickSimulationAtmosphere,
} from './simulation-atmosphere.js';

let frameRenderer = null;
let framePolicy = null;
const PRODUCTION_EMERGENCE_DEPTH_PROFILE = Object.freeze({
  plane: 0.5,
  spread: 0.26,
  frontShare: 0.34,
});

export function setAtmosphereFrameRenderer(renderer, policy = null) {
  frameRenderer = typeof renderer === 'function' ? renderer : null;
  framePolicy = frameRenderer && policy && typeof policy === 'object' ? policy : null;
}

export function renderActiveAtmosphereFrame(globals) {
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
  return isSimulationAtmosphereActive() && mode === 'bubbles' ? 'depth-plane' : null;
}

export function resolveAtmosphereDepthProfile(mode) {
  const resolver = framePolicy?.depthProfile;
  const resolved = typeof resolver === 'function' ? resolver(mode) : resolver || null;
  if (resolved) return resolved;
  return isSimulationAtmosphereActive() && mode === 'bubbles'
    ? PRODUCTION_EMERGENCE_DEPTH_PROFILE
    : null;
}

export function getAtmosphereFramePolicySnapshot() {
  if (!frameRenderer) return null;
  return {
    titleOwner: framePolicy?.titleOwner || 'atmosphere',
  };
}
