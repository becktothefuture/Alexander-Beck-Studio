# Site styleguide

## Scope

The system covers Home, Portfolio, About Me, Contact, the persistent shell, Portfolio gate/drawer, and lab utility chrome.

## Navigation

The bottom Button Bar is the primary navigation object. Its labels come from `SHELL_ROUTE_TABS`; visible casing is `About Me`. Route top bars are optional back/utility strips only.

Buttons share material cues: a stable resting plate, clear hover/focus fill, pressed depth, route accent for the current tab, and visible keyboard focus. Busy simulation backgrounds require a translucent/blurred resting ground.

## Shell and surfaces

Preserve visible separation between browser frame, outer wall, inner wall, canvas/surface, and controls. The physical shell does not leave during route transitions. Page-specific CSS owns composition; shared finish belongs to shell tokens/config.

## Route language

- Home: simulation material, semantic title source, expertise legend, supporting philosophy copy
- Portfolio: orbital deck, media-first handoff, editorial drawer, in-window gate
- About Me and Contact: centered route content inside the same physical window
- Labs: local back/utility top chrome when needed

## Verification matrix

Visual changes require a fresh root build and coverage of Home, Portfolio, About Me, and Contact at desktop/mobile and light/dark. Motion/routing changes also require serial Chromium and WebKit transition audits. The live `/styleguide.html` must remain aligned with production markup.
