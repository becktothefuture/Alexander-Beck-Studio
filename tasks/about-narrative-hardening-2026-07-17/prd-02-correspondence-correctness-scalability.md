# PRD 02: About Narrative Correspondence Correctness and Scalability

## Status

Proposed. This is the second implementation PRD and depends on the Worker protocol, fixed GPU pool, and diagnostics established by PRD 01.

## Introduction / Overview

Point correspondence decides which existing particle becomes which particle in the next Shape. The current spatial strategy substantially improves average travel, but the review found correctness and scalability gaps: semantic grouping can pair hidden points while visible alternatives exist, fractional group IDs are rounded, group lookup repeatedly scans the full pool, target-only anchors are assigned greedily, and strategy validation differs between direct code calls and authored documents.

This PRD introduces `spatial-nearest-v2` as an opt-in, deterministic strategy. It preserves visible material first, keeps semantic groups exact, assigns the six target-only discipline anchors jointly, and bounds preparation at `O(n log n)` time and `O(n)` memory. Existing `index-v1`, `stable-seed`, `group-aware`, and `spatial-nearest-v1` outputs remain byte-compatible so saved documents do not change unexpectedly.

Minor visual differences are accepted only when measured travel, continuity, and semantic correctness improve and the exact-WU comparison is approved. The point pool, shader interpolation, transition timing, point colours, point sizes, density semantics, camera, text, and World transforms remain unchanged.

## Goals

- Preserve visible-to-visible continuity before assigning hidden capacity.
- Treat semantic group IDs as exact validated values.
- Remove repeated full-pool scans and per-anchor greedy assignment.
- Keep preparation deterministic, cumulative, and outside RAF.
- Add scale-aware numerical handling for degenerate and near-equal positions.
- Centralize strategy registration, schema validation, editor options, Worker dispatch, and diagnostics.
- Prove all five production transitions at desktop and mobile point budgets.
- Give authors a safe opt-in and rollback path for the new strategy.

## User Stories

### US-201: Preserve visible material within semantic groups

**Description:** As an audience member, I want visible particles to continue into visible destinations so Shapes feel like one material reorganizing itself.

**Acceptance Criteria:**

- [ ] Points are partitioned by exact semantic group before spatial assignment.
- [ ] Within every shared group, visible source points are paired with visible target points first.
- [ ] Presence is treated continuously; `presence > epsilon` is visible and exact fractional presence remains available to diagnostics.
- [ ] Remaining visible points are paired with the strongest available presence before hidden capacity is used.
- [ ] Excess source points collapse toward a valid target anchor before disappearing.
- [ ] Excess target points emerge from a valid source anchor rather than an arbitrary distant point.
- [ ] Correspondence never synthesizes coordinates or reuses an index: appearing/disappearing points select unique generator-provided inactive indices whose coordinates may already share a valid anchor; coordinate equality is allowed, index duplication is not.
- [ ] The final mapping is a complete bijection of the fixed point pool.
- [ ] Source and target buffers are not mutated.
- [ ] Fixtures cover visible/invisible inversions, unequal group cardinalities, sparse-to-dense, dense-to-sparse, and empty groups.

### US-202: Validate semantic groups exactly

**Description:** As a developer, I want invalid group data rejected rather than silently reclassified so semantic identity remains trustworthy.

**Acceptance Criteria:**

- [ ] Group IDs must be finite integers within the declared adapter range.
- [ ] Fractional, negative, out-of-range, and non-finite IDs fail validation.
- [ ] No `Math.round`, coercive parsing, or modulo normalization is used.
- [ ] Required group buffers must match point count exactly.
- [ ] A group table is built in one pass for each endpoint.
- [ ] Group membership arrays preserve original stable index order.
- [ ] Unknown group values fail the complete candidate sequence and keep the last-known-good pair installed.
- [ ] Diagnostics identify Shape ID, point index, attribute, and invalid value without dumping full buffers.

### US-203: Assign target-only discipline anchors jointly

**Description:** As an audience member, I want the six highlighted discipline points to emerge from the nearest sensible material without crossing unnecessarily.

**Acceptance Criteria:**

- [ ] Target-only semantic anchors are collected before ordinary residual assignment.
- [ ] The strategy solves their assignment jointly rather than greedily in authored order.
- [ ] The exact bounded solver supports at most six semantic anchors.
- [ ] For `k ≤ 6`, the solver is bounded by `O(n × k × 2^k)` time and `O(n + 2^k)` memory; `k > 6` fails validation before allocation.
- [ ] The objective minimizes total normalized squared travel, then maximum individual travel, then stable source index.
- [ ] Candidate sources prefer visible compatible points and may use hidden capacity only when required.
- [ ] One source cannot be assigned to more than one anchor.
- [ ] Reordering equivalent anchor declarations does not change the resulting mapping.
- [ ] Degenerate equal-cost cases resolve deterministically.
- [ ] The solver emits selected source indices and objective values in development diagnostics.

### US-204: Bound spatial assignment cost

**Description:** As an editor user, I want Shape replacement to remain responsive at the production point budgets.

**Acceptance Criteria:**

- [ ] `spatial-nearest-v2` is bounded at `O(n log n)` time and `O(n)` auxiliary memory.
- [ ] No group or anchor performs an independent full-pool scan.
- [ ] Spatial bins, sort keys, or trees are built once per endpoint as needed and reused within the pair calculation.
- [ ] Candidate expansion has a documented bounded fallback that still completes a bijection.
- [ ] No `n × n` distance matrix is allocated.
- [ ] Temporary buffers are Worker-owned and released after transfer or failure.
- [ ] Desktop `12,000`-point and mobile `5,000`-point benchmarks cover all five production pairs.
- [ ] Correspondence preparation never runs on the main thread or from RAF; every complete message/validation/publication/install task remains below `8.00ms` at both protected point profiles.

### US-205: Use scale-aware distance and tie handling

**Description:** As a developer, I want numerical behavior to remain stable across tiny, large, flat, and repeated-coordinate Shapes.

**Acceptance Criteria:**

- [ ] Distance normalization derives from validated combined bounds rather than one fixed world-unit epsilon.
- [ ] Degenerate bounds use an explicit finite fallback scale.
- [ ] Tie tolerance is proportional to scene scale and machine precision.
- [ ] Duplicate coordinates preserve stable source/target index order.
- [ ] Every metric remains finite for valid input.
- [ ] NaN or infinite intermediate values reject the candidate sequence.
- [ ] Tests cover zero-sized bounds, one-axis fields, duplicate points, extreme valid scale, and near-ties.

### US-206: Centralize correspondence strategy registration

**Description:** As an author, I want the editor, schema, compiler, Worker, and diagnostics to agree about which strategies exist.

**Acceptance Criteria:**

- [ ] One registry owns strategy ID, version, label, description, capabilities, parameters, and implementation dispatch.
- [ ] Shared serializable metadata and Worker-only executable dispatch are separate modules with tests asserting identical ID/version sets; schema/compiler/editor never import algorithm handlers.
- [ ] Schema validation, editor options, compiler validation, Worker dispatch, and documentation derive from that registry.
- [ ] Direct code calls reject unknown strategy IDs rather than falling back to index order.
- [ ] `spatial-nearest-v2` is a new registered ID; `spatial-nearest-v1` remains available for saved documents.
- [ ] Legacy strategy outputs remain byte-identical for unchanged fixtures.
- [ ] Registry IDs can select registered code only; JSON cannot inject executable behavior.
- [ ] A strategy/version change invalidates the compiled sequence and relevant caches exactly once.

### US-207: Preserve cumulative identity across the complete story

**Description:** As an audience member, I want particles to retain identity through A→B→C rather than being independently reshuffled at every boundary.

**Acceptance Criteria:**

- [ ] The mapped target order from pair N is the exact source order for pair N+1.
- [ ] Direct seek and sequential playback compile the same cumulative outputs.
- [ ] Reverse scrubbing samples the same endpoint buffers and does not recompute correspondence.
- [ ] Point seed, colour identity, presence, size, and semantic attributes follow the cumulative order.
- [ ] Worker output includes a deterministic cumulative-order fingerprint for every Shape.
- [ ] Repeated preparation from the same inputs is byte-identical.
- [ ] Editing one downstream pair cannot alter prior cumulative endpoints.

### US-208: Prove improvement before canonical adoption

**Description:** As the creative director, I want to see evidence that a new algorithm improves motion before it changes the published narrative.

**Acceptance Criteria:**

- [ ] Diagnostics report total, mean, p50, p90, p95, p99, maximum, and visible-only travel.
- [ ] Diagnostics report group mismatch count, visible-to-hidden count, anchor objective, and tail-guard count.
- [ ] Metrics are calculated in normalized world space and include units/version metadata.
- [ ] A deterministic development audit can compare `spatial-nearest-v1` and `spatial-nearest-v2` at the same WU without changing Camera or Text.
- [ ] All five production pairs are captured at desktop and mobile profiles.
- [ ] Canonical adoption requires no regression in semantic mismatches or visible-to-hidden count and an approved material-motion comparison.
- [ ] Any accepted increase in one distance percentile is documented alongside the continuity benefit.
- [ ] The audit is read-only; registry-derived editor Try/Compare/Apply/Cancel and undo behavior are implemented in PRD 03.

## Functional Requirements

- **FR-201:** Add registered strategy `spatial-nearest-v2`; do not mutate `v1` behavior.
- **FR-202:** Validate every input buffer, bound, transform, group, presence, and point count before assignment.
- **FR-203:** Build source and target semantic group maps in one pass.
- **FR-204:** Assign visible shared-group material before hidden or cross-group capacity.
- **FR-205:** Solve up to six target-only semantic anchors jointly with deterministic bounded dynamic programming.
- **FR-206:** Complete residual matching with a deterministic spatial-neighborhood strategy bounded at `O(n log n)`.
- **FR-207:** Guarantee a complete bijection and immutable source inputs.
- **FR-208:** Use scale-aware epsilon and tie-breaking.
- **FR-209:** Preserve cumulative order and direct-seek equivalence.
- **FR-210:** Run generation and all correspondence inside the single PRD 01 Worker generation.
- **FR-211:** Return final cumulative typed arrays and per-pair diagnostics through the versioned Worker envelope.
- **FR-212:** Validate the envelope and metrics atomically before publication.
- **FR-213:** Centralize correspondence metadata and dispatch in one registry.
- **FR-214:** Reject unknown direct API modes, unsupported versions, and malformed parameters.
- **FR-215:** Cache prepared sequence outputs using compiler-owned identity that includes strategy and algorithm version.
- **FR-216:** Record deterministic fingerprints and performance timings for every pair.
- **FR-217:** Add deterministic property tests over at least 1,000 recorded seeds.
- **FR-218:** Benchmark all five canonical transitions at both protected point counts.
- **FR-219:** Require visual and metric approval before changing the canonical document to `v2`.
- **FR-220:** Keep correspondence preparation, metrics, and permutations out of RAF and main-thread application.
- **FR-221:** A failed `v2` safeguard may install a runtime-only validated safety baseline without mutating authored JSON; diagnostics must report requested and installed strategy IDs and the failed safeguard.
- **FR-222:** One versioned metrics schema owns visibility threshold, weights, shared-bounds normalization, percentile interpolation, units, baseline mode, tail-guard rules, and requested/installed algorithm versions.

## Non-Goals

- No global optimal transport, Hungarian assignment over the complete pool, physics simulation, or per-frame re-assignment.
- No nearest-neighbour dependency added without a measured, deterministic browser-compatible build justification.
- No change to fixed point counts, GPU attributes, shaders, camera, text, section order, transition windows, modifier behavior, or authored Shape geometry.
- No automatic migration of saved `spatial-nearest-v1` clips to `v2`.
- No silent fallback when a requested strategy or payload is invalid.
- No arbitrary user-authored algorithm code.
- No implementation of editor Save, recovery, conflict handling, or production isolation.

## Technical Considerations

- Prefer stable integer sort keys or a deterministic spatial grid over engine-dependent object iteration.
- The six-anchor solver is deliberately bounded; reject a generator that declares more semantic anchors until a new capability version exists.
- Visibility priority and spatial distance are separate objective tiers, not one fragile weighted sum.
- The canonical lexicographic order is: exact semantic compatibility; minimize avoidable visibility-class mismatch using `presence > 0.001`; minimize fractional presence difference; minimize normalized squared travel; minimize maximum travel; stable source then target index.
- Compute metrics from the final cumulative assignment, not an intermediate proposal.
- Valid unknown strategy/version/parameter/group/payload errors fail the candidate and preserve last-known-good. Only a valid registered strategy may invoke its documented measured safety baseline after a quality guard fails.
- Pair diagnostics must be keyed by compiled pair ID and input fingerprint so stale results cannot appear current.
- PRD 02 owns strategy IDs, versions, metadata, pure dispatch, safety-baseline selection, and metric contracts. PRD 03's cross-domain capability resolver consumes this registry and must not duplicate it.
- Registry descriptions may be JSON-safe, but implementation handlers remain code-only. Import, recovery, and Save must reject a registry-shaped payload attempting to supply executable behavior.
- Retain property-test seeds as fixtures whenever they reveal a new failure class.
- Compare Worker time separately from generation, transfer, main-thread validation, fixed-array installation, and GPU upload.

## Success Metrics

- Zero incomplete, duplicate, or out-of-range mappings across deterministic fixtures and 1,000 property seeds.
- Zero semantic group mismatches when compatible capacity exists.
- Zero visible-to-hidden pairings while a visible compatible target remains.
- Byte-identical permutations/fingerprints across repeated Chromium, WebKit Worker, and Node runs from frozen validated Float32 inputs; procedural generator output is deterministic within each engine and uses tolerance/visual checks across engines.
- All five desktop/mobile production pairs complete within the Worker while every complete relevant main-thread task remains below `8.00ms` at both protected point profiles.
- No correspondence call, assignment, permutation, or metric calculation appears in RAF.
- Direct seek endpoints are byte-identical to sequential cumulative endpoints.
- Legacy strategies remain byte-identical for protected fixtures.
- Canonical `v2` adoption has reviewed metrics and exact-WU screenshots for every changed pair.

## Dependencies and Delivery Sequence

1. Complete and certify PRD 01 Worker, cache, fixed-buffer, and diagnostic contracts.
2. Freeze byte fixtures for every existing strategy.
3. Create the shared registry and strict group/input validation without canonical behavior change.
4. Implement visibility-first group partitioning and the bounded anchor solver.
5. Implement the deterministic scalable residual matcher and scale-aware ties.
6. Integrate cumulative Worker output, fingerprints, and complete metrics.
7. Add pure, property, benchmark, and direct-seek tests.
8. Add a deterministic audit-only v1/v2 comparison harness and publish the registry/diagnostic contract consumed by PRD 03.
9. Review the five production transitions and opt in only the approved pairs.
10. Run the PRD gate, inspect evidence, and create one focused commit.

This PRD provides installed per-pair status and strategy diagnostics consumed by PRD 03. PRD 04 independently certifies the complete implementation.

## Verification Plan

### Pure and property tests

- Bijection, immutability, determinism, exact group validation, visibility priority, anchor order invariance, cumulative identity, and scale-aware ties.
- Legacy byte fixtures for `index-v1`, `stable-seed`, `group-aware`, and `spatial-nearest-v1`.
- At least 1,000 recorded randomized seeds with shrinking or retained minimal fixtures.

### Benchmarks and browser proof

- Five production pairs at 12,000 desktop and 5,000 mobile points.
- Compare total and tail travel, visible-only travel, semantic mismatches, anchor travel, Worker duration, transfer, validation, install, and upload.
- Capture exact-WU before/after images in Chromium and WebKit at desktop and mobile profiles.
- Scrub forward, reverse, and direct seek; verify through the dev-browser skill.

### Required gates

```bash
npm run check:about-narrative
ABS_BROWSER=chromium npm run audit:about-narrative
ABS_BROWSER=webkit npm run audit:about-narrative
ABS_BROWSER=chromium npm run audit:about-narrative-runtime-soak
npm run check:site
```

## Open Questions

No blocking product questions remain. The implementation may choose the deterministic spatial index after benchmarking, but it must meet the complexity, determinism, memory, and observable behavior contracts above. Canonical clips remain on their current strategy until their individual evidence is approved.
