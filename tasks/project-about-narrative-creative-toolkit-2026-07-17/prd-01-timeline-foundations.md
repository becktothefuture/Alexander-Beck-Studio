# PRD 01: About Narrative Timeline Foundations

## 1. Introduction

Make the timeline directly editable without changing the current playback architecture. The user must be able to shorten or lengthen Sections, select and move several title Cues together, zoom into timing detail, and select Cues with a marquee. Gestures must be predictable, cancelable, undoable, and safe around Section boundaries.

## 2. Goals

- Make Section scroll length visible and adjustable from the timeline and inspector.
- Add Shift-based Text Cue multi-selection and group movement.
- Provide smooth zoom, pan, fit, and marquee interactions.
- Ensure every completed gesture creates one history entry and every canceled gesture restores the starting state.
- Preserve the current canonical document, compiler, and single-runtime model.

## 3. User Stories

### US-101: Resize a Section from the timeline

**Description:** As the author, I want to drag a Section boundary so I can shorten Intro or give another scene more scroll space.

**Acceptance Criteria:**
- [ ] Every unlocked Section has a dedicated right-edge resize handle in the Sections lane.
- [ ] Dragging changes `extentWU` for Desktop and `mobileExtentWU` for Mobile.
- [ ] The handle shows live scroll travel and total Section extent.
- [ ] Cue, Camera, World, and Interaction values remain at the same local percentages.
- [ ] Later Sections move automatically when the Section length changes.
- [ ] Undo restores the previous length in one step.
- [ ] Verify in browser using dev-browser skill.

### US-102: Edit exact Section timing

**Description:** As the author, I want clear numeric controls so I understand the relationship between visible viewport height and usable scroll travel.

**Acceptance Criteria:**
- [ ] The inspector uses the labels `Scroll travel`, `Total Section height`, `Desktop length`, and `Mobile length`.
- [ ] `Scroll travel` is displayed as `extentWU - 1`.
- [ ] The context bar shows both scroll travel and total extent for the selected Section.
- [ ] Editorial Sections show authored and resolved extent separately.
- [ ] When measured content is taller than authored extent, the UI displays `Content minimum in effect` and playback remains content-driven.
- [ ] Double-clicking the timeline handle restores the last saved length.
- [ ] Verify in browser using dev-browser skill.

### US-103: Preserve playhead context while resizing

**Description:** As the author, I want the preview to stay on the same narrative moment when I resize a Section.

**Acceptance Criteria:**
- [ ] If the playhead is inside the resized Section, its local percentage is preserved.
- [ ] If the playhead is in a later Section, that Section and local percentage are preserved.
- [ ] If the playhead is before the resized Section, its WU remains unchanged.
- [ ] Resizing never causes an unexpected scroll jump after pointer release.
- [ ] Verify in browser using dev-browser skill.

### US-104: Select and move several title Cues

**Description:** As the author, I want to Shift-select titles and move them together so I can refine narrative rhythm without rebuilding it one Cue at a time.

**Acceptance Criteria:**
- [ ] Shift-click and Shift-Space add or remove spatial and vertical title Cues from selection.
- [ ] Selected Cues may span Sections.
- [ ] The primary Cue is visually stronger than secondary selected Cues.
- [ ] Dragging any selected Cue moves the complete group while preserving global WU spacing.
- [ ] Every Cue remains in its original Section.
- [ ] The group stops when any member reaches its Section boundary.
- [ ] Cue motion envelopes and global title duration are unchanged.
- [ ] One Undo restores the complete group movement.
- [ ] Verify in browser using dev-browser skill.

### US-105: Zoom, pan, and fit the timeline

**Description:** As the author, I want to zoom into a busy Section and return to the whole story quickly.

**Acceptance Criteria:**
- [ ] Trackpad or modified-wheel input zooms around the pointer position.
- [ ] Horizontal scrolling pans the visible WU range.
- [ ] `Fit Sequence` and `Fit Section` controls are available.
- [ ] Zoom and pan are runtime-only editor state.
- [ ] The playhead, clip widths, drag math, and hit areas remain aligned at every zoom level.
- [ ] Verify in browser using dev-browser skill.

### US-106: Marquee-select title Cues

**Description:** As the author, I want to draw a selection rectangle over title markers so I can select a sequence quickly.

**Acceptance Criteria:**
- [ ] Pointer-dragging on empty Text-lane space creates a marquee.
- [ ] Intersecting title Cues become selected.
- [ ] Shift adds or removes from the current selection.
- [ ] Editorial blocks and Discipline reveal clips are not included.
- [ ] Verify in browser using dev-browser skill.

### US-107: Cancel and undo gestures safely

**Description:** As the author, I want complex drags to behave as one operation so experimentation is safe.

**Acceptance Criteria:**
- [ ] Pointer cancellation and Escape restore the document and transport state captured at preview start.
- [ ] A completed continuous drag creates one named history command.
- [ ] Compilation is limited to at most once per animation frame during a gesture.
- [ ] Invalid candidate documents never replace the last-known-good runtime plan.

## 4. Functional Requirements

- FR-101: Keep `extentWU` and `mobileExtentWU` as the saved Section-length fields.
- FR-102: Interpret authored scroll travel as `max(0, extentWU - 1)`.
- FR-103: Section resizing must edit only the active Desktop or Mobile preview profile.
- FR-103A: Reduced-motion preview edits `extentWU`; it does not introduce a third Section-length field.
- FR-104: Section extent must remain between `1` and `8 WU`.
- FR-105: Existing normalized Camera, World, Text, and Interaction timings must not be rewritten during Section resizing.
- FR-106: Selection must retain a backward-compatible primary item and an optional list of selected Cue members.
- FR-107: Selection, zoom, pan, marquee, and gesture state must remain editor-only.
- FR-108: Group Cue movement must be calculated in global WU and converted back to local Section progress.
- FR-109: Group movement must use the intersection of every Cue's valid movement range.
- FR-110: Section resize, Cue move, and marquee selection must use shared snapping and cancellation behavior.
- FR-111: Timeline geometry must be derived from the compiled plan at the current preview profile.
- FR-112: Dense timeline manipulation remains disabled below the existing compact editor breakpoint.
- FR-113: Double-click reset must read the corresponding extent from `snapshot.baselineDocument`.
- FR-114: Section resizing must preserve semantic playhead context as `{ sectionId, localProgress }` and then derive the new WU.
- FR-115: The protected finale cannot be resized until advanced unlock.

## 5. Non-Goals

- Moving a Cue into a different Section.
- Resizing an individual title's motion envelope.
- Multi-selecting mixed Camera, World, Text, and Interaction objects.
- A general curve editor.
- Marquee edge autoscroll in v1.
- Persisting editor layout or selection into production configuration.

## 6. Design Considerations

- Keep the timeline's bespoke dark editor palette.
- Use distinct resize, selection, and marquee states without borrowing website accent colors.
- Resize handles must not compete with Section selection or future reorder handles.
- Show WU and human-readable labels together; do not expose only raw data names.
- Maintain keyboard focus indicators and descriptive ARIA labels.

## 7. Technical Considerations

- Extend the current command store with `beginPreview`, `updatePreview`, `commitPreview`, and `cancelPreview`; do not add a gesture framework or state-machine dependency.
- Throttle pointer-driven `updatePreview` calls with one component-local `requestAnimationFrame`.
- Reuse `aboutNarrativeTimeline.js` for pure timing and clamping calculations.
- Use the existing `transport.zoom` and native timeline `scrollLeft`; zoom changes the lanes' internal minimum width.
- `Fit Sequence` sets zoom to `1`; `Fit Section` derives zoom and native scroll position from the compiled Section span.
- Keep React updates throttled and keep RAF playback imperative.
- Preserve the current compiler's last-known-good behavior.

## 8. Success Metrics

- Intro can be changed from `1.7` to `1.35 WU` in one drag with no discontinuity.
- Three selected Cues can be repositioned in one gesture and one Undo.
- Timeline hit areas remain aligned from Fit Sequence through the maximum supported zoom.
- No production editor leakage and no regression in exact-WU playback samples.

## 9. Open Questions

None. Product decisions are locked in this PRD.
