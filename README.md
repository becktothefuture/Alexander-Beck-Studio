# Alexander Beck Studio Website

## 🚀 Project Structure

```
Alexander Beck Studio Website/
├── public/                    # Static site root (served & deployed)
│   ├── index.html             # Modular version (MAIN)
│   ├── css/
│   │   ├── normalize.css
│   │   ├── webflow.css
│   │   ├── alexander-beck-studio-staging.webflow.css
│   │   └── bouncy-balls.css
│   ├── js/
│   │   ├── webflow.js
│   │   └── bouncy-balls-embed.js
│   └── images/
└── bouncy-balls/             # Animation development
    ├── balls-source.html     # Full-featured dev version (source)
    ├── build.js              # Animation build script
    └── current-config-2.json # Animation configuration
```

## ✨ Features

### **Bouncy Balls Animation**
- **Text Collision Detection**: Balls bounce off `#hero-text` element using cap height measurement
- **Mobile Responsive**: 60% ball size reduction on screens ≤768px
- **Performance Optimized**: requestAnimationFrame, spatial grid collision detection
- **Color Palette**: 8 CSS variables with utility classes (`.text-ball-1`, `.bg-ball-2`, etc.)
- **Configuration**: Tuned with `current-config-2.json` settings

### **Website Integration**
- **Modular Architecture**: Separate CSS/JS files, no code duplication
- **Clean HTML**: Removed Webflow badges and inline code
- **Professional Branding**: Alexander Beck Studio generator tag
- **Optimized Loading**: Proper asset organization and loading order

## 🛠️ Development

### **Build Animation**
```bash
npm run build
# Builds public/js/bouncy-balls-embed.js from bouncy-balls/balls-source.html
```

### **Serve Website Locally**
```bash
npm run serve
# Serves public/ directory on http://localhost:8000
```

### **Development Workflow**
1. Edit animation: `bouncy-balls/balls-source.html`
2. Test changes: Open `balls-source.html` in browser (or use the panel)
3. Build production: `npm run build`
4. Modular page uses `public/js/bouncy-balls-embed.js` automatically

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

## 🎯 Configuration

The animation uses settings from `bouncy-balls/current-config-2.json`:
- **Physics**: REST 0.88, FRICTION 0.003, MAX_BALLS 400
- **Appearance**: sizeScale 2.1, ballMass 11.2
- **Colors**: industrialTeal palette (8 colors)
- **Behavior**: Mouse repeller, text collision, mobile scaling

## 🚀 Deployment

1. **Development**: Use `bouncy-balls/balls-source.html` for testing/config
2. **Production**: Serve from `public/` directory (Pages or any static host)
3. **GitHub Pages**: This repo includes a workflow that builds and deploys `public/` from `main`.
4. **Updates**: Modify config → rebuild → commit → push → auto-deploy

## 📊 Performance

- **Animation**: ~25.6KB minified
- **Total CSS**: Combined and optimized
- **Loading**: Async, non-blocking
- **Frame Rate**: 60fps with requestAnimationFrame
- **Collision Detection**: Optimized spatial grid O(n log n)

---

**Built with performance, maintainability, and visual excellence in mind.** ✨
