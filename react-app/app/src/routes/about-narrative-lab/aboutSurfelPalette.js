import {
  DEFAULT_SIMULATION_COLOR_DISTRIBUTION,
  resolveSimulationColorDistribution,
  resolveSimulationPaletteColors,
} from '../../palette/simulationPaletteContract.js';

export const ABOUT_BLENDER_PALETTE_ROLES = Object.freeze([
  'atmosphere',
  'stone',
  'steel',
  'glass',
  'signal',
  'organic',
]);

// Blender owns these six stable semantic slots. Their website colours are the
// corresponding six Home material roles, resolved from the live shared palette.
// Keep this bridge semantic so distribution ordering can change without making
// the About scene a second palette source.
export const ABOUT_HOME_ROLE_BY_BLENDER_ROLE = Object.freeze({
  atmosphere: 'product-design',
  stone: 'experience-design',
  steel: 'art-direction',
  glass: 'motion-3d',
  signal: 'creative-engineering',
  organic: 'parametric-systems',
});

export function resolveAboutSurfelPaletteColors(snapshot = {}) {
  const colors = resolveSimulationPaletteColors(snapshot.colors);
  const distribution = resolveSimulationColorDistribution(
    snapshot.distribution || DEFAULT_SIMULATION_COLOR_DISTRIBUTION,
    colors.length,
  );
  const byRole = new Map(distribution.map((role) => [role.roleId, role]));
  return Object.freeze(ABOUT_BLENDER_PALETTE_ROLES.map((semanticRole, index) => {
    const homeRoleId = ABOUT_HOME_ROLE_BY_BLENDER_ROLE[semanticRole];
    const homeRole = byRole.get(homeRoleId) || distribution[index] || distribution[0];
    return colors[homeRole.colorIndex];
  }));
}
