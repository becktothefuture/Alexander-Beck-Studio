/* Alexander Beck Studio – Bouncy Balls | Build: 2025-12-12T19:19:33.878Z */
var BouncyBalls = (function (exports) {
  'use strict';

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                          CONSTANTS (COMPLETE)                                ║
  // ║                    Extracted from balls-source.html                          ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝

  const MODES = {
    PIT: 'pit',
    FLIES: 'flies',
    WEIGHTLESS: 'weightless',
    WATER: 'water',
    VORTEX: 'vortex',
    PING_PONG: 'ping-pong',
    MAGNETIC: 'magnetic',
    BUBBLES: 'bubbles'
  };

  const CONSTANTS = {
    DPR: Math.max(1, Math.min(2, window.devicePixelRatio || 1)),
    CANVAS_HEIGHT_VH_PIT: 1.5,
    CANVAS_HEIGHT_VH_DEFAULT: 1.0,
    OFFSCREEN_MOUSE: -1e9,
    MIN_DISTANCE_EPSILON: 1e-6,
    ACCUMULATOR_RESET_THRESHOLD: 3,
    MAX_PHYSICS_STEPS: 2,
    SPIN_DAMP_PER_S: 2.0,
    SPIN_GAIN: 0.25,
    SPIN_GAIN_TANGENT: 0.18,
    ROLL_FRICTION_PER_S: 1.5,
    SQUASH_MAX_BASE: 0.20,
    SQUASH_DECAY_PER_S: 18.0,
    WALL_REST_VEL_THRESHOLD: 70,
    GROUND_COUPLING_PER_S: 8.0,
    
    // Sleep threshold for jitter reduction (Box2D-inspired)
    SLEEP_VELOCITY_THRESHOLD: 5.0,      // px/s (Box2D uses 0.05 m/s)
    SLEEP_ANGULAR_THRESHOLD: 0.05,      // rad/s
    TIME_TO_SLEEP: 0.5,                 // seconds - must be still this long to sleep
    
    PHYSICS_DT: 1/120};

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                      STATE STORE (COMPLETE)                                  ║
  // ║               All global state - extracted from balls-source.html            ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  const state = {
    config: {},
    currentMode: MODES.FLIES,
    balls: [],
    canvas: null,
    ctx: null,
    container: null,
    mouseX: CONSTANTS.OFFSCREEN_MOUSE,
    mouseY: CONSTANTS.OFFSCREEN_MOUSE,
    mouseInCanvas: false,
    
    // Physics constants
    GE: 1960,
    G: 0,
    gravityScale: 1.0,
    gravityMultiplier: 0,
    gravityMultiplierPit: 1.10,
    REST: 0.69,
    FRICTION: 0.0060,
    ballMassKg: 129,
    MASS_BASELINE_KG: 129,
    MASS_REST_EXP: 0.15,
    MASS_GRAVITY_EXP: 0.35,
    
    // Device
    DPR: Math.max(1, Math.min(2, window.devicePixelRatio || 1)),
    
    // Size
    sizeScale: 1.2,
    sizeVariation: 0,
    responsiveScale: 1.0,
    R_MIN_BASE: 6,
    R_MAX_BASE: 24,
    R_MIN: 6 * 1.2 * 0.75,
    R_MAX: 24 * 1.2 * 1.25,
    
    // Ball properties
    ballSoftness: 20,
    
    // Corner (matches CSS border-radius for collision bounds)
    cornerRadius: 42,
    
    // Inner border (soft visual transition)
    
    // Vortex mode params
    vortexSwirlStrength: 420,
    vortexRadialPull: 180,
    vortexBallCount: 180,
    
    
    // Magnetic mode params (updated defaults)
    magneticBallCount: 180,
    magneticStrength: 65000,
    magneticMaxVelocity: 2800,
    magneticExplosionInterval: 5,
    
    // Bubbles mode params
    bubblesSpawnRate: 8,
    bubblesRiseSpeed: 150,
    bubblesWobble: 40,
    bubblesMaxCount: 150,
    bubblesDeflectRadius: 80,
    
    
    // Ping Pong mode params (left-right bounce, cursor obstacle)
    pingPongBallCount: 35,
    pingPongSpeed: 800,
    pingPongCursorRadius: 50,
    
    
    // Colors
    currentColors: ['#b7bcb7', '#e4e9e4', '#ffffff', '#00695c', '#000000', '#ff4013', '#0d5cb6', '#ffa000'],
    currentTemplate: 'industrialTeal',
    
    // Flies mode
    fliesBallCount: 60,
    attractionPower: 5000,
    orbitRadius: 180,
    swarmSpeed: 0.4,
    fliesSeparation: 15000,
    
    // Weightless mode
    weightlessCount: 80,
    weightlessInitialSpeed: 250,
    weightlessBounce: 0.97,
    
    // Pulse Grid mode
    gridColumns: 40,
    gridBallCount: 120,
    pulseInterval: 0.8,
    
    // Water mode
    waterBallCount: 300,
    waterDrag: 0.015,
    waterRippleSpeed: 300,
    waterRippleStrength: 18000,
    waterDriftStrength: 40,
    waterInitialVelocity: 200,
    
    // Repeller
    repelRadius: 120,
    repelPower: 274000,
    repelSoft: 3.4,
    repellerEnabled: false,
    
    // Emitter
    emitterTimer: 0,
    
    // Dark mode
    autoDarkModeEnabled: true,
    isDarkMode: false,
    
    // Two-level padding system (in pixels)
    containerBorder: 0,    // Outer: insets container from viewport (reveals body bg as frame)
    simulationPadding: 0,  // Inner: padding inside container around canvas
    
    // Helpers
    getSquashMax() {
      if (this.ballSoftness === 0) return 0;
      return CONSTANTS.SQUASH_MAX_BASE * (this.ballSoftness / 40.0);
    },
    
    // Canvas corner radius = container radius - simulation padding
    // Used by physics for corner collision detection
    getCanvasCornerRadius() {
      return Math.max(0, this.cornerRadius - this.simulationPadding);
    }
  };

  function initState(config) {
    state.config = { ...config };
    if (config.ballMass) state.ballMassKg = config.ballMass;
    if (config.gravityMultiplier) state.gravityMultiplier = config.gravityMultiplier;
    if (config.restitution) state.REST = config.restitution;
    if (config.friction) state.FRICTION = config.friction;
    if (config.ballScale) state.sizeScale = config.ballScale;
    
    // Two-level padding system
    if (config.containerBorder !== undefined) state.containerBorder = config.containerBorder;
    if (config.simulationPadding !== undefined) state.simulationPadding = config.simulationPadding;
    
    // Recalculate R_MIN and R_MAX
    const baseSize = (state.R_MIN_BASE + state.R_MAX_BASE) / 2;
    state.R_MIN = baseSize * state.sizeScale * 0.75;
    state.R_MAX = baseSize * state.sizeScale * 1.25;
  }

  function getGlobals() {
    return state;
  }

  function setCanvas(canvas, ctx, container) {
    state.canvas = canvas;
    state.ctx = ctx;
    state.container = container;
  }

  function setMode$1(mode) {
    state.currentMode = mode;
  }

  function clearBalls() {
    state.balls.length = 0;
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                        COLOR PALETTE SYSTEM (COMPLETE)                       ║
  // ║              Extracted from balls-source.html lines 1405-1558                ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  const COLOR_TEMPLATES = {
    industrialTeal: { 
      label: 'Industrial Teal',
      light: ['#b7bcb7', '#e4e9e4', '#ffffff', '#00695c', '#000000', '#ff4013', '#0d5cb6', '#ffa000'],
      dark: ['#6b726b', '#3d453d', '#8a928a', '#00e6c3', '#d5d5d5', '#ff6b47', '#5b9aff', '#ffb84d']
    },
    sunsetCoral: { 
      label: 'Sunset Coral', 
      light: ['#bdbbb8', '#e8e6e3', '#ffffff', '#ff3b3b', '#000000', '#00f5d4', '#1e40af', '#fb923c'],
      dark: ['#716f6b', '#3f3d3a', '#8e8c88', '#ff6b6b', '#d8d8d8', '#00ffe7', '#6ba3ff', '#ffb570']
    },
    violetPunch: { 
      label: 'Violet Punch', 
      light: ['#b8b7c2', '#e6e5ed', '#ffffff', '#9333ea', '#000000', '#dc2626', '#0ea5e9', '#facc15'],
      dark: ['#6d6c7a', '#3a3845', '#8b8a98', '#c266ff', '#dad6e8', '#ff5c5c', '#42d4ff', '#fff066']
    },
    citrusBlast: { 
      label: 'Citrus Blast', 
      light: ['#bfbdb5', '#eae8df', '#ffffff', '#ea580c', '#000000', '#e11d48', '#2563eb', '#059669'],
      dark: ['#74726a', '#403e38', '#918f87', '#ff8c4d', '#dbd9d1', '#ff5c7a', '#6ba3ff', '#00d699']
    },
    cobaltSpark: { 
      label: 'Cobalt Spark', 
      light: ['#b5b8be', '#e3e6eb', '#ffffff', '#1d4ed8', '#000000', '#ea580c', '#db2777', '#d97706'],
      dark: ['#696d75', '#3a3e45', '#878b93', '#6b9dff', '#d6dae2', '#ff8c5c', '#ff66b3', '#ffc266']
    }
  };

  const COLOR_WEIGHTS = [0.50, 0.25, 0.12, 0.06, 0.03, 0.02, 0.01, 0.01];

  function getCurrentPalette(templateName) {
    const globals = getGlobals();
    const template = COLOR_TEMPLATES[templateName];
    if (!template) return COLOR_TEMPLATES.industrialTeal.light;
    return globals.isDarkMode ? template.dark : template.light;
  }

  function pickRandomColor() {
    const globals = getGlobals();
    const colors = globals.currentColors;
    
    if (!colors || colors.length === 0) {
      console.warn('No colors available, using fallback');
      return '#ffffff';
    }
    
    const random = Math.random();
    let cumulativeWeight = 0;
    
    for (let i = 0; i < Math.min(colors.length, COLOR_WEIGHTS.length); i++) {
      cumulativeWeight += COLOR_WEIGHTS[i];
      if (random <= cumulativeWeight) {
        return colors[i];
      }
    }
    
    return colors[Math.min(colors.length - 1, 7)];
  }

  /**
   * Get a specific color by index (0-7)
   * Ensures all 8 colors are accessible for guaranteed representation
   */
  function getColorByIndex(index) {
    const globals = getGlobals();
    const colors = globals.currentColors;
    
    if (!colors || colors.length === 0) {
      console.warn('No colors available, using fallback');
      return '#ffffff';
    }
    
    const clampedIndex = Math.max(0, Math.min(7, Math.floor(index)));
    return colors[clampedIndex] || '#ffffff';
  }

  function applyColorTemplate(templateName) {
    const globals = getGlobals();
    globals.currentTemplate = templateName;
    globals.currentColors = getCurrentPalette(templateName);
    globals.cursorBallColor = globals.currentColors[globals.cursorBallIndex || 4];
    
    // Update existing ball colors
    updateExistingBallColors();
    
    // Sync CSS variables
    syncPaletteVars(globals.currentColors);
    
    // Update UI color pickers
    updateColorPickersUI();
  }

  function updateExistingBallColors() {
    const globals = getGlobals();
    const balls = globals.balls;
    
    for (let i = 0; i < balls.length; i++) {
      balls[i].color = pickRandomColor();
    }
  }

  function syncPaletteVars(colors) {
    try {
      const root = document.documentElement;
      const list = (colors && colors.length ? colors : []).slice(0, 8);
      for (let i = 0; i < 8; i++) {
        const hex = list[i] || '#ffffff';
        root.style.setProperty(`--ball-${i+1}`, hex);
      }
    } catch (_) { /* no-op */ }
  }

  function updateColorPickersUI() {
    const globals = getGlobals();
    const colors = globals.currentColors;
    
    for (let i = 1; i <= 8; i++) {
      const picker = document.getElementById(`color${i}`);
      const display = document.getElementById(`color${i}Val`);
      if (picker && colors[i-1]) {
        picker.value = colors[i-1];
        if (display) display.textContent = colors[i-1].toUpperCase();
      }
    }
  }

  function populateColorSelect() {
    const select = document.getElementById('colorSelect');
    if (!select) return;
    
    select.innerHTML = '';
    for (const [key, template] of Object.entries(COLOR_TEMPLATES)) {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = template.label;
      select.appendChild(option);
    }
    
    const globals = getGlobals();
    select.value = globals.currentTemplate;
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                    MODERN DARK MODE SYSTEM (Best Practices)                 ║
  // ║          Native feel with prefers-color-scheme + manual override            ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  // Theme states: 'auto', 'light', 'dark'
  let currentTheme = 'light'; // Default to light mode
  let systemPreference = 'light';

  // Fallback colors if CSS vars not available
  const FALLBACK_COLORS = {
    light: '#cecece',
    dark: '#0a0a0a'
  };

  /**
   * Read CSS variable from :root, with fallback
   */
  function readCssVar(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  /**
   * Detect system color scheme preference
   */
  function detectSystemPreference() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  /**
   * Update browser chrome/theme color for Safari and Chrome
   * Reads from CSS variables (--chrome-bg*) for unified color management
   */
  function updateThemeColor(isDark) {
    // Read colors from CSS variables (single source of truth)
    const lightColor = readCssVar('--chrome-bg-light', FALLBACK_COLORS.light);
    const darkColor = readCssVar('--chrome-bg-dark', FALLBACK_COLORS.dark);
    const currentColor = isDark ? darkColor : lightColor;
    
    // Update existing meta tag or create new one
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.name = 'theme-color';
      document.head.appendChild(metaTheme);
    }
    metaTheme.content = currentColor;
    
    // Safari-specific: Update for both light and dark modes
    let metaThemeLight = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: light)"]');
    if (!metaThemeLight) {
      metaThemeLight = document.createElement('meta');
      metaThemeLight.name = 'theme-color';
      metaThemeLight.media = '(prefers-color-scheme: light)';
      document.head.appendChild(metaThemeLight);
    }
    metaThemeLight.content = lightColor;
    
    let metaThemeDark = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]');
    if (!metaThemeDark) {
      metaThemeDark = document.createElement('meta');
      metaThemeDark.name = 'theme-color';
      metaThemeDark.media = '(prefers-color-scheme: dark)';
      document.head.appendChild(metaThemeDark);
    }
    metaThemeDark.content = darkColor;
  }

  /**
   * Apply dark mode to DOM
   */
  function applyDarkModeToDOM(isDark) {
    const globals = getGlobals();
    globals.isDarkMode = isDark;
    
    // Set color-scheme for native form controls (Safari)
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    
    // Apply dark-mode class
    if (isDark) {
      globals.container?.classList.add('dark-mode');
      document.body.classList.add('dark-mode');
      document.documentElement.classList.add('dark-mode');
    } else {
      globals.container?.classList.remove('dark-mode');
      document.body.classList.remove('dark-mode');
      document.documentElement.classList.remove('dark-mode');
    }
    
    // Update browser chrome color
    updateThemeColor(isDark);
    
    // Switch color palette variant
    applyColorTemplate(globals.currentTemplate);
    
    // Update UI
    updateSegmentControl();
  }

  /**
   * Update segment control UI
   */
  function updateSegmentControl() {
    const autoBtn = document.getElementById('themeAuto');
    const lightBtn = document.getElementById('themeLight');
    const darkBtn = document.getElementById('themeDark');
    
    if (!autoBtn || !lightBtn || !darkBtn) return;
    
    // Remove active class from all
    [autoBtn, lightBtn, darkBtn].forEach(btn => btn.classList.remove('active'));
    
    // Add active to current
    if (currentTheme === 'auto') {
      autoBtn.classList.add('active');
    } else if (currentTheme === 'light') {
      lightBtn.classList.add('active');
    } else {
      darkBtn.classList.add('active');
    }
    
    // Update status text
    const status = document.getElementById('themeStatus');
    if (status) {
      const globals = getGlobals();
      if (currentTheme === 'auto') {
        status.textContent = globals.isDarkMode ? '🌙 Auto (Dark)' : '☀️ Auto (Light)';
      } else if (currentTheme === 'light') {
        status.textContent = '☀️ Light Mode';
      } else {
        status.textContent = '🌙 Dark Mode';
      }
    }
  }

  /**
   * Set theme (auto, light, or dark)
   */
  function setTheme(theme) {
    currentTheme = theme;
    
    let shouldBeDark = false;
    
    if (theme === 'auto') {
      shouldBeDark = systemPreference === 'dark';
    } else if (theme === 'dark') {
      shouldBeDark = true;
    } else {
      shouldBeDark = false;
    }
    
    applyDarkModeToDOM(shouldBeDark);
    
    // Save preference
    try {
      localStorage.setItem('theme-preference', theme);
    } catch (e) {
      // localStorage unavailable
    }
    
    console.log(`🎨 Theme set to: ${theme} (rendering: ${shouldBeDark ? 'dark' : 'light'})`);
  }

  /**
   * Initialize dark mode system
   */
  function initializeDarkMode() {
    // Detect system preference
    systemPreference = detectSystemPreference();
    console.log(`🖥️ System prefers: ${systemPreference}`);
    
    // Load saved preference or default to light
    let savedTheme = 'light';
    try {
      savedTheme = localStorage.getItem('theme-preference') || 'light';
    } catch (e) {
      // localStorage unavailable
    }
    
    // Apply theme
    setTheme(savedTheme);
    
    // Setup segment control listeners
    const autoBtn = document.getElementById('themeAuto');
    const lightBtn = document.getElementById('themeLight');
    const darkBtn = document.getElementById('themeDark');
    
    if (autoBtn) autoBtn.addEventListener('click', () => setTheme('auto'));
    if (lightBtn) lightBtn.addEventListener('click', () => setTheme('light'));
    if (darkBtn) darkBtn.addEventListener('click', () => setTheme('dark'));
    
    // Listen for system preference changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        systemPreference = e.matches ? 'dark' : 'light';
        console.log(`🖥️ System preference changed to: ${systemPreference}`);
        
        // If in auto mode, update
        if (currentTheme === 'auto') {
          setTheme('auto');
        }
      });
    }
    
    console.log('✓ Modern dark mode initialized');
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                           RENDERING EFFECTS                                  ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function applyCanvasShadow(canvas) {
    const g = getGlobals();
    const enabled = g.canvasShadowEnabled || false;
    if (!enabled) {
      canvas.style.filter = '';
      return;
    }
    const x = g.shadowOffsetX || 1;
    const y = g.shadowOffsetY || 1;
    const blur = g.shadowBlur || 0;
    const color = g.shadowColor || '#000000';
    const op = g.shadowOpacity || 0.29;
    const second = g.shadow2Enabled ? ` drop-shadow(0 0 ${g.shadow2Blur||4}px rgba(0,0,0,${g.shadow2Opacity||0.10}))` : '';
    canvas.style.filter = `drop-shadow(${x}px ${y}px ${blur}px ${hexToRgba(color, op)})${second}`;
  }

  function hexToRgba(hex, alpha) {
    const h = hex.replace('#', '');
    const bigint = parseInt(h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                          RENDERER (COMPLETE)                                 ║
  // ║                 Canvas setup, resize, and rendering                          ║
  // ║      Sizes relative to container (supports frame padding/border)             ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  let canvas, ctx;

  function setupRenderer() {
    canvas = document.getElementById('c');
    ctx = canvas ? canvas.getContext('2d') : null;
    
    if (!canvas || !ctx) {
      console.error('Canvas not found');
      return;
    }
    
    // NOTE: Don't call resize() here - globals.container may not be set yet
    // main.js will call resize() after setCanvas() to ensure container is available
    window.addEventListener('resize', resize);
  }

  /**
   * Resize canvas to match container dimensions minus simulation padding.
   * 
   * Two-level padding system:
   * 1. containerBorder: already handled by CSS (insets #bravia-balls from viewport)
   * 2. simulationPadding: canvas is inset from container edges (handled here + CSS)
   */
  function resize() {
    if (!canvas) return;
    
    const globals = getGlobals();
    
    // Use container dimensions if available, fallback to window for safety
    const container = globals.container || document.getElementById('bravia-balls');
    const containerWidth = container ? container.clientWidth : window.innerWidth;
    const containerHeight = container ? container.clientHeight : window.innerHeight;
    
    // Simulation padding: canvas is inset from container edges
    const simPad = globals.simulationPadding || 0;
    const canvasWidth = containerWidth - (simPad * 2);
    const canvasHeight = containerHeight - (simPad * 2);
    
    // Ball Pit mode uses 150% height (spawn area above viewport)
    const heightMultiplier = (globals.currentMode === MODES.PIT)
      ? CONSTANTS.CANVAS_HEIGHT_VH_PIT
      : CONSTANTS.CANVAS_HEIGHT_VH_DEFAULT;
    
    const simHeight = canvasHeight * heightMultiplier;
    const DPR = CONSTANTS.DPR;
    
    // Set canvas buffer size (high-DPI)
    canvas.width = Math.floor(canvasWidth * DPR);
    canvas.height = Math.floor(simHeight * DPR);
    
    // CSS handles display size via calc(100% - padding * 2), but we set explicit values for consistency
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = simHeight + 'px';
    
    applyCanvasShadow(canvas);
  }

  function getCanvas() {
    return canvas;
  }

  function getContext() {
    return ctx;
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                         COMPLETE PANEL HTML TEMPLATE                         ║
  // ║                 Extracted from balls-source.html lines 246-720               ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝

  const PANEL_HTML = `
  <!-- Draggable header -->
  <div class="panel-header" id="panelHeader" role="banner">
    <span><span class="drag-handle" aria-hidden="true">⋮⋮</span>Controls</span>
    <button style="cursor: pointer; opacity: 0.7; background: none; border: none; color: inherit; font-size: 16px; padding: 0;" id="minimizePanel" title="Toggle panel" aria-label="Toggle control panel" aria-expanded="true">−</button>
  </div>
  
  <!-- Screen reader announcements -->
  <div role="status" aria-live="polite" aria-atomic="true" style="position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;" id="announcer"></div>
  
  <div class="panel-content">
  
  <!-- Theme Segment Control -->
  <div style="margin-bottom: 12px; padding: 8px; background: rgba(100,100,255,0.15); border-radius: 4px; border: 1px solid rgba(100,100,255,0.3);">
    <div style="font-weight: 600; font-size: 11px; margin-bottom: 8px;">🎨 Theme</div>
    <div class="theme-segment-control" role="group" aria-label="Theme selector">
      <button id="themeAuto" class="theme-segment-btn" aria-label="Auto theme">Auto</button>
      <button id="themeLight" class="theme-segment-btn active" aria-label="Light theme">Light</button>
      <button id="themeDark" class="theme-segment-btn" aria-label="Dark theme">Dark</button>
    </div>
    <div id="themeStatus" style="font-size: 9px; margin-top: 8px; padding: 4px; background: rgba(0,0,0,0.2); border-radius: 3px; font-family: monospace; text-align: center;">
      ☀️ Light Mode
    </div>
  </div>
  
  <!-- GLOBAL SETTINGS -->
  <details open>
    <summary>🌐 Global Ball Properties</summary>
    <div class="group">
        <label title="Global ball size scale (0.1-6.0)">Size: <span class="val" id="sizeValGlobal">1.2</span><input type="range" id="sizeSliderGlobal" min="0.1" max="6.0" step="0.05" value="1.2"></label>
        <label title="Ball deformation (0-100)">Softness: <span class="val" id="ballSoftnessValGlobal">20</span><input type="range" id="ballSoftnessSliderGlobal" min="0" max="100" step="1" value="20"></label>
    </div>
  </details>
  
  <!-- Frame/Border Settings (Two-Level Padding System) -->
  <details>
    <summary>🖼️ Frame & Padding</summary>
    <div class="group">
        <label><span>Container border (px)</span><input type="range" id="containerBorderSlider" min="0" max="60" step="1" value="0"><span class="val" id="containerBorderVal">0</span></label>
        <div style="font-size: 9px; opacity: 0.6; margin: 4px 0 10px;">Outer frame — reveals body background</div>
        <label><span>Simulation padding (px)</span><input type="range" id="simulationPaddingSlider" min="0" max="60" step="1" value="0"><span class="val" id="simulationPaddingVal">0</span></label>
        <div style="font-size: 9px; opacity: 0.6; margin-top: 4px;">Inner padding — shrinks ball play area</div>
    </div>
  </details>
  
  <!-- Build Controls -->
  <div style="margin-bottom: 12px; padding: 8px; background: rgba(0,255,0,0.1); border-radius: 4px; text-align: center;">
    <button id="saveConfigBtn" style="background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">💾 Save Config</button>
    <div style="font-size: 9px; opacity: 0.7; margin-top: 6px;">Save downloads current-config.json</div>
  </div>
  
  <details open>
    <summary>🎨 Colors</summary>
    <div class="group">
        <label>Color template: <select id="colorSelect"></select></label>
    </div>
  </details>
  
  <div style="margin: 20px 0; padding: 12px 0; border-top: 1px solid rgba(255,255,255,0.15);">
    <div style="text-align: center; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; opacity: 0.6; margin-bottom: 12px;">
      Mode Settings
    </div>
    
    <!-- Mode Switcher -->
    <div class="mode-switcher" role="group" aria-label="Simulation mode selector">
      <button class="mode-button" data-mode="pit" aria-label="Ball Pit mode">🎯 Pit</button>
      <button class="mode-button active" data-mode="flies" aria-label="Flies mode">🕊️ Flies</button>
      <button class="mode-button" data-mode="weightless" aria-label="Zero-G mode">🌌 Zero-G</button>
      <button class="mode-button" data-mode="water" aria-label="Water mode">🌊 Water</button>
      <button class="mode-button" data-mode="vortex" aria-label="Vortex mode">🌀 Vortex</button>
      <button class="mode-button" data-mode="ping-pong" aria-label="Ping Pong mode">🏓 Pong</button>
      <button class="mode-button" data-mode="magnetic" aria-label="Magnetic mode">🧲 Magnet</button>
      <button class="mode-button" data-mode="bubbles" aria-label="Bubbles mode">🫧 Bubbles</button>
    </div>
  </div>
  
  <div id="pitControls" class="mode-controls">
    <details open>
      <summary>🎯 Ball Pit Mode</summary>
      <div class="group">
        <label><span>Gravity (×Earth)</span><input type="range" id="gravityPitSlider" min="0.0" max="2.0" step="0.05" value="1.10"><span class="val" id="gravityPitVal">1.10</span></label>
        <label><span>Weight (grams)</span><input type="range" id="weightPitSlider" min="10.0" max="200.0" step="1.0" value="129"><span class="val" id="weightPitVal">129</span></label>
        <label><span>Bounciness</span><input type="range" id="restitutionSlider" min="0.00" max="1.00" step="0.01" value="0.69"><span class="val" id="restitutionVal">0.69</span></label>
        <label><span>Air friction</span><input type="range" id="frictionSlider" min="0.000" max="0.010" step="0.0005" value="0.0060"><span class="val" id="frictionVal">0.0060</span></label>
      </div>
    </details>
    <details open>
      <summary>🧲 Mouse Repeller</summary>
      <div class="group">
        <label><span>Repel size (px)</span><input type="range" id="repelSizeSlider" min="50" max="1000" step="5" value="120"><span class="val" id="repelSizeVal">120</span></label>
        <label><span>Repel power</span><input type="range" id="repelPowerSlider" min="0" max="10000" step="100" value="8500"><span class="val" id="repelPowerVal">274000</span></label>
      </div>
    </details>
  </div>
  
  <div id="fliesControls" class="mode-controls active">
    <details open>
      <summary>🕊️ Flies to Light Mode</summary>
      <div class="group">
        <label><span>Ball count</span><input type="range" id="fliesBallCountSlider" min="20" max="150" step="5" value="60"><span class="val" id="fliesBallCountVal">60</span></label>
        <label><span>Attraction power</span><input type="range" id="attractPowerSlider" min="100" max="8000" step="50" value="5000"><span class="val" id="attractPowerVal">5000</span></label>
        <label><span>Swarm speed (×)</span><input type="range" id="swarmSpeedSlider" min="0.2" max="5.0" step="0.1" value="0.4"><span class="val" id="swarmSpeedVal">0.4</span></label>
        <label><span>Separation force</span><input type="range" id="fliesSeparationSlider" min="5000" max="30000" step="1000" value="15000"><span class="val" id="fliesSeparationVal">15000</span></label>
      </div>
    </details>
  </div>
  
  <div id="weightlessControls" class="mode-controls">
    <details open>
      <summary>🌌 Zero-G Mode</summary>
      <div class="group">
        <label><span>Ball count</span><input type="range" id="weightlessCountSlider" min="20" max="200" step="10" value="80"><span class="val" id="weightlessCountVal">80</span></label>
        <label><span>Initial speed</span><input type="range" id="weightlessSpeedSlider" min="100" max="600" step="25" value="250"><span class="val" id="weightlessSpeedVal">250</span></label>
        <label><span>Bounce</span><input type="range" id="weightlessBounceSlider" min="0.5" max="1.0" step="0.05" value="0.95"><span class="val" id="weightlessBounceVal">0.95</span></label>
      </div>
    </details>
  </div>
  
  <div id="waterControls" class="mode-controls">
    <details open>
      <summary>🌊 Water Swimming Mode</summary>
      <div class="group">
        <label><span>Ball count</span><input type="range" id="waterBallCountSlider" min="50" max="400" step="10" value="300"><span class="val" id="waterBallCountVal">300</span></label>
        <label><span>Ripple strength</span><input type="range" id="waterRippleStrengthSlider" min="5000" max="30000" step="1000" value="18000"><span class="val" id="waterRippleStrengthVal">18000</span></label>
        <label><span>Motion intensity</span><input type="range" id="waterMotionSlider" min="0" max="80" step="1" value="40"><span class="val" id="waterMotionVal">40</span></label>
        <div style="font-size: 9px; opacity: 0.7; margin-top: 6px;">Move your cursor to create ripples</div>
      </div>
    </details>
  </div>
  
  <div id="vortexControls" class="mode-controls">
    <details open>
      <summary>🌀 Vortex Sheets Mode</summary>
      <div class="group">
        <label><span>Ball count</span><input type="range" id="vortexBallCountSlider" min="50" max="300" step="10" value="180"><span class="val" id="vortexBallCountVal">180</span></label>
        <label><span>Swirl strength</span><input type="range" id="vortexSwirlSlider" min="100" max="800" step="20" value="420"><span class="val" id="vortexSwirlVal">420</span></label>
        <label><span>Radial pull</span><input type="range" id="vortexPullSlider" min="0" max="400" step="10" value="180"><span class="val" id="vortexPullVal">180</span></label>
        <div style="font-size: 9px; opacity: 0.7; margin-top: 6px;">Move cursor to create vortex</div>
      </div>
    </details>
  </div>
  
  <div id="ping-pongControls" class="mode-controls">
    <details open>
      <summary>🏓 Ping Pong Mode</summary>
      <div class="group">
        <label><span>Ball count</span><input type="range" id="pingPongBallCountSlider" min="10" max="100" step="5" value="35"><span class="val" id="pingPongBallCountVal">35</span></label>
        <label><span>Ball speed</span><input type="range" id="pingPongSpeedSlider" min="200" max="1200" step="50" value="800"><span class="val" id="pingPongSpeedVal">800</span></label>
        <label><span>Cursor obstacle size</span><input type="range" id="pingPongCursorSlider" min="20" max="200" step="10" value="50"><span class="val" id="pingPongCursorVal">50</span></label>
        <div style="font-size: 9px; opacity: 0.7; margin-top: 6px;">Continuous motion • Cursor deflects balls</div>
      </div>
    </details>
  </div>
  
  <div id="magneticControls" class="mode-controls">
    <details open>
      <summary>🧲 Magnetic Mode</summary>
      <div class="group">
        <label><span>Ball count</span><input type="range" id="magneticBallCountSlider" min="50" max="300" step="10" value="180"><span class="val" id="magneticBallCountVal">180</span></label>
        <label><span>Magnetic strength</span><input type="range" id="magneticStrengthSlider" min="10000" max="100000" step="5000" value="65000"><span class="val" id="magneticStrengthVal">65000</span></label>
        <label><span>Max velocity</span><input type="range" id="magneticVelocitySlider" min="500" max="4000" step="100" value="2800"><span class="val" id="magneticVelocityVal">2800</span></label>
        <div style="font-size: 9px; opacity: 0.7; margin-top: 6px;">Cursor drives magnetic swirls (no explosions)</div>
      </div>
    </details>
  </div>
  
  <div id="bubblesControls" class="mode-controls">
    <details open>
      <summary>🫧 Carbonated Bubbles Mode</summary>
      <div class="group">
        <label><span>Bubble rate</span><input type="range" id="bubblesRateSlider" min="1" max="20" step="1" value="8"><span class="val" id="bubblesRateVal">8</span></label>
        <label><span>Rise speed</span><input type="range" id="bubblesSpeedSlider" min="50" max="400" step="25" value="150"><span class="val" id="bubblesSpeedVal">150</span></label>
        <label><span>Wobble</span><input type="range" id="bubblesWobbleSlider" min="0" max="100" step="5" value="40"><span class="val" id="bubblesWobbleVal">40</span></label>
        <label><span>Max bubbles</span><input type="range" id="bubblesMaxSlider" min="50" max="300" step="10" value="150"><span class="val" id="bubblesMaxVal">150</span></label>
        <label><span>Cursor deflection</span><input type="range" id="bubblesDeflectSlider" min="20" max="150" step="10" value="80"><span class="val" id="bubblesDeflectVal">80</span></label>
        <div style="font-size: 9px; opacity: 0.7; margin-top: 6px;">Bubbles rise from bottom • Pop at top • Cursor deflects</div>
      </div>
    </details>
  </div>
  
  <div style="font-size:10px; opacity:0.5; text-align:center; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">
    <code>R</code> reset • <code>/</code> panel • click/tap cycles modes
  </div>
  
  </div>
`;

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                      LOCALSTORAGE PERSISTENCE                                ║
  // ║              Extracted from balls-source.html lines 1587-1748                ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function saveSettings() {
    {
      console.log('⚠️ localStorage is disabled');
      return;
    }
  }

  function loadSettings() {
    {
      console.log('⚠️ localStorage is disabled - using defaults');
      return false;
    }
  }

  function autoSaveSettings() {
    clearTimeout(window.settingsSaveTimeout);
    window.settingsSaveTimeout = setTimeout(saveSettings, 500);
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                              BALL CLASS (COMPLETE)                           ║
  // ║                   Extracted from balls-source.html lines 1823-2234           ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  class Ball {
    constructor(x, y, r, color) {
      const globals = getGlobals();
      this.x = x;
      this.y = y;
      this.vx = (Math.random()*2 - 1) * 200;
      this.vy = -Math.random()*200;
      this.r = r;
      this.rBase = r;
      this.m = globals.ballMassKg;
      this.color = color;
      this.t = 0;
      this.age = 0;
      this.driftAx = 0;
      this.driftTime = 0;
      this.omega = 0;
      this.squash = 1.0;
      this.squashDirX = 1;
      this.squashDirY = 0;
      this.theta = 0;
      this.squashAmount = 0.0;
      this.squashNormalAngle = 0.0;
      this.alpha = 1.0;
      this.isSleeping = false;
      this.sleepTimer = 0;  // Time spent below sleep threshold
    }

    step(dt, applyForcesFunc) {
      const globals = getGlobals();
      const { currentMode, G, gravityScale, FRICTION, MASS_BASELINE_KG } = globals;
      
      this.t += dt;
      this.age += dt;
      
      // Wake up if sleeping and mouse is nearby (Ball Pit mode only)
      if (this.isSleeping && currentMode === MODES.PIT) {
        const mouseX = globals.mouseX;
        const mouseY = globals.mouseY;
        const wakeRadius = (globals.repelRadius || 710) * globals.DPR * 1.2; // 20% larger than repel radius
        const dx = this.x - mouseX;
        const dy = this.y - mouseY;
        const dist2 = dx * dx + dy * dy;
        
        if (dist2 < wakeRadius * wakeRadius) {
          this.wake();
        }
      }
      
      // Skip all physics if sleeping (Box2D approach)
      if (this.isSleeping) {
        return;
      }

      // Gravity (skip in weightless)
      if (currentMode !== MODES.WEIGHTLESS) {
        this.vy += (G * gravityScale) * dt;
      }
      
      // Drag
      const massScale = Math.max(0.25, this.m / MASS_BASELINE_KG);
      const dragAmount = (currentMode === MODES.WEIGHTLESS) ? 0.0001 : FRICTION;
      const drag = Math.max(0, 1 - (dragAmount / massScale));
      this.vx *= drag;
      this.vy *= drag;
      
      // Drift
      if (this.driftAx !== 0 && this.age < this.driftTime) {
        this.vx += (this.driftAx * dt) / massScale;
      } else if (this.driftAx !== 0) {
        this.driftAx = 0;
      }
      
      // External forces
      if (applyForcesFunc) applyForcesFunc(this, dt);
      
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      
      // Spin
      const spinDamp = Math.max(0, 1 - CONSTANTS.SPIN_DAMP_PER_S * dt);
      this.omega *= spinDamp;
      this.theta += this.omega * dt;
      
      // Squash decay
      const decay = Math.min(1, CONSTANTS.SQUASH_DECAY_PER_S * dt);
      this.squashAmount += (0 - this.squashAmount) * decay;
      this.squash = 1 - this.squashAmount;
      
      // Sleep detection (Ball Pit mode only, Box2D-style)
      if (currentMode === MODES.PIT) {
        this.updateSleepState(dt, globals);
      }
    }
    
    /**
     * Box2D-inspired sleep detection
     * Only sleeps if grounded AND below velocity threshold for sustained time
     */
    updateSleepState(dt, globals) {
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      const angularSpeed = Math.abs(this.omega);
      const canvas = globals.canvas;
      
      // Check if grounded (within 1px of bottom)
      const isGrounded = canvas && (this.y + this.r >= canvas.height - 1);
      
      // Box2D uses 0.05 m/s threshold, we use 5 px/s
      const belowThreshold = speed < CONSTANTS.SLEEP_VELOCITY_THRESHOLD && 
                            angularSpeed < CONSTANTS.SLEEP_ANGULAR_THRESHOLD;
      
      if (isGrounded && belowThreshold) {
        this.sleepTimer += dt;
        
        // Must be below threshold for TIME_TO_SLEEP seconds (stability check)
        if (this.sleepTimer >= CONSTANTS.TIME_TO_SLEEP) {
          this.vx = 0;
          this.vy = 0;
          this.omega = 0;
          this.isSleeping = true;
        }
      } else {
        // Reset timer if ball moves or lifts off ground
        this.sleepTimer = 0;
      }
    }
    
    /**
     * Wake up a sleeping ball (Box2D-style)
     * Called when external forces are about to be applied
     */
    wake() {
      this.isSleeping = false;
      this.sleepTimer = 0;
    }

    walls(w, h, dt, customRest) {
      const globals = getGlobals();
      const { REST, MASS_BASELINE_KG, MASS_REST_EXP, currentMode, DPR } = globals;
      const rest = customRest !== undefined ? customRest : REST;
      
      const viewportTop = (currentMode === MODES.PIT) ? (h / 3) : 0;
      
      // Corner radius: container radius minus simulation padding, scaled by DPR
      // Uses getCanvasCornerRadius() for auto-calculation based on current padding
      const cr = (globals.getCanvasCornerRadius() || 100) * (DPR || 1);
      
      // No border inset - balls use full canvas bounds
      const borderInset = 0;
      
      let hasWallCollision = false;
      
      // ════════════════════════════════════════════════════════════════════════
      // CORNER COLLISION: Push balls out of rounded corner zones
      // Check if ball center is within a corner quadrant and too close to arc
      // ════════════════════════════════════════════════════════════════════════
      const corners = [
        { cx: cr, cy: viewportTop + cr },           // Top-left
        { cx: w - cr, cy: viewportTop + cr },       // Top-right
        { cx: cr, cy: h - cr },                      // Bottom-left
        { cx: w - cr, cy: h - cr }                   // Bottom-right
      ];
      
      for (let i = 0; i < corners.length; i++) {
        const corner = corners[i];
        // Check if ball is in this corner's quadrant
        const inXZone = (i % 2 === 0) ? (this.x < cr) : (this.x > w - cr);
        const inYZone = (i < 2) ? (this.y < viewportTop + cr) : (this.y > h - cr);
        
        if (inXZone && inYZone) {
          const dx = this.x - corner.cx;
          const dy = this.y - corner.cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = cr - this.r; // Ball must stay inside the arc
          
          if (dist > minDist && minDist > 0) {
            // Push ball back inside the rounded corner
            hasWallCollision = true;
            const overlap = dist - minDist;
            const nx = dx / dist;
            const ny = dy / dist;
            this.x -= nx * overlap;
            this.y -= ny * overlap;
            
            // Reflect velocity off the arc tangent
            const velDotN = this.vx * nx + this.vy * ny;
            if (velDotN > 0) {
              this.vx -= (1 + rest) * velDotN * nx;
              this.vy -= (1 + rest) * velDotN * ny;
            }
          }
        }
      }
      
      // Effective boundaries (accounting for inner border)
      const minX = borderInset;
      const maxX = w - borderInset;
      const minY = viewportTop + borderInset;
      const maxY = h - borderInset;
      
      // Bottom
      if (this.y + this.r > maxY) {
        hasWallCollision = true;
        this.y = maxY - this.r;
        const preVy = this.vy;
        const slip = this.vx - this.omega * this.r;
        const massScale = Math.max(0.25, this.m / MASS_BASELINE_KG);
        this.omega += (slip / this.r) * CONSTANTS.SPIN_GAIN / massScale;
        const rollDamp = Math.max(0, 1 - CONSTANTS.ROLL_FRICTION_PER_S * dt / massScale);
        this.vx *= rollDamp;
        const wallRest = Math.abs(preVy) < CONSTANTS.WALL_REST_VEL_THRESHOLD ? 0 : rest;
        this.vy = -this.vy * (wallRest * Math.pow(MASS_BASELINE_KG / this.m, MASS_REST_EXP));
        const impact = Math.min(1, Math.abs(preVy) / (this.r * 90));
        this.squashAmount = Math.min(globals.getSquashMax(), impact * 0.8);
        this.squashNormalAngle = -Math.PI / 2;
        const rollTarget = this.vx / this.r;
        this.omega += (rollTarget - this.omega) * Math.min(1, CONSTANTS.GROUND_COUPLING_PER_S * dt);
      }
      
      // Top
      if (this.y - this.r < minY) {
        hasWallCollision = true;
        this.y = minY + this.r;
        this.vy = -this.vy * rest;
        const impact = Math.min(1, Math.abs(this.vy) / (this.r * 90));
        this.squashAmount = Math.min(globals.getSquashMax(), impact * 0.8);
        this.squashNormalAngle = Math.PI / 2;
      }
      
      // Right
      if (this.x + this.r > maxX) {
        hasWallCollision = true;
        this.x = maxX - this.r;
        const slip = this.vy - this.omega * this.r;
        const massScale = Math.max(0.25, this.m / MASS_BASELINE_KG);
        this.omega += (slip / this.r) * (CONSTANTS.SPIN_GAIN * 0.5) / massScale;
        this.vx = -this.vx * (REST * Math.pow(MASS_BASELINE_KG / this.m, MASS_REST_EXP));
        const impact = Math.min(1, Math.abs(this.vx)/(this.r*70));
        this.squashAmount = Math.min(globals.getSquashMax(), impact * 0.8);
        this.squashNormalAngle = Math.PI;
      }
      
      // Left
      if (this.x - this.r < minX) {
        hasWallCollision = true;
        this.x = minX + this.r;
        const slip = this.vy - this.omega * this.r;
        const massScale = Math.max(0.25, this.m / MASS_BASELINE_KG);
        this.omega += (slip / this.r) * (CONSTANTS.SPIN_GAIN * 0.5) / massScale;
        this.vx = -this.vx * (REST * Math.pow(MASS_BASELINE_KG / this.m, MASS_REST_EXP));
        const impact = Math.min(1, Math.abs(this.vx)/(this.r*70));
        this.squashAmount = Math.min(globals.getSquashMax(), impact * 0.8);
        this.squashNormalAngle = 0;
      }
      
      // Wake on wall collision (prevents sleeping balls from getting stuck in walls)
      if (hasWallCollision && this.isSleeping) {
        this.wake();
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.theta);
      
      // Apply squash
      if (this.squashAmount > 0.001) {
        const squashX = 1 - this.squashAmount * 0.3;
        const squashY = 1 + this.squashAmount * 0.3;
        ctx.rotate(this.squashNormalAngle);
        ctx.scale(squashX, squashY);
        ctx.rotate(-this.squashNormalAngle);
      }
      
      ctx.beginPath();
      ctx.arc(0, 0, this.r, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.globalAlpha = this.alpha;
      ctx.fill();
      ctx.globalAlpha = 1.0;
      ctx.restore();
    }
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                              BALL SPAWNING                                   ║
  // ║              Extracted from balls-source.html lines 2249-2284                ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function randBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function spawnBall(x, y, color) {
    if (!color) color = pickRandomColor();
    const globals = getGlobals();
    const baseSize = (globals.R_MIN + globals.R_MAX) / 2;
    
    let r;
    if (globals.sizeVariation === 0) {
      r = baseSize;
    } else {
      const maxVariation = baseSize * 0.1;
      const minR = Math.max(1, baseSize - maxVariation);
      const maxR = baseSize + maxVariation;
      r = randBetween(minR, maxR);
    }
    
    const ball = new Ball(x, y, r, color);
    
    const centerX = globals.canvas.width * 0.5;
    const dir = (x < centerX) ? 1 : -1;
    const sizeInfluence = clamp((r / ((globals.R_MIN + globals.R_MAX) * 0.5)), 0.6, 1.4);
    const baseKick = 140 * sizeInfluence;
    const randKick = 180 * sizeInfluence;
    const upwardKick = 120;
    ball.vx = dir * (baseKick + Math.random() * randKick);
    ball.vy = -Math.random() * upwardKick;
    ball.driftAx = dir * (360 + Math.random() * 420) * sizeInfluence;
    ball.driftTime = 0.22 + Math.random() * 0.28;
    
    globals.balls.push(ball);
    return ball;
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                                FLIES MODE                                    ║
  // ║            Extracted from balls-source.html lines 3521-3551                  ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function initializeFlies() {
    const globals = getGlobals();
    clearBalls();
    
    const targetBalls = 60;
    const w = globals.canvas.width;
    const h = globals.canvas.height;
    const centerX = w * 0.5;
    const centerY = h * 0.5;
    const swarmRadius = 150 * globals.DPR;
    
    // First, ensure at least one ball of each color (0-7)
    for (let colorIndex = 0; colorIndex < 8; colorIndex++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * swarmRadius;
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      
      const ball = spawnBall(x, y, getColorByIndex(colorIndex));
      
      const speedVariation = 0.5 + Math.random() * 0.5;
      const vAngle = Math.random() * Math.PI * 2;
      const speed = 300 * speedVariation;
      ball.vx = Math.cos(vAngle) * speed;
      ball.vy = Math.sin(vAngle) * speed;
      ball.driftAx = 0;
      ball.driftTime = 0;
    }
    
    // Then fill the rest with random colors
    for (let i = 8; i < targetBalls; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * swarmRadius;
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      
      const ball = spawnBall(x, y);
      
      const speedVariation = 0.5 + Math.random() * 0.5;
      const vAngle = Math.random() * Math.PI * 2;
      const speed = 300 * speedVariation;
      ball.vx = Math.cos(vAngle) * speed;
      ball.vy = Math.sin(vAngle) * speed;
      ball.driftAx = 0;
      ball.driftTime = 0;
    }
  }

  function applyFliesForces(ball, dt) {
    const globals = getGlobals();
    const attractionPower = 5000;
    const swarmSpeed = 0.4;
    
    const swarmCenterX = (globals.mouseX === -1e9) ? globals.canvas.width * 0.5 : globals.mouseX;
    const swarmCenterY = (globals.mouseY === -1e9) ? globals.canvas.height * 0.5 : globals.mouseY;
    
    const dx = swarmCenterX - ball.x;
    const dy = swarmCenterY - ball.y;
    const d = Math.sqrt(dx*dx + dy*dy + 1);
    
    const dirX = dx / d;
    const dirY = dy / d;
    
    const attractForce = attractionPower * swarmSpeed * 2.0;
    ball.vx += dirX * attractForce * dt;
    ball.vy += dirY * attractForce * dt;
    
    // Separation
    const separationRadius = 120 * globals.DPR;
    let sepX = 0, sepY = 0, neighborCount = 0;
    for (let i = 0; i < globals.balls.length; i++) {
      const other = globals.balls[i];
      if (other === ball) continue;
      const dx2 = ball.x - other.x;
      const dy2 = ball.y - other.y;
      const d2 = dx2*dx2 + dy2*dy2;
      if (d2 < separationRadius * separationRadius && d2 > 0) {
        const d_other = Math.sqrt(d2);
        const strength = 1 - (d_other / separationRadius);
        sepX += (dx2 / d_other) * strength;
        sepY += (dy2 / d_other) * strength;
        neighborCount++;
      }
    }
    if (neighborCount > 0) {
      const separationForce = 15000;
      ball.vx += (sepX / neighborCount) * separationForce * dt;
      ball.vy += (sepY / neighborCount) * separationForce * dt;
    }
    
    // Jitter
    const jitterBase = 2500 * swarmSpeed;
    ball.vx += (Math.random() - 0.5) * jitterBase * dt;
    ball.vy += (Math.random() - 0.5) * jitterBase * dt;
  }

  var flies = /*#__PURE__*/Object.freeze({
    __proto__: null,
    applyFliesForces: applyFliesForces,
    initializeFlies: initializeFlies
  });

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                              BALL PIT MODE                                   ║
  // ║            Extracted from balls-source.html lines 3489-3518                  ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function initializeBallPit() {
    const globals = getGlobals();
    clearBalls();
    
    const targetBalls = 300; // MAX_BALLS
    globals.canvas.width;
    const DPR = globals.DPR;
    
    // CRITICAL: Use container height (not canvas height) for spawn calculations
    // Canvas is 150% of container (top 1/3 is spawn area above viewport)
    // Spawn positions are relative to the visible viewport, so we need base container height
    const container = globals.container || document.getElementById('bravia-balls');
    const containerHeightCss = container ? container.clientHeight : (globals.canvas.clientHeight / 1.5);
    
    // Account for simulation padding (canvas is inset from container)
    const simPad = globals.simulationPadding || 0;
    const visibleHeightCss = containerHeightCss - (simPad * 2);
    
    // Spawn parameters (from config)
    const SPAWN_Y_VH = -50;  // -50% = spawn 50% above visible viewport
    const SPAWN_H_VH = 50;   // 50% height spawn zone
    const SPAWN_W_VW = 100;  // Full width
    const SPAWN_X_CENTER_VW = 50;
    
    const spawnYTop = (SPAWN_Y_VH / 100) * visibleHeightCss * DPR;
    const spawnYBottom = spawnYTop + (SPAWN_H_VH / 100) * visibleHeightCss * DPR;
    const widthCss = (SPAWN_W_VW / 100) * (globals.canvas.clientWidth);
    const xCenterCss = (SPAWN_X_CENTER_VW / 100) * (globals.canvas.clientWidth);
    const xLeftCss = xCenterCss - widthCss / 2;
    
    // First, ensure at least one ball of each color (0-7)
    for (let colorIndex = 0; colorIndex < 8; colorIndex++) {
      const x = (xLeftCss + Math.random() * widthCss) * DPR;
      const y = spawnYTop + Math.random() * (spawnYBottom - spawnYTop);
      
      const ball = spawnBall(x, y, getColorByIndex(colorIndex));
      ball.vx = (Math.random() - 0.5) * 100;
      ball.vy = Math.random() * 50;
      ball.driftAx = 0;
      ball.driftTime = 0;
    }
    
    // Then fill the rest with random colors
    for (let i = 8; i < targetBalls; i++) {
      const x = (xLeftCss + Math.random() * widthCss) * DPR;
      const y = spawnYTop + Math.random() * (spawnYBottom - spawnYTop);
      
      const ball = spawnBall(x, y);
      ball.vx = (Math.random() - 0.5) * 100;
      ball.vy = Math.random() * 50;
      ball.driftAx = 0;
      ball.driftTime = 0;
    }
  }

  function applyBallPitForces(ball, dt) {
    const globals = getGlobals();
    const repelPower = globals.repelPower;
    const repelRadius = globals.repelRadius;
    const mouseX = globals.mouseX;
    const mouseY = globals.mouseY;
    
    if (!globals.repellerEnabled || repelPower <= 0 || repelRadius <= 0) return;
    
    const rPx = repelRadius * globals.DPR;
    const dx = ball.x - mouseX;
    const dy = ball.y - mouseY;
    const d2 = dx*dx + dy*dy;
    const r2 = rPx * rPx;
    if (d2 > r2) return;
    
    const d = Math.max(Math.sqrt(d2), 1e-4);
    const nx = dx / d;
    const ny = dy / d;
    const q = Math.max(0, 1 - d / rPx);
    const strength = (repelPower * 20.0) * Math.pow(q, globals.repelSoft || 3.4);
    const massScale = Math.max(0.25, ball.m / globals.MASS_BASELINE_KG);
    ball.vx += (nx * strength * dt) / massScale;
    ball.vy += (ny * strength * dt) / massScale;
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                            WEIGHTLESS MODE                                   ║
  // ║            Extracted from balls-source.html lines 3559-3585                  ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function initializeWeightless() {
    const globals = getGlobals();
    clearBalls();
    
    const targetBalls = globals.weightlessCount;
    const w = globals.canvas.width;
    const h = globals.canvas.height;
    const margin = 40 * globals.DPR;
    
    // First, ensure at least one ball of each color (0-7)
    for (let colorIndex = 0; colorIndex < 8 && colorIndex < targetBalls; colorIndex++) {
      const x = margin + Math.random() * (w - 2 * margin);
      const y = margin + Math.random() * (h - 2 * margin);
      
      const ball = spawnBall(x, y, getColorByIndex(colorIndex));
      
      const angle = Math.random() * Math.PI * 2;
      const speed = globals.weightlessInitialSpeed * (0.7 + Math.random() * 0.3);
      ball.vx = Math.cos(angle) * speed;
      ball.vy = Math.sin(angle) * speed;
      ball.driftAx = 0;
      ball.driftTime = 0;
    }
    
    // Then fill the rest with random colors
    for (let i = 8; i < targetBalls; i++) {
      const x = margin + Math.random() * (w - 2 * margin);
      const y = margin + Math.random() * (h - 2 * margin);
      
      const ball = spawnBall(x, y);
      
      const angle = Math.random() * Math.PI * 2;
      const speed = globals.weightlessInitialSpeed * (0.7 + Math.random() * 0.3);
      ball.vx = Math.cos(angle) * speed;
      ball.vy = Math.sin(angle) * speed;
      ball.driftAx = 0;
      ball.driftTime = 0;
    }
  }

  var weightless = /*#__PURE__*/Object.freeze({
    __proto__: null,
    initializeWeightless: initializeWeightless
  });

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                            WATER/SWIMMING MODE                               ║
  // ║           Balls swim through water with gorgeous ripple effects             ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  // Ripple system
  const ripples = [];

  function initializeWater() {
    const globals = getGlobals();
    clearBalls();
    ripples.length = 0;
    
    const canvas = globals.canvas;
    if (!canvas) return;
    
    const w = canvas.width;
    const h = canvas.height;
    const count = globals.waterBallCount || 100;
    
    // First, ensure at least one ball of each color (0-7)
    for (let colorIndex = 0; colorIndex < 8 && colorIndex < count; colorIndex++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const size = globals.R_MIN + Math.random() * (globals.R_MAX - globals.R_MIN);
      const color = getColorByIndex(colorIndex);
      const ball = new Ball(x, y, size, color);
      
      // Random initial velocities (snowglobe-style movement)
      const v0 = globals.waterInitialVelocity || 120;
      ball.vx = (Math.random() - 0.5) * v0;
      ball.vy = (Math.random() - 0.5) * v0;
      
      globals.balls.push(ball);
    }
    
    // Then fill the rest with random colors
    for (let i = 8; i < count; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const size = globals.R_MIN + Math.random() * (globals.R_MAX - globals.R_MIN);
      const color = pickRandomColor();
      const ball = new Ball(x, y, size, color);
      
      // Random initial velocities (snowglobe-style movement)
      const v0 = globals.waterInitialVelocity || 120;
      ball.vx = (Math.random() - 0.5) * v0;
      ball.vy = (Math.random() - 0.5) * v0;
      
      globals.balls.push(ball);
    }
  }

  function applyWaterForces(ball, dt) {
    const globals = getGlobals();
    
    // Strong water resistance (damping)
    const waterDrag = globals.waterDrag || 0.015;
    ball.vx *= (1 - waterDrag);
    ball.vy *= (1 - waterDrag);
    ball.omega *= (1 - waterDrag * 0.5);
    
    // Apply ripple forces
    for (let i = 0; i < ripples.length; i++) {
      const ripple = ripples[i];
      const dx = ball.x - ripple.x;
      const dy = ball.y - ripple.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Ripple affects balls in expanding ring
      const rippleThickness = 40;
      const innerRadius = ripple.radius - rippleThickness;
      const outerRadius = ripple.radius + rippleThickness;
      
      if (dist > innerRadius && dist < outerRadius) {
        // Calculate force based on distance from ripple edge
        const distFromEdge = Math.abs(dist - ripple.radius);
        const forceMag = ripple.strength * (1 - distFromEdge / rippleThickness);
        
        if (dist > 0.1) {
          const nx = dx / dist;
          const ny = dy / dist;
          ball.vx += nx * forceMag * dt;
          ball.vy += ny * forceMag * dt;
        }
      }
    }
    
    // Gentle ambient drift (like currents)
    const driftStrength = globals.waterDriftStrength || 25;
    ball.vx += Math.sin(ball.t * 0.5 + ball.x * 0.01) * driftStrength * dt;
    ball.vy += Math.cos(ball.t * 0.7 + ball.y * 0.01) * driftStrength * dt;
  }

  function updateWaterRipples(dt) {
    const globals = getGlobals();
    const rippleSpeed = globals.waterRippleSpeed || 300;
    
    // Update existing ripples
    for (let i = ripples.length - 1; i >= 0; i--) {
      const ripple = ripples[i];
      ripple.radius += rippleSpeed * dt;
      ripple.age += dt;
      ripple.strength *= 0.96; // Decay
      
      // Remove old/weak ripples
      if (ripple.age > 3.0 || ripple.strength < 10) {
        ripples.splice(i, 1);
      }
    }
  }

  /**
   * Create a water ripple at the given position
   * @param {number} x - X position
   * @param {number} y - Y position  
   * @param {number} [velocityFactor=1] - Multiplier for ripple strength (based on mouse velocity)
   */
  function createWaterRipple(x, y, velocityFactor = 1) {
    const globals = getGlobals();
    const baseStrength = globals.waterRippleStrength || 15000;
    
    // Scale strength based on velocity factor
    const strength = baseStrength * Math.min(velocityFactor, 5);
    
    ripples.push({
      x,
      y,
      radius: 0,
      strength,
      age: 0
    });
  }

  var water = /*#__PURE__*/Object.freeze({
    __proto__: null,
    applyWaterForces: applyWaterForces,
    createWaterRipple: createWaterRipple,
    initializeWater: initializeWater,
    updateWaterRipples: updateWaterRipples
  });

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                             VORTEX SHEETS MODE                               ║
  // ║      Invisible swirl field anchored to cursor; spirals + radial pull         ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  const FAR_FALLOFF = 0.0015;    // reduces effect with distance

  function initializeVortex() {
    const g = getGlobals();
    clearBalls();
    const canvas = g.canvas;
    if (!canvas) return;

    const w = canvas.width;
    const h = canvas.height;
    const count = Math.min(g.vortexBallCount || 180, g.maxBalls || 300);

    // Ensure at least one of each color
    for (let colorIndex = 0; colorIndex < 8 && colorIndex < count; colorIndex++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = g.R_MIN + Math.random() * (g.R_MAX - g.R_MIN);
      const c = getColorByIndex(colorIndex);
      const b = new Ball(x, y, r, c);
      b.vx = (Math.random() - 0.5) * 80;
      b.vy = (Math.random() - 0.5) * 80;
      g.balls.push(b);
    }

    for (let i = 8; i < count; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = g.R_MIN + Math.random() * (g.R_MAX - g.R_MIN);
      const c = pickRandomColor();
      const b = new Ball(x, y, r, c);
      b.vx = (Math.random() - 0.5) * 80;
      b.vy = (Math.random() - 0.5) * 80;
      g.balls.push(b);
    }
  }

  function applyVortexForces(ball, dt) {
    const g = getGlobals();
    if (g.currentMode !== MODES.VORTEX) return;

    const mx = g.mouseX;
    const my = g.mouseY;
    if (!g.mouseInCanvas) return;

    const swirlStrength = g.vortexSwirlStrength || 420;
    const radialPull = g.vortexRadialPull || 180;

    const dx = ball.x - mx;
    const dy = ball.y - my;
    const dist2 = dx * dx + dy * dy;
    const dist = Math.max(8, Math.sqrt(dist2));
    const inv = 1 / (1 + dist * FAR_FALLOFF);

    // Tangential swirl (perp to radial)
    const nx = dx / dist;
    const ny = dy / dist;
    const tx = -ny;
    const ty = nx;
    const swirl = swirlStrength * inv;
    ball.vx += tx * swirl * dt;
    ball.vy += ty * swirl * dt;

    // Mild inward pull
    const pull = radialPull * inv;
    ball.vx -= nx * pull * dt;
    ball.vy -= ny * pull * dt;
    
    // Gentle drag to prevent runaway speeds
    ball.vx *= 0.995;
    ball.vy *= 0.995;
  }

  var vortex = /*#__PURE__*/Object.freeze({
    __proto__: null,
    applyVortexForces: applyVortexForces,
    initializeVortex: initializeVortex
  });

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                            PING PONG MODE                                    ║
  // ║     Balls bounce left-right continuously; ONLY cursor disrupts their path    ║
  // ║                    No drag, no friction, pure momentum                       ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function initializePingPong() {
    const g = getGlobals();
    clearBalls();
    const canvas = g.canvas;
    if (!canvas) return;

    const w = canvas.width;
    const h = canvas.height;
    const count = Math.min(g.pingPongBallCount || 80, g.maxBalls || 300);
    const baseSpeed = g.pingPongSpeed || 400;

    // Ensure at least one of each color
    for (let colorIndex = 0; colorIndex < 8 && colorIndex < count; colorIndex++) {
      const x = Math.random() * w;
      const y = h * 0.15 + Math.random() * h * 0.7; // Middle 70% vertically
      const r = g.R_MIN + Math.random() * (g.R_MAX - g.R_MIN);
      const c = getColorByIndex(colorIndex);
      const b = new Ball(x, y, r, c);
      // Pure horizontal velocity - no vertical component
      const dir = Math.random() > 0.5 ? 1 : -1;
      b.vx = dir * (baseSpeed * 0.8 + Math.random() * baseSpeed * 0.4);
      b.vy = 0; // Start with zero vertical
      b.isPingPong = true; // Mark for special handling
      g.balls.push(b);
    }

    for (let i = 8; i < count; i++) {
      const x = Math.random() * w;
      const y = h * 0.15 + Math.random() * h * 0.7;
      const r = g.R_MIN + Math.random() * (g.R_MAX - g.R_MIN);
      const c = pickRandomColor();
      const b = new Ball(x, y, r, c);
      const dir = Math.random() > 0.5 ? 1 : -1;
      b.vx = dir * (baseSpeed * 0.8 + Math.random() * baseSpeed * 0.4);
      b.vy = 0;
      b.isPingPong = true;
      g.balls.push(b);
    }
  }

  function applyPingPongForces(ball, dt) {
    const g = getGlobals();
    if (g.currentMode !== MODES.PING_PONG) return;
    if (!ball.isPingPong) return;

    // ═══════════════════════════════════════════════════════════════════════════
    // CURSOR COLLISION - The ONLY thing that disrupts ball movement
    // ═══════════════════════════════════════════════════════════════════════════
    if (g.mouseInCanvas) {
      const cursorRadius = (g.pingPongCursorRadius || 100) * g.DPR;
      const mx = g.mouseX;
      const my = g.mouseY;
      const dx = ball.x - mx;
      const dy = ball.y - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = cursorRadius + ball.r;
      
      if (dist < minDist && dist > 0.1) {
        // Push ball out of cursor
        const overlap = minDist - dist;
        const nx = dx / dist;
        const ny = dy / dist;
        ball.x += nx * overlap * 1.1; // Push out with small buffer
        ball.y += ny * overlap * 1.1;
        
        // Reflect velocity perfectly (elastic collision)
        const velDotN = ball.vx * nx + ball.vy * ny;
        if (velDotN < 0) {
          ball.vx -= 2 * velDotN * nx;
          ball.vy -= 2 * velDotN * ny;
          // Add some spin for visual flair
          ball.omega += velDotN * 0.02;
        }
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MAINTAIN HORIZONTAL ENERGY - Restore any lost horizontal speed
    // ═══════════════════════════════════════════════════════════════════════════
    const targetSpeed = g.pingPongSpeed || 400;
    const currentHSpeed = Math.abs(ball.vx);
    
    // If horizontal speed drops below target, restore it
    if (currentHSpeed < targetSpeed * 0.9) {
      const dir = ball.vx >= 0 ? 1 : -1;
      ball.vx = dir * targetSpeed;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // DAMPEN VERTICAL DRIFT - Gently return to horizontal motion
    // ═══════════════════════════════════════════════════════════════════════════
    // Very slowly reduce vertical velocity to return to pure horizontal motion
    ball.vy *= 0.995;
    
    // NO OTHER DRAG - balls maintain momentum perfectly
  }

  var pingPong = /*#__PURE__*/Object.freeze({
    __proto__: null,
    applyPingPongForces: applyPingPongForces,
    initializePingPong: initializePingPong
  });

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                            MAGNETIC MODE                                     ║
  // ║    Cursor creates POWERFUL magnetic field - balls are violently attracted    ║
  // ║    or repelled based on their "charge". Auto-explosion every 10s.            ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function initializeMagnetic() {
    const g = getGlobals();
    clearBalls();
    const canvas = g.canvas;
    if (!canvas) return;

    const w = canvas.width;
    const h = canvas.height;
    const count = Math.min(g.magneticBallCount || 180, g.maxBalls || 300);

    // Ensure at least one of each color
    for (let colorIndex = 0; colorIndex < 8 && colorIndex < count; colorIndex++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = g.R_MIN + Math.random() * (g.R_MAX - g.R_MIN);
      const c = getColorByIndex(colorIndex);
      const b = new Ball(x, y, r, c);
      b.vx = (Math.random() - 0.5) * 100;
      b.vy = (Math.random() - 0.5) * 100;
      // Assign magnetic charge: positive (attracted) or negative (repelled)
      b.charge = Math.random() > 0.5 ? 1 : -1;
      b.baseAlpha = 1;
      g.balls.push(b);
    }

    for (let i = 8; i < count; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = g.R_MIN + Math.random() * (g.R_MAX - g.R_MIN);
      const c = pickRandomColor();
      const b = new Ball(x, y, r, c);
      b.vx = (Math.random() - 0.5) * 100;
      b.vy = (Math.random() - 0.5) * 100;
      b.charge = Math.random() > 0.5 ? 1 : -1;
      b.baseAlpha = 1;
      g.balls.push(b);
    }
  }

  function applyMagneticForces(ball, dt) {
    const g = getGlobals();
    if (g.currentMode !== MODES.MAGNETIC) return;
    if (!g.mouseInCanvas) return;

    const mx = g.mouseX;
    const my = g.mouseY;
    const dx = mx - ball.x;
    const dy = my - ball.y;
    const dist = Math.max(30, Math.sqrt(dx * dx + dy * dy));
    
    // EXAGGERATED magnetic force - inverse square law with high multiplier
    const magneticStrength = g.magneticStrength || 65000;
    
    // Force magnitude: strong inverse-square attraction/repulsion
    const forceMag = magneticStrength / (dist * dist) * 1000;
    
    // Normalize direction
    const nx = dx / dist;
    const ny = dy / dist;
    
    // Apply force based on charge (positive = attracted, negative = repelled)
    const charge = ball.charge || 1;
    ball.vx += nx * forceMag * charge * dt;
    ball.vy += ny * forceMag * charge * dt;
    
    // Velocity cap to prevent explosion
    const maxVel = g.magneticMaxVelocity || 2800;
    const vel = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    if (vel > maxVel) {
      ball.vx = (ball.vx / vel) * maxVel;
      ball.vy = (ball.vy / vel) * maxVel;
    }
    
    // Very light drag to prevent chaos (but keep it snappy)
    ball.vx *= 0.998;
    ball.vy *= 0.998;
  }

  var magnetic = /*#__PURE__*/Object.freeze({
    __proto__: null,
    applyMagneticForces: applyMagneticForces,
    initializeMagnetic: initializeMagnetic
  });

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                         CARBONATED BUBBLES MODE                              ║
  // ║    Bubbles rise from bottom with wobble, dissipate at top, then recycle      ║
  // ║    Scale up from 0 on spawn, scale down to 0 on dissipate                    ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function initializeBubbles() {
    const g = getGlobals();
    // Clear existing balls
    g.balls.length = 0;
    
    const canvas = g.canvas;
    if (!canvas) return;
    
    const w = canvas.width;
    const h = canvas.height;
    const count = g.bubblesMaxCount || 150;
    
    // Spawn bubbles distributed across the screen (some already rising)
    // First ensure one of each color
    for (let colorIndex = 0; colorIndex < 8 && colorIndex < count; colorIndex++) {
      const x = Math.random() * w;
      const y = h * 0.3 + Math.random() * h * 0.6; // Middle 60% of screen
      createBubble(x, y, getColorByIndex(colorIndex), true); // Already scaled in
    }
    
    // Fill rest with random colors
    for (let i = 8; i < count; i++) {
      const x = Math.random() * w;
      const y = h * 0.3 + Math.random() * h * 0.6;
      createBubble(x, y, pickRandomColor(), true); // Already scaled in
    }
  }

  /**
   * Create a bubble ball at position (x, y) with given color
   * @param {boolean} alreadyVisible - If true, skip spawn animation (for initial setup)
   */
  function createBubble(x, y, color, alreadyVisible = false) {
    const g = getGlobals();
    
    // Variable bubble sizes
    const minR = g.R_MIN * 0.5;
    const maxR = g.R_MAX * 0.8;
    const targetRadius = minR + Math.random() * (maxR - minR);
    
    const b = new Ball(x, y, alreadyVisible ? targetRadius : 0.1, color);
    b.isBubble = true;
    b.baseRadius = targetRadius;
    b.targetRadius = targetRadius;
    b.wobblePhase = Math.random() * Math.PI * 2;
    b.wobbleFreq = 2 + Math.random() * 3;
    b.vx = (Math.random() - 0.5) * 20;
    b.vy = -50 - Math.random() * 50;
    
    // Animation states
    b.spawning = !alreadyVisible;
    b.spawnProgress = alreadyVisible ? 1 : 0;
    b.dissipating = false;
    b.dissipateProgress = 0;
    b.alpha = 1;
    
    g.balls.push(b);
    return b;
  }

  /**
   * Recycle a bubble - reset it to the bottom with new properties
   */
  function recycleBubble(ball) {
    const g = getGlobals();
    const canvas = g.canvas;
    if (!canvas) return;
    
    const w = canvas.width;
    const h = canvas.height;
    
    // New random x position at bottom
    ball.x = Math.random() * w;
    ball.y = h + 20 + Math.random() * 30; // Just below screen
    
    // Reset velocity
    ball.vx = (Math.random() - 0.5) * 20;
    ball.vy = -50 - Math.random() * 50;
    
    // New wobble phase
    ball.wobblePhase = Math.random() * Math.PI * 2;
    ball.wobbleFreq = 2 + Math.random() * 3;
    
    // New random color from full palette
    ball.c = pickRandomColor();
    
    // New target size
    const minR = g.R_MIN * 0.5;
    const maxR = g.R_MAX * 0.8;
    ball.targetRadius = minR + Math.random() * (maxR - minR);
    ball.baseRadius = ball.targetRadius;
    
    // Start spawn animation (scale up from 0)
    ball.r = 0.1;
    ball.spawning = true;
    ball.spawnProgress = 0;
    ball.dissipating = false;
    ball.dissipateProgress = 0;
    ball.alpha = 1;
  }

  function applyBubblesForces(ball, dt) {
    const g = getGlobals();
    if (g.currentMode !== MODES.BUBBLES) return;
    if (!ball.isBubble) return;
    
    const canvas = g.canvas;
    if (!canvas) return;
    
    // Handle spawn animation (scale up from 0)
    if (ball.spawning) {
      ball.spawnProgress += dt * 3; // Scale up over ~0.33s
      
      // Ease out for smooth appearance
      const ease = 1 - Math.pow(1 - Math.min(1, ball.spawnProgress), 3);
      ball.r = ball.targetRadius * ease;
      ball.rBase = ball.r;
      
      if (ball.spawnProgress >= 1) {
        ball.spawning = false;
        ball.r = ball.targetRadius;
        ball.rBase = ball.targetRadius;
      }
    }
    
    // Handle dissipation animation (scale down to 0)
    if (ball.dissipating) {
      ball.dissipateProgress += dt * 3; // Scale down over ~0.33s
      
      // Ease in for smooth disappearance
      const ease = Math.pow(ball.dissipateProgress, 2);
      ball.r = ball.targetRadius * Math.max(0, 1 - ease);
      ball.rBase = ball.r;
      ball.alpha = Math.max(0, 1 - ease * 0.5); // Slight fade
      
      // Slow down during dissipation
      ball.vy *= 0.92;
      ball.vx *= 0.92;
      
      // When fully dissipated, recycle
      if (ball.dissipateProgress >= 1) {
        recycleBubble(ball);
      }
      return;
    }
    
    const riseSpeed = g.bubblesRiseSpeed || 150;
    const wobbleStrength = (g.bubblesWobble || 40) * 0.01;
    
    // Buoyancy force (rise upward)
    const buoyancy = riseSpeed * g.DPR;
    ball.vy -= buoyancy * dt;
    
    // Wobble (side-to-side oscillation)
    ball.wobblePhase += ball.wobbleFreq * dt;
    const wobble = Math.sin(ball.wobblePhase) * wobbleStrength * 100;
    ball.vx += wobble * dt;
    
    // Horizontal drag
    ball.vx *= 0.92;
    
    // Vertical drag
    ball.vy *= 0.96;
    
    // Cursor deflection
    if (g.mouseInCanvas) {
      const dx = ball.x - g.mouseX;
      const dy = ball.y - g.mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const deflectRadius = (g.bubblesDeflectRadius || 80) * g.DPR;
      
      if (dist < deflectRadius && dist > 1) {
        const force = (1 - dist / deflectRadius) * 300;
        const nx = dx / dist;
        const ny = dy / dist;
        ball.vx += nx * force * dt;
        ball.vy += ny * force * dt;
      }
    }
    
    // Check if bubble reached very top - start dissipating
    const topThreshold = ball.targetRadius * 2; // Very close to top edge
    
    if (ball.y < topThreshold && !ball.dissipating && !ball.spawning) {
      ball.dissipating = true;
      ball.dissipateProgress = 0;
    }
    
    // Safety: recycle if bubble goes off sides
    if (ball.x < -ball.r * 4 || ball.x > canvas.width + ball.r * 4) {
      recycleBubble(ball);
    }
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                            ACCESSIBILITY HELPERS                             ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝

  function announceToScreenReader(message) {
    const announcer = document.getElementById('announcer');
    if (!announcer) return;
    announcer.textContent = '';
    setTimeout(() => { announcer.textContent = message; }, 10);
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                      MODE CONTROLLER (COMPLETE)                              ║
  // ║         Extracted from balls-source.html lines 3999-4085                     ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function setMode(mode) {
    const globals = getGlobals();
    setMode$1(mode);
    
    console.log(`Switching to mode: ${mode}`);
    const modeNames = { 
      pit: 'Ball Pit', 
      flies: 'Flies to Light', 
      weightless: 'Zero Gravity', 
      water: 'Water Swimming',
      vortex: 'Vortex Sheets',
      'ping-pong': 'Ping Pong',
      magnetic: 'Magnetic',
      bubbles: 'Carbonated Bubbles'
    };
    announceToScreenReader(`Switched to ${modeNames[mode] || mode} mode`);
    
    // NOTE: UI button updates are handled by the caller (controls.js, keyboard.js)
    // to avoid circular dependencies
    
    // Update container class for mode-specific styling
    // PRESERVE dark-mode class when switching modes!
    if (globals.container) {
      const wasDark = globals.container.classList.contains('dark-mode');
      globals.container.className = '';
      if (mode === MODES.PIT) {
        globals.container.classList.add('mode-pit');
      }
      // Restore dark mode class if it was set
      if (wasDark || globals.isDarkMode) {
        globals.container.classList.add('dark-mode');
      }
    }
    
    // Resize canvas to match mode height
    resize();
    
    // Set physics parameters and initialize scene
    if (mode === MODES.PIT) {
      globals.gravityMultiplier = globals.gravityMultiplierPit;
      globals.G = globals.GE * globals.gravityMultiplier;
      globals.repellerEnabled = true;
      initializeBallPit();
    } else if (mode === MODES.FLIES) {
      globals.gravityMultiplier = 0.0;
      globals.G = 0;
      globals.repellerEnabled = false;
      initializeFlies();
    } else if (mode === MODES.WEIGHTLESS) {
      globals.gravityMultiplier = 0.0;
      globals.G = 0;
      globals.repellerEnabled = false;
      initializeWeightless();
    } else if (mode === MODES.WATER) {
      globals.gravityMultiplier = 0.0;
      globals.G = 0;
      globals.repellerEnabled = false;
      initializeWater();
    } else if (mode === MODES.VORTEX) {
      globals.gravityMultiplier = 0.0;
      globals.G = 0;
      globals.repellerEnabled = false;
      initializeVortex();
    } else if (mode === MODES.PING_PONG) {
      globals.gravityMultiplier = 0.0;
      globals.G = 0;
      globals.repellerEnabled = false;
      initializePingPong();
    } else if (mode === MODES.MAGNETIC) {
      globals.gravityMultiplier = 0.0;
      globals.G = 0;
      globals.repellerEnabled = false;
      initializeMagnetic();
    } else if (mode === MODES.BUBBLES) {
      globals.gravityMultiplier = 0.0;
      globals.G = 0;
      globals.repellerEnabled = false;
      initializeBubbles();
    }
    
    console.log(`Mode ${mode} initialized with ${globals.balls.length} balls`);
  }

  function getForceApplicator() {
    const globals = getGlobals();
    if (globals.currentMode === MODES.FLIES) {
      return applyFliesForces;
    } else if (globals.currentMode === MODES.PIT) {
      return applyBallPitForces;
    } else if (globals.currentMode === MODES.WATER) {
      return applyWaterForces;
    } else if (globals.currentMode === MODES.VORTEX) {
      return applyVortexForces;
    } else if (globals.currentMode === MODES.PING_PONG) {
      return applyPingPongForces;
    } else if (globals.currentMode === MODES.MAGNETIC) {
      return applyMagneticForces;
    } else if (globals.currentMode === MODES.BUBBLES) {
      return applyBubblesForces;
    }
    return null;
  }

  var modeController = /*#__PURE__*/Object.freeze({
    __proto__: null,
    MODES: MODES,
    getForceApplicator: getForceApplicator,
    setMode: setMode
  });

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                            UI CONTROLS WIRING                                ║
  // ║      Wires sliders/selects to global state and systems (subset)             ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function bindSlider(id, onChange) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => onChange(el));
  }

  function setVal(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function setupControls() {
    const g = getGlobals();

    // ═══════════════════════════════════════════════════════════════════════════
    // MODE BUTTONS - Critical for panel mode switching
    // ═══════════════════════════════════════════════════════════════════════════
    const modeButtons = document.querySelectorAll('.mode-button');
    modeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mode = btn.getAttribute('data-mode');
        console.log('Mode button clicked:', mode);
        setMode(mode);
        updateModeButtonsUI(mode);
      });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // GLOBAL SETTINGS
    // ═══════════════════════════════════════════════════════════════════════════
    bindSlider('sizeSliderGlobal', (el) => {
      g.sizeScale = parseFloat(el.value);
      setVal('sizeValGlobal', g.sizeScale.toFixed(2));
      // Update current balls to new base size
      const base = (g.R_MIN_BASE + g.R_MAX_BASE) / 2;
      g.R_MIN = base * g.sizeScale * 0.75;
      g.R_MAX = base * g.sizeScale * 1.25;
      const newSize = (g.R_MIN + g.R_MAX) / 2;
      for (let i = 0; i < g.balls.length; i++) {
        g.balls[i].r = newSize; g.balls[i].rBase = newSize;
      }
      autoSaveSettings();
    });
    bindSlider('ballSoftnessSliderGlobal', (el) => {
      g.ballSoftness = parseInt(el.value, 10);
      setVal('ballSoftnessValGlobal', String(g.ballSoftness));
      autoSaveSettings();
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // TWO-LEVEL PADDING CONTROLS
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Container border: outer frame (insets container from viewport)
    bindSlider('containerBorderSlider', (el) => {
      g.containerBorder = parseInt(el.value, 10);
      setVal('containerBorderVal', String(g.containerBorder));
      applyFramePaddingCSSVars();
      resize();
      autoSaveSettings();
    });
    
    // Simulation padding: inner padding (canvas inset from container)
    bindSlider('simulationPaddingSlider', (el) => {
      g.simulationPadding = parseInt(el.value, 10);
      setVal('simulationPaddingVal', String(g.simulationPadding));
      applyFramePaddingCSSVars();
      resize();
      autoSaveSettings();
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // BALL PIT MODE CONTROLS
    // ═══════════════════════════════════════════════════════════════════════════
    bindSlider('gravityPitSlider', (el) => {
      g.gravityMultiplierPit = parseFloat(el.value);
      setVal('gravityPitVal', g.gravityMultiplierPit.toFixed(2));
      if (g.currentMode === 'pit') g.G = g.GE * g.gravityMultiplierPit;
      autoSaveSettings();
    });
    bindSlider('weightPitSlider', (el) => {
      g.ballMassKg = parseFloat(el.value);
      setVal('weightPitVal', g.ballMassKg.toFixed(0));
      for (let i = 0; i < g.balls.length; i++) g.balls[i].m = g.ballMassKg;
      autoSaveSettings();
    });
    bindSlider('restitutionSlider', (el) => {
      g.REST = parseFloat(el.value);
      setVal('restitutionVal', g.REST.toFixed(2));
      autoSaveSettings();
    });
    bindSlider('frictionSlider', (el) => {
      g.FRICTION = parseFloat(el.value);
      setVal('frictionVal', g.FRICTION.toFixed(4));
      autoSaveSettings();
    });

    // Repeller
    const repellerEnabledPit = document.getElementById('repellerEnabledPit');
    if (repellerEnabledPit) {
      repellerEnabledPit.addEventListener('change', () => {
        g.repellerEnabled = !!repellerEnabledPit.checked;
        autoSaveSettings();
      });
    }
    bindSlider('repelSizeSlider', (el) => {
      g.repelRadius = parseFloat(el.value);
      setVal('repelSizeVal', g.repelRadius.toFixed(0));
      autoSaveSettings();
    });
    bindSlider('repelPowerSlider', (el) => {
      const sliderPos = parseFloat(el.value);
      // Map slider [0..10000] to exponential power range
      const s = Math.max(0, Math.min(10000, sliderPos)) / 10000;
      const power = Math.pow(2, (s - 0.5) * 12) * 12000 * 2.0; // approx mapping
      g.repelPower = power;
      setVal('repelPowerVal', Math.round(g.repelPower).toString());
      autoSaveSettings();
    });
    bindSlider('repelSoftSlider', (el) => {
      g.repelSoft = parseFloat(el.value);
      setVal('repelSoftVal', g.repelSoft.toFixed(1));
      autoSaveSettings();
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // FLIES MODE CONTROLS
    // ═══════════════════════════════════════════════════════════════════════════
    bindSlider('fliesBallCountSlider', (el) => {
      g.fliesBallCount = parseInt(el.value, 10);
      setVal('fliesBallCountVal', String(g.fliesBallCount));
      if (g.currentMode === 'flies') {
        Promise.resolve().then(function () { return flies; }).then(({ initializeFlies }) => {
          initializeFlies();
        });
      }
    });
    bindSlider('attractPowerSlider', (el) => {
      g.attractionPower = parseFloat(el.value);
      setVal('attractPowerVal', Math.round(g.attractionPower).toString());
    });
    bindSlider('swarmSpeedSlider', (el) => {
      g.swarmSpeed = parseFloat(el.value);
      setVal('swarmSpeedVal', g.swarmSpeed.toFixed(1));
    });
    bindSlider('fliesSeparationSlider', (el) => {
      g.fliesSeparation = parseFloat(el.value);
      setVal('fliesSeparationVal', Math.round(g.fliesSeparation).toString());
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // ZERO-G MODE CONTROLS
    // ═══════════════════════════════════════════════════════════════════════════
    bindSlider('weightlessCountSlider', (el) => {
      g.weightlessBallCount = parseInt(el.value, 10);
      setVal('weightlessCountVal', String(g.weightlessBallCount));
      if (g.currentMode === 'weightless') {
        Promise.resolve().then(function () { return weightless; }).then(({ initializeWeightless }) => {
          initializeWeightless();
        });
      }
    });
    bindSlider('weightlessSpeedSlider', (el) => {
      g.weightlessInitialSpeed = parseFloat(el.value);
      setVal('weightlessSpeedVal', g.weightlessInitialSpeed.toFixed(0));
      if (g.currentMode === 'weightless') {
        Promise.resolve().then(function () { return weightless; }).then(({ initializeWeightless }) => {
          initializeWeightless();
        });
      }
    });
    bindSlider('weightlessBounceSlider', (el) => {
      g.weightlessBounce = parseFloat(el.value);
      setVal('weightlessBounceVal', g.weightlessBounce.toFixed(2));
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // WATER MODE CONTROLS
    // ═══════════════════════════════════════════════════════════════════════════
    bindSlider('waterBallCountSlider', (el) => {
      g.waterBallCount = parseInt(el.value, 10);
      setVal('waterBallCountVal', String(g.waterBallCount));
      if (g.currentMode === 'water') {
        Promise.resolve().then(function () { return water; }).then(({ initializeWater }) => {
          initializeWater();
        });
      }
      autoSaveSettings();
    });
    bindSlider('waterRippleStrengthSlider', (el) => {
      g.waterRippleStrength = parseFloat(el.value);
      setVal('waterRippleStrengthVal', g.waterRippleStrength.toFixed(0));
      autoSaveSettings();
    });
    bindSlider('waterMotionSlider', (el) => {
      const intensity = parseFloat(el.value);
      g.waterDriftStrength = intensity;
      g.waterInitialVelocity = intensity * 5;
      setVal('waterMotionVal', intensity.toFixed(0));
      if (g.currentMode === 'water') {
        Promise.resolve().then(function () { return water; }).then(({ initializeWater }) => {
          initializeWater();
        });
      }
      autoSaveSettings();
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // VORTEX MODE CONTROLS
    // ═══════════════════════════════════════════════════════════════════════════
    bindSlider('vortexBallCountSlider', (el) => {
      g.vortexBallCount = parseInt(el.value, 10);
      setVal('vortexBallCountVal', String(g.vortexBallCount));
      if (g.currentMode === 'vortex') {
        Promise.resolve().then(function () { return vortex; }).then(({ initializeVortex }) => {
          initializeVortex();
        });
      }
    });
    bindSlider('vortexSwirlSlider', (el) => {
      g.vortexSwirlStrength = parseFloat(el.value);
      setVal('vortexSwirlVal', g.vortexSwirlStrength.toFixed(0));
    });
    bindSlider('vortexPullSlider', (el) => {
      g.vortexRadialPull = parseFloat(el.value);
      setVal('vortexPullVal', g.vortexRadialPull.toFixed(0));
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // PING PONG MODE CONTROLS
    // ═══════════════════════════════════════════════════════════════════════════
    bindSlider('pingPongBallCountSlider', (el) => {
      g.pingPongBallCount = parseInt(el.value, 10);
      setVal('pingPongBallCountVal', String(g.pingPongBallCount));
      if (g.currentMode === 'ping-pong') {
        Promise.resolve().then(function () { return pingPong; }).then(({ initializePingPong }) => {
          initializePingPong();
        });
      }
    });
    bindSlider('pingPongSpeedSlider', (el) => {
      g.pingPongSpeed = parseFloat(el.value);
      setVal('pingPongSpeedVal', g.pingPongSpeed.toFixed(0));
      if (g.currentMode === 'ping-pong') {
        Promise.resolve().then(function () { return pingPong; }).then(({ initializePingPong }) => {
          initializePingPong();
        });
      }
    });
    bindSlider('pingPongCursorSlider', (el) => {
      g.pingPongCursorRadius = parseFloat(el.value);
      setVal('pingPongCursorVal', g.pingPongCursorRadius.toFixed(0));
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // MAGNETIC MODE CONTROLS
    // ═══════════════════════════════════════════════════════════════════════════
    bindSlider('magneticBallCountSlider', (el) => {
      g.magneticBallCount = parseInt(el.value, 10);
      setVal('magneticBallCountVal', String(g.magneticBallCount));
      if (g.currentMode === 'magnetic') {
        Promise.resolve().then(function () { return magnetic; }).then(({ initializeMagnetic }) => {
          initializeMagnetic();
        });
      }
    });
    bindSlider('magneticStrengthSlider', (el) => {
      g.magneticStrength = parseFloat(el.value);
      setVal('magneticStrengthVal', g.magneticStrength.toFixed(0));
    });
    bindSlider('magneticVelocitySlider', (el) => {
      g.magneticMaxVelocity = parseFloat(el.value);
      setVal('magneticVelocityVal', g.magneticMaxVelocity.toFixed(0));
    });
    bindSlider('magneticIntervalSlider', (el) => {
      g.magneticExplosionInterval = parseInt(el.value, 10);
      setVal('magneticIntervalVal', String(g.magneticExplosionInterval));
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // BUBBLES MODE CONTROLS
    // ═══════════════════════════════════════════════════════════════════════════
    bindSlider('bubblesRateSlider', (el) => {
      g.bubblesSpawnRate = parseInt(el.value, 10);
      setVal('bubblesRateVal', String(g.bubblesSpawnRate));
    });
    bindSlider('bubblesSpeedSlider', (el) => {
      g.bubblesRiseSpeed = parseFloat(el.value);
      setVal('bubblesSpeedVal', g.bubblesRiseSpeed.toFixed(0));
    });
    bindSlider('bubblesWobbleSlider', (el) => {
      g.bubblesWobble = parseFloat(el.value);
      setVal('bubblesWobbleVal', g.bubblesWobble.toFixed(0));
    });
    bindSlider('bubblesMaxSlider', (el) => {
      g.bubblesMaxCount = parseInt(el.value, 10);
      setVal('bubblesMaxVal', String(g.bubblesMaxCount));
    });
    bindSlider('bubblesDeflectSlider', (el) => {
      g.bubblesDeflectRadius = parseFloat(el.value);
      setVal('bubblesDeflectVal', g.bubblesDeflectRadius.toFixed(0));
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // COLOR TEMPLATE SELECT
    // ═══════════════════════════════════════════════════════════════════════════
    populateColorSelect();
    const colorSelect = document.getElementById('colorSelect');
    if (colorSelect) {
      colorSelect.addEventListener('change', () => {
        applyColorTemplate(colorSelect.value);
        autoSaveSettings();
      });
    }
  }

  /**
   * Update mode button UI to reflect active mode
   */
  function updateModeButtonsUI(activeMode) {
    const buttons = document.querySelectorAll('.mode-button');
    buttons.forEach(btn => {
      const isActive = btn.getAttribute('data-mode') === activeMode;
      btn.classList.toggle('active', isActive);
    });
    
    // Show/hide mode-specific controls
    document.querySelectorAll('.mode-controls').forEach(el => el.classList.remove('active'));
    const controlId = activeMode + 'Controls';
    const activeControls = document.getElementById(controlId);
    if (activeControls) activeControls.classList.add('active');
    
    // Update announcer for accessibility
    const announcer = document.getElementById('announcer');
    if (announcer) {
      const modeNames = {
        'pit': 'Ball Pit',
        'flies': 'Flies to Light', 
        'weightless': 'Zero-G',
        'water': 'Water Swimming',
        'vortex': 'Vortex Sheets',
        'ping-pong': 'Ping Pong',
        'magnetic': 'Magnetic',
        'bubbles': 'Carbonated Bubbles'
      };
      announcer.textContent = `Switched to ${modeNames[activeMode] || activeMode} mode`;
    }
    }

  var controls = /*#__PURE__*/Object.freeze({
    __proto__: null,
    setupControls: setupControls,
    updateModeButtonsUI: updateModeButtonsUI
  });

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                             BUILD / SAVE CONFIG                              ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function setupBuildControls() {
    const btn = document.getElementById('saveConfigBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const g = getGlobals();
      const config = {
        gravityMultiplier: g.gravityMultiplierPit,
        ballMass: g.ballMassKg,
        sizeScale: g.sizeScale,
        sizeVariation: g.sizeVariation,
        restitution: g.REST,
        friction: g.FRICTION,
        repelRadius: g.repelRadius,
        repelPower: g.repelPower,
        repelSoftness: g.repelSoft,
        cursorColorIndex: 5,
        enableLOD: false
      };
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'current-config.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                      PANEL CONTROLLER (COMPLETE)                             ║
  // ║              Creates panel with full controls from template                  ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function setupPanel() {
    let panel = document.getElementById('controlPanel');
    
    // Ensure panel exists and is a direct child of body for correct z-index
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'controlPanel';
      panel.className = 'panel';
      document.body.appendChild(panel);
    } else if (panel.parentElement !== document.body) {
      // Move existing panel to body if it's trapped in another container
      panel.parentElement.removeChild(panel);
      document.body.appendChild(panel);
    }
    
    // Inject complete panel HTML
    panel.innerHTML = PANEL_HTML;
    initializeDarkMode();
    
    // Wire up minimize button
    const minimizeBtn = panel.querySelector('#minimizePanel');
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.toggle('hidden');
        panel.style.display = panel.classList.contains('hidden') ? 'none' : '';
      });
    }
    
    // Make panel draggable
    setupPanelDragging(panel);
    
    // Wire up all control listeners (mode buttons, sliders, etc.)
    setupControls();
    setupBuildControls();
    
    console.log('✓ Panel created');
  }

  function setupPanelDragging(panel) {
    const header = panel.querySelector('.panel-header');
    if (!header) return;
    
    let isDragging = false;
    let xOffset = 0, yOffset = 0;
    
    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      const rect = panel.getBoundingClientRect();
      xOffset = e.clientX - rect.left;
      yOffset = e.clientY - rect.top;
      header.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const x = e.clientX - xOffset;
      const y = e.clientY - yOffset;
      
      // Constrain to viewport
      const maxX = window.innerWidth - panel.offsetWidth - 20;
      const maxY = window.innerHeight - panel.offsetHeight - 20;
      
      panel.style.left = Math.max(20, Math.min(x, maxX)) + 'px';
      panel.style.top = Math.max(20, Math.min(y, maxY)) + 'px';
      panel.style.right = 'auto';
    });
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
      header.style.cursor = 'move';
    });
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                                KEYBOARD INPUT                                ║
  // ║              Panel toggle and mode switching (1,2,3,4,5)                     ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function setupKeyboardShortcuts() {
    const panel = document.getElementById('controlPanel');
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      // Toggle panel
      if ((k === '/' || e.code === 'Slash') && panel) {
        e.preventDefault();
        panel.classList.toggle('hidden');
        panel.style.display = panel.classList.contains('hidden') ? 'none' : '';
        return;
      }
      // Mode switching: 1=pit, 2=flies, 3=weightless, 4=water, 5=vortex, 6=ping-pong, 7=magnetic, 8=bubbles
      if (k === '1') {
        e.preventDefault();
        setMode(MODES.PIT);
        updateModeButtonsUI('pit');
      } else if (k === '2') {
        e.preventDefault();
        setMode(MODES.FLIES);
        updateModeButtonsUI('flies');
      } else if (k === '3') {
        e.preventDefault();
        setMode(MODES.WEIGHTLESS);
        updateModeButtonsUI('weightless');
      } else if (k === '4') {
        e.preventDefault();
        setMode(MODES.WATER);
        updateModeButtonsUI('water');
      } else if (k === '5') {
        e.preventDefault();
        setMode(MODES.VORTEX);
        updateModeButtonsUI('vortex');
      } else if (k === '6') {
        e.preventDefault();
        setMode(MODES.PING_PONG);
        updateModeButtonsUI('ping-pong');
      } else if (k === '7') {
        e.preventDefault();
        setMode(MODES.MAGNETIC);
        updateModeButtonsUI('magnetic');
      } else if (k === '8') {
        e.preventDefault();
        setMode(MODES.BUBBLES);
        updateModeButtonsUI('bubbles');
      }
    });
    
    console.log('✓ Keyboard shortcuts registered');
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                      MOUSE/TOUCH TRACKING (COMPLETE)                         ║
  // ║              Unified document-level pointer system for all modes             ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  // Mouse velocity tracking for water ripples
  let lastMouseX = 0;
  let lastMouseY = 0;
  let lastMoveTime = 0;
  let mouseVelocity = 0;
  let lastTapTime = 0;

  const MODE_CYCLE = [
    MODES.PIT,
    MODES.FLIES,
    MODES.WEIGHTLESS,
    MODES.WATER,
    MODES.VORTEX,
    MODES.PING_PONG,
    MODES.MAGNETIC,
    MODES.BUBBLES
  ];

  function cycleMode() {
    const globals = getGlobals();
    const current = globals.currentMode;
    const idx = MODE_CYCLE.indexOf(current);
    const next = MODE_CYCLE[(idx + 1) % MODE_CYCLE.length] || MODE_CYCLE[0];
    Promise.resolve().then(function () { return modeController; }).then(({ setMode }) => {
      setMode(next);
    });
    Promise.resolve().then(function () { return controls; }).then(({ updateModeButtonsUI }) => {
      updateModeButtonsUI(next);
    });
  }

  // Throttle for water ripple creation
  let lastRippleTime = 0;
  const RIPPLE_THROTTLE_MS = 80; // Create ripple every 80ms max

  /**
   * GLOBAL UNIFIED MOUSE SYSTEM
   * Handles all mouse/touch interactions at document level
   * Works regardless of canvas z-index or pointer-events
   */
  function setupPointer() {
    const globals = getGlobals();
    const canvas = globals.canvas;
    
    if (!canvas) {
      console.error('Canvas not available for pointer setup');
      return;
    }
    
    const DPR = globals.DPR;
    
    /**
     * Get mouse position relative to canvas from any event
     */
    function getCanvasPosition(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left) * DPR,
        y: (clientY - rect.top) * DPR,
        inBounds: clientX >= rect.left && clientX <= rect.right && 
                  clientY >= rect.top && clientY <= rect.bottom
      };
    }
    
    /**
     * Document-level mouse move tracking
     * Works even when canvas is behind content (z-index: -1)
     * PASSIVE - doesn't interfere with panel interactions
     */
    document.addEventListener('mousemove', (e) => {
      // Don't track if over panel
      if (e.target.closest('#controlPanel')) return;
      
      const pos = getCanvasPosition(e.clientX, e.clientY);
    
      // Calculate mouse velocity for water ripples
      const now = performance.now();
      const dt = now - lastMoveTime;
      if (dt > 0 && lastMoveTime > 0) {
        const dx = pos.x - lastMouseX;
        const dy = pos.y - lastMouseY;
        mouseVelocity = Math.sqrt(dx * dx + dy * dy) / dt;
      }
      
      // Update globals
      globals.mouseX = pos.x;
      globals.mouseY = pos.y;
      globals.mouseInCanvas = pos.inBounds;
      if (typeof window !== 'undefined') window.mouseInCanvas = pos.inBounds;
      
      // ════════════════════════════════════════════════════════════════════════
      // WATER MODE: Create ripples based on mouse movement velocity
      // ════════════════════════════════════════════════════════════════════════
      if (globals.currentMode === MODES.WATER && pos.inBounds) {
        // Only create ripple if moving fast enough and throttle time passed
        if (mouseVelocity > 0.3 && (now - lastRippleTime) > RIPPLE_THROTTLE_MS) {
          // Scale ripple strength based on velocity (faster = stronger)
          const velocityFactor = Math.min(mouseVelocity * 2, 3);
          createWaterRipple(pos.x, pos.y, velocityFactor);
          lastRippleTime = now;
        }
      }

      
      // Store for velocity calculation
      lastMouseX = pos.x;
      lastMouseY = pos.y;
      lastMoveTime = now;
    }, { passive: true });
    
    /**
     * Document-level click handler
     * Responds to mode-specific interactions
     */
    document.addEventListener('click', (e) => {
      // Ignore clicks on panel or interactive elements
      if (e.target.closest('#controlPanel')) return;
      if (e.target.closest('a')) return;
      if (e.target.closest('button')) return;
      
      const pos = getCanvasPosition(e.clientX, e.clientY);
      
      // Only process if click is within canvas bounds
      if (!pos.inBounds) return;
      
      // NO click effects on any simulation - only mouse movement triggers interactions
      // Click always cycles mode
      cycleMode();
    });
    
    /**
     * Touch move tracking for mobile
     */
    document.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches[0]) {
        const pos = getCanvasPosition(e.touches[0].clientX, e.touches[0].clientY);
        globals.mouseX = pos.x;
        globals.mouseY = pos.y;
        globals.mouseInCanvas = pos.inBounds;
        
        // Water mode: create ripples on touch move
        const now = performance.now();
        if (globals.currentMode === MODES.WATER && pos.inBounds) {
          if ((now - lastRippleTime) > RIPPLE_THROTTLE_MS) {
            createWaterRipple(pos.x, pos.y, 2);
            lastRippleTime = now;
      }
        }
      }
    }, { passive: true });
    
    /**
     * Touch tap handler for mobile interactions
     * Water creates ripple on tap
     */
    document.addEventListener('touchstart', (e) => {
      // Ignore touches on panel
      if (e.target.closest('#controlPanel')) return;
      if (e.target.closest('a')) return;
      if (e.target.closest('button')) return;
      
      if (e.touches && e.touches[0]) {
        const pos = getCanvasPosition(e.touches[0].clientX, e.touches[0].clientY);
        
        if (!pos.inBounds) return;
        
        // NO tap effects on any simulation - only finger drag triggers interactions
        // Double-tap cycles mode
        const now = performance.now();
        if (now - lastTapTime < 300) {
          cycleMode();
        }
        lastTapTime = now;
      }
    }, { passive: true });
    
    /**
     * Reset mouse when leaving window
     */
    document.addEventListener('mouseleave', () => {
      globals.mouseX = CONSTANTS.OFFSCREEN_MOUSE;
      globals.mouseY = CONSTANTS.OFFSCREEN_MOUSE;
      globals.mouseInCanvas = false;
      mouseVelocity = 0;
      if (typeof window !== 'undefined') window.mouseInCanvas = false;
    });
    
    /**
     * Touch end - reset tracking
     */
    document.addEventListener('touchend', () => {
      globals.mouseX = CONSTANTS.OFFSCREEN_MOUSE;
      globals.mouseY = CONSTANTS.OFFSCREEN_MOUSE;
      globals.mouseInCanvas = false;
    }, { passive: true });
    
    console.log('✓ Unified pointer system configured (document-level)');
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                         COLLISION DETECTION (COMPLETE)                       ║
  // ║              Spatial hashing + resolution from lines 2350-2466               ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  const spatialGrid = new Map();

  function collectPairsSorted() {
    const globals = getGlobals();
    const balls = globals.balls;
    const canvas = globals.canvas;
    const R_MAX = globals.R_MAX;
    
    const n = balls.length;
    if (n < 2) return [];
    
    const cellSize = Math.max(1, R_MAX * 2);
    const gridWidth = Math.ceil(canvas.width / cellSize) + 1;
    spatialGrid.clear();
    
    // Build grid
    for (let i = 0; i < n; i++) {
      const b = balls[i];
      const cx = (b.x / cellSize) | 0;
      const cy = (b.y / cellSize) | 0;
      const key = cy * gridWidth + cx;
      let arr = spatialGrid.get(key);
      if (!arr) { arr = []; spatialGrid.set(key, arr); }
      arr.push(i);
    }
    
    const pairs = [];
    for (const [key, arr] of spatialGrid) {
      const cy = (key / gridWidth) | 0;
      const cx = key % gridWidth;
      
      // Check 9 neighboring cells
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const neighborKey = (cy + oy) * gridWidth + (cx + ox);
          const nb = spatialGrid.get(neighborKey);
          if (!nb) continue;
          
          for (let ii = 0; ii < arr.length; ii++) {
            const i = arr[ii];
            for (let jj = 0; jj < nb.length; jj++) {
              const j = nb[jj];
              if (j <= i) continue;
              
              const A = balls[i], B = balls[j];
              const dx = B.x - A.x, dy = B.y - A.y;
              const rSum = A.r + B.r;
              const dist2 = dx*dx + dy*dy;
              
              if (dist2 < rSum*rSum) {
                const dist = Math.sqrt(Math.max(dist2, CONSTANTS.MIN_DISTANCE_EPSILON));
                const overlap = rSum - dist;
                pairs.push({ i, j, overlap });
              }
            }
          }
        }
      }
    }
    
    pairs.sort((a, b) => b.overlap - a.overlap);
    return pairs;
  }

  function resolveCollisions(iterations = 10) {
    const globals = getGlobals();
    const balls = globals.balls;
    const pairs = collectPairsSorted();
    const REST = globals.REST;
    const POS_CORRECT_PERCENT = 0.8;
    const POS_CORRECT_SLOP = 0.5 * globals.DPR;
    const REST_VEL_THRESHOLD = 30;
    
    for (let iter = 0; iter < iterations; iter++) {
      for (let k = 0; k < pairs.length; k++) {
        const { i, j } = pairs[k];
        const A = balls[i];
        const B = balls[j];
        
        // Skip pairs where both are sleeping (sleep islands)
        if (A.isSleeping && B.isSleeping) continue;
        // Wake only the sleeping one if colliding with an awake body
        if (A.isSleeping) A.wake();
        if (B.isSleeping) B.wake();
        const dx = B.x - A.x;
        const dy = B.y - A.y;
        const rSum = A.r + B.r;
        const dist2 = dx * dx + dy * dy;
        if (dist2 === 0 || dist2 > rSum * rSum) continue;
        const dist = Math.sqrt(dist2);
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = rSum - dist;
        const invA = 1 / Math.max(A.m, 0.001);
        const invB = 1 / Math.max(B.m, 0.001);

        // Positional correction
        const correctionMag = POS_CORRECT_PERCENT * Math.max(overlap - POS_CORRECT_SLOP, 0) / (invA + invB);
        const cx = correctionMag * nx;
        const cy = correctionMag * ny;
        A.x -= cx * invA; A.y -= cy * invA;
        B.x += cx * invB; B.y += cy * invB;

        // Velocity impulse
        const rvx = B.vx - A.vx;
        const rvy = B.vy - A.vy;
        const velAlongNormal = rvx * nx + rvy * ny;
        if (velAlongNormal < 0) {
          const e = Math.abs(velAlongNormal) < REST_VEL_THRESHOLD ? 0 : REST;
          const j = -(1 + e) * velAlongNormal / (invA + invB);
          const ix = j * nx;
          const iy = j * ny;
          A.vx -= ix * invA; A.vy -= iy * invA;
          B.vx += ix * invB; B.vy += iy * invB;

          // Spin transfer
          const tvx = rvx - velAlongNormal * nx;
          const tvy = rvy - velAlongNormal * ny;
          const slipMag = Math.hypot(tvx, tvy);
          if (slipMag > 1e-3) {
            const tangentSign = (tvx * -ny + tvy * nx) >= 0 ? 1 : -1;
            const gain = CONSTANTS.SPIN_GAIN_TANGENT;
            A.omega -= tangentSign * gain * slipMag / Math.max(A.r, 1);
            B.omega += tangentSign * gain * slipMag / Math.max(B.r, 1);
          }
          
          // Squash
          const impact = Math.min(1, Math.abs(velAlongNormal) / ((A.r + B.r) * 50));
          const sAmt = Math.min(globals.getSquashMax(), impact * 0.8);
          A.squashAmount = Math.max(A.squashAmount, sAmt * 0.8);
          A.squashNormalAngle = Math.atan2(-ny, -nx);
          B.squashAmount = Math.max(B.squashAmount, sAmt * 0.8);
          B.squashNormalAngle = Math.atan2(ny, nx);
        }
      }
    }
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                             CURSOR BALL RENDERING                            ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  function drawCursor(ctx) {
    const g = getGlobals();
    if (!g.mouseInCanvas) return;
    if (g.isTouchDevice === true) return;
    if (g.cursorBallVisible === false) return;
    
    const r = Math.max(6 * g.DPR, (g.R_MIN + g.R_MAX) * 0.12);
    ctx.save();
    ctx.beginPath();
    ctx.arc(g.mouseX, g.mouseY, r, 0, Math.PI * 2);
    ctx.fillStyle = g.currentColors ? (g.currentColors[4] || '#000000') : '#000000';
    ctx.globalAlpha = 0.9;
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.restore();
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                      PHYSICS ENGINE (COMPLETE)                               ║
  // ║           Fixed-timestep with collision detection                            ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  const DT = CONSTANTS.PHYSICS_DT;
  let acc = 0;
  const CORNER_RADIUS = 42; // matches rounded container corners
  const CORNER_FORCE = 1800;

  function applyCornerRepellers(ball, canvas) {
    const corners = [
      { x: CORNER_RADIUS, y: CORNER_RADIUS },
      { x: canvas.width - CORNER_RADIUS, y: CORNER_RADIUS },
      { x: CORNER_RADIUS, y: canvas.height - CORNER_RADIUS },
      { x: canvas.width - CORNER_RADIUS, y: canvas.height - CORNER_RADIUS }
    ];
    for (let i = 0; i < corners.length; i++) {
      const cx = corners[i].x;
      const cy = corners[i].y;
      const dx = ball.x - cx;
      const dy = ball.y - cy;
      const dist = Math.max(1, Math.hypot(dx, dy));
      if (dist < CORNER_RADIUS + ball.r) {
        const pen = (CORNER_RADIUS + ball.r) - dist;
        const strength = (pen / (CORNER_RADIUS + ball.r)) * CORNER_FORCE;
        const nx = dx / dist;
        const ny = dy / dist;
        ball.vx += nx * strength * DT;
        ball.vy += ny * strength * DT;
      }
    }
  }

  async function updatePhysics(dtSeconds, applyForcesFunc) {
    const globals = getGlobals();
    const balls = globals.balls;
    const canvas = globals.canvas;
    
    if (!canvas || balls.length === 0) return;
    
    acc += dtSeconds;
    let physicsSteps = 0;
    
    while (acc >= DT && physicsSteps < CONSTANTS.MAX_PHYSICS_STEPS) {
      // Integrate physics for all modes
        const len = balls.length;
        for (let i = 0; i < len; i++) {
          balls[i].step(DT, applyForcesFunc);
        }
      
      // Ball-to-ball collisions (disabled for Flies mode)
      if (globals.currentMode !== MODES.FLIES) {
        resolveCollisions(10); // more solver iterations for stability
      }
      
      // Wall collisions + corner repellers
        const wallRestitution = (globals.currentMode === MODES.WEIGHTLESS) ? globals.weightlessBounce : globals.REST;
      const lenWalls = balls.length;
      for (let i = 0; i < lenWalls; i++) {
        applyCornerRepellers(balls[i], canvas);
          balls[i].walls(canvas.width, canvas.height, DT, wallRestitution);
      }
      
      acc -= DT;
      physicsSteps++;
    }
    
    // Water ripple updates run per-frame
    if (globals.currentMode === MODES.WATER) {
      updateWaterRipples(dtSeconds);
    }

    // Reset accumulator if falling behind
    if (acc > DT * CONSTANTS.ACCUMULATOR_RESET_THRESHOLD) acc = 0;
  }

  function render() {
    const globals = getGlobals();
    const ctx = globals.ctx;
    const balls = globals.balls;
    const canvas = globals.canvas;
    
    if (!ctx || !canvas) return;
    
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw water ripples (behind balls for gorgeous effect)
    if (globals.currentMode === MODES.WATER) ;
    
    // Draw balls
    for (let i = 0; i < balls.length; i++) {
      balls[i].draw(ctx);
    }
    
    // Cursor overlay
    drawCursor(ctx);
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                           PERFORMANCE / FPS                                  ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝

  let lastFpsUpdate = 0;
  let frames = 0;
  let currentFPS = 0;

  function trackFrame(now) {
    frames++;
    if (now - lastFpsUpdate > 1000) {
      currentFPS = frames;
      frames = 0;
      lastFpsUpdate = now;
      const el = document.getElementById('render-fps');
      if (el) el.textContent = String(currentFPS);
    }
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                              MAIN RENDER LOOP                                ║
  // ║                Extracted from balls-source.html lines 2472-2592              ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  let last = performance.now() / 1000;

  function startMainLoop(applyForcesFunc) {
    function frame(nowMs) {
      const now = nowMs / 1000;
      let dt = Math.min(0.033, now - last);
      last = now;
      
      // Physics update
      updatePhysics(dt, applyForcesFunc);
      
      // Render
      render();
      
      // FPS tracking
      trackFrame(performance.now());
      
      requestAnimationFrame(frame);
    }
    
    requestAnimationFrame(frame);
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                        PASSWORD GATE (CV PROTECTION)                         ║
  // ║    4-digit password input that swaps with logo, validates code (1111)       ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝

  const CORRECT_CODE = '1111';
  let isActive = false;
  let passwordInputContainer = null;
  let digitInputs = [];

  /**
   * Create the 4-digit password input HTML structure
   */
  function createPasswordGate() {
    const container = document.createElement('div');
    container.id = 'password-gate';
    container.className = 'password-gate';
    container.innerHTML = `
    <div class="password-gate__inputs">
      <input type="text" inputmode="numeric" pattern="[0-9]" maxlength="1" class="password-gate__digit" data-index="0" />
      <input type="text" inputmode="numeric" pattern="[0-9]" maxlength="1" class="password-gate__digit" data-index="1" />
      <input type="text" inputmode="numeric" pattern="[0-9]" maxlength="1" class="password-gate__digit" data-index="2" />
      <input type="text" inputmode="numeric" pattern="[0-9]" maxlength="1" class="password-gate__digit" data-index="3" />
    </div>
  `;
    
    document.body.appendChild(container);
    return container;
  }

  /**
   * Show password gate (hide logo, show inputs with animation)
   */
  function showPasswordGate() {
    if (isActive) return;
    isActive = true;
    
    // Create password input if it doesn't exist
    if (!passwordInputContainer) {
      passwordInputContainer = createPasswordGate();
      digitInputs = Array.from(passwordInputContainer.querySelectorAll('.password-gate__digit'));
      setupDigitInputs();
    }
    
    const logo = document.querySelector('.hero__text');
    
    // Trigger animations
    if (logo) {
      logo.classList.add('password-gate-swap-out');
    }
    passwordInputContainer.classList.add('password-gate-active');
    
    // Focus first input after animation
    setTimeout(() => {
      digitInputs[0]?.focus();
    }, 300);
    
    // Add keyboard listener for ESC/BACKSPACE to exit
    document.addEventListener('keydown', handleGlobalKeydown);
  }

  /**
   * Hide password gate (show logo, hide inputs with animation)
   */
  function hidePasswordGate() {
    if (!isActive) return;
    isActive = false;
    
    const logo = document.querySelector('.hero__text');
    
    // Reverse animations
    if (logo) {
      logo.classList.remove('password-gate-swap-out');
    }
    if (passwordInputContainer) {
      passwordInputContainer.classList.remove('password-gate-active');
    }
    
    // Clear inputs
    clearDigits();
    
    // Remove keyboard listener
    document.removeEventListener('keydown', handleGlobalKeydown);
  }

  /**
   * Clear all digit inputs
   */
  function clearDigits() {
    digitInputs.forEach(input => {
      input.value = '';
    });
    digitInputs[0]?.focus();
  }

  /**
   * Setup digit input behavior (auto-advance, validation)
   */
  function setupDigitInputs() {
    digitInputs.forEach((input, index) => {
      // Handle input
      input.addEventListener('input', (e) => {
        const value = e.target.value;
        
        // Only allow single digits
        if (value.length > 1) {
          e.target.value = value.slice(-1);
        }
        
        // Only allow numbers
        if (!/^\d*$/.test(e.target.value)) {
          e.target.value = '';
          return;
        }
        
        // Auto-advance to next input
        if (e.target.value.length === 1 && index < digitInputs.length - 1) {
          digitInputs[index + 1].focus();
        }
        
        // Check if all 4 digits are filled
        if (index === digitInputs.length - 1 && e.target.value.length === 1) {
          validateCode();
        }
      });
      
      // Handle backspace navigation
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
          digitInputs[index - 1].focus();
        }
      });
      
      // Handle paste
      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
        
        pastedData.split('').forEach((digit, i) => {
          if (digitInputs[i]) {
            digitInputs[i].value = digit;
          }
        });
        
        if (pastedData.length === 4) {
          validateCode();
        } else if (pastedData.length > 0) {
          digitInputs[Math.min(pastedData.length, digitInputs.length - 1)].focus();
        }
      });
    });
  }

  /**
   * Validate the entered code
   */
  function validateCode() {
    const enteredCode = digitInputs.map(input => input.value).join('');
    
    if (enteredCode === CORRECT_CODE) {
      // Correct code: green flash, then navigate
      flashPage('success');
      setTimeout(() => {
        window.location.href = 'cv.html';
      }, 800);
    } else {
      // Wrong code: red flash, clear inputs
      flashPage('error');
      setTimeout(() => {
        clearDigits();
      }, 500);
    }
  }

  /**
   * Flash the entire page (success = green, error = red)
   */
  function flashPage(type) {
    const overlay = document.createElement('div');
    overlay.className = `page-flash page-flash--${type}`;
    document.body.appendChild(overlay);
    
    // Trigger animation
    requestAnimationFrame(() => {
      overlay.classList.add('page-flash--active');
    });
    
    // Remove after animation
    setTimeout(() => {
      overlay.classList.remove('page-flash--active');
      setTimeout(() => {
        overlay.remove();
      }, 300);
    }, type === 'success' ? 600 : 300);
  }

  /**
   * Handle global keydown (ESC/BACKSPACE to exit when no input is focused)
   */
  function handleGlobalKeydown(e) {
    // Only handle ESC or BACKSPACE when not in an input (or when first input is empty)
    const isInInput = digitInputs.some(input => input === document.activeElement);
    const firstInputEmpty = !digitInputs[0].value;
    
    if (e.key === 'Escape' || (e.key === 'Backspace' && (!isInInput || (isInInput && firstInputEmpty && document.activeElement === digitInputs[0])))) {
      e.preventDefault();
      hidePasswordGate();
    }
  }

  /**
   * Initialize password gate (attach to trigger link)
   */
  function initPasswordGate() {
    const trigger = document.getElementById('cv-gate-trigger');
    
    if (trigger) {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        showPasswordGate();
      });
    }
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                      BOUNCY BALLS – MAIN ENTRY (COMPLETE)                    ║
  // ║                       Modular Architecture Bootstrap                         ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝


  async function loadRuntimeConfig() {
    try {
      const paths = ['config/default-config.json', 'js/config.json', '../public/js/config.json'];
      for (const path of paths) {
        try {
          const res = await fetch(path, { cache: 'no-cache' });
          if (res.ok) return await res.json();
        } catch (e) {
          // Try next
        }
      }
      throw new Error('No config found');
    } catch (e) {
      console.warn('Config load failed, using defaults');
      return { gravityMultiplier: 1.05, ballMass: 91, maxBalls: 300 };
    }
  }

  /**
   * Apply two-level padding CSS variables from global state to :root
   * 
   * Two-level system:
   * 1. --container-border: insets #bravia-balls from viewport (reveals body bg as outer frame)
   * 2. --simulation-padding: padding inside container around canvas (inner breathing room)
   * 
   * The canvas radius auto-calculates via CSS: calc(var(--container-radius) - var(--simulation-padding))
   */
  function applyFramePaddingCSSVars() {
    const g = getGlobals();
    const root = document.documentElement;
    
    // Outer frame: container inset from viewport
    root.style.setProperty('--container-border', `${g.containerBorder || 0}px`);
    
    // Inner padding: canvas inset from container
    root.style.setProperty('--simulation-padding', `${g.simulationPadding || 0}px`);
  }

  /**
   * Ensure .noise-2 element exists (for modular dev where Webflow HTML isn't present).
   * Creates it as a sibling to .noise or as first child of body if .noise doesn't exist.
   */
  function ensureNoise2Element() {
    // Check if .noise-2 already exists
    if (document.querySelector('.noise-2')) return;
    
    // Check if we have a noise texture image to use
    const existingNoise = document.querySelector('.noise');
    if (!existingNoise) {
      // No noise system present (modular dev without Webflow assets) - skip
      return;
    }
    
    // Create noise-2 element
    const noise2 = document.createElement('div');
    noise2.className = 'noise-2';
    
    // Copy background-image from existing noise if available
    const noiseStyle = getComputedStyle(existingNoise);
    if (noiseStyle.backgroundImage && noiseStyle.backgroundImage !== 'none') {
      noise2.style.backgroundImage = noiseStyle.backgroundImage;
    }
    
    // Position it fixed, full screen (CSS handles the rest)
    noise2.style.position = 'fixed';
    noise2.style.inset = '0';
    noise2.style.pointerEvents = 'none';
    noise2.style.backgroundRepeat = 'repeat';
    noise2.style.backgroundPosition = '50%';
    noise2.style.backgroundAttachment = 'fixed';
    noise2.style.opacity = '0.03';
    noise2.style.mixBlendMode = 'luminosity';
    
    // Insert after .noise element
    existingNoise.insertAdjacentElement('afterend', noise2);
    console.log('✓ Created .noise-2 element');
  }

  (async function init() {
    try {
      console.log('🚀 Initializing modular bouncy balls...');
      
      const config = await loadRuntimeConfig();
      initState(config);
      console.log('✓ Config loaded');
      
      // Apply frame padding CSS vars from config (controls border thickness)
      applyFramePaddingCSSVars();
      console.log('✓ Frame padding applied');
      
      // Ensure noise-2 element exists (for modular dev environments)
      ensureNoise2Element();
      
      // Setup canvas (attaches resize listener, but doesn't resize yet)
      setupRenderer();
      const canvas = getCanvas();
      const ctx = getContext();
      const container = document.getElementById('bravia-balls');
      
      if (!canvas || !ctx || !container) {
        throw new Error('Missing DOM elements');
      }
      
      // Set canvas reference in state (needed for container-relative sizing)
      setCanvas(canvas, ctx, container);
      
      // NOW resize - container is available for container-relative sizing
      resize();
      console.log('✓ Canvas initialized (container-relative sizing)');
      
      // Ensure initial mouseInCanvas state is false for tests
      const globals = getGlobals();
      globals.mouseInCanvas = false;
      if (typeof window !== 'undefined') window.mouseInCanvas = false;
      
      // Setup pointer tracking BEFORE dark mode (needed for interactions)
      setupPointer();
      console.log('✓ Pointer tracking configured');
      
      // Load any saved settings
      loadSettings();
      
      // Initialize dark mode BEFORE colors (determines which palette variant to load)
      initializeDarkMode();
      console.log('✓ Dark mode initialized');
      
      // Initialize color system
      applyColorTemplate(getGlobals().currentTemplate);
      console.log('✓ Color system initialized');
      
      // Setup UI
      setupPanel();
      populateColorSelect();
      console.log('✓ Panel created');
      
      setupKeyboardShortcuts();
      console.log('✓ Keyboard shortcuts registered');
      
      // Initialize password gate for CV download
      initPasswordGate();
      console.log('✓ Password gate initialized');
      
      // Initialize starting mode (Flies by default)
      setMode(MODES.FLIES);
      console.log('✓ Mode initialized');
      
      // Start main render loop
      const getForces = () => getForceApplicator();
      startMainLoop((ball, dt) => {
        const forceFn = getForces();
        if (forceFn) forceFn(ball, dt);
      });
      
      console.log('✅ Bouncy Balls running (modular)');
      
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      document.body.innerHTML = `<div style="padding: 20px; color: red; background: white;">
      <h2>Initialization Error</h2>
      <pre>${error.message}\n${error.stack}</pre>
    </div>`;
    }
  })();

  exports.applyFramePaddingCSSVars = applyFramePaddingCSSVars;

  return exports;

})({});
//# sourceMappingURL=bouncy-balls-embed.js.map
