# Design system

## Purpose and scope

This is the design constitution for the production Alexander Beck Studio website. It covers the shared shell and the five main routes: Home, Work/Portfolio, About Me, Lab, and Contact. The Portfolio gate and project drawer are included because they are part of the production route.

Standalone development labs, playgrounds, dashboards, test fixtures, audit pages, and the live styleguide are not design evidence for this document. The production Lab route is part of this constitution. The styleguide is a verification surface for production patterns.

This file owns intent, cross-route rules, responsive policy, and exception governance. It does not replace the authored values in `react-app/app/public/config/design-system.json`, the runtime CSS tokens, or the focused technical contracts in `docs/reference/`.

## Design thesis

The site is an engineered studio instrument with editorial warmth.

- Clean and precise, but never sterile.
- Playful through physical response, surprising behavior, and careful material detail rather than decorative clutter.
- Contemporary and authored: Instrument Serif creates an editorial arrival; Geist keeps the interface technically exact.
- Persistent and spatially reliable: the frame, window, Button Bar, Utility Rail, and outside shell read as one object.
- Restrained in its effects: color, blur, grain, depth, sound, and motion earn their place by clarifying hierarchy or interaction.
- Human at the edges: the London signature, direct copy, and occasional irregular physical behavior soften the engineered structure.

The useful reference is the product-minded precision of Teenage Engineering, not a literal imitation of its typography, hardware, or skeuomorphism.

## Authority

| Concern | Authority | Rule |
| --- | --- | --- |
| Design intent and cross-route consistency | `DESIGN.md` | Change this when the design language changes. |
| Authored numeric values and configurable behavior | `react-app/app/public/config/design-system.json` | This is the only authored configuration. |
| Runtime CSS vocabulary and first-paint fallbacks | `react-app/app/public/css/tokens.css` | Consume semantic tokens; do not create parallel scales. |
| Shared shell and route composition | `StudioShell.jsx`, `main.css` | The shell is persistent; route content is replaceable. |
| Component anatomy and states | `docs/reference/COMPONENT-LIBRARY.md` | Components must match production markup and accessibility. |
| Current visual pattern index | `docs/reference/SITE-STYLEGUIDE.md` | Keep aligned with the live production styleguide. |
| Theme behavior | `docs/reference/THEME-STATE.md` | Implementation must also satisfy the locked boundary below. |
| Home canvas and title rendering | `CANVAS-RUNTIME.md`, `SIMULATION-DESIGN-GUIDELINES.md` | DOM and Canvas title geometry are one contract. |
| Portfolio deck, gate, drawer, and handoff | `docs/reference/PORTFOLIO.md` | Preserve route-specific art direction and reversal. |
| Motion rationale and implementation | `MATERIAL-PRESENCE.md`, `SCENE-ENTRANCE-PRINCIPLE.md`, `TRANSITION-ORCHESTRATION.md` | Rationale, visual rules, and state ownership remain separate. |

Generated configs, browser storage, and inline runtime state are outputs, not design sources.

## Production design artefacts

The system is distributed across these production surfaces. A design change is complete only when every affected path agrees.

| Artefact | Production source |
| --- | --- |
| Core tokens, type roles, spacing, radii, finish, and motion values | `public/config/design-system.json`, `public/css/tokens.css` |
| Stable simulation palette registry and twice-daily schedule | `src/palette/londonPalettes.js`, `src/palette/timeOfDayPalette.js` |
| Font loading and first-paint shell | `index.html`, `portfolio.html`, `about.html`, `contact.html`, `playground.html` |
| Persistent shell, surface slots, Home footer, overlay hosts, Button Bar, and Utility Rail | `StudioShell.jsx`, `ShellButtonBar.jsx`, `ShellUtilityRail.jsx`, `SiteFooter.jsx`, `main.css`, `shell-button-bar-dominant.css`, `shell-utility-rail.css` |
| Route names, visible navigation labels, and accent ownership | `src/lib/routes.js`, `shell-button-bar-dominant.css` |
| Home title, expertise legend, supporting copy, and simulation field | `HomeRoute.jsx`, `legacy/main.js`, `legacy/modules/rendering/`, `main.css`, `contents-home.json` |
| Portfolio intro, linear deck, project access gate, cards, project drawer, and media handoff | `PortfolioRoute.jsx`, `PortfolioGateRoute.jsx`, `legacy/modules/portfolio/`, `portfolio.css`, `contents-portfolio.json` |
| About Me production scroll narrative, point field, emergent-form resolution, and development-only editor | `routes/about/AboutRoute.jsx`, `routes/about-narrative-lab/`, `routes/about-narrative-lab/about-narrative-lab.css`, `public/config/contents-about.json` |
| Contact title, description, email action, ripple field, sound, and haptics | `ContactRouteContent.jsx`, `ContactRippleSimulation.jsx`, `contactRippleRenderer.js`, `contact-route.css`, shared centered-route CSS |
| Lab title, deterministic spatial catalogue, dot field, media dialog, and authoring surface | `routes/playground/`, `public/config/contents-playground.json`, `public/assets/playground/`, `docs/reference/PLAYGROUND.md` |
| Home footer signature, social links, edge caption, and London time | `SiteFooter.jsx`, `main.css`, `contents-home.json` |
| Theme, frame, wall, noise, and browser harmony | `dark-mode-v2.js`, `site-shell.js`, `chrome-harmony.js`, `tokens.css` |
| Cursor states and pointer mapping | `cursor.js`, `main.css`, `CUSTOM-CURSOR.md` |
| Copy tone and content ownership | `docs/reference/TONE-OF-VOICE.md`, `docs/reference/SITE-COPY.md`, production content JSON |

Paths above are relative to `react-app/app/` unless they start with `docs/`.

## Foundations

### Typography

The core pairing is Instrument Serif plus Geist.

- Instrument Serif is the editorial route-entry voice. Use it for the Home title and top-level route-entry titles, including the Portfolio intro and gate, plus the explicit About sequence beats below.
- About adds three deliberate display beats in the continuous spatial narrative: its opening, exact midpoint, and finale. All other travelling spatial titles stay in Geist at a smaller scale between display and editorial copy.
- The Home identity, Work introduction, About opening/finale, Contact title, and Lab title share one viewport-stable bookend motion after a `500ms` pause. Individual letters appear in reading order through five instant colours sampled from the current ball palette. Dark mode orders each random sample from darkest to lightest; light mode reverses that order. Each glyph travels `10%` from left to right over the same `196ms` colour cycle, with `84%` overlap and no opacity fade or blur. Every palette frame renders at full opacity, then the final frame steps directly to the title's authored resting opacity. Home keeps its secondary lines at the quieter authored endpoint. Where a title uses the shared lockup, its short rule begins exactly when the final coloured letter settles, then scales from the centre while the rendered description lines fade in from top to bottom. The complete description rises on a long cubic ease-out while each line uses a slower, softer opacity curve, so the supporting elements decelerate as one gesture without splitting glyphs or changing kerning. Bookend motion never moves the title vertically, clips, or crops title glyphs. All five route identities use the shared `--route-bookend-title-size` at a `1.61568` optical scale and shared tighter headline leading. Reduced motion settles the complete hierarchy immediately.
- Geist is the structural voice for navigation, descriptions, controls, the Contact email action, Portfolio cards, project names, project-detail titles, and ordinary headings.
- Geist Mono is operational: kickers, metadata, access inputs, and compact technical labels.
- The handwritten LDN 26 SVG is the rare London signature. It is artwork, not another type role or heading style.
- Do not inherit Instrument Serif through a section or route. Apply the headline role explicitly.
- Project titles stay Geist. The editorial route voice and the project-information voice must not compete.
- The Work, Contact, Lab, and both About Me bookend title/description lockups share one short title-colour rule and one ordered entrance: title, centre-out rule, then description. Its line-to-description gap is a single shell-authored value across every instance.
- Tracking and leading belong to named roles. Do not apply a broad optical correction and repair it component by component.
- The visible Home title is rendered by Canvas from the semantic DOM title's computed metrics. Font family, size, leading, tracking, wrapping, and font-load timing must remain synchronized.

Exact values live in the headline and text tokens. The design rule is scarcity and contrast, not a copied numeric type scale.

### Colour and surface ownership

The neutral structure carries the interface. Accent colors signal route, interaction, or simulation material; they are not general decoration.

- Preserve distinct layers for the browser/page band, outer wall, physical frame, studio-window interior, in-window finish, controls, and route content.
- Manual site theme affects the studio-window interior and the temporary in-window route cover at every viewport width. `auto` follows `prefers-color-scheme`; explicit light or dark choices persist across responsive changes. The exposed band, physical frame, direct-load boot preloader, and stable outer shell use opaque true black (`#000000`) in every site theme, browser scheme, browser family, and display gamut. The separate wall surface remains `#141414`. The SPA route cover must match `--studio-window-bg` and its spinner ink must resolve from the in-window text tokens.
- The Button Bar belongs to the stable dark outer shell. Mobile is the proportional master at `62px` high; desktop carries the same composition at a slightly enlarged `68px`. Both retain the `#141414` to `#000000` vertical gradient and two inset highlights in every site theme. Mobile uses a `20px` capsule radius and desktop uses `22px`. Home, Work, About, Lab, and Contact are one undivided route group. Every route pairs a Tabler outline icon with a sentence-case Geist label: mobile uses `21px` icons, `10px` labels, and a `5px` gap in equal `62px` route cells; desktop uses `25px` icons, `12px` labels, and a `6px` gap in equal `85px` route cells. Labels use slightly tightened `-0.02em` tracking. Inactive labels use the readable neutral `#767881`; the active pair is white above one shared graphite key surface. Route separators are absent.
- The Utility Rail is a separate shell fixture attached to the studio window's right edge. Desktop stays vertically centred at `50svh` with `32px` visible controls. Mobile deliberately becomes quieter: `25px` visible controls, an `-11px` outward offset, and a centre at `76svh` in the viewport's bottom half. Coarse-pointer hit areas expand invisibly to `44px` without allowing the two controls to overlap. The **Utility Rail** panel owns separate desktop and mobile size and horizontal-position controls plus the mobile vertical anchor; both horizontal ranges run from `-160px` to `160px`, the mobile size runs from `22px` to `44px`, and its vertical anchor runs from `55%` to `90%`. The rail uses stable outer-shell ink and material in every theme, persists through route transitions, and never becomes part of route content or the Button Bar.
- Route accents remain stable: Home green, Work acid, About blue, Contact orange, and Lab pink.
- Simulation colours have one stable time-of-day owner. Bow / Worn Signal, Silvertown / Cobalt Voltage, Rye / After Closing, and Rye / After Closing (Turmeric) are the approved production set in `src/palette/londonPalettes.js`. Home, Work, About Me, Contact, and Lab consume the same resolved ball palette, update together on the eight three-hour boundaries at 00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, and 21:00 visitor-local time, and do not select route-, config-, fallback-, or URL-specific palette overrides.
- Neutrals dominate simulations. Use acid, blue, orange, and green as controlled focal material.
- Grain should make the window feel physical without muddying type or flattening surface separation.
- Home UI legibility comes from five static, background-matched fields behind the expertise legend, philosophy, socials, edge caption, and London/time groups. Interaction changes foreground emphasis only; it does not animate or multiply the fields.
- All normal text must meet WCAG 2.2 AA contrast in both themes. Do not use opacity as the only way to create hierarchy when it makes the resolved color fail.

### Spacing and layout

- Use the existing 4px sub-unit and 8px rhythm for static endpoints. Tight icon/text pairings may use the smaller step.
- Reuse semantic gaps and content insets. Do not create a route-specific spacing scale.
- The studio window derives its reserve from the active Button Bar endpoint. Mobile overlaps the window by `30px`; the slightly enlarged desktop endpoint uses `32px`, preserving the same approximately half-overlapped placement. Both sit `10.5px + safe-area` above the viewport edge. Window backgrounds and overlays continue behind the overlap; route-owned interactive content consumes `--button-bar-content-clearance`.
- Readable text measure uses `ch`; layout width uses percentages, container units, or explicit maximums.
- Width-owned typography and horizontal spacing use width-based fluid interpolation. Height-owned composition may use `svh`, `dvh`, or container height units.
- Avoid `vmin` for values whose intent is horizontal; it can collapse spacing in short landscape viewports.
- Route-specific composition is allowed. Shared page padding, title spacing, description measure, and action spacing should still consume the same semantic roles.

### Geometry, radius, and depth

- `#simulations` is the sole visible rounded clip for the studio window.
- Frame inset and frame radius are authored as mobile/desktop endpoints and interpolated by the runtime. Components consume the resolved geometry rather than cloning it.
- True circles remain circles. Squircle treatment applies only to eligible framed surfaces and controls.
- Pills indicate selection, compact controls, or grouped actions; do not turn every container into a pill.
- Prefer contact edges, inset light, broad recesses, and restrained shadow to generic floating-card elevation.
- The Portfolio drawer inherits the window geometry and reads as an inserted surface, not a detached modal.
- Do not add thin force lines, helper rings, or decorative outlines to explain simulation behavior.

### Iconography and controls

- Tabler Outline is the default icon language. Use custom SVG only where exact brand or control geometry is required.
- Every icon-only control has an accessible name, a visible keyboard focus state, and an effective target of at least 44px.
- Full-window scroll and drag regions keep keyboard access but never draw a focus ring around the studio-window perimeter. Move their focus cue to a compact in-window progress or interaction indicator.
- The Button Bar is the only primary navigation. Its raised active key is one shared inert surface, not five independent selected backgrounds. All five routes pair an icon with a sentence-case label: mobile uses `21px` Tabler outline icons with `10px` labels and a `5px` gap; desktop scales that relationship to `25px` icons with `12px` labels and a `6px` gap. Labels use Geist weight `700` with slightly tightened `-0.02em` tracking. The mobile key is `50px` inside its `62px` cell; the desktop key is `71px` inside its `85px` cell, leaving the larger desktop stack with approximately `6px` of vertical breathing room. The key follows the active or pending cell geometry with compositor-only travel, resizes to the destination cell, and uses the responsive configured key inset equally on all four sides; `aria-current` remains on the committed route.
- Route top bars are local utility/back strips only.
- Sound and haptics reinforce a state change but never carry its meaning alone.
- Production sound follows committed interaction, not hover or focus. Ordinary buttons and links use one crisp press; project opening adds one quieter 35ms tail; close actions use one lower detent; and discrete content or carousel advances use one step click. About, Lab, and open Work drawers use the gentle speed-responsive Scroll Crystal voice for continuous movement. The Work deck sounds only when a distinct project reaches centre, not throughout travel. Only the sound toggle may unlock audio; all other actions stay silent until the visitor opts in. Reduced-motion preference suppresses interaction sound with motion.

#### Quiet control material and emphasis

The Home simulation switcher, Portfolio drawer and access-gate controls, Lab media close control, and Contact email/copy action are one material family. They consume the semantic `--abs-soft-control-*` tokens and use one shape language: capsules for compact text actions and selectable rows, circles for icon-only close and back actions.

- The resting material follows the current studio-window theme. Its surface darkens by 12% in light mode and 36% in dark mode before the translucent mix, so the borderless shape remains legible over both interiors. The 18px backdrop blur and gentle saturation preserve local context.
- Every quiet control keeps its border geometry transparent in every state. Resting and interaction hierarchy comes from the translucent blurred fill, text/icon contrast, and opacity—not a visible hairline.
- Emphasis is adaptive, not route-accented: use a translucent white field in light mode and a translucent black field in dark mode. Text and icons resolve through the current in-window text tokens.
- Hover, `:focus-visible`, pressed, and advancing states use the same emphasis fill, blur, saturation, and text/icon contrast.
- Contact copy adds one contained, centre-out light wash using the background ripple's exact, unmixed current confirmation colour. It starts in the same click frame as the ripple, clears after `620ms`, and never adds a border, halo, or layout movement.
- Do not stack a colored halo, glow, drop shadow, or second hover field on top of this emphasis material. State must remain calm and legible over moving simulation content.
- The custom cursor remains one consistent shadow-free translucent mid-gray lens in both site themes and over every control, including circular controls. Its only interactive response reduces the 57.6px lens to 20px (`scale(0.3472222)`) with `opacity: 0.72`; controls do not request a route-, overlay-, or geometry-specific cursor. Lab keeps the resting lens over its keyboard-focusable drag surface and uses the smaller state only for nested project items and other true actions.
- The manual site theme owns these values because these controls live inside the studio window. Never derive them from the browser-aware wall or outer-frame palette.

The Home switcher is a circular next control, not a selector or dialog trigger. It shows the current simulation name and a refresh glyph. On activation, the current label exits upward while the next label enters from below, and the glyph rotates 180 degrees. The material response, label travel, and glyph motion share one easing. Reduced motion commits the next label and simulation without travel, blur, scale, or rotation.

### Motion and material presence

- The physical frame, window, Button Bar, Utility Rail, and outside shell remain present during route changes.
- Animate route-owned content inside the stable window.
- The first readable frame uses final geometry. Text must not become legible while still moving into its layout position.
- Entrance order is identity, context, action, then supporting detail. Returning from an interruption is faster and simpler than the first entrance.
- Hover and press motion should feel compact, tactile, and bounded.
- Reduced motion removes travel, blur, scale, stagger, parallax, continuous field motion, and Ken Burns effects while preserving hierarchy and state.
- Preserve selected media as the physical object during the Portfolio card-to-drawer handoff.

## Shared shell and route patterns

### Persistent shell

The shell is one stable instrument: exposed band, wall/frame geometry, studio-window host, Button Bar, Utility Rail, modal hosts, and Portfolio sheet host. Page changes must not recreate or reanimate it; only the studio-window interior surface and content change theme. The social/time footer and edge caption are Home-owned content and are not shown on Portfolio, About Me, Contact, or Lab.

### Home

- Home is the baseline for shell geometry, finish, content inset, and simulation material.
- The top composition is intentionally asymmetric: expertise at left, philosophy at right, identity centered in the field.
- The social/time footer and edge caption appear only on Home.
- The visible title belongs to the Canvas path; semantic DOM copy remains the metric and accessibility source.
- The settled/default simulation must leave all three title lines legible. Solve occlusion with density, placement, color, and motion—not text outlines, shadows, or a plate.
- Expertise filtering is a real interaction and must have full keyboard and assistive-technology semantics.

### Work / Portfolio

- “Work” is the Button Bar label; “Portfolio” is the route and experience name.
- The live route is a linear, drag/scroll-controlled media deck available as the unauthorised preview. The centred card is full size, every inactive card is 90% size, and the complete track stays on one horizontal axis. It is not a grid or a physics pit.
- The route intro and gate use the editorial route-entry voice. Card and project-detail titles remain Geist.
- Every project declares `access: "public" | "protected"`. Missing or unsupported runtime values fail closed as protected.
- The access gate appears only when an unauthorised visitor opens a protected project. It blurs the live deck inside the studio window, stores one Portfolio-wide grant, closes completely, then continues the exact selected card through the existing drawer handoff. Public projects bypass it.
- This gate is client-side access friction, not secure authentication; truly private assets require server or edge enforcement.
- The drawer covers route content to the studio-window boundary behind the overlapping Button Bar, supports native reading/selection behavior, and preserves focus restoration.
- Project-specific editorial treatments must be named content variants, not selector rules tied only to a project ID.

### About Me

- The production About route renders the complete scroll narrative. Its authoring editor remains a development-only surface and is excluded from production assets.
- The narrative is one continuous scroll experience inside the same physical window. The fixed point world and the text share one route-owned timeline; the shell, frame, and Button Bar remain stable.
- The narrative establishes an orb above the opening promise, flies into its complexity, scatters
  through an empty interval, raises an organised grid from below, isolates six disciplines, and
  gathers that same material into one suspended spatial form. These are transformations of one
  material, not separate decorative scenes.
- Two vertically scrolling editorial areas carry the background, client context, reflections on the practice, AI, and multidisciplinary synthesis. Each area remains one authored unit, but its prose resolves one rendered line at a time through the shared fade and blur channels. Visual line groups recalculate when the available width or font metrics change, never on each scroll frame. The point world yields completely whenever either unit enters the viewport. The first unit ends with optically balanced monochrome client assets in a quiet three-column desktop grid with a centred final pair, or a two-column mobile grid. The logo field inherits the editorial unit's exact width at every layout profile. Every client asset uses the same 640 × 320 transparent canvas with its visible artwork alpha-centred and sized inside the file, so frontend placement remains neutral. The second unit is one continuous multi-paragraph passage; project-impression cards do not interrupt its reading flow.
- Spatial titles use one Instrument Serif family at two explicit scales: medium travelling titles stay vertically centred while bridging the editorial passages, while larger display titles punctuate the opening and finale bookends. Both bookend lockups share an authored 70% viewport position in the lower half, keep the same screen-space centre while visible, and use one narrower supporting-description measure. The opening cluster and final bust share one upper-field visual centre.
- Camera authoring uses explicit channels. The Camera travel lane owns absolute Position XYZ, FOV,
  and the optional Look-at Target XYZ with horizon roll. A separate Camera tilt lane can own manual
  Rotation XYZ when orientation must change without retiming or easing the travel path. Authored
  positions create an orbit; there is no hidden frame origin, depth offset, or secondary dolly system.
- The calm field resolves gradually beneath the client editorial as the camera completes the saved
  backward flyover. That backward travel continues while the camera pitches toward the floor, then
  carries on through the bird's-eye Discipline reading lane. The movement is one uninterrupted path,
  not a flyover followed by a stationary tilt. The constant-speed travel segment begins before the
  independent tilt, and compact layouts keep FOV fixed throughout the reading pass so lens changes do
  not cancel the visible movement. Its width, depth, and distance fog must keep the physical edges and
  horizon out of view.
- Point sizing has two composable controls: one global material size and one relative multiplier per
  World. The global control sets the narrative's overall ball scale; World multipliers provide restrained
  shot-specific compensation without changing density, camera position, or point correspondence.
- The six disciplines use six distinct native grid cells in one column. Once the camera is looking
  straight down, it keeps travelling backward along the grid as each paired row resolves. Camera height
  and pitch stay fixed through this reading pass. Each discipline remains visible after it resolves, so
  the labels build into a vertical stack beside their own points. Every label follows the matching grid
  point in screen space with the shared `22px` gap. Each label begins resolving when its projected point
  enters the lower viewfinder band and is fully readable before the global restore. The presentation has
  no card, connector, counter, or glow. Colours remain fixed in category order: `--ball-1`, `--ball-4`, `--ball-3`, `--ball-7`,
  `--ball-8`, `--ball-6`.
- About points remain flat palette-owned circles when they resolve at readable sizes. The microscopic
  field and the six revealed discipline points use the same flat finish without a sphere-atlas transition.
- The second editorial area uses one left-aligned measure after the discipline grid has faded completely away. Visibility, camera, and global distance fog are independent controls; fog must never substitute for an authored disappearance or be keyframed per camera pose.
- The grid returns in full colour, already framed on the ripple centre, after the editorial area clears.
  Any reframe from the discipline view happens only while the point world is fully hidden. From the return
  through the finale, the camera follows one constant sideways orbit around a shared look-at point. A
  continuous concentric wave generator lifts and laterally displaces the ordered floor from its center
  without helper rings; scroll is the wave clock so every change in the ripple is authored.
- The resolved form is the point-cloud bust: the ordered field gathers into one authored figure rather
  than a solar system or unrelated bodies. It begins only after the sustained ripple passage and forms
  bottom-up from that still-moving surface: the fragmented base and shoulders appear first, then the
  neck and coherent head resolve. The anchored camera eases out of its orbit and holds while the settled
  form begins its final rotation.
- The bust remains large and horizontally centred through the final invitation. The lower-half stack
  reads “Let’s begin.”, then the smaller invitation sentence with one inline email link. It has no
  separate action buttons and must not displace the bust or leave the studio viewport.
- Mobile portrait frames the final bust slightly higher and closer than the previous endpoint while
  retaining the same material/text centre relationship as desktop.
- Phone presentation is portrait-only. Phone landscape and any landscape viewport too short to
  contain the studio window use the shared viewport cover instead of recomposing route content.
  Portrait phone, ordinary laptop, tablet, and sufficiently tall ultrawide viewports remain supported.
- The creative toolkit belongs to local development and opens with `?edit=1`. Production and development playback read the validated `public/config/contents-about.json` document, while production excludes the editor, Save client, and authoring diagnostics.

### Contact

- Contact uses the centered route-entry title, supporting description, and one primary email-copy action.
- The ripple field is a route-specific motion behavior. Its balls use flat palette fills, create a quiet
  zone around content, and respond to the copy action.
- The email address uses Geist within a borderless quiet-control capsule; its momentary pressed light starts with the background ripple, while copy success is expressed with visible text, icon state, sound, haptic feedback, and material motion.
- Contact retains the shared spacing/type roles even though its simulation and action are unique.

### Lab

- Lab is the fifth primary route. It is a spatial catalogue, not a masonry page, dashboard, whiteboard, or replacement for Work.
- The opening lockup is part of the pannable world. Instrument Serif is limited to the route H1. Work descriptions use the Portfolio caption treatment and wrap in full below their left-aligned names; visible media-type tags are omitted.
- The dot field and work placement share one grid, camera phase, and pre-paint camera sample. Drag rendering is frame-coalesced for a stable 60fps-or-better camera cadence on both ordinary and high-refresh displays, and the Lab atmosphere sleeps when its renderer is idle. The Canvas backing store preserves true circular dots across fractional viewport sizes and pixel densities. Dots are low-opacity neutral grey, remain a flat grid material, and do not respond to pointer hover. The grid tiles homogeneously behind the title and every project without a title-area mask or empty seam. Seamless copies support continuity, but only one logical item per work may be interactive or exposed to assistive technology.
- Work opens in an in-window dialog with shareable `?work=<id>` state, complete keyboard behavior, focus trapping, focus restoration, and browser Back support.
- Reduced Motion retains panning, wrapping, hierarchy, selection, and focus. It removes inertia, pointer attraction, scale/blur travel, and stagger.
- The initial 20 entries and their local media are explicit placeholders. They must not be presented as real projects, client work, contributions, or outcomes. The content and authoring contract is [`docs/reference/PLAYGROUND.md`](docs/reference/PLAYGROUND.md).

### Footer

- The footer is quiet edge metadata: social links, studio statement, and London time/signature.
- It remains subordinate to route content and must stay readable without becoming a second navigation bar.
- Portfolio may suppress the long edge caption where it would compete with the deck.

## Simulation language

- Every semantic production ball uses its approved circle or pebble geometry with a flat fill from the active time-of-day palette.
- Route coverage is explicit: Home simulation bodies and the quote puck; Work / Portfolio speed-field particles and pit project bodies; readable About point-field circles including the six discipline balls; and Contact ripple balls.
- The cached sphere sticker/atlas finish is disabled globally. Production renderers retain colour batching and do not issue one scaled texture draw per body.
- Bodies must be large enough to read as material and separated enough to preserve silhouette.
- Express force through motion, displacement, density, collision, and broad tonal fields.
- Do not use overlapping transparent circles, weather overlays, long decorative trails, thin vector fields, or generic particles as the main idea.
- Reduce body count before reducing readable body size.
- Exclusions are role-based, not shape-based. The neutral Lab grid, generic About point-field particles, Portfolio DOM cards, UI controls and indicators, the cursor, loaders, navigation, editorial dots, artwork circles, and atmosphere emitters keep their own materials. A circle does not inherit the sphere finish only because it is round.

### Shared simulation atmosphere

Home and Daily simulations, Work / Portfolio, About Me, Contact, and Lab share one shell-owned Crisp + Diffuse Glow material system. It unifies a wall-wide low-frequency colour field and crisp source material; it does not replace route-specific motion or flatten every route into the same simulation. A static inner-wall rim describes a soft all-around reflection inside the studio window. A paired two-layer outer-wall glow reflects that light onto the exposed wall: light mode is stronger, dark mode stays quieter, and the narrower mobile band uses a tighter configurable far layer so both falloff stages remain visible, while the black frame and wall geometry remain unchanged. The Button Bar replaces its original inset finish with independent near/far reflections; their default shifts contain the reflection along its upper inner edge. Shell grain and contrast finish remain independent and never intensify because the atmosphere is active.

- The source material remains the only direct colour layer. Glow is a broad projection of the current completed source frame. The shell rim remains neutral and static; it never samples ball colours or requires a full-window masked Canvas layer.
- Home preserves its Canvas title placement: ordinary material passes in front of the title, while the established depth modes may place stable material on both sides. Other routes keep readable DOM copy above their route material while the atmosphere remains continuous behind it.
- Portfolio and the full About narrative use their live colour canvases when available. Contact uses its ripple canvas. Lab uses its neutral dot field. Canvas-less, suspended, error, and editorial-only states stay on the base studio-window surface; the compositor must not invent placeholder colour, glow, or simulated material for them.
- Standalone simulation labs, launchers, loaders, and decorative dots do not inherit the production atmosphere merely because they contain a Canvas. Eligibility and source registration are explicit.
- Reduced Motion retains one static diffused colour response. Mobile keeps the same visual hierarchy at reduced output scale rather than disabling the material.
- The glow may retain one short, bounded history frame behind the current field. It has no drift, multi-buffer diffusion, unbounded accumulation, or memory across source, mode, theme, or geometry boundaries.

## Fluid responsive contract

Mobile and desktop output are approved endpoints. Responsive work must preserve those endpoints and improve only the interpolation between them.

1. Record the current computed mobile and desktop value, the viewport widths that define them, and every consumer.
2. Interpolate with a monotonic linear `clamp()` or the existing runtime endpoint helper.
3. Use media/container queries only for structural changes: column count, navigation arrangement, drawer composition, short landscape, or interaction capability.
4. Keep controls, touch targets, borders, icons, safe areas, and shell clearance categorical when predictable geometry is more important than fluidity.
5. Verify computed values immediately below and above every removed breakpoint.

The reusable formula is:

```text
slope = (desktop - mobile) / (desktopWidth - mobileWidth)
intercept = mobile - slope * mobileWidth
value = clamp(mobile, calc(intercept + slope * 100vw), desktop)
```

Generate coefficients at build/runtime precision. Do not hand-tune the middle by eye after endpoints are fixed.

### Responsive merge status

The route-entry title family is implemented. The remaining rows are proposals and are not applied production changes.

| Status | Family | Merge | Exceptions to preserve |
| --- | --- | --- | --- |
| Implemented | Route-entry title | One resolved `--route-entry-title-size`, `1.32` bookend scale, and shared optical leading used by Home, Portfolio intro/gate, About, and Contact | Home Canvas continues to read the DOM result. |
| Implemented | Route description | One continuous size token and one editorial measure/leading modifier shared by the Work, About Me, Contact, and Lab intros | The Portfolio access gate keeps its narrower description measure. |
| Proposed | Centered route spacing | Shared content-only page padding, stack gap, description gap, and action gap tokens | Do not apply these tokens to the Button Bar, frame, deck geometry, or drawer handoff. |
| Proposed | Home support system | Replace repeated tablet/mobile selectors with semantic legend-size, supporting-size, and top-gap tokens | Column count and short-height layout remain structural breakpoints. |
| Proposed | Portfolio card type | Local fluid client/title tokens | Keep Geist and preserve fixed card geometry/legibility. |
| Proposed | Portfolio detail title | Local continuous Geist title token | Named editorial variants may opt into documented alternatives. |
| Proposed | Contact email | Local continuous Geist size token across the narrow safeguard | Preserve 44px+ hit target and readable address wrapping. |

The shared title token uses a direct mobile clamp, bridges the 601–1024px interval, and retains the existing desktop value from 1025px upward:

```css
:root {
  --route-entry-title-size:
    calc(
      clamp(33.6px, var(--abs-home-logo-width-vw, 52) * 0.186vw, 62.4px)
      * var(--abs-font-headline-scale, 1)
    );
}

@media (min-width: 601px) and (max-width: 1024px) {
  :root {
    --route-entry-title-size:
      calc((6.211765vw - 1.270588px) * var(--abs-font-headline-scale, 1));
  }
}

@media (max-width: 600px) {
  :root {
    --route-entry-title-size:
      calc(clamp(19px, 8.108vw, 36px) * var(--abs-font-headline-scale, 1));
  }
}
```

The resolved token applies the headline optical scale once, so Home and centered routes consume the same finished size without repeating the calculation. The mobile curve is 15% larger than the previous output, while the tablet bridge preserves monotonic scaling across `600→601` and `1024→1025` without changing the desktop endpoint.

Recommended companion bridges:

```css
--route-description-size:
  clamp(12.6px, calc(9.2px + 0.566667vw), 16px);

--route-page-padding:
  clamp(24px, calc(10.628571px + 3.428571vw), 72px);

--route-stack-gap:
  clamp(10px, calc(7.771429px + 0.571429vw), 18px);

--abs-content-padding:
  calc(var(--abs-frame-inset) + min(1.5vw, 64px));
```

Recalculate these from approved computed endpoints before implementation if the source values change.

### Do not fluidize

- Button Bar geometry, touch targets, safe-area offsets, active-key material, label sizing, and icon frames.
- Frame inset/radius; they already have a canonical endpoint interpolation.
- Portfolio linear-track geometry, drawer handoff geometry, and height-led project art direction.
- Home short-height compression and narrow landscape safeguards.
- Borders, focus-ring widths, the fixed cursor diameter, or motion timing.
- Project titles through the route-entry serif token.

## Accessibility and performance rules

- Preserve semantic headings even when the visible result is rendered by Canvas.
- All primary interactions support mouse, pen, touch, keyboard, focus restoration, and assistive technology.
- Never suppress focus globally. Use one semantic, visible `:focus-visible` treatment for links, buttons, inputs, tabs, cards, and drawer controls.
- Normal text meets WCAG 2.2 AA in both themes. Validate the resolved color after opacity and backdrop composition.
- Do not use color, motion, sound, or haptics as the only state indicator.
- Reading surfaces support native text selection. Drag suppression stays local to draggable decks.
- Canvas work remains bounded and allocation-light. Route teardown cancels loops, listeners, timers, and stale async work.
- Font loading must not leave the Home Canvas title measured against a fallback face.

## Intentional exceptions

An exception is allowed only when it strengthens the design thesis and is recorded with:

- route and owner;
- rationale;
- token/variant name;
- mobile and desktop endpoints;
- intermediate behavior;
- light/dark behavior;
- reduced-motion behavior;
- accessibility impact;
- verification command and screenshots.

Current intentional exceptions are the Home Canvas title, Home expertise composition, Portfolio linear deck, Portfolio media handoff, Portfolio gate, Contact ripple field, and the London signature.

## Outlier register and proposed resolutions

These are implementation/documentation findings, not permission for a broad refactor. Resolve them in small verified waves.

| Priority | Outlier | Evidence | Proposed resolution |
| --- | --- | --- | --- |
| P0 | Focus visibility is broadly suppressed | Global and component `:focus-visible` rules remove outline/shadow in `main.css` and Button Bar CSS. | Define semantic focus-ring tokens, remove blanket suppression, and verify every main-page interactive state. |
| P0 | Home expertise is click-only | Legend items are `div` elements with JS click listeners. | Render buttons or add complete button semantics, Enter/Space handling, and pressed/expanded state without changing the visual design. |
| P1 | Light supporting copy is likely under contrast | Muted text plus `0.64` opacity resolves near a 3.25:1 contrast on the common light interior. | Use an opaque semantic muted color or raise resolved contrast; verify real composited colors in both themes. |
| P1 | Config and CSS fallbacks disagree | Frame colors, desktop inset/radius, interior light color, and some motion fallbacks differ from authored config. | Generate critical first-paint fallbacks from `design-system.json` or share one endpoint builder. |
| P1 | Authored content-inset tokens do not own layout | `contentInset*` values are stamped, while runtime `contentPadding*` values drive the visible page. | Choose one endpoint contract and feed the same resolved value to CSS, overlays, and runtime geometry. |
| P1 | Project-detail title drops at `640→641` | The normal Geist title falls from roughly `61.6px` to `44.9px`. | Add a local continuous project-detail title bridge; do not use the route-entry serif. |
| P1 | Contact email and mobile type multiplier jump | Narrow email guard and global `--mobile-type-scale` switch values abruptly. | Replace local size switches with content-role fluid tokens while retaining structural breakpoints. |
| P1 | Portfolio reading surface blocks selection | Global `user-select: none` is not restored in the drawer body. | Restore native selection/cursor behavior inside the reading surface; keep drag suppression on the deck only. |
| P2 | Global Geist tracking creates repair overrides | Body uses very tight global tracking; drawer and components reset it locally. | Default body to neutral tracking and apply named compact/normal/loose/mono/headline roles explicitly. |
| P2 | Project editorial style is tied to one ID | Extensive `chapter-7` selectors encode a reusable art direction as an exception. | Promote it to a named content variant and preserve the current output exactly during migration. |
| P2 | Tap-target token name is unsafe | `--abs-tap-target` resolves below the actual 44px control minimum. | Rename it for what it sizes or redefine it as the true minimum and separate glyph/frame sizes. |
| P2 | Token scope is broad and repetitive | Global token file mixes foundations, compatibility aliases, and component internals. | Do not rewrite wholesale; keep new global tokens semantic and move component tokens locally when that component is revised. |

## Verification

Every design-system implementation change starts with a production build and ends with visual inspection of the main pages.

Minimum matrix:

- Routes: Home, Work/Portfolio gate and unlocked deck, About Me, Contact, Lab default and selected-work dialog, Portfolio drawer.
- Widths: 320, 375/390, 480, 600, 601, 640, 641, 767, 768, 900, 991, 992, 1024, 1025, 1440, and 3440 where Portfolio is affected.
- Heights: common phone, short landscape, standard desktop, and the approved desktop capture height.
- Themes: light and dark.
- Browsers: Chromium and WebKit for route/motion/theme changes.
- States: default, hover, keyboard focus, pressed, active, gate, drawer, reduced motion, and settled simulation.

Run the canonical gate:

```bash
npm run check:site
```

Then use the focused screen, route, theme, Canvas, Portfolio, and transition audits listed in `AGENTS.md`. A green command does not replace screenshot inspection, computed-style checks, or breakpoint-adjacent comparison.

## Change checklist

- [ ] The change reinforces the design thesis.
- [ ] Existing semantic tokens or a justified new role own the value.
- [ ] Approved mobile and desktop endpoints are unchanged unless explicitly re-art-directed.
- [ ] Intermediate widths are monotonic and breakpoint-adjacent values were checked.
- [ ] Home Canvas and semantic title paths agree where typography changed.
- [ ] Light/dark, keyboard focus, contrast, reduced motion, touch, and safe areas were checked.
- [ ] Persistent shell geometry and Button Bar clearance are unchanged unless in scope.
- [ ] Route-specific exceptions are named and documented rather than hidden in selectors.
- [ ] Focused references, styleguide specimens, and production implementation agree.
