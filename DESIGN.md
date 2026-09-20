---
status: active
sources:
  product: PRODUCT.md
  authored_config: react-app/app/public/config/design-system.json
  tokens: react-app/app/public/css/tokens.css
  components: docs/reference/COMPONENT-LIBRARY.md
  pattern_index: docs/reference/SITE-STYLEGUIDE.md
---

# Design system

## Purpose and scope

This is the design constitution for the Alexander Beck Studio website. It covers the shared shell and the four main routes: Home, Work, About, and Contact. The Work access gate, snippet stage, and case-study drawer are included as site patterns, subject to the publication boundaries in [README.md](README.md#routes). Their presence here does not mean they are publicly launched.

Standalone development labs, historical `playground` source names, dashboards, test fixtures, audit pages, and the live styleguide are not separate production routes or design evidence for this document. The styleguide is a verification surface for production patterns.

This file owns intent, cross-route rules, responsive policy, and exception governance. It does not replace the authored values in `react-app/app/public/config/design-system.json`, the runtime CSS tokens, or the focused technical contracts in `docs/reference/`.

[PRODUCT.md](PRODUCT.md) owns product purpose, audience, and the visitor journey. Use the repository [design-system-ui skill](.agents/skills/design-system-ui/SKILL.md) to apply these documents to a scoped UI task.

## Design thesis

The site is an engineered studio instrument with editorial warmth.

- Clean and precise, but never sterile.
- Playful through physical response, surprising behavior, and careful material detail rather than decorative clutter.
- Contemporary and authored: Instrument Serif creates an editorial arrival; Geist keeps the interface technically exact.
- Persistent and spatially reliable: the frame, window, Button Bar, Utility Rail, and outside shell read as one object.
- Restrained in its effects: color, blur, grain, depth, sound, and motion earn their place by clarifying hierarchy or interaction.
- Human at the edges: the quiet London clock, direct copy, and occasional irregular physical behavior soften the engineered structure.

The useful reference is the product-minded precision of Teenage Engineering, not a literal imitation of its typography, hardware, or skeuomorphism.

## Authority

| Concern | Authority | Rule |
| --- | --- | --- |
| Product intent, visitor jobs, and non-goals | `PRODUCT.md` | Keep visual decisions aligned with the approved product baseline. |
| Design intent and cross-route consistency | `DESIGN.md` | Change this when the design language changes. |
| Authored numeric values and configurable behavior | `react-app/app/public/config/design-system.json` | This is the only authored configuration. |
| Runtime CSS vocabulary and first-paint fallbacks | `react-app/app/public/css/tokens.css` | Consume semantic tokens; do not create parallel scales. |
| Shared shell and route composition | `StudioShell.jsx`, `main.css` | The shell is persistent; route content is replaceable. |
| Component anatomy and states | `docs/reference/COMPONENT-LIBRARY.md` | Components must match production markup and accessibility. |
| Current visual pattern index | `docs/reference/SITE-STYLEGUIDE.md` | Keep aligned with the live production styleguide. |
| Theme behavior | `docs/reference/THEME-STATE.md` | Implementation must also satisfy the locked boundary below. |
| Home canvas and title rendering | `CANVAS-RUNTIME.md`, `SIMULATION-DESIGN-GUIDELINES.md` | DOM and Canvas title geometry are one contract. |
| Work canvas, gate, snippet stage, drawer, and handoff | `docs/reference/PORTFOLIO.md`, `docs/reference/PLAYGROUND.md` | Preserve hierarchy, centre-before-open ordering, and reversal. |
| Motion rationale and implementation | `MATERIAL-PRESENCE.md`, `SCENE-ENTRANCE-PRINCIPLE.md`, `TRANSITION-ORCHESTRATION.md` | Rationale, visual rules, and state ownership remain separate. |

Generated configs, browser storage, and inline runtime state are outputs, not design sources.

## Production design artefacts

The system is distributed across these production surfaces. A design change is complete only when every affected path agrees.

| Artefact | Production source |
| --- | --- |
| Core tokens, type roles, spacing, radii, finish, and motion values | `public/config/design-system.json`, `public/css/tokens.css` |
| Stable simulation palette registry and shared time-of-day schedule | `src/palette/londonPalettes.js`, `src/palette/timeOfDayPalette.js` |
| Font loading and first-paint shell | `index.html`, `portfolio.html`, `about.html`, `contact.html`; `playground.html` is a Work compatibility entry |
| Persistent shell, surface slots, Home footer, overlay hosts, Button Bar, and Utility Rail | `StudioShell.jsx`, `ShellButtonBar.jsx`, `ShellUtilityRail.jsx`, `SiteFooter.jsx`, `main.css`, `shell-button-bar-dominant.css`, `shell-utility-rail.css` |
| Route names, visible navigation labels, and accent ownership | `src/lib/routes.js`, `shell-button-bar-dominant.css` |
| Home title, expertise legend, supporting copy, and simulation field | `HomeRoute.jsx`, `legacy/main.js`, `legacy/modules/rendering/`, `main.css`, `contents-home.json` |
| Work title, spatial catalogue, access gate, snippet stage, case-study drawer, and media handoff | `PortfolioRoute.jsx`, `PortfolioGateRoute.jsx`, `PlaygroundExperience.jsx`, `routes/portfolio/work/`, `legacy/modules/portfolio/`, `portfolio.css`, `contents-portfolio.json` |
| About public narrative and point world | `src/routes/about/AboutRoute.jsx`, `src/routes/about-narrative-lab/`, `public/config/contents-about.json` |
| Contact title, description, email action, ripple field, sound, and haptics | `ContactRouteContent.jsx`, `ContactRippleSimulation.jsx`, `contactRippleRenderer.js`, `contact-route.css`, shared centered-route CSS |
| Internal Work spatial engine, deterministic placement, depth field, media runtimes, and authoring controls | `routes/playground/`, `public/assets/playground/`, `docs/reference/PLAYGROUND.md` |
| Home footer social links, edge caption, and London time | `SiteFooter.jsx`, `main.css`, `contents-home.json` |
| Theme, frame, wall, noise, and browser harmony | `dark-mode-v2.js`, `site-shell.js`, `chrome-harmony.js`, `tokens.css` |
| Cursor states and pointer mapping | `cursor.js`, `main.css`, `CUSTOM-CURSOR.md` |
| Copy tone and content ownership | `docs/reference/TONE-OF-VOICE.md`, `docs/reference/SITE-COPY.md`, production content JSON |

App paths above are relative to `react-app/app/`; `docs/` paths are repository-relative. Bare filenames identify source modules and focused references; resolve them through the ownership map in `AGENTS.md` or repository search rather than assuming they sit at the app root.

## Foundations

### Typography

The core pairing is Instrument Serif plus Geist.

- Instrument Serif is the editorial route-entry voice. Use it for the Home title and top-level route-entry titles, including the Work introduction and gate, plus the explicit About sequence beats below.
- About uses Instrument Serif for every narrative title and Geist for editorial prose. Its local bookend title and prose scales are 1.2 and 1.42, with a 1.38 prose scale on mobile. Intermediate titles are 1.3 times their previous size (1.56 total scale) with a 12ch maximum measure. Their fade and depth travel share one layer to preserve perspective throughout the fade; lettering is prepared before layout measurement. Title duration uses untransformed text-line height, excluding protective ink padding. Prose uses open leading and snaps directly between its resting and full opacity as each line crosses the reading band, in either scroll direction. Titles travel vertically and in depth around their central viewport anchor and use the shared quick colour-draw entrance, staggered by line, restored from the August 17 implementation. Scroll controls the restored August 17 travel and exit; the finale settles and holds. Reduced motion settles the active title immediately. About uses the measured composition as its scroll-length target (approximately 13.5 desktop viewports at the current defaults). Content determines chapter length; large text and zoom may extend it to preserve reading access. Every title uses the same profile-specific physical travel duration, independent of chapter allocation or wrapping. Each title pair finishes at least half a viewport of scroll before the following prose first enters. Extra reading space belongs to the following gap and prose, not to the preceding title animation. All seven background scenes remain in order. Paragraphs use a 2.5rem gap on desktop and 2rem on mobile, with an additional break before listings and more open list rows. Large titles make conversational statements; small uppercase Geist eyebrows classify the prose as My background, Connecting disciplines, and How I work. Backfaces are hidden by default; the development Rendering panel exposes Show backfaces and saves it to the canonical About document.
- The Home identity, Work introduction, and Contact title share one viewport-stable bookend motion after a `500ms` pause. Individual letters appear in reading order through five instant colours sampled from the current ball palette. Dark mode orders each random sample from darkest to lightest; light mode reverses that order. Each glyph travels `10%` from left to right over the same `196ms` colour cycle, with `84%` overlap and no opacity fade or blur. Every palette frame renders at full opacity, then the final frame steps directly to the title's authored resting opacity. Home keeps its secondary lines at the quieter authored endpoint. Where a title uses the shared lockup, its short rule begins exactly when the final coloured letter settles, then scales from the centre while the rendered description lines fade in from top to bottom. The complete description rises on a long cubic ease-out while each line uses a slower, softer opacity curve, so the supporting elements decelerate as one gesture without splitting glyphs or changing kerning. Bookend motion never moves the title vertically, clips, or crops title glyphs. All four route identities use the shared `--route-bookend-title-size` at a `1.61568` optical scale and shared tighter headline leading. Reduced motion settles the complete hierarchy immediately.
- Geist is the structural voice for navigation, descriptions, controls, the Contact email action, Work cards, project names, project-detail titles, and ordinary headings.
- Geist Mono is operational: access inputs and compact technical labels. Work captions, client metadata, and case-study eyebrows use Geist, not Mono.
- The Home footer presents London and its local time as one quiet Geist metadata line.
- Do not inherit Instrument Serif through a section or route. Apply the headline role explicitly.
- Project titles stay Geist. The editorial route voice and the project-information voice must not compete.
- Work and Contact share one short title-colour rule and one ordered entrance: title, centre-out rule, then description. About retains the same lockup anatomy and shell-authored line-to-description gap, with its title opacity controlled by the Story sampler.
- Tracking and leading belong to named roles. Do not apply a broad optical correction and repair it component by component.
- The visible Home title is rendered by Canvas from the semantic DOM title's computed metrics. Font family, size, leading, tracking, wrapping, and font-load timing must remain synchronized.

Exact values live in the headline and text tokens. The design rule is scarcity and contrast, not a copied numeric type scale.

### Colour and surface ownership

The neutral structure carries the interface. Accent colors signal route, interaction, or simulation material; they are not general decoration.

- Preserve distinct layers for the browser/page band, outer wall, physical frame, studio-window interior, in-window finish, controls, and route content.
- Manual site theme affects the studio-window interior and the temporary in-window route cover at every viewport width. `auto` follows `prefers-color-scheme`; explicit light or dark choices persist across responsive changes. The exposed band, physical frame, direct-load boot preloader, and stable outer shell use opaque true black (`#000000`) in every site theme, browser scheme, browser family, and display gamut. The separate wall surface remains `#141414`. The SPA route cover must match `--studio-window-bg` and its spinner ink must resolve from the in-window text tokens.
- The Button Bar is four independent matte silicone pill faces on the invariant black outer shell, below and outside the studio window. Idle material is neutral and independent of the site theme. Selected colour references the live ball palette; labels and icons remain fixed.
- The Utility Rail is integrated into the studio window's right edge: one continuous contour bends inward above the controls, wraps around their left side, and returns below. The rail has no separate outer border, background, or floating shadow; a shell-owned curved join carries soft edge light and blends into the existing vertical edge. Desktop and mobile target a `20svh` vertical centre in the upper-right area. Both layouts reserve the top introduction height before the bay, using a `10rem` text reserve plus the existing control clearance. Below the mobile breakpoint, that reserve grows to `13rem` as the viewport narrows and the introduction wraps. The minimum stays the same across routes. Mobile keeps its quieter `25px` visible controls. Coarse-pointer hit areas expand invisibly to `44px` without allowing the two controls to overlap. The **Utility Rail** panel owns separate desktop and mobile padding, corner-radius, size, horizontal-position, and vertical-position controls; both horizontal ranges run from `-160px` to `160px`, the mobile size runs from `22px` to `44px`, the desktop vertical anchor runs from `10%` to `90%`, and the mobile anchor runs from `10%` to `90%`. The rail keeps its authored anchor where space permits; short viewports constrain it within the window and horizontal offsets cannot push it outside the viewport. The rail uses stable outer-shell ink and material in every theme, persists through route transitions, and never becomes part of route content or the Button Bar.
- In-window route accents remain stable: Home green, Work acid, About blue, and Contact orange.
- Simulation colours have one stable time-of-day owner. Bow / Worn Signal, Silvertown / Cobalt Voltage, Rye / After Closing, and Rye / After Closing (Turmeric) are the approved production set in `src/palette/londonPalettes.js`. Home, Work, About, and Contact consume the same resolved ball palette where route material needs it, update together on the eight three-hour boundaries at 00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, and 21:00 visitor-local time, and do not select route-, config-, fallback-, or URL-specific palette overrides. Work's restrained coloured depth dots use this same owner. The development editor can preview an available palette through that controller; reload restores the schedule.
- Neutrals dominate simulations. Use acid, blue, orange, and green as controlled focal material.
- Grain should make the window feel physical without muddying type or flattening surface separation.
- The frame/window join retains a clearly visible light edge: a surface-matched backing supports the clipped contour, a short light blend crosses the boundary into the halo, and broad reflected light reaches into the window. Smoothing the join must not dim or remove the exterior light. Do not add a dark perimeter stroke.
- Home UI legibility comes from five static, background-matched fields behind the expertise legend, philosophy, socials, edge caption, and London/time groups. Interaction changes foreground emphasis only; it does not animate or multiply the fields.
- All normal text must meet WCAG 2.2 AA contrast in both themes. Do not use opacity as the only way to create hierarchy when it makes the resolved color fail.

### Spacing and layout

- Use the existing 4px sub-unit and 8px rhythm for static endpoints. Tight icon/text pairings may use the smaller step.
- Reuse semantic gaps and content insets. Do not create a route-specific spacing scale.
- The studio window reserves the complete navigation target height plus spacing and safe area. Navigation never overlaps the window. The canonical `runtime.tactileNav*` settings are projected by `src/lib/buttonBarControls.js` into `--tactile-nav-*`; frame and content clearance consume the resulting reserve.
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
- The Work case-study drawer inherits the window geometry and reads as an inserted surface, not a detached modal.
- Do not add thin force lines, helper rings, or decorative outlines to explain simulation behavior.

### Iconography and controls

- Tabler Outline is the default icon language. Use custom SVG only where exact brand or control geometry is required.
- Every icon-only control has an accessible name, a visible keyboard focus state, and an effective target of at least 44px.
- Full-window scroll and drag regions keep keyboard access but never draw a focus ring around the studio-window perimeter. Move their focus cue to a compact in-window progress or interaction indicator.
- The Button Bar is the only primary navigation. Each native link has a 33px pill face, one full-size recessed active layer, a stationary 16px Tabler icon and a Geist label. The complete target is at least 66px high. Only inward shading changes under pressure; release has one small shadow rebound. No navigation geometry, icon or label moves. Pressure is independent of route selection. Valid click/Enter activation commits navigation; cancellation, drag-away, focus loss and secondary touches clear pressure. `aria-current` follows the committed route; one visual latch follows the pending destination. The row is outside the scene-impact transform.
- Route top bars are local utility/back strips only.
- Sound and haptics reinforce a state change but never carry its meaning alone.
- Production sound follows committed interaction, not hover or focus. Navigation uses a quiet dry actuation pop and a lighter unlatch through the existing engine, limiter and master volume. Site sound preference persists, defaults to muted and only unlocks audio through a user gesture. Navigation sound is independent of reduced motion; reduced motion removes the shading rebound. Other interaction recipes retain their existing behaviour.

#### Quiet control material and emphasis

The quiet material has exactly two reusable control families. `.abs-labelled-action` covers the Home simulation switcher and Contact/About email-copy and LinkedIn capsules. `.abs-circular-utility` covers the Work drawer return, Work access-gate close, and other in-window icon-only close controls. Both consume the semantic `--abs-soft-control-*` tokens; capsules contain labelled actions and circles contain icon-only close and return actions.

- The resting material uses one restrained translucent fill per studio-window theme. A 16px backdrop blur and gentle saturation preserve local context without flattening the material behind it.
- Every quiet control has no outer border and no drop shadow. Physical depth comes only from two complementary inset shadows: one sharp 0.5px light-facing edge and one softer occluded edge. The dark-theme light edge is 20% quieter than the approved audit prototype.
- Hover lifts the complete control by 2px with a bounded elastic settle. Keyboard focus lifts it by 1px and adds a clear 3px outline. Press moves it down by 3px and compresses it to 98% width / 92% height over 80ms. Release uses a damped 320ms rebound. Labelled controls keep a round capsule in every route, including when the global corner setting uses squircles. Primary capsules are 48px high. The latest Home secondary remains a 36px, icon-free capsule with 10.5px medium Geist, 0.09em tracking and a vertically centered label; an invisible target preserves 44px+ input reach under pressure.
- Contact copy keeps one fixed-width label window. The Copy email label exits upward and the Copied/check or error state enters from below using the shared restrained label motion. The Contact background ripple still starts in the same click frame; the retired contained colour wash is not part of the control.
- Do not stack a colored halo, glow, outer shadow, or second hover field on top of this material. State must remain calm and legible over moving simulation content.
- The custom cursor remains one consistent shadow-free translucent mid-gray lens in both site themes and over every control, including circular controls. Its only interactive response reduces the 57.6px lens to 20px (`scale(0.3472222)`) with `opacity: 0.72`; controls do not request a route-, overlay-, or geometry-specific cursor. Work keeps the resting lens over its keyboard-focusable drag surface and uses the smaller state only for nested project items and other true actions.
- The manual site theme owns these values because these controls live inside the studio window. Never derive them from the browser-aware wall or outer-frame palette.

The Home switcher is a labelled next action with a persistent, icon-free **CHANGE EFFECT** label. Activation requests the next simulation immediately. No extra label hold or width animation delays the next input. The current simulation remains available through the accessible name and live status. All action variants and quiet icon controls use `ActionButton`, `action-buttons.css` and one delegated input handler for the same pressure and release, with slightly tighter tracking inside a stable label width. Primary labels use sentence/brand case; only secondary labels use capitals. Labels center their visible ink rather than the font line box, including copy feedback states. Reduced motion removes the movement and tracking change, retaining fill, inset depth, and action feedback.

### Motion and material presence

- Manual theme changes use Afterglow: the studio-window surface settles in `313ms`, while the existing inner reflection and atmospheric material settle in `500ms`. Both start together on a smooth, bounded curve. The selected theme and toggle state commit immediately; repeated input reverses from the displayed appearance. A contrast-safe ink handoff keeps text readable, and grain strength follows the changing surface to avoid a mid-transition texture spike. The frame, wall, navigation geometry, and authored light/dark endpoints stay fixed. Boot, preference reconciliation, hidden documents, and Reduced Motion settle immediately. Theme changes reset atmosphere history; the tail comes from material interpolation, not retained source frames.
- The physical frame, window, Button Bar, Utility Rail, and outside shell remain present during route changes.
- Animate route-owned content inside the stable window.
- The first readable frame uses final geometry. Text must not become legible while still moving into its layout position.
- Entrance order is identity, context, action, then supporting detail. Returning from an interruption is faster and simpler than the first entrance.
- Hover and press motion should feel compact, tactile, and bounded. Shared action capsules use a visible downward squash, slightly tighter tracking within a stable label width, and a short damped release. Pointer/keyboard release owns the rebound; asynchronous actions never hold the material down.
- Reduced motion removes travel, blur, scale, stagger, parallax, continuous field motion, and Ken Burns effects while preserving hierarchy and state.
- Preserve selected media as the physical object during Work snippet and case-study expansion and reversal.

## Shared shell and route patterns

### Persistent shell

The shell is one stable instrument: exposed band, wall/frame geometry, studio-window host, Button Bar, Utility Rail, modal hosts, and Work sheet host. Page changes must not recreate or reanimate it; only the studio-window interior surface and content change theme. The social/time footer and edge caption are Home-owned content and are not shown on Work, About, or Contact.

### Home

- Home is the baseline for shell geometry, finish, content inset, and simulation material.
- The top composition is intentionally asymmetric: expertise at left, philosophy at right, identity centered in the field.
- The social/time footer and edge caption appear only on Home.
- The visible title belongs to the Canvas path; semantic DOM copy remains the metric and accessibility source.
- The settled/default simulation must leave all three title lines legible. Solve occlusion with density, placement, color, and motion—not text outlines, shadows, or a plate.
- Expertise filtering is a real interaction and must have full keyboard and assistive-technology semantics.

### Work

- Production is held at **Coming soon.** until a separate launch decision. This is a build-time route boundary with no URL, browser-storage, or password bypass. Development and the safe public development mirror render the full canvas below; production does not mount or prewarm it.
- Work is one exploratory canvas, not a separate Portfolio plus Lab. The public route label and experience name are both **Work**.
- The field has two clear hierarchies. Case studies use larger 4:5 image covers with no overlaid text, a strong title below, and supporting client / Case study metadata. Smaller image, video, and local-code snippets show one caption of at most five words. Longer rationale appears only below the open snippet.
- Case studies stay within a compact primary band rather than becoming billboard-scale. Every Work preview uses one generous rounded media edge. Hover changes only the quiet contact shadow and inset edge: the tile, image, and caption stay still, without nested zoom or colour shifts. Keyboard focus adds a 1px lift and a contrasting ring. Reduced Motion keeps the edge and shadow response but removes lift and scale.
- Work preview-image sizes derive from the usable viewport diagonal between authored mobile and desktop clamps. One uniform scale preserves the two hierarchies and intrinsic ratios. Narrow/short viewport fit safeguards remain categorical; captions, touch targets, open media, and drawer geometry do not inherit the preview scale.
- Project clearances grow with preview size and include the entire caption. Case studies and the title stay in the foreground; snippets move on a subtly slower depth plane without further shrinking their media or type. Packing protects the space between planes throughout panning and across repeat joins. Depth is camera-driven, never independent drift or frame-time collision avoidance. Reduced Motion removes relative project parallax while preserving the same spacing protection.
- The opening title belongs to the pannable world. Its description has a maximum 45ch measure, followed by a quiet Drag cue without an icon. Items surround it as a deliberate salon-like composition with enough initial peeking content to invite movement without overwhelming the identity.
- A restrained three-layer coloured depth field replaces the old flat grid. Its points have stable seeded world positions. Density and grid randomness are independent controls: zero randomness aligns the depth grids, one scatters each point within its cell including depth. Camera parallax has no independent drift and freezes for Reduced Motion. Culling and bounded sampling must not change point identity while panning.
- Pointer drag, touch, wheel/trackpad, arrows, WASD, and roving-item keyboard navigation share one unbounded logical camera. Visual repeats remain clickable while only one semantic item and media owner exist per project. Selection pins the exact tapped repeat, starts centering, and expands concurrently; it never substitutes a different repeat.
- Snippets preserve their intrinsic aspect ratio in a full in-window media stage. Only the media expands, using uniform scale and crop; captions never stretch. Closing reverses into the source. Case studies reuse the existing full studio-window drawer with a subtly translucent ground and uniform media handoff. The field stays mounted and inert behind either presentation; locking input does not cancel intentional centering already in progress.
- The route introduction and access gate use the editorial route-entry voice. Work cards, captions, snippet copy, and project-detail titles remain Geist.
- Every case study declares `access: "protected"`; missing or unsupported values fail closed. Snippets are public.
- The access gate appears only after a protected case study has centred. It stores one Work-wide grant, closes completely, then continues the exact pending case study. Dismissal restores the originating card and focus.
- The gate is client-side access friction, not secure authentication; truly private assets require server or edge enforcement.
- The drawer covers route content to the studio-window boundary above the separate Button Bar, supports native reading/selection behavior, and preserves focus restoration.
- Project-specific editorial treatments must be named content variants, not selector rules tied only to a project ID.
- Reduced Motion preserves hierarchy, centring, state, history, focus, and reversal while removing large spatial travel and parallax.

### About Me

> **20 September 2026 — publication held.** The development About experience uses simple Blender surfaces with browser-generated circles. The [surface specification](docs/plans/about-surface-authoring-20260919/PLAN.md) defines this ownership change. Technical checks do not establish Alexander's visual acceptance.

- Production shows the shared Coming soon title, separator and description. The full About journey, copy, typography and visibility controls remain development-only; URL parameters and browser storage cannot reveal them in production.
- The source is `source-assets/about-surface-world/about-surface-world.blend`. Author simple surface meshes, not individual balls or circle-centre vertices. One editable Bézier rail drives the camera and environment: static surfaces bend along normalized path stations; moving gates and the final wall follow fixed path anchors. Persistent circle architecture forms reading galleries, a round passage with twelve open hoops, a square-to-diamond passage with five open gates and an enormous final grid wall. Both passages retain enclosed entry and exit stretches. The gaps are authored physical space. The old London/overlook environment is not a fallback.
- Blender owns camera positions, tangent-facing sightlines, bank, physical beat boundaries, surface geometry, per-object colour roles and supported animation. Browser code generates circles at one code-owned spacing, defaults to 50% of Home's shared ball size, and applies one browser-owned visibility corridor, then plays the validated export. The browser uses a configurable lens multiplier and portrait cap, defaulting to 1× and 95 degrees; camera poses and the scene remain authored in Blender.
- The opening is a long, straight and level flight over a floor. Walls and gates begin at the first tunnel threshold. Later reading chambers use paired upright panels near the rail, with open floor sections between them. Two broad rail sweeps and zero authored tilt keep the camera steady. The saved Blender scene opens in camera view with timeline playback enabled and named chapter markers. One camera-depth visibility corridor fades circles close to the camera and in the distance. All surfaces, including the final wall, use the same four thresholds saved in design-system.json: hidden through 2 WU, clear from 7 to 9 WU and hidden beyond 22 WU. The shorter corridor keeps distant rooms from crowding the current view. Do not use scene-specific or progress-based visibility switches.
- Native scrolling owns camera progress. A monotone timing curve joins the different section speeds continuously and eases into the final stop; all authored beat boundaries remain exact. Text and history retain native progress. Measured copy can extend its reading budget without shortening either tunnel. A critically damped glide smooths camera travel, covering 95% of a scroll impulse in about 600 ms, and settles on the camera target for the native scroll position. Slow frames retain easing. Shorter travel-only gaps and prose budgets bring text sections closer together; title holds stay unchanged. Reversing scroll retraces the rail without overshoot; restored history and reduced motion bypass inertia. Independent, pause-aware ambient time drives the moving assemblies and final wall.
- Every title's visible glyph block remains centred at the inner viewport's 50%/50%, including the opening and ending. Titles use Home’s shared per-letter colour reveal on every new visit. A 1600px perspective carries them from 300px behind the reading plane to 210px in front; they do not bank or move horizontally or vertically. Opening and ending titles ease into the reading plane over 1400ms. Title sections receive 75% more native scroll distance through the canonical duration scale; they stay fully opaque until the final 10% of each title. Source camera boundaries and tunnel distances remain unchanged. Reduced Motion settles all letters immediately and removes title depth. Support and contact actions sit in their own area below. Full prose uses Geist in the central reading column. Original palette colours and gradients stay unmodified. Smaller circles and physical gaps preserve reading space.
- `public/config/contents-about.json` remains the canonical owner of all ten text fields, complete career/method prose, client marks and local typography. A reset must not shorten or hide factual content to satisfy pacing.
- Circles always face the camera and use Home's actual gradient atlas and active simulation palette. Sampling density remains browser-owned and defaults to approximately twice the previous surface density. Circle size and density have independent shared controls. `rollercoasterProjection.js` applies one viewport-calibrated diameter-to-pitch target of approximately 0.389 to all surfaces, using resize buckets and hysteresis. The shared Home sizing helper sets half the Home radius at a fixed 8-WU reference depth; normal perspective applies nearer and farther away. Resizing and Home's mobile size rule apply to every circle, including the final grid. Changing visibility does not change size. Each Blender object has one of six palette-role materials, or a seventh `All colours` marker. The browser replaces roles with the current Home palette; the marker mixes the existing six colours and adds no seventh browser colour. Both disciplines gate ribbons use the All colours material. Blender previews solid surfaces and their supported motion.
- The final approach is straight and level. The camera settles before one complete multicoloured grid plane; source-authored waves continue across it. Keep all cells and the continuous colour pattern behind the centred title. Do not recess or cut out a support bay. The ending support line uses primary text colour and the existing medium weight to remain readable over the circles. Do not add a title plate, outline or top-band composition.
- Supported motion is absolute-time axis rotation and an analytic depth wave. Blender and browser must agree at matching progress and ambient times. Unsupported motion fails export explicitly.
- Reduced Motion uses stable authored checkpoints and freezes ambient motion. The complete semantic story, keyboard navigation and Contact path remain available.
- The docked development controls edit website-owned copy, typography, visibility, lens framing, camera glide, circle size/density, environment playback speed and title legibility. Copy and type save to contents-about.json; scene controls save to canonical design-system.json runtime keys. A soft material-contrast reduction follows the measured active title and its support, including the ending; it preserves the full geometry, circle population and shared distance corridor. There is no title outline, shadow or opaque plate. The Scene controls button and / open the panel on authoring pages; edit=0 hides it. Camera rail, geometry, authored motion shape and source identity remain read-only in the browser; edit them in Blender, save and export. A verified manifest publication refreshes the development view. Hash mismatches show a readable fallback, never the rejected scene.
- Preserve source integrity, full copy, title centring, camera direction, animated clearance, history restoration, responsive fit and publication gates. Inspect real forward/hold/reverse sequences in both themes. A green build is not cinematic acceptance.

### Contact

- Contact uses the centered route-entry title, supporting description, and one primary email-copy action.
- Its supporting description is centred at 75% of the shared intro measure, capped at `37.8ch`, so the copy leaves more room for the ripple field at every width. The title rule uses a Contact-owned fluid optical offset: it sits midway between the visible title and description rather than merely inheriting equal box-model gaps.
- The ripple field is a route-specific motion behavior. Its balls use flat palette fills, create a quiet
  zone around content, and respond to the copy action.
- The email-copy action uses Geist within a borderless quiet-control capsule; its momentary pressed light starts with the background ripple, while copy success is expressed with visible text, icon state, sound, haptic feedback, and material motion.
- Contact retains the shared spacing/type roles even though its simulation and action are unique.

### Footer

- The footer is quiet edge metadata: social links, studio statement, and London time.
- On mobile, equal footer side tracks place the edge caption on the page centreline between the social controls and London time.
- Desktop keeps all three footer groups on one shared vertical centre line; individual groups do not use corrective vertical offsets.
- The studio statement is centered within its grid column, capped at 40rem on desktop and fitted to the caption column on mobile. Home uses a 2rem bottom inset, increasing only when the safe-area/content inset requires it.
- It remains subordinate to route content and must stay readable without becoming a second navigation bar.
- Work suppresses the Home-only edge caption.

## Simulation language

- Every semantic production ball that belongs to the shared sphere family uses its approved circle or pebble geometry with the cached matte material from the active time-of-day palette. Flat fill remains the guarded missing-material fallback.
- Route coverage is explicit: Home simulation bodies and the quote puck plus Contact ripple balls use the cached sphere finish. About's Blender surfels use the same resolved palette and broad physical atmosphere but retain their instanced point-cloud material so silhouettes, density, fog, and deep spatial layering remain legible. Work's depth dots and DOM work cards are not semantic balls.
- The cached sphere sticker/atlas finish is enabled in the canonical surface config. Renderers prewarm the active palette and reuse shared cached material; they do not build gradients, parse colours, or calculate lighting per body during a frame.
- Surface Finish owns a global light and independent light/dark profiles, with distinct responses for the window/Utility Rail, navigation, semantic balls/puck, in-window actions and cards/sheets. Thickness and softness change material shading, not layout or collision geometry. The rail consumes the window's computed reflection layers. Focus indicators and legibility masks remain independent of scene lighting.
- Bodies must be large enough to read as material and separated enough to preserve silhouette.
- Express force through motion, displacement, density, collision, and broad tonal fields.
- Do not use overlapping transparent circles, weather overlays, long decorative trails, thin vector fields, or generic particles as the main idea.
- Reduce body count before reducing readable body size.
- Exclusions are role-based, not shape-based. About surfels, the Work depth field, Work DOM cards, UI controls and indicators, the cursor, loaders, navigation, editorial dots, artwork circles, and atmosphere emitters keep their own materials. A circle does not inherit the sphere finish only because it is round.

### Shared simulation atmosphere

Home and Daily simulations, Work, About, and Contact share one shell-owned Crisp + Diffuse Glow material system. It unifies a wall-wide low-frequency colour field and crisp source material; it does not replace route-specific motion or flatten every route into the same simulation. A static inner-wall rim describes a soft all-around reflection inside the studio window. A paired two-layer outer-wall glow reflects that light onto the exposed wall: light mode is stronger, dark mode stays quieter, and the narrower mobile band uses a tighter configurable far layer so both falloff stages remain visible, while the black frame and wall geometry remain unchanged. The Button Bar replaces its original inset finish with independent near/far reflections; their default shifts contain the reflection along its upper inner edge. Shell grain and contrast finish remain independent and never intensify because the atmosphere is active.

- The source material remains the only direct colour layer. Glow is a broad projection of the current completed source frame. The shell rim remains neutral and static; it never samples ball colours or requires a full-window masked Canvas layer.
- Home preserves its Canvas title placement: ordinary material passes in front of the title, while the established depth modes may place stable material on both sides. Other routes keep readable DOM copy above their route material while the atmosphere remains continuous behind it.
- Work uses its completed depth-field Canvas, the full About narrative uses its live colour Canvas when available, and Contact uses its ripple Canvas. Canvas-less, suspended, error, and editorial-only states stay on the base studio-window surface; the compositor must not invent placeholder colour, glow, or simulated material for them.
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

Rows marked **Implemented** describe the current title and description families. Rows marked **Proposed** are not applied production changes.

| Status | Family | Merge | Exceptions to preserve |
| --- | --- | --- | --- |
| Implemented | Route-entry title | Shared `--route-entry-title-size`, `--route-bookend-title-size`, optical scale, and leading resolved in `public/css/main.css` for Home, Work intro/gate, About, and Contact | Home Canvas continues to read the DOM result; do not repeat the scale in component CSS. |
| Implemented | Route description | One continuous size token and one editorial measure/leading modifier shared by the Work, About, and Contact intros | The Work access gate keeps its narrower description measure. |
| Proposed | Centered route spacing | Shared content-only page padding, stack gap, description gap, and action gap tokens | Do not apply these tokens to the Button Bar, frame, deck geometry, or drawer handoff. |
| Proposed | Home support system | Replace repeated tablet/mobile selectors with semantic legend-size, supporting-size, and top-gap tokens | Column count and short-height layout remain structural breakpoints. |
| Proposed | Work card type | Local fluid client/title tokens | Keep Geist and preserve the primary/secondary hierarchy. |
| Proposed | Work detail title | Local continuous Geist title token | Named editorial variants may opt into documented alternatives. |
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
- Work placement anchors, centre-to-open geometry, drawer handoff geometry, and height-led project art direction.
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

Current intentional exceptions are the Home Canvas title, Home expertise composition, Work spatial hierarchy, Work media handoffs, Work access gate, and Contact ripple field.

## Outlier register and proposed resolutions

This register contains historical audit items, not permission for a broad refactor. The setup review on 31 August 2026 refreshed the source evidence for focus styling and Home expertise markup below; it did not complete a full accessibility audit. Other rows and their priorities still need current reproduction before they become implementation work. Resolve confirmed issues in small verified waves.

| Priority | Outlier | Evidence | Proposed resolution |
| --- | --- | --- | --- |
| Recheck (was P0) | Focus coverage needs a current browser audit | `public/css/main.css` now defines semantic `--abs-focus-ring-*` values and focus rules; earlier suppression rules alone do not establish the resolved state. | Verify visible focus on every affected control in both themes, including component overrides and focus restoration. Do not claim full coverage from source inspection. |
| Recheck (was P0) | Home expertise keyboard behavior needs verification | `src/routes/home/HomeRoute.jsx` now renders native buttons with `aria-pressed` and `aria-controls`; the earlier `div`-only finding is obsolete. | Confirm Enter/Space activation, pressed-state updates, and announcements in the real browser. Native markup alone does not prove the complete interaction. |
| P1 | Light supporting copy is likely under contrast | Muted text plus `0.64` opacity resolves near a 3.25:1 contrast on the common light interior. | Use an opaque semantic muted color or raise resolved contrast; verify real composited colors in both themes. |
| P1 | Config and CSS fallbacks disagree | Frame colors, desktop inset/radius, interior light color, and some motion fallbacks differ from authored config. | Generate critical first-paint fallbacks from `design-system.json` or share one endpoint builder. |
| P1 | Authored content-inset tokens do not own layout | `contentInset*` values are stamped, while runtime `contentPadding*` values drive the visible page. | Choose one endpoint contract and feed the same resolved value to CSS, overlays, and runtime geometry. |
| P1 | Project-detail title drops at `640→641` | The normal Geist title falls from roughly `61.6px` to `44.9px`. | Add a local continuous project-detail title bridge; do not use the route-entry serif. |
| P1 | Contact email and mobile type multiplier jump | Narrow email guard and global `--mobile-type-scale` switch values abruptly. | Replace local size switches with content-role fluid tokens while retaining structural breakpoints. |
| P1 | Work reading surface blocks selection | Global `user-select: none` is not restored in the drawer body. | Restore native selection/cursor behavior inside the reading surface; keep drag suppression on the spatial canvas only. |
| P2 | Global Geist tracking creates repair overrides | Body uses very tight global tracking; drawer and components reset it locally. | Default body to neutral tracking and apply named compact/normal/loose/mono/headline roles explicitly. |
| P2 | Project editorial style is tied to one ID | Extensive `chapter-7` selectors encode a reusable art direction as an exception. | Promote it to a named content variant and preserve the current output exactly during migration. |
| P2 | Tap-target token name is unsafe | `--abs-tap-target` resolves below the actual 44px control minimum. | Rename it for what it sizes or redefine it as the true minimum and separate glyph/frame sizes. |
| P2 | Token scope is broad and repetitive | Global token file mixes foundations, compatibility aliases, and component internals. | Do not rewrite wholesale; keep new global tokens semantic and move component tokens locally when that component is revised. |

## Verification

Every design-system implementation change starts with a production build and ends with visual inspection of the main pages.

Minimum matrix:

- Routes: Home, the production Work construction screen, development Work field/gate/snippet stage/case-study drawer, About, and Contact.
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
