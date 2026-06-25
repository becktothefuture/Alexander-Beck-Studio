# Spatial Scan

- Simulation ID: `spatial-scan`
- One-sentence idea: A scan-derived point cloud moves through a baked Blender camera path while rendering as flat site circles.
- Why it differs: Napoleon Point Cloud is object-specific and iconic; Spatial Scan tests whether scanned spatial data can become a reusable site material without losing the circle language.
- Constraint fit: It uses flat circular points, site palette distribution, no lighting/shadow dependency, and avoids thin helper geometry.
- Interaction model: The default state follows a slow baked camera loop; drag/orbit input can redirect the view; touch should use the same broad camera influence without precise controls.
- Why candidate level: It has heavier assets and a more complex capture/render path, so it needs performance and preview validation before promotion.
- Promotion bar: It becomes promotable if the point cloud loads quickly, stays legible without controls, produces a strong launchpad thumbnail, and runs smoothly on mobile.
- Deletion bar: Delete it if it feels like a model viewer instead of a site simulation, if asset weight is disproportionate, or if the camera path does not reveal a clear spatial idea.
