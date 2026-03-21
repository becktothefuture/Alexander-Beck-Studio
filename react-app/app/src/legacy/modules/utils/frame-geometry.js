import { isPitLikeMode } from '../core/constants.js';

function toFiniteNumber(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function getFrameBorderWidthCssPx(globals) {
  return Math.max(0, toFiniteNumber(globals?.frameBorderWidthEffective ?? globals?.frameBorderWidth, 0));
}

export function getSimulationVisibleInsetCssPx(globals) {
  const currentMode = String(globals?.currentMode || '').toLowerCase();
  if (isPitLikeMode(currentMode)) {
    return Math.max(0, toFiniteNumber(globals?.wallInset, 0));
  }
  return getFrameBorderWidthCssPx(globals);
}

export function getSimulationCanvasBleedCssPx(globals) {
  const frameBorderWidth = getFrameBorderWidthCssPx(globals);
  const visibleInset = getSimulationVisibleInsetCssPx(globals);
  return Math.max(0, frameBorderWidth - visibleInset);
}

export function getSimulationVisibleInsetPx(globals) {
  const dpr = toFiniteNumber(globals?.DPR, 1) || 1;
  return getSimulationVisibleInsetCssPx(globals) * dpr;
}
