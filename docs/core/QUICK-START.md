# Quick Start Guide

**Get running in 2 minutes**

## Installation

```bash
npm install
npm start
# Opens http://localhost:8000
```

## Controls

| Key | Action |
|-----|--------|
| `1` | Ball Pit mode |
| `2` | Flies mode |
| `3` | Zero-G mode |
| `/` | Toggle control panel |
| `R` | Reset |

## Development

1. **Edit**: `source/balls-source.html`
2. **Test**: Refresh browser
3. **Build**: `npm run build` (generates `public/` from `webflow-export/` + `source/`)

## Integration

```html
<div id="bravia-balls">
  <canvas id="c" aria-label="Bouncy balls"></canvas>
</div>
<script src="js/bouncy-balls-embed.js"></script>
```

## Documentation

- **Overview** → [`PROJECT-OVERVIEW.md`](./PROJECT-OVERVIEW.md)
- **Development** → [`../development/`](../development/)
- **Reference** → [`../reference/`](../reference/)
- **Operations** → [`../operations/`](../operations/)

---

**Next Steps:**
- New users → Read [PROJECT-OVERVIEW.md](./PROJECT-OVERVIEW.md)
- Developers → See [../development/DEVELOPMENT-GUIDE.md](../development/DEVELOPMENT-GUIDE.md)
- Integrators → See [../reference/INTEGRATION.md](../reference/INTEGRATION.md)

