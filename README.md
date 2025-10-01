# Alexander Beck Studio Website

**Interactive particle physics simulation with 3 distinct modes**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)
![Quality](https://img.shields.io/badge/quality-95.8%2F100-brightgreen.svg)

---

## Features

**Three Physics Modes:**
- 🎯 **Ball Pit** - Gravity-based collisions with mouse repeller
- 🕊️ **Flies to Light** - Swarm behavior attracted to cursor
- 🌌 **Zero-G** - Weightless bouncing with perfect elastic collisions

**Performance:**
- 60 FPS sustained with 200+ particles
- Spatial hashing for O(n) collision detection
- Dynamic canvas sizing (33% optimization)
- Mobile-optimized with touch support

**Built With:**
- Pure vanilla JavaScript (zero dependencies)
- Canvas 2D API
- Fixed timestep physics (120Hz)
- 45.5 KB minified

---

## Quick Start

```bash
# Install
npm install

# Development
npm start              # http://localhost:8000

# Production
npm run build
```

## Controls

| Key | Action |
|-----|--------|
| `1` | Ball Pit mode |
| `2` | Flies mode |
| `3` | Zero-G mode |
| `R` | Reset simulation |
| `/` | Toggle control panel |

---

## Documentation 📚

### **New Users** → Start Here
1. [Quick Start Guide](./docs/core/QUICK-START.md) - Get running in 2 minutes
2. [Project Overview](./docs/core/PROJECT-OVERVIEW.md) - Understand the system

### **Developers** → Development Guides
1. [Development Guide](./docs/development/DEVELOPMENT-GUIDE.md) - Workflow & debugging
2. [Architecture](./docs/development/ARCHITECTURE.md) - Technical deep dive

### **Integrators** → Reference Docs
1. [Integration Guide](./docs/reference/INTEGRATION.md) - Embed in your site
2. [Configuration](./docs/reference/CONFIGURATION.md) - All parameters
3. [Modes Reference](./docs/reference/MODES.md) - Physics specifications

### **Operations** → Deployment & Reviews
1. [Deployment Guide](./docs/operations/DEPLOYMENT.md) - Production deployment
2. [Project Assessment](./docs/operations/PROJECT-ASSESSMENT.md) - Quality review

### **AI Assistants** → Quick Reference
- [AI Agent Guide](./AI-AGENT-GUIDE.md) - Quick reference for AI assistants

---

## Project Structure

```
/
├── source/              # Development files (EDIT THESE)
│   ├── balls-source.html    # Main development file
│   ├── build.js             # Build script
│   └── current-config.json  # Configuration
├── public/              # Production output (GENERATED)
│   ├── index.html           # Integrated page
│   └── js/bouncy-balls-embed.js  # Built bundle (45.5 KB)
└── docs/                # Documentation
    ├── core/            # Essential docs
    ├── development/     # Dev guides
    ├── reference/       # Technical specs
    └── operations/      # Deployment & reviews
```

---

## Development

### Workflow
1. Edit `source/balls-source.html`
2. Test in browser (refresh to see changes)
3. Tune parameters via control panel (`/` key)
4. Save config with "Save Config" button
5. Build: `npm run build`

### Scripts
```bash
npm start              # Dev server (port 8000)
npm run build          # Production build
npm run watch          # Auto-rebuild on changes
npm run build-production  # Full Webflow integration
```

---

## Integration

### Minimal HTML
```html
<link rel="stylesheet" href="css/bouncy-balls.css">

<div id="bravia-balls">
  <canvas id="c" aria-label="Bouncy balls"></canvas>
</div>

<script src="js/bouncy-balls-embed.js"></script>
```

**See [Integration Guide](./docs/reference/INTEGRATION.md) for detailed instructions.**

---

## Performance

| Mode | Balls | FPS | Status |
|------|-------|-----|--------|
| Ball Pit | 200 | 60 | ✅ Excellent |
| Flies | 300 | 60 | ✅ Excellent |
| Zero-G | 150 | 60 | ✅ Excellent |

**Overall Score:** 95.8/100 (A+)

**See [Performance Benchmarks](./docs/development/ARCHITECTURE.md#performance-optimizations) for details.**

---

## Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome/Edge | 120+ | ✅ Excellent |
| Firefox | 121+ | ✅ Excellent |
| Safari | 17+ | ✅ Excellent |
| Mobile Safari | iOS 15+ | ✅ Good |
| Chrome Android | 12+ | ✅ Good |

---

## Contributing

Contributions welcome! See [Development Guide](./docs/development/DEVELOPMENT-GUIDE.md) for:
- Code style and patterns
- Git workflow
- Commit conventions
- Testing procedures

```bash
git checkout -b feature/your-feature
# ... make changes ...
git commit -m "feat: your feature"
git push origin feature/your-feature
```

---

## License

MIT License - see [LICENSE](LICENSE) file for details

---

## Contact

Alexander Beck - [alexander@beck.fyi](mailto:alexander@beck.fyi)

---

**Built with physics, performance, and attention to detail** ⚛️
