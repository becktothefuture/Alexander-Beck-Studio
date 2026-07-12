# Configuration

## Authority

`react-app/app/public/config/design-system.json` is the only authored design configuration. Do not hand-edit `default-config.json`, `shell-config.json`, `portfolio-config.json`, or `cv-config.json`; they are flattened runtime outputs.

Exact current values belong in JSON and normalizer code, not copied into Markdown.

## Namespaces

- `runtime`: shared Canvas/runtime behavior and global tokens
- `shell`: physical frame, wall finish, shared chrome, typography, and cross-route surface language
- `portfolio`: active orbital deck, drawer, handoff motion, and route-specific composition
- `cv`: retained generated-schema compatibility only; it is not a live CV route

## Complete control path

A control is complete only when it supports:

1. live apply in development;
2. canonical save/export into `design-system.json`;
3. reload parity;
4. build-time flattening;
5. preview parity without panel interaction.

Removing a control also means removing its persistence/export path. Browser storage and `window.__*` caches are helpers, never design truth.

## Build and validation

```bash
npm run check:design-config
npm run build
npm run preview
```

The root build checks the shared HTML entry shell before flattening and Vite. A direct app build can bypass flattening.

## Ownership boundaries

Shared visual finish belongs in `shell`. Page namespaces own composition, page-specific motion, and content geometry. When one value renders through multiple paths—such as DOM plus Canvas—update and verify every path.

Loaders and normalizers live under `src/legacy/modules/utils/` and route-specific runtime folders. Flattening is implemented in `scripts/lib/flatten-design-config.mjs`; the no-write comparison is `scripts/check-design-config.mjs`.

### Theme and browser-frame token boundary

| Contract | Tokens/config | Required behavior |
| --- | --- | --- |
| Browser-aware exposed frame | `runtime.chromeHarmonyMode`, `shell.theme.siteFrame*`, `shell.theme.safariFrame*`, `--abs-browser-chrome`, `--frame-color`, `--wall-color` | Browser family and browser/OS scheme select the active palette; manual site theme does not. |
| Stable outer shell | `shell.theme.wallBase*`, `--shell-wall-bg`, `--abs-wall-base` | Remains stable across manual site-theme changes. |
| Themeable studio window | `runtime.bgLight`, `runtime.bgDark`, `--studio-window-bg`, `--frame-inner-surface` | Follows the resolved site theme and contains all route content. |
| Themeable in-window finish | `--simulation-contrast-veil-rgb` and light/dark finish opacities | Follows the active studio-window surface. |
| Stable Button Bar | `--button-bar-outer-ink*` and shell material tokens | Does not inherit window text tokens or recolor on manual theme changes. |

`syncShellToDocument()` owns stable shell and window projection. `applyChromeHarmony()` separately owns the active outer-frame variables and derives its active light/dark choice from `prefers-color-scheme`. Preserve the Safari/theme-color versus locked Chromium/Firefox split. Do not make `--studio-window-bg` or `--frame-inner-surface` aliases of `--abs-wall-base`, and do not pass the resolved site theme into browser harmony.

## Behavioral invariants

- Squircle support is CSS-only and toggled by `runtime.cornerShapeSquircleEnabled`.
- Wall, frame, page ground, and canvas colors remain visibly separated.
- Manual theme changes stop at the studio-window boundary; browser/OS changes may still update outer harmony.
- The inner wall radius includes an optical compensation multiplier; document and visually certify any change.
- Shared shell finish is authored once and reused across routes.
- Convenience presets must explicitly be persistent or UI-only.
