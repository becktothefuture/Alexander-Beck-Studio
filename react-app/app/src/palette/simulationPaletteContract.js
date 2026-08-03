import { LONDON_WEATHER_PALETTE_COLORS } from './londonPalettes.js';

export const SIMULATION_PALETTE_SIZE = 8;
export const SIMULATION_MATERIAL_ROLE_COUNT = 6;

export const FALLBACK_SIMULATION_PALETTE_COLORS = LONDON_WEATHER_PALETTE_COLORS.thamesWeather;

export const DEFAULT_SIMULATION_COLOR_DISTRIBUTION = Object.freeze([
  Object.freeze({ roleId: 'product-design', label: 'Product Design', colorIndex: 0, weight: 31 }),
  Object.freeze({ roleId: 'experience-design', label: 'Experience Design', colorIndex: 3, weight: 13 }),
  Object.freeze({ roleId: 'art-direction', label: 'Art Direction', colorIndex: 2, weight: 16 }),
  Object.freeze({ roleId: 'motion-3d', label: 'Motion & 3D', colorIndex: 6, weight: 20 }),
  Object.freeze({ roleId: 'creative-engineering', label: 'Creative Engineering', colorIndex: 7, weight: 10 }),
  Object.freeze({ roleId: 'parametric-systems', label: 'Parametric Systems', colorIndex: 5, weight: 10 }),
]);

const HEX_COLOR_PATTERN = /^#[\da-f]{6}$/i;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function freezeDistribution(distribution) {
  return Object.freeze(distribution.map((row) => Object.freeze({ ...row })));
}

function createFallbackDistribution() {
  return freezeDistribution(DEFAULT_SIMULATION_COLOR_DISTRIBUTION.map((row, distributionIndex) => ({
    ...row,
    distributionIndex,
  })));
}

export function resolveSimulationPaletteColors(palette) {
  const source = Array.isArray(palette) ? palette.slice(0, SIMULATION_PALETTE_SIZE) : [];
  if (source.length !== SIMULATION_PALETTE_SIZE) return FALLBACK_SIMULATION_PALETTE_COLORS;
  const normalized = source.map((color) => String(color || '').trim().toLowerCase());
  return normalized.every((color) => HEX_COLOR_PATTERN.test(color))
    ? Object.freeze(normalized)
    : FALLBACK_SIMULATION_PALETTE_COLORS;
}

export function resolveSimulationColorDistribution(
  distribution,
  paletteLength = SIMULATION_PALETTE_SIZE,
) {
  const maximumIndex = Math.max(0, Math.floor(Number(paletteLength) || 0) - 1);
  const source = Array.isArray(distribution) ? distribution : [];
  if (source.length !== SIMULATION_MATERIAL_ROLE_COUNT) return createFallbackDistribution();

  const roleIds = new Set();
  const resolved = [];
  for (let distributionIndex = 0; distributionIndex < source.length; distributionIndex += 1) {
    const row = source[distributionIndex];
    const roleId = String(row?.roleId || '').trim();
    const label = String(row?.label || '').trim();
    const colorIndex = Number(row?.colorIndex);
    const weight = Number(row?.weight);
    if (!roleId
      || !label
      || roleIds.has(roleId)
      || !Number.isInteger(colorIndex)
      || colorIndex < 0
      || colorIndex > maximumIndex
      || !Number.isFinite(weight)
      || weight <= 0) {
      return createFallbackDistribution();
    }
    roleIds.add(roleId);
    resolved.push({ roleId, label, colorIndex, weight, distributionIndex });
  }

  return freezeDistribution(resolved);
}

export function selectSimulationMaterialRole(sample, snapshot) {
  const distribution = snapshot?.distribution || snapshot;
  const resolved = Array.isArray(distribution) && distribution.length
    ? distribution
    : DEFAULT_SIMULATION_COLOR_DISTRIBUTION;
  const normalizedSample = clamp(Number(sample) || 0, 0, 1 - Number.EPSILON);
  let totalWeight = 0;
  for (let index = 0; index < resolved.length; index += 1) {
    totalWeight += Number(resolved[index]?.weight) || 0;
  }
  let remaining = normalizedSample * Math.max(1, totalWeight);
  for (let index = 0; index < resolved.length; index += 1) {
    remaining -= Number(resolved[index]?.weight) || 0;
    if (remaining < 0) return resolved[index];
  }
  return resolved[resolved.length - 1] || null;
}

export function resolveSimulationMaterialColorIndex(materialReference, snapshot) {
  const distribution = Array.isArray(snapshot?.distribution)
    ? snapshot.distribution
    : Array.isArray(snapshot)
      ? snapshot
      : DEFAULT_SIMULATION_COLOR_DISTRIBUTION;
  const roleId = typeof materialReference === 'string'
    ? materialReference
    : String(materialReference?.roleId || '');
  if (roleId) {
    for (let index = 0; index < distribution.length; index += 1) {
      if (distribution[index]?.roleId === roleId) return distribution[index].colorIndex;
    }
  }
  const distributionIndex = Number.isInteger(materialReference)
    ? materialReference
    : Number(materialReference?.distributionIndex);
  const colorIndex = Number(distribution[distributionIndex]?.colorIndex);
  if (Number.isInteger(colorIndex) && colorIndex >= 0) return colorIndex;
  const fallbackColorIndex = Number(distribution[0]?.colorIndex);
  return Number.isInteger(fallbackColorIndex) && fallbackColorIndex >= 0
    ? fallbackColorIndex
    : 0;
}

function createInterleavedRoleIndices(distribution, count) {
  const totalWeight = distribution.reduce((sum, row) => sum + row.weight, 0) || 1;
  const allocations = distribution.map((row, index) => {
    const exactCount = (row.weight / totalWeight) * count;
    return {
      index,
      count: Math.floor(exactCount),
      remainder: exactCount - Math.floor(exactCount),
    };
  });
  const remaining = count - allocations.reduce((sum, row) => sum + row.count, 0);
  const remainderOrder = allocations.slice().sort((a, b) => (
    b.remainder - a.remainder || a.index - b.index
  ));
  for (let index = 0; index < remaining; index += 1) {
    remainderOrder[index % remainderOrder.length].count += 1;
  }

  const currentWeights = new Array(allocations.length).fill(0);
  const sequence = [];
  for (let position = 0; position < count; position += 1) {
    let selectedIndex = 0;
    for (let index = 0; index < allocations.length; index += 1) {
      currentWeights[index] += allocations[index].count;
      if (currentWeights[index] > currentWeights[selectedIndex]) selectedIndex = index;
    }
    sequence.push(selectedIndex);
    currentWeights[selectedIndex] -= count;
  }
  return sequence;
}

export function createSimulationMaterialSequence(count, options = {}, snapshot) {
  const paletteLength = snapshot?.colors?.length || SIMULATION_PALETTE_SIZE;
  const distribution = resolveSimulationColorDistribution(
    snapshot?.distribution || options.distribution,
    paletteLength,
  );
  const sampleCount = Math.max(0, Math.floor(Number(count) || 0));
  const offset = Math.max(0, Math.floor(Number(options.offset) || 0));
  const indices = createInterleavedRoleIndices(distribution, sampleCount);
  if (offset > 0 && indices.length > 1) {
    const shift = offset % indices.length;
    indices.push(...indices.splice(0, shift));
  }
  return Object.freeze(indices.map((index) => distribution[index]));
}
