# Beach Ball Room Daily Route

Beach Ball Room is promoted into the catalog-backed daily rotation. The route is built as:

- `/lab/beach-ball-room.html`
- `/lab/beach-ball-room.html?daily=1`
- SPA alias in dev/build fallback: `/lab/beach-ball-room`

The simulation registry entry is `beach-ball-room`; `enabledInRotation` is derived from `react-app/app/src/data/simulationCatalog.json`, so it follows the `daily-rotation` stage automatically.

## GitHub Pages

This repo deploys `react-app/app/dist` through `.github/workflows/gh-pages.yml`. The Vite build emits the lab HTML file into:

```text
react-app/app/dist/lab/beach-ball-room.html
```

To review on the current Pages domain, use:

```text
https://beck.fyi/lab/beach-ball-room.html
https://beck.fyi/lab/beach-ball-room.html?daily=1
```

## Staging Subdomain

For a subdomain such as `beachball.beck.fyi` or `sim-beach-ball.beck.fyi`, point DNS at the same GitHub Pages host used by `beck.fyi`, then add a domain-level redirect or edge rewrite from:

```text
https://beachball.beck.fyi/
```

to:

```text
https://beck.fyi/lab/beach-ball-room.html
```

GitHub Pages supports one custom domain per Pages site, so a dedicated subdomain usually needs DNS plus a redirect/rewrite at the DNS/CDN provider unless the Pages site itself is moved to that subdomain.
