# AI Agent Guide

**Quick reference for AI assistants working on this project**

## 🎯 Project Context

**High-performance particle physics simulation** with 4 modes:
- Ball Pit (gravity + collisions)
- Flies (swarm behavior)
- Zero-G (weightless bounce)
- Pulse Grid (synchronized grid motion)

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
├── core/              # Start here
│   ├── QUICK-START.md
│   └── PROJECT-OVERVIEW.md
├── development/       # Code & architecture
│   ├── ARCHITECTURE.md
│   └── DEVELOPMENT-GUIDE.md
├── reference/         # Specs & integration
│   ├── MODES.md
│   ├── CONFIGURATION.md
│   └── INTEGRATION.md
└── operations/        # Deployment & reviews
    ├── DEPLOYMENT.md
    └── PROJECT-ASSESSMENT.md
```

## 🚀 Quick Commands

```bash
npm start              # Dev server
npm run build          # Production build
npm run watch          # Auto-rebuild
```

**Edit:** `source/balls-source.html`  
**Test:** Refresh browser  
**Build:** `npm run build` → `public/js/bouncy-balls-embed.js`

## 🎯 Common Tasks

### Understanding the Codebase
1. Read [`docs/core/PROJECT-OVERVIEW.md`](./docs/core/PROJECT-OVERVIEW.md)
2. Study [`docs/development/ARCHITECTURE.md`](./docs/development/ARCHITECTURE.md)
3. Review [`docs/reference/MODES.md`](./docs/reference/MODES.md)

### Making Changes
1. Edit `source/balls-source.html`
2. Test in browser
3. Run `npm run build`
4. Follow [`docs/development/DEVELOPMENT-GUIDE.md`](./docs/development/DEVELOPMENT-GUIDE.md)

### Adding Features
1. Check [`docs/development/ARCHITECTURE.md`](./docs/development/ARCHITECTURE.md) for patterns
2. Review [`docs/reference/CONFIGURATION.md`](./docs/reference/CONFIGURATION.md) for settings
3. Update relevant documentation

### Debugging
1. Check [`docs/development/DEVELOPMENT-GUIDE.md`](./docs/development/DEVELOPMENT-GUIDE.md) troubleshooting
2. Enable FPS counter (press `/` key)
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
9. **4 modes (not 3)** - Ball Pit, Flies, Zero-G, Pulse Grid

## 🔧 Architecture Quick Reference

**Key Files:**
- `source/balls-source.html` - Single-file development version
- `source/build.js` - Build script
- `source/current-config.json` - Configuration
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
```javascript
const MODES = {
  PIT: 'pit',          // 150vh, collisions, gravity
  FLIES: 'flies',      // 100svh, no collisions, attraction
  WEIGHTLESS: 'weightless' // 100svh, collisions, no gravity
};
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
- [ ] All 3 modes work (keys 1, 2, 3)
- [ ] 60 FPS stable
- [ ] Mouse/touch interaction
- [ ] Panel controls (key `/`)
- [ ] Mobile responsive
- [ ] No console errors
- [ ] `prefers-reduced-motion` support

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
- New to project? → [`docs/core/PROJECT-OVERVIEW.md`](./docs/core/PROJECT-OVERVIEW.md)
- Making changes? → [`docs/development/DEVELOPMENT-GUIDE.md`](./docs/development/DEVELOPMENT-GUIDE.md)
- Need technical details? → [`docs/development/ARCHITECTURE.md`](./docs/development/ARCHITECTURE.md)

**Last Updated:** October 1, 2025

