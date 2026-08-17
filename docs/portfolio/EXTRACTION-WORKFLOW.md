# Portfolio Source Extraction Workflow

## Goal

Turn past portfolios, presentations, PDFs, websites, screenshots, notes, and interviews into traceable project facts without treating polished old copy as automatically true.

## 1. Intake the original

Register every supplied or sanitised file before interpreting it:

```bash
npm run portfolio:source:add -- \
  --file "/absolute/path/to/Past Portfolio.pdf" \
  --title "Past portfolio 2021" \
  --projects "sp-global,bentley,yoti" \
  --sensitivity personal
```

The intake command copies the original into an immutable source folder, calculates a SHA-256 checksum, registers the source, and creates an extraction note. Do not edit the copied original.

Before registering material from Apple Notes, email, chat, or another mutable private store:

1. create a sanitised extract containing only project-relevant material;
2. remove credentials, private contact details, unrelated personal material, and unnecessary internal URLs;
3. record the source title and created or modified date;
4. register the extract with `--capture-method sanitised_transcription --redaction-status complete`.

Do not upload or register an entire Notes database.

## 2. Extract with stable locators

Record extracted material in `sources/extracted/<source-id>.md`. Every useful statement or image must retain a locator:

- PDF or document: page number and section title
- presentation: slide number and visible heading
- website: URL, section heading, and capture date
- image: filename and visible subject
- video: filename and timecode
- interview: round, question, and answer number

Do not collapse several pages into an unattributed summary.

## 3. Route material to projects

Map each candidate fact into the relevant `projects/<project-id>.json` record. Use these categories:

- `project_identity`
- `brief`
- `audience`
- `role`
- `team`
- `timeline`
- `delivery_status`
- `scope`
- `hands_on`
- `constraint`
- `decision`
- `collaboration`
- `outcome`
- `reflection`
- `anecdote`
- `permission`
- `media`

Every claim needs a unique ID, source ID, locator, confidence, sensitivity, and status.

The public portfolio model is client-master:

- keep one project record per client;
- list distinct commissions, campaigns, features, or experiments in `bodiesOfWork`;
- use optional `bodyOfWorkIds` on claims when a fact applies only to one piece;
- keep one organising idea for the complete client story;
- never create a child project record only because dates, deliverables, or teams differ.

After claim extraction, update the evidence-linked `metadata`, `disciplines`, and `collaborators` indexes. Do not add a confirmed index value without a supporting claim.

## 4. Apply claim status conservatively

- `candidate`: extracted from supplied material but not yet verified
- `confirmed`: supported by evidence and confirmed by Alexander where personal contribution, outcome, or permission is involved
- `disputed`: conflicts with another source or recollection
- `rejected`: explicitly found to be wrong
- `withheld`: true or plausible, but not approved for public use

Past portfolio claims start as `candidate`. Do not promote them merely because the wording sounds confident.

## 5. Preserve conflicts

Never overwrite contradictory dates, roles, outcomes, or authorship. Add both claims, mark them `disputed`, and add a conflict entry explaining what must be resolved.

## 6. Generate interview gaps

After each extraction pass:

1. mark which required categories have confirmed coverage;
2. add unresolved items to `openQuestions`;
3. check whether the conversation covered one or several bodies of work for the client;
4. group the next narrative interview into two or three questions;
5. run a short metadata and credits pass after the narrative questions;
6. record the answers as a new registered source;
7. update claim status without deleting the earlier evidence.

Voice-mode handoffs must use `pending-registration`. The Voice assistant must not assign source IDs or invent claim IDs. Use round, question, and follow-up numbers as evidence locators.

## 7. Final-copy readiness

A standard case study is ready for drafting when it has confirmed coverage for:

- the actual brief and audience;
- Alexander's role and hands-on contribution;
- team and close collaborators;
- timeframe and delivery status;
- one consequential constraint or tension;
- one decision worth showing;
- one concrete collaboration detail;
- an observable outcome or honest limitation;
- publication permission and credits;
- ten useful media items or an explicitly approved exception.

The copy draft must cite claim IDs while it is under review. Citations may be removed from the public presentation only after the copy is approved.

## American Heart Association hold

AHA may accept new sources and questions, but no final narrative, outcome claim, or public-ready copy may be generated while `copyEligibility` is `blocked_on_hold`.
