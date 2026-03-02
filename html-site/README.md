# HTML Site (Isolated Pipeline)

This folder contains the **original HTML site** — preserved for reference and fallback. It is fully self-contained: source, build scripts, and Rollup tooling live here. The primary surface for development and deployment is the **React app** at `react-app/app/`.

## First-time setup

From the **repo root**:

```bash
npm run install:all
```

This installs root, `react-app/app`, and `html-site` dependencies. Alternatively, from this directory:

```bash
cd html-site && npm install
```

## Development

From **repo root**:

- **Both pipelines:** `npm run dev` — React on 8012, HTML on 8001
- **HTML only:** `npm run dev:html` — serves `html-site/source/` on port 8001

From **this directory**:

```bash
npm run dev
```

Serves `source/` on port 8001 (Python HTTP server).

## Build

From **repo root:**

- `npm run html:build` — production (minified) build
- `npm run html:build:dev` — development (unminified + sourcemaps) build

From **this directory:**

```bash
npm run build      # production
npm run build:dev  # development
```

Output: `html-site/dist/` (gitignored).

## Scripts in this folder

- `scripts/build-watch.js` — watch `source/`, run build on change
- `scripts/live-reload-server.js` — SSE live reload (port 8003)
- `scripts/config-sync-server.js` — persist config panel changes to `source/config/`
- `scripts/verify-build-parity.js` — assert dist/ invariants

## Config sync

When developing the HTML site and you want slider changes to persist to `source/config/`, run the config sync server from this directory (see `docs/development/CONFIG-SYNC-USAGE.md`).
