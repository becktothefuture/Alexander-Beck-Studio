# About V2 copy substitution manifest and career fact ledger

Approval update, 2026-08-30: the career fact gate below has been superseded by the user's response. Five bounded, factual rows are now canonical. See [career approval and dot separation](ABOUT-V2-CAREER-DISPERSION-2026-08-30.md) for the exact values, MRM date qualification and supported Hugo & Cat role. The blocked slots below are retained only as history.

- Status: implementation candidate; career values are blocked pending direct approval
- Date: 2026-08-29
- Parent plan: `ABOUT-V2-CINEMATIC-STORY-IMPLEMENTATION-PLAN-2026-08-29.md`
- Canonical runtime source: `react-app/app/public/config/contents-about.json`
- Scope: narrative substitution and fact control only

This document gives the final integrator an exact copy map without promoting candidate
career information into production. Text marked **FACT SLOT — NON-PRODUCTION** must
never be copied into `contents-about.json`. It is an instruction and budget reservation,
not page copy.

## Authority and status rules

1. Direct confirmation from Alexander is required for every public employer, role,
   date, overlap and current-status value.
2. Registered user-provided sources establish candidates, not publication approval.
3. Portfolio project records preserve their own `confirmed`, `candidate`, `disputed`
   and `unknown` statuses. A confirmed project contribution does not automatically
   confirm an employment row.
4. Existing About copy and archived drafts are voice and structure evidence. They do
   not validate their own career claims.
5. The four-row component is locked structurally. Its real values remain blocked.

Status terms in this document:

- **source-supported candidate**: appears in a registered source but has not received
  direct public-copy approval;
- **disputed**: repository sources conflict;
- **stale**: the source was correct only at its stated capture date;
- **safe non-factual**: contains no employer, role, date, outcome or current-status
  assertion;
- **approved**: requires a direct recorded answer from Alexander. No career row has
  this status yet.

## Source register used for this manifest

| Source | Authority for this task | Limits |
| --- | --- | --- |
| `src-20260715-001`, *Alexander Beck – UX/UI Designer & Creative Technologist – CV (2025)*, p. 1 | Primary user-provided candidate source for the four employment rows and early freelance work | Dated 2025; contains stale `Present`, an ambiguous Hugo & Cat role arrow and no direct public-copy approval |
| `docs/portfolio/projects/sunexpress.json` | Preserves Dennerlein employer and role candidates | `copyEligibility` is `blocked_missing_facts`; employment window is not a project date |
| `docs/portfolio/projects/yoti.json` | Preserves Yoti role candidate and the open duration conflict | Role is candidate; timeline is disputed between the CV and Portfolio v1 |
| `docs/portfolio/projects/bentley.json` and `gen-digital.json` | Corroborate Hugo & Cat as a candidate employer context | Neither record confirms Alexander's formal role or the employer's later naming continuity |
| `docs/portfolio/projects/mccann.json` | Preserves MRM (McCann), Associate Design Director and July 2024 start as candidates | The 2025 `Present` end state is stale; exact organisation and employment state remain unresolved |
| `ABOUT-NARRATIVE-INTERVIEW-ANSWERS-ROUND-2.docx`, answer 1 | First-person source for the selective career logic and Hugo & Cat → Hugo MRM/MRM continuity candidate | Companion interview material is not a completed fact-check appendix or portfolio approval record |
| `ABOUT-TONE-OF-VOICE.md` | Voice, source and anti-synthetic checks | Direction only; its examples are not approved page copy |
| `contents-about.json` pre-implementation field inventory named by the parent plan | Authority for accepted sentences, field IDs and the locked 436/574 baseline | Presentation JSON cannot confirm its own biography; concurrent implementation changes may move the live working-copy count |

## Career source and status ledger

The values below identify the four **proposed** rows. They are useful for confirmation
because they show exactly where the sources agree or conflict. They are not authorised
canonical values.

| Proposed slot | Source-backed candidate value | Source and locator | Current status | Exact blocker before publication |
| --- | --- | --- | --- | --- |
| Row 1, oldest | `2014–2017` · `Dennerlein GmbH` · `Art Director` | `src-20260715-001`, p. 1, Professional Experience — Dennerlein GmbH; `sunexpress.json`, `claim-sunexpress-003` and `claim-sunexpress-004` | Source-supported candidate | Confirm exact public spelling, employment dates and formal role. Older About material also uses `Denaline`, so spelling must not be inferred. Confirm that earlier roles are intentionally omitted. |
| Row 2 | `2017–2019` · `Yoti` · `Senior Product Designer` | `src-20260715-001`, p. 1, Professional Experience — Yoti; `yoti.json`, `claim-yoti-003`, `claim-yoti-004`, `claim-yoti-005` | Role candidate; dates disputed | Confirm start/end dates. The CV says December 2017–November 2019; Portfolio v1 says more than two and a half years. Confirm the public role wording. |
| Row 3 | `2020–2024` · `Hugo & Cat` · role progression unresolved | `src-20260715-001`, p. 1, Professional Experience — Hugo & Cat; `bentley.json`, `claim-bentley-003`; `gen-digital.json`, `claim-gen-digital-001` | Source-supported employer candidate; role unknown/ambiguous | The CV prints `Associate Design Director → Senior Designer`, whose direction is unclear. Confirm the actual sequence, exact dates and whether Hugo & Cat later became Hugo MRM or should remain a separate public row. |
| Row 4, newest | `2024–[confirmed end]` · `MRM (McCann)` · `Associate Design Director` | `src-20260715-001`, p. 1, Professional Experience — MRM (McCann); `mccann.json`, `claim-mccann-001` and `claim-mccann-002` | Source-supported candidate; end state stale | Confirm exact public organisation name, July 2024 start, current end date/status and any overlap with Row 3. Never reuse the CV's 2025 `Present` value without a new answer. |
| Independent work, subordinate line | Early `Freelance Brand Designer`; interview companion also describes freelance work alongside agency work | `src-20260715-001`, p. 1, Early Roles; `ABOUT-NARRATIVE-INTERVIEW-ANSWERS-ROUND-2.docx`, answer 1 | Source-supported candidate; scope and dates unknown | Confirm whether this means early freelance brand work, later independent consulting, an ongoing studio practice or more than one period. Confirm label, date treatment and whether it should appear at all. It is not a fifth job. |

`ProKeyboard` is evidence for a self-initiated side project, not evidence for independent
employment. It must not be used to fill the independent-work line.

## Exact confirmations required from Alexander

The career gate is complete only when every cell below has an explicit answer. A blank
cell, approximate answer or inherited `Present` keeps the whole component out of
canonical JSON.

| Confirmation | Required answer |
| --- | --- |
| Four-row selection | Confirm `Dennerlein GmbH`, `Yoti`, `Hugo & Cat`, and `MRM (McCann)` as the intended four rows, or name the replacement row(s). |
| Row 1 | Exact employer spelling, exact public role, start month/year or display year, end month/year or display year. |
| Row 2 | Exact Yoti role and dates; explicitly resolve two years versus more than two and a half years. |
| Row 3 | Exact employer name, start/end dates, every public role in the correct progression, and the intended arrow/order. |
| Row 4 | Exact organisation name, role, start date, end date or confirmed current status as of approval. |
| Continuity | Explain whether Hugo & Cat, Hugo MRM and MRM are one continuing employment relationship, a rename/merger, or separate rows. |
| Overlap | Confirm whether Rows 3 and 4 overlap and how the displayed years should make that truthful. |
| Earlier roles | Confirm that ANY Concept & Design and any role before Dennerlein are intentionally omitted from the selected four. |
| Independent work | Confirm whether it appears; define the period, whether it was freelance/independent/consulting/studio work, and supply the exact public line. |
| Relative duration | Confirm that `thirteen years` is removed. If a duration is wanted, approve a fixed start year or durable alternative. |
| Component labels | Approve the visible career heading and the optional independent-work label. |
| Publication comfort | Approve all four rows together, in oldest-to-newest order, for public display. |

Suggested confirmation response format:

```text
Row 1 — [display years] | [employer] | [role] | [approved yes/no]
Row 2 — [display years] | [employer] | [role] | [approved yes/no]
Row 3 — [display years] | [employer] | [role] | [approved yes/no]
Row 4 — [display years] | [employer] | [role] | [approved yes/no]
Continuity/overlap — [...]
Earlier roles intentionally omitted — [yes/no]
Independent work — [omit, or exact label and line]
Career heading — [...]
All four rows approved for public display — [yes/no]
```

## Tokenizer and budget contract

Counts use this Unicode-aware JavaScript tokenizer:

```js
const WORD = /[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu;
const countWords = (value) => String(value || '').match(WORD)?.length || 0;
```

It counts contractions and hyphenated compounds as one word, counts numeric date parts
as words and ignores ellipses or other punctuation. Core copy includes title text,
title descriptions, prose and all future `career-sequence` labels/values. Total
reader-facing copy adds the six discipline labels/descriptions and selected-client
label/names. Fixed action labels remain outside both baselines, matching the parent
plan.

Recalculation against the locked pre-implementation inventory:

| Measure | Before | Candidate maximum | Change | Headroom to baseline |
| --- | ---: | ---: | ---: | ---: |
| Core narrative | 436 | 422 | −14 | 14 |
| Total reader-facing | 574 | 560 | −14 | 14 |

The candidate maximum reserves 36 words for two or three fact-gated career-turn
sentences and 56 words for the complete career component: up to 2 words for its
heading, 10 words per row, and 14 words across the independent-work label and line.
The literal FACT SLOT instructions below are excluded from the count.

## Slot-level substitution manifest

| Field / module | Action | Before | Candidate maximum | Source/status and implementation instruction |
| --- | --- | ---: | ---: | --- |
| `text-promise-main` | Keep verbatim | 20 | 20 | Approved current opening: 2-word title plus 18-word description. |
| `text-complexity-idea` | Keep verbatim | 5 | 5 | Accepted first half of the inciting question. |
| `text-complexity-conditions` | Keep verbatim | 3 | 3 | Accepted second half; joined question remains grammatical. |
| `text-background-unit.context` | Rewrite and move one existing sentence earlier | 40 | 71 | Use the exact 35-word safe base below, including the current sentence `I started in Communication Design and moved into digital products, experiences and systems.` Reserve at most 36 additional words for two or three approved causal career turns. Do not insert the FACT SLOT marker. |
| `text-background-unit.practice` | Keep verbatim | 43 | 43 | Preserves the accepted clarity-with-character paragraph. |
| `text-background-unit.career-sequence` | Insert after `practice`, only after approval | 0 | 56 | Four oldest-to-newest rows plus optional subordinate independent line. No partial, candidate or placeholder values in canonical JSON. |
| `text-background-unit`, complete field | Rewrite/insert | 83 | 170 | Maximum combines `context` 71, `practice` 43 and `career-sequence` 56. |
| `text-complexity-curiosity` | Keep verbatim | 3 | 3 | Becomes the earned thesis only after the complete career component. |
| `text-complexity-listen` | Keep verbatim | 5 | 5 | Keep joined title sentence unchanged. |
| `text-discipline-labels` and all six items | Keep verbatim | 106 supporting | 106 supporting | Preserve every name and useful description once. |
| `text-disciplines-title.making-early` | Delete | 44 | 0 | Removes the defensive `master of none` detour. No factual dependency. |
| `text-disciplines-title.category-crossing` | Keep verbatim | 24 | 24 | Retains the central causal synthesis. |
| `text-disciplines-title.background` | Move first sentence, then delete module | 30 | 0 | First sentence moves into early `context`. Delete this module only in the same canonical change that inserts four approved career rows. Remove the relative `thirteen years` claim. |
| `text-disciplines-title.ai-judgement` | Compress to exact candidate below | 66 | 38 | Removes the second complete discipline list while retaining accepted concrete sentences about behaviour, motion, code and AI. Safe without career facts. |
| `text-disciplines-title.possibility` | Keep verbatim | 15 | 15 | Retains the forward-moving synthesis. |
| `text-disciplines-title.selected-clients` | Keep verbatim | 32 supporting | 32 supporting | Client proof stays separate from employment rows. It must not be described as career chronology. |
| `text-disciplines-title`, prose only | Compress | 179 | 77 | `category-crossing` 24 + compressed `ai-judgement` 38 + `possibility` 15. |
| `text-life-momentum` | Keep verbatim | 3 | 3 | Method-title opening. |
| `text-life-form` | Keep verbatim | 2 | 2 | Method-title resolution. |
| `text-life-character.begin` | Keep verbatim | 29 | 29 | Preserves question-and-make logic. |
| `text-life-character.make` | Keep verbatim | 41 | 41 | Preserves shared-response logic. |
| `text-life-character.collaborate` | Keep verbatim | 42 | 42 | Preserves challenge and delivery logic. |
| `text-epilogue-shaping` | Insert exact approved field | 0 | 4 | Exact approved wording; standard travelling title. |
| `text-epilogue-thinking` | Insert exact approved field | 0 | 8 | Exact approved wording; standard travelling title. |
| `text-epilogue-invitation.text` | Keep verbatim | 2 | 2 | `Let’s begin.` remains the display finale. |
| `text-epilogue-invitation.description` | Rewrite | 19 | 8 | Default candidate: `Tell me what you’re trying to make possible.` Safe non-factual, non-repeating, pending editorial approval. |

## Complete candidate monologue

This is the plain-DOM/read-aloud candidate in rendered order. List punctuation and
headings indicate page structure, not extra spoken transitions.

> **About Me**
>
> Hi, I’m Alex. I’m a designer by heart, working across product design, visual systems,
> motion, 3D and code.
>
> What makes an idea worth…
>
> …paying attention to?
>
> I started in Communication Design and moved into digital products, experiences and
> systems. I kept returning to the way a word, an image, a movement or an interaction
> could change how someone understood an idea.
>
> **[FACT SLOT — NON-PRODUCTION: Add no more than 36 words across two or three confirmed
> causal sentences. Use only approved turns. The intended jobs are developer
> collaboration changing attention from appearance to behaviour, and identity work
> bringing product, brand and trust into the same problem.]**
>
> That is what interests me about design. I look for the thought that gives the work
> its direction, then make sure every part expresses it. It should become easier to
> understand without losing the character that made it interesting in the first place.
>
> **[FACT SLOT — NON-PRODUCTION: Insert the approved career heading, exactly four
> oldest-to-newest rows of year, employer and role, and the approved optional
> independent-work line. Maximum 56 words. Do not use the candidate values from the
> ledger until every confirmation is recorded.]**
>
> Modern problems refuse…
>
> …to stay in one category.
>
> **Product Design.** I shape how something works, so a complex product feels clear
> from the first interaction.
>
> **Experience Design.** I connect the moments around a product, so the experience
> makes sense as people move through it.
>
> **Art Direction.** I give the work a visual point of view, because appearance is part
> of how it communicates.
>
> **Motion & 3D.** I use movement and space to explain change and make unfamiliar ideas
> easier to grasp.
>
> **Creative Engineering.** I combine code and AI to turn early thinking into
> prototypes we can test.
>
> **Parametric Systems.** I build systems that help the work scale without losing the
> details that give it character.
>
> The work rarely divides itself neatly into technology, culture, language, behaviour
> and form. A decision in one changes what is possible in the others.
>
> I have always been curious about what happens where disciplines meet. A change in
> behaviour can reshape the visual language. Motion can explain what words cannot.
> Code and AI can turn an assumption into something we can test.
>
> I am interested in what becomes possible when those disciplines start to change one
> another.
>
> **Selected clients:** Yoti, S&P Global, Bentley, SunExpress, McCann Worldgroup,
> American Heart Association, Sony, Jaguar Land Rover, Maybourne Hotels, Experian,
> Data Communications Company, Tourism Ireland, Lufthansa, General Motors, Think Money
> Think Life.
>
> Make the work…
>
> …visible early.
>
> I begin by asking questions and looking beyond the first version of the brief. Then I
> make something early, because a real thing reveals more than a long explanation.
>
> That might be a sketch, a prototype, a visual system, a motion study or a piece of
> code. Once it is in front of us, the conversation changes. We can respond to the same
> thing, question it and make it better.
>
> I bring collaborators in while the important decisions are still open. I set a clear
> direction, invite them to challenge it and stay involved through delivery. The
> details evolve along the way, but the central idea stays visible in the final form.
>
> If you’re shaping something…
>
> …that needs more than one way of thinking…
>
> **Let’s begin.**
>
> Tell me what you’re trying to make possible.

## Exact canonical JSON content changes safe without career values

The following content keys are exact. Numeric `startWU`, `focusWU` and `endWU` caches
are intentionally absent from the snippets because the Story Stack compiler must derive
them after final measured copy is present. Do not invent or preserve stale WU values to
make these snippets pasteable.

### 1. Insert the approved invitation runway

Insert these fields immediately after `text-life-character` and before
`text-epilogue-invitation`:

```json
{
  "id": "text-epilogue-shaping",
  "kind": "title",
  "publishable": true,
  "flow": {
    "minScreens": 0.7,
    "gapAfter": "tight",
    "focusMode": "middle"
  },
  "presentation": {
    "layout": "center"
  },
  "movement": "spatial",
  "preset": "travelling-title-v1",
  "titleStyle": "standard",
  "text": "If you’re shaping something…"
}
```

```json
{
  "id": "text-epilogue-thinking",
  "kind": "title",
  "publishable": true,
  "flow": {
    "minScreens": 0.7,
    "gapAfter": "standard",
    "focusMode": "middle"
  },
  "presentation": {
    "layout": "center"
  },
  "movement": "spatial",
  "preset": "travelling-title-v1",
  "titleStyle": "standard",
  "text": "…that needs more than one way of thinking…"
}
```

### 2. Remove the defensive passage

Delete the complete module whose ID is `making-early`. This removes 44 core words and
does not depend on career approval.

### 3. Compress `ai-judgement`

Replace only its `text` value with:

```json
"I have always been curious about what happens where disciplines meet. A change in behaviour can reshape the visual language. Motion can explain what words cannot. Code and AI can turn an assumption into something we can test."
```

This is 38 words, down from 66.

### 4. Replace the repeating finale description

Default candidate:

```json
"description": "Tell me what you’re trying to make possible."
```

Two safe alternatives for the read-aloud decision:

| Option | Words |
| --- | ---: |
| `I’d like to hear what you’re trying to make possible.` | 10 |
| `I’d be curious to hear what you’re working through.` | 9 |

Choose one. Do not retain the current conditional description after adding the two
runway titles.

### 5. Career-gated canonical changes

Do not perform these until all confirmations are approved together:

- append the approved fact-turn sentences to the new 35-word `context` base;
- insert `career-sequence` after `practice`;
- move the first sentence of `text-disciplines-title.background` into `context`;
- delete the complete later `background` module, including `thirteen years`.

Never place FACT SLOT markers, empty rows, candidate dates or a stale `Present` value in
canonical JSON. If approval remains incomplete, the safe career behaviour is no
`career-sequence` module.

## Budget arithmetic by stage

The source-safe career-free working copy now places the confirmed Communication
Design origin before the thesis and leaves the unverified generic career line in its
later position. The shared tokenizer reports:

```text
347 core words
486 total reader-facing words
```

The final fact-gated candidate maximum is:

```text
347 current core
+ 36 approved causal career-turn words
+ 56 career-sequence maximum
- 18 delete the remaining generic career module
= 421 core words

486 current total + 36 + 56 - 18 = 560 total reader-facing words
```

Both results remain below the locked 436/574 baselines. Any approved career wording
that exceeds its allocated 92 words requires an equal cut elsewhere and a fresh count.

The current working copy and the final approved maximum both remain below the locked
436/574 baselines. The canonical word-budget test now enforces those limits, while the
career schema independently caps the career component at 56 words.

## Self-review against voice and canonical plan

| Gate | Result | Evidence or remaining condition |
| --- | --- | --- |
| Personal before thesis | Pass structurally | The early `context` begins with Alex's Communication Design origin; career evidence precedes `Modern problems refuse…`. |
| High retention | Pass | Opening, both existing title pairs, six discipline entries, synthesis sentences, client proof, complete method logic and final title remain. |
| Swap-name test | Conditional pass | The safe base names a specific origin; approved career turns and rows must supply the final personal specificity. Without them, do not call the candidate complete. |
| Say-it test | Pass for resolved copy | New safe sentences use ordinary first-person language; retained sentences already belong to the accepted canonical voice. Final career sentences still require read-aloud approval. |
| Symmetry test | Pass | The defensive balanced argument is removed. The remaining short lists explain media or method rather than manufacture a speech rhythm. |
| Abstraction test | Pass | `design`, `idea`, `disciplines` and `possible` are surrounded by words, images, movement, interaction, prototypes and code. |
| Lesson test | Pass | Paragraphs do not all end in a polished moral; several finish on an observation or action. |
| Source test | Pass with explicit block | Every unresolved employer, role, date, continuity and independent-work claim remains a FACT SLOT. |
| Animation test | Pass structurally | The three linked pairs reassemble as grammatical sentences; the invitation pair is exact and the finale no longer repeats it. Rendered line breaks remain for implementation QA. |
| No résumé prose | Pass structurally | Career completeness sits in one quiet ordered component; prose is capped at two or three consequential turns. |
| No net growth | Pass | Candidate maxima are 422 core and 560 total. |
| Nine-beat plan | Pass | Opening → question → personal/career evidence → earned thesis → disciplines → synthesis/proof → method → invitation runway → held resolution is intact. |

## Implementation handoff gate

Before the final integrator edits `contents-about.json`:

1. record Alexander's answers to every confirmation above;
2. update portfolio records through `docs/portfolio/router.yaml` if those answers change
   the knowledge base, then run `npm run verify:portfolio-knowledge`;
3. replace FACT SLOT instructions with approved wording inside this budget;
4. repeat the tokenizer count;
5. read the uninterrupted candidate aloud;
6. apply all career moves atomically so the later generic paragraph never disappears
   before the approved four-row evidence arrives;
7. compile Story Stack timings instead of hand-authoring stale WU values;
8. confirm 14 top-level text fields, four approved career rows or no career module, and
   valid semantic moment triggers.
