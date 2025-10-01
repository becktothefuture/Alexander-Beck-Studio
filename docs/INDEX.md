# Documentation Index

Welcome to the Bouncy Balls Simulation documentation. This guide will help you navigate all available documentation based on your needs.

---

## For New Users 👋

**Start here**: [`OVERVIEW.md`](./OVERVIEW.md)
- What this project is
- The three modes explained
- Quick start guide
- Performance benchmarks

**Then explore**: [`README.md`](../README.md) (project root)
- Quick reference tables
- Installation instructions
- Controls and keyboard shortcuts

---

## For Developers 💻

### Getting Started
1. **[`DEVELOPMENT.md`](./DEVELOPMENT.md)** - Complete development workflow
   - Setup and installation
   - Development workflow (edit → test → build)
   - Debugging common issues
   - Advanced topics (adding modes, custom forces)
   - Code style and contributing guidelines

### Understanding the System
2. **[`ARCHITECTURE.md`](./ARCHITECTURE.md)** - Technical deep dive
   - Ball class and physics engine
   - Collision detection (spatial hashing)
   - Rendering pipeline
   - Mode system architecture
   - Data flow and event handling

3. **[`MODES.md`](./MODES.md)** - Mode specifications
   - Ball Pit: Gravity physics
   - Flies to Light: Swarm behavior
   - Zero-G: Weightless bouncing
   - Mode comparison matrix
   - Implementation details

### Optimization & Performance
4. **[`PERFORMANCE.md`](./PERFORMANCE.md)** - Benchmarks and optimization
   - Performance benchmarks per mode
   - Key optimizations explained
   - Before/after comparisons
   - Profiling data
   - Future opportunities

5. **[`CANVAS-HEIGHT.md`](./CANVAS-HEIGHT.md)** - Dynamic canvas system
   - Why mode-specific canvas heights
   - CSS and JavaScript coordination
   - Coordinate systems explained
   - Benefits and trade-offs

---

## For Integration 🔧

**[`WEBFLOW-INTEGRATION.md`](./WEBFLOW-INTEGRATION.md)** - Embedding guide
- HTML structure required
- CSS for dynamic height
- Script inclusion
- Webflow-specific instructions
- Troubleshooting common issues

---

## Documentation Map

```
docs/
├── INDEX.md                    ← You are here
├── OVERVIEW.md                 ← Start here for high-level intro
├── MODES.md                    ← Mode specifications & physics
├── ARCHITECTURE.md             ← Technical architecture & code
├── DEVELOPMENT.md              ← Dev workflow & debugging
├── CANVAS-HEIGHT.md            ← Dynamic canvas height system
├── PERFORMANCE.md              ← Benchmarks & optimization
└── WEBFLOW-INTEGRATION.md      ← Embedding guide
```

---

## Quick Reference by Task

### I want to...

**...understand what this project does**
→ [`OVERVIEW.md`](./OVERVIEW.md)

**...set up my development environment**
→ [`DEVELOPMENT.md`](./DEVELOPMENT.md) (Quick Start section)

**...understand how a specific mode works**
→ [`MODES.md`](./MODES.md)

**...understand the code architecture**
→ [`ARCHITECTURE.md`](./ARCHITECTURE.md)

**...debug a performance issue**
→ [`PERFORMANCE.md`](./PERFORMANCE.md) + [`DEVELOPMENT.md`](./DEVELOPMENT.md) (Debugging section)

**...embed this in my website**
→ [`WEBFLOW-INTEGRATION.md`](./WEBFLOW-INTEGRATION.md)

**...understand the canvas height system**
→ [`CANVAS-HEIGHT.md`](./CANVAS-HEIGHT.md)

**...add a new physics mode**
→ [`DEVELOPMENT.md`](./DEVELOPMENT.md) (Advanced Development section) + [`ARCHITECTURE.md`](./ARCHITECTURE.md)

**...optimize performance**
→ [`PERFORMANCE.md`](./PERFORMANCE.md)

**...contribute to the project**
→ [`DEVELOPMENT.md`](./DEVELOPMENT.md) (Contributing section)

---

## Documentation Principles

Each document follows these principles:

1. **Unique**: No duplicate information across files
2. **Directional**: Clear purpose and target audience
3. **Informative**: Detailed explanations with code examples
4. **Representative**: Reflects current implementation
5. **Structured**: Consistent formatting with clear sections

---

## External Resources

- [MDN Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Game Loop Patterns](https://gameprogrammingpatterns.com/game-loop.html)
- [Physics Engine Design](https://www.toptal.com/game/video-game-physics-part-i-an-introduction-to-rigid-body-dynamics)

---

## Need Help?

1. **Check the docs** - Most answers are here
2. **Review the code** - `source/balls-source.html` is well-commented
3. **Debug tools** - See [`DEVELOPMENT.md`](./DEVELOPMENT.md) debugging section
4. **Contact** - alexander@beck.fyi

---

**Happy coding!** ⚛️

