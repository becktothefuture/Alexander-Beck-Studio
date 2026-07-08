# PRD: Direct Boot Readiness Ownership

## 1. Introduction/Overview

Direct route boot readiness currently has more than one owner. `SiteApp` can mark non-home shell routes ready, while route bootstraps can also complete direct boot after route geometry is ready. This PRD consolidates readiness ownership after route source validation is stronger.

## 2. Goals

- Make direct route readiness ownership explicit and singular.
- Preserve current direct-load behavior for home, portfolio, CV, styleguide, palette-lab, simulations, and lab routes.
- Keep boot overlay audits green.
- Avoid changing route metadata at the same time as readiness behavior.

## 3. User Stories

### US-001: Identify readiness owners
**Description:** As a developer, I want every direct boot readiness path listed so I can safely remove duplication.

**Acceptance Criteria:**
- [ ] `SiteApp` readiness behavior is documented.
- [ ] Route bootstrap readiness behavior is documented.
- [ ] Lab/standalone route readiness behavior is classified.

### US-002: Consolidate shell route readiness
**Description:** As a user, I want direct shell routes to reveal only after the route has reached its ready state.

**Acceptance Criteria:**
- [ ] One code path owns final `data-abs-boot-state="ready"` for non-home shell routes.
- [ ] Route bootstraps and `SiteApp` do not compete to mark final readiness.
- [ ] `absBootHold=1` audit behavior remains supported.
- [ ] **Verify in browser using dev-browser skill** across direct route loads.

### US-003: Preserve lab route classification
**Description:** As a maintainer, I want lab entries either classified as standalone or aligned with the shell boot contract.

**Acceptance Criteria:**
- [ ] Lab direct route boot behavior is intentionally documented.
- [ ] If lab routes are changed, at least one route-backed Daily lab route is browser verified.
- [ ] Boot overlay audit still passes for shell routes.

## 4. Functional Requirements

- FR-1: Do not change route registry metadata in this PRD except docs/comments needed for readiness.
- FR-2: Preserve public route URLs.
- FR-3: Preserve access gates and modal behavior.
- FR-4: Preserve `#app-frame`, `#abs-scene`, and `#c` compatibility surfaces.

## 5. Non-Goals

- No route manifest or route descriptor implementation.
- No Vite input refactor.
- No visual redesign.
- No simulation runtime refactor.

## 6. Design Considerations

Direct boot reveal must preserve material presence: controls should not feel absent or rebuilt after the page becomes usable.

## 7. Technical Considerations

This is transition-sensitive. Run normal and strict transition audits if readiness timing changes.

## 8. Success Metrics

- Boot ownership can be explained from one documented path.
- `audit:boot-overlay` passes across all covered route states.
- Screenshot certification remains green.

## 9. Open Questions

- Should lab direct routes remain outside the full boot overlay contract, or should they be promoted to full shell boot behavior?
