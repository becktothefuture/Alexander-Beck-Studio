# Custom cursor

Cross-route interaction intent lives in [`DESIGN.md`](../../DESIGN.md).

The production site has one custom cursor: a fixed 48px translucent lens matching the lens shown over the Home simulation switcher. Its material is the same shadow-free mid-gray translucent fill in both studio-window themes, remaining visible over the invariant dark wall as well as the window interior without a drop shadow or inset rim. It never adopts route or simulation accent colours.

The lens is fixed to `body` and follows the pointer across the studio window, outer shell, persistent Button Bar, every primary route, gates, drawers, and modal overlays. Route changes and overlay transitions may alter its stacking level, but never its size, material, or shape.

Hovering any semantic clickable target applies the cursor's only interaction state: the 48px lens scales to 20px (`scale(0.4166667)`) and its overall opacity falls to `0.72`. This includes links, buttons, form controls, route tabs, icon controls, and keyboard-focusable action roles. Controls may retain their own local hover treatment, but the cursor never changes colour, emits particles, gains a label, disappears inside a circular control, or switches to another cursor family.

Editor surfaces (legacy config panels, their toggle, parameterizer panels, and the About narrative editor) retain the native system cursor so standard pointer, text-entry, and resize affordances remain available. Mouse and fine-pointer input use the custom lens; touch and pen input do not leave a synthetic cursor behind.

Pointer handling must preserve mouse, pen, touch, keyboard focus, reduced motion, route teardown, and SPA remounts. Reduced motion keeps the smaller/quieter interactive endpoint but removes its transition.
