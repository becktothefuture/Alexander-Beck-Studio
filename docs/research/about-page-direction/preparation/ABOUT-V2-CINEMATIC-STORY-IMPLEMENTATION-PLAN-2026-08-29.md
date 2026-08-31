# About V2 cinematic story implementation plan

Implementation update, 2026-08-30: the current career component contains five rows, including Critical Mass. The finale holds its camera and copy, not its ambient material motion. See [career approval and dot separation](ABOUT-V2-CAREER-DISPERSION-2026-08-30.md) for the current decisions and evidence. The plan below is the historical approval record.

- Status: implementation-ready; career copy remains fact-gated
- Date: 2026-08-29
- Scope: local About V2 narrative, component, Blender, export and runtime work only
- Audience: Alexander as creative director, plus the narrative, frontend and 3D
  implementation owners
- Use: canonical execution brief for the next implementation cycle
- Deliverable: one verified local About experience and its source-aligned
  implementation evidence

This plan turns the approved creative direction into an ordered implementation.
It does not approve unverified career facts, change the current source files, commit
work, publish a preview, or deploy production.

## Decision

Re-edit the existing About page as one continuous short film:

1. meet Alex;
2. open the question of what makes an idea worth attention;
3. show the personal origin and selected career chapters that shaped his practice;
4. let that evidence earn the multidisciplinary thesis;
5. reveal the disciplines and client proof;
6. show how Alex works;
7. turn towards the visitor through two final titles;
8. arrive at “Let’s begin.” and hold the frame.

The page will keep its current voice, disciplines, client proof and strongest method
copy. New career facts will replace repeated explanation rather than add length. The
shorter gate sequence will end earlier. The existing split-lattice material will then
open into the finale. The concentric lens chamber will be removed. The final camera,
world and controls will settle before the invitation appears and will remain settled
to the end of the scroll.

## Locked decisions and remaining approvals

| State | Decision |
| --- | --- |
| Locked | Nine-beat arc, exact two-title invitation runway, four-row career component, no net copy growth, shorter gate chapter, existing lattice as finale, lens removal and a true terminal hold |
| Adjustable through rendered proof | Gate count within its approved range, lattice density and corridor width, cue positions, reading holds and the final practical description |
| Blocking before canonical career copy | Exact four employers, public spellings, roles, dates, overlaps, current status and treatment of independent work |
| Release boundary | Local source, runtime and visual proof only; commit and production publication require separate approval |

## What the three filmmaker reviews found

### Opening and arc

The opening image and inciting question already work. The main story problem is order:
the audience meets the thesis and capability system before it meets the person. Move
the personal origin and career evidence into the early archive passage. The later line
“Modern problems refuse… / …to stay in one category.” then becomes a consequence of
the story rather than a claim made in advance.

### Voice and career

The career sequence should be factual and easy to scan. The prose should carry two or
three meaningful turns; the career component should carry employer, role and period.
This follows the useful information order on [Daniel Sun’s About page](https://danielsun.space/about)—origin,
career record, present position and invitation—without copying its layout, wording or
visual identity.

No proposed four-row career sequence is publication-ready yet. Employer spellings,
dates, role progression and current employment state still need direct approval.

### Motion and finale

At planning capture, the shorter route was a useful correction, but the gate stage
still occupied the old `0.64–0.90` range with 48 gates and a full roll across that
whole interval. The saved scene still ended in a six-rib lens chamber and had no
stationary camera tail. The web runtime also kept several independent sources of
motion alive after the Blender camera arrived.

The strongest existing end image is the split-lattice corridor. Thin it, widen its
central nave, let it open into peripheral banks, and stop there. Do not add another
finale object.

## What was missing from the approved creative direction

| Missing safeguard | Why it matters | Plan response |
| --- | --- | --- |
| Career fact authority | Candidate CV and portfolio records conflict | Approve all four rows before canonical insertion |
| Blender source parity | The saved scene, metadata, README and rebuild script describe different routes | Reconcile them before any canonical rebuild or export |
| Story-to-camera cue mapping | The web currently maps `storyWU / durationWU` directly to the Blender track | Compile a semantic, piecewise story-to-journey map |
| A true end hold | Blender, steadycam, pointer pan, ambient motion and end-scroll continuation can all move the frame | Add one lock cue and freeze every motion owner after it |
| Finale staging ownership | Description and action opacity variables do not control the computed result | Fix CSS specificity and interaction/focus gating |
| Responsive finale art direction | Desktop currently empties while mobile retains a cropped ring | Define one split-bank composition for all viewports |
| Performance and rollback gates | Lens removal and lattice redistribution can change density and load | Use candidate exports, fixed budgets, soak tests and named backups |

## Pre-implementation evidence baseline (retained for provenance)

The baseline below records the local working tree at planning capture, not committed
`main` or the completed implementation.

- Canonical text and timing source: `react-app/app/public/config/contents-about.json`.
- Saved Blender source: `source-assets/about-v2-blender-current/about-v2-track-working.blend`.
- The saved path has 17 Bezier points and an evaluated length of about `1313.977`.
- Saved path metadata, `source-assets/about-v2-blender-current/README.md` and
  `scripts/about-v2-blender/build-parametric-narrative-world.py` still describe 29
  points and a roughly `1450`-metre route.
- The saved gate range is `0.64–0.90`; the camera roll keys are still at frames
  `2304`, `2538`, `2772`, `3006` and `3240` with values `0`, `90`, `180`, `270`
  and `360` degrees.
- The saved gate count is 48.
- The saved look-ahead is about `17.73 m`; the README and older checks describe
  `55 m`.
- `GN_LENS_CHAMBER` and `ABOUT_STAGE_06_LENS` are still present.
- The saved Blender SHA-256 is
  `cac7cc413abd481b582c3df5e1c566cb68569b7bd8eb1a778a5aea734f335b8f`.
- Exported metadata records
  `a89c918ce18e835ca2efe61a6343d701c30332c9a70062bd75e2e1874d5dc7f6`.
  `npm run check:about-v2-assets` therefore fails correctly.
- `move-ride-beyond` continues camera travel after the finale field exits.
- `.about-narrative-finale-description` loses its staged opacity to the shared route
  selector. `.about-narrative-finale-actions` does not consume
  `--spatial-action-opacity` and remains interactive while visually unavailable.
- The latest gitignored visual evidence is in
  `output/playwright/about-ending-audit-2026-08-29-post-blender-loop/`.
  Frames `11` and `14` show the useful split corridor. Frames `12`, `13`, `15` and
  `16` show the dense arrival, weak resolved desktop frame and desktop/mobile mismatch.

## Authority after implementation

| Concern | Authority | Rule |
| --- | --- | --- |
| Story order, copy and page length | `contents-about.json` Story Stack | Text order and measured content own scroll length |
| Career facts | Approved portfolio evidence plus direct Alexander confirmation | Presentation JSON cannot validate itself |
| Geometry, path, camera, roll and stage bounds | Saved `.blend` | Read back the saved scene after every material change |
| Reproducible scene refinement | `refine-about-v2-stage-separation.py` | Reapply the narrow 17-point, lens-free contract to a temporary candidate; the old seven-stage builder is retired and fail-closed |
| Runtime point and camera data | Generated `meta.json`, `camera-track.json`, `surfels.bin` | Never hand-edit generated assets; promote the triplet together |
| Story-to-world alignment | Semantic moment-to-journey cue map | Do not use one global normalized page progress as the only map |
| Finale lockup staging | Composer sample plus About-scoped CSS | Computed styles and focus state must match the phase values |
| Rendered completion | Browser evidence | Green structural checks are not visual approval |

The older narrative-world and parametric-build plans remain design history. Their lens
ending is superseded by this plan after implementation is approved and verified.

## Final narrative beat map

| Beat | Current owner | Story job | Content action | Spatial and motion action | Exit test |
| --- | --- | --- | --- | --- | --- |
| 1. Opening portrait | `text-promise-main` | Meet Alex | Keep “About Me” and the current first-person introduction | Quiet, level opening; first scroll creates the first pull | First screen works on its own |
| 2. Inciting question | `text-complexity-idea`, `text-complexity-conditions` | Open the central question | Keep the existing pair | One deliberate scale change; keep portals out of the reading centre | Joined sentence is grammatical and legible |
| 3. Personal origin and career | `text-background-unit` | Show how the practice formed | Rewrite from source material; add one `career-sequence` after `practice` | Stable archive glide; each career row is one quiet reveal | Complete approved career record lands before the thesis |
| 4. Earned turning point | `text-complexity-curiosity`, `text-complexity-listen` | Turn evidence into the multidisciplinary thesis | Keep the existing pair | Movement widens after the final career row | The title pair reads as a consequence, not a slogan |
| 5. Practice revealed | `text-discipline-labels` | Show the connected practice | Keep all six disciplines and descriptions | One readable item at a time; maintain the central nave | All six names appear once and remain readable |
| 6. Synthesis and proof | `text-disciplines-title` | Explain interaction between disciplines and show client proof | Keep `category-crossing`, `possibility` and logos; remove the generic career paragraph; compress repeated capability copy | Assembly field steadies around prose and proof | Career and discipline lists are not repeated |
| 7. Method in action | `text-life-momentum`, `text-life-form`, `text-life-character` | Show what working with Alex feels like | Keep the title pair and three-part method logic | Gate energy resolves earlier; method prose gets a calm reading plateau | Question, make, challenge and delivery remain clear |
| 8. Invitation runway | new fields | Turn from Alex’s method to the visitor’s unresolved work | Add the approved two-title sentence | Enter split lattice, decelerate, clear fog and lock camera during the second title | Camera and world are settled before the final field |
| 9. Held resolution | `text-epilogue-invitation` | Open the next conversation | Keep “Let’s begin.”; replace the repeated description with one short practical line | Title, rule, description and actions stage in; final 20% is a complete hold | No camera/world movement to scroll end; actions are usable |

### Opening-frame contract

- The semantic “About Me” title and first-person introduction must be visible on first
  paint. Scene loading must never create a blank opening or hide the copy.
- At scroll top, the camera begins level in one defined portrait composition with a
  protected reading centre. Background ambience may breathe, but the story cannot
  advance before intentional scroll input.
- When point assets become ready, the background may resolve without moving the text,
  jumping the camera or changing the effective story position.
- A cold load, a route re-entry at scroll top and a reload at scroll top must resolve
  to the same opening frame. Restored nonzero scroll positions must resume their actual
  beat without flashing the opener first.
- The first intentional scroll should create one clear spatial pull into the inciting
  question. It must not begin with a gate, roll or abrupt speed change.
- Reduced motion must keep the same opening portrait and semantic order, with no
  decorative camera advance.

### Approved closing fields

Add these durable top-level text fields after `text-life-character`:

| ID | Text | Treatment | Flow |
| --- | --- | --- | --- |
| `text-epilogue-shaping` | `If you’re shaping something…` | `travelling-title-v1`, standard Geist title | `minScreens: 0.7`, `gapAfter: tight` |
| `text-epilogue-thinking` | `…that needs more than one way of thinking…` | `travelling-title-v1`, standard Geist title | `minScreens: 0.7`, `gapAfter: standard` |
| `text-epilogue-invitation` | `Let’s begin.` | existing display finale | keep `minScreens: 1.4`, `gapAfter: none` unless rendered proof requires more reading time |

The two new fields bring the top-level text-field count from 12 to 14. The career
component does not create another timed field.

The default finale keeps one practical description line because the existing lockup
has a deliberate title → rule → description → actions hierarchy. The line must be no
more than 12 words and must not repeat the conditional title pair. Final wording needs
editorial approval during the read-aloud gate.

## Copy contract

### Keep

- The opening identity and warm first-person tone.
- “What makes an idea worth… / …paying attention to?”
- “Modern problems refuse… / …to stay in one category.”
- All six discipline names and their useful contributions.
- The idea that decisions in one discipline change what is possible in another.
- Selected client proof.
- “Make the work… / …visible early.”
- The method logic: question the brief, make early, invite challenge, stay through
  delivery.
- “Let’s begin.”

### Move

- Move career history out of `text-disciplines-title.block.modules.background`.
- Put the structured career sequence after
  `text-background-unit.block.modules.practice`.
- Put two or three causal career turns in the prose around the sequence, not in the
  rows themselves.

### Remove or compress

- Remove the 30-word generic career paragraph once approved rows exist.
- Remove the defensive “master of none” passage by default. Retain at most one line
  only if Alexander explicitly wants to answer that objection.
- Compress repeated discipline enumeration in `ai-judgement`.
- Do not repeat dates, roles, employers, clients or the final conditional invitation
  in prose.

### Word and voice gates

- Current core narrative baseline: 436 words.
- Current total reader-facing baseline before fixed actions: 574 words.
- Core narrative means field titles, field descriptions, prose modules and the future
  career-sequence copy. Total reader-facing copy also includes discipline labels and
  descriptions, section labels and public client names. Punctuation-only glyphs do
  not count as words.
- The implemented page must not exceed either baseline.
- Career additions must be funded through removal of repetition.
- Every changed paragraph needs one source phrase, confirmed fact, concrete habit,
  named example or opinion Alexander can defend.
- Use direct first-person language, contractions and ordinary punctuation.
- Do not use em dashes.
- Keep uncertainty with the project or question, not with Alex’s professional
  identity.
- Run the swap-name, say-it, symmetry, abstraction, lesson, source and animation tests
  from `ABOUT-TONE-OF-VOICE.md`.

## Career component contract

Use one new editorial module kind: `career-sequence`.

```json
{
  "id": "career-sequence",
  "kind": "career-sequence",
  "label": "<approved section label>",
  "items": [
    {
      "id": "<stable-lowercase-slug>",
      "yearLabel": "<approved display range>",
      "employer": "<approved public employer name>",
      "role": "<approved public role>"
    }
  ],
  "independentWork": {
    "label": "<approved quiet label>",
    "text": "<approved single-line wording>"
  }
}
```

This is a specification example only. Do not place placeholders or candidate facts in
`contents-about.json`.

### Data rules

- Exactly four rows, ordered oldest to newest.
- `independentWork` is optional and subordinate. It is not a fifth job.
- Module label: required, maximum 48 characters.
- Row IDs: unique lowercase slugs.
- `yearLabel`: required, maximum 24 characters.
- `employer`: required, maximum 80 characters.
- `role`: required, maximum 100 characters.
- Independent label: maximum 40 characters.
- Independent text: maximum 120 characters.
- Reject unsafe text, unknown keys, links, logos, locations, achievements, clients,
  project outcomes and candidate-status metadata.
- Do not add a schema-version bump for this additive module unless deterministic
  persistence proves one is required.

### Render rules

- Render one named `<section>` with a visible heading.
- Render jobs as a four-row `<ol>`.
- Render one `<li>` per job. Treat the complete row as one atomic editorial reveal.
- Desktop and tablet: restrained year, employer and role grid.
- Mobile: year first, followed by employer and role. Never use horizontal scroll.
- Render optional independent work as one quiet paragraph after the ordered list.
- Do not use employer logos, cards, hover states, parallax or new interaction.
- Reduced motion settles all rows immediately through the existing reveal contract.
- Add an explicit Story Stack footprint for heading, rows and optional independent
  work. Rendered DOM measurement remains final authority.

### Fact approval gate

Before canonical insertion, Alexander must confirm:

1. the four employers to include;
2. exact public employer spelling;
3. exact public role labels;
4. exact display years;
5. overlap between roles;
6. Hugo & Cat / Hugo MRM / MRM continuity and role progression;
7. the current end state of the MRM role;
8. accepted Yoti dates;
9. whether early roles are intentionally omitted;
10. whether and how independent or consulting work appears;
11. whether “thirteen years” is removed or replaced;
12. publication comfort for all four rows together.

Current candidate records are not approval. Do not publish partial rows, `[VERIFY]`
markers, stale “Present” labels or polished guesses. If approval is incomplete, ship
the component support and tests without inserting the module.

If confirmed facts change the portfolio knowledge records, update the correct source
records through `docs/portfolio/router.yaml` and run
`npm run verify:portfolio-knowledge`.

## Motion and 3D contract

### 1. Reconcile the 17-point route first

- Create a dated Blender “Save Copy” before any mutation.
- Extract the exact 17 point coordinates, handles, tilt values and labels from the saved
  scene.
- Replace stale 29-point custom properties and embedded README content in the scene.
- Update the rebuild script to reproduce the exact final route and derive point count
  and evaluated length from the scene data.
- Add a safe output argument to the builder. Refuse canonical in-place rebuild unless
  an explicit flag is supplied.
- Test the builder against a temporary `.blend`; do not run the current builder on the
  canonical file.

### 2. Shorten and finish the gate chapter

Use these as the first tuning envelope:

- gate entry: `0.63–0.65`;
- gate exit: `0.79–0.81`;
- gate count: `30–32`, starting at 32;
- architectural twist: exactly one turn, calculated from the resolved count;
- camera bank: `0`, `-6`, `8`, `-4`, `0` degrees at the quarter points of the
  resolved range;
- architectural gate twist: one complete turn, independent of the camera bank;
- wrapped camera-bank error at exit: at most `0.25°`;
- no bank change after exit;
- gate-to-lattice clear breath: `0.015–0.03` normalized route progress.

Preserve `Z_UP`, zero path-point tilt, sparse roll controls and a constant 65-degree
horizontal FOV. Inspect inherited curve tilt before adding compensation keys.

### 3. Use the lattice as the ending

- Extend the existing `GN_RESPONSIVE_LATTICE` material through the finale.
- Retire `GN_LENS_CHAMBER`, `ABOUT_STAGE_06_LENS`, `ABS_LENS_PATH_ANCHOR` and the
  exported `about.06` lens model.
- Do not create a new finale geometry object or duplicate the lattice.
- A stage-six journey cue may remain as metadata only if it improves inspection.
- Start lattice tuning with:
  - corridor width `22–30 WU` instead of `16`;
  - columns `26–34` instead of `41`;
  - rows `34–46` instead of `58`;
  - strand keep `0.55–0.72` instead of `0.82`;
  - thickness `0.18–0.24` instead of `0.28`;
  - arrival wave amplitude `2–4 WU`, resolving to `0` at camera lock.
- Open the strands into asymmetrical peripheral banks. Keep one central reading nave.
- Both banks must remain visible on desktop and mobile. Do not allow the desktop end
  frame to collapse to isolated random dots.

These values are a starting envelope, not an instruction to accept a structurally
valid but visually weak result.

### 4. Add one real camera lock

- Add an `ABS_CAMERA_LOCK` cue around `0.90–0.93` of the final route.
- Leave the final `8–12%` of exported camera samples stationary.
- From lock to end:
  - positional drift at most `0.0001 WU`;
  - quaternion angular drift at most `0.01°`;
  - FOV drift `0`;
  - roll drift `0`;
  - pointer-pan gain `0`;
  - lattice and ambient displacement `0`.
- Complete fog clearing during the second lead-in title, before the final invitation.
- Keep a settled breath of `0.20–0.35 WU` before `Let’s begin.` enters.
- Remove `move-ride-beyond` and any look-key equivalent. Do not keep an empty travel
  segment only to create page length.

### 5. Compile a semantic journey map

The renderer currently samples the Blender camera with global
`storyWU / durationWU`. Replace that single mapping with a monotonic, piecewise map.

Story Stack moments own the resolved WU values. Blender metadata owns normalized
journey cues. A small pure runtime module should compile the relationship:

| Story moment | Blender cue |
| --- | --- |
| method block exit | gate release complete |
| `text-epilogue-shaping` enter | split-lattice entry |
| `text-epilogue-thinking` enter/focus | deceleration and fog clear |
| `text-epilogue-thinking` settle | `ABS_CAMERA_LOCK` |
| `text-epilogue-invitation` enter | locked terminal composition |

Use the durable moment IDs as semantic roles through the existing trigger system. Do
not add a second page-length authority. The map must compile after responsive text
measurement so mobile reflow cannot move the final text away from its composition.

## Finale component and CSS contract

Keep the current composer phase order unless rendered evidence proves the phase math
needs adjustment:

- title: normalized final-field progress `0.00–0.25`;
- rule: `0.22–0.40`;
- description: `0.35–0.65`;
- actions: `0.62–0.80`;
- complete hold: `0.80–1.00`.

Implementation requirements:

- Make the About-scoped finale description selector specific enough to consume
  `--spatial-description-opacity` in computed styles.
- Make `.about-narrative-finale-actions` consume
  `--spatial-action-opacity`.
- Disable pointer events and keyboard focus while actions are unavailable. Use an
  explicit state threshold and `inert`; opacity alone is not an accessibility state.
- Remove `inert` only when actions reach their usable phase.
- Reduced motion shows the complete final hierarchy immediately when the field becomes
  active.
- The title, rule, description, actions and focus rings must stay above the Button Bar
  and inside the studio window at every target viewport.

## Source and export contract

The final export metadata must include and validate:

- source `.blend` SHA-256;
- actual route control-point count;
- route shape hash and evaluated length;
- actual stage ranges;
- gate count and roll-key progress;
- camera-lock frame and normalized progress;
- resolved look-ahead and horizontal FOV;
- `hasLensChamber: false`;
- final object and model topology.

Update the exporter and structural checks for a six-model lens-free scene. The current
hard-coded seven-model set in `check-about-v2-edited-world.mjs` and
`check-about-narrative-main.mjs` must not survive by hiding a dummy lens model.

Export first to a temporary candidate directory. Make the checker accept an explicit
asset directory. Promote `meta.json`, `camera-track.json` and `surfels.bin` together
only after structural and visual approval.

Keep the fixed surfel budgets:

- mobile: 30,000;
- desktop: 90,000;
- master: 135,000.

Inspect per-object allocations after lens removal. A fixed total can over-densify an
unrelated stage when one object disappears.

## Implementation task graph

```text
career fact approval ──> read-aloud copy + substitution manifest ──┐
                                                                  ├─> Story Stack layout
career component with fictional fixtures ─────────────────────────┘

17-point source snapshot ─> Blender/generator parity ─> gate + lattice + lock
                                                       └─> candidate export

Story Stack layout + candidate export ─> semantic journey map ─> runtime/CSS integration
                                                               └─> full visual QA
```

### Workstream ownership

| Workstream | Owns | Must not change |
| --- | --- | --- |
| Narrative and facts | source ledger, read-aloud candidate, canonical copy after approval | Blender, runtime or unverified portfolio claims |
| Career component | schema, renderer, CSS, footprint and fictional tests | canonical career values |
| Blender and export | `.blend`, safe builder, exporter, metadata and asset checker | authored copy or page shell |
| Runtime integration | journey map, camera lock behavior, finale staging and affected audits | Blender geometry language or unrelated routes |
| Final integrator | trigger alignment, final diff and all checks | user-owned unrelated dirty paths |

No two workers should edit `contents-about.json` at the same time. The final integrator
owns the canonical merge after facts, field IDs and scene cues are stable.

## Implementation waves

### Wave 0 — Freeze truth and recovery points

Dependencies: none. Run serially.

Tasks:

1. Record current hashes for the saved `.blend`, `contents-about.json` and public asset
   triplet.
2. Create named Blender save copies for:
   - pre-gate-retime;
   - pre-lattice/lens-removal;
   - pre-camera-lock.
3. Confirm the 17-point scene values and mark the current builder unsafe for canonical
   use until reconciled.
4. Capture the existing desktop/mobile opening and ending baselines.
5. Complete and record the career fact approval gate.
6. Approve the one-line non-repeating finale description direction.

Exit gate:

- recovery files exist;
- facts are either approved or explicitly excluded;
- no candidate career row has entered production JSON;
- baseline evidence is named and reproducible.

### Wave 1 — Build the narrative and career layer

Dependencies: career component can start immediately with fictional fixtures; canonical
copy waits for Wave 0 fact approval.

Tasks:

1. Add `career-sequence` validation, rendering, responsive CSS and Story Stack
   footprint.
2. Add fictional-fixture tests and persistence round-trip tests.
3. Draft one uninterrupted high-retention monologue and a slot-level substitution
   manifest: field/module ID, keep/rewrite/delete/insert, source, fact status and
   before/after word count.
4. Run the read-aloud and anti-synthetic gates.
5. Insert only approved career values.
6. Add the two closing text fields and remove the repeated later career paragraph.
7. Compile Story Stack timings for desktop, tablet and mobile without preserving stale
   numeric WU values.

Exit gate:

- 14 top-level fields compile in the approved order;
- the career component has four approved rows or is absent;
- core and total copy do not exceed baseline;
- every moment trigger remains valid;
- plain DOM reading order tells the complete story without animation.

### Wave 2 — Reconcile and edit the Blender source

Dependencies: Wave 1 field IDs and story roles are locked.

Tasks:

1. Reconcile the narrow refinement script, scene custom properties, embedded README
   and repository README with the real 17-point route.
2. Retime the gate range, count and roll.
3. Create the clear release into the existing lattice.
4. Widen and thin the split lattice; remove the lens scene objects and model.
5. Add the camera-lock cue and stationary tail.
6. Save and read back every changed object, stage range, curve property and camera key.
7. Run the narrow refinement only to a temporary candidate and compare its structural
   contract with the saved canonical scene. Keep the obsolete seven-stage builder
   fail-closed.

Exit gate:

- the canonical `.blend` is saved and read back;
- the active refinement workflow and README no longer describe 29 points or a lens
  ending; the historical builder refuses to mutate;
- the restrained bank exits level;
- the final camera tail is measurably stationary;
- no new finale object was introduced.

### Wave 3 — Candidate export and runtime integration

Dependencies: Waves 1 and 2 complete.

Tasks:

1. Export to a temporary asset directory.
2. Validate source hash, route metadata, six-model topology, camera lock and surfel
   budgets.
3. Inspect per-object allocations and key camera frames.
4. Compile the story-to-journey cue map.
5. Remove final camera continuation and freeze steadycam, pointer pan and ambient motion
   after lock.
6. Fix finale description/action staging and accessibility gating.
7. End the living-canopy release before camera lock.
8. Promote the asset triplet together only after candidate proof passes.

Exit gate:

- `npm run check:about-v2-assets` passes against the saved scene;
- camera and world remain fixed after the lock cue;
- computed finale styles follow the composer phases;
- invisible actions cannot receive pointer or keyboard input;
- no console warning or GPU-buffer rebuild appears.

### Wave 4 — Cinematic edit and responsive proof

Dependencies: Wave 3 integrated.

Tasks:

1. Tune reading holds, named gaps and story-to-journey cue positions. Do not tune with
   hard-coded total WU.
2. Tune the gate exit, lattice banks, fog clear and final lock as one sequence.
3. Inspect natural slow and fast wheel/trackpad scrolling, not only programmatic jumps.
4. Capture the complete story as desktop/mobile contact sheets.
5. Run the full browser, reduced-motion and performance matrix.
6. Review the final diff for unrelated changes.

Exit gate:

- every text beat has one visual job;
- no foreground structure crosses the central reading nave;
- the final composition matches across desktop and mobile;
- the final frame remains satisfying after repeated downward input;
- upward input leaves the ending normally;
- all structural, visual and performance gates pass.

### Wave 5 — Documentation and release handoff

Dependencies: Wave 4 approved.

Tasks:

1. Update `source-assets/about-v2-blender-current/README.md` and its embedded Blender
   copy.
2. Update the preparation README to name the approved script and this implementation
   plan.
3. Mark the old lens-ending sections as historical; do not silently rewrite design
   history.
4. Record exact commands, browsers, viewports, screenshots and remaining risks.
5. Stop at verified local implementation. Commit and production publication remain
   separate explicit user actions.

## Expected implementation touchpoints

| Area | Files |
| --- | --- |
| Canonical story | `react-app/app/public/config/contents-about.json` |
| Candidate script and plan status | `docs/research/about-page-direction/preparation/` |
| Career schema | `react-app/app/src/routes/about-narrative-lab/aboutNarrativeTrackSchema.js` |
| Career renderer | `react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx` |
| Career and finale CSS | `react-app/app/src/routes/about-narrative-lab/about-narrative-lab.css` |
| Story footprint and resolved moments | `aboutNarrativeStoryLayout.js`, `aboutNarrativeMoments.js` |
| Journey mapping | new pure `aboutNarrativeJourneyMap.js` plus `aboutBlenderPointScene.js` |
| Camera and scene lock | `aboutBlenderPointScene.js`, `aboutSceneLook.js`, affected camera helpers |
| Finale phases and focus state | `aboutNarrativeComposer.js`, `useAboutNarrativeTimeline.js` |
| Blender source | `source-assets/about-v2-blender-current/about-v2-track-working.blend` |
| Reproducible refinement | `scripts/about-v2-blender/refine-about-v2-stage-separation.py`; retired builder guard in `build-parametric-narrative-world.py` |
| Export and structural checks | `export-edited-about-v2-point-world.py`, `check-about-v2-edited-world.mjs` |
| Generated assets | `react-app/app/public/models/about-v2-edited-world/` |
| Unit and contract tests | `check-about-narrative-story-layout.mjs`, `check-about-narrative-main.mjs`, new `check-about-career-sequence.mjs` |
| Browser and performance proof | About responsive, sectionless, finale-hold, runtime-visual and soak audits |

The point-field and persistence schemas should be regression-tested, but they do not
need a direct format change unless the additive module fails deterministic round-trip.
The About scene parameter panel remains numeric. Do not put factual career editing into
that panel.

## Validation plan

### Structural and content

```bash
npm run verify:portfolio-knowledge
npm run check:about-v2-assets
npm run check:about-narrative
node --test scripts/check-about-career-sequence.mjs
node scripts/check-about-narrative-main.mjs
```

Run `verify:portfolio-knowledge` only when those records change. The new career checker
must be wired into `check:about-narrative`; the standalone call remains useful during
implementation.

### Runtime, responsive and performance

```bash
node scripts/audit-about-narrative-runtime-visuals.mjs
ABS_ABOUT_SOAK_PROFILE=desktop node scripts/audit-about-narrative-runtime-soak.mjs
ABS_ABOUT_SOAK_PROFILE=mobile node scripts/audit-about-narrative-runtime-soak.mjs
ABS_BROWSER=chromium npm run audit:about-responsive-sequence
ABS_BROWSER=webkit npm run audit:about-responsive-sequence
npm run studio:check
```

Replace the current infinite-finale assertion with a finale-hold audit. Repeated
downward wheel, touch and keyboard input must not move the locked camera or world.
Upward input must resume ordinary scrolling immediately.

### Visual matrix

Full motion:

- Chromium and WebKit;
- light and dark studio-window themes;
- `1920×1080`, `1440×1000`, `1280×720`, `1024×768`;
- `390×844`, `375×667` and short landscape `844×390`.

Reduced motion:

- Chromium and WebKit;
- `1440×1000`, `390×844` and `844×390`;
- same text order, terminal composition and final payoff;
- no roll interpolation, steadycam settling, pointer pan, ambient displacement or
  end-scroll continuation.

Capture at least these ending states:

1. gate exit;
2. lattice entry;
3. first lead-in title;
4. second lead-in title before lock;
5. final title;
6. rule;
7. description;
8. actions;
9. resolved hold;
10. repeated downward input;
11. upward exit.

Capture these opening states as a separate three-frame proof:

1. cold first paint with semantic copy available;
2. scene-ready composition at scroll top;
3. first intentional transition into the inciting question.

Repeat the scene-ready frame after a route re-entry and under reduced motion. The
opening copy rectangle and effective camera position must not jump when assets resolve.

### Composition measures

At final lock:

- the lockup plus focus rings stays inside the studio window and above the Button Bar;
- inflate the measured lockup rectangle by 32 px desktop or 20 px mobile; foreground
  strands must not cross it;
- the clear centre occupies at least 44% of desktop width and 60% of mobile width;
- both peripheral banks remain visible;
- screenshots at invitation start, focus and end show no point-world pixel change after
  lock; only DOM lockup staging may change.

### Performance measures

- p95 render time at most `16.7 ms`;
- maximum render time at most `50 ms`;
- retained heap growth at most `6 MB`;
- two draw calls;
- no GPU buffer rebuilds;
- stable attribute identities;
- fixed 30k / 90k / 135k surfel profiles.

## Definition of done

### Story

- The page has 14 top-level text fields in the approved order.
- Cold load, route re-entry and reduced motion all begin with the same readable opening
  portrait; asset readiness does not move the copy or story position.
- No story progression occurs before intentional scroll input.
- Personal evidence and the complete approved career sequence appear before the
  multidisciplinary thesis.
- The career prose contains no more than three consequential turns.
- All six disciplines remain and are not enumerated again later.
- The method passage still proves question, making, challenge and delivery.
- The two exact closing titles lead into “Let’s begin.”
- The final description is practical and non-repeating.
- Core and total word counts do not grow.
- The narrative remains coherent as plain semantic DOM without the 3D world.

### Career

- Exactly one `career-sequence` renders four approved rows oldest to newest.
- Employer, role and period values link to confirmed evidence and direct approval.
- Employers, clients and projects remain distinct.
- Optional independent work is visibly subordinate and not presented as a fifth job.
- Saving and reloading an unrelated scene parameter preserves the complete module.

### Motion and finale

- The gate exits near `0.80`, uses 30–32 gates and ends level.
- The lens chamber is absent from Blender, export metadata and runtime assets.
- The existing lattice creates the final split-bank composition.
- Camera, FOV, roll, steadycam, pointer pan and point displacement are fixed after the
  lock cue.
- The final field begins only after a settled breath.
- The complete final hierarchy remains visible and stable to scroll end.

### Accessibility and responsive behavior

- Semantic headings and ordered list follow visual reading order.
- Invisible actions are inert and unfocusable.
- Focus rings remain visible and unclipped.
- No horizontal overflow, text collision or world collision occurs in the visual
  matrix.
- Reduced motion preserves order, content and final composition without decorative
  motion.

### Source integrity and performance

- Saved `.blend`, scene metadata, builder, README, exported metadata and public assets
  agree on the 17-point, lens-free contract.
- Candidate assets pass before atomic promotion.
- Source hash and structural checks pass.
- Runtime and soak thresholds pass without allocation or buffer regressions.
- Final browser evidence is reviewed, not inferred from a build.

### Release boundary

- The final diff contains only approved About work.
- No commit, push, tunnel, public mirror or production deployment is inferred from
  local completion.

## Risk register

| Risk | Mitigation | Stop condition |
| --- | --- | --- |
| Candidate facts become public | Four-row approval gate and fictional component fixtures | Any row remains disputed or stale |
| Current builder restores old scene | Safe output option, temporary rebuild and canonical overwrite refusal | Builder still creates 29 points or a lens |
| New copy moves the camera away from landmarks | Semantic piecewise journey map after measured Story Stack layout | Final cue does not align on mobile |
| Lens removal redistributes point density badly | Candidate export and per-object allocation review | Any stage loses recognition or becomes a carpet |
| Finale appears staged but remains interactive while invisible | `inert`, pointer gating and focus audit | Hidden action receives focus or click |
| Desktop and mobile show different endings | One protected nave and full visual matrix | One viewport crops a bank or clears to random dots |
| Structural checks pass but the ending still feels weak | Named contact sheets, natural-scroll review and final-frame hold | The final image lacks arrival or release |
| Dirty worktree absorbs unrelated edits | New-file plan, scoped ownership and final diff review | Required file overlaps cannot be isolated safely |

## Explicit non-goals

- No production publication or Git action.
- No shared shell, Button Bar, wall, frame, theme or typography redesign.
- No sound redesign or new finale audio cue.
- No employer logos, résumé cards or interactive career mechanic.
- No new finale object, ring, aperture, tunnel, title plate, clearance mask, text shadow
  repair or world fade.
- No broad rewrite of the supplied About voice.
- No American Heart Association contribution or outcome claims while that project is
  on hold.
- No expansion of the numeric About scene parameter panel into a factual content
  editor.

## First implementation action

Begin with Wave 0. Do not start by editing the copy or running the Blender builder.
First create the recovery points, confirm the four career rows, and reconcile the
source-authority contract. That is the shortest safe route to a high-quality final
experience.
