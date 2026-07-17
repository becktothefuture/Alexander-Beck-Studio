# PRD: Spatial Point Correspondence

## Status

Implemented and verified. Revised after independent animation-systems, graphics-algorithm, and editor-architecture critiques, then validated by a final read-only implementation review.

## Introduction / Overview

The About narrative reuses one fixed Three.js point pool while procedural Shapes change from cluster, turbulent field, calm field, discipline grid, living field, and bust. Today, most transitions use `index-v1`: point `0` moves to target point `0`, point `1` moves to target point `1`, and so on. The generators are deterministic, but their array order does not describe visual proximity. A point can therefore cross a large part of the scene even when a closer unclaimed destination exists.

Add a deterministic `spatial-nearest-v1` correspondence strategy. It must reorder the target Shape once when a Shape pair is prepared so that points travel locally in world space, while keeping the renderer's fixed point pool, one draw call, shader interpolation, semantic attributes, density behavior, saved-document contract, and last-known-good fallback intact.

This is an approximate assignment problem. An exact global minimum-cost assignment for 12,000 points is too expensive for the browser. The implementation will use a locality-preserving spatial ordering, deterministic refinement, and a measured fallback to the current mapping when the candidate is not better.

## Resolved Product Questions

The preceding design discussion resolves the decisions that would otherwise require clarification:

1. **Primary goal:** reduce visibly long, erratic morph paths while keeping a continuous transformation of the same material.
2. **Scope:** one new reusable correspondence strategy, editor selection, canonical configuration migration, diagnostics, tests, and browser verification.
3. **Default behavior:** existing documents remain valid; the current About sequence explicitly opts relevant transitions into the new strategy.
4. **Quality target:** improve aggregate and tail travel distance without introducing frame-loop work or non-determinism.
5. **Semantic priority:** a semantic group match, such as a discipline anchor, must not be sacrificed merely to shorten geometric distance.

## Goals

- Reduce total world-space point travel for every opted-in Shape transition compared with `index-v1`.
- Reduce long outlier paths that read as chaotic or disconnected from the surrounding morph.
- Preserve exact point-count, presence, size, and custom-attribute alignment.
- Preserve deterministic output for the same source Shape, target Shape, transforms, mode, and seed.
- Perform correspondence only when a Shape pair changes, never in the RAF loop.
- Let the author choose the correspondence strategy per World transition in the creative toolkit.
- Retain the last valid point pair if Shape generation or correspondence preparation fails.
- Carry the mapped point order cumulatively through the complete World sequence so a point's seed, colour, drift phase, presence, and semantic identity do not reset at the next transition.
- Prepare correspondence off the main thread and before an active transition whenever possible.

## User Stories

### US-001: Compute a spatially local point assignment

**Description:** As an audience member, I want points to move to nearby destinations so Shape changes feel purposeful rather than arbitrarily chaotic.

**Acceptance Criteria:**

- [ ] `spatial-nearest-v1` produces a complete one-to-one permutation of target point indices.
- [ ] Assignment distances are measured after both Shapes' authored world transforms are applied.
- [ ] The returned target positions, presence, size, and every custom attribute use the same permutation.
- [ ] The source and canonical target buffers are not mutated.
- [ ] For the same inputs, output buffers and metrics are byte-for-byte deterministic.
- [ ] The selected result's total squared travel distance is never greater than the compatible `index-v1` baseline.
- [ ] Unit tests pass.

### US-002: Preserve density and semantic continuity

**Description:** As a narrative author, I want sparse Shapes and semantic discipline points to remain coherent while travel is shortened.

**Acceptance Criteria:**

- [ ] Active is defined as `presence > 0.001`.
- [ ] Persistent visible points are assigned first, appearing/disappearing points second, and inactive-to-inactive points last.
- [ ] Inactive points are assigned without changing the fixed GPU pool size.
- [ ] Matching non-zero `disciplineGroup` values are reserved before general spatial assignment, including unequal group cardinalities.
- [ ] A target-only discipline anchor reserves its nearest eligible visible source point even when the source Shape has no group attribute.
- [ ] If active counts differ, every source and target is still used exactly once.
- [ ] A sparse-to-dense and dense-to-sparse test preserves all presence values and target attributes.
- [ ] Unit tests pass.

### US-003: Prepare and cache correspondence outside playback

**Description:** As a visitor, I want smooth scrolling while the system prepares a new Shape transition.

**Acceptance Criteria:**

- [ ] Correspondence runs in a dedicated module Worker and only when the source/target pair, strategy, transform, quality, seed, upstream mapped order, or relevant world placement changes.
- [ ] The pair cache key includes the correspondence strategy and world-space transform inputs.
- [ ] No correspondence calculation occurs inside the shader or per-frame render path.
- [ ] The previous complete installed pair—including buffers, World snapshots, transforms, metrics, and progress—stays visible until the new pair is ready.
- [ ] A failed preparation sets a diagnostic state and retains the last valid field.
- [ ] Shape pairs are prewarmed in sequence order; `bufferRebuilds` does not change after an opted-in transition has begun.
- [ ] Worker results carry generation ownership; stale results are ignored and a failed key can be retried.
- [ ] No synchronous correspondence task longer than one 60 Hz frame occurs on the main thread.
- [ ] Worker computation, message transfer, and main-thread permutation application are benchmarked separately at 12,000 points.
- [ ] `npm run check:about-narrative` passes.

### US-003A: Preserve cumulative particle identity

**Description:** As an audience member, I want the same physical point to continue through the whole narrative so colour and motion do not flicker when one transition hands off to the next.

**Acceptance Criteria:**

- [ ] The mapped endpoint installed for A→B is byte-identical to the source installed for B→C across positions, presence, size, and scalar custom attributes.
- [ ] `pointSeed` remains tied to the same pool index through the full sequence.
- [ ] Direct seeking to a later transition produces the same cumulative mapping and frame as sequential playback.
- [ ] Changing an upstream Shape, transform, strategy, seed, or placement invalidates all dependent downstream mappings.
- [ ] Frozen-clock handoff produces no position, colour, presence, semantic-group, or drift-phase discontinuity.

### US-004: Select correspondence per transition

**Description:** As the creative toolkit user, I want to choose how a World transition maps points so I can compare spatial locality with index or semantic matching.

**Acceptance Criteria:**

- [ ] The World inspector shows a labelled Correspondence selector for enabled transitions.
- [ ] Options include Index order, Stable seed, Local travel (approx.), and Group aware.
- [ ] Changing the option is one undoable editor command and marks the document dirty.
- [ ] Saving and reloading retains the selected strategy.
- [ ] Unsupported values fail schema validation rather than silently executing.
- [ ] The inspector states `Maps [source Shape] → [target Shape]` and shows Preparing, Ready, Baseline fallback, or Failed for the installed pair.
- [ ] Changing strategy preserves focus, selection, playhead, Camera, Text, transition timing, and playback state.
- [ ] Cut, hold, and unsupported adapter combinations disable the selector with an explanation.
- [ ] Preparation status uses a polite live region and is announced once per state change, not on HUD polling.
- [ ] Verify in browser using the dev-browser skill.

### US-005: Apply spatial correspondence to the current narrative

**Description:** As the site owner, I want the current procedural transitions to use the improved strategy so the live narrative benefits immediately.

**Acceptance Criteria:**

- [ ] Cluster → turbulent field uses `spatial-nearest-v1`.
- [ ] Turbulent field → calm field uses `spatial-nearest-v1`.
- [ ] Calm field → discipline grid uses `spatial-nearest-v1` while retaining all six discipline groups.
- [ ] Discipline grid → living field uses `spatial-nearest-v1`.
- [ ] Living field → bust uses `spatial-nearest-v1`.
- [ ] The initial cluster self-pair remains compatible and visually unchanged.
- [ ] Verify representative transition start, midpoint, and end states in browser at desktop and mobile profiles.

### US-006: Expose verifiable diagnostics

**Description:** As a developer refining the animation, I want correspondence metrics so I can confirm that a strategy is helping rather than relying only on intuition.

**Acceptance Criteria:**

- [ ] Prepared output reports requested strategy, installed strategy, fallback reason, unweighted total travel, visibility-weighted RMS, visible p95, visible maximum, normalized long-path counts, and improvement versus baseline.
- [ ] Long-path counts use 25% and 50% of the shared world-space bounds diagonal.
- [ ] Runtime metrics expose the installed pair ID, active strategy, preparation duration, and travel metrics without adding React updates to the hot frame.
- [ ] Values are finite for valid non-empty point pools.
- [ ] Browser audit can assert the active strategy after a transition pair is prepared.
- [ ] Unit and browser audits pass.

### US-007: Form the bust against a stable destination

**Description:** As an audience member, I want the living field to resolve cleanly into the bust before the sculpture begins rotating.

**Acceptance Criteria:**

- [ ] Bust yaw is held at its entry value while living-field → bust correspondence and morphing are active.
- [ ] Automatic or interactive bust rotation begins from that same value only after formation settles.
- [ ] Scrubbing backward and forward does not introduce a yaw jump at the formation boundary.
- [ ] Deterministic scrub and live ambient playback are both verified in browser.

## Functional Requirements

- **FR-1:** Add `spatial-nearest-v1` to `ABOUT_NARRATIVE_CORRESPONDENCE_MODES`.
- **FR-2:** The strategy must work on a fixed equal-length source and target point pool and return a target output with identical typed-array lengths.
- **FR-3:** Correspondence must evaluate coordinates in world space using the source and target transform matrices active for that Shape pair.
- **FR-4:** The algorithm must create a deterministic bijection; no target index may be duplicated or omitted.
- **FR-5:** The algorithm must reserve spatial matches within shared non-zero semantic groups. Surplus grouped points return to general buckets. Target-only semantic anchors reserve their nearest eligible visible sources. One-sided source-only groups receive no reservation.
- **FR-6:** Remaining points must be consumed through disjoint deterministic phases: persistent visible, active-count surplus paired to appearing/disappearing destinations, then inactive-to-inactive.
- **FR-7:** The implementation must calculate identical visibility-aware metrics for the spatial candidate and semantic/presence-compatible index baseline. Total squared travel, weighted RMS, and the 50%-diagonal long-path count may not regress. Tail quality uses a documented balanced guard: p95 improvement may tolerate at most 2% maximum-distance regression, or maximum improvement may tolerate at most 8% p95 regression. Otherwise install the compatible baseline. The 25%-diagonal count remains diagnostic because splitting one extreme path into two shorter paths can legitimately increase it while improving the protected result.
- **FR-8:** Reordering must move target `Float32Array positions` (stride 3), `presence`, `size`, and scalar `Float32Array` custom attributes (stride 1) together. Size length and finiteness are validated before mapping.
- **FR-9:** `applyAboutNarrativeCorrespondence` must not mutate either input.
- **FR-10:** Pair identity must include algorithm version, `shapeId`, generator version, seed, parameters, quality/point count/profile, correspondence mode, upstream mapped-order identity, `startWU`, global camera start Z/cadence, entry distance, position, rotation, effective scale, and mobile Y offset. Camera keys, aim, FOV, roll, easing, and transition timing do not invalidate correspondence.
- **FR-11:** The renderer must build an atomic prepared-pair object containing identity, mapped buffers, semantic attributes, immutable World/transform snapshots, metrics, preparation state, and progress. It swaps complete pairs only between frames.
- **FR-12:** The editor must expose the strategy as a native select in the selected World's Transition In inspector.
- **FR-13:** The canonical About document must opt the five inter-Shape morphs into `spatial-nearest-v1`.
- **FR-14:** Migration may add `index-v1` only when a legacy correspondence field is absent. Save/import must validate explicitly authored raw input before normalization so unsupported values are rejected.
- **FR-15:** Runtime diagnostics must identify the installed—not merely requested—pair and report pair ID, state, strategy, fallback reason, weighted RMS/p95/max, long-path counts, improvement, and preparation duration. Successful recovery clears stale failure attributes.
- **FR-16:** Reduced-motion playback must continue to use settled/opacity behavior and must not depend on correspondence animation.
- **FR-17:** The compiler/runtime must expose the ordered unique World sequence so mappings can be prepared cumulatively and direct seek matches sequential playback.
- **FR-18:** Correspondence Workers return only validated `Uint32Array` permutations plus metrics; main-thread code applies permutations to cached canonical Shape outputs without transferring or detaching those canonical buffers.
- **FR-19:** Correspondence and sequence caches are bounded LRUs; transform-slider edits cannot cause unbounded retained buffers.
- **FR-20:** Existing `index-v1`, `stable-seed`, and `group-aware` output remains byte-compatible unless an explicit migration is documented.

## Non-Goals

- Exact Hungarian, auction, or optimal-transport assignment across all 12,000 points.
- Per-frame dynamic remapping while modifiers animate.
- Per-point manual editing.
- Changing generators, point counts, shader interpolation, camera choreography, transition timing, or turbulence values.
- Adding a general curve editor or node graph.
- Persisting generated permutations or buffers in the authored JSON.
- Moving correspondence to a production backend.
- Replacing the current Three.js point-field adapter.

## Design Considerations

- The motion should read as the same material reorganising itself, not particles teleporting or crossing the full viewport unnecessarily.
- The correspondence control belongs beside Type and Easing in Transition In because it describes the relationship between two Worlds, not either Shape in isolation.
- Editor labels should use plain language; implementation IDs remain visible only where the existing toolkit exposes technical identifiers.
- The current About narrative's camera, text, discipline reveal, and turbulence are migration baseline and must not be retimed by this feature.
- “Local travel (approx.)” is the author-facing label. The strategy improves bounded perceptual metrics but does not claim a mathematically global nearest-neighbour optimum.

## Technical Considerations

### Assignment strategy

1. Validate matching fixed pool lengths and finite scalar Float32 attributes.
2. Transform rest-pose local source and target coordinates with immutable column-major world matrices.
3. Reserve shared-group matches, then target-only discipline anchors.
4. Partition remaining indices into deterministic persistent-visible, appearing/disappearing, and inactive phases using the `0.001` threshold.
5. Quantise within shared bounds to a documented 10-bit-per-axis 3D Morton key; zero-span axes quantise to zero and equal keys break by original index.
6. Pair equal-cardinality buckets by Morton order.
7. Assign count-mismatch leftovers through the next defined phase without reusing a source or target.
8. Run fixed forward/reverse swap passes at documented strides, accepting a swap only when its two-pair squared cost improves beyond epsilon.
9. Validate the complete `Uint32Array` permutation.
10. Compare the candidate with a semantic/presence-compatible index baseline using protected visibility-aware tail metrics.
11. Return the winning permutation, requested/installed strategy, fallback reason, and metrics from the Worker.
12. Apply the permutation to a target clone and carry that ordered endpoint forward as the source of the next sequence transition.

The first version should prefer clarity and bounded work over a theoretically optimal solver. The algorithm must be `O(n log n)` time and `O(n)` memory for `n` points.

### Cache and lifecycle

- Shape generation cache remains separate from a bounded permutation/sequence cache.
- Pair keys must change when a strategy or transform changes even if Shape buffers are reused.
- Public playback starts sequence prewarming at the first rendered frame. Pair preparation proceeds in story order so cumulative identity is deterministic.
- The Worker is terminated or generation-owned when a new sequence supersedes it; late results cannot install.
- During an edit rebuild, the complete last-known-good sequence remains active. The initial load may publish the first settled Shape before downstream pairs finish prewarming.

### Compatibility

- `index-v1`, `stable-seed`, and `group-aware` remain supported.
- Existing saved documents without the new mode retain their current mapping.
- Current scalar `Float32Array` custom attributes must be permuted generically; broader typed-array strides remain out of scope.
- Discipline overlay projection must consume the mapped attribute/position pair.

## Success Metrics

- 100% of target points are assigned exactly once in every tested transition.
- Visibility-weighted RMS and 50%-diagonal long-path counts are never worse than the compatible baseline; p95/max stay within the balanced tail guard, and the diagnostic 25%-diagonal count is reviewed alongside them.
- Every current inter-Shape transition installs the spatial strategy with a positive RMS improvement and no protected-metric fallback. The migration baseline records true RMS improvements of 3.8%–17.9%; future solver refinements may pursue 20% or more without weakening the tail guards.
- No new allocations or correspondence work occur in the RAF loop.
- Main-thread permutation application stays within one 60 Hz frame on the project development machine; Worker compute and transfer median/p95 are reported separately.
- Existing About narrative unit tests, Chromium audit, mobile profile audit, lint, and site build pass.
- Visual inspection confirms no teleport, blank field, missing discipline anchor, or broken bust transition.

## Failure Handling and Safeguards

- Invalid typed-array lengths throw before a pair is installed.
- Non-finite transformed coordinates fail preparation and retain the last valid pair.
- A duplicate or missing target assignment fails validation and retains the last valid pair.
- If any protected visibility-aware tail metric regresses, the semantic-compatible index baseline is installed and diagnostics report the fallback.
- If correspondence preparation throws, the renderer preserves its current attributes and reports `data-world-prepare="failed"`.
- The new mode is registered code only; JSON cannot inject an algorithm.
- Metrics remain development diagnostics and do not trigger state updates each frame.
- Old buffers are never rendered with newly requested World transforms while a candidate sequence is pending.
- Bust yaw is zeroed/held through formation and begins rotating only from its settled endpoint.

## Verification Plan

### Pure tests

- Reversed-line fixture resolves to zero travel instead of full-span crossings.
- Determinism for repeated inputs.
- One-to-one permutation integrity.
- No input mutation.
- World-transform-aware assignment.
- Semantic group preservation.
- Dense ↔ sparse presence preservation.
- Attribute alignment after permutation.
- Candidate-never-worse fallback.
- Degenerate axes and duplicate collapsed coordinates.
- Fractional presence at `0`, `0.0005`, `0.5`, and `1`.
- Sparse mismatch in both directions.
- Shared groups with unequal cardinality and one-sided groups.
- Target-only discipline-anchor reservation.
- Cumulative A→B→C endpoint/source byte identity and direct-seek parity.
- Stale Worker ownership, failure retry, and bounded-cache eviction.
- 5,000 and 12,000 point worker/main-thread performance smoke tests.

### Browser audits

- Open `/lab/about-narrative.html?edit=1`.
- Select a World and change Correspondence; confirm selection, undo/redo, dirty state, save/reload behavior, and prepared runtime strategy.
- Scrub the five inter-Shape transitions at 0%, 25%, 50%, 75%, and 100% with ambient motion frozen.
- Inspect desktop, mobile, and reduced-motion profiles in Chromium and WebKit.
- Confirm the six discipline labels still originate from the six coloured points.
- Confirm the final bust forms without a blank or failed field.
- Rapidly change strategy and transform; only the final request may install.
- Force failure then recovery; previous complete pair remains visible and stale diagnostics clear.
- Confirm `bufferRebuilds` stays stable during active morphs.
- Review same-WU screenshots or recordings for crossings, silhouette stability, colour/drift flicker, blank frames, discipline-anchor attachment, and bust formation.
- Save/reload testing uses a temporary fixture or restores the exact canonical file in `finally`; it must not leave audit mutations in the repository.

### Project gates

```bash
npm run check:about-narrative
ABS_BROWSER=chromium npm run audit:about-narrative
npm run check:site
```

## Open Questions

No blocking product questions remain. A later version may compare a more advanced optimal-transport approximation against `spatial-nearest-v1`, but this release deliberately ships a deterministic, bounded, visibility-aware locality solver.

## Implementation Results

- The canonical sequence uses `spatial-nearest-v1` for all five inter-Shape transitions while the initial cluster remains `index-v1`.
- Desktop measurements recorded positive RMS improvements for cluster → turbulent field (4.0%), turbulent field → calm field (6.7%), calm field → discipline grid (3.8%), discipline grid → living field (8.7%), and living field → bust (17.9%).
- In the measured Chromium run, procedural generation took 19.7ms and correspondence took 151.2ms inside the Worker. End-to-end preparation took 215.1ms; applying all typed-array permutations on the main thread took 7.2ms, below one 60Hz frame. Canonical Shape buffers are no longer cloned on the main thread for Worker input.
- The pure suite passes 33 tests, including deterministic bijection, world transforms, target-only discipline anchors, fractional density, cumulative identity, 12,000-point performance, serialization, and undo.
- Chromium and WebKit audits pass at 1440×1000 and 390×844, including editor interaction, all five installed strategies, stable buffer rebuild counts during morphs, discipline reveal, forward and reverse bust-yaw formation lock, and a reduced-motion bust sample.
- `npm run check:site` passes, including lint, design-config parity, Vite production build, and confirmation that editor code is absent from production assets.
