# PRD 03: About Narrative Editor, Persistence, and Accessibility Hardening

## Status

Proposed. This is the third implementation PRD. It depends on the explicit runtime lifecycle from PRD 01 and the strategy registry and per-pair diagnostics from PRD 02.

## Introduction / Overview

The creative toolkit must let an author understand what will play, why a World is preparing or failing, and whether a save is durable. The review found several contracts that are currently ambiguous or fragmented: transition types do not all have distinct playback semantics, crossfade capability can be described differently by schema and runtime, preparation state is not reliably tied to one pair fingerprint, raw invalid values can be normalized before validation, recovery drafts need stronger version/base handling, and status announcements can become noisy or inaccessible.

This PRD hardens the authoring surface without turning it into a general animation application. It defines one capability resolver, explicit transition semantics, schema version 2 with lossless sequential migration, exact pair-level status, conflict-aware atomic Save, deliberate draft recovery, and accessible consolidated feedback. The active last-known-good playback remains usable throughout invalid edits, preparation failures, save conflicts, and recovery decisions.

## Goals

- Make `cut`, `hold`, `morph`, `dissolve-morph`, and `crossfade` mean one explicit thing everywhere.
- Resolve adapter, Shape, correspondence, interaction, and reduced-motion capabilities through one shared contract.
- Validate raw authored input before migration or normalization can hide invalid values.
- Tie editor state and diagnostics to exact compiled pair fingerprints.
- Make Save atomic, conflict-aware, and safe while new edits continue.
- Make recovery explicit for current, stale, invalid, future, expired, and quota-failed drafts.
- Make preparation, fallback, conflict, recovery, and save feedback keyboard- and screen-reader-accessible.
- Prove production builds contain no editor or development endpoint surface.

## User Stories

### US-301: Author transitions with explicit semantics

**Description:** As an author, I want each transition label to describe the actual playback behavior so I can choose it confidently.

**Acceptance Criteria:**

- [ ] `cut` installs the target at the authored boundary with no interpolated overlap.
- [ ] `hold` keeps the source through the authored interval and installs the target at its end.
- [ ] `morph` interpolates compatible position and required semantic attributes.
- [ ] `dissolve-morph` interpolates position plus presence and size for density changes.
- [ ] `crossfade` remains a registered future contract: when a future adapter pair supports it, playback uses two explicitly budgeted groups in the shared renderer for the authored overlap; the current point-field adapter rejects it.
- [ ] No unsupported type silently becomes another transition.
- [ ] Reduced motion compiles every animated transition into the protected settled/brief-opacity policy.
- [ ] Timeline handles and inspector help describe the same start/end semantics used by the compiler.
- [ ] Reverse scrubbing and direct seek sample the exact same boundary rules.
- [ ] Transition changes are one undoable command and do not retime Camera or Text.

### US-302: Resolve capabilities once

**Description:** As a developer, I want schema, compiler, editor, and runtime to use the same capability result so Apply cannot succeed and playback then fail for a predictable reason.

**Acceptance Criteria:**

- [ ] One pure resolver accepts source adapter, target adapter, Shapes, transition, correspondence, interaction, renderer profile, and reduced-motion profile.
- [ ] It returns `supported`, blocking reasons, warnings, required resources, and compatible alternatives.
- [ ] Schema diagnostics, compiler validation, replacement preflight, inspector controls, and runtime assertions call the same resolver.
- [ ] Capability metadata comes from registered code, never authored executable data.
- [ ] `crossfade` is offered only when both adapters support concurrent groups in the shared renderer and the resource budget permits it.
- [ ] A supported crossfade declares its maximum concurrent groups, draw calls, GPU bytes, preparation needs, and disposal behavior; unsupported current adapters remain explicitly disabled.
- [ ] `morph` and `dissolve-morph` are offered only for compatible point attributes and pool contracts.
- [ ] An incompatible choice blocks Apply and Save while the last-known-good plan keeps playing.
- [ ] Alternatives are explicit suggestions and are never applied silently.
- [ ] Resolver fixtures cover every registered adapter/Shape/transition pair.
- [ ] Structural schema validation checks registered IDs and authored structure; pair/profile/resource compatibility is a separate compiler capability stage and never makes migration environment-dependent.
- [ ] The resolver consumes PRD 02 correspondence registry metadata and does not duplicate strategy IDs, labels, versions, handlers, or capabilities.

### US-303: Migrate and validate authored documents safely

**Description:** As an author, I want old documents migrated predictably and invalid documents explained without losing the original.

**Acceptance Criteria:**

- [ ] Introduce schema version `2` only for changed authored transition and registered-ID contracts; runtime preparation status remains derived and is never serialized.
- [ ] The loader retains the untouched original payload, validates its size/envelope/version, then strictly validates it against its exact source-version schema before any migration runs.
- [ ] A future schema opens read-only with Export; it is never coerced to the current version.
- [ ] Sequential pure migrations transform one version at a time; every intermediate output is strictly validated against the next schema before another migration runs.
- [ ] Current-version documents are strictly validated without normalization of unsupported values.
- [ ] Unknown structural fields, duplicate IDs, non-finite values, invalid groups, unsorted/duplicate keys, unsafe URLs/text, unknown registry IDs, and broken references are errors.
- [ ] Migration may supply a legacy default only when the old field is genuinely absent.
- [ ] An explicit unknown registry ID or invalid value fails its source schema and cannot be repaired, normalized, or defaulted by migration.
- [ ] Explicit per-pair correspondence IDs, including approved `spatial-nearest-v2`, survive migration, canonical serialization, Save, import/export, and recovery unchanged.
- [ ] The original imported or recovered payload remains available for Export after any migration or validation failure.
- [ ] Canonical serialization is stable and produces the same hash for semantically identical current documents.
- [ ] Migration and validation never modify the currently active compiled plan until the complete candidate succeeds.

Legacy transition migration must preserve observed playback, not merely reuse the same label:

| Schema v1 value | Required schema v2 migration behavior |
|---|---|
| `cut` | Map only after before/boundary/after fixtures prove exact equivalent behavior. |
| `hold` | Preserve captured v1 playback; never silently reinterpret it as the new source-hold-until-end behavior. |
| `morph` | Preserve only after forward/reverse/direct-seek equivalence is proven. |
| `dissolve-morph` | Preserve only after position/presence/size equivalence is proven. |
| `crossfade` | Preserve captured v1 behavior or require an explicit author decision; never silently activate concurrent rendering. |

If exact legacy behavior cannot be represented by a public v2 transition, use a documented migration-only compatibility representation or keep the document read-only pending an author decision. Compatibility mappings emit stable diagnostics and receive direct fixtures.

### US-304: Show exact pair preparation and fallback state

**Description:** As an author, I want to know which World pair is loading or failed so I can fix the correct part of the timeline.

**Acceptance Criteria:**

- [ ] State is keyed by compiled pair ID plus input fingerprint, not Section label alone.
- [ ] Each pair reports `idle`, `preparing`, `ready`, `fallback`, or `failed`.
- [ ] Status includes generation, requested strategy, installed strategy, fallback reason, attempt count, timing, and relevant diagnostic IDs.
- [ ] A cached ready result is distinguishable from a newly prepared result.
- [ ] Status provenance includes cache key/fingerprint, cache tier, originating generation, and `worker | cache | bootstrap | last-known-good` source; eviction cannot leave an item presented as Ready.
- [ ] Stale diagnostics cannot attach to a newly edited pair with the same human label.
- [ ] The timeline and inspector show the exact affected World clip and boundary.
- [ ] Failure offers `Retry`, `Adopt compatible fallback`, `Revert edit`, and `Export diagnostics` when applicable.
- [ ] Retry is enabled only while the selected pair fingerprint still belongs to the current failed sequence; it invokes `retryPreparation({ sequenceKey, pairId, inputFingerprint })` once and cannot create a frame-driven loop.
- [ ] The editor presents Retry as pair-targeted while explaining that cumulative identity may require the runtime to rebuild the suffix or complete sequence.
- [ ] A PRD 02 **safety fallback** may install a validated compatible correspondence baseline at runtime without mutating JSON; it reports requested/installed strategies and blocks canonical v2 adoption for that pair.
- [ ] A valid document using runtime safety fallback remains saveable with a visible warning; Save persists the requested strategy, never the installed baseline.
- [ ] **Adopt compatible fallback** is the distinct explicit undoable command that changes the authored strategy, recompiles, and becomes persistent only after Save.
- [ ] Unsupported transition/capability selections never receive a hidden safety fallback; they block Apply and Save.
- [ ] The public route never displays development diagnostics.
- [ ] Diagnostic Export is JSON at or below `256KiB` by default and excludes typed arrays, raw coordinates, authored document copies, and stacks; full development detail requires explicit opt-in.

### US-305: Save one exact snapshot atomically

**Description:** As an author, I want one-click Save to update the canonical JSON safely without losing edits made during the request.

**Acceptance Criteria:**

- [ ] Development-only `GET /api/about-narrative/config` returns canonical JSON and a SHA-256 ETag.
- [ ] `POST /api/about-narrative/config` requires same origin, fixed editor header, JSON content type, `If-Match`, and a body at or below `1MiB`.
- [ ] GET and successful POST hash and return the same exact deterministic canonical representation; semantic changes alter the ETag, while formatting-only external changes may canonicalize to the same hash.
- [ ] The server owns the fixed canonical path; the caller cannot supply a path.
- [ ] Persistence integration tests inject a temporary same-filesystem path through the exact endpoint validation/mutex/ETag/flush/rename/cleanup implementation and fail before the first request if it resolves inside `react-app/app/public/config/` or equals the canonical About file.
- [ ] The canonical file hash is identical before and after the PRD 03 persistence suite; restoration in `finally` is not an acceptable substitute.
- [ ] Requests are serialized through a per-file mutex.
- [ ] The server validates/migrates the candidate, writes a same-directory temporary file, flushes it, and atomically renames it.
- [ ] Stale source returns `409`, oversized input `413`, invalid input `422`, and invalid development request constraints an appropriate `4xx` without changing the file.
- [ ] Temporary files are cleaned after success, failure, interruption, and startup recovery.
- [ ] The client records an immutable submitted revision; the server returns the exact persisted canonical document plus its ETag after validation/migration/write.
- [ ] If current local revision still equals submitted revision, the returned canonical document becomes baseline and the editor becomes clean.
- [ ] If newer commands exist, the returned canonical document/ETag becomes baseline, only post-submit commands are replayed through stable-ID preconditions, and the editor remains dirty.
- [ ] If post-submit replay fails, the local document remains an unsaved copy, Save is not reported as complete, and Export/recovery actions remain available.
- [ ] Failure preserves all work and offers Retry and Export; no full-page navigation occurs.
- [ ] Save success keeps the same `?edit=1` editor URL, selection where possible, and current playhead.

### US-306: Reconcile source conflicts deliberately

**Description:** As an author, I want a stale-save conflict to preserve both versions so I can decide how to continue.

**Acceptance Criteria:**

- [ ] `409` displays Source changed and leaves the local document untouched.
- [ ] The editor can fetch the new source and show baseline hash, remote hash, and local dirty state.
- [ ] Available actions are Export local, Compare with source, or confirmed Reload source.
- [ ] Reload requires confirmation when local work is dirty.
- [ ] Compare is read-only and identifies stable IDs/fields changed locally and remotely without constructing a merged document.
- [ ] The editor never automatically rebases or merges a `409` conflict in this packet.
- [ ] Conflict messages are announced once and focus moves to the conflict panel.
- [ ] Conflicting local/remote correspondence and non-conflicting Text/world changes are both presented accurately; neither is guessed into a merged document.

### US-307: Recover drafts without silently replacing source

**Description:** As an author, I want crash recovery to preserve work while keeping the canonical document authoritative.

**Acceptance Criteria:**

- [ ] Draft envelopes contain schema version, base source hash, timestamp, document, and optional last selection/playhead metadata.
- [ ] Drafts save after a short debounce and on `pagehide` without generated buffers, caches, diagnostics, or history.
- [ ] Recovery classifies drafts as `current`, `stale`, `invalid`, `future`, `expired`, or `unreadable`.
- [ ] No draft auto-applies.
- [ ] Current/stale drafts offer Recover as unsaved copy, Export, and Discard.
- [ ] Invalid/future drafts offer original Export and Discard but cannot enter editable playback.
- [ ] Expiry policy is documented and does not delete without a visible decision during the active session.
- [ ] Storage quota or serialization failure is visibly reported and never represented as Draft saved.
- [ ] Discard removes only the selected draft envelope.
- [ ] Recovered documents compile as candidates and cannot replace the last-known-good plan until valid.
- [ ] Recovery preserves explicit per-pair strategy IDs but excludes pair lifecycle, installed safety fallback, diagnostics, generations, attempts, timings, caches, and generated buffers.

### US-308: Provide accessible, consolidated editor feedback

**Description:** As a keyboard or screen-reader user, I want failures and editor state conveyed clearly without repeated announcements.

**Acceptance Criteria:**

- [ ] Status pills, pair clips, Retry, fallback, Save, recovery, and conflict actions are keyboard reachable in logical order.
- [ ] Visible help and diagnostics are associated with controls using `aria-describedby`.
- [ ] One deduplicated polite live region announces completed preparation/save/recovery changes.
- [ ] One assertive path is reserved for blocking data-loss or save-conflict events.
- [ ] Frame-by-frame progress, repeated failures, and diagnostic counters are not announced.
- [ ] Focus moves predictably when a modal/panel opens and returns to its invoker when closed.
- [ ] Color is not the only distinction between preparing, ready, fallback, and failed.
- [ ] Reduced-motion preview is selectable and cannot disable the protected public accessibility policy.
- [ ] Touch targets and timeline controls meet the existing responsive editor contract.

### US-309: Isolate authoring from production

**Description:** As a site owner, I want public playback to use the same document without shipping local authoring or write capabilities.

**Acceptance Criteria:**

- [ ] Editor modules load only for `__DEV__ && labRoute && ?edit=1`.
- [ ] `/about.html` and production `/lab/about-narrative.html` are playback-only.
- [ ] Production assets contain no editor chunk, Save client, fixed editor header, authoring labels, fault hooks, or endpoint strings.
- [ ] The development server rejects write endpoints outside the approved editor origin/route contract.
- [ ] Public playback still validates the same canonical current document and uses the same compiler/runtime plan.
- [ ] Asset or World failure preserves readable editorial content and the registered procedural fallback.
- [ ] A production asset audit fails the build if an authoring sentinel is found.

## Functional Requirements

- **FR-301:** Define and test exact semantics for all five transition types.
- **FR-302:** Implement one pure capability resolver shared across all authoring and playback layers.
- **FR-303:** Derive UI choices and diagnostics from registered capabilities.
- **FR-304:** Introduce schema v2 and sequential pure migration from every supported prior version.
- **FR-305:** Strictly validate each raw source schema and every migration output before the next step; normalization cannot hide explicit invalid values.
- **FR-306:** Preserve original invalid/future payloads for Export.
- **FR-307:** Key preparation status and diagnostics by exact pair fingerprint.
- **FR-308:** Expose explicit Retry, adopt-fallback, revert, and bounded diagnostic-export actions while presenting runtime safety fallback separately.
- **FR-309:** Never silently alter authored transition or requested correspondence behavior; runtime-only algorithm safety fallback remains visible in installed diagnostics and never mutates authorship.
- **FR-310:** Implement conflict-aware ETag GET/POST with fixed path, request limits, mutex, flush, atomic rename, and cleanup.
- **FR-311:** Preserve edits created during an in-flight Save.
- **FR-312:** Model explicit Draft, Saving, Saved, Save failed, and Source changed client states.
- **FR-313:** Validate and classify recovery envelopes without automatic application.
- **FR-314:** Surface storage, checkpoint, import, export, and save failures.
- **FR-315:** Consolidate accessible announcements and associate visible help to controls.
- **FR-316:** Keep keyboard selection, editor URL, playhead, and viable selection across Save/reload.
- **FR-317:** Compile invalid edits as candidates while the last-known-good plan stays active.
- **FR-318:** Exclude editor, persistence-write, verbose authoring/resource diagnostics, diagnostic Export, certification markers, and fault-injection code from production output.
- **FR-319:** Keep one canonical authored JSON document; drafts and checkpoints are recovery aids, not design truth.
- **FR-320:** Add focused schema, migration, persistence, conflict, recovery, and accessibility tests.
- **FR-321:** Keep authored schema data separate from derived pair lifecycle/status; status never enters JSON, drafts, checkpoints, Save payloads, ETags, or command history.
- **FR-322:** Treat submitted revision, persisted canonical revision/ETag, and current local revision as separate identities during Save reconciliation.

## Non-Goals

- No production editing backend, authentication system, cloud collaboration, multi-user merging, or arbitrary filesystem access.
- No general curve editor, node graph, scripting, per-point editing, multi-camera system, or second renderer.
- No visual redesign of the existing toolkit beyond status/help/accessibility states required here.
- No automatic conflict resolution for commands whose stable-ID preconditions fail.
- No persistence of generated buffers, caches, runtime diagnostics, editor history, or failure state.
- No new crossfade-capable adapter; this packet defines and tests the capability contract and current point-field rejection only.
- No silent draft recovery, schema downgrade, capability fallback, or source overwrite.
- No change to correspondence assignment or runtime resource algorithms owned by PRDs 01–02.

## Technical Considerations

- Keep migrations, schema validation, capability resolution, canonical serialization, and conflict comparison pure and independently testable.
- Document schema validation owns structure, types, finite values, registered IDs, references, and safe content. Compilation capability validation owns pair/profile/resource compatibility. Migrations call only the former.
- The capability resolver should return stable diagnostic codes; UI owns wording, focus, and remediation presentation.
- Save baseline advancement must use the server-returned persisted canonical document, not the request body; post-submit commands are replayed only when their declared preconditions still hold.
- Use a same-directory temporary file to preserve atomic rename semantics.
- Treat draft metadata as untrusted input and enforce the same size/content constraints as import.
- Coalesce live announcements by stable event key and state transition.
- Development-only endpoint strings and headers should live in dynamically imported editor/persistence modules so production scanning is enforceable.

## Success Metrics

- Every registered transition has direct compiler/runtime/reverse/direct-seek coverage.
- Zero disagreement between schema, editor, compiler, and runtime capability outcomes across the registry matrix.
- All prior supported schemas migrate deterministically; invalid current and future schemas never become writable through normalization.
- Zero stale pair diagnostics attach to changed fingerprints.
- Save conflict, interrupted write, invalid body, oversized body, and in-flight-edit tests preserve canonical and local data.
- Recovery tests cover every classification with no automatic source replacement.
- Keyboard-only completion succeeds for strategy selection, Retry, adopt fallback, Save, conflict, recovery, and Export.
- Automated accessibility audit reports no critical violations in the supported editor layouts.
- Production bundle audit finds zero editor/write/fault sentinels.

## Dependencies and Delivery Sequence

1. Complete PRD 01 lifecycle/Retry/diagnostic API and PRD 02 registry/fingerprint contracts.
2. Freeze transition playback fixtures and define the shared capability matrix.
3. Implement schema v2, raw validation, migrations, canonical serialization, and read-only future handling.
4. Implement exact transition semantics in compiler/runtime and resolver-driven editor choices.
5. Implement pair-level status, Retry/safety-fallback/adopt-fallback/revert actions, and deduplicated diagnostics.
6. Implement ETag persistence, atomic server writes, in-flight edit handling, and conflict UI.
7. Implement recovery classifications, quota/failure presentation, conflict comparison, and confirmed reload; do not add automatic remote rebase.
8. Complete keyboard, focus, live-region, responsive, and reduced-motion behavior.
9. Add production-isolation audit and focused tests.
10. Run the PRD gate, inspect evidence, and create one focused commit.

PRD 04 begins only after this PRD and its predecessors pass their own gates.

## Verification Plan

### Pure and integration tests

- Capability matrix, exact transition boundaries, reverse/direct seek, schema v2 migration, future/invalid handling, canonical hashes, pair fingerprints, diagnostic staleness, and conflict comparison.
- Valid save, invalid/oversized/wrong-origin/wrong-header/stale-ETag/concurrent/interrupted saves, temp cleanup, and edits during Save.
- The PRD 03 harness owns the temporary-path injection seam and proves the real canonical file hash never changes.
- Current, stale, invalid, future, expired, unreadable, quota-failed, recovered, exported, and discarded drafts.

### Browser and accessibility proof

- Chromium and WebKit at desktop and mobile editor layouts.
- Keyboard-only selection, transition choice, Retry, safety-fallback explanation, adopt fallback, Save, conflict resolution, draft recovery, Export, and focus return.
- Reduced-motion public playback and editor preview.
- Verify UI behavior with the dev-browser skill and inspect screenshots rather than accepting command success alone.

### Required gates

```bash
npm run check:about-narrative
npm run test:about-narrative-persistence
ABS_BROWSER=chromium npm run audit:about-narrative
ABS_BROWSER=webkit npm run audit:about-narrative
npm run check:site
npm run build
npm run preview
```

## Open Questions

No blocking product questions remain. Automatic three-way command rebasing is deferred; conflicts preserve local work, allow Export/Compare, and require an explicit confirmed reload or a future dedicated merge PRD.
