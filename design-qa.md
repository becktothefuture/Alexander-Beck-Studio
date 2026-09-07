# Design QA — Home Effect Button Optical Alignment and Physical Press

## Comparison target

- Source visual truth: `/workspace/scratch/home-effect-optical-rest-1363x936.png`, the previously accepted live desktop control, plus the user's explicit requirement that press preserve the raised glass edge direction.
- Browser-rendered implementation: `/workspace/scratch/home-effect-final-f-rest-1363x936.png`.
- Full-view comparison: `/workspace/scratch/home-effect-source-vs-final.png`.
- Focused control comparison: `/workspace/scratch/home-effect-focused-comparison.png`.
- Live implementation: `https://www.beck.fyi/?verify=e4dda4014` using `main.css?v=effect-contact-20260907f`.

## Normalization and state

- Source and implementation captures: `1363 × 936` pixels at a `1363 × 936` CSS viewport and `1×` density.
- The full-view comparison places both equal-size captures side by side without rescaling.
- The focused comparison uses the same `240 × 120` crop around the Home effect control from each capture, then scales both equally for inspection.
- State: Home, light theme, rested control for visual comparison; activation and advancing states checked separately on the live control.

## Findings

- No actionable P0, P1, or P2 differences remain.
- The focused comparison confirms that the label is optically centred without changing the accepted capsule geometry, blur, padding, or edge lighting.
- The final press treatment preserves the resting fill and both inset-edge directions. It moves the complete capsule and label down by `1px` and changes label ink from `58%` to `82%`, so it reads as pressure into the page rather than the button caving into itself.

## Fidelity surfaces

| Surface | Result | Evidence |
| --- | --- | --- |
| Fonts and typography | Passed | The label remains 10.5px, weight 500, `0.09em` tracked Geist. Its line box centre is `0.5px` above the 36px capsule centre, matching the intended uppercase optical correction. |
| Spacing and layout rhythm | Passed | The live capsule remains `136.39 × 36px` with 20px inline padding and a 44px effective target. The full-view comparison shows unchanged placement and footer rhythm. |
| Colors and visual tokens | Passed | Rest and press use the same `rgba(247, 249, 244, 0.64)` fill and the same paired inset shadows. Press changes only position and label contrast; no shadow or highlight inversion remains. |
| Image quality and asset fidelity | Passed | No image or icon assets changed. The live simulation remains the production renderer; randomized particle placement is expected. |
| Copy and content | Passed | The visible label remains `CHANGE EFFECT`; the accessible name and polite status retain the current-effect context. |

## Responsive and interaction evidence

- The live production stylesheet is `main.css?v=effect-contact-20260907f`.
- Activation set `data-advancing="true"`, disabled the control during the transaction, and changed the accessible label to `Changing visual effect. Current effect: …`.
- Live CSS inspection confirmed that both `:active` and the advancing state keep the resting fill and `--abs-soft-control-shadow-rest`, use `translate: 0 1px`, and strengthen the label to the dedicated 82% pressed ink.
- The focus selector explicitly excludes the advancing state, so keyboard focus cannot mask the press acknowledgement.
- Browser console check on the successful final tab found no site-origin errors; only the cloud browser extension's own metadata messages were present.

## Comparison history

1. P2: the first stronger press reversed the inset lighting and depressed the label independently, making the capsule appear to cave into itself. Fixed by restoring the resting fill and inset shadows, removing the label-only dip, and reducing pressed ink from 92% to 82%.
2. P2: focus-visible could override the advancing treatment in keyboard-driven checks. Fixed by excluding `data-advancing="true"` from the focus selector.
3. Post-fix evidence: `home-effect-source-vs-final.png` and `home-effect-focused-comparison.png` confirm no resting-state regression; the live `f` stylesheet confirms physically consistent press rules.

## Implementation checklist

- [x] Keep the half-pixel upward optical label correction.
- [x] Preserve the resting glass fill, blur, highlight, and shadow direction during press.
- [x] Move the complete control down by 1px instead of inverting its material.
- [x] Strengthen the label modestly without an independent vertical dip.
- [x] Preserve the acknowledgement through the advancing transaction and keyboard focus.
- [x] Verify the final production stylesheet, primary click interaction, visual comparison, and page console.

final result: passed

---

# Design QA — Home Circular Simulation Switcher

## Comparison target

- Source visual truth: `/var/folders/rw/9jhrlh_10712yxzp7d29g8440000gn/T/codex-clipboard-83e343fd-0b42-4e5c-9b58-d413c90975f9.png`.
- Desktop implementation: `output/design-qa/simulation-switcher/desktop-1440x1024-settled.png`.
- Mobile implementation: `output/design-qa/simulation-switcher/mobile-390x844-settled.png`.
- Full comparison: `output/design-qa/simulation-switcher/source-vs-implementation.png`.
- Focused control comparison: `output/design-qa/simulation-switcher/switcher-focused-comparison.png`.
- Local implementation: `http://localhost:8012/index.html`.

## Normalization and state

- Source board pixels: `1600 × 1067`; it contains one desktop and one mobile composition.
- Desktop CSS viewport: `1440 × 1024`; captured pixels: `1296 × 922`; browser scale: `0.9`.
- Mobile CSS viewport: `390 × 844`; captured pixels: `351 × 760`; browser scale: `0.9`.
- The comparison sheet preserves the complete source board, scales the desktop capture to the source desktop region, and places the mobile capture at its native `351px` width beside it.
- State: Home, dark theme, settled switcher, sound off. The simulations are live and randomized, so ball positions differ while the authored shell and control geometry remain comparable.

## Findings

- No actionable P0, P1, or P2 differences remain.
- [P3] The implementation uses the current live simulation labels and randomized particle arrangements rather than the mockup's fixed `Cohesion` frame. This is expected product behavior and does not change the selected composition.

## Fidelity surfaces

| Surface | Result | Evidence |
| --- | --- | --- |
| Fonts and typography | Passed | The switcher keeps the site's Geist UI typography at `11–12px`; the resting label is reduced to `68%` ink and returns to full contrast for hover, focus, and advancing states. |
| Spacing and layout rhythm | Passed | The control is centred, footer-anchored, and separated from the caption by about `50–56px` of visible space. Desktop measures about `125 × 44px`; mobile measures about `118 × 44px`. The visible capsule is `34px` high while the hit target remains `44px`. |
| Colors and tokens | Passed | The resting surface uses the in-window material at `68%` desktop and `70%` coarse-pointer opacity. It remains subordinate to the title and becomes stronger only on interaction. |
| Image and icon fidelity | Passed | The Lucide RefreshCw icon matches the selected refresh metaphor, stays at `13px`, and rotates exactly `180deg`. Live simulation imagery remains the production renderer rather than a copied raster. |
| Copy and content | Passed | The current simulation name remains visible. The accessible name states the current simulation and describes the next-simulation action without dialog semantics. |

## Responsive and interaction evidence

- The complete 13-item Daily Simulation order advanced correctly and wrapped back to the starting item.
- At `80ms`, the outgoing label was travelling upward, the incoming label was travelling from below, and the icon measured about `173.6deg` on its way to the authored `180deg` endpoint. All three use the same `520ms` easing contract.
- Three consecutive full reloads selected `repel-room`, `kaleidoscope-rift`, and `water`; each differed from the immediately previous simulation and remained inside the Daily catalog.
- The switcher never mounted a dialog, backdrop, or chooser row. It disabled itself during the simulation transaction and settled after each handoff.
- Browser console error check: `0` errors.
- Primary interaction tested: click/press advance, complete circular wrap, disabled busy state, animated label/icon handoff, and reload randomization.

## Comparison history

1. P2: the first mobile pass kept full-strength label ink and only about `30px` between the visible capsule and caption. Fixed by reducing resting ink to `68%` and using a responsive footer gap that reaches `40px` on mobile. First-pass evidence: `output/design-qa/simulation-switcher/mobile-390x844-cdp-v1.png`.
2. Post-fix comparison: the final desktop/mobile control hierarchy and caption relationship match the selected mockup. Evidence: `output/design-qa/simulation-switcher/source-vs-implementation.png` and `output/design-qa/simulation-switcher/switcher-focused-comparison.png`.

## Implementation checklist

- [x] Remove the simulation chooser overlay and its trigger semantics.
- [x] Advance one simulation in circular catalog order.
- [x] Keep random simulation changes on full reload.
- [x] Preserve the existing simulation out/in transaction at `75%` of its previous durations.
- [x] Keep the approved `180deg` icon and connected vertical label motion.
- [x] Anchor the quieter capsule above the footer caption on desktop and mobile.
- [x] Preserve a `44px` interaction target, keyboard access, focus visibility, reduced motion, sound, and haptics.
- [x] Update affected audits and documentation.
- [x] Inspect full-view and focused source/implementation comparisons.

final result: passed

---

# Design QA — Responsive Global Utility Rail

## Comparison target

- Source visual truth: `/var/folders/rw/9jhrlh_10712yxzp7d29g8440000gn/T/codex-clipboard-1462c675-3821-4e88-9c78-97c4162bfc11.png`, with the later user override to keep desktop unchanged and make mobile smaller, farther outward, and lower in the bottom half.
- Desktop implementation: `output/design-qa/utility-rail/desktop-1448x1086.png`
- Mobile implementation: `output/design-qa/utility-rail/mobile-390x844.png`
- Full desktop comparison: `output/design-qa/utility-rail/source-vs-desktop.png`
- Focused rail comparison: `output/design-qa/utility-rail/source-vs-desktop-rail-detail.png`
- Mobile before/after comparison: `output/design-qa/utility-rail/mobile-before-vs-after.png`
- Local implementation: `http://localhost:8012/index.html`

## Normalization and state

- Source pixels: `1448 × 1086`.
- Desktop CSS viewport: `1448 × 1085`; browser density: `0.9`. The active `1304 × 977` backing-surface region was cropped and resampled to `1448 × 1086`.
- Mobile CSS viewport: `390 × 844`; browser density: `0.9`. The active `351 × 760` backing-surface region was cropped and resampled to `390 × 844`.
- State: Home, dark theme, sound off, resting controls. The simulation is live, so the particle arrangement differs between captures; the shell fixtures remain directly comparable.
- Authored responsive values: desktop `32px` button size and `0px` horizontal offset; mobile `25px` button size, `-11px` outward offset, and `78svh` vertical centre.

## Findings

- No actionable P0, P1, or P2 differences remain.
- [P3] The production icons are quieter than the generated reference. This is intentional: the smaller Lucide outlines preserve the established navigation icon language and make the rail subordinate to the five-tab menu.
- [P3] The mobile capsule reaches about `1px` beyond the CSS viewport edge. This is the requested outward placement; the capsule silhouette and both icons remain legible, and the position is adjustable in the panel.

## Fidelity surfaces

| Surface | Result | Evidence |
| --- | --- | --- |
| Fonts and typography | Passed | The rail contains no visible copy. Accessible names change with state for theme and sound. |
| Spacing and layout rhythm | Passed | Desktop remains centred at `50svh` and measures about `44.2 × 92.2px`. Mobile measures about `35.2 × 74.2px`, centres at `658.7px` (`78svh`), and leaves about `76.2px` before the Button Bar. |
| Colors and tokens | Passed | The capsule keeps the stable dark outer-shell gradient, quiet neutral resting ink, white interaction ink, and restrained separator in both themes. |
| Image and icon fidelity | Passed | Theme and sound use Lucide outline assets. The focused comparison confirms the selected vertical-capsule silhouette and intentionally reduced production scale. |
| Copy and content | Passed | The five icon-and-label route tabs remain unchanged. Theme and sound are the only Utility Rail actions. |

## Responsive and interaction evidence

- Home, Work, About, Lab, and Contact each mount exactly one Utility Rail, two utility controls, and five route tabs at `390 × 844`.
- Mobile geometry is identical across all five routes: about `35.2 × 74.2px`, `78svh` centre, and a `76.2px` gap before the Button Bar.
- Each `25px` mobile visual button has a non-overlapping `44 × 44px` interaction region.
- The mobile theme control changes the rendered theme and its accessible label after the panel close transition settles; the final review state was restored to dark.
- The config panel exposes one top-level **Utility Rail** category with separate **Desktop** and **Mobile** groups. The mobile group contains `Button Size` (`22–44px`), `Horizontal Position` (`-160–160px`), and `Vertical Position` (`55–90%`).
- Live apply was checked by changing the mobile vertical value from `78` to `79` and back; the runtime CSS token changed from `78svh` to `79svh` and restored to `78svh`.
- Browser console error check: no errors.
- `npm run check:site` passed, including registry characterization, authored-config parity, lint, and production build.

## Comparison history

1. P2: the prior mobile rail retained desktop-scale `44px` buttons and sat at mid-height, which made it compete with the title. Fixed by adding an independent mobile endpoint and reducing the visible buttons to `25px`.
2. P2: the prior mobile rail remained too far inward and too high. Fixed with an `-11px` outward offset and `78svh` centre. Post-fix evidence: `output/design-qa/utility-rail/mobile-before-vs-after.png`.
3. P2 accessibility follow-up: reducing the visible buttons also reduced their hit regions. Fixed with asymmetric invisible expansion to `44 × 44px`; the inner edges meet but do not overlap.

## Implementation checklist

- [x] Desktop geometry remains independently controlled and visually unchanged from the accepted live value.
- [x] Mobile uses independent size, horizontal position, and vertical position.
- [x] Mobile rail is smaller, farther outward, and lower in the bottom half.
- [x] Mobile interaction regions remain `44 × 44px` without overlap.
- [x] One Utility Rail fixture persists across all five routes.
- [x] Panel live apply, canonical config, flattening, reload, and build parity pass.
- [x] Desktop and mobile captures were inspected together with source and before-state evidence.

final result: passed
