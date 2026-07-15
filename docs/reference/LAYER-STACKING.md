# Layer stacking

The homepage and shared shell are an ordered physical system:

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

`#portfolio-sheet-host` is a sibling overlay host within `#abs-scene`, after route content. The open Portfolio sheet covers the route header/footer/content but stops above the Button Bar. Preserve the host radius and clipping contract.

The Portfolio route veil and `.portfolio-project-view__veil` are separate physical instances of the shared `.contrast-veil-surface` primitive. The route instance sits above the simulation wall, particles, and cards but below route UI. The drawer instance sits above project content inside `#portfolio-sheet-host`, while its Back control remains above the veil. Keep the instances separate so the sheet host can preserve its stacking and clipping contract; consolidate their visual treatment through the shared primitive instead.

Do not move `#portfolioProjectView` back inside the simulation/content subtree. Do not solve stacking bugs with arbitrary higher z-indexes; preserve this ownership order.
