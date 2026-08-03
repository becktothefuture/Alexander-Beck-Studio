# About narrative script brief v1

Status: ready for a first full-copy draft

Prepared: 2026-08-02

Scope: editorial brief only; no production copy or runtime configuration changed

## Purpose

Write a short personal story that fits the current About page structure and works with its scroll animation.

The page must explain:

- who Alex is and why he loves design;
- how his career expanded over about 13 years from visual communication into products, systems, motion, code, and emerging technology;
- why complex problems and multidisciplinary thinking keep his attention;
- how he balances clarity with character and human meaning;
- why purposeful AI, trust, privacy, and other unfamiliar questions matter to him;
- what it feels like to work with him;
- why he is interested in making something new with the right people.

This is a story about a person and the path of his curiosity. It is not a complete career history or a catalogue of services.

## Inputs and source order

Use these sources in this order:

1. [Current page storyboard and text inventory](current-page-storyboard/ABOUT-PAGE-CURRENT-STORYBOARD-2026-08-02.md) — the structural and animation contract.
2. [Revised About tone of voice](../supporting/editorial/ABOUT-TONE-OF-VOICE.md) — the editorial voice and title rules.
3. [Creative-direction research](../supporting/research/About-Me-Creative-Direction-Research.pdf) — the experience goals and content limits.
4. [Interview answers, round 1](../supporting/interview/ABOUT-NARRATIVE-INTERVIEW-ANSWERS-ROUND-1.docx) — philosophy, clarity, character, AI, and side work.
5. [Interview answers, round 2](../supporting/interview/ABOUT-NARRATIVE-INTERVIEW-ANSWERS-ROUND-2.docx) — career turns, proof, collaboration, and future direction.
6. [Canonical About content configuration](../../../../react-app/app/public/config/contents-about.json) — final slot IDs and current copy.

Old website copy and archived drafts can help recall a topic. They are not factual authority and must not override the interviews or verified project sources.

## Creative thesis

The working thesis is:

> A personal story about a designer whose fascination with how meaning is carried led from visual communication into complex products and emerging technology, and who sees complexity not as something to flatten, but as material to understand, shape, and make human.

This is a direction statement, not final page copy.

## Narrative device: one thought keeps unfolding

The page should feel like one spoken thought that keeps finding a wider form.

- The text is Alex’s voice, not an external narrator.
- Travelling titles are pauses inside the voice, not chapter names.
- Reading blocks bring the reader closer and supply the personal detail.
- Client logos and project impressions are evidence. They do not start new stories.
- The dots change form as Alex’s interests expand: a compact beginning, complexity, a system, a new disturbance, and finally a person.
- The script should not describe the animation literally. Text and motion should carry the same idea from different directions.

The motion can support this subtext:

| Visual change | Narrative support |
| --- | --- |
| Compact cluster | One person and an early fascination. |
| Turbulent field | Ideas, media, and career paths become more complex. |
| Ordered grid | Different disciplines become a connected practice. |
| Ripple | A new question disturbs a familiar system. |
| Human bust | Tools and systems return to human judgement; something new takes form. |

## Reader journey

By the end of the page, the reader should:

1. know what Alex does from the first screen;
2. feel that they have met Alex by the first reading block;
3. understand his breadth as a consequence of curiosity, not as a claim of versatility;
4. remember two or three specific career or project turns;
5. understand how he listens, makes, and collaborates;
6. recognise his concern for clarity, character, trust, and responsible technology;
7. feel that the invitation to talk is personal and credible.

## Story spine

Write the first draft as one continuous monologue in this order:

1. **Present fascination.** Complex problems often cross disciplines, and that is what attracts Alex.
2. **Personal introduction.** “Hi, I’m Alex.” He is a designer at heart and loves the work.
3. **Emotional origin.** Visual language and its effect on people drew him from Computer Science towards Communication Design.
4. **Selective evolution.** Early visual and cultural work opened into interfaces; working with developers opened systems thinking; product and trust work made behaviour, appearance, and meaning inseparable.
5. **Present practice.** The breadth of the work is now a connected practice rather than a list of roles.
6. **Working philosophy.** Listen to the people closest to the problem, question the brief, make something real, and direct the work in the open.
7. **Shared moment.** People now meet complex systems and AI that they may not understand or trust. Alex sees room for careful demystification, character, and invention, with human judgement kept in view.
8. **Questions that continue.** AI, trust, privacy, robotics, and even an irritating keyboard can become material for experiments.
9. **Forward resolution.** Not knowing the next question is the source of possibility. The ending should point towards making something new.
10. **Invitation.** Invite people with an unfamiliar or unresolved problem to talk.

The final story does not need to name every item in this spine. Each retained detail must help the next one happen.

## Slot-by-slot writing brief

The total core-word target overrides every local allowance below. Word ranges are guides, not quotas.

### Slot 1 — opener

Runtime fields: `text-promise-main.text` and `.description`

Treatment: display title + short description

Current bookend: “About Me”

**Job**

Give a plain current orientation. Let the reader know that Alex is a designer and that his work reaches into technology and complex systems. Include warmth or fascination, not a list of project categories.

**Target**

- Keep “About Me” unless the full draft proves another clear interface label.
- Description: 15–20 words.
- The first screen must make sense without the next animation beat.

**Avoid**

- more than two role labels;
- “multidisciplinary designer” as the whole explanation;
- a manifesto about the state of the world before the reader knows who is speaking.

### Slot 2 — early travelling-title pair

Runtime fields: `text-complexity-idea` and `text-complexity-conditions`

Treatment: two full-screen spatial titles

**Job**

Open the central fascination: problems that do not stay inside one discipline, and why that keeps pulling Alex forward.

**Target**

- 12–18 words across the pair.
- One connected sentence is preferred.
- Each half must be substantial enough for its visual scale.

**Join test**

> `[fascination with a problem that crosses disciplines]…`
>
> `…[why the space between disciplines is interesting].`

This is sentence scaffolding only, not proposed copy.

### Slot 3 — first reading block and client proof

Runtime field: `text-background-unit.block.modules`

Treatment: three line-revealed prose passages + logo grid

**Passage A: meet Alex**

- Say “Hi, I’m Alex” or use an equally natural first-person introduction.
- Say that he is a designer at heart and enjoys the work.
- Connect this quickly to the fascination already opened by the titles.

**Passage B: the origin**

- Use the move from Computer Science to Communication Design only if the exact course and institution wording is confirmed.
- Explain the attraction to visual language and its positive effect on people.
- Let type, image, motion, or different media appear as evidence, not as an inventory.

**Passage C: the career expands**

- Select two or three causal turns, not every employer.
- A useful chain is: early visual/cultural work → interfaces and developer collaboration → product, identity, and trust → broader systems and emerging technology.
- A name belongs only where it makes the consequence clearer.

**Logo grid**

- Let the logos carry breadth and client proof.
- Caption: 6–10 words, factual and quiet.
- Do not repeat the sector list in the prose.

**Target**

- 50–60 core prose words across all three passages.
- Each passage should change Alex’s direction or deepen the reader’s understanding.

### Slot 4 — bridge travelling-title pair

Runtime fields: `text-complexity-curiosity` and `text-complexity-listen`

Treatment: two full-screen spatial titles

**Job**

Turn from the career story into the connected practice. Show that one medium or question kept opening onto another; do not announce “multiple disciplines” as a generic capability.

**Target**

- 10–14 words across the pair.
- One grammatical sentence, split where the thought naturally turns.

**Join test**

> `[one part of the work kept opening onto another]…`
>
> `…[which explains the practice Alex has now].`

This is sentence scaffolding only.

### Slot 5 — discipline reveal

Runtime clip: `motion-discipline-reveal.parameters.items`

Treatment: six labels attached to the animated point field

Keep the current six labels unless the wider information architecture changes:

- Product Design
- Experience Design
- Art Direction
- Motion & 3D
- Creative Engineering
- Parametric Systems

**Job**

Give the reader a scannable map of the practice while the grid makes its relationships visible.

**Target**

- Description: 6–10 words for each discipline.
- Describe the useful contribution or outcome.
- Vary sentence construction. Six consecutive “I…” claims will read like a service menu.
- Treat this as supporting microcopy outside the core narrative-word target.

### Slot 6 — second reading block and project impressions

Runtime field: `text-disciplines-title.block.modules`

Treatment: three line-revealed prose passages + interactive stack + final prose passage

**Passage A: how the work starts**

- Listen to the people closest to the problem.
- Test assumptions in the brief.
- Make something real enough for the team to respond to.

**Passage B: how direction is shared**

- Alex can set a creative direction without protecting it from challenge.
- Collaboration begins while the interesting decisions are still open.
- The desired human effect is that collaborators feel heard, understood, and cared for.

**Passage C: philosophy in the present moment**

- Name complexity, uncertainty, or mistrust without making the page pessimistic.
- Connect clarity with character: useful simplification preserves nuance and humanity.
- Explain purposeful AI through what it helps Alex explore or prototype, while human judgement remains responsible for the work.
- If an implementation lesson is used, include only one and show how it changed Alex’s behaviour. Do not add a second project summary.

**Interactive stack**

- Keep “Project impressions” or replace it with an equally quiet, descriptive label.
- Let the 20 images prove material range and interrupt the reading rhythm.
- Do not explain every image in prose.

**Passage D: questions that follow him home**

- Use one human artefact or irritation, such as the iOS keyboard side project.
- AI, trust, privacy, and robotics may show the wider field of curiosity, but avoid another list if passage C already names them.
- End with forward energy.

**Target**

- 60–72 core prose words across the four passages.
- Make the four passages feel causal: listen → make together → form a point of view → keep exploring.

### Slot 7 — closing travelling-title trio

Runtime fields: `text-life-momentum`, `text-life-form`, and `text-life-character`

Treatment: three full-screen spatial titles over the returning grid and bust transition

**Job**

Resolve the monologue through uncertainty, possibility, and creation. The final fragment should point towards making something new, not towards a generic statement about learning.

**Target**

- 15–20 words across all three titles.
- Prefer one connected sentence.
- Let ellipses make the continuation visible.
- Give each fragment enough meaning to survive a full-screen pause.

**Join test**

> `[the next question may come from somewhere unexpected]…`
>
> `…[that uncertainty creates possibility]…`
>
> `…[and possibility can become something new].`

This is structural scaffolding, not final copy.

### Slot 8 — finale and actions

Runtime field: `text-epilogue-invitation`

Treatment: display title + description + four fixed actions

**Job**

Continue the multidisciplinary conclusion as a low-pressure invitation to make something new.

**Target**

- Use “Let’s make something new” as the title.
- Description: 10–14 words.
- Name an unfamiliar, unresolved, or complex problem without sounding like a sales qualification form.
- Do not repeat “something new” in the preceding travelling title.
- Keep the existing actions: Explore the Lab, See My Work, Get in Touch, LinkedIn.

## Word budget

Target **190–220 core words** across the opener description, travelling titles, reading passages, and finale description.

Suggested allowances:

| Area | Words |
| --- | ---: |
| Opener description | 15–20 |
| Early title pair | 12–18 |
| First reading block | 50–60 |
| Bridge title pair | 10–14 |
| Second reading block | 60–72 |
| Closing title trio | 15–20 |
| Finale description | 10–14 |

The final total takes priority. Fixed interface titles, action labels, logo caption, and discipline microcopy sit outside this core target but must remain concise.

The current page has about 425 reader-facing words before the final actions when discipline descriptions are included. The next pass therefore needs to remove repeated jobs as well as shorten sentences.

## Layout and timing constraints

The copy must be written for the rendered slots, not only for a document:

- Standard travelling titles use a maximum measure of 16ch.
- Display bookends use a maximum measure of 18ch.
- Reading passages use a 54rem corridor and reveal line by line.
- A title’s most readable part occupies only the middle of its spatial travel. Extra lines increase reading pressure quickly.
- Desktop and tablet use a 17.81 WU scroll. Mobile maps the same story to 18.49 scroll units; it does not create space for extra prose.
- The CSS measures are layout widths, not character limits. Render every fragment to judge its actual line breaks.
- Place an ellipsis at a slot boundary only after the unsplit sentence passes the read-aloud and grammar tests.

## Evidence available for the draft

The interview material supports these story elements:

- an early move from Computer Science towards Communication Design because visual language and communication felt more compelling;
- early print and cultural work;
- developer collaboration that expanded visual practice into interface behaviour and systems thinking;
- product, identity, interaction, and trust becoming inseparable at Yoti;
- later work across UX, systems, front-end development, motion, 3D, AI, and organisational questions;
- a preference for making ideas concrete so a team can respond;
- creative direction done in the open;
- a financial index-building lesson about layered complexity and staying close to implementation;
- AI as an amplifier for thinking and prototyping, not a replacement for judgement;
- side projects that turn discomfort or unfinished questions into creative energy;
- an interest in ambiguous human questions around AI, trust, privacy, and robotics;
- a desire to be trusted to invent a new approach and to leave collaborators feeling heard and cared for.

These are source candidates, not permission to publish every detail. Select only what the story needs.

## Fact and claim checks before final copy

| Item | Issue | Required action |
| --- | --- | --- |
| “13 years” | Correct now only if the start point is agreed; it will date quickly. | Confirm the career start year. Prefer a fixed year or “more than a decade” if exact duration is not important. |
| Computer Science → Communication Design | The personal account is clear, but the public course and institution wording needs precision. | Confirm institution, programme name, and whether a date is useful. |
| Denaline / Dennerlein | Existing materials use conflicting spellings. | Confirm the employer’s exact public name before any mention. |
| Current role | “Designer and technologist,” “creative technologist,” and wider discipline descriptions are all in circulation. | Choose the simplest current designation that Alex would use aloud. |
| Yoti anti-spoof hologram | The interview supports the contribution and lesson; ongoing-use claims are separate. | Confirm Alex’s role, public wording, and any claim that the feature is still used. |
| S&P index-building example | The lesson is useful, but project, agency, and contribution details need care. | Confirm the public project name, Alex’s part, and whether the delivery lesson can be named. |
| Client and employer relationships | Some work may have been completed through an agency or team. | Preserve the correct context and avoid implying sole authorship. |
| iOS keyboard side project | The origin is supported; the current state and public destination may change. | Confirm what can be named or linked. |
| AI practice | Generic interest is supported, but strong examples need evidence. | Select one concrete, current use that Alex is comfortable publishing. |
| American Heart Association | Project knowledge is on hold. | Do not draft a new outcome or contribution claim until the hold is explicitly removed. A logo alone does not authorise a claim. |
| Availability and invitation | This is time-sensitive. | Confirm the desired contact wording before publication. |

If a fact remains unresolved, mark it in the draft with `[VERIFY: …]`. Do not smooth over the gap.

## Acceptance criteria for the first complete draft

The draft is ready to fit into the page only when:

- it works as one 190–220-word monologue before slot labels are added;
- the first screen says what Alex does;
- the first reading block introduces Alex as a person;
- the story contains one emotional origin, one causal career chain, and no more than three proof turns;
- breadth reads as evolution, not as a capability claim;
- Alex’s working method and collaborative character are both visible;
- complexity, clarity, and character form a practical point of view rather than a slogan;
- AI is specific, purposeful, and subordinate to human judgement;
- the title pairs and trio reassemble into grammatical sentences;
- no travelling title is only a dramatic two-to-four-word abstraction;
- the ending points towards making something new;
- logos, discipline labels, and project impressions do not repeat jobs already done by prose;
- every date, name, contribution, and outcome is confirmed or marked for verification;
- a read-aloud pass sounds like Alex speaking to one person.

## Next writing and fitting sequence

1. Write one continuous 190–220-word first-person monologue. Do not use slot labels yet.
2. Compare every factual sentence with the interview and project evidence. Add `[VERIFY: …]` markers where needed.
3. Read the monologue aloud and remove phrases that sound like a résumé, pitch, manifesto, or magazine profile.
4. Split the approved monologue into the eight existing slot groups.
5. Add ellipses only at title boundaries where one sentence genuinely continues.
6. Draft the six discipline descriptions as separate 6–10-word microcopy.
7. Load the script into the local About Narrative editor. Do not hand-edit generated runtime files.
8. Review desktop and mobile line breaks. Standard titles have a tighter measure than display titles, so the written word count alone is not enough.
9. Check the full scroll in light and dark themes, with full and reduced motion.
10. Revise timing or copy only after seeing which words share a frame with turbulence, the grid, the ripple, and the forming bust.

The preparation is complete when a writer can follow this sequence without having to rediscover the page structure, voice, evidence, or fact risks.
