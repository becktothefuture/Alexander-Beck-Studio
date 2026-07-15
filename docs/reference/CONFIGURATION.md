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

Theme preference and surface behavior are owned by [`THEME-STATE.md`](THEME-STATE.md), with the intended design boundary summarized in [`DESIGN.md`](../../DESIGN.md). The table below documents the current runtime projection; it must not be used to silently overturn the locked studio-window-only manual-theme boundary. Resolve the known outer-harmony drift across runtime, docs, theme-color projection, and audits together.

| Contract | Tokens/config | Required behavior |
| --- | --- | --- |
| Theme-aligned exposed frame | `runtime.chromeHarmonyMode`, `shell.theme.siteFrame*`, `--abs-browser-chrome`, `--frame-color`, `--wall-color` | The rendered site theme selects the exposed page band, frame, wall, theme-color, and Button Bar material endpoint. In Auto this follows the browser/OS scheme; manual light/dark moves the frame and window together. |
| Shell wall | `shell.theme.wallBase*`, `--shell-wall-bg`, `--abs-wall-base` | Uses the same active light/dark endpoint as the rendered site theme while preserving geometry. |
| Themeable studio window | `runtime.bgLight`, `runtime.bgDark`, `--studio-window-bg`, `--frame-inner-surface` | Follows the resolved site theme and contains all route content. |
| Themeable in-window veil | `--simulation-contrast-veil-rgb` and light/dark veil opacities | Follows the active studio-window surface. |
| Theme-aligned Button Bar | `--button-bar-outer-ink*` and shell material tokens | Primary material follows the resolved outer frame. Secondary sound/theme controls use the studio-window background and text color. |

`syncShellToDocument()` owns stable shell and window projection. `applyChromeHarmony()` owns the active outer-frame variables from the rendered light/dark theme so the exposed frame and studio window never invert. Retired Safari-specific frame keys are pruned during config loading/saving and must not re-enter runtime harmony. The primary Button Bar material must derive from the resolved outer-frame colour so its rest, hover, and pressed states keep the same subtle contrast. Secondary sound/theme controls intentionally derive from the window background and text tokens. Do not make `--studio-window-bg` or `--frame-inner-surface` aliases of `--abs-wall-base`.

## Behavioral invariants

- Squircle support is CSS-only and toggled by `runtime.cornerShapeSquircleEnabled`.
- Wall, frame, page ground, and canvas colors remain visibly separated.
- Manual theme changes stop at the studio-window boundary; browser/OS changes may still update outer harmony.
- The inner wall radius includes an optical compensation multiplier; document and visually certify any change.
- Shared shell finish is authored once and reused across routes.
- Convenience presets must explicitly be persistent or UI-only.

### Assembly kinetic grab controls

The Assembly hard-pivot interaction is authored through runtime keys in `design-system.json`:

- `shapesGrabAngularDampingPerSec` controls held spin damping as a per-second exponential rate.
- `shapesReleaseLinearGain` and `shapesReleaseAngularGain` scale reconstructed release momentum.
- `shapesMaxSpeed` is the CSS-pixel linear safety cap and is converted through DPR once in the runtime.
- `shapesMaxAngularSpeed` caps held and released angular velocity in radians per second.
- `shapesReducedMotionScale` scales release gains/caps and increases post-release settling without disabling the exact pointer anchor.

These controls do not change empty-space sweep behavior. The exact grabbed point remains authoritative; at an infeasible edge pose, wall contacts minimize penetration through rotation rather than moving the anchor away from the pointer.
