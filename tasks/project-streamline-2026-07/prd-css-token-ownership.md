# PRD: CSS Token Ownership

## 1. Introduction/Overview

Tighten CSS ownership and token discipline across shared shell, portfolio, CV/About, cursor, and styleguide surfaces. Current visual alignment is mostly strong, but some portfolio drawer rules are split between `main.css` and `portfolio.css`, several raw literals are not classified, and unused default Vite CSS remains in `src/index.css`.

## 2. Goals

- Clarify which CSS file owns shared shell primitives versus route-specific visuals.
- Move or document portfolio-specific rules currently living in shared CSS.
- Classify raw literals as fixed contract tokens or accidental bypasses.
- Remove or quarantine unused default Vite CSS.

## 3. User Stories

### US-001: Map CSS ownership
**Description:** As a developer, I want CSS ownership documented so visual fixes land in the right file.

**Acceptance Criteria:**
- [ ] Shared shell primitives are listed with their owning CSS file.
- [ ] Portfolio deck/drawer rules are listed with their owning CSS file.
- [ ] CV/About route styling ownership is documented.
- [ ] Styleguide references the same ownership model.

### US-002: Consolidate portfolio-specific CSS
**Description:** As a maintainer, I want portfolio drawer styling to live in the route CSS where practical so future drawer changes are scoped.

**Acceptance Criteria:**
- [ ] Portfolio-only drawer/title/text-wrap rules in `main.css` are moved to `portfolio.css` where safe.
- [ ] Shared rules remain in `main.css` only when used by multiple routes or shell layers.
- [ ] `npm run check:site` passes.
- [ ] Verify in browser using dev-browser skill on portfolio deck and opened drawer.

### US-003: Classify raw literals and fixed contracts
**Description:** As a designer-developer, I want raw sizes/colors to be named when they are contracts and removed when they are accidental.

**Acceptance Criteria:**
- [ ] Raw cursor ring dimensions and colors are either tokenized or documented as fixed cursor contract values.
- [ ] Portfolio drawer colors/backdrops are tokenized where appropriate.
- [ ] Fixed values remain stable where docs require exact behavior.
- [ ] No new `!important` is introduced.

### US-004: Remove unused default Vite CSS
**Description:** As a maintainer, I want unused default CSS removed or quarantined so it cannot accidentally override the site design system.

**Acceptance Criteria:**
- [ ] Confirm `react-app/app/src/index.css` is not imported.
- [ ] Remove the file or replace it with a comment explaining it is intentionally unused.
- [ ] Build and lint pass.

## 4. Functional Requirements

- FR-1: Shared shell CSS must not own portfolio-only visual rules unless explicitly documented.
- FR-2: Route CSS must not redefine global wall/frame language.
- FR-3: Tokenized values must use existing token naming where possible.
- FR-4: UI changes must preserve accessibility, responsive behavior, and existing design language.

## 5. Non-Goals

- No new visual theme.
- No homepage wall/frame color changes.
- No portfolio drawer redesign.
- No simulation renderer color changes.

## 6. Design Considerations

- Preserve wall/frame separation.
- Preserve custom cursor contracts.
- Preserve portfolio drawer stacking above header/footer.
- Do not add decorative visual systems.

## 7. Technical Considerations

- Some raw literals are valid fixed contracts; do not token-churn without purpose.
- Use screenshots/computed styles for subtle visual comparisons.
- Check both light/dark and desktop/mobile surfaces.

## 8. Success Metrics

- Future route-specific visual changes have a clear owner.
- Raw literals are fewer or explicitly justified.
- No visual regressions in home, portfolio, CV, or styleguide screenshots.

## 9. Decisions

- Keep CV/About styling in its current shared-CSS ownership unless the implementation proves that route-local rules are required to prevent leakage or clarify ownership.
