# PRD 05: About Page Archive And Coming Soon

## 1. Overview

Remove the About/CV gate and archive the existing About content. The visible About route should be intentionally empty for now with a centered "Coming soon" message.

## 2. Goals

- About is not gated.
- Existing About/CV content is archived before removal from the route.
- About route shows centered coming soon content.
- Bottom About tab is active on the route.

## 3. User Stories

### US-001: About Without Gate

As a visitor, I can open About without entering a code.

Acceptance criteria:

- [ ] About route is not gated.
- [ ] No CV/About gate inputs are shown.
- [ ] The old CV/About modal implementation is removed after route compatibility is in place.
- [ ] About tab is active.
- [ ] Bottom tabs remain visible.
- [ ] Verify in browser using dev-browser skill.

### US-002: Archived Content

As the site owner, old About content is not lost.

Acceptance criteria:

- [ ] Existing About/CV content is saved in an archive path.
- [ ] Archive path is documented.
- [ ] Runtime route no longer renders the old content.
- [ ] Verify in browser using dev-browser skill.

## 4. Functional Requirements

- FR-1: Remove `cv` from visible gate flows.
- FR-2: Archive `contents-cv.json` or the equivalent route content before replacing it, using `react-app/app/src/content/archive/contents-cv-about-2026-07.json` unless implementation finds a stronger existing archive convention.
- FR-3: Add minimal About route content.
- FR-4: Preserve compatibility for old `/cv.html` by making it the same page as `/about.html` via redirect or alias.
- FR-5: Remove topbar assumptions that About is a gated modal action.
- FR-6: Remove old CV/About modal bootstrap/presentation once archive and route compatibility are verified.
- FR-7: About route content must be a centered `Coming soon` state inside the window.
- FR-8: `/about.html`, `/about`, `/cv.html`, and `/cv` must not open or request a gate.
- FR-9: Remove `cv` invite-code UI from normal route and tab flows.
- FR-10: Remove CV/About modal reachability from `StudioShell.jsx`, `legacy/main.js`, `shared-chrome.js`, `DailyFocusShellBridge.jsx`, route templates, haptics selectors, CSS selectors, and stale storage flags after route compatibility is verified.

## 5. Non-Goals

- No new About design.
- No rewrite of archived content.

## 6. Technical Considerations

- Direct `/cv.html` behavior is the main migration risk.
- Dev tools or legacy shortcuts may still reference `abs_open_cv_*` flags.
- Avoid deleting legacy code until audits prove the visible path no longer depends on it.
- Current route content imports `virtual:abs-content/cv`; archiving must avoid keeping old content in the runtime content module.
- Removal checklist must include `#cv-modal`, `#cv-modal-label`, `#cv-modal-inputs`, `abs_open_cv_gate`, `abs_open_cv_modal`, CV gate invite-code UI, and any About/CV modal haptics or shared-chrome bindings.

## 7. Validation

```bash
npm run check:site
npm run build
npm run certify:screens
```

Browser checks:

- Direct About load.
- Home to About.
- Back/forward.
- No CV gate modal on normal navigation.

## 8. Success Metrics

- About route has no gate UI or gate storage side effects.
- `/about.html` and `/cv.html` show the same centered coming-soon state.
- Archived About/CV content exists in the documented archive path and no longer drives runtime route content.

## 9. Open Questions

- None. Recommended default: archive under `react-app/app/src/content/archive/` so the content is versioned but no longer public runtime config.
