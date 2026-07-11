# Figma Findings - 2026-07-11

## Access Result

- Requested file: `Alexander Beck Studio - Brand`
- File key: `t5pOoVMjVJ7ZF2JAl5ixhS`
- Requested account: `alxbeck@me.com`
- The Figma connector does not expose the signed-in email in tool output, so the email could not be independently verified from Codex.
- The official `mcp__figma` path still returned the Figma Professional plan View-seat tool-call limit.
- The app Figma connector did access the file and returned metadata, design context, and screenshots.

## Current Figma Nodes

- Page: `259:77` - `New - Jul 2026`
- Active card component: `293:850` - `ABS/Portfolio/Project Card / Active`
- Full closed desktop composition: `304:2504` - `Desktop 1440x900 / Portfolio closed`
- Expansion storyboard: `304:3048` - `preview expansion`
- Desktop open/detail mock: `293:983` - `Desktop 1440x900 / Project open`
- Original requested node `293:910` is not present in the current file metadata. Treat the URL/node as stale or deleted.

## Saved References

- `references/figma-active-card-293-850.png`
- `references/figma-current-closed-304-2504.png`
- `references/figma-current-open-293-983.png`
- `references/figma-preview-expansion-304-3048.png`

## Concrete Measurements From Figma

### Active Card `293:850`

- Size: `316 x 461`
- Radius: `24`
- Media fills the card.
- Gradient overlay: top-only, `221.589px` tall, from `#010813` to transparent.
- Text block: `left 20`, `top 23`, `width 290`, `gap 12`
- Client label: Geist SemiBold, `15px`, `20.531px` line-height, `0.3px` tracking.
- Title: Geist Medium, `29px`, `32px` line-height.
- CTA: bottom centered, `244 x 38`, `bottom 15`, radius `12`; `View` in DM Sans Medium `16px`, `18px` line-height.
- Inner finish: inset top highlight plus bottom black inset shadow.

### Closed Desktop Composition `304:2504`

- Desktop frame: `1440 x 900`
- Browser surround: `#101010`
- Portfolio wall: `x 27`, `y 27`, `width 1386`, `height 795`, radius `65`, fill `#171717`, border `#2b2a27`.
- Title: centered at `top 91`, `width 1097.544`, `height 86`, Geist Medium `35px`, `39px` line-height, color `#f5f1ea`.
- Orbit group: `Frame 2`, `2898 x 845`, positioned centered with `top 134`.
- Active center card in orbit: `316 x 461`, centered in the orbit group.
- Adjacent cards use the same `316 x 461` base card, rotated around the orbit:
  - near left/right: about `-10deg` / `10deg`
  - outer left/right: about `-20deg` / `20deg`
- Repeated dot groups are arranged around a very large circle:
  - repeat asset size around `3524.139`
  - circle instances around `4156-4957px` square
  - rotations visible at about `-13`, `11.5`, `-26`, `-39`, `-52`, `-65deg`
- Bottom dock: `x 27`, `y 822`, `width 1386`, `height 78`; route tabs inside at `y 15`, `height 48`.

### Expansion Storyboard `304:3048`

- Contains three desktop states:
  - `304:2787` - closed carousel composition.
  - `304:2856` - centered card enlarged/lifted.
  - `304:2963` - card expanded to nearly the full wall/window.
- The third state uses the active card instance at `x 27`, `y 27`, `width 1386`, `height 786`, preserving the card as the visual source before project detail content takes over.

### Desktop Open Mock `293:983`

- Keeps bottom dock visible in the mock. This is now the desired product behavior: project detail opens inside the window and does not cover the dock/buttons.
- Drawer surface: `x 116`, `y 72`, `width 1208`, `height 735`, radius `30`, fill `#f5f1ea`.
- Drawer hero image: `x 144`, `y 100`, `width 1152`, `height 250`, radius `22`.
- Open title: `44px`, `48px` line-height, positioned inside hero.
- This frame is useful for hero content hierarchy, but the expansion storyboard is more relevant for the new card-to-hero transition.

## Implementation Implications

- Update the PRD packet to treat `304:2504`, `304:3048`, and `293:850` as the current Figma references instead of stale `293:910`.
- Implement the active card proportions directly from `293:850` before tuning responsive values.
- The dot dial should be modeled as a large circular repeat system, not a flat row.
- The card orbit should use a large offscreen circle with cards positioned/rotated on the circumference.
- The open transition should first expand the selected card to a full-window card state like `304:2963`, then reveal the existing project drawer/detail hierarchy.
- `293:983` should guide the new in-window open-detail behavior: bottom dock stays visible, project detail is clipped/contained by the portfolio window.
