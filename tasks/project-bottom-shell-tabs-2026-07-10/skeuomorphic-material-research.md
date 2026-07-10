# Skeuomorphic Material Research

## Direction

The button treatment should feel tactile and realistic without becoming heavy or novelty-styled. The site already uses dark shell surfaces, refined rim lighting, and subtle depth. The bottom tabs should extend that language with physical controls that look machined into the lower band.

## Material Model

Use a restrained faux-3D stack:

- Structural bottom band: dark shell surface with a top bevel, subtle inner shadow, and clear separation from the inner wall.
- Button body: dark raised pill with a low-relief lip.
- Border: 1px border gradient, brighter at top-left and darker at bottom-right.
- Inner shine: thin inset top highlight.
- Inner shade: lower inset shadow to imply thickness.
- Outer shadow: small contact shadow plus a broader soft shadow.
- Active state: button sits lower, top inset becomes darker, lower lip becomes stronger.
- Light: a tiny under-label indicator inside the button, centered below the icon/text.

## CSS Structure

Recommended scoped classes:

- `.shell-bottom-band`
- `.shell-tab-nav`
- `.shell-tab`
- `.shell-tab__icon`
- `.shell-tab__label`
- `.shell-tab[aria-current="page"]`
- `.shell-tab[data-state="pending"]`

Recommended pseudo-elements:

- `.shell-tab::before` for the physical button body.
- `.shell-tab::after` for the under-label machine light.

Label/icon content should stay above material layers with `position: relative; z-index: 1`.

## Suggested Tokens

- `--shell-bottom-band-height`
- `--shell-bottom-band-bg`
- `--shell-bottom-band-shadow`
- `--shell-bottom-band-top-bevel`
- `--shell-tab-bg`
- `--shell-tab-bg-hover`
- `--shell-tab-bg-active`
- `--shell-tab-border-gradient`
- `--shell-tab-inner-shine`
- `--shell-tab-inner-shadow`
- `--shell-tab-outer-shadow`
- `--shell-tab-pressed-shadow`
- `--shell-tab-light-color`
- `--shell-tab-light-opacity`
- `--shell-tab-light-active-opacity`

## State Rules

### Default

The default tab should already look finished: raised, tactile, and softly lit. It should not wait for hover to look designed.

### Hover

Hover should slightly clarify the bevel and shadow, not flood the button with the old cursor-color fill. A small lift or brighter top edge is enough.

### Focus Visible

Focus must remain accessible. Use a visible ring or outline tied to `--cursor-color`, with enough contrast and offset to avoid being lost in the bevel.

### Active Route

Active route means selected and pressed:

- Button moves down 1px or visually compresses.
- Inner top shadow increases.
- Outer contact shadow becomes tighter.
- Under-label light turns on.
- `aria-current="page"` is present.

### Pointer Down

Momentary pointer-down state can press slightly deeper than active route, but text/icon should move at most 1px.

### Pending

For transition or gate-entry pending, keep the tab active for the route. If needed, pulse the indicator very subtly and respect `prefers-reduced-motion`.

## Under-Label Light

Suggested geometry:

- Width: `clamp(14px, 45%, 34px)`
- Height: `2px`
- Position: near the bottom interior edge
- Radius: `999px`
- Color: `color-mix(in srgb, var(--cursor-color) 72%, white 28%)`
- Default opacity: around `0.18`
- Hover opacity: around `0.35`
- Active opacity: `0.75` to `0.9`

The glow should read like an indicator LED, not a bloom.

## Constraints

- Do not apply the new skeuomorphic style globally to all `.footer_link` surfaces without a migration plan.
- Keep portfolio drawer above the new bottom band.
- Keep safe-area handling on mobile.
- Avoid heavy frosted glass or large glows.
- Keep all tab text fitting at small widths.

