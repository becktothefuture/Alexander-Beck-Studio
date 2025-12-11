# Build System Improvement Proposal
## Problem: Distributed Configuration Values

### Current Architecture Issues
1. **Multiple Sources of Truth**: Values defined in 4 places (JS, JSON, HTML, Presets)
2. **No Validation**: Build doesn't check for conflicts
3. **Manual Synchronization**: Requires updating multiple files manually
4. **Silent Failures**: Wrong slider defaults shown without errors

---

## Proposed Solution: Config-First Architecture

### Phase 1: Build Validation (Quick Win)
Add validation step to `build-production.js`:

```javascript
// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATE CONFIGURATION CONSISTENCY
// ═══════════════════════════════════════════════════════════════════════════════
function validateConfig(sourceHTML, config) {
  const issues = [];
  
  // Extract JS default values
  const jsDefaults = {
    sizeScale: sourceHTML.match(/let sizeScale = ([\d.]+)/)?.[1],
    emitRate: sourceHTML.match(/const EMIT_INTERVAL = ([\d.]+)/)?.[1],
    maxBalls: sourceHTML.match(/let MAX_BALLS = (\d+)/)?.[1]
  };
  
  // Extract HTML slider defaults
  const sliderDefaults = {
    sizeScale: sourceHTML.match(/id="sizeSliderGlobal"[^>]*value="([\d.]+)"/)?.[1]
  };
  
  // Check JS vs Config
  if (jsDefaults.sizeScale && config.ballScale && 
      parseFloat(jsDefaults.sizeScale) !== parseFloat(config.ballScale)) {
    issues.push({
      type: 'MISMATCH',
      severity: 'ERROR',
      message: `Ball size mismatch: JS=${jsDefaults.sizeScale}, Config=${config.ballScale}`,
      locations: ['modules defaults', 'default-config.json']
    });
  }
  
  // Check HTML slider vs Config
  if (sliderDefaults.sizeScale && config.ballScale &&
      parseFloat(sliderDefaults.sizeScale) !== parseFloat(config.ballScale)) {
    issues.push({
      type: 'MISMATCH',
      severity: 'WARNING',
      message: `Slider default (${sliderDefaults.sizeScale}) doesn't match config (${config.ballScale})`,
      locations: ['panel HTML', 'default-config.json']
    });
  }
  
  // Check physics presets for overrides
  const presetMatches = sourceHTML.matchAll(/sizeScale:\s*([\d.]+)/g);
  const presetSizes = [...presetMatches].map(m => parseFloat(m[1]));
  const nonStandardSizes = presetSizes.filter(s => s !== parseFloat(config.ballScale));
  
  if (nonStandardSizes.length > 0) {
    issues.push({
      type: 'OVERRIDE',
      severity: 'INFO',
      message: `${nonStandardSizes.length} physics presets override global ball size`,
      detail: `Preset sizes: ${[...new Set(nonStandardSizes)].join(', ')}`
    });
  }
  
  return issues;
}
```

### Phase 2: Auto-Sync HTML from Config (Recommended)

Generate HTML slider defaults from config:

```javascript
function syncHTMLDefaults(sourceHTML, config) {
  let html = sourceHTML;
  
  // Sync ball size slider
  if (config.ballScale) {
    const value = config.ballScale;
    html = html.replace(
      /(<span class="val" id="sizeValGlobal">)[\d.]+(<\/span>)/,
      `$1${value}$2`
    );
    html = html.replace(
      /(id="sizeSliderGlobal"[^>]*value=")[\d.]+(")/,
      `$1${value}$2`
    );
  }
  
  // Sync other sliders...
  // (repeat for maxBalls, emitRate, etc.)
  
  return html;
}
```

### Phase 3: Preset Inheritance (Advanced)

Make physics presets inherit global values unless explicitly overridden:

```javascript
const PHYSICS_PRESETS = {
  rubberPlayground: { 
    label: 'Rubber – Playground', 
    G: 1960, 
    REST: 0.90, 
    FRICTION: 0.0025, 
    // sizeScale: INHERIT,  // Use global value
    maxBalls: 450, 
    sizeVariation: 0.20 
  },
  customSuperball: {
    label: 'Custom Superball',
    G: 1960,
    REST: 0.95,
    sizeScale: 0.8,  // Explicit override for this preset only
    maxBalls: 600
  }
};

function applyPreset(presetName) {
  const preset = PHYSICS_PRESETS[presetName];
  // Only apply sizeScale if explicitly defined
  if (preset.hasOwnProperty('sizeScale')) {
    sizeScale = preset.sizeScale;
  }
  // Otherwise keep global value
}
```

---

## Implementation Plan

### Immediate (This Session)
- [x] Manual sync: All 4 locations set to 1.4
- [ ] Add validation function to build-production.js
- [ ] Run validation before build completes

### Short-term (Next Session)
- [ ] Auto-sync HTML sliders from config
- [ ] Show validation warnings in build output
- [ ] Document config → runtime flow in BUILD-SYSTEM.md

### Long-term (Future Refactor)
- [ ] Make presets inherit global values by default
- [ ] Add TypeScript interfaces for config schema
- [ ] Create interactive config editor (no manual JSON editing)
- [ ] Pre-commit hook to validate config consistency

---

## Expected Workflow After Improvements

**User says:** "Make ball size 1.4"

**AI should:**
1. Update `source/config/default-config.json`: `"ballScale": 1.4`
2. Run build (copies config to public):
   - ✅ Runtime loads config via fetch
   - ✅ JS variable updated via hardcodeConfig()
   - ✅ HTML slider updated via syncHTMLDefaults()
   - ✅ Presets inherit new value (unless explicitly overridden)
3. Validation runs:
   - ✅ No conflicts detected
   - ✅ Build passes
4. Show user: "Ball size set to 1.4 everywhere (Config → JS → HTML → Build)"

**No more manual sync of 4 locations!**

---

## Benefits

1. **Single Command**: Change one file, everything else syncs
2. **Fast Feedback**: Build fails immediately if values conflict
3. **Visual Confirmation**: Slider shows correct default on page load
4. **Fewer Bugs**: Impossible to have mismatched values
5. **Better DX**: AI can make changes confidently

---

## Files to Modify

- `build-production.js` - Ensure config copy and injection
- `source/modules/**` - Read from runtime config
- `source/config/default-config.json` - Source of truth
- `docs/reference/BUILD-SYSTEM.md` - Document new flow

