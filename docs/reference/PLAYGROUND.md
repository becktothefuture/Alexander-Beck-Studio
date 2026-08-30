# Work canvas engine

## Naming boundary

`src/routes/playground/` and the `playground` design-config namespace are historical internal names for the spatial engine now used by Work. They are retained to avoid a risky simultaneous source, import, generated-config, and persistence migration.

There is no public Lab route or Lab Button Bar tab. `/playground.html` and `/playground` are compatibility aliases for `/portfolio.html`; they render Work and select the Work tab. `PlaygroundRoute.jsx` and `PlaygroundComingSoon.jsx` are obsolete public-route wrappers and must not be restored.

Use **Work** in user-facing copy, accessibility labels, documentation, and audit output. Use `playground` only when referring to the internal source/config contract.

## Engine ownership

| Concern | Source |
| --- | --- |
| Work composition and React lifecycle | `PlaygroundExperience.jsx` with `experience="work"` |
| Authored spatial defaults and normalization | `config/playgroundConfig.js` |
| Development control schema and save path | `config/playgroundPanel.js` |
| Camera and input | `spatial/cameraController.js`, `spatial/cameraMath.js` |
| Placement and world copies | `spatial/placement.js`, `spatial/world.js`, `spatial/copyCoverage.js` |
| Responsive projection | `spatial/responsiveProfile.js` |
| Three-layer dot field | `spatial/dotFieldRenderer.js` |
| Media runtimes | `media/` |
| Unified Work adapter | `../portfolio/work/workCatalog.js` |

React owns catalogue loading, semantic markup, selection, overlay state, focus, history, and disposal. The camera and Canvas renderer own high-frequency motion outside React state.

## Placement contract

Placement is deterministic. It uses item identity, placement order, preferred span, optional case-study anchor, layout preset, spacing, responsive projection, and `layoutSeed`. Explicit case-study anchors are attempted first; the bounded placement search remains the collision-safe fallback. The title lockup retains its exclusion area.

The authored world is finite and grid-quantized. Visual copies provide unbounded exploration without cloning semantic content or media ownership. Existing positions are append-stable only while earlier placement inputs remain unchanged. Changing an ID, order, span, anchor, scale, label footprint, preset, or seed requires complete desktop/mobile field review.

Do not regenerate the seed during routine content editing. Use **Generate new seed** only for a deliberate full-field recomposition, review the complete field, and save it through the canonical design-configuration flow.

## Camera and input

- Pointer/touch drag pans directly; release uses filtered velocity and bounded momentum.
- Wheel and trackpad input ease toward a logical target.
- Arrow keys and WASD pan when the world owns focus.
- Roving item navigation chooses the nearest item in the requested direction and uses `camera.animateTo()` to centre it.
- `Home` recentres the title.
- Ctrl-wheel and Command-wheel remain browser zoom; the route adds no application zoom.
- Pointer work is frame-coalesced, and camera plus foreground/dot layers consume the same committed sample before paint.
- `animateTo()` is cancellable. New user input, a superseding item, route teardown, or unmount must stop stale centering work.

Narrow viewports use one derived responsive profile. It scales the same world, keeps input direct, preserves readable captions, and does not create a second saved mobile configuration.

## Depth field

The Work background consists of three deterministic neutral dot layers with parallax factors `0.16`, `0.34`, and `0.58`. The renderer:

- caps the combined visible dot count at 1,800;
- calibrates CSS axes independently so dots remain circular at fractional sizes and high DPR;
- redraws on camera, size, DPR, or theme changes;
- sleeps when the field is unchanged;
- does not react to hover;
- resolves Reduced Motion to the same static geometry without ambient drift.

Do not replace the depth field with thousands of DOM nodes, a continuously drifting background, a CSS box-shadow texture, or an unbounded full-world Canvas draw. The parallax response should be felt during navigation without competing with the work.

## Authoring controls

The docked and detached development panels use one schema. Open the normal panel with the settings launcher; Shift-click opens the detached host. Controls are grouped under Composition, Dot field, Motion, Actions, and Diagnostics.

The canonical `playground` namespace owns deterministic layout, item scale/variation, dot appearance, wheel response, and drag momentum. Live changes are provisional. **Save design configuration** sends a normalized snapshot through the existing canonical authoring flow; when the write-capable endpoint is unavailable, it downloads JSON. Diagnostics and `window.__ABS_PLAYGROUND_CONFIG__` are output/helpers, never authored truth.

The panel name and internal namespace may remain `playground` until a separately approved migration can prove live apply, canonical save, reload, flattening, preview, and backwards compatibility. Do not hand-edit generated configuration files.

## Media boundary

Snippet image, video, and local-code previews keep the established poster-first ownership. Only the selected logical item may own active video or code. A video reveals after its first presented frame and stops when ownership ends. Code previews use bounded local `srcDoc` renderers with `sandbox="allow-scripts"`; do not add remote embeds or `allow-same-origin`.

The old asset-only `PlaygroundLightbox` remains compatibility code while Work uses `WorkSnippetStage`. Do not reintroduce a pop-in lightbox as the public opening behavior.

## Verification

Run from the repository root:

```bash
npm run check:work-canvas
ABS_BROWSER=chromium npm run audit:work-canvas
ABS_BROWSER=webkit npm run audit:work-canvas
```

The `check:playground` and `audit:playground` commands are compatibility aliases for the Work checks. The canonical browser audit must prove route aliases, four-tab navigation, hierarchy, input/wrapping, deterministic depth layers, bounded/sleeping renderer, input-to-next-paint and render-tail ceilings, centre-before-expand order, protected gate behavior, case-study drawer, snippet stage, URL/Back, focus return, mobile, themes, Reduced Motion, and error-free cleanup.
