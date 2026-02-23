# Legacy DOM Contract

These selectors are required by legacy runtime modules and must not be renamed during parity migration.

## Shared Required Anchors
- `#abs-scene`
- `#app-frame`
- `#modal-blur-layer`
- `#modal-content-layer`
- `#modal-modal-host`
- `#scene-effects`
- `#bravia-balls`

## Home Page
- `#c`
- `#main-links`
- `#brand-logo`
- `#edge-caption`
- `#cv-modal`, `#portfolio-modal`, `#contact-modal`

## Portfolio Page
- `#track`
- `#viewport`
- `#portfolioMeta`
- `#cv-modal`, `#contact-modal`

## CV Page
- `.cv-scroll-container`
- `.cv-right`
- `.cv-photo__image`
- `#portfolio-modal`, `#contact-modal`

## Notes
- React may refactor internal component boundaries, but these anchors must stay stable.
- Legacy bridge bootstraps expect these nodes to exist before import-time init.
