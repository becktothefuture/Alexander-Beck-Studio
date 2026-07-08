# PRD: Boot Shell Entry Consolidation

## 1. Introduction/Overview

Reduce duplicated HTML and entry boot surfaces across `index.html`, `portfolio.html`, and `cv.html`. These pages repeat large boot overlay, head, style, and root setup blocks while only varying metadata, body class, and entry script.

## 2. Goals

- Reduce first-paint boot shell duplication.
- Prefer hand-authored shared snippets or a deterministic source template before considering generated committed HTML.
- Preserve the current boot overlay and first-paint behavior.
- Keep Vite multi-entry output and GitHub Pages deployment intact.
- Avoid accidental changes to visual boot timing, route readiness, or font/theme behavior.

## 3. User Stories

### US-001: Identify safe template boundaries
**Description:** As a developer, I want to know which HTML sections are truly shared so consolidation does not change first paint.

**Acceptance Criteria:**
- [ ] Compare `index.html`, `portfolio.html`, `cv.html`, `styleguide.html`, and `palette-lab.html`.
- [ ] Mark shared head/boot/style sections versus route-specific fields.
- [ ] Document compatibility-sensitive sections that must not change.

### US-002: Consolidate repeated boot shell source
**Description:** As a maintainer, I want repeated boot shell markup generated or sourced from one place so future fixes do not need multiple manual edits.

**Acceptance Criteria:**
- [ ] Shared boot/head/root blocks are generated from one template or maintained through a clear source file.
- [ ] Route-specific title, body class, metadata, and entry script remain configurable.
- [ ] Built HTML output preserves required public route files.
- [ ] `npm run check:site` passes.
- [ ] Verify in browser using dev-browser skill on direct loads for home, portfolio, CV, styleguide, and palette lab.

### US-003: Preserve boot overlay QA
**Description:** As a visitor, I want direct page loads to keep the same boot quality and no route flashes.

**Acceptance Criteria:**
- [ ] `npm run audit:boot-overlay` passes.
- [ ] `npm run certify:screens` passes.
- [ ] No root visibility, theme, or loader regressions are visible in browser.

## 4. Functional Requirements

- FR-1: Consolidation must preserve all public HTML route outputs.
- FR-2: Consolidation must preserve early theme/chrome script behavior.
- FR-3: Consolidation must preserve boot overlay minimum timing and release behavior.
- FR-4: Consolidation must not change lab standalone boot shape unless explicitly approved.

## 5. Non-Goals

- No move away from Vite.
- No deployment target change.
- No redesign of boot overlay visuals.
- No route transition refactor.

## 6. Design Considerations

- Boot overlay remains first-paint infrastructure.
- Loader should remain visually distinct from loaded simulations.
- Direct load and SPA transitions remain separate systems.

## 7. Technical Considerations

- Consider a small build-time template generator if Vite HTML templating is not enough.
- Keep generated outputs deterministic.
- Ensure `.nojekyll` and public assets still copy to dist.

## 8. Success Metrics

- A boot/head fix only needs one source edit.
- Direct-load audits still pass.
- Diff shows no unintended route content or visual changes.

## 9. Decisions

- Default approach is to start with shared snippets or a deterministic template source; do not introduce committed generated HTML without a follow-up decision.

## 10. Boundary Review Decision

Status: not-actioned

Decision date: 2026-07-08

The five full shell HTML entries are duplicated enough to justify a future consolidation, but implementation is deferred from this PRD wave because recent boot-overlay fixes touched all entries and raw source strings are audited by `scripts/audit-boot-overlay.mjs`.

Recommended follow-up shape:

- deterministic `html-entry-template` + route manifest + no-write check;
- preserve physical HTML files for Vite dev/build and GitHub Pages;
- manifest fields for title, body class, entry script, early root class, and extra stylesheets;
- update `audit:boot-overlay` to validate the generated/source contract.

Do not use a Vite-only injected snippet as the first consolidation, because current audits inspect raw HTML source and would not protect the shared source.
