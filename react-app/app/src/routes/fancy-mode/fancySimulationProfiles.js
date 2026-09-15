// Presentation only: no changes to particle counts, forces, collisions or roles.
// Small fast bodies need a minimum footprint; dense repeated fields need
// less spread. Shorter trails keep each simulation's movement distinguishable.
export const FANCY_SIMULATION_PROFILES = Object.freeze({
  work: { coverage: 1, wake: 0.45, minSupport: 1.25, note: 'The quiet depth field follows the camera. It redraws while moving or settling, then rests. Project cards retain their original content.' },
  contact: { coverage: 0.9, wake: 0.65, minSupport: 1, note: 'The existing bead rings become patterned bands. Their motion and contact feedback still use the same bodies.' },
  about: { coverage: 1, wake: 0.35, minSupport: 1, note: 'The GPU samples the 3D scene into the same screen grid and stamps the same six patterns. Depth, authored forms and camera movement are preserved, with no pixel transfers to the CPU.' },
  pit: { coverage: 1, wake: 0.8, minSupport: 0.95, note: 'A connected pile, with enough separation to see settling and collisions.' },
  flies: { coverage: 1.12, wake: 0.55, minSupport: 1.05, note: 'A minimum mark footprint keeps the small, fast bodies visible.' },
  water: { coverage: 1.05, wake: 0.9, minSupport: 1, note: 'A little overlap joins the flow. Material movement carries the waves.' },
  'repel-room': { coverage: 0.95, wake: 0.6, minSupport: 1, note: 'Short trails keep the push and rebound easy to read.' },
  'flock-of-birds': { coverage: 1, wake: 0.65, minSupport: 1, note: 'Compact marks preserve gaps between neighbours and the direction of the flock.' },
  'flubber-blob': { coverage: 0.78, wake: 0.5, minSupport: 0.95, note: 'Less overlap keeps the dense body from becoming a solid block.' },
  'kaleidoscope-3': { coverage: 0.82, wake: 0.55, minSupport: 0.95, note: 'Copies share one grid, so overlapping spokes do not stack extra layers of pigment.' },
  magnetic: { coverage: 0.9, wake: 0.7, minSupport: 0.95, note: 'Tighter coverage keeps attraction lines and gaps between clusters visible.' },
  'kaleidoscope-rift': { coverage: 0.82, wake: 0.55, minSupport: 0.95, note: 'Repeated bodies collect into one field, with short trails around the moving centre.' },
  'particle-fountain-b': { coverage: 1.12, wake: 0.4, minSupport: 1.05, note: 'Small droplets get a readable footprint and a quick fade to preserve their arcs.' },
});

export const FANCY_UNADAPTED_PROFILE = Object.freeze({ coverage: 1, wake: 1, minSupport: 0 });
