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

Do not move `#portfolioProjectView` back inside the simulation/content subtree. Do not solve stacking bugs with arbitrary higher z-indexes; preserve this ownership order.
