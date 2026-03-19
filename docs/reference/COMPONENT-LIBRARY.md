# Component library

Live page: **`/styleguide.html`** (dev: open `styleguide.html` from the React app; production build emits `dist/styleguide.html`).

## Route top bar (mandatory for any top strip)

Treat the **route top bar** with the same rigidity as the **footer**: one shared structure, one set of classes, no page-local rewrites of padding, hover, or grid.

| Piece | Markup / class | Rule |
|--------|-----------------|------|
| Wrapper | `header.ui-top` | Same as other routes. |
| Row | `div.ui-top-main.route-topbar` | **CSS grid** `auto 1fr auto`, full width, top inset from `main.css` (portfolio adds `--portfolio-nav-top` extra). |
| Left | `div.route-topbar__left` | Gate / back: `a.gate-back.abs-icon-btn`. |
| Center | `nav.route-topbar__center.ui-main-nav` | **All** primary text actions here: `button.footer_link` with real `id`s from content config. |
| Right | `div.route-topbar__right.ui-top-right` | `div#sound-toggle-slot` (optional `portfolio-sound-slot` on portfolio). Sound mounts via `sound-toggle.js`. |

**Do not:** absolutely position the center column (breaks column 3 / mute alignment). **Do not** use `portfolio-cv-link` in the strip—use `footer_link` + `ui-main-nav` so hover ink matches home `#main-links`.

**References:** `main.css` (`body.*-page .route-topbar`, `.ui-main-nav .footer_link`), `PortfolioRoute.jsx`, `CvRoute.jsx`, `HomeRoute.jsx` (center strip uses `ui-main-nav` on `#main-links`).

## Primary actions (merged)

| Use case | Markup | Notes |
|----------|--------|--------|
| Home center strip, portfolio/CV top bar | `<nav class="ui-main-nav">` + `<button class="footer_link" id="…">` | **Canonical** main text buttons. Same padding, hover ink (`--cursor-hover-fg`), and dark mode as `#main-links`. |
| CV column / stacked slim links | `.portfolio-cv-link` | Narrower pattern; **do not** use for route top bars (use `footer_link` + `ui-main-nav`). |

CSS: `.ui-main-nav .footer_link` in `main.css`. Legacy `#contact-email:hover` / `color-mix` rules are overridden inside `.ui-main-nav` so all three IDs match.

## Icon frame

- `.abs-icon-btn` — square glyph frame (sound, gate back, social icons).
- Sound control is created at runtime by `sound-toggle.js`; the styleguide shows static markup for reference.

## Other patterns on the styleguide page

- `.legend` / `.legend__item` + `.circle.bg-ball-*`
- `.decorative-script` (intro blurb + inline link)
- `.abs-meta-btn` (time / location chip)

Extend the styleguide route (`StyleguideRoute.jsx`) when adding a new repeated pattern so duplicates stay visible in one place.
