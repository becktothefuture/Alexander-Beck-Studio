# Development Workflow Guide

## Quick Start

**First-time setup:**
```bash
npm run install:all
```

**Daily development:**
```bash
npm run dev
```

This starts the React app on port `8012`.

**Production preview:**
```bash
npm run build
npm run preview
```

This serves the built React app on port `8013`.

---

## Development Modes Overview

| Mode | Command | Port | Best For |
|------|---------|------|----------|
| React dev | `npm run dev` | 8012 | Daily development with Vite HMR |
| React dev | `npm run dev:react` | 8012 | Same as `npm run dev` |
| React build | `npm run build` | — | Production build |
| React build (debug) | `npm run build:dev` | — | Unminified build with sourcemaps |
| React preview | `npm run preview` | 8013 | Manual QA against the built app |

---

## Source Of Truth

- App code: `react-app/app/src/`
- Public assets and config: `react-app/app/public/`
- Build output: `react-app/app/dist/`

The React app is the only supported pipeline in this repository.

---

## Common Workflows

### Daily development
```bash
npm run dev
```

Open `http://localhost:8012`.

### Pre-release verification
```bash
npm run lint --prefix react-app/app
npm run build
npm run preview
```

Open `http://localhost:8013`.

### Clean build output
```bash
npm run clean
```

---

## Troubleshooting

### Changes not showing in preview

```bash
npm run build
npm run preview
```

### Port already in use

```bash
lsof -ti:8012 | xargs kill -9
lsof -ti:8013 | xargs kill -9
```

### Build fails

```bash
rm -rf node_modules package-lock.json
npm install
npm install --prefix react-app/app
npm run build
```

---

## Related Documentation

- [README](../../README.md)
- [Configuration Reference](../reference/CONFIGURATION.md)
- [Mode Reference](../reference/MODES.md)
- [Integration Guide](../reference/INTEGRATION.md)
