# Scene entrance principle

Canonical rule for deciding what may animate into the site and how those entrances should feel.

**Related:** [`MATERIAL-PRESENCE.md`](MATERIAL-PRESENCE.md), [`TRANSITION-ORCHESTRATION.md`](TRANSITION-ORCHESTRATION.md), [`LAYER-STACKING.md`](LAYER-STACKING.md), [`SITE-STYLEGUIDE.md`](SITE-STYLEGUIDE.md), [`AGENTS.md`](../../AGENTS.md)

## 1. The boundary

**The studio window is the animation stage.** Route-owned content that appears inside the inner window may animate into the scene. The physical window and everything outside it already exist and must feel permanent.

This is a visual boundary, not only a DOM-parent test:

- Inside-window content includes route wall/content, hero content, window-positioned route controls, `#portfolio-sheet-host`, and `#quote-viewport-host`.
- Permanent structure includes the outer frame, exposed frame gap, inner-window aperture/rim, vignette, Button Bar, and other route-stable shell controls.
- Temporary overlays may animate into focus, but dismissing them must reveal the underlying interface as an object that was waiting underneath.

## 2. Motion language

Use the homepage entrance as the reference vocabulary:

- start in final layout geometry;
- resolve from low opacity, slight blur, a small downward offset, and a very small uniform scale;
- use the shared organic easing `cubic-bezier(0.22, 0, 0.16, 1)`;
- establish readable groups in the order `identity → legend/context → action → support`;
- keep route returns and overlay closes shorter and simpler than first entrances.

The homepage direct-load values are the upper bound for depth emergence: about `7px` translation, `4px` blur, and `0.985` scale. Compact route entrances use about `3px`, `1.5px`, and `0.994`. Local component transitions should use the smallest values that still explain the change.

## 3. Continuity rules

1. The first readable frame must already use final layout geometry.
2. Animate a whole readable object or group; do not make users reconstruct important UI from decorative fragments.
3. Preserve identity across a state change. A clicked thumbnail may hand off to its project hero, but the handoff must preserve pixel proportions and crop intentionally.
4. Never distort images, text, cards, icons, or controls with unequal X/Y scaling, skew, or inherited perspective.
5. Parallax, Ken Burns, drift, or other ambient motion begins only after geometry has settled.
6. Persistent shell surfaces do not fade, slide, scale, or replay an entrance during route or overlay changes.
7. On close, restore the underlying page quickly as a complete group. Do not reverse a theatrical first entrance by default.
8. Reduced motion removes travel, depth scaling, blur, parallax, and stagger while preserving state, focus, and readable continuity.

The Home identity, Work introduction, About opening/finale, and Contact title use one scarce `bookend-title` exception. After the destination view settles, Instrument Serif resolves letter by letter in reading order. Every glyph steps through five randomly sampled ball-palette colours, ordered darkest to lightest in dark mode and lightest to darkest in light mode. Colour changes are instant and every palette frame uses full opacity. The final frame steps directly to the title's authored resting opacity, without a fade or dissolve. A `10%` left-to-right glyph travel uses a strong cubic ease and shares the colour cycle's start and end. There is no title fade or blur. The title container stays at final geometry; glyphs never move vertically, mask, crop, or scale. Shared title lockups then grow their short rule horizontally from the centre before the description fades upward one rendered line at a time. Home has no rule or description, and its secondary lines keep their quieter resting opacity. Reduced motion settles the complete hierarchy immediately.

## 4. Portfolio project handoff

The project card and project hero share an image, not a common aspect ratio. Their continuity bridge is therefore the media crop, not the whole card box.

- Move the drawer's real hero-media node into one isolated bridge and animate it from the thumbnail bounds to the hero bounds using measured `left`, `top`, `width`, `height`, and `border-radius`.
- Keep the image inside that box at `object-fit: cover`; changing the box changes the crop without stretching pixels.
- Reattach that same media node to the hero shell at settlement; do not crossfade between duplicate images.
- Start hero parallax only after the media handoff completes.
- Bring hero identity and actions into readable form using the homepage depth-emergence vocabulary.
- At the hero, close by reversing the media handoff into the freshly measured originating card using the shorter close duration.
- If the reader has scrolled beyond the visible hero, close directly without snapping the article back to the top.
- Reduced motion uses opacity only: no media travel, crop animation, blur, or ambient motion.

## 5. Shipping checklist

- [ ] Every animated target is visually inside the studio window or is a temporary overlay.
- [ ] Outer frame, aperture/rim, Button Bar, and route-stable shell controls remain fixed and readable.
- [ ] No image, text, card, icon, or control receives non-uniform scale or skew.
- [ ] First readable text is already in final layout.
- [ ] Ambient motion begins after the geometry handoff.
- [ ] Close/return is simpler and faster than open/first entrance.
- [ ] Focus, ARIA state, inert state, and scroll state remain correct.
- [ ] Reduced motion preserves the full interaction without travel or ambient motion.
- [ ] Desktop, tablet, and mobile frame captures show no blank flash, crop snap, double image, or shell movement.
- [ ] Repeated open/close cycles leave one drawer, zero bridge nodes, and no stale transition state.
