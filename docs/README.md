# Alexander Beck Studio Website - Documentation

## Overview

This is the documentation for the Alexander Beck Studio website, featuring an interactive particle physics simulation as the hero element.

## Project Structure

```
.
├── source/              # Source files for the physics simulation
│   ├── balls-source.html    # Main development file with controls
│   ├── build.js            # Build script for production
│   └── current-config*.json # Configuration files (gitignored)
├── public/              # Production-ready files
│   ├── index.html          # Main website
│   ├── css/               # Stylesheets
│   ├── js/                # JavaScript files
│   │   ├── bouncy-balls-embed.js  # Minified simulation
│   │   └── webflow.js             # Webflow scripts
│   └── images/            # Website images
├── docs/                # Documentation
│   ├── README.md           # This file
│   ├── MODES.md           # Simulation modes specification
│   └── *.md               # Other documentation
├── test-results/        # Test outputs (gitignored)
├── package.json         # Node.js dependencies
└── .gitignore          # Git ignore rules
```

## Key Features

### Three Simulation Modes

1. **Ball Pit** - Classic bouncing balls with gravity
2. **Flies to Light** - Particles swarm around cursor like insects
3. **Mouse Trail** - Sparkle particles emit from cursor movement

See [MODES.md](./MODES.md) for detailed specifications.

### Technologies

- **Pure JavaScript** - No framework dependencies
- **Canvas API** - Hardware-accelerated rendering
- **Webflow Integration** - Seamless embed into Webflow sites
- **Responsive Design** - Works on all devices

## Development

### Setup

```bash
npm install
```

### Run Development Server

```bash
npm start
```

Then open http://localhost:8000/source/balls-source.html

### Build for Production

```bash
npm run build
```

This creates an optimized `public/js/bouncy-balls-embed.js` file.

### Configuration

The simulation can be configured by:
1. Using the control panel in development mode
2. Saving configuration with the "Save Config" button
3. Running build to bake settings into production file

## Deployment

The `public/` folder contains all production files:
- Upload to your web host
- The CNAME file configures custom domain
- GitHub Pages compatible structure

## Performance

- 60 FPS target on modern devices
- Automatic quality scaling for mobile
- Efficient collision detection with spatial hashing
- WebGL-ready architecture for future enhancements

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers with touch support