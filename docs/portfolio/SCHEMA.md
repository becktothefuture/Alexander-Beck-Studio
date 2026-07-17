# Portfolio Knowledge Schema

The live records use JSON so the repository can validate them without an additional YAML dependency. `router.yaml` is JSON-compatible YAML for the same reason.

## Claim

```json
{
  "id": "claim-sp-001",
  "category": "role",
  "statement": "Alexander led the interaction design for the rule-building workflow.",
  "status": "candidate",
  "confidence": "medium",
  "sensitivity": "internal",
  "sources": [
    {"sourceId": "src-20260715-001", "locator": "p. 12, Role"}
  ],
  "confirmedBy": null,
  "lastReviewed": "2026-07-15",
  "notes": "Requires interview confirmation before public use."
}
```

Allowed claim statuses: `candidate`, `confirmed`, `disputed`, `rejected`, `withheld`.

Allowed confidence values: `low`, `medium`, `high`.

Allowed sensitivity values: `public`, `internal`, `confidential`, `personal`, `restricted`.

## Organising idea

Every project has one editorial hypothesis connecting the interesting observation, the mechanism of the response, and the proof that would make the story credible.

```json
{
  "statement": "Make index logic visible and teachable without removing expert control.",
  "status": "candidate",
  "evidenceBasis": "source_backed",
  "sourceClaimIds": ["claim-sp-001", "claim-sp-006"],
  "lastReviewed": "2026-07-17"
}
```

Allowed statuses: `hypothesis`, `candidate`, `confirmed`, `rejected`, `on_hold`.

Allowed evidence bases: `source_backed`, `interview_needed`, `interview_confirmed`, `interview_deferred`.

`hypothesis` means the idea is a useful, falsifiable interview direction but is not supported by enough project evidence. `candidate` means supplied evidence supports the direction but Alexander has not confirmed it. A project cannot become copy-ready until its organising idea is `confirmed`.

## Conflict

```json
{
  "id": "conflict-sp-001",
  "claimIds": ["claim-sp-002", "claim-sp-003"],
  "status": "open",
  "question": "Which delivery year is correct?",
  "resolution": null
}
```

## Media item

```json
{
  "id": "media-sp-001",
  "sourceId": "src-20260715-001",
  "locator": "p. 15",
  "subject": "Rule-building interface",
  "storyUse": "Key interaction sequence",
  "status": "candidate",
  "permissionStatus": "unknown",
  "notes": "Prefer original-resolution export if available."
}
```

## Open question

Open-question statuses are `open`, `deferred`, `resolved`, or `discarded`. A resolved question must cite the source IDs that contain its answer. These entries track every factual gap; they are not necessarily the questions to ask verbatim. The narrative interview prompts live in `INTERVIEW-ROADMAP.md`.

## Readiness values

- Source, interview, and media coverage: `not_assessed`, `not_started`, `partial`, `complete`, or `deferred` where applicable.
- Copy status: `blocked_missing_facts`, `blocked_on_hold`, `ready_for_draft`, `drafting`, or `approved`.
- Copy eligibility in the catalogue: `blocked_missing_facts`, `blocked_on_hold`, `ready_for_draft`, or `approved`.
