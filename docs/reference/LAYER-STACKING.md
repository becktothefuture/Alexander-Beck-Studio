# Layer stacking

Every `StudioShell` window uses the same three-layer content contract:

1. route scene/content at `100`;
2. the pointer-transparent contrast veil at `180`;
3. route UI, the Home footer, and overlays at `200+`.

The expanded physical order is:

1. browser/page ground;
2. outer frame and inner wall;
3. route scene transform group and background noise;
4. low-resolution simulation-atmosphere glow;
5. registered crisp route material, including Home's rear/main pass;
6. the Home Canvas title plane and any front depth material;
7. the thin simulation-atmosphere wall-edge reflection;
8. pointer-transparent contrast veil;
9. route UI and the Home footer when Home is active;
10. window overlays and Portfolio project sheet;
11. modal/focus overlays;
12. persistent Button Bar and its finish layer.

## Ownership

`StudioShell.jsx` owns the physical window, overlay hosts, Home-only footer surface, and Button Bar. Route content stays inside the studio window. The Button Bar is outside the window and must never be covered by route content or a project sheet.

`simulationLayer` and optional `heroLayer` content are scene-side and therefore below the shared veil. Visible route copy and controls belong in `uiLayer`, above the veil. The centered Home title is the sole intentional text exception: its semantic DOM source remains accessible while its visible Canvas path stays below the veil with the balls.

The production atmosphere does not change those owners. `StudioShell` mounts `.simulation-atmosphere-glow-canvas` inside `#shell-wall-slot`, below the registered source material, and `.simulation-atmosphere-edge-light-canvas` as a direct child of `#simulations` at `160`, below the contrast veil at `180`. Both output canvases remain rectangular; `#simulations` is their sole rounded clip, so the 1–2px edge light follows the same physical contour without creating a second antialiased boundary.

Home's title remains Canvas-rendered. When source softness is non-zero, the engine moves it to `.simulation-crisp-title-canvas`: below ordinary source material, or between the rear and `.simulation-front-depth-canvas` passes for Sphere, Cube, Parallax, and Emergence. Portfolio, About, Contact, and route-backed Daily copy remains DOM-owned in its established hero/UI layer; the atmosphere quiet-zone mask attenuates glow but never moves copy into a compositor Canvas.

During route transitions, the simulation transaction snapshot captures glow, crisp title, registered material, depth material, and edge in authored order, reproducing the source Canvas compositor blur once during capture. The live edge is hidden while a transition is active so it cannot double with the snapshot. Do not move either atmosphere output into a route-owned subtree, put route UI beneath the edge Canvas, or solve atmosphere stacking with route-specific z-index escalation.

The Portfolio project drawer repeats the same local order. Its media and scrolling case-study content sit below the drawer veil; its project title, eyebrow, scroll cue, and Back control sit above it. The drawer veil remains present for the full visible lifecycle, including opening and closing.

`#portfolio-sheet-host` is a sibling overlay host within `#abs-scene`, after route content. The open Portfolio sheet covers the Portfolio route content but stops above the Button Bar. Its project scroll cue is drawer-owned and independent of the Home footer. Preserve the host radius and clipping contract.

The protected-project access gate uses the shell-owned `.window-overlay-layer` inside the same studio-window clip. It blurs the live Portfolio deck but never the Button Bar. The legacy fixed `#modal-blur-layer` and `#modal-content-layer` may retain modal timing/depth state, but they must not paint while the project gate is open or closing. The project sheet may begin opening only after the access overlay is fully closed.

`#shell-persistent-route-ui-host` is a shell-owned sibling outside `#abs-scene` and `#app-frame`. Route instruments that must not disappear during scene boot or route-content transitions mount here, remain clipped to the studio-window viewport above the Button Bar, and stay pointer-transparent.

Do not move `#portfolioProjectView` back inside the simulation/content subtree. Do not solve stacking bugs with arbitrary higher z-indexes; preserve this ownership order.
