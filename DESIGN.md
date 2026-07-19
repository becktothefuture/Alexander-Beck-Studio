# Design system

## Purpose and scope

This is the design constitution for the production Alexander Beck Studio website. It covers the shared shell and the four main routes: Home, Work/Portfolio, About Me, and Contact. The Portfolio gate and project drawer are included because they are part of the production route.

Labs, playgrounds, dashboards, test fixtures, audit pages, and the live styleguide are not design evidence for this document. The styleguide is a verification surface for production patterns.

This file owns intent, cross-route rules, responsive policy, and exception governance. It does not replace the authored values in `react-app/app/public/config/design-system.json`, the runtime CSS tokens, or the focused technical contracts in `docs/reference/`.

## Design thesis

The site is an engineered studio instrument with editorial warmth.

- Clean and precise, but never sterile.
- Playful through physical response, surprising behavior, and careful material detail rather than decorative clutter.
- Contemporary and authored: Instrument Serif creates an editorial arrival; Geist keeps the interface technically exact.
- Persistent and spatially reliable: the frame, window, Button Bar, and outside shell read as one object.
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
| Core tokens, palette, type roles, spacing, radii, finish, and motion values | `public/config/design-system.json`, `public/css/tokens.css` |
| Font loading and first-paint shell | `index.html`, `portfolio.html`, `about.html`, `contact.html` |
| Persistent shell, surface slots, Home footer, overlay hosts, and Button Bar | `StudioShell.jsx`, `ShellButtonBar.jsx`, `SiteFooter.jsx`, `main.css`, `shell-button-bar-dominant.css` |
| Route names, visible navigation labels, and accent ownership | `src/lib/routes.js`, `shell-button-bar-dominant.css` |
| Home title, expertise legend, supporting copy, and simulation field | `HomeRoute.jsx`, `legacy/main.js`, `legacy/modules/rendering/`, `main.css`, `contents-home.json` |
| Portfolio intro, orbital deck, project access gate, cards, project drawer, and media handoff | `PortfolioRoute.jsx`, `PortfolioGateRoute.jsx`, `legacy/modules/portfolio/`, `portfolio.css`, `contents-portfolio.json` |
| About Me scroll narrative, editorial sections, point field, and bust resolution | `AboutRoute.jsx`, `routes/about-narrative-lab/`, `about-narrative-lab.css` |
| Contact title, description, email action, ripple field, sound, and haptics | `ContactRouteContent.jsx`, `ContactRippleSimulation.jsx`, `contactRippleRenderer.js`, `contact-route.css`, shared centered-route CSS |
| Home footer signature, social links, edge caption, and London time | `SiteFooter.jsx`, `main.css`, `contents-home.json` |
| Theme, frame, wall, noise, contrast veil, and browser harmony | `dark-mode-v2.js`, `site-shell.js`, `chrome-harmony.js`, `tokens.css` |
| Cursor states and pointer mapping | `cursor.js`, `main.css`, `CUSTOM-CURSOR.md` |
| Copy tone and content ownership | `docs/reference/TONE-OF-VOICE.md`, `docs/reference/SITE-COPY.md`, production content JSON |

Paths above are relative to `react-app/app/` unless they start with `docs/`.

## Foundations

### Typography

The core pairing is Instrument Serif plus Geist.

- Instrument Serif is the editorial route-entry voice. Use it for the Home title and top-level route-entry titles, including the Portfolio intro and gate, plus the explicit About sequence beats below.
- About adds three deliberate display beats in the continuous spatial narrative: its opening, exact midpoint, and finale. All other travelling spatial titles stay in Geist at a smaller scale between display and editorial copy.
- Geist is the structural voice for navigation, descriptions, controls, Portfolio cards, project names, project-detail titles, and ordinary headings.
- Geist Mono is operational: kickers, metadata, access inputs, the Contact email address, and compact technical labels.
- The script face is a rare signature, principally the London mark. It is not another heading style.
- Do not inherit Instrument Serif through a section or route. Apply the headline role explicitly.
- Project titles stay Geist. The editorial route voice and the project-information voice must not compete.
- Tracking and leading belong to named roles. Do not apply a broad optical correction and repair it component by component.
- The visible Home title is rendered by Canvas from the semantic DOM title's computed metrics. Font family, size, leading, tracking, wrapping, and font-load timing must remain synchronized.

Exact values live in the headline and text tokens. The design rule is scarcity and contrast, not a copied numeric type scale.

### Colour and surface ownership

The neutral structure carries the interface. Accent colors signal route, interaction, or simulation material; they are not general decoration.

- Preserve distinct layers for the browser/page band, outer wall, physical frame, studio-window interior, in-window finish, controls, and route content.
- Manual site theme affects the studio-window interior only. The exposed band, physical frame, preloader, and stable outer shell use opaque true black (`#000000`) in every site theme, browser scheme, browser family, and display gamut. The separate wall surface remains `#141414`.
- The Button Bar belongs to the dark outer shell. Its unselected route tabs, sound, theme, and reset controls must not derive material or ink from the studio window or route body text. The active primary route pill is the explicit exception: it matches the resolved studio-window background and carries fully opaque inverse theme ink; unselected route labels remain visibly faded on the outer shell.
- Route accents remain stable: Home green, Work acid, About blue, Contact orange.
- Simulation colours have one time-of-day owner. Home, Work, About Me, and Contact consume the same resolved ball palette, update together on the eight three-hour boundaries at 00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, and 21:00 visitor-local time, and do not select route- or config-specific palette overrides.
- Neutrals dominate simulations. Use acid, blue, orange, and green as controlled focal material.
- Grain, vignette, and the contrast veil should make the window feel physical without muddying type or flattening surface separation.
- All normal text must meet WCAG 2.2 AA contrast in both themes. Do not use opacity as the only way to create hierarchy when it makes the resolved color fail.

### Spacing and layout

- Use the existing 4px sub-unit and 8px rhythm for static endpoints. Tight icon/text pairings may use the smaller step.
- Reuse semantic gaps and content insets. Do not create a route-specific spacing scale.
- The studio window always reserves the full Button Bar stack, separator, gap, padding, and safe-area inset.
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
- The Button Bar is the only primary navigation. Its moving pill is one shared object, not four independent selected backgrounds. Primary tab cells use their rendered label width plus inline padding; the pill follows that padded cell with a controlled rounded-rectangle radius. Home is the sole circular exception.
- Route top bars are local utility/back strips only.
- Sound and haptics reinforce a state change but never carry its meaning alone.

#### Quiet control material and emphasis

The Home simulation switcher, Portfolio drawer back control, and Contact email/copy action are one material family. They consume the semantic `--abs-soft-control-*` tokens while retaining their own pill, circle, or box geometry.

- The resting material follows the current studio-window theme, darkens its surface by no more than 5%, and remains translucent enough for the 18px backdrop blur and gentle saturation to preserve local context.
- The Home simulation switcher, chooser rows, and chooser close control keep their border geometry transparent in every state. Resting and interaction hierarchy comes from the translucent blurred fill, text/icon contrast, and opacity—not a visible hairline.
- Other quiet controls may use the 0.5px semantic edge at 12% opacity in the resting state and no more than 15% for hover, keyboard focus, pressed, open, or selected states.
- Emphasis is adaptive, not route-accented: use a translucent white field in light mode and a translucent black field in dark mode. Text and icons resolve through the current in-window text tokens.
- Hover, `:focus-visible`, and pressed states use the same emphasis fill, blur, saturation, and text/icon contrast. The Home switcher also keeps that state while its chooser is open.
- Do not stack a colored halo, glow, drop shadow, or second hover field on top of this emphasis material. State must remain calm and legible over moving simulation content.
- A circular material control owns one complete circle. The custom cursor lens yields while hovering the simulation chooser close control or Portfolio drawer back control; never nest a smaller cursor circle inside the control surface.
- The manual site theme owns these values because these controls live inside the studio window. Never derive them from the browser-aware wall or outer-frame palette.

Inside the simulation chooser, option rows are transparent at rest and retain transparent border geometry in every state. The current simulation, hovered option, keyboard-focused option, and pressed option use one identical emphasis material; the current row remains visibly emphasized before pointer interaction. The modal close control is anchored at the studio window's top-right corner using the same safe-area-aware inset as the Portfolio drawer's top-left back control. It is transparent at rest and uses the shared emphasis material on hover, keyboard focus, and press. Reduced motion removes transitions without removing any selected, focus, or hover-state contrast.

### Motion and material presence

- The physical frame, window, Button Bar, and outside shell remain present during route changes.
- Animate route-owned content inside the stable window.
- The first readable frame uses final geometry. Text must not become legible while still moving into its layout position.
- Entrance order is identity, context, action, then supporting detail. Returning from an interruption is faster and simpler than the first entrance.
- Hover and press motion should feel compact, tactile, and bounded.
- Reduced motion removes travel, blur, scale, stagger, parallax, continuous field motion, and Ken Burns effects while preserving hierarchy and state.
- Preserve selected media as the physical object during the Portfolio card-to-drawer handoff.

## Shared shell and route patterns

### Persistent shell

The shell is one stable instrument: exposed band, wall/frame geometry, studio-window host, Button Bar, modal hosts, and Portfolio sheet host. Page changes must not recreate or reanimate it; only the studio-window interior surface and content change theme. The social/time footer and edge caption are Home-owned content and are not shown on Portfolio, About Me, or Contact.

### Home

- Home is the baseline for shell geometry, finish, content inset, and simulation material.
- The top composition is intentionally asymmetric: expertise at left, philosophy at right, identity centered in the field.
- The social/time footer and edge caption appear only on Home.
- The visible title belongs to the Canvas path; semantic DOM copy remains the metric and accessibility source.
- The settled/default simulation must leave both title lines legible. Solve occlusion with density, placement, color, and motion—not text outlines, shadows, or a plate.
- Expertise filtering is a real interaction and must have full keyboard and assistive-technology semantics.

### Work / Portfolio

- “Work” is the Button Bar label; “Portfolio” is the route and experience name.
- The live route is an orbital, drag/scroll-controlled media deck available as the unauthorised preview. It is not a grid or a physics pit.
- The route intro and gate use the editorial route-entry voice. Card and project-detail titles remain Geist.
- Every project declares `access: "public" | "protected"`. Missing or unsupported runtime values fail closed as protected.
- The access gate appears only when an unauthorised visitor opens a protected project. It blurs the live deck inside the studio window, stores one Portfolio-wide grant, closes completely, then continues the exact selected card through the existing drawer handoff. Public projects bypass it.
- This gate is client-side access friction, not secure authentication; truly private assets require server or edge enforcement.
- The drawer covers route content, stops above the Button Bar, supports native reading/selection behavior, and preserves focus restoration.
- Project-specific editorial treatments must be named content variants, not selector rules tied only to a project ID.

### About Me

- About is one continuous scroll narrative inside the same physical window. The fixed point world and the text share one route-owned timeline; the shell, frame, and Button Bar remain stable.
- The narrative moves from a dense idea cloud through a calm field, a six-discipline grid, a living wave field, and a large point-cloud bust. These are transformations of one material, not separate decorative scenes.
- Two vertically scrolling editorial areas carry the background, client context, reflections on the practice, AI, and multidisciplinary synthesis. Spatial copy between them must advance the argument rather than act as detachable captions.
- Spatial titles use two explicit roles: standard Geist titles bridge the editorial passages, while Instrument Serif display titles punctuate only the opening, one midpoint beat, and the finale.
- The calm field moves through an explicit, paced two-stage camera pitch into a near-top-down grid; the closer framing must keep its material legible rather than miniaturising the points.
- As the first editorial area's client logos clear, the unchanged calm grid begins travelling screen-up behind the three spatial practice titles. The titles resolve before the discipline reveal begins; the grid must not reverse direction at either handoff.
- The six disciplines are named once through a world-linked reveal projected from exactly six emphasized grid points. Their colours are fixed to the Home simulation ball palette in category order: `--ball-1`, `--ball-4`, `--ball-3`, `--ball-7`, `--ball-8`, `--ball-6`. The labelled grid continues into the opening of the second editorial area, then the labels leave while the six points persist.
- The second editorial area follows that upward motion on one left-aligned measure. Its discipline copy uses one intentional highlighted phrase; the body remains unhighlighted. The final synthesis reconnects the surrounding grid before it becomes the living field.
- The discipline composition stays physically locked while labels and editorial copy resolve. Its handoff into the living field is one paced dolly-and-tilt into a closer oblique ocean view; that view then remains fixed through the complete ripple so the motion, not the lens, carries the beat.
- The epilogue separates formation from reframing: the grid first contracts into a recognisable bust while the camera holds, then the camera descends and tightens into the final portrait. The finale copy resolves with that arrival and holds without covering the sculpture.
- The bust is the quiet epilogue. It may rotate or respond horizontally, while the final profile, statement, and contact actions remain readable without covering the sculpture.
- The creative toolkit belongs to the development lab route with `?edit=1`. The production About route and production lab build use the same validated authored document but expose no tuning interface.

### Contact

- Contact uses the centered route-entry title, supporting description, and one primary email-copy action.
- The ripple field is a route-specific material behavior. It creates a quiet zone around content and responds to the copy action.
- The email address uses Geist Mono; copy success is expressed with visible text, icon state, sound, haptic feedback, and material motion.
- Contact retains the shared spacing/type roles even though its simulation and action are unique.

### Footer

- The footer is quiet edge metadata: social links, studio statement, and London time/signature.
- It remains subordinate to route content and must stay readable without becoming a second navigation bar.
- Portfolio may suppress the long edge caption where it would compete with the deck.

## Simulation language

- Use solid flat circles or approved pebble bodies as the primary material.
- Bodies must be large enough to read as material and separated enough to preserve silhouette.
- Express force through motion, displacement, density, collision, and broad tonal fields.
- Do not use overlapping transparent circles, weather overlays, long decorative trails, thin vector fields, or generic particles as the main idea.
- Reduce body count before reducing readable body size.
- Contact's concentric ripple field and Portfolio's deterministic speed field are intentional production exceptions because they retain the same solid-body palette and physical logic.

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
| Implemented | Route-entry title | One resolved `--route-entry-title-size` used by Home, Portfolio intro/gate, About, and Contact | Home and centered routes keep separate optical leading; Home Canvas continues to read the DOM result. |
| Proposed | Route description | One continuous size token and one optional editorial measure/leading modifier shared by Contact and Portfolio intro | About has no description yet; route copy may keep different content width where justified. |
| Proposed | Centered route spacing | Shared content-only page padding, stack gap, description gap, and action gap tokens | Do not apply these tokens to the Button Bar, frame, deck geometry, or drawer handoff. |
| Proposed | Home support system | Replace repeated tablet/mobile selectors with semantic legend-size, supporting-size, and top-gap tokens | Column count and short-height layout remain structural breakpoints. |
| Proposed | Portfolio card type | Local fluid client/title tokens | Keep Geist and preserve fixed card geometry/legibility. |
| Proposed | Portfolio detail title | Local continuous Geist title token | Named editorial variants may opt into documented alternatives. |
| Proposed | Contact email | Local continuous mono-size token across the narrow safeguard | Preserve 44px+ hit target and readable address wrapping. |

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

- Button Bar geometry, touch targets, safe-area offsets, dividers, and icon frames.
- Frame inset/radius; they already have a canonical endpoint interpolation.
- Portfolio orbital geometry, drawer handoff geometry, and height-led project art direction.
- Home short-height compression and narrow landscape safeguards.
- Borders, focus-ring widths, cursor rings, or motion timing.
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

Current intentional exceptions are the Home Canvas title, Home expertise composition, Portfolio orbital deck, Portfolio media handoff, Portfolio gate, Contact ripple field, and the London signature.

## Outlier register and proposed resolutions

These are implementation/documentation findings, not permission for a broad refactor. Resolve them in small verified waves.

| Priority | Outlier | Evidence | Proposed resolution |
| --- | --- | --- | --- |
| P0 | Focus visibility is broadly suppressed | Global and component `:focus-visible` rules remove outline/shadow in `main.css` and Button Bar CSS. | Define semantic focus-ring tokens, remove blanket suppression, and verify every main-page interactive state. |
| P0 | Home expertise is click-only | Legend items are `div` elements with JS click listeners. | Render buttons or add complete button semantics, Enter/Space handling, and pressed/expanded state without changing the visual design. |
| P1 | Light supporting copy is likely under contrast | Muted text plus `0.64` opacity resolves near a 3.25:1 contrast on the common light interior. | Use an opaque semantic muted color or raise resolved contrast; verify real composited colors in both themes. |
| P1 | Cursor contract disagrees | Instructions specify a 64px lens for detail/About/Contact/gates/modals; runtime uses 48px and defaults About/Contact to the dot. | Define one route/state matrix and one size token, then align JS, CSS, docs, and cursor audits. |
| P1 | Config and CSS fallbacks disagree | Frame colors, desktop inset/radius, interior light color, and some motion fallbacks differ from authored config. | Generate critical first-paint fallbacks from `design-system.json` or share one endpoint builder. |
| P1 | Authored content-inset tokens do not own layout | `contentInset*` values are stamped, while runtime `contentPadding*` values drive the visible page. | Choose one endpoint contract and feed the same resolved value to CSS, overlays, and runtime geometry. |
| P1 | Project-detail title drops at `640→641` | The normal Geist title falls from roughly `61.6px` to `44.9px`. | Add a local continuous project-detail title bridge; do not use the route-entry serif. |
| P1 | Contact email and mobile type multiplier jump | Narrow email guard and global `--mobile-type-scale` switch values abruptly. | Replace local size switches with content-role fluid tokens while retaining structural breakpoints. |
| P1 | Portfolio reading surface blocks selection | Global `user-select: none` is not restored in the drawer body. | Restore native selection/cursor behavior inside the reading surface; keep drag suppression on the deck only. |
| P2 | Global Geist tracking creates repair overrides | Body uses very tight global tracking; drawer and components reset it locally. | Default body to neutral tracking and apply named compact/normal/loose/mono/headline roles explicitly. |
| P2 | Project editorial style is tied to one ID | Extensive `chapter-7` selectors encode a reusable art direction as an exception. | Promote it to a named content variant and preserve the current output exactly during migration. |
| P2 | Raw component colors and fallback palettes drift | Contact/Portfolio surfaces and Contact ripple fallback duplicate color values. | Introduce local semantic component tokens and one shared palette fallback. |
| P2 | Tap-target token name is unsafe | `--abs-tap-target` resolves below the actual 44px control minimum. | Rename it for what it sizes or redefine it as the true minimum and separate glyph/frame sizes. |
| P2 | Token scope is broad and repetitive | Global token file mixes foundations, compatibility aliases, and component internals. | Do not rewrite wholesale; keep new global tokens semantic and move component tokens locally when that component is revised. |
| P3 | About narrative is still being authored | The production route now uses the canonical spatial narrative and protected point-world runtime; its copy and choreography remain an active editorial workstream. | Iterate through the development-only creative toolkit while preserving the shared shell and validated playback contract. |

## Verification

Every design-system implementation change starts with a production build and ends with visual inspection of the main pages.

Minimum matrix:

- Routes: Home, Work/Portfolio gate and unlocked deck, About Me, Contact, Portfolio drawer.
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
