# About Narrative Hardening Packet

## Purpose

This packet turns the independent correspondence implementation review into four dependency-ordered implementation PRDs. It protects the current visual direction while removing retry, resource, algorithm, authoring, persistence, accessibility, and verification bottlenecks.

This is a planning packet only. It does not authorize implementation by itself.

## Approved decisions

- Deliver four PRDs rather than one monolith.
- Minor visual differences are allowed only when correspondence quality improves and evidence is approved.
- No correspondence work may execute in RAF.
- Every complete relevant correspondence-related main-thread task must complete below `8.00ms` at both 12,000-point desktop and 5,000-point mobile profiles on declared reference hardware; Worker time is reported separately.
- Live GPU-buffer count must show zero retained growth after 1,000 warmed transition changes.
- Shape and sequence caches must remain within explicit entry and byte budgets.
- Retained JavaScript heap after explicit Chromium GC must remain no more than `2MiB` above the warmed 1,000-switch baseline.
- Full editor, persistence, save, recovery, accessibility, and production-isolation hardening is in scope.
- Execute in dependency order with a separate evidence gate and focused commit after each PRD.

## PRD index

| Order | PRD | Scope | Depends on | Completion gate |
|---|---|---|---|---|
| 1 | [Runtime reliability and resource lifecycle](./prd-01-runtime-reliability-resource-lifecycle.md) | Worker ownership, retries, fixed GPU attributes, caches, hot path, direct seek, anchors, bust, context recovery | Current baseline | Runtime failure suite and 1,000-transition soak |
| 2 | [Correspondence correctness and scalability](./prd-02-correspondence-correctness-scalability.md) | Visibility-first assignment, exact groups, bounded anchors, scalable v2, metrics, registry | PRD 01 | Pure/property tests, five-pair benchmarks, visual approval |
| 3 | [Editor, persistence, and accessibility](./prd-03-editor-persistence-accessibility.md) | Transition semantics, capabilities, schema v2, pair status, Save/conflicts, recovery, accessibility, isolation | PRDs 01–02 | Persistence integration, browser/a11y, production isolation |
| 4 | [Verification and release certification](./prd-04-verification-release-certification.md) | Independent adversarial, soak, cross-browser, visual, persistence, and bundle certification | PRDs 01–03 | Evidence manifest and senior release review |

## Relationship to existing work

`tasks/prd-spatial-point-correspondence.md` records the first correspondence feature and its implemented baseline. This packet does not rewrite that history: PRD 01 hardens its runtime envelope, PRD 02 adds the versioned corrective strategy, PRD 03 hardens its authoring/persistence surface, and PRD 04 replaces optimistic verification with release certification. During implementation, update `docs/reference/ABOUT-NARRATIVE-TOOLKIT.md` and the relevant older PRD implementation notes whenever a contract changes, so code and guidance cannot drift.

Likely ownership boundaries:

- Runtime/compiler/Three.js: `AboutNarrativePointWorld3D.jsx`, `aboutNarrativeCompiler.js`, Worker protocol, Shape/modifier modules.
- Correspondence: `aboutNarrativeCorrespondence.js`, `aboutNarrativeCorrespondence.worker.js`, definitions/registry, pure check fixtures.
- Editor/persistence: `AboutNarrativeEditor.jsx`, editor store/timeline, schema, persistence, development server endpoint.
- Certification: `scripts/check-about-narrative.mjs`, `scripts/audit-about-narrative.mjs`, new focused test/audit modules, evidence manifest tooling.

New modules should be extracted around stable responsibilities rather than continuing to expand the largest existing files. Exact filenames are an implementation decision, but registry, preparation state, cache accounting, capability resolution, and persistence validation each need one authoritative implementation.

## Finding coverage

| Independent-review finding | Owning PRD | Proof required |
|---|---|---|
| Failed sequences can retry from RAF | 01 | Persistent injected failure starts no additional Worker after retry budget |
| Replacing `BufferAttribute` objects can retain GPU buffers | 01 | Fixed attribute identity and zero live-buffer growth after 1,000 changes |
| Sequence identity/objects are rebuilt in the hot path | 01 | 600 warmed frames with zero key builds and zero runtime allocations |
| Shape/sequence caches can grow without a strict byte policy | 01 | LRU entry/byte telemetry remains within 8/4MiB and 3/16MiB |
| Cold direct seek initially shows an unrelated Shape | 01 | Requested settled bootstrap at desktop/mobile/reduced motion |
| Discipline labels omit modifier displacement | 01 | Shader-equivalent anchor error no more than 6px/8px |
| Bust formation/ambient rotation cross state boundaries | 01 | Forward/reverse/direct-seek/interaction yaw continuity |
| Shared semantic groups can match visible points to hidden capacity | 02 | Visibility-first fixtures and zero avoidable visible-to-hidden matches |
| Fractional group IDs are rounded | 02 | Strict integer validation and rejection fixtures |
| Group/anchor logic repeats full-pool scans | 02 | `O(n log n)` time, `O(n)` memory, no full scan per group/anchor |
| Six target-only anchors are assigned greedily | 02 | Order-invariant joint bounded assignment |
| Strategy support differs across schema/editor/API/Worker | 02–03 | One registry and one capability resolver matrix |
| Transition meanings and crossfade compatibility are ambiguous | 03 | Direct boundary/reverse/direct-seek fixtures for all five types |
| Invalid raw values may be normalized before validation | 03 | Schema v2 current/future/invalid migration matrix |
| Pair status can refer to stale or incomplete state | 03 | Fingerprinted per-pair lifecycle and stale-result tests |
| Save and recovery need stronger conflict/data-loss behavior | 03 | Atomic ETag integration and complete recovery classification |
| Editor feedback can be repetitive or inaccessible | 03 | Keyboard/focus/live-region/contrast audits |
| Existing tests over-represent the successful path | 04 | Adversarial suite, artifact manifest, independent review |

## Cross-PRD invariants

- One canonical About document.
- One compiler-owned world-unit playhead.
- One Three.js renderer, canvas, scene, camera, and RAF. Point-field playback keeps one fixed point pool and draw call; a future capability-approved crossfade may temporarily add one declared scene group/draw call but never a second renderer or RAF.
- Camera, World, Text, and Interaction remain independently authored.
- One active Worker generation and atomic plan/buffer publication.
- Fixed GPU attribute objects for the adapter lifetime.
- Last-known-good compiled plan and point pair remain active through invalid edits and failures.
- Procedural generation and correspondence are deterministic, versioned, abortable, and outside RAF.
- Public reduced-motion behavior cannot be disabled by authored settings.
- Public builds contain no editor, write client/endpoint strings, verbose authoring/resource diagnostics, diagnostic Export, certification markers, or fault-injection surface. Minimal internal failure containment may remain when required for safe playback.
- Persistence tests use an injected temporary same-filesystem fixture and can never resolve to `react-app/app/public/config/contents-about.json`; the canonical file hash must remain unchanged.

## Shared identity contract

The implementation must use versioned identities consistently:

- `documentHashV1`: SHA-256 of canonical authored JSON.
- `planFingerprintV1`: `documentHashV1` plus resolved profile/layout inputs that materially affect compilation.
- `pairFingerprintV1`: hash of the canonical preparation descriptor: adapter/Shape generator versions, stable Shape IDs, seeds, parameters, quality/point count/profile, requested correspondence ID/version, immutable source/target World transforms, and upstream cumulative-order fingerprint.
- `statusKeyV1`: `{ pairId, pairFingerprint, generation }` for lifecycle/diagnostic presentation.
- `etag`: hash of the exact persisted canonical representation returned by GET/POST; it is not a pair fingerprint.

Text copy, labels, editor selection, playhead, and Camera-only values that do not alter World placement must not invalidate pair preparation. Table-driven tests must change every included/excluded input and prove exactly one correct invalidation decision.

## Definition of complete

The packet is complete only when all four PRDs are implemented in order, each PRD has a focused reviewed commit and its own green evidence gate, PRD 04 produces a reviewed evidence manifest, production preview is inspected in Chromium and WebKit at desktop/mobile and reduced-motion profiles, and no unresolved high-severity finding remains.

Completed PRDs move to `archive/actioned/` only after their implementation commit and evidence are recorded in `progress-log.md`. The README and evidence links remain in this packet as the durable index.

## Working documents

- [Action sequence](./action-sequence.md)
- [Progress log](./progress-log.md)
