# Portfolio Knowledge Schema

The live records use JSON so the repository can validate them without an additional YAML dependency. `router.yaml` is JSON-compatible YAML for the same reason.

## Client-master project

One project record represents one portfolio story for one client. A client relationship may contain several campaigns, products, features, or experiments. Record those pieces in `bodiesOfWork`, but keep one organising idea at the project root.

Every schema-version 2 project record contains `metadata`, `bodiesOfWork`, `disciplines`, and `collaborators`. Detailed facts remain in the claim ledger. These fields are compact retrieval indexes and must cite the claim IDs that support them.

## Metadata

Simple metadata fields use this evidence-bearing shape:

```json
{"value": "Dennerlein GmbH", "status": "candidate", "sourceClaimIds": ["claim-sunexpress-003"]}
```

Required fields are `client`, `agency`, `employer`, `formalRole`, `projectType`, and `timeframe`. Unknown values stay `null` or `[]`; do not infer them from an employer, folder name, URL, or client relationship.

Timeframes use:

```json
{
  "start": "2017",
  "end": "2017",
  "yearLabel": "2017",
  "duration": "7 months",
  "precision": "year",
  "status": "candidate",
  "sourceClaimIds": ["claim-sunexpress-011"]
}
```

Allowed metadata statuses: `unknown`, `candidate`, `confirmed`, `disputed`, `withheld`.

Allowed timeframe precision: `unknown`, `exact`, `month`, `year`, `approximate_range`.

## Body of work

```json
{
  "id": "work-sunexpress-relaunch",
  "title": "Website and booking relaunch",
  "storyRole": "primary",
  "status": "candidate",
  "summary": "Full website, booking-flow, and digital-language redesign.",
  "sourceClaimIds": ["claim-sunexpress-001", "claim-sunexpress-008"]
}
```

Allowed story roles: `primary`, `supporting`, `context`.

A claim may include `bodyOfWorkIds` when it applies only to part of the client relationship. Project-wide claims omit this field. A body of work never owns a separate organising idea.

## Discipline

```json
{"name": "Experience Design", "emphasis": "primary", "status": "confirmed", "sourceClaimIds": ["claim-mccann-003"]}
```

Allowed emphasis values: `primary`, `supporting`. Voice transcripts propose disciplines; the knowledge-base ingestion pass assigns or updates the supporting claim IDs.

## Collaborator

```json
{
  "id": "collab-mccann-001",
  "name": "Daryl Lee",
  "type": "person",
  "role": "CEO",
  "contribution": "Leadership review and direction refinement.",
  "status": "confirmed",
  "sourceClaimIds": ["claim-mccann-010"],
  "publicCreditStatus": "unknown"
}
```

Allowed collaborator types: `person`, `team`, `organisation`.

Allowed public-credit statuses: `unknown`, `approved`, `withheld`.

Partial names and unclear roles remain candidates. Do not complete a name from unrelated contact records.

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

## Interview round

An interview round links the client-master project to one registered source:

```json
{
  "id": "interview-mccann-001",
  "sourceId": "src-20260807-001",
  "date": "2026-08-05",
  "status": "ingested",
  "bodiesOfWorkDiscussed": ["work-mccann-global-website"],
  "notes": "Voice-derived. Important wording remains subject to transcript confirmation."
}
```

Allowed interview statuses: `registered`, `ingested`, `needs_review`.

## Source safety

Every registered source records `captureMethod`, `redactionStatus`, and `containsCredentials`. Allowed redaction statuses are `not_required`, `pending`, and `complete`.

Never register a file that contains passwords, tokens, private keys, or other credentials. Apple Notes and similar mutable stores must be represented by a sanitised, immutable extract. Record the original note title, created or modified date, and capture method in the extraction note. The extract is evidence of what was observed at capture time; it is not a live mirror of the original application.

## Candidate queue

`candidates.json` records clients or bodies of work that have been found but have not been accepted into the active catalogue. A candidate needs a stable `candidate-...` ID, client name, possible placement, lifecycle status, and evidence locator. Candidate evidence source IDs live at the file root to avoid repeating the same source on every entry.

Allowed candidate statuses: `unverified`, `indexed_candidate`, `accepted`, `rejected`, `archived`.

Accepted candidates still require an explicit catalogue or body-of-work update. The candidate queue must not become a second project knowledge store.

## Readiness values

- Source, interview, and media coverage: `not_assessed`, `not_started`, `partial`, `complete`, or `deferred` where applicable.
- Copy status: `blocked_missing_facts`, `blocked_on_hold`, `ready_for_draft`, `drafting`, or `approved`.
- Copy eligibility in the catalogue: `blocked_missing_facts`, `blocked_on_hold`, `ready_for_draft`, or `approved`.
