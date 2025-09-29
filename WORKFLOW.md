# 🔄 Webflow → Development → Production Workflow

## 📁 Directory Structure

```
Alexander Beck Studio Website/
├── webflow export/              # 📥 RAW EXPORT from Webflow (source of truth)
│   └── alexander-beck-studio-staging.webflow/
│       ├── index.html           # Clean Webflow HTML
│       ├── css/                 # Webflow stylesheets
│       ├── js/                  # Webflow scripts
│       └── images/              # Webflow assets
│
├── source/                      # 🔧 DEVELOPMENT VERSION (with full panel)
│   ├── balls-source.html        # ⭐ EDIT THIS for development
│   ├── build.js                 # Build script (extracts & minifies)
│   ├── current-config.json      # Settings (auto-updated from panel)
│   ├── save-config.js           # Config save utility
│   └── [css/, js/, images/]     # Mirror of Webflow assets
│
└── public/                      # 🌐 PRODUCTION VERSION (deployed)
    ├── index.html               # Production HTML (no panel)
    ├── css/                     # All stylesheets
    ├── js/
    │   ├── webflow.js
    │   └── bouncy-balls-embed.js # 📦 GENERATED (minified, no UI)
    └── images/
```

---

## 🔄 Complete Workflow

### **Step 1: Export from Webflow** 📥
When you make changes in Webflow:
1. Export your site from Webflow
2. Replace the contents of `webflow export/alexander-beck-studio-staging.webflow/` with the new export
3. The export should contain:
   - `index.html` (with `<div id="bravia-balls" class="ball-simulation w-embed">` for the simulation)
   - All CSS files
   - All JS files
   - All images

### **Step 2: Integrate New Webflow Export** 🔧
Run this script to merge Webflow export with ball simulation:

```bash
cd "Alexander Beck Studio Website"
node -e "
const fs = require('fs');

// Read Webflow HTML
const webflow = fs.readFileSync('webflow export/alexander-beck-studio-staging.webflow/index.html', 'utf8');
const webflowLines = webflow.split('\\n');
const webflowHead = webflowLines.slice(0, 19).join('\\n');
const webflowBody = webflowLines.slice(19, -3).join('\\n');

// Read backup CSS, Panel, and JS (from source-backup as template)
const backup = fs.readFileSync('source-backup/balls-source.html', 'utf8');
const backupLines = backup.split('\\n');
const backupCSS = backupLines.slice(6, 193).join('\\n');
const backupPanel = backupLines.slice(198, 327).join('\\n');
const backupJS = backupLines.slice(328, -3).join('\\n');

// Merge everything
const merged = webflowHead + '\\n' + backupCSS + '\\n</head>\\n' + 
  '<body class=\"body\">\\n' +
  '  <div class=\"noise\"></div>\\n' +
  '  <div id=\"ball-simulation\">\\n' +
  '    <canvas id=\"c\" aria-label=\"Bouncy balls simulation\" role=\"img\" draggable=\"false\"></canvas>\\n' +
  backupPanel + '\\n' +
  '  </div>\\n' +
  webflowBody + '\\n' +
  backupJS + '\\n' +
  '</body>\\n</html>';

fs.writeFileSync('source/balls-source.html', merged);
console.log('✅ Webflow export integrated into source/balls-source.html');
"
```

**OR** manually:
1. Copy Webflow's `<head>` content (up to `</head>`)
2. Add ball simulation CSS styles
3. Copy Webflow's `<body>` content
4. Insert `#ball-simulation` container with canvas and control panel
5. Add complete JavaScript engine

### **Step 3: Develop & Test** 🧪
1. Open `source/balls-source.html` in your browser
2. Use the control panel to:
   - Switch between Ball Pit / Flies / Mouse Trail modes
   - Adjust physics (gravity, restitution, friction)
   - Tweak appearance (ball count, size, colors)
   - Test different behaviors
3. When satisfied, click **💾 Save Config** to export settings to `current-config.json`

### **Step 4: Build Production Version** 📦
```bash
npm run build
```

This will:
1. Extract JavaScript from `source/balls-source.html`
2. Apply settings from `current-config.json`
3. **Remove all UI code** (control panel, FPS counter)
4. Minify the JavaScript
5. Output to `public/js/bouncy-balls-embed.js` (~34KB)

### **Step 5: Update Production HTML** 🌐
The `public/index.html` should:
- Have the same Webflow structure as source
- Link to `<script src="js/bouncy-balls-embed.js"></script>`
- **NOT** include the control panel HTML
- **NOT** include inline JavaScript

### **Step 6: Test Production** ✅
```bash
npm run serve
# Open http://localhost:8000
```

Verify:
- ✅ Balls are spawning and bouncing
- ✅ No control panel visible
- ✅ No console errors
- ✅ Webflow design intact

### **Step 7: Deploy** 🚀
```bash
git add .
git commit -m "Update: Webflow design + ball simulation"
git push origin main
```

GitHub Pages will automatically deploy the `public/` directory.

---

## 🔑 Key Files (What to Edit)

### **✏️ Files You SHOULD Edit:**
- `source/balls-source.html` - Add new features, fix bugs, adjust logic
- `current-config.json` - Manually tweak settings (or use panel's Save button)
- `webflow export/` - Replace entire folder when you export from Webflow

### **🚫 Files You Should NEVER Edit:**
- `public/js/bouncy-balls-embed.js` - Auto-generated by build script
- `public/index.html` - Should mirror Webflow export (update via workflow)

---

## 🆕 What Happens When You Create a New Webflow Export?

1. **Export from Webflow** → saves to `webflow export/`
2. **Run integration script** (Step 2 above) → updates `source/balls-source.html`
3. **Test in browser** → verify design + simulation work together
4. **Build** → generates new `public/js/bouncy-balls-embed.js`
5. **Update `public/index.html`** → copy Webflow structure, link to embed.js
6. **Deploy** → push to GitHub

---

## 📝 Important Notes

- **Webflow's `#bravia-balls` container** must exist in the export for the simulation to render
- **Control panel** only exists in `source/balls-source.html` (for development)
- **Production version** has no panel, just the simulation
- **Config changes** must be saved, then rebuilt to apply to production
- **CSS/JS/Image assets** should be mirrored from Webflow export to both `source/` and `public/`

---

## 🐛 Troubleshooting

**Problem:** New Webflow export breaks the simulation  
**Solution:** Check that `<div id="bravia-balls" class="ball-simulation w-embed">` still exists in the export

**Problem:** Build script fails  
**Solution:** Ensure `source/balls-source.html` has valid JavaScript (no syntax errors)

**Problem:** Panel doesn't show in development  
**Solution:** Check that `#controlPanel` HTML is present in `source/balls-source.html`

**Problem:** Balls don't show in production  
**Solution:** Verify `public/index.html` links to `js/bouncy-balls-embed.js` correctly

---

**Last Updated:** 2025-09-29  
**Status:** ✅ Working as of this documentation
