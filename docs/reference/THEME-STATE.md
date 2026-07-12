# Theme State and Window Boundary

Dark/light theme is one site-wide content state, but its visual reach stops at the studio-window interior. Route components, simulations, gates, and in-window overlays consume that state; they must not create their own theme policy. The exposed wall/frame, browser chrome, and persistent Button Bar are outer-shell systems and do not consume the manual site theme.

## Preference Model

The stored preference is `auto`, `light`, or `dark` under `theme-preference-v2`.

- `auto` follows only `prefers-color-scheme`.
- `light` and `dark` are explicit user overrides.
- An explicit override applies at every viewport width and survives SPA navigation, full-page navigation, reload, and other open tabs.
- Local time, route, viewport width, and content type must not override the preference.

`react-app/app/src/lib/theme-state.js` owns normalization, storage, resolution, and the DOM projection helpers. `react-app/app/src/legacy/modules/visual/dark-mode-v2.js` is the runtime controller: it applies the resolved state, performs the existing palette/shell side effects, listens for browser preference and cross-tab storage changes, and emits `abs:theme-changed`.

## DOM Projection

The resolved theme must agree on all of these surfaces:

- `html.dark-mode` and `body.dark-mode` for dark mode;
- `data-abs-theme="light|dark"` on both `html` and `body`;
- `color-scheme` on `html`;
- the runtime theme event detail (`{ theme, isDark }`).

React consumers that need live theme state use `useRenderedThemeIsDark()`. Route and simulation components must not add, remove, or restore `dark-mode` themselves.

## First Paint

The early inline script in each boot-overlay HTML entry is a first-paint mirror, not a second preference owner. It must resolve the same stored preference with the same rule as the runtime controller before React loads. Changes to preference behavior must update every boot-overlay entry and the runtime controller together.

## Surface Ownership

| Surface | Canonical tokens | Owner |
| --- | --- | --- |
| Exposed browser/page band | `--abs-browser-chrome`, `--frame-color`, `--wall-color` | Browser harmony |
| Stable outer shell | `--shell-wall-bg`, `--abs-wall-base` | Shell configuration |
| Studio-window interior | `--studio-window-bg`, `--frame-inner-surface` | Resolved site theme |
| In-window contrast finish | `--simulation-contrast-veil-rgb` and finish opacities | Resolved site theme |
| Persistent Button Bar | `--button-bar-outer-ink*` and shell material tokens | Stable outer shell |

Never alias the window-interior tokens back to `--abs-wall-base`. Doing so freezes the window dark while light-mode ink changes, producing unreadable routes. Never derive the active outer-frame palette from the manual site preference.

## Browser Chrome

Site theme and browser-chrome harmony are separate state machines:

- `chrome-harmony.js` resolves the outer palette from browser family plus `prefers-color-scheme`.
- Safari and other theme-color-capable browsers use the fixed dark authored wall colour in both browser schemes so the exposed band and browser bars remain dark.
- Locked desktop Chromium and Firefox use their browser-native chrome palettes.
- A manual site-theme toggle changes the window interior but leaves the active outer palette unchanged.
- A browser/OS scheme change may update the outer palette even when the site has a manual light/dark override; it must not change that manual site preference.
- In `auto`, the browser/OS scheme drives both systems through their separate ownership paths.

Do not collapse this into a single "sync wall colour with theme" rule. `chromeHarmonyMode: auto` is the default browser-aware behavior; `site` and `browser` remain explicit development overrides.

## Button Bar

The Button Bar sits outside the studio window and is stable shell chrome. Its tab and secondary-control ink must not inherit `--text-primary` or `--text-muted` from the window theme. Its material surface must derive from `--abs-browser-chrome`, so native light Chromium and Firefox use a faint low-contrast gasket edge that matches the restraint of the fixed dark path while retaining a distinct keyboard focus outline. Route selection can change active state, but manual light/dark changes must not recolor the bar or alter its geometry.

## Portfolio Gate

Gate teaser assets are theme-specific: light/dark multiplied by mobile/tablet/desktop. `PortfolioGateTeaser` selects from the resolved DOM theme, not from a media query alone. The capture script must force and assert each theme before writing public assets; the gate audit captures and validates both modes.

The teaser capture pipeline bakes a 12px blur into every public JPG; the runtime image remains filter-free so removing CSS cannot reveal a sharp preview. The locked Portfolio overlay adds a gate-only 30% backdrop-blur increase (8.58px desktop, 15.6px touch/mobile) without changing the shared modal or simulation-focus blur contract.

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
