# Alexander Beck Studio Website

Interactive portfolio website featuring a high-performance, physics-based bouncy balls simulation.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)

---

## Features

**Three Physics Modes**:
- 🎯 **Ball Pit** - Gravity-based collisions with mouse repeller
- 🕊️ **Flies to Light** - Swarm behavior attracted to cursor
- 🌌 **Zero-G** - Weightless bouncing with perfect elastic collisions

**Performance**:
- 60 FPS sustained with 200+ particles
- Spatial hashing for O(n) collision detection
- Dynamic canvas sizing per mode (33% optimization)
- Mobile-optimized with touch support

**Built With**:
- Pure vanilla JavaScript (zero dependencies)
- Canvas 2D API
- Fixed timestep physics (120Hz)
- 34.6 KB minified, ~12 KB gzipped

---

## Quick Start

```bash
# Clone repository
git clone https://github.com/yourusername/alexander-beck-studio-website
cd alexander-beck-studio-website

# Install
npm install

# Development
open source/balls-source.html
# or
npm start  # http://localhost:8000
```

---

## Controls

| Key | Action |
|-----|--------|
| `1` | Ball Pit mode |
| `2` | Flies mode |
| `3` | Zero-G mode |
| `R` | Reset simulation |
| `/` | Toggle control panel |
| Mouse | Interact with particles |

---

## Development

### Scripts
```bash
npm start      # Dev server (port 8000)
npm run build  # Production build
npm run watch  # Auto-rebuild
npm run clean  # Clean configs
```

### Workflow
1. Edit `source/balls-source.html` (development file with UI)
2. Test changes in browser
3. Tune parameters via control panel
4. Save config with "Save Config" button
5. Build: `npm run build` → outputs to `public/js/bouncy-balls-embed.js`

**See `docs/DEVELOPMENT.md` for detailed guide.**

---

## Project Structure

```
/
├── source/
│   ├── balls-source.html      # Development version
│   ├── build.js                # Build script
│   └── current-config.json     # Settings
├── public/
│   ├── index.html              # Production site
│   ├── css/bouncy-balls.css    # Styles
│   └── js/bouncy-balls-embed.js # Built JS (34.6 KB)
├── docs/
│   ├── OVERVIEW.md             # System overview
│   ├── MODES.md                # Mode specifications
│   ├── ARCHITECTURE.md         # Technical docs
│   ├── DEVELOPMENT.md          # Dev guide
│   ├── CANVAS-HEIGHT.md        # Dynamic canvas system
│   ├── PERFORMANCE.md          # Benchmarks
│   └── WEBFLOW-INTEGRATION.md  # Embedding guide
└── README.md                   # This file
```

---

## Documentation

| File | Purpose |
|------|---------|
| `docs/OVERVIEW.md` | High-level system overview |
| `docs/MODES.md` | Detailed mode specifications |
| `docs/ARCHITECTURE.md` | Technical architecture & code structure |
| `docs/DEVELOPMENT.md` | Development workflow & debugging |
| `docs/PERFORMANCE.md` | Benchmarks & optimization strategies |
| `docs/CANVAS-HEIGHT.md` | Dynamic canvas height system |
| `docs/WEBFLOW-INTEGRATION.md` | Webflow embedding guide |

**Start here**: `docs/OVERVIEW.md`

---

## Production Build

```bash
npm run build
```

**Output**: `public/js/bouncy-balls-embed.js`

**Integration**:
```html
<div id="bravia-balls">
  <canvas id="c" aria-label="Bouncy balls" role="img"></canvas>
</div>
<script src="js/bouncy-balls-embed.js"></script>
```

**See `docs/WEBFLOW-INTEGRATION.md` for embedding details.**

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

## Performance

| Mode | Balls | FPS | Status |
|------|-------|-----|--------|
| Ball Pit | 200 | 60 | ✅ Excellent |
| Flies | 300 | 60 | ✅ Excellent |
| Zero-G | 150 | 60 | ✅ Excellent |

**Overall Score**: 8.5/10

**See `docs/PERFORMANCE.md` for detailed benchmarks.**

---

## License

MIT License - see [LICENSE](LICENSE) file for details

---

## Contributing

Contributions welcome! See `docs/DEVELOPMENT.md` for code style and workflow.

```bash
git checkout -b feature/your-feature
# ... make changes ...
git commit -m "feat: your feature"
git push origin feature/your-feature
```

---

## Contact

Alexander Beck - [alexander@beck.fyi](mailto:alexander@beck.fyi)

---

**Built with physics and attention to detail** ⚛️
