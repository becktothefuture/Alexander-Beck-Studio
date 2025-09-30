# Project Structure Guide

## Directory Layout

```
alexander-beck-studio-website/
│
├── source/                 # Development source files
│   ├── balls-source.html      # Main development file with control panel
│   ├── build.js              # Build script to create production bundle
│   └── current-config*.json  # Saved configurations (gitignored)
│
├── public/                 # Production-ready website files
│   ├── index.html            # Main website (Webflow export)
│   ├── CNAME                # GitHub Pages custom domain
│   ├── css/                 # Stylesheets
│   │   ├── webflow.css         # Webflow base styles
│   │   ├── normalize.css       # CSS reset
│   │   ├── bouncy-balls.css    # Simulation styles
│   │   └── *.webflow.css       # Webflow theme styles
│   ├── js/                  # JavaScript files
│   │   ├── bouncy-balls-embed.js  # Minified simulation
│   │   └── webflow.js             # Webflow interactions
│   └── images/              # Website images
│       ├── favicon.ico         # Browser favicon
│       ├── noise3.gif         # Background texture
│       └── webclip.png        # Apple touch icon
│
├── docs/                   # Documentation
│   ├── README.md              # Documentation overview
│   ├── ARCHITECTURE.md        # System design and components
│   ├── DEVELOPMENT.md         # Development guide
│   ├── MODES.md              # Physics modes specification
│   ├── MODE-PHYSICS-MATRIX.md # Physics parameters reference
│   └── BALL-SOFTNESS-EXPLAINED.md  # Squash deformation details
│
├── .gitignore             # Git ignore rules
├── LICENSE                # MIT license
├── README.md              # Project overview
├── package.json           # Node.js configuration
└── package-lock.json      # Dependency lock file
```

## Key Files

### source/balls-source.html
The main development file containing:
- Complete simulation code
- Control panel UI
- Three physics modes
- Real-time parameter tuning

### source/build.js
Build script that:
- Reads saved configuration
- Applies settings to source code
- Minifies with Terser
- Outputs to `public/js/bouncy-balls-embed.js`

### public/index.html
Production website that:
- Embeds the simulation
- Uses Webflow styling
- Includes portfolio content
- Works on alexanderbeck.design

## Development Workflow

1. **Edit** → `source/balls-source.html`
2. **Test** → `npm start` → http://localhost:8000
3. **Configure** → Use control panel → Save Config
4. **Build** → `npm run build`
5. **Deploy** → Push to GitHub → Auto-deploys via Pages

## Configuration Files

### package.json Scripts
- `npm start` - Start dev server
- `npm run build` - Build production
- `npm run watch` - Auto-rebuild
- `npm run clean` - Remove configs

### .gitignore
Excludes:
- node_modules/
- test-results/
- current-config*.json
- IDE files
- OS files

## Best Practices

1. **Development**
   - Always test in `source/balls-source.html`
   - Use control panel for configuration
   - Save configs before building

2. **Production**
   - Run build before deploying
   - Test minified output
   - Check performance on mobile

3. **Version Control**
   - Commit source changes
   - Don't commit config JSONs
   - Tag releases appropriately
