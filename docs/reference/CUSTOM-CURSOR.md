# Custom cursor

The custom cursor has two current forms:

- solid palette dot: Home inner wall and Portfolio deck/background while project detail is closed;
- 64px tap ring: Portfolio detail, About Me, Contact, Portfolio gate, and modal/focus states.

There is no separate project-hover cursor family.

The cursor is fixed to `body` so overlays cannot bury it. Home dot size is derived from the canvas ball mapping; Portfolio should match that perceptual diameter without depending on obsolete project bodies. Perfect cursor circles are excluded from squircle styling.

Pointer handling must preserve mouse, pen, touch, keyboard focus, reduced motion, and route teardown. Never add nested rings or thin field/helper lines to simulation visuals.
