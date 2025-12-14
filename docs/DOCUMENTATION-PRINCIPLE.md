# Documentation as Source of Truth

**Core Principle:** Documentation in this project represents the **intended design and behavior** of the system, not merely a description of existing code.

## Why This Matters

Traditional approach:
1. Write code
2. Document what the code does
3. Code and docs drift over time

Our approach:
1. **Document the intended design**
2. Implement to match the documentation
3. If implementation must deviate, **update documentation first**

## Hierarchy of Authority

When there's a conflict between code and documentation:

1. **Documentation wins** (represents intended state)
2. Fix code to match documentation
3. If documentation is wrong, update it with clear justification

### Documentation Authority Levels

**AUTHORITATIVE (must match exactly):**
- `README.md` - Design philosophy and vision
- `docs/reference/MODES.md` - Physics specifications and behavior
- `docs/development/ARCHITECTURE.md` - Code structure and patterns
- `docs/reference/CONFIGURATION.md` - Parameter definitions

**GUIDANCE (should follow):**
- `docs/development/DEVELOPMENT-GUIDE.md` - Workflow recommendations
- `docs/reference/INTEGRATION.md` - Integration patterns
- `docs/operations/DEPLOYMENT.md` - Deployment procedures

**INFORMATIONAL (reference):**
- `docs/core/QUICK-START.md` - Quick reference
- `docs/operations/PROJECT-ASSESSMENT.md` - Quality metrics
- `AI-AGENT-GUIDE.md` - Quick AI reference

## Workflow

### When Making Changes

```
1. Read relevant documentation
   ↓
2. Understand intended design
   ↓
3. Implement to match specs
   ↓
4. Test against documented behavior
   ↓
5. If deviation needed → Update docs first
```

### When Documentation is Wrong

```
1. Identify the error
   ↓
2. Understand why it's wrong
   ↓
3. Update documentation with justification
   ↓
4. Commit with message explaining the correction
   ↓
5. Update cross-references if needed
```

## Examples

### Example 1: Adding a Feature

**Wrong approach:**
```javascript
// Just add code
function newFeature() {
  // implementation
}
```

**Correct approach:**
1. Check if feature aligns with design philosophy in README.md
2. Document intended behavior in appropriate doc
3. Implement to match specification
4. Verify implementation matches documentation
5. Update cross-references

### Example 2: Bug Fix

**Wrong approach:**
```javascript
// Fix breaks intended behavior
if (ballCount > 200) return; // Quick fix
```

**Correct approach:**
1. Check documented behavior in `docs/reference/MODES.md`
2. If bug violates documented behavior → fix to match
3. If documented behavior is wrong → update docs first
4. Implement fix that aligns with (updated) documentation

### Example 3: Performance Optimization

**Wrong approach:**
```javascript
// Optimize but change behavior
// Now balls move differently than documented
```

**Correct approach:**
1. Check performance targets in `docs/development/ARCHITECTURE.md`
2. Optimize while maintaining documented behavior
3. If behavior must change → update MODE specs first
4. Document the optimization in ARCHITECTURE.md

## Design Philosophy Example

The README.md states:

> **Vibe:** Contemplative digital materialism — particles as tangible, physical entities inhabiting a minimal stage.

This means:
- ✅ Collisions should feel physical and weighted
- ✅ Deformation (squash) should be visible
- ✅ Motion should have momentum and inertia
- ❌ Don't add flashy effects that distract
- ❌ Don't make particles feel like light sprites
- ❌ Don't clutter the minimal aesthetic

**Implementation aligns with philosophy or doesn't ship.**

## Mode Specifications Example

`docs/reference/MODES.md` specifies:

> **Ball Pit Mode**
> - Mass: 120g (realistic bouncy ball weight)
> - Gravity: 1.15× Earth gravity
> - Restitution: 0.80 (rubber balls)

This means:
- ✅ `ballWeight` default must be ~8.0 (120g equivalent)
- ✅ `gravity` default must be ~1.1-1.15
- ✅ `bounciness` default must be ~0.80-0.85
- ❌ Don't use random values
- ❌ Don't change without updating MODES.md
- ❌ Don't make balls feel like foam or metal

**Code parameters match documented specifications or docs are updated.**

## Architecture Patterns Example

`docs/development/ARCHITECTURE.md` defines:

> **Ball Class** - Single entity with position, velocity, mass, color, spin

This means:
- ✅ Use Ball class as defined
- ✅ Properties match documented structure
- ✅ Methods follow documented patterns
- ❌ Don't create parallel ball systems
- ❌ Don't store state outside Ball instances
- ❌ Don't change Ball structure without updating ARCHITECTURE.md

**Code structure matches documented architecture or architecture is updated.**

## Benefits

### For Development
- **Clear target** - Always know what the intended behavior is
- **Reduced ambiguity** - Specs are written down, not tribal knowledge
- **Better decisions** - Philosophy guides implementation choices
- **Easier reviews** - Compare to documented intent

### For Maintenance
- **No drift** - Code and docs stay aligned
- **Clear history** - Doc updates show intent changes
- **Easier debugging** - Compare actual vs intended behavior
- **Better onboarding** - New devs read docs to understand intent

### For Collaboration
- **Shared vision** - Everyone works toward documented design
- **Clear communication** - Docs are lingua franca
- **Less confusion** - One source of truth
- **Better alignment** - AI and human devs follow same specs

## For AI Assistants

When working on this project:

1. **ALWAYS read documentation before changes**
2. **Cite documentation** in explanations ("per MODES.md...")
3. **Verify alignment** with documented specs
4. **Flag conflicts** if code doesn't match docs
5. **Suggest doc updates** if specs should change
6. **Use evidence-based reasoning** with file/line citations

**Documentation >> Code** when determining intended behavior.

## Enforcement

**In Code Reviews:**
- ✅ Does change align with documented design?
- ✅ Are specs updated if behavior changed?
- ✅ Do commit messages reference relevant docs?
- ✅ Are cross-references maintained?

**In Pull Requests:**
- Link to relevant documentation sections
- Explain how change aligns with design philosophy
- Note any documentation updates made
- Justify any deviations from documented behavior

**In Commits:**
```bash
# Good commit messages
feat: add new mode per MODES.md specification
fix: ball physics now matches MODES.md restitution values
docs: update ARCHITECTURE.md to reflect new Ball properties

# Bad commit messages (missing doc context)
feat: add new mode
fix: collision bug
update architecture
```

## Summary

**Key Principle:** Documentation defines intended design. Code implements documentation. If they conflict, fix code or update docs (with justification).

**Authority:** README.md > reference docs > guidance docs > code comments

**Workflow:** Read docs → Implement to spec → Test against docs → Update docs if needed

**Benefit:** Clear vision, reduced drift, better alignment, easier maintenance

---

**See Also:**
- [AI-AGENT-GUIDE.md](../AI-AGENT-GUIDE.md) - Quick reference for AI assistants
- [.cursorrules](../.cursorrules) - Project rules
- [DOCUMENTATION-INDEX.md](./DOCUMENTATION-INDEX.md) - Complete doc navigation

**Last Updated:** October 2, 2025

