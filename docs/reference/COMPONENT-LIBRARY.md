# Component library

Live page: **`/styleguide.html`** (dev: open `styleguide.html` from the React app; production build emits `dist/styleguide.html`).

## Route top bar (mandatory for any top strip)

Treat the **route top bar** with the same rigidity as the **footer**: one shared structure, one set of classes, no page-local rewrites of padding, hover, or grid.

| Piece | Markup / class | Rule |
|--------|-----------------|------|
| Wrapper | `header.ui-top` | Same as other routes. |
| Row | `div.ui-top-main.route-topbar` (+ `portfolio-topbar` on Portfolio) | **CSS grid** `auto 1fr auto`, full width. |
| Left | `div.route-topbar__left` | Gate / back: `a.gate-back.abs-icon-btn`. |
| Center | `div.route-topbar__center` or `nav.route-topbar__center.ui-main-nav` | Portfolio leaves this as a spacer. |
| Right | `div.route-topbar__right.ui-top-right` | Portfolio reserves this for optional route actions; shared sound/theme controls live in the Button Bar. |

**Do not:** absolutely position the center column (breaks column 3 / mute alignment). **Do not** invent alternate text-button classes—only `MainNavLink` / `.footer_link` inside `.ui-main-nav` (plus `.abs-icon-btn` for glyphs).

**References:** `main.css`, `MainNavLink.jsx`, `PortfolioRoute.jsx`, and `HomeRoute.jsx`.

## Primary buttons (two families)

| Family | Markup | Notes |
|--------|--------|-------|
| **Text** | `<nav class="ui-main-nav">` + `<MainNavLink id="…">` (`react-app/app/src/components/MainNavLink.jsx`) | Renders `button.footer_link` + `span.footer-link-nowrap`. Portfolio/CV route top bars use this family; home primary route controls use the Button Bar. Labels should be title case in the UI, including `About Me`. For a vertical stack, same nav + links; add a layout class (styleguide: `styleguide-main-nav--stack`). |
| **Icon** | `.abs-icon-btn` (+ `gate-back`, `sound-toggle`, `footer_icon-link` as needed) | Square glyph frame; sound from `sound-toggle.js`. |

CSS: `.ui-main-nav .footer_link` in `main.css`. **Do not** add `#contact-email:hover` / `#portfolio-modal-trigger:hover` to the generic `footer_link:hover` `color-mix` block: those IDs only exist on `.ui-main-nav` triggers, and an extra ID in that block can override nav-specific ink in dark mode. Nav labels lift to normal readable ink on hover/focus/active; hover-only states should not use `--cursor-hover-fg`, a cursor-coloured fill, or the in-window soft shadow field. `--cursor-hover-fg` remains available for selected/on surfaces that actually sit on `--cursor-color`.

## Icon frame

- `.abs-icon-btn` — square glyph frame (sound, gate back, social icons).
- Sound control is created at runtime by `sound-toggle.js`; the styleguide shows static markup for reference.

## Other patterns on the styleguide page

- `.legend` / `.legend__item` + `.circle.bg-ball-*`
- `.decorative-script` (supporting description copy + inline link)
- `.abs-meta-btn` (time / location chip)

## Typography (styleguide)

The styleguide opens with a **Typography** section (see `StyleguideTypography.jsx`): font stacks (sans / mono / display), weight ramp, responsive **type scale** table (`--text-xs` … `--text-xl`, `--text-base`), and **semantic specimens** that mirror production selectors (hero title, legend, main nav, supporting description copy, caption, edge caption, quote puck, legend tooltip, gate modal, portfolio drawer slab, CV résumé block). CSS for specimens lives under `body.styleguide-page` in `main.css`. Extend this section when you add a new repeated text style.

Extend the styleguide route (`StyleguideRoute.jsx`) when adding a new repeated pattern so duplicates stay visible in one place.
