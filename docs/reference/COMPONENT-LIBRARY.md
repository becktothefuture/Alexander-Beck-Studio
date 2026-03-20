# Component library

Live page: **`/styleguide.html`** (dev: open `styleguide.html` from the React app; production build emits `dist/styleguide.html`).

## Route top bar (mandatory for any top strip)

Treat the **route top bar** with the same rigidity as the **footer**: one shared structure, one set of classes, no page-local rewrites of padding, hover, or grid.

| Piece | Markup / class | Rule |
|--------|-----------------|------|
| Wrapper | `header.ui-top` | Same as other routes. |
| Row | `div.ui-top-main.route-topbar` (+ `portfolio-topbar` on portfolio **and** CV for shared spacing) | **CSS grid** `auto 1fr auto`, full width; top inset uses `calc(var(--gap-xs) + var(--portfolio-nav-top, 0px))` on those routes. |
| Left | `div.route-topbar__left` | Gate / back: `a.gate-back.abs-icon-btn`. |
| Center | `nav.route-topbar__center.ui-main-nav` (+ `portfolio-topnav` on portfolio **and** CV) | **All** primary text actions here: `MainNavLink` (→ `button.footer_link` + `span.footer-link-nowrap`) with real `id`s from content config. Portfolio: About me + Contact. CV: Portfolio + Contact. |
| Right | `div.route-topbar__right.ui-top-right` | `div#sound-toggle-slot.portfolio-sound-slot` on portfolio and CV. Sound mounts via `sound-toggle.js`. |

**Do not:** absolutely position the center column (breaks column 3 / mute alignment). **Do not** invent alternate text-button classes—only `MainNavLink` / `.footer_link` inside `.ui-main-nav` (plus `.abs-icon-btn` for glyphs).

**References:** `main.css` (`body.*-page .route-topbar`, `.ui-main-nav .footer_link`), `MainNavLink.jsx`, `PortfolioRoute.jsx`, `CvRoute.jsx`, `HomeRoute.jsx` (center strip uses `ui-main-nav` on `#main-links`).

## Primary actions (two families)

| Family | Markup | Notes |
|--------|--------|-------|
| **Text** | `<nav class="ui-main-nav">` + `<MainNavLink id="…">` (`react-app/app/src/components/MainNavLink.jsx`) | Renders `button.footer_link` + `span.footer-link-nowrap`. Home `#main-links`, portfolio/CV top bar, static templates. For a vertical stack, same nav + links; add a layout class (styleguide: `styleguide-main-nav--stack`). |
| **Icon** | `.abs-icon-btn` (+ `gate-back`, `sound-toggle`, `footer_icon-link` as needed) | Square glyph frame; sound from `sound-toggle.js`. |

CSS: `.ui-main-nav .footer_link` in `main.css`. **Do not** add `#contact-email:hover` / `#portfolio-modal-trigger:hover` to the generic `footer_link:hover` `color-mix` block: those IDs only exist on `.ui-main-nav` triggers, and an extra ID in that block can override the nav-specific hover ink in dark mode. Nav labels use `var(--cursor-hover-fg, …)` on hover/focus/active. **`--cursor-hover-fg` is stamped by the palette runtime** (`stampCursorCSSVar` / `maybeAutoPickCursorColor`). The styleguide bootstraps **`stampCursorContrastFromTheme()`** so the resolved theme `var(--cursor-color)` gets a WCAG-safe hover ink without running the full simulation.

## Icon frame

- `.abs-icon-btn` — square glyph frame (sound, gate back, social icons).
- Sound control is created at runtime by `sound-toggle.js`; the styleguide shows static markup for reference.

## Other patterns on the styleguide page

- `.legend` / `.legend__item` + `.circle.bg-ball-*`
- `.decorative-script` (intro blurb + inline link)
- `.abs-meta-btn` (time / location chip)

## Typography (styleguide)

The styleguide opens with a **Typography** section (see `StyleguideTypography.jsx`): font stacks (sans / mono / display), weight ramp, responsive **type scale** table (`--text-xs` … `--text-xl`, `--text-base`), and **semantic specimens** that mirror production selectors (hero title, legend, main nav, decorative blurb, caption, edge caption, quote puck, legend tooltip, gate modal, portfolio drawer slab, CV résumé block). CSS for specimens lives under `body.styleguide-page` in `main.css`. Extend this section when you add a new repeated text style.

Extend the styleguide route (`StyleguideRoute.jsx`) when adding a new repeated pattern so duplicates stay visible in one place.
