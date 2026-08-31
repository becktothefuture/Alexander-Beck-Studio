# Configuration

## Authority

`react-app/app/public/config/design-system.json` is the only authored design configuration. Do not hand-edit `default-config.json`, `shell-config.json`, `portfolio-config.json`, or `cv-config.json`; they are flattened runtime outputs. The stable simulation colour registry is code-owned by `react-app/app/src/palette/londonPalettes.js`, with its schedule in `timeOfDayPalette.js`; it is not an editable config namespace.

Exact config values belong in JSON and normalizer code. Exact approved simulation colours belong only in the palette registry and its contract check, not in route config or Markdown.

## Namespaces

- `runtime`: shared Canvas/runtime behavior and global tokens
- `shell`: physical frame, wall finish, shared chrome, typography, cross-route surface language, the flat production simulation body material, and the production simulation atmosphere
- `portfolio`: retained case-study drawer, media handoff, gate, and project-detail composition
- `playground`: historical internal namespace for the production Work field's deterministic layout, hierarchy sizing, depth-field appearance, and camera response
- `cv`: retained generated-schema compatibility only; it is not a live CV route

## Complete control path

A control is complete only when it supports:

1. live apply in development;
2. canonical save/export into `design-system.json`;
3. reload parity;
4. build-time flattening;
5. preview parity without panel interaction.

Removing a control also means removing its persistence/export path. Browser storage and `window.__*` caches are helpers, never design truth.

### Production simulation body size

`runtime.homeSimulationBodyRadiusPx` is the one production master radius for Daily Simulation circle material. Its authored default is `8.9px`, matching Tension. The legacy Home modes and the route-backed Tension, Convergence, and Depth renderers all consume this value; no production simulation owns a separate body-size multiplier. Perspective and other 3D projections may reduce the rendered radius by depth, but their foreground radius remains the global value.

`runtime.mobileSimulationBodyScale` is the only responsive adjustment and is applied after the master radius. The current `0.8` value therefore resolves to `7.12px` at the mobile breakpoint. Change **Simulation ball size** in the development panel to apply and save the master value through the normal canonical configuration path.

### Production simulation body material

`shell.surface.simulationBodyMaterial.enabled` is canonically `false`. The code default is also `false`, so a missing or incomplete configuration cannot turn the sphere finish back on. Production bodies keep their active palette colour and use the existing flat render path across Home, Work, About, Contact, and the Home quote puck. The Work depth field remains a separate flat material even though it shares the active palette.

The remaining cache-detail and Light/Dark profile fields preserve configuration compatibility for development experiments. They do not affect production while the material is disabled. Any later production reactivation requires an explicit visual decision and measured frame-time evidence; ordinary production rendering must retain colour batching and avoid one scaled texture draw per body.

`shell.surface.simulationAtmosphere` remains a separate compositor and does not own or modify body shading.

## Build and validation

```bash
npm run check:design-config
npm run build
npm run preview
```

The root build checks the shared HTML entry shell before flattening and Vite. A direct app build can bypass flattening.

## Ownership boundaries

Shared visual finish belongs in `shell`. Page namespaces own composition, page-specific motion, and content geometry. When one value renders through multiple paths—such as DOM plus Canvas—update and verify every path.

`shell.layout.routeTitleDescriptionGap` owns the shared spacing between the title rule and description in the Work, Contact, and both About bookend lockups. The development panel exposes it as **Title / Copy Gap**.

### Work spatial controls

`src/routes/playground/config/playgroundConfig.js` owns the Work spatial engine's defaults, bounds, normalization, subscriptions, and seed generation. `playgroundPanel.js` owns the single control schema used by docked and detached development hosts. The internal names remain for backwards-compatible configuration. Shift-click the development settings launcher to open the detached host. Both hosts apply the same runtime values and use the same canonical save path.

The panel groups controls under **Composition**, **Dot field**, **Motion**, **Actions**, and **Diagnostics**. Dot field owns `dotDensity` and `dotRandomness` (0–1, step 0.01), plus the existing radius and opacity. Composition owns the separate project Layout grid. Dot controls update the renderer without changing project placement, camera position, or layout seed. Layer count, palette ownership, parallax factors, the 72px projected base grid, and the 1,800-dot budget are implementation policy, not additional knobs. Diagnostics are read-only and must not enter `design-system.json`.

Live changes are provisional. **Generate new seed** deliberately recomposes the whole field. **Save Work Settings** reads fresh canonical JSON and replaces only its normalized `playground` namespace. It uses the existing `persistDesignSystemConfig()` transaction and download fallback. Do not capture Home runtime globals or save unrelated panel scopes from this button. When the write-capable local endpoint is unavailable, the established save flow downloads the JSON instead. Reload, root build flattening, and preview must preserve every Work spatial field.

Composition owns the preview-image diagonal clamp: `itemDiagonalViewportRatio`, `itemDiagonalMinPx`, and `itemDiagonalMaxPx`. Their controls are **Viewport share**, **Mobile min diagonal**, and **Desktop max diagonal**. `responsiveProfile.js` resolves them against `hypot(usableWidth, usableHeight)` and converts the reference into one uniform media scale; `placement.js` uses the final dimensions for packing and fit safeguards. Runtime diagnostics, scale, and viewport measurements are derived, never additional authored keys. Existing hierarchy variation stays authored; image aspect ratios, touch targets, panel geometry, dot layers, and animation timing remain fixed by their established owners.

Motion also owns **Snippet depth**, the `snippetDepth` control (0–20%, step 1%). Its config-key path runs through the same registry, normalizer, scoped save, reload, flatten, and read-only preview as the other Work controls. `projectDepth.js` owns forward and inverse projection; smaller projects move more slowly without scaling their media or captions. `responsiveProfile.js` and `placement.js` derive scale-aware gutters and viewport-bounded cross-depth clearance. Those safeguards and copy coverage are not authored controls. Reduced Motion removes relative project parallax without weakening packing safety. Docked and detached hosts share the one schema; their shell dimensions and styling are unchanged.

`node scripts/audit-work-controls.mjs --save --build` directly checks each control's visible effect, canonical save, reload, non-default values in the build, dock/detached wiring, and rendering on the read-only development mirror, then restores all tested values. Production preview deliberately remains Coming soon: its saved configuration and publication hold can be verified, but it must not acquire a Work-preview bypass for this audit.

Control ownership remains repo-native: `playgroundPanel.js` is the registry and docked/detached schema; `panel-popup-manager.js` and `panel-dock.js` mount it; `public/css/panel.css` owns the existing resizable shell, folders, and row geometry. `playgroundConfig.js` publishes live changes to `PlaygroundExperience`; `design-system.json.playground` is authored truth. `design-config.js` normalizes it and `scripts/lib/flatten-design-config.mjs` owns generated output. No alternative panel shell or mobile configuration is introduced. The safe public development mirror is the visual preview for Work controls; it does not register the editor or its launcher and keeps authoring and filesystem APIs blocked. Production preview intentionally retains Coming soon and must not expose an unlock override for control testing.

### Production simulation atmosphere

The shared atmosphere has one canonical shell location:

- `shell.surface.simulationAtmosphere` owns the enabled state, large and small spreads, short memory, edge strength/thickness/inset, and Light/Dark intensity and colour profiles;

The atmosphere never positions the Home title. Its semantic and Canvas geometry share the CSS-authored title position, which is available on the first render and does not change when configuration loads.

`src/legacy/modules/rendering/atmosphere/simulation-atmosphere-config.js` is the one default, normalization, control-schema, and profile-resolution module. Do not duplicate profile defaults in a route, lab, stylesheet, or renderer. `normalizeDesignSystemConfig()` normalizes these nested fields before canonical save and build flattening; the generated `shell-config.json` therefore carries the same values for production fallback loading.

`largeSpread` is the radius of the broad atmospheric field and `smallSpread` is the radius of the tighter colour-reflection field. Both are proportions of the studio window's shortest side and are clamped independently to safe small- and large-screen endpoints. Both fields cover the complete studio wall; there is no title or content clearance mask. `memoryMs` is the short exponential half-life of one non-drifting history buffer; it resets at every ownership or geometry boundary and resolves to zero for Reduced Motion. Each Light/Dark material profile owns only `intensity` and `colourStrength`. Quality and cadence are automatic runtime policy and cannot change either apparent spread or the material character. Simulation bodies remain crisp while the single shared atmosphere Canvas supplies the two diffusion scales and restrained temporal persistence.

The Crisp + Glow lab remains the focused visual comparison surface and samples the same completed Canvas layer as production Home. The main development panel exposes the glow controls once under the top-level **Background Atmosphere** group, with Glow Field, Light Mode, and Dark Mode sections. Both surfaces run the production compositor, apply changes live, and save the same atmosphere-owned shell path in `design-system.json`; neither keeps a second set of defaults.

`atmosphere-lab.json` owns the WebGL Post, Instanced Density, Canvas Feedback, and Atmospheric Glow experiments. Atmospheric Glow reads the current production broad-field material and memory from `design-system.json`, but its saved lab profile contains only cadence and level multiplier; enabled state and quality remain shared lab choices. It must not persist or regenerate a `crispGlow` profile, production atmosphere material, tight-field setting, crossfade setting, or title-position state. Exact production atmosphere values remain in canonical JSON and normalizer code, consistent with the general authority rule above.

The production ball palette is resolved once by the shared shell from the visitor's local time of day. The stable set is Bow / Worn Signal, Silvertown / Cobalt Voltage, Rye / After Closing, and Rye / After Closing (Turmeric). These four palettes rotate twice through eight three-hour periods beginning at 00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, and 21:00; the second twelve hours repeat the first sequence. Home, Work, About, and Contact consume that live result where they use route material. Work uses it for its route-title entrance and restrained coloured depth field. Palette changes recolour the same seeded points without moving them. Route config, URL parameters, editable hover accents, local fallback arrays, and generated colours do not override or extend it. The Palette Lab reads the same canonical registry and documents its live schedule; it does not own another palette set.

Loaders and normalizers live under `src/legacy/modules/utils/` and route-specific runtime folders. Flattening is implemented in `scripts/lib/flatten-design-config.mjs`; the no-write comparison is `scripts/check-design-config.mjs`.

### Theme and browser-frame token boundary

Theme preference and surface behavior are owned by [`THEME-STATE.md`](THEME-STATE.md), with the design boundary summarized in [`DESIGN.md`](../../DESIGN.md). Manual light/dark preference owns the studio-window interior only. The physical shell has one authored dark palette and a separate dark-only browser-harmony policy.

| Contract | Tokens/config | Required behavior |
| --- | --- | --- |
| True-black exposed frame | `shell.theme.siteFrame`, `--abs-browser-chrome`, `--frame-color`, `--wall-color` | Uses opaque `#000000` in every browser family, browser scheme, site theme, and display gamut. |
| Stable shell wall | `shell.theme.wallBase`, `--shell-wall-bg`, `--abs-wall-base` | Uses one authored dark endpoint in every browser and site theme while preserving geometry. |
| Themeable studio window | `runtime.bgLight`, `runtime.bgDark`, `--studio-window-bg`, `--frame-inner-surface` | Follows the resolved site theme and contains all route content. |
| Home grouped legibility fields | `--frame-inner-surface` | Five static Home-only fields follow the active studio-window surface. |
| Stable dark Button Bar | `buttonBarBottomInsetPx`, `buttonBarWindowOverlapPx`, `buttonBarDesktopRouteCellPx`, `buttonBarDesktopIconSizePx`, `buttonBarDesktopLabelGapPx`, `buttonBarDesktopFontScale`, `buttonBarActiveInsetPx`, `buttonBarActiveDepthPx`, the active-surface opacity controls, and `--button-bar-*` projection tokens | Four icon-and-label routes share one continuous group and one moving active key. `buttonBarActiveInsetPx` applies equally to all four key edges. Route separators and configurable group gaps are intentionally absent. The derived frame reserve is `height - overlap + bottom inset`. |
| Persistent Utility Rail | Desktop: `utilityRailButtonSizePx`, `utilityRailHorizontalOffsetPx`. Mobile: `utilityRailMobileButtonSizePx`, `utilityRailMobileHorizontalOffsetPx`, `utilityRailMobileVerticalPositionVh`. Runtime: `--utility-rail-*` and `--utility-rail-mobile-*` projection tokens. | Theme and sound form one vertical shell fixture attached to the studio-window right edge. Desktop and mobile geometry apply live, persist canonically, flatten into runtime config, and remain shared across routes. |

The Button Bar panel keeps all menu controls under the parent **Menu** category, with desktop and mobile geometry in their own nested sections. `buttonBarMobileHeightPx`, `buttonBarMobileWindowOverlapPx`, `buttonBarMobileRadiusPx`, `buttonBarMobileIconCellPx`, `buttonBarMobileIconSizePx`, `buttonBarMobileFontSizeRem`, and `buttonBarMobileActiveInsetPx` own the mobile endpoint. `buttonBarDesktopRouteCellPx`, `buttonBarDesktopIconSizePx`, and `buttonBarDesktopLabelGapPx` scale the same composition for desktop. There are no group-gap or route-gap controls because the four routes are one group. The responsive frame reserve and content clearance resolve from the active endpoint before the shell lays out.

The separate parent **Utility Rail** category has **Desktop** and **Mobile** sections. Desktop size runs from `22px` to `64px` with a `32px` default, and desktop horizontal position runs from `-160px` to `160px` with an `-11px` outward default. Mobile size runs from `22px` to `44px` with a `25px` default; mobile horizontal position uses the same signed range with an `-11px` outward default; mobile vertical position runs from `55%` to `90%` with a `76%` default. Positive horizontal values move the rail inward and negative values move it outward. Icons derive from the corresponding button size, and the default mobile coarse-pointer hit area expands invisibly to `44px` without overlapping the adjacent control.

`syncShellToDocument()` projects the stable wall and themeable window separately. `applyChromeHarmony()` delegates invariant frame projection to `outer-shell-policy.js`; browser family, browser/OS scheme, and site theme cannot alter the authored black value. Legacy `wallBaseLight/Dark` and `siteFrameLight/Dark` fields are normalized into the stable authored values, pruned from canonical/save output, and emitted only as derived compatibility aliases where still required. The Button Bar derives from the resolved outer frame. Do not make `--studio-window-bg` or `--frame-inner-surface` aliases of `--abs-wall-base`.

## Behavioral invariants

- Squircle support is CSS-only and toggled by `runtime.cornerShapeSquircleEnabled`.
- Wall, frame, page ground, and canvas colors remain visibly separated.
- Manual theme and browser/OS scheme changes stop at the studio-window boundary at every viewport width. The outer frame remains true black.
- The inner wall radius includes an optical compensation multiplier; document and visually certify any change.
- Shared shell finish is authored once and reused across routes.
- Convenience presets must explicitly be persistent or UI-only.

### Scaffold 3D cube controls

Scaffold is authored through the `cube3d*` runtime keys in `design-system.json`:

- `cube3dSizeVw`, `cube3dEdgeDensity`, and `cube3dFaceGrid` define the point-cloud geometry.
- `cube3dIdleSpeed`, `cube3dCursorInfluence`, `cube3dTumbleSpeed`, and `cube3dTumbleDamping` control rotation and pointer response.
- `cube3dFocalLength` controls perspective projection.
- `cube3dDotSizeMul`, `cube3dFogStart`, and `cube3dFogMin` control material size and depth fading.
- `cube3dWarmupFrames` controls invisible startup settling before the first visible frame.
