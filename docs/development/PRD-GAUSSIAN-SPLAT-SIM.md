# PRD: Gaussian Splat Spatial Simulation Mode

## Summary
Create a new simulation mode that presents a spatial 3D Gaussian splat scene rendered as a dot-matrix of the existing colored balls. Users can rotate/tumble the scene (no zoom) via pointer/touch input, preserving the signature ball look while enabling an immersive 3D effect.

## Goals
- Deliver a new mode that feels spatial, tactile, and visually distinct while retaining the colored ball aesthetic.
- Use an open-source Gaussian splat scene bundled locally (no external calls).
- Enable rotation/tumbling interaction (drag/orbit) with inertia and reset.
- Maintain performance targets (60 FPS) with a stable render loop.

## Non-Goals
- No zoom controls or dolly movement.
- No network fetching of splat assets at runtime.
- No photoreal textures; the visual style is a dot-matrix of colored balls.
- No changes to modal blur architecture.

## Open Questions
1. **Asset choice/licensing**: Which open-source Gaussian splat scene is lightweight and permissively licensed? (e.g., CC0 or MIT). Decide on a specific dataset and document attribution.
2. **Splat-to-ball mapping**: How to map splat points to ball sizes/colors (palette mapping, luminance mapping, or cluster mapping)?
3. **Performance ceiling**: Target point count for 60 FPS on mid-tier mobile devices.
4. **Camera defaults**: Initial yaw/pitch framing, inertia curve, and reset behavior.
5. **Accessibility**: Should we offer reduced-motion alternative (static viewpoint) for `prefers-reduced-motion`?

## User Stories
- As a user, I can rotate the scene by dragging to explore it from different angles.
- As a user, I can recognize the signature colored-ball aesthetic within a 3D form.
- As a user on mobile, I can tumble the scene with touch gestures.
- As a user with reduced-motion preferences, I experience a non-animated view.

## Functional Requirements
1. **Mode**: Add a new simulation mode (e.g., `GaussianSplatSpatial`) as the 21st mode (do not replace existing modes).
2. **Default preview**: Load this new mode first on the website so it is shown on initial load for preview.
3. **Asset**: Bundle a small Gaussian splat dataset in-repo; load locally at runtime.
4. **Rendering**: Render splat points as ball-like dots using existing palette tokens.
5. **Interaction**: Click/touch drag rotates; release continues with inertia; no zoom.
6. **Reset**: Provide a single-tap/click reset to default orientation (if consistent with other modes).
7. **Accessibility**: Honor `prefers-reduced-motion` by disabling inertia/auto-rotation.
8. **Privacy**: No external network requests.

## Visual/Interaction Design
- **Dot matrix**: Each splat point becomes a colored ball. Base size scales by splat radius or depth.
- **Coloring**: Use existing palette; optionally map luminance to palette index for depth shading.
- **Lighting**: Keep flat/ambient lighting or shader-based shading to preserve the ball look.
- **Controls**: Orbit/tumble only (no zoom/pan). Drag left/right to yaw, up/down to pitch.

## Technical Approach
### Rendering Surface
- **Recommendation**: Use a WebGL-backed canvas for true 3D rendering and efficient point instancing.
- **Rationale**: The current 2D canvas pipeline is not suitable for 3D Gaussian splat rendering; it would require heavy per-frame transforms and sorting. WebGL enables instanced spheres/point sprites, depth handling, and smoother interactivity.
- **Integration**: Maintain the existing 2D canvas for UI/overlays; add a WebGL canvas layer beneath or replace the scene canvas for this mode only.

### Rendering Strategy
- Parse the splat dataset into a point cloud (positions + per-point radius/weight).
- Use instanced rendering (billboarded spheres or point sprites) with a simple shader to mimic balls.
- Apply a palette lookup to color each instance, preserving the visual identity.

### Interaction
- Implement a lightweight orbit controller with locked distance.
- No zoom; only rotation about a target origin.
- Inertia on release; clamp pitch to avoid gimbal flips.

### Asset Handling
- Store the splat asset in a new local folder (e.g., `source/assets/splats/`).
- Convert to a compact binary or JSON format suitable for fast loading.
- Document attribution in `docs/reference/` or alongside the asset.

### Candidate Asset Options (to source online and verify license)
**Gaussian Splat Datasets**
1. **Mip-NeRF 360 scenes** (e.g., `garden`, `bicycle`, `stump`): commonly used for splat demos and visually rich. Verify dataset license and redistribute a small subset for local use.
2. **Open-source splat sample packs** from popular Gaussian splatting repos (often include a small room, statue, or object scene). Identify a CC0/MIT subset for bundling.

**Alternative 3D Scenic Models (dot-matrix mapping instead of splat)**
1. **Sponza Atrium** (glTF/OBJ): classic architectural interior with strong depth cues; sample points on mesh to place ball dots.
2. **Courtyard/statue garden** glTF scene: use a scenic outdoor model, sample surface points, and render balls at sampled positions.

> Each candidate must be vetted for license and size; final selection should favor a small, scenic dataset that renders well at ~10–30k points.

## Performance Budget
- Initial target: 10–30k points with instancing.
- 60 FPS on mid-tier mobile; avoid per-frame allocations.
- GPU-driven transforms; minimal CPU work per frame.

## Milestones
1. **Asset selection**: Choose dataset, verify license, add attribution.
2. **Prototype**: Load dataset + render point cloud in WebGL mode.
3. **Ball style**: Shader-based ball look + palette mapping.
4. **Interaction**: Orbit controls + reduced motion handling.
5. **Optimization**: Tune point count, LOD, and mobile performance.

## Risks
- Large splat datasets may exceed memory or mobile GPU limits.
- Ball-style shading might reduce legibility without careful size/contrast tuning.
- WebGL integration complexity with existing render loop.

## Acceptance Criteria
- New mode renders a locally bundled Gaussian splat as a colored-ball dot matrix.
- Users can rotate/tumble the scene; no zoom.
- Performance holds 60 FPS target on representative devices.
- Accessibility requirements respected; no external requests.
