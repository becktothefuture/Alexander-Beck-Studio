# PRD: Build Warning And HTML Entry Cleanup

## 1. Introduction/Overview

The production build passes but emits warnings for public CSS links in lab entries and chunk-size warnings for large bundles. This PRD removes avoidable warning noise and classifies lab direct entries so their lighter boot contract is deliberate.

## 2. Goals

- Remove Vite public CSS resolution warnings where practical.
- Preserve runtime CSS loading for all routes.
- Classify lab direct entries as standalone/lab or align their boot shell contract.
- Document accepted chunk-size warnings or create follow-up tasks.

## 3. User Stories

### US-001: Clean lab CSS links
**Description:** As a developer, I want lab HTML entries to avoid misleading build warnings so new warnings are meaningful.

**Acceptance Criteria:**
- [ ] Lab entries no longer produce public CSS "doesn't exist at build time" warnings, or the warning is documented as unavoidable.
- [ ] Built lab routes still load `tokens.css`, `normalize.css`, `main.css`, and required route CSS.
- [ ] `npm run build` passes.

### US-002: Classify lab boot contract
**Description:** As a maintainer, I want lab direct routes classified so their lighter boot structure is intentional.

**Acceptance Criteria:**
- [ ] Docs state whether lab entries are standalone/lab or full shell routes.
- [ ] If full shell routes, they use the same boot overlay/root inert contract as shell entries.
- [ ] If standalone/lab, audits and docs do not imply they share the full shell boot contract.
- [ ] **Verify in browser using dev-browser skill** on at least one lab route.

### US-003: Decide chunk warning policy
**Description:** As a maintainer, I want large chunk warnings triaged so build output stays useful.

**Acceptance Criteria:**
- [ ] Current large chunks are listed with owner/rationale.
- [ ] Intentional large chunks are documented.
- [ ] Unintentional chunk growth gets a follow-up task.

## 4. Functional Requirements

- FR-1: Preserve public route URLs and built asset output.
- FR-2: Do not change simulation runtime behavior.
- FR-3: Keep root `npm run build` canonical.
- FR-4: Avoid suppressing all warnings globally just to hide known warnings.

## 5. Non-Goals

- No major code-splitting refactor unless a warning points to a clear low-risk fix.
- No redesign of lab pages.
- No simulation promotion/removal.

## 6. Design Considerations

Lab pages must continue to use the Studio visual language when visible, even if their boot shell is lighter.

## 7. Technical Considerations

Be careful with `%BASE_URL%` and subpath behavior. Validate both preview and built output.

## 8. Success Metrics

- Build output has less noise.
- New build warnings are easier to spot.
- Lab route boot behavior is explicit in docs.

## 9. Open Questions

- Should lab entries eventually share the full shell boot overlay, or remain deliberately lightweight?
