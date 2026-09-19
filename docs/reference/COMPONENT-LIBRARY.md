# Component library

The live reference is `/styleguide.html`. It must describe production components, not retired specimens. Cross-route design intent and responsive policy live in [`DESIGN.md`](../../DESIGN.md).

## Primary navigation: Button Bar

`ShellButtonBar.jsx` renders the persistent bottom navigation from `SHELL_ROUTE_TABS` in `src/lib/routes.js`.

- Route buttons: Home, Work, About, Contact. Every route renders an accessible Tabler outline icon with a visible label.
- States: idle, hover/focus, pressed, active/current
- Secondary controls: none; theme and sound belong to the separate shell-owned Utility Rail
- Anatomy: four fixed matte pill faces with one full-size recessed active layer per face; no shared plate or moving highlight. The rectangular link hit area stays transparent, including unselected native `:active` states, independently of legacy stylesheet order.
- Placement: below the content window, with a complete reserved row and safe-area spacing; outside the scene-impact container. **Group top padding** and **Group bottom padding** each span 0–32px (defaults 8px/4px). They adjust the reserved outer space while preserving the 66px minimum targets and safe-area inset.
- Geometry: visible face height follows the authored navigation settings; 16px icon, at least 66px target including the label. Geist labels keep identical weight, spacing and position in every state.
- Settings: **Menu → Tactile navigation**, with collapsible **Resting light and shadow**, **Pressed light and shadow**, and **Advanced timing** groups. Edge strength and softness are independent; pressed depth controls upper inward shadow strength. `runtime.tactileNav*` in `public/config/design-system.json` is canonical; `src/lib/buttonBarControls.js` owns editor definitions, defaults and CSS projection. Design Mode uses the same registry.
- Interaction: native click/Enter activation, separate transient pointer pressure, single pending/selected latch, cancellation cleanup, browser-history restoration and visible keyboard focus. A small shadow-only rebound respects reduced motion and can be disabled.
- Mobile release retains face colour and icon ink through pointerup, click and the matching React selection commit. Cancellation clears the bridge; suppressed clicks time out after 500ms. Touch controls and descendants suppress selection, tap highlights and callouts. Utility hover applies only to fine, hover-capable pointers.
- Colour and audio: live palette slot references, fixed neutral idle material and contrast-selected icon ink. Quiet dry sounds share the engine, limiter, master volume and saved site mute preference.
- Depth scales the selected and held inward shadows. One CSS transition owns depth throughout press, release and interruption. Re-pressing continues from the visible shading without cancelling a competing animation. Pop strength adjusts the release curve; zero removes overshoot.
- Active colour uses a broad, stationary internal-light gradient, derived from the live palette. Internal light (0–0.12) and Colour falloff (0–0.4) are in **Pressed light and shadow**. A soft upper recess and low-strength lower shadow keep the face seated without a bright lower seam or heavy black foot. All light stays inside the existing silhouette; the resting material and window stay unchanged.
- **Surface Finish → Scene light & materials** supplies one light source and independent light/dark profiles. Global intensity, direction, softness and depth combine with each material's thickness, softness, shine and shadow. Window/Utility Rail, menu, balls/puck, in-window actions and cards/sheets use distinct calibrated responses. Even and 100% preserve the reference finish. Direction changes static shading, not geometry or interaction motion. The window has no dark-shadow control; semantic focus indicators remain independent.
- Wider faces use the existing horizontal-padding controls (16–80px desktop / 12–60px mobile; reset defaults are 46px / 28px). A bounded viewport adjustment widens desktop faces and keeps mobile faces compact. Outer row padding stops at 40px and faces compress on narrow screens, with diffuse edge falloff scaled to the window's soft light treatment. The window itself remains unchanged.
- Verification: `node scripts/audit-tactile-navigation.mjs` against production preview; screenshots and frame measurements are written to `output/playwright/tactile-navigation/`.

- Mobile regression: `ABS_NAV_URL=http://127.0.0.1:8013 node scripts/audit-mobile-button-press.mjs` tests Chromium/WebKit native taps, interrupted shading, rapid action taps, stable hit bounds, cancellation, themes, keyboard and reduced motion. Physical iOS callouts require a device check.

## Global utility controls: Utility Rail

- Component: `ShellUtilityRail.jsx` with shared behavior in `ShellUtilityControls.jsx`
- Position: fixed to the studio-window right edge; desktop centres at `50svh`, while mobile defaults to an outward `-11px` offset and a `76svh` centre
- Controls: theme above sound in one edge-integrated bay at every viewport width; icons, buttons, states, and event handlers remain shared
- Geometry: desktop uses `32px` visible buttons; mobile uses quieter `25px` visible buttons with proportionally scaled icons
- Contour: `ShellUtilityRail` measures the window and controls on resize/token changes. Two tangent cubic curves form each shoulder; the window and overlay hosts share the same clip, and the shell join uses that curve for its fill and soft light. The new lighting blends into the existing edge above and below the bay. Native window corners remain unchanged. The rail itself has no border, fill, or floating shadow. Short screens constrain the vertical anchor to preserve clearance. The curved segment reads the window’s three computed reflection layers, including colour, depth, softness and light direction. It shares the active theme/material profile, has no independent brightness floor or narrow stroke, and follows live controls and theme transitions without moving the contour.
- Configuration: the top-level **Utility Rail** group exposes separate **Desktop** and **Mobile** geometry, including the mobile vertical position. **Padding** (0–32px) and **Corner Radius** (0–80px, in 0.5px steps) adjust the integrated bay separately for each viewport group. Radius is constrained by the available panel height; the button faces and icons keep their existing styling.
- Accessibility: both buttons keep an accessible name, `aria-pressed`, and a visible focus ring; at the default mobile size, coarse-pointer hit regions expand invisibly to `44px` without overlapping
- Global keyboard: when no focused control or open modal owns the key, Left and Right Arrow activate the previous or next route with wraparound; Space advances the Home Daily Simulation
- Primary navigation never moves into a route top bar

### Interaction sound contract

Production DOM actions declare `data-sound-action="press|close|step|manual|none"` and a stable `data-sound-source`. The shell delegates `press`, `close`, and `step` once per click. Components that own drag thresholds, compound project opening, contact motifs, or history-based close paths use `manual` and call the shared interaction API only after the action commits. Hover and focus remain silent. Development editors, styleguide controls, and embedded content are outside this contract.

Home's Change effect control uses `manual`: its shared advance handler plays one `step` sound when a simulation switch is accepted, including button activation and the global Space shortcut. When sound is enabled, that user gesture unlocks or resumes audio so the first change after reload also has feedback. Busy or rejected requests stay silent. This avoids losing feedback when the control becomes `aria-disabled` before the delegated click listener runs, and preserves the sound engine's mute, volume, and reduced-motion rules.

## Utility icon buttons

`.abs-icon-btn` is the shared frame for back, sound, and other glyph-only utility actions. Every icon button needs an accessible name and visible focus treatment.

### Quiet control material

`ActionButton.jsx` is the reusable action control. It exposes `primary`, `secondary`, and `icon` variants. Copy email and LinkedIn compose the primary variant; the Home `SimulationFocusSwitcher` composes secondary. React close/back controls use the icon variant. The legacy Work drawer uses the same shared family selector and interaction handler.

`action-buttons.css` owns all material, hover, focus, pressure, release, hit-area, and reduced-motion rules. `useButtonInteractions.js` installs one delegated input handler per page; dynamic controls receive the same pointer and keyboard behavior without per-button hooks. `ActionLabel.jsx` reserves resting width while visible tracking tightens by 0.025em. Primary labels preserve sentence/brand case (Copy email, LinkedIn, Copied); only secondary labels transform to uppercase. Native cap-height trimming and a shared font-metric correction center visible ink, including descenders. Measurement runs only when label text, font loading or layout size changes; press/release remains CSS-only. Geometry and ink differences are variant variables, not separate interaction selectors.

Legacy icon/meta hover selectors explicitly exclude these families. In particular, an ID inside `:is()` raises the specificity of the whole selector and must never replace their transitions. Verify intermediate press/rebound frames and edge-light interpolation with `node scripts/audit-button-interactions.mjs` while the development server is running; endpoint geometry alone cannot detect a snapped transition.

The secondary variant follows the latest Home button on `origin/main`: 36px visible height, 20px horizontal padding, 10.5px Geist at weight 500, 0.09em tracking, and a vertically centered visible label using the shared font-metric correction. **CHANGE EFFECT** has no icon. Its resting label ink is 58% of the theme text color, increasing to 72% on hover and 82% under pressure. The invisible target extends to 48px before pressure, retaining at least 44px under the shared squash. Primary actions remain 48px high; icon controls default to 56px circles, with existing placement size tokens retained.

All variants share 16px backdrop blur, lighter paired inset edges, 2px hover lift, an 80ms down press (3px travel, 98% width / 92% height), and a damped 320ms release sampled from a spring response instead of coarse linear corners. Input stays within the original press bounds while the face moves; a true drag outside or cancellation releases it. Pressure preserves the resting fill and edge-light direction. A visible keyboard focus ring remains available. Reduced Motion removes movement and tracking change while retaining ink feedback. The global squircle option does not change these capsule/circle shapes.

Async operation state is separate from physical pressure: Home changes effect immediately and guards duplicate requests until its transaction finishes; release starts on input release. Copy retains its real clipboard operation, visible success/error, and live announcement. LinkedIn retains its real destination. Contact's background ripple starts on activation. The custom cursor keeps its existing contract.

The development-only `/lab/button-audit.html` renders these same components over a photo. Theme, blur, image selection and reset are local preview controls; defaults remain in `tokens.css` and the shared component stylesheet. The Home specimen changes only its local context, without saving a Home simulation choice. The old refresh icon, label handoff timers, mobile material fork, LinkedIn padding override, and per-control press hook are removed.

## Route top bars

Use `header.ui-top > .ui-top-main.route-topbar` only when a route or lab needs a back/local utility control. Keep left, center, and right slots structurally stable. Do not add a second set of route links.

## Typography and content specimens

The live styleguide covers Home hero/legend, Button Bar labels, supporting script copy, edge/meta copy, the Work gate and drawer, and centred Work/About/Contact route copy. Exact values come from tokens and production CSS rather than this document.

### Headline contract

Top-level route headlines use Instrument Serif through `--abs-font-headline`, optically scaled by `--abs-font-headline-scale`, with headline-specific leading and tracking tokens. The contrast with Geist is intentional: the serif creates a warmer, more editorial arrival while the rest of the interface stays precise and system-led.

- Allowed: the Home canvas title and `.route-centered-page__title` on Work, About, Contact, and the Work gate.
- Not allowed: navigation, descriptions, Work card titles, project-detail titles, controls, metadata, or general section headings.
- Possible future exception: a deliberately art-directed pull quote or case-study chapter opener. This requires explicit scope; it is not inherited by default.
- Implementation: reuse the existing headline selectors and the resolved `--route-entry-title-size` / `--route-bookend-title-size` roles with `--abs-font-headline`, `--abs-font-headline-line-height-scale`, and `--abs-font-headline-letter-spacing`. The CSS source resolves the optical scale; do not repeat it in component CSS.

Work, About, and Contact pair this title with `.route-centered-page__description.route-intro-description`. The shared modifier owns their description measure, leading, settled opacity, and balanced wrapping; route CSS owns only placement, animation progress, or an explicit responsive measure override. The Work access gate deliberately keeps the narrower base description measure.

Contact applies one intentional responsive override: its centred description uses 75% of the shared intro measure, capped at `37.8ch`. Its short title rule also uses a fluid optical offset that compensates for the Instrument Serif title's lower whitespace, keeping the rule visually midway between title and description from phone through desktop.

## Work item and presentation

The full Work experience is currently development-only. The default production route is **Coming soon.**; see the [route availability table](../../README.md#routes). These component patterns do not authorize changing that boundary.

Work renders one semantic ordered collection. Each logical item has one accessible button with a minimum 44px target, visible keyboard focus, a unique accessible name, and its label below or within the preview. Full case studies use the larger primary card treatment; snippets use the smaller exploration treatment. Repeated spatial copies remain `aria-hidden` and outside the tab order. Their pointer actions select the same logical item and preserve the tapped repeat; they must not create a second semantic item or active media owner. See `DecorativeWorldCopy` in `react-app/app/src/routes/playground/PlaygroundExperience.jsx`.

The snippet stage is a named `role="dialog"` inside the studio window. It uses one close control, traps focus, makes the world inert, and restores focus to the exact logical item after reversal. Image, video, and local code media keep their intrinsic aspect ratio. The field uses posters; only the selected media can own an active video or sandboxed code iframe. Case studies use the protected Work gate and existing full project drawer. See [`PORTFOLIO.md`](PORTFOLIO.md) and [`PLAYGROUND.md`](PLAYGROUND.md).

Resolved values come from the headline tokens. Project titles remain Geist so the route voice and the project-information hierarchy do not compete.
