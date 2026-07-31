# Configuration

## Authority

`react-app/app/public/config/design-system.json` is the only authored design configuration. Do not hand-edit `default-config.json`, `shell-config.json`, `portfolio-config.json`, or `cv-config.json`; they are flattened runtime outputs.

Exact current values belong in JSON and normalizer code, not copied into Markdown.

## Namespaces

- `runtime`: shared Canvas/runtime behavior and global tokens
- `shell`: physical frame, wall finish, shared chrome, typography, cross-route surface language, and the production simulation atmosphere
- `portfolio`: active orbital deck, drawer, handoff motion, and route-specific composition
- `playground`: deterministic layout, work sizing, dot-field appearance, and camera response for the production Playground route
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

`shell.layout.routeTitleDescriptionGap` owns the shared spacing between the title rule and description in the Work, Contact, Playground, and both About Me bookend lockups. The development panel exposes it as **Title / Copy Gap**.

### Playground controls

`src/routes/playground/config/playgroundConfig.js` owns Playground defaults, bounds, normalization, subscriptions, and seed generation. `playgroundPanel.js` owns the single control schema used by docked and detached hosts. Shift-click the development settings launcher to open the detached host. Both hosts apply the same runtime values and use the same canonical save path.

The panel groups controls under **World**, **Work**, **Dot field**, and **Motion**. It also provides recenter, deliberate seed generation, reset, and save actions. Diagnostics are read-only and must not enter `design-system.json`. Exact current fields, ranges, and content-authoring rules are recorded in [`PLAYGROUND.md`](PLAYGROUND.md) and enforced by the route normalizer.

Live changes are provisional. **Generate new seed** deliberately recomposes the whole field. **Save design configuration** writes the normalized `playground` snapshot through `performDesignSystemSave()`. When the write-capable local endpoint is unavailable, the established save flow downloads the JSON instead. Reload, root build flattening, and preview must preserve every Playground field.

### Production simulation atmosphere

The shared atmosphere has one canonical shell location:

- `shell.surface.simulationAtmosphere` owns the enabled state, large and small spreads, short memory, edge strength/thickness/inset, and Light/Dark intensity and colour profiles;

The atmosphere never positions the Home title. Its semantic and Canvas geometry share the CSS-authored title position, which is available on the first render and does not change when configuration loads.

`src/legacy/modules/rendering/atmosphere/simulation-atmosphere-config.js` is the one default, normalization, control-schema, and profile-resolution module. Do not duplicate profile defaults in a route, lab, stylesheet, or renderer. `normalizeDesignSystemConfig()` normalizes these nested fields before canonical save and build flattening; the generated `shell-config.json` therefore carries the same values for production fallback loading.

`largeSpread` is the radius of the broad atmospheric field and `smallSpread` is the radius of the tighter colour-reflection field. Both are proportions of the studio window's shortest side and are clamped independently to safe small- and large-screen endpoints. Both fields cover the complete studio wall; there is no title or content clearance mask. `memoryMs` is the short exponential half-life of one non-drifting history buffer; it resets at every ownership or geometry boundary and resolves to zero for Reduced Motion. `edgeStrength` controls the wall-reflection intensity, `edgeWidthPx` controls its physical rim thickness, and `edgeInsetPx` moves that rim inward from the studio-window contour without changing either of those properties. Each Light/Dark material profile owns only `intensity` and `colourStrength`. Quality and cadence are automatic runtime policy and cannot change either apparent spread or the material character. Simulation bodies remain crisp while the shared atmosphere Canvas supplies the two diffusion scales and restrained temporal persistence.

The Crisp + Glow lab remains the focused visual comparison surface and samples the same completed Canvas layers as production Home. The main development panel exposes the glow controls once under the top-level **Background Atmosphere** group, with Glow Field, Light Mode, and Dark Mode sections; the thin wall reflection remains under **Surface Finish → Edge Response**. Both surfaces run the production compositor, apply changes live, and save the same atmosphere-owned shell path in `design-system.json`; neither keeps a second set of defaults.

`atmosphere-lab.json` owns only the WebGL Post, Instanced Density, and Canvas Feedback experiments. It must not persist or regenerate a `crispGlow` profile or any title-position state. Exact atmosphere values remain in canonical JSON and normalizer code, consistent with the general authority rule above.

The production ball palette is resolved once by the shared shell from the visitor's local time of day. Eight palettes fill the 24-hour cycle in three-hour periods beginning at 00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, and 21:00. Home, Portfolio, About, Contact, and Playground consume that live result; route config and URL parameters do not override it. The Palette Lab documents the same schedule and specimens, but it is not production design truth.

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

### Parallax Drift depth controls

Parallax Drift’s authored depth contract lives in the runtime namespace:

- `parallaxFloatZFar` sets the far plane and supports values through `3000`.
- `parallaxFloatFogStart` sets the normalized depth where particles begin fading toward the far plane; the control range is `0.5`–`0.98`.
- `parallaxFloatRandomize` offsets particles from their 3D grid positions; lower values retain more grid alignment.

Changing any of these values reinitializes the mode so the live editor, canonical save, reload, flattening, and preview all render the same particle field.

### Scaffold 3D cube controls

Scaffold is authored through the `cube3d*` runtime keys in `design-system.json`:

- `cube3dSizeVw`, `cube3dEdgeDensity`, and `cube3dFaceGrid` define the point-cloud geometry.
- `cube3dIdleSpeed`, `cube3dCursorInfluence`, `cube3dTumbleSpeed`, and `cube3dTumbleDamping` control rotation and pointer response.
- `cube3dFocalLength` controls perspective projection.
- `cube3dDotSizeMul`, `cube3dFogStart`, and `cube3dFogMin` control material size and depth fading.
- `cube3dWarmupFrames` controls invisible startup settling before the first visible frame.
