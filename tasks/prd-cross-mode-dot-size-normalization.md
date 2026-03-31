# PRD: Cross-Mode Dot Size Normalization

## Introduction

The simulation suite currently uses inconsistent dot sizing and density logic across modes. Core physics modes generally share the same base ball size, but several visual modes override that sizing with mode-specific multipliers and depth-based scaling. This creates a visible mismatch in perceived materiality across the site. The most obvious current outliers are `starfield-3d`, `3d-sphere`, `3d-cube`, and `parallax-float`, while `kaleidoscope-3` also needs review because its spread/density affects how dot size is perceived.

This feature will define a consistent cross-mode dot-size language, add a repeatable audit workflow for all simulations, and establish desktop/mobile performance guardrails so future tuning work remains visually coherent and performant.

## Goals

- Define one canonical perceived dot-size system across all simulations.
- Preserve a shared “material object” feel while allowing slight stylization in 3D and parallax modes.
- Add a repeatable visual audit workflow covering every simulation on desktop and mobile.
- Add explicit performance guardrails so visual fixes do not regress responsiveness.
- Produce clear follow-up findings that can be turned into focused implementation PRDs.

## User Stories

### US-001: Audit current dot-size behavior across all simulations
**Description:** As a designer, I want every simulation reviewed against the same visual criteria so that inconsistent dot sizing is identified systematically instead of by memory or one-off observation.

**Acceptance Criteria:**
- [ ] Review all user-facing simulation modes in the home runtime.
- [ ] For each mode, record current dot count, sizing strategy, and any mode-specific radius multipliers or overrides.
- [ ] For each mode, record visual findings for desktop and mobile.
- [ ] Findings distinguish hard regressions from subjective tuning opportunities.
- [ ] Audit output is saved in a repo-local markdown artifact that can be referenced by later PRDs.
- [ ] Verify in browser using dev-browser skill.

### US-002: Define a canonical cross-mode dot-size model
**Description:** As a designer, I want a shared size model so that all modes feel like they belong to the same material family even when their motion language differs.

**Acceptance Criteria:**
- [ ] Document a canonical baseline for perceived dot size relative to the shared global ball size system.
- [ ] Document when a mode is allowed to diverge from the baseline and by how much.
- [ ] Document how depth-based scaling in 3D/parallax modes should relate to the canonical baseline.
- [ ] Document whether mode-specific multipliers remain, are reduced, or are replaced by normalized tokens.
- [ ] Verify in browser using dev-browser skill.

### US-003: Normalize visual outliers without flattening mode identity
**Description:** As a visitor, I want the dots to feel like the same material object across modes so the simulation suite feels cohesive, while still letting 3D and parallax modes retain some stylization.

**Acceptance Criteria:**
- [ ] `starfield-3d` no longer reads as oversized relative to shared site dots.
- [ ] `3d-sphere` and `3d-cube` read as part of the same family as the physics modes.
- [ ] `parallax-float` is reviewed for both perceived size and density overload.
- [ ] `kaleidoscope-3` is reviewed for density/spread interactions that distort perceived size.
- [ ] Changes preserve intended mode identity rather than forcing pixel-identical sizing everywhere.
- [ ] Verify in browser using dev-browser skill.

### US-004: Add desktop and mobile performance guardrails for the audit workflow
**Description:** As a developer, I want performance constraints attached to visual tuning so size normalization work does not create new simulation slowdowns.

**Acceptance Criteria:**
- [ ] Each audited mode has a documented desktop object-count or rendering budget where applicable.
- [ ] Each audited mode has a documented mobile object-count or rendering budget where applicable.
- [ ] Any mode with custom spawn or point-cloud generation uses the repo’s existing reduction/budget path or an equivalent documented mechanism.
- [ ] The audit explicitly calls out modes whose performance profile is already outside acceptable bounds.
- [ ] Verify in browser using dev-browser skill.

### US-005: Create a follow-up PRD pipeline for mode-specific improvements
**Description:** As a product owner, I want the audit to produce implementation-ready follow-up work so improvements can be tackled one by one without re-discovering the same issues.

**Acceptance Criteria:**
- [ ] The audit output includes a prioritized list of follow-up opportunities.
- [ ] Each follow-up item includes the affected modes, the observed problem, and the intended outcome.
- [ ] Follow-up items are grouped into coherent work packages rather than one giant tuning task.
- [ ] At least one follow-up item exists for sizing normalization and one for density/performance where applicable.

## Functional Requirements

- FR-1: The system must support a full review of all home-route simulation modes on desktop and mobile.
- FR-2: The review must capture both visual consistency findings and performance findings.
- FR-3: The review must document each mode’s current dot-size logic, including shared base size usage and mode-specific overrides.
- FR-4: The review must identify a canonical perceived size target that applies across the simulation suite.
- FR-5: The review must define acceptable deviation from the canonical target for stylized modes such as 3D and parallax.
- FR-6: The review must identify which current mode parameters should be normalized, reduced, or preserved.
- FR-7: The review must include performance guardrails for desktop and mobile.
- FR-8: The review must produce a prioritized follow-up backlog suitable for future focused PRDs.
- FR-9: Any resulting implementation from this PRD must preserve readability of hero text and nav on desktop and mobile where central simulation geometry affects layout perception.
- FR-10: The audit must be repeatable so the same modes can be reviewed again after future tuning passes.

## Non-Goals

- This PRD does not implement every mode-specific visual fix immediately.
- This PRD does not redesign the home layout or route chrome.
- This PRD does not replace all per-mode artistic differences with identical sizing.
- This PRD does not commit to changing unrelated motion, color, or interaction behavior unless it directly affects perceived dot size or simulation performance.

## Design Considerations

- The desired outcome is strict shared materiality with slight stylization allowed in 3D and parallax modes.
- “Same size” should be judged by perceived visual weight, not only by raw numeric radius in code.
- Kaleidoscope density and spread influence perceived size and must be evaluated together, not separately.
- Starfield should feel atmospheric and delicate rather than oversized or heavy.
- Mobile must be treated as a first-class visual target, not just a reduced-count fallback.

## Technical Considerations

- Several modes already derive dots from the shared `R_MIN` / `R_MAX` / `R_MED` system, but others multiply or reinterpret those values in mode-specific ways.
- Current known mode-specific size overrides include:
  - `starfield-3d` uses `baseR = R_MED * dotSizeMul * 2`
  - `3d-sphere` uses a fixed `dotSizeMul = 1.5`
  - `3d-cube` uses `cube3dDotSizeMul`
  - `parallax-float` uses a separate projected radius formula plus large point counts
- The audit should explicitly identify where size mismatch is caused by:
  - raw radius multipliers
  - count/density
  - spawn distribution
  - depth scaling
  - mobile fallback differences
- Performance work should prefer reuse of existing budget and reduction helpers rather than creating disconnected mode-specific throttles.

## Success Metrics

- All audited modes have a documented perceived-size assessment on desktop and mobile.
- Obvious outliers are identified with clear technical causes.
- The team can explain why a dot in one mode feels larger or smaller than another mode using documented rules rather than intuition.
- Follow-up PRDs can be created without re-running basic discovery.
- Performance regressions caused by size/density changes are caught during audit, not after release.

## Open Questions

- Should canonical size normalization be driven by one shared token set, or by bounded per-mode multipliers around a shared baseline?
- Should the audit artifact be a standalone markdown report, a structured JSON summary, or both?
- Should future simulation reviews include static screenshots, motion captures, or only written findings?
- Should hero readability checks be formalized for every mode or only for modes that shape around the center?
