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
| Exposed browser/page band | `--abs-browser-chrome`, `--frame-color`, `--wall-color` | Rendered theme harmony |
| Shell wall | `--shell-wall-bg`, `--abs-wall-base` | Rendered theme harmony |
| Studio-window interior | `--studio-window-bg`, `--frame-inner-surface` | Resolved site theme |
| In-window contrast finish | `--simulation-contrast-veil-rgb` and finish opacities | Resolved site theme |
| Persistent Button Bar | `--button-bar-outer-ink*`, `--studio-window-bg`, `--text-primary` | Outer frame plus window utility controls |

Never alias the window-interior tokens back to `--abs-wall-base`; keep each surface token explicit even when they share the same active light/dark endpoint.

## Browser Chrome

Site theme and browser-chrome harmony share one active light/dark endpoint:

- `chrome-harmony.js` resolves the outer palette endpoint from the rendered site theme.
- In Auto, the rendered site theme follows `prefers-color-scheme`, so the browser/OS light scheme makes both the window and frame light, and dark scheme makes both dark.
- Firefox uses its browser-native chrome palette.
- A manual site-theme toggle moves the window interior and exposed frame together.
- A browser/OS scheme change updates the site only when the stored preference is Auto.

`chromeHarmonyMode: auto` is the default browser-aware behavior; `site` and `browser` remain explicit development overrides for palette source. They do not create crossed light/dark frame and window states.

## Button Bar

The Button Bar sits outside the studio window. Primary route material derives from `--abs-browser-chrome`, so it tracks the active frame. Secondary sound/theme controls derive from the window surface and text color, so their bodies match `--studio-window-bg` and their icons stay legible. Route selection can change active state, but theme changes must not alter geometry.

## Portfolio Gate

The locked Portfolio route uses one token-driven CSS/DOM ghost scene with the same fixed poster frames as the live deck. Its card planes adapt through responsive CSS and resolved theme tokens; theme switching does not request a second preview asset.

The scene never starts the live deck, title/copy, project JSON, or video runtime. It uses four explicitly named static poster files and no per-card titles; removing CSS blur reveals those poster frames plus the harmless intercept: “Ah, ah, ah. You didn’t say the magic word.” The shared modal and simulation-focus backdrop blur is 13.2px desktop / 24px touch-mobile; the locked Portfolio gate remains 30% stronger at 17.16px desktop / 31.2px touch-mobile.

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
