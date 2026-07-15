# Site styleguide

## Scope

The production design intent and responsive rules live in [`DESIGN.md`](../../DESIGN.md). This pattern index covers Home, Portfolio, About Me, Contact, the persistent shell, Portfolio gate/drawer, and lab utility chrome; lab patterns are not evidence for the production design constitution.

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

## Typography and voice

The typography is a deliberate contrast system rather than one family applied everywhere.

- Instrument Serif is the editorial arrival voice. It gives the main route titles more authorship, warmth, and cultural character.
- Geist remains the structural voice for navigation, descriptions, controls, Portfolio cards, and project-detail titles. It preserves the site's technical precision and keeps the interface feeling like one engineered object.
- Geist Mono remains the operational voice for metadata and compact technical labels.
- The London script is a small signature moment, not another general-purpose display style.

Instrument Serif is limited to the Home canvas title and route-level titles using `.route-centered-page__title`, including the Portfolio intro and gate. The production tokens are:

- `--abs-font-headline: "Instrument Serif", ...`
- `--route-entry-title-size`: shared responsive size for Home and route-entry titles
- `--abs-font-headline-scale: 1.22`
- `--abs-font-headline-line-height-scale: 0.92`
- `--abs-font-headline-letter-spacing: -0.01ch`

The regular Instrument Serif webfont is self-hosted under `public/fonts/instrument-serif/`, preloaded by every production HTML shell, and included in the runtime font-readiness gate before canvas or route content is revealed. Do not restore it to the external Google Fonts request or remove it from the readiness gate.

This pairing moves the site from a purely system-led portfolio towards an authored studio while retaining a precise technical spine. Its value depends on scarcity: do not apply Instrument Serif to project names, navigation, body copy, or ordinary section headings. A future use in a pull quote or case-study chapter opener may be considered deliberately, but it must not become the default editorial decoration.

Instrument Serif's finer strokes are more vulnerable to visual interruption than Geist. On Home, momentary ball crossings are part of the material interaction, but the default and settled states must leave both title lines legible. Solve conflicts through simulation density, placement, contrast, and motion. Do not compensate with text outlines, shadows, or a background plate.

## Verification matrix

Visual changes require a fresh root build and coverage of Home, Portfolio, About Me, and Contact at desktop/mobile and light/dark. Motion/routing changes also require serial Chromium and WebKit transition audits. The live `/styleguide.html` must remain aligned with production markup.
