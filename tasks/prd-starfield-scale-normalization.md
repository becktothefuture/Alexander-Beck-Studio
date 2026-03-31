# PRD: Starfield Scale Normalization

## Introduction

`starfield-3d` currently reads as visually oversized relative to the rest of the simulation suite. The stars feel heavier and larger than the shared material language used elsewhere on the site, which breaks the desired continuity between modes. The current implementation uses a star-specific radius formula that scales stars larger than the shared baseline, and this needs to be rebalanced without losing the atmospheric depth-field feel of the mode.

This feature will normalize the perceived star size so `starfield-3d` feels part of the same simulation family while remaining airy, spatial, and distinct.

## Goals

- Reduce the perceived size of stars in `starfield-3d`.
- Bring star size into the same visual family as the shared site dots.
- Preserve the atmospheric, depth-based, drifting feel of the starfield.
- Ensure the mode remains visually successful on desktop and mobile.
- Maintain or improve performance while adjusting scale.

## User Stories

### US-001: Reduce star size to match the shared material language
**Description:** As a visitor, I want the stars to feel like the same family of dot objects used elsewhere on the site so that the simulation suite feels coherent.

**Acceptance Criteria:**
- [ ] `starfield-3d` no longer reads as oversized relative to the shared site dots.
- [ ] The apparent star size is visually closer to the baseline used by the core physics modes.
- [ ] The resulting size still leaves enough contrast and presence to read as a starfield rather than dust noise.
- [ ] Verify in browser using dev-browser skill.

### US-002: Preserve depth-based scale behavior without oversized near stars
**Description:** As a visitor, I want near and far stars to preserve a sense of depth so the mode still feels spatial, not flattened.

**Acceptance Criteria:**
- [ ] Near stars can still appear larger than far stars.
- [ ] Depth scaling is rebalanced so near stars do not dominate the composition.
- [ ] Far stars remain visible and legible enough to sustain the depth field.
- [ ] Verify in browser using dev-browser skill.

### US-003: Keep the starfield atmospheric rather than heavy
**Description:** As a designer, I want the starfield to feel delicate and spatial so that it supports the overall site tone instead of overpowering it.

**Acceptance Criteria:**
- [ ] The mode retains an airy, cinematic feel after normalization.
- [ ] The stars do not visually compete with the hero title and navigation.
- [ ] Pointer interaction still feels responsive and intentional after the size change.
- [ ] Verify in browser using dev-browser skill.

### US-004: Validate desktop and mobile behavior
**Description:** As a visitor, I want the mode to feel consistent across devices so the site quality holds on both large and small screens.

**Acceptance Criteria:**
- [ ] Visual review is completed on desktop and mobile.
- [ ] Desktop and mobile both retain the intended atmospheric feel.
- [ ] Mobile does not regress into oversized or cluttered star presentation.
- [ ] Verify in browser using dev-browser skill.

### US-005: Keep starfield performance within guardrails
**Description:** As a developer, I want star size tuning to avoid performance regressions so this visual fix does not create new runtime issues.

**Acceptance Criteria:**
- [ ] Any count, fade, or depth adjustments required by the size rebalance stay within acceptable runtime performance.
- [ ] Existing mobile/object-budget logic remains intact or is improved if needed.
- [ ] No new mode-specific performance workaround is introduced without clear justification.
- [ ] Verify in browser using dev-browser skill.

## Functional Requirements

- FR-1: The system must reduce the apparent size of stars in `starfield-3d`.
- FR-2: The system must preserve depth-based size variation across the starfield.
- FR-3: The system must align star size more closely with the canonical cross-mode dot-size language.
- FR-4: The system must keep the mode visually readable behind the home hero content.
- FR-5: The system must be reviewed on desktop and mobile.
- FR-6: The system must not introduce performance regressions while rebalancing star scale.
- FR-7: Any new or updated configuration controls must participate in live apply, canonical save, and build flattening if they are exposed in the panel.

## Non-Goals

- This PRD does not normalize all other simulation modes.
- This PRD does not redesign the starfield interaction model.
- This PRD does not change unrelated palette, motion, or shell layout behavior.
- This PRD does not create a full new control family unless scale tuning genuinely requires it.

## Design Considerations

- The target feel is “delicate depth field,” not “large floating marbles.”
- Slight stylization is acceptable as long as star size no longer looks disconnected from the rest of the site.
- The hero title and nav must remain visually parseable when the mode is active.
- Mobile review matters because large stars are especially disruptive on smaller viewports.

## Technical Considerations

- Current starfield sizing uses a mode-specific formula in [starfield-3d.js](/Users/alexanderbeck/Projects-code/Alexander%20Beck%20Studio%20Website/react-app/app/src/legacy/modules/modes/starfield-3d.js#L89) where `baseR = (g.R_MED || 20) * dotSizeMul * 2`.
- The current `starfieldDotSizeMul` config default is `1.0` in [design-system.json](/Users/alexanderbeck/Projects-code/Alexander%20Beck%20Studio%20Website/react-app/app/public/config/design-system.json#L231), but the extra `* 2` makes the stars visually much larger than their config suggests.
- Any implementation should review whether the correct fix is:
  - lowering the mode’s base size formula
  - changing the default multiplier
  - adjusting depth scaling
  - or combining those changes
- Performance review should include star count, fade behavior, and any depth or projection effects that amplify visual heaviness.

## Success Metrics

- Designers judge `starfield-3d` to be visually aligned with the rest of the simulation family.
- The starfield still reads as spatial and atmospheric rather than flattened.
- Desktop and mobile both pass visual review.
- No obvious runtime performance regression is introduced by the rebalance.

## Open Questions

- Should starfield normalization happen only through code-level formula changes, or should a smaller default config value also be authored?
- Should the final implementation expose a star-specific tuning control in the dev panel, or keep this fully normalized under the hood?
- How much larger, if at all, are near stars allowed to be than the shared baseline before the mode starts feeling inconsistent again?
