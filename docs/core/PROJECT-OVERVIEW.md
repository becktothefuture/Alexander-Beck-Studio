# Project Overview

**High-performance interactive physics simulation with 10 distinct modes**

## What Is This?

A vanilla JavaScript particle physics system featuring:
- **Ball Pit** - Gravity-based collisions with mouse repeller
- **Flies to Light** - Swarm behavior attracted to cursor
- **Zero-G** - Weightless bouncing with perfect elastic collisions
- **Water** - Dense floating field with drag + ripple behavior
- **Vortex** - Orbital flow field (swirl + radial pull)
- **Ping Pong** - Side-to-side bounce with cursor obstacle
- **Magnetic** - Attraction/explosions with velocity limiting
- **Bubbles** - Rising bubble field with wobble + deflection
- **Tilt** - Cursor-driven tilt (visual tilt + matching gravity vector)
- **Kaleidoscope** - Mirror-wedge kaleidoscope rendering driven by cursor

**Design Philosophy:** Contemplative digital materialism — particles as tangible physical entities in a minimal stage. See README.md for complete vision.

## Key Features

### Performance
- 60 FPS sustained with 200+ particles
- Spatial hashing for O(n) collision detection  
- Dynamic canvas sizing (33% optimization)
- 34.6 KB minified bundle

### Physics
- Fixed timestep (120Hz)
- Realistic mass-aware forces
- Elastic collisions with angular momentum
- Mode-specific optimizations

### Design
- 5 color palettes with psychology
- Squash/stretch deformation
- Motion blur effects
- Mobile-responsive

## Architecture Highlights

**Core Components:**
- **Ball Class** - Physics entity with position, velocity, mass, color, spin
- **Physics Engine** - Fixed timestep integration, spatial hashing
- **Mode System** - Clean separation of mode-specific logic
- **Rendering** - Canvas 2D with optional WebGL acceleration

**Performance Optimizations:**
- Ball Pit: 150vh canvas (spawning space), spatial collision grid
- Flies: 100svh canvas (33% fewer pixels), no collision detection
- Zero-G: 100svh canvas, near-perfect elastic bounces

## Browser Support

| Browser | Status |
|---------|--------|
| Chrome/Edge 120+ | ✅ Excellent |
| Firefox 121+ | ✅ Excellent |
| Safari 17+ | ✅ Excellent |
| Mobile Safari iOS 15+ | ✅ Good |
| Chrome Android 12+ | ✅ Good |

## Performance Benchmarks

| Mode | Balls | FPS | Status |
|------|-------|-----|--------|
| Ball Pit | 200 | 60 | ✅ |
| Flies | 300 | 60 | ✅ |
| Zero-G | 150 | 60 | ✅ |

## Project Structure

```
/
├── source/              # Development files
│   ├── index.html           # Dev page (loads ES modules)
│   ├── main.js              # Entry point
│   ├── config/default-config.json
│   └── modules/**           # Core/modes/physics/rendering/ui/utils
├── public/              # Production output
│   ├── index.html       # Integrated page
│   ├── css/bouncy-balls.css
│   └── js/bouncy-balls-embed.js  # Built bundle
└── docs/                # Documentation
    ├── core/            # Essential docs
    ├── development/     # Dev guides
    ├── reference/       # Technical specs
    └── operations/      # Deployment
```

## Documentation Map

### For New Users
1. This file (PROJECT-OVERVIEW.md)
2. [QUICK-START.md](./QUICK-START.md)
3. [../reference/MODES.md](../reference/MODES.md)

### For Developers
1. [../development/DEVELOPMENT-GUIDE.md](../development/DEVELOPMENT-GUIDE.md)
2. [../development/ARCHITECTURE.md](../development/ARCHITECTURE.md)
3. [../reference/API.md](../reference/API.md)

### For Integrators
1. [../reference/INTEGRATION.md](../reference/INTEGRATION.md)
2. [../reference/CONFIGURATION.md](../reference/CONFIGURATION.md)

### For Operations
1. [../operations/DEPLOYMENT.md](../operations/DEPLOYMENT.md)
2. [../operations/PROJECT-ASSESSMENT.md](../operations/PROJECT-ASSESSMENT.md)

## Status

**Current Version:** 2.0  
**Quality Score:** 95.8/100 (A+)  
**Production Ready:** ✅ Yes  
**Test Coverage:** Manual testing  
**Bundle Size:** 34.6 KB minified

## Quick Commands

```bash
npm run start:source   # Modular dev page server
npm start              # Public server
npm run build          # Modular production build
npm run watch          # Auto-rebuild (modules)
```

## License

MIT License - See [LICENSE](../../LICENSE)

## Contact

Alexander Beck - [alexander@beck.fyi](mailto:alexander@beck.fyi)

---

**Next:** Read [../reference/MODES.md](../reference/MODES.md) to understand the available modes and keyboard shortcuts.

