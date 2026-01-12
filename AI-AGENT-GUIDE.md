# AI Agent Guide

**Quick reference for AI assistants working on this project**

## 🎯 Project Context

**High-performance particle physics simulation** with 20 modes across 8 categories:
- **Gravity:** Ball Pit
- **Swarm/Flow:** Flies, Vortex, Magnetic, Critters
- **Elastic:** Zero-G (Weightless), Ping Pong
- **Fluid:** Water, Bubbles
- **Optical:** Kaleidoscope (+ 3 variants)
- **Orbital:** Orbit 3D, Orbit 3D (Tight Swarm)
- **Lattice:** Crystal Lattice, Neural Network
- **Parallax:** Parallax Linear, Parallax Perspective

See `docs/reference/MODES.md` for complete specifications.

## ⚠️ CRITICAL: Documentation is Source of Truth

**Before making ANY changes:**
1. **Read relevant documentation** - It defines the intended design
2. **Align with documented philosophy** - README.md defines the vision
3. **Match specifications** - `docs/reference/MODES.md` is authoritative for behavior
4. **Follow architecture patterns** - `docs/development/ARCHITECTURE.md` defines structure
5. **If docs conflict with code** - Fix code to match docs (or update docs with justification)

**Tech Stack:** Vanilla JavaScript, Canvas 2D, 120Hz fixed timestep  
**Performance:** 60 FPS with 200+ particles  
**Bundle:** 45.5 KB minified  
**Quality:** 95.8/100 (A+)

## 📁 Documentation Structure

```
docs/
├── development/       # Development workflow & config
│   ├── DEV-WORKFLOW.md
│   ├── CONFIG-SYNC-PLAN.md
│   └── CONFIG-SYNC-USAGE.md
└── reference/         # Specs & integration
    ├── MODES.md
    ├── CONFIGURATION.md
    ├── INTEGRATION.md
    └── PORTFOLIO.md
```

## 🚀 Quick Commands

```bash
npm run start:source   # Dev page server (http://localhost:8001)
npm start              # Public server (http://localhost:8000)
npm run build          # Modular production build
npm run watch          # Auto-rebuild on source changes
npm run help           # Show all commands
```

**Edit:** `source/main.js` + `source/modules/**`  
**Test:** Open `source/index.html`  
**Build:** `npm run build` → Complete site in `public/` (bundled + config inlined)

## 🎯 Common Tasks

### Understanding the Codebase
1. Read [README.md](./README.md) for project overview
2. Study [`docs/development/DEV-WORKFLOW.md`](./docs/development/DEV-WORKFLOW.md) for architecture
3. Review [`docs/reference/MODES.md`](./docs/reference/MODES.md) for mode specifications

### Making Changes
1. Edit `source/main.js` + modules or `source/config/default-config.json`
2. Test changes in browser (open `source/index.html` directly or use `npm run dev`)
3. Run `npm run build` to generate production site in `public/`
4. Test `public/index.html` via `npm start` (http://localhost:8000)
5. Follow [`docs/development/DEV-WORKFLOW.md`](./docs/development/DEV-WORKFLOW.md)

### Adding Features
1. Check [README.md](./README.md) and existing modules for patterns
2. Review [`docs/reference/CONFIGURATION.md`](./docs/reference/CONFIGURATION.md) for settings
3. Update relevant documentation
4. **Important**: When adding a new simulation mode:
   - Add to `MODES` in `source/modules/core/constants.js`
   - Add to `NARRATIVE_MODE_SEQUENCE` in `source/modules/core/constants.js` (for arrow key cycling)
   - Add to `NARRATIVE_CHAPTER_TITLES` in `source/modules/core/constants.js`
   - Create mode file in `source/modules/modes/`
   - Add UI controls in `source/modules/ui/control-registry.js`
   - Register in `source/modules/modes/mode-controller.js` (init logic, force applicator)
   - Document in `docs/reference/MODES.md`

### Debugging
1. Check [`docs/development/DEV-WORKFLOW.md`](./docs/development/DEV-WORKFLOW.md) for troubleshooting
2. Enable FPS counter (press `/` key to open panel)
3. Use browser DevTools Performance tab

## ⚠️ Critical Constraints

**Never Violate:**
1. **Documentation is authoritative** - Code must match documented design
2. **60 FPS minimum** - If change drops FPS, revert/optimize
3. **No localStorage for user text** - Privacy-first
4. **O(1) hot paths** - Physics/render loops constant time
5. **Mobile support** - Test on device emulation
6. **Zero npm dependencies** - Core is vanilla JS
7. **Accessibility** - Respect `prefers-reduced-motion`
8. **Edit source/**, never edit `public/` directly
9. **20 modes** - See `docs/reference/MODES.md` for complete list

## 🔧 Architecture Quick Reference

**Key Files:**
- `source/main.js` - Bootstrap entry point
- `source/modules/core/` - Constants, state management
- `source/modules/physics/` - Ball class, collision, engine, spawn, text colliders, wall state
- `source/modules/rendering/` - Renderer, loop, cursor, effects, theme
- `source/modules/modes/` - 20 mode implementations (ball-pit.js, flies.js, etc.)
- `source/modules/ui/` - Panel, gates, controls, brand interactions
- `source/modules/visual/` - Colors, dark mode, entrance animation, noise, wall frame
- `source/modules/audio/` - Sound engine and control registry
- `source/modules/input/` - Pointer tracking, overscroll lock
- `source/modules/utils/` - Accessibility, config, logger, performance, storage
- `source/config/default-config.json` - Runtime configuration
- `public/js/bouncy-balls-embed.js` - Production bundle

**Core Classes:**
```javascript
class Ball {
  x, y          // Position
  vx, vy        // Velocity
  r, m          // Radius, mass
  omega         // Angular velocity
  step(dt)      // Physics update
  draw(ctx)     // Render
  walls()       // Wall collision
}
```

**Physics Engine:**
- Fixed timestep: 120Hz (DT = 1/120)
- Spatial hashing: O(n) collision detection
- Elastic collisions with angular momentum

**Mode System:**
20 modes defined in `source/modules/core/constants.js`:
- Narrative sequence controlled by arrow keys (← / →)
- Each mode has unique physics, rendering, and interaction
- Mode switching preserved in narrative order (looping)
- See `docs/reference/MODES.md` for complete specifications

**Module Categories:**
```
source/modules/
├── core/          # Constants (MODES, NARRATIVE_MODE_SEQUENCE), state
├── physics/       # Ball.js, collision.js, engine.js, spawn.js
├── rendering/     # renderer.js, loop.js, cursor.js, effects.js
├── modes/         # 20 mode files (ball-pit.js, flies.js, etc.)
├── ui/            # Panel, gates, controls, keyboard, legends
├── visual/        # colors.js, dark-mode-v2.js, noise-system.js
├── audio/         # sound-engine.js, sound-control-registry.js
├── input/         # pointer.js, overscroll-lock.js
├── utils/         # Config, logger, performance, storage
└── portfolio/     # Portfolio carousel system (separate runtime)
```

## 📊 Performance Targets

| Mode | Max Balls | FPS | Canvas Height |
|------|-----------|-----|---------------|
| Ball Pit | 200 | 60 | 150vh |
| Flies | 300 | 60 | 100svh |
| Zero-G | 150 | 60 | 100svh |

## 🐛 Common Issues

**FPS drops:**
- Check ball count
- Profile physics loop
- Verify spatial hashing active
- Check for O(n²) loops

**Balls escaping:**
- Verify canvas dimensions
- Check wall collision logic
- Ensure PHYSICS_DT = 1/120

**Config not saving:**
- Check localStorage availability
- Verify autoSaveSettings() called
- Check JSON validity

## 📝 Code Style

**Naming:**
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Variables/functions: `camelCase`

**Comments:**
```javascript
// ╔════════════════════════════════════════════════════════╗
// ║                    SECTION NAME                        ║
// ╚════════════════════════════════════════════════════════╝
```

**Patterns:**
- ✅ Early returns, minimal nesting
- ✅ Minimal allocations in hot paths
- ✅ Descriptive names
- ❌ No deep nesting
- ❌ No allocations in physics loop

## 🧪 Testing Checklist

Manual testing required:
- [ ] All 20 modes accessible via arrow keys (← / →)
- [ ] 60 FPS stable across modes
- [ ] Mouse/touch interaction works
- [ ] Panel controls (key `/` to toggle)
- [ ] Mobile responsive (60% ball scaling, touch support)
- [ ] No console errors
- [ ] `prefers-reduced-motion` support
- [ ] Dark mode toggle works (auto/light/dark)
- [ ] Wall wobble system active (visual feedback on impacts)

## 🎓 Evidence-Based Reasoning

Always cite sources:
```
CLAIM: "Balls use requestAnimationFrame for smooth animation"
EVIDENCE: [source/balls-source.html, line 247]
CODE: `requestAnimationFrame(animate);`
CONFIDENCE: 95% (primary source)
```

## 🔗 External Resources

**MDN Docs:**
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Performance optimization](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)

**Physics:**
- [Fixed timestep](https://gafferongames.com/post/fix_your_timestep/)
- [Spatial hashing](https://www.gamedev.net/tutorials/programming/general-and-gameplay-programming/spatial-hashing-r2697/)

## 📞 Support

**Project Author:** Alexander Beck  
**Email:** [alexander@beck.fyi](mailto:alexander@beck.fyi)

**For AI Agents:**
- Prioritize evidence-based reasoning
- Read documentation before changes
- Verify performance impact
- Test manually (no automated tests yet)
- Ask clarifying questions if constraints unclear

---

**Read Next:**
- New to project? → [README.md](./README.md)
- Development workflow? → [`docs/development/DEV-WORKFLOW.md`](./docs/development/DEV-WORKFLOW.md)
- Mode specifications? → [`docs/reference/MODES.md`](./docs/reference/MODES.md)
- Configuration options? → [`docs/reference/CONFIGURATION.md`](./docs/reference/CONFIGURATION.md)
- Integration guide? → [`docs/reference/INTEGRATION.md`](./docs/reference/INTEGRATION.md)

**Last Updated:** January 6, 2025

