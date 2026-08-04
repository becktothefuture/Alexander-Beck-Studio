# Source assets

This directory holds working files, review exports, and inactive media that must not ship with the website.

- `portfolio/` preserves non-runtime portfolio evidence and media.
- `figma/` preserves design-tool exports that are not read by the website.
- `spatial-scan/` preserves source geometry used to generate runtime point clouds.
- `video/` preserves inactive video experiments. Its large archive folders stay untracked.
- `visual-reviews/` preserves design review boards and comparison exports.

Only optimized assets referenced by the production app belong in `react-app/app/public/`.
