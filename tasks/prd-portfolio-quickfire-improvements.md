# PRD: Portfolio Quick-Fire Improvements

## Introduction

Improve the portfolio route so the project bodies feel physically credible, carry richer project copy, stay stable on resize, and preserve the intended wall/mask system on small screens. The current experience has three visible issues: the project bodies do not yet feel like the pit objects they should match, the label/content model is too thin for the intended storytelling, and the route still has layout/masking regressions at very small sizes and during resize.

## Goals

- Make portfolio project bodies settle and collide with the same visible spacing logic as the pit.
- Add a two-level label system inside each project body: client eyebrow + richer teaser title.
- Move that label content into the portfolio JSON so content drives rendering.
- Keep the portfolio route stable on resize without runaway size growth or dead gaps.
- Keep the wall as the single visual mask for the scene.
- Preserve the horizontal mobile nav/link row even at the smallest supported viewport.
- Increase shape depth so the bodies show a visible top-left light edge and bottom-right shadow edge.

## Assumptions

- The six current portfolio entries map to these client eyebrows unless contradicted later:
  - `chapter-1` → `Bentley SMP`
  - `chapter-4` → `Swiss Re`
  - `chapter-3` → `Yoti`
  - `chapter-2` → `My own project`
  - `chapter-5` → `Studio Flow`
  - `chapter-6` → `Mind Flow`
- The existing `projects` arrays in `react-app/app/public/config/contents-portfolio.json` and `react-app/app/public/config/portfolio-data.json` remain the authored content sources that front-end rendering can consume directly.
- “Same settings as in the ball pit” means matching the visible resting distance, frictional damping, and wall-clearance behavior used in the shared pit system, adapted for the portfolio SAT bodies.

## User Stories

### US-001: Content-driven portfolio bodies
**Description:** As a site editor, I want portfolio body labels to come from JSON so adding a new project entry creates a new labeled project body without extra hard-coded UI work.

**Acceptance Criteria:**
- [ ] Each portfolio project record includes a client eyebrow field and a richer teaser title field for the body label.
- [ ] Existing project entries are updated with real client labels and teaser titles aligned to `docs/reference/TONE-OF-VOICE.md`.
- [ ] The body label rendering reads those JSON fields instead of relying on a hard-coded or implicit short title.
- [ ] Adding one more project object to the portfolio JSON is sufficient to create another project body in the frontend.
- [ ] Lint/build passes.

### US-002: Two-level project labels inside shapes
**Description:** As a portfolio visitor, I want each project body to show the client name above the project teaser so I can understand the work faster without opening the drawer.

**Acceptance Criteria:**
- [ ] Every project body shows an eyebrow line above the main body title.
- [ ] The eyebrow and title remain centered and legible inside both circle and squircle bodies.
- [ ] Label layout responds to body size changes on resize and mobile.
- [ ] Accessibility labels continue to expose the meaningful project name.
- [ ] Verify in browser using dev-browser skill.

### US-003: Pit-like physical behavior
**Description:** As a portfolio visitor, I want the project bodies to feel like physical objects with believable separation, friction, and wall clearance so the simulation feels intentional rather than loose.

**Acceptance Criteria:**
- [ ] Project bodies maintain visible spacing from each other instead of visually colliding edge-to-edge.
- [ ] Project bodies maintain visible clearance from the wall boundary using the same practical rules as the pit.
- [ ] Friction/damping produces a steadier, heavier settle instead of slippery or jittery motion.
- [ ] The behavior works for both circles and squircles in `PORTFOLIO_PIT`.
- [ ] Verify in browser using dev-browser skill.

### US-004: Stable resize and natural reflow
**Description:** As a portfolio visitor, I want the project bodies to recalculate cleanly when the browser changes size so they do not grow uncontrollably or leave broken gaps.

**Acceptance Criteria:**
- [ ] Resizing the portfolio route up and down does not cause project bodies to keep growing each time.
- [ ] Body sizes are recalculated from the live available wall interior, not compounded from previous resizes.
- [ ] The project set reflows naturally after resize with no obvious overlaps, gaps, or off-screen bodies.
- [ ] Any resize reseed/reflow preserves project count and content mapping.
- [ ] Verify in browser using dev-browser skill.

### US-005: Correct wall masking and robust tiny-mobile chrome
**Description:** As a mobile visitor, I want the wall to be the only scene mask and the top-row controls to stay intact on tiny screens so the route remains clean and usable.

**Acceptance Criteria:**
- [ ] The wall host remains the primary radius/mask for the portfolio scene and drawer host.
- [ ] Decorative inner elements do not add redundant radius where the wall mask should already clip them.
- [ ] The portfolio route top-row controls remain horizontally aligned on very small mobile widths.
- [ ] The arrow container and links do not break into a broken state at the smallest viewport sizes.
- [ ] Verify in browser using dev-browser skill.

### US-006: Stronger material edge lighting
**Description:** As a portfolio visitor, I want the project bodies to show a visible light edge and shadow edge so they feel like dimensional objects.

**Acceptance Criteria:**
- [ ] Each project body has a noticeable top-left light rim.
- [ ] Each project body has a noticeable bottom-right shadow rim.
- [ ] The effect reads on both light and dark palettes without looking like a hard outline.
- [ ] The effect applies to portfolio bodies, not only generic ball renders.
- [ ] Verify in browser using dev-browser skill.

## Functional Requirements

- FR-1: Portfolio project content must support distinct fields for client eyebrow and body teaser title.
- FR-2: Portfolio shape labels must render from content data and remain synchronized with body size changes.
- FR-3: Portfolio physics must use explicit body-to-body and body-to-wall spacing values comparable to the shared pit behavior.
- FR-4: Resize logic must derive fresh body diameters from current interior bounds and avoid compounding scale on repeat resizes.
- FR-5: Portfolio route masking must rely on the wall/frame host instead of stacking duplicate border radii on inner containers.
- FR-6: Tiny-mobile route chrome must keep the existing horizontal flex direction and remain usable.
- FR-7: Portfolio bodies must render with stronger directional light/shadow edges.
- FR-8: Any content/schema changes must preserve the “data drives project count” contract.

## Non-Goals

- No redesign of the portfolio drawer content structure beyond what is needed to keep data fields consistent.
- No alternate mobile nav layout that changes the route chrome from horizontal to vertical.
- No new portfolio CMS or external content source.
- No change to the locked two-layer modal blur architecture.

## Design Considerations

- Follow `docs/reference/TONE-OF-VOICE.md` for new titles and summaries.
- Follow `docs/reference/LAYER-STACKING.md` and the portfolio-specific radius notes in `AGENTS.md`.
- Keep the route top bar aligned with the existing shared strip pattern.
- The body label should read like an editorial marker: small client eyebrow, larger teaser title, clear hierarchy, centered composition.

## Technical Considerations

- Relevant files are concentrated in:
  - `react-app/app/public/config/contents-portfolio.json`
  - `react-app/app/public/config/portfolio-data.json`
  - `react-app/app/public/css/portfolio.css`
  - `react-app/app/src/legacy/modules/portfolio/app.js`
  - `react-app/app/src/legacy/modules/portfolio/pit-mode.js`
  - `react-app/app/src/legacy/modules/physics/collision.js`
  - `react-app/app/src/legacy/modules/physics/Ball.js`
  - `react-app/app/src/legacy/modules/visual/ball-rim.js`
- The repo currently has unrelated local modifications. Contributors must not revert or overwrite changes they did not make.
- Portfolio labels are currently rendered in a DOM overlay tied to ball metrics; the implementation should keep that synchronization path stable.
- Portfolio circles/squircles already use SAT and wall-normal support logic; changes should extend that behavior, not fork it.

## Success Metrics

- The portfolio route feels stable and physically credible during normal load and resize.
- Project bodies communicate client + specialty before opening a project.
- Tiny-mobile nav remains usable without layout breakage.
- Visual depth on project bodies is clearly visible in normal viewing conditions.

## Open Questions

- Whether any of the six client mappings above should be reassigned to different chapters.
- Whether the richer teaser title should also replace the drawer hero title or remain body-label-only for now.
