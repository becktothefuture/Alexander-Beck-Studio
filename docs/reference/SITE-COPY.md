# Site copy ownership

This document is an index, not a duplicate copy deck. Edit the source named below.

| Surface | Source |
|---|---|
| Route paths, Button Bar labels, ARIA labels | `src/lib/routes.js` |
| Document titles and route descriptors | `src/components/app/SiteApp.jsx` and initial HTML titles |
| Home identity, legend, philosophy, edge captions | `public/config/contents-home.json` |
| Home footer edge/social content | `public/config/contents-home.json` → `SiteFooter.jsx` |
| Contact title, description, email, copied feedback | `contents-home.json.contact` → `ContactRouteContent.jsx` |
| Portfolio gate text | `contents-home.json.gates.portfolio` |
| Portfolio route blurb | `contents-home.json.portfolio` |
| Portfolio projects and media | `public/config/contents-portfolio.json` |
| About Me narrative copy, timing, and labels | `public/config/contents-about.json` |
| About Me contact destinations | `contents-home.json.contact` and `contents-home.json.socials` |

Visible casing is `About`. Structural UI labels belong in code; editable editorial prose belongs in the content JSON. Do not copy full project prose into Markdown—link to the source instead.
