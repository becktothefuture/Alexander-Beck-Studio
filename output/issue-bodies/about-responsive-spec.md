## Problem Statement

The About Me narrative does not currently maintain a reliable presentation across the intended viewport range. Short desktop windows and phone-landscape windows remain interactive even when the physical studio window is too shallow for the composition, which causes overlapping titles, world content, editorial copy, and the Discipline reveal. The shared viewport cover already provides the right interruption pattern, focus handling, and recovery behavior, but its support policy only detects extreme aspect ratios.

Within otherwise supported viewports, the Discipline reveal is also unstable. Its projected labels follow the Camera during the editorial transition, so the final rows can clip or leave the frame while they are still opaque. The narrowest supported portrait phone has an additional small bottom-edge crop at the settled reading moment. The desktop two-column composition is sound and should remain the visual reference.

The About Sequence also contains two perceptible empty intervals. A short gap appears between the Discipline reveal and its editorial block. A much longer interval appears after the last visible Discipline editorial module and before the return of the Point Field and the next Title. These intervals break the intended continuous sense of authored motion and make the scroll feel unresponsive.

Finally, very large desktop viewports have more unused space than the established composition requires. The experience remains functional, but its editorial and Discipline material feels less deliberate than it does at the standard desktop reference size.

## Solution

Define one shared supported-viewport policy for the complete site shell. Keep ordinary desktop, tablet, and portrait-phone viewports available. Use the existing modal viewport cover for phone landscape, desktop or landscape viewports that are too short to contain the studio window, and the existing extreme aspect-ratio cases. Preserve its current accessible dialog behavior, move focus into it, make the application inert while it is active, and restore the current route cleanly when the viewport becomes supported.

Within the supported envelope, retain the current two-column Discipline arrangement on desktop and the current compact responsive arrangements on tablet and portrait mobile. Hold the settled Camera composition until the labels have been read, then make the labels and transformed points yield before the Camera can project them outside the visible studio window. Tighten compact typography and vertical rhythm only as much as needed to keep all six labels readable at the narrow portrait boundary.

Retune the About Sequence so every scroll interval contains meaningful text or visible material motion. Crossfade the Discipline world into its editorial block without an empty frame. Bring the Point Field return and the later Title group forward so they begin as the final Discipline editorial material clears, while preserving short authored breaths between individual Titles. Keep transitions slightly overlapping rather than creating hard cuts.

Apply a restrained large-desktop density adjustment to the relevant About text and Discipline material. Do not alter the physical shell, Button Bar, wall, frame, route-entry typography contract, or the authored copy.

The highest-level acceptance seam is the real shared-shell browser experience: play the complete About Sequence at canonical Story WU samples across a representative viewport matrix, and verify the shared viewport cover on every route. Lower-level configuration and runtime checks support this seam but do not replace visual browser evidence.

## User Stories

1. As a visitor using a portrait phone, I can open and scroll the full About experience without being told to rotate into landscape.
2. As a visitor using a phone in landscape, I see the shared viewport cover instead of a broken route composition.
3. As a visitor using a short desktop window, I see the shared viewport cover before route content can overlap or clip.
4. As a visitor using an ordinary laptop viewport, I can use every route without an unnecessary viewport cover.
5. As a visitor using a tablet in portrait or standard landscape, I can use the site when the studio window has enough height.
6. As a visitor using an ultrawide monitor with adequate height, I can still use the site.
7. As a visitor using an extremely wide or tall viewport, I continue to see the existing protective cover.
8. As a keyboard user, focus moves to the cover heading when the cover opens.
9. As a keyboard user, I cannot tab into covered route content.
10. As a screen-reader user, covered route content is hidden while the modal cover is active.
11. As a visitor who resizes or rotates into a supported viewport, the cover closes and the current route becomes usable without a reload.
12. As a visitor on Home, Work, About Me, Lab, or Contact, I receive the same viewport support policy and cover behavior.
13. As a visitor watching the Discipline reveal on standard desktop, I see the established two-column, three-row composition without regression.
14. As a visitor watching the Discipline reveal on tablet, I can read all six labels without pairwise overlap.
15. As a visitor watching the Discipline reveal on a narrow portrait phone, I can read all six labels without top, side, or bottom clipping.
16. As a visitor watching the Discipline reveal, each label remains associated with its transformed point group.
17. As a visitor leaving the settled Discipline moment, labels fade before Camera movement can carry them outside the studio window.
18. As a visitor leaving the Discipline reveal, I do not see a partially clipped opaque label at the frame edge.
19. As a visitor entering the Discipline editorial block, I see a controlled crossfade instead of an empty frame.
20. As a visitor scrolling through the Discipline editorial block, the pacing remains readable and does not become hurried merely to remove a gap.
21. As a visitor leaving the final Discipline editorial module, I see the Point Field or the next Title begin before the frame becomes empty.
22. As a visitor reading the later Title group, I retain small intentional breaths between individual thoughts.
23. As a visitor, I experience a continuous authored narrative in which text, the Point Field, Worlds, or transitions remain perceptible throughout nearly all progress.
24. As a visitor who scrolls backward, the revised transitions remain reversible and do not pop into a stale state.
25. As a visitor with reduced motion enabled, the same content sequence remains complete and understandable.
26. As a visitor using a large desktop display, the About editorial and Discipline compositions feel intentional rather than undersized.
27. As a visitor using a standard desktop display, the large-screen adjustment does not change the reference composition.
28. As a site editor, I can continue to tune the authored Camera, Visibility, Point Field, Text, Motion, and interaction values through the canonical About configuration.
29. As a maintainer, I have deterministic checks for support-policy boundaries and the authored narrative handoffs.
30. As a maintainer, I have browser screenshots that show the entire Sequence at multiple progress samples rather than only a start and end state.
31. As a reviewer, I can inspect contact sheets for desktop, laptop, tablet, and portrait-mobile reference sizes.
32. As a reviewer, I can inspect explicit cover evidence for phone landscape, short desktop, and extreme aspect-ratio cases.
33. As a reviewer, I can see proof in both Chromium and WebKit for the final supported-viewport and cover matrix.
34. As a maintainer, the changes do not alter the stable outer shell, physical frame, Button Bar, or production publication policy.

## Implementation Decisions

- Use one pure support-policy function as the authority for the shared cover.
- Preserve the current extreme aspect-ratio threshold as a separate protective rule.
- Treat portrait phones as supported regardless of the short-desktop height rule, unless they cross the existing extreme-tall threshold.
- Treat phone landscape as unsupported within a bounded phone or small-tablet width and height envelope.
- Treat desktop and landscape viewports below the minimum usable height as unsupported.
- Classify support modes explicitly so tests can distinguish phone landscape, short viewport, wide, and tall cases even though they share the same visual cover.
- Keep the cover mounted at the shared application level so it applies to every production route.
- Preserve the existing modal semantics, focus transfer, inert application state, and resize recovery.
- Keep the current Discipline anchor model and desktop formation as the visual reference.
- Resolve Discipline departure through Camera timing and opacity continuity, not by adding decorative plates, outlines, helper lines, or route-specific cropping.
- Use compact-profile typography and spacing overrides only where the narrow portrait boundary requires them.
- Retain the existing authored copy, item order, and semantic association between labels and points.
- Retune late Sequence timing as a coordinated group across relevant tracks so Text, Point Field, Visibility, Camera, Motion, and Worlds remain synchronized.
- Keep small Title-to-Title breaths, but remove intervals in which neither text nor material motion is perceptible.
- Apply large-screen polish only above a dedicated wide-and-tall breakpoint.
- Keep generated runtime configuration derived from the canonical authored source.
- Do not change route availability, production publication state, or the current About release gate.

## Testing Decisions

- Unit-test the exact support-policy boundaries, ordinary supported cases, invalid measurements, phone landscape, short desktop, and extreme aspect ratios.
- Browser-test the cover on Home, Work, About Me, Lab, and Contact.
- Browser-test cover focus, modal semantics, application inertness, application hiding, and recovery after resize.
- Sample the full About Sequence by canonical Story WU rather than relying on manual wheel distance alone.
- Check Discipline labels at each reveal beat, at the settled hold, during departure, and at the editorial handoff.
- Assert that all visible Discipline labels remain inside the studio window and do not overlap one another at supported reference viewports.
- Check that unsupported short and landscape-phone viewports show the cover instead of attempting to satisfy About composition assertions.
- Detect inactive narrative runs with a fine-grained progress scan that considers readable text and perceptible canvas activity.
- Capture contact sheets for a large desktop, standard desktop, laptop, tablet, and at least two portrait-phone sizes.
- Capture cover evidence for phone landscape, short desktop, extreme wide, and extreme tall cases.
- Run final route and narrative certification in Chromium and WebKit.
- Run the canonical local site gate and inspect the final diff for unrelated changes.

## Out of Scope

- Rewriting About copy or changing the order of the six disciplines.
- Replacing the Point Field, World, Camera, or scroll architecture.
- Adding a separate navigation system or changing Button Bar behavior.
- Changing wall, frame, shell, theme, cursor, or browser-chrome contracts.
- Making phone landscape a fully composed About layout.
- Redesigning the viewport cover visual language.
- Publishing the About narrative to production.
- Committing, pushing, or deploying the implementation.

## Further Notes

- The current two-column Discipline composition at the standard desktop reference is the baseline to preserve.
- The support policy should be conservative at genuinely unusable heights, but it should not hide ordinary laptop or portrait-phone experiences.
- Empty-frame detection is a presentation-quality gate, not a demand for constant high-intensity motion. Calm visible material and readable crossfades count as active narrative content.
- Existing unrelated working-tree changes must remain intact throughout implementation.
