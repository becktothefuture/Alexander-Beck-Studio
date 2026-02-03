# PRD: Wall Micro-Details (AO & Specular Bevel)

## 1. Introduction/Overview
Enhance the visual fidelity of the double-wall system by adding two micro-details: **Ambient Occlusion (AO)** and a **Specular Micro-Bevel**. These additions aim to increase the "tactility" and realism of the interface by simulating physical light interactions—grounding the inner wall with contact shadows and sharpening the outer wall with machined-edge highlights.

## 2. Goals
- **Ground the Inner Wall:** Add a soft, non-directional shadow (AO) in the gap between walls.
- **Sharpen the Outer Wall:** Add a crisp 0.5px specular highlight on the inner edge of the outer wall border.
- **Full Configurability:** Provide detailed controls in the "Visuals" panel for tuning opacities, sizes, and colors.
- **Theme Awareness:** Ensure both effects adapt naturally to Light and Dark modes.

## 3. User Stories

### US-001: Implement Ambient Occlusion (AO) Pass
**Description:** As a user, I want to see a soft shadow where the inner wall meets the gap floor, so the inner wall feels grounded rather than floating.

**Acceptance Criteria:**
- [ ] Add AO element/shadow to `.outer-wall` (or pseudo-element) that darkens the area adjacent to the inner wall.
- [ ] AO is non-directional (visible on all sides).
- [ ] Configurable parameters: Opacity (Light/Dark), Spread/Size.
- [ ] Typecheck/lint passes.
- [ ] Verify in browser: AO appears as a subtle contact shadow in the gap.

### US-002: Implement Specular Micro-Bevel
**Description:** As a user, I want to see a razor-sharp highlight on the "lit" edges of the outer wall, so it looks like a precision-machined material.

**Acceptance Criteria:**
- [ ] Add a 0.5px-1px crisp highlight to the inner edge of `.outer-wall`.
- [ ] Highlight is **directional** (visible primarily on top/bottom edges based on light source).
- [ ] Configurable parameters: Opacity (Light/Dark), Width (0.5px-2px).
- [ ] Typecheck/lint passes.
- [ ] Verify in browser: Highlight catches light on appropriate edges.

### US-003: Update Configuration & State
**Description:** As a developer, I need to store the new micro-detail settings in the global state so they persist and can be tuned.

**Acceptance Criteria:**
- [ ] Add AO properties to `default-config.json` and `state.js` (`wallAOOpacityLight`, `wallAOOpacityDark`, `wallAOSpread`).
- [ ] Add Specular properties to `default-config.json` and `state.js` (`wallSpecularOpacityLight`, `wallSpecularOpacityDark`, `wallSpecularWidth`).
- [ ] Ensure state initialization handles defaults correctly.
- [ ] Typecheck passes.

### US-004: Add Controls to Visual Panel
**Description:** As a designer, I want sliders for these new features in the settings panel so I can fine-tune the look in real-time.

**Acceptance Criteria:**
- [ ] Add "Micro-Details" section to "Wall" tab in Control Panel.
- [ ] Sliders for AO: Opacity (Light/Dark), Spread.
- [ ] Sliders for Specular: Opacity (Light/Dark), Width.
- [ ] Changes reflect immediately in the UI.
- [ ] Verify in browser: Sliders update the wall appearance instantly.

## 4. Functional Requirements

- **FR-1:** AO must be implemented using `box-shadow` (inset) or a masked pseudo-element on `.outer-wall` to avoid layout shifts.
- **FR-2:** Specular bevel must use a crisp (0 blur) `box-shadow` or `border` approach for maximum sharpness.
- **FR-3:** Both effects must respect the current `wall-radius` automatically.
- **FR-4:** All new colors/opacities must be CSS variables updated by JS.
- **FR-5:** "Lit" edges for specular bevel: Bottom edge for Outer Wall (matching its "recessed" lighting model).

## 5. Non-Goals (Out of Scope)
- **Dynamic Lighting:** The light source will not follow the mouse cursor (static top-down/bottom-up model).
- **Texture/Noise:** We are NOT implementing surface noise/grain in this pass (that is a separate potential enhancement).
- **Mobile-Specific Logic:** These details will simply scale or persist on mobile; no separate mobile-only implementation logic required unless performance dictates otherwise.

## 6. Technical Considerations
- **Performance:** Use `box-shadow` and `opacity` changes which are GPU-friendly. Avoid heavy SVG filters or layout-thrashing properties.
- **Z-Index:** Ensure AO sits *behind* the inner wall but *above* the outer wall background.
- **CSS Variables:** Stick to the established pattern: Config -> State -> JS Update -> CSS Variable -> UI.

## 7. Success Metrics
- **Visual Quality:** The wall system looks "premium" and "tactile" without feeling cluttered.
- **Performance:** No drop in FPS (still 60fps).
- **Customizability:** Every aspect of the new details can be tuned or disabled via the panel.

## 8. Open Questions
- *None at this stage.*
