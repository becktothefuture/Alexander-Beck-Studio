# Theme State and Window Boundary

Dark/light theme is one site-wide content state, but its visual reach stops at the studio-window interior. Route components, simulations, gates, and in-window overlays consume that state; they must not create their own theme policy. The exposed wall/frame, browser chrome, and persistent Button Bar are outer-shell systems and do not consume the manual site theme.

The intended surface hierarchy is summarized in [`DESIGN.md`](../../DESIGN.md). The runtime, first-paint mirror, configuration, theme-color projection, Button Bar, and browser audits implement the same boundary.

## Preference Model

The stored preference is `auto`, `light`, or `dark` under `theme-preference-v3`. `theme-preference-v2` and the original `theme-preference` key are migration inputs only.

- `auto` follows only `prefers-color-scheme`.
- `light` and `dark` are explicit user overrides.
- An explicit override applies at every viewport width and survives SPA navigation, full-page navigation, reload, and other open tabs.
- Local time, route, viewport width, and content type must not override the preference.

`react-app/app/src/lib/theme-state.js` owns normalization, storage, resolution, and the DOM projection helpers. `react-app/app/src/legacy/modules/visual/dark-mode-v2.js` is the runtime controller: it applies the resolved state, performs the existing palette/shell side effects, listens for browser preference and cross-tab storage changes, and emits `abs:theme-changed`.

## DOM Projection

The resolved theme must agree on all of these surfaces:

- `html.dark-mode` and `body.dark-mode` for dark mode;
- `data-abs-theme="light|dark"` on both `html` and `body`;
- dark `color-scheme` on `html`, independent of the manual site theme;
- `--studio-window-color-scheme: light|dark` at the window boundary;
- the runtime theme event detail (`{ theme, isDark }`).

React consumers that need live theme state use `useRenderedThemeIsDark()`. Route and simulation components must not add, remove, or restore `dark-mode` themselves.

## First Paint

The early inline script in each boot-overlay HTML entry is a first-paint mirror, not a second preference owner. It must resolve the same stored preference with the same rule as the runtime controller before React loads. Changes to preference behavior must update every boot-overlay entry and the runtime controller together.

## Surface Ownership

| Surface | Canonical tokens | Owner |
| --- | --- | --- |
| Exposed browser/page band | `--abs-browser-chrome`, `--frame-color`, `--wall-color` | Dark-only outer-shell policy |
| Shell wall | `--shell-wall-bg`, `--abs-wall-base` | Stable authored dark wall |
| Studio-window interior | `--studio-window-bg`, `--frame-inner-surface` | Resolved site theme |
| In-window contrast finish | `--simulation-contrast-veil-rgb` and finish opacities | Resolved site theme |
| Persistent Button Bar | Outer-shell tokens; active primary pill consumes `--studio-window-bg` | Dark outer shell with one selected-tab theme projection |

Never alias the window-interior tokens back to `--abs-wall-base`; keep each surface token explicit even when they share the same active light/dark endpoint.

## Browser Chrome

Site theme, browser scheme, browser family, and display gamut are not inputs to frame colour:

- Every environment uses the authored opaque true-black frame (`#000000`).
- Safari and iOS/iPadOS receive true black through `theme-color`, the manifest, and the document background. RGB zero is already true black in sRGB and Display P3, so no wide-gamut override is required.
- A manual site-theme toggle changes only the studio window, including when the stored preference is not Auto.
- A browser/OS scheme change may update an Auto studio window without changing the frame or overriding the stored site preference.

`chromeHarmonyMode: auto` remains a canonical compatibility sentinel. It is not a runtime control and no production path can select a non-black outer-frame policy.

## Button Bar

The Button Bar sits outside the studio window. Its base, unselected primary tabs, and secondary sound/theme/reset controls derive from the active dark outer frame and outer-shell ink. The selected primary tab is the single exception: its moving pill exactly matches `--studio-window-bg`, while its label/icon use fully opaque inverse theme ink—black in light mode and white in dark mode. Unselected route labels remain faded outer-shell ink. Theme changes must not recolour the Button Bar base, utility controls, borders, or focus treatment.

## Portfolio Gate

Portfolio is no longer theme-tested as a separate locked route. The live deck renders in the current studio-window theme for every visitor, and the protected-project gate appears only after an unauthorised project-open intent.

The gate uses the shell-owned in-window overlay and therefore inherits the manual site theme, not browser-aware wall colors. Its live-deck backdrop resolves to an `11px` blur on desktop and `16px` on touch/mobile, with a light or dark tonal wash from the active window theme. The Button Bar remains outside the overlay. The dormant `PortfolioGateScene` is not production or theme evidence.

## Verification

Run against a production preview:

```bash
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=chromium npm run audit:theme-consistency
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=webkit npm run audit:theme-consistency
ABS_THEME_WALL_AUDIT_URL=http://127.0.0.1:8013 ABS_BROWSER=chromium npm run audit:theme-wall-invariance
ABS_THEME_WALL_AUDIT_URL=http://127.0.0.1:8013 ABS_BROWSER=webkit npm run audit:theme-wall-invariance
ABS_OUTER_WALL_AUDIT_URL=http://127.0.0.1:8013/index.html ABS_BROWSER=chromium npm run audit:outer-wall-frame
ABS_OUTER_WALL_AUDIT_URL=http://127.0.0.1:8013/index.html ABS_BROWSER=webkit npm run audit:outer-wall-frame
npm run audit:palette-surface-contract
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-gate
```

The theme audit covers manual persistence, mobile, SPA routes, reload, two browser tabs, Auto browser-preference changes, manual precedence, and independent outer-frame response. The wall audit protects outer variables, geometry, pixels, and Button Bar styles while requiring the studio-window surface and contrast veil to change.
