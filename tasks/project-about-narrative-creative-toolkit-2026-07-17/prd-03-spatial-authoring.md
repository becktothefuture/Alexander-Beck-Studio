# PRD 03: About Narrative Spatial Authoring

## 1. Introduction

Provide clearer control over camera movement and procedural Worlds without exposing renderer internals or requiring Blender. The author should be able to understand camera cadence, adjust framing at the playhead, and reuse World recipes while retaining one Three.js renderer and continuous story travel.

## 2. Goals

- Make Camera speed, orientation, and lens changes legible across Section boundaries.
- Allow direct framing adjustments that remain temporary until explicitly keyed.
- Save and reuse complete World recipes without affecting unrelated tracks.
- Preserve camera continuity, World compatibility checks, and the current runtime budget.

## 3. User Stories

### US-301: Inspect camera motion

**Description:** As the author, I want to see how Camera properties change across story time so I can identify jumps and uneven movement.

**Acceptance Criteria:**
- [ ] The selected Camera track shows one compact SVG graph with selectable series for forward speed, angular velocity, FOV, and roll.
- [ ] Graphs use samples from the compiled Camera plan rather than separate authored data.
- [ ] Section boundaries and Camera keys are visible on the graphs.
- [ ] Hovering or scrubbing reports the sampled WU and value.
- [ ] Graphs do not animate, rotate, or shift on hover.
- [ ] Verify in browser using dev-browser skill.

### US-302: Adjust framing at the playhead

**Description:** As the author, I want to adjust Camera offset and aim directly in the viewport before deciding whether to save a key.

**Acceptance Criteria:**
- [ ] Camera View exposes a screen-space Frame pad for X/Y Camera offset and an Aim pad for X/Y look-at offset.
- [ ] Director View remains inspection-only and visually distinct.
- [ ] Unkeyed changes are temporary and show `Set camera key` and `Revert` actions.
- [ ] Setting a key inserts a valid key between neighbouring keys.
- [ ] Reverting restores the compiled published Camera exactly.
- [ ] Verify in browser using dev-browser skill.

### US-303: Surface camera continuity warnings

**Description:** As the author, I want explicit warnings for unwanted motion jumps so I can inspect the affected WU before using the shared diagnostic tools in PRD 04.

**Acceptance Criteria:**
- [ ] Existing diagnostics identify forward-speed, angular-velocity, FOV, and roll discontinuities in the Camera panel.
- [ ] Clicking a warning seeks to the affected WU.
- [ ] Camera repair commands are provided by PRD 04 rather than duplicated here.
- [ ] Protected base cadence remains locked unless advanced mode is deliberately enabled.
- [ ] Verify in browser using dev-browser skill.

### US-304: Save a World preset

**Description:** As the author, I want to save a successful procedural environment so I can reuse it elsewhere in the narrative.

**Acceptance Criteria:**
- [ ] `Save as preset` captures the selected World's adapter, Shape, seed, transform, entry distance, transition, and modifiers.
- [ ] Presets have a stable ID, label, `scope: 'world'`, and optional description.
- [ ] Presets appear in a named list with derived cost and compatibility badges.
- [ ] Saving a preset creates one Undo entry and marks the document dirty.
- [ ] Verify in browser using dev-browser skill.

### US-305: Try and apply a World preset

**Description:** As the author, I want to audition a saved environment without changing Camera or copy.

**Acceptance Criteria:**
- [ ] Try mode previews the preset at the current playhead.
- [ ] Apply changes only the selected World configuration.
- [ ] Camera, Text, Section timing, and Interaction remain byte-equivalent.
- [ ] Incompatible adapters or transitions block Apply with an explanation.
- [ ] Failure retains the last valid World.
- [ ] Verify in browser using dev-browser skill.

## 4. Functional Requirements

- FR-301: Camera graphs must be derived from fixed-interval compiled-plan samples and must not add authored keyframes.
- FR-301A: The selected Section is sampled at exactly 48 evenly spaced points.
- FR-302: Graph rendering must be DOM/SVG and must not create another Three.js renderer or RAF loop.
- FR-303: Temporary framing must remain runtime-only until `Set camera key` is selected.
- FR-304: New Camera keys must use existing interpolation and boundary-stitching rules.
- FR-305: Camera warnings must reuse compiler diagnostics; repair previews belong to PRD 04.
- FR-306: World presets must live in `document.library.presets` and remain schema-versioned.
- FR-307: A World preset must not include Camera, Text, Interaction, or Section extent.
- FR-308: Preset Apply must preserve the selected World's stable clip ownership.
- FR-309: Adapter and transition capabilities must be checked before preview and Apply.
- FR-310: Renderer internals, clip planes, DPR, point budget, and shader source remain protected code settings.
- FR-311: All added visual overlays must pause or simplify in reduced-motion mode where appropriate.
- FR-312: Runtime-only `cameraPreview` stores temporary playhead framing and must not dirty the document.
- FR-313: `Set camera key` commits the sampled preview through the existing insertion, sorting, and Camera-boundary logic; `Revert` clears it.
- FR-314: World presets use the top-level document schema version and the contract `{ id, label, scope: 'world', world }`.
- FR-315: A World preset's `world` may contain only adapter, Shape, seed, entry distance, transform, transition, Shape parameters, and modifiers.
- FR-316: Existing `scope: 'sequence'` presets must remain valid.

## 5. Non-Goals

- A freeform Bézier curve editor or charting dependency.
- Multiple cameras or shot switching.
- Per-point editing.
- Node-based shaders or arbitrary scripts.
- Importing Blender scenes in this PRD.
- Saving Director View as published framing.
- Projection-aware 3D gizmos, object picking, or editable viewport axes.
- Preset search until the local library exceeds ten World presets.

## 6. Design Considerations

- Graphs should read as precise instruments within the bespoke editor palette, not generic analytics charts.
- Show only the selected Camera track's detail; keep the full timeline compact.
- Viewport handles must remain legible without obscuring narrative copy.
- Preset cards prioritise name, Shape, modifier count, and performance cost.

## 7. Technical Considerations

- Reuse compiled camera samplers and current camera-continuity diagnostics.
- Use one lightweight SVG path implementation generated only when the document or selected range changes.
- Extend the existing preset library structure rather than creating a second file.
- Use the current adapter and Shape registries as the source of compatibility metadata.
- Do not create a second adapter-capability negotiation layer.
- Preserve asynchronous Shape preparation, AbortSignal ownership, and last-valid-buffer fallback.

## 8. Success Metrics

- A Camera jump can be located by WU, preview-repaired, and applied without breaking adjacent Sections.
- A new framing key can be created from the viewport in three deliberate actions or fewer.
- A World preset can replace a middle World while Camera and Text remain byte-equivalent.
- No added renderer, canvas, RAF loop, or per-frame allocation hotspot.

## 9. Open Questions

None. Product decisions are locked in this PRD.
