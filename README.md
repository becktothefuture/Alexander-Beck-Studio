# Alexander Beck Studio Website

**Kinetic canvas simulation fusing minimalist aesthetics with real-time particle physics**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)
![Quality](https://img.shields.io/badge/quality-95.8%2F100-brightgreen.svg)

---

## Design Philosophy & Visual Language

**Vibe:** Contemplative digital materialism — particles as tangible, physical entities inhabiting a minimal stage. The simulation evokes analog tactility through collision feedback, deformation squash, rotational momentum, and shadow depth while maintaining crystalline visual clarity. Time-based dark mode (sunset→sunrise) creates ambient environmental awareness, shifting from industrial concrete (#cecece) to deep charcoal (#0a0a0a) as natural light fades.

**Color Strategy:** Palette-driven illumination system with light/dark variants per theme. Industrial Teal (default) establishes weighted chromatic hierarchy: 50% dominant neutral, graduated secondary/tertiary accents (25%→15%→7.5%→2.5%), finishing with rare highlight punctuation. Each palette (Cobalt Spark, Ember, Mint, Lilac) maintains this distribution while expressing distinct emotional registers through hue relationships. CSS variables expose palette for page-wide design system coherence.

**Interaction Model:** Passive-primary with subtle agency. Cursor becomes ethereal repeller (Ball Pit), luminous attractor (Flies), or gentle perturbation field (Zero-G). Touch gestures translate to physics forces. Keyboard shortcuts (1-4, R, /) enable rapid mode switching. System respects `prefers-reduced-motion` by disabling animations gracefully.

**Motion Language:** Fixed-timestep physics (120Hz) ensures deterministic simulation across varied refresh rates (Safari 60fps, Chrome 120fps+). Collision deformation uses ballSoftness parameter (0=rigid billiards, 100=gelatinous). Rotational dynamics visualize tangential slip during impacts. Spatial grid partitioning enables O(n) collision detection for 300+ simultaneous particles at sustained 60fps.

**Technical Aesthetic:** Source-first development in single `balls-source.html` artifact. Configuration-driven behavior via JSON injection. Build pipeline extracts, minifies (66% compression → 49.9KB), and integrates into Webflow export. Zero external dependencies — pure Canvas 2D primitives orchestrated through requestAnimationFrame choreography. Defensive scoping (#bravia-balls container) prevents style cascade pollution in host document.

**Accessibility Posture:** ARIA labels for screen readers. Semantic keyboard navigation. Motion respect toggle. Console logging for developer introspection. Draggable control panel with collapsible sections. Numeric precision indicators (decimals for sensitive parameters). Export/import for configuration persistence.

**Conceptual Framing:** Computational physics as ambient medium rather than foregrounded spectacle. The simulation functions as digital wallpaper, conversational backdrop, or kinetic screensaver — always present, never demanding, eternally unique due to chaotic dynamics. Each reload randomizes initial conditions (mode selection, ball positions, velocities) ensuring perpetual novelty within constrained aesthetic vocabulary.

---

## Features

**Five Physics Modes:**
- 🎯 **Ball Pit** - Gravity-driven cascade with collision dynamics and cursor repulsion field
- 🕊️ **Flies** - Emergent swarm behavior with attraction to cursor luminance
- 🌌 **Zero-G** - Weightless elastic collisions in frictionless void
- 🔷 **Pulse Grid** - Choreographed grid-based pulsation with synchronized motion sequencing
- 🌀 **Vortex** - Orbital mechanics with dynamic gravity wells following mouse cursor

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

# Development (pick one)
npm run watch          # Terminal 1: Auto-rebuild on save
npm start              # Terminal 2: Serve on :8000, then refresh browser

# OR: Quick one-shot
npm run dev            # Build + serve on :8000

# Production Build
npm run build          # Full site (Webflow + simulation)
```

## Controls

| Key | Action |
|-----|--------|
| `1` | Ball Pit mode |
| `2` | Flies mode |
| `3` | Zero-G mode |
| `4` | Pulse Grid mode |
| `5` | Vortex mode |
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

### Live Development Workflow
```bash
# Terminal 1: Watch for changes
npm run watch

# Terminal 2: Serve production build
npm start              # http://localhost:8000
```
1. Edit files in `source/` (main.js, modules/**, css/**)
2. Save → auto-rebuilds to `public/` (~2 seconds)
3. Refresh browser (Cmd+R) to see changes
4. Tune parameters via control panel (`/` key)
5. Final build: `npm run build`

### All Commands
```bash
npm run watch          # Auto-rebuild on file changes (recommended)
npm start              # Serve public/ on :8000
npm run dev            # Build once + start server
npm run build          # Production build (Webflow + simulation)
npm run help           # Show all available commands
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
