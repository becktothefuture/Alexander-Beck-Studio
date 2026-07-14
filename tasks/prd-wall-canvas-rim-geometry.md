# PRD: Wall, Canvas, Rim, and Collision Geometry

## Introduction

The studio window currently has two competing rounded-rectangle geometries. `#simulations` already defines the visible wall opening, but the responsive outer-frame inset is applied a second time to the inner shadow, directional rim, Canvas render clip, and physics boundary. The result is the black inner annulus shown in the supplied screenshots: DevTools outlines the full Canvas while rendered pixels, balls, and the rim stop at a smaller radius.

This work rebuilds that contract around one visual window and one separately configurable collision boundary. It preserves the existing broad directional edge light, removes the abandoned crisp-line effect, and makes the active controls truthful, persistent, and ordered by render stack.

## Evidence and Root Cause

- `#simulations` is already inset from the viewport by the responsive frame inset and owns the visible radius.
- `#simulations::before` and `.inner-wall-gradient-edge` are then inset again by `--abs-simulation-inset` and reduced to `--abs-simulation-radius`.
- The Canvas DOM box fills `#simulations`, but the Canvas 2D render path is clipped to the same smaller collision rectangle.
- Physics consumes that smaller rectangle, so balls and rendered pixels stop at the inner perimeter while the selected Canvas outline remains at the outer perimeter.
- `state.wallInset` is overwritten by the frame inset, preventing independent collision tuning.
- The entrance animation leaves a resolved pixel `border-radius` inline, which can override responsive radius changes after resize or orientation changes.
- The existing wall-invariance audit asserts the broken visual-rim-equals-collision relationship and must be corrected with the implementation.

## Goals

- Remove the black inner gap/annulus on every supported viewport.
- Make the wall, Canvas CSS box, pit shadow, directional rim, and active finish layers share the exact same visual bounds, radius, and CSS corner shape.
- Add one clearly named, manually adjustable collision inset that affects physics only.
- Preserve responsive wall inset and radius behavior without breakpoint-specific CSS overrides or persistent inline radius values.
- Preserve the approved directional edge light while removing abandoned line-effect code and misleading/dead controls.
- Make active wall-effect controls map directly to rendered values and save through the canonical design configuration.
- Protect the contract with measurements, automated audits, and inspected screenshots in Chromium and WebKit.

## User Stories

### US-001: One visible wall perimeter

**Description:** As a visitor, I want the simulation surface and wall finish to meet at one clean rounded edge without a dark gap or offset rim.

**Acceptance Criteria:**

- [ ] `#simulations`, `canvas#c`, the active front-depth Canvas, `.inner-wall-gradient-edge`, `.scene-effects`, `.noise`, `.frame-vignette`, `.simulation-contrast-veil`, `.studio-window-finish-layer`, and window modal overlays have matching visible window geometry within 0.5 CSS px where active.
- [ ] `#simulations::before` has computed top/right/bottom/left values of 0px, matches the wall radius, and has no collision variable in its computed geometry.
- [ ] Exactly one active directional-rim owner exists and is measurable; acceptance cannot pass through a hidden or zero-sized rim element.
- [ ] All active visual layers resolve to the same radius and CSS `corner-shape` contract.
- [ ] The CSS `#simulations` overflow clip is the sole visual clipping authority. Canvas 2D must not add a circular `Path2D` clip beneath a CSS squircle.
- [ ] No second visual inset is derived from the outer frame inset or collision inset.
- [ ] No black annulus appears in inspected light- or dark-mode screenshots.

### US-002: Independent collision clearance

**Description:** As the site author, I want to move the ball collision boundary inward without moving or resizing the Canvas, wall shadow, rim, or finish.

**Acceptance Criteria:**

- [ ] The canonical runtime key is `simulationCollisionInsetPx`.
- [ ] The control is labelled `Collision inset` and states that it affects physics only.
- [ ] The control range is 0–32 CSS px in 1px steps; the authored baseline is 10px.
- [ ] Changing the value updates the cached collision boundary without a viewport resize and within two animation frames.
- [ ] Increasing the inset clamps and wakes only bodies outside the new legal boundary; decreasing it does not disturb already legal settled bodies.
- [ ] The collision radius is `max(0, visualRadius - collisionInset)` and collision bounds are clamped for very small viewports.
- [ ] The value applies consistently in CSS pixels across breakpoints and is converted to Canvas pixels exactly once through the effective DPR.
- [ ] Authored and effective collision inset are exposed separately for diagnostics; safety clamping never rewrites the authored value.
- [ ] Legacy `wallInset` remains retired and pruned. It is not migrated, saved, or projected into visual CSS.

### US-003: Responsive geometry ownership

**Description:** As a visitor resizing or rotating the browser, I want the wall and simulation to remain aligned continuously across breakpoints.

**Acceptance Criteria:**

- [ ] The existing mobile/desktop frame inset endpoints continue to control viewport-to-window spacing only.
- [ ] The existing mobile/desktop frame radius endpoints continue to control the one visual radius.
- [ ] The entrance animation removes its inline radius at completion so CSS variables resume ownership.
- [ ] Live frame-radius, frame-inset, or collision-inset edits refresh Canvas and collision geometry immediately.
- [ ] Geometry remains continuous across 600px/601px and the 480px/991px interpolation anchors.
- [ ] The Button Bar remains fully below the framed window at 320px, common phone widths, 600px, 601px, and desktop.
- [ ] Same-page, no-reload resize tests cover 599→600→601→600px, 480→991→320px, and 390×844 portrait→844×390 landscape→portrait.
- [ ] After entrance completion and every resize, `#simulations.style.borderRadius` is empty so responsive CSS owns the value.

### US-004: Truthful wall-finish controls

**Description:** As the site author, I want the configuration panel to describe the actual render stack and every active slider to have a visible, predictable effect.

**Acceptance Criteria:**

- [ ] Wall-finish controls are ordered back-to-front: pit shadow, then directional rim.
- [ ] Pit shadow exposes opacity, blur, spread, and vertical offset; each maps 1:1 to the corresponding CSS variable and uses the migrated visual baselines below.
- [ ] The pit shadow uses one tokenized inset-shadow expression, with no additional hardcoded shadow stack.
- [ ] Directional rim exposes light opacity, top-shadow opacity, and reach.
- [ ] Directional-rim derivation is implemented once; control callbacks call the shared apply path rather than duplicating ratios.
- [ ] Rim focal positions, falloff stop, and falloff opacity multiplier use named effect variables with one documented authority, even when they are not panel controls.
- [ ] The dead outer-cast-shadow control, state projection, canonical key, and unused CSS variables are removed.
- [ ] No crisp-line controls, keys, elements, or persistence paths remain.
- [ ] Panel values survive canonical save, reload, flattening, and production preview.

### US-005: Executable regression protection

**Description:** As a future developer, I need audits that distinguish the visual wall from the physics boundary so this coupling cannot return.

**Acceptance Criteria:**

- [ ] The wall-invariance audit asserts visual equality separately from collision geometry.
- [ ] The audit proves changing collision inset leaves wall, Canvas, rim, and shadow geometry unchanged.
- [ ] The focused Home geometry audit covers 320, 340, 341, 351×933, 390, 480, 599, 600, 601, 767, 768, 991, 1273×1326, and 1440px.
- [ ] All four production routes are checked at representative mobile, breakpoint-edge, supplied-evidence, and desktop sizes.
- [ ] Chromium and WebKit runs pass in light and dark mode.
- [ ] Device scale factors 1 and 2 are covered; Canvas backing dimensions equal CSS dimensions × effective DPR within one backing pixel.
- [ ] Squircle enabled/disabled and supported/fallback corner-shape paths are verified, including inspected corner pixels.
- [ ] Home uses a deterministic Ball Field/Pit state for collision assertions; Portfolio, About Me, and Contact verify shared-shell visual parity.
- [ ] Canonical site checks, Canvas SPA checks, theme/frame audits, and screen certification pass.

## Functional Requirements

- FR-1: `#simulations` is the only visual geometry owner for the studio-window rectangle.
- FR-2: Visual children of `#simulations` use `inset: 0` and `border-radius: inherit` where possible.
- FR-3: External window overlays use the canonical frame radius and the same viewport/window positioning contract; they must not use collision geometry.
- FR-4: Canvas CSS dimensions remain exactly the `#simulations` dimensions, apart from subpixel backing-store rounding that must not change the CSS box.
- FR-5: Remove Canvas bleed geometry, negative Canvas `left`/`top`, buffer enlargement, and the Canvas 2D `Path2D` visual clip. The CSS host and inherited Canvas radius/corner shape own visual clipping.
- FR-6: Physics consumes a separately cached `simulationCollisionBounds` rectangle derived from `simulationCollisionInsetPx`.
- FR-7: No visual selector consumes collision inset or collision radius.
- FR-8: No runtime code aliases frame inset to collision inset.
- FR-9: Geometry measurement must use untransformed layout dimensions so entrance scale transforms cannot distort physics coordinates.
- FR-10: Canvas backing-store and DPR conversions occur outside the hot physics loop.
- FR-11: Live geometry-control edits force a resize/geometry refresh and reconcile active ball positions.
- FR-12: Direct mode consumers migrate from ambiguous `wallInset` to `simulationCollisionInsetPx`; known double counting in Particle Fountain is removed.
- FR-13: Tactile/depth Canvas layers follow the full visual wall geometry when enabled.
- FR-14: Generated config files are updated only through the canonical flatten/build flow.
- FR-15: Portfolio keeps its route-specific choice to disable the pit inset shadow, while its remaining rim stays aligned to the full wall.
- FR-16: A temporary 0.75 wall scale followed by a geometry refresh must not change Canvas-space collision bounds.
- FR-17: SPA remounts clear collision geometry before a replacement Canvas can step; diagnostic bounds identify the active Canvas generation.
- FR-18: The always-zero `frameBorderWidth` is retired from active visual geometry and cannot become a second inset later.

## Parameter Inventory and Decisions

| Current parameter | Current problem | Decision |
| --- | --- | --- |
| `shell.layout.frameInsetMobile/Desktop` | Reused as visual, collision, and effect inset | Keep for viewport-to-window spacing only |
| `shell.layout.frameRadiusMobile/Desktop` | Correct visual source, but can be overridden inline | Keep as the only responsive visual radius |
| `wallInset` | Ambiguous retired key and currently forced from frame inset | Replace all active use with `simulationCollisionInsetPx`; keep `wallInset` retired and pruned |
| `--abs-simulation-inset` / `--abs-simulation-radius` | Creates a second visual perimeter | Remove from visual CSS and runtime projection |
| `innerWallPitInsetShadowOpacity` | Authored 0.215 is silently rendered as 0.258 | Keep; migrate canonical baseline to 0.258 and map 1:1 |
| `innerWallPitInsetShadowBlurPx` | Authored 36px is silently capped to 20px | Keep; migrate canonical baseline to 20px and remove the hidden cap |
| `innerWallPitInsetShadowSpreadPx` | Active -6px value is not exposed in panel | Keep, author -6px, and expose |
| `innerWallPitInsetShadowOffsetYPx` | Active 4px value is not exposed in panel | Keep, author 4px, and expose |
| `innerWallGradientEdgeTopOpacity` | Misnamed and callback duplicates render math | Keep for compatibility, label `Rim light`, centralize derivation |
| `innerWallGradientEdgeTopShadowOpacity` | Authored 0.57 is silently rendered as 0.3192 | Keep; migrate canonical baseline to 0.319 and map 1:1 |
| `innerWallGradientEdgeWidth` | Active and useful | Keep as `Rim reach` |
| `outerWallCastShadowOpacityLight` and cast-shadow CSS variables | Adjustable/persisted but no rendering consumer | Remove and retire |
| `frameBorderWidth` | Forced to zero but threaded through visual offsets | Remove from active geometry; retain no path that can create a second inset |
| Canvas bleed and `canvasClipPath` | Duplicates CSS clipping and cannot match CSS squircle | Remove; CSS host overflow/radius/corner shape is authoritative |
| Legacy shine/AO/specular fields | Inactive compatibility surface | Do not expand this focused fix; keep excluded from active controls/persistence and record for later cleanup |

### Active control schema

| Control | Range | Step | Canonical baseline | Mapping |
| --- | --- | --- | --- | --- |
| Collision inset | 0–32px | 1px | 10px | Physics only |
| Pit shadow opacity | 0–0.35 | 0.005 | 0.258 | 1:1 |
| Pit shadow blur | 0–56px | 1px | 20px | 1:1 |
| Pit shadow spread | -14–4px | 1px | -6px | 1:1 |
| Pit shadow offset Y | 0–14px | 1px | 4px | 1:1 |
| Rim light | 0–1 | 0.01 | 0.31 | Documented master; bottom/side material ratios derive once |
| Top shadow | 0–1 | 0.01 | 0.319 | 1:1 |
| Rim reach | 0.5–6px | 0.5px | 2.5px | 1:1 |

The bottom/side ratios remain fixed material constants, not separate controls. Their calculation and the rim falloff constants must have one shared authority.

## Visual Stack

Back to front inside the clipped studio window:

1. studio-window surface/background;
2. scene/noise;
3. Canvas simulation and visual title path;
4. one full-window pit inset shadow;
5. one full-window directional rim;
6. contrast/finish overlays;
7. route UI and footer;
8. modal/project overlays;
9. persistent Button Bar outside the window.

Collision geometry is not a visual layer and must not appear in this stack. In the panel, frame/window geometry appears under Shell, collision is a separately labelled physics control, and the Light group is ordered pit shadow → directional rim → contrast/finish controls.

## Breakpoint Strategy

- Visual frame inset and radius continue to interpolate from their existing mobile endpoint at 480px to their desktop endpoint at 991px.
- Collision inset is a single CSS-pixel physics value, not a visual breakpoint value. The 10px authored value must remain 10 CSS px at every viewport until the safety clamp applies.
- Collision geometry is recalculated from the current visual radius and current Canvas dimensions at every geometry refresh.
- Small viewports clamp the collision inset to a valid interior; they do not alter the authored value or visual geometry.
- Explicit boundary checks at 600px and 601px protect the mobile Button Bar/window stacking contract.

## Configuration and Control Lifecycle

`simulationCollisionInsetPx` and active rim/shadow controls must pass all stages:

1. canonical authored value in `public/config/design-system.json`;
2. development load into runtime state;
3. visible control in the development panel;
4. live application to collision/effect geometry;
5. canonical save/export;
6. reload parity;
7. build-time flattening into generated runtime config;
8. production-preview parity without panel interaction.

Browser storage and debug globals remain diagnostic only.

## Implementation Plan

### Phase 1: Separate visual and collision geometry

- Restore the pit shadow and directional rim to `inset: 0` with inherited radius.
- Remove simulation inset/radius CSS variables from visual ownership.
- Remove Canvas bleed and Canvas 2D visual clipping; keep CSS wall overflow/radius/corner shape as the visual authority.
- Rename/cache inset physics geometry as `simulationCollisionBounds`, with authored/effective inset and active Canvas generation in the diagnostic snapshot.
- Update Ball and mode consumers to the explicit collision name.
- Correct Particle Fountain's double inset.
- Make Tactile and front-depth Canvas geometry follow the full wall.
- Migrate `Ball.js`, Ball Pit, Elastic Center, Flubber Blob, Kaleidoscope, Particle Fountain, Pressure Crucible, Shapes, Weave Field, Portfolio pit behavior, and Portfolio resize reconciliation; finish with a search proving no active `g.wallInset` consumer remains.

### Phase 2: Restore responsive ownership

- Remove persistent inline wall radius after entrance animation in WAAPI and fallback paths.
- Ensure live frame/collision control changes call the renderer geometry refresh.
- Keep transformations out of collision-bound calculations.
- Clear cached collision geometry on renderer disposal/remount before the next physics step.

### Phase 3: Simplify controls and persistence

- Add `simulationCollisionInsetPx` to `Simulations → Physics → Collision`, separate from visual wall geometry and the stack-ordered Light controls.
- Reorder Wall Rim controls by render stack.
- Expose pit-shadow spread and offset.
- Make shadow/rim callbacks use the central CSS-variable projection.
- Remove dead outer-cast-shadow configuration and persistence.
- Retire the zero-width frame-border path from visual geometry.
- Flatten generated config from the canonical source.

### Phase 4: Rewrite and run verification

- Rewrite the wall-invariance assertions around visual equality and collision independence.
- Add the missing breakpoint edges.
- Add deterministic 10px→24px and diagnostic 0px collision tests, a temporary-scale probe, SPA-generation checks, DPR checks, and a zero-effect-opacity continuity probe.
- Run static/config/build gates, Canvas SPA audit, and theme/frame audits.
- Inspect generated screenshots and live browser geometry in both engines.

## Technical Considerations

- Preserve allocation-free hot paths. Rounded paths and collision bounds are rebuilt only on resize or control changes.
- Rely on the CSS host's `overflow: hidden` plus inherited Canvas radius/corner shape, and explicitly inspect WebKit corner pixels for compositor bleed.
- Use computed/client layout dimensions rather than transformed `getBoundingClientRect()` dimensions for physics authority during entrance animation.
- Preserve Canvas backing-store rounding with effective DPR; visual equality is measured in CSS pixels.
- Keep the canonical config as the only authored source. Generated JSON is never hand-edited.
- Preserve unrelated dirty-worktree changes.
- Before editing, capture status and relevant diffs. Patch only owned hunks; never reset, checkout, or rewrite whole dirty files. After generation, compare the final diff to that baseline and confirm unrelated simulation, palette, shell-colour, and physics values are unchanged.

### Exact retirement boundary

- Remove now: active `wallInset` consumers, `--abs-simulation-inset`, `--abs-simulation-radius`, Canvas bleed/Path2D visual clip state, active frame-border geometry, outer-cast-shadow control/state/projection/canonical key, and all crisp-line remnants.
- Keep out of scope: inactive legacy shine/AO/specular compatibility fields that are already absent from active controls and canonical save output.
- No optional loader alias is added for `wallInset`; it remains in the retired-key prune list.

## Non-Goals

- No redesign of the frame colours, browser-chrome harmony, Button Bar, route layouts, Portfolio drawer seat inset, simulation palette, or ball materials.
- No new crisp line/border effect in this pass.
- No broad deletion of all legacy wall-renderer compatibility fields.
- No replacement of Canvas 2D or the current physics engine.
- No commit or push unless separately requested.

## Verification Matrix

| Dimension | Required states |
| --- | --- |
| Viewport | 320, 340/341, 351×933, 390, 480, 599/600/601, 767/768, 991, 1273×1326, 1440px |
| Browser | Chromium, WebKit |
| Theme | Light, dark |
| DPR | 1 and 2 |
| Corner shape | Squircle on/off where supported; fallback engine path |
| Route | Home, Portfolio, About Me, Contact |
| Home simulation | Deterministic Ball Field/Pit |
| Geometry | wall = Canvas CSS = visual clip = pit shadow = rim; collision independently inset |
| Shell | Button Bar remains below window with no overlap |

Required commands:

```bash
npm run check:site
npm run audit:canvas-spa
npm run audit:palette-surface-contract
ABS_BROWSER=chromium npm run audit:theme-wall-invariance
ABS_BROWSER=webkit npm run audit:theme-wall-invariance
ABS_BROWSER=chromium npm run audit:outer-wall-frame
ABS_BROWSER=webkit npm run audit:outer-wall-frame
ABS_BROWSER=chromium npm run audit:theme-consistency
ABS_BROWSER=webkit npm run audit:theme-consistency
npm run certify:screens
npm run build
npm run preview
```

Development behavior is verified at `http://localhost:8012`. Production behavior is verified from a separately started preview at `http://localhost:8013`, without panel interaction. The final browser review must inspect screenshots rather than relying on command exit status alone.

### Required control round trip

1. Change collision inset, pit blur, pit spread, pit offset, rim light, top shadow, and rim reach in the development panel.
2. Confirm live values plus visual/collision independence.
3. Save and inspect canonical `design-system.json`; removed keys must remain absent.
4. Reload port 8012 and compare values.
5. Run flatten/config parity and build.
6. Start preview separately on port 8013 and confirm the same geometry and values without panel interaction.
7. Restore the approved canonical baselines and repeat parity.

### Diagnostic visual probes

- Temporarily set pit-shadow and rim opacity to zero through runtime diagnostics. The window surface must remain continuous to the Canvas edge with no black annulus.
- Restore authored effects and verify they paint on the exact wall perimeter.
- Test collision inset at 0px, the 10px baseline, and 24px. From 0→24px, collision x/y must increase by 24 CSS px, width/height must decrease by 48 CSS px, and collision radius must decrease by 24 CSS px subject only to safety clamping; all visual deltas remain ≤0.5 CSS px.
- Capture and inspect supplied-evidence dimensions near 351×933 and 1273×1326.

## Success Metrics

- Zero visual geometry deltas above 0.5 CSS px between the wall, Canvas, pit shadow, and rim at tested viewports.
- Collision inset changes produce zero visual geometry delta and preserve the authored CSS-pixel value across breakpoints.
- No black inner annulus in approved screenshots.
- No Button Bar/window overlap at the required mobile boundaries.
- Canonical save/reload/build/preview round trip preserves every active value.
- All required gates pass without new warnings attributable to this work.

## Risks and Mitigations

- **Rounded-corner Canvas bleed:** use the CSS wall/Canvas clips that share the active corner shape and verify WebKit screenshots.
- **Squircle mismatch:** never place a circular Canvas 2D clip beneath a CSS squircle; verify supported and fallback engines.
- **Stale collision bounds after control edits:** force geometry refresh and reconcile active bodies.
- **Mode-specific behavior drift:** migrate all direct inset consumers together and run Canvas SPA/mode audits.
- **Portfolio finish drift:** preserve its explicit shadow suppression and verify its rim separately.

## Implementation Outcome — 2026-07-13

Status: **Complete and verified.** The visual wall now has one CSS-owned perimeter; collision clearance is a separate physics-only value. The abandoned line effect, duplicate Canvas clip, visual inset aliases, active frame-border geometry, and dead outer-cast-shadow path have been removed.

Three independent audit lanes reviewed the CSS/layer cascade, Canvas/physics geometry, and config/control lifecycle before implementation. All three then reviewed this PRD; their findings were incorporated into the parameter inventory, breakpoint matrix, retirement boundary, and verification plan.

Verification completed:

- `npm run check:site`
- `npm run audit:canvas-spa` — 17 snapshots and eight Home↔Portfolio round trips
- `npm run audit:palette-surface-contract`
- `ABS_BROWSER=chromium npm run audit:theme-wall-invariance`
- `ABS_BROWSER=webkit npm run audit:theme-wall-invariance`
- `ABS_BROWSER=chromium npm run audit:outer-wall-frame`
- `ABS_BROWSER=webkit npm run audit:outer-wall-frame`
- `ABS_BROWSER=chromium npm run audit:theme-consistency`
- `ABS_BROWSER=webkit npm run audit:theme-consistency`
- `npm run certify:screens` — 16/16 route, theme, and representative viewport states
- Production preview geometry matrix on port 8013 in Chromium and WebKit

The focused wall audit covers 320, 340, 341, 351×933, 390, 480, 599, 600, 601, 767, 768, 991, 1273×1326, and 1440px; light/dark; DPR 1/2; collision insets 0/10/24; and same-page breakpoint/orientation resizing. Inspected final screenshots are under `output/playwright/wall-rim-final/`, including the supplied 351×933 and 1273×1326 evidence sizes plus the collision and rim control panels.
- **Responsive radius drift:** remove inline radius ownership after entrance and test resize/orientation transitions.
- **Audit false confidence:** update assertions before accepting green results and inspect artifacts.

## Open Questions

None. The implementation baseline is a 10px physics-only collision inset and no crisp line effect.
