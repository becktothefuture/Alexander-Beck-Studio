# Custom cursor

Cross-route interaction intent lives in [`DESIGN.md`](../../DESIGN.md). There is known drift between the locked 64px route/state lens contract and the current 48px runtime/default route classifier; align the state matrix, JS, CSS, documentation, and audits in one change.

The custom cursor has two current forms:

- solid palette dot: default in-window cursor across the primary tabs: Home, Portfolio deck/background, About Me, and Contact;
- translucent lens: simulation chooser/modal states, Portfolio project detail, dev chrome targets, and in-window action hover.

There is no separate project-hover cursor family.

The cursor is fixed to `body` so overlays cannot bury it. The dot size is derived from the canvas ball mapping when available, with a stable fallback for route surfaces that do not expose the Home canvas metrics. Portfolio should match that perceptual diameter without depending on obsolete project bodies. Perfect cursor circles are excluded from squircle styling.

Clickable in-window body targets use a cursor-led hover: the palette dot morphs into the translucent lens, while the target keeps restrained local feedback such as a soft field, opacity lift, or existing card shadow. When the lens is already active, hovering a clickable target makes the lens smaller and quieter instead of adding an accent flash.

Circular controls that paint the complete shared emphasis material are the exception. The simulation chooser close control and Portfolio drawer back control own the single large circle, so the custom lens becomes invisible while either is hovered. Do not stack the lens inside a circular control: pointer, keyboard, and touch must all resolve to the same one-circle target surface.

The persistent Button Bar keeps its own cursor contract. Editor surfaces (legacy config panels, their toggle, parameterizer panels, and the About narrative editor) always use the native system cursor; this allows standard pointer, text-entry, and resize affordances without the custom dot or lens layered above them. The native cursor also returns outside the framed window.

Pointer handling must preserve mouse, pen, touch, keyboard focus, reduced motion, and route teardown. Never add nested rings or thin field/helper lines to simulation visuals.
