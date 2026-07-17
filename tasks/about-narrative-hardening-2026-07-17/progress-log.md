# About Narrative Hardening Progress Log

## Packet status

| Phase | Status | Implementation commit | Evidence manifest | Reviewer | Notes |
|---|---|---|---|---|---|
| 0 · Baseline | Complete | — | `output/playwright/about-narrative/` | Lead | Existing main-thread apply budget failure captured |
| 1 · PRD 01 Runtime | In review | — | `output/playwright/about-narrative-hardening/runtime/` | Runtime specialist | Pure, hot-frame, fault, and desktop/mobile 1,000-transition gates pass |
| 2 · PRD 02 Correspondence | In review | — | `output/playwright/about-narrative-hardening/runtime/` | Correspondence specialist | Registry, v2 property suite, and 1,000-seed coverage pass |
| 3 · PRD 03 Editor/Persistence | In review | — | `output/playwright/about-narrative/` | Editor specialist | Schema, persistence, accessibility, Chromium/WebKit, and production-isolation gates pass |
| 4 · PRD 04 Certification | In review | — | `output/playwright/about-narrative-hardening/certification/` | Certification specialist | Manifest contract is implemented; clean-checkout and independent sign-off remain release gates |

Allowed status values: `Not started`, `In progress`, `Blocked`, `In review`, `Complete`.

## Approved product and engineering decisions

- [x] Four PRDs.
- [x] Minor visual differences permitted only with correspondence evidence and approval.
- [x] No correspondence in RAF.
- [x] Every relevant correspondence-related main-thread task below `8ms` on the declared reference profile.
- [x] Zero retained live-GPU-buffer growth after 1,000 warmed transition changes.
- [x] Bounded Shape and sequence caches.
- [x] Full editor/persistence/recovery/accessibility scope.
- [x] Dependency order, per-PRD gates, focused commits, and final independent certification.

## Baseline record

- Source commit: `262d7086fb5e12476ff11e758d304873915433ed`
- Branch/worktree: `main`; dirty worktree with unrelated Portfolio/shell changes preserved and excluded from About commits
- Canonical config SHA-256: `1b0cc7fefd4370f90a72d112566ccb92212f36e8a03a2d39756292d815154c99`
- Node/npm: `v20.20.2` / `10.8.2`
- Chromium/WebKit: Playwright `1.58.2`; exact bundled browser builds recorded by final manifest
- OS/GPU: macOS `27.0` build `26A5378n`; Apple M1 Pro; Metal 4
- Desktop viewport and DPR: `1440×1000`; audit default DPR
- Mobile viewport and DPR: `390×844`; audit default DPR
- Desktop/mobile point budgets: `12,000` / `5,000`
- Baseline command result: `npm run check:about-narrative` passed 39/39; `npm run build` passed; Chromium audit failed the existing `applyMs < 16.67ms` assertion at `scripts/audit-about-narrative.mjs:463`
- Baseline artifact manifest: current audit screenshots under `output/playwright/about-narrative/`; formal manifest is a PRD 04 deliverable
- Existing unrelated failures: correspondence main-thread application exceeds even the previous 60fps-frame budget in the baseline Chromium audit; this is directly owned by PRD 01

## PRD completion checklist

### PRD 01

- [ ] Acceptance criteria complete.
- [ ] Pure/failure-injection tests pass.
- [ ] 1,000-transition soak passes.
- [ ] Main-thread `<8ms` gate passes.
- [ ] Retained post-GC heap growth is at most `2MiB`.
- [ ] GPU/cache/resource evidence reviewed.
- [ ] Desktop/mobile/reduced-motion visual evidence reviewed.
- [ ] Final diff reviewed.
- [ ] Focused commit recorded.

### PRD 02

- [ ] Acceptance criteria complete.
- [ ] Legacy byte fixtures pass.
- [ ] Pure/property tests pass for at least 1,000 seeds.
- [ ] Five production pairs benchmarked at desktop/mobile budgets.
- [ ] Direct seek and cumulative identity pass.
- [ ] Canonical per-pair v2 decisions recorded.
- [ ] Visual differences approved.
- [ ] Final diff reviewed.
- [ ] Focused commit recorded.

### PRD 03

- [ ] Acceptance criteria complete.
- [ ] Capability/transition/schema tests pass.
- [ ] Save/conflict/interruption tests pass.
- [ ] Recovery/quota/import/export tests pass.
- [ ] Keyboard/focus/live-region/responsive audits pass.
- [ ] Production-isolation audit passes.
- [ ] Chromium/WebKit evidence reviewed.
- [ ] Final diff reviewed.
- [ ] Focused commit recorded.

### PRD 04

- [ ] Full clean-checkout certification passes.
- [ ] Quantitative budgets pass.
- [ ] Evidence manifest is complete and reproducible.
- [ ] All screenshots/traces/logs manually inspected.
- [ ] Independent reviewer sign-off recorded.
- [ ] No unresolved high-severity findings.
- [ ] Production preview approved.
- [ ] Durable certification changes committed.

## Canonical correspondence adoption decisions

| Stable `fromWorldId→toWorldId` | Source config hash | Previous strategy/version | Candidate strategy/version | Metric artifact | Visual artifact | Decision/reason | Approver | Rollback ID |
|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |

## Schema migration record

- v1→v2 implementation commit:
- Legacy transition compatibility mapping:
- Migrated fixture/document count:
- Canonical hash/equivalence evidence:
- Author-decision-required cases:

## Risks and exceptions

| Date | PRD | Severity | Risk or exception | Owner | Resolution/evidence | Status |
|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |

## Review record

| Date | Scope | Reviewer | Findings | Resolution commit/evidence | Sign-off |
|---|---|---|---|---|---|
| 2026-07-17 | Integrated PRD 01–04 implementation and audits | Runtime, correspondence, editor, and certification specialists | Audit assumptions had drifted from the current storyboard (cue ownership, scrollport, section indexes, indicator mount timing, bounded correspondence fallback). | Focused audit/test updates; `check:about-narrative-hardening`, `check:about-production`, hot-frame, fault, desktop/mobile soaks, runtime visuals, Chromium, and WebKit passed. | Pending clean-checkout certification and independent release review |
|  |  |  |  |  |  |

## Archive record

Move a PRD to `archive/actioned/` only after its implementation commit, evidence, reviewer, and completion date are recorded here.

| PRD | Completion date | Actioned path | Commit | Evidence manifest |
|---|---|---|---|---|
| 01 |  |  |  |  |
| 02 |  |  |  |  |
| 03 |  |  |  |  |
| 04 |  |  |  |  |
