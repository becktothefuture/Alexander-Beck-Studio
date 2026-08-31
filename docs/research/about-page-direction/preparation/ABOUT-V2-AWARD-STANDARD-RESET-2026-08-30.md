# About Me — creative standard reset and action plan

Date: 30 August 2026

Status: **review complete; proposed next direction, not an approved concept or implementation**.

This supersedes the creative approval and build order in [Open Assembly / culmination and travel](ABOUT-V2-CULMINATION-AND-TRAVEL-PLAN-2026-08-30.md). That document remains useful as a record of technical constraints. Its three-surface object and 18-second lift/tilt prescription are not authorised for implementation by this review.

## 1. Verdict

The current page and the previous proposal are not ready to be presented as Cannes Lions-calibre work. The previous plan confused a well-specified animation with a strong creative idea. A new silhouette, smooth camera and an endless loop can all be executed correctly while the visitor learns nothing distinctive about Alex.

The visual language is worth keeping. The necessary change is in what that language communicates and how the whole experience earns the visitor's attention.

Audience: prospective clients, hiring decision-makers and collaborators. Intended outcome: visitors understand what Alex can help them decide, remember a specific way he works, and can contact him easily. An award is a possible later recognition, not the visitor's task and not a promised outcome.

This review used three independent simulated craft perspectives: creative idea, film direction and digital experience. These are not actual Cannes Lions jurors. Their agreement is a critique input, not proof of originality or award merit. The stricter standard is to reject a weak idea even when every implementation check passes.

## 2. What stays

- Instrument Serif display typography and Geist supporting text.
- Opaque, dispersed multicolour circular points, the existing palette ownership, atmospheric depth and restrained editorial composition.
- The black physical frame, stable Button Bar and existing utility-control language.
- Recognisable round portals, terrain and the user's shortened square-gate passage.
- The personal voice, five career rows, six disciplines, fifteen client marks and two closing titles. Preserve supplied dates and roles; do not invent career progression or current employment.
- User-controlled scroll, a camera that decelerates to a true stop, and living material at the end in ordinary motion mode.

No wholesale scene rebuild, global particle thinning, heavier fog to erase a problem, new palette, typography redesign, title plates, thin diagram connectors, mandatory game, monogram reveal, confetti burst or added chapter. Preserve the character of the current work, not every current staging decision.

## 3. Current evidence, not a proposed mockup

Fresh local browser captures and source were reviewed. The [key-frame contact sheet](../../../../output/playwright/about-award-standard-20260830/review-key-frames.png) contains the exact captured page, with labels and proportional resizing only. The large translucent grey disc is the existing custom cursor, not scene geometry.

| Step | State and health | Observed finding | Consequence for the plan |
| --- | --- | --- | --- |
| 1 | Opening — needs work | On portrait, particles cross both the large `About Me` heading and the small introduction. The strongest title still names the page rather than introducing the person. | Use the personal opening already proposed; stage the existing points clear of its reading region. Do not enlarge the type or cover the world with a plate. |
| 2 | Disciplines — useful structure, uneven material | The functional descriptions scan clearly. The low terrain contains tightly packed colour at the horizon and large nearby dots; point dispersion does not feel even. | Preserve the terrain and descriptions. Tune its projected point footprint and local staging, not the whole world's population. |
| 3 | Method — legible, dramatically repetitive | The method title sits between two tall particle banks. The current five-word sentence is split over two title events. | Make it one complete title; use this passage to establish an observable relationship, not another dramatic reset. |
| 4 | Desktop ending — usable late state, weak payoff | The final composition retains almost the same two tall banks and central void as the method. At an earlier invitation position the title is fully visible but support and actions are absent. | The ending needs a new spatial relationship. Complete the invitation without another scroll gesture. |
| 5 | Portrait ending — clear actions, incomplete composition | The final title and actions are readable, but the subject reads as two cropped side fragments around a large empty middle. | Compose a whole, finite subject for portrait as well as desktop; changing particle count cannot supply the missing culmination. |

Additional accepted frames cover the two closing titles, method prose and personal-context passage. Some intermediate capture filenames describe the intended beat rather than its measured position; they are not proof that all career rows were visible. The five career rows, six disciplines and fifteen marks were checked in canonical source, not certified in full by this screenshot set.

The contact defect is also source-backed: `aboutNarrativeComposer.js` calculates support/action opacity from progress through the invitation, with actions at 62–80%. `useAboutNarrativeTimeline.js` keeps them inert until action opacity reaches 0.98. A fully visible title is therefore not enough to make the invitation functional. A fresh long stop-and-wait test remains part of the implementation gate; these stills alone do not prove elapsed behaviour.

Coverage: local in-app Chromium, light theme; desktop CSS 1422 × 800 and portrait CSS 390 × 844. The browser had an existing 90% scale, so saved surfaces are 1280 × 720 and 351 × 760. Exact browser-surface capture was used after rejecting incorrectly framed wrapper captures. The temporary viewport override was reset. This is not native-phone, WebKit, full-motion, load-performance or accessibility certification. A later browser reconnection showed an unavailable page although Studio status still reported local authoring running; no shared service was restarted or stopped.

## 4. The higher creative bar

The reviewers' strongest objections are related but distinct:

1. **Idea:** the page establishes range more than judgement. Three moving forms would illustrate coexistence, not the claim that a decision in one discipline changes another.
2. **Film:** the current ending repeats the method's visual grammar. An unrelated sculpture would change the image without necessarily paying off the story.
3. **Experience:** the page can ask for another scroll after it already appears to invite contact. That weakens trust at the most important functional moment.

Root challenge to the jury: even a cause-and-effect animation can be generic. We must not invent a broken joint just to repair it, then call the repair a personal idea. A clear mechanical event is not sufficient evidence that the work belongs to Alex.

Recommended creative principle: **make one consequential design decision visible**. Visitors should see how Alex turns an early thing into something that others can respond to, and how that response changes the work across disciplines. The current narrative supports this point of view; its specific proof is still missing.

The distinction matters: this is a direction for the next experiment, not a new approved sculpture or an award-ready concept.

## 5. Tighten the story before specifying another object

Keep the previous concise-edit direction, with a smaller and more useful job for each beat:

| Beat | Narrative job | Proposed action |
| --- | --- | --- |
| Personal opening | Meet Alex immediately | `Hi, I'm Alex.` in the existing display treatment; one concise introduction. Keep About Me in navigation and document context. |
| Origin | Give the breadth a personal basis | Use the supplied Computer Science → Communication Design and language-interest facts. Do not invent an epiphany, abandonment or accidental career. The education title pair remains a candidate, not a requirement to dramatise a CV fact. |
| Career | Establish real experience | Keep all five rows, easy to scan and stop on. Do not make each employer a new 3D scene or an implied outcome claim. |
| Range | Explain what the different disciplines do | Keep six functional descriptions and fifteen client marks. Remove repeated breadth claims, but preserve the meaning that a decision in one area changes possibilities in another. |
| Method | Prove the way of working | One complete `Make the work visible early.` title. Replace the generic list of possible artifacts with one brief approved decision and its consequence. |
| Closing pair | Turn the story towards the visitor | Preserve `If you're shaping something…` and `…that needs more than one way of thinking…`. Use them to reveal the already-established relationship. |
| Invitation | Resolve the experience and enable contact | `Let's begin.` with the existing support line and both actions. Camera holds; material remains alive without crossing the reading/action area. |

Work inside the earlier concise candidate's 280 core / 419 total words as a ceiling for this revision, subject to an exact counting test. Replace, do not append. Keep no more than its thirteen text fields. Measure final scroll extent against a fresh baseline at each identical viewport; reflow means one WU total cannot be copied between desktop and portrait. Do not add scroll length to buy an elaborate finale.

### The one source gap worth closing

We need a small, publishable chain: **situation → Alex's choice → consequence elsewhere in the work → artifact and credit**.

Use the existing `working-method.make` slot, within that slot's word allowance. The required content is a concrete observation and change, not a miniature case study or an invented business metric. Another person's contribution can be part of the story; do not imply sole authorship.

The next focused prompt is: **Which change you made most changed what the team built, and what can we show from before and after?** Resolve the example, attribution and permission before drafting public copy.

The portfolio router, catalogue, source index and Yoti record were checked. Yoti's possible identity example is still `blocked_missing_facts`; its candidate claims must not become public facts just because they would fit the animation. AHA remains on hold. The site itself can be considered as an example only if it supplies a specific documented decision and consequence; calling the page its own proof is not a shortcut.

## 6. A better finale to test

The target emotion is **recognition followed by release**: the visitor first understands a relationship, then sees it operating as a complete living whole. Celebration should come from that resolution and the opening of space. More point density is not the crescendo.

Test this visual hypothesis in the existing point material:

1. **Plant:** during the method, a restrained change in one region produces an observable response in another. Both regions are already well composed. There is no ugly, broken or chaotic state, and no connector graphic explaining the relationship.
2. **Reveal:** during the first closing title, the side-bank environment ends through spatial staging. One continuous camera move reveals the finite extent of a low, open, asymmetric point landscape. It must read as a whole, not a tunnel, wall pair, orbit or collection of trophies.
3. **Resolve:** during the second title, the same local behaviour becomes legible across that complete form. A broad travelling displacement is one candidate: motion passes through a shared relationship instead of independent surfaces simply oscillating together. Its exact structure must follow the approved decision, not precede it.
4. **Hold:** at `Let's begin`, the camera has stopped. That established motion continues across the finite form, below and clear of the complete invitation. It does not collapse back to an unfinished state, restart the reveal or wait for a special pose to look good.

This introduces something new at the end: the complete relationship and its shared behaviour. The material and visual style stay familiar. The new subject must have a distinct silhouette and spatial composition, but a different silhouette alone does not pass the idea test.

Make one 8–12-second review study of setup → consequence → final hold, in desktop and portrait. That is a review duration, not a forced page runtime. Test in the real renderer and point material; a polished image-generation preview cannot prove camera continuity, legibility or perpetual motion. Do not choose a period, amplitude or deformation system until the visible movement earns it.

Reject the study if it needs extra copy to explain its cause, if viewers see only another decorative wave, if the entire subject cannot be composed on portrait, or if it only looks good at one phase. If it fails, change the premise before polishing it.

The silent test checks whether a change and its consequence are visible. It does not ask anyone to infer Alex's biography from abstract dots. Personal meaning comes from the truthful story and the experience together.

## 7. Craft requirements that remain necessary

These improve execution. None independently establishes originality.

- **Camera:** one distance schedule along the authored rail; continuous movement between scenes rather than separate ease-in/out pulses. Fit final path length, incoming speed and available closing interval together. Decelerate to zero, without a last acceleration, snap or independent ending orbit. User scroll remains the pace control; reading stops remain valid.
- **Spacing:** stage adjacent objects so their full projected motion bounds do not collide. Keep earlier landmarks and their point allocations. Do not erase a stage with fog or lower all populations to repair one overlap.
- **Point craft:** calibrate screen-space point size and local sampling where the terrain creates tight bands and oversized near dots. Check grazing views, both themes and smallest viewports. Preserve point identity, opacity, palette and depth.
- **Typography:** keep complete thoughts readable at rest and copy outside the moving material's full envelope. Fix composition rather than adding type shadows, outlines or plates. Preserve current type roles.
- **Invitation:** use an About-local elapsed arrival sequence, not further scroll progress. Test complete, operable actions within the prior 1.2-second target after arrival. Direct-end restoration and reduced motion resolve immediately. Reverse/re-entry must not strand focus or reset the material phase.
- **Perpetual motion:** use the current animation owner, a bounded phase and the smallest sufficient motion contract. Pause when hidden; preserve a stable reduced-motion presentation. Provide an accessible pause/stop control for non-essential continuing motion through the existing utility language, not a new navigation system. Assess against [W3C Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html).
- **Resilience:** biography and contact remain available if the 3D load fails. Test quick arrival, native touch, reverse scroll, route re-entry, 200% zoom, short landscape and keyboard/screen-reader use. No viewer must finish a performance to access a function.

## 8. Streamlined execution sequence

No production implementation is authorised by this review. On approval, work in these dependent stages; do not rebuild the full world while the premise is unresolved.

| Stage | Owner and scope | Exit condition |
| --- | --- | --- |
| A — Evidence and editorial decision | Editorial lead; canonical copy and one source-backed decision capsule. No knowledge claims promoted without approval. | Alex recognises and approves the account; it fits existing space and gives the film something specific to express. |
| B — One moving proof | Scene/motion lead; isolated terminal candidate and minimal renderer support. Freeze earlier semantic poses, scene/source hashes and per-object allocations first. | Actual point-rendered setup/payoff works without explanation at desktop and portrait. If the creative test fails, stop here. A non-factual motion study may run alongside A, but cannot pass the personal-specificity gate alone. |
| C — Integrate one short story | Content/layout owner, then timeline/renderer owner; apply the concise copy, merge the method title, compile travel and arrival together. | Whole thoughts read cleanly, protected content survives, no extra chapter, total extent below the matched baseline, source/export/browser agree. |
| D — Adversarial visual and motion QA | Independent reviewer plus integration owner; no overlapping writes to the renderer. | Full forward/reverse captures, slow and fast scroll, partial invitation stops, complete final-motion cycle, native devices and performance checks pass. |
| E — Unfamiliar visitor review | Actual potential clients, hiring leads and collaborators, recruited only with permission. | People can describe Alex's contribution and the effect of the key decision without the brief, and can locate career/contact information unaided. Resolve repeated misunderstandings before polishing. |
| F — Release and entry decision | Site owner, then award/rights review. No automatic deployment or entry. | Real released work, target-edition eligibility, rights, approvals and honest evidence support a specific category. |

Use one owner for `aboutBlenderPointScene.js`, shared camera/timeline integration and the canonical content file in each wave. Reuse the current renderer, exporter and journey compiler. Keep all candidate source changes recoverable. A new abstraction or animation system must have a demonstrated need.

## 9. What the stricter jury must reject

- A concept that remains unchanged if Alex's name and history are removed.
- An opening promise that the page never answers.
- An image whose meaning exists only in our written treatment.
- A final reveal that is only a new object, rather than a developed relationship.
- A phone version that loses important forms or becomes dense colour behind small text.
- Extra scroll distance, another mandatory gesture or a delay used to force the intended emotional response.
- A beautiful selected still hiding an awkward transition, loop seam, overlap or unreadable phase.
- Self-awarded high scores offered in place of independent, unprompted viewer evidence.

Use a small formative study, initially six unfamiliar people across the three audiences. Ask what they would come to Alex for, which moment led to that conclusion, what changed in the scene, and what they remember once it is hidden. Compare with the same copy in a plain readable control. This is diagnostic research, not statistical proof of uplift. Do not lead with words such as collaboration, assembly or innovation. Include separate accessibility evaluation; a six-person informal study does not certify access.

If people remember only coloured dots or a tunnel, the idea has not landed. If they understand the idea only after we explain it, it has not landed. If the intended result is intelligible but the experience feels long or tiring, the edit has not landed.

## 10. What a credible award attempt would require

[Digital Craft](https://www.canneslions.com/awards/lions/digital-craft) judges execution and experience. A05 Overall Aesthetic Design and A03 Motion Graphics Design & Animation are plausible lenses, not a prediction. Do not borrow the separate Design Lion's percentage weighting or claim technological advancement merely from using Three.js.

The lesson from [Spreadbeats](https://www.canneslions.com/news/cannes-lions-announces-winners-across-entertainment-and-craft-tracks) and [Caption with Intention](https://www.canneslions.com/news/cannes-lions-announces-2025-winners-across-entertainment-and-craft-tracks) is an inference, not an award rule: the craft's form belongs to the purpose of the work. Copy neither their visual language nor their scale. This site does not need an invented social mission, an AI feature or a bigger production to justify itself.

[Current rules](https://www.canneslions.com/awards/awards-support/rules-and-eligibility) allow approved self-promotion, but require actual released work, rights and approvals. The published 2026 window ended on 9 April 2026; this proposed later revision is not a 2026 entry. Check the next edition's exact conditions before spending on entry. Do not assume eligibility or submit anything from this task.

Define the objective before release. After an authorised launch, collect only permission-appropriate evidence: whether relevant visitors understand the offer, can use the site and make relevant enquiries. Do not treat dwell time, scroll completion, simulated-jury praise or an attractive case film as business impact. Entry claims need [verifiable support](https://www.canneslions.com/awards/lions/digital-craft/what-you-need-to-know), with accurate attribution and AI-use disclosure where applicable.

The practical target is work we can defend without an award label. A Lion remains uncertain even if every proposed gate passes.

## 11. Verification and deliverables

This turn changed planning and review artifacts only. It did not modify production code, copy, Blender geometry, exported assets or deployment. The assembled contact sheet was rendered and opened. Its input images were inspected individually before acceptance. Existing incorrectly framed probes remain excluded from evidence.

Local review records: [creative idea](../../../../output/playwright/about-award-standard-20260830/jury-idea.md), [film direction](../../../../output/playwright/about-award-standard-20260830/jury-film.md), [digital experience](../../../../output/playwright/about-award-standard-20260830/jury-experience.md). The capture and review folder is gitignored. Main inspected all three reports, checked their current-source claims and rejected the suggestion that a causal wave alone would establish personal distinctiveness.

For the future build, begin with a reproducible baseline and run the available gates against the supported narrative preview, not the production coming-soon gate:

```bash
npm run studio:status
npm run check:site
npm run studio:check
npm run audit:about-narrative-terminal-hold
npm run audit:about-responsive-sequence
npm run audit:about-narrative-restoration
npm run audit:about-narrative-runtime-soak
```

Use the scripts' supported Chromium and WebKit settings serially. Extend the existing assertions for partial arrival, the new terminal relationship, full motion bounds and reduced motion. Include actual-phone review and frame-time evidence; browser emulation and a green build are not a 60 FPS claim.

Required handoff after implementation: matched baseline/final contact sheets; forward/reverse and final-hold recordings; approved concise copy and word count; source/export hashes and landmark-retention checks; exact browser/device coverage; failures and unresolved limits; real visitor findings when those sessions are authorised. The next deliverable should be the small moving proof, not another polished explanatory plan or an untested final still.
