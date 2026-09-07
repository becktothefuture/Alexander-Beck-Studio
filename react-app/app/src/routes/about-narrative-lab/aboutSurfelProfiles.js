// A semantic model key survives changes to the packed model inventory.
export const ABOUT_SURFEL_PROFILES = Object.freeze({ atmosphere: 0, solid: 1, bust: 2 });

export function resolveAboutSurfelProfile(model) {
  const authored = ABOUT_SURFEL_PROFILES[model?.renderingProfile];
  if (authored !== undefined) return authored;
  if (model?.key === 'about.06') return ABOUT_SURFEL_PROFILES.bust;
  if (['about.01', 'about.02', 'about.04', 'about.05'].includes(model?.key)) return ABOUT_SURFEL_PROFILES.solid;
  return ABOUT_SURFEL_PROFILES.atmosphere;
}

export function hasAboutParticleDrift(model) {
  return resolveAboutSurfelProfile(model) === ABOUT_SURFEL_PROFILES.atmosphere
    && model?.key !== 'about.03';
}
