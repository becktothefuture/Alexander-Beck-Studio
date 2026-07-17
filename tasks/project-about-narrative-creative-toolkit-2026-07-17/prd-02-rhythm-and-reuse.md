# PRD 02: About Narrative Rhythm and Reuse

## 1. Introduction

Build focused editorial timing tools on top of PRD 01. The author should be able to balance selected titles, audition a boundary repeatedly, and reuse authored material without hand-editing JSON. These tools must remain constrained to the About Narrative model rather than becoming a generic timeline application.

## 2. Goals

- Turn common rhythm corrections into explicit previewable commands.
- Make transitions and selected ranges easy to loop and inspect.
- Support safe duplication and copy/paste of the authored building blocks used by this editor.
- Preserve stable IDs, Section ownership, and schema validity.

## 3. User Stories

### US-201: Distribute selected titles

**Description:** As the author, I want to distribute selected titles evenly so the narrative does not contain accidental gaps or rushed clusters.

**Acceptance Criteria:**
- [ ] A Rhythm panel appears when two or more title Cues are selected.
- [ ] Actions include `Distribute evenly`, `Set exact gap`, and `Align primary to playhead`.
- [ ] Operations preview before changing the authored document.
- [ ] Apply creates one Undo entry and Cancel restores the original arrangement.
- [ ] Operations preserve title duration and original Section ownership.
- [ ] Verify in browser using dev-browser skill.

### US-202: Set an exact narrative gap

**Description:** As the author, I want an exact WU gap between selected titles so I can establish repeatable pacing.

**Acceptance Criteria:**
- [ ] The Rhythm panel accepts a WU gap value.
- [ ] The primary Cue acts as the anchor unless `Anchor first` or `Anchor last` is chosen.
- [ ] The preview reports when Section boundaries prevent the requested gap.
- [ ] Apply is disabled when no valid arrangement exists.
- [ ] Verify in browser using dev-browser skill.

### US-203: Audition a Section boundary

**Description:** As the author, I want to loop around a Section or selected clip boundary so I can judge continuity without repeatedly scrubbing back.

**Acceptance Criteria:**
- [ ] The author can loop a Section, selected Cue group, World transition, or Camera key boundary.
- [ ] Loop creation exposes pre-roll and post-roll in WU and folds them into the final loop range.
- [ ] Scrub audition freezes ambient time by default.
- [ ] `Live ambient` remains an explicit opt-in.
- [ ] Wheel or touch input stops automatic timeline playback.
- [ ] Verify in browser using dev-browser skill.

### US-204: Duplicate a title or Section

**Description:** As the author, I want to duplicate useful authored material without introducing broken IDs or references.

**Acceptance Criteria:**
- [ ] Duplicate is available for a Cue, selected Cue group, and unlocked non-finale Section.
- [ ] Duplicates receive deterministic unique IDs based on the source ID.
- [ ] Duplicated Sections remap IDs and internal references within the copy.
- [ ] Protected finale behavior is not duplicated accidentally.
- [ ] One Undo removes the entire duplicate operation.
- [ ] Verify in browser using dev-browser skill.

### US-205: Copy and paste authored material

**Description:** As the author, I want to copy reusable material between compatible places in the narrative.

**Acceptance Criteria:**
- [ ] Copy stores a versioned `cue-group` editor clipboard payload.
- [ ] Paste performs capability and schema validation before Apply.
- [ ] Incompatible destinations explain the reason and remain unchanged.
- [ ] Paste at playhead positions copied Cues relative to the playhead in the selected destination Section.
- [ ] Clipboard data is not saved into `contents-about.json`.
- [ ] Verify in browser using dev-browser skill.

## 4. Functional Requirements

- FR-201: Rhythm operations must consume the PRD 01 multi-selection model.
- FR-202: Rhythm preview must use the existing Try/Apply/Cancel workflow.
- FR-203: Rhythm calculations must operate in global WU and return local Section timings.
- FR-204: The complete selected group must clamp rather than allowing individual Cues to collapse together.
- FR-205: Boundary audition must use one transport owner and a single loop range.
- FR-206: A loop range must contain `startWU`, `endWU`, `sourceType`, and `sourceId`; pre-roll and post-roll modify the range when it is created.
- FR-207: V1 clipboard payloads must use `{ version: 1, kind: 'cue-group', items }`.
- FR-208: V1 clipboard storage must be session-local; browser clipboard permissions are not required.
- FR-209: Paste and duplication must use the schema validator before committing.
- FR-210: Complete Section duplication must insert immediately after the source and preserve current ordering otherwise.
- FR-211: All rhythm, duplication, and paste operations must be atomic history commands.
- FR-212: Supported loop sources are selected Section, Cue group, World transition, and a fixed WU window around a selected Camera key.
- FR-213: Duplicate IDs use the source slug and first available numeric suffix.
- FR-214: Section duplication must reuse shared Camera-boundary stitching behavior.

## 5. Non-Goals

- Automatic AI rewriting of copy.
- A reusable cross-project clipboard format.
- World, modifier-stack, and Camera-recipe duplication; World reuse belongs to PRD 03 and Camera recipes already exist.
- Editing title motion duration per Cue.
- Audio, beats, or frame-based timing.
- Automatic pacing changes without preview and Apply.

## 6. Design Considerations

- Keep rhythm controls contextual rather than permanently expanding the timeline.
- Visualise the proposed arrangement as ghost markers before Apply.
- Explain boundary constraints in plain language and WU values.
- Reuse current editor buttons, fields, and Try/Apply affordances.

## 7. Technical Considerations

- Put rhythm and duplication calculations in pure modules with node:test coverage.
- Use document-local ID generation already established by the editor.
- Do not introduce a system clipboard dependency in v1.
- Keep loop sampling inside the existing runtime controller and transport state.

## 8. Success Metrics

- A six-title run can be evenly distributed and applied in one command.
- Boundary loops replay deterministically at the same WU values.
- Section duplication produces a valid document with no duplicate IDs.
- Invalid paste attempts leave both document and runtime unchanged.

## 9. Open Questions

None. Product decisions are locked in this PRD.
