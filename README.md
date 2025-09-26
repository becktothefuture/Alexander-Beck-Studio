# Alexander Beck Studio Website

## 🚀 Project Structure

```
Alexander Beck Studio Website/
├── public/                    # 🌐 Static site root (served & deployed)
│   ├── index.html             # Main website page
│   ├── css/                   # Stylesheets
│   │   ├── normalize.css
│   │   ├── webflow.css
│   │   ├── alexander-beck-studio-staging.webflow.css
│   │   └── bouncy-balls.css
│   ├── js/                    # JavaScript files
│   │   ├── webflow.js
│   │   └── bouncy-balls-embed.js  # 📦 GENERATED (minified)
│   └── images/                # Static assets
├── bouncy-balls/              # 🔧 Animation development
│   ├── balls-source.html      # 📝 SOURCE (full-featured dev version)
│   ├── build.js               # 🛠️ Build script (extraction + minification)
│   ├── save-config.js         # 💾 Configuration save utility
│   └── current-config.json    # ⚙️ Configuration settings
├── package.json               # Dependencies & scripts
└── README.md                  # This file
```

### **Key Files**
- **Source**: `bouncy-balls/balls-source.html` - Edit this for animation changes
- **Config**: `bouncy-balls/current-config.json` - Animation settings (auto-updated via sidepanel)
- **Generated**: `public/js/bouncy-balls-embed.js` - Never edit directly (auto-generated)
- **Build**: `bouncy-balls/build.js` - Handles the minification process
- **Save Utility**: `bouncy-balls/save-config.js` - Updates config files from sidepanel

## ✨ Features

### **Bouncy Balls Animation**
- **Text Collision Detection**: Balls bounce off `#hero-text` element using cap height measurement
- **Mobile Responsive**: 60% ball size reduction on screens ≤768px
- **Performance Optimized**: requestAnimationFrame, spatial grid collision detection
- **Color Palette**: 8 CSS variables with utility classes (`.text-ball-1`, `.bg-ball-2`, etc.)
- **Configuration**: Tuned with `current-config-2.json` settings
- **Responsive Repeller**: Repel radius scales with viewport width (375px → 60px, 1128px+ → 200px), clamped and fluid

### **Website Integration**
- **Modular Architecture**: Separate CSS/JS files, no code duplication
- **Clean HTML**: Removed Webflow badges and inline code
- **Professional Branding**: Alexander Beck Studio generator tag
- **Optimized Loading**: Proper asset organization and loading order

## 🛠️ Development

### **Build System**
The project uses a custom build system that extracts and minifies JavaScript from the source HTML file:

**Source Files:**
- `bouncy-balls/balls-source.html` - Full-featured development version with UI controls
- `bouncy-balls/current-config-2.json` - Animation configuration settings
- `bouncy-balls/build.js` - Build script that handles extraction and minification

**Generated Files:**
- `public/js/bouncy-balls-embed.js` - Minified production version (~34KB)

### **Build Process**
```bash
npm run build
# 1. Extracts JavaScript from balls-source.html (last inline <script> block)
# 2. Applies configuration values from current-config-2.json
# 3. Minifies using Terser with 2-pass compression
# 4. Outputs to public/js/bouncy-balls-embed.js
```

**Minification Details:**
- **Tool**: Terser with 2-pass compression
- **Options**: Mangle enabled, comments removed
- **Size**: ~34KB minified (from ~107KB source)
- **Config Integration**: Values from `current-config-2.json` are injected during build
- **UI Removal**: Development controls and panels are stripped from production build

### **Development Commands**
```bash
npm run build        # Build minified embed
npm run watch        # Auto-rebuild on source changes
npm run serve        # Serve public/ on http://localhost:8000
npm run dev          # Build + serve in one command
npm run dev:source   # Open source file for testing
npm run save-config  # Save configuration from stdin/args
```

### **Development Workflow**
1. **Edit**: Modify `bouncy-balls/balls-source.html` for animation logic
2. **Configure**: Adjust settings using the debugging sidepanel
3. **Save**: Use the "💾 Save Config" button to export configuration
4. **Apply**: Run the provided terminal command to update `current-config.json`
5. **Test**: Open source file directly or use `npm run dev:source`
6. **Build**: Run `npm run build` to generate production version
7. **Deploy**: The `public/` directory contains the complete website

### **Configuration Management**
The debugging sidepanel provides two ways to save your configuration changes:

**Option 1: Auto-save via Terminal** ⚡
1. Click "💾 Save Config" in the sidepanel
2. Copy the generated terminal command
3. Paste and run in your terminal to update `current-config.json`

**Option 2: Manual Download** 📥
1. Click "💾 Save Config" in the sidepanel  
2. Click "📥 Download JSON" to download the config file
3. Manually replace `bouncy-balls/current-config.json` with the downloaded file

## 📱 Usage

### **Text Collision**
The animation automatically detects and collides with any element with `id="hero-text"`:

```html
<p id="hero-text" class="heading_h2">Alexander Beck Studio.</p>
```

### **Color Utilities**
Use the ball colors in your design:

```html
<div class="text-ball-1">Product Design</div>     <!-- Teal text -->
<div class="bg-ball-6">Future Design</div>       <!-- Red background -->
<div class="border-ball-7">Brand Experience</div> <!-- Blue border -->
```

### **Responsive Behavior**
- Desktop: Full-size balls with precise text collision
- Mobile (≤768px): 40% ball size for better performance
- Auto-updates on viewport resize

### **Interaction (Pointer/Touch)**
- Mouse/pen: Repeller follows the cursor while over the canvas; stops when leaving.
- Touch: Repeller activates on touchstart and follows your finger while moving; deactivates on touchend/cancel. The visual cursor ball is hidden during touch for clarity.
  - Repeller size auto-scales by viewport width. Use the panel to toggle responsive sizing and adjust min/max.

## 🎯 Configuration

The animation uses settings from `bouncy-balls/current-config-2.json`:
- **Physics (Default)**: Rubber – Heavy preset (higher size, heavier feel)
- **Appearance**: sizeScale 2.1, ballMass 11.2
- **Colors**: industrialTeal palette (8 colors)
- **Behavior**: Mouse repeller, text collision, mobile scaling
  - Responsive repeller fields: `repelResponsive`, `repelMinSize`, `repelMaxSize`

## 🚀 Deployment

1. **Development**: Use `bouncy-balls/balls-source.html` for testing/config
2. **Production**: Serve from `public/` directory (Pages or any static host)
3. **GitHub Pages**: This repo includes a workflow that builds and deploys `public/` from `main`.
4. **Updates**: Modify config → rebuild → commit → push → auto-deploy

## 📊 Performance

- **Animation**: ~34KB minified
- **Total CSS**: Combined and optimized
- **Loading**: Async, non-blocking
- **Frame Rate**: 60fps with requestAnimationFrame
- **Collision Detection**: Optimized spatial grid O(n log n)

---

**Built with performance, maintainability, and visual excellence in mind.** ✨
