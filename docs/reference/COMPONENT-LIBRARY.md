# Component library

The live reference is `/styleguide.html`. It must describe production components, not retired specimens. Cross-route design intent and responsive policy live in [`DESIGN.md`](../../DESIGN.md).

## Primary navigation: Button Bar

`ShellButtonBar.jsx` renders the persistent bottom navigation from `SHELL_ROUTE_TABS` in `src/lib/routes.js`.

- Route buttons: Home, Work (Portfolio route), About, Lab, Contact. Every route renders an accessible Tabler outline icon with a visible label.
- States: idle, hover/focus, pressed, active/current
- Secondary controls: none; theme and sound belong to the separate shell-owned Utility Rail
- Anatomy: one undivided five-route group; separators and route-group parameters are absent
- Active geometry: one shared graphite key follows the active or pending route cell, resizes with its label, and applies the configured key inset equally on all four sides
- Responsive type and spacing: mobile route cells shrink evenly below their configured `62px` maximum, pair `21px` icons with sentence-case `8px` labels across a `5px` gap, and retain a minimum 51px route target at a 320px viewport. Desktop scales the same composition to equal `85px` route cells with `25px` icons, sentence-case `11px` labels, and a `6px` gap. Labels use Geist at weight `700` with slightly tightened `-0.02em` tracking.
- Mobile: all five routes remain visible without horizontal scrolling

## Global utility controls: Utility Rail

- Component: `ShellUtilityRail.jsx` with shared behavior in `ShellUtilityControls.jsx`
- Position: fixed to the studio-window right edge; desktop centres at `50svh`, while mobile defaults to an outward `-11px` offset and a `76svh` centre
- Controls: theme above sound in one vertical capsule at every viewport width
- Geometry: desktop uses `32px` visible buttons; mobile uses quieter `25px` visible buttons with proportionally scaled icons
- Configuration: the top-level **Utility Rail** group exposes separate **Desktop** and **Mobile** geometry, including the mobile vertical position
- Accessibility: both buttons keep an accessible name, `aria-pressed`, and a visible focus ring; at the default mobile size, coarse-pointer hit regions expand invisibly to `44px` without overlapping
- Global keyboard: when no focused control or open modal owns the key, Left and Right Arrow activate the previous or next route with wraparound; Space advances the Home Daily Simulation
- Primary navigation never moves into a route top bar

### Interaction sound contract

Production DOM actions declare `data-sound-action="press|close|step|manual|none"` and a stable `data-sound-source`. The shell delegates `press`, `close`, and `step` once per click. Components that own drag thresholds, compound project opening, contact motifs, or history-based close paths use `manual` and call the shared interaction API only after the action commits. Hover and focus remain silent. Development editors, styleguide controls, and embedded content are outside this contract.

## Utility icon buttons

`.abs-icon-btn` is the shared frame for back, sound, and other glyph-only utility actions. Every icon button needs an accessible name and visible focus treatment.

### Quiet control material

The Home simulation switcher and chooser, Portfolio drawer and access-gate controls, Lab media close control, and Contact email/copy action share the `--abs-soft-control-*` material tokens. The material follows the studio-window theme, darkens its source surface by 12% in light mode and 36% in dark mode, and preserves background context with blur. Its retained 0.5px border geometry is transparent in every state. Capsules contain compact text actions and selectable rows; circles contain icon-only close and back actions. Hover, keyboard focus, press, and persistent open states use the shared emphasis fill: white in light mode and near-black in dark mode. No component adds a second colored halo or glow. The standard custom cursor remains visible over circular controls and uses the same smaller, quieter clickable state it uses everywhere else. The two window-corner controls use the same `--abs-window-control-offset`, mirrored top-right for close and top-left for back, with safe-area protection.

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
