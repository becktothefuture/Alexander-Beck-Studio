# PRD: Theme Window and Browser-Frame Boundary

## Introduction

Dark and light theme must affect content inside the studio window only. The exposed wall/frame and browser-chrome blend are a separate browser-aware system: Safari and other theme-color-capable browsers use the authored frame palette, while locked-header Chromium and Firefox browsers adapt the exposed band to their native chrome palette.

The current implementation mixes those responsibilities. The inner window is pinned to the stable dark wall base, so light-mode ink becomes unreadable on Home, Portfolio, About Me, Contact, and the route controls. At the same time, the manual site theme is allowed to choose the outer browser/frame palette. This work restores a strict boundary between the themeable window and the browser-aware outer shell.

## Goals

- Make the inner window visibly and legibly switch between authored light and dark surfaces on all four routes.
- Keep manual site-theme changes from recoloring the exposed wall/frame or browser chrome.
- Preserve the established Safari/theme-color versus locked Chromium/Firefox harmony behavior.
- Keep the persistent Button Bar stable, legible, and independent of the inner-window theme.
- Add automated and visual regression coverage for the ownership boundary.
- Record the contract in the project documentation used by future agents.

## User Stories

### US-001: Theme the window interior

**Description:** As a visitor, I want light and dark mode to change the content inside the studio window so every route remains readable in my chosen theme.

**Acceptance Criteria:**
- [x] `--studio-window-bg` and `--frame-inner-surface` resolve to the authored light or dark content background.
- [x] Home, Portfolio, About Me, and Contact show legible theme-appropriate text and controls.
- [x] The inner contrast veil follows the active window surface.
- [x] Verify in a real browser with light/dark screenshots for all four routes.

### US-002: Preserve browser-aware outer harmony

**Description:** As a visitor, I want the exposed frame to blend with my browser chrome without being changed by the site's manual theme toggle.

**Acceptance Criteria:**
- [x] At a fixed browser/OS colour preference, manual site-theme changes leave `--abs-browser-chrome`, `--frame-color`, `--wall-color`, and sampled outer pixels unchanged.
- [x] Safari/theme-color-capable browsers retain the authored frame palette.
- [x] Locked desktop Chromium and Firefox retain their browser-native frame palettes.
- [x] Browser/OS colour-preference changes can update outer harmony without overriding a manual site-theme preference.
- [x] Verify in Chromium and WebKit; verify the Firefox resolver contract when a Firefox runtime is unavailable.

### US-003: Keep the Button Bar in the outer shell

**Description:** As a visitor, I want the persistent Button Bar to remain a stable navigation instrument while route content changes theme.

**Acceptance Criteria:**
- [x] Route-tab and secondary-control surfaces do not inherit inner-window theme ink.
- [x] Home, Portfolio, About Me, and Contact tabs remain legible in both site themes.
- [x] The correct active route remains indicated after SPA navigation and reload.
- [x] Button Bar geometry and responsive layout do not change.
- [x] Verify in desktop and mobile browser captures.

### US-004: Protect the contract with audits and documentation

**Description:** As a future project agent, I need an explicit ownership contract and executable checks so frame and window theme responsibilities are not merged again.

**Acceptance Criteria:**
- [x] Theme, palette-surface, wall-invariance, and outer-frame audits assert the separated contract.
- [x] `docs/reference/THEME-STATE.md`, `docs/reference/CONFIGURATION.md`, and `AGENTS.md` describe the same boundary.
- [x] `npm run check:site` passes.
- [x] Chromium and WebKit theme-consistency audits pass against a production preview.

## Functional Requirements

- FR-1: Manual `light` and `dark` preferences must update only the inner studio-window surface and its content tokens.
- FR-2: `--shell-wall-bg` and `--abs-wall-base` must remain stable outer-shell tokens.
- FR-3: `--studio-window-bg`, `--frame-inner-surface`, and the contrast-veil colour must follow `--bg-light` or `--bg-dark`.
- FR-4: Browser harmony must resolve its active light/dark palette from the browser/OS colour preference, not the manual site preference.
- FR-5: Browser harmony must reapply when the browser/OS preference changes even if the site preference is manually fixed.
- FR-6: `chromeHarmonyMode: auto` must retain the Safari/theme-color and locked-header browser branches.
- FR-7: Button Bar ink and material tokens must be owned by stable outer-shell tokens.
- FR-8: Automated audits must cover the cross-product of browser/OS scheme and manual site theme.

## Non-Goals

- No changes to frame geometry, radii, wall thickness, shadow plates, transition timing, or shell spacing.
- No redesign of route layouts, Portfolio cards, simulation palettes, or media assets.
- No replacement of the existing theme preference model or storage key.
- No attempt to detect arbitrary user-customized browser chrome colours beyond the existing browser-family palette contract.

## Design Considerations

- The boundary is spatial: the site theme begins at the studio-window interior and stops at its edge.
- The outer shell must continue to look continuous with browser chrome, including Safari safe-area and theme-color behavior.
- Route media and palette accents remain authored; only explicit theme-aware assets should swap.
- The Button Bar remains visually stable while route content changes beneath the shared shell.

## Technical Considerations

- Keep authored values in `public/config/design-system.json`; generated configs are not hand-edited.
- Avoid transient frame recoloring during boot by giving browser harmony sole ownership of active outer-frame variables.
- Preserve current browser-family detection and `chromeHarmonyMode` overrides.
- Update audit expectations instead of weakening assertions around the incorrect frozen-window state.
- Existing unrelated worktree changes must be preserved.

## Success Metrics

- Eight route/theme desktop states and eight route/theme mobile states are visually legible in each verified browser.
- Manual site-theme toggles produce no outer-frame variable or sampled-pixel delta at a fixed browser/OS scheme.
- The palette-surface contract no longer fails in light mode.
- All required project and browser gates pass without new warnings attributable to this change.

## Open Questions

None. The approved default is browser-environment-owned outer harmony with a stable outer-shell Button Bar.
