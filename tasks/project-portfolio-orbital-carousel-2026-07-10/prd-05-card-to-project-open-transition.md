# PRD 05: Card-To-Project Open Transition

## 1. Overview

Opening a project should feel like the active card is brought closer and becomes the project hero. The card image is initially a crop; the opened project reveals the full image extent inside the existing project drawer, with the title scaling into the hero treatment.

## 2. Goals

- Build on the existing card open ghost and drawer infrastructure.
- Animate from the active card rectangle to the full project drawer hero.
- Reveal the uncropped/full project image in the open view.
- Make the title feel inherited from the card and then become the larger hero title.
- Keep Safari compatibility and reduced-motion behavior.
- Use a transform-based FLIP-style handoff rather than animating layout properties in the hot transition.

## 3. User Stories

### US-001: Card Expands Into Project Hero

As a visitor, when I click the centered project card, it expands into the full project view rather than simply opening a separate overlay.

Acceptance criteria:

- [ ] Only the active centered card can trigger the full open.
- [ ] The card clone/ghost begins at the clicked card rect.
- [ ] The ghost animates toward the drawer/hero rect.
- [ ] The transition uses one-time origin/target rect reads before animation, then transform/opacity/clip writes.
- [ ] The hot animation does not animate `left`, `top`, `width`, or `height`.
- [ ] The selected card is hidden or visually handed off during the transition.
- [ ] Verify in browser using dev-browser skill.

### US-002: Cropped Thumbnail Reveals Full Image

As a visitor, I understand that the card thumbnail was a crop of the full project image.

Acceptance criteria:

- [ ] Card image uses a controlled crop.
- [ ] Open hero uses the wider/full image extent.
- [ ] Image crop interpolates or crossfades so the viewer understands the thumbnail was a crop of the full image.
- [ ] The transition does not reveal a stretched or distorted image.
- [ ] The open hero can use existing project image fallback.

### US-003: Title Becomes Hero Title

As a visitor, the project title feels continuous from card to open project.

Acceptance criteria:

- [ ] Card client/title start in the card top overlay.
- [ ] Open hero title is larger and positioned as the project hero title.
- [ ] Client/title handoff has an explicit choreography: hold, scale/reposition, then reveal settled hero text.
- [ ] Timing does not leave the hero blank during the handoff.
- [ ] Reduced motion still shows title immediately enough to orient the user.

### US-004: Close And Accessibility

As a keyboard or screen-reader user, opening and closing still works predictably.

Acceptance criteria:

- [ ] Focus moves to the close button or first useful drawer control after open.
- [ ] Escape closes the project.
- [ ] Returning focus restores the card.
- [ ] Background deck is inert while the drawer is open.
- [ ] Verify in browser using dev-browser skill.

## 4. Functional Requirements

- FR-1: Reuse `PortfolioProjectDrawer` and `#portfolio-sheet-host`.
- FR-2: Extend `startProjectOpenGhost` or equivalent rather than introducing a second overlay system.
- FR-3: Use WAAPI/CSS transform/clip/opacity animations compatible with Safari.
- FR-4: Do not require the View Transitions API.
- FR-5: If View Transitions are used as progressive enhancement later, provide a fallback path.
- FR-6: Respect `prefers-reduced-motion`.
- FR-7: Keep drawer native scroll behavior.
- FR-8: Preserve current close button and project detail content.
- FR-9: Keep the bottom dock/buttons visible while the project is open; the project detail surface must open inside the portfolio window and must not cover the dock.
- FR-10: Neighboring cards should fade/hold out of the way during open so the selected card remains the visual source of truth.
- FR-11: Card border radius should interpolate toward the drawer/hero radius without a visible corner pop.
- FR-12: Reduced motion must skip the decorative ghost expansion and reveal the drawer/title within a short direct timing cap.

## 4.1 Transition Choreography Target

1. Press/release: active card depresses subtly; inactive cards do not open.
2. Source lock: active card is visually captured; neighboring cards quiet/fade enough to avoid competing.
3. FLIP handoff: ghost transforms from card rect to hero/drawer rect using transform, opacity, clip/path, and border-radius interpolation.
4. Image reveal: thumbnail crop gives way to the fuller hero image extent.
5. Title handoff: card client/title holds briefly, scales/repositions or crossfades into the open hero title.
6. Settled drawer: close button, native drawer scroll, and content become fully interactive inside the window while the bottom dock remains visible.

## 5. Non-Goals

- No rewrite of project detail content layout beyond hero handoff requirements.
- No modal host relocation.
- No change to portfolio gating.
- No full-screen project overlay that covers the bottom dock.

## 6. Technical Considerations

- Current open ghost code clones the card and animates layout properties. This PRD requires replacing that hot path with a FLIP-style transform animation.
- One-time layout reads are acceptable before the animation starts and after it settles.
- Current drawer sync path: `syncProjectHero`, `projectDrawerView.syncProject`, `projectDrawerView.reveal`.
- Current open timings live in `runtime.motion`.

## 7. Validation

```bash
npm run build
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-drawer
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-drawer:pointer
```

Manual/browser checks:

- Open with mouse.
- Open with keyboard.
- Close with X.
- Close with Escape.
- Reopen a different project.
- Confirm bottom dock remains visible and clickable while project detail is open.
- Reduced motion.
- WebKit/Safari.

## 8. Success Metrics

- The open transition reads as a card becoming the hero, not as an unrelated overlay fade.
- No focus, stacking, dock visibility, or scroll regressions.

## 9. Open Questions

- Decision: use transform-based WAAPI/CSS FLIP handoff and keep View Transitions out of the first implementation for Safari reliability.
