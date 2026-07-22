import {
  ABOUT_INTERACTIVE_STACK_VISIBLE_COUNT,
  resolveAboutInteractiveStackParameters,
} from './aboutInteractiveStackContract.js';

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

export function createAboutInteractiveStackOrder(items = [], seed = 0) {
  const order = items.map((item) => item.id);
  const random = mulberry32(Number(seed) || 0);
  for (let index = order.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [order[index], order[target]] = [order[target], order[index]];
  }
  return order;
}

export function advanceAboutInteractiveStackOrder(order = []) {
  return order.length > 1 ? [...order.slice(1), order[0]] : [...order];
}

export function retreatAboutInteractiveStackOrder(order = []) {
  return order.length > 1 ? [order.at(-1), ...order.slice(0, -1)] : [...order];
}

export function reconcileAboutInteractiveStackOrder(order = [], items = [], seed = 0) {
  const availableIds = new Set(items.map((item) => item.id));
  const surviving = order.filter((id) => availableIds.has(id));
  const survivingIds = new Set(surviving);
  const additions = createAboutInteractiveStackOrder(items, seed)
    .filter((id) => !survivingIds.has(id));
  return [...surviving, ...additions];
}

export function createAboutInteractiveStackSlots(count, authoredParameters = {}) {
  const parameters = resolveAboutInteractiveStackParameters(authoredParameters);
  const random = mulberry32(parameters.seed ^ 0x9E3779B9);
  const boundedCount = Math.min(ABOUT_INTERACTIVE_STACK_VISIBLE_COUNT, Math.max(0, count));
  return Array.from({ length: boundedCount }, (_, depth) => {
    if (depth === 0) return Object.freeze({ depth, xPct: 0, yPct: 0, rotationDeg: 0, scale: 1 });
    const depthRatio = depth / Math.max(1, boundedCount - 1);
    const sign = random() < 0.5 ? -1 : 1;
    return Object.freeze({
      depth,
      xPct: sign * parameters.spreadXPct * (0.28 + random() * 0.72),
      yPct: parameters.spreadYPct * depthRatio * (0.55 + random() * 0.45),
      rotationDeg: sign * parameters.rotationDeg * (0.3 + random() * 0.7),
      scale: 1 - parameters.scaleJitter * depthRatio * (0.7 + random() * 0.3),
    });
  });
}
