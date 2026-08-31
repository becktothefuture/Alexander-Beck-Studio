# Layer stacking

Every `StudioShell` window uses the same two-layer content contract:

1. route scene/content at `100`;
2. route UI, the Home footer, and overlays at `200+`.

The expanded physical order is:

1. browser/page ground;
2. outer frame and inner wall;
3. the thin static inner-wall rim, lit from above;
4. route scene transform group and background noise;
5. low-resolution simulation-atmosphere glow;
6. registered crisp route material, including Home's rear/main pass;
7. the Home Canvas title plane and any front depth material;
8. route UI and the Home footer when Home is active;
9. window overlays and Work project sheet;
10. modal/focus overlays;
11. persistent Button Bar and Utility Rail with their finish layers.

## Ownership

`StudioShell.jsx` owns the physical window, overlay hosts, Home-only footer surface, Button Bar, and Utility Rail. Route content stays inside the studio window. The Button Bar is a shell-owned sibling that deliberately overlaps the bottom `30px` of the window on mobile and `32px` on desktop. The Utility Rail is a shell-owned sibling attached to the studio-window right edge. Neither fixture may be covered by route content, loaders, gates, or a project sheet.

`simulationLayer` and optional `heroLayer` content are scene-side. Visible route copy and controls belong in `uiLayer`. The centered Home title is the sole intentional text exception: its semantic DOM source remains accessible while its visible Canvas path stays with the balls.

The frame vignette and route UI are descendants of `#simulations`, in that order. This keeps entrance blur, grouped Home legibility fields, and control effects inside the studio-window contour while preserving `#simulations` as the sole rounded clip. Do not mount route UI as an unclipped viewport sibling of the wall.

The production atmosphere does not change those owners. `StudioShell` mounts `.simulation-atmosphere-glow-canvas` inside `#shell-wall-slot`, below the registered source material. The canonical atmosphere edge strength is zero, so its compatibility Canvas stays hidden and does not paint. `.inner-wall-gradient-edge` at `0` owns the neutral static rim directly above the window background and below background noise, atmosphere, and route material. `#simulations` remains the sole outer rounded clip; the rim inherits its geometry and must not generate an independent Canvas, SVG, or route-specific corner path.

Home and route-backed Daily simulations share one shell-owned `#simulation-title-canvas`. Their keyed route content supplies one invisible semantic `#hero-title`, but neither route replacement nor an atmosphere source registration owns the visible title plane. Normal modes stack title/material at `9/10`; depth modes stack rear/title/front material at `4/11/12`. The compositor samples simulation material only and applies its title quiet-zone mask after composing active sources. Work, About, and Contact copy remains DOM-owned in its established hero/UI layer.

Simulation transitions keep the stable title plane live while route-owned material is replaced. Do not snapshot or duplicate the title, move either atmosphere output into a route-owned subtree, put route UI beneath the edge Canvas, or solve atmosphere stacking with route-specific z-index escalation.

The Work case-study drawer keeps its media, scrolling content, project title, eyebrow, scroll cue, and Back control within the drawer-owned stack without an additional veil.

`#portfolio-sheet-host` is a sibling overlay host within `#abs-scene`, after route content. The open Work sheet covers the Work field and reaches the same studio-window boundary as the route surface; the overlapping Button Bar paints and receives input above it. Its project scroll cue is drawer-owned and independent of the Home footer. Preserve the host radius and clipping contract.

Work case studies fill this host on all four edges with a subtly translucent drawer ground. Keep the inert foreground world mounted and visible behind the sheet; do not fade it away and thereby erase the transparency. Snippet media has a separate full-window backdrop, a uniformly scaled media frame, unscaled rationale, and a close action with its own clear space. Neither overlay moves or resizes the physical shell.

The protected-project access gate uses the shell-owned `.window-overlay-layer` inside the same studio-window clip. It softens the live Work field but never the Button Bar. The legacy fixed `#modal-blur-layer` and `#modal-content-layer` may retain modal timing/depth state, but they must not paint while the project gate is open or closing. The project sheet may begin opening only after the access overlay is fully closed.

`#shell-persistent-route-ui-host` is a shell-owned sibling outside `#abs-scene` and `#app-frame`. Route instruments that must not disappear during scene boot or route-content transitions mount here, remain clipped to the complete studio-window viewport behind the Button Bar, and stay pointer-transparent.

Do not move `#portfolioProjectView` back inside the simulation/content subtree. Do not solve stacking bugs with arbitrary higher z-indexes; preserve this ownership order.
