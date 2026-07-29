# Configuration

## Authority

`react-app/app/public/config/design-system.json` is the only authored design configuration. Do not hand-edit `default-config.json`, `shell-config.json`, `portfolio-config.json`, or `cv-config.json`; they are flattened runtime outputs.

Exact current values belong in JSON and normalizer code, not copied into Markdown.

## Namespaces

- `runtime`: shared Canvas/runtime behavior and global tokens
- `shell`: physical frame, wall finish, shared chrome, typography, cross-route surface language, and the production simulation atmosphere
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

`shell.layout.routeTitleDescriptionGap` owns the shared spacing between the title rule and description in the Work, Contact, and both About Me bookend lockups. The development panel exposes it as **Title / Copy Gap**.

### Production simulation atmosphere

The shared atmosphere has two canonical shell locations:

- `shell.surface.simulationAtmosphere` owns the enabled state, shared spread, content clearance, edge response, and Light/Dark intensity and colour profiles;
- `shell.hero.titleYOffsetVh` owns the single responsive Home title adjustment used by both the semantic title geometry and its Canvas rendering path.

`src/legacy/modules/rendering/atmosphere/simulation-atmosphere-config.js` is the one default, normalization, control-schema, and profile-resolution module. Do not duplicate profile defaults in a route, lab, stylesheet, or renderer. `normalizeDesignSystemConfig()` normalizes these nested fields before canonical save and build flattening; the generated `shell-config.json` therefore carries the same values for production fallback loading.

`spread` is the glow radius as a proportion of the studio window's shortest side, clamped internally to safe small- and large-screen endpoints. `contentClearance` controls the post-blur quiet-zone attenuation, and `edgeStrength` controls the fixed-width wall reflection. Each Light/Dark material profile owns only `intensity` and `colourStrength`. Quality and cadence are automatic runtime policy and cannot change the apparent spread or material character. Body blur and temporal memory are not part of the production material contract; simulation bodies remain crisp while the shared atmosphere Canvas supplies the broad softness from the current completed frame only.

The Crisp + Glow lab remains the focused visual comparison surface and samples the same completed Canvas layers as production Home. The main development panel exposes the shared production schema once under **Light Edge**, with Edge Response, Source Field, Light Mode, and Dark Mode sections. Both surfaces run the production compositor, apply changes live, and save the same atmosphere-owned shell path in `design-system.json`; neither keeps a second set of defaults.

`atmosphere-lab.json` owns only the WebGL Post, Instanced Density, and Canvas Feedback experiments. It must not persist or regenerate a `crispGlow` profile or Title Y value. Exact atmosphere values remain in canonical JSON and normalizer code, consistent with the general authority rule above.

The production ball palette is resolved once by the shared shell from the visitor's local time of day. Eight palettes fill the 24-hour cycle in three-hour periods beginning at 00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, and 21:00. Home, Portfolio, About, and Contact consume that live result; route config and URL parameters do not override it. The Palette Lab documents the same schedule and specimens, but it is not production design truth.

Loaders and normalizers live under `src/legacy/modules/utils/` and route-specific runtime folders. Flattening is implemented in `scripts/lib/flatten-design-config.mjs`; the no-write comparison is `scripts/check-design-config.mjs`.

### Theme and browser-frame token boundary

Theme preference and surface behavior are owned by [`THEME-STATE.md`](THEME-STATE.md), with the design boundary summarized in [`DESIGN.md`](../../DESIGN.md). Manual light/dark preference owns the studio-window interior only. The physical shell has one authored dark palette and a separate dark-only browser-harmony policy.

| Contract | Tokens/config | Required behavior |
| --- | --- | --- |
| True-black exposed frame | `shell.theme.siteFrame`, `--abs-browser-chrome`, `--frame-color`, `--wall-color` | Uses opaque `#000000` in every browser family, browser scheme, site theme, and display gamut. |
| Stable shell wall | `shell.theme.wallBase`, `--shell-wall-bg`, `--abs-wall-base` | Uses one authored dark endpoint in every browser and site theme while preserving geometry. |
| Themeable studio window | `runtime.bgLight`, `runtime.bgDark`, `--studio-window-bg`, `--frame-inner-surface` | Follows the resolved site theme and contains all route content. |
| Home grouped legibility fields | `--frame-inner-surface` | Five static Home-only fields follow the active studio-window surface. |
| Stable dark Button Bar | `--button-bar-outer-ink*` and shell material tokens | Route tabs, sound, theme, and reset controls use only outer-shell material and ink. Theme state may change iconography, labels, and thumb position, not control colour. |

`syncShellToDocument()` projects the stable wall and themeable window separately. `applyChromeHarmony()` delegates invariant frame projection to `outer-shell-policy.js`; browser family, browser/OS scheme, and site theme cannot alter the authored black value. Legacy `wallBaseLight/Dark` and `siteFrameLight/Dark` fields are normalized into the stable authored values, pruned from canonical/save output, and emitted only as derived compatibility aliases where still required. The Button Bar derives from the resolved outer frame. Do not make `--studio-window-bg` or `--frame-inner-surface` aliases of `--abs-wall-base`.

## Behavioral invariants

- Squircle support is CSS-only and toggled by `runtime.cornerShapeSquircleEnabled`.
- Wall, frame, page ground, and canvas colors remain visibly separated.
- Manual theme and browser/OS scheme changes stop at the studio-window boundary; the outer frame remains true black.
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
