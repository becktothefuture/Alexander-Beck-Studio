# Theme State Contract

Dark/light theme is one site-wide state. Route components, simulations, gates, screenshots, and browser tabs must consume that state; they must not create their own theme policy.

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

## Browser Chrome

Theme choice and browser-chrome harmony are separate. After the theme resolves, `chrome-harmony.js` adapts the exposed frame for Safari/theme-color browsers versus locked Chromium/Firefox chrome. Do not merge that browser-specific frame policy into theme preference resolution.

## Wall Surface

Theme choice must not recolor the studio wall base. `site-shell.js` resolves `--abs-wall-base`, `--frame-inner-surface`, and the wall contrast color from one stable wall base so the wall remains visually continuous when switching between light and dark mode. Light/dark theme may still adjust text, controls, chrome harmonization, and wall finish opacity, but not the underlying wall color.

## Portfolio Gate

Gate teaser assets are theme-specific: light/dark multiplied by mobile/tablet/desktop. `PortfolioGateTeaser` selects from the resolved DOM theme, not from a media query alone. The capture script must force and assert each theme before writing public assets; the gate audit captures and validates both modes.

## Verification

Run against a production preview:

```bash
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=chromium npm run audit:theme-consistency
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=webkit npm run audit:theme-consistency
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-gate
```

The theme audit covers manual persistence, mobile, SPA routes, reload, two browser tabs, Auto browser-preference changes, and manual precedence over later browser changes.
