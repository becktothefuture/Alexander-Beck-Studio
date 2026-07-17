# PRD: Fixed Dark Outer Shell and Themeable Studio Window

## Status

Implemented on 2026-07-17 and refined the same day to use one opaque true-black (`#000000`) frame endpoint everywhere. Automated Chromium, Firefox, and WebKit coverage plus production-preview visual QA is complete. Physical iOS/iPadOS and Android browser-toolbar validation remains a release-device check because Playwright can validate the viewport, DOM, pixels, and metadata but not native application chrome.

## Introduction

Restore the studio shell to a fixed-dark physical object. Manual light/dark theme changes must affect only the studio-window interior and the content rendered inside it. The exposed page band, wall/frame, preloader, persistent Button Bar, sound control, and theme control must remain on one dark outer-shell material in every site theme.

Browser harmony becomes dark-only:

- A light browser/OS scheme must never select a light website frame or wall.
- Browser family, browser scheme, and display gamut must not alter the true-black frame.
- Theme-color-capable mobile browsers should receive the dark outer-shell colour so their browser UI can blend with the site where the platform permits it.
- The site must still render a dark page/background fallback because browser UI colouring is a hint, not a guarantee.

The current theme preference model (`auto | light | dark`) remains. `auto` continues to choose the studio-window theme from `prefers-color-scheme`; it no longer authorizes a light outer shell.

## Decision Summary

### Surface ownership

| Surface | Owner | Required behaviour |
| --- | --- | --- |
| Browser/page background and exposed band | Dark outer-shell policy | Always opaque true black (`#000000`). |
| Physical wall/frame | Dark outer-shell policy | Always dark; never consumes the resolved site theme. |
| Preloader and long-wait copy | Dark outer-shell policy | Always rendered on the dark outer surface with light loader/copy ink. |
| Studio-window interior | Resolved site theme | Uses authored light/dark window backgrounds, text, finish, veil, simulations, gates, drawers, and overlays. |
| Primary Button Bar navigation | Dark outer-shell policy | Dark material and outer-shell ink in every site theme. Route accents and selection still change. |
| Sound/theme/reset controls | Dark outer-shell policy | Dark material and outer-shell ink in every site theme. State icon, label, and thumb position may change without recolouring the control family. |
| Root browser/UA colour scheme | Dark outer-shell policy | Remains dark so browser-facing UI does not follow the manual window theme. |
| Native controls inside the studio window | Resolved site theme | Receive a local light/dark `color-scheme` at the window boundary. |

### Browser and theme matrix

“Authored black” means the canonical opaque outer-frame value `#000000`. The separate wall base remains `#141414`; browser-specific frame approximations are retired. RGB zero is the correct true-black request in both sRGB and Display P3.

| Browser environment | Site theme: Light | Site theme: Dark | Browser UI projection |
| --- | --- | --- | --- |
| Desktop Chromium, either browser scheme | Black outer shell + light window | Black outer shell + dark window | Actual desktop browser chrome is outside site control; the website remains black. |
| Desktop Firefox, either browser scheme | Black outer shell + light window | Black outer shell + dark window | Actual desktop browser chrome is outside site control; the website remains black. |
| iOS/iPadOS WebKit, either scheme | Black outer shell + resolved window | Black outer shell + resolved window | Project black through `theme-color`, the manifest, and `html/body` backgrounds; verify on a real device. |
| Android Chromium, either scheme | Black outer shell + resolved window | Black outer shell + resolved window | Project black through `theme-color`; verify on a real device. |
| Unknown/unsupported browser | Black outer shell + resolved window | Black outer shell + resolved window | Safe black fallback; no browser-specific branch. |

## Evidence and Change History

The requested direction is consistent with the repository's earlier theme boundary and reverses two July 15 changes.

- `0142bbd3` (March 15), “restore fixed frame and themed inner wall,” established the fixed-frame concept.
- `790be102` (July 11), “Preserve wall color across themes,” made the wall base invariant across site themes.
- `81517b4d` and `f7472890` (July 12) formalized the studio-window-only theme boundary in `THEME-STATE.md` and `tasks/prd-theme-window-frame-boundary.md`.
- `2c92c6ad` (July 15) changed `resolveShellPalette()` back to selecting `wallBaseLight` or `wallBaseDark`, making `--abs-wall-base` and `--shell-wall-bg` theme-aware.
- `ac46f16f` (July 15) changed `resolveBrowserChromeIsDark()` from `prefers-color-scheme` to `isDarkThemeDocument()`, making the exposed frame and primary Button Bar follow the rendered site theme. It also changed the documented and audited contract to accept that behaviour.

Implementation evidence captured before the reversal:

- The inline boot script in every production HTML entry selects light/dark wall and frame values from the resolved site theme before React mounts.
- `site-shell.js` selected `wallBaseLight` or `wallBaseDark` using the rendered site theme.
- `chrome-harmony.js` selected a light or dark browser-family frame endpoint using the rendered site theme.
- `dark-mode-v2.js` reapplied shell, chrome harmony, and `theme-color` on each site-theme change.
- `shell-button-bar-dominant.css` derived the sound/theme controls from `--studio-window-bg` and `--text-primary`, so those controls recoloured with the window.
- `main.css` contained a `data-abs-light-browser-chrome` branch specifically for the light outer frame.
- The palette, wall, outer-frame, theme-consistency, and boot audits encoded light outer-shell states as expected behaviour.
- The current worktree has in-progress preloader changes in the production HTML entries and `scripts/audit-boot-overlay.mjs`; implementation must patch those changes in place and must not reset or overwrite them.

## Goals

- Restore a strong, dark physical frame around both light and dark window interiors.
- Make manual theme changes stop exactly at the studio-window boundary.
- Keep every Button Bar control on a stable dark material while preserving state and accessibility.
- Make the first paint and full preloader dark regardless of stored or automatic site theme.
- Preserve correct light/dark content reveal without a flash of the wrong window theme.
- Use a single outer-shell resolver and canonical authored values, with generated compatibility aliases only where required.
- Remove obsolete light-outer-shell branches, attributes, controls, save paths, and test expectations.
- Protect the contract across direct loads, SPA navigation, reloads, cross-tab theme changes, browser scheme changes, mobile safe areas, and reduced motion.

## User Stories

### US-001: Keep the physical shell dark

**Description:** As a visitor, I want the website to retain a dark physical frame so the studio window has strong contrast in either content theme.

**Acceptance Criteria:**

- [x] Manual light/dark changes leave `--abs-browser-chrome`, `--frame-color`, `--wall-color`, `--abs-wall-base`, and `--shell-wall-bg` unchanged at a fixed browser scheme.
- [x] The outer band and sampled frame/wall pixels never resolve to a light palette.
- [x] Frame geometry, radii, wall inset, safe-area coverage, shadows, and transition behaviour are unchanged.
- [x] Home, Portfolio, About Me, and Contact preserve the same outer shell during SPA transitions and direct loads.
- [x] Verify in a production browser preview.

### US-002: Theme only the studio-window interior

**Description:** As a visitor, I want light/dark mode to change the content surface while the surrounding instrument stays physically stable.

**Acceptance Criteria:**

- [x] `--studio-window-bg`, `--frame-inner-surface`, text tokens, contrast veil, route scenes, gates, drawers, and in-window overlays follow the resolved site theme.
- [x] The light window remains legible against the dark frame on all four production routes.
- [x] The dark window retains sufficient edge separation from the dark frame.
- [x] `auto`, explicit light, and explicit dark preferences retain existing storage, reload, SPA, and cross-tab behaviour.
- [x] Native form/control rendering inside the window receives the resolved local `color-scheme` without changing the root outer-shell scheme.
- [x] Verify in a production browser preview.

### US-003: Keep the Button Bar dark

**Description:** As a visitor, I want navigation, sound, and theme controls to read as part of the persistent dark shell.

**Acceptance Criteria:**

- [x] Route tabs, sound toggle, theme switch, theme thumb, and compact mobile theme reset use only outer-shell material and ink tokens.
- [x] No production Button Bar token depends on `--studio-window-bg`, `--text-primary`, or `--text-muted`.
- [x] Switching the site theme may change the theme icon/thumb position and accessible label, but not computed background, border, foreground, focus outline, or pressed material colours.
- [x] All route labels, icons, active accents, hover states, pressed states, and focus-visible states remain legible.
- [x] Button Bar geometry and responsive layout remain unchanged at 320–1440px coverage points.
- [x] Verify in a production browser preview.

### US-004: Use a dark-first preloader

**Description:** As a visitor, I want the loading experience to belong to the dark outer shell even when my destination window is light.

**Acceptance Criteria:**

- [x] The critical first-paint cover, overlay, spinner, and long-wait copy always render on the canonical dark outer background.
- [x] Loader and message ink always use the dark-surface palette; the light-loader branch is removed.
- [x] The early script still resolves the stored/automatic site theme before reveal so a light preference reveals a light window immediately after the dark preloader.
- [x] `theme-color`, manifest colour, `html`, and `body` use dark first-paint fallbacks.
- [x] Reduced motion preserves the dark surface, removes nonessential animation, and retains status semantics.
- [x] Every production HTML entry remains byte-aligned through the entry-shell sync contract.
- [x] Verify in a production browser preview.

### US-005: Apply dark-only browser harmony

**Description:** As a visitor, I want the exposed website band to blend with dark browser chrome when possible without becoming light when the browser is light.

**Acceptance Criteria:**

- [x] Every browser scheme and family selects the same opaque black frame.
- [x] Chromium and Firefox approximation branches are removed.
- [x] iOS/iPadOS receives the authored dark `theme-color` and dark document background in both browser schemes.
- [x] Android Chromium receives a dark `theme-color` in both browser schemes.
- [x] Unsupported browsers fall back to the authored dark frame.
- [x] The site does not claim to recolour desktop application chrome that ignores `theme-color`.
- [ ] Automated checks validate DOM/meta/pixel state; real iOS and Android devices validate actual browser bars.

### US-006: Remove overhang and duplicate policy

**Description:** As a maintainer, I want one explicit ownership path so later changes cannot accidentally reconnect the shell to the window theme.

**Acceptance Criteria:**

- [x] One pure outer-shell policy resolver returns the active dark frame from browser family and browser scheme.
- [x] `site-shell.js` owns shell/window token projection; `chrome-harmony.js` delegates policy instead of owning a second theme model.
- [x] The first-paint mirror is generated or synchronised from canonical dark values rather than independently hand-maintained across HTML files.
- [x] Authored config uses stable outer-wall/frame fields rather than light/dark pairs that imply theme ownership.
- [x] Legacy light/dark outer keys are migrated once, pruned from save output, and absent from the canonical saved config.
- [x] `data-abs-light-browser-chrome` and its CSS/test branches are removed.
- [x] Runtime controls no longer offer a production policy that can turn the outer shell light.
- [x] Generated configs, live apply, canonical save, reload, flattening, and preview agree.

## Functional Requirements

- FR-1: Manual site theme must not be an input to outer-shell colour resolution.
- FR-2: Browser/OS light mode must never produce a light outer-shell colour.
- FR-3: Browser/OS mode, browser family, and display gamut must not alter the true-black outer frame.
- FR-4: The window theme must continue to resolve from `theme-preference-v3` and `prefers-color-scheme` exactly as it does today.
- FR-5: The root/document `color-scheme` must remain dark; the studio window must establish its own resolved `color-scheme` boundary.
- FR-6: Theme-color projection must follow the active dark outer frame, not the window theme.
- FR-7: The boot overlay must not inspect the resolved window theme to choose its own material or ink.
- FR-8: The early boot script must still resolve and project window theme attributes/classes before application reveal.
- FR-9: Primary and secondary Button Bar materials must use outer-shell tokens only.
- FR-10: The canonical design config must contain one stable wall value and one true-black frame value; browser-family approximations must not exist.
- FR-11: Compatibility aliases, if temporarily required by active simulation code, must be generated from the stable value and must not be independently editable or saved.
- FR-12: Changes must preserve current frame geometry, route transitions, Portfolio layering/handoff, cursor boundaries, safe-area handling, accessibility, and reduced-motion behaviour.

## Implementation Plan

### Phase 1: Establish the canonical contract and migration

1. Add a single stable outer wall field and a single authored outer frame field to `public/config/design-system.json`.
2. Migrate the current approved dark values; do not copy the current light endpoints into the new contract.
3. Update `design-config.js` to normalize old `wallBaseLight/Dark` and `siteFrameLight/Dark` inputs into the stable fields once, then prune the old authored keys.
4. Update `design-system-save.js`, core state, and control registry so live apply/save/reload cannot recreate light outer endpoints.
5. Replace the two wall controls with one Outer Wall control and the two frame controls with one Authored Frame control. Retire or constrain `chromeHarmonyMode` so production cannot select a light policy.
6. Flatten the canonical config and inspect generated outputs; do not hand-edit generated JSON.

Primary files:

- `react-app/app/public/config/design-system.json`
- `react-app/app/src/legacy/modules/utils/design-config.js`
- `react-app/app/src/legacy/modules/utils/design-system-save.js`
- `react-app/app/src/legacy/modules/core/state.js`
- `react-app/app/src/legacy/modules/ui/control-registry.js`
- `scripts/lib/flatten-design-config.mjs`

### Phase 2: Centralize dark-only outer-shell resolution

1. Keep a small pure policy module that returns the single authored black endpoint without consulting browser family, browser/OS scheme, or site theme.
2. Make `chrome-harmony.js` call that resolver; remove `isDarkThemeDocument()` from outer-shell decisions.
3. Make `site-shell.js` project stable wall tokens and resolved dark frame tokens separately from `applyWindowPalette()`.
4. Remove light-outer attributes and branches, including `data-abs-light-browser-chrome`.
5. Ensure `dark-mode-v2.js` can reapply browser harmony when the browser scheme changes without passing the site theme into it.
6. Keep all active outer aliases (`--abs-browser-chrome`, `--frame-color`, `--wall-color`, `--chrome-bg`, `--shell-wall-bg`, `--abs-wall-base`) dark and internally consistent.

Primary files:

- `react-app/app/src/legacy/modules/visual/chrome-harmony.js`
- `react-app/app/src/legacy/modules/visual/site-shell.js`
- `react-app/app/src/legacy/modules/visual/dark-mode-v2.js`
- `react-app/app/src/legacy/modules/visual/wall-frame.js`
- `react-app/app/src/legacy/modules/physics/wall-state.js`
- `react-app/app/src/legacy/modules/rendering/canvas-logo.js`

### Phase 3: Enforce the CSS cascade boundary

1. Make dark outer-shell tokens the root defaults in `tokens.css`; retain light/dark tokens only for the studio window and its content.
2. Keep `data-abs-theme`/`dark-mode` selectors for window-owned content, but remove any outer-shell or Button Bar declarations from those selectors.
3. Stop `applyThemeState()` from setting root `color-scheme` to the window theme. Set the document/root scheme to dark and set a local scheme on `#simulations` or a dedicated studio-window host.
4. Retarget all Button Bar material/ink variables to stable outer tokens. Remove the direct `--studio-window-bg` and `--text-primary` dependencies in the dominant material.
5. Remove the light-browser-chrome Button Bar override and any dark-mode-specific utility-control correction that is now redundant.
6. Search every outer token consumer and classify it explicitly as outer-owned, window-owned, compatibility-only, or lab-only; fix accidental cross-boundary fallbacks.

Primary files:

- `react-app/app/public/css/tokens.css`
- `react-app/app/public/css/main.css`
- `react-app/app/src/components/app/shell-button-bar-dominant.css`
- `react-app/app/src/lib/theme-state.js`
- `react-app/app/src/styles/base.css`

### Phase 4: Make boot and mobile browser projection dark-first

1. Patch the current in-progress preloader implementation in `index.html`; do not replace or roll it back.
2. Use one unconditional dark loader/message palette and one dark overlay/document background.
3. Keep early preference resolution only for the destination window theme and accessibility state.
4. Add an early unqualified dark `theme-color` fallback, keep the manifest dark, and keep `html/body` dark so iOS can use either declared colour or page sampling.
5. Update the entry-shell sync tooling so the critical style, boot policy, overlay, and metadata remain identical across all production entries.
6. Update `scripts/audit-boot-overlay.mjs` to assert dark boot output under light/dark browser schemes, explicit light/dark site preferences, reduced motion, and delayed loading.

Primary files:

- `react-app/app/index.html`
- `react-app/app/portfolio.html`
- `react-app/app/about.html`
- `react-app/app/contact.html`
- `react-app/app/styleguide.html`
- `react-app/app/palette-lab.html`
- `react-app/app/public/images/site.webmanifest`
- `scripts/sync-production-entry-shell.mjs`
- `scripts/audit-boot-overlay.mjs`

### Phase 5: Rewrite regression coverage around the new state matrix

1. Change wall-invariance checks so manual site-theme toggles require exact invariance for every outer variable, Button Bar computed colour, and sampled outer pixel.
2. Require exact true-black outer-frame equality in every browser/site-theme matrix cell, with a luminance guard that rejects any non-black result.
3. Change theme-consistency checks so window state follows site preference while frame state follows the dark-only browser policy.
4. Change palette-surface checks so palette or site-theme changes cannot modify the stable wall/frame.
5. Add explicit Button Bar assertions for route tabs, sound, theme track, theme thumb, mobile reset, hover, pressed, and focus-visible states.
6. Keep Firefox as a real Playwright engine in the outer-frame audit where available.
7. Add real-device manual checks for current iOS Safari and Android Chrome because desktop/emulated Playwright cannot certify actual browser-toolbar colouring.

Primary files:

- `scripts/audit-theme-wall-invariance.mjs`
- `scripts/audit-outer-wall-frame.mjs`
- `scripts/audit-theme-consistency.mjs`
- `scripts/audit-palette-surface-contract.mjs`
- `scripts/certify-screens.mjs`

### Phase 6: Align documentation and remove superseded wording

1. Update the locked contract in `DESIGN.md` and `AGENTS.md` to say the outer shell is fixed dark, not independently light/dark browser-aware.
2. Rewrite `THEME-STATE.md` and `CONFIGURATION.md` so their ownership tables match runtime and tests.
3. Mark `tasks/prd-theme-window-frame-boundary.md` as superseded by this PRD; preserve it as historical evidence rather than silently rewriting completed history.
4. Search documentation for “theme-aligned frame,” “browser/OS light scheme makes the frame light,” and “secondary controls derive from the window” and remove stale claims.

Primary files:

- `DESIGN.md`
- `AGENTS.md`
- `docs/reference/THEME-STATE.md`
- `docs/reference/CONFIGURATION.md`
- `docs/reference/SITE-STYLEGUIDE.md`
- `tasks/prd-theme-window-frame-boundary.md`

## Verification Plan

### Static and build gates

```bash
npm run check:site
```

Review the final diff after flattening and confirm that only canonical config is hand-edited.

### Runtime audits against production preview

```bash
npm run build
npm run preview

ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=chromium npm run audit:boot-overlay
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=webkit npm run audit:boot-overlay

ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=chromium npm run audit:theme-consistency
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=webkit npm run audit:theme-consistency

ABS_THEME_WALL_AUDIT_URL=http://127.0.0.1:8013 ABS_BROWSER=chromium npm run audit:theme-wall-invariance
ABS_THEME_WALL_AUDIT_URL=http://127.0.0.1:8013 ABS_BROWSER=webkit npm run audit:theme-wall-invariance

ABS_OUTER_WALL_AUDIT_URL=http://127.0.0.1:8013/index.html ABS_BROWSER=chromium npm run audit:outer-wall-frame
ABS_OUTER_WALL_AUDIT_URL=http://127.0.0.1:8013/index.html ABS_BROWSER=firefox npm run audit:outer-wall-frame
ABS_OUTER_WALL_AUDIT_URL=http://127.0.0.1:8013/index.html ABS_BROWSER=webkit npm run audit:outer-wall-frame

ABS_PALETTE_AUDIT_URL=http://127.0.0.1:8013 npm run audit:palette-surface-contract
npm run certify:screens
```

Run the preview server separately from the audits. Do not claim browser-toolbar parity from Playwright screenshots; they contain the page viewport, not the full native browser UI.

### Visual matrix

Capture and inspect Home, Portfolio, About Me, and Contact at desktop and mobile sizes for:

- explicit site light + browser light;
- explicit site dark + browser light;
- explicit site light + browser dark;
- explicit site dark + browser dark;
- Auto before and after a browser-scheme change;
- direct load and SPA navigation;
- preloader held, exiting, and revealed;
- reduced motion;
- Button Bar idle, active route, hover, pressed, focus-visible, sound on/off, and theme light/dark states.

Required engines: Chromium and WebKit for the full route matrix; Firefox for outer-frame/Button Bar checks. Required physical checks: current iPhone/iPad Safari and current Android Chrome in both device appearances.

## Non-Goals

- No changes to frame geometry, radii, inset, safe-area spacing, shadow plates, or route-transition choreography.
- No redesign of the Button Bar layout, icons, active route accents, or interaction model.
- No changes to the theme storage key or `auto | light | dark` preference semantics for window content.
- No changes to route layouts, Portfolio handoff/layering, simulations, media, or copy.
- No attempt to read custom desktop browser themes or extension-provided chrome colours.
- No promise that desktop browser application chrome can be recoloured when the browser ignores `theme-color`.
- No hand-editing of generated runtime config files or build outputs.

## Risks and Mitigations

- **First-paint/runtime drift:** The inline boot mirror and runtime could disagree. Generate/synchronise the boot payload from canonical values and test before and after module load.
- **Cascade leakage:** Root theme selectors can still affect shell descendants. Add computed-style invariance assertions for every Button Bar control and outer surface.
- **Root `color-scheme` side effects:** Moving the window scheme locally may expose native-control differences. Audit every native input/select/control inside gates, drawers, labs, and routes.
- **iOS browser changes:** `theme-color` behaviour can vary by Safari version. Keep the document background dark, use the meta/manifest hints, and require physical-device verification.
- **Dark-window edge loss:** A stable dark frame can merge with the dark window. Preserve distinct authored dark values and inspect the inner gradient/vignette; do not change geometry to solve contrast.
- **Config migration regression:** Old saved values could recreate light shell keys. Normalize once, prune on save, flatten, reload, and assert canonical absence.
- **Dirty worktree overlap:** HTML/preloader files and `DESIGN.md` already contain user changes. Patch surgically and review diffs against both `HEAD` and the pre-existing working tree.

## Success Metrics

- Manual site-theme toggles produce zero outer-variable delta, zero Button Bar material-colour delta, and no sampled outer-pixel change at a fixed browser scheme.
- No tested state resolves a light outer-shell luminance.
- The studio-window background, text, and veil switch correctly in every route/theme state.
- The preloader is dark in every stored theme and browser scheme, then reveals the correct window theme without an incorrect intermediate frame.
- All four route tabs and all secondary controls meet contrast requirements in both window themes.
- Canonical save, reload, flattening, production preview, and all relevant audits agree.
- Real iOS and Android checks confirm dark browser-bar blending where the platform supports it.

## Open Questions

No blocking product question remains. The implementation should begin with the current approved dark endpoints listed above, then treat any colour adjustment as visual calibration within the fixed-dark contract rather than as a return to light/dark outer palettes.
