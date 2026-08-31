# About narrative completion audit

Later update, 2026-08-30: the user has now approved the career additions. Five rows and the dot-separation correction are implemented. See [career approval and dot separation](ABOUT-V2-CAREER-DISPERSION-2026-08-30.md) for current copy, counts and verification. The audit below records the earlier, pre-confirmation state.

Date: 2026-08-30
Scope: complete the missed editorial work from the approved cinematic plan. Preserve the recovered Blender scene, camera, point density and continuously moving finale.

## What the conversation required

The original request was a personal story with career evidence, treated as one short film. The later camera and overlap corrections did not replace that request. The latest perpetual-motion request replaces the old requirement to freeze the final material, but not the held camera or final invitation.

The review uses the approved 29 August implementation plan, current canonical About content and the two original About interview companions. [Daniel Sun's reference](https://danielsun.space/about) informs the order of information, not the wording or visual design.

## Reconciliation

| Requirement | State at the start of this pass | Action |
| --- | --- | --- |
| Opening and inciting question | Already implemented and explicitly kept | Preserve both |
| Personal origin before the thesis | Only a generic Communication Design sentence | Add the source-backed study origin, Mainz and interest in language |
| Career experience as evidence | Missing from the early story | Move work context early; add concrete interfaces/developer and identity-work material |
| Four employer/role/date rows | Component built, no canonical rows | Still awaiting direct confirmation of conflicting facts |
| Less repetition after the disciplines | Partly compressed, but career summary remained late | Remove the late paragraph and stale relative duration; compress synthesis |
| Six disciplines, client proof and method | Already present | Keep their substance and order |
| Two titles before “Let’s begin.” | Already implemented | Keep exact wording |
| Full scene, short gates, stable camera | Recovered in the previous animation pass | No asset, geometry, camera, density or motion changes |
| Perpetual motion at the ending | Implemented in the previous pass | Keep the moving material and held camera |

## Changes in this pass

`contents-about.json` keeps the existing 14-field spine. The early reading field now has three prose modules in this order:

1. `context`: Computer Science study, Communication Design in Mainz and the interest in language.
2. `background`: agency, in-house and independent settings; interfaces, icon systems and motion alongside developers; identity work connecting product, brand and trust.
3. `practice`: the accepted clarity-with-character paragraph, unchanged.

The generic `background` module no longer appears after the disciplines. “Over the past thirteen years” and the separately unverified consultant claim are removed. The later synthesis retains its behaviour-to-visual-language example, motion, code and purposeful AI, without repeating the broad curiosity claim.

Core copy: **347 → 346 words**. Total reader-facing copy: **486 → 485 words**. Both remain below the approved **436 / 574** ceilings. Counts use the existing Unicode tokenizer, include the discipline heading and client names, and exclude fixed action labels.

### Source trace

| New substance | Source |
| --- | --- |
| Computer Science before Communication Design in Mainz | `supporting/interview/ABOUT-NARRATIVE-INTERVIEW-ANSWERS-ROUND-2.docx`, answer 1 |
| Interest in languages and visual communication | Same companion, answer 2 |
| Interfaces, icon systems, motion and developer collaboration | Same companion, answer 1 |
| Product, brand and trust connected in identity work | Same companion, answers 1 and 3 |
| Agency, in-house and independent work | Same companion, answer 1 |

These are paraphrases of preserved interview substance, not quotations from a certified transcript. No employer dates, role progression, current employment or continuing product-success claims have been inferred. The portfolio sources and existing presentation copy do not approve their own facts.

## Reading visibility correction

The full-viewport editorial focus fade starts at 32% and ends at 8% of viewport height. The recovered mobile method reading window occupies 6–28%. These two treatments conflicted: text was already fading before it could occupy the clear reading area.

The V2 non-editor reading window now owns visibility alone. Its existing mask still gives entry and exit their soft edges; prose, disciplines and career rows remain opaque inside the clear area. Full-frame editor/legacy behavior and emphasis are unchanged. The world canvas is not masked or altered.

The new browser audit checks each real rendered line, including wrapped discipline text, at 0.05 WU intervals. It requires a complete line inside the clear window at at least 95% effective opacity. Before the correction, the mobile method had **0/23** fully readable lines; its best opacity inside the clear area was only **0.50–0.71**. The saved diagnostic is `output/playwright/about-narrative-editorial-20260830/before-reading-opacity.json`.

## Career fact gate

No answer confirming these rows has been received in this pass. They remain proposed values, not canonical page content:

| Proposed row | Unresolved |
| --- | --- |
| Dennerlein GmbH · 2014–2017 · Art Director | Public spelling and row approval |
| Yoti · 2017–2019 · Senior Product Designer | Dates conflict with a longer duration stated in Portfolio v1 |
| Hugo & Cat · 2020–2024 · Senior Designer → Associate Design Director | The source arrow has the opposite direction; exact progression needs confirmation |
| MRM (McCann) · 2024–present · Associate Design Director | “Present” is from a 2025 CV and cannot establish current status |

The single confirmation question was sent while the safe editorial work continued. Do not report the original career-list requirement as complete.

When confirmed, perform one atomic substitution: retain the concrete career-turn prose, remove only its temporary setting sentence, rename that module from `background` to `career-turns`, and insert `career-sequence` immediately after `practice`. This preserves the existing guard against a generic summary coexisting with formal rows. Update the career test's canonical assertion and strip real rows from fictional fixtures before inserting their test data. Do not remove the personal story when removing the temporary generic career summary.

## Filmmaker contributions

- Opening/arc: separated the missing personal story from already completed titles; recommended three early prose reveals and no new timed field.
- Voice/career: traced the biography to the supplied interviews; rejected guessed chronology, current-status claims and an overstated causal lesson about developers.
- Reading/motion integration: confirmed the existing component placement rules, found the incompatible opacity treatment, and reviewed real-line browser coverage.

## Files changed in this pass

- `react-app/app/public/config/contents-about.json`: personal prose and early career context; later repetition removed.
- `react-app/app/src/routes/about-narrative-lab/about-narrative-lab.css`: V2 reading-window opacity ownership.
- `scripts/check-about-narrative-copy-variants.mjs`: updated content, order and preservation assertions.
- `scripts/check-about-narrative-reading-stage.mjs`: full-line geometry and single-opacity-owner regression checks.
- This audit note; temporary browser evidence and capture script in the gitignored output folder.

## Verification and boundaries

- `npm run check:site` passed after the final copy and CSS edits, including lint, config parity and production build.
- 49 focused copy, career, Story Stack, reading-stage and journey-map tests passed.
- All nine browser scenarios passed, with every audited line reachable inside the clear reading area at full opacity and no horizontal overflow or browser errors. Evidence is recorded under `output/playwright/about-narrative-editorial-20260830/`. Each scenario uses the normal production build at port 8013 with the explicit About preview flag, not injected candidate content.
- The 14 field IDs, all field timing/flow settings, globals and all non-text tracks are byte-for-byte equivalent as parsed JSON to the start of this pass. Only two editorial fields changed.
- Source, camera-track and surfel SHA-256 values remain identical to the recovered scene: `aa2e2bdf…`, `b1ef1ba8…`, `95f81514…`.
- No commit, publication or deployment. Production retains its current launch gate.
- Existing unrelated worktree edits remain untouched. Old editorial-refinement tests refer to retired scene/copy contracts and are not part of the passing current gate.

| Browser | Viewport | Theme / motion | Readable lines |
| --- | --- | --- | --- |
| Chrome | 1440 × 1000 | Light / normal | 60/60 |
| Chrome | 390 × 844 | Light / normal | 75/75 |
| WebKit | 1440 × 1000 | Light / normal | 60/60 |
| WebKit | 1440 × 1000 | Dark / normal | 60/60 |
| WebKit | 390 × 844 | Light / normal | 77/77 |
| WebKit | 390 × 844 | Dark / normal | 77/77 |
| WebKit | 390 × 844 | Light / reduced motion | 77/77 |
| WebKit | 320 × 740 | Light / normal | 95/95 |
| WebKit | 844 × 390 | Light / normal | 59/59 |

The personal-story contact sheets were visually inspected on desktop and mobile in WebKit, including both themes, and on mobile in Chrome. The 320px and landscape cases passed the automated full-line checks; their whole paragraphs do not fit inside the reading window at once, so no full-paragraph screenshots were selected for those cases. These are browser viewport tests, not physical-device tests.

Reproduce the focused verification:

```bash
npm run check:site
node --test scripts/check-about-narrative-copy-variants.mjs scripts/check-about-career-sequence.mjs scripts/check-about-narrative-story-layout.mjs scripts/check-about-narrative-reading-stage.mjs scripts/check-about-narrative-journey-map.mjs
ABS_BROWSER=webkit ABS_BASE_URL=http://localhost:8013 node output/playwright/about-narrative-editorial-20260830/audit-reading.mjs mobile light
```

The browser script records forward line reachability and reverse DOM persistence. It does not prove physical-phone performance, full reverse line reachability or a new 60 FPS target.
