# PRD 04: About Narrative Verification and Release Certification

## Status

Proposed. This is the final PRD in the About Narrative hardening packet and must not begin until PRDs 01–03 have passed their individual gates.

## Introduction / Overview

The current About Narrative checks prove the primary successful path, but they do not force the failures, races, long editor sessions, persistence conflicts, or resource pressure identified by the independent review. This PRD creates a repeatable certification system for the complete narrative toolkit.

Certification must combine pure deterministic tests, failure injection, resource soak tests, save-server integration tests, cross-browser interaction audits, performance traces, and reviewed visual evidence. A green build alone is not sufficient. The output is a durable evidence manifest that another developer can reproduce from a clean checkout.

## Goals

- Prove every hardened runtime, correspondence, editor, persistence, accessibility, and production-isolation contract introduced by PRDs 01–03.
- Detect Worker retry storms, stale-result installation, GPU-buffer growth, cache growth, malformed Worker envelopes, invalid schema migration, and save/recovery failures.
- Enforce the selected performance contract: no correspondence work in RAF, no complete relevant main-thread task at or above `8.00ms`, bounded caches, and constant live GPU-buffer ownership through 1,000 transition changes.
- Verify current and intentionally improved visual behavior at exact world-unit checkpoints.
- Produce machine-readable results, screenshots, traces, and a human-reviewed release checklist.
- Keep every audit deterministic, non-destructive, and suitable for local or CI execution.

## User Stories

### US-001: Exercise deterministic and adversarial correspondence fixtures

**Description:** As a developer, I want pure correspondence tests that cover adversarial inputs so future optimizations cannot silently break material continuity.

**Acceptance Criteria:**

- [ ] Tests cover all registered correspondence modes, including rejection of an unknown direct API mode.
- [ ] Tests cover visible/invisible inversions within shared semantic groups.
- [ ] Tests cover unequal group cardinalities, target-only anchors, duplicate coordinates, degenerate point bounds, fractional presence, rejected zero/negative authored scale, extreme valid transforms, and cumulative A→B→C identity.
- [ ] Randomized property tests use recorded seeds and print the failing seed.
- [ ] Every generated mapping is a complete bijection and does not mutate either source.
- [ ] All five canonical production transitions run through the pure benchmark harness.
- [ ] Repeated runs with the same inputs are byte-identical.
- [ ] `npm run check:about-narrative` passes.

### US-002: Force Worker failures and lifecycle races

**Description:** As a developer, I want deterministic failure injection so the last-known-good field and retry safeguards are proven rather than inferred.

**Acceptance Criteria:**

- [ ] The audit can force Worker construction, import, generation, correspondence, malformed-message, and transfer failures independently.
- [ ] A transient failed sequence key receives no more than one timer-driven automatic retry after its initial attempt; deterministic validation failures receive none.
- [ ] The previous complete pair stays visible after failure.
- [ ] Explicit Retry creates exactly one new generation.
- [ ] Editing the failed key creates one new generation without requiring Retry.
- [ ] Results from aborted or stale generations never install.
- [ ] Undoing to a cached sequence cancels the obsolete pending Worker.
- [ ] Context loss/restoration, hidden-page retry cancellation, route unmount during preparation, and at least 25 mount/unmount cycles preserve single ownership and bounded resources.
- [ ] Successful recovery clears stale failure diagnostics.
- [ ] No failure path produces an unhandled rejection or repeated console output.

### US-003: Certify GPU and cache stability through a 1,000-transition soak

**Description:** As an author, I want long timeline sessions to remain stable so experimentation does not progressively consume memory or slow the page.

**Acceptance Criteria:**

- [ ] A development-only audit alternates across all prepared World pairs at least 1,000 times.
- [ ] The audit includes forward scrubbing, reverse scrubbing, direct seeking, reseeding, transform edits, undo, and redo.
- [ ] Live WebGL buffer count and attributed GPU bytes equal the warmed baseline at every fixed sample during 1,000 switches; a quiescence window applies only to explicit teardown/context rebuild checks.
- [ ] No post-warm-up pair switch creates or deletes a point-attribute WebGL buffer.
- [ ] Shape and sequence cache entry counts and unique retained bytes never exceed their PRD 01 limits; generated permutations remain owned by the bounded sequence entries rather than a hidden third cache.
- [ ] Evicted CPU outputs release all strong references and leave the unique-byte ledger; fixed GPU attributes are never cache-evicted, and Three.js objects dispose only on adapter teardown/context rebuild.
- [ ] The test emits before, peak, and after resource measurements as JSON.
- [ ] After explicit Chromium GC, retained JavaScript heap is no more than `2MiB` above the warmed baseline.
- [ ] The 1,000-transition audit passes in Chromium.

### US-004: Certify the `8ms` main-thread budget

**Description:** As a visitor, I want correspondence preparation and installation to remain invisible to scrolling so the spatial journey maintains its cadence.

**Acceptance Criteria:**

- [ ] Instrumentation separately reports Worker Shape generation; Worker assignment/reordering/metrics; transfer; the complete main-thread message callback including protocol validation/cache publication; the complete fixed-array installation callback; correspondence-specific CPU submission in the first post-install render; and sequence-key compilation.
- [ ] No correspondence or Shape-assignment function runs from the RAF call stack.
- [ ] Main-thread permutation-application count is exactly zero.
- [ ] Every complete relevant main-thread task is strictly below `8.00ms` for both 12,000-point desktop and 5,000-point mobile profiles on the recorded reference hardware; subphase marks cannot hide an aggregate callback over budget.
- [ ] Desktop and mobile reports include median, p95, maximum, sample count, and device/profile metadata.
- [ ] Per-frame sequence-key serialization is absent from steady-state playback.
- [ ] The performance test fails on a missing or non-finite measurement.
- [ ] Raw JSON and a Chrome trace are saved under the evidence directory.
- [ ] Worker duration is reported separately and is not judged against the main-thread limit.

### US-005: Verify editor, Save, conflict, and recovery behavior

**Description:** As the narrative author, I want persistence failures and conflicts to be recoverable and understandable so experimentation cannot lose work.

**Acceptance Criteria:**

- [ ] Integration tests use a temporary canonical fixture and never mutate the repository document.
- [ ] Tests cover valid Save/reload parity; missing/wrong editor header and Origin; missing `If-Match`; wrong content type; malformed/stream-oversized input; stale ETag; concurrent same-ETag Save with one success/one `409`; interrupted write; file/directory flush failure; and temporary-file cleanup.
- [ ] Edits made during an in-flight Save remain dirty after the sent snapshot succeeds.
- [ ] Recovery tests cover current/stale/previous-schema/future/expired/unreadable drafts, invalid envelope/document, storage denial/quota, checkpoint corruption, import/export/download failure, `pagehide` after autosave failure, Recover as unsaved copy, and Discard; no state auto-applies.
- [ ] `hold`, `morph`, `dissolve-morph`, and `cut` are verified; capability-disabled `crossfade` is verified against the current adapter, and the future supported contract is covered by pure resolver fixtures without shipping a new adapter.
- [ ] Per-pair `idle`, `preparing`, `ready`, `fallback`, and `failed` states are verified against the exact installed fingerprint; retry is verified as a new generation within `preparing`, not an undocumented sixth state.
- [ ] Runtime safety fallback preserves the requested strategy in JSON and remains saveable with warning; the separate Adopt fallback command changes authorship once, is undoable, and round-trips through Save/reload.
- [ ] Save and recovery states are announced through the expected live regions.
- [ ] Keyboard-only operation covers the correspondence control, Retry, Save, recovery, and timeline selection.
- [ ] A live-region mutation log proves one announcement per stable event, no performance metrics are announced, only blocking data-loss/conflict uses assertive status, focus is not stolen during typing, and visible help is connected through `aria-describedby`.
- [ ] Automated WCAG 2.2 AA checks and a recorded VoiceOver + Safari smoke check cover focus, contrast, announcements, conflict, and recovery.
- [ ] Verify in browser using the dev-browser skill.

### US-006: Verify browser, profile, and visual behavior

**Description:** As the site owner, I want reviewed cross-browser evidence so small allowed visual improvements do not introduce broken narrative states.

**Acceptance Criteria:**

- [ ] Chromium and WebKit pass at `1440×1000` and `390×844`.
- [ ] Desktop, mobile, reduced-motion, deterministic-scrub, and live-ambient profiles are exercised.
- [ ] Exact-WU captures cover the start, midpoint, and end of all five canonical transitions.
- [ ] Captures cover forward and reverse bust formation, interaction handoff, discipline anchors, and direct seek before preparation completes.
- [ ] Light and dark site themes are captured where material contrast can change.
- [ ] No blank field, unexpected fallback, detached label, camera jump, text obstruction, or Button Bar overlap appears.
- [ ] Intentional visual differences are documented with before/after images and an approval note.
- [ ] Verify in browser using the dev-browser skill.

### US-007: Prove production isolation and publish a certification manifest

**Description:** As a maintainer, I want one reproducible release record so I can distinguish an audited build from an optimistic local result.

**Acceptance Criteria:**

- [ ] A production build contains the runtime Worker but no editor, save-client, recovery, authoring-label, or development-endpoint code.
- [ ] Asset/source-map scanning finds no editor JS/CSS chunk, fixed editor header, recovery/checkpoint storage key, fault ID, verbose diagnostic field, authoring label, endpoint string, or certification flag; the production API is unavailable while the runtime Worker remains functional.
- [ ] `/about.html` and production `/lab/about-narrative.html?edit=1` remain playback-only.
- [ ] A machine-readable manifest records clean commit SHA, Node/npm/OS/hardware/GPU/browser versions, schema/compiler/Worker/registry versions, canonical config hash, point budgets, exact commands/environment, production and certification artifact hashes, evidence hashes, PRD/requirement coverage, retries, reviewer independence, and pass/fail state.
- [ ] The manifest refuses a release-grade status when required evidence is missing.
- [ ] A human reviewer signs off the representative screenshots and unresolved warning list.
- [ ] `npm run check:site` passes.
- [ ] Production preview verification passes before this PRD is marked complete.
- [ ] Certification uses a non-deployable production-optimized `ABS_CERTIFY=1` build for read-only marks/resource/fault evidence and a separate actual production build for isolation/playback; the manifest records both hashes and fails if certification sentinels enter the actual production artifact.

## Functional Requirements

- **FR-1:** Consume and independently rerun the focused pure/property command delivered by PRD 02.
- **FR-2:** Property tests must be deterministic and bounded; all random seeds must be recorded.
- **FR-3:** Consume the registered development-only failure-injection hooks delivered by PRD 01; do not fork them.
- **FR-4:** Failure injection must address Worker construction, Worker execution, message validation, transfer, Shape generation, and persistence independently.
- **FR-5:** Consume the PRD 01 1,000-transition resource-soak audit with explicit WebGL buffer creation/deletion accounting.
- **FR-6:** Resource tests must distinguish live resources from peak allocations and garbage awaiting collection.
- **FR-7:** Cache instrumentation reports entries, retained bytes, hits, misses, evictions, rejected entries, and every registered buffer owner; certification fails on any unknown/unregistered strong-reference cache owner.
- **FR-8:** Validate the PRD 01 performance marks around every complete relevant main-thread correspondence task and required subphase.
- **FR-9:** Performance reports fail when any complete relevant main-thread task is at or above `8.00ms` in either protected point profile on the declared reference hardware.
- **FR-10:** Browser audits must sample installed per-pair diagnostics rather than requested settings alone.
- **FR-11:** Browser audits must wait on explicit runtime states instead of arbitrary sleep where a state signal exists.
- **FR-12:** Save integration tests use an injected temporary same-filesystem path behind the same validation, mutex, ETag, and atomic-rename implementation as the endpoint and fail before the first request if that path resolves inside the repository public config directory.
- **FR-13:** Recovery tests must isolate local storage per test and restore it in teardown.
- **FR-14:** Accessibility assertions must inspect computed names, descriptions, roles, live-region behavior, focus retention, and keyboard operation.
- **FR-15:** Visual captures must use deterministic story time and frozen ambient time unless the test explicitly targets ambient behavior.
- **FR-16:** Exact-WU capture metadata must include Section ID, source Shape, target Shape, transition progress, correspondence mode, and installed fallback state.
- **FR-17:** Chromium and WebKit audits must run serially to avoid shared-server and GPU contention.
- **FR-18:** Production verification must use `npm run preview` on port `8013`, not the development server.
- **FR-19:** Evidence artifacts must live under the gitignored `output/playwright/about-narrative-hardening/` tree.
- **FR-20:** The release manifest must distinguish required failures, acknowledged warnings, browser flake retries, and final passing attempts.
- **FR-21:** A failed first audit followed by a passing retry must remain visible in the manifest rather than being silently discarded.
- **FR-22:** No certification or persistence test may write `react-app/app/public/config/contents-about.json`; restoration in `finally` is not an acceptable safeguard.
- **FR-23:** PRD 04 adds only `npm run certify:about-narrative`, clean-checkout orchestration, evidence normalization, manifest validation, and independent review. A demonstrated harness gap returns to the owning PRD gate; certification may not fork an existing harness or change production behavior silently.

## Non-Goals

- No public telemetry collection.
- No permanent debug overlay in production.
- No claim of mathematical proof that the approximate assignment is globally shortest.
- No general site-wide performance certification beyond regressions caused by this toolkit.
- No automated aesthetic approval without a human visual review.
- No parallel execution of GPU/browser audits that share the same server or artifact directory.

## Design Considerations

- Development diagnostics should be compact, readable, and visually distinct from the website design language.
- Failure-injection controls may live in an advanced development-only inspector or test API; they must never appear in playback.
- Screenshot comparison boards should prioritize narrative state and point movement over decorative report styling.
- Any UI introduced for retry, recovery, or warning states must reuse the editor’s established controls and remain keyboard accessible.

## Technical Considerations

- Use `node:test` for pure and server integration tests unless an existing project harness is more appropriate.
- Use Playwright for browser, accessibility, soak, resource, and exact-WU audits.
- Browser GPU memory APIs are inconsistent. Consume PRD 01's explicit Three.js/WebGL ownership ledger rather than relying only on browser-process memory.
- Forced garbage collection is not a substitute for explicit resource disposal. Resource success is based on owned live resources, not heap size alone.
- Keep failure-injection identifiers registered and compile-time development-gated.
- Store benchmark baselines with tolerances and environment metadata; do not compare measurements from materially different hardware as though they were equivalent.
- Existing canonical commands remain required:

```bash
npm run check:about-narrative
ABS_BROWSER=chromium npm run audit:about-narrative
ABS_BROWSER=webkit npm run audit:about-narrative
npm run check:site
npm run preview
```

## Success Metrics

- Zero correspondence work appears in RAF stacks.
- Every complete relevant main-thread task is below `8.00ms` in both protected point profiles on recorded reference hardware.
- Live owned GPU-buffer count and bytes equal the warmed baseline throughout and after 1,000 transition changes.
- Retained JavaScript heap after explicit Chromium GC is no more than `2MiB` above the warmed baseline.
- Every runtime cache stays within its declared entry and byte limits.
- One persistent injected transient failure produces at most one automatic retry after the initial attempt and zero retry storm; a deterministic validation failure produces no retry.
- All registered correspondence modes and transition types have direct pure or browser coverage.
- All five canonical transitions pass exact-WU desktop/mobile checks in Chromium and WebKit.
- Save, conflict, recovery, and in-flight edit suites pass without touching canonical content.
- Required screenshot and performance artifacts are present and reviewed.
- `npm run check:site`, actual-production isolation, and non-deployable certification-build separation pass.

## Open Questions

No blocking product questions remain. During implementation, the team must record the reference hardware/browser versions used for the `8ms` certification and the declared cache byte budgets established by PRD 01.
