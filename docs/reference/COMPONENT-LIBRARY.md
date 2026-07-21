# Component library

The live reference is `/styleguide.html`. It must describe production components, not retired specimens. Cross-route design intent and responsive policy live in [`DESIGN.md`](../../DESIGN.md).

## Primary navigation: Button Bar

`ShellButtonBar.jsx` renders the persistent bottom navigation from `SHELL_ROUTE_TABS` in `src/lib/routes.js`.

- Route buttons: Home, Work (Portfolio route), About Me, Contact
- States: idle, hover/focus, pressed, active/current
- Secondary controls: sound and theme
- Active geometry: content-sized tab cells use label width plus inline padding; one shared pill matches the selected padded cell with rounded-rectangle corners, while Home remains circular
- Mobile: Home gains a visible label; all controls remain keyboard and touch accessible
- Primary navigation never moves into a route top bar

## Utility icon buttons

`.abs-icon-btn` is the shared frame for back, sound, and other glyph-only utility actions. Every icon button needs an accessible name and visible focus treatment.

### Quiet control material

The Home simulation switcher, Portfolio drawer back button, and Contact email/copy action share the `--abs-soft-control-*` material tokens. The material follows the studio-window theme, mixes in no more than 5% black, preserves background context with blur, and uses a 0.5px outline at 12% opacity (15% maximum for active states). Hover, keyboard focus, press, and persistent open states use the shared emphasis fill: white in light mode and near-black in dark mode. The simulation chooser applies this same blurred emphasis state and active edge to its selected row, hovered row, and close button. Components keep their own geometry while consuming the same fill, edge, blur, and saturation values; no component adds a second colored halo or glow. The standard custom cursor remains visible over circular controls and uses the same smaller, quieter clickable state it uses everywhere else. The two window-corner controls use the same `--abs-window-control-offset`, mirrored top-right for close and top-left for back, with safe-area protection.

## Route top bars

Use `header.ui-top > .ui-top-main.route-topbar` only when a route or lab needs a back/local utility control. Keep left, center, and right slots structurally stable. Do not add a second set of route links.

## Typography and content specimens

The live styleguide covers Home hero/legend, Button Bar labels, supporting script copy, edge/meta copy, Portfolio gate, Portfolio drawer, and centered About/Contact route copy. Exact values come from tokens and production CSS rather than this document.

### Headline contract

Top-level route headlines use Instrument Serif through `--abs-font-headline`, optically scaled by `--abs-font-headline-scale`, with headline-specific leading and tracking tokens. The contrast with Geist is intentional: the serif creates a warmer, more editorial arrival while the rest of the interface stays precise and system-led.

- Allowed: the Home canvas title and `.route-centered-page__title` on Portfolio, About Me, Contact, and the Portfolio gate.
- Not allowed: navigation, descriptions, Portfolio card titles, project-detail titles, controls, metadata, or general section headings.
- Possible future exception: a deliberately art-directed pull quote or case-study chapter opener. This requires explicit scope; it is not inherited by default.
- Implementation: consume the resolved `--route-entry-title-size` with `--abs-font-headline`, `--abs-font-headline-line-height-scale`, and `--abs-font-headline-letter-spacing`. The optical scale is already included in the resolved size; do not repeat it in component CSS.

Work, About Me, and Contact pair this title with `.route-centered-page__description.route-intro-description`. The shared modifier owns their description measure, leading, and balanced wrapping; route CSS owns only placement. The Portfolio access gate deliberately keeps the narrower base description measure.

Resolved values come from the headline tokens. Project titles remain Geist so the route voice and the project-information hierarchy do not compete.
