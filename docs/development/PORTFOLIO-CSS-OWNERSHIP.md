# Portfolio CSS ownership

## Status

M07 and the scoped M16 ownership migration are accepted. M16 moved the eight Portfolio hero/title blocks and six locked-overlay blocks identified by the post-M07 inventory from `main.css` to `portfolio.css`. Shared headline primitives, shared window-overlay primitives, simulation-focus states, and the Button Bar remain in `main.css`.

The move preserved declaration text and conditional ancestry. Rules that already existed in `portfolio.css` remain later in source order, so the effective cascade is unchanged. The frozen computed-style contract stayed byte-for-byte identical after the move.

## Source order and ownership rule

Every production entry loads `css/main.css` before `css/portfolio.css`. The browser matrix confirms this order in every tested state. Therefore, a later Portfolio declaration wins when origin, importance, layer, and specificity are otherwise equal.

The single-owner rule is:

- `main.css` owns the stable shell, physical window and frame, Button Bar, common route chrome, and shared controls.
- `portfolio.css` owns the Portfolio gate, intro and title treatment, deck, cards, project sheet/drawer, project-detail handoff, and Portfolio entrance/exit states.
- A Portfolio-qualified hero or locked-overlay rule belongs to `portfolio.css`.
- A shared primitive used by Portfolio remains owned by `main.css`. Portfolio can add a qualified modifier, but it must not copy the primitive contract.

## Reproducible inventory

Run:

```bash
npm run check:portfolio-css-ownership
ABS_DEV_URL=http://127.0.0.1:8032 ABS_BROWSER=all npm run audit:portfolio-css-ownership
```

The parser fails closed for malformed selectors, strings, declarations, blocks/comments, and unsupported statement or block at-rules. It implements Selectors Level 4 specificity for `:is()`, `:not()`, `:has()`, `:where()`, `:nth-child()` and `:nth-last-child()`. Selector-list members share their declaration block's source order. Specificity is recorded as `[IDs, classes/attributes/pseudo-classes, types/pseudo-elements]`.

The overlap detector is deliberately conservative. It records an exact selector match, or a shared subject token with at least one shared property. Some records are collision candidates rather than active overrides (for example, two unrelated `::before` subjects). These candidates stay in the exhaustive inventory so M16 cannot silently miss a cascade risk.

| Measure | Post-M07/M16 count |
| --- | ---: |
| `main.css` selector rules | 1,590 |
| `portfolio.css` selector rules | 499 |
| Portfolio-relevant `main.css` rules | 459 |
| Conservative overlap records | 413 |
| Exact-selector overlaps | 16 |
| Conditional overlap records | 93 |
| Intentional current overrides | 44 |
| Shell/shared collision candidates | 369 |
| Planned `portfolio.css` owner records | 44 |
| Planned `main.css` owner records | 369 |

The fail-closed fixture signature is:

```text
ce21d53d53ca46294e179745bbb3edc11145a2c06c3b869969465fb0881572ee
```

The signature includes ordered conditional contexts for both sides of every record. Of the 413 overlaps, 93 have media, supports, container, layer, or nested condition ancestry. The complete record set is generated at `output/playwright/portfolio-css-ownership/overlap-inventory.json`. It records both file/line locations, selectors, conditional contexts, declaration-block source order, specificity, shared properties, current classification, and planned owner.

Portfolio ownership requires a positive Portfolio target. A selector that only mentions Portfolio inside `:not()`, such as `[role="button"]:not(.portfolio-project-card)`, remains `main.css`-owned. This semantic rule removes ten impossible move records from the earlier provisional classification.

## Ownership exceptions and M16 result

| Current overlap family | Current exception | Specificity/source-order consequence | Planned owner and M16 batch |
| --- | --- | --- | --- |
| Portfolio route top bar and `.portfolio-topnav` | Portfolio-qualified layout appears in both files. Representative rule: `main.css:1163` and `portfolio.css:664`, both `[0,3,1]`. | Equal specificity means the later Portfolio rule controls any shared declaration. | `portfolio.css`; Batch 1, move Portfolio-only route-top-bar rules and remove exact duplicates. Keep the generic route-top-bar primitive in `main.css`. |
| Portfolio hero/title selectors | Complete. Eight Portfolio-only blocks moved from `main.css`; shared `.hero-title__line` and route-entrance primitives stayed in `main.css`. | Existing later Portfolio rules still control the same properties and computed values. | `portfolio.css`; no approved hero/title block remains in `main.css`. |
| Locked-page overlay and access gate | Complete. Six locked-state blocks moved from mixed or Portfolio-only rules in `main.css`. | Shared overlay primitives and simulation-focus states stay in `main.css`; Portfolio locked/gate states refine them from `portfolio.css`. | Split ownership; no approved locked Portfolio overlay block remains in `main.css`. |
| `.abs-icon-btn` with gate close and drawer back | The base control begins at `main.css:2954`; gate/drawer-qualified variants begin at `portfolio.css:595` and `portfolio.css:1670`. | Qualified `[0,2,0]` to `[0,3,0]` variants intentionally override the `[0,1,0]` primitive. | Split ownership; Batch 4. Base interaction, focus, and sizing contract stay in `main.css`; only Portfolio placement/variant rules stay in `portfolio.css`. |
| `#portfolio-sheet-host`, drawer, and sheet geometry | The shell provides the host/layer boundary; Portfolio owns the sheet and drawer geometry. There is no direct host-selector collision in the conservative detector. | Runtime geometry must still stop before visible Button Bar controls. | Split ownership; Batch 5. Host/layer contract stays in `main.css`; drawer, sheet, handoff, and responsive geometry stay in `portfolio.css`. |
| Button Bar and bottom band | Button Bar selectors are shell-owned. Conservative records that pair Button Bar pseudo-elements with Portfolio pseudo-elements are candidate matches, not authority for Portfolio to style the bar. | The Button Bar remains fixed and outside route transition ownership. | `main.css`; Batch 6 is audit-only. Remove any accidental Portfolio ownership; do not move shell rules into `portfolio.css`. |
| Deck, card, drawer, and handoff exact duplicates | Exact selectors in both files are current intentional overrides when Portfolio-qualified. | Same-selector declarations depend directly on `portfolio.css` loading last. | `portfolio.css`; Batch 7, consolidate after Batches 1–6 and delete superseded declarations from `main.css`. |
| Media/support-condition variants | Equivalent subjects can appear under different conditions. | A move that drops a condition changes the cascade even if the declaration text is unchanged. | Follow the owning family above; Batch 8 verifies every condition, source-order relationship, and reduced-motion/responsive variant before deletion. |

The other families remain documented ownership boundaries, not authorization for a wider migration. The accepted scope has zero exact same-context shared-property conflicts and zero unapproved Portfolio-only blocks in `main.css` for the two moved families.

## Browser contract

The audit checks one unique node and computed styles for the Portfolio title, deck, active card, sheet host, drawer, access gate, Button Bar, and Button Bar primary controls. High-risk background, color, radius, typography, position, and z-index values include ordered matched-rule provenance: stylesheet, selector, declaration value, importance, ancestor depth, cascade order, and conditional ancestry. The drawer must finish the shared handoff and all finite animations, then retain geometry and key styles across two animation frames.

| Browser | Viewports | Themes | States | Result |
| --- | --- | --- | --- | --- |
| Chromium | 1440×900; 390×844 | light; dark | deck; gate; drawer | Pass |
| WebKit | 1440×900; 390×844 | light; dark | deck; gate; drawer | Pass |

All eight matrix states kept Instrument Serif on the Portfolio entry title and a fixed Button Bar at the viewport bottom. Desktop sheets had no outer-band intrusion and kept a 12.5 px gap above the visible primary controls. Mobile sheets seated 3.203125 px into the transparent outer Button Bar band but kept a 6.796875 px gap above the visible controls. This seating is a recorded exception, not permission to increase the overlap. The assertion permits at most 4 px in the transparent band and permits no overlap with primary controls.

## Screenshot evidence

On a successful run, the audit creates 24 full-page screenshots: deck, gate, and drawer for each browser, viewport, and theme combination. Each run writes every report, manifest, inventory, and image to a unique temporary directory. It compares the complete computed/provenance contract before promoting evidence. Explicit fixture updates replace the evidence directory and fixture as one rollback-capable transaction. A failed validation or replacement removes temporary output and preserves the prior evidence and fixture byte-for-byte.

- Manifest: `output/playwright/portfolio-css-ownership/screenshot-manifest.json`
- Computed-style report: `output/playwright/portfolio-css-ownership/report.json`
- Exhaustive cascade inventory: `output/playwright/portfolio-css-ownership/overlap-inventory.json`
- Frozen computed-style/provenance fixture: `scripts/fixtures/portfolio-css-computed.json`
- Images: `output/playwright/portfolio-css-ownership/{browser}-{viewport}-{theme}-{state}.png`

Each manifest record includes browser, viewport, theme, state, byte length, and SHA-256 digest. The frozen eight-state computed/provenance signature is `7de7352b7ce1e3c7a7c0a6c9dc9a65eba19fbf1920c692e85c56f91172219d01`. Normal audit runs compare the full contract and signature before overwriting evidence. Fixture updates require the explicit `ABS_UPDATE_PORTFOLIO_CSS_FIXTURE=1` review mode and the complete browser matrix. Tests prove that computed-value or stylesheet-provenance drift changes the signature, and that failed validation or fixture replacement preserves approved artifacts. The images must still be visually inspected after every M16 migration batch; a green computed-style assertion is not sufficient.

The post-M16 inspection found coherent deck geometry in all eight deck captures. Gate foreground text and code cells stay sharp in Chromium and WebKit. WebKit retains its native backdrop composition, but it no longer blurs the foreground gate content.

The stale pre-hardening drawer images have been replaced. The proof now requires the active card to remain contained by `.portfolio-deck-stage`, then evaluates effective paint suppression through that ancestor boundary. It accepts a visible-style child only while its containing stage suppresses paint, and fails if the card escapes the stage or neither element suppresses paint. All eight current drawer captures show the unobstructed authoritative-open project sheet with visible title and back control; none shows the deck cards above it.

## Acceptance evidence

The post-M07/M16 acceptance run completed these checks:

1. The static parser and ownership contract passed all 14 tests.
2. The production build passed.
3. Fixture-update mode passed all eight Chromium/WebKit states and wrote 24 captures.
4. Normal comparison mode passed the same eight states and 24 captures.
5. All captures were inspected for title, gate, drawer, frame, and Button Bar geometry.
6. The computed-style fixture did not change after the ownership-only move.
