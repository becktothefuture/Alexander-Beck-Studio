# PRD 01: About Narrative Runtime Reliability and Resource Lifecycle

## Status

Proposed. This is the first implementation PRD and establishes the runtime contracts required by PRDs 02–04.

## Introduction / Overview

The About Narrative uses one Three.js renderer, scene, camera, point pool, and RAF while a Worker prepares cumulative procedural Shapes. The successful path is visually strong, but the independent review found failure and lifecycle behavior that can degrade long editing sessions: a persistently failing sequence retries from every frame, replaced `BufferAttribute` objects can leave GPU buffers behind, sequence keys are serialized in the hot path, the Shape cache is unbounded, direct cold seeks initially show the wrong Shape, and semantic labels do not always include shader displacement.

This PRD makes the runtime deterministic and bounded before the assignment algorithm or editor contracts are expanded. The chosen architecture uses one explicit preparation state machine, one active Worker generation, fixed reusable GPU attributes, compiler-owned sequence identity, entry-and-byte-bounded caches, allocation-free hot-path sampling, and development-only resource instrumentation.

Minor visual changes are allowed only for correct cold-seek presentation, point-label attachment, or removal of an existing discontinuity. Camera movement, text timing, section extents, transition timing, point budgets, material language, and narrative order remain the migration baseline.

## Goals

- Prevent Worker retry storms and stale-result installation.
- Keep WebGL buffer ownership constant through at least 1,000 pair changes.
- Keep every runtime cache within declared entry and byte limits.
- Remove sequence hashing, Shape generation, correspondence, and runtime-owned allocation from RAF.
- Keep every correspondence-related main-thread task under `8ms`.
- Show the requested settled Shape during cold direct seek and reduced-motion playback.
- Keep discipline labels attached to their displaced semantic points.
- Make bust formation, rotation, reverse scrubbing, and interaction deterministic.
- Expose enough development diagnostics to verify resource and failure behavior without React polling.

## User Stories

### US-101: Latch a failed sequence key

**Description:** As a visitor, I want the last valid point field to remain stable after preparation fails so a persistent failure cannot overload the page.

**Acceptance Criteria:**

- [ ] Preparation uses the states `idle`, `loading`, `ready`, `failed`, and `disposed`.
- [ ] Failure is recorded against the exact compiled sequence key and generation.
- [ ] A deterministic validation failure receives no automatic retry.
- [ ] A transient Worker construction or crash failure receives at most one timer-driven retry after `1,000ms`.
- [ ] The retry timer is cancelled when the key changes, the route unmounts, the page becomes hidden, or manual Retry supersedes it.
- [ ] After the retry budget is exhausted, RAF sampling cannot restart that key.
- [ ] `retryPreparation({ sequenceKey, pairId, inputFingerprint })` rejects stale requests, clears only the selected current failure intent, and starts at most one sequence-owned Worker generation.
- [ ] Retry may rebuild the cumulative suffix or complete sequence as required by upstream identity; it never pretends to run an isolated pair Worker and publishes only a complete atomic sequence.
- [ ] The previous complete installed pair remains visible during failure and retry.
- [ ] One warning is emitted per attempt; 600 subsequent frames emit no additional warnings or Worker starts.
- [ ] `npm run check:about-narrative` passes.

### US-102: Enforce one-owner Worker preparation

**Description:** As a developer, I want explicit asynchronous ownership so stale, partial, or detached data can never become render state.

**Acceptance Criteria:**

- [ ] At most one correspondence Worker is active per runtime.
- [ ] Every request and response contains `protocolVersion`, `generation`, and `sequenceKey`.
- [ ] Superseding a request invalidates its generation before terminating its Worker.
- [ ] The Worker produces final cumulative mapped Shape outputs and per-pair diagnostics.
- [ ] The main thread performs no correspondence or permutation application.
- [ ] Each transferable `ArrayBuffer` has one documented owner and is transferred exactly once.
- [ ] The main thread validates the complete response before publishing any part of it.
- [ ] One invalid output, pair, metric, or reference rejects the complete candidate sequence.
- [ ] Stale or invalid messages cannot change ready state, installed state, transforms, caches, diagnostics, or GPU arrays.
- [ ] Unmount terminates the Worker, cancels retries, aborts bootstrap generation, and clears ownership references.
- [ ] Failure-injection tests cover construction failure, crash, stale success, stale error, malformed output, and unmount during preparation.

### US-103: Reuse fixed GPU attributes

**Description:** As an editor user, I want repeated scrubbing to reuse constant GPU resources so long creative sessions remain stable.

**Acceptance Criteria:**

- [ ] The adapter creates exactly nine point attributes once: `position`, `targetPosition`, `pointSeed`, `fromPresence`, `toPresence`, `fromPointSize`, `toPointSize`, `fromGroup`, and `toGroup`.
- [ ] `pointSeed` remains immutable for the adapter lifetime.
- [ ] Pair installation copies validated data into the fixed typed arrays and marks only changed attributes `needsUpdate`.
- [ ] `geometry.setAttribute()` is not called after initialization.
- [ ] Attribute object identity, item size, and length remain constant.
- [ ] Complete validation occurs before the first fixed array is mutated.
- [ ] After validation, installation uses non-throwing fixed-length copies and publishes the pair only after all copies finish.
- [ ] A development ledger counts actual WebGL buffer creation, deletion, live count, and attributed bytes.
- [ ] After warm-up, 1,000 pair changes produce zero increase in live WebGL buffers and zero attribute-identity changes.
- [ ] Teardown returns the resource ledger to its pre-mount live-buffer baseline.
- [ ] The complete Worker-message callback, complete fixed-array installation callback, and correspondence-specific first post-install render/upload submission are each below `8.00ms` at both 12,000 desktop and 5,000 mobile points on recorded reference hardware.

### US-104: Bound Shape and sequence caches

**Description:** As an editor user, I want discarded experiments evicted so memory does not grow with every parameter change.

**Acceptance Criteria:**

- [ ] Shape and sequence caches use one tested LRU utility with entry and unique-buffer byte limits.
- [ ] Exactly two strong-reference runtime caches may retain generated Shape/correspondence typed arrays: the Shape LRU and sequence LRU.
- [ ] Bootstrap generation uses the bounded Shape LRU; cumulative mapped outputs and generated permutations belong only to sequence entries, never a third cache.
- [ ] Installed, pending, and bootstrap references are explicit pinned owners counted by the unique-byte ledger and released on replacement/disposal.
- [ ] Shape cache limit is `8` entries or `4MiB`, whichever is reached first.
- [ ] Sequence cache limit is `3` entries or `16MiB`, whichever is reached first.
- [ ] Installed, ready, and pending entries are pinned while owned by the runtime.
- [ ] An active entry larger than its byte limit is retained alone and reports `oversizeActive`.
- [ ] Rejected and aborted promises are removed immediately.
- [ ] Eviction clears strong references without mutating fixed GPU arrays.
- [ ] Shared `ArrayBuffer` references are counted once.
- [ ] Unmount clears all non-GPU cache references.
- [ ] A 1,000-edit test never exceeds the declared limits.
- [ ] Diagnostics expose entries, unique bytes, hits, misses, evictions, pinned entries, and oversize state.
- [ ] Every `Map`, `WeakMap`, memo, promise, or array retaining a generated buffer registers an owner with the resource ledger; development fails if an unknown strong-reference owner retains a generated `ArrayBuffer`.

### US-105: Remove preparation work from RAF

**Description:** As a visitor, I want rendering to sample compiled state without serialization or allocation so camera cadence remains smooth.

**Acceptance Criteria:**

- [ ] The compiler creates immutable `worldSequenceKey` and preparation descriptors only when a document/profile compiles.
- [ ] Samples pass the compiled key by reference to the runtime.
- [ ] `render()` never stringifies or hashes authored data.
- [ ] `render()` never starts a Worker, generates a Shape, computes correspondence, creates typed arrays, or maps the World sequence.
- [ ] Modifier sampling writes into caller-owned scratch values or compiled scalar fields.
- [ ] No point-world-owned object, array, closure, vector, or matrix is allocated after warm-up during 600 steady frames.
- [ ] Sequence-key build count remains unchanged during those 600 frames.
- [ ] Every complete correspondence-related main-thread task remains below `8.00ms` at both protected point profiles; subphase marks cannot hide an over-budget callback.
- [ ] One renderer, scene, camera, point pool, draw call, and RAF remain invariant.
- [ ] Hot-path allocation checks run in Chromium.

### US-106: Bootstrap the requested Shape on cold seek

**Description:** As an editor user, I want direct navigation to show the requested environment instead of an unrelated opening cluster.

**Acceptance Criteria:**

- [ ] When no last-known-good pair exists, bootstrap generation targets the Shape requested by the sampled frame.
- [ ] Bootstrap installs a settled target-to-target pair with deterministic index order.
- [ ] Camera, text, Section, and playhead continue sampling the requested WU.
- [ ] No blank canvas, NaN transform, or unrelated first Shape remains after bootstrap resolves.
- [ ] The cumulative prepared sequence replaces bootstrap atomically.
- [ ] Final prepared endpoint buffers match sequential preparation byte-for-byte.
- [ ] Reduced motion can display the requested settled Shape without waiting for an animated morph.
- [ ] Reduced motion keeps ambient movement, continuous camera flight, blur/depth travel, and automatic bust rotation disabled.
- [ ] Bootstrap failure retains readable editorial content and the registered procedural fallback.
- [ ] Verify direct seek at desktop, mobile, and reduced-motion profiles using the dev-browser skill.

### US-107: Project semantic anchors through modifier displacement

**Description:** As an audience member, I want discipline labels to stay attached to the coloured points that carry their meaning.

**Acceptance Criteria:**

- [ ] The point-field adapter exposes allocation-free semantic-anchor projection for the six discipline points.
- [ ] Projection applies the same morph, World transforms, story offset, bust yaw, and active modifier displacement as the vertex shader.
- [ ] Every position-changing modifier declares `anchorSampling: exact` or `anchorSampling: unsupported`.
- [ ] Unsupported sampling produces a development diagnostic and an explicit fixed editorial-anchor fallback.
- [ ] CPU projection and shader-equivalent fixtures cover swarm, drift, wave, grid influence, group emphasis, and bust yaw.
- [ ] Label-to-point centre error is at most `6px` desktop and `8px` mobile.
- [ ] Projection creates no per-label RAF allocations.
- [ ] Discipline copy, reveal timing, camera movement, and editorial rhythm stay unchanged.
- [ ] Verify in browser using the dev-browser skill.

### US-108: Make bust motion an explicit state machine

**Description:** As an audience member, I want the bust to form, rotate, and respond to reverse scrubbing without snapping.

**Acceptance Criteria:**

- [ ] Bust interaction uses `outside`, `forming`, `settled`, `dragging`, `resume-delay`, and `auto-rotating` states.
- [ ] Entering formation captures one yaw value that remains constant throughout forward or reverse formation.
- [ ] No formation-boundary yaw jump exceeds `0.003 radians`.
- [ ] Deterministic scrubbing never advances ambient yaw.
- [ ] Live ambient playback advances yaw only in `auto-rotating`.
- [ ] Pointer and keyboard interaction are accepted only after settlement.
- [ ] Reduced motion disables automatic yaw but retains settled pointer and keyboard rotation.
- [ ] Cold direct seek to settled bust starts at yaw `0`.
- [ ] Leaving the bust releases pointer capture and clears bust-only state.
- [ ] Forward, reverse, drag, keyboard, resume-delay, hidden-page, reduced-motion, and direct-seek cases are tested.

### US-109: Recover WebGL and expose resource diagnostics

**Description:** As a developer, I want observable failure and recovery state so resource safety can be verified rather than inferred.

**Acceptance Criteria:**

- [ ] Diagnostics expose active/pending/failed key, per-pair fingerprint/state/source, generation, attempts/triggers, requested/installed strategy, fallback reason, Worker starts/terminations/stale results, cache counts/bytes, GPU buffers/bytes, installs/uploads, install timing, and last failure category.
- [ ] Diagnostics are sampled on demand without React state updates or per-frame allocation.
- [ ] The runtime provides `getDiagnosticsSnapshot()` and `subscribeDiagnostics(listener)`; lifecycle-only immutable emissions are compatible with `useSyncExternalStore`, never fire per frame, and require unsubscribe on editor unmount.
- [ ] Context loss pauses rendering and publication while editorial DOM remains visible.
- [ ] Context restoration recreates fixed GPU resources once, reinstalls the last valid pair, and resumes the existing RAF.
- [ ] Recovery does not duplicate listeners, observers, Workers, attributes, geometry, material, scene objects, or caches.
- [ ] Successful recovery clears current failure presentation while preserving historical counters.
- [ ] Fault injection and the resource ledger are development-only and absent from production assets.
- [ ] Evidence is written under `output/playwright/about-narrative-hardening/runtime/`.

## Functional Requirements

- **FR-101:** Replace preparation closure flags with one pure sequence-preparation controller and documented transition table.
- **FR-102:** Failed keys must not restart from RAF.
- **FR-103:** Allow no more than one automatic retry for transient failure and none for deterministic validation failure.
- **FR-104:** Expose targeted manual Retry through a stable runtime API.
- **FR-105:** Permit at most one live Worker and version every protocol envelope.
- **FR-106:** Prepare final cumulative ordered outputs in the Worker.
- **FR-107:** Validate the entire Worker response atomically before publication.
- **FR-108:** Ignore stale generations without side effects.
- **FR-109:** Preallocate fixed GPU arrays and attributes at adapter creation.
- **FR-110:** Install pairs through fixed-length copies and `needsUpdate` only.
- **FR-111:** Instrument actual WebGL buffer ownership in development audits.
- **FR-112:** Bound Shape cache at 8 entries/4MiB and sequence cache at 3 entries/16MiB.
- **FR-113:** Count unique underlying buffers and implement pinned-entry behavior.
- **FR-114:** Compile sequence identity and preparation descriptors outside runtime sampling.
- **FR-115:** Remove serialization, correspondence orchestration, dynamic modifier objects, and typed-array creation from RAF.
- **FR-116:** Cold direct seek must bootstrap the requested settled Shape.
- **FR-117:** Reduced-motion readability must not depend on animated correspondence readiness.
- **FR-118:** Semantic anchors must account for every active position-changing operation or use a declared fallback.
- **FR-119:** Bust story state and ambient rotation state must be separate.
- **FR-120:** Context recovery must preserve last-known-good CPU state and single-runtime invariants.
- **FR-121:** Runtime diagnostics must be allocation-light and query-based.
- **FR-121a:** Diagnostic subscriptions emit only bounded lifecycle changes; high-frequency metrics remain pull-based.
- **FR-122:** Fault hooks, verbose counters, and the WebGL ledger must be excluded from production.
- **FR-123:** Every complete relevant main-thread task must complete below `8.00ms` at both protected point profiles on the declared reference hardware; Worker duration is reported separately.
- **FR-124:** One thousand warmed pair changes must retain zero additional live GPU buffers.
- **FR-125:** Adapter disposal must terminate asynchronous work, remove listeners/observers, clear timers/caches, dispose Three.js resources, and remove diagnostics.

## Non-Goals

- No change to correspondence assignment, group matching, distance metrics, tail guards, or fallback selection beyond the Worker interface required by PRD 02.
- No new correspondence mode.
- No editor inspector, Save, recovery, conflict, or accessibility work.
- No transition-type product-semantic change.
- No camera, copy, text, section, transition-timing, palette, material, point-count, Shape-parameter, turbulence, or World-order change.
- No second renderer, canvas, scene, camera, point pool, or RAF.
- No generalized GPU framework for unrelated site simulations.
- No persistence of generated buffers, caches, diagnostics, or failure state.

## Technical Considerations

- Extract the preparation controller into a pure module with injected Worker factory, timer, cache, validator, and diagnostic sink.
- Use typed failure categories: `validation`, `unsupported`, `worker-construction`, `worker-import`, `worker-crash`, `worker-protocol`, `worker-timeout`, `transfer`, `generation`, `asset`, `aborted`, and `context-loss`. Each declares `retryClass: none | one-shot`, a stable code, public-safe message, and optional development detail.
- Use suitable Three.js draw usage and upload fixed attributes only when a pair changes.
- Explicit WebGL buffer instrumentation is required because `renderer.info.memory.geometries` cannot prove attribute deletion.
- Compute canonical sequence keys in the compiler; do not rely only on reference equality.
- Make modifier resolution a compiler step or a caller-owned-target API.
- Treat anchor projection as an adapter/modifier capability, not six CSS exceptions.
- Keep the development ledger, failure injection, and detailed datasets tree-shaken from production.
- Copying fixed arrays must be benchmarked at 12,000 desktop and 5,000 mobile points before the `8ms` gate is accepted.

## Success Metrics

- No Worker restart across 600 frames after retry budget exhaustion.
- Maximum one active Worker and zero stale installation.
- Zero live-GPU-buffer growth and zero attribute-identity changes after 1,000 pair changes.
- Shape cache never exceeds 8 entries/4MiB; sequence cache never exceeds 3 entries/16MiB.
- Every complete correspondence-related main-thread task is below `8.00ms` in both protected point profiles.
- Retained JavaScript heap after explicit Chromium GC is no more than `2MiB` above the warmed baseline following the 1,000-switch soak.
- No sequence-key build, Worker start, correspondence call, typed-array allocation, or runtime-owned allocation during 600 warmed frames.
- One renderer, scene, camera, point pool, draw call, and RAF remain invariant.
- Direct seek shows the requested Shape and converges to byte-identical cumulative endpoints.
- Label tracking remains within 6px desktop/8px mobile.
- Bust boundary yaw remains within 0.003 radians.
- Context recovery restores the last valid field without duplicate resources.

## Dependencies and Delivery Sequence

1. Capture the current canonical runtime metrics and exact-WU screenshots.
2. Extract state machine, protocol validation, cache utility, and resource ledger without visual change.
3. Move final cumulative output preparation into the Worker.
4. Replace pair-specific attributes with fixed reusable attributes.
5. Move sequence identity and modifier resolution out of RAF.
6. Add bounded caches and complete disposal.
7. Add requested-Shape bootstrap and reduced-motion direct seek.
8. Add semantic-anchor projection and bust state machine.
9. Add failure injection and 1,000-transition soak audit.
10. Run the PRD gate, inspect evidence, and create one focused commit.

This PRD blocks PRD 02 because algorithm work must target the stable Worker protocol. It exposes per-pair lifecycle, diagnostics, and Retry APIs consumed by PRD 03.

## Verification Plan

### Pure tests

- Preparation state table, failure latch, retry budget, key invalidation, and disposal.
- Worker protocol version, stale result, malformed payload, and atomic publication.
- LRU entry/byte limits, pinned entries, oversize-active behavior, and shared-buffer counting.
- Sequence-key determinism and zero rebuild during sampling.
- Requested-Shape bootstrap and direct-seek parity.
- Reduced-motion settled target.
- Bust state transitions and reverse continuity.
- Semantic-anchor parity with shader-equivalent formulas.

### Browser and soak audits

- Worker construction failure, one-shot crash, persistent crash, stale result, malformed payload, bootstrap failure, context loss, unmount, and hidden-page retry cancellation.
- Add `npm run audit:about-narrative-runtime-soak`.
- Run 1,000 transitions in Chromium and emit before/peak/after GPU, cache, Worker, heap, upload, install, and frame-time metrics.
- Capture desktop/mobile direct seek, discipline labels, reduced motion, and bust forward/reverse states.
- Verify UI-visible behavior with the dev-browser skill.

### Required gates

```bash
npm run check:about-narrative
ABS_BROWSER=chromium npm run audit:about-narrative
ABS_BROWSER=webkit npm run audit:about-narrative
ABS_BROWSER=chromium npm run audit:about-narrative-runtime-soak
npm run check:site
npm run build
npm run preview
```

## Open Questions

No blocking product questions remain. Implementation must record the hardware and browser used for the `8ms` certification. If one active sequence exceeds the declared cache byte budget, it must remain alone and report `oversizeActive`; the limit must not be silently raised.
