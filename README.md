# Alexander Beck Studio Website

An interactive portfolio website featuring a physics-based particle simulation as the hero element.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)

## ✨ Features

- **Interactive Physics Simulation** - Thousands of particles with realistic physics
- **Three Unique Modes**:
  - 🎱 Ball Pit - Classic bouncing balls with gravity
  - 🦟 Flies to Light - Particles swarm around your cursor
  - ✨ Mouse Trail - Sparkles emit from cursor movement
- **High Performance** - 60 FPS with efficient collision detection
- **Fully Responsive** - Works beautifully on all devices
- **Zero Dependencies** - Pure vanilla JavaScript

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/alexander-beck-studio-website
cd alexander-beck-studio-website

# Install dependencies
npm install

# Start development server
npm start
# Open http://localhost:8000/source/balls-source.html
```

## 🛠️ Development

### Available Scripts

```bash
npm start      # Start development server on port 8000
npm run build  # Build minified production bundle
npm run watch  # Auto-rebuild on file changes
npm run clean  # Remove generated config files
```

### Project Structure

```
├── source/              # Development files
│   └── balls-source.html   # Main simulation (with controls)
├── public/              # Production website
│   ├── index.html         # Main website
│   └── js/               
│       └── bouncy-balls-embed.js  # Minified simulation
├── docs/                # Documentation
│   ├── ARCHITECTURE.md    # System design
│   ├── DEVELOPMENT.md     # Dev guide
│   └── MODES.md          # Mode specifications
└── package.json         # Project config
```

## 🎮 Controls

- **Number Keys (1-3)** - Switch between modes
- **R** - Reset simulation
- **/** - Toggle control panel
- **Mouse** - Interact with particles

## 📦 Building for Production

1. Configure your settings in the development environment
2. Click "Save Config" in the control panel
3. Run `npm run build` to create optimized bundle
4. Deploy the `public/` folder to your web host

## 🌐 Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers with touch support

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

Alexander Beck - [alexander@beck.fyi](mailto:alexander@beck.fyi)

---

Built with ❤️ and physics
