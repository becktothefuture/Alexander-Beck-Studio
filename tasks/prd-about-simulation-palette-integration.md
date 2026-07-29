# PRD: About Simulation Palette Integration

## Introduction/Overview

The About narrative renders one WebGL point world that moves through orb, scatter, grid, discipline, monochrome, and gathered-form stages. This integration binds its chromatic material uniforms to the approved global snapshot while preserving all correspondence, camera, buffer, and authored monochrome choreography. It depends on `prd-global-simulation-palette-system.md`.

## Goals

- Resolve all visible chromatic point material from the global snapshot.
- Keep discipline role continuity across every palette generation.
- Update uniforms only, with explicit sRGB output and no buffer regeneration.
- Preserve intentional monochrome stages exactly.

## User Stories

### US-001: Bind About uniforms to shared roles
**Description:** As a visitor, I want About’s disciplines to retain their meaning while adopting the site palette so that the narrative and global material system agree.

**Acceptance Criteria:**
- [ ] Six material uniforms and thresholds derive from snapshot distribution roles.
- [ ] Each discipline retains the same central `roleId` across palette changes.
- [ ] No bespoke intermediate chromatic colour is visible.
- [ ] Verify in browser using dev-browser skill.

### US-002: Update WebGL material without rebuilding the world
**Description:** As a visitor, I want palette boundaries to preserve the About journey so that the scene never jumps or reloads.

**Acceptance Criteria:**
- [ ] Palette commits update existing uniform values only.
- [ ] Point buffers, correspondence maps, discipline anchors, bust/grid state, camera, and scroll progress retain identity and values.
- [ ] About reports the committed generation within one render frame.
- [ ] Verify in browser using dev-browser skill.

### US-003: Enforce sRGB visual parity
**Description:** As a designer, I want WebGL colours to match the authored Canvas/CSS swatches so that About does not look darker or shifted.

**Acceptance Criteria:**
- [ ] Three.js uses `THREE.SRGBColorSpace` output.
- [ ] Custom fragment shaders include standard tone-mapping and colour-space stages.
- [ ] Certification pixel samples match source sRGB values within the defined RGB tolerance.
- [ ] Verify in browser using dev-browser skill.

## Functional Requirements

1. FR-1: About reads the global snapshot through the React hook or controller subscription.
2. FR-2: Material slots map to stable global role IDs and shared thresholds.
3. FR-3: Palette changes update uniforms without recreating geometry, buffers, renderer, scene, or runtime.
4. FR-4: Intentional monochrome isolation may override chroma amount, but any chromatic value comes from the current snapshot.
5. FR-5: Runtime diagnostics expose palette generation and resource identities for certification.
6. FR-6: Direct load and SPA entry apply the current generation before the narrative readiness cover exits.

## Non-Goals

- Changing About timeline, camera, point count, correspondence strategy, bust/grid transitions, discipline order, or editorial content.
- Making the development editor or lab a palette authority.

## Design Considerations

- Monochrome is an authored narrative state, not an alternative palette.
- Discipline colours preserve semantic continuity through the journey.

## Technical Considerations

- Cache uniform references and update them in place.
- Keep colour conversion on palette events, never in the animation hot path.

## Success Metrics

- Zero WebGL resource or correspondence regeneration on a palette commit.
- About chromatic samples match the active snapshot within certification tolerance.
- About narrative and allocation-free checks remain green.

## Open Questions

- Resolved: intentional monochrome stages remain supported; bespoke chromatic stages do not.
