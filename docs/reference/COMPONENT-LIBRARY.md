# Component library

The live reference is `/styleguide.html`. It must describe production components, not retired specimens. Cross-route design intent and responsive policy live in [`DESIGN.md`](../../DESIGN.md).

## Primary navigation: Button Bar

`ShellButtonBar.jsx` renders the persistent bottom navigation from `SHELL_ROUTE_TABS` in `src/lib/routes.js`.

- Route buttons: Home, Work (Portfolio route), About, Lab, Contact
- States: idle, hover/focus, pressed, active/current
- Secondary controls: icon-only sound and theme toggles; sound swaps volume-off/volume-on and theme swaps sun/moon, with no slider track
- Anatomy: Home–Lab route group followed by the fixed two-slot sound/theme utility group; route and utility separators are absent
- Active geometry: one shared graphite key follows the active or pending route cell, resizes with its label, and applies the configured key inset equally on all four sides
- Responsive type and spacing: links use `10px` labels with `8px` inline padding through `767px`, then `16px` labels with `16px` inline padding from `768px`; labels use Geist at weight `700` with `0.012em` tracking, desktop utility icons grow from `16px` to `18px`, and only the route region scrolls when the capsule is width-capped
- Mobile: all five routes remain reachable and the active route is scrolled into view; all controls remain keyboard and touch accessible
- Global keyboard: when no focused control or open modal owns the key, Left and Right Arrow activate the previous or next route with wraparound; Space advances the Home Daily Simulation
- Primary navigation never moves into a route top bar

### Interaction sound contract

Production DOM actions declare `data-sound-action="press|close|step|manual|none"` and a stable `data-sound-source`. The shell delegates `press`, `close`, and `step` once per click. Components that own drag thresholds, compound project opening, contact motifs, or history-based close paths use `manual` and call the shared interaction API only after the action commits. Hover and focus remain silent. Development editors, styleguide controls, and embedded content are outside this contract.

## Utility icon buttons

`.abs-icon-btn` is the shared frame for back, sound, and other glyph-only utility actions. Every icon button needs an accessible name and visible focus treatment.

### Quiet control material

The Home simulation switcher, Portfolio drawer back button, and Contact email/copy action share the `--abs-soft-control-*` material tokens. The material follows the studio-window theme, mixes in no more than 5% black, preserves background context with blur, and uses a 0.5px outline at 12% opacity (15% maximum for active states). Hover, keyboard focus, press, and persistent open states use the shared emphasis fill: white in light mode and near-black in dark mode. The simulation chooser applies this same blurred emphasis state and active edge to its selected row, hovered row, and close button. Components keep their own geometry while consuming the same fill, edge, blur, and saturation values; no component adds a second colored halo or glow. The standard custom cursor remains visible over circular controls and uses the same smaller, quieter clickable state it uses everywhere else. The two window-corner controls use the same `--abs-window-control-offset`, mirrored top-right for close and top-left for back, with safe-area protection.

## Route top bars

Use `header.ui-top > .ui-top-main.route-topbar` only when a route or lab needs a back/local utility control. Keep left, center, and right slots structurally stable. Do not add a second set of route links.

## Typography and content specimens

The live styleguide covers Home hero/legend, Button Bar labels, supporting script copy, edge/meta copy, Portfolio gate, Portfolio drawer, centered About/Contact route copy, and the Lab route-entry family. Exact values come from tokens and production CSS rather than this document.

### Headline contract

Top-level route headlines use Instrument Serif through `--abs-font-headline`, optically scaled by `--abs-font-headline-scale`, with headline-specific leading and tracking tokens. The contrast with Geist is intentional: the serif creates a warmer, more editorial arrival while the rest of the interface stays precise and system-led.

- Allowed: the Home canvas title and `.route-centered-page__title` on Portfolio, About Me, Contact, Lab, and the Portfolio gate.
- Not allowed: navigation, descriptions, Portfolio card titles, project-detail titles, controls, metadata, or general section headings.
- Possible future exception: a deliberately art-directed pull quote or case-study chapter opener. This requires explicit scope; it is not inherited by default.
- Implementation: consume the resolved `--route-entry-title-size` with `--abs-font-headline`, `--abs-font-headline-line-height-scale`, and `--abs-font-headline-letter-spacing`. The optical scale is already included in the resolved size; do not repeat it in component CSS.

Work, About Me, Contact, and Lab pair this title with `.route-centered-page__description.route-intro-description`. The shared modifier owns their description measure, leading, settled opacity, and balanced wrapping; route CSS owns only placement, animation progress, or an explicit responsive measure override. The Portfolio access gate deliberately keeps the narrower base description measure.

## Lab work item and dialog

Lab renders one semantic ordered collection. Each work item is one button with a minimum 44px target, visible keyboard focus, a unique accessible name, and its media label below the preview. Repeated spatial copies are presentation only and must stay `aria-hidden` and non-interactive.

The selected-work surface is a named `role="dialog"` inside the studio window. It uses one close control, traps focus, makes the world inert, and restores focus to the exact logical item. Image, video, and local code media keep their intrinsic aspect ratio. The field uses posters; only the selected media can own an active video or sandboxed code iframe. See [`PLAYGROUND.md`](PLAYGROUND.md).

Resolved values come from the headline tokens. Project titles remain Geist so the route voice and the project-information hierarchy do not compete.
