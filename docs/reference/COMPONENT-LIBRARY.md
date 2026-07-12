# Component library

The live reference is `/styleguide.html`. It must describe production components, not retired specimens.

## Primary navigation: Button Bar

`ShellButtonBar.jsx` renders the persistent bottom navigation from `SHELL_ROUTE_TABS` in `src/lib/routes.js`.

- Route buttons: Home, Portfolio, About Me, Contact
- States: idle, hover/focus, pressed, active/current
- Secondary controls: sound and theme
- Mobile: Home gains a visible label; all controls remain keyboard and touch accessible
- Primary navigation never moves into a route top bar

## Utility icon buttons

`.abs-icon-btn` is the shared frame for back, sound, and other glyph-only utility actions. Every icon button needs an accessible name and visible focus treatment.

## Route top bars

Use `header.ui-top > .ui-top-main.route-topbar` only when a route or lab needs a back/local utility control. Keep left, center, and right slots structurally stable. Do not add a second set of route links.

## Typography and content specimens

The live styleguide covers Home hero/legend, Button Bar labels, supporting script copy, edge/meta copy, Portfolio gate, Portfolio drawer, and centered About/Contact route copy. Exact values come from tokens and production CSS rather than this document.
