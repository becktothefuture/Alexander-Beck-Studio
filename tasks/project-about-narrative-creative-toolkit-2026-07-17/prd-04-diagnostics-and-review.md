# PRD 04: About Narrative Diagnostics and Review

## 1. Introduction

Close the authoring loop with actionable diagnostics, repeatable cross-profile review, and visual checkpoints. The editor must help the author find problems without silently fixing creative decisions or running several live renderers at once.

## 2. Goals

- Make validation and runtime warnings understandable and actionable.
- Compare the same story moment across Desktop, Mobile, and Reduced motion.
- Record lightweight visual checkpoints for safe experimentation.
- Preserve production isolation and the one-renderer invariant.

## 3. User Stories

### US-401: Understand a diagnostic

**Description:** As the author, I want every warning to identify the affected object and explain the practical consequence.

**Acceptance Criteria:**
- [ ] Diagnostics expose severity, code, document path, message, affected WU, and optional fix ID.
- [ ] Selecting a diagnostic moves the playhead and selects the affected object when possible.
- [ ] Diagnostics are grouped into Text, Camera, World, Layout, Performance, and Accessibility.
- [ ] Hard errors block Apply and Save; warnings do not silently modify work.
- [ ] Verify in browser using dev-browser skill.

### US-402: Preview a suggested fix

**Description:** As the author, I want to see a proposed repair before accepting it.

**Acceptance Criteria:**
- [ ] Supported diagnostics expose `Preview fix`.
- [ ] The preview uses Try/Apply/Cancel and remains one Undo entry after Apply.
- [ ] The UI describes exactly which authored values will change.
- [ ] Unsupported diagnostics provide guidance without a fake automatic action.
- [ ] Verify in browser using dev-browser skill.

### US-403: Review the same moment across profiles

**Description:** As the author, I want to compare one WU across the important playback profiles without manually rebuilding the state.

**Acceptance Criteria:**
- [ ] Review mode provides Desktop, Mobile, and Reduced-motion profile buttons.
- [ ] Switching profiles maps the same semantic Section and local percentage into the target compiled plan.
- [ ] Only one profile is live at a time through the existing renderer.
- [ ] Exiting Review restores the original profile, playhead, transport owner, and ambient setting.
- [ ] Verify in browser using dev-browser skill.

### US-404: Create a visual checkpoint

**Description:** As the author, I want a named visual checkpoint so I can experiment and return to a known state.

**Acceptance Criteria:**
- [ ] A checkpoint stores name, timestamp, playhead, profile, base hash, and authored document.
- [ ] Checkpoints are development-only and stored outside the production document.
- [ ] Restore loads the checkpoint as an unsaved copy rather than overwriting the source file.
- [ ] Delete and rename are supported.
- [ ] Storage quota errors are visible and do not lose the current document.
- [ ] Verify in browser using dev-browser skill.

### US-405: Inspect performance pressure

**Description:** As the author, I want the editor to identify expensive combinations before they become playback problems.

**Acceptance Criteria:**
- [ ] Diagnostics use existing runtime metrics for frame time, draw calls, point count, modifier count, and buffer rebuilds.
- [ ] Sustained warnings identify the active World and list its active modifiers without claiming per-modifier causality.
- [ ] Performance warnings remain advisory and do not change protected budgets.
- [ ] Verify in browser using dev-browser skill.

## 4. Functional Requirements

- FR-401: Diagnostics retain `level`, `code`, `path`, and `message`, with optional `storyWU`, `selection`, `fixId`, and `data`; UI category is derived from code/path.
- FR-402: Existing schema and compiler diagnostics must be adapted into the shared structure without changing their validation meaning.
- FR-403: Fixes must be registered code commands; JSON must never provide executable behavior.
- FR-404: Diagnostic selection must never create authored data.
- FR-405: Review mode must map the current Section ID and local percentage into every profile's compiled plan.
- FR-406: Review is a sequential live profile carousel using the existing renderer; it does not capture screenshots.
- FR-407: Live ambient time must be disabled during deterministic profile review unless explicitly re-enabled.
- FR-408: Checkpoints must remain in development storage and be capped at 12 entries.
- FR-409: The serialized checkpoint collection must enforce a documented byte cap in addition to its 12-entry cap.
- FR-410: The editor must continue operating when checkpoint storage fails.
- FR-411: Production builds must contain no editor review UI, checkpoint thumbnail code, or save endpoint strings.
- FR-412: Runtime performance warnings require several consecutive 500ms samples above threshold and never block Save.
- FR-413: Camera diagnostic fixes include Match previous endpoint, Bridge to next Section, and safe authored-cadence normalization.

## 5. Non-Goals

- Multi-user collaboration.
- Cloud checkpoint storage.
- Automated visual approval.
- Multiple simultaneous WebGL renderers.
- Composited review stills and checkpoint thumbnails in v1.
- Automatic performance-budget changes.
- Treating a warning as a mandatory creative correction.

## 6. Design Considerations

- Diagnostics should prioritise the affected moment and recommended author action over technical stack traces.
- Review uses a compact three-profile switcher with the active profile and semantic location clearly labelled.
- Error, warning, and information colors remain within the editor palette and meet contrast requirements.

## 7. Technical Considerations

- Extend the existing compiler diagnostic objects and editor diagnostics panel.
- Implement fixes as a small registry of pure document mutations.
- Reuse the existing checkpoint storage layer and add rename, delete, count, and byte caps.
- Implement supported fixes with a small code-owned map rather than a plugin framework.
- Audit the production bundle for editor-only strings and modules.

## 8. Success Metrics

- Clicking a diagnostic reliably opens the affected Section at the relevant WU.
- A fix can be previewed and canceled without dirtying the document.
- Desktop, Mobile, and Reduced-motion stills correspond to the same narrative moment.
- Twelve checkpoints remain below the defined development-storage cap.
- Production asset audits find no authoring leakage.

## 9. Open Questions

None. Product decisions are locked in this PRD.
