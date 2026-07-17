# About Narrative Creative Toolkit PRD Packet

This packet turns the current About Narrative lab editor into a lean, direct-manipulation authoring toolkit. It preserves the current visual direction, the single Three.js runtime, the canonical About document, and the existing unsaved About Narrative work as the implementation baseline.

## Decisions

- Four cohesive PRDs rather than one document per feature.
- Production-ready v1 behavior, not a general-purpose animation application.
- Existing uncommitted About Narrative changes remain in place and must not be reverted.
- Each actioned PRD receives its own verification and local commit.
- Editor functionality remains development-only at `/lab/about-narrative.html?edit=1`.
- PRDs are reviewed for unnecessary abstraction before implementation.

## Lean review outcome

An independent read-only engineering review was completed against the current editor implementation. The revised packet deliberately reuses the existing command store, Try/Apply flow, native timeline scrolling, Camera sampler, adapter registry, checkpoint storage, and production-isolation checks. Deferred ideas are listed in `lean-review.md`.

## Documents

1. `prd-01-timeline-foundations.md`
2. `prd-02-rhythm-and-reuse.md`
3. `prd-03-spatial-authoring.md`
4. `prd-04-diagnostics-and-review.md`
5. `lean-review.md`

See `action-sequence.md` for dependencies and `progress-log.md` for current status.
