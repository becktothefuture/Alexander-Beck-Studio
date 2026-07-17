# About Narrative Hardening Action Sequence

## Execution rule

Work strictly in dependency order. Do not start a later PRD because an earlier diff looks plausible; start it only after the earlier PRD's tests, browser evidence, diff review, and focused commit are complete. A red gate stops the sequence.

## Phase 0: Baseline and isolation

1. Start from a clean implementation branch or isolated worktree.
2. Record the current commit, Node/npm/browser versions, OS, GPU, viewport profiles, point budgets, and canonical config hash.
3. Run the existing About and site gates.
4. Capture exact-WU desktop/mobile and reduced-motion screenshots for all five production transitions, discipline labels, cold direct seek, and bust formation.
5. Record current Worker timings, main-thread apply time, live WebGL resources, cache behavior, frame time, and console output.
6. Store artifacts under `output/playwright/about-narrative-hardening/baseline/` and add their manifest path to `progress-log.md`.

**Breakpoint:** Stop if the baseline cannot be reproduced or current tests are red for reasons unrelated to the packet. Record and resolve that condition before PRD 01.

## Phase 1: PRD 01 — Runtime reliability and resource lifecycle

1. Implement the preparation state machine, failure categories, one-owner Worker generation, and retry latch.
2. Introduce versioned Worker envelopes and atomic complete-sequence validation/publication.
3. Replace pair-specific GPU attribute replacement with fixed arrays/attributes.
4. Move sequence identity, preparation descriptors, and modifier resolution outside RAF.
5. Add bounded caches and complete disposal/abort behavior.
6. Add requested-Shape bootstrap, semantic-anchor projection, bust states, context recovery, and development diagnostics.
7. Add failure injection and runtime soak tooling.
8. Run every PRD 01 gate, inspect visual evidence, review the diff, and fix regressions.
9. Create one focused runtime commit and record its hash/evidence.

**Required breakpoint:** owned GPU count/bytes stay at the warmed baseline throughout 1,000 pair changes; retained post-GC heap growth is at most `2MiB`; no complete relevant main-thread task reaches `8.00ms` in either protected point profile; no failed-key retry storm; no hot-path sequence preparation/allocation.

## Phase 2: PRD 02 — Correspondence correctness and scalability

1. Freeze legacy byte fixtures before algorithm changes.
2. Add the single correspondence registry and exact input/group validation.
3. Implement `spatial-nearest-v2` with visibility-first shared-group assignment.
4. Implement deterministic joint assignment for no more than six target-only semantic anchors.
5. Implement the bounded residual spatial matcher and scale-aware tie handling.
6. Integrate cumulative fingerprints and full per-pair metrics with the PRD 01 Worker protocol.
7. Add pure, property, benchmark, direct-seek, reverse-scrub, and legacy-compatibility tests.
8. Compare all five production pairs at desktop/mobile point budgets through the deterministic audit harness, without editor/store changes.
9. Approve or reject `v2` independently for each canonical pair; do not mass-migrate.
10. Run every PRD 02 gate, review the diff, and create one focused algorithm commit.

**Required breakpoint:** complete deterministic bijections across fixtures/seeds; zero avoidable visible-to-hidden matches; legacy fixtures unchanged; every selected canonical change has approved metrics and screenshots.

## Phase 3: PRD 03 — Editor, persistence, and accessibility

1. Freeze current document/config and transition-boundary fixtures.
2. Implement schema v2, strict raw validation, sequential migrations, canonical serialization, and future read-only handling.
3. Implement the shared capability resolver and exact transition semantics.
4. Implement registry-derived strategy selection, Try/Compare/Apply/Cancel, undo, and pair-level status bound to exact fingerprints.
5. Implement targeted Retry, explicit adopt-fallback, revert, diagnostic Export, and consolidated announcements.
6. Implement atomic ETag Save, in-flight edit preservation, read-only conflict comparison, confirmed reload, and temporary-file cleanup; automatic remote rebase is deferred.
7. Implement classified draft recovery and storage/import/export/checkpoint error handling.
8. Complete keyboard, focus, live-region, responsive, reduced-motion, and production-isolation behavior.
9. Run every PRD 03 gate, inspect browser evidence, review the diff, and create one focused editor/persistence commit.

**Required breakpoint:** no capability disagreement; no invalid/future input becomes writable; no save/recovery scenario loses local or canonical data; editor is keyboard-operable; production bundle has no authoring sentinels.

## Phase 4: PRD 04 — Independent certification

1. Run the pure/adversarial suite from a clean checkout.
2. Run the complete Worker failure matrix.
3. Run the 1,000-transition GPU/cache/Worker soak in the non-deployable production-optimized certification build.
4. Run persistence conflict, interruption, recovery, and quota tests.
5. Run Chromium and WebKit desktop/mobile editor and playback audits serially.
6. Run reduced-motion and keyboard/touch accessibility audits.
7. Build the separate actual production artifact and run the editor/certification-marker leakage audit plus playback smoke trace.
8. Capture and manually inspect exact-WU screenshots, traces, metrics, and console logs.
9. Generate the evidence manifest with tool/browser/hardware/config/commit metadata.
10. Assign a senior reviewer who did not implement the relevant code; resolve every high-severity finding.
11. Create one focused certification/test commit if PRD 04 adds or changes durable test infrastructure.

**Required breakpoint:** all quantitative budgets pass; all required artifacts exist and have been reviewed; no unresolved high-severity finding; production preview is visually approved.

## Final handoff

1. Run `npm run check:site` and the complete About certification once more on the integrated branch.
2. Inspect the combined diff and commit history for unrelated changes.
3. Update `progress-log.md` with commit hashes, evidence manifests, approved visual differences, risks, and reviewer sign-off.
4. Move implemented PRDs into `archive/actioned/` and update links without deleting evidence history.
5. Merge or push only after explicit authorization and successful production deployment verification.

## Commit boundaries

- Commit 1: runtime lifecycle/resource hardening.
- Commit 2: correspondence v2/registry/metrics.
- Commit 3: editor/schema/persistence/accessibility hardening.
- Commit 4: certification infrastructure and evidence-contract updates, if code changes are required.

Do not combine these merely to shorten history. If a PRD requires multiple internal commits during development, squash or retain them according to review needs, but its final reviewed boundary must remain identifiable.
