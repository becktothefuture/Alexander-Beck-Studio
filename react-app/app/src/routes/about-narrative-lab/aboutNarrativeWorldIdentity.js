/**
 * Resolves the stable identity of a World object.
 *
 * Schema v3 Worlds own `id`. `worldId` is accepted for runtime-facing
 * descriptors, while `sectionId` is a migration-only fallback for compiled v2
 * Worlds. Keep the fallback here so the rest of the runtime can move to World
 * language without duplicating legacy checks.
 */
export function getAboutNarrativeWorldId(world) {
  if (!world || typeof world !== 'object') return '';
  const candidate = world.id ?? world.worldId ?? world.sectionId;
  return typeof candidate === 'string' && candidate.length ? candidate : '';
}

export function requireAboutNarrativeWorldId(world, label = 'World') {
  const worldId = getAboutNarrativeWorldId(world);
  if (!worldId) throw new TypeError(`${label} requires a stable World id.`);
  return worldId;
}

export function findAboutNarrativeWorldById(worlds, worldId) {
  if (!Array.isArray(worlds) || typeof worldId !== 'string' || !worldId) return null;
  return worlds.find((world) => getAboutNarrativeWorldId(world) === worldId) || null;
}

export function getAboutNarrativeWorldPairId(fromWorld, toWorld) {
  return `${requireAboutNarrativeWorldId(fromWorld, 'Source World')}->${requireAboutNarrativeWorldId(toWorld, 'Target World')}`;
}

export function resolveAboutNarrativeWorldAnchorWU(world) {
  if (Number.isFinite(world?.anchorWU)) return Number(world.anchorWU);
  if (Number.isFinite(world?.startWU)) return Number(world.startWU);
  throw new TypeError('World placement requires a finite anchorWU.');
}

export function resolveAboutNarrativeWorldAnchorRailZ(world, globals) {
  if (Number.isFinite(world?.anchorRailZ)) return Number(world.anchorRailZ);
  const originZ = Number(globals?.worldRail?.originZ ?? globals?.camera?.startZ);
  const unitsPerWU = Number(globals?.worldRail?.unitsPerWU ?? globals?.camera?.cadence);
  if (!Number.isFinite(originZ) || !Number.isFinite(unitsPerWU)) {
    throw new TypeError('World placement requires a finite World rail.');
  }
  return originZ - (resolveAboutNarrativeWorldAnchorWU(world) * unitsPerWU);
}
