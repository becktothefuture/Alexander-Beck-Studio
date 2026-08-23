import {
  SIMULATION_MATERIAL_ROLE_COUNT,
  createSimulationMaterialSequence,
} from '../../palette/simulationPaletteContract.js';

// Blender semantic roles describe surfaces, not literal website colours.
// Map steel away from the Home palette's pale editorial role so structural
// shells remain visible against the light studio window in every reveal.
const SEMANTIC_DOMINANT_ROLES = Object.freeze([0, 5, 1, 3, 4, 5]);

function positiveInteger(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

export function createAboutSurfelPaletteRoles(count, {
  modelId = 0,
  partId = 0,
  semanticRole = 0,
  snapshot,
} = {}) {
  const roleCount = positiveInteger(count);
  if (!roleCount) return new Uint8Array();

  // Blender owns material boundaries and the site owns their active colours.
  // Keep most surfels on the authored semantic role so a screen, shell, cable,
  // or control remains legible. The interleaved Home rhythm supplies accents,
  // so every sufficiently large material stays multicolour and follows the
  // same scheduled palette as the homepage simulations.
  const offset = (
    Math.imul(positiveInteger(modelId) + 1, 37)
    + Math.imul(positiveInteger(partId) + 1, 17)
    + Math.imul(positiveInteger(semanticRole), 11)
  ) % roleCount;
  const sequence = createSimulationMaterialSequence(roleCount, { offset }, snapshot);
  const semanticIndex = positiveInteger(semanticRole) % SIMULATION_MATERIAL_ROLE_COUNT;
  const dominantRole = SEMANTIC_DOMINANT_ROLES[semanticIndex];
  return Uint8Array.from(sequence, (role, index) => (
    ((index + offset) % 4 === 0)
      ? positiveInteger(role?.distributionIndex) % SIMULATION_MATERIAL_ROLE_COUNT
      : dominantRole
  ));
}
