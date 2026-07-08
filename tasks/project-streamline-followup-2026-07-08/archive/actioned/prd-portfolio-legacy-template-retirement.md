# PRD: Portfolio Legacy Template Retirement

## 1. Introduction/Overview

The active portfolio route runs through `SiteApp`, but `PortfolioPage.jsx` and `templates/portfolio-body.html` still exist as a possible future parity surface. The template has older copy/class details and docs still list it as an entry point. This PRD decides whether to retire or explicitly support those surfaces.

## 2. Goals

- Determine whether `PortfolioPage.jsx` and `portfolio-body.html` are active, test-covered, or removable.
- Remove stale portfolio surfaces if unsupported.
- If retained, document them as deliberate parity surfaces and align copy/markup.
- Preserve active portfolio route behavior.

## 3. User Stories

### US-001: Confirm active usage
**Description:** As a maintainer, I want to know whether the legacy portfolio page/template is reachable so we do not maintain dead code by accident.

**Acceptance Criteria:**
- [ ] Search confirms whether `PortfolioPage.jsx` is imported by active routes.
- [ ] Search confirms whether `portfolio-body.html` is consumed by active runtime.
- [ ] Decision is recorded in docs and progress log.

### US-002: Retire unsupported surfaces
**Description:** As a developer, I want unsupported legacy surfaces removed so they cannot drift from active UI.

**Acceptance Criteria:**
- [ ] Unsupported legacy files are deleted or archived according to repo convention.
- [ ] User approval is obtained before deleting or archiving `PortfolioPage.jsx` or `portfolio-body.html`.
- [ ] Docs no longer list deleted surfaces as entry points.
- [ ] Build and lint pass.

### US-003: Align retained parity surfaces
**Description:** As a developer, I want any retained legacy template to match active copy and route-topbar structure.

**Acceptance Criteria:**
- [ ] Retained template uses canonical `About Me` label.
- [ ] Retained template uses current route topbar contract.
- [ ] Retained docs explain why the surface exists.
- [ ] **Verify in browser using dev-browser skill** if the surface is reachable.

## 4. Functional Requirements

- FR-1: Do not change active `PortfolioRoute.jsx` behavior unless required to remove dead code.
- FR-2: Preserve `bootstrapPortfolio` and active portfolio runtime.
- FR-3: Preserve portfolio drawer stacking and `#portfolio-sheet-host`.
- FR-4: Do not delete or archive legacy portfolio surfaces without explicit user approval.

## 5. Non-Goals

- No portfolio deck redesign.
- No project content changes.
- No drawer animation changes.

## 6. Design Considerations

Any retained template must match the active route-topbar and portfolio drawer contracts.

## 7. Technical Considerations

If files are deleted, check import graph and Vite build. If retained, add validation or docs to prevent copy drift.

## 8. Success Metrics

- No stale portfolio entry point remains ambiguous.
- Active portfolio audits still pass.

## 9. Open Questions

- Should unsupported templates be deleted outright, or moved to an archive folder for historical reference?
