# Layer stacking

Every `StudioShell` window uses the same three-layer content contract:

1. route scene/content at `100`;
2. the pointer-transparent contrast veil at `180`;
3. route UI, footer, and overlays at `200+`.

The expanded physical order is:

1. browser/page ground;
2. outer frame and inner wall;
3. route scene transform group;
4. simulation wall/effects;
5. Home ball canvas and visual title path;
6. pointer-transparent inner-shadow/contrast veil;
7. route UI and footer;
8. window overlays and Portfolio project sheet;
9. modal/focus overlays;
10. persistent Button Bar and its finish layer.

## Ownership

`StudioShell.jsx` owns the physical window, overlay hosts, footer, and Button Bar. Route content stays inside the studio window. The Button Bar is outside the window and must never be covered by route content or a project sheet.

`simulationLayer` and optional `heroLayer` content are scene-side and therefore below the shared veil. Visible route copy and controls belong in `uiLayer`, above the veil. The centered Home title is the sole intentional text exception: its semantic DOM source remains accessible while its visible Canvas path stays below the veil with the balls.

The Portfolio project drawer repeats the same local order. Its media and scrolling case-study content sit below the drawer veil; its project title, eyebrow, scroll cue, and Back control sit above it. The drawer veil remains present for the full visible lifecycle, including opening and closing.

`#portfolio-sheet-host` is a sibling overlay host within `#abs-scene`, after route content. The open Portfolio sheet covers the route header/footer/content but stops above the Button Bar. Preserve the host radius and clipping contract.

Do not move `#portfolioProjectView` back inside the simulation/content subtree. Do not solve stacking bugs with arbitrary higher z-indexes; preserve this ownership order.
