# Site styleguide

## Scope

The production design intent and responsive rules live in [`DESIGN.md`](../../DESIGN.md). This pattern index covers Home, Work, About, Contact, the persistent shell, Work gate/drawer/stage, and development-lab utility chrome; lab patterns are not evidence for the production design constitution.

## Navigation

The bottom Button Bar is the primary navigation object. Its labels come from `SHELL_ROUTE_TABS`; the About route uses the concise `About` label. Route top bars are optional back/utility strips only.

The dark outer shell owns the Button Bar’s resting material in every theme. Mobile and desktop use separately authored endpoints from `runtime.buttonBar*` in `react-app/app/public/config/design-system.json`, resolved through `react-app/app/src/lib/buttonBarControls.js`. Read those sources for height, window overlap, radius, route-cell width, icon size, label size/gap, and active-key inset; do not substitute compatibility defaults or copied values from documentation.

Home through Contact form one continuous route group without separators. Every route pairs a Tabler outline icon with a small sentence-case Geist label at weight `700` and slightly tightened `-0.02em` tracking. One shared graphite key follows the active or pending route cell and uses the configured equal inset on all four sides. Hover, press, and keyboard focus change ink or add a compact focus cue, never a per-tab background.

The separate Utility Rail is attached to the studio-window right edge and stays fixed across routes. Its vertical capsule places theme above sound and keeps its dark shell material in both themes. Desktop uses `32px` visible controls centred at `50svh`. Mobile uses `25px` visible controls, moves outward by `11px`, and centres at `76svh` so it sits quietly in the bottom half without competing with the primary menu. Coarse-pointer hit areas expand invisibly to `44px` without overlapping. The **Utility Rail** panel group owns separate desktop and mobile size and horizontal-position controls, plus the mobile `55%` to `90%` vertical-position range.

## Shell and surfaces

Preserve visible separation between browser frame, outer wall, inner wall, canvas/surface, and controls. The physical shell does not leave during route transitions. Page-specific CSS owns composition; shared finish belongs to shell tokens/config.

## Route language

Availability follows the [production/development route table](../../README.md#routes). The full Work patterns below are visible in development; About uses its canonical narrative in both production and development.

- Home: simulation material, semantic title source, expertise legend, supporting philosophy copy
- Work: hierarchical spatial field, media-first snippet/case-study handoff, editorial drawer, and in-window gate
- About: continuous spatial narrative in production and development
- Contact: centered invitation and contact actions inside the same physical window
- Internal Work engine: pannable deterministic catalogue, restrained labels, and three-layer depth field
- Labs: local back/utility top chrome when needed

## Typography and voice

The typography is a deliberate contrast system rather than one family applied everywhere.

- Instrument Serif is the editorial arrival voice. It gives the main route titles more authorship, warmth, and cultural character.
- Geist remains the structural voice for navigation, descriptions, controls, Portfolio cards, and project-detail titles. It preserves the site's technical precision and keeps the interface feeling like one engineered object.
- Geist Mono remains the operational voice for metadata and compact technical labels.
- London and its local time use the same quiet Geist metadata role in the Home footer.

Instrument Serif is limited to the Home canvas title, route-level titles using `.route-centered-page__title`, and the About narrative's two-scale spatial-title sequence. This includes the Work intro and gate. The runtime roles below are defined in `react-app/app/public/css/tokens.css` and `react-app/app/public/css/main.css`; read their resolved values instead of keeping a second numeric type scale here.

Work, Contact, and both About bookends use the shared `.route-title-lockup` treatment: a short rule in the current title colour, one globally authored line-to-description gap, and the ordered entrance `title → centre-out rule → description`. About's opening and finale lockups remain vertically centred. The finale keeps its contact action as an inline text link inside the description, not a separate button row.

- `--abs-font-headline`: Instrument Serif with its defined fallbacks
- `--route-entry-title-size`: shared responsive size for Home and route-entry titles
- `--route-bookend-title-scale` and `--route-bookend-title-size`: shared route-identity scale and resolved size
- `--route-title-line-height`: shared headline leading before the font optical multiplier
- `--abs-font-headline-scale`: font optical-size adjustment
- `--abs-font-headline-line-height-scale`: font optical-leading adjustment
- `--abs-font-headline-letter-spacing`: headline tracking

The regular Instrument Serif webfont is self-hosted under `public/fonts/instrument-serif/`, preloaded by every production HTML shell, and included in the runtime font-readiness gate before canvas or route content is revealed. Do not restore it to the external Google Fonts request or remove it from the readiness gate.

This pairing moves the site from a purely system-led portfolio towards an authored studio while retaining a precise technical spine. Its value depends on scarcity: do not apply Instrument Serif to project names, navigation, body copy, or ordinary section headings. A future use in a pull quote or case-study chapter opener may be considered deliberately, but it must not become the default editorial decoration.

Instrument Serif's finer strokes are more vulnerable to visual interruption than Geist. On Home, momentary ball crossings are part of the material interaction, but the default and settled states must leave all three title lines legible. Solve conflicts through simulation density, placement, contrast, and motion. Do not compensate with text outlines, shadows, or a background plate.

## Verification matrix

Visual changes require a fresh root build and coverage of Home, Work, About, and Contact at desktop/mobile and light/dark. Check the default Work gate on production preview; use development for the full Work gate, snippet stage, and case-study drawer at desktop, tablet, and mobile sizes. Check the public About narrative at desktop and mobile when affected. Motion/routing changes require serial Chromium and WebKit transition audits. The live `/styleguide.html` must remain aligned with the actual component markup.
