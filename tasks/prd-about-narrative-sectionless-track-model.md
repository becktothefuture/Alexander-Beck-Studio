# PRD: About Narrative Sectionless Track Model

## 1. Introduction / Overview

Replace the current section-owned About Narrative authoring model with a sectionless global timeline. The current implementation uses `sections[]` as the container for scroll length, DOM layout, camera keys, world starts, text cues, editorial blocks, interaction activation, selection addressing, and validation. That makes the editor easier to implement initially, but it prevents the author from freely placing text, camera moves, world/simulation changes, and interactions independently.

The new model must remove authored sections entirely. In the new vocabulary, the only structural boundary is where a World object starts. If the word “section” appears during migration, it must mean “the point where a World object starts,” not a container that owns text, camera, or interaction.

The target system has one global playhead and four independent authored tracks:

- Camera keys
- World objects / simulations
- Text fields
- Interaction clips

The compiler may generate internal render spans for DOM layout and accessibility, but those spans must not become an authored concept, persisted schema field, or editor mental model.

This PRD is planning only. It does not authorize implementation.

## 2. Goals

- Remove authored `sections`, `groups`, `bands`, or equivalent timing containers from the future About Narrative document model.
- Make World object starts the only structural timeline anchors.
- Allow Camera, World, Text, and Interaction objects to be created, selected, moved, validated, and saved independently on a global timeline.
- Allow text fields to appear before, over, after, or across any World start without being reparented.
- Add first-class Desktop, Tablet, Mobile, and Reduced Motion compile/preview modes.
- Preserve current playback during migration through an adapter and parity tests before changing the canonical JSON format.
- Keep the runtime lean: one playhead, one renderer, one RAF loop, fixed point pool, worker preparation outside the frame loop.
- Make failure states explicit and recoverable: invalid edits must not replace the last-known-good compiled plan.
- Build enough automated and browser verification that implementation can proceed with high confidence.

## 3. Definitions

- **Story WU:** The global authored story-time unit. It remains compatible with the current world-unit concept, where `1 WU` corresponds to one narrative viewport height in the default profile.
- **Scroll WU:** Physical scroll distance measured as `scrollTop / viewportHeight` for the active profile.
- **Profile Resolver:** The compiler layer that maps Scroll WU to Story WU for Desktop, Tablet, Mobile, and Reduced Motion.
- **World Start / World Anchor:** A timed World object on the World track. This is the only structural story boundary in the new model.
- **Render Span:** A compiler-generated DOM layout span used to keep native text accessible and measurable. Render spans are internal output, not authored data.
- **Text Field:** An authored text object on the Text track. Initial kinds are `title`, `scroll-block`, and `stub`.
- **Legacy Section:** A current `contents-about.json` section used only as migration input.

## 4. User Stories

### US-001: Define a sectionless document model

**Description:** As a developer, I need a clear persisted schema that has no authored sections so that the editor and compiler cannot accidentally preserve the current nesting problem.

**Acceptance Criteria:**

- [ ] The proposed schema has no persisted `sections`, `groups`, `bands`, `chapters`, or equivalent container array.
- [ ] The World track owns all structural anchors through stable World object IDs and `startWU`.
- [ ] Camera keys, Text fields, and Interaction clips reference global time directly and are not children of World objects.
- [ ] The schema includes Desktop, Tablet, Mobile, and Reduced Motion profile metadata.
- [ ] The schema version advances from current `2` to `3`.
- [ ] Future-schema read-only behavior remains specified.

### US-002: Build a legacy-section migration adapter before changing canonical JSON

**Description:** As a developer, I need to convert the current section-owned document into the new global-track shape in memory so that migration can be tested without risking the canonical source file.

**Acceptance Criteria:**

- [ ] A pure adapter maps every legacy section to global Camera, World, Text, and Interaction objects.
- [ ] Legacy sections with `world.mode: "set"` become World Start objects.
- [ ] Legacy sections with `world.mode: "continue"` do not create structural boundaries.
- [ ] Legacy text cues become independent Text fields with absolute `startWU`, `focusWU`, and `endWU`.
- [ ] Legacy editorial blocks become independent `scroll-block` Text fields.
- [ ] Legacy `disciplineReveal` becomes one independent Text/Simulation clip with absolute timing and preserved internal choreography.
- [ ] Legacy interaction activation becomes an Interaction clip targeting the correct World object.
- [ ] The adapter is deterministic: the same input JSON produces byte-equivalent output every run.
- [ ] Existing canonical `contents-about.json` remains unchanged during this phase.
- [ ] `npm run check:about-narrative` passes after adding adapter tests.

### US-003: Prove playback parity before persisting schema v3

**Description:** As the author, I need the current About Narrative playback to remain visually and semantically equivalent while the internals change.

**Acceptance Criteria:**

- [ ] A parity test samples the legacy compiler and the sectionless compiler at fixed WU checkpoints.
- [ ] Sampled camera position, target, FOV, roll, active World ID, transition progress, active text state, and interaction state match within explicit tolerances.
- [ ] World sequence identity remains stable for the current canonical content unless the new identity intentionally replaces legacy `sectionId` with stable `worldId`.
- [ ] Reduced Motion parity is checked separately.
- [ ] Parity failure blocks schema persistence work.
- [ ] `node --test scripts/check-about-narrative-sequence-identity.mjs` passes or is updated with equivalent v3 assertions.

### US-004: Compile from global tracks

**Description:** As a developer, I need the compiler to sample from global tracks so that runtime behavior no longer depends on local section progress.

**Acceptance Criteria:**

- [ ] The compiler accepts a sectionless document shape.
- [ ] The compiled plan contains sorted indexes for Camera, World, Text, and Interaction tracks.
- [ ] `sampleAboutNarrativePlanInto()` samples global Story WU without requiring `frame.section` or `frame.localProgress`.
- [ ] The hot frame path remains allocation-free.
- [ ] Invalid candidate plans do not replace the last-known-good compiled plan.
- [ ] `node --test react-app/app/scripts/check-about-narrative-allocation-free-sampling.mjs` passes.

### US-005: Replace section-local camera timing with global camera keys

**Description:** As the author, I want Camera keys to sit on one global rail so that framing can change anywhere in the story without being constrained by a section boundary.

**Acceptance Criteria:**

- [ ] Camera keys store `atWU`, not section-local `at`.
- [ ] The global camera sampler uses sorted keys and binary search or an equivalent cursor-safe approach.
- [ ] Story start and story end keys are protected by default.
- [ ] Camera continuity diagnostics flag position, aim, FOV, roll, and velocity discontinuities.
- [ ] Camera edits do not change Text, World, or Interaction timing.
- [ ] The Camera inspector reports absolute WU, not “percent through section.”
- [ ] Verify in browser using dev-browser skill.

### US-006: Make World starts the only structural anchors

**Description:** As the author, I want a World object start to define the next major story boundary without owning other track objects.

**Acceptance Criteria:**

- [ ] The World track displays World Start objects as structural vertical anchors.
- [ ] A World Start has a stable `worldId`, `startWU`, `anchorWU`, Shape, seed, entry distance, transform, transition, shape parameters, and modifiers.
- [ ] Text, Camera, and Interaction objects can cross a World Start without reparenting or data rewrites.
- [ ] Gaps on the World track mean “continue the current World.”
- [ ] The editor does not create placeholder “continue” containers.
- [ ] A World Start can be moved only if resulting transitions and targeted interactions remain valid.
- [ ] Verify in browser using dev-browser skill.

### US-007: Fix world anchoring so free camera movement does not desync World placement

**Description:** As a developer, I need World placement to use explicit anchors instead of inherited section entry positions so that free global camera keys remain stable.

**Acceptance Criteria:**

- [ ] Each World object has an explicit `anchorWU`.
- [ ] Runtime placement uses `anchorWU` or compiled `anchorRailZ`, not legacy section start.
- [ ] If camera cadence remains constant, current placement is preserved after migration.
- [ ] If camera cadence later becomes keyframed, the compiler has a defined rail function before cadence edits are allowed.
- [ ] World anchor changes invalidate only the necessary World placement/transition data.
- [ ] Camera-only edits do not trigger World correspondence worker preparation.

### US-008: Scope World preparation identity to correspondence-affecting inputs only

**Description:** As a developer, I need worker preparation to remain performant and predictable when non-World tracks are edited.

**Acceptance Criteria:**

- [ ] World sequence identity uses stable World IDs, ordered World starts, Shape IDs, seeds, shape parameters, correspondence modes, point-count profile, and protocol versions.
- [ ] Text content, Camera offsets, Interaction activation, editor selection, and runtime-only preview state do not affect World sequence identity.
- [ ] Existing last-known-good pair behavior is preserved.
- [ ] Worker preparation remains outside the RAF loop.
- [ ] Failed preparation leaves the currently installed World buffers visible.
- [ ] Correspondence diagnostics identify World IDs, not legacy section IDs.

### US-009: Add independent Text fields

**Description:** As the author, I want to create and move text fields freely on the timeline so that copy can appear over any World state.

**Acceptance Criteria:**

- [ ] The Text track supports `title`, `scroll-block`, and `stub` field kinds.
- [ ] A row-header `+` next to the Text row creates a new field at hovered WU or the playhead.
- [ ] `title` fields have `startWU`, `focusWU`, `endWU`, text content, and motion preset.
- [ ] `scroll-block` fields use native DOM text and support editorial block content.
- [ ] `stub` fields can be saved as placeholders but are not published as visible production copy until marked publishable.
- [ ] Text fields can overlap World Starts and other Text fields, subject to diagnostics.
- [ ] Double-clicking a Text field opens copy editing.
- [ ] Verify in browser using dev-browser skill.

### US-010: Generate accessible DOM render spans from text fields

**Description:** As a developer, I need native DOM text to remain readable and accessible without reintroducing authored sections.

**Acceptance Criteria:**

- [ ] The compiler generates internal render spans from sorted Text fields and World Starts.
- [ ] Render spans are not persisted in JSON.
- [ ] DOM order follows intended reading order, not visual z-depth.
- [ ] Every publishable Text field has semantic DOM output.
- [ ] Spatial visual effects remain presentation-only.
- [ ] Screen reader order is deterministic for Desktop, Tablet, Mobile, and Reduced Motion profiles.
- [ ] Natural text height is measured and reported without silently shifting authored Story WU.
- [ ] Verify in browser using dev-browser skill.

### US-011: Add independent Interaction clips

**Description:** As the author, I want interactions to target a World object and activate independently from text or camera timing.

**Acceptance Criteria:**

- [ ] Interaction clips store `startWU`, `endWU`, `activationWU`, type, and `targetWorldId`.
- [ ] Bust spin targets the `bust-v1` World object explicitly.
- [ ] The compiler blocks interactions whose target World is not active or ready in the activation window.
- [ ] Runtime samples `frame.interactions` or `frame.activeInteraction`, not `frame.section.interaction`.
- [ ] Interaction edits do not invalidate World correspondence preparation unless the targeted World identity changes.
- [ ] Verify in browser using dev-browser skill.

### US-012: Make Desktop, Tablet, Mobile, and Reduced Motion first-class profiles

**Description:** As the author, I need timing and layout to be robust across desktop, tablet, mobile, and reduced-motion previews before changes are considered safe.

**Acceptance Criteria:**

- [ ] The compiler supports named profiles: `desktop`, `tablet`, `mobile`, and `reduced-motion`.
- [ ] The editor can preview each profile without changing canonical desktop timing by accident.
- [ ] The profile resolver maps physical Scroll WU to authored Story WU deterministically.
- [ ] World Starts remain ordered and reachable in every profile.
- [ ] Text readability diagnostics run per profile.
- [ ] Tablet portrait and tablet landscape are separate browser verification scenarios.
- [ ] Mobile portrait and mobile landscape are separate browser verification scenarios.
- [ ] Reduced Motion disables or settles continuous motion while preserving semantic order and content.
- [ ] Verify in browser using dev-browser skill.

### US-013: Provide explicit responsive timing policy

**Description:** As a developer, I need a clear rule for how timings adapt across profiles so that mobile and tablet behavior is not guessed during implementation.

**Acceptance Criteria:**

- [ ] Canonical object timings are authored in global Story WU.
- [ ] Each profile has a defined total scroll duration.
- [ ] By default, profile mapping scales Story WU to Scroll WU without changing object ordering.
- [ ] Optional profile overrides are supported only where needed and are explicit in JSON.
- [ ] Profile overrides must be validated for ordering, readability, World activity, and interaction target validity.
- [ ] A profile override cannot silently move only one part of a linked object; for example, a Text field cannot have `focusWU` outside its `startWU/endWU`.
- [ ] Compiler diagnostics identify the exact profile and object ID for every responsive issue.

### US-014: Replace section-based editor selection with object IDs

**Description:** As a developer, I need selection and editing to address objects directly so that moving or deleting a World Start does not corrupt unrelated objects.

**Acceptance Criteria:**

- [ ] Selection shapes use stable object IDs, such as `{ type: "text-field", id }`, `{ type: "camera-key", id }`, `{ type: "world", id }`, and `{ type: "interaction", id }`.
- [ ] Legacy `{ sectionId, cueId }` selection shapes are accepted only during migration and converted immediately.
- [ ] Clipboard payloads use object IDs and absolute WU offsets.
- [ ] Loop audition uses selected object WU range.
- [ ] Delete/Backspace removes selected objects only when validation can preserve a playable plan.
- [ ] Verify in browser using dev-browser skill.

### US-015: Update timeline UI to remove the Section lane

**Description:** As the author, I want the timeline to show actual controllable objects rather than a Section lane that implies hidden ownership.

**Acceptance Criteria:**

- [ ] The timeline has no “Sections” lane.
- [ ] World Start anchors are visible on the World row and optionally as vertical guide lines across all rows.
- [ ] Camera, World, Text, and Interaction rows each have a row-header `+`.
- [ ] Clicking a row label opens track-wide controls.
- [ ] Clicking an object selects it and seeks to its relevant WU.
- [ ] Dragging an object moves only that object unless an explicit linked-edit mode is active.
- [ ] The inspector uses absolute WU labels.
- [ ] Verify in browser using dev-browser skill.

### US-016: Add diagnostics that prevent ambiguous or unsafe states

**Description:** As the author, I need the editor to explain invalid states before saving so that the freer model does not create hidden runtime failures.

**Acceptance Criteria:**

- [ ] Diagnostics cover object ID uniqueness, ordering, text readability, camera continuity, World transition overlap, World target readiness, interaction target validity, responsive profile reachability, and reduced-motion parity.
- [ ] Blocking errors prevent save.
- [ ] Warnings remain editable and explain risk without blocking save.
- [ ] Every diagnostic includes object ID, track, profile if relevant, and suggested repair.
- [ ] Clicking a diagnostic seeks to the relevant WU and selects the object when possible.
- [ ] Verify in browser using dev-browser skill.

### US-017: Persist schema v3 only after adapter and compiler parity pass

**Description:** As a developer, I need persistence migration to be gated so that the canonical About config is not rewritten into an unverified format.

**Acceptance Criteria:**

- [ ] `migrateVersion2To3()` exists and is covered by tests.
- [ ] Importing v2 content migrates to v3 only after validation passes.
- [ ] Saving v3 serializes normalized object ordering.
- [ ] Future schema versions remain read-only.
- [ ] Export can preserve original invalid/future input for recovery.
- [ ] Save conflict behavior remains unchanged.
- [ ] Production builds do not expose editor save endpoints.

### US-018: Certify the migration with automated and browser checks

**Description:** As the owner, I need high confidence before actioning this change because it touches schema, compiler, runtime, editor, and responsive behavior.

**Acceptance Criteria:**

- [ ] The implementation plan defines exact verification commands before coding starts.
- [ ] Automated tests cover migration, parity, compiler sampling, worker identity, resource lifecycle, profile resolution, validation, import/export, and production stripping.
- [ ] Browser verification covers Desktop, Tablet portrait, Tablet landscape, Mobile portrait, Mobile landscape, and Reduced Motion.
- [ ] Chromium and WebKit are both covered for core narrative playback.
- [ ] Final validation includes `npm run check:site`.
- [ ] No implementation is marked complete unless relevant automated and browser checks pass or a specific limitation is documented.

## 5. Functional Requirements

- FR-1: The persisted sectionless schema must not contain authored `sections`, `groups`, `bands`, `chapters`, or equivalent timing containers.
- FR-2: The only structural authored anchors are World objects on the World track.
- FR-3: A World object start defines what the old system informally treated as a “section boundary.”
- FR-4: Camera keys must use absolute global Story WU.
- FR-5: Text fields must use absolute global Story WU.
- FR-6: Interaction clips must use absolute global Story WU and explicit target object IDs.
- FR-7: World transitions must use absolute global Story WU for start and end.
- FR-8: World objects must have stable IDs independent of their current order.
- FR-9: Text, Camera, and Interaction objects must not be children of World objects.
- FR-10: Text fields may cross World Starts.
- FR-11: Camera key spans may cross World Starts.
- FR-12: Interaction clips may cross World Starts only when their target World remains valid for the activation window.
- FR-13: Gaps on the World track mean the prior World continues.
- FR-14: The editor must not draw or save “continue” placeholder objects.
- FR-15: The compiler may generate render spans for DOM layout, but render spans must not be persisted or exposed as primary authoring objects.
- FR-16: The compiler must expose the active World, active text fields, active interactions, and sampled camera state for any Story WU.
- FR-17: The runtime frame object must not require `sectionIndex`, `section`, or `localProgress`.
- FR-18: Legacy section IDs must be replaced by stable object IDs during migration.
- FR-19: The migration adapter must preserve current visual playback before schema v3 is persisted.
- FR-20: The system must reject duplicate object IDs.
- FR-21: The system must reject non-finite timing, transform, camera, or World values.
- FR-22: The system must reject World transitions that overlap invalidly with the next World Start.
- FR-23: The system must reject profile overrides that invert object timing.
- FR-24: The system must warn when text readable windows are too short for their content length.
- FR-25: The system must warn when multiple major events create excessive density in the same WU range.
- FR-26: The system must preserve one Three.js renderer and one RAF loop.
- FR-27: Worker preparation must happen only when correspondence-affecting World inputs change.
- FR-28: Camera, Text, and Interaction edits must not trigger point correspondence preparation.
- FR-29: The editor store must preserve named undo/redo transactions.
- FR-30: Continuous drag gestures must preview safely and commit as one undoable operation.
- FR-31: Invalid preview documents must not replace the last valid compiled plan.
- FR-32: Save must validate the complete sectionless document and all profiles before writing.
- FR-33: Import must migrate legacy v2 documents through a validated v2-to-v3 path.
- FR-34: Export must output normalized v3 JSON once v3 persistence is enabled.
- FR-35: The editor must provide Desktop, Tablet, Mobile, and Reduced Motion preview modes.
- FR-36: Browser verification must include Tablet as a first-class mode, not just scaled Desktop or Mobile.
- FR-37: The final bust/CTA contract must be expressed without sections: a protected final World object using `bust-v1`, associated final text fields, and valid interaction target.
- FR-38: The public About page must remain accessible without the development editor.
- FR-39: Production builds must continue to remove editor-only modules and save endpoint strings.
- FR-40: Documentation must replace section-centric authoring language with World Start / global track language.

## 6. Non-Goals / Out of Scope

- No implementation in this PRD-writing task.
- No generic video/NLE timeline engine.
- No arbitrary user-created tracks in the first sectionless version.
- No node-based animation graph.
- No Bézier camera curve editor in the first migration.
- No arbitrary transition graph between non-adjacent Worlds; v3 keeps a linear ordered World sequence.
- No dynamic point-pool resizing.
- No second renderer, canvas, or RAF loop.
- No conversion of every editorial paragraph into character-level keyframes.
- No hidden automatic mobile retiming without explicit compiler output and diagnostics.
- No broad visual redesign of the About page outside the editor/timeline model.
- No changes to shell/frame/Button Bar visual contracts.
- No committing or pushing changes unless separately requested.

## 7. Design Considerations

- Product language must avoid “Section” for authored objects. Use “World Start,” “World,” “Camera key,” “Text field,” and “Interaction.”
- The World row becomes the structural visual spine.
- World Starts should appear as strong but restrained vertical anchors across the timeline.
- Text should remain visually flexible: a title can sit over any World; a scroll block can begin before or after a World Start.
- The row-header `+` affordance must be simple and consistent across tracks.
- The Text `+` menu should start with three options: `Title`, `Scroll block`, and `Stub`.
- Object inspectors must lead with plain labels and absolute WU timing.
- Advanced diagnostics, raw IDs, correspondence strategy, and low-level modifiers should remain available but not dominate primary editing.
- Tablet preview needs explicit UI affordance; do not assume desktop preview represents tablet.
- Reduced Motion preview must make it obvious which continuous motions are settled or disabled.
- UI verification must use the dev-browser skill for timeline/editor interactions.

## 8. Technical Considerations

### Existing integration points

- Current schema and migration: `react-app/app/src/routes/about-narrative-lab/aboutNarrativeSchema.js`
- Current compiler: `react-app/app/src/routes/about-narrative-lab/aboutNarrativeCompiler.js`
- Current timeline helpers: `react-app/app/src/routes/about-narrative-lab/aboutNarrativeTimeline.js`
- Current editor: `react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx`
- Current editor store: `react-app/app/src/routes/about-narrative-lab/aboutNarrativeEditorStore.js`
- Current runtime hook: `react-app/app/src/routes/about-narrative-lab/useAboutNarrativeTimeline.js`
- Current rendered experience: `react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx`
- Current 3D runtime: `react-app/app/src/routes/about-narrative-lab/AboutNarrativePointWorld3D.jsx`
- Current canonical content: `react-app/app/public/config/contents-about.json`

### Known weaknesses that this plan must address

- W-1: Current sections own too many responsibilities. The new schema must remove that ownership entirely.
- W-2: Current local `0..1` timing hides global relationships. The new compiler must use absolute Story WU.
- W-3: Current world placement depends on camera position at section entry. The new model needs explicit World anchors.
- W-4: Current editor selection is section-scoped. The new editor needs stable object IDs.
- W-5: Current editorial DOM height can shift later timings. The new profile resolver must report content pressure without silently changing authored Story WU.
- W-6: Current mobile behavior is mostly a parallel extent value. The new model needs Tablet and Mobile as first-class profiles.
- W-7: Current World preparation identity embeds section IDs. The new identity must use World IDs and exclude non-World edits.
- W-8: Current finale contract is section-last. The new contract must protect final bust World, final text, CTA, and interaction without a section.
- W-9: Current timeline already looks track-based but stores section-owned objects. The new timeline must not preserve this mismatch.

### Suggested implementation sequence

1. Add sectionless track-model adapter and tests.
2. Add sectionless compiler path behind a development-only feature flag or internal test path.
3. Prove parity against current canonical content.
4. Add profile resolver and responsive diagnostics.
5. Add schema v3 migration and validation.
6. Convert runtime frame contract away from `frame.section`.
7. Convert editor selections to object IDs.
8. Replace Section lane with World Start anchors.
9. Add row-header object creation.
10. Update docs and certification scripts.

### Verification commands expected during implementation

```bash
npm run check:about-narrative
node --test scripts/check-about-narrative-editor-hardening.mjs
node --test scripts/check-about-narrative-sequence-identity.mjs
node --test react-app/app/scripts/check-about-narrative-allocation-free-sampling.mjs
npm run check:about-narrative-hardening
npm run build
npm run audit:about-narrative
ABS_BROWSER=webkit npm run audit:about-narrative
npm run certify:about-narrative
npm run check:site
```

### Browser verification matrix

- Desktop Chromium: 1440 × 900
- Desktop WebKit: 1440 × 900
- Tablet portrait Chromium: 834 × 1112
- Tablet landscape Chromium: 1112 × 834
- Tablet portrait WebKit: 834 × 1112
- Mobile portrait Chromium: 390 × 844
- Mobile landscape Chromium: 844 × 390
- Mobile portrait WebKit: 390 × 844
- Reduced Motion Chromium: desktop and mobile
- Reduced Motion WebKit: desktop and mobile

## 9. Success Metrics

- The persisted v3 document has zero authored section-like containers.
- Current canonical playback migrates with camera/world/text/interaction parity at fixed WU checkpoints.
- A new title can be created at the hovered WU from the Text row `+` and moved over a different World Start without data reparenting.
- A Camera key can be moved across a World Start without affecting text or World timing.
- A World Start can move while diagnostics clearly identify affected transitions, text density, and interactions.
- Tablet and Mobile previews show no unreachable text, invalid World targets, or unreadable text windows.
- Camera/Text/Interaction edits do not trigger World correspondence preparation.
- Runtime remains one renderer, one RAF loop, fixed point pool, and allocation-free hot-frame sampling.
- `npm run check:site` passes after implementation.

## 10. Open Questions

- OQ-1: Should profile overrides be allowed for all tracks immediately, or only Text fields and total profile duration in the first version?
- OQ-2: Should stub Text fields be persisted in production JSON as non-rendered planning objects, or stripped before publish?
- OQ-3: Should the editor use the word “World Start” or “World Anchor” in the UI?
- OQ-4: Should Tablet breakpoints follow the current site CSS breakpoints exactly, or should the About Narrative compiler own named preview profiles independent of CSS media queries?
- OQ-5: Should final CTA content be modeled as Text fields plus metadata, or as a protected CTA object on a dedicated interaction/content contract?

## 11. Locked Assumptions From User Direction

- Authored sections are removed.
- The old idea of a section maps only to the start of a World object.
- Text, Camera, and Interaction are independent tracks.
- Mobile and Tablet robustness are required, not optional follow-ups.
- No implementation should begin until this PRD is accepted or revised.
