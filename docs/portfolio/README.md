# Portfolio Knowledge Base

This folder is the source-of-truth system for the portfolio project stories. It preserves supplied material, extracts claims with exact provenance, records what Alexander confirms in interviews, and prevents draft language from becoming public fact by accident.

## Authority order

1. Raw files under `sources/raw/` are authoritative for what a source actually contains.
2. User interview records are authoritative for personal contribution, collaboration, intent, outcomes, and permission to publish.
3. A project's `claims` array is authoritative only when a claim is marked `confirmed` and cites at least one registered source.
4. Extracted notes, working hypotheses, Figma copy, and website drafts are derived material. They are never evidence by themselves.

One record represents one client-master portfolio project. Related commissions, campaigns, features, or experiments live in that record's `bodiesOfWork` array and may be referenced by claims. They do not own separate organising ideas. The client-master record supplies the single editorial story.

Conflicting claims stay separate until resolved. Older portfolio language is useful evidence, but it enters the system as `candidate`, not `confirmed`.

## Fast path

1. Read `router.yaml` and select the narrowest intent.
2. Read `catalog.json` and resolve the project ID.
3. Read `sources/index.json` and the project's record in `projects/`.
4. Follow `EXTRACTION-WORKFLOW.md` for ingestion or interviews.
5. Run `npm run verify:portfolio-knowledge` after any write.

## Where things live

- Project catalogue and readiness: `catalog.json`
- Unplaced client and work candidates: `candidates.json`
- Per-project claim ledgers: `projects/<project-id>.json`
- Project-by-project interview sequence: `INTERVIEW-ROADMAP.md`
- Original supplied files: `sources/raw/<source-id>/`
- Page- or slide-addressable extraction notes: `sources/extracted/<source-id>.md`
- Source registry and checksums: `sources/index.json`
- Ingestion history: `logs/ingestion-log.md`
- Accepted administrative decisions: `logs/decision-log.md`
- Future copy drafts: `drafts/`
- Repeatable templates: `templates/`
- ChatGPT Voice attachment pack: `VOICE-INTERVIEW-INSTRUCTIONS.md`, `VOICE-HANDOFF-TEMPLATE.md`, `VOICE-PROJECT-CATALOGUE.md`, and `INTERVIEW-ROADMAP.md`

The Voice attachment pack is generated operating material. It helps interviews retrieve the current questions, but it is not factual authority. Replace older uploaded versions when the pack version changes; do not keep several competing copies in the ChatGPT Project.

## Copy gate

Final portfolio copy may use only confirmed claims. Candidate claims can create interview questions, but cannot appear as settled facts. A project becomes copy-ready only when its organising idea is confirmed and its required fact categories, publication permissions, and media sequence are complete.

American Heart Association is explicitly `on_hold`. Sources may be catalogued, but the project cannot move into final-copy drafting until Alexander removes the hold.
